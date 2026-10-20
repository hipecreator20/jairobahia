import express from 'express';
import { createPlanHandler } from './admin-plan.js';
import dotenv from 'dotenv';
import path from 'path';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { fileURLToPath } from 'url';

import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : undefined;
const adminApp = getApps()[0] || initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
});
const MASTER_UID = 'FTqparyG04fCf9eDgUTa6e2tWgp2';
const requestWindows = new Map<string, { start: number; count: number }>();
const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
app.disable('x-powered-by');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support payloads up to 15MB for image uploads/base64
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Serve static public assets (including uploaded images)
app.use(express.static(path.resolve(__dirname, 'public')));

// Active generation requests map to prevent duplicate requests
const activeGenerations = new Set<string>();

// Initialize server-side Gemini client
let geminiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiInstance) {
    geminiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiInstance;
}

// ----------------------------------------------------
// System & Health Endpoints
// ----------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'HYPE CREATOR STUDIO 2.0',
    deploymentCheck: 'ready',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
  let token;
  try {
    token = await getAuth(adminApp).verifyIdToken(bearer);
  } catch {
    return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
  }
  try {
    if (!token.email_verified || !token.uid) {
      return res.status(403).json({ success: false, message: 'Conta Google verificada necessária.' });
    }
    if (process.env.FIREBASE_APP_CHECK_REQUIRED === 'true') {
      const appCheckToken = req.header('X-Firebase-AppCheck');
      if (!appCheckToken) return res.status(401).json({ success: false, message: 'Validação App Check necessária.' });
      await getAppCheck(adminApp).verifyToken(appCheckToken);
    }
    const window = requestWindows.get(token.uid);
    const now = Date.now();
    if (window && now - window.start < 60_000 && window.count >= 60) return res.status(429).json({ success: false, message: 'Muitas solicitações. Aguarde um minuto.' });
    requestWindows.set(token.uid, !window || now - window.start >= 60_000 ? { start: now, count: 1 } : { ...window, count: window.count + 1 });
    const metersPrompts = /^\/gemini\/(generate-|edit-image|verify)/.test(req.path);
    let store: ReturnType<typeof getFirestore> | undefined;
    let profile: Record<string, any> = {};
    if (token.uid !== MASTER_UID || metersPrompts) {
      if (!serviceAccount) return res.status(503).json({ success: false, message: 'A autorização do Firebase Admin ainda não está configurada no servidor.' });
      store = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
      const profileRef = store.collection('users').doc(token.uid);
      const profileSnap = await profileRef.get();
      profile = profileSnap.data() || {};
      if (token.uid !== MASTER_UID && (!profileSnap.exists || profile.status !== 'approved')) return res.status(403).json({ success: false, message: 'Acesso aguardando aprovação ou suspenso.' });
    }
    if (metersPrompts && store) {
      const planSnap = await store.doc('settings/plans').get();
      const planId = ['free','pro','premium'].includes(profile.plan) ? profile.plan : 'free';
      const defaults: Record<string, number> = { free: 10, pro: 300, premium: 1000 };
      const configuredLimit = Number(planSnap.data()?.plans?.[planId]?.promptsPerMonth ?? defaults[planId]);
      const limit = Number.isSafeInteger(configuredLimit) && configuredLimit >= 0 && configuredLimit <= 100_000 ? configuredLimit : defaults[planId];
      const month = new Date().toISOString().slice(0, 7);
      const usageRef = store.collection('usage').doc(`${token.uid}_${month}`);
      try {
        await store.runTransaction(async tx => {
          const usageSnap = await tx.get(usageRef);
          const usage = usageSnap.data() || {};
          const count = Number(usage.count || 0);
          const minute = Math.floor(Date.now() / 60_000);
          const minuteCount = usage.minute === minute ? Number(usage.minuteCount || 0) : 0;
          if (count >= limit) throw new Error('PROMPT_LIMIT');
          if (minuteCount >= 20) throw new Error('RATE_LIMIT');
          tx.set(usageRef, { uid: token.uid, month, count: count + 1, minute, minuteCount: minuteCount + 1, plan: planId, updatedAt: new Date().toISOString() });
        });
        await store.collection('accessLogs').add({ uid: token.uid, email: token.email || '', event: 'ai_prompt', createdAt: new Date().toISOString(), details: { plan: planId } });
      } catch (error) {
        if (error instanceof Error && error.message === 'PROMPT_LIMIT') return res.status(429).json({ success: false, message: 'Limite mensal de prompts atingido.' });
        if (error instanceof Error && error.message === 'RATE_LIMIT') return res.status(429).json({ success: false, message: 'Limite temporário de gerações atingido. Aguarde um minuto.' });
        throw error;
      }
    }
    req.body = { ...req.body, userEmail: token.email };
    return next();
  } catch (error) {
    console.error('[HYPE API] Verificação de acesso falhou:', error);
    return res.status(503).json({ success: false, message: 'Não foi possível validar as permissões agora.' });
  }
});

