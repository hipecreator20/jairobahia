import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promptFingerprint, repeatsRecentPrompt, validatePromptResult } from '../prompt-quality.js';

test('prompt repetition rejects punctuation/case changes and near copies but allows new compositions', () => {
  const original = 'A lone cyclist crosses a rain swept concrete bridge at dawn, framed from the river bank with cold blue reflections and a warm bicycle headlamp.';
  assert.equal(promptFingerprint(original), promptFingerprint(original.toUpperCase().replace(',', '!!!')));
  assert.equal(repeatsRecentPrompt(original + ' Soft mist.', [original]), true);
  assert.equal(repeatsRecentPrompt('An overhead studio still life of sliced oranges arranged in concentric circles on a cobalt ceramic plate, with hard afternoon shadows.', [original]), false);
  assert.equal(repeatsRecentPrompt(original, []), false);
});

test('Gemini output validation rejects empty/oversized data and strips unknown fields', () => {
  const valid = {
    title: 'Travessia ao amanhecer',
    masterPrompt: 'A lone cyclist crosses a rain swept concrete bridge at dawn, framed from the river bank with cold blue reflections and a warm bicycle headlamp.',
    platformOptimized: 'Wide static composition at dawn: a cyclist crosses a concrete bridge above dark water, the warm headlamp reflected in the rain.',
    portugueseTranslation: 'Plano geral de uma ponte ao amanhecer com ciclista e reflexos frios contrastando com o farol quente.',
    cameraSpecs: '35mm, static wide shot', negativePrompt: '', recommendedPlatform: 'Flow',
  };
  assert.deepEqual(validatePromptResult({ ...valid, success: false }), valid);
  assert.throws(() => validatePromptResult({ ...valid, masterPrompt: '' }));
  assert.throws(() => validatePromptResult({ ...valid, title: 'x'.repeat(8001) }));
  assert.throws(() => validatePromptResult({ ...valid, cameraSpecs: null }));
});
