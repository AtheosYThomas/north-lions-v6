/**
 * 會務核心幹部職務 + 指定管理員 (isAdmin / role admin) — 與 Firestore rules、後端 webhook、Admin/Client 前端對齊。
 */
const CORE_TITLE_KEYWORDS = ['會長', '秘書', '財務', '總管', '聯絡'] as const;

/** 合併 title / position / organization 供關鍵字比對 */
export function buildMemberTitleSearchText(memberData: any): string {
  if (!memberData) return '';
  const parts: string[] = [];
  if (typeof memberData.title === 'string') parts.push(memberData.title);
  if (typeof memberData.position === 'string') parts.push(memberData.position);
  const org = memberData.organization;
  if (org && typeof org === 'object') {
    if (typeof org.title === 'string') parts.push(org.title);
    if (typeof org.role === 'string') parts.push(org.role);
  }
  return parts.join(' ');
}

export function hasCoreOfficerKeyword(text: string): boolean {
  const t = String(text || '');
  return CORE_TITLE_KEYWORDS.some((k) => t.includes(k));
}

/** 具備管理後台 / 敏感資料讀取等權限（含指定 isAdmin 與 role admin） */
export function hasManagementAccess(memberData: any): boolean {
  if (!memberData) return false;
  if (memberData.isAdmin === true) return true;
  const sysRole = String(memberData?.system?.role || '').toLowerCase();
  const baseRole = String(memberData?.role || '').toLowerCase();
  if (sysRole === 'admin' || baseRole === 'admin') return true;
  return hasCoreOfficerKeyword(buildMemberTitleSearchText(memberData));
}