app.patch('/api/admin/users/:uid/plan', createPlanHandler({
  masterUid: MASTER_UID,
  verifyToken: token => getAuth(adminApp).verifyIdToken(token, true),
  updatePlan: async (uid, plan, actorUid) => {
    if (!serviceAccount) throw new Error('Firebase Admin unavailable');
    const store = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
    const batch = store.batch();
    const updatedAt = new Date().toISOString();
    batch.update(store.collection('users').doc(uid), { plan, updatedAt });
    batch.create(store.collection('accessLogs').doc(), {
      uid, event: 'plan_changed', createdAt: updatedAt, details: { actorUid, plan },
    });
    await batch.commit();
  },
}));

app.patch('/api/admin/users/:uid/status', async (req, res) => {
  const actorUid = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const statuses = ['approved', 'rejected', 'suspended', 'pending'];
  if (!serviceAccount) return res.status(503).json({ success: false, message: 'Configure a credencial Firebase Admin no ambiente Vercel.' });
  try {
    const actor = await getAuth(adminApp).verifyIdToken(actorUid || '', true);
    if (actor.uid !== MASTER_UID) return res.status(403).json({ success: false, message: 'Ação exclusiva do Master.' });
    const { uid } = req.params;
    const { status } = req.body || {};
    if (!uid || uid === MASTER_UID || !statuses.includes(status)) return res.status(400).json({ success: false, message: 'Usuário ou status inválido.' });
    const auth = getAuth(adminApp);
    const target = await auth.getUser(uid);
    const store = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
    const profileRef = store.collection('users').doc(uid);
    // Denials take effect in Firestore before changing claims; approvals publish last.
    if (status !== 'approved') await profileRef.update({ status, updatedAt: new Date().toISOString() });
    const claims = { ...target.customClaims, approved: status === 'approved' };
    await auth.setCustomUserClaims(uid, claims);
    if (status !== 'approved') await auth.revokeRefreshTokens(uid);
    if (status === 'approved') await profileRef.update({ status, updatedAt: new Date().toISOString() });
    await store.collection('accessLogs').add({ uid, email: target.email || '', event: `access_${status}`, createdAt: new Date().toISOString(), details: { actorUid: actor.uid } });
    return res.json({ success: true, status });
  } catch (error) {
    console.error('[HYPE ADMIN] Falha ao alterar o acesso:', error);
    return res.status(500).json({ success: false, message: 'Não foi possível atualizar o acesso.' });
  }
});

app.get('/api/system/info', (_req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    appName: 'HYPE CREATOR STUDIO 2.0',
    ownerEmail: 'indicabrasiloficiall@gmail.com',
    firebaseProjectId: 'gen-lang-client-0704234685',
    storageBucket: 'gen-lang-client-0704234685.firebasestorage.app',
    geminiConfigured: hasGeminiKey,
    environment: isProd ? 'production' : 'development',
  });
});

// ----------------------------------------------------
// Gemini Server-Side Integration & Real Status Check
// ----------------------------------------------------
app.get('/api/gemini/status', (_req, res) => {
  res.json({ configured: Boolean(getAiClient()), verified: false, model: textModel,
    message: 'Use Verificar para testar a conexão com o provedor.' });
});

// Explicit verify endpoint for the Configurações panel
app.post('/api/gemini/verify', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(400).json({
      success: false,
      message: 'GEMINI_API_KEY não encontrada nas variáveis de ambiente.',
    });
  }

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente Gemini indisponível.');

    const start = Date.now();
    const result = await ai.models.generateContent({
      model: textModel,
      contents: 'Ping do Hype Creator Studio 2.0. Confirme estado em uma palavra.',
    });
    const latencyMs = Date.now() - start;

    return res.json({
      success: true,
      latencyMs,
      response: result.text?.trim() || 'OK',
      testedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Falha ao conectar com o serviço Gemini.',
    });
  }
});

