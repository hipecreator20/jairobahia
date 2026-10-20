import { randomUUID } from 'node:crypto';
import type { Express, RequestHandler } from 'express';

export function diagnose(error: unknown, status = 500) {
  const value = error as {status?: number; message?: string};
  const text = String(value?.message || error || '');
  const code = Number(value?.status) || status;
  if (code === 504 || /deadline|timeout|aborted/i.test(text)) return {code:'GEMINI_TIMEOUT', message:'O Gemini excedeu o tempo de resposta. Tente novamente mais tarde.', action:'Verifique a latência e a disponibilidade do modelo Gemini.'};
  if (/high demand|UNAVAILABLE|overload/i.test(text)) return {code:'GEMINI_UNAVAILABLE', message:'O Gemini está temporariamente sobrecarregado.', action:'Aguarde a normalização do provedor antes de tentar novamente.'};
  if (/quota|RESOURCE_EXHAUSTED/i.test(text)) return {code:'GEMINI_QUOTA', message:'A cota do provedor de IA foi atingida.', action:'Confira os limites e o faturamento da API Gemini.'};
  if (/GEMINI_API_KEY|não inicializado|IA indisponível/i.test(text)) return {code:'AI_CONFIGURATION', message:'A configuração de IA precisa ser revisada pelo administrador.', action:'Confira GEMINI_API_KEY no ambiente do servidor.'};
  if (code === 401 || code === 403) return {code:'ACCESS_DENIED', message:'A sessão ou permissão precisa ser verificada.', action:'Confira autenticação, aprovação e App Check.'};
  if (code === 429) return {code:'LIMIT_REACHED', message:'O limite de solicitações ou créditos foi atingido.', action:'Confira o saldo e os limites de uso.'};
  if (code === 400 || code === 409) return {code:'REQUEST_REJECTED', message:'A solicitação não pôde ser processada.', action:'Confira os campos, duplicidade e histórico de prompts.'};
  return {code:'GENERATION_FAILED', message:'Não foi possível concluir a geração.', action:'Confira a etapa, o código de referência e os logs do servidor.'};
}

export function generationDiagnostics(write: (event: Record<string, unknown>) => Promise<unknown>): RequestHandler {
  return (req,res,next) => {
    const requestId = randomUUID(), start = Date.now();
    res.set('X-Request-Id',requestId);
    res.locals.diagnosticStage = 'access';
    const send = res.json.bind(res);
    res.json = ((body: any) => {
      if (res.statusCode < 400) return send(body);
      const detail = diagnose(res.locals.diagnosticError || body?.message,res.statusCode);
      const event = {requestId, createdAt:new Date().toISOString(), route:req.path.split('?')[0], status:res.statusCode,
        stage:res.locals.diagnosticStage, durationMs:Date.now()-start, ...detail,
        commit:process.env.VERCEL_GIT_COMMIT_SHA || null};
      // Deliberately allowlist metadata: never persist body, prompts, tokens or raw provider errors.
      console.error('[STUDIO DIAGNOSTIC]',JSON.stringify(event));
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<void>(resolve => { timer=setTimeout(resolve,1500); });
      void Promise.race([Promise.resolve().then(()=>write(event)),timeout]).catch(()=>{
        console.error('[STUDIO DIAGNOSTIC] Persistent log unavailable; see request ID in runtime logs.');
      }).finally(()=>{clearTimeout(timer);send({...body,requestId,...(res.statusCode>=500 ? {message:detail.message} : {})});});
      return res;
    }) as typeof res.json;
    next();
  };
}

export function installDiagnosticRead(app:Express, masterUid:string, read:()=>Promise<unknown>) {
  app.get('/api/admin/diagnostics',async(_req,res)=>{
    res.set('Cache-Control','no-store');
    if(res.locals.authUid!==masterUid) return res.status(403).json({success:false,message:'Ação exclusiva do Master.'});
    try { return res.json({success:true,events:await read()}); }
    catch { return res.status(503).json({success:false,message:'Não foi possível consultar os registros. Confira o Firebase Admin.'}); }
  });
}
