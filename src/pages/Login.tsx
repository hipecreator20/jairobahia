import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Sparkles, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth, AUTHORIZED_OWNER_EMAIL } from '../context/AuthContext';

function formatAuthError(error: any): string {
  if (!error) return 'Erro desconhecido na autenticação.';
  const code = error?.code || '';
  const msg = error?.message || '';

  if (code === 'auth/popup-closed-by-user') {
    return 'A janela do Google foi fechada antes de concluir a autenticação. Clique no botão para tentar novamente.';
  }
  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de autenticação. Por favor, permita popups para este site.';
  }
  if (code === 'auth/unauthorized-domain') {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    return `O domínio (${currentHost}) não está na lista de 'Authorized Domains' do Firebase Authentication. Adicione este domínio no Console Firebase > Authentication > Settings.`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Falha de rede ao conectar aos servidores do Google/Firebase. Verifique sua conexão com a internet.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Requisição anterior cancelada.';
  }
  if (msg.includes('Acesso não autorizado')) {
    return msg;
  }
  return `Erro de autenticação (${code || 'erro'}): ${msg}`;
}

export const Login: React.FC = () => {
  const {
    signInWithGoogle,
    isAuthorized,
    loading: authLoading,
    unauthorizedEmail,
    dismissUnauthorizedNotice,
    clearAuthError,
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated and authorized, immediately redirect to /dashboard
  useEffect(() => {
    if (!authLoading && isAuthorized) {
      console.log('[HYPE AUTH] Usuário autorizado detectado. Redirecionando para /dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthorized, authLoading, navigate]);

  if (isAuthorized && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    clearAuthError();

    try {
      const cred = await signInWithGoogle();
      const email = cred.user?.email || '';

      if (email.trim().toLowerCase() === AUTHORIZED_OWNER_EMAIL.trim().toLowerCase()) {
        console.log('[HYPE AUTH] Autenticação bem-sucedida do proprietário. Redirecionando para /dashboard...');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('[HYPE AUTH] Erro capturado no Login:', err);
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#DFFF00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#141414] border border-[#242424] rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1C14] border border-[#DFFF00]/20 text-[#DFFF00] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fase 1 — Fundação Profissional</span>
          </div>

          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            <span className="text-[#DFFF00]">HYPE</span> CREATOR STUDIO 2.0
          </h1>
          <p className="text-xs text-zinc-400">
            Seu universo criativo com inteligência artificial.
          </p>
        </div>

        {/* Unauthorized user alert */}
        {unauthorizedEmail && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-2 animate-fade-in">
            <div className="flex items-start gap-2.5 text-red-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Acesso Bloqueado — Conta Não Autorizada</span>
            </div>
            <p className="text-zinc-300">
              A conta <strong className="text-white font-mono">{unauthorizedEmail}</strong> não tem permissão para acessar este estúdio.
            </p>
            <p className="text-[11px] text-zinc-400">
              O sistema é restrito e exclusivo para o proprietário autorizado: <span className="text-[#DFFF00] font-mono">{AUTHORIZED_OWNER_EMAIL}</span>.
            </p>
            <button
              onClick={dismissUnauthorizedNotice}
              className="text-xs text-[#DFFF00] hover:underline font-semibold block pt-1 cursor-pointer"
            >
              Tentar novamente com outra conta Google
            </button>
          </div>
        )}

        {/* General Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Aviso de Autenticação:</span>
              <span className="text-zinc-300 text-[11px] leading-relaxed block">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Security badge and rule reminder */}
        <div className="p-3.5 bg-[#0D0D0D] border border-[#1F1F1F] rounded-xl flex items-start gap-3 text-xs text-zinc-400">
          <Lock className="w-4 h-4 text-[#DFFF00] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-zinc-200">Estúdio Pessoal & Seguro</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Autenticação oficial via Firebase Authentication. Apenas o proprietário autorizado tem permissão de entrada no estúdio.
            </p>
          </div>
        </div>

        {/* Login Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Main Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting || authLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-zinc-100 active:scale-98 text-black font-semibold text-sm rounded-xl shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting || authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Autenticando com Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com Google</span>
              </>
            )}
          </button>

          {/* Secure Owner Access button triggering real auth flow */}
          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting || authLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1C1C14] hover:bg-[#25251a] border border-[#DFFF00]/30 text-[#DFFF00] font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Acessar como Proprietário ({AUTHORIZED_OWNER_EMAIL})</span>
          </button>
        </div>

        <div className="pt-2 text-center text-[11px] text-zinc-500">
          Hype Creator Studio 2.0 · Versão Pessoal do Proprietário
        </div>
      </div>
    </div>
  );
};
