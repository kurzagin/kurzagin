import type { NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isAuthenticated } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2';
import { processPostImageToAvif } from '@/lib/image';
import { registerMediaAsset } from '@/lib/mediaRegistry';

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: operator login required to upload post media' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') || formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No image file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Uploaded file must be a valid image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process through sharp: ALWAYS convert to AVIF
    const processed = await processPostImageToAvif(inputBuffer, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 80,
    });

    const fileId = crypto.randomUUID();
    const key = `media/${fileId}.avif`;
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
      // Local fallback for development when R2 is not configured
      const uploadsDir = path.resolve(process.cwd(), 'public/uploads/media');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${fileId}.avif`);
      fs.writeFileSync(localFilePath, processed.buffer);
      publicUrl = `/uploads/media/${fileId}.avif`;
    }

    // Register in media registry
    await registerMediaAsset({
      key,
      url: publicUrl,
      storage: isR2Configured() ? 'r2' : 'local',
      mediaType: 'post_image',
      sizeBytes: processed.buffer.byteLength,
      mimeType: 'image/avif',
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        key,
        category: 'media',
        media_type: 'image',
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.buffer.byteLength,
        format: 'avif',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error processing post image to AVIF:', err);
    return new Response(
      JSON.stringify({ error: `Image processing error: ${err.message || 'Unknown failure'}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
