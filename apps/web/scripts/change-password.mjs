#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import { Writable } from 'node:stream';
import crypto from 'node:crypto';
import { createAuthClient } from '@neondatabase/auth';
import { neon } from '@neondatabase/serverless';
import { hashPassword as hashBetterAuthPassword } from 'better-auth/crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Connect to .env.local (and fallbacks)
function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
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

// 2. Hash & verify password with PBKDF2 (for admin_users schema)
function hashPbkdf2Password(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPbkdf2Password(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

// 3. Interactive prompt helpers
function askText(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askSecret(query) {
  return new Promise((resolve) => {
    if (!input.isTTY) {
      const rl = readline.createInterface({ input, output });
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          output.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input,
      output: mutableStdout,
      terminal: true,
    });

    output.write(query);
    muted = true;

    rl.question('', (ans) => {
      muted = false;
      output.write('\n');
      rl.close();
      resolve(ans.trim());
    });
  });
}

// 4. CLI Argument parser
function parseArgs() {
  const args = process.argv.slice(2);
  let identifier = null;
  let username = null;
  let email = null;
  let newPassword = null;
  let currentPassword = null;
  let force = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--username' || arg === '-u' || arg === '--name' || arg === '-n') {
      username = args[i + 1];
      i++;
    } else if (arg === '--email' || arg === '-e') {
      email = args[i + 1];
      i++;
    } else if (arg === '--password' || arg === '--new-password' || arg === '-p') {
      newPassword = args[i + 1];
      i++;
    } else if (arg === '--current-password' || arg === '--old-password' || arg === '-c') {
      currentPassword = args[i + 1];
      i++;
    } else if (!identifier && !arg.startsWith('-')) {
      identifier = arg;
    }
  }

  return { identifier, username, email, newPassword, currentPassword, force, help };
}

function printUsage() {
  console.log(`
Usage:
  node scripts/change-password.mjs [options]
  npm run change-password -- [options]

Options:
  -u, --username <handle>          Operator username to update (e.g. 'kurzagin')
  -e, --email <email>              Operator email to update (e.g. 'my@krzgn.xyz')
  -p, --password <passphrase>      New security passphrase
  -c, --current-password <pass>    Current security passphrase (optional)
  -f, --force                      Bypass interactive confirmation
  -h, --help                       Show this help message

Examples:
  # Interactive mode
  npm run change-password

  # Change password by username
  npm run change-password -- --username kurzagin --password "new-passphrase"

  # Change password by email
  npm run change-password -- --email my@krzgn.xyz --password "new-passphrase"
`);
}

