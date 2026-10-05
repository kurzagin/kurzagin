import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getDb, mediaAssets } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { purgeMediaAsset } from '@/lib/mediaRegistry';

/**
 * GET /api/media/assets
 * Returns media asset statistics and lists detached files.
 */
export async function GET(request: NextRequest) {
  const cookies = await nextCookies();
  await connection();
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
    const allAssets = await db
      .select()
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.created_at))
      .limit(100);

    const detached = allAssets.filter((a) => a.status === 'detached');
    const active = allAssets.filter((a) => a.status === 'active');
    const deleted = allAssets.filter((a) => a.status === 'deleted');

    return new Response(
      JSON.stringify({
        summary: {
          total: allAssets.length,
          activeCount: active.length,
          detachedCount: detached.length,
          deletedCount: deleted.length,
        },
        detachedAssets: detached,
        recentAssets: allAssets.slice(0, 20),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error fetching media assets:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch media assets' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/media/assets
 * Purge a specific detached asset or all detached assets.
 * Body: { action: 'purge_one', assetId: '...' } OR { action: 'purge_all_detached' }
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'purge_one';

    if (action === 'purge_one') {
      const assetId = body.assetId;
      if (!assetId) {
        return new Response(JSON.stringify({ error: 'assetId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await purgeMediaAsset(assetId);
      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error || 'Failed to purge asset' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, purgedId: assetId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'purge_all_detached') {
      const detachedList = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.status, 'detached'));

      let purgedCount = 0;
      for (const item of detachedList) {
        const res = await purgeMediaAsset(item.id);
        if (res.success) purgedCount++;
      }

      return new Response(JSON.stringify({ success: true, purgedCount }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error handling media asset action:', err);
    return new Response(JSON.stringify({ error: 'Failed to execute media purge' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