// ----------------------------------------------------
// Image Lab: Real Server-Side Image Generation
// ----------------------------------------------------
app.post('/api/gemini/generate-image', async (req, res) => {
  const { prompt, style, aspectRatio = '1:1', userEmail } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'O prompt descritivo da imagem é obrigatório.' });
  }

  // Security check: Only the authorized owner is permitted
  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail !== 'indicabrasiloficiall@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Somente o proprietário autorizado pode gerar imagens.',
    });
  }

  // Prevent duplicate concurrent generation
  const requestKey = `gen_${normalizedEmail}`;
  if (activeGenerations.has(requestKey)) {
    return res.status(429).json({
      success: false,
      message: 'Uma geração já está em processamento no estúdio. Aguarde a conclusão da atual.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY não configurada no servidor. Configure a chave no painel de segredos.',
    });
  }

  activeGenerations.add(requestKey);

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente GoogleGenAI não inicializado.');

    // Build enhanced prompt with style modifier
    let enhancedPrompt = prompt.trim();
    if (style && style !== 'Nenhum' && style !== 'Padrão') {
      enhancedPrompt = `${prompt.trim()}, estilo ${style}, iluminação de estúdio profissional, cinematográfico, ultradetalhado 8k`;
    }

    // Supported aspect ratios for gemini-3.1-flash-lite-image: "1:1", "3:4", "4:3", "9:16", "16:9"
    let mappedAspect: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
    if (aspectRatio === '16:9') mappedAspect = '16:9';
    else if (aspectRatio === '9:16') mappedAspect = '9:16';
    else if (aspectRatio === '4:3') mappedAspect = '4:3';
    else if (aspectRatio === '3:4' || aspectRatio === '4:5') mappedAspect = '3:4';
    else mappedAspect = '1:1';

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: mappedAspect,
        },
      },
    });

    let generatedBase64: string | null = null;
    let mimeType = 'image/png';

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!generatedBase64) {
      const textPart = candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      throw new Error(textPart || 'O modelo não retornou dados de imagem para este prompt.');
    }

    return res.json({
      success: true,
      imageUrl: `data:${mimeType};base64,${generatedBase64}`,
      aspect: mappedAspect,
      modelUsed: imageModel,
      prompt: enhancedPrompt,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[HYPE GEMINI] Erro na geração de imagem:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Falha na comunicação com o modelo de geração de imagem do Gemini.',
    });
  } finally {
    activeGenerations.delete(requestKey);
  }
});

// ----------------------------------------------------
// Image Lab: Real Server-Side Image Editing (Image-to-Image)
// ----------------------------------------------------
app.post('/api/gemini/edit-image', async (req, res) => {
  const { prompt, imageBase64, mimeType = 'image/jpeg', userEmail } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'A instrução descritiva de edição é obrigatória.' });
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ success: false, message: 'A imagem original é obrigatória para realizar a edição.' });
  }

  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail !== 'indicabrasiloficiall@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Somente o proprietário autorizado pode editar imagens.',
    });
  }

  const requestKey = `edit_${normalizedEmail}`;
  if (activeGenerations.has(requestKey)) {
    return res.status(429).json({
      success: false,
      message: 'Uma operação de edição já está em andamento. Aguarde a conclusão.',
    });
  }

  activeGenerations.add(requestKey);

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente GoogleGenAI não inicializado.');

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          {
            text: `Edit this image according to these precise instructions: ${prompt.trim()}. Maintain high aesthetic quality and coherent composition.`,
          },
        ],
      },
    });

    let editedBase64: string | null = null;
    let outMime = 'image/png';

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          editedBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) outMime = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!editedBase64) {
      const textPart = candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      throw new Error(textPart || 'O modelo não retornou a imagem editada.');
    }

    return res.json({
      success: true,
      imageUrl: `data:${outMime};base64,${editedBase64}`,
      modelUsed: imageModel,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[HYPE GEMINI] Erro na edição de imagem:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Falha ao editar a imagem com o modelo Gemini.',
    });
  } finally {
    activeGenerations.delete(requestKey);
  }
});

