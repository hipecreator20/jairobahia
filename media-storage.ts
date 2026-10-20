import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Express } from 'express';
import { walletView } from './wallet.js';
import { parseReferenceImage } from './media-reference.js';
const day=86400000;
const idValid=(id:unknown)=>typeof id==='string' && /^[\w-]{1,128}$/.test(id);
export function referenceRetention(record:any,account:any,now=Date.now()): {action:'keep'|'delete'|'extend'|'unavailable';expiresAt?:number} {
  if(record.status!=='ready'||!Number.isFinite(record.expiresAt))return {action:'unavailable'};
  const wallet=walletView(account,{},now);
  if(record.retention==='subscription' && !wallet.paid)return {action:'delete'};
  const continuous=Number(account?.subscription?.startedAt)<=record.expiresAt;
  if(wallet.paid && continuous && wallet.paidUntil && record.expiresAt<wallet.paidUntil)return {action:'extend',expiresAt:wallet.paidUntil};
  return {action:record.expiresAt<=now?'delete':'keep'};
}
export function installMediaRoutes(app:Express,getStore:()=>any,getBucket:()=>any) {
  const remove=async(record:any)=>{
    const data=record.data();if(!data)return;
    await getBucket().file(data.path).delete({ignoreNotFound:true});
    await getStore().runTransaction(async(tx:any)=>{
      const fresh=await tx.get(record.ref);if(!fresh.exists)return;
      const accountRef=getStore().collection('studioAccounts').doc(data.ownerId),account=await tx.get(accountRef);
      tx.set(accountRef,{storageBytes:Math.max(0,(account.data()?.storageBytes||0)-data.bytes)},{merge:true});tx.delete(record.ref);
    });
  };
  const available=async(record:any,uid:string)=>{
    if(!record.exists || record.data()?.ownerId!==uid) return false;
    const data=record.data();
    if(data.status!=='ready')return false;
    const account=await getStore().collection('studioAccounts').doc(uid).get();
    const policy=referenceRetention(data,account.data());
    if(policy.action==='extend'){await record.ref.update({expiresAt:policy.expiresAt,retention:'subscription'});return true;}
    if(policy.action==='delete'){await remove(record);return false;}
    return policy.action==='keep';
  };
  // Mounted before ordinary Firebase authentication; only Vercel's configured secret may invoke it.
  app.get('/api/maintenance/expired-media',async(req,res)=>{
    const expected=process.env.CRON_SECRET || '',actual=req.headers.authorization || '';
    const expectedHeader=`Bearer ${expected}`;
    if(!expected || Buffer.byteLength(actual)!==Buffer.byteLength(expectedHeader) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expectedHeader)))return res.status(401).json({success:false});
    if(process.env.MEDIA_UPLOADS_ENABLED!=='true')return res.json({success:true,enabled:false,deleted:0});
    try{
      const docs=await getStore().collection('studioUploads').where('expiresAt','<=',Date.now()).limit(200).get();
      let deleted=0;
      for(let i=0;i<docs.docs.length;i+=10) await Promise.all(docs.docs.slice(i,i+10).map(async(record:any)=>{
        if(['uploading','superseded'].includes(record.data().status)){await remove(record);deleted++;return;}
        if(!await available(record,record.data().ownerId))deleted++;
      }));
      return res.json({success:true,enabled:true,deleted,scanned:docs.size});
    }catch{return res.status(503).json({success:false,message:'Limpeza não concluída; tente novamente.'});}
  });

  return function installAuthenticatedMediaRoutes() {
    app.post('/api/media',async(req,res)=>{
      if(process.env.MEDIA_UPLOADS_ENABLED!=='true')return res.status(503).json({success:false,message:'Armazenamento persistente ainda não ativado. Sua referência pode ser usada temporariamente nesta aba.'});
      const {kind,entityId,dataUrl,name}=req.body;
      if(!['characters','stories'].includes(kind)||!idValid(entityId))return res.status(400).json({success:false,message:'Destino de referência inválido.'});
      let image;
      try{image=parseReferenceImage(dataUrl);if(!image)throw Error('Envie a imagem por upload.');}catch(e){return res.status(400).json({success:false,message:(e as Error).message});}
      const uid=res.locals.authUid,store=getStore(),mediaId=randomUUID(),recordRef=store.collection('studioUploads').doc(mediaId),accountRef=store.collection('studioAccounts').doc(uid);
      const bytes=Buffer.from(image.data,'base64'),objectPath=`studio/${uid}/${mediaId}`;
      let reserved=false;
      try{
        const parent=await store.collection(kind).doc(entityId).get();
        if(!parent.exists||parent.data()?.ownerId!==uid)return res.status(403).json({success:false,message:'Referência fora da sua conta.'});
        await store.runTransaction(async(tx:any)=>{
          const account=await tx.get(accountRef),wallet=walletView(account.data());
          if(wallet.storageUsed+bytes.length>wallet.storageLimit)throw Error('Limite de armazenamento atingido.');
          tx.set(accountRef,{storageBytes:wallet.storageUsed+bytes.length},{merge:true});
          tx.set(recordRef,{ownerId:uid,binding:`${kind}:${entityId}`,path:objectPath,bytes:bytes.length,mimeType:image.mimeType,name:String(name||'referencia.jpg').slice(0,128),status:'uploading',createdAt:Date.now(),expiresAt:Date.now()+60*60*1000});
        });reserved=true;
        await getBucket().file(objectPath).save(bytes,{resumable:false,metadata:{contentType:image.mimeType,cacheControl:'private, no-store'}});
        const account=await accountRef.get(),wallet=walletView(account.data());
        const expiresAt=wallet.paid && wallet.paidUntil ? wallet.paidUntil : Date.now()+day;
        const bindingRef=store.collection('studioReferenceBindings').doc(`${uid}_${kind}_${entityId}`);
        const superseded=await store.runTransaction(async(tx:any)=>{
          const binding=await tx.get(bindingRef),previousId=binding.data()?.mediaId;
          const previous=previousId ? await tx.get(store.collection('studioUploads').doc(previousId)) : null;
          tx.update(recordRef,{status:'ready',expiresAt,retention:wallet.paid?'subscription':'temporary'});
          tx.set(bindingRef,{ownerId:uid,mediaId});
          if(previous?.exists)tx.update(previous.ref,{status:'superseded',expiresAt:Date.now()});
          return previousId;
        });
        if(superseded){try{await remove(await store.collection('studioUploads').doc(superseded).get());}catch{console.error('[MEDIA] Referência anterior aguarda limpeza.');}}
        return res.json({success:true,id:mediaId,expiresAt});
      }catch(error){
        if(reserved){try{await remove(await recordRef.get());}catch{console.error('[MEDIA] Limpeza pendente de reserva.');}}
        return res.status(503).json({success:false,message:error instanceof Error && error.message==='Limite de armazenamento atingido.'?error.message:'Não foi possível persistir a referência. Confira a ativação do armazenamento no Admin.'});
      }
    });
    app.get('/api/media/reference/:kind/:entityId',async(req,res)=>{
      if(!['characters','stories'].includes(String(req.params.kind))||!idValid(req.params.entityId))return res.status(400).json({success:false});
      res.set('Cache-Control','no-store');
      if(process.env.MEDIA_UPLOADS_ENABLED!=='true')return res.json({success:true,reference:null});
      try{
        const binding=await getStore().collection('studioReferenceBindings').doc(`${res.locals.authUid}_${req.params.kind}_${req.params.entityId}`).get();
        if(binding.exists){
          const record=await getStore().collection('studioUploads').doc(binding.data().mediaId).get();
          if(!await available(record,res.locals.authUid))return res.json({success:true,reference:null});
          const data=record.data(),[buffer]=await getBucket().file(data.path).download();
          const fresh=await record.ref.get();
          return res.json({success:true,reference:{dataUrl:`data:${data.mimeType};base64,${buffer.toString('base64')}`,name:data.name,mediaId:record.id,expiresAt:fresh.data().expiresAt}});
        }
        return res.json({success:true,reference:null});
      }catch{return res.status(503).json({success:false,message:'Não foi possível recuperar a referência.'});}
    });
    app.delete('/api/media/:id',async(req,res)=>{
      if(!idValid(req.params.id))return res.status(400).json({success:false});
      try{
        const record=await getStore().collection('studioUploads').doc(req.params.id).get();
        if(!record.exists)return res.json({success:true});
        if(record.data()?.ownerId!==res.locals.authUid)return res.status(403).json({success:false});
        await remove(record);return res.json({success:true});
      }catch{return res.status(503).json({success:false,message:'Não foi possível excluir o arquivo.'});}
    });
  };
}
