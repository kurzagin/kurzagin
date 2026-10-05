#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Connect to .env.local (and fallbacks)
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

  let loadedFrom = null;

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
          if (!process.env[key]) {
            process.env[key] = val;
          }
        });
        loadedFrom = envPath;
        break;
      } catch (err) {
        console.warn(`[env] Warning reading ${envPath}:`, err.message);
      }
    }
  }

  return loadedFrom;
}

async function main() {
  console.log('\n========================================');
  console.log('  kurzagin.log // DATABASE SETUP');
  console.log('  Neon Postgres Schema Migration');
  console.log('========================================\n');

  const envFile = loadEnv();
  if (envFile) {
    console.log(`[env] Configuration loaded from: ${envFile}`);
  } else {
    console.warn('[env] Warning: No .env.local or .env file found.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is not set in environment or .env.local');
    process.exit(1);
  }

  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: schema.sql not found at ${schemaPath}`);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Split into individual SQL statements by semicolon, removing comments/whitespace
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`[db] Connecting to Neon and executing ${statements.length} schema statements...\n`);

  const sql = neon(databaseUrl);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await sql.query(stmt);
      console.log(`  [${i + 1}/${statements.length}] ✓ ${preview}...`);
    } catch (err) {
      console.error(`\n❌ Error executing statement [${i + 1}]:\n${stmt}\n`, err.message || err);
      process.exit(1);
    }
  }

  console.log('\n[db] Verifying existing tables in public schema:');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  tables.forEach((row) => {
    console.log(`  - ${row.table_name}`);
  });

  console.log('\n✓ Database schema initialized successfully!\n');
}

main().catch((err) => {
  console.error('Fatal error during schema setup:', err);
  process.exit(1);
});
