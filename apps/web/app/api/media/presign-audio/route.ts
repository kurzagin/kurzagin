import type { NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import crypto from 'node:crypto';
import { isAuthenticated } from '@/lib/auth';
import { isR2Configured, getPresignedUploadUrl } from '@/lib/r2';
import { registerMediaAsset } from '@/lib/mediaRegistry';

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to upload audio tracks' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isR2Configured()) {
    return new Response(
      JSON.stringify({
        error: 'Cloudflare R2 storage is not configured yet. Please set R2 credentials in environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawFilename = (body.filename || 'track.opus').trim();
    const contentType = (body.contentType || 'audio/ogg; codecs=opus').trim();

    // Sanitize filename and ensure .opus extension
    const baseSlug = rawFilename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const fileId = crypto.randomUUID();
    const key = `tracks/${Date.now()}-${baseSlug || 'track'}-${fileId.slice(0, 8)}.opus`;

    const presigned = await getPresignedUploadUrl(key, contentType, 3600);

    if (!presigned) {
      return new Response(JSON.stringify({ error: 'Failed to generate R2 presigned upload URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Register audio in media registry
    await registerMediaAsset({
      key: presigned.key,
      url: presigned.publicUrl,
      storage: 'r2',
      mediaType: 'track',
      mimeType: contentType,
    });

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl: presigned.uploadUrl,
        publicUrl: presigned.publicUrl,
        key: presigned.key,
        contentType,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error generating presigned audio upload URL:', err);
    return new Response(
      JSON.stringify({ error: `Presign error: ${err.message || 'Unknown failure'}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
