import { test } from 'node:test';
import assert from 'node:assert/strict';

test('preview smoke requires the new health marker and a closed authentication boundary', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.PREVIEW_URL;
  const originalCommit = process.env.EXPECTED_COMMIT_SHA;
  process.env.PREVIEW_URL = 'https://pipeline-check.vercel.app';
  process.env.EXPECTED_COMMIT_SHA = 'expected-commit';
  let deployedCommit = 'expected-commit';
  let authStatus = 401;
  const seen: string[] = [];
  globalThis.fetch = (async (input: URL) => {
    const pathname = new URL(input).pathname;
    seen.push(pathname);
    if (pathname === '/') return new Response('<div id="root"></div>');
    if (pathname === '/api/health') return Response.json({
      status: 'online', app: 'HYPE CREATOR STUDIO 2.0', deploymentCheck: 'ready',
      commit: deployedCommit,
    });
    return Response.json({}, { status: authStatus });
  }) as typeof fetch;
  try {
    const script = '../scripts/smoke-preview.mjs';
    await import(script + '?passing');
    assert.equal(seen.length, 3);
    deployedCommit = 'older-commit';
    await assert.rejects(import(script + '?wrong-commit'), /Preview commit must match/);
    deployedCommit = 'expected-commit';
    authStatus = 200;
    await assert.rejects(import(script + '?open-api'), /Spoofed owner/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.PREVIEW_URL;
    else process.env.PREVIEW_URL = originalUrl;
    if (originalCommit === undefined) delete process.env.EXPECTED_COMMIT_SHA;
    else process.env.EXPECTED_COMMIT_SHA = originalCommit;
  }
});
