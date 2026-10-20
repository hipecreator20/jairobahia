type LegacyPart={text?:string;inlineData?:{data:string;mimeType?:string}};
type LegacyContents=string|{parts:LegacyPart[]}|Array<{parts:LegacyPart[];role?:string}>;
type InteractionOptions={model:string;contents:LegacyContents;config?:{systemInstruction?:string;responseMimeType?:string;responseJsonSchema?:Record<string,unknown>;imageConfig?:{aspectRatio?:string}}};

type InteractionContent={type:string;text:string}|{type:string;data:string;mime_type:string};
export function toInteractionInput(contents:LegacyContents):string|InteractionContent[] {
  if(typeof contents==='string')return contents;
  const items=Array.isArray(contents)?contents:[contents];
  return items.flatMap(item=>item.parts.map(part=>{
    if(typeof part.text==='string')return {type:'text',text:part.text};
    if(part.inlineData){const mime=part.inlineData.mimeType||'image/jpeg';return {type:mime.startsWith('audio/')?'audio':'image',data:part.inlineData.data,mime_type:mime};}
    throw Error('Formato multimodal Gemini não suportado.');
  }));
}

export function toInteractionParams(params:InteractionOptions) {
  const formats:Array<Record<string,unknown>>=[];
  if(params.config?.responseJsonSchema || params.config?.responseMimeType==='application/json') formats.push({type:'text',mime_type:params.config?.responseMimeType||'application/json',...(params.config?.responseJsonSchema?{schema:params.config.responseJsonSchema}:{})});
  if(params.config?.imageConfig || /image/.test(params.model))formats.push({type:'image',...(params.config?.imageConfig?.aspectRatio?{aspect_ratio:params.config.imageConfig.aspectRatio}:{})});
  return {api_version:'v1',model:params.model,input:toInteractionInput(params.contents),store:false,...(params.config?.systemInstruction?{system_instruction:params.config.systemInstruction}:{}),...(formats.length?{response_format:formats}:{})};
}

export async function createGeminiInteraction(ai:any,params:InteractionOptions) {
  return ai.interactions.create(toInteractionParams(params) as any);
}

export function interactionText(response:any):string {
  if(typeof response?.output_text==='string')return response.output_text;
  return (response?.steps||[]).filter((step:any)=>step.type==='model_output').flatMap((step:any)=>step.content||[]).filter((part:any)=>part.type==='text').map((part:any)=>part.text||'').join('');
}

export function interactionImage(response:any):{data:string;mimeType:string}|null {
  if(response?.output_image?.data)return {data:response.output_image.data,mimeType:response.output_image.mime_type||'image/png'};
  const image=(response?.steps||[]).filter((step:any)=>step.type==='model_output').flatMap((step:any)=>step.content||[]).find((part:any)=>part.type==='image'&&part.data);
  return image?{data:image.data,mimeType:image.mime_type||'image/png'}:null;
}
