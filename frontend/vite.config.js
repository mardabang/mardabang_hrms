import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createOfficeProxyHandler } from './server/officeProxy.js'

const officeSecretPath = resolve('../marda-hrms-backend/.env.office-proxy-secret')
const officeSecret = existsSync(officeSecretPath)
  ? readFileSync(officeSecretPath, 'utf8').trim() : ''
const approvedDesktop = '172.17.1.23'

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
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', createOfficeProxyHandler(officeSecret, approvedDesktop))
        }
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
