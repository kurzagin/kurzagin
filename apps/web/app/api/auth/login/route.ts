import type { NextRequest } from 'next/server';
import { signInWithNeonAuth, getNeonAuthConfig } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = (body.identifier || body.username || body.email || '').trim();
    const password = (body.password || '').trim();

    if (!identifier) {
      return new Response(JSON.stringify({ error: 'Operator identifier or email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!password) {
      return new Response(JSON.stringify({ error: 'Security passphrase is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { isConfigured } = getNeonAuthConfig();
    if (!isConfigured) {
      return new Response(
        JSON.stringify({
          error:
            'Neon Auth is not configured. Please add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to your environment (.env.local).',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await signInWithNeonAuth(identifier, password, request);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (result.setCookies && result.setCookies.length > 0) {
      for (const cookie of result.setCookies) {
        headers.append('Set-Cookie', cookie);
      }
    }

    return new Response(JSON.stringify({ success: true, username: result.username }), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
