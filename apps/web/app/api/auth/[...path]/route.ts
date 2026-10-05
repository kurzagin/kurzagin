import type { NextRequest } from 'next/server';
import { handleAuthProxyRequest } from '@neondatabase/auth/server';

/**
 * Neon Auth Catch-all Proxy Route
 * Proxies requests at /api/auth/* to the upstream Neon Auth managed service.
 */
async function handler(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !cookieSecret) {
    return new Response(
      JSON.stringify({
        error: 'Neon Auth is not configured. Missing NEON_AUTH_BASE_URL or NEON_AUTH_COOKIE_SECRET in environment.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const params = await ctx.params;
  const path = (params.path || []).join('/');

  try {
    return await handleAuthProxyRequest({
      request,
      path,
      baseUrl,
      cookieSecret,
      sameSite: 'lax',
    });
  } catch (err: any) {
    console.error(`Neon Auth proxy error for /api/auth/${path}:`, err);
    return new Response(
      JSON.stringify({
        error: 'Failed to communicate with Neon Auth service',
        details: err?.message || String(err),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
