import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('story deletion scopes scenes to owner, preserves parent on failure and uses document IDs', async () => {
  const servicePath = fileURLToPath(new URL('../src/firebase/services/storyService.ts', import.meta.url));
  const result = await build({
    stdin: { contents: `export * from ${JSON.stringify(servicePath)}; export { state } from 'firebase/firestore'; export { auth } from 'mock-config';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node',
    plugins: [{ name: 'isolated-firestore', setup(builder) {
      builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'mock' }));
      builder.onResolve({ filter: /^(\.\.\/config|mock-config)$/ }, () => ({ path: 'config', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'config'
        ? `export const db = {}; export const auth = {currentUser:{uid:'owner'}}; export const OperationType = {DELETE:'delete'}; export function handleFirestoreError(e){throw e;}`
        : `export const state = {calls:[], fail:false};
          export const collection = (_, name) => name;
          export const doc = (_, name, id) => name + '/' + id;
          export const where = (...args) => args;
          export const query = (...args) => {state.calls.push(['query', ...args]); return args;};
          export const getDocs = async () => ({docs:[{ref:'scenes/one'}]});
          export const deleteDoc = async ref => {if(state.fail && ref === 'scenes/one') throw Error('denied'); state.calls.push(['delete',ref]);};
          export const setDoc = async () => {};
          export const onSnapshot = (_, cb) => {cb({forEach(fn){fn({id:'real-id',data:()=>({id:'stale-id',createdAt:'2026-01-01'})});}}); return ()=>{};};`
      }));
    } }],
  });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  let records: any[] = [];
  mod.subscribeStories('owner', (items: any[]) => { records = items; });
  assert.equal(records[0].id, 'real-id');
  mod.state.calls = [];
  await mod.deleteStory('story');
  assert.deepEqual(mod.state.calls[0], ['query', 'scenes', ['ownerId', '==', 'owner'], ['storyId', '==', 'story']]);
  assert.deepEqual(mod.state.calls.slice(1), [['delete', 'scenes/one'], ['delete', 'stories/story']]);
  mod.state.calls = []; mod.state.fail = true;
  await assert.rejects(mod.deleteStory('story'), /denied/);
  assert.equal(mod.state.calls.some((row: string[]) => row[0] === 'delete' && row[1] === 'stories/story'), false);
  mod.auth.currentUser = null; mod.state.calls = [];
  await assert.rejects(mod.deleteStory('story'), /Sessão necessária/);
  assert.equal(mod.state.calls.length, 0);
});
