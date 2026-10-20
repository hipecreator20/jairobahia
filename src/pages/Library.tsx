import React, { useState, useEffect } from 'react';
import { useDeleteFeedback } from '../hooks/useDeleteFeedback';
import {
  FolderArchive,
  Folder,
  Users,
  Film,
  Plus,
  Edit2,
  Trash2,
  Wand2,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Project, Character, Story, PromptVersion } from '../types';
import { subscribeProjects, deleteProject } from '../firebase/services/projectService';
import { subscribeCharacters, deleteCharacter } from '../firebase/services/characterService';
import { subscribeStories, deleteStory } from '../firebase/services/storyService';
import { subscribePrompts, deletePromptVersion } from '../firebase/services/promptService';
import { ProjectModal } from '../components/common/ProjectModal';
import { CharacterModal } from '../components/common/CharacterModal';

interface LibraryProps {
  onOpenNewProject: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onOpenNewProject }) => {
  const { user } = useAuth();
  const { deleting, deleteMessage, removeItem } = useDeleteFeedback();
  const [activeTab, setActiveTab] = useState<'projetos' | 'personagens' | 'historias' | 'prompts'>('projetos');
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubP = subscribeProjects(user.uid, setProjects);
    const unsubC = subscribeCharacters(user.uid, setCharacters);
    const unsubS = subscribeStories(user.uid, setStories);
    const unsubPr = subscribePrompts(user.uid, setPrompts);

    return () => {
      unsubP();
      unsubC();
      unsubS();
      unsubPr();
    };
  }, [user]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {deleteMessage && <p role="status" aria-live="polite" className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-200">{deleteMessage}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderArchive className="w-6 h-6 text-[#DFFF00]" />
            <span>Biblioteca do Estúdio</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Repositório unificado de projetos, personagens, roteiros e prompts salvos no Firestore.
          </p>
        </div>

        {activeTab === 'projetos' && (
          <button
            onClick={onOpenNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-lg transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Projeto</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#222] pb-px text-xs font-medium">
        <button
          onClick={() => setActiveTab('projetos')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'projetos'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Projetos ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personagens')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'personagens'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Personagens ({characters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('historias')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'historias'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Histórias & Roteiros ({stories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'prompts'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Prompts Salvos ({prompts.length})</span>
        </button>
      </div>

      {/* Projects Tab */}
      {activeTab === 'projetos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between"
            >
              <div className="relative aspect-[16/10] bg-[#1a1a1a]">
                <img
                  src={p.thumbnail || '/assets/images/project_beach_day_1792450194606.jpg'}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFFF00] bg-[#DFFF00]/10 px-2 py-0.5 rounded">
                    {p.status}
                  </span>
                  <span className="text-xs text-zinc-400 tabular-nums">{p.sceneCount || 1} cenas</span>
                </div>
                <h3 className="text-sm font-bold text-white">{p.title}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.tags?.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e1e] text-zinc-400">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-3 border-t border-[#222] flex justify-end gap-2">
                <button
                  onClick={() => setEditingProject(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  disabled={deleting} aria-label="Excluir" onClick={() => void removeItem(p.title, () => deleteProject(p.id))}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Characters Tab */}
      {activeTab === 'personagens' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div
              key={c.id}
              className="bg-[#141414] border border-[#242424] rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={c.avatarUrl || '/assets/images/avatar_lara_model_1792450194066.jpg'}
                  alt={c.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-[#333]"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <span className="text-xs text-[#DFFF00] font-medium">{c.niche}</span>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{c.bio}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#222] mt-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
                  Prompt Mestre (DNA Visual)
                </span>
                <p className="text-[11px] text-zinc-300 line-clamp-2 font-mono">{c.visualDna}</p>
              </div>
              <div className="pt-3 mt-3 border-t border-[#222] flex justify-end gap-2">
                <button
                  onClick={() => setEditingCharacter(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  disabled={deleting} aria-label="Excluir" onClick={() => void removeItem(c.name, () => deleteCharacter(c.id))}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stories Tab */}
      {activeTab === 'historias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-[#141414] border border-[#242424] rounded-2xl space-y-2">
              <Film className="w-8 h-8 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum roteiro salvo ainda</h3>
              <p className="text-xs text-zinc-400">
                Acesse o Story Studio para criar seu primeiro roteiro cinematográfico com IA.
              </p>
            </div>
          ) : (
            stories.map((s) => (
              <div
                key={s.id}
                className="bg-[#141414] border border-[#242424] rounded-2xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {s.status}
                    </span>
                    <span className="text-xs text-zinc-400">{s.sceneCount || 0} cenas</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-3 mt-1 leading-relaxed">{s.synopsis}</p>
                </div>
                <div className="pt-3 border-t border-[#222] flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    disabled={deleting} aria-label="Excluir" onClick={() => void removeItem(s.title, () => deleteStory(s.id))}
                    className="p-1 rounded text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <div className="grid grid-cols-1 gap-4">
          {prompts.length === 0 ? (
            <div className="p-8 text-center bg-[#141414] border border-[#242424] rounded-2xl space-y-2">
              <Wand2 className="w-8 h-8 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum prompt salvo ainda</h3>
              <p className="text-xs text-zinc-400">
                Gere e salve fórmulas no Prompt Lab para visualizá-las aqui.
              </p>
            </div>
          ) : (
            prompts.map((pr) => (
              <div
                key={pr.id}
                className="bg-[#141414] border border-[#242424] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#DFFF00]/15 text-[#DFFF00] text-[10px] font-bold">
                      {pr.platform}
                    </span>
                    <h3 className="text-sm font-bold text-white">{pr.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(pr.content, pr.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === pr.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <button
                      disabled={deleting} aria-label="Excluir" onClick={() => void removeItem(pr.title, () => deletePromptVersion(pr.id))}
                      className="p-1 rounded text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1f1f1f] text-xs text-zinc-300 font-mono select-all">
                  {pr.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ProjectModal
        isOpen={Boolean(editingProject)}
        projectToEdit={editingProject}
        onClose={() => setEditingProject(null)}
      />

      <CharacterModal
        isOpen={Boolean(editingCharacter)}
        characterToEdit={editingCharacter}
        onClose={() => setEditingCharacter(null)}
      />
    </div>
  );
};
