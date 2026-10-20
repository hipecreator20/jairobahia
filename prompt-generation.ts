import { ThinkingLevel, type GenerateContentConfig } from '@google/genai';
import { promptSchema } from './prompt-quality.js';

// 90s is below both the 120s function budget and the existing reservation expiry.
export const PROMPT_TIMEOUT_MS = 90_000;
export function promptGenerationConfig(model: string): GenerateContentConfig {
  return {
    responseMimeType: 'application/json',
    responseJsonSchema: promptSchema,
    // Only opt supported Gemini 3 text models into the low-latency thinking profile.
    ...(/^gemini-3\./.test(model.replace(/^models\//, '')) ? {thinkingConfig:{thinkingLevel:ThinkingLevel.LOW}} : {}),
    httpOptions: {timeout:PROMPT_TIMEOUT_MS},
  };
}

export function promptHistoryContext(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // Full history remains in the duplicate check; the model only needs recent examples.
  return value.filter((item):item is string=>typeof item==='string').slice(-3).map(item=>item.slice(0,1200));
}
