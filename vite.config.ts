import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages ではリポジトリ名のサブパスで配信されるため base を合わせる
export default defineConfig({
  base: '/clocktower-mystery/',
  plugins: [react()],
})
