/** 正式環境獨立 Admin Hosting（與 firebase target `admin` 對齊） */
const DEFAULT_ADMIN_HOSTING_ORIGIN = 'https://north-lions-v6-admin.web.app';

/**
 * 管理後台入口 URL。
 * - 生產：預設導向獨立 Admin 站；可用 `VITE_ADMIN_URL` 覆寫（staging 等）。
 * - 開發：預設仍用主站路徑 `/admin/`，方便本機同網域或舊流程。
 */
export function getAdminConsoleEntryHref(): string {
  const configured = String(import.meta.env.VITE_ADMIN_URL || '').trim();
  if (configured) {
    const base = configured.replace(/\/$/, '');
    return `${base}/?refresh=1`;
  }
  if (import.meta.env.DEV) {
    return '/admin/?refresh=1';
  }
  return `${DEFAULT_ADMIN_HOSTING_ORIGIN}/?refresh=1`;
}
