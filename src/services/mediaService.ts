import { authenticatedFetch } from './geminiService';
import type { ReferenceImage } from '../components/common/ReferenceImageInput';
import { auth } from '../firebase/config';
export interface MediaBinding {kind:'characters'|'stories';id:string}
const temporary = new Map<string,ReferenceImage>();
const key=(binding:MediaBinding)=>`${auth.currentUser?.uid}:${binding.kind}:${binding.id}`;
export function rememberReference(binding:MediaBinding,reference:ReferenceImage|null) {
  const id=key(binding);if(!reference){temporary.delete(id);return;}
  temporary.set(id,reference);const copy=reference;
  window.setTimeout(()=>{if(temporary.get(id)===copy)temporary.delete(id);},Math.min(86400000,Math.max(0,reference.expiresAt-Date.now())));
}
export async function loadReference(binding:MediaBinding):Promise<ReferenceImage|null> {
  const response=await authenticatedFetch(`/api/media/reference/${binding.kind}/${encodeURIComponent(binding.id)}`);
  const data=await response.json();if(!response.ok)throw Error(data.message || 'Referência indisponível.');
  const cached=temporary.get(key(binding));return data.reference || (cached && cached.expiresAt>Date.now()?cached:null);
}
export async function persistReference(binding:MediaBinding,reference:ReferenceImage):Promise<ReferenceImage> {
  const response=await authenticatedFetch('/api/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:binding.kind,entityId:binding.id,dataUrl:reference.dataUrl,name:reference.name})});
  const data=await response.json();if(!response.ok)throw Error(data.message || 'Falha ao salvar referência.');
  const saved={...reference,mediaId:data.id,expiresAt:data.expiresAt};rememberReference(binding,saved);window.dispatchEvent(new Event('wallet-changed'));return saved;
}
export async function removeReference(id:string) {
  const response=await authenticatedFetch(`/api/media/${encodeURIComponent(id)}`,{method:'DELETE'});
  const data=await response.json();if(!response.ok)throw Error(data.message || 'Falha ao remover referência.');window.dispatchEvent(new Event('wallet-changed'));
}
