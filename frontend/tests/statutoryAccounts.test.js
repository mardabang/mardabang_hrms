import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePfAccount, validateStatutoryAccounts } from '../src/utils/statutoryAccounts.js';
test('blank identifiers remain optional', () => assert.deepEqual(validateStatutoryAccounts('', ' '), {}));
test('accepts compact and slash-separated PF member IDs including short legacy segments', () => {
  for (const pf of ['MHPUN12345670001234567', 'MH/PUN/1234567/000/1234567', 'mh/pun/123/0/456']) {
    assert.deepEqual(validateStatutoryAccounts(pf, '0123456789'), {});
  }
  assert.equal(normalizePfAccount(' mh/pun/123/0/456 '), 'MH/PUN/123/0/456');
});
test('rejects UAN, malformed member IDs, and incorrectly sized ESIC numbers', () => {
  for (const pf of ['123456789012', 'MH/PUN/12345678/000/123', 'MH/PUN/123/000/abc', 'MHPUN1234567000123456']) {
    assert.ok(validateStatutoryAccounts(pf, '').pfAccountNumber);
  }
  for (const esi of ['123456789', '12345678901', '12345ABCDE']) {
    assert.ok(validateStatutoryAccounts('', esi).esiAccountNumber);
  }
});
