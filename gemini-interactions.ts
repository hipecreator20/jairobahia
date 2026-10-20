import type { GoogleGenAI, GenerateContentParameters } from '@google/genai';

// Keep one typed adapter for every route. GenerateContent accepts SDK contents,
// including inlineData; Interactions v1 uses a different wire format.
export async function createGeminiInteraction(ai: Pick<GoogleGenAI, 'models'>, params: GenerateContentParameters) {
  const timeout = params.config?.httpOptions?.timeout ?? 45_000;
  return ai.models.generateContent({ ...params, config: {
    ...params.config,
    // Bound the whole request, including SDK behavior, and never silently repeat a paid generation.
    abortSignal: params.config?.abortSignal
      ? AbortSignal.any([params.config.abortSignal, AbortSignal.timeout(timeout)])
      : AbortSignal.timeout(timeout),
    httpOptions: { ...params.config?.httpOptions, timeout, retryOptions: { attempts: 1 } },
  }});
}
export function interactionText(response: any): string {
  if (typeof response?.text === 'string') return response.text;
  return (response?.candidates?.[0]?.content?.parts || []).filter((p:any)=>!p.thought).map((p:any)=>p.text || '').join('');
}
export function interactionImage(response: any): {data:string;mimeType:string}|null {
  const part = (response?.candidates?.[0]?.content?.parts || []).find((p:any)=>p.inlineData?.data && !p.thought);
  return part ? {data:part.inlineData.data,mimeType:part.inlineData.mimeType || 'image/png'} : null;
}
