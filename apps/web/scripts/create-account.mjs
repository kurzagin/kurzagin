#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import crypto from 'node:crypto';
import { createAuthClient } from '@neondatabase/auth';
import { neon } from '@neondatabase/serverless';

// 1. Connect to .env.local (and fallbacks)
function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), '../.env'),
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

// 2. Hash password with PBKDF2 (for fallback database table)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 3. CLI Argument parser
function parseArgs() {
  const args = process.argv.slice(2);
  let email = null;
  let username = null;
  let password = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' || arg === '-e') {
      email = args[i + 1];
      i++;
    } else if (arg === '--username' || arg === '-u' || arg === '--name' || arg === '-n') {
      username = args[i + 1];
      i++;
    } else if (arg === '--password' || arg === '-p') {
      password = args[i + 1];
      i++;
    } else if (!email && arg.includes('@')) {
      email = arg;
    } else if (!username && !arg.startsWith('-')) {
      username = arg;
    } else if (!password && !arg.startsWith('-')) {
      password = arg;
    }
  }

  return { email, username, password };
}

async function main() {
  console.log('\n========================================');
  console.log('  kurzagin.log // OPERATOR ACCOUNT CREATOR');
  console.log('  Powered by Neon Auth & Neon Postgres');
  console.log('========================================\n');

  const envFile = loadEnv();
  if (envFile) {
    console.log(`[env] Configuration connected from: ${envFile}`);
  } else {
    console.log('[env] Notice: No .env.local found. Checked root and apps/web directories.');
  }

  let { email, username, password } = parseArgs();

  // Prompt interactively if arguments are missing
  if (!username || !email || !password) {
    const rl = readline.createInterface({ input, output });

    if (!username) {
      const inputUser = await rl.question('// Enter operator handle (default: kurzagin): ');
      username = inputUser.trim() || 'kurzagin';
    }

    if (!email) {
      const inputEmail = await rl.question(
        `// Enter operator email (default: ${username}@krzgn.xyz): `
      );
      email = inputEmail.trim() || `${username}@krzgn.xyz`;
    }

    if (!password) {
      const inputPass = await rl.question('// Enter security passphrase: ');
      password = inputPass.trim();
    }

    rl.close();
  }

  if (!email || !email.includes('@')) {
    console.error('\n❌ Error: Valid email address is required for Neon Auth.');
    process.exit(1);
  }

  if (!password) {
    console.error('\n❌ Error: Password cannot be empty.');
    process.exit(1);
  }

  const neonAuthUrl = process.env.NEON_AUTH_BASE_URL;
  const databaseUrl = process.env.DATABASE_URL;

  let neonAuthSuccess = false;

  // 1. Create account in Neon Auth (Managed Better Auth)
  if (neonAuthUrl) {
    console.log(`\n[auth] Connecting to Neon Auth at ${neonAuthUrl}...`);
    try {
      const auth = createAuthClient(neonAuthUrl);
      const res = await auth.signUp.email({
        email,
        password,
        name: username,
      });

      console.log('\n========================================');
      console.log('✓ SUCCESS: Operator account created in Neon Auth!');
      console.log('========================================');
      console.log(`  Handle:   @${username}`);
      console.log(`  Email:    ${email}`);
      console.log(`  Service:  Neon Auth (${neonAuthUrl})`);
      console.log(`  Login at: http://localhost:4321/login or your production URL`);
      console.log('========================================\n');
      neonAuthSuccess = true;
    } catch (err) {
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('already exists') || errMsg.includes('422')) {
        console.log(`\n[auth] Notice: An account with email "${email}" already exists in Neon Auth.`);
        neonAuthSuccess = true;
      } else {
        console.warn(`\n[auth] Warning contacting Neon Auth: ${errMsg}`);
        console.warn('[auth] Note: Ensure "Sign-up with Email" is enabled in your Neon Console (Auth tab).');
      }
    }
  } else {
    console.log('\n[auth] Notice: NEON_AUTH_BASE_URL is not set yet in your .env.local file.');
    console.log('[auth] When you enable Managed Auth in the Neon Console, add your URL to .env.local:');
    console.log('       NEON_AUTH_BASE_URL="https://ep-...neonauth.<region>.aws.neon.tech"\n');
  }

  // 2. Also sync to database fallback (admin_users table) if DATABASE_URL is available
  if (databaseUrl) {
    console.log('[db] Connecting to Neon Postgres database...');
    try {
      const sql = neon(databaseUrl);

      await sql`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      const passwordHash = hashPassword(password);

      await sql`
        INSERT INTO admin_users (username, password_hash)
        VALUES (${username}, ${passwordHash})
        ON CONFLICT (username)
        DO UPDATE SET password_hash = EXCLUDED.password_hash
      `;

      console.log(`✓ Database sync: Operator @${username} credentials synced in Neon Postgres!`);
    } catch (err) {
      console.warn('[db] Warning syncing database record:', err.message || err);
    }
  }

  if (!neonAuthSuccess && !databaseUrl) {
    console.error('\n❌ Error: Neither NEON_AUTH_BASE_URL nor DATABASE_URL are configured in your environment.');
    console.error('Please configure at least one in your .env.local file.');
    process.exit(1);
  }

  console.log('\n[setup] Operator provisioning process complete.\n');
}

main();
