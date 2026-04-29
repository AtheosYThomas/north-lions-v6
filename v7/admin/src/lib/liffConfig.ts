/** Admin 站網域與前台不同，應使用 LINE 後台另建的 LIFF（Endpoint = Admin 網址）。未設定時退回 VITE_LIFF_ID（僅在與前台同網域時才可能可用）。 */
export function getAdminLiffId(): string {
  return String(import.meta.env.VITE_ADMIN_LIFF_ID || import.meta.env.VITE_LIFF_ID || '').trim();
}
