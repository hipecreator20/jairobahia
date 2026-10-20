import React, { useState, useEffect } from 'react';
import {
  Film,
  Sparkles,
  Plus,
  BookOpen,
  Clapperboard,
  Copy,
  Check,
  Download,
  Trash2,
  Edit3,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDeleteFeedback } from '../hooks/useDeleteFeedback';
import { Story, Scene, Character } from '../types';
import {
  subscribeStories,
  createStory,
  saveStorySequence,
  updateStory,
  deleteStory,
  subscribeScenes,
  createScene,
  updateScene,
  deleteScene,
  parseSceneDuration,
  formatVisualStyleWithDuration,
} from '../firebase/services/storyService';
import { subscribeCharacters } from '../firebase/services/characterService';
import {
  generateStoryScriptWithGemini,
  GeneratedStoryScriptResult,
} from '../services/geminiService';
import { CinematicTimeline } from '../components/story/CinematicTimeline';
import { ReferenceImageInput, ReferenceImage } from '../components/common/ReferenceImageInput';
import { loadReference, rememberReference, persistReference } from '../services/mediaService';
import { getWallet } from '../services/billingService';
import { AudioSyncPanel } from '../components/story/AudioSyncPanel';
import type { AudioCue } from '../../audio-sync';
import { audioInstructions } from '../../audio-sync';

const GENRES = [
  'Cinematográfico & Drama',
  'Cyberpunk & Sci-Fi',
  'Fashion Film & Alta Costura',
  'Suspense & Mistério',
  'Ação & Adrenalina',
  'Lifestyle & Documentário',
  'Terror Psicológico',
];

const FORMATS = [
  { id: 'short_film', label: 'Curta-Metragem Cinematográfico (3 a 5 min)' },
  { id: 'reels_series', label: 'Microssérie para Reels / TikTok (60s por episódio)' },
  { id: 'commercial', label: 'Comercial de Luxo / Fashion Teaser (30s)' },
  { id: 'trailer', label: 'Teaser / Trailer Cinematográfico (90s)' },
];

const TONES = [
  'Dramático e Sofisticado',
  'Sombrio, Tenso e Atmosférico',
  'Energético, Rápido e Marcante',
  'Poético, Contemplativo e Elegante',
  'Futurológico e Imersivo',
];

