#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

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

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('\x1b[31m[!] Missing Cloudflare R2 credentials in environment.\x1b[0m');
  console.error('Please ensure the following environment variables are set in .env.local:');
  console.error('  R2_ACCOUNT_ID');
  console.error('  R2_ACCESS_KEY_ID');
  console.error('  R2_SECRET_ACCESS_KEY');
  console.error('  R2_BUCKET_NAME');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ],
};

console.log(`\x1b[36m// Configuring CORS for Cloudflare R2 bucket: "${bucketName}"...\x1b[0m`);

try {
  await s3Client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    })
  );
  console.log('\x1b[32m✓ Successfully configured CORS policy on R2 bucket!\x1b[0m');
  console.log('  Allowed Origins: *');
  console.log('  Allowed Methods: GET, PUT, POST, HEAD, DELETE');
  console.log('  Allowed Headers: *');
  console.log('  Expose Headers:  ETag');

  try {
    await s3Client.send(
      new GetBucketCorsCommand({
        Bucket: bucketName,
      })
    );
    console.log('\x1b[32m✓ CORS configuration verified active on bucket.\x1b[0m');
  } catch {}
  console.log('\x1b[32mDirect browser audio uploads to Cloudflare R2 are now enabled.\x1b[0m');
} catch (err) {
  console.error('\x1b[31m[!] Failed to set CORS policy:\x1b[0m', err.message);
  process.exit(1);
}
