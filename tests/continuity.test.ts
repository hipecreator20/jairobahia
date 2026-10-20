import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStoryResult,lockedIdentity,relinkScenePrompts,editableSceneAction,updateSceneAction,withCreativeIntent } from '../story-continuity.js';
import { parseReferenceImage } from '../media-reference.js';
import { referenceRetention } from '../media-storage.js';
const fixture=(count:number)=>({title:'A viagem',logline:'Uma pessoa encontra o seu caminho.',synopsis:'Uma jornada com começo, desafio e resolução.',identity:'Adult fictional Ana, brown eyes, short curly dark hair, blue jacket, silver ring.',scenes:Array.from({length:count},(_,i)=>({sceneNumber:i+1,title:`Cena ${i+1}`,visualStyle:'Luz natural',actionAndDialogue:'A personagem segue a jornada.',prompt:`Ana takes step ${i+1} along the path, medium tracking shot.`,startState:`Different initial state ${i}`,endState:`Ana stands at marker ${i+1}.`}))});
test('nine clips share an immutable identity and each starts at the previous ending',()=>{
  const result=validateStoryResult(fixture(9),9,8,'Flow');
  for(let i=0;i<result.scenes.length;i++){
    const prompt=result.scenes[i].prompt;
    assert.equal(lockedIdentity(prompt),result.identity);assert.ok(prompt.length<=2000);assert.match(prompt,/8s · Flow/);
    if(i)assert.ok(prompt.includes(`<START>\n${result.scenes[i-1].endState}\n</START>`));
  }
  const updated=updateSceneAction(result.scenes[0].prompt,'Ana gently opens the blue door.');
  assert.equal(lockedIdentity(updated),result.identity);assert.equal(editableSceneAction(updated),'Ana gently opens the blue door.');
  const reordered=relinkScenePrompts([result.scenes[2],result.scenes[0],result.scenes[1]].map(s=>({...s,visualStyle:'Natural [8s]'})));
  assert.ok(reordered[1].prompt.includes(`<START>\n${result.scenes[2].endState}\n</START>`));
  assert.match(reordered[0].prompt,/CLIP 1\/3/);
  assert.throws(()=>validateStoryResult(fixture(8),9,8,'Flow'),/exatamente/);
  const duplicate=fixture(3);duplicate.scenes[1].sceneNumber=1;assert.throws(()=>validateStoryResult(duplicate,3,8,'Flow'),/ordem/);
  assert.equal(withCreativeIntent(withCreativeIntent('brief')),withCreativeIntent('brief'));
});
test('reference upload validates formats; expired files cannot be resurrected by a late subscription',()=>{
  assert.throws(()=>parseReferenceImage('https://example.invalid/photo.jpg'),/upload/);
  assert.throws(()=>parseReferenceImage('data:image/jpeg;base64,PGh0bWw+'),/inválido/);
  const now=Date.now(),record={status:'ready',retention:'temporary',expiresAt:now};
  assert.equal(referenceRetention(record,{},now).action,'delete');
  const subscription={plan:'pro',status:'paid',startedAt:now-1000,endsAt:now+86400000};
  assert.equal(referenceRetention(record,{subscription},now).action,'extend');
  assert.equal(referenceRetention(record,{subscription:{...subscription,startedAt:now+1}},now+2).action,'delete');
  assert.equal(referenceRetention({...record,retention:'subscription',expiresAt:now+86400000},{subscription:{...subscription,status:'unpaid'}},now).action,'delete');
});
