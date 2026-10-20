import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getWallet, WalletInfo } from '../../services/billingService';
const number=(n:number)=>n.toLocaleString('pt-BR');
export function WalletPanel({compact=false}:{compact?:boolean}) {
  const {user}=useAuth();const [wallet,setWallet]=useState<WalletInfo|null>(null);const [error,setError]=useState('');
  useEffect(()=>{
    if(!user){setWallet(null);return;}
    let alive=true;
    const refresh=()=>{void getWallet().then(value=>{if(alive){setWallet(value);setError('');}}).catch(()=>{if(alive)setError('Saldo indisponível. Confira sua sessão e aprovação.');});};
    refresh();window.addEventListener('wallet-changed',refresh);const timer=window.setInterval(refresh,60_000);
    return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('wallet-changed',refresh);};
  },[user?.uid]);
  return <section aria-label="Saldo e consumo" className="space-y-3 rounded-xl border border-zinc-800 bg-[#141414] p-4">
    <div className="flex items-center justify-between"><h2 className="text-xs font-semibold text-zinc-300">Suas moedas</h2>{wallet && <span className="text-[10px] uppercase text-lime-200">{wallet.plan}</span>}</div>
    {error ? <p role="status" className="text-xs text-zinc-400">{error}</p> : !wallet ? <p className="text-xs text-zinc-500">Carregando saldo…</p> : <>
      <p className="text-lg font-bold text-lime-200">{number(wallet.balance)} <span className="text-[10px] font-normal text-zinc-400">disponíveis</span></p>
      <p className="text-[10px] text-zinc-400">{number(wallet.spent)} usadas de {number(wallet.allocated)}</p>
      <p className="text-[10px] text-zinc-500">{wallet.mediaEnabled ? `${(wallet.storageUsed/1024**3).toFixed(2)} GB de ${(wallet.storageLimit/1024**3).toFixed(wallet.paid?0:2)} GB` : 'Armazenamento persistente não ativado'}</p>
      {!compact && <><p className="text-xs leading-relaxed text-zinc-400">Texto/cena: {number(wallet.costs.text)} · imagem: {number(wallet.costs.image)} · análise de áudio: {number(wallet.costs.audio)} moedas. O desconto ocorre ao iniciar a solicitação; falhas também aparecem no histórico. Moedas são créditos internos, não tokens do Gemini ou dinheiro.</p><p className="text-xs text-zinc-400">{wallet.paidUntil ? `Plano válido até ${new Date(wallet.paidUntil).toLocaleDateString('pt-BR')}. Saldo renova em ciclos de 30 dias enquanto ativo.` : 'Free: renovação mensal. Planos pagos são confirmados manualmente pelo administrador.'}</p>
      <div className="space-y-2"><h3 className="text-xs font-semibold">Últimas gerações</h3>{wallet.ledger.length ? wallet.ledger.map(item=><p key={item.id} className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"><span>{new Date(item.createdAt).toLocaleString('pt-BR')} · {item.kind}</span><span>-{number(item.cost)} · {item.status==='completed'?'concluída':item.status==='failed'?'falhou':'iniciada'}</span></p>) : <p className="text-xs text-zinc-500">Nenhuma geração debitada neste sistema de moedas.</p>}</div></>}
    </>}
  </section>;
}
