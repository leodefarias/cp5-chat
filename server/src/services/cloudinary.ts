import { createHash } from 'node:crypto';

export function buildCloudinarySignature(timestamp: number, apiSecret: string): string {
  return createHash('sha1').update(`timestamp=${timestamp}${apiSecret}`).digest('hex');
}

export async function uploadImageBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
  if (!cloudName || !apiKey || !apiSecret || apiSecret === 'CONFIGURAR_APENAS_NA_HOSPEDAGEM') {
    throw new Error('CLOUDINARY_NOT_CONFIGURED');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', buildCloudinarySignature(timestamp, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || typeof payload !== 'object' || payload === null || !('secure_url' in payload) || typeof payload.secure_url !== 'string') {
    throw new Error('UPLOAD_FAILED');
  }

  return payload.secure_url;
}
