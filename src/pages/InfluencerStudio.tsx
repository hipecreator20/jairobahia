import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Sparkles,
  Dna,
  Edit2,
  Copy,
  Check,
  Search,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Character } from '../types';
import { subscribeCharacters } from '../firebase/services/characterService';
import { CharacterModal } from '../components/common/CharacterModal';

export const InfluencerStudio: React.FC = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeTab, setActiveTab] = useState<'meus' | 'dna'>('meus');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCharacters(user.uid, setCharacters);
    return () => unsub();
  }, [user]);

  const handleCopyMasterPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (c.niche || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <User className="w-6 h-6 text-[#DFFF00]" />
              <span>Character Studio</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#DFFF00]/15 text-[#DFFF00] text-[10px] font-bold uppercase tracking-wider">
              Influencers & Master Prompts
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Fichas completas de personagens virtuais e engenharia de Prompts Mestres para consistência visual absoluta.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCharacter(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(223,255,0,0.18)] cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Criar Personagem</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between border-b border-[#222] pb-px">
        <div className="flex items-center gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('meus')}
            className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'meus'
                ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Meus Personagens ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab('dna')}
            className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dna'
                ? 'border-[#DFFF00] text-[#DFFF00] font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>Matriz de Prompts Mestres</span>
          </button>
        </div>

        <div className="hidden sm:block pb-1">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar personagem..."
            className="px-3 py-1 bg-[#141414] border border-[#222] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#DFFF00]"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dna' ? (
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#242424] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Dna className="w-5 h-5 text-[#DFFF00]" />
              <span>Matriz de DNA Visual & Prompts Mestres</span>
            </div>
            <p className="text-xs text-zinc-400">
              O Prompt Mestre de cada personagem contém as diretrizes fotográficas e fisionômicas exatas para serem injetadas no Prompt Lab ou em geradores externos (Midjourney, Flux, Kling, Runway, Google Flow).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCharacters.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#383838] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.avatarUrl || '/src/assets/images/avatar_lara_model_1792450194066.jpg'}
                      alt={c.name}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-[#333]"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{c.name}</h4>
                      <span className="text-[11px] text-[#DFFF00]">{c.niche}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMasterPrompt(c.visualDna || '', c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedId === c.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Prompt Mestre</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-zinc-300 bg-[#0D0D0D] p-3 rounded-xl border border-[#1f1f1f] font-mono text-[11px] leading-relaxed select-all">
                  {c.visualDna || 'Prompt Mestre pendente de configuração.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Meus Personagens Grid */
        <div>
          {filteredCharacters.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-10 text-center space-y-4 max-w-md mx-auto">
              <User className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum personagem encontrado</h3>
              <p className="text-xs text-zinc-400">
                Crie o perfil do seu primeiro influenciador ou personagem digital com Prompt Mestre calibrado com IA.
              </p>
              <button
                onClick={() => {
                  setEditingCharacter(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Personagem</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((char) => (
                <div
                  key={char.id}
                  className="bg-[#141414] border border-[#242424] hover:border-[#383838] rounded-2xl p-5 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={char.avatarUrl || '/src/assets/images/avatar_lara_model_1792450194066.jpg'}
                        alt={char.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-[#333]"
                      />
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate">{char.name}</h3>
                        <span className="text-xs text-[#DFFF00] font-medium block truncate">
                          {char.niche}
                        </span>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{char.bio}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0D0D0D] border border-[#202020]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">
                          Prompt Mestre (DNA)
                        </span>
                        <button
                          onClick={() => handleCopyMasterPrompt(char.visualDna || '', char.id)}
                          className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === char.id ? (
                            <span className="text-emerald-400 font-bold">Copiado!</span>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-mono line-clamp-3 leading-relaxed">
                        {char.visualDna || 'Padrão estético 4K cinematográfico.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#222] flex justify-end">
                    <button
                      onClick={() => {
                        setEditingCharacter(char);
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Ficha & Prompt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CharacterModal
        isOpen={isModalOpen}
        characterToEdit={editingCharacter}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCharacter(null);
        }}
      />
    </div>
  );
};
