import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {diagnose,generationDiagnostics,installDiagnosticRead} from '../diagnostics.js';

test('diagnostics classify real provider failures without keeping raw secrets',()=>{
  assert.equal(diagnose({status:504,message:'Deadline expired'}).code,'GEMINI_TIMEOUT');
  assert.equal(diagnose({status:503,message:'This model is currently experiencing high demand'}).code,'GEMINI_UNAVAILABLE');
  const result=diagnose({status:429,message:'quota exceeded API_KEY=secret user@example.com'});
  assert.equal(result.code,'GEMINI_QUOTA');assert.doesNotMatch(JSON.stringify(result),/secret|user@example/);
});

test('generation errors persist an allowlisted reference; logging outages preserve the response and Master gates reads',async()=>{
  const app=express();app.use(express.json());let reads=0;const events:Record<string,unknown>[]=[];
  app.use('/api/gemini',generationDiagnostics(async event=>{events.push(event);if(events.length===2)throw Error('offline');}));
  app.post('/api/gemini/generate-prompt',(_req,res)=>{res.locals.diagnosticStage='gemini';res.locals.diagnosticError={status:504,message:'Deadline expired secret-prompt'};res.status(500).json({success:false,message:'secret-prompt'});});
  app.post('/api/gemini/success',(_req,res)=>{res.json({success:true});});
  app.use((_req,res,next)=>{res.locals.authUid=_req.header('test-uid');next();});
  installDiagnosticRead(app,'master',async()=>{reads++;return events;});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  try {
    for(let i=0;i<2;i++){
      const res=await fetch(base+'/api/gemini/generate-prompt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer secret-token'},body:JSON.stringify({subject:'secret-prompt'})});
      const body=await res.json();assert.equal(res.status,500);assert.equal(body.requestId,res.headers.get('X-Request-Id'));assert.equal(events[i].requestId,body.requestId);assert.doesNotMatch(JSON.stringify(events[i]),/secret|Bearer|subject/);assert.doesNotMatch(body.message,/secret/);
    }
    await fetch(base+'/api/gemini/success',{method:'POST'});assert.equal(events.length,2);
    for(const uid of ['', 'member']){const res=await fetch(base+'/api/admin/diagnostics',{headers:{'test-uid':uid}});assert.equal(res.status,403);}assert.equal(reads,0);
    const res=await fetch(base+'/api/admin/diagnostics',{headers:{'test-uid':'master'}});assert.equal(res.status,200);assert.equal((await res.json()).events.length,2);assert.equal(reads,1);assert.equal(res.headers.get('cache-control'),'no-store');
  }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
