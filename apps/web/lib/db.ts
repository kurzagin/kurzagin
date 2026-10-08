import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';

export * from '../db/schema';

export type DbPost = schema.Post;
export type DbPostMedia = schema.PostMedia;
export type DbComment = schema.Comment;
export type DbAdminUser = schema.AdminUser;
export type DbTrack = schema.Track;
export type DbPostLike = schema.PostLike;
export type DbProfile = schema.Profile;
export type DbAnimeWatchlistItem = schema.AnimeWatchlistItem;
export type DbAnimeReview = schema.AnimeReview;
export type AnimePostMeta = schema.AnimePostMeta;
export type DbGalleryItem = schema.GalleryItem;
export type DbMediaAsset = schema.MediaAsset;

export async function incrementSiteVisits(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  try {
    const result = await db
      .insert(schema.siteStats)
      .values({ id: 1, total_visits: 1 })
      .onConflictDoUpdate({
        target: schema.siteStats.id,
        set: { total_visits: sql`${schema.siteStats.total_visits} + 1` },
      })
      .returning({ total_visits: schema.siteStats.total_visits });

    return result[0]?.total_visits ?? 0;
  } catch (err) {
    console.warn('[db] Unable to increment site visits:', err);
    return 0;
  }
}

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: DrizzleDb | null = null;

export const DEFAULT_PROFILE: schema.Profile = {
  id: 'default',
  name: 'Kur Zagin 𒀭𒆳𒍝𒆳',
  handle: '@kurzagin',
  headline: 'System architect, solo developer, and builder of strange but useful things.',
  bio: `I design products where software, knowledge systems, AI, and immersive interfaces overlap.

My work usually begins with a small irritation:
> “Why is this still difficult?”

Then I build the tool I wish already existed.`,
  avatar_url: null,
  banner_url: null,
  location: '35.6614° N, 139.6681° E',
  status_message: 'building tools I wish already existed',
  currently_building: [
    {
      title: 'Siduri',
      description: 'An AI companion and knowledge layer designed to understand applications without becoming tightly coupled to them',
      url: 'https://github.com/vxnus-studio/siduri-x',
      badge: 'Active',
    },
    {
      title: 'e-teyvat',
      description: 'A structured and immersive Genshin Impact knowledge platform 🎐',
      url: 'https://github.com/vxnus-studio/e-teyvat',
      badge: 'Active',
    },
    {
      title: 'Experimental Creator Tools',
      description: 'Tools for creators, media workflows, archives, and versioned knowledge',
      url: 'https://github.com/kurzagin/kurzagin-archive',
      badge: 'Archive',
    },
  ],
  tech_stack: [
    'TypeScript',
    'JavaScript',
    'Python',
    'Rust',
    'Next.js',
    'React',
    'Astro',
    'PostgreSQL',
    'AI workflows',
    'System architecture',
  ],
  social_links: [
    { platform: 'Website', label: 'krzgn.xyz', url: 'https://krzgn.xyz' },
    { platform: 'VXNUS Studio', label: 'vxnus.xyz', url: 'https://vxnus.xyz' },
    { platform: 'GitHub', label: '@vxnus-studio', url: 'https://github.com/vxnus-studio' },
    { platform: 'X', label: '@kurzagin', url: 'https://x.com/kurzagin' },
  ],
  contact_email: 'venus@krzgn.xyz',
  contact_details: [
    { method: 'Email', value: 'venus@krzgn.xyz', link: 'mailto:venus@krzgn.xyz' },
    { method: 'GitHub Discussions', value: 'vxnus-studio', link: 'https://github.com/vxnus-studio' },
    { method: 'Direct Message', value: '@kurzagin on X', link: 'https://x.com/kurzagin' },
  ],
  contact_note: 'Ideas, feedback, technical conversations, and unusual collaborations are welcome ✨',
  updated_at: new Date('2026-10-02T00:00:00Z'),
  created_at: new Date('2026-10-02T00:00:00Z'),
};

export function getDb(): DrizzleDb | null {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  databaseUrl = databaseUrl.replace(/^["']|["']$/g, '').trim();
  if (!cachedDb) {
    const client = neon(databaseUrl);
    cachedDb = drizzle({ client, schema });
  }
  return cachedDb;
}

export async function getProfile(): Promise<DbProfile> {
  const db = getDb();
  if (!db) return DEFAULT_PROFILE;
  try {
    const res = await db.select().from(schema.profiles).limit(1);
    if (res.length > 0) {
      return res[0];
    }
  } catch (err) {
    console.warn('[db] Unable to fetch profile from DB, using default fallback:', err);
  }
  return DEFAULT_PROFILE;
}
