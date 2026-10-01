import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { buildCloudinarySignature } from '../src/services/cloudinary.js';

describe('assinatura do Cloudinary', () => {
  it('assina timestamp e segredo sem colocar o segredo no resultado em claro', () => {
    const signature = buildCloudinarySignature(1700000000, 'segredo');
    const expected = createHash('sha1').update('timestamp=1700000000segredo').digest('hex');
    assert.equal(signature, expected);
    assert.equal(signature.includes('segredo'), false);
  });
});
