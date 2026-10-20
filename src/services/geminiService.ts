import { appCheck, auth } from '../firebase/config';
import { getToken } from 'firebase/app-check';
import { GeminiStatusInfo } from '../types';

export interface SystemConfigInfo {
  appName: string;
  ownerEmail: string;
  firebaseProjectId: string;
  storageBucket: string;
  geminiConfigured: boolean;
  environment: string;
}

export interface GeneratedImageResponse {
  success: boolean;
  imageUrl?: string;
  aspect?: string;
  modelUsed?: string;
  prompt?: string;
  createdAt?: string;
  message?: string;
}

export async function fetchSystemInfo(): Promise<SystemConfigInfo> {
  const res = await authenticatedFetch('/api/system/info');
  if (!res.ok) {
    throw new Error('Falha ao obter informações do sistema.');
  }
  return res.json();
}

export async function checkGeminiStatus(): Promise<GeminiStatusInfo> {
  const res = await authenticatedFetch('/api/gemini/status');
  if (!res.ok) {
    throw new Error('Falha na requisição de status do Gemini.');
  }
  return res.json();
}

export async function verifyGeminiLive(): Promise<{
  success: boolean;
  latencyMs?: number;
  response?: string;
  message?: string;
  testedAt?: string;
}> {
  const res = await authenticatedFetch('/api/gemini/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function generateImageWithGemini(params: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  userEmail: string;
}): Promise<GeneratedImageResponse> {
  const res = await authenticatedFetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Falha na geração de imagem pelo Gemini.');
  }

  return data;
}

export async function editImageWithGemini(params: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  userEmail: string;
}): Promise<GeneratedImageResponse> {
  const res = await authenticatedFetch('/api/gemini/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Falha na edição da imagem pelo Gemini.');
  }

  return data;
}

// ----------------------------------------------------
// Prompt Lab API Types & Methods
// ----------------------------------------------------
export interface GeneratePromptParams {
  medium?: 'image' | 'video';
  subject: string;
  characterDna?: string;
  style?: string;
  aspectRatio?: string;
  lighting?: string;
  cameraLens?: string;
  cameraMovement?: string;
  atmosphere?: string;
  platform?: string;
  additionalInstructions?: string;
  userEmail: string;
}

export interface GeneratedPromptResult {
  success: boolean;
  title: string;
  masterPrompt: string;
  platformOptimized: string;
  portugueseTranslation: string;
  cameraSpecs?: string;
  negativePrompt?: string;
  recommendedPlatform?: string;
  generatedAt?: string;
  message?: string;
}

export async function generatePromptWithGemini(
  params: GeneratePromptParams
): Promise<GeneratedPromptResult> {
  const res = await authenticatedFetch('/api/gemini/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Falha ao gerar o prompt cinematográfico.');
  }

  return data;
}

// ----------------------------------------------------
// Story Studio API Types & Methods
// ----------------------------------------------------
export interface GenerateStoryScriptParams {
  premise: string;
  genre?: string;
  format?: string;
  tone?: string;
  characterNames?: string[];
  characterIds?: string[];
  clipDuration?: number;
  platform?: string;
  referenceImage?: string;
  sceneCount?: number;
  userEmail: string;
}

export interface GeneratedStoryScene {
  sceneNumber: number;
  title: string;
  visualStyle: string;
  actionAndDialogue: string;
  prompt: string;
}

export interface GeneratedStoryScriptResult {
  success: boolean;
  title: string;
  logline: string;
  synopsis: string;
  scenes: GeneratedStoryScene[];
  generatedAt?: string;
  message?: string;
}

export async function generateStoryScriptWithGemini(
  params: GenerateStoryScriptParams
): Promise<GeneratedStoryScriptResult> {
  const res = await authenticatedFetch('/api/gemini/generate-story-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Falha ao gerar o roteiro cinematográfico.');
  }

  return data;
}

// ----------------------------------------------------
// Character Studio API Types & Methods
// ----------------------------------------------------
export interface GenerateCharacterPromptParams {
  name: string;
  niche?: string;
  bio?: string;
  physicalTraits?: string;
  wardrobe?: string;
  personality?: string;
  referenceImage?: string;
  userEmail: string;
}

export interface GeneratedCharacterPromptResult {
  success: boolean;
  masterPrompt: string;
  summaryPt?: string;
  triggerWords?: string[];
  message?: string;
}

export async function generateCharacterMasterPromptWithGemini(
  params: GenerateCharacterPromptParams
): Promise<GeneratedCharacterPromptResult> {
  const res = await authenticatedFetch('/api/gemini/generate-character-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Falha ao gerar o Master Prompt do personagem.');
  }

  return data;
}


export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre com sua conta para continuar.');
  const headers = new Headers(init.headers);
  if (init.method === 'POST' && String(input).includes('/api/gemini/')) headers.set('Idempotency-Key', headers.get('Idempotency-Key') || crypto.randomUUID());
  headers.set('Authorization', 'Bearer ' + await user.getIdToken());
  if (appCheck) headers.set('X-Firebase-AppCheck', (await getToken(appCheck)).token);
  const response = await fetch(input, { ...init, headers });
  if (response.headers.has('X-Coins-Spent')) window.dispatchEvent(new Event('wallet-changed'));
  // Hosting failures may be plain text/HTML. Never expose a JSON parser error.
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return new Response(JSON.stringify({success:false,message:'O servidor não concluiu a solicitação. Atualize o saldo em dois minutos; reservas de gerações interrompidas são estornadas automaticamente.'}), {status:response.ok?502:response.status,headers:{'Content-Type':'application/json'}});
  }
  if (!response.ok) {
    const data = await response.clone().json().catch(() => null);
    if (data?.requestId) return new Response(JSON.stringify({...data,message:`${data.message || 'Falha na solicitação.'} Referência: ${data.requestId}`}),{status:response.status,headers:response.headers});
  }
  return response;
}
