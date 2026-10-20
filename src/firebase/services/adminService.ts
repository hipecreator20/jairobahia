import { appCheck, auth } from '../config';
import { getToken } from 'firebase/app-check';

export async function setUserAccess(uid: string, status: 'pending' | 'approved' | 'rejected' | 'suspended'): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão Master necessária.');
  const token = await user.getIdToken();
  const appCheckToken = appCheck ? (await getToken(appCheck)).token : '';
  const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}) },
    body: JSON.stringify({ status }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Falha ao atualizar o acesso.');
}
