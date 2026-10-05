#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) return;
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key] && val) {
            process.env[key] = val;
          }
        });
      } catch {}
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('\x1b[31m[!] Missing DATABASE_URL in environment or .env.local\x1b[0m');
  process.exit(1);
}

const OLD_CDN = 'https://cdn.krzgn.xyz';
const NEW_CDN = 'https://cdn.kurzagin.com';

const OLD_SITE = 'https://krzgn.xyz';
const NEW_SITE = 'https://kurzagin.com';

console.log(`\x1b[36m// Kurzagin Database Media URL Migration\x1b[0m`);
console.log(`  Replacing Old CDN:  ${OLD_CDN} → ${NEW_CDN}`);
console.log(`  Replacing Old Site: ${OLD_SITE} → ${NEW_SITE}\n`);

const sql = neon(dbUrl);

async function runMigration() {
  // 1. Table: tracks
  console.log('// Migrating `tracks` (audio_url & cover_url)...');
  const tracksBefore = await sql`
    SELECT id, title, audio_url, cover_url 
    FROM tracks 
    WHERE audio_url LIKE '%cdn.krzgn.xyz%' OR cover_url LIKE '%cdn.krzgn.xyz%'
  `;
  
  if (tracksBefore.length > 0) {
    await sql`
      UPDATE tracks
      SET 
        audio_url = REPLACE(audio_url, ${OLD_CDN}, ${NEW_CDN}),
        cover_url = REPLACE(cover_url, ${OLD_CDN}, ${NEW_CDN})
      WHERE audio_url LIKE '%cdn.krzgn.xyz%' OR cover_url LIKE '%cdn.krzgn.xyz%'
    `;
    console.log(`  ✓ Updated ${tracksBefore.length} record(s) in tracks.`);
  } else {
    console.log('  - No tracks matching old CDN found.');
  }

  // 2. Table: post_media
  console.log('// Migrating `post_media` (url)...');
  const postMediaBefore = await sql`
    SELECT id, url 
    FROM post_media 
    WHERE url LIKE '%cdn.krzgn.xyz%'
  `;

  if (postMediaBefore.length > 0) {
    await sql`
      UPDATE post_media
      SET url = REPLACE(url, ${OLD_CDN}, ${NEW_CDN})
      WHERE url LIKE '%cdn.krzgn.xyz%'
    `;
    console.log(`  ✓ Updated ${postMediaBefore.length} record(s) in post_media.`);
  } else {
    console.log('  - No post_media matching old CDN found.');
  }

  // 3. Table: gallery_items
  console.log('// Migrating `gallery_items` (url)...');
  const galleryBefore = await sql`
    SELECT id, url 
    FROM gallery_items 
    WHERE url LIKE '%cdn.krzgn.xyz%'
  `;

  if (galleryBefore.length > 0) {
    await sql`
      UPDATE gallery_items
      SET url = REPLACE(url, ${OLD_CDN}, ${NEW_CDN})
      WHERE url LIKE '%cdn.krzgn.xyz%'
    `;
    console.log(`  ✓ Updated ${galleryBefore.length} record(s) in gallery_items.`);
  } else {
    console.log('  - No gallery_items matching old CDN found.');
  }

  // 4. Table: profiles
  console.log('// Migrating `profiles` (avatar_url, banner_url, social_links)...');
  const profilesBefore = await sql`
    SELECT id, avatar_url, banner_url, social_links 
    FROM profiles 
    WHERE avatar_url LIKE '%cdn.krzgn.xyz%' 
       OR banner_url LIKE '%cdn.krzgn.xyz%'
       OR social_links::text LIKE '%krzgn.xyz%'
  `;

  if (profilesBefore.length > 0) {
    for (const prof of profilesBefore) {
      const newAvatar = (prof.avatar_url || '').replace(OLD_CDN, NEW_CDN);
      const newBanner = (prof.banner_url || '').replace(OLD_CDN, NEW_CDN);
      
      let newSocial = prof.social_links;
      if (Array.isArray(prof.social_links)) {
        newSocial = prof.social_links.map((link) => {
          if (link.url === OLD_SITE || link.url === `${OLD_SITE}/`) {
            return { ...link, url: NEW_SITE, label: 'kurzagin.com' };
          }
          return link;
        });
      }

      await sql`
        UPDATE profiles
        SET 
          avatar_url = ${newAvatar || prof.avatar_url},
          banner_url = ${newBanner || prof.banner_url},
          social_links = ${JSON.stringify(newSocial)}::jsonb,
          updated_at = NOW()
        WHERE id = ${prof.id}
      `;
    }
    console.log(`  ✓ Updated ${profilesBefore.length} profile record(s).`);
  } else {
    console.log('  - No profile matching old CDN found.');
  }

  // 5. Table: anime_watchlist
  console.log('// Migrating `anime_watchlist` (cover_url & banner_url)...');
  const animeBefore = await sql`
    SELECT id, cover_url, banner_url 
    FROM anime_watchlist 
    WHERE cover_url LIKE '%cdn.krzgn.xyz%' OR banner_url LIKE '%cdn.krzgn.xyz%'
  `;

  if (animeBefore.length > 0) {
    await sql`
      UPDATE anime_watchlist
      SET 
        cover_url = REPLACE(cover_url, ${OLD_CDN}, ${NEW_CDN}),
        banner_url = REPLACE(banner_url, ${OLD_CDN}, ${NEW_CDN})
      WHERE cover_url LIKE '%cdn.krzgn.xyz%' OR banner_url LIKE '%cdn.krzgn.xyz%'
    `;
    console.log(`  ✓ Updated ${animeBefore.length} record(s) in anime_watchlist.`);
  } else {
    console.log('  - No anime_watchlist matching old CDN found.');
  }

  // 6. Check optional media_assets table if present
  try {
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'media_assets'
    `;
    if (tableCheck.length > 0) {
      console.log('// Migrating `media_assets` (url)...');
      await sql`
        UPDATE media_assets
        SET url = REPLACE(url, ${OLD_CDN}, ${NEW_CDN})
        WHERE url LIKE '%cdn.krzgn.xyz%'
      `;
      console.log('  ✓ Updated media_assets records.');
    }
  } catch {}

  console.log('\n\x1b[32m✓ ALL DATABASE MEDIA URLS SUCCESSFULLY MIGRATED TO cdn.kurzagin.com!\x1b[0m');
}

runMigration().catch((err) => {
  console.error('\x1b[31m[!] Migration failed:\x1b[0m', err);
  process.exit(1);
});
