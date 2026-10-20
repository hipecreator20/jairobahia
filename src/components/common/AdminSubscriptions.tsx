import { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { MASTER_UID } from '../../context/AuthContext';
import { getAdminBilling, setSubscription } from '../../services/billingService';
export function AdminSubscriptions({users}:{users:UserProfile[]}) {
  const [accounts,setAccounts]=useState<any[]>([]),[uid,setUid]=useState(''),[plan,setPlan]=useState('pro');
  const [amount,setAmount]=useState('39.90');
  const [payments,setPayments]=useState<{id:string;uid:string;amountCents:number;createdAt:string}[]>([]);
  const [expiry,setExpiry]=useState(()=>new Date(Date.now()+30*86400000).toISOString().slice(0,10));
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);const pending=useRef(false);
  const reload=async()=>{const data=await getAdminBilling();setAccounts(data.accounts);setPayments(data.payments||[]);};
  useEffect(()=>{void reload().catch(()=>setMessage('Não foi possível consultar assinaturas.'));},[]);
  const save=async(status:'paid'|'unpaid')=>{
    if(!uid||pending.current)return;
    if(!window.confirm(status==='paid'?'Confirma que recebeu o pagamento? Isso libera as créditos do período.':'Marcar pagamento como pendente e suspender os benefícios pagos?'))return;
    pending.current=true;setBusy(true);setMessage('Registrando…');
    try{const data=await setSubscription(uid,plan,status,new Date(`${expiry}T23:59:59`).toISOString(),Number(amount));await reload();setMessage(data.message);window.dispatchEvent(new Event('wallet-changed'));}
    catch(e){setMessage(e instanceof Error?e.message:'Falha ao registrar.');}finally{pending.current=false;setBusy(false);}
  };
  return <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><h2 className="font-semibold">Pagamentos e créditos</h2><p className="text-xs text-zinc-400">Confirmação manual de recebimento. Não há cobrança automática de cartão. Aprovação de acesso e pagamento são controles separados.</p>
    <div className="grid gap-3 sm:grid-cols-2"><article className="rounded-xl bg-zinc-950 p-4"><p className="text-xs text-zinc-400">Recebimentos registrados (últimos 100)</p><strong className="text-xl text-lime-200">{(payments.reduce((sum,p)=>sum+p.amountCents,0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><p className="mt-1 text-xs text-zinc-500">Somente valores informados pelo Master; não inclui assinaturas antigas sem recibo.</p></article><article className="rounded-xl bg-zinc-950 p-4"><p className="text-xs text-zinc-400">Assinaturas pagas ativas</p><strong className="text-xl text-lime-200">{accounts.filter(a=>a.paid).length}</strong><p className="mt-1 text-xs text-zinc-500">Pix automático: aguardando conexão Mercado Pago.</p><a className="text-xs text-lime-200 underline" href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer">Abrir painel Mercado Pago</a></article></div>
    <label className="block text-xs text-zinc-400">Valor efetivamente recebido (R$)<input type="number" min="0" max="10000" step="0.01" disabled={busy} value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 rounded bg-zinc-800 p-2 text-white"/></label>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-zinc-400">Conta<select aria-label="Conta da assinatura" disabled={busy} value={uid} onChange={e=>setUid(e.target.value)} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"><option value="">Selecione</option>{users.filter(u=>u.id!==MASTER_UID).map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select></label><label className="text-xs text-zinc-400">Plano<select disabled={busy} value={plan} onChange={e=>{setPlan(e.target.value);setAmount(e.target.value==='premium'?'79.90':'39.90');}} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"><option value="pro">Pro</option><option value="premium">Premium</option></select></label><label className="text-xs text-zinc-400">Válido até<input disabled={busy} type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||!uid||!expiry} onClick={()=>void save('paid')} className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Confirmar pagamento</button><button type="button" disabled={busy||!uid} onClick={()=>void save('unpaid')} className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-300 disabled:opacity-40">Marcar pendente</button></div>
    {message && <p role="status" className="text-xs text-lime-200">{message}</p>}
    {payments.length>0 && <div className="space-y-2"><h3 className="text-sm font-semibold">Histórico de recebimentos manuais</h3>{payments.map(p=><p key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-zinc-800 py-2 text-xs text-zinc-400"><span>{users.find(u=>u.id===p.uid)?.email || p.uid} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span><span>{(p.amountCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></p>)}</div>}
    <h3 className="pt-3 text-sm font-semibold">Saldos e validade</h3>
    {accounts.map(account=><p key={account.uid} className="text-xs text-zinc-400">{users.find(u=>u.id===account.uid)?.email || account.uid} · {account.paid?'Pago':'Sem plano pago ativo'} · {account.balance.toLocaleString('pt-BR')} créditos {account.paidUntil?`· até ${new Date(account.paidUntil).toLocaleDateString('pt-BR')}`:''}</p>)}
  </section>;
}