export const StoryStudio: React.FC = () => {
  const { user } = useAuth();
  const { deleting, deleteMessage, removeItem } = useDeleteFeedback();
  const [activeTab, setActiveTab] = useState<'historias' | 'criar'>('historias');

  // Selected Story for Editing/Viewing
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Generation Form State
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [format, setFormat] = useState(FORMATS[0].label);
  const [tone, setTone] = useState(TONES[0]);
  const [selectedCharNames, setSelectedCharNames] = useState<string[]>([]);
  const [sceneCount, setSceneCount] = useState(6);
  const [clipDuration,setClipDuration] = useState(8);
  const [platform,setPlatform] = useState('Flow');
  const [draftReference,setDraftReference] = useState<ReferenceImage|null>(null);
  const [storyReferences,setStoryReferences] = useState<Record<string,ReferenceImage>>({});
  const [audioCues,setAudioCues] = useState<AudioCue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Firestore Subscriptions
  const [stories, setStories] = useState<Story[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  // UI helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newScenePrompt, setNewScenePrompt] = useState('');
  const [newSceneDuration, setNewSceneDuration] = useState(8);
  const [newSceneVisualStyle, setNewSceneVisualStyle] = useState('');
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [storyDisplayMode, setStoryDisplayMode] = useState<'timeline' | 'cards' | 'both'>('both');

  useEffect(() => {
    if (!user) return;
    const unsubStories = subscribeStories(user.uid, setStories);
    const unsubChars = subscribeCharacters(user.uid, setCharacters);

    return () => {
      unsubStories();
      unsubChars();
    };
  }, [user]);

  // Subscribe to scenes when a story is active
  useEffect(()=>{
    const id=selectedCharNames[0];if(!id)return;let alive=true;
    void loadReference({kind:'characters',id}).then(ref=>{if(alive && ref)setDraftReference(current=>current || ref);}).catch(()=>{});
    return()=>{alive=false;};
  },[selectedCharNames[0]]);
  useEffect(()=>{
    const timer = window.setInterval(()=>setStoryReferences(current=>Object.fromEntries(Object.entries(current).filter(([,ref])=>ref.expiresAt > Date.now()))),60_000);
    return ()=>window.clearInterval(timer);
  },[]);

  useEffect(() => {
    if (!user || !selectedStory) {
      setScenes([]);
      return;
    }
    const unsubScenes = subscribeScenes(selectedStory.id, user.uid, setScenes);
    return () => unsubScenes();
  }, [user, selectedStory]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleCharacter = (name: string) => {
    if (selectedCharNames.includes(name)) {
      setSelectedCharNames(selectedCharNames.filter((n) => n !== name));
    } else {
      setSelectedCharNames([...selectedCharNames, name]);
    }
  };

  const handleGenerateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!premise.trim()) {
      setErrorMessage('Por favor, informe a ideia ou premissa da história.');
      return;
    }
    if (!user) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const generated = await generateStoryScriptWithGemini({
        premise,
        genre,
        format,
        tone,
        characterIds: selectedCharNames,
        sceneCount,
        clipDuration,
        platform,
        referenceImage: draftReference?.dataUrl,
        userEmail: user.email || '',
      });

      // Save story to Firestore
      const newStory = await saveStorySequence({
        title: generated.title || 'História Sem Título',
        synopsis: `${generated.logline}\n\n${generated.synopsis}`.slice(0, 2000),
        characterIds: selectedCharNames,
        duration: clipDuration,
        scenes: generated.scenes,
        ownerId: user.uid,
      });
      if (draftReference) {
        const binding={kind:'stories' as const,id:newStory.id};rememberReference(binding,draftReference);
        let ref=draftReference;
        try{if((await getWallet()).mediaEnabled)ref=await persistReference(binding,draftReference);}catch{console.warn('História salva; referência mantida temporariamente.');}
        setStoryReferences(current=>({...current,[newStory.id]:ref}));
      }

      // Switch view to the new story
      setSelectedStory(newStory);
      setAudioCues([]);
      setActiveTab('historias');
      setPremise('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao gerar o roteiro cinematográfico.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    await removeItem('história e todas as suas cenas', async () => {
      await deleteStory(storyId);
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
      }
    });
  };

  const handleCreateManualScene = async () => {
    if (!selectedStory || !user || !newSceneTitle.trim()) return;
    try {
      const formattedStyle = formatVisualStyleWithDuration(
        newSceneVisualStyle || genre,
        newSceneDuration
      );

      await createScene({
        storyId: selectedStory.id,
        title: newSceneTitle.trim(),
        prompt: newScenePrompt.trim(),
        visualStyle: formattedStyle,
        status: 'ready',
        ownerId: user.uid,
      });
      // update sceneCount
      await updateStory(selectedStory.id, {
        ownerId: user.uid,
        sceneCount: scenes.length + 1,
      });
      setNewSceneTitle('');
      setNewScenePrompt('');
      setNewSceneDuration(5);
      setNewSceneVisualStyle('');
      setIsAddingScene(false);
    } catch {
      alert('Falha ao adicionar cena.');
    }
  };

  const handleDeleteSceneItem = async (sceneId: string) => {
    if (!selectedStory || !user) return;
    await removeItem('cena', async () => {
      await deleteScene(sceneId);
      await updateStory(selectedStory.id, {
        ownerId: user.uid,
        sceneCount: Math.max(0, scenes.length - 1),
      });
    });
  };

  const handleExportScreenplay = () => {
    if (!selectedStory) return;
    const textContent = `==================================================
HYPE CREATOR STUDIO 2.0 — ROTEIRO CINEMATOGRÁFICO
==================================================

TÍTULO: ${selectedStory.title.toUpperCase()}
STATUS: ${selectedStory.status.toUpperCase()}
DATA: ${new Date(selectedStory.createdAt).toLocaleDateString('pt-BR')}

SINOPSE & ARCO NARRATIVO:
${selectedStory.synopsis || 'Sem sinopse informada.'}

==================================================
DIVISÃO SEQUENCIAL DE CENAS & PROMPTS DE IA
==================================================

${scenes
  .map(
    (scene, idx) => `[CENA ${idx + 1}] ${scene.title.toUpperCase()}
ESTILO VISUAL: ${scene.visualStyle || 'Padrão Cinematográfico'}

PROMPT CINEMATOGRÁFICO (PARA MIDJOURNEY / GOOGLE FLOW / KLING / RUNWAY):
${scene.prompt || 'Sem prompt cadastrado.'}${audioInstructions(audioCues,scenes.slice(0,idx).reduce((sum,item)=>sum+parseSceneDuration(item.visualStyle),0)*1000,parseSceneDuration(scene.visualStyle)*1000)}

--------------------------------------------------`
  )
  .join('\n\n')}
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedStory.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_roteiro.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {deleteMessage && <p role="status" className="rounded-xl border border-zinc-700 p-3 text-sm text-zinc-200">{deleteMessage}</p>}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-6 h-6 text-[#DFFF00]" />
              <span>Story Studio</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#DFFF00]/15 text-[#DFFF00] text-[10px] font-bold uppercase tracking-wider">
              Screenplay Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Planejamento narrativo, roteirização em 3 atos e geração de prompts sequenciais de cena.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-[#141414] border border-[#222] p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('historias');
              setSelectedStory(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'historias' && !selectedStory
                ? 'bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.2)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Minhas Histórias ({stories.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('criar');
              setSelectedStory(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'criar'
                ? 'bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.2)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Roteiro com IA</span>
          </button>
        </div>
      </div>

      {/* View Mode: Single Story Screenplay Editor */}
      {selectedStory ? (
        <div className="space-y-6">
          <ReferenceImageInput binding={{kind:'stories',id:selectedStory.id}} label="Primeira imagem: referência comum a todas as cenas" value={storyReferences[selectedStory.id] || null} onChange={value=>setStoryReferences(current=>{const next={...current};if(value)next[selectedStory.id]=value;else delete next[selectedStory.id];return next;})} />
          <AudioSyncPanel storyId={selectedStory.id} onChange={setAudioCues} />
          <p className="text-xs text-zinc-400">Baixe e anexe a mesma referência em cada clipe no gerador externo. Cada prompt inclui o DNA fixo e começa no estado final da cena anterior.</p>
          {/* Back button and action bar */}
          <div className="flex items-center justify-between gap-3 bg-[#141414] border border-[#222] p-4 rounded-2xl">
            <button
              onClick={() => setSelectedStory(null)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Histórias</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportScreenplay}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#DFFF00]" />
                <span>Exportar Roteiro (.txt)</span>
              </button>
              <button
                disabled={deleting} onClick={() => handleDeleteStory(selectedStory.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#201010] transition-colors cursor-pointer"
                title="Excluir história"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Story Card */}
          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#DFFF00]/15 text-[#DFFF00]">
                  {selectedStory.status === 'completed'
                    ? 'Concluído'
                    : selectedStory.status === 'in_progress'
                    ? 'Em Produção'
                    : 'Rascunho'}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{selectedStory.title}</h2>
              </div>
              <span className="text-xs text-zinc-400 tabular-nums">
                {scenes.length} cenas cadastradas
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#202020] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Sinopse & Estrutura Narrativa
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                {selectedStory.synopsis || 'Nenhuma sinopse cadastrada.'}
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Timeline vs Cards vs Both */}
          <div className="flex items-center justify-between gap-3 border-b border-[#222] pb-3">
            <div className="flex items-center gap-1 bg-[#141414] border border-[#222] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStoryDisplayMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  storyDisplayMode === 'timeline'
                    ? 'bg-[#DFFF00] text-black shadow-[0_0_10px_rgba(223,255,0,0.15)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Timeline Visual
              </button>
              <button
                type="button"
                onClick={() => setStoryDisplayMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  storyDisplayMode === 'cards'
                    ? 'bg-[#DFFF00] text-black shadow-[0_0_10px_rgba(223,255,0,0.15)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Roteiro & Fichas
              </button>
              <button
                type="button"
                onClick={() => setStoryDisplayMode('both')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  storyDisplayMode === 'both'
                    ? 'bg-[#DFFF00] text-black shadow-[0_0_10px_rgba(223,255,0,0.15)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Visualização Completa
              </button>
            </div>

            <button
              onClick={() => setIsAddingScene(!isAddingScene)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C14] border border-[#DFFF00]/40 text-[#DFFF00] text-xs font-bold hover:bg-[#DFFF00]/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingScene ? 'Cancelar' : 'Adicionar Cena Manual'}</span>
            </button>
          </div>

          {/* Cinematic Timeline Component */}
          {(storyDisplayMode === 'timeline' || storyDisplayMode === 'both') && (
            <CinematicTimeline
              story={selectedStory}
              scenes={scenes}
              audioCues={audioCues}
              ownerId={user?.uid || ''}
              onAddNewScene={() => setIsAddingScene(true)}
            />
          )}

          {/* Manual Scene Form */}
          {isAddingScene && (
            <div className="bg-[#141414] border border-[#DFFF00]/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#DFFF00]">
                  Adicionar Nova Cena à Timeline
                </h4>
                <button
                  onClick={() => setIsAddingScene(false)}
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Título / Cabeçalho da Cena *
                  </label>
                  <input
                    type="text"
                    value={newSceneTitle}
                    onChange={(e) => setNewSceneTitle(e.target.value)}
                    placeholder="Ex: CENA 5: INT. PENTHOUSE - AMANHECER"
                    className="w-full bg-[#0D0D0D] border border-[#262626] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DFFF00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Duração da Cena
                    </label>
                    <span className="text-xs text-[#DFFF00] font-mono font-bold">
                      {newSceneDuration}s
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[3, 5, 8, 10, 15, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setNewSceneDuration(sec)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          newSceneDuration === sec
                            ? 'bg-[#DFFF00] text-black'
                            : 'bg-[#202020] text-zinc-300 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Estilo Visual / Iluminação (Opcional)
                </label>
                <input
                  type="text"
                  value={newSceneVisualStyle}
                  onChange={(e) => setNewSceneVisualStyle(e.target.value)}
                  placeholder="Ex: Cinemático 35mm, Golden Hour, 24fps..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DFFF00]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Prompt Cinematográfico para IA
                </label>
                <textarea
                  rows={3}
                  value={newScenePrompt}
                  onChange={(e) => setNewScenePrompt(e.target.value)}
                  placeholder="Prompt cinematográfico em inglês para levar para ferramentas externas..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#DFFF00]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222]">
                <button
                  onClick={() => setIsAddingScene(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateManualScene}
                  className="px-4 py-1.5 rounded-lg bg-[#DFFF00] text-black text-xs font-bold hover:bg-[#c8e600]"
                >
                  Salvar Cena na Timeline
                </button>
              </div>
            </div>
          )}

          {/* Detailed Cards Section */}
          {(storyDisplayMode === 'cards' || storyDisplayMode === 'both') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clapperboard className="w-5 h-5 text-[#DFFF00]" />
                  <span>Fichas Detalhadas de Cena & Prompts</span>
                </h3>
              </div>

              {scenes.length === 0 ? (
                <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center space-y-2">
                  <p className="text-xs text-zinc-400">Nenhuma cena cadastrada nesta história ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scenes.map((scene, idx) => {
                    const dur = parseSceneDuration(scene.visualStyle);

                    return (
                      <div
                        key={scene.id}
                        className="bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl p-5 space-y-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#DFFF00] text-black font-extrabold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-bold text-white">{scene.title}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-[#1C1C14] border border-[#DFFF00]/30 text-[#DFFF00] text-[10px] font-mono font-bold">
                                {dur}s
                              </span>
                            </div>
                            {scene.visualStyle && (
                              <span className="text-[10px] text-zinc-400 mt-1 block">
                                Estilo: {scene.visualStyle.replace(/\s*\[\d+s\]|\s*·\s*\d+s/g, '')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {scene.prompt && (
                              <button
                                onClick={() => handleCopyText(scene.prompt || '', scene.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedKey === scene.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Prompt Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Prompt da Cena</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              disabled={deleting} onClick={() => handleDeleteSceneItem(scene.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#201010] transition-colors cursor-pointer"
                              title="Excluir cena"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Scene AI Prompt */}
                        {scene.prompt && (
                          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1f1f1f] text-xs text-zinc-200 font-mono leading-relaxed select-all">
                            {scene.prompt}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'criar' ? (
        /* Create New Screenplay Form */
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleGenerateStory}
            className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-5"
          >
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#DFFF00]" />
                <span>Roteirizador Cinematográfico com IA</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                O Gemini irá estruturar sua ideia em um arco narrativo em 3 atos e gerar as cenas com prompts prontos para uso externo.
              </p>
            </div>

            {/* Premise */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                Premissa ou Ideia da História *
              </label>
              <textarea
                rows={3}
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="Ex: Uma influenciadora de tecnologia descobre que um protótipo de IA em Tóquio está prevendo os próximos passos das pessoas antes que elas aconteçam..."
                className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Format & Genre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Formato da Produção
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                >
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.label}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Gênero Cinematográfico
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tone & Scenes count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Tom / Atmosfera
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Número de Cenas
                </label>
                <select
                  value={sceneCount}
                  onChange={(e) => setSceneCount(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value={3}>3 Cenas (Ato 1, Ato 2, Ato 3)</option>
                  <option value={4}>4 Cenas (Estrutura Padrão)</option>
                  <option value={5}>5 Cenas (Arco Expandido)</option>
                  <option value={6}>6 Cenas (Completo com Clímax)</option>
                  {[7,8,9,10,11,12].map(count=><option key={count} value={count}>{count} cenas contínuas</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Gerador de destino<select value={platform} onChange={e=>setPlatform(e.target.value)} className="mt-1 block w-full rounded-lg bg-zinc-900 p-3 text-white">{['Flow','Kling','Runway','Midjourney','Flux','Outro'].map(p=><option key={p}>{p}</option>)}</select></label><label className="text-xs text-zinc-400">Segundos por cena<input type="number" min={4} max={15} value={clipDuration} onChange={e=>setClipDuration(Number(e.target.value))} className="mt-1 block w-full rounded-lg bg-zinc-900 p-3 text-white"/></label></div>
            <ReferenceImageInput value={draftReference} onChange={setDraftReference} disabled={isGenerating} label="Upload da primeira imagem para guiar a sequência" />
            {/* Characters to link */}
            {characters.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#DFFF00]" />
                  <span>Personagens para Incluir na Trama</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {characters.map((char) => {
                    const isSelected = selectedCharNames.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={!isSelected && selectedCharNames.length >= 3} onClick={() => handleToggleCharacter(char.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1C1C14] border-[#DFFF00] text-[#DFFF00]'
                            : 'bg-[#0D0D0D] border-[#222] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="block truncate">{char.name}</span>
                        <span className="text-[10px] text-zinc-500 block truncate">{char.niche}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || !premise.trim()}
              className="w-full py-3.5 px-4 bg-[#DFFF00] hover:bg-[#c8e600] disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(223,255,0,0.2)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Escrevendo Roteiro & Prompts com Gemini...</span>
                </>
              ) : (
                <>
                  <Clapperboard className="w-4 h-4" />
                  <span>Gerar História & Cenas com IA</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Stories List Tab */
        <div>
          {stories.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto">
              <Film className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum roteiro cadastrado</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Comece criando sua primeira história com inteligência artificial para obter arcos dramáticos e prompts de cenas prontos para filmagem.
              </p>
              <button
                onClick={() => setActiveTab('criar')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Roteiro</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className="bg-[#141414] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-5 space-y-3 cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {story.status === 'completed'
                          ? 'Concluído'
                          : story.status === 'in_progress'
                          ? 'Em Produção'
                          : 'Rascunho'}
                      </span>
                      <span className="text-xs text-zinc-400 tabular-nums">
                        {story.sceneCount || 0} cenas estruturadas
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-[#DFFF00] transition-colors">
                      {story.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {story.synopsis}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#202020] flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(story.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[#DFFF00] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Abrir Timeline & Cenas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
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
