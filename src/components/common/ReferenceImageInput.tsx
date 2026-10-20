import { useEffect, useRef, useState } from 'react';
import { loadReference, persistReference, removeReference, rememberReference, MediaBinding } from '../../services/mediaService';
import { getWallet } from '../../services/billingService';

export interface ReferenceImage { dataUrl: string; name: string; expiresAt: number; mediaId?: string }
export async function readReferenceImage(file: File): Promise<ReferenceImage> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw Error('Envie JPEG, PNG ou WebP de até 10 MB.');
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d'); if (!context) throw Error('Não foi possível preparar a imagem.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg',0.8);
    if (dataUrl.length > 2_000_000) throw Error('A imagem continua muito grande. Envie uma versão menor.');
    return {dataUrl,name:file.name,expiresAt:Date.now()+24*60*60*1000};
  } finally { image.close(); }
}

export function ReferenceImageInput({value,onChange,label='Imagem de referência',disabled=false,retention='Referência temporária nesta aba: até 24h. Ao fechar ou recarregar, envie novamente.',binding}: {
  value:ReferenceImage|null; onChange:(value:ReferenceImage|null)=>void; label?:string; disabled?:boolean; retention?:string;binding?:MediaBinding;
}) {
  const [error,setError] = useState(''); const [loading,setLoading] = useState(false);
  const [mediaEnabled,setMediaEnabled]=useState(false);const changed=useRef(onChange);changed.current=onChange;
  useEffect(()=>{
    if(!binding)return;let alive=true;
    void getWallet().then(w=>{if(alive)setMediaEnabled(w.mediaEnabled);}).catch(()=>{});
    void loadReference(binding).then(ref=>{if(alive && ref)changed.current(ref);}).catch(()=>{});
    return()=>{alive=false;};
  },[binding?.kind,binding?.id]);
  useEffect(()=> {
    if (!value || !Number.isFinite(value.expiresAt)) return;
    let timer:number;const schedule=()=>{const remaining=value.expiresAt-Date.now();if(remaining<=0){changed.current(null);return;}timer=window.setTimeout(schedule,Math.min(remaining,86400000));};schedule();
    return ()=>window.clearTimeout(timer);
  },[value]);
  const accept=async(ref:ReferenceImage)=>{
    if(binding){rememberReference(binding,ref);if(mediaEnabled){try{ref=await persistReference(binding,ref);}catch(e){setError(e instanceof Error?e.message:'Falha ao persistir.');}}}
    onChange(ref);
  };
  const remove=async()=>{
    if(value?.mediaId && !window.confirm('Excluir permanentemente a referência salva?'))return;
    setLoading(true);setError('');try{if(value?.mediaId)await removeReference(value.mediaId);if(binding)rememberReference(binding,null);onChange(null);}catch(e){setError(e instanceof Error?e.message:'Falha ao excluir.');}finally{setLoading(false);}
  };
  return <div className="space-y-2 rounded-xl border border-zinc-800 bg-[#101010] p-3">
    <label className="block text-xs font-semibold text-zinc-200">{label}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || loading} className="mt-2 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200" onChange={async event=>{
      const file=event.target.files?.[0]; event.target.value=''; if(!file)return;
      setLoading(true); setError('');
      try {await accept(await readReferenceImage(file));} catch(e){setError(e instanceof Error?e.message:'Falha no upload.');}finally{setLoading(false);}
    }}/></label>
    {loading && <p role="status" className="text-xs text-lime-200">Preparando referência…</p>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    {value && <div className="flex items-center gap-3"><img src={value.dataUrl} alt="Referência enviada" className="h-20 w-20 rounded-lg object-cover"/><div className="space-y-2 text-xs"><p className="break-all text-zinc-300">{value.name}</p><a href={value.dataUrl} download="referencia-personagem.jpg" className="mr-3 text-lime-200">Baixar referência</a><button type="button" disabled={disabled || loading} onClick={()=>void remove()} className="text-red-300">Remover</button></div></div>}
    <p className="text-[10px] leading-relaxed text-zinc-500">{value?.mediaId && binding ? 'Arquivo privado. Free: expira em 24h; plano pago: enquanto a assinatura estiver ativa. A remoção física ocorre na limpeza automática, podendo ser posterior ao vencimento.' : retention}</p>
  </div>;
}
