/** Admin 站網域與前台不同，應使用 LINE 後台另建的 LIFF（Endpoint = Admin 網址）。未設定時退回 VITE_LIFF_ID（僅在與前台同網域時才可能可用）。 */
export function getAdminLiffId(): string {
  return String(import.meta.env.VITE_ADMIN_LIFF_ID || import.meta.env.VITE_LIFF_ID || '').trim();
}

/**
 * LINE OAuth `redirect_uri`，必須與 LINE Developers「Callback URL」其中一筆完全一致。
 * 優先使用 `VITE_ADMIN_LIFF_REDIRECT_URI`；未設時若 `VITE_LIFF_REDIRECT_URI` 與目前網域相同才沿用；否則預設為目前網域 `/login`。
 */
export function getAdminLiffRedirectUri(): string {
  const adminExplicit = String(import.meta.env.VITE_ADMIN_LIFF_REDIRECT_URI || '').trim();
  if (adminExplicit) return adminExplicit;

  const memberUri = String(import.meta.env.VITE_LIFF_REDIRECT_URI || '').trim();
  if (memberUri && typeof window !== 'undefined') {
    try {
      if (new URL(memberUri).origin === window.location.origin) return memberUri;
    } catch {
      /* ignore */
    }
  }

  if (typeof window !== 'undefined') return `${window.location.origin}/login`;
  return '';
}
