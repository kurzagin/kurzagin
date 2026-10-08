import type { NextRequest } from 'next/server';
import { getDb, comments } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from '@/lib/serverSession';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, parentCommentId, honeypot } = body;
    const content = (body.content || '').trim();
    let authorName = (body.authorName || '').trim();
    const session = await getServerSession();
    if (session) authorName = session.username;

    // Spam honeypot trap
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!content) {
      return new Response(JSON.stringify({ error: 'Comment content cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (content.length > 1000) {
      return new Response(JSON.stringify({ error: 'Comment exceeds 1000 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default to 'guest' if no username provided
    if (!authorName) {
      authorName = 'guest';
    } else if (authorName.length > 50) {
      authorName = authorName.slice(0, 50);
    }

    const db = getDb();
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection is not configured on server' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (parentCommentId) {
      const parent = await db
        .select({ id: comments.id, post_id: comments.post_id })
        .from(comments)
        .where(eq(comments.id, parentCommentId))
        .limit(1);
      if (!parent[0] || parent[0].post_id !== postId) {
        return new Response(JSON.stringify({ error: 'Reply target was not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const inserted = await db
      .insert(comments)
      .values({
        post_id: postId,
        parent_comment_id: parentCommentId || null,
        author_name: authorName,
        content,
      })
      .returning();

    return new Response(JSON.stringify({ success: true, comment: inserted[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error creating comment:', err);
    return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
