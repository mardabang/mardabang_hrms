import { createHmac } from 'node:crypto'

export function createOfficeProxyHandler(secret, approvedDesktop) {
  return (proxyReq, req) => {
    for (const header of ['x-office-client', 'x-office-time', 'x-office-signature']) {
      proxyReq.removeHeader(header)
    }
    const client = (req.socket.remoteAddress || '').replace(/^::ffff:/, '')
    if (client !== approvedDesktop || secret.length < 32) return
    const timestamp = String(Date.now())
    const payload = [req.method, req.url, client, timestamp].join('\n')
    proxyReq.setHeader('x-office-client', client)
    proxyReq.setHeader('x-office-time', timestamp)
    proxyReq.setHeader('x-office-signature', createHmac('sha256', secret).update(payload).digest('hex'))
  }
}
