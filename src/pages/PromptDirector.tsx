import React, { useState } from 'react';
import { Wand2, Sparkles, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export const PromptDirector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gerador' | 'salvos'>('gerador');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const curatedPrompts = [
    {
      title: 'Influenciadora em Golden Hour (Higgsfield / Kling)',
      platform: 'Higgsfield AI',
      target: 'Vídeo Dinâmico',
      prompt: 'Cinematic medium shot of a chic brunette influencer in a tailored copper silk blazer on a Paris rooftop balcony during sunset. Golden hour rim light on hair, slight breeze, natural eye blinking, camera slow push-in, shallow depth of field, photorealistic 8k.',
    },
    {
      title: 'Transição Noturna Cyberpunk (Sora / Flow)',
      platform: 'OpenAI Sora',
      target: 'Cinematográfico',
      prompt: 'Tracking shot following a high-fashion model walking through illuminated Tokyo alleys in light rain. Wet asphalt reflecting neon signage, bokeh light discs, smooth steadicam glide, 24fps filmic grain, hyper-detailed textures.',
    },
    {
      title: 'Retrato Fisiológico Consistente (Midjourney v6 / Gemini)',
      platform: 'Google GenAI',
      target: 'DNA Visual',
      prompt: 'Ultra-realistic 85mm studio portrait of female model with natural radiant skin texture, amber hazel eyes, delicate facial symmetry, neutral charcoal background, soft rim lighting, editorial Vogue cover quality.',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Wand2 className="w-6 h-6 text-[#DFFF00]" />
          <span>Prompt Director</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Engenharia de prompts profissionais otimizados para Higgsfield, Sora, Flow e modelos multimodais.
        </p>
      </div>

      {/* Phase 2 notice */}
      <div className="p-4 rounded-2xl bg-[#1C1C14] border border-[#DFFF00]/30 flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-[#DFFF00] shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Módulo em Desenvolvimento — Fase 2</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#DFFF00]/20 text-[#DFFF00] text-[10px] font-bold uppercase tracking-wider">
              Otimizador Automático com IA
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            O gerador autônomo com refinamento dinâmico via Gemini 3.8 Flash será lançado na Fase 2.
            Abaixo estão os templates profissionais de referência arquitetados para o estúdio.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#222] pb-px text-xs font-medium">
        <button
          onClick={() => setActiveTab('gerador')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gerador'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Templates de Engenharia de Prompt ({curatedPrompts.length})
        </button>
        <button
          onClick={() => setActiveTab('salvos')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'salvos'
              ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Prompts Salvos
        </button>
      </div>

      {activeTab === 'salvos' ? (
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3">
          <Terminal className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhum prompt salvo ainda</h3>
          <p className="text-xs text-zinc-400">
            A coleção <code>promptVersions</code> no Firestore está configurada para armazenar suas fórmulas personalizadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {curatedPrompts.map((p, idx) => (
            <div
              key={idx}
              className="bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl p-5 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DFFF00]/10 text-[#DFFF00] text-[10px] font-bold">
                    {p.platform}
                  </span>
                  <span className="text-xs text-zinc-400">· {p.target}</span>
                </div>
                <button
                  onClick={() => handleCopy(p.prompt, idx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <h3 className="text-sm font-bold text-white">{p.title}</h3>
              <p className="p-3 rounded-xl bg-[#0D0D0D] border border-[#222] text-xs text-zinc-300 font-mono leading-relaxed select-all">
                {p.prompt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
