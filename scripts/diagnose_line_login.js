const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function printCheck(label, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${label}${detail ? `: ${detail}` : ''}`);
}

function parseUrlInfo(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const params = Object.fromEntries(url.searchParams.entries());
    return { url, params, error: null };
  } catch (e) {
    return { url: null, params: {}, error: e.message };
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const clientEnv = path.join(repoRoot, 'client', '.env');
  const clientEnvProd = path.join(repoRoot, 'client', '.env.production');
  const clientEnvExample = path.join(repoRoot, 'client', '.env.example');

  const env = {
    ...parseEnvFile(clientEnvExample),
    ...parseEnvFile(clientEnvProd),
    ...parseEnvFile(clientEnv)
  };

  console.log('== LINE Login 診斷 ==');
  printCheck('VITE_LIFF_ID', !!env.VITE_LIFF_ID, env.VITE_LIFF_ID ? '已設定' : '未設定');
  printCheck('VITE_LIFF_REDIRECT_URI', !!env.VITE_LIFF_REDIRECT_URI, env.VITE_LIFF_REDIRECT_URI || '未設定');
  printCheck('VITE_APP_URL', !!env.VITE_APP_URL, env.VITE_APP_URL || '未設定');

  if (env.VITE_LIFF_REDIRECT_URI && env.VITE_APP_URL) {
    const sameOrigin = env.VITE_LIFF_REDIRECT_URI.startsWith(env.VITE_APP_URL);
    printCheck('Redirect URI 與 App URL 同源', sameOrigin);
  }

  const rawUrl = process.argv[2];
  if (rawUrl) {
    console.log('\n== 回跳 URL 解析 ==');
    const info = parseUrlInfo(rawUrl);
    if (info.error) {
      printCheck('回跳 URL 格式', false, info.error);
    } else {
      const { url, params } = info;
      console.log(`URL: ${url.toString()}`);
      const hasCode = !!params.code;
      const hasError = !!params.error || !!params.error_description;
      const hasState = !!params.state;

      printCheck('包含 code', hasCode);
      printCheck('包含 state', hasState);
      printCheck('包含 error', !hasError, hasError ? params.error || params.error_description : '無');

      if (!hasCode && !hasError) {
        console.log('ℹ️ 未收到 code 或 error，可能是 Callback URL 未允許或登入未完成。');
      }
      if (hasError) {
        console.log('ℹ️ LINE 回傳錯誤，請檢查 LINE Developers Console 的 Callback URLs 設定。');
      }
    }
  } else {
    console.log('\n提供回跳 URL 可更精準診斷：');
    console.log('node scripts/diagnose_line_login.js "https://north-lions-v6-a7757.web.app/login?code=...&state=..."');
  }

  console.log('\n== 建議檢查項目 ==');
  console.log('1) LINE Login Channel 的 Allowed Callback URLs 是否包含：https://north-lions-v6-a7757.web.app');
  console.log('2) 前端是否已部署最新版本（包含自動登入回跳處理）');
  console.log('3) Functions verifyLineToken 是否可用（部署成功）');
}

main();
