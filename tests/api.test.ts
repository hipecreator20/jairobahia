import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const { default: app } = await import('../api/index.js');
test('API refuses spoofed owner email without Firebase token', async () => {
 const server = app.listen(0, '127.0.0.1');
 await new Promise<void>(resolve => server.once('listening', resolve));
 const port = (server.address() as {port:number}).port;
 try {
   for (const token of ['', 'invalid-token']) {
     const response = await fetch('http://127.0.0.1:'+port+'/api/gemini/generate-image', {
       method:'POST', headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
       body:JSON.stringify({prompt:'test',userEmail:'indicabrasiloficiall@gmail.com'})
     });
     assert.equal(response.status,401);
   }
   const health = await fetch('http://127.0.0.1:'+port+'/api/health');
   assert.equal(health.status,200);
   assert.equal((await health.json()).deploymentCheck, 'ready');
 } finally { await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve())); }
});
