import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部署到 GitHub Pages 時，如果 repo 不是 username.github.io，
// 請把 base 改成 '/repo-name/'。本地開發時 vite 會忽略此設定。
export default defineConfig({
  plugins: [react()],
  base: './',
})
