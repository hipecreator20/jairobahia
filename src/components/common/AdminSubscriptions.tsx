import { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { MASTER_UID } from '../../context/AuthContext';
import { getAdminBilling, setSubscription } from '../../services/billingService';
export function AdminSubscriptions({users}:{users:UserProfile[]}) {
  const [accounts,setAccounts]=useState<any[]>([]),[uid,setUid]=useState(''),[plan,setPlan]=useState('pro');
  const [expiry,setExpiry]=useState(()=>new Date(Date.now()+30*86400000).toISOString().slice(0,10));
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);const pending=useRef(false);
  const reload=async()=>{const data=await getAdminBilling();setAccounts(data.accounts);};
  useEffect(()=>{void reload().catch(()=>setMessage('Não foi possível consultar assinaturas.'));},[]);
  const save=async(status:'paid'|'unpaid')=>{
    if(!uid||pending.current)return;
    if(!window.confirm(status==='paid'?'Confirma que recebeu o pagamento? Isso libera as moedas do período.':'Marcar pagamento como pendente e suspender os benefícios pagos?'))return;
    pending.current=true;setBusy(true);setMessage('Registrando…');
    try{const data=await setSubscription(uid,plan,status,new Date(`${expiry}T23:59:59`).toISOString());await reload();setMessage(data.message);window.dispatchEvent(new Event('wallet-changed'));}
    catch(e){setMessage(e instanceof Error?e.message:'Falha ao registrar.');}finally{pending.current=false;setBusy(false);}
  };
  return <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><h2 className="font-semibold">Pagamentos e moedas</h2><p className="text-xs text-zinc-400">Confirmação manual de recebimento. Não há cobrança automática de cartão. Aprovação de acesso e pagamento são controles separados.</p>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-zinc-400">Conta<select aria-label="Conta da assinatura" disabled={busy} value={uid} onChange={e=>setUid(e.target.value)} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"><option value="">Selecione</option>{users.filter(u=>u.id!==MASTER_UID).map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select></label><label className="text-xs text-zinc-400">Plano<select disabled={busy} value={plan} onChange={e=>setPlan(e.target.value)} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"><option value="pro">Pro · 1 milhão</option><option value="premium">Premium · 3 milhões</option></select></label><label className="text-xs text-zinc-400">Válido até<input disabled={busy} type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||!uid||!expiry} onClick={()=>void save('paid')} className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Confirmar pagamento</button><button type="button" disabled={busy||!uid} onClick={()=>void save('unpaid')} className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-300 disabled:opacity-40">Marcar pendente</button></div>
    {message && <p role="status" className="text-xs text-lime-200">{message}</p>}
    {accounts.map(account=><p key={account.uid} className="text-xs text-zinc-400">{users.find(u=>u.id===account.uid)?.email || account.uid} · {account.paid?'Pago':'Sem plano pago ativo'} · {account.balance.toLocaleString('pt-BR')} moedas {account.paidUntil?`· até ${new Date(account.paidUntil).toLocaleDateString('pt-BR')}`:''}</p>)}
  </section>;
}
