import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Download,
  BookmarkPlus,
  RefreshCw,
  Upload,
  Check,
  AlertCircle,
  Eye,
  Trash2,
  Copy,
  Folder,
  Layers,
  ArrowRight,
  Maximize2,
  X,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImageAsset, Project } from '../types';
import {
  generateImageWithGemini,
  editImageWithGemini,
  GeneratedImageResponse,
} from '../services/geminiService';
import {
  subscribeImageAssets,
  saveImageAsset,
  deleteImageAsset,
  seedInitialImageAssetsIfEmpty,
} from '../firebase/services/imageService';
import { subscribeProjects } from '../firebase/services/projectService';

// Photography style presets
const STYLE_PRESETS = [
  { id: 'cinematic', label: 'Cinematográfico', promptSuffix: 'fotografia cinematográfica 35mm, iluminação de cinema, granulação sutil' },
  { id: 'fashion', label: 'Editorial Fashion', promptSuffix: 'estilo editorial Vogue, alta costura, iluminação suave de estúdio' },
  { id: 'realism', label: 'Fotorrealismo 8K', promptSuffix: 'fotorrealista ultra-detalhado 8k, textura de pele natural, nitidez extrema' },
  { id: 'cyberpunk', label: 'Cyberpunk & Neon', promptSuffix: 'estética cyberpunk, iluminação neon azul e amarelo, reflexos noturnos' },
  { id: 'luxury', label: 'Estúdio de Luxo', promptSuffix: 'iluminação suave difusa, fundo neutro elegante, tons quentes sofisticados' },
  { id: 'vintage', label: 'Filme Vintage', promptSuffix: 'estética analógica retrô, cores Kodachrome, atmosfera nostálgica' },
];

// Aspect ratio options
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Quadrado', desc: 'Feed & Avatares', class: 'aspect-square' },
  { id: '4:5', label: '4:5 Vertical', desc: 'Instagram & Portfólio', class: 'aspect-[4/5]' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Reels, Stories & TikTok', class: 'aspect-[9/16]' },
  { id: '16:9', label: '16:9 Panorâmico', desc: 'Cinema & YouTube', class: 'aspect-video' },
];

