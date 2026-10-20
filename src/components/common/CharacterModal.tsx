import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Copy,
  Shirt,
  Smile,
  Eye,
} from 'lucide-react';
import { Character } from '../../types';
import {
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../../firebase/services/characterService';
import { useAuth } from '../../context/AuthContext';
import { generateCharacterMasterPromptWithGemini } from '../../services/geminiService';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterToEdit?: Character | null;
  onSaved?: (char: Character) => void;
  onDeleted?: (charId: string) => void;
}

const PRESET_AVATARS = [
  { label: 'Lara (Modelo)', url: '/src/assets/images/avatar_lara_model_1792450194066.jpg' },
  { label: 'Camila (Fitness)', url: '/src/assets/images/avatar_camila_fitness_1792450194470.jpg' },
  { label: 'Bruno (Lifestyle)', url: '/src/assets/images/hero_virtual_model_1792450194472.jpg' },
  { label: 'Julia (Fashion)', url: '/src/assets/images/project_beach_day_1792450194606.jpg' },
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  characterToEdit,
  onSaved,
  onDeleted,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('Modelo & Creator');
  const [bio, setBio] = useState('');
  const [physicalTraits, setPhysicalTraits] = useState('');
  const [wardrobe, setWardrobe] = useState('');
  const [personality, setPersonality] = useState('');
  const [visualDna, setVisualDna] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].url);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAiPrompt, setIsGeneratingAiPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (characterToEdit) {
      setName(characterToEdit.name);
      setNiche(characterToEdit.niche || 'Modelo & Creator');
      setBio(characterToEdit.bio || '');
      setVisualDna(characterToEdit.visualDna || '');
      setAvatarUrl(characterToEdit.avatarUrl || PRESET_AVATARS[0].url);
      setPhysicalTraits('');
      setWardrobe('');
      setPersonality('');
    } else {
      setName('');
      setNiche('Modelo & Creator');
      setBio('');
      setPhysicalTraits('Olhos castanho-claros penetrantes, pele morena radiante, traços faciais angulados e simétricos, cabelo castanho longo ondulado');
      setWardrobe('Alfaiataria moderna em tons neutros, seda cobre, minimalismo luxuoso');
      setPersonality('Magnética, confiante, olhar misterioso, postura elegante');
      setVisualDna('Editorial 35mm portrait of an ultra-realistic brunette female digital model with natural skin texture, amber hazel eyes, delicate cheekbones, soft golden rim lighting --ar 1:1 --v 6.1');
      setAvatarUrl(PRESET_AVATARS[0].url);
    }
    setErrorMessage(null);
  }, [characterToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGenerateAiMasterPrompt = async () => {
    if (!name.trim()) {
      setErrorMessage('Informe o nome do personagem antes de gerar o Prompt Mestre.');
      return;
    }
    if (!user) return;

    setIsGeneratingAiPrompt(true);
    setErrorMessage(null);

    try {
      const result = await generateCharacterMasterPromptWithGemini({
        name,
        niche,
        bio,
        physicalTraits,
        wardrobe,
        personality,
        userEmail: user.email || '',
      });

      if (result.masterPrompt) {
        setVisualDna(result.masterPrompt.slice(0, 1900));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao gerar o Prompt Mestre com Gemini.');
    } finally {
      setIsGeneratingAiPrompt(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!visualDna) return;
    navigator.clipboard.writeText(visualDna);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome do personagem.');
      return;
    }
    if (!user) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (characterToEdit) {
        const updated = await updateCharacter(
          characterToEdit.id,
          {
            name: name.trim(),
            niche: niche.trim(),
            bio: bio.trim(),
            visualDna: visualDna.trim(),
            avatarUrl,
          },
          characterToEdit
        );
        onSaved?.(updated);
      } else {
        const created = await createCharacter({
          name: name.trim(),
          niche: niche.trim(),
          bio: bio.trim(),
          visualDna: visualDna.trim(),
          avatarUrl,
          ownerId: user.uid,
        });
        onSaved?.(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar personagem:', err);
      setErrorMessage(err.message || 'Falha ao salvar no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!characterToEdit) return;
    if (!confirm('Deseja excluir este personagem digital?')) return;

    setIsDeleting(true);
    try {
      await deleteCharacter(characterToEdit.id);
      onDeleted?.(characterToEdit.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir personagem:', err);
      setErrorMessage(err.message || 'Falha ao excluir personagem.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#DFFF00]" />
            <h2 className="text-base font-bold text-white">
              {characterToEdit ? 'Editar Personagem & Prompt Mestre' : 'Criar Novo Personagem (Character Studio)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#202020] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic identification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Nome do Personagem *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Lara Vance, Gabriel Knox..."
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Nicho / Arquétipo
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Modelo de Alta Costura, Tech Creator..."
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Preset Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Avatar de Referência Visual
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_AVATARS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => setAvatarUrl(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    avatarUrl === preset.url
                      ? 'border-[#DFFF00] ring-2 ring-[#DFFF00]/30 scale-102'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                  {avatarUrl === preset.url && (
                    <div className="absolute top-1 right-1 p-0.5 bg-[#DFFF00] rounded-full text-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Physical traits & Wardrobe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#DFFF00]" />
                <span>Traços Físicos & Fisionomia</span>
              </label>
              <textarea
                value={physicalTraits}
                onChange={(e) => setPhysicalTraits(e.target.value)}
                rows={2}
                placeholder="Ex: olhos castanho-claros, cabelo ondulado, pele morena..."
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Shirt className="w-3.5 h-3.5 text-[#DFFF00]" />
                <span>Figurino & Estilo de Moda</span>
              </label>
              <textarea
                value={wardrobe}
                onChange={(e) => setWardrobe(e.target.value)}
                rows={2}
                placeholder="Ex: alfaiataria contemporânea, tons neutros, tecidos de seda..."
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Personality / Bio */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1 uppercase tracking-wider flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-[#DFFF00]" />
              <span>Personalidade & Presença</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Ex: mulher sofisticada, olhar confiante, atitude minimalista..."
              className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-xs text-white focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Master Prompt (DNA Visual) Section */}
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#262626] space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#DFFF00] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prompt Mestre (DNA Visual Reutilizável)</span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerateAiMasterPrompt}
                  disabled={isGeneratingAiPrompt || !name.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C1C14] border border-[#DFFF00]/40 text-[#DFFF00] text-[11px] font-bold hover:bg-[#DFFF00]/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isGeneratingAiPrompt ? 'Gerando com IA...' : '✨ Gerar com IA'}</span>
                </button>

                {visualDna && (
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202020] text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {isCopied ? (
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
                )}
              </div>
            </div>

            <textarea
              value={visualDna}
              onChange={(e) => setVisualDna(e.target.value)}
              rows={3}
              placeholder="Prompt mestre em inglês para ancoragem fisionômica em ferramentas de IA (Midjourney, Flux, Kling, Runway)..."
              className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#222] focus:border-[#DFFF00] rounded-xl text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none transition-colors resize-none"
            />
            <p className="text-[10px] text-zinc-500">
              Este prompt será injetado automaticamente ao selecionar este personagem no Prompt Lab e Story Studio.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-[#222] flex items-center justify-between">
            {characterToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 bg-[#DFFF00] hover:bg-[#c8e600] active:scale-95 text-black text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(223,255,0,0.2)] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : characterToEdit ? 'Atualizar Personagem' : 'Salvar Personagem'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
