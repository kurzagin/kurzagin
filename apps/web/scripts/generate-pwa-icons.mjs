import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Next.js "N" logo paths and dimensions (180x180 coordinate space)
const NEXT_GLYPH_PATH = 'M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z';

function createNextSvg({
  size,
  glyphScale = 0.72,
  bgColor = '#0a0a0c',
  fgColor = '#c49368',
  circleBg = '#000000',
  includeOuterBg = true,
  circleBorder = '#2a2a30',
}) {
  const glyphSize = size * glyphScale;
  const offset = (size - glyphSize) / 2;
  const scale = glyphSize / 180;

  const bgRect = includeOuterBg
    ? `<rect width="${size}" height="${size}" fill="${bgColor}" />`
    : '';

  const border = circleBorder
    ? `<circle cx="90" cy="90" r="88" fill="none" stroke="${circleBorder}" stroke-width="${Math.max(1.5, Math.round(180 / 90))}" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgRect}
    <g transform="translate(${offset}, ${offset}) scale(${scale})">
      <mask height="180" id="mask0_${size}" maskUnits="userSpaceOnUse" width="180" x="0" y="0" style="mask-type: alpha;">
        <circle cx="90" cy="90" fill="black" r="90" />
      </mask>
      <g mask="url(#mask0_${size})">
        <circle cx="90" cy="90" fill="${circleBg}" r="90" />
        ${border}
        <path d="${NEXT_GLYPH_PATH}" fill="url(#paint0_${size})" />
        <rect fill="url(#paint1_${size})" height="72" width="12" x="115" y="54" />
      </g>
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint0_${size}" x1="109" x2="144.5" y1="116.5" y2="160.5">
          <stop stop-color="${fgColor}" />
          <stop offset="1" stop-color="${fgColor}" stop-opacity="0" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint1_${size}" x1="121" x2="120.799" y1="54" y2="106.875">
          <stop stop-color="${fgColor}" />
          <stop offset="1" stop-color="${fgColor}" stop-opacity="0" />
        </linearGradient>
      </defs>
    </g>
  </svg>`;
}

function pngsToIco(items) {
  const count = items.length;
  let offset = 6 + 16 * count;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of items) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image byte size
    entry.writeUInt32LE(offset, 12); // Image byte offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...items.map((i) => i.buffer)]);
}

async function generate() {
  console.log('Generating Next.js themed PWA & Favicon icons in:', publicDir);

  const targets = [
    // Standard PWA icons (used for browser UI and PWA launch / flash / splash screen)
    { file: 'pwa-192x192.png', size: 192, glyphScale: 0.72, includeOuterBg: true },
    { file: 'pwa-512x512.png', size: 512, glyphScale: 0.72, includeOuterBg: true },

    // Maskable icons: safe zone requires content within central 80% circle
    { file: 'pwa-maskable-192x192.png', size: 192, glyphScale: 0.60, includeOuterBg: true },
    { file: 'pwa-maskable-512x512.png', size: 512, glyphScale: 0.60, includeOuterBg: true },

    // Apple touch icon (180x180)
    { file: 'apple-touch-icon.png', size: 180, glyphScale: 0.75, includeOuterBg: true },

    // Favicons (crisp standalone circular badges with transparent outer corners)
    { file: 'favicon-32x32.png', size: 32, glyphScale: 0.95, includeOuterBg: false },
    { file: 'favicon-16x16.png', size: 16, glyphScale: 0.95, includeOuterBg: false },
  ];

  for (const target of targets) {
    const svgStr = createNextSvg(target);
    const destPath = path.join(publicDir, target.file);
    await sharp(Buffer.from(svgStr))
      .png({ compressionLevel: 9 })
      .toFile(destPath);
    console.log(`✓ Generated ${target.file} (${target.size}x${target.size})`);
  }

  // Generate multi-resolution favicon.ico (16x16, 32x32, 48x48)
  const icoSvg48 = createNextSvg({ size: 48, glyphScale: 0.95, includeOuterBg: false });
  const b16 = await sharp(path.join(publicDir, 'favicon-16x16.png')).png().toBuffer();
  const b32 = await sharp(path.join(publicDir, 'favicon-32x32.png')).png().toBuffer();
  const b48 = await sharp(Buffer.from(icoSvg48)).png().toBuffer();

  const icoBuffer = pngsToIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Generated favicon.ico (16x16, 32x32, 48x48)');

  // Generate crisp standalone favicon.svg
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none">
  <mask height="180" id="mask0_fav" maskUnits="userSpaceOnUse" width="180" x="0" y="0" style="mask-type: alpha;">
    <circle cx="90" cy="90" fill="black" r="90" />
  </mask>
  <g mask="url(#mask0_fav)">
    <circle cx="90" cy="90" fill="#000000" r="90" />
    <circle cx="90" cy="90" r="88" fill="none" stroke="#2a2a30" stroke-width="2" />
    <path d="${NEXT_GLYPH_PATH}" fill="url(#paint0_fav)" />
    <rect fill="url(#paint1_fav)" height="72" width="12" x="115" y="54" />
  </g>
  <defs>
    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_fav" x1="109" x2="144.5" y1="116.5" y2="160.5">
      <stop stop-color="#c49368" />
      <stop offset="1" stop-color="#c49368" stop-opacity="0" />
    </linearGradient>
    <linearGradient gradientUnits="userSpaceOnUse" id="paint1_fav" x1="121" x2="120.799" y1="54" y2="106.875">
      <stop stop-color="#c49368" />
      <stop offset="1" stop-color="#c49368" stop-opacity="0" />
    </linearGradient>
  </defs>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
  console.log('✓ Updated favicon.svg');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
