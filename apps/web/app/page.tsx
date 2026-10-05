import { connection } from 'next/server';
import { headers } from 'next/headers';
import { desc, asc, inArray, eq, and } from 'drizzle-orm';
import {
  getDb,
  posts as postsTable,
  postMedia as postMediaTable,
  comments as commentsTable,
  postLikes as postLikesTable,
  tracks as tracksTable,
  getProfile,
  type DbPost,
  type DbComment,
  type DbPostMedia,
  type DbTrack,
  type ProjectEntry,
} from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';
import { getClientIp, hashIp } from '@/lib/ip';
import HomeClient from './HomeClient';

export const metadata = { title: 'home — kurzagin' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const session = await getServerSession();
  const authenticated = session !== null;
  const profile = await getProfile();
  const currentlyBuilding: ProjectEntry[] = (profile.currently_building as ProjectEntry[]) || [];

  const sp = await searchParams;
  const filter = typeof sp.filter === 'string' ? sp.filter : null;
  const isMediaFilter = filter === 'media';
  const isAnimeFilter = filter === 'anime';

  const h = await headers();
  const host = h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || 'http';
  const dummyReq = new Request(`${proto}://${host}/`, { headers: new Headers(h) });
  const clientIp = getClientIp(dummyReq);
  const clientIpHash = hashIp(clientIp);
  let likedPostIds: string[] = [];

  const db = getDb();
  let posts: DbPost[] = [];
  let commentsByPost: Record<string, DbComment[]> = {};
  let mediaByPost: Record<string, DbPostMedia[]> = {};
  let tracks: DbTrack[] = [];

  if (db) {
    try {
      tracks = await db
        .select()
        .from(tracksTable)
        .orderBy(desc(tracksTable.created_at))
        .limit(20);

      const query = db.select().from(postsTable);
      if (isMediaFilter) {
        posts = await query.where(eq(postsTable.has_media, true)).orderBy(desc(postsTable.created_at)).limit(50);
      } else if (isAnimeFilter) {
        posts = await query.where(eq(postsTable.category, 'anime')).orderBy(desc(postsTable.created_at)).limit(50);
      } else {
        posts = await query.orderBy(desc(postsTable.created_at)).limit(50);
      }

      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const rawComments = await db
          .select()
          .from(commentsTable)
          .where(inArray(commentsTable.post_id, postIds))
          .orderBy(asc(commentsTable.created_at));

        rawComments.forEach((c) => {
          if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
          commentsByPost[c.post_id].push(c);
        });

        const rawMedia = await db
          .select()
          .from(postMediaTable)
          .where(inArray(postMediaTable.post_id, postIds))
          .orderBy(asc(postMediaTable.created_at));

        rawMedia.forEach((m) => {
          if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = [];
          mediaByPost[m.post_id].push(m);
        });

        const rawLikes = await db
          .select({ post_id: postLikesTable.post_id })
          .from(postLikesTable)
          .where(and(eq(postLikesTable.ip_hash, clientIpHash), inArray(postLikesTable.post_id, postIds)));

        likedPostIds = rawLikes.map((l) => l.post_id);
      }
    } catch (err) {
      console.error('Error fetching posts/comments/media from Neon with Drizzle:', err);
    }
  }

  return (
    <HomeClient
      authenticated={authenticated}
      session={session}
      profile={JSON.parse(JSON.stringify(profile))}
      currentlyBuilding={JSON.parse(JSON.stringify(currentlyBuilding))}
      isMediaFilter={isMediaFilter}
      isAnimeFilter={isAnimeFilter}
      posts={JSON.parse(JSON.stringify(posts))}
      commentsByPost={JSON.parse(JSON.stringify(commentsByPost))}
      mediaByPost={JSON.parse(JSON.stringify(mediaByPost))}
      likedPostIds={likedPostIds}
      tracks={JSON.parse(JSON.stringify(tracks))}
    />
  );
}
