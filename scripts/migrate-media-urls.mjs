#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execute web package migrate-media-urls script
import(path.resolve(__dirname, '../apps/web/scripts/migrate-media-urls.mjs'));
