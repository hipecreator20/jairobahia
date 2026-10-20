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
  const res = await fetch('/api/system/info');
  if (!res.ok) {
    throw new Error('Falha ao obter informações do sistema.');
  }
  return res.json();
}

export async function checkGeminiStatus(): Promise<GeminiStatusInfo> {
  const res = await fetch('/api/gemini/status');
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
  const res = await fetch('/api/gemini/verify', {
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
  const res = await fetch('/api/gemini/generate-image', {
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
  const res = await fetch('/api/gemini/edit-image', {
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
  const res = await fetch('/api/gemini/generate-prompt', {
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
  const res = await fetch('/api/gemini/generate-story-script', {
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
  const res = await fetch('/api/gemini/generate-character-prompt', {
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

