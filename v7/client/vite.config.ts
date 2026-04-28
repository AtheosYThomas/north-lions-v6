import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // `dist/admin` 由 admin workspace 輸出；勿在 client build 時清空整個 dist。
  build: { emptyOutDir: false },
})
