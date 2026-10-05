import crypto from 'node:crypto';
export interface CookieReader {
  get(name: string): { name?: string; value: string } | undefined;
  delete?: (...args: any[]) => any;
}
import {
  validateSessionData,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
  NEON_AUTH_SESSION_COOKIE_NAME,
} from '@neondatabase/auth/server';

const LEGACY_COOKIE_NAME = 'kurzagin_session';

export interface SessionUser {
  id?: string;
  email?: string;
  name?: string;
  username: string;
}

export function getNeonAuthConfig() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  return {
    isConfigured: Boolean(baseUrl && cookieSecret),
    baseUrl,
    cookieSecret,
  };
}

function getLegacySecret(): string | null {
  return (
    process.env.AUTH_SECRET ||
    process.env.ADMIN_SECRET ||
    null
  );
}

/**
 * Verify legacy HMAC session token (fallback for transition period)
 */
export function verifyLegacySessionToken(token: string): { username: string } | null {
  try {
    const secret = getLegacySecret();
    if (!secret) return null;

    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [username, timestampStr, signature] = decoded.split(':');
    if (!username || !timestampStr || !signature) return null;

    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - timestamp > maxAge) return null;

    const payload = `${username}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return isValid ? { username } : null;
  } catch {
    return null;
  }
}

/**
 * Extract active session using Neon Auth (Managed Better Auth)
 * with backward-compatible legacy fallback.
 */
export async function getSession(
  cookies: CookieReader,
  request?: Request
): Promise<SessionUser | null> {
  const { isConfigured, baseUrl, cookieSecret } = getNeonAuthConfig();

  if (isConfigured && cookieSecret) {
    // 1. Check local session_data cookie (fast path, <1ms)
    const sessionDataCookie =
      cookies.get(NEON_AUTH_SESSION_DATA_COOKIE_NAME) ||
      cookies.get('neon-auth.local.session_data');

    if (sessionDataCookie?.value) {
      try {
        const validation = await validateSessionData(sessionDataCookie.value, cookieSecret);
        if (validation.valid && validation.payload) {
          const user = (validation.payload as any).user;
          if (user) {
            const name = user.name || 'Kur Zagin';
            const username = 'kurzagin';
            return {
              id: user.id,
              email: user.email,
              name,
              username,
            };
          }
        }
      } catch (err) {
        console.warn('[auth] Error validating Neon Auth session data cookie:', err);
      }
    }

    // 2. Check session token cookie and verify against Neon Auth server
    const sessionTokenCookie =
      cookies.get(NEON_AUTH_SESSION_COOKIE_NAME) ||
      cookies.get('neon-auth.session_token') ||
      cookies.get('better-auth.session_token') ||
      cookies.get('__Secure-better-auth.session_token');

    if (sessionTokenCookie?.value && baseUrl) {
      try {
        const cookieHeader = request?.headers.get('cookie') ||
          `${sessionTokenCookie.name}=${sessionTokenCookie.value}`;

        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/get-session`, {
          headers: {
            cookie: cookieHeader,
            origin: request?.headers.get('origin') || '',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            const user = data.user;
            const name = user.name || 'Kur Zagin';
            const username = 'kurzagin';
            return {
              id: user.id,
              email: user.email,
              name,
              username,
            };
          }
        }
      } catch (err) {
        console.warn('[auth] Error querying Neon Auth upstream session:', err);
      }
    }
  }

  // 3. Fallback: check legacy session cookie if present
  const legacyCookie = cookies.get(LEGACY_COOKIE_NAME);
  if (legacyCookie?.value) {
    const legacySession = verifyLegacySessionToken(legacyCookie.value);
    if (legacySession) {
      return {
        name: 'Kur Zagin',
        username: legacySession.username || 'kurzagin',
      };
    }
  }

  return null;
}

export async function isAuthenticated(
  cookies: CookieReader,
  request?: Request
): Promise<boolean> {
  const session = await getSession(cookies, request);
  return session !== null;
}

