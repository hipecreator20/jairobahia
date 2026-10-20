import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Camera,
  Film,
  Copy,
  Check,
  BookmarkPlus,
  Trash2,
  Sliders,
  Layers,
  Search,
  ExternalLink,
  ChevronDown,
  Info,
  User,
  Share2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Character, PromptVersion } from '../types';
import { subscribeCharacters } from '../firebase/services/characterService';
import {
  subscribePrompts,
  savePromptVersion,
  deletePromptVersion,
} from '../firebase/services/promptService';
import {
  generatePromptWithGemini,
  GeneratedPromptResult,
} from '../services/geminiService';

const STYLES = [
  { id: 'cinematic_35mm', label: 'Cinema 35mm', desc: 'Película analógica, cores quentes, profundidade' },
  { id: 'fashion_vogue', label: 'Editorial Vogue', desc: 'Alta costura, pele natural, iluminação de estúdio' },
  { id: 'photoreal_8k', label: 'Hiper-Realismo 8K', desc: 'Nitidez cristalina, poros visíveis, micro-detalhes' },
  { id: 'cyberpunk_noir', label: 'Cyberpunk Noir', desc: 'Luzes de neon, chuva, asfalto molhado, clima sombrio' },
  { id: 'golden_sunset', label: 'Golden Hour Suave', desc: 'Sol poente dourado, rim light, atmosfera etérea' },
  { id: 'vintage_kodak', label: 'Vintage Kodak 70s', desc: 'Tons nostálgicos, granulação rústica, estética retrô' },
  { id: 'scifi_imax', label: 'Sci-Fi IMAX', desc: 'Escala monumental, iluminação volumétrica futurista' },
];

const LIGHTING_OPTIONS = [
  { id: 'golden_hour', label: 'Golden Hour (Luz Dourada)', desc: 'Brilho quente natural do entardecer' },
  { id: 'rembrandt', label: 'Rembrandt Studio', desc: 'Triângulo clássico na bochecha, contraste dramático' },
  { id: 'neon_noir', label: 'Neon Cyberpunk', desc: 'Luzes ciano e magenta com alto contraste' },
  { id: 'volumetric', label: 'Raios Volumétricos (God Rays)', desc: 'Feixes de luz atravessando a névoa' },
  { id: 'soft_diffuse', label: 'Luz Difusa Suave de Estúdio', desc: 'Sem sombras duras, visual comercial limpo' },
  { id: 'chiaroscuro', label: 'Chiaroscuro Intenso', desc: 'Sombras profundas e luz recortada barroca' },
];

const CAMERA_LENSES = [
  { id: 'arri_35mm', label: '35mm Arri Alexa Prime', desc: 'Padrão cinematográfico de Hollywood' },
  { id: '85mm_portrait', label: '85mm f/1.2 Editorial Portrait', desc: 'Isolamento perfeito do sujeito com bokeh cremoso' },
  { id: '50mm_anamorphic', label: '50mm Anamorphic T2.0', desc: 'Flares horizontais característicos e proporção cinema' },
  { id: '24mm_wide', label: '24mm Wide Cinematic', desc: 'Grande angular imersiva com dinamismo de ambiente' },
  { id: 'macro_probe', label: 'Laowa Macro Probe Lens', desc: 'Macro extremo em perspectiva única de detalhes' },
];

const CAMERA_MOVEMENTS = [
  { id: 'slow_push_in', label: 'Slow Push-In (Aproximação Lenta)', desc: 'Foco dramático crescendo na emoção do sujeito' },
  { id: 'steadicam_track', label: 'Steadicam Tracking Shot', desc: 'Câmera fluida acompanhando o movimento do personagem' },
  { id: 'drone_aerial', label: 'Drone Aéreo Cinematográfico', desc: 'Plano aberto monumental revelando o cenário' },
  { id: 'low_angle_hero', label: 'Low-Angle Heroic (Contra-Plongée)', desc: 'Câmera baixa conferindo imponência e poder' },
  { id: 'orbit_360', label: 'Orbit Shot 360 Graus', desc: 'Giro suave contínuo em volta do personagem' },
  { id: 'handheld_indie', label: 'Handheld Orgânico (Câmera na Mão)', desc: 'Leve respiração documental e realismo cru' },
];

