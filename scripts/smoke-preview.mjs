import assert from 'node:assert/strict';

const base = new URL(process.env.PREVIEW_URL || '');
assert.equal(base.protocol, 'https:');
assert.ok(base.hostname.endsWith('.vercel.app'), 'Expected a Vercel preview URL');
const headers = {};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}
async function request(path, init = {}) {
  return fetch(new URL(path, base), {
    ...init, headers: { ...headers, ...init.headers }, redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
}
const home = await request('/');
assert.equal(home.status, 200, 'SPA must return 200');
assert.match(await home.text(), /<div id="root"><\/div>/, 'Expected application shell');
const health = await request('/api/health');
assert.equal(health.status, 200);
const data = await health.json();
assert.equal(data.status, 'online');
assert.equal(data.app, 'HYPE CREATOR STUDIO 2.0');
assert.equal(data.deploymentCheck, 'ready');
const denied = await request('/api/gemini/generate-image', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt: 'smoke check', userEmail: 'indicabrasiloficiall@gmail.com' }),
});
assert.equal(denied.status, 401, 'Spoofed owner must not access AI');
console.log('Preview checks passed: SPA, health, authentication boundary. No Firebase writes or AI calls.');
