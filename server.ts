import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support payloads up to 15MB for image uploads/base64
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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
    phase: 'FASE 1 — FUNDAÇÃO PROFISSIONAL',
    timestamp: new Date().toISOString(),
  });
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
app.get('/api/gemini/status', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json({
      configured: false,
      verified: false,
      model: 'gemini-3.8-flash',
      message: 'Chave GEMINI_API_KEY não configurada no ambiente do servidor.',
    });
  }

  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({
        configured: false,
        verified: false,
        message: 'Falha ao inicializar o cliente GoogleGenAI.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Responda apenas com a palavra: OPERACIONAL',
    });

    const responseText = response.text ? response.text.trim() : '';

    return res.json({
      configured: true,
      verified: true,
      model: 'gemini-3.8-flash',
      message: 'Conexão com Google Gemini API verificada com sucesso em tempo real.',
      sampleEcho: responseText.slice(0, 50),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini verification check error:', error);
    return res.json({
      configured: true,
      verified: false,
      model: 'gemini-3.8-flash',
      message: 'Chave presente, porém a requisição de verificação falhou: ' + (error?.message || 'Erro de comunicação'),
      errorDetails: error?.message,
    });
  }
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.1-flash-lite-image',
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
      modelUsed: 'gemini-3.1-flash-lite-image',
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
      model: 'gemini-3.1-flash-lite-image',
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
      modelUsed: 'gemini-3.1-flash-lite-image',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
app.post('/api/storage/upload', async (req, res) => {
  try {
    const { assetId, imageBase64 } = req.body;
    if (!imageBase64 || !assetId) {
      return res.status(400).json({ success: false, message: 'Dados insuficientes para upload.' });
    }

    const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const filename = `${assetId}.png`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, Buffer.from(cleanBase64, 'base64'));

    return res.json({
      success: true,
      url: `/uploads/${filename}`,
      path: `uploads/${filename}`,
    });
  } catch (err: any) {
    console.error('Storage upload fallback error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// Mount Frontend (Vite in Dev / Static in Prod)
// ----------------------------------------------------
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HYPE CREATOR STUDIO 2.0 running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
