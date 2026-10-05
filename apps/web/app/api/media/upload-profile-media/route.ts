import type { NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isAuthenticated } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2';
import { processAvatarToAvif, processBannerToAvif } from '@/lib/image';
import { registerMediaAsset } from '@/lib/mediaRegistry';

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: operator login required to upload profile media' }), {
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
    const file = formData.get('file') || formData.get('image');
    const mediaType = (formData.get('type') || 'avatar').toString().toLowerCase(); // 'avatar' | 'banner'

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No image file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Uploaded file must be a valid image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process image to AVIF according to type
    const processed = mediaType === 'banner'
      ? await processBannerToAvif(inputBuffer, { maxWidth: 1920, maxHeight: 640, quality: 85 })
      : await processAvatarToAvif(inputBuffer, { size: 512, quality: 85 });

    const fileId = crypto.randomUUID();
    const subFolder = mediaType === 'banner' ? 'banners' : 'avatars';
    const key = `profiles/${subFolder}/${fileId}.avif`;
    let publicUrl: string | null = null;

    if (isR2Configured()) {
      publicUrl = await uploadBufferToR2(key, processed.buffer, 'image/avif');
      if (!publicUrl) {
        return new Response(JSON.stringify({ error: 'Failed to upload AVIF to Cloudflare R2' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Local fallback if R2 credentials are not set
      const uploadsDir = path.resolve(process.cwd(), `public/uploads/profiles/${subFolder}`);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${fileId}.avif`);
      fs.writeFileSync(localFilePath, processed.buffer);
      publicUrl = `/uploads/profiles/${subFolder}/${fileId}.avif`;
    }

    // Track newly uploaded asset in media registry
    await registerMediaAsset({
      key,
      url: publicUrl,
      storage: isR2Configured() ? 'r2' : 'local',
      mediaType: mediaType === 'banner' ? 'banner' : 'avatar',
      sizeBytes: processed.buffer.byteLength,
      mimeType: 'image/avif',
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        key,
        type: mediaType,
        format: 'avif',
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.buffer.byteLength,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error processing profile media to AVIF:', err);
    return new Response(
      JSON.stringify({ error: `Image processing error: ${err.message || 'Unknown failure'}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
