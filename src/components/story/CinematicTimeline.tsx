import React, { useState } from 'react';
import {
  Film,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Edit3,
  Trash2,
  Sliders,
  Sparkles,
  Download,
  Plus,
  Play,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { Story, Scene } from '../../types';
import {
  updateScene,
  duplicateScene,
  reorderScenes,
  parseSceneDuration,
  formatVisualStyleWithDuration,
  updateStory,
} from '../../firebase/services/storyService';

interface CinematicTimelineProps {
  story: Story;
  scenes: Scene[];
  ownerId: string;
  onSelectScene?: (scene: Scene) => void;
  onAddNewScene: () => void;
}

export const CinematicTimeline: React.FC<CinematicTimelineProps> = ({
  story,
  scenes,
  ownerId,
  onSelectScene,
  onAddNewScene,
}) => {
  // Zoom levels: 0 (compact), 1 (standard), 2 (expanded)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeEditingScene, setActiveEditingScene] = useState<Scene | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editDuration, setEditDuration] = useState(5);
  const [editVisualStyle, setEditVisualStyle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Calculate durations
  const sceneDurations = scenes.map((s) => parseSceneDuration(s.visualStyle));
  const totalDurationSeconds = sceneDurations.reduce((acc, d) => acc + d, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleMoveScene = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const [moved] = newScenes.splice(index, 1);
    newScenes.splice(targetIndex, 0, moved);

    try {
      await reorderScenes(newScenes, ownerId);
      showFeedback(`Cena movida para a ${direction === 'left' ? 'esquerda' : 'direita'}`);
    } catch {
      alert('Falha ao reorganizar cenas.');
    }
  };

  const handleDuplicateScene = async (scene: Scene) => {
    try {
      await duplicateScene(scene, ownerId);
      await updateStory(story.id, {
        ownerId,
        sceneCount: scenes.length + 1,
      });
      showFeedback('Cena duplicada na Timeline!');
    } catch {
      alert('Falha ao duplicar cena.');
    }
  };

  const handleOpenEdit = (scene: Scene) => {
    setActiveEditingScene(scene);
    setEditTitle(scene.title);
    setEditPrompt(scene.prompt || '');
    setEditDuration(parseSceneDuration(scene.visualStyle));
    setEditVisualStyle(
      (scene.visualStyle || 'Cinematográfico').replace(/\s*\[\d+s\]|\s*·\s*\d+s/g, '').trim()
    );
  };

  const handleSaveSceneEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditingScene) return;

    setIsSavingEdit(true);
    try {
      const updatedVisualStyle = formatVisualStyleWithDuration(editVisualStyle, editDuration);
      await updateScene(activeEditingScene.id, {
        ownerId,
        title: editTitle.trim().slice(0, 128),
        prompt: editPrompt.trim().slice(0, 2000),
        visualStyle: updatedVisualStyle,
      });
      setActiveEditingScene(null);
      showFeedback('Cena e duração atualizadas no Firebase!');
    } catch {
      alert('Falha ao salvar edição da cena.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopyAllPromptsSequence = () => {
    let accumulatedSec = 0;
    const lines = scenes.map((scene, idx) => {
      const dur = parseSceneDuration(scene.visualStyle);
      const start = formatTime(accumulatedSec);
      const end = formatTime(accumulatedSec + dur);
      accumulatedSec += dur;

      return `[CENA ${idx + 1}] (${start} - ${end} | ${dur}s) — ${scene.title}
PROMPT: ${scene.prompt || 'Sem prompt cadastrado'}
--------------------------------------------------`;
    });

    const fullSequence = `HYPE CREATOR STUDIO 2.0 — SEQUÊNCIA DE PROMPTS DA TIMELINE
HISTÓRIA: ${story.title.toUpperCase()}
DURAÇÃO TOTAL: ${formatTime(totalDurationSeconds)} (${totalDurationSeconds}s) | CENAS: ${scenes.length}
==================================================

${lines.join('\n\n')}`;

    handleCopyText(fullSequence, 'all_sequence');
    showFeedback('Sequência completa de prompts copiada!');
  };

  // Block width according to zoom level
  const blockWidthClass =
    zoomLevel === 0 ? 'min-w-[170px] w-[170px]' : zoomLevel === 1 ? 'min-w-[240px] w-[240px]' : 'min-w-[320px] w-[320px]';

  return (
    <div className="bg-[#121212] border border-[#222] rounded-2xl p-5 space-y-4 shadow-xl overflow-hidden">
      {/* Top Header of the Timeline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1f1f1f] pb-4">
        {/* Left info & metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#1C1C14] border border-[#DFFF00]/30 text-[#DFFF00]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Timeline Cinematográfica</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Sequência cronológica de planos para produção audiovisual
              </p>
            </div>
          </div>

          {/* Duration Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1C14] border border-[#DFFF00]/30 text-[#DFFF00] text-xs font-bold tabular-nums shadow-[0_0_12px_rgba(223,255,0,0.1)]">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(totalDurationSeconds)}</span>
            <span className="text-zinc-500 font-normal">({totalDurationSeconds}s total)</span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-semibold">
            {scenes.length} {scenes.length === 1 ? 'cena' : 'cenas'}
          </div>

          {actionFeedback && (
            <span className="text-[11px] text-emerald-400 font-semibold animate-fade-in">
              ✓ {actionFeedback}
            </span>
          )}
        </div>

        {/* Right Toolbar: Zoom & Export */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#0D0D0D] border border-[#242424] rounded-xl p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0, z - 1))}
              disabled={zoomLevel === 0}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-mono font-bold text-zinc-300">
              {zoomLevel === 0 ? '50%' : zoomLevel === 1 ? '100%' : '150%'}
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 1))}
              disabled={zoomLevel === 2}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#DFFF00] transition-colors cursor-pointer"
              title="Resetar Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Copy Sequence button */}
          <button
            onClick={handleCopyAllPromptsSequence}
            disabled={scenes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C14] hover:bg-[#252518] border border-[#DFFF00]/30 text-[#DFFF00] text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            {copiedKey === 'all_sequence' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Sequência Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Sequência de Prompts</span>
              </>
            )}
          </button>

          {/* Add Scene CTA */}
          <button
            onClick={onAddNewScene}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DFFF00] hover:bg-[#cbe600] text-black text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar Cena</span>
          </button>
        </div>
      </div>

      {/* Horizontal Timeline Track */}
      {scenes.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs">
          Nenhuma cena estruturada ainda. Clique em "Adicionar Cena" ou gere com IA para iniciar sua Timeline.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Timeline Time Ruler */}
          <div className="overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-3 min-w-max px-1">
              {scenes.map((scene, idx) => {
                const dur = parseSceneDuration(scene.visualStyle);
                // Compute start time
                let startTime = 0;
                for (let i = 0; i < idx; i++) {
                  startTime += parseSceneDuration(scenes[i].visualStyle);
                }

                return (
                  <div key={`ruler_${scene.id}`} className={`${blockWidthClass} transition-all`}>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-b border-[#242424] pb-1">
                      <span className="text-[#DFFF00]">{formatTime(startTime)}</span>
                      <span>+{dur}s</span>
                      <span>{formatTime(startTime + dur)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blocks track with smooth horizontal scroll */}
          <div className="overflow-x-auto pb-3 custom-scrollbar">
            <div className="flex items-stretch gap-3 min-w-max px-1 pt-1">
              {scenes.map((scene, idx) => {
                const duration = parseSceneDuration(scene.visualStyle);

                return (
                  <div
                    key={scene.id}
                    className={`${blockWidthClass} rounded-2xl bg-[#161616] border border-[#272727] hover:border-[#DFFF00]/50 p-3.5 flex flex-col justify-between transition-all duration-200 group shadow-md hover:shadow-lg`}
                  >
                    {/* Block Top: Scene Number & Duration Chip */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-[#DFFF00] text-black font-extrabold text-[10px] flex items-center justify-center">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">
                            {scene.title}
                          </span>
                        </div>

                        {/* Duration badge with quick adjust */}
                        <button
                          onClick={() => handleOpenEdit(scene)}
                          className="px-2 py-0.5 rounded-full bg-[#1C1C14] hover:bg-[#28281a] border border-[#DFFF00]/30 text-[#DFFF00] text-[10px] font-mono font-bold cursor-pointer"
                          title="Clique para ajustar a duração"
                        >
                          {duration}s
                        </button>
                      </div>

                      {/* Visual Style badge */}
                      {scene.visualStyle && (
                        <div className="text-[10px] text-zinc-400 font-medium truncate">
                          {scene.visualStyle.replace(/\s*\[\d+s\]|\s*·\s*\d+s/g, '')}
                        </div>
                      )}

                      {/* Prompt preview */}
                      <div className="p-2 rounded-xl bg-[#0B0B0B] border border-[#202020] text-[11px] text-zinc-300 font-mono leading-relaxed line-clamp-3 select-all">
                        {scene.prompt || 'Sem prompt definido'}
                      </div>
                    </div>

                    {/* Block Bottom Action Toolbar */}
                    <div className="pt-3 mt-3 border-t border-[#222] flex items-center justify-between gap-1">
                      {/* Left: Move arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveScene(idx, 'left')}
                          disabled={idx === 0}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#222] disabled:opacity-20 cursor-pointer transition-colors"
                          title="Mover para a esquerda"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveScene(idx, 'right')}
                          disabled={idx === scenes.length - 1}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#222] disabled:opacity-20 cursor-pointer transition-colors"
                          title="Mover para a direita"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Duplicate, Edit, Copy prompt */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyText(scene.prompt || '', `prompt_${scene.id}`)}
                          className="p-1 rounded-md text-zinc-400 hover:text-[#DFFF00] hover:bg-[#222] cursor-pointer transition-colors"
                          title="Copiar prompt da cena"
                        >
                          {copiedKey === `prompt_${scene.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDuplicateScene(scene)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#222] cursor-pointer transition-colors"
                          title="Duplicar cena na Timeline"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(scene)}
                          className="p-1 rounded-md text-zinc-400 hover:text-[#DFFF00] hover:bg-[#222] cursor-pointer transition-colors"
                          title="Editar cena e duração"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Scene Modal */}
      {activeEditingScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#141414] border border-[#282828] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#DFFF00]" />
                <h3 className="text-sm font-bold text-white">Editar Cena da Timeline</h3>
              </div>
              <button
                onClick={() => setActiveEditingScene(null)}
                className="text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveSceneEdit} className="space-y-4">
              {/* Scene Title */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Título da Cena
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              {/* Duration selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Duração da Cena no Vídeo / Curta
                  </label>
                  <span className="text-xs text-[#DFFF00] font-bold font-mono">
                    {editDuration} segundos
                  </span>
                </div>

                {/* Quick preset chips */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {[3, 5, 8, 10, 15, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setEditDuration(sec)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editDuration === sec
                          ? 'bg-[#DFFF00] text-black shadow-[0_0_10px_rgba(223,255,0,0.2)]'
                          : 'bg-[#222] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-[#DFFF00] cursor-pointer"
                />
              </div>

              {/* Visual Style */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Estilo Visual / Iluminação
                </label>
                <input
                  type="text"
                  value={editVisualStyle}
                  onChange={(e) => setEditVisualStyle(e.target.value)}
                  placeholder="Ex: Cinema 35mm, Golden Hour, 24fps..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Prompt Cinematográfico para IA
                </label>
                <textarea
                  rows={4}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Prompt cinematográfico em inglês..."
                  className="w-full bg-[#0D0D0D] border border-[#262626] focus:border-[#DFFF00] rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Modal actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setActiveEditingScene(null)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-[#DFFF00] hover:bg-[#cbe600] text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isSavingEdit ? 'Salvando no Firebase...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
