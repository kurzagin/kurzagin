#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execute the web package setup-r2-cors script
import(path.resolve(__dirname, '../apps/web/scripts/setup-r2-cors.mjs'));
