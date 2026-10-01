import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../services/firebaseAdmin.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match?.[1]) {
    res.status(401).json({ error: 'Sessão ausente. Entre novamente.' });
    return;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
}
