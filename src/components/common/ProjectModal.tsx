import React, { useState, useEffect } from 'react';
import { X, Film, Trash2, Check, AlertCircle } from 'lucide-react';
import { Project } from '../../types';
import { createProject, updateProject, deleteProject } from '../../firebase/services/projectService';
import { useAuth } from '../../context/AuthContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  onSaved?: (project: Project) => void;
  onDeleted?: (projectId: string) => void;
}

const PRESET_THUMBNAILS = [
  { label: 'Praia Tropical', url: '/assets/images/project_beach_day_1792450194606.jpg' },
  { label: 'Metrópole Noturna', url: '/assets/images/project_city_night_1792450194169.jpg' },
  { label: 'Campanha Editorial', url: '/assets/images/hero_virtual_model_1792450194472.jpg' },
  { label: 'Estilo de Vida', url: '/assets/images/avatar_camila_fitness_1792450194470.jpg' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  onSaved,
  onDeleted,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sceneCount, setSceneCount] = useState(4);
  const [thumbnail, setThumbnail] = useState(PRESET_THUMBNAILS[0].url);
  const [tagsInput, setTagsInput] = useState('IA, Cinema');
  const [status, setStatus] = useState<'active' | 'archived' | 'completed'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description || '');
      setSceneCount(projectToEdit.sceneCount || 1);
      setThumbnail(projectToEdit.thumbnail || PRESET_THUMBNAILS[0].url);
      setTagsInput(projectToEdit.tags?.join(', ') || '');
      setStatus(projectToEdit.status || 'active');
    } else {
      setTitle('');
      setDescription('');
      setSceneCount(4);
      setThumbnail(PRESET_THUMBNAILS[0].url);
      setTagsInput('IA, Cinema');
      setStatus('active');
    }
    setErrorMessage(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Por favor, informe o título do projeto.');
      return;
    }
    if (!user) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (projectToEdit) {
        const updated = await updateProject(
          projectToEdit.id,
          {
            title: title.trim(),
            description: description.trim(),
            sceneCount: Number(sceneCount) || 1,
            thumbnail,
            status,
            tags,
          },
          projectToEdit
        );
        onSaved?.(updated);
      } else {
        const created = await createProject({
          title: title.trim(),
          description: description.trim(),
          sceneCount: Number(sceneCount) || 1,
          thumbnail,
          status,
          tags,
          ownerId: user.uid,
        });
        onSaved?.(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar projeto:', err);
      setErrorMessage(err.message || 'Falha ao salvar no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToEdit) return;
    if (!confirm('Deseja realmente excluir este projeto permanentemente?')) return;

    setIsDeleting(true);
    try {
      await deleteProject(projectToEdit.id);
      onDeleted?.(projectToEdit.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir projeto:', err);
      setErrorMessage(err.message || 'Falha ao excluir projeto.');
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
            <Film className="w-5 h-5 text-[#DFFF00]" />
            <h2 className="text-base font-bold text-white">
              {projectToEdit ? 'Editar Projeto' : 'Criar Novo Projeto'}
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

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Título do Projeto *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Campanha Primavera 2026, Cyberpunk Stories..."
              className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-sm text-white focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Sinopse / Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva a visão criativa do projeto..."
              className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-sm text-white focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Número de Cenas
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={sceneCount}
                onChange={(e) => setSceneCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-sm text-white focus:outline-none transition-colors"
              >
                <option value="active">Ativo / Em Produção</option>
                <option value="completed">Concluído</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Thumbnail Visual (Escolha um Preset de Estúdio)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_THUMBNAILS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => setThumbnail(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all cursor-pointer ${
                    thumbnail === preset.url
                      ? 'border-[#DFFF00] ring-2 ring-[#DFFF00]/30 scale-102'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                  {thumbnail === preset.url && (
                    <div className="absolute top-1 right-1 p-0.5 bg-[#DFFF00] rounded-full text-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="Ou cole a URL direta de uma imagem..."
              className="w-full px-3.5 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-xs text-zinc-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Tags (Separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Cinema, Moda, Reels, 4K"
              className="w-full px-3.5 py-2.5 bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl text-sm text-white focus:outline-none transition-colors"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-[#222] flex items-center justify-between">
            {projectToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Projeto</span>
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
                {isSubmitting ? 'Salvando...' : projectToEdit ? 'Atualizar Projeto' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
