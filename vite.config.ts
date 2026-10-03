import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages ではリポジトリ名のサブパスで配信されるため base を合わせる
export default defineConfig({
  base: '/clocktower-mystery/',
  plugins: [react()],
  build: {
    // 3D 部分（three.js を含む）は遅延読み込みの 1 チャンクにまとめているため、警告の閾値を上げる
    chunkSizeWarningLimit: 1000,
  },
})
