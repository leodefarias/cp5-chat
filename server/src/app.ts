import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '32kb' }));
  app.use(healthRouter);
  app.use(notificationsRouter);
  app.use(uploadsRouter);
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof Error && error.message === 'FORMATO_INVALIDO') {
      res.status(400).json({ error: 'Envie uma imagem JPG, PNG ou WEBP.' });
      return;
    }

    res.status(400).json({ error: 'Não foi possível processar o arquivo.' });
  });
  return app;
}
