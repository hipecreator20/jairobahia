import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walletView, generationCost, debitGeneration, installBillingRoutes } from '../wallet.js';
import express from 'express';

function fakeStore() {
  const docs=new Map<string,any>();let queue:Promise<unknown>=Promise.resolve();
  const ref=(path:string):any=>({path,get:async()=>({exists:docs.has(path),data:()=>docs.get(path)}),collection:(name:string)=>({doc:(id:string)=>ref(`${path}/${name}/${id}`)})});
  const store:any={doc:ref,collection:(name:string)=>({doc:(id='audit')=>ref(`${name}/${id}`)}),runTransaction:(callback:any)=>{
    const run=queue.then(async()=>{const writes:any[]=[];const result=await callback({get:(r:any)=>r.get(),set:(r:any,data:any,opts:any)=>writes.push([r.path,opts?.merge?{...docs.get(r.path),...data}:data]),update:(r:any,data:any)=>writes.push([r.path,{...docs.get(r.path),...data}])});for(const [path,data]of writes)docs.set(path,data);return result;});queue=run.catch(()=>{});return run;
  }};return {store,docs};
}
test('paid coins require an active paid subscription and reset by period',()=>{
  const now=Date.UTC(2026,9,20),subscription={plan:'pro',status:'paid',startedAt:now-1000,endsAt:now+1000};
  const active=walletView({subscription},{},now);assert.equal(active.allocated,1000000);assert.equal(active.storageLimit,20*1024**3);
  assert.equal(walletView({subscription:{...subscription,plan:'premium'}},{},now).allocated,3000000);
  assert.equal(walletView({subscription:{...subscription,endsAt:now-1}},{},now).allocated,10000);
  assert.equal(walletView({subscription:{...subscription,status:'unpaid'}},{},now).plan,'free');
  assert.equal(walletView({subscription,wallet:{period:active.period,spent:6000}},{},now).balance,994000);
  assert.equal(generationCost('/gemini/generate-story-script',{sceneCount:9}).cost,9000);
  assert.throws(()=>generationCost('/gemini/generate-story-script',{sceneCount:99}),/INVALID/);
});
test('transactional debits prevent overdraft and duplicate generation IDs',async()=>{
  const {store,docs}=fakeStore();docs.set('settings/plans',{costs:{text:6000}});
  const results=await Promise.allSettled([debitGeneration(store,'u','/gemini/generate-prompt',{},'request_one'),debitGeneration(store,'u','/gemini/generate-prompt',{},'request_two')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(docs.get('studioAccounts/u').wallet.spent,6000);
  await assert.rejects(debitGeneration(store,'u','/gemini/generate-prompt',{},'request_one'),/DUPLICATE/);
  await assert.rejects(debitGeneration(store,'u','/gemini/generate-prompt',{},'..\/bad'),/INVALID/);
});
test('manual payment requires Master UID and repeated confirmation preserves the period',async()=>{
  const {store,docs}=fakeStore();docs.set('users/member',{plan:'free'});const app=express();app.use(express.json());app.use((req,res,next)=>{res.locals.authUid=req.header('X-Test-Uid');next();});installBillingRoutes(app,()=>store,'master');
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const port=(server.address() as {port:number}).port,endsAt=new Date(Date.now()+30*86400000).toISOString();
  const call=(actor:string)=>fetch(`http://127.0.0.1:${port}/api/admin/users/member/subscription`,{method:'PATCH',headers:{'Content-Type':'application/json','X-Test-Uid':actor},body:JSON.stringify({plan:'premium',status:'paid',endsAt,isOwner:true})});
  try{assert.equal((await call('ordinary')).status,403);assert.equal(docs.has('studioAccounts/member'),false);assert.equal((await call('master')).status,200);const started=docs.get('studioAccounts/member').subscription.startedAt;assert.equal((await call('master')).status,200);assert.equal(docs.get('studioAccounts/member').subscription.startedAt,started);assert.equal(docs.get('users/member').plan,'premium');}
  finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
