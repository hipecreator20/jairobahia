import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiInteraction,interactionImage,interactionText,toInteractionInput,toInteractionParams} from '../gemini-interactions.js';

test('legacy multimodal prompts map to stateless Interactions API v1 inputs',()=>{
  const params=toInteractionParams({model:'gemini-3.8-flash',contents:[{role:'user',parts:[{text:'analyze'},{inlineData:{mimeType:'audio/mpeg',data:'SUQz'}}]}],config:{systemInstruction:'json only',responseMimeType:'application/json',responseJsonSchema:{type:'object'}}});
  assert.equal(params.api_version,'v1');assert.equal(params.store,false);assert.equal(params.system_instruction,'json only');
  assert.deepEqual(params.input,[{type:'text',text:'analyze'},{type:'audio',data:'SUQz',mime_type:'audio/mpeg'}]);
  assert.deepEqual(params.response_format,[{type:'text',mime_type:'application/json',schema:{type:'object'}}]);
  assert.deepEqual(toInteractionInput('hello'),'hello');
});

test('image settings and response extraction match Interactions output fields',async()=>{
  const expected=toInteractionParams({model:'gemini-3.1-flash-image',contents:{parts:[{text:'draw'}]},config:{imageConfig:{aspectRatio:'16:9'}}});
  assert.deepEqual(expected.response_format,[{type:'image',aspect_ratio:'16:9'}]);
  let called:any;const response={output_text:'ok',output_image:{data:'iVBOR',mime_type:'image/png'}};
  const result=await createGeminiInteraction({interactions:{create:async(p:any)=>{called=p;return response;}}},{model:'gemini-3.1-flash-image',contents:'draw'});
  assert.equal(called.api_version,'v1');assert.equal(called.store,false);assert.equal(interactionText(result),'ok');assert.deepEqual(interactionImage(result),{data:'iVBOR',mimeType:'image/png'});
  assert.deepEqual(interactionImage({steps:[{type:'model_output',content:[{type:'image',data:'image',mime_type:'image/webp'}]}]}),{data:'image',mimeType:'image/webp'});
});
