import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { authenticatedFetch } from '../../services/geminiService';
type Event = {requestId:string;createdAt:string;route:string;status:number;stage:string;durationMs:number;code:string;message:string;action:string;commit:string|null};
export function AdminDiagnostics() {
  const [events,setEvents]=useState<Event[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState('');
  const load = async(signal?:AbortSignal) => {
    setBusy(true);setError('');
    try {const res=await authenticatedFetch('/api/admin/diagnostics',{signal});const data=await res.json();if(!res.ok)throw Error(data.message);if(!signal?.aborted)setEvents(data.events);}
    catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Falha ao carregar logs.');}
    finally {if(!signal?.aborted)setBusy(false);}
  };
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[]);
  const filtered=events.filter(e=>`${e.requestId} ${e.code} ${e.route}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={20} className="text-amber-300"/>Central de diagnóstico</h2><p className="mt-1 text-sm text-zinc-400">Últimas 100 falhas de geração. Acesso exclusivo do administrador.</p></div><button disabled={busy} onClick={()=>void load()} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy?'animate-spin':''}/>{busy?'Carregando…':'Atualizar logs'}</button></header>
    <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"><Search size={16} className="text-zinc-500"/><input aria-label="Buscar erro por referência, código ou rota" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar referência, código ou rota…" className="w-full bg-transparent text-sm outline-none"/></label>
    {error && <p role="alert" className="rounded-xl border border-red-900 p-4 text-sm text-red-200">{error}</p>}
    <div aria-live="polite" className="space-y-3">{filtered.map(e=><article key={e.requestId} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-amber-200">{e.code}</strong><time className="text-xs text-zinc-400">{new Date(e.createdAt).toLocaleString('pt-BR')}</time></div><p className="mt-2 text-sm">{e.message}</p><p className="mt-2 text-sm text-zinc-400">{e.action}</p><dl className="mt-4 grid gap-3 border-t border-zinc-800 pt-3 text-xs sm:grid-cols-2"><div><dt className="text-zinc-500">Referência</dt><dd className="break-all select-all font-mono">{e.requestId}</dd></div><div><dt className="text-zinc-500">Rota</dt><dd className="break-all">{e.route}</dd></div><div><dt className="text-zinc-500">Etapa · HTTP · duração</dt><dd>{e.stage} · {e.status} · {(e.durationMs/1000).toFixed(1)} s</dd></div><div><dt className="text-zinc-500">Versão</dt><dd>{e.commit?.slice(0,7)||'Ambiente local'}</dd></div></dl></article>)}</div>
    {!busy&&!error&&!filtered.length&&<p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">{events.length?'Nenhum registro corresponde à busca.':'Nenhuma falha registrada após a ativação deste diagnóstico.'}</p>}
    <p className="text-xs leading-relaxed text-zinc-500">Registra falhas respondidas pela API de geração após esta atualização. Não armazena prompts, imagens, e-mails ou credenciais. Falhas da hospedagem antes da resposta devem ser consultadas na Vercel. Se o Firestore estiver indisponível, a referência permanece nos logs da Vercel.</p>
  </section>;
}
