import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 用相對路徑輸出，部署到 Vercel 根網域或任意子路徑都可用。
export default defineConfig({
  plugins: [react()],
  base: './',
})
