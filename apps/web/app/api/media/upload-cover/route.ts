import type { NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isAuthenticated } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2';
import { processAlbumCoverToAvif } from '@/lib/image';
import { registerMediaAsset } from '@/lib/mediaRegistry';

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to upload album art' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isR2Configured() && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
    return new Response(
      JSON.stringify({
        error: 'Cloudflare R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('cover') || formData.get('image') || formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No image file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Uploaded file must be a valid image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process through sharp (with graceful fallback if sharp binary is not available)
    const processed = await processAlbumCoverToAvif(inputBuffer, {
      size: 800,
      quality: 80,
    });

    const isAvif = processed.format === 'avif';
    const originalExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ext = isAvif ? 'avif' : originalExt;
    const fileId = crypto.randomUUID();
    const key = `covers/${fileId}.${ext}`;
    const mimeType = isAvif ? 'image/avif' : (file.type || 'image/jpeg');

    let publicUrl: string | null = null;

    if (isR2Configured()) {
      publicUrl = await uploadBufferToR2(key, processed.buffer, mimeType);
      if (!publicUrl) {
        return new Response(JSON.stringify({ error: 'Failed to upload cover art to Cloudflare R2' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Local filesystem fallback when R2 credentials are not configured
      const uploadsDir = path.resolve(process.cwd(), 'public/uploads/covers');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${fileId}.${ext}`);
      fs.writeFileSync(localFilePath, processed.buffer);
      publicUrl = `/uploads/covers/${fileId}.${ext}`;
    }

    // Register in media registry
    await registerMediaAsset({
      key,
      url: publicUrl,
      storage: isR2Configured() ? 'r2' : 'local',
      mediaType: 'cover',
      sizeBytes: processed.buffer.byteLength,
      mimeType,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        key,
        format: processed.format,
        sizeBytes: processed.buffer.byteLength,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error processing album cover image:', err);
    return new Response(
      JSON.stringify({ error: `Image processing error: ${err.message || 'Unknown failure'}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
