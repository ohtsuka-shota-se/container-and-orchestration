import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base はリポジトリ名に合わせる（GitHub Pages 用）
// 例: https://username.github.io/docker-curriculum/ の場合 "/docker-curriculum/"
export default defineConfig({
  plugins: [react()],
  base: '/container-and-orchestration/',
})
