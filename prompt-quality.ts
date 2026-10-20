import { createHash } from 'node:crypto';
import { CREATIVE_INTENT } from './story-continuity.js';

const fields = ['title', 'masterPrompt', 'platformOptimized', 'portugueseTranslation', 'cameraSpecs', 'negativePrompt', 'recommendedPlatform'] as const;
export type PromptResult = Record<typeof fields[number], string>;
export const promptSchema = {
  type: 'object',
  properties: Object.fromEntries(fields.map(field => [field, { type: 'string' }])),
  required: [...fields],
  additionalProperties: false,
};

function normalize(text: string): string {
  return text.replaceAll(CREATIVE_INTENT, '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function promptFingerprint(text: string): string {
  return createHash('sha256').update(normalize(text)).digest('hex');
}

export function repeatsRecentPrompt(text: string, recent: string[]): boolean {
  const normalized = normalize(text);
  const words = new Set(normalized.split(' '));
  return recent.some(previous => {
    if (normalize(previous) === normalized) return true;
    const other = new Set(normalize(previous).split(' '));
    const shared = [...words].filter(word => other.has(word)).length;
    return shared / (words.size + other.size - shared) >= 0.85;
  });
}

export function validatePromptResult(value: unknown): PromptResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta inválida do Gemini.');
  const data = value as Record<string, unknown>;
  const result = {} as PromptResult;
  for (const field of fields) {
    if (typeof data[field] !== 'string' || data[field].length > 8000) throw new Error('Resposta incompleta do Gemini.');
    result[field] = data[field].trim();
  }
  if (!result.title || result.masterPrompt.length < 100 || result.platformOptimized.length < 80 || result.portugueseTranslation.length < 40) {
    throw new Error('O Gemini não entregou um prompt suficientemente detalhado. Tente uma nova composição.');
  }
  return result;
}
