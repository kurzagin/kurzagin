#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execute the web package change-password script
import(path.resolve(__dirname, '../apps/web/scripts/change-password.mjs'));
