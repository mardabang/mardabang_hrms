import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createOfficeProxyHandler } from '../server/officeProxy.js'
const secret = 'test-only-secret-at-least-32-characters-long'
function proof(address, key = secret) {
  const headers = new Map(['x-office-client', 'x-office-time', 'x-office-signature'].map(k => [k, 'forged']))
  const req = { method: 'POST', url: '/api/attendance/checkin?firmCode=MBIPL', socket: { remoteAddress: address } }
  createOfficeProxyHandler(key, '172.17.1.23')({ removeHeader: k => headers.delete(k), setHeader: (k, v) => headers.set(k, v) }, req)
  return { headers, req }
}
test('signs the actual request path and approved socket address', () => {
  const { headers, req } = proof('::ffff:172.17.1.23')
  assert.equal(headers.get('x-office-client'), '172.17.1.23')
  const payload = [req.method, req.url, '172.17.1.23', headers.get('x-office-time')].join('\n')
  assert.equal(headers.get('x-office-signature'), createHmac('sha256', secret).update(payload).digest('hex'))
})
test('strips forged proof for other office devices, localhost, and remote clients', () => {
  for (const address of ['172.17.1.24', '127.0.0.1', '203.0.113.1', undefined]) {
    assert.equal(proof(address).headers.size, 0)
  }
})
test('missing signing secret fails closed', () => {
  assert.equal(proof('172.17.1.23', '').headers.size, 0)
})
