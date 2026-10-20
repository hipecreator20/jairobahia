import { authenticatedFetch } from './geminiService';
export interface WalletInfo {
  plan:string;paid:boolean;paidUntil:number|null;period:string;allocated:number;spent:number;balance:number;storageUsed:number;storageLimit:number;mediaEnabled:boolean;
  costs:{text:number;image:number;audio:number};ledger:{id:string;kind:string;cost:number;status:string;createdAt:string}[];
}
async function result(response:Response) {const data=await response.json();if(!response.ok)throw Error(data.message || 'Falha ao consultar moedas.');return data;}
export const getWallet=async():Promise<WalletInfo>=>result(await authenticatedFetch('/api/billing'));
export const getAdminBilling=async()=>result(await authenticatedFetch('/api/admin/billing'));
export const setSubscription=async(uid:string,plan:string,status:'paid'|'unpaid',endsAt:string,amountPaid?:number)=>result(await authenticatedFetch(`/api/admin/users/${encodeURIComponent(uid)}/subscription`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,status,endsAt,amountPaid})}));
