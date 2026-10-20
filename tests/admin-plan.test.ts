import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createPlanHandler } from '../admin-plan.js';

test('plan API checks verified UID, validates input and handles persistence failure', async () => {
  const writes: unknown[][] = [];
  const app = express();
  app.use(express.json());
  app.patch('/users/:uid/plan', createPlanHandler({
    masterUid: 'master',
    verifyToken: async token => {
      if (!['master', 'ordinary'].includes(token)) throw new Error('invalid');
      return { uid: token };
    },
    updatePlan: async (...args) => {
      if (args[0] === 'missing') throw new Error('missing profile');
      writes.push(args);
    },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    for (const [token, uid, plan, expected] of [
      ['', 'user', 'pro', 401], ['invalid', 'user', 'pro', 401],
      ['ordinary', 'user', 'pro', 403], ['master', 'master', 'pro', 400],
      ['master', 'user', 'unlimited', 400], ['master', 'missing', 'pro', 503],
      ['master', 'user', 'pro', 200], ['master', 'user', 'free', 200],
      ['master', 'user', 'premium', 200],
    ] as const) {
      const response = await fetch(`http://127.0.0.1:${port}/users/${uid}/plan`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, isOwner: true, userEmail: 'indicabrasiloficiall@gmail.com' }),
      });
      assert.equal(response.status, expected, `${token}/${uid}/${plan}`);
    }
    assert.deepEqual(writes, [['user', 'pro', 'master'], ['user', 'free', 'master'], ['user', 'premium', 'master']]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
