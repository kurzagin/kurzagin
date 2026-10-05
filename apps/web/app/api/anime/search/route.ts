import { connection, type NextRequest } from 'next/server';
import { searchAniList } from '@/lib/anilist';

export async function GET(request: NextRequest) {
  await connection();
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const results = await searchAniList(q, 1, 10);
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error querying AniList API:', err);
    return new Response(JSON.stringify({ error: 'Failed to search AniList', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
