import crypto from 'node:crypto';

export function getClientIp(request: Request, clientAddress?: string): string {
  // 1. Astro / Vercel clientAddress
  if (clientAddress && clientAddress !== '::1' && clientAddress !== '127.0.0.1') {
    return clientAddress;
  }

  // 2. Common proxy headers (Vercel, Cloudflare, etc.)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return clientAddress || '127.0.0.1';
}

export function hashIp(ip: string): string {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL || 'kurzagin-like-salt';
  return crypto.createHash('sha256').update(`${ip}-${secret}`).digest('hex');
}
