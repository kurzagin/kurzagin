import fs from 'node:fs';
import path from 'node:path';
import { isR2Configured, uploadBufferToR2 } from './r2';

let sharpModule: any = null;
let sharpChecked = false;

export async function getSharp(): Promise<any> {
  if (sharpChecked) return sharpModule;
  sharpChecked = true;
  try {
    const mod = await import('sharp');
    sharpModule = mod.default || mod;
    return sharpModule;
  } catch (err) {
    console.warn('[image] Sharp module is not available in runtime environment:', err);
    sharpModule = null;
    return null;
  }
}

export interface ProcessAlbumArtOptions {
  size?: number; // Target square dimension (width & height), default 800
  quality?: number; // AVIF quality (1-100), default 80
}

export interface ProcessedCoverResult {
  buffer: Buffer;
  format: 'avif' | 'original';
  mimeType: string;
}

/**
 * Processes an uploaded image into an optimized square AVIF format for vinyl center and album jacket display.
 * Falls back to the original image buffer if Sharp native bindings are not present.
 */
export async function processAlbumCoverToAvif(
  inputBuffer: Buffer | Uint8Array,
  options: ProcessAlbumArtOptions = {}
): Promise<ProcessedCoverResult> {
  const size = options.size || 800;
  const quality = options.quality || 80;

  const sharp = await getSharp();
  if (sharp) {
    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(size, size, {
          fit: 'cover',
          position: 'centre',
        })
        .avif({
          quality,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });

      const avifBuffer = await pipeline.toBuffer();
      return { buffer: avifBuffer, format: 'avif', mimeType: 'image/avif' };
    } catch (err) {
      console.warn('[image] Sharp cover transcoding failed, using original:', err);
    }
  }

  const fallback = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  return { buffer: fallback, format: 'original', mimeType: 'image/jpeg' };
}

export interface ProcessPostImageOptions {
  maxWidth?: number; // Max width (default 1920)
  maxHeight?: number; // Max height (default 1920)
  quality?: number; // AVIF quality (1-100), default 80
}

export interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'avif';
}

/**
 * Processes an uploaded post image into an optimized AVIF format while preserving original aspect ratio.
 */
export async function processPostImageToAvif(
  inputBuffer: Buffer | Uint8Array,
  options: ProcessPostImageOptions = {}
): Promise<ProcessedImageResult> {
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 1920;
  const quality = options.quality || 80;

  const sharp = await getSharp();
  if (sharp) {
    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .avif({
          quality,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      return {
        buffer: data,
        width: info.width,
        height: info.height,
        format: 'avif',
      };
    } catch (err) {
      console.warn('[image] Sharp post image transcoding failed:', err);
    }
  }

  const fallback = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  return {
    buffer: fallback,
    width: 800,
    height: 800,
    format: 'avif',
  };
}

export interface ProcessAvatarOptions {
  size?: number; // Target square dimension (width & height), default 512
  quality?: number; // AVIF quality (1-100), default 85
}

/**
 * Processes an uploaded avatar into a crisp square AVIF image with centre/attention focus.
 */
export async function processAvatarToAvif(
  inputBuffer: Buffer | Uint8Array,
  options: ProcessAvatarOptions = {}
): Promise<ProcessedImageResult> {
  const size = options.size || 512;
  const quality = options.quality || 85;

  const sharp = await getSharp();
  if (sharp) {
    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(size, size, {
          fit: 'cover',
          position: 'centre',
        })
        .avif({
          quality,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      return {
        buffer: data,
        width: info.width,
        height: info.height,
        format: 'avif',
      };
    } catch (err) {
      console.warn('[image] Sharp avatar transcoding failed:', err);
    }
  }

  const fallback = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  return {
    buffer: fallback,
    width: size,
    height: size,
    format: 'avif',
  };
}

export interface ProcessBannerOptions {
  maxWidth?: number; // Max banner width, default 1920
  maxHeight?: number; // Max banner height, default 640
  quality?: number; // AVIF quality (1-100), default 85
}

/**
 * Processes an uploaded banner into an optimized wide AVIF format for header display.
 */
export async function processBannerToAvif(
  inputBuffer: Buffer | Uint8Array,
  options: ProcessBannerOptions = {}
): Promise<ProcessedImageResult> {
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 640;
  const quality = options.quality || 85;

  const sharp = await getSharp();
  if (sharp) {
    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(maxWidth, maxHeight, {
          fit: 'cover',
          position: 'centre',
        })
        .avif({
          quality,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      return {
        buffer: data,
        width: info.width,
        height: info.height,
        format: 'avif',
      };
    } catch (err) {
      console.warn('[image] Sharp banner transcoding failed:', err);
    }
  }

  const fallback = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  return {
    buffer: fallback,
    width: maxWidth,
    height: maxHeight,
    format: 'avif',
  };
}

export interface ProcessAnimeCoverOptions {
  maxWidth?: number; // Max cover width (default 800)
  maxHeight?: number; // Max cover height (default 1200)
  quality?: number; // AVIF quality (default 82)
}

/**
 * Processes an anime cover image into an optimized AVIF format while preserving original aspect ratio.
 */
export async function processAnimeCoverToAvif(
  inputBuffer: Buffer | Uint8Array,
  options: ProcessAnimeCoverOptions = {}
): Promise<ProcessedImageResult> {
  const maxWidth = options.maxWidth || 800;
  const maxHeight = options.maxHeight || 1200;
  const quality = options.quality || 82;

  const sharp = await getSharp();
  if (sharp) {
    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .avif({
          quality,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      return {
        buffer: data,
        width: info.width,
        height: info.height,
        format: 'avif',
      };
    } catch (err) {
      console.warn('[image] Sharp anime cover transcoding failed:', err);
    }
  }

  const fallback = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  return {
    buffer: fallback,
    width: maxWidth,
    height: maxHeight,
    format: 'avif',
  };
}

/**
 * Downloads a remote anime cover URL (e.g. from AniList), converts it to AVIF via Sharp,
 * uploads to Cloudflare R2 (or saves to public/uploads/anime as fallback), and returns the public AVIF URL.
 */
export async function convertRemoteCoverToAvif(
  remoteUrl: string,
  anilistId: number
): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) return remoteUrl;

  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) {
      console.warn(`[anime-cover] Failed to fetch remote cover: ${res.statusText}`);
      return remoteUrl;
    }

    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const processed = await processAnimeCoverToAvif(inputBuffer);
    const key = `anime/covers/${anilistId}.avif`;

    if (isR2Configured()) {
      const publicUrl = await uploadBufferToR2(key, processed.buffer, 'image/avif');
      if (publicUrl) return publicUrl;
    } else {
      const uploadsDir = path.resolve(process.cwd(), 'public/uploads/anime');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${anilistId}.avif`);
      fs.writeFileSync(localFilePath, processed.buffer);
      return `/uploads/anime/${anilistId}.avif`;
    }
  } catch (err) {
    console.error('[anime-cover] Error converting anime cover to AVIF, falling back to original URL:', err);
  }

  return remoteUrl;
}
