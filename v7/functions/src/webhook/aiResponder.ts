import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeAiTool, getAiToolDeclarations, isMembersDirectoryCall } from './aiTools';
import { MemberAuthProfile } from './memberProfile';

type LogDetailedError = (context: string, error: unknown, extra?: Record<string, unknown>) => void;

export type AiResponderResult = {
  aiText: string;
  usedMembersDirectoryTool: boolean;
  membersDirectoryTotal: number;
};

type GenerateAiResponseInput = {
  db: admin.firestore.Firestore;
  userText: string;
  lineUserId: string;
  memberProfile: MemberAuthProfile;
  logDetailedError: LogDetailedError;
  maxTurns?: number;
};

function buildSystemInstruction(memberProfile: MemberAuthProfile): string {
  const V7_URL = process.env.VITE_LIFF_URL
    ? process.env.VITE_LIFF_URL.trim().replace(/\/login\/?$/, '')
    : 'https://north-lions-v6-a7757.web.app';
  const adminInstruction = memberProfile.isAdmin
    ? '此使用者為系統管理員(Admin)，你可以使用查詢工具提供會員聯絡資訊給他。'
    : '此使用者為一般會員，你不可提供完整會員名冊或其他會員聯絡資訊。';

  return `你是新北市北大獅子會 V7 系統的專屬智慧助理。當會員詢問活動資訊時，請務必優先使用工具查詢資料庫，並直接在對話中列出重點資訊。請勿只叫會員自己去網站看。若資料太長，請提供摘要並附上 V7 系統連結：${V7_URL} 供其查看詳情。回答請簡潔，不超過 200 字。${adminInstruction}`;
}

export async function generateAiResponse(input: GenerateAiResponseInput): Promise<AiResponderResult> {
  const { db, userText, lineUserId, memberProfile, logDetailedError, maxTurns = 5 } = input;
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    return {
      aiText: 'AI 助手目前無法使用，請稍後再試。',
      usedMembersDirectoryTool: false,
      membersDirectoryTotal: 0
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemInstruction(memberProfile),
      tools: [{
        functionDeclarations: getAiToolDeclarations()
      }]
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(userText);
    let response = result.response;

    for (let turn = 0; turn < maxTurns; turn++) {
      const functionCalls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) break;

      const call = functionCalls[0];
      const functionResponse = await executeAiTool({
        db,
        callName: call.name,
        callArgs: call.args,
        lineUserId,
        memberProfile,
        logDetailedError
      });

      if (isMembersDirectoryCall(call.name) && memberProfile.isAdmin && !functionResponse?.error) {
        const total = Number(functionResponse.total || functionResponse.members?.length || 0);
        return {
          aiText: '好的，管理員，以下是目前的會員清單，您也可以點擊下方卡片查看詳細內容。',
          usedMembersDirectoryTool: true,
          membersDirectoryTotal: total
        };
      }

      result = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResponse || { error: '工具執行失敗' }
        }
      }]);
      response = result.response;
    }

    return {
      aiText: response.text() || '抱歉，無法取得回應，請稍後再試。',
      usedMembersDirectoryTool: false,
      membersDirectoryTotal: 0
    };
  } catch (err: any) {
    logDetailedError('Gemini API Error', err, { lineUserId });
    return {
      aiText: '抱歉，AI 助手暫時無法回應，請稍後再試。',
      usedMembersDirectoryTool: false,
      membersDirectoryTotal: 0
    };
  }
}
