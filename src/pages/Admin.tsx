import React, { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MASTER_UID, useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { setUserAccess, setUserPlan } from '../firebase/services/adminService';

type Plan = { name: string; price: number; promptsPerMonth: number };
const defaults: Record<string, Plan> = {
  free: { name: 'Free', price: 0, promptsPerMonth: 10 },
  pro: { name: 'Pro', price: 39.9, promptsPerMonth: 300 },
  premium: { name: 'Premium', price: 79.9, promptsPerMonth: 1000 },
};
const labels = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', suspended: 'Suspenso' } as const;

export const Admin: React.FC = () => {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<'users' | 'access' | 'alerts' | 'plans' | 'settings'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const [usage, setUsage] = useState<Record<string, any>[]>([]);
  const [alerts, setAlerts] = useState<Record<string, any>[]>([]);
  const [plans, setPlans] = useState(defaults);
  const [alertText, setAlertText] = useState('');
  const [message, setMessage] = useState('');
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const actionPending = useRef(false);
  const plansDirty = useRef(false);

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    if (actionPending.current) return;
    actionPending.current = true; setBusyAction(key); setActionError(false); setMessage('Salvando no servidor…');
    try { await action(); setMessage(success); }
    catch (error) { setActionError(true); setMessage(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { actionPending.current = false; setBusyAction(null); }
  };

  useEffect(() => {
    if (!isOwner) return;
    const stops = [
      onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }) as UserProfile)), () => { setActionError(true); setMessage('Não foi possível carregar os usuários. Confira sua sessão Master.'); }),
      onSnapshot(collection(db, 'accessLogs'), snap => setLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Record<string, any>).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))), e => console.error('[Admin access logs]', e)),
      onSnapshot(collection(db, 'usage'), snap => setUsage(snap.docs.map(d => ({ ...d.data(), id:d.id }) as Record<string, any>)), e => console.error('[Admin usage]', e)),
      onSnapshot(collection(db, 'alerts'), snap => setAlerts(snap.docs.map(d => ({ ...d.data(), id: d.id }))), e => console.error('[Admin alerts]', e)),
      onSnapshot(doc(db, 'settings', 'plans'), snap => { if (!plansDirty.current && snap.exists() && snap.data().plans) setPlans({ ...defaults, ...snap.data().plans }); }, () => { setActionError(true); setMessage('Não foi possível carregar os planos.'); }),
    ];
    return () => stops.forEach(stop => stop());
  }, [isOwner]);

  const changeStatus = async (user: UserProfile, status: UserProfile['status']) => {
    if (busyUser) return;
    setBusyUser(user.id); setActionError(false); setMessage('Atualizando acesso…');
    try { await setUserAccess(user.id, status); setMessage(`${user.email}: ${labels[status]}.`); }
    catch (error) { setActionError(true); setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o acesso.'); }
    finally { setBusyUser(null); }
  };
  const changePlan = async (user: UserProfile, plan: string) => {
    if (busyUser) return;
    setBusyUser(user.id); setActionError(false); setMessage('Atualizando plano…');
    try { await setUserPlan(user.id, plan); setMessage(`${user.email}: plano ${plan}.`); }
    catch (error) { setActionError(true); setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o plano.'); }
    finally { setBusyUser(null); }
  };
  const savePlans = async () => {
    if (Object.values(plans).some(plan => !Number.isFinite(plan.price) || plan.price < 0 || !Number.isSafeInteger(plan.promptsPerMonth) || plan.promptsPerMonth < 1)) { setActionError(true); setMessage('Confira os preços e limites informados.'); return; }
    await runAction('plans', async () => { await setDoc(doc(db, 'settings', 'plans'), { plans, updatedAt: new Date().toISOString() }); plansDirty.current = false; }, 'Planos salvos. Pagamentos continuam desativados.');
  };
  const createAlert = async () => {
    if (!alertText.trim()) return;
    await runAction('alert', async () => { await setDoc(doc(collection(db, 'alerts')), { message: alertText.trim().slice(0, 300), createdAt: new Date().toISOString(), createdBy: MASTER_UID, active: true }); setAlertText(''); }, 'Alerta publicado.');
  };
  const removeAlert = async (id: string) => {
    if (!window.confirm('Excluir este alerta? Esta ação não pode ser desfeita.')) return;
    await runAction(`delete:${id}`, () => deleteDoc(doc(db, 'alerts', id)), 'Alerta excluído.');
  };

  const button = (key: typeof tab, label: string) => <button onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-lime-300 text-black' : 'bg-zinc-800 text-white'}`}>{label}</button>;
  return <section className="space-y-5">
    <header><h1 className="text-2xl font-bold text-white">Administração</h1><p className="text-sm text-zinc-400">Usuários, acessos, alertas e planos do estúdio.</p></header>
    <nav className="flex flex-wrap gap-2">{button('users','Usuários')}{button('access','Acessos')}{button('alerts','Alertas')}{button('plans','Planos')}{button('settings','Configurações')}</nav>
    {message && <p role={actionError ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${actionError ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-lime-900 bg-lime-950/30 text-lime-200'}`}>{message}</p>}
    {tab === 'users' && <div className="space-y-3">
      <p className="text-xs text-zinc-400">{users.length} contas · O acesso é liberado somente após a confirmação do servidor.</p>
      {users.map(user => <article key={user.id} aria-busy={busyUser === user.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="font-semibold text-white">{user.displayName || 'Usuário'}</h2><p className="mt-1 break-all text-xs text-zinc-400">{user.email}</p></div>
          <div className="flex gap-2 text-xs"><span className={`rounded-full px-3 py-1 ${user.status === 'approved' ? 'bg-lime-400/10 text-lime-300' : user.status === 'suspended' || user.status === 'rejected' ? 'bg-red-400/10 text-red-300' : 'bg-amber-400/10 text-amber-200'}`}>{labels[user.status || 'pending']}</span><span className="rounded-full bg-zinc-800 px-3 py-1 uppercase text-zinc-300">{user.plan || 'free'}</span></div>
        </div>
        {user.id === MASTER_UID ? <p className="mt-4 text-xs text-lime-300">Conta Master protegida</p> : <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
          <button disabled={Boolean(busyUser) || user.status === 'approved'} className="rounded-lg bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-40" onClick={() => void changeStatus(user,'approved')}>Aprovar acesso</button>
          <button disabled={Boolean(busyUser) || user.status === 'rejected'} className="rounded-lg bg-zinc-800 px-4 py-2 text-xs disabled:opacity-40" onClick={() => void changeStatus(user,'rejected')}>Rejeitar</button>
          <button disabled={Boolean(busyUser) || user.status === 'suspended'} className="rounded-lg border border-red-900 px-4 py-2 text-xs text-red-300 disabled:opacity-40" onClick={() => void changeStatus(user,'suspended')}>Suspender</button>
          <label className="flex items-center gap-2 text-xs text-zinc-400">Plano<select disabled={Boolean(busyUser)} aria-label={`Plano de ${user.email}`} value={user.plan || 'free'} onChange={e => void changePlan(user, e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white disabled:opacity-40">{Object.keys(defaults).map(p=><option key={p} value={p}>{p}</option>)}</select></label>
          {busyUser === user.id && <span role="status" className="text-xs text-lime-300">Salvando no servidor…</span>}
        </div>}
      </article>)}
      {!users.length && <p className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-400">Nenhum usuário carregado.</p>}
    </div>}
    {tab === 'access' && <div className="space-y-2"><h2 className="font-semibold">Uso mensal</h2>{usage.map(row=><article key={row.id} className="rounded-lg border border-zinc-800 p-3 text-sm">{row.uid} · {row.month} · {row.count} prompts · {row.plan}</article>)}<h2 className="pt-3 font-semibold">Eventos</h2>{logs.map((log,i)=><article key={log.id || i} className="rounded-lg border border-zinc-800 p-3 text-sm"><strong>{log.event}</strong><span className="ml-2 text-zinc-400">{log.email || log.uid} · {log.createdAt}</span></article>)}{!logs.length && <p className="text-sm text-zinc-400">Nenhum evento registrado.</p>}</div>}
    {tab === 'alerts' && <div className="space-y-3"><div className="flex gap-2"><input disabled={Boolean(busyAction)} aria-label="Mensagem do alerta" value={alertText} onChange={e=>setAlertText(e.target.value)} maxLength={300} placeholder="Novo alerta" className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2"/><button disabled={Boolean(busyAction) || !alertText.trim()} onClick={()=>void createAlert()} className="rounded-lg bg-lime-300 px-4 text-black">{busyAction === 'alert' ? 'Publicando…' : 'Publicar'}</button></div>{alerts.map(a=><article key={a.id} className="rounded-lg border border-zinc-800 p-3">{a.message}<div className="text-xs text-zinc-500">{a.createdAt}</div><button type="button" disabled={Boolean(busyAction)} onClick={()=>void removeAlert(a.id)} className="mt-3 rounded-lg border border-red-900 px-3 py-2 text-xs text-red-300 disabled:opacity-40">{busyAction === `delete:${a.id}` ? 'Excluindo…' : 'Excluir alerta'}</button></article>)}</div>}
    {tab === 'plans' && <div className="space-y-3">{Object.entries(plans).map(([key,plan])=><article key={key} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-3"><strong className="capitalize">{key}</strong><label className="text-xs text-zinc-400">Preço mensal (R$)<input type="number" min="0" step="0.01" value={plan.price} disabled={Boolean(busyAction)} onChange={e=>{plansDirty.current = true; setPlans(v=>({...v,[key]:{...v[key],price:Number(e.target.value)}}));}} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label><label className="text-xs text-zinc-400">Prompts por mês<input type="number" min="0" value={plan.promptsPerMonth} disabled={Boolean(busyAction)} onChange={e=>{plansDirty.current = true; setPlans(v=>({...v,[key]:{...v[key],promptsPerMonth:Number(e.target.value)}}));}} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label></article>)}<button disabled={Boolean(busyAction)} onClick={()=>void savePlans()} className="rounded-lg bg-lime-300 px-4 py-2 font-semibold text-black">{busyAction === 'plans' ? 'Salvando…' : 'Salvar planos'}</button><p className="text-xs text-zinc-500">A cobrança está desativada. Os limites de uso são verificados na API.</p></div>}
    {tab === 'settings' && <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">Projeto Firebase: gen-lang-client-0704234685<br/>Banco: ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab<br/>Pagamentos: desativados<br/>Eventos e alterações são registrados no Firestore.</div>}
  </section>;
};
