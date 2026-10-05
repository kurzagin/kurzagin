import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { eq, asc, and } from 'drizzle-orm';
import {
  getDb,
  posts as postsTable,
  postMedia as postMediaTable,
  comments as commentsTable,
  postLikes as postLikesTable,
  getProfile,
  type DbPost,
  type DbComment,
  type DbPostMedia,
} from '@/lib/db';
import { getClientIp, hashIp } from '@/lib/ip';
import { getServerSession } from '@/lib/serverSession';
import { processYouTubePost } from '@/lib/youtube';
import PostClient from './PostClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  if (!db || !id) return { title: 'post — kurzagin' };
  try {
    const post = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
    if (post.length > 0) {
      const { cleanedContent } = processYouTubePost(post[0].content || '');
      return {
        title: `${post[0].author_name}: "${(cleanedContent || 'transmission').slice(0, 35)}..." — kurzagin`,
      };
    }
  } catch {}
  return { title: 'post — kurzagin' };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  if (!id) {
    redirect('/#blog');
  }

  const profile = await getProfile();

  const h = await headers();
  const host = h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || 'http';
  const dummyReq = new Request(`${proto}://${host}/`, { headers: new Headers(h) });
  const clientIp = getClientIp(dummyReq);
  const clientIpHash = hashIp(clientIp);
  let isPostLiked = false;

  const db = getDb();
  let post: DbPost | null = null;
  let postComments: DbComment[] = [];
  let mediaItems: DbPostMedia[] = [];

  if (db) {
    try {
      const postResults = await db
        .select()
        .from(postsTable)
        .where(eq(postsTable.id, id))
        .limit(1);

      if (postResults.length > 0) {
        post = postResults[0];
        postComments = await db
          .select()
          .from(commentsTable)
          .where(eq(commentsTable.post_id, id))
          .orderBy(asc(commentsTable.created_at));

        mediaItems = await db
          .select()
          .from(postMediaTable)
          .where(eq(postMediaTable.post_id, id))
          .orderBy(asc(postMediaTable.created_at));

        const userLikes = await db
          .select({ id: postLikesTable.id })
          .from(postLikesTable)
          .where(and(eq(postLikesTable.post_id, id), eq(postLikesTable.ip_hash, clientIpHash)))
          .limit(1);

        isPostLiked = userLikes.length > 0;
      }
    } catch (err) {
      console.error('Error fetching thread from Neon:', err);
    }
  }

  if (!post) {
    redirect('/#blog');
  }

  const session = await getServerSession();
  const authenticated = session !== null;

  return (
    <PostClient
      post={JSON.parse(JSON.stringify(post))}
      postComments={JSON.parse(JSON.stringify(postComments))}
      mediaItems={JSON.parse(JSON.stringify(mediaItems))}
      profile={JSON.parse(JSON.stringify(profile))}
      isPostLiked={isPostLiked}
      authenticated={authenticated}
    />
  );
}