const ATMOSPHERES = [
  { id: 'rain_reflections', label: 'Chuva & Reflexos no Asfalto' },
  { id: 'cinematic_fog', label: 'Neblina Suave Cinematográfica' },
  { id: 'golden_dust', label: 'Partículas Douradas em Suspensão' },
  { id: 'clean_wind', label: 'Vento Suave com Movimento de Cabelo' },
  { id: 'film_grain', label: 'Granulação Fina de Película 35mm' },
  { id: 'clean_minimal', label: 'Ar Cristalino e Neutro' },
];

const PLATFORMS = [
  { id: 'midjourney', label: 'Midjourney v6.1', badge: '--ar & --v 6.1', color: 'text-amber-400' },
  { id: 'google_flow', label: 'Google Flow / Imagen 3', badge: 'Narrativo 8K', color: 'text-emerald-400' },
  { id: 'flux', label: 'Flux.1 (Dev / Schnell)', badge: 'Puro & Preciso', color: 'text-blue-400' },
  { id: 'kling', label: 'Kling AI', badge: 'Vídeo Dinâmico', color: 'text-purple-400' },
  { id: 'runway', label: 'Runway Gen-3', badge: 'Motion Camera', color: 'text-rose-400' },
  { id: 'sora', label: 'OpenAI Sora / Luma', badge: 'Fotorrealismo Vídeo', color: 'text-cyan-400' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Cinema / YT' },
  { id: '9:16', label: '9:16 Reels / TikTok' },
  { id: '1:1', label: '1:1 Feed / Quadrado' },
  { id: '4:5', label: '4:5 Instagram Vertical' },
  { id: '2.39:1', label: '2.39:1 Anamórfico' },
];

export const PromptLab: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'gerar' | 'salvos'>('gerar');

  // Form State
  const [medium, setMedium] = useState<'image' | 'video'>('image');
  const [subject, setSubject] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].label);
  const [selectedAspect, setSelectedAspect] = useState('16:9');
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_OPTIONS[0].label);
  const [selectedLens, setSelectedLens] = useState(CAMERA_LENSES[0].label);
  const [selectedMovement, setSelectedMovement] = useState(CAMERA_MOVEMENTS[0].label);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState(ATMOSPHERES[0].label);
  const [selectedPlatform, setSelectedPlatform] = useState('midjourney');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPromptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Firestore Data
  const [characters, setCharacters] = useState<Character[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<PromptVersion[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Subscribe to Characters and Prompts
  useEffect(() => {
    if (!user) return;
    const unsubChar = subscribeCharacters(user.uid, setCharacters);
    const unsubPrompt = subscribePrompts(user.uid, setSavedPrompts);

    return () => {
      unsubChar();
      unsubPrompt();
    };
  }, [user]);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMessage('Por favor, descreva a ideia central ou assunto do prompt.');
      return;
    }
    if (!user) {
      setErrorMessage('Você precisa estar autenticado para gerar prompts.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const result = await generatePromptWithGemini({
        medium,
        subject,
        characterDna: selectedCharacter ? `${selectedCharacter.name} (${selectedCharacter.niche || ''}): ${selectedCharacter.visualDna || selectedCharacter.bio || ''}` : undefined,
        style: selectedStyle,
        aspectRatio: selectedAspect,
        lighting: selectedLighting,
        cameraLens: selectedLens,
        cameraMovement: selectedMovement,
        atmosphere: selectedAtmosphere,
        platform: selectedPlatform,
        additionalInstructions: additionalNotes,
        userEmail: user.email || '',
      });

      setGeneratedPrompt(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao gerar o prompt cinematográfico.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (!generatedPrompt || !user) return;
    setIsSaving(true);
    try {
      await savePromptVersion({
        title: generatedPrompt.title || subject.slice(0, 50),
        platform: selectedPlatform.toUpperCase(),
        content: generatedPrompt.masterPrompt,
        tags: [medium === 'video' ? 'Vídeo' : 'Imagem', selectedStyle, selectedAspect],
        ownerId: user.uid,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage('Falha ao salvar o prompt no Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedPrompt = async (id: string) => {
    if (!confirm('Deseja realmente excluir este prompt salvo?')) return;
    try {
      await deletePromptVersion(id);
    } catch (err: any) {
      alert('Falha ao excluir prompt.');
    }
  };

  const filteredPrompts = savedPrompts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.content.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPlatform =
      platformFilter === 'all' || (p.platform || '').toLowerCase().includes(platformFilter.toLowerCase());
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Wand2 className="w-6 h-6 text-[#DFFF00]" />
              <span>Prompt Lab</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#DFFF00]/15 text-[#DFFF00] text-[10px] font-bold uppercase tracking-wider">
              Cinematic Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Engenharia de prompts cinematográficos de alta fidelidade para imagens e vídeos em ferramentas externas.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-[#141414] border border-[#222] p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('gerar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gerar'
                ? 'bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.2)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Gerador Cinematográfico
          </button>
          <button
            onClick={() => setActiveTab('salvos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'salvos'
                ? 'bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.2)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Prompts Salvos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
              {savedPrompts.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'gerar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleGenerate} className="bg-[#141414] border border-[#242424] rounded-2xl p-5 sm:p-6 space-y-5">
              {/* Medium selector: Image vs Video */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                  1. Formato de Mídia
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMedium('image')}
                    className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      medium === 'image'
                        ? 'bg-[#1C1C14] border-[#DFFF00] text-[#DFFF00] shadow-[0_0_15px_rgba(223,255,0,0.1)]'
                        : 'bg-[#0D0D0D] border-[#222] text-zinc-400 hover:text-white hover:border-[#333]'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Fotografia / Imagem Estática</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedium('video')}
                    className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      medium === 'video'
                        ? 'bg-[#1C1C14] border-[#DFFF00] text-[#DFFF00] shadow-[0_0_15px_rgba(223,255,0,0.1)]'
                        : 'bg-[#0D0D0D] border-[#222] text-zinc-400 hover:text-white hover:border-[#333]'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>Vídeo Cinematográfico / Motion</span>
                  </button>
                </div>
              </div>

              {/* Subject description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                  2. Assunto Central & Ação da Cena *
                </label>
                <textarea
                  rows={3}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Mulher elegante caminhando por uma rua de paralelepípedos em Paris sob chuva fina, luz dos postes refletindo no asfalto molhado, expressão misteriosa olhando de relance para a câmera..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Character injection dropdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#DFFF00]" />
                    <span>3. Injetar Personagem (Opcional)</span>
                  </label>
                  {selectedCharacter && (
                    <span className="text-[11px] text-[#DFFF00] font-medium">
                      DNA Visual Conectado
                    </span>
                  )}
                </div>
                <select
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">Nenhum (Criar sujeito novo do zero)</option>
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} — {char.niche || 'Digital Model'}
                    </option>
                  ))}
                </select>
                {selectedCharacter && (
                  <p className="text-[11px] text-zinc-400 mt-1.5 p-2 bg-[#0A0A0A] rounded-lg border border-[#1f1f1f] font-mono line-clamp-2">
                    {selectedCharacter.visualDna || selectedCharacter.bio}
                  </p>
                )}
              </div>

              {/* Cinematography Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Style */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Estilo Fotográfico
                  </label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Proporção (Aspect Ratio)
                  </label>
                  <select
                    value={selectedAspect}
                    onChange={(e) => setSelectedAspect(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {ASPECT_RATIOS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lighting */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Iluminação
                  </label>
                  <select
                    value={selectedLighting}
                    onChange={(e) => setSelectedLighting(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {LIGHTING_OPTIONS.map((l) => (
                      <option key={l.id} value={l.label}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camera & Lens */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Câmera & Lente
                  </label>
                  <select
                    value={selectedLens}
                    onChange={(e) => setSelectedLens(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {CAMERA_LENSES.map((c) => (
                      <option key={c.id} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Movement / Angle */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    {medium === 'video' ? 'Movimento de Câmera' : 'Ângulo de Enquadramento'}
                  </label>
                  <select
                    value={selectedMovement}
                    onChange={(e) => setSelectedMovement(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {CAMERA_MOVEMENTS.map((m) => (
                      <option key={m.id} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Atmosphere */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Atmosfera & Clima
                  </label>
                  <select
                    value={selectedAtmosphere}
                    onChange={(e) => setSelectedAtmosphere(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {ATMOSPHERES.map((at) => (
                      <option key={at.id} value={at.label}>
                        {at.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Platform Pill Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                  4. Otimizar Parâmetros para Plataforma Externa
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS.map((plat) => (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => setSelectedPlatform(plat.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPlatform === plat.id
                          ? 'bg-[#1C1C14] border-[#DFFF00] shadow-[0_0_12px_rgba(223,255,0,0.12)]'
                          : 'bg-[#0D0D0D] border-[#222] hover:border-[#333]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${selectedPlatform === plat.id ? 'text-white' : 'text-zinc-300'}`}>
                          {plat.label}
                        </span>
                      </div>
                      <span className={`text-[10px] ${plat.color} font-mono mt-0.5 block`}>
                        {plat.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                  Notas Adicionais / Requisitos Especiais (Opcional)
                </label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Ex: sem bokeh excessivo, foco na textura do tecido, paleta verde-esmeralda..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Error display */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isGenerating || !subject.trim()}
                className="w-full py-3.5 px-4 bg-[#DFFF00] hover:bg-[#c8e600] disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(223,255,0,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Engenharia de Prompt com Gemini em Andamento...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>Gerar Prompt Cinematográfico com IA</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Output: 5 cols */}
          <div className="lg:col-span-5 space-y-4">
            {generatedPrompt ? (
              <div className="bg-[#141414] border border-[#282828] rounded-2xl p-5 space-y-4 shadow-xl">
                {/* Result header */}
                <div className="flex items-start justify-between gap-3 border-b border-[#222] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#DFFF00]/15 text-[#DFFF00]">
                      {medium === 'video' ? 'Prompt de Vídeo' : 'Prompt de Imagem'}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                      {generatedPrompt.title}
                    </h3>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveToLibrary}
                    disabled={isSaving || savedSuccess}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      savedSuccess
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-[#222] hover:bg-[#333] text-white'
                    }`}
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Salvo</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5 text-[#DFFF00]" />
                        <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Master Prompt in English */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#DFFF00] uppercase tracking-wider flex items-center gap-1">
                      <span>Master Prompt (English)</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(generatedPrompt.masterPrompt, 'master')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'master' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#222] text-xs text-zinc-200 font-mono leading-relaxed select-all">
                    {generatedPrompt.masterPrompt}
                  </div>
                </div>

                {/* Platform-optimized prompt */}
                {generatedPrompt.platformOptimized && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Versão Formatada: {selectedPlatform.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleCopyText(generatedPrompt.platformOptimized, 'platform')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedKey === 'platform' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0D0D0D] border border-[#1f1f1f] text-[11px] text-zinc-300 font-mono leading-relaxed select-all">
                      {generatedPrompt.platformOptimized}
                    </div>
                  </div>
                )}

                {/* Portuguese Art Direction Breakdown */}
                {generatedPrompt.portugueseTranslation && (
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#202020] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Direção de Arte & Raciocínio Visual
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {generatedPrompt.portugueseTranslation}
                    </p>
                  </div>
                )}

                {/* Camera Specs & Negative Prompt */}
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {generatedPrompt.cameraSpecs && (
                    <div className="p-2.5 rounded-lg bg-[#0C0C0C] border border-[#1c1c1c] text-zinc-400">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                        Setup de Câmera Recomendado:
                      </span>
                      <span className="text-zinc-300 text-[11px]">{generatedPrompt.cameraSpecs}</span>
                    </div>
                  )}

                  {generatedPrompt.negativePrompt && (
                    <div className="p-2.5 rounded-lg bg-[#0C0C0C] border border-[#1c1c1c] text-zinc-400">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">
                          Negative Prompt:
                        </span>
                        <button
                          onClick={() => handleCopyText(generatedPrompt.negativePrompt || '', 'negative')}
                          className="text-[10px] text-zinc-400 hover:text-white"
                        >
                          {copiedKey === 'negative' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <span className="text-zinc-400 font-mono text-[10px]">
                        {generatedPrompt.negativePrompt}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick copy buttons row */}
                <div className="pt-2 border-t border-[#222]">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">
                    Copiar com 1 Clique para Ferramenta Externa:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleCopyText(generatedPrompt.masterPrompt, 'q_midjourney')}
                      className="px-2 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      {copiedKey === 'q_midjourney' ? '✓ Copiado' : 'Midjourney'}
                    </button>
                    <button
                      onClick={() => handleCopyText(generatedPrompt.masterPrompt, 'q_flow')}
                      className="px-2 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      {copiedKey === 'q_flow' ? '✓ Copiado' : 'Google Flow'}
                    </button>
                    <button
                      onClick={() => handleCopyText(generatedPrompt.masterPrompt, 'q_kling')}
                      className="px-2 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      {copiedKey === 'q_kling' ? '✓ Copiado' : 'Kling / Runway'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Idle empty state */
              <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1C1C14] border border-[#DFFF00]/30 text-[#DFFF00] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(223,255,0,0.08)]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Pronto para Gerar Prompts</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Selecione os parâmetros cinematográficos ao lado e clique no botão para criar prompts calibrados para Midjourney, Google Flow, Kling, Flux e Runway.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0D0D0D] border border-[#202020] text-left text-xs text-zinc-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <Info className="w-3.5 h-3.5 text-[#DFFF00]" />
                    <span>Como utilizar na prática:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                    <li>Gere o prompt desejado no painel ao lado.</li>
                    <li>Copie o Master Prompt com 1 clique.</li>
                    <li>Cole diretamente na plataforma de IA de sua preferência.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Prompts Salvos Tab */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#141414] border border-[#222] p-3 rounded-xl">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar em prompts salvos..."
                className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#DFFF00]"
              />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#DFFF00] w-full sm:w-auto cursor-pointer"
            >
              <option value="all">Todas as Plataformas</option>
              <option value="midjourney">Midjourney</option>
              <option value="kling">Kling AI / Runway</option>
              <option value="flow">Google Flow / Flux</option>
            </select>
          </div>

          {filteredPrompts.length === 0 ? (
            <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center space-y-3">
              <Wand2 className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum prompt encontrado</h3>
              <p className="text-xs text-zinc-400">
                Gere novos prompts cinematográficos na aba Gerador e salve-os aqui para reutilização rápida.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPrompts.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl p-5 space-y-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#DFFF00]/15 text-[#DFFF00] text-[10px] font-bold">
                        {p.platform || 'Cinematic'}
                      </span>
                      {p.tags?.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(p.content, p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedKey === p.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Prompt</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSavedPrompt(p.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#201010] transition-colors cursor-pointer"
                        title="Excluir prompt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white">{p.title}</h3>

                  <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1f1f1f] text-xs text-zinc-300 font-mono leading-relaxed select-all">
                    {p.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
