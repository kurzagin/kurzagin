import { defineConfig } from 'drizzle-kit';
import fs from 'node:fs';
import path from 'node:path';

// Automatically load DATABASE_URL from .env.local if not already set
if (!process.env.DATABASE_URL) {
  const envCandidates = ['.env.local', '../.env.local', '.env', '../.env'];
  for (const file of envCandidates) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (key === 'DATABASE_URL') {
              process.env.DATABASE_URL = val;
              break;
            }
          }
        }
      }
      if (process.env.DATABASE_URL) break;
    }
  }
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
