import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Admin 獨立 Hosting（north-lions-v6-admin.web.app）部署在網域根目錄，必須使用 '/'。
  // 主站 /admin/* 由 firebase.json redirects 轉到獨立站（保留深層路徑）。
  base: '/',
  build: {
    outDir: '../client/dist/admin',
    emptyOutDir: true
  }
})
