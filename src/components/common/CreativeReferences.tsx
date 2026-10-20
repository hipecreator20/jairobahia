import { useState } from 'react';

const references = [
  { title: 'Campanha solar', image: 'project_beach_day_1792450194606.jpg', alt: 'Referência de cenário litorâneo', description: 'Uma campanha de verão com movimento, luz natural e espaço para o produto.', prompt: 'Crie uma campanha de verão para uma marca de moda praia brasileira. Use uma praia ao amanhecer, luz lateral suave, paleta areia e azul, modelo adulta em movimento espontâneo e enquadramento vertical 4:5. Reserve espaço negativo no alto para o título. Destaque textura do tecido e identidade da marca, sem texto ou logotipos gerados.' },
  { title: 'Narrativa urbana', image: 'project_city_night_1792450194169.jpg', alt: 'Referência de cidade iluminada à noite', description: 'Um roteiro visual com atmosfera noturna e uma história em três cenas.', prompt: 'Desenvolva três cenas para um vídeo vertical de 15 segundos sobre um músico independente chegando ao primeiro show. Comece com um detalhe das mãos segurando o instrumento, acompanhe a caminhada pela cidade à noite e termine na entrada do palco. Preserve roupa e aparência entre as cenas; defina duração, movimento de câmera, luz e transição para cada tomada.' },
  { title: 'Editorial de identidade', image: 'hero_virtual_model_1792450194472.jpg', alt: 'Referência de retrato editorial', description: 'Retratos consistentes para apresentar uma personagem ou marca pessoal.', prompt: 'Crie a direção de um retrato editorial para uma criadora digital adulta com identidade brasileira contemporânea. Fundo arquitetônico simples, iluminação de janela, expressão confiante e figurino em tons terrosos. Proponha um plano médio e dois detalhes complementares, preservando rosto, cabelo, acessórios e paleta. Defina lente, composição e uso final em uma capa de perfil.' },
] as const;

export function CreativeReferences() {
  const [feedback, setFeedback] = useState('');
  const copyBrief = async (title: string, prompt: string) => {
    try { await navigator.clipboard.writeText(prompt); setFeedback(`Briefing de ${title} copiado. Cole na ferramenta de criação desejada.`); }
    catch { setFeedback('Não foi possível copiar. Selecione o briefing aberto abaixo para copiá-lo manualmente.'); }
  };
  return <section className="space-y-4" aria-label="Referências criativas">
    <div><h2 className="text-lg font-bold text-white">Ideias para sua próxima criação</h2><p className="mt-1 text-xs text-zinc-400">Referências visuais e briefings de partida. Adapte ao seu público e à sua marca.</p></div>
    {feedback && <p role="status" className="rounded-xl border border-zinc-700 p-3 text-xs text-lime-200">{feedback}</p>}
    <div className="grid gap-4 md:grid-cols-3">{references.map(item => <article key={item.title} className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]">
      <img src={`/assets/images/${item.image}`} alt={item.alt} width={640} height={360} loading="lazy" className="h-40 w-full object-cover" />
      <div className="space-y-3 p-4"><h3 className="font-semibold text-white">{item.title}</h3><p className="text-xs leading-relaxed text-zinc-400">{item.description}</p><details className="text-xs text-zinc-300"><summary className="cursor-pointer text-lime-200">Ver briefing</summary><p className="mt-2 select-text leading-relaxed">{item.prompt}</p></details><button type="button" onClick={() => void copyBrief(item.title, item.prompt)} className="rounded-lg bg-[#DFFF00] px-3 py-2 text-xs font-bold text-black">Copiar briefing</button></div>
    </article>)}</div>
  </section>;
}
