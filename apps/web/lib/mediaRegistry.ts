import { eq, desc, and } from 'drizzle-orm';
import { getDb, mediaAssets, type DbMediaAsset } from './db';
import { deleteR2Object, isR2Configured, getR2Config } from './r2';
import fs from 'node:fs';
import path from 'node:path';

export interface RegisterAssetParams {
  key: string;
  url: string;
  storage?: 'r2' | 'local' | 'external';
  mediaType: 'banner' | 'avatar' | 'cover' | 'track' | 'post_image' | 'gallery';
  sizeBytes?: number;
  mimeType?: string;
}

/**
 * Register or update an uploaded media file in the tracking table.
 */
export async function registerMediaAsset(params: RegisterAssetParams): Promise<DbMediaAsset | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const inserted = await db
      .insert(mediaAssets)
      .values({
        key: params.key,
        url: params.url,
        storage: params.storage || (isR2Configured() ? 'r2' : 'local'),
        media_type: params.mediaType,
        status: 'active',
        size_bytes: params.sizeBytes || null,
        mime_type: params.mimeType || null,
        created_at: new Date(),
      })
      .onConflictDoUpdate({
        target: mediaAssets.url,
        set: {
          key: params.key,
          status: 'active',
          detached_at: null,
          deleted_at: null,
          size_bytes: params.sizeBytes || null,
          mime_type: params.mimeType || null,
        },
      })
      .returning();

    return inserted[0] || null;
  } catch (err) {
    console.error('Error registering media asset:', err);
    return null;
  }
}

/**
 * Mark a media asset as 'detached' (unlinked/ghost candidate) instead of immediate deletion.
 */
export async function detachMediaByUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || !url.trim()) return false;
  const db = getDb();
  if (!db) return false;

  const targetUrl = url.trim();

  try {
    // Check if the record already exists
    const existing = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.url, targetUrl))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === 'deleted') return false;
      await db
        .update(mediaAssets)
        .set({
          status: 'detached',
          detached_at: new Date(),
        })
        .where(eq(mediaAssets.id, existing[0].id));
      return true;
    }

    // If it was uploaded prior to registry tracking, infer its key and register as detached
    const inferredKey = extractKeyFromUrl(targetUrl);
    if (!inferredKey) return false;

    await db.insert(mediaAssets).values({
      key: inferredKey,
      url: targetUrl,
      storage: targetUrl.startsWith('/uploads/') ? 'local' : 'r2',
      media_type: inferMediaTypeFromKey(inferredKey),
      status: 'detached',
      detached_at: new Date(),
    });

    return true;
  } catch (err) {
    console.error(`Error detaching media asset by url (${url}):`, err);
    return false;
  }
}

/**
 * Purge a detached asset permanently from storage (R2 or local disk) and mark status as 'deleted'.
 */
export async function purgeMediaAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const records = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, assetId))
      .limit(1);

    if (records.length === 0) {
      return { success: false, error: 'Asset not found' };
    }

    const asset = records[0];
    let fileDeleted = false;

    if (asset.storage === 'r2') {
      fileDeleted = await deleteR2Object(asset.key);
    } else if (asset.storage === 'local') {
      try {
        const localPath = path.resolve(process.cwd(), 'public', asset.url.replace(/^\/+/, ''));
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        fileDeleted = true;
      } catch (e: any) {
        console.error('Failed to unlink local file:', e);
      }
    } else {
      fileDeleted = true;
    }

    await db
      .update(mediaAssets)
      .set({
        status: 'deleted',
        deleted_at: new Date(),
      })
      .where(eq(mediaAssets.id, asset.id));

    return { success: true };
  } catch (err: any) {
    console.error('Error purging media asset:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Permanently purge a media file by its URL from storage (R2 or local disk) and mark status as 'deleted'.
 */
export async function purgeMediaByUrl(url: string | null | undefined): Promise<{ success: boolean; error?: string }> {
  if (!url || !url.trim()) return { success: false, error: 'Empty URL' };
  const targetUrl = url.trim();
  const db = getDb();

  try {
    let key: string | null = null;
    let storage: 'r2' | 'local' | 'external' = 'r2';
    let assetId: string | null = null;

    if (db) {
      const records = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.url, targetUrl))
        .limit(1);

      if (records.length > 0) {
        const asset = records[0];
        assetId = asset.id;
        key = asset.key;
        storage = (asset.storage as 'r2' | 'local' | 'external') || 'r2';
      }
    }

    if (!key) {
      key = extractKeyFromUrl(targetUrl);
      if (targetUrl.startsWith('/uploads/')) {
        storage = 'local';
      } else {
        const config = getR2Config();
        const isR2Url =
          (config?.publicUrl && targetUrl.startsWith(config.publicUrl)) ||
          targetUrl.includes('.r2.dev') ||
          targetUrl.includes('.r2.cloudflarestorage.com');
        if (isR2Url) {
          storage = 'r2';
        } else {
          // External third-party URL (e.g. external CDN) - nothing to delete in storage
          return { success: true };
        }
      }
    }

    if (!key) {
      return { success: false, error: 'Could not resolve storage key from URL' };
    }

    key = key.replace(/^\/+/, '');

    let fileDeleted = false;
    if (storage === 'r2') {
      fileDeleted = await deleteR2Object(key);
    } else if (storage === 'local') {
      try {
        const localPath = path.resolve(process.cwd(), 'public', targetUrl.replace(/^\/+/, ''));
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        fileDeleted = true;
      } catch (e: any) {
        console.error('Failed to unlink local file:', e);
      }
    } else {
      fileDeleted = true;
    }

    if (db) {
      if (assetId) {
        await db
          .update(mediaAssets)
          .set({
            status: 'deleted',
            deleted_at: new Date(),
          })
          .where(eq(mediaAssets.id, assetId));
      } else {
        await db
          .insert(mediaAssets)
          .values({
            key,
            url: targetUrl,
            storage,
            media_type: inferMediaTypeFromKey(key),
            status: 'deleted',
            created_at: new Date(),
            deleted_at: new Date(),
          })
          .catch(() => {});
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error(`Error purging media asset by url (${url}):`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Helper to infer storage key from URL.
 */
function extractKeyFromUrl(url: string): string | null {
  if (url.startsWith('/uploads/')) {
    return url.replace(/^\/uploads\//, '');
  }
  const config = getR2Config();
  if (config?.publicUrl && url.startsWith(config.publicUrl)) {
    return url.slice(config.publicUrl.length).replace(/^\/+/, '') || null;
  }
  // If it's a full R2 public URL
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/^\/+/, '');
    return pathname || null;
  } catch {
    return null;
  }
}

/**
 * Helper to guess media_type from key if registering retroactively
 */
function inferMediaTypeFromKey(key: string): 'banner' | 'avatar' | 'cover' | 'track' | 'post_image' | 'gallery' {
  if (key.includes('banners')) return 'banner';
  if (key.includes('avatars')) return 'avatar';
  if (key.includes('covers')) return 'cover';
  if (key.includes('tracks')) return 'track';
  if (key.includes('gallery')) return 'gallery';
  return 'post_image';
}
