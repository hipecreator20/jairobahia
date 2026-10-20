import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {GoogleGenAI} from '@google/genai';
import {createGeminiInteraction,interactionImage,interactionText} from '../gemini-interactions.js';

test('real SDK serializes multimodal GenerateContent and parses structured text',async()=>{
  let received:any,url='';
  const server=createServer(async(req,res)=>{
    url=req.url||'';let raw='';for await(const chunk of req)raw+=chunk;
    received=JSON.parse(raw);
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({candidates:[{content:{role:'model',parts:[{text:'{"prompt":"A consistent character"}'}]}}]}));
  });
  server.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const ai=new GoogleGenAI({apiKey:'local-test-only',httpOptions:{baseUrl:`http://127.0.0.1:${(server.address() as any).port}`}});
  try {
    const result=await createGeminiInteraction(ai,{model:'gemini-3.8-flash',contents:[{role:'user',parts:[{text:'Describe this fictional character'},{inlineData:{mimeType:'image/png',data:'aW1hZ2U='}}]}],config:{systemInstruction:'Keep identity consistent',responseMimeType:'application/json',responseJsonSchema:{type:'object',properties:{prompt:{type:'string'}},required:['prompt']}}});
    assert.match(url,/:generateContent$/);
    assert.equal(received.input,undefined);
    assert.deepEqual(received.contents[0].parts[1],{inlineData:{mimeType:'image/png',data:'aW1hZ2U='}});
    assert.equal(received.generationConfig.responseMimeType,'application/json');
    assert.equal(JSON.parse(interactionText(result)).prompt,'A consistent character');
  } finally {await new Promise<void>(r=>server.close(()=>r()));}
});
test('image extraction ignores thoughts and uses SDK inlineData',()=>{
  assert.deepEqual(interactionImage({candidates:[{content:{parts:[{thought:true,inlineData:{data:'hidden'}},{inlineData:{mimeType:'image/png',data:'real'}}]}}]}),{data:'real',mimeType:'image/png'});
  assert.equal(interactionImage({candidates:[]}),null);
});
