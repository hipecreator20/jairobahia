import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {GoogleGenAI, ThinkingLevel} from '@google/genai';
import {createGeminiInteraction, interactionText} from '../gemini-interactions.js';
import {promptGenerationConfig, promptHistoryContext, PROMPT_TIMEOUT_MS} from '../prompt-generation.js';

test('Prompt Lab limits context without changing the stored history',()=>{
  const history=['old', 'a'.repeat(8000), 'b', 'c'];
  assert.deepEqual(promptHistoryContext(history), ['a'.repeat(1200),'b','c']);
  assert.equal(history[1].length,8000);
  assert.deepEqual(promptHistoryContext(null),[]);
  assert.deepEqual(promptHistoryContext([null,123,'valid']),['valid']);
});

test('Prompt Lab uses low thinking on Gemini 3 and a deadline below reservation expiry',()=>{
  const config=promptGenerationConfig('gemini-3.8-flash');
  assert.equal(config.thinkingConfig?.thinkingLevel,ThinkingLevel.LOW);
  assert.equal(config.httpOptions?.timeout,PROMPT_TIMEOUT_MS);
  assert.ok(PROMPT_TIMEOUT_MS<120_000);
  assert.equal(config.responseMimeType,'application/json');
  assert.equal(promptGenerationConfig('gemini-2.5-flash').thinkingConfig,undefined);
});

test('real SDK respects custom deadline, sends low thinking and never retries unavailable generation',async()=>{
  let requests=0, mode='success', received:any;
  const server=createServer(async(req,res)=>{
    requests++;
    let raw=''; for await(const chunk of req) raw+=chunk;
    received=JSON.parse(raw);
    res.setHeader('Content-Type','application/json');
    if(mode==='unavailable'){
      res.statusCode=503;
      res.end(JSON.stringify({error:{code:503,message:'Unavailable',status:'UNAVAILABLE'}}));
    } else if(mode==='success'){
      setTimeout(()=>res.end(JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}]})),40);
    }
    // Timeout mode intentionally leaves the response pending until cancellation.
  });
  server.listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const ai=new GoogleGenAI({apiKey:'local-test-only',httpOptions:{baseUrl:`http://127.0.0.1:${(server.address() as any).port}`}});
  const generate=(timeout:number)=>createGeminiInteraction(ai,{
    model:'gemini-3.8-flash', contents:'Test',
    config:{...promptGenerationConfig('gemini-3.8-flash'),httpOptions:{timeout}},
  });
  try{
    assert.equal(interactionText(await generate(2000)),'ok');
    assert.equal(received.generationConfig.thinkingConfig.thinkingLevel,'LOW');
    mode='unavailable';
    const before=requests;
    await assert.rejects(generate(2000));
    assert.equal(requests-before,1);
    mode='timeout';
    const started=Date.now();
    await assert.rejects(generate(100));
    assert.ok(Date.now()-started<1500,'must cancel at the configured deadline');
  }finally{
    server.closeAllConnections();
    await new Promise<void>(r=>server.close(()=>r()));
  }
});
