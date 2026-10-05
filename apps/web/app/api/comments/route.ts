import type { NextRequest } from 'next/server';
import { getDb, comments } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, honeypot } = body;
    const content = (body.content || '').trim();
    let authorName = (body.authorName || '').trim();

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

    const inserted = await db
      .insert(comments)
      .values({
        post_id: postId,
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