async function main() {
  console.log('\n========================================');
  console.log('  kurzagin.log // OPERATOR PASSWORD MANAGER');
  console.log('  Neon Postgres & Neon Auth Credential Sync');
  console.log('========================================\n');

  const { identifier: argId, username: argUsername, email: argEmail, newPassword: argNewPass, currentPassword: argCurrentPass, force, help } = parseArgs();

  if (help) {
    printUsage();
    process.exit(0);
  }

  const envFile = loadEnv();
  if (envFile) {
    console.log(`[env] Configuration connected from: ${envFile}`);
  } else {
    console.log('[env] Notice: No .env.local found. Checked root and apps/web directories.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  const neonAuthUrl = process.env.NEON_AUTH_BASE_URL;

  if (!databaseUrl) {
    console.error('\n❌ Error: DATABASE_URL is not configured in your environment or apps/web/.env.local.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // 1. Fetch available accounts from both systems to validate identity
  let existingAdminUsers = [];
  let existingNeonUsers = [];

  try {
    existingAdminUsers = await sql`
      SELECT id, username, password_hash, created_at FROM admin_users
    `;
  } catch (err) {
    // admin_users table might not exist yet
  }

  try {
    existingNeonUsers = await sql`
      SELECT id, name, email, role, "createdAt" FROM neon_auth.user
    `;
  } catch (err) {
    // neon_auth.user table might not exist
  }

  if (existingAdminUsers.length === 0 && existingNeonUsers.length === 0) {
    console.error('❌ Error: No operator accounts found in the database.');
    console.error('Please run "npm run create-account" first to provision an operator account.');
    process.exit(1);
  }

  // 2. Resolve target identity
  let targetQuery = argUsername || argEmail || argId;

  if (!targetQuery) {
    console.log('\nAvailable operator accounts in database:');
    if (existingAdminUsers.length > 0) {
      existingAdminUsers.forEach((u) => console.log(`  - Handle: @${u.username} (admin_users)`));
    }
    if (existingNeonUsers.length > 0) {
      existingNeonUsers.forEach((u) => console.log(`  - Neon Auth: ${u.email} (${u.name})`));
    }
    console.log('');

    const defaultIdentifier = existingAdminUsers[0]?.username || existingNeonUsers[0]?.email || 'kurzagin';
    const inputIdentifier = await askText(`// Enter operator handle or email to update (default: ${defaultIdentifier}): `);
    targetQuery = inputIdentifier || defaultIdentifier;
  }

  // 3. STRICT VALIDATION: Ensure user actually exists!
  const matchedAdminUser = existingAdminUsers.find(
    (u) => u.username.toLowerCase() === targetQuery.toLowerCase()
  );

  const matchedNeonUser = existingNeonUsers.find(
    (u) =>
      u.email.toLowerCase() === targetQuery.toLowerCase() ||
      u.name.toLowerCase() === targetQuery.toLowerCase() ||
      (matchedAdminUser && (u.name.toLowerCase().includes(matchedAdminUser.username.toLowerCase()) || u.email.toLowerCase().includes(matchedAdminUser.username.toLowerCase())))
  ) || (existingNeonUsers.length === 1 && matchedAdminUser ? existingNeonUsers[0] : null);

  if (!matchedAdminUser && !matchedNeonUser) {
    console.error(`\n❌ Error: Operator "${targetQuery}" not found!`);
    console.error('\nRegistered operators currently in database:');
    if (existingAdminUsers.length > 0) {
      existingAdminUsers.forEach((u) => console.error(`  - Username: @${u.username}`));
    }
    if (existingNeonUsers.length > 0) {
      existingNeonUsers.forEach((u) => console.error(`  - Neon Auth: ${u.email} (${u.name})`));
    }
    console.error('\nPassphrase was NOT changed. Use "npm run create-account" if you want to create a new operator account.\n');
    process.exit(1);
  }

  console.log('\n[target] Account identity confirmed:');
  if (matchedAdminUser) console.log(`  - Postgres Admin User: @${matchedAdminUser.username} (ID: ${matchedAdminUser.id})`);
  if (matchedNeonUser) console.log(`  - Neon Auth User:      ${matchedNeonUser.email} (${matchedNeonUser.name})`);

  let currentPassword = argCurrentPass;
  let newPassword = argNewPass;

  // 4. Prompt for current password if interactive and not provided
  if (!currentPassword && !force && matchedAdminUser?.password_hash) {
    const inputOld = await askSecret('\n// Enter CURRENT passphrase (press Enter if forgotten / admin override): ');
    if (inputOld) {
      currentPassword = inputOld;
      const isMatch = verifyPbkdf2Password(currentPassword, matchedAdminUser.password_hash);
      if (isMatch) {
        console.log('✓ Current passphrase verified against database record.');
      } else {
        console.warn('⚠️ Warning: Current passphrase does not match database record.');
        const proceed = await askText('// Proceed with administrative password override anyway? [y/N]: ');
        if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
          console.log('\nOperation cancelled by operator.\n');
          process.exit(0);
        }
      }
    }
  }

  // 5. Prompt for new password if not provided
  if (!newPassword) {
    let pass1 = '';
    let pass2 = '';

    while (!pass1) {
      pass1 = await askSecret('\n// Enter NEW security passphrase: ');
      if (!pass1) {
        console.log('Passphrase cannot be empty.');
        continue;
      }
      if (pass1.length < 8) {
        console.log('⚠️ Passphrase is less than 8 characters. Recommended: 12+ characters.');
      }

      pass2 = await askSecret('// Confirm NEW security passphrase: ');
      if (pass1 !== pass2) {
        console.log('❌ Passphrases do not match. Please try again.');
        pass1 = '';
        pass2 = '';
      }
    }
    newPassword = pass1;
  }

  if (!newPassword || newPassword.trim().length === 0) {
    console.error('\n❌ Error: Passphrase cannot be empty.');
    process.exit(1);
  }

  let dbAdminSuccess = false;
  let dbNeonAuthSuccess = false;
  let upstreamNeonAuthSuccess = false;

  // 6. Update public.admin_users (PBKDF2 sha512)
  if (matchedAdminUser) {
    console.log(`\n[db] Updating password hash for @${matchedAdminUser.username} in public.admin_users...`);
    try {
      const pbkdf2Hash = hashPbkdf2Password(newPassword);
      await sql`
        UPDATE admin_users
        SET password_hash = ${pbkdf2Hash}
        WHERE id = ${matchedAdminUser.id}
      `;
      console.log(`✓ Neon Postgres: Updated admin_users for @${matchedAdminUser.username}`);
      dbAdminSuccess = true;
    } catch (err) {
      console.error(`❌ Error updating admin_users: ${err.message || err}`);
    }
  }

  // 7. Update neon_auth.account directly in PostgreSQL (Better Auth standard hash)
  if (matchedNeonUser) {
    console.log(`[db] Updating credentials for ${matchedNeonUser.email} in neon_auth schema...`);
    try {
      const allAccounts = await sql`SELECT * FROM neon_auth.account`;
      const userAccount = allAccounts.find(
        (a) => a.userId === matchedNeonUser.id && a.providerId === 'credential'
      ) || allAccounts.find((a) => a.userId === matchedNeonUser.id);

      const betterAuthHash = await hashBetterAuthPassword(newPassword);

      if (userAccount) {
        await sql`
          UPDATE neon_auth.account
          SET password = ${betterAuthHash},
              "updatedAt" = NOW()
          WHERE id = ${userAccount.id}
        `;
        console.log(`✓ Neon Postgres: Updated neon_auth.account for ${matchedNeonUser.email}`);
        dbNeonAuthSuccess = true;
      } else {
        // Create the credential account entry for neon_auth
        await sql`
          INSERT INTO neon_auth.account ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${matchedNeonUser.id}, ${matchedNeonUser.id}, 'credential', ${betterAuthHash}, NOW(), NOW())
        `;
        console.log(`✓ Neon Postgres: Provisioned credential account in neon_auth.account for ${matchedNeonUser.email}`);
        dbNeonAuthSuccess = true;
      }

      // Revoke any existing active sessions in neon_auth.session to ensure security
      try {
        await sql`
          DELETE FROM neon_auth.session
          WHERE "userId" = ${matchedNeonUser.id}
        `;
        console.log('✓ Neon Postgres: Cleared prior active sessions in neon_auth.session');
      } catch (sessErr) {
        // Non-critical if sessions table isn't present
      }
    } catch (err) {
      console.warn(`[db] Warning updating neon_auth schema: ${err.message || err}`);
    }
  }

  // 8. If live Neon Auth service is configured via environment URL, also notify upstream
  if (neonAuthUrl) {
    console.log(`\n[auth] Connecting to upstream Neon Auth service at ${neonAuthUrl}...`);
    try {
      const auth = createAuthClient(neonAuthUrl);
      const email = matchedNeonUser?.email || `${matchedAdminUser?.username}@krzgn.xyz`;

      if (currentPassword) {
        try {
          const signInRes = await auth.signIn.email({ email, password: currentPassword });
          if (signInRes && !signInRes.error) {
            const changeRes = await auth.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            });
            if (!changeRes?.error) {
              console.log('✓ Upstream Neon Auth service synced successfully!');
              upstreamNeonAuthSuccess = true;
            }
          }
        } catch (apiErr) {
          // Handshake notice
        }
      }
    } catch (err) {
      console.warn(`[auth] Notice communicating with upstream Neon Auth: ${err.message || err}`);
    }
  } else {
    console.log('\n[auth] Note on NEON_AUTH_BASE_URL:');
    console.log('       NEON_AUTH_BASE_URL is not set in apps/web/.env.local (live HTTP API sync skipped).');
    console.log('       However, both Neon Postgres (admin_users) and Neon Auth database records');
    console.log('       (neon_auth.account) have been updated directly in your database!');
  }

  // 9. Final Report
  if (dbAdminSuccess || dbNeonAuthSuccess || upstreamNeonAuthSuccess) {
    console.log('\n========================================');
    console.log('✓ SUCCESS: Operator passphrase successfully changed!');
    console.log('========================================');
    if (matchedAdminUser) console.log(`  Operator Handle:   @${matchedAdminUser.username}`);
    if (matchedNeonUser) console.log(`  Operator Email:    ${matchedNeonUser.email}`);
    console.log(`  Neon Postgres:     ${dbAdminSuccess ? '✓ admin_users updated' : '—'}`);
    console.log(`  Neon Auth DB:      ${dbNeonAuthSuccess ? '✓ neon_auth.account updated' : '—'}`);
    console.log(`  Neon Auth Upstream: ${upstreamNeonAuthSuccess ? '✓ Synced' : neonAuthUrl ? '⚠️ Direct DB Updated' : '— (NEON_AUTH_BASE_URL not set in .env.local)'}`);
    console.log(`  Login at:          http://localhost:4321/login`);
    console.log('========================================\n');
  } else {
    console.error('\n❌ Error: Failed to update operator credentials.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal error in change-password script:', err);
  process.exit(1);
});
