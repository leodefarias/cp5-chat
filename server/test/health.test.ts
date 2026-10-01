import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import { createApp } from '../src/app.js';

describe('health check', () => {
  it('responde ok sem credencial administrativa', async () => {
    const server = createServer(createApp());
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      const body: unknown = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual(body, { status: 'ok' });
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
