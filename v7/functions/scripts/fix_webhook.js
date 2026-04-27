/**
 * 修正 webhook.ts: 用 regex 替換 getEventDetails 為模糊版
 */
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../src/webhook.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 用 regex 找到並替換整個 getEventDetails 函式
const newFn = `async function getEventDetails(db: admin.firestore.Firestore, eventName: string): Promise<any> {
  try {
    const snapshot = await db.collection('events').orderBy('time.date', 'desc').limit(50).get();
    if (snapshot.empty) return { message: '目前資料庫中沒有任何活動' };

    // 多層次模糊比對: L1:直接包含(+3) L2:bigram/trigram(+1/個) L3:單字(+0.5)
    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/[\\uff01-\\uff5e]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\\s+/g, '');
    const needle = normalize(eventName);
    const buildNgrams = (s: string, n: number) => {
      const r: string[] = [];
      for (let i = 0; i <= s.length - n; i++) r.push(s.slice(i, i + n));
      return r;
    };
    const bigrams  = buildNgrams(needle, 2);
    const trigrams = buildNgrams(needle, 3);
    const chars    = needle.split('');
    let bestScore = 0;
    let bestDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    snapshot.docs.forEach(docSnap => {
      const h = normalize(docSnap.data().name || '');
      let score = 0;
      if (h.includes(needle) || needle.includes(h)) score += 3;
      bigrams.forEach(g  => { if (h.includes(g)) score += 1; });
      trigrams.forEach(g => { if (h.includes(g)) score += 1; });
      chars.forEach(c    => { if (h.includes(c)) score += 0.5; });
      if (score > bestScore) { bestScore = score; bestDoc = docSnap; }
    });
    if (!bestDoc || bestScore < 0.5) {
      const names = snapshot.docs.map(d => d.data().name).join('、');
      return { message: \`找不到符合「\${eventName}」的活動。目前已登錄的活動包括：\${names}，請確認後再查詢。\` };
    }
    const d = (bestDoc as FirebaseFirestore.QueryDocumentSnapshot).data() as any;
    return {
      name:        d.name,
      date:        d.time?.date        || '未提供',
      location:    d.details?.location || '未提供',
      isPaidEvent: d.details?.isPaidEvent || false,
      cost:        d.details?.cost     || 0,
      description: d.content           || '無詳細內容介紹',
      matchScore:  bestScore,
    };
  } catch (error: any) {
    logger.error('Error in getEventDetails:', error);
    return { error: '查詢詳細資料時發生錯誤' };
  }
}`;

// 替換整個 getEventDetails 函式（用鬆散 regex）
const replaced = content.replace(
  /async function getEventDetails[\s\S]*?\n\}\n/,
  newFn + '\n'
);

if (replaced === content) {
  console.log('❌ No replacement made - pattern not matched');
  process.exit(1);
}

fs.writeFileSync(filePath, replaced, 'utf8');
console.log('✅ getEventDetails replaced with fuzzy version');
console.log('Lines:', replaced.split('\n').length);
