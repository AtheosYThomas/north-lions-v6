// 北大獅子會會員服務系統 - Shared Types

// 1. 會員資料 (Member)
export interface Member {
  id?: string; // Firestore Doc ID (uid)
  name: string;
  contact: {
    mobile: string;
    email: string;
    lineUserId: string;
  };
  organization: {
    role: string; // 會長、副會長等
    title: string;
  };
  personal: {
    joinDate?: Date | string; // Timestamp
    birthDate?: Date | string;
    bloodType?: string;
    gender?: string;
    englishName?: string;
  };
  company: {
    name: string;
    taxId: string;
  };
  emergency: {
    contactName: string;
    relationship: string;
    phone: string;
  };
  status: {
    activeStatus: 'active' | 'suspended' | 'resigned'; // 活躍/休會/退會
    membershipType: 'charter' | 'regular' | 'honorary' | 'potential'; // 創會/正式/榮譽/潛在
  };
  system: {
    account?: string;
    role: 'admin' | 'member';
    accountStatus?: string;
    pushConsent: boolean;
  };
  stats: {
    totalDonation: number;
    donationCount: number;
    lastDonationDate?: Date | string;
    lastInteraction?: Date | string;
  };
}

// 2. 公告清單 (Announcement)
export interface Announcement {
  id?: string;
  title: string;
  content: {
    date: Date | string;
    body: string;
    summary: string;
  };
  publishing: {
    targetAudience: string[]; // e.g., ['all', 'directors']
    publisherId: string;
    publishTime: Date | string;
  };
  status: {
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    pushStatus: string;
  };
  settings: {
    isPushEnabled: boolean;
    isPinned: boolean;
    deliveryMethod: string;
    replySetting: string;
  };
  category: 'system' | 'meeting' | 'activity_preview';
  related: {
    eventId?: string;
    pushMessageId?: string;
  };
}

// 3. 捐款紀錄 (Donation)
export interface Donation {
  id?: string;
  date: Date | string;
  donorName: string;
  amount: number;
  category: 'emergency_relief' | 'annual_fund' | string;
  payment: {
    method: string;
    accountLast5?: string;
  };
  audit: {
    status: 'pending' | 'verified';
    auditor?: string;
  };
  receipt: {
    isRequired: boolean;
    status: string;
    deliveryMethod: string;
  };
  memberId?: string;
}

// 4. 活動列表 (Event)
export interface Event {
  id?: string;
  name: string;
  time: {
    date: Date | string;
    start: Date | string;
    end: Date | string;
    deadline: Date | string;
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
    pushStatus: string;
  };
  category: 'meeting' | 'act' | 'travel' | 'training' | 'board_meeting';
  publishing: {
    target: string[];
    publisherId: string;
    content: string;
  };
  stats: {
    registeredCount: number;
  };
  system: {
    code: string;
    coverImage?: string;
  };
  related: {
    announcementId?: string;
  };
}

// 5. 報名活動 (Registration)
export interface Registration {
  id?: string;
  info: {
    memberId: string;
    eventId: string;
    timestamp: Date | string;
  };
  details: {
    adultCount: number;
    childCount: number;
    familyNames: string[];
  };
  needs: {
    shuttle: boolean;
    accommodation: boolean;
    remark: string;
  };
  status: {
    status: 'registered' | 'waitlist' | 'cancelled' | 'approved';
    paymentStatus: 'unpaid' | 'paid';
  };
  notification: {
    isSent: boolean;
  };
}

// 6. 訊息紀錄表 (MessageLog)
export interface MessageLog {
  id?: string;
  lineUserId: string;
  content: string;
  timestamp: Date | string;
  category: 'registration' | 'query' | 'other' | 'donation';
  status: 'pending' | 'completed' | 'unknown';
  memberName?: string;
}

// 7. 繳費紀錄 (Payment)
export interface Payment {
  id?: string;
  payerName: string;
  date: Date | string;
  amount: number;
  method: {
    type: string;
    accountLast5?: string;
  };
  audit: {
    isConfirmed: boolean;
    auditor?: string;
  };
  receipt: {
    isRequired: boolean;
    title?: string;
    taxId?: string;
  };
  related: {
    eventId: string;
    registrationId?: string;
    memberId?: string;
  };
  system: {
    lineUid: string;
    eventCode: string;
    eventName: string;
  };
}
