import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioInstructions,timecode,validateAudioCues} from '../audio-sync.js';
import {parseUploadedAudio} from '../audio-api.js';

test('millisecond cue sheets validate bounds and map the right segment to each clip',()=>{
  assert.equal(timecode(3_661_007),'01:01:01.007');
  const cues=validateAudioCues([{startMs:7900,endMs:8100,cue:'refrão',performance:'canta'}],16000);
  assert.match(audioInstructions(cues,8000,8000),/source 00:00:07\.900–00:00:08\.100/);
  assert.throws(()=>validateAudioCues([{startMs:1,endMs:9,cue:'a',performance:''},{startMs:8,endMs:10,cue:'b',performance:''}],100),/sobrepor/);
  assert.throws(()=>validateAudioCues([{startMs:0,endMs:101,cue:'a',performance:''}],100),/sobrepor/);
});

test('audio analysis accepts a matching audio file signature and rejects external URLs',()=>{
  const bytes=Buffer.alloc(32);bytes.write('RIFF',0);bytes.write('WAVE',8);
  assert.equal(parseUploadedAudio(`data:audio/wav;base64,${bytes.toString('base64')}`).mimeType,'audio/wav');
  assert.throws(()=>parseUploadedAudio('https://example.invalid/audio.mp3'),/Formato/);
});
