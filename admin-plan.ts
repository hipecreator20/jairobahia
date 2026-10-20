import type { RequestHandler } from 'express';

type Dependencies = {
  masterUid: string;
  verifyToken: (token: string) => Promise<{ uid: string }>;
  updatePlan: (uid: string, plan: string, actorUid: string) => Promise<void>;
};

export function createPlanHandler(deps: Dependencies): RequestHandler {
  return async (req, res) => {
    let actor;
    try {
      actor = await deps.verifyToken(req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || '');
    } catch {
      res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
      return;
    }
    if (actor.uid !== deps.masterUid) {
      res.status(403).json({ success: false, message: 'Ação exclusiva do Master.' });
      return;
    }
    const uid = String(req.params.uid);
    const { plan } = req.body || {};
    if (!uid || uid.length > 128 || uid.includes('/') || uid === deps.masterUid || !['free', 'pro', 'premium'].includes(plan)) {
      res.status(400).json({ success: false, message: 'Usuário ou plano inválido.' });
      return;
    }
    try {
      await deps.updatePlan(uid, plan, actor.uid);
      res.json({ success: true, plan });
    } catch {
      res.status(503).json({ success: false, message: 'Não foi possível atualizar o plano.' });
    }
  };
}
