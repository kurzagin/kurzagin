#!/usr/bin/env node

/**
 * kurzagin.log — Local Audio to Opus Converter
 * Uses ffmpeg + libopus for high-fidelity music streaming.
 *
 * Usage:
 *   node scripts/opus-converter.mjs                 # Batch converts all files in assets/music/
 *   node scripts/opus-converter.mjs <file>          # Converts a single audio file
 *   node scripts/opus-converter.mjs --bitrate 192k  # Custom bitrate (default: 160k)
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_INPUT_DIR = path.join(rootDir, 'assets', 'music');
const DEFAULT_OUTPUT_DIR = path.join(rootDir, 'assets', 'music', 'converted');
const SUPPORTED_EXTS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.aiff', '.alac']);

// Parse command line arguments
const args = process.argv.slice(2);
let bitrate = '160k';
let specificFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--bitrate' && args[i + 1]) {
    bitrate = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    specificFile = args[i];
  }
}

function printBanner() {
  console.log('\n\x1b[38;2;196;147;104m// OPUS TRANSLATOR — KURZAGIN AUDIO ENGINE\x1b[0m');
  console.log('\x1b[90m--------------------------------------------------\x1b[0m');
}

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('\x1b[31m[!] Error: ffmpeg is not found on your system.\x1b[0m');
    console.error('Please install ffmpeg:');
    console.error('  - Ubuntu/Debian: sudo apt update && sudo apt install -y ffmpeg');
    console.error('  - macOS: brew install ffmpeg');
    console.error('  - Arch: sudo pacman -S ffmpeg\n');
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function convertFile(inputPath, outputPath, targetBitrate) {
  return new Promise((resolve, reject) => {
    const inputStat = fs.statSync(inputPath);
    const fileName = path.basename(inputPath);

    console.log(`\x1b[36m▶ Converting:\x1b[0m ${fileName} (${formatBytes(inputStat.size)})`);

    const ffmpegArgs = [
      '-y',                     // Overwrite output if exists
      '-i', inputPath,          // Input file
      '-c:a', 'libopus',        // Opus codec
      '-b:a', targetBitrate,    // Bitrate
      '-vbr', 'on',             // Variable bitrate
      '-compression_level', '10', // Max algorithmic compression efficiency
      '-application', 'audio',  // Full-bandwidth music mode (not speech)
      outputPath,
    ];

    const startTime = Date.now();
    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0 && fs.existsSync(outputPath)) {
        const outStat = fs.statSync(outputPath);
        const ratio = ((1 - outStat.size / inputStat.size) * 100).toFixed(1);
        const sign = ratio >= 0 ? `-${ratio}%` : `+${Math.abs(ratio)}%`;

        console.log(`  \x1b[32m✓ Finished:\x1b[0m ${path.basename(outputPath)} (${formatBytes(outStat.size)} | \x1b[33m${sign}\x1b[0m | ${elapsed}s)`);
        resolve(true);
      } else {
        console.error(`  \x1b[31m✗ Conversion failed for ${fileName}\x1b[0m`);
        console.error(stderr.slice(-300));
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      console.error(`  \x1b[31m✗ Process error:\x1b[0m ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  printBanner();

  if (!checkFfmpeg()) {
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(DEFAULT_OUTPUT_DIR)) {
    fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
  }

  console.log(`// Target Bitrate: \x1b[33m${bitrate}\x1b[0m (Opus VBR, music profile)`);
  console.log(`// Destination:    \x1b[90m${path.relative(rootDir, DEFAULT_OUTPUT_DIR)}/\x1b[0m\n`);

  if (specificFile) {
    const inputPath = path.resolve(process.cwd(), specificFile);
    if (!fs.existsSync(inputPath)) {
      console.error(`\x1b[31m[!] Error: File not found: ${inputPath}\x1b[0m`);
      process.exit(1);
    }
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(DEFAULT_OUTPUT_DIR, `${baseName}.opus`);
    await convertFile(inputPath, outputPath, bitrate);
  } else {
    // Scan assets/music for source files
    if (!fs.existsSync(DEFAULT_INPUT_DIR)) {
      fs.mkdirSync(DEFAULT_INPUT_DIR, { recursive: true });
    }

    const allFiles = fs.readdirSync(DEFAULT_INPUT_DIR);
    const audioFiles = allFiles.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTS.has(ext);
    });

    if (audioFiles.length === 0) {
      console.log(`\x1b[33m[!] No audio files found in ${path.relative(rootDir, DEFAULT_INPUT_DIR)}/\x1b[0m`);
      console.log('Drop your .mp3, .wav, .flac, or .m4a files into assets/music/ and run:');
      console.log('  \x1b[36mnpm run convert:opus\x1b[0m\n');
      return;
    }

    console.log(`// Discovered \x1b[32m${audioFiles.length}\x1b[0m source audio file(s):\n`);

    let successCount = 0;
    for (const file of audioFiles) {
      const inputPath = path.join(DEFAULT_INPUT_DIR, file);
      const baseName = path.basename(file, path.extname(file));
      const outputPath = path.join(DEFAULT_OUTPUT_DIR, `${baseName}.opus`);

      const ok = await convertFile(inputPath, outputPath, bitrate);
      if (ok) successCount++;
    }

    console.log('\n\x1b[90m--------------------------------------------------\x1b[0m');
    console.log(`// Batch complete: \x1b[32m${successCount}/${audioFiles.length}\x1b[0m file(s) converted to Opus.`);
    console.log(`// Ready to upload via \x1b[36m/music\x1b[0m turntable console.\n`);
  }
}

main().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err);
  process.exit(1);
});
