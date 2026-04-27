// 共用的 Firestore Schema 型別定義 (Shared TS Definitions)

export interface BaseEntity {
  id?: string; // Document ID
}

export interface Member extends BaseEntity {
  name: string;
  photoUrl?: string;
  contact: {
    mobile: string;
    email: string;
    lineUserId: string | null;
  };
  organization: {
    role: string;
    title: string;
  };
  status: {
    activeStatus: 'active' | 'inactive' | 'withdrawn';
    membershipType: '創會' | '正式' | '榮譽' | '潛在' | string;
  };
  system: {
    account: string;
    role: 'Admin' | 'Member';
    accountStatus: string;
    pushConsent: boolean;
  };
  stats?: {
    totalDonation: number;
    donationCount: number;
    lastDonationDate?: any;
  };
}

export interface Announcement extends BaseEntity {
  title: string;
  content: {
    date?: any;
    body: string;
    summary: string;
    attachments?: { name: string; url: string; size?: number }[];
  };
  publishing: {
    targetAudience?: string[];
    publisherId?: string;
    publishTime: any;
  };
  status: {
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    pushStatus?: string;
  };
  settings?: {
    isPushEnabled: boolean;
    isPinned: boolean;
    deliveryMethod?: string;
    replySetting?: string;
  };
  category: string;
  enableAutoPush?: boolean;
  related?: any;
}

export interface Event extends BaseEntity {
  name: string;
  time: {
    date: any;
    start: any;
    end: any;
    deadline: any;
  };
  details: {
    location: string;
    cost: number;
    quota: number;
    isPaidEvent: boolean;
  };
  status: {
    eventStatus: string;
    registrationStatus: string;
  };
  category: string;
  description?: string;
  enableAutoPush?: boolean;
}

export interface Registration extends BaseEntity {
  info: {
    memberId: string;
    eventId: string;
    timestamp: any;
    checkInTime?: any;
  };
  details: {
    adultCount: number;
    childCount: number;
  };
  status: {
    status: '已報名' | '候補中' | '已取消' | '已核准' | '已上傳憑證' | '已出席';
    paymentStatus: string;
  };
  payment?: {
    reportMethod?: 'web_image' | 'web_manual' | 'line_image'; // 繳費回報來源
    screenshotUrl?: string;   // 會員上傳的匯款憑證截圖（web_image / line_image）
    // AI 解析欄位（web_image / line_image）
    accountLast5?: string;    // AI 判讀之帳號末五碼
    amount?: number;          // AI 判讀之匯款金額
    aiConfidence?: string;    // AI 辨識信心度 ('high' | 'low' | 'error')
    aiUpdatedAt?: any;
    // 手動填寫欄位（web_manual）
    reportedAmount?: number;  // 會員自填匯款金額
    reportedLast5?: string;   // 會員自填帳號末五碼
    reportedDate?: string;    // 會員自填匯款日期 (YYYY-MM-DD)
    memo?: string;            // 備註（選填）
    rejectReason?: string;    // 拒絕理由
  };
}

export interface Donation extends BaseEntity {
  memberId: string;
  donorName: string;
  amount: number;
  category: string; // "年度常年會費", "社會服務樂捐", "活動贊助" etc.
  date: any; // Firestore Timestamp
  payment: {
    method: 'cash' | 'transfer' | string;
    accountLast5: string;
  };
  audit: {
    status: 'pending' | 'approved' | 'rejected';
    auditor: string; // admin memberId
  };
  receipt: {
    isRequired: boolean;
    status: 'pending' | 'issued';
    deliveryMethod: string;
  };
}

export interface BillingCampaign extends BaseEntity {
  name: string;
  createdAt: any;
  createdBy: string; // admin memberId
  status: 'active' | 'completed' | 'cancelled';
  isPublished?: boolean;
  details: {
    description?: string;
    dueDate?: any;
  };
}

export interface BillingRecord extends BaseEntity {
  campaignId: string;
  memberId: string;
  memberInfo: {
    name: string;
    title: string;
    mobile?: string;
    lineUserId?: string;
  };
  billing: {
    expectedAmount: number;
    breakdown?: { item: string; amount: number }[];
    dueDate?: any;
  };
  status: {
    status: 'pending' | 'submitted' | 'partial_paid' | 'approved' | 'rejected' | 'overdue';
  };
  payment?: {
    reportMethod?: 'web_image' | 'line_image' | 'web_manual';
    totalPaidAmount?: number;
    receipts?: {
      url: string;
      aiAmount?: number;
      aiConfidence?: 'high' | 'low' | 'error' | string;
      status: 'pending' | 'verified' | 'rejected' | 'error';
      uploadedAt: any;
    }[];
    // Legacy fields mapped or kept for backwards compatibility
    screenshotUrl?: string;
    accountLast5?: string;
    amount?: number;
    reportedAmount?: number;
    aiConfidence?: 'high' | 'low' | 'error' | string;
    aiUpdatedAt?: any;
    isMatched?: boolean;
    auditBy?: string;
    auditAt?: any;
    memo?: string;
    rejectReason?: string;
  };
}

export interface AppNotification extends BaseEntity {
  userId: string; // 'all', 'admin', or memberId
  type: 'activity' | 'announcement' | 'billing' | 'social' | 'registration' | 'system';
  title: string;
  message: string;
  actionUrl?: string; // Optional URL for navigation
  isRead: boolean;
  createdAt: any; // Firestore Timestamp
}