// ----------------------------------------------------
// Prompt Lab: Professional Cinematic Prompt Generation (Gemini)
// ----------------------------------------------------
app.post('/api/gemini/generate-prompt', async (req, res) => {
  const {
    medium = 'image',
    subject,
    characterDna,
    style,
    aspectRatio = '16:9',
    lighting,
    cameraLens,
    cameraMovement,
    atmosphere,
    platform = 'midjourney',
    additionalInstructions,
    userEmail,
  } = req.body;

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ success: false, message: 'O assunto ou ideia central é obrigatório.' });
  }

  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail !== 'indicabrasiloficiall@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Somente o proprietário autorizado pode utilizar o Prompt Lab.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY não configurada no servidor.',
    });
  }

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente GoogleGenAI não inicializado.');

    const isVideo = medium === 'video';

    const systemPrompt = `Você é o Diretor de Fotografia e Engenheiro Chefe de Prompts Cinematográficos do HYPE CREATOR STUDIO 2.0.
Sua missão é criar prompts de elite para ferramentas de IA líderes do mercado (Google Flow, Midjourney v6.1, Flux.1, Kling AI, Runway Gen-3, OpenAI Sora, Higgsfield AI).

Instruções fundamentais:
1. O prompt principal (masterPrompt) DEVE SER EM INGLÊS impecável, técnico e cinematográfico. Inclua detalhes precisos de iluminação, lentes anamórficas ou esféricas, textura de pele natural, granulação de película (filmic grain), paleta cromática e atmosfera.
2. Se for VÍDEO (${isVideo ? 'SIM' : 'NÃO'}), inclua instruções explícitas de movimento de câmera (ex: slow push-in, tracking pan, steadicam, orbit), dinâmica de velocidade e ação temporal sem artefatos.
3. Se houver DNA de Personagem informado, incorpore as características fisionômicas com precisão cirúrgica para manter consistência absoluta.
4. Gere a versão customizada para a plataforma alvo selecionada (${platform}):
   - Se Midjourney: inclua parâmetros como --ar ${aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : aspectRatio === '4:5' ? '4:5' : '1:1'} --style raw --v 6.1 --stylize 250
   - Se Kling AI / Runway: inclua comandos dinâmicos de câmera e motion prompt
   - Se Google Flow / Flux: estruture em parágrafo denso e descritivo de alta fidelidade
5. Forneça uma tradução e direção de arte detalhada em português explicando a composição.

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem markdown ou crases (ou encapsulado em json), com o seguinte formato:
{
  "title": "Título evocativo da cena em português",
  "masterPrompt": "Prompt principal cinematográfico em inglês",
  "platformOptimized": "Prompt formatado especificamente com parâmetros para ${platform}",
  "portugueseTranslation": "Tradução detalhada e notas de direção de arte em português",
  "cameraSpecs": "Especificação técnica sugerida: lente, abertura, iluminação, paleta",
  "negativePrompt": "Termos negativos recomendados em inglês",
  "recommendedPlatform": "${platform}"
}`;

    const userPromptContent = `Dados para geração do prompt:
- Tipo de Mídia: ${isVideo ? 'Vídeo Cinematográfico / Motion' : 'Fotografia / Imagem Estática'}
- Assunto / Ação Principal: ${subject.trim()}
${characterDna ? `- DNA Visual do Personagem / Ancoragem: ${characterDna.trim()}` : ''}
${style ? `- Estilo Cinematográfico: ${style}` : ''}
- Proporção (Aspect Ratio): ${aspectRatio}
${lighting ? `- Iluminação: ${lighting}` : ''}
${cameraLens ? `- Câmera & Lente: ${cameraLens}` : ''}
${cameraMovement ? `- Ângulo e Movimento de Câmera: ${cameraMovement}` : ''}
${atmosphere ? `- Atmosfera / Clima: ${atmosphere}` : ''}
- Plataforma Alvo: ${platform}
${additionalInstructions ? `- Instruções Adicionais: ${additionalInstructions.trim()}` : ''}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
        { text: systemPrompt },
        { text: userPromptContent }
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text ? response.text.trim() : '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Falha ao processar a resposta estruturada do Gemini.');
      }
    }

    return res.json({
      success: true,
      ...parsedData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[HYPE PROMPT LAB] Erro na geração de prompt:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Falha ao gerar o prompt cinematográfico com o Gemini.',
    });
  }
});

// ----------------------------------------------------
// Story Studio: Professional Screenplay & Scenes Generation (Gemini)
// ----------------------------------------------------
app.post('/api/gemini/generate-story-script', async (req, res) => {
  const {
    premise,
    genre = 'Cinemático',
    format = 'curta-metragem',
    tone = 'dramático e sofisticado',
    characterNames = [],
    sceneCount = 4,
    userEmail,
  } = req.body;

  if (!premise || typeof premise !== 'string' || !premise.trim()) {
    return res.status(400).json({ success: false, message: 'A premissa ou ideia da história é obrigatória.' });
  }

  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail !== 'indicabrasiloficiall@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Somente o proprietário autorizado pode utilizar o Story Studio.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY não configurada no servidor.',
    });
  }

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente GoogleGenAI não inicializado.');

    const systemPrompt = `Você é o Showrunner e Roteirista Chefe do HYPE CREATOR STUDIO 2.0.
