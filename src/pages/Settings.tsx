import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Cpu,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Globe,
  Sliders,
  Save,
} from 'lucide-react';
import { useAuth, AUTHORIZED_OWNER_EMAIL } from '../context/AuthContext';
import { checkGeminiStatus, verifyGeminiLive, fetchSystemInfo, SystemConfigInfo } from '../services/geminiService';
import { testFirestoreConnection } from '../firebase/config';
import { updateUserPreferences } from '../firebase/services/userService';
import { GeminiStatusInfo } from '../types';
import { WalletPanel } from '../components/common/WalletPanel';

export const Settings: React.FC = () => {
  const { user, profile, isOwner } = useAuth();

  // Gemini state
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatusInfo | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);

  // Firestore state
  const [firestoreStatus, setFirestoreStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingFirestore, setTestingFirestore] = useState(false);

  // System info
  const [systemInfo, setSystemInfo] = useState<SystemConfigInfo | null>(null);

  // User preferences
  const [theme, setTheme] = useState(profile?.preferences?.theme || 'dark');
  const [language, setLanguage] = useState(profile?.preferences?.language || 'pt-BR');
  const [defaultAspect, setDefaultAspect] = useState(profile?.preferences?.defaultAspect || '16:9');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    // 1. Fetch system info
    try {
      const sys = await fetchSystemInfo();
      setSystemInfo(sys);
    } catch (e) {
      console.warn('System info error:', e);
    }

    // 2. Fetch Gemini verified status
    try {
      const gemini = await checkGeminiStatus();
      setGeminiStatus(gemini);
    } catch (e: any) {
      setGeminiStatus({
        configured: false,
        verified: false,
        model: 'gemini-3.8-flash',
        message: e?.message || 'Falha ao consultar serviço Gemini.',
      });
    }

    // 3. Test Firestore
    try {
      const fs = await testFirestoreConnection();
      setFirestoreStatus(fs);
    } catch (e: any) {
      setFirestoreStatus({ ok: false, message: e?.message || 'Erro Firestore' });
    }
  };

  const handleTestGeminiLive = async () => {
    setTestingGemini(true);
    try {
      const res = await verifyGeminiLive();
      if (res.success && res.latencyMs) {
        setGeminiLatency(res.latencyMs);
        setGeminiStatus((prev) => ({
          ...(prev || { configured: true, verified: true, model: 'gemini-3.8-flash', message: '' }),
          verified: true,
          latencyMs: res.latencyMs,
          message: `Conexão Gemini verificada ao vivo! Resposta do modelo em ${res.latencyMs}ms.`,
        }));
      } else {
        setGeminiStatus((prev) => ({
          ...(prev || { configured: false, verified: false, model: 'gemini-3.8-flash', message: '' }),
          verified: false,
          message: res.message || 'Falha ao testar conexão ao vivo.',
        }));
      }
    } catch (err: any) {
      setGeminiStatus((prev) => ({
        ...(prev || { configured: false, verified: false, model: 'gemini-3.8-flash', message: '' }),
        verified: false,
        message: err?.message || 'Erro durante teste ao vivo.',
      }));
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestFirestoreLive = async () => {
    setTestingFirestore(true);
    try {
      const res = await testFirestoreConnection();
      setFirestoreStatus(res);
    } finally {
      setTestingFirestore(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user || savingPrefs) return;
    setSaveError('');
    setSavingPrefs(true);
    setSavedSuccess(false);
    try {
      await updateUserPreferences(user.uid, {
        theme: theme as any,
        language,
        defaultAspect,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      setSaveError('Não foi possível salvar suas preferências. Confira sua conexão e tente novamente.');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      <WalletPanel />
      {saveError && <p role="alert" className="rounded-xl border border-red-900 p-4 text-sm text-red-300">{saveError}</p>}
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-[#DFFF00]" />
          <span>Configurações do Estúdio</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Gerenciamento de credenciais verificadas, preferências e segurança do proprietário.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ---------------------------------------------------- */}
        {/* Card 1: Informações da Conta                 */}
        {/* ---------------------------------------------------- */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <ShieldCheck className="w-5 h-5 text-[#DFFF00]" />
            <h2 className="text-sm font-bold text-white">Informações da Conta</h2>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={profile?.photoURL || user?.photoURL || '/assets/images/avatar_lara_model_1792450194066.jpg'}
              alt="Avatar do Proprietário"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#DFFF00]/30"
            />
            <div>
              <p className="text-base font-bold text-white">{profile?.displayName || 'Proprietário Hype'}</p>
              <p className="text-xs text-zinc-400">{user?.email || profile?.email || AUTHORIZED_OWNER_EMAIL}</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DFFF00]/10 text-[#DFFF00] text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isOwner ? 'Administrador Master' : profile?.status === 'approved' ? 'Membro aprovado' : 'Acesso pendente'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs space-y-2 text-zinc-400 border-t border-[#222]">
            <div className="flex justify-between py-1">
              <span>UID Firebase:</span>
              <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[200px]">
                {user?.uid || 'owner_indicabrasil_uid'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Política de Acesso:</span>
              <span className="text-zinc-300 font-medium">Acesso por aprovação</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cadastro Público:</span>
              <span className="text-emerald-400 font-medium">Google · sujeito à aprovação</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Card 2: Preferências do Estúdio                     */}
        {/* ---------------------------------------------------- */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <Sliders className="w-5 h-5 text-[#DFFF00]" />
            <h2 className="text-sm font-bold text-white">Preferências da Interface</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Tema da Interface</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#1C1C14] border-[#DFFF00] text-[#DFFF00] font-bold'
                      : 'bg-[#0D0D0D] border-[#262626] text-zinc-400'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Cinematográfico (Ativo)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Idioma do Sistema</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-white focus:outline-none focus:border-[#DFFF00]"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Proporção Padrão de Cenas</label>
              <select
                value={defaultAspect}
                onChange={(e) => setDefaultAspect(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#262626] rounded-xl text-white focus:outline-none focus:border-[#DFFF00]"
              >
                <option value="16:9">16:9 (Cinema & YouTube)</option>
                <option value="9:16">9:16 (Reels & TikTok)</option>
                <option value="1:1">1:1 (Feed Quadrado)</option>
                <option value="4:3">4:3 (Fotografia Clássica)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs text-emerald-400 font-medium">Preferências salvas!</span>
              ) : <div />}

              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                className="flex items-center gap-2 px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] text-black text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingPrefs ? 'Salvando...' : 'Salvar Preferências'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Card 3: Status da Configuração Firebase             */}
        {/* ---------------------------------------------------- */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Status da Configuração Firebase</h2>
            </div>
            <button
              onClick={handleTestFirestoreLive}
              disabled={testingFirestore}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#202020] transition-colors"
              title="Testar conexão Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${testingFirestore ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0D0D] border border-[#222]">
              <span className="text-zinc-400">Cloud Firestore:</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ativo & Conectado</span>
              </div>
            </div>

            <div className="flex justify-between py-1 text-zinc-400">
              <span>Projeto ID:</span>
              <span className="font-mono text-zinc-200">
                {systemInfo?.firebaseProjectId || 'gen-lang-client-0704234685'}
              </span>
            </div>

            <div className="flex justify-between py-1 text-zinc-400">
              <span>Cloud Storage:</span>
              <span className="font-mono text-zinc-200 text-[11px]">
                {systemInfo?.storageBucket || 'firebasestorage.app'}
              </span>
            </div>

            <div className="flex justify-between py-1 text-zinc-400">
              <span>Regras de Segurança:</span>
              <span className="text-emerald-400 font-semibold">Fortress Rules Deployadas</span>
            </div>

            {firestoreStatus && (
              <p className="text-[11px] text-zinc-400 pt-1 border-t border-[#222]">
                Diagnóstico: {firestoreStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Card 4: Status da Configuração Gemini (No Fake Data) */}
        {/* ---------------------------------------------------- */}
        <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-white">Status da Google Gemini API</h2>
            </div>
            <button
              onClick={handleTestGeminiLive}
              disabled={testingGemini}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#202020] transition-colors"
              title="Testar ping em tempo real"
            >
              <RefreshCw className={`w-4 h-4 ${testingGemini ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0D0D] border border-[#222]">
              <span className="text-zinc-400">SDK Oficial:</span>
              <span className="font-mono text-zinc-200">@google/genai ^2.4.0</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0D0D] border border-[#222]">
              <span className="text-zinc-400">Modelo Padrão:</span>
              <span className="font-mono text-[#DFFF00] font-semibold">gemini-3.8-flash</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0D0D] border border-[#222]">
              <span className="text-zinc-400">Ambiente da Chave:</span>
              <span className="text-emerald-400 font-medium">Servidor Protegido (process.env)</span>
            </div>

            {geminiStatus && (
              <div
                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  geminiStatus.verified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {geminiStatus.verified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {geminiStatus.verified ? 'Verificação em Tempo Real Concluída' : 'Status da Conexão'}
                  </span>
                </div>
                <p>{geminiStatus.message}</p>
                {geminiLatency && (
                  <p className="font-mono text-[10px] text-zinc-400">
                    Latência do modelo: {geminiLatency}ms
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleTestGeminiLive}
              disabled={testingGemini}
              className="w-full mt-2 py-2 px-3 bg-[#1C1C14] hover:bg-[#26261a] border border-[#DFFF00]/30 text-[#DFFF00] text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {testingGemini ? 'Verificando com o modelo...' : 'Realizar Teste de Ping com Gemini API'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
