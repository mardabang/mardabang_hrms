import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const certificatePath = resolve('.cert/hrms-cert.pem')
const certificateKeyPath = resolve('.cert/hrms-key.pem')
const https = existsSync(certificatePath) && existsSync(certificateKeyPath)
  ? {
      cert: readFileSync(certificatePath),
      key: readFileSync(certificateKeyPath)
    }
  : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    https
  }
})
