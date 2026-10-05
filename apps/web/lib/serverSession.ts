import { cookies, headers } from 'next/headers';
import { getSession, type SessionUser } from './auth';

/**
 * Server Component / Route Handler helper: resolves the current session from the incoming request.
 * Replacement for the Astro `getSession(Astro.cookies, Astro.request)` call pattern.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const h = await headers();
  const host = h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || 'http';
  // getSession only reads headers (cookie/origin) from the request, so a lightweight Request is enough.
  const request = new Request(`${proto}://${host}/`, { headers: new Headers(h) });
  return getSession(cookieStore, request);
}

export async function isServerAuthenticated(): Promise<boolean> {
  return (await getServerSession()) !== null;
}