export const KNOWN_AUTH_COOKIES = [
  LEGACY_COOKIE_NAME,
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
  'neon-auth.session_token',
  'neon-auth.local.session_data',
  'neon-auth.session_data',
  'neon-auth.session_challenge',
  '__Secure-neon-auth.session_challenge',
  '__Secure-neon-auth.session_data',
  '__Secure-neon-auth.dont_remember',
  'neon-auth.dont_remember',
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'better-auth.session_data',
  '__Secure-better-auth.session_data',
  'better-auth.csrf_token',
  '__Secure-better-auth.csrf_token',
];

/**
 * Clear all authentication cookies (Neon Auth + Better Auth + legacy)
 */
export function clearSessionCookie(cookies: CookieReader) {
  if (typeof cookies.delete !== 'function') return;
  for (const name of KNOWN_AUTH_COOKIES) {
    try {
      cookies.delete(name, { path: '/' });
    } catch {}
    try {
      cookies.delete(name, { path: '/', secure: true });
    } catch {}
  }
}

/**
 * Generate explicit Set-Cookie deletion strings for HTTP responses
 */
export function buildLogoutCookieHeaders(request?: Request): string[] {
  const setCookies: string[] = [];
  const cookieNames = new Set<string>(KNOWN_AUTH_COOKIES);

  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    for (const part of cookieHeader.split(';')) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf('=');
      const name = eqIdx > -1 ? trimmed.slice(0, eqIdx).trim() : trimmed;
      if (name && (name.includes('auth') || name.includes('session') || name.includes('kurzagin'))) {
        cookieNames.add(name);
      }
    }
  }

  const expired = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly';
  for (const name of cookieNames) {
    // Non-secure deletion
    setCookies.push(`${name}=; ${expired}; SameSite=Lax`);
    // Secure deletion (required by browsers if cookie was set with Secure or has __Secure- prefix)
    setCookies.push(`${name}=; ${expired}; SameSite=Lax; Secure`);
    // Partitioned (CHIPS) deletion: Neon Auth upstream issues cookies as
    // `Secure; SameSite=None; Partitioned`, and a partitioned cookie can only be
    // removed by a Set-Cookie that also carries the Partitioned attribute.
    setCookies.push(`${name}=; ${expired}; SameSite=None; Secure; Partitioned`);
  }

  return setCookies;
}

/**
 * Sign in using Neon Auth managed service
 */
export async function signInWithNeonAuth(
  identifier: string,
  password: string,
  request?: Request
): Promise<{ success: boolean; error?: string; username?: string; setCookies?: string[] }> {
  const { isConfigured, baseUrl, cookieSecret } = getNeonAuthConfig();

  if (!isConfigured || !baseUrl || !cookieSecret) {
    return {
      success: false,
      error: 'Neon Auth is not configured. Missing NEON_AUTH_BASE_URL or NEON_AUTH_COOKIE_SECRET in environment.',
    };
  }

  // Ensure email format for Neon Auth's sign-in/email endpoint
  const email = identifier.includes('@') ? identifier : `${identifier}@kurzagin.internal`;

  try {
    const origin = request?.headers.get('origin') || 'http://localhost:4321';
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin,
      },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeaders: string[] = [];
    // Extract set-cookie headers from fetch response
    if (typeof (res.headers as any).getSetCookie === 'function') {
      setCookieHeaders.push(...(res.headers as any).getSetCookie());
    } else {
      const rawCookie = res.headers.get('set-cookie');
      if (rawCookie) setCookieHeaders.push(rawCookie);
    }

    const data = await res.json().catch(() => null);

    if (res.ok) {
      const username = 'kurzagin';
      return {
        success: true,
        username,
        setCookies: setCookieHeaders,
      };
    } else {
      return {
        success: false,
        error: data?.message || data?.error || 'Invalid credentials with Neon Auth',
      };
    }
  } catch (err: any) {
    console.error('Neon Auth sign-in error:', err);
    return {
      success: false,
      error: `Neon Auth connection error: ${err?.message || 'Unable to reach auth server'}`,
    };
  }
}
