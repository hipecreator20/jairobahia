import React, { useState, useEffect } from 'react';
import { useDeleteFeedback } from '../hooks/useDeleteFeedback';
import { CreativeReferences } from '../components/common/CreativeReferences';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Film,
  Wand2,
  ArrowRight,
  MoreVertical,
  Plus,
  Folder,
  Image as ImageIcon,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Project, Character } from '../types';
import {
  subscribeProjects,
  deleteProject,
} from '../firebase/services/projectService';
import {
  subscribeCharacters,
} from '../firebase/services/characterService';
import { ProjectModal } from '../components/common/ProjectModal';
import { CharacterModal } from '../components/common/CharacterModal';

interface DashboardProps {
  searchQuery?: string;
  isNewProjectModalOpen: boolean;
  setIsNewProjectModalOpen: (open: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  searchQuery = '',
  isNewProjectModalOpen,
  setIsNewProjectModalOpen,
}) => {
  const { user } = useAuth();
  const { deleting, deleteMessage, removeItem } = useDeleteFeedback();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  // Modals state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Empty accounts stay empty; deleted examples are not recreated.

    // Subscribe to projects in real-time
    const unsubProjects = subscribeProjects(
      user.uid,
      (list) => {
        setProjects(list);
        setLoadingProjects(false);
      },
      (err) => {
        console.error('Erro ao escutar projetos:', err);
        setLoadingProjects(false);
      }
    );

    // Subscribe to characters in real-time
    const unsubCharacters = subscribeCharacters(
      user.uid,
      (list) => {
        setCharacters(list);
        setLoadingCharacters(false);
      },
      (err) => {
        console.error('Erro ao escutar personagens:', err);
        setLoadingCharacters(false);
      }
    );

    return () => {
      unsubProjects();
      unsubCharacters();
    };
  }, [user]);

  // Filter projects by search query
  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter characters by search query
  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.niche?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic statistics
  const totalScenes = projects.reduce((acc, p) => acc + (p.sceneCount || 1), 0);
  const totalImagesEstimated = projects.length * 13; // Grounded estimate

  return (
    <div className="space-y-8 pb-12">
      {deleteMessage && <p role="status" aria-live="polite" className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-200">{deleteMessage}</p>}
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO BANNER — Cinematic welcome matching user mockup            */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121212] via-[#161616] to-[#0f0f0f] border border-[#242424] shadow-2xl p-6 md:p-8 lg:p-10">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text & Badges */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs md:text-sm font-semibold tracking-wide text-zinc-400 mb-1">
                Bem-vindo ao
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                <span className="italic text-[#DFFF00]">HYPE</span> CREATOR STUDIO 2.0
              </h1>
              <p className="mt-2 text-sm md:text-base text-zinc-300 font-normal max-w-xl">
                Transforme ideias em histórias visuais incríveis com inteligência artificial.
              </p>
            </div>

            {/* 4 Feature Capability Pills matching studio transformation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1C1C1C]/90 border border-[#2A2A2A]">
                <div className="p-2 rounded-lg bg-[#DFFF00]/10 text-[#DFFF00]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Personagens & DNA Visual</p>
                  <p className="text-[11px] text-zinc-400">Fichas detalhadas e Master Prompts</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1C1C1C]/90 border border-[#2A2A2A]">
                <div className="p-2 rounded-lg bg-[#DFFF00]/10 text-[#DFFF00]">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Prompt Lab Cinematográfico</p>
                  <p className="text-[11px] text-zinc-400">Midjourney, Flow, Flux, Kling e Runway</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1C1C1C]/90 border border-[#2A2A2A]">
                <div className="p-2 rounded-lg bg-[#DFFF00]/10 text-[#DFFF00]">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Story Studio com IA</p>
                  <p className="text-[11px] text-zinc-400">Roteiros em 3 atos e cenas sequenciais</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1C1C1C]/90 border border-[#2A2A2A]">
                <div className="p-2 rounded-lg bg-[#DFFF00]/10 text-[#DFFF00]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Engenharia de Prompt Profissional</p>
                  <p className="text-[11px] text-zinc-400">1 clique para exportar e produzir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image Art + Handwritten tagline */}
          <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#DFFF00]/20 to-amber-500/10 blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative rounded-2xl overflow-hidden border border-[#333] shadow-2xl max-h-[290px] w-full max-w-[420px]">
                <img
                  src="/assets/images/hero_virtual_model_1792450194472.jpg"
                  alt="Modelo Virtual Hype Studio"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <div className="text-right w-full">
                    <p className="text-lg md:text-xl font-bold tracking-tight text-[#DFFF00] drop-shadow-md">
                      Histórias · Personagens · Prompts
                    </p>
                    <p className="text-xs text-white/90 font-medium tracking-widest uppercase">
                      Estúdio de Produção Audiovisual
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. COMECE POR AQUI — 4 Quick Action Cards with yellow circular button */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight">Comece por aqui</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Character Studio */}
          <div
            onClick={() => navigate('/character-studio')}
            className="group relative bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex gap-3.5 items-start">
              <img
                src="/assets/images/avatar_lara_model_1792450194066.jpg"
                alt="Character Studio"
                className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-[#333] group-hover:ring-[#DFFF00]/50 transition-all"
              />
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#DFFF00] transition-colors">
                  Character Studio
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  Crie fichas completas e Prompts Mestres com consistência de DNA.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-8 h-8 rounded-full bg-[#DFFF00] group-hover:bg-[#cbe600] flex items-center justify-center text-black shadow-md transition-transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Card 2: Prompt Lab */}
          <div
            onClick={() => navigate('/prompt-lab')}
            className="group relative bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex gap-3.5 items-start">
              <img
                src="/assets/images/project_beach_day_1792450194606.jpg"
                alt="Prompt Lab"
                className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-[#333] group-hover:ring-[#DFFF00]/50 transition-all"
              />
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#DFFF00] transition-colors">
                  Prompt Lab
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  Gere prompts cinematográficos para imagens e vídeos externos.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-8 h-8 rounded-full bg-[#DFFF00] group-hover:bg-[#cbe600] flex items-center justify-center text-black shadow-md transition-transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Card 3: Story Studio */}
          <div
            onClick={() => navigate('/story-studio')}
            className="group relative bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex gap-3.5 items-start">
              <img
                src="/assets/images/project_city_night_1792450194169.jpg"
                alt="Story Studio"
                className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-[#333] group-hover:ring-[#DFFF00]/50 transition-all"
              />
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#DFFF00] transition-colors">
                  Story Studio
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  Crie histórias e roteiros em 3 atos com cenas e prompts de IA.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-8 h-8 rounded-full bg-[#DFFF00] group-hover:bg-[#cbe600] flex items-center justify-center text-black shadow-md transition-transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Card 4: Prompt Director */}
          <div
            onClick={() => navigate('/prompt-director')}
            className="group relative bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex gap-3.5 items-start">
              <div className="w-14 h-14 rounded-xl bg-[#202020] border border-[#333] p-1.5 grid grid-cols-2 gap-1 shrink-0 group-hover:border-[#DFFF00]/50 transition-all">
                <div className="bg-[#DFFF00] rounded text-black font-black text-[9px] flex items-center justify-center">H</div>
                <div className="bg-sky-500 rounded text-white font-bold text-[9px] flex items-center justify-center">~</div>
                <div className="bg-emerald-600 rounded text-white font-bold text-[9px] flex items-center justify-center">G</div>
                <div className="bg-purple-600 rounded text-white font-bold text-[9px] flex items-center justify-center">*</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#DFFF00] transition-colors">
                  Prompt Director
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  Templates profissionais para Higgsfield, Flow, Kling, Sora e Runway.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-8 h-8 rounded-full bg-[#DFFF00] group-hover:bg-[#cbe600] flex items-center justify-center text-black shadow-md transition-transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. PROJETOS RECENTES — Live Real-Time Firestore Sync               */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Projetos Recentes</h2>
            <span className="text-xs text-zinc-500 tabular-nums">({filteredProjects.length})</span>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-[#DFFF00] transition-colors cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingProjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 bg-[#141414] border border-[#242424] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center space-y-3">
            <Folder className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhum projeto encontrado</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Crie seu primeiro projeto para organizar personagens, roteiros e cenas com IA.
            </p>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-lg transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Primeiro Projeto</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProjects.slice(0, 4).map((project) => (
              <div
                key={project.id}
                className="group relative bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#383838] rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                {/* Thumbnail image with dark scrim */}
                <div className="relative aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
                  <img
                    src={project.thumbnail || '/assets/images/project_beach_day_1792450194606.jpg'}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80" />
                </div>

                {/* Card Info and Options */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#DFFF00] transition-colors truncate">
                      {project.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                      {project.sceneCount || 1} cenas · Recente
                    </p>
                  </div>

                  {/* 3-dots Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuProjectId(
                          activeMenuProjectId === project.id ? null : project.id
                        )
                      }
                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#222] transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuProjectId === project.id && (
                      <div
                        className="absolute right-0 bottom-full mb-2 w-44 bg-[#1C1C1C] border border-[#2e2e2e] rounded-xl shadow-2xl py-1.5 z-30 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setActiveMenuProjectId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#282828] text-left transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Editar Projeto</span>
                        </button>
                        <button
                          disabled={deleting} onClick={() => { void removeItem(project.title, () => deleteProject(project.id)); setActiveMenuProjectId(null); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-left transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. MEUS PERSONAGENS — Influenciadores com visual consistente        */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Meus Personagens</h2>
            <span className="text-xs text-zinc-500 tabular-nums">({filteredCharacters.length})</span>
          </div>
          <button
            onClick={() => navigate('/influencer-studio')}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-[#DFFF00] transition-colors cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {filteredCharacters.slice(0, 4).map((char) => (
            <div
              key={char.id}
              onClick={() => {
                setEditingCharacter(char);
                setIsCharacterModalOpen(true);
              }}
              className="group bg-[#141414] hover:bg-[#181818] border border-[#242424] hover:border-[#DFFF00]/40 rounded-2xl p-3 flex flex-col items-center text-center transition-all cursor-pointer"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden mb-2.5 ring-1 ring-[#333] group-hover:ring-[#DFFF00]/50 transition-all">
                <img
                  src={char.avatarUrl || '/assets/images/avatar_lara_model_1792450194066.jpg'}
                  alt={char.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-[#DFFF00] transition-colors truncate w-full">
                {char.name}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">
                {char.niche || 'Criador Digital'}
              </p>
            </div>
          ))}

          {/* + Novo Personagem CTA Card matching mockup */}
          <button
            onClick={() => {
              setEditingCharacter(null);
              setIsCharacterModalOpen(true);
            }}
            className="group bg-[#121212] hover:bg-[#161616] border border-dashed border-[#2a2a2a] hover:border-[#DFFF00]/50 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-full bg-[#1c1c1c] group-hover:bg-[#DFFF00] text-zinc-400 group-hover:text-black flex items-center justify-center transition-colors mb-2">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-zinc-300 group-hover:text-white">
              Novo Personagem
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Criar DNA Visual</span>
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. FERRAMENTAS INTEGRADAS & ESTATÍSTICAS DO ESTÚDIO               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ferramentas Integradas */}
        <section className="lg:col-span-6 space-y-3">
          <h2 className="text-base font-bold text-white tracking-tight">Ferramentas Integradas</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-[#141414] border border-[#242424] rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-[#DFFF00] text-black font-black text-xs flex items-center justify-center mb-1.5">
                H
              </div>
              <span className="text-xs font-bold text-white">Higgsfield</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Vídeos dinâmicos</span>
            </div>

            <div className="p-3 bg-[#141414] border border-[#242424] rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                ~
              </div>
              <span className="text-xs font-bold text-white">Flow</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Cinema IA</span>
            </div>

            <div className="p-3 bg-[#141414] border border-[#242424] rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                S
              </div>
              <span className="text-xs font-bold text-white">Sora</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Vídeos realistas</span>
            </div>

            <div className="p-3 bg-[#141414] border border-[#242424] rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                G
              </div>
              <span className="text-xs font-bold text-white">GPT</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Roteiros</span>
            </div>

            <div className="p-3 bg-[#141414] border border-[#242424] rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 font-bold text-xs flex items-center justify-center mb-1.5">
                ···
              </div>
              <span className="text-xs font-bold text-white">Mais</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Plataformas</span>
            </div>
          </div>
        </section>

        {/* Estatísticas do Estúdio */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">Estatísticas do Estúdio</h2>
            <button
              onClick={() => navigate('/settings')}
              className="text-xs font-semibold text-zinc-400 hover:text-[#DFFF00] transition-colors cursor-pointer"
            >
              Ver detalhes →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Projetos</span>
              </div>
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {projects.length}
              </p>
            </div>

            <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">Cenas criadas</span>
              </div>
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {totalScenes}
              </p>
            </div>

            <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Imagens</span>
              </div>
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {totalImagesEstimated}
              </p>
            </div>

            <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px]">Personagens</span>
              </div>
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {characters.length}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODALS                                                             */}
      {/* ------------------------------------------------------------------ */}
      <CreativeReferences />
      <ProjectModal
        isOpen={isNewProjectModalOpen || Boolean(editingProject)}
        projectToEdit={editingProject}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setEditingProject(null);
        }}
      />

      <CharacterModal
        isOpen={isCharacterModalOpen}
        characterToEdit={editingCharacter}
        onClose={() => {
          setIsCharacterModalOpen(false);
          setEditingCharacter(null);
        }}
      />
    </div>
  );
};
