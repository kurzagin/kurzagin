import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { getDb, profiles, getProfile, type DbProfile, type ProjectEntry, type SocialLinkEntry, type ContactDetailEntry } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { detachMediaByUrl } from '@/lib/mediaRegistry';

export async function GET() {
  await connection();
  try {
    const profile = await getProfile();
    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error fetching profile:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: NextRequest) {
  const cookies = await nextCookies();
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  if (!(await isAuthenticated(cookies, request))) {
    return json({ error: 'Unauthorized: Operator authentication required' }, 401);
  }
  const db = getDb();
  if (!db) return json({ error: 'Database connection not available' }, 503);

  try {
    const body = await request.json();
    const banner_url = body.banner_url ? String(body.banner_url).trim() : null;
    if (banner_url && !/^(https?:\/\/|\/)/i.test(banner_url)) {
      return json({ error: 'Image URL must start with http(s):// or /' }, 400);
    }
    const current = await getProfile();
    // If the banner changed or was cleared, track previous banner as detached
    if (current?.banner_url && current.banner_url !== banner_url) {
      await detachMediaByUrl(current.banner_url);
    }

    await db
      .insert(profiles)
      .values({ ...current, banner_url, updated_at: new Date() })
      .onConflictDoUpdate({ target: profiles.id, set: { banner_url, updated_at: new Date() } });
    return json({ success: true, banner_url }, 200);
  } catch (err: any) {
    console.error('Error updating hero image:', err);
    return json({ error: err.message || 'Failed to update hero image' }, 500);
  }
}

export async function PUT(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Operator authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const handle = String(body.handle || '').trim();

    if (!name || !handle) {
      return new Response(JSON.stringify({ error: 'Name and handle are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headline = body.headline !== undefined ? String(body.headline).trim() : null;
    const bio = body.bio !== undefined ? String(body.bio).trim() : null;
    const avatar_url = body.avatar_url ? String(body.avatar_url).trim() : null;
    const banner_url = body.banner_url ? String(body.banner_url).trim() : null;
    const location = body.location !== undefined ? String(body.location).trim() : '35.6614° N, 139.6681° E';
    const status_message = body.status_message !== undefined ? String(body.status_message).trim() : 'online';
    const contact_email = body.contact_email !== undefined ? String(body.contact_email).trim() : null;
    const contact_note = body.contact_note !== undefined ? String(body.contact_note).trim() : null;

    const currently_building: ProjectEntry[] = Array.isArray(body.currently_building)
      ? body.currently_building.map((item: any) => ({
          title: String(item.title || '').trim(),
          description: String(item.description || '').trim(),
          url: item.url ? String(item.url).trim() : undefined,
          badge: item.badge ? String(item.badge).trim() : 'Active',
        })).filter((item: ProjectEntry) => item.title.length > 0)
      : [];

    const tech_stack: string[] = Array.isArray(body.tech_stack)
      ? body.tech_stack.map((t: any) => String(t).trim()).filter(Boolean)
      : [];

    const social_links: SocialLinkEntry[] = Array.isArray(body.social_links)
      ? body.social_links.map((link: any) => ({
          platform: String(link.platform || '').trim(),
          label: String(link.label || '').trim(),
          url: String(link.url || '').trim(),
        })).filter((link: SocialLinkEntry) => link.platform.length > 0 && link.url.length > 0)
      : [];

    const contact_details: ContactDetailEntry[] = Array.isArray(body.contact_details)
      ? body.contact_details.map((c: any) => ({
          method: String(c.method || '').trim(),
          value: String(c.value || '').trim(),
          link: c.link ? String(c.link).trim() : undefined,
        })).filter((c: ContactDetailEntry) => c.method.length > 0 && c.value.length > 0)
      : [];

    const profileData: DbProfile = {
      id: 'default',
      name,
      handle,
      headline,
      bio,
      avatar_url,
      banner_url,
      location,
      status_message,
      currently_building,
      tech_stack,
      social_links,
      contact_email,
      contact_details,
      contact_note,
      updated_at: new Date(),
      created_at: new Date(),
    };

    const current = await getProfile();
    if (current?.banner_url && current.banner_url !== banner_url) {
      await detachMediaByUrl(current.banner_url);
    }
    if (current?.avatar_url && current.avatar_url !== avatar_url) {
      await detachMediaByUrl(current.avatar_url);
    }

    await db
      .insert(profiles)
      .values(profileData)
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name,
          handle,
          headline,
          bio,
          avatar_url,
          banner_url,
          location,
          status_message,
          currently_building,
          tech_stack,
          social_links,
          contact_email,
          contact_details,
          contact_note,
          updated_at: new Date(),
        },
      });

    return new Response(JSON.stringify({ success: true, profile: profileData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