export const ImageLab: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'gerar' | 'editar' | 'galeria'>('gerar');

  // Firestore Data
  const [savedImages, setSavedImages] = useState<ImageAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // ----------------------------------------------------
  // Tab 1: Gerar Imagens State
  // ----------------------------------------------------
  const [genPrompt, setGenPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [selectedAspect, setSelectedAspect] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GeneratedImageResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isSavingGen, setIsSavingGen] = useState(false);
  const [genSavedSuccess, setGenSavedSuccess] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // ----------------------------------------------------
  // Tab 2: Editar Imagens State
  // ----------------------------------------------------
  const [editPrompt, setEditPrompt] = useState('');
  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editResult, setEditResult] = useState<GeneratedImageResponse | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editViewMode, setEditViewMode] = useState<'comparison' | 'result' | 'original'>('comparison');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSavedSuccess, setEditSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // Tab 3: Galeria State
  // ----------------------------------------------------
  const [searchFilter, setSearchFilter] = useState('');
  const [aspectFilter, setAspectFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<ImageAsset | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Load Firestore assets
  useEffect(() => {
    if (!user) return;

    seedInitialImageAssetsIfEmpty(user.uid);

    const unsubImages = subscribeImageAssets(
      user.uid,
      (list) => {
        setSavedImages(list);
        setLoadingGallery(false);
      },
      (err) => {
        console.error('Erro ao escutar galeria:', err);
        setLoadingGallery(false);
      }
    );

    const unsubProjects = subscribeProjects(user.uid, setProjects);

    return () => {
      unsubImages();
      unsubProjects();
    };
  }, [user]);

  // ----------------------------------------------------
  // Generation Handlers
  // ----------------------------------------------------
  const handleGenerateImage = async () => {
    if (!genPrompt.trim()) {
      setGenError('Por favor, descreva a imagem que deseja gerar.');
      return;
    }
    if (!user) {
      setGenError('Você precisa estar autenticado como proprietário.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setGenSavedSuccess(false);

    try {
      const styleObj = STYLE_PRESETS.find((s) => s.id === selectedStyle);
      const res = await generateImageWithGemini({
        prompt: genPrompt.trim(),
        style: styleObj ? styleObj.promptSuffix : undefined,
        aspectRatio: selectedAspect,
        userEmail: user.email || 'indicabrasiloficiall@gmail.com',
      });

      setGenResult(res);
    } catch (err: any) {
      console.error('Erro ao gerar imagem:', err);
      setGenError(err.message || 'Falha na comunicação com a API Gemini.');
    } finally {
      setIsGenerating(false);
      setShowRegenConfirm(false);
    }
  };

  const handleSaveGeneratedImage = async () => {
    if (!genResult?.imageUrl || !user) return;
    setIsSavingGen(true);
    try {
      const title = genPrompt.slice(0, 40) || 'Geração com Gemini';
      await saveImageAsset({
        title,
        prompt: genPrompt,
        aspect: selectedAspect,
        modelUsed: genResult.modelUsed || 'gemini-3.1-flash-lite-image',
        ownerId: user.uid,
        projectId: selectedProjectId || undefined,
        imageBase64: genResult.imageUrl,
      });

      setGenSavedSuccess(true);
      setTimeout(() => setGenSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar na galeria:', err);
      setGenError('Erro ao persistir imagem na galeria.');
    } finally {
      setIsSavingGen(false);
    }
  };

  // ----------------------------------------------------
  // Image Editing Handlers
  // ----------------------------------------------------
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setEditError('Por favor, envie um arquivo de imagem válido (PNG, JPEG ou WEBP).');
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setEditError('A imagem deve ter no máximo 10MB.');
      return;
    }

    setEditError(null);
    setOriginalImageFile(file);
    setEditResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditImage = async () => {
    if (!originalImageBase64) {
      setEditError('Envie uma imagem original para editar.');
      return;
    }
    if (!editPrompt.trim()) {
      setEditError('Descreva as alterações que a IA deve realizar na imagem.');
      return;
    }
    if (!user) {
      setEditError('Você precisa estar autenticado como proprietário.');
      return;
    }

    setIsEditing(true);
    setEditError(null);
    setEditSavedSuccess(false);

    try {
      const res = await editImageWithGemini({
        prompt: editPrompt.trim(),
        imageBase64: originalImageBase64,
        mimeType: originalImageFile?.type || 'image/jpeg',
        userEmail: user.email || 'indicabrasiloficiall@gmail.com',
      });

      setEditResult(res);
      setEditViewMode('comparison');
    } catch (err: any) {
      console.error('Erro ao editar imagem:', err);
      setEditError(err.message || 'Falha ao processar edição da imagem com o modelo Gemini.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveEditedImage = async () => {
    if (!editResult?.imageUrl || !user) return;
    setIsSavingEdit(true);
    try {
      const title = `Edição: ${editPrompt.slice(0, 30)}`;
      await saveImageAsset({
        title,
        prompt: editPrompt,
        aspect: '1:1',
        modelUsed: editResult.modelUsed || 'gemini-3.1-flash-lite-image',
        ownerId: user.uid,
        imageBase64: editResult.imageUrl,
      });

      setEditSavedSuccess(true);
      setTimeout(() => setEditSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar imagem editada:', err);
      setEditError('Erro ao persistir imagem editada na galeria.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ----------------------------------------------------
  // Gallery Handlers
  // ----------------------------------------------------
  const handleDownloadImage = (url: string, filename = 'hype-studio-creation.png') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteGalleryImage = async (image: ImageAsset) => {
    if (!confirm(`Deseja remover "${image.title || 'esta imagem'}" da galeria?`)) return;
    setDeletingImageId(image.id);
    try {
      await deleteImageAsset(image.id, image.storagePath);
      if (lightboxImage?.id === image.id) {
        setLightboxImage(null);
      }
    } catch (err) {
      console.error('Erro ao deletar imagem:', err);
    } finally {
      setDeletingImageId(null);
    }
  };

  const copyPromptText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Filter gallery
  const filteredGallery = savedImages.filter((img) => {
    const matchesSearch =
      img.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      img.prompt?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesAspect = aspectFilter === 'all' || img.aspect === aspectFilter;
    const matchesProject = projectFilter === 'all' || img.projectId === projectFilter;
    return matchesSearch && matchesAspect && matchesProject;
  });

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-[#DFFF00]" />
            <span>Image Lab</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gere, edite e organize imagens de alta fidelidade com Google Gemini e Firebase Cloud Storage.
          </p>
        </div>

        {/* Studio Model Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#242424] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#DFFF00]" />
          <span className="text-zinc-400">Modelo:</span>
          <span className="font-mono text-[#DFFF00] font-semibold">gemini-3.1-flash-lite-image</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#222] pb-px text-xs font-semibold">
        <button
          onClick={() => setActiveTab('gerar')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gerar'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Gerar Imagens</span>
        </button>
        <button
          onClick={() => setActiveTab('editar')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'editar'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Editar Imagens</span>
        </button>
        <button
          onClick={() => setActiveTab('galeria')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'galeria'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Galeria do Estúdio ({savedImages.length})</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* ABA 1: GERAR IMAGENS                                               */}
      {/* ================================================================== */}
      {activeTab === 'gerar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5 bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-xl">
            {/* Prompt input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Descrição da Imagem (Prompt) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setGenPrompt(
                      'Retrato cinematográfico de uma jovem influenciadora brasileira em um café em Florença, iluminação dourada de fim de tarde, visual fotorrealista 8k, bokeh suave'
                    )
                  }
                  className="text-[10px] text-[#DFFF00] hover:underline cursor-pointer"
                >
                  Exemplo Rápido
                </button>
              </div>
              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                rows={4}
                placeholder="Descreva detalhadamente o sujeito, cenário, iluminação e clima da imagem..."
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs md:text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
              />
              <span className="text-[10px] text-zinc-500 float-right mt-1">
                {genPrompt.length} caracteres
              </span>
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-2 uppercase tracking-wider">
                Proporção da Imagem
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((aspect) => (
                  <button
                    type="button"
                    key={aspect.id}
                    onClick={() => setSelectedAspect(aspect.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedAspect === aspect.id
                        ? 'bg-[#1C1C14] border-[#DFFF00] text-white shadow-sm'
                        : 'bg-[#0D0D0D] border-[#242424] text-zinc-400 hover:text-white hover:bg-[#121212]'
                    }`}
                  >
                    <span className="text-xs font-bold block">{aspect.label}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{aspect.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photography Style */}
            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-2 uppercase tracking-wider">
                Estilo Fotográfico
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    type="button"
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                      selectedStyle === style.id
                        ? 'bg-[#1C1C14] border-[#DFFF00] text-[#DFFF00]'
                        : 'bg-[#0D0D0D] border-[#222] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Project Association */}
            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-1.5 uppercase tracking-wider">
                Vincular a Projeto (Opcional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="">Nenhum projeto específico</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {genError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating || !genPrompt.trim()}
              className="w-full py-3 px-4 bg-[#DFFF00] hover:bg-[#c8e600] active:scale-98 text-black text-xs md:text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(223,255,0,0.2)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sintetizando com Gemini 3.1 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Imagem</span>
                </>
              )}
            </button>
          </div>

          {/* Result / Preview Column */}
          <div className="lg:col-span-7 bg-[#141414] border border-[#242424] rounded-2xl p-6 flex flex-col justify-between min-h-[520px] shadow-xl">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-16">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-[#242424] border-t-[#DFFF00] rounded-full animate-spin" />
                  <Sparkles className="w-6 h-6 text-[#DFFF00] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-white">Criando imagem cinematográfica...</p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    O modelo oficial Gemini está renderizando as texturas, iluminação e enquadramento solicitado.
                  </p>
                </div>
              </div>
            ) : genResult?.imageUrl ? (
              <div className="space-y-4">
                {/* Result header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Imagem Gerada com Sucesso</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#DFFF00] bg-[#1C1C14] px-2 py-0.5 rounded border border-[#DFFF00]/20">
                    {genResult.aspect || selectedAspect}
                  </span>
                </div>

                {/* Display container */}
                <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-center max-h-[440px]">
                  <img
                    src={genResult.imageUrl}
                    alt={genPrompt}
                    className="max-h-[440px] w-auto object-contain mx-auto rounded-lg shadow-2xl"
                  />
                </div>

                {/* Result Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleDownloadImage(
                          genResult.imageUrl!,
                          `hype-image-${Date.now()}.png`
                        )
                      }
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#1C1C1C] hover:bg-[#262626] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#333]"
                    >
                      <Download className="w-4 h-4 text-zinc-300" />
                      <span>Baixar PNG</span>
                    </button>

                    <button
                      onClick={handleSaveGeneratedImage}
                      disabled={isSavingGen}
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isSavingGen ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : genSavedSuccess ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Salvo na Galeria!</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-4 h-4" />
                          <span>Salvar na Galeria</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setShowRegenConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Gerar Novamente</span>
                  </button>
                </div>

                {/* Regeneration Warning Modal */}
                {showRegenConfirm && (
                  <div className="p-3.5 bg-[#1C1C14] border border-amber-500/30 rounded-xl text-xs space-y-2 animate-fade-in">
                    <p className="text-zinc-200">
                      <strong>Economia de Tokens:</strong> Deseja gerar uma nova variação deste prompt? Esta operação fará uma nova chamada à API Gemini.
                    </p>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowRegenConfirm(false)}
                        className="px-3 py-1 text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleGenerateImage}
                        className="px-3 py-1 bg-[#DFFF00] text-black font-bold rounded-lg"
                      >
                        Confirmar Nova Geração
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#0D0D0D] border border-[#222] flex items-center justify-center text-zinc-600">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-white">Nenhuma imagem gerada nesta sessão</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Preencha o prompt ao lado, selecione o estilo desejado e clique em "Gerar Imagem" para iniciar a renderização.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ABA 2: EDITAR IMAGENS (Image-to-Image)                              */}
      {/* ================================================================== */}
      {activeTab === 'editar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Input & Instructions Column */}
            <div className="lg:col-span-5 space-y-5 bg-[#141414] border border-[#242424] rounded-2xl p-5 shadow-xl">
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-2 uppercase tracking-wider">
                  1. Imagem Original para Edição *
                </label>

                {originalImageBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#333] group max-h-56 bg-[#0a0a0a]">
                    <img
                      src={originalImageBase64}
                      alt="Original para edição"
                      className="w-full h-52 object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg shadow-md"
                      >
                        Trocar Imagem
                      </button>
                      <button
                        onClick={() => {
                          setOriginalImageBase64(null);
                          setOriginalImageFile(null);
                          setEditResult(null);
                        }}
                        className="p-1.5 bg-red-600 text-white rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#282828] hover:border-[#DFFF00]/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#0D0D0D] space-y-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#141414] text-zinc-400 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Clique ou arraste uma imagem aqui</p>
                      <p className="text-[11px] text-zinc-500 mt-1">PNG, JPG ou WEBP (máx. 10MB)</p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>

              {/* Edit Prompt Instruction */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1.5 uppercase tracking-wider">
                  2. Instruções de Edição com IA *
                </label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  placeholder="Ex: Adicione óculos escuros estilo aviador dourados no modelo, e ajuste o fundo para uma marina ao pôr do sol..."
                  className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs md:text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Error Alert */}
              {editError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleEditImage}
                disabled={isEditing || !originalImageBase64 || !editPrompt.trim()}
                className="w-full py-3 px-4 bg-[#DFFF00] hover:bg-[#c8e600] active:scale-98 text-black text-xs md:text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(223,255,0,0.2)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEditing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Editando imagem com IA...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-4 h-4" />
                    <span>Solicitar Edição com Gemini</span>
                  </>
                )}
              </button>
            </div>

            {/* Results / Comparison Column */}
            <div className="lg:col-span-7 bg-[#141414] border border-[#242424] rounded-2xl p-6 flex flex-col justify-between min-h-[520px] shadow-xl">
              {isEditing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-16">
                  <div className="w-16 h-16 border-2 border-[#242424] border-t-[#DFFF00] rounded-full animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-white">Processando alterações com Gemini...</p>
                    <p className="text-xs text-zinc-400 max-w-sm">
                      Analisando a imagem de entrada e aplicando as modificações solicitadas mantendo a consistência.
                    </p>
                  </div>
                </div>
              ) : editResult?.imageUrl && originalImageBase64 ? (
                <div className="space-y-4">
                  {/* View mode toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#222]">
                    <span className="text-xs font-bold text-white">Resultado da Edição</span>
                    <div className="flex items-center gap-1 p-1 bg-[#0D0D0D] rounded-lg border border-[#262626]">
                      <button
                        onClick={() => setEditViewMode('comparison')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          editViewMode === 'comparison'
                            ? 'bg-[#1C1C14] text-[#DFFF00]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Lado a Lado
                      </button>
                      <button
                        onClick={() => setEditViewMode('result')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          editViewMode === 'result'
                            ? 'bg-[#1C1C14] text-[#DFFF00]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Apenas Editada
                      </button>
                      <button
                        onClick={() => setEditViewMode('original')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          editViewMode === 'original'
                            ? 'bg-[#1C1C14] text-[#DFFF00]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  </div>

                  {/* Render based on view mode */}
                  {editViewMode === 'comparison' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                          Original
                        </span>
                        <div className="rounded-xl overflow-hidden border border-[#282828] bg-[#0a0a0a] max-h-72">
                          <img
                            src={originalImageBase64}
                            alt="Original"
                            className="w-full h-64 object-contain mx-auto"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-[#DFFF00] uppercase font-semibold block">
                          Resultado IA
                        </span>
                        <div className="rounded-xl overflow-hidden border border-[#DFFF00]/40 bg-[#0a0a0a] max-h-72 ring-1 ring-[#DFFF00]/20">
                          <img
                            src={editResult.imageUrl}
                            alt="Editada"
                            className="w-full h-64 object-contain mx-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ) : editViewMode === 'result' ? (
                    <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] max-h-96">
                      <img
                        src={editResult.imageUrl}
                        alt="Editada"
                        className="max-h-96 w-auto object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] max-h-96">
                      <img
                        src={originalImageBase64}
                        alt="Original"
                        className="max-h-96 w-auto object-contain mx-auto"
                      />
                    </div>
                  )}

                  {/* Action controls */}
                  <div className="pt-3 border-t border-[#222] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleDownloadImage(
                            editResult.imageUrl!,
                            `hype-edited-${Date.now()}.png`
                          )
                        }
                        className="flex items-center gap-2 px-3.5 py-2 bg-[#1C1C1C] hover:bg-[#262626] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#333]"
                      >
                        <Download className="w-4 h-4 text-zinc-300" />
                        <span>Baixar Editada</span>
                      </button>

                      <button
                        onClick={handleSaveEditedImage}
                        disabled={isSavingEdit}
                        className="flex items-center gap-2 px-3.5 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isSavingEdit ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : editSavedSuccess ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Salvo na Galeria!</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-4 h-4" />
                            <span>Salvar na Galeria</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setEditResult(null)}
                      className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Descartar Alteração
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#0D0D0D] border border-[#222] flex items-center justify-center text-zinc-600">
                    <Sliders className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Nenhuma edição realizada</h3>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Envie uma foto original, descreva as modificações textuais e compare o resultado lado a lado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ABA 3: GALERIA DO ESTÚDIO                                          */}
      {/* ================================================================== */}
      {activeTab === 'galeria' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] border border-[#242424] rounded-2xl p-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Pesquisar por título ou prompt..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#DFFF00]"
              />
            </div>

            {/* Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={aspectFilter}
                onChange={(e) => setAspectFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">Todas as proporções</option>
                <option value="1:1">1:1 Quadrado</option>
                <option value="16:9">16:9 Panorâmico</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="4:3">4:3 Fotografia</option>
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">Todos os projetos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid of Saved Images */}
          {loadingGallery ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-[#141414] border border-[#242424] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredGallery.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-12 text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhuma imagem encontrada</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Gere novas imagens com a IA ou salve criações do estúdio para vê-las aqui.
              </p>
              <button
                onClick={() => setActiveTab('gerar')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DFFF00] text-black text-xs font-bold rounded-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Primeira Imagem</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGallery.map((img) => (
                <div
                  key={img.id}
                  className="group relative bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setLightboxImage(img)}
                    className="relative aspect-square bg-[#0d0d0d] overflow-hidden cursor-pointer"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.title || 'Imagem do Estúdio'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-[#DFFF00]">
                      {img.aspect || '1:1'}
                    </div>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-2 bg-black/80 text-white rounded-full">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-bold text-white truncate">{img.title || 'Criação IA'}</h4>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{img.prompt}</p>
                    <div className="pt-2 flex items-center justify-between border-t border-[#1f1f1f]">
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        {new Date(img.createdAt).toLocaleDateString('pt-BR')}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadImage(img.imageUrl, `${img.title || 'imagem'}.png`)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#202020]"
                          title="Baixar imagem"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGalleryImage(img)}
                          disabled={deletingImageId === img.id}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Excluir imagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lightbox Modal */}
          {lightboxImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
              <div className="relative w-full max-w-4xl bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#DFFF00]" />
                    <h3 className="text-sm font-bold text-white truncate">
                      {lightboxImage.title || 'Visualização da Imagem'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-[#222]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
                  <div className="md:col-span-7 flex items-center justify-center bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#222] p-2">
                    <img
                      src={lightboxImage.imageUrl}
                      alt={lightboxImage.title}
                      className="max-h-[440px] w-auto object-contain mx-auto rounded-lg shadow-xl"
                    />
                  </div>

                  <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                          Prompt Descritivo
                        </span>
                        <div className="p-3 rounded-xl bg-[#0D0D0D] border border-[#222] text-xs text-zinc-300 leading-relaxed font-mono relative">
                          <p className="select-all pr-6">{lightboxImage.prompt}</p>
                          <button
                            onClick={() => copyPromptText(lightboxImage.prompt || '', lightboxImage.id)}
                            className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-white rounded"
                            title="Copiar prompt"
                          >
                            {copiedPromptId === lightboxImage.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between py-1 text-zinc-400 border-b border-[#1f1f1f]">
                          <span>Proporção:</span>
                          <span className="text-white font-mono">{lightboxImage.aspect || '1:1'}</span>
                        </div>
                        <div className="flex justify-between py-1 text-zinc-400 border-b border-[#1f1f1f]">
                          <span>Modelo:</span>
                          <span className="text-[#DFFF00] font-mono">{lightboxImage.modelUsed || 'gemini-3.1-flash-lite-image'}</span>
                        </div>
                        <div className="flex justify-between py-1 text-zinc-400 border-b border-[#1f1f1f]">
                          <span>Data de Criação:</span>
                          <span className="text-white tabular-nums">
                            {new Date(lightboxImage.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#222] flex items-center justify-between">
                      <button
                        onClick={() => handleDeleteGalleryImage(lightboxImage)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>

                      <button
                        onClick={() =>
                          handleDownloadImage(
                            lightboxImage.imageUrl,
                            `${lightboxImage.title || 'hype-image'}.png`
                          )
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Imagem</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