Crie um roteiro cinematográfico completo com arco narrativo estruturado e divisão sequencial em ${sceneCount || 4} cenas.
Para cada cena, forneça:
1. Título e cabeçalho formal de roteiro (ex: CENA 1: INT. COBERTURA EM PARIS - NOITE).
2. Estilo visual de direção de arte e fotografia (ex: 35mm anamórfico, luz de néon azul e âmbar, granulação cinematográfica).
3. Ação descritiva e diálogos/narração com ritmo profissional.
4. PROMPT CINEMATOGRÁFICO EM INGLÊS pronto para ser copiado para ferramentas de IA (Google Flow, Midjourney, Flux, Kling AI, Runway Gen-3).

Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{
  "title": "Título cinematográfico da história",
  "logline": "Sinopse rápida e impactante em 1 ou 2 frases",
  "synopsis": "Estrutura narrativa da história dividida em Ato 1 (Apresentação), Ato 2 (Conflito) e Ato 3 (Clímax/Resolução)",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "CENA 1: [CABEÇALHO]",
      "visualStyle": "Estilo visual e iluminação",
      "actionAndDialogue": "Ação detalhada dos personagens, ambiente e falas/narração",
      "prompt": "Cinematic visual prompt in English ready for AI image/video generation..."
    }
  ]
}`;

    const userPromptContent = `Premissa da História: ${premise.trim()}
Gênero: ${genre}
Formato: ${format}
Tom / Atmosfera: ${tone}
Personagens Envolvidos: ${characterNames.length > 0 ? characterNames.join(', ') : 'Novos personagens originais'}
Número de Cenas: ${sceneCount || 4}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: [
        { text: systemPrompt },
        { text: userPromptContent }
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text ? response.text.trim() : '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Falha ao processar a resposta estruturada do Gemini.');
      }
    }

    return res.json({
      success: true,
      ...parsedData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[HYPE STORY STUDIO] Erro na geração de roteiro:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Falha ao estruturar o roteiro cinematográfico com o Gemini.',
    });
  }
});

// ----------------------------------------------------
// Character Studio: Master Prompt & Visual DNA Generation (Gemini)
// ----------------------------------------------------
app.post('/api/gemini/generate-character-prompt', async (req, res) => {
  const {
    name,
    niche = 'Influenciador Digital',
    bio = '',
    physicalTraits = '',
    wardrobe = '',
    personality = '',
    userEmail,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'O nome do personagem é obrigatório.' });
  }

  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail !== 'indicabrasiloficiall@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: Somente o proprietário autorizado pode utilizar o Character Studio.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY não configurada no servidor.',
    });
  }

  try {
    const ai = getAiClient();
    if (!ai) throw new Error('Cliente GoogleGenAI não inicializado.');

    const promptText = `Atue como Especialista em Consistência de Personagens Virtuais e Engenharia de Master Prompts para IA.
Crie um PROMPT MESTRE (Master Prompt) ultra-detalhado em INGLÊS para o personagem abaixo.
O Prompt Mestre é o "DNA Visual" que será injetado em qualquer gerador externo (Midjourney, Flux, Kling, Runway, Google Flow) para manter a mesma face, cabelo, corpo, idade, textura de pele e essência estética.

Dados do Personagem:
- Nome: ${name.trim()}
- Nicho / Arquétipo: ${niche}
- Biografia / Contexto: ${bio}
- Detalhes Físicos / Fisionomia: ${physicalTraits || 'Rosto simétrico, traços marcantes, pele natural de alta definição'}
- Figurino / Estilo de Roupas: ${wardrobe || 'Estilo contemporâneo sofisticado e elegante'}
- Personalidade & Expressão: ${personality || 'Confiante, olhar magnético, presença marcante'}

Retorne EXCLUSIVAMENTE um objeto JSON válido:
{
  "masterPrompt": "O prompt mestre em inglês (máximo 1500 caracteres), denso, fotográfico e cirúrgico para ancoragem fisionômica",
  "summaryPt": "Resumo das características-chave do DNA visual em português",
  "triggerWords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"]
}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text ? response.text.trim() : '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Falha ao processar a resposta do Gemini.');
      }
    }

    return res.json({
      success: true,
      ...parsedData,
    });
  } catch (error: any) {
    console.error('[HYPE CHARACTER STUDIO] Erro ao gerar Master Prompt:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Falha ao gerar o Master Prompt com o Gemini.',
    });
  }
});

// ----------------------------------------------------
// Image Lab: Fallback Disk Storage Upload
// ----------------------------------------------------
app.post('/api/storage/upload', (_req, res) => {
  res.status(410).json({ success: false, message: 'Utilize o Firebase Storage para uploads persistentes.' });
});

app.use('/api', (_req, res) => { res.status(404).json({ success: false, message: 'Endpoint não encontrado.' }); });

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log('Hype Creator Studio: http://localhost:' + PORT));
}
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') void startServer();
export default app;
