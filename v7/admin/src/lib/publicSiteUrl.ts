/**
 * 會員前台（LIFF / 主 Hosting）根網址。
 * - 優先使用 VITE_PUBLIC_APP_URL（自訂網域或預覽環境）。
 * - 否則依 Firebase 專案預設 Hosting：`https://{projectId}.web.app`
 *
 * 若 VITE_PUBLIC_APP_URL 誤設成後台網域（*-admin.web.app 或與目前分頁相同），
 * 會改回主站預設，避免「回前台」仍留在 admin。
 */
function defaultMainOrigin(): string {
  const pid = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  if (pid) {
    return `https://${pid}.web.app`;
  }
  return 'https://north-lions-v6-a7757.web.app';
}

function normalizeConfiguredBase(raw: string): string {
  let s = String(raw || '').trim().replace(/\/$/, '');
  if (!s || s === '/') {
    return '';
  }
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, '')}`;
  }
  return s.replace(/\/$/, '');
}

/** Firebase 多站常見後台子網域：{project}-admin.web.app */
function looksLikeAdminHostingHost(hostname: string): boolean {
  return hostname.includes('-admin.web.app');
}

export function getMemberSiteUrl(currentHostname?: string): string {
  const configured = normalizeConfiguredBase(String(import.meta.env.VITE_PUBLIC_APP_URL || ''));
  let candidate = configured || defaultMainOrigin();

  try {
    const u = new URL(candidate);
    const host = u.hostname;
    if (looksLikeAdminHostingHost(host)) {
      return defaultMainOrigin().replace(/\/$/, '');
    }
    if (currentHostname && host === currentHostname) {
      return defaultMainOrigin().replace(/\/$/, '');
    }
  } catch {
    return defaultMainOrigin().replace(/\/$/, '');
  }

  return candidate.replace(/\/$/, '');
}
