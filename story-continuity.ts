export const CREATIVE_INTENT = 'Creative intent: original fictional characters. Reference media does not establish identity, consent or rights.';
export function withCreativeIntent(prompt: string): string {
  return prompt.startsWith(CREATIVE_INTENT) ? prompt : `${CREATIVE_INTENT}\n${prompt}`;
}

export interface StoryBeat { sceneNumber: number; title: string; visualStyle: string; actionAndDialogue: string; prompt: string; startState: string; endState: string }
export const storySchema = {
  type: 'object', required: ['title', 'logline', 'synopsis', 'identity', 'scenes'], additionalProperties: false,
  properties: {
    title: {type:'string'}, logline:{type:'string'}, synopsis:{type:'string'}, identity:{type:'string'},
    scenes:{type:'array',items:{type:'object',required:['sceneNumber','title','visualStyle','actionAndDialogue','prompt','startState','endState'],additionalProperties:false,properties:{
      sceneNumber:{type:'integer'}, ...Object.fromEntries(['title','visualStyle','actionAndDialogue','prompt','startState','endState'].map(key=>[key,{type:'string'}]))
    }}},
  },
};
const section = (prompt: string, name: string) => prompt.match(new RegExp(`<${name}>\\n([\\s\\S]*?)\\n</${name}>`))?.[1] || '';
export const lockedIdentity = (prompt: string) => section(prompt, 'IDENTITY');
export const editableSceneAction = (prompt: string) => lockedIdentity(prompt) ? section(prompt,'ACTION') : prompt;
export function updateSceneAction(prompt: string, action: string): string {
  if (!lockedIdentity(prompt)) return action;
  if (!action.trim() || action.length > 300) throw Error('Use até 300 caracteres para a ação da cena; o DNA é mantido separadamente.');
  return prompt.replace(/<ACTION>\n[\s\S]*?\n<\/ACTION>/,()=>`<ACTION>\n${action.trim()}\n</ACTION>`);
}
export function composeScenePrompt(identity: string, action: string, start: string, end: string, index: number, count: number, duration: number, platform: string): string {
  const result = `${CREATIVE_INTENT}
<IDENTITY>
${identity}
</IDENTITY>
CLIP ${index}/${count} · ${duration}s · ${platform}
<START>
${start}
</START>
<ACTION>
${action}
</ACTION>
<END>
${end}
</END>
Keep face, hair, age, body, wardrobe and props unchanged. Attach the same character reference to every clip; match the previous clip's final frame. Do not restart the story.`;
  if (result.length > 2000) throw new Error('O DNA e a cena excederam o limite de texto. Reduza os detalhes antes de salvar.');
  return result;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /<\/?(?:IDENTITY|ACTION|START|END)>/.test(value)) throw new Error(`Resposta inválida: ${label}.`);
  return value.trim();
}
export function validateStoryResult(value: unknown, count: number, duration: number, platform: string, exactIdentity = '') {
  const v = value as Record<string, any>;
  if (!v || !Array.isArray(v.scenes) || v.scenes.length !== count) throw new Error('O roteiro deve conter exatamente o número de cenas solicitado.');
  const identity = text(exactIdentity || v.identity, 'DNA fixo', 900);
  const scenes = v.scenes.map((s: any, i: number) => {
    if (!s || s.sceneNumber !== i + 1) throw new Error('A sequência de cenas retornou fora de ordem.');
    return { sceneNumber: i + 1, title:text(s.title,'título',128), visualStyle:text(s.visualStyle,'estilo',100),
      actionAndDialogue:text(s.actionAndDialogue,'ação',1000), action:text(s.prompt,'prompt da cena',300),
      startState:text(s.startState,'estado inicial',80), endState:text(s.endState,'estado final',80) };
  });
  return { title:text(v.title,'título da história',128),logline:text(v.logline,'logline',400),synopsis:text(v.synopsis,'sinopse',1500),identity,
    scenes: scenes.map((s: any,i: number)=>({...s,prompt:composeScenePrompt(identity,s.action,i ? scenes[i-1].endState : s.startState,s.endState,i+1,count,duration,platform)})) };
}

export function relinkScenePrompts<T extends {prompt?:string; visualStyle?:string}>(scenes: T[]): T[] {
  return scenes.map((scene,i)=> {
    const prompt = scene.prompt || '', identity = lockedIdentity(prompt);
    if (!identity) return scene;
    const duration = Number(scene.visualStyle?.match(/\[(\d+)s\]/)?.[1] || prompt.match(/· (\d+)s/)?.[1] || 8);
    const platform = prompt.match(/CLIP \d+\/\d+ · \d+s · (.+)/)?.[1] || 'Flow';
    const start = i ? section(scenes[i-1].prompt || '', 'END') || `Continue after scene ${i}: preserve its final position and action.` : section(prompt,'START');
    return {...scene,prompt:composeScenePrompt(identity,section(prompt,'ACTION'),start,section(prompt,'END'),i+1,scenes.length,duration,platform)};
  });
}
