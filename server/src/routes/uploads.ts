import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { uploadImageBuffer } from '../services/cloudinary.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
      callback(null, true);
      return;
    }

    callback(new Error('FORMATO_INVALIDO'));
  },
});

export const uploadsRouter = Router();

uploadsRouter.post('/uploads', authenticate, upload.single('file'), async (req, res) => {
  if (!req.uid) {
    res.status(401).json({ error: 'Sessão ausente. Entre novamente.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Selecione uma imagem.' });
    return;
  }

  try {
    const url = await uploadImageBuffer(req.file.buffer, req.file.originalname || 'foto.jpg', req.file.mimetype);
    res.json({ url });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'CLOUDINARY_NOT_CONFIGURED') {
      res.status(503).json({ error: 'O armazenamento de fotos ainda não foi configurado.' });
      return;
    }

    res.status(502).json({ error: 'Não foi possível enviar a imagem.' });
  }
});
