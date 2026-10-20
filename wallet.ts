import { randomUUID } from 'node:crypto';
import type { Express } from 'express';

export const BILLING_DEFAULTS = {
  free:{coinsPerMonth:10_000,storageBytes:50*1024*1024},
  pro:{coinsPerMonth:1_000_000,storageBytes:20*1024**3},
  premium:{coinsPerMonth:3_000_000,storageBytes:20*1024**3},
};
export const COST_DEFAULTS = {text:1000,image:10000,audio:10000};
const monthMs = 30*24*60*60*1000;
const safeNumber = (value:unknown,fallback:number,max=100_000_000) => Number.isSafeInteger(value) && Number(value)>0 && Number(value)<=max ? Number(value) : fallback;
export function billingCosts(config:any = {}) {
  return Object.fromEntries(Object.entries(COST_DEFAULTS).map(([key,defaultCost])=>[key,safeNumber(config.costs?.[key],defaultCost,1_000_000)])) as typeof COST_DEFAULTS;
}
export function walletView(account:any = {}, config:any = {}, now=Date.now()) {
  const subscription=account.subscription || {};
  const paid=subscription.status === 'paid' && ['pro','premium'].includes(subscription.plan) && Number(subscription.endsAt)>now && Number(subscription.startedAt)<=now;
  const plan: keyof typeof BILLING_DEFAULTS = paid ? subscription.plan : 'free';
  const period=paid ? `${plan}:${subscription.startedAt}:${Math.floor((now-subscription.startedAt)/monthMs)}` : `free:${new Date(now).toISOString().slice(0,7)}`;
  const allocated=safeNumber(config.plans?.[plan]?.coinsPerMonth,BILLING_DEFAULTS[plan].coinsPerMonth);
  const spent=account.wallet?.period === period && Number.isSafeInteger(account.wallet.spent) && account.wallet.spent>=0 ? account.wallet.spent : 0;
  return {plan,paid,paidUntil:paid ? subscription.endsAt : null,period,allocated,spent,balance:Math.max(0,allocated-spent),storageUsed:Math.max(0,Number(account.storageBytes)||0),storageLimit:BILLING_DEFAULTS[plan].storageBytes,costs:billingCosts(config)};
}
export function generationCost(path:string, body:any, costs=COST_DEFAULTS) {
  if (/generate-story-script$/.test(path)) {
    const count=body.sceneCount ?? 6;
    if (!Number.isInteger(count)||count<3||count>12) throw Error('INVALID_SCENE_COUNT');
    return {kind:'story',cost:count*costs.text};
  }
  if (/generate-image$|edit-image$/.test(path)) return {kind:'image',cost:costs.image};
  if (/analyze-audio$/.test(path)) return {kind:'audio',cost:costs.audio};
  return {kind:'text',cost:costs.text};
}
export async function debitGeneration(store:any,uid:string,path:string,body:any,requestId:string= randomUUID()) {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) throw Error('INVALID_REQUEST_ID');
  const accountRef=store.collection('studioAccounts').doc(uid);
  const ledgerRef=accountRef.collection('ledger').doc(requestId);
  return store.runTransaction(async(tx:any)=>{
    const [accountSnap,configSnap,existing]=await Promise.all([tx.get(accountRef),tx.get(store.doc('settings/plans')),tx.get(ledgerRef)]);
    if(existing.exists) throw Error('DUPLICATE_GENERATION');
    const view=walletView(accountSnap.data(),configSnap.data());
    const {kind,cost}=generationCost(path,body,view.costs);
    if(view.balance < cost) throw Error('COIN_LIMIT');
    tx.set(accountRef,{wallet:{period:view.period,allocated:view.allocated,spent:view.spent+cost},updatedAt:new Date().toISOString()},{merge:true});
    tx.set(ledgerRef,{kind,cost,period:view.period,createdAt:new Date().toISOString(),status:'started'});
    return {cost,balance:view.balance-cost,requestId,ledgerRef};
  });
}

export function installBillingRoutes(app:Express, getStore:()=>any, masterUid:string) {
  app.get('/api/billing',async(_req,res)=>{
    try {
      const store=getStore(),ref=store.collection('studioAccounts').doc(res.locals.authUid);
      const [account,config,ledger]=await Promise.all([ref.get(),store.doc('settings/plans').get(),ref.collection('ledger').orderBy('createdAt','desc').limit(20).get()]);
      res.set('Cache-Control','no-store').json({success:true,...walletView(account.data(),config.data()),mediaEnabled:process.env.MEDIA_UPLOADS_ENABLED === 'true',ledger:ledger.docs.map((d:any)=>({id:d.id,...d.data()}))});
    } catch {res.status(503).json({success:false,message:'Não foi possível carregar o saldo agora.'});}
  });
  app.get('/api/admin/billing',async(_req,res)=>{
    if(res.locals.authUid !== masterUid) return res.status(403).json({success:false,message:'Ação exclusiva do Master.'});
    try {
      const store=getStore(),[accounts,config]=await Promise.all([store.collection('studioAccounts').limit(500).get(),store.doc('settings/plans').get()]);
      return res.json({success:true,accounts:accounts.docs.map((d:any)=>({uid:d.id,...walletView(d.data(),config.data()),subscription:d.data().subscription || null})),mediaEnabled:process.env.MEDIA_UPLOADS_ENABLED === 'true'});
    } catch {return res.status(503).json({success:false,message:'Falha ao consultar assinaturas.'});}
  });
  app.patch('/api/admin/users/:uid/subscription',async(req,res)=>{
    if(res.locals.authUid !== masterUid) return res.status(403).json({success:false,message:'Ação exclusiva do Master.'});
    const uid=String(req.params.uid),{plan,status,endsAt}=req.body;
    const expiry=Date.parse(endsAt),now=Date.now();
    if(!/^[\w-]{1,128}$/.test(uid)||uid===masterUid||!['free','pro','premium'].includes(plan)||!['paid','unpaid'].includes(status)||(status==='paid'&&(plan==='free'||!Number.isFinite(expiry)||expiry<=now||expiry>now+366*24*60*60*1000))) return res.status(400).json({success:false,message:'Confira o plano e uma validade futura de até um ano.'});
    try {
      const store=getStore(),userRef=store.collection('users').doc(uid),accountRef=store.collection('studioAccounts').doc(uid),audit=store.collection('accessLogs').doc();
      await store.runTransaction(async(tx:any)=>{
        const [user,account]=await Promise.all([tx.get(userRef),tx.get(accountRef)]);
        if(!user.exists) throw Error('Usuário não encontrado.');
        const previous=account.data()?.subscription;
        const unchanged=previous?.plan===plan && previous?.status===status && previous?.endsAt===(status==='paid'?expiry:0);
        tx.update(userRef,{plan,updatedAt:new Date().toISOString()});
        tx.set(accountRef,{subscription:{plan,status,startedAt:unchanged?previous.startedAt:now,endsAt:status==='paid'?expiry:0},updatedAt:new Date().toISOString()},{merge:true});
        tx.set(audit,{uid,event:'subscription_changed',createdAt:new Date().toISOString(),details:{actorUid:masterUid,plan,status,endsAt:status==='paid'?expiry:0}});
      });
      return res.json({success:true,message:status==='paid'?'Pagamento confirmado e saldo do período liberado.':'Pagamento marcado como pendente; benefícios pagos suspensos.'});
    } catch(error){return res.status(503).json({success:false,message:error instanceof Error?error.message:'Falha ao registrar pagamento.'});}
  });
}
