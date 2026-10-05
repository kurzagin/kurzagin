import type { NextRequest } from 'next/server';
import { getDb, posts, postLikes } from '@/lib/db';
import { eq, sql, and } from 'drizzle-orm';
import { getClientIp, hashIp } from '@/lib/ip';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { postId } = body;

    if (!postId || typeof postId !== 'string') {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection is not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify post exists
    const existingPost = await db
      .select({ id: posts.id, likes_count: posts.likes_count })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (existingPost.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = getClientIp(request);
    const ipHash = hashIp(ip);

    // IP-Gated: Check if this IP has already liked this post
    const alreadyLiked = await db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.post_id, postId), eq(postLikes.ip_hash, ipHash)))
      .limit(1);

    if (alreadyLiked.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          alreadyLiked: true,
          likes_count: existingPost[0].likes_count,
          message: 'You have already liked this post',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert like record (safe against race conditions via unique constraint)
    try {
      await db.insert(postLikes).values({
        post_id: postId,
        ip_hash: ipHash,
      });
    } catch (insertErr: any) {
      if (insertErr?.code === '23505') {
        return new Response(
          JSON.stringify({
            success: false,
            alreadyLiked: true,
            likes_count: existingPost[0].likes_count,
            message: 'You have already liked this post',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw insertErr;
    }

    // Increment likes_count on post
    const updated = await db
      .update(posts)
      .set({ likes_count: sql`${posts.likes_count} + 1` })
      .where(eq(posts.id, postId))
      .returning({ likes_count: posts.likes_count });

    const newLikesCount = updated[0]?.likes_count ?? existingPost[0].likes_count + 1;

    return new Response(
      JSON.stringify({
        success: true,
        liked: true,
        likes_count: newLikesCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error handling like:', err);
    return new Response(JSON.stringify({ error: 'Failed to process like' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
