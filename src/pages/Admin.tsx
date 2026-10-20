import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
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

  useEffect(() => {
    if (!isOwner) return;
    const stops = [
      onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => d.data() as UserProfile))),
      onSnapshot(collection(db, 'accessLogs'), snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Record<string, any>).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))), e => console.error('[Admin access logs]', e)),
      onSnapshot(collection(db, 'usage'), snap => setUsage(snap.docs.map(d => ({ id:d.id, ...d.data() }) as Record<string, any>)), e => console.error('[Admin usage]', e)),
      onSnapshot(collection(db, 'alerts'), snap => setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error('[Admin alerts]', e)),
      onSnapshot(doc(db, 'settings', 'plans'), snap => { if (snap.exists() && snap.data().plans) setPlans(snap.data().plans); }, e => console.error('[Admin plans]', e)),
    ];
    return () => stops.forEach(stop => stop());
  }, [isOwner]);

  const changeStatus = async (user: UserProfile, status: UserProfile['status']) => {
    try { await setUserAccess(user.id, status); setMessage(`${user.email}: ${labels[status]}.`); }
    catch (error) { console.error('[Admin user status]', error); setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o acesso.'); }
  };
  const changePlan = async (user: UserProfile, plan: string) => {
    try { await setUserPlan(user.id, plan); setMessage(`${user.email}: plano ${plan}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o plano.'); }
  };
  const savePlans = async () => {
    if (Object.values(plans).some(plan => !Number.isFinite(plan.price) || plan.price < 0 || !Number.isSafeInteger(plan.promptsPerMonth) || plan.promptsPerMonth < 1)) { setMessage('Confira os preços e limites informados.'); return; }
    try { await setDoc(doc(db, 'settings', 'plans'), { plans, updatedAt: new Date().toISOString() }); setMessage('Planos salvos. Pagamentos continuam desativados.'); }
    catch (error) { console.error('[Admin plans]', error); setMessage('Falha ao salvar os planos.'); }
  };
  const createAlert = async () => {
    if (!alertText.trim()) return;
    try { await setDoc(doc(collection(db, 'alerts')), { message: alertText.trim().slice(0, 300), createdAt: new Date().toISOString(), createdBy: 'master', active: true }); setAlertText(''); }
    catch (error) { console.error('[Admin alert]', error); setMessage('Falha ao publicar o alerta.'); }
  };

  const button = (key: typeof tab, label: string) => <button onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-lime-300 text-black' : 'bg-zinc-800 text-white'}`}>{label}</button>;
  return <section className="space-y-5">
    <header><h1 className="text-2xl font-bold text-white">Administração</h1><p className="text-sm text-zinc-400">Usuários, acessos, alertas e planos do estúdio.</p></header>
    <nav className="flex flex-wrap gap-2">{button('users','Usuários')}{button('access','Acessos')}{button('alerts','Alertas')}{button('plans','Planos')}{button('settings','Configurações')}</nav>
    {message && <p role="status" className="text-sm text-lime-300">{message}</p>}
    {tab === 'users' && <div className="space-y-2">{users.map(user => <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div><strong>{user.displayName || user.email}</strong><div className="text-xs text-zinc-400">{user.email} · {labels[user.status || 'pending']} · {user.plan || 'free'}</div></div><div className="flex flex-wrap gap-2"><button className="rounded bg-lime-300 px-3 py-1 text-xs text-black" onClick={() => void changeStatus(user,'approved')}>Aprovar</button><button className="rounded bg-zinc-700 px-3 py-1 text-xs" onClick={() => void changeStatus(user,'rejected')}>Rejeitar</button><button className="rounded bg-red-900 px-3 py-1 text-xs" onClick={() => void changeStatus(user,'suspended')}>Suspender</button><select aria-label={`Plano de ${user.email}`} value={user.plan || 'free'} onChange={e => void changePlan(user, e.target.value)} className="rounded bg-zinc-800 px-2 text-xs">{Object.keys(defaults).map(p=><option key={p} value={p}>{p}</option>)}</select></div></article>)}</div>}
    {tab === 'access' && <div className="space-y-2"><h2 className="font-semibold">Uso mensal</h2>{usage.map(row=><article key={row.id} className="rounded-lg border border-zinc-800 p-3 text-sm">{row.uid} · {row.month} · {row.count} prompts · {row.plan}</article>)}<h2 className="pt-3 font-semibold">Eventos</h2>{logs.map((log,i)=><article key={log.id || i} className="rounded-lg border border-zinc-800 p-3 text-sm"><strong>{log.event}</strong><span className="ml-2 text-zinc-400">{log.email || log.uid} · {log.createdAt}</span></article>)}{!logs.length && <p className="text-sm text-zinc-400">Nenhum evento registrado.</p>}</div>}
    {tab === 'alerts' && <div className="space-y-3"><div className="flex gap-2"><input value={alertText} onChange={e=>setAlertText(e.target.value)} maxLength={300} placeholder="Novo alerta" className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2"/><button onClick={()=>void createAlert()} className="rounded-lg bg-lime-300 px-4 text-black">Publicar</button></div>{alerts.map(a=><article key={a.id} className="rounded-lg border border-zinc-800 p-3">{a.message}<div className="text-xs text-zinc-500">{a.createdAt}</div></article>)}</div>}
    {tab === 'plans' && <div className="space-y-3">{Object.entries(plans).map(([key,plan])=><article key={key} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-3"><strong className="capitalize">{key}</strong><label className="text-xs text-zinc-400">Preço mensal (R$)<input type="number" min="0" step="0.01" value={plan.price} onChange={e=>setPlans(v=>({...v,[key]:{...v[key],price:Number(e.target.value)}}))} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label><label className="text-xs text-zinc-400">Prompts por mês<input type="number" min="0" value={plan.promptsPerMonth} onChange={e=>setPlans(v=>({...v,[key]:{...v[key],promptsPerMonth:Number(e.target.value)}}))} className="mt-1 block w-full rounded bg-zinc-800 p-2 text-white"/></label></article>)}<button onClick={()=>void savePlans()} className="rounded-lg bg-lime-300 px-4 py-2 font-semibold text-black">Salvar planos</button><p className="text-xs text-zinc-500">A cobrança está desativada. Os limites de uso são verificados na API.</p></div>}
    {tab === 'settings' && <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">Projeto Firebase: gen-lang-client-0704234685<br/>Banco: ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab<br/>Pagamentos: desativados<br/>Eventos e alterações são registrados no Firestore.</div>}
  </section>;
};
