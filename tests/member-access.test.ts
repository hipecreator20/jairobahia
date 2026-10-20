import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };

process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
// Throwaway local key makes Admin initialization possible; no remote services are called.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  project_id: config.projectId, client_email: `test@${config.projectId}.iam.gserviceaccount.com`,
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
});
const { app } = await import('../server.js');

test('approved second account reaches every AI route; pending and exhausted accounts remain blocked', async () => {
  let status = 'approved';
  let count = 0;
  const auth = getAuth(getApp());
  const store = getFirestore(getApp(), config.firestoreDatabaseId);
  mock.method(auth, 'verifyIdToken', async () => ({ uid: 'second-account', email: 'member@example.invalid', email_verified: true }));
  mock.method(store, 'collection', (name: string) => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => ({ status, plan: 'free' }) }) }),
    add: async () => ({}),
  }));
  mock.method(store, 'doc', () => ({ get: async () => ({ data: () => ({ plans: { free: { promptsPerMonth: 10 } } }) }) }));
  mock.method(store, 'runTransaction', async (callback: (tx: unknown) => unknown) => callback({
    get: async () => ({ data: () => ({ count }) }), set: () => { count++; },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  const request = (path: string, body: object) => fetch(`http://127.0.0.1:${port}/api/gemini/${path}`, {
    method: 'POST', headers: { Authorization: 'Bearer local-test', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    for (const [path, body] of [
      ['generate-prompt', { subject: 'Rainy bridge' }], ['generate-image', { prompt: 'Rainy bridge' }],
      ['edit-image', { imageBase64: 'dGVzdA==', prompt: 'Rainy bridge' }],
      ['generate-story-script', { premise: 'Rainy bridge' }], ['generate-character-prompt', { name: 'Ana' }],
    ] as const) {
      const response = await request(path, body);
      const data = await response.json();
      // Reaches the unconfigured provider boundary, never the obsolete owner-email rejection.
      assert.notEqual(response.status, 403, `${path}: ${data.message}`);
      assert.equal(data.success, false);
      assert.match(data.message, /GEMINI_API_KEY|GoogleGenAI/);
    }
    status = 'pending';
    assert.equal((await request('generate-prompt', { subject: 'test' })).status, 403);
    status = 'approved'; count = 10;
    assert.equal((await request('generate-prompt', { subject: 'test' })).status, 429);
  } finally {
    mock.restoreAll();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
