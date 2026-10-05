import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie, getNeonAuthConfig, buildLogoutCookieHeaders } from '@/lib/auth';

async function performLogout(request: Request, cookieStore: any): Promise<string[]> {
  clearSessionCookie(cookieStore);

  const setCookies: string[] = [];

  const { isConfigured, baseUrl } = getNeonAuthConfig();
  if (isConfigured && baseUrl) {
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const origin = request.headers.get('origin') || new URL(request.url).origin;
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieHeader,
          origin,
        },
      });

      if (typeof (res.headers as any).getSetCookie === 'function') {
        setCookies.push(...(res.headers as any).getSetCookie());
      } else {
        const rawCookie = res.headers.get('set-cookie');
        if (rawCookie) setCookies.push(rawCookie);
      }
    } catch (err) {
      console.warn('[auth] Error contacting Neon Auth upstream sign-out:', err);
    }
  }

  // Always emit explicit browser cookie deletion headers to wipe out active session
  const manualDeletions = buildLogoutCookieHeaders(request);
  setCookies.push(...manualDeletions);

  return setCookies;
}

export async function POST(request: NextRequest) {
  const setCookies = await performLogout(request, await cookies());
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const cookie of setCookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}

export async function GET(request: NextRequest) {
  const setCookies = await performLogout(request, await cookies());

  const referer = request.headers.get('referer');
  let destination = '/';
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const reqUrl = new URL(request.url);
      if (refUrl.origin === reqUrl.origin) {
        destination = refUrl.pathname + refUrl.search;
      }
    } catch {}
  }

  const headers = new Headers();
  headers.set('Location', destination);
  for (const cookie of setCookies) {
    headers.append('Set-Cookie', cookie);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}
