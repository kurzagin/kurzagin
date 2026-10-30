export interface ToolDefinition {
  slug: string;
  name: string;
  nameJp?: string;
  tagline: string;
  description: string;
  category: 'web' | 'text' | 'security' | 'utility';
  status: 'operational' | 'beta';
  badge?: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: 'link-cleaner',
    name: 'Link Cleaner',
    nameJp: 'リンク整形',
    tagline: 'Strip tracking parameters and clean bloated URLs',
    description: 'Instant privacy utility that strips affiliate tags, UTM analytics, tracking tokens (fbclid, gclid, si, igsh, etc.), and normalizes URLs cleanly in your browser.',
    category: 'web',
    status: 'operational',
    badge: 'Privacy',
  },
  {
    slug: 'qr-generator',
    name: 'QR Code Generator',
    nameJp: 'QRコード生成',
    tagline: 'Instant offline QR code generator with download',
    description: 'Generate clean QR codes for links, plain text, WiFi networks, and contacts. 100% client-side with SVG/PNG download support.',
    category: 'utility',
    status: 'operational',
    badge: 'Offline',
  },
  {
    slug: 'word-counter',
    name: 'Word & Character Counter',
    nameJp: '文字数カウント',
    tagline: 'Live text stats, reading time & social media limits',
    description: 'Calculate characters, words, sentences, reading time, and check against limits for Twitter/X, Instagram, Discord, and LinkedIn.',
    category: 'text',
    status: 'operational',
    badge: 'Realtime',
  },
  {
    slug: 'case-converter',
    name: 'Case Converter',
    nameJp: '大文字小文字変換',
    tagline: 'Transform text case, fix spacing and clean text',
    description: 'Quickly switch between Title Case, UPPERCASE, lowercase, sentence case, camelCase, snake_case, and remove redundant whitespace.',
    category: 'text',
    status: 'operational',
    badge: 'Utility',
  },
  {
    slug: 'image-converter',
    name: 'Image Converter & Resizer',
    nameJp: '画像変換・縮小',
    tagline: 'Convert images to WebP, PNG, JPEG & resize offline',
    description: 'Private client-side image converter. Adjust dimensions, change format, reduce file size for uploads with zero server transmission.',
    category: 'utility',
    status: 'operational',
    badge: 'Client Only',
  },
  {
    slug: 'timer',
    name: 'Focus Timer & Countdown',
    nameJp: 'タイマー・秒読み',
    tagline: 'Pomodoro focus timer, stopwatch & event countdown',
    description: 'Distraction-free timer for deep focus work, quick intervals, or counting down to specific deadlines and release dates.',
    category: 'utility',
    status: 'operational',
    badge: 'Minimal',
  },
  {
    slug: 'random-picker',
    name: 'Random Decision Picker',
    nameJp: 'ランダム決定機',
    tagline: 'Pick from custom list, flip coin & roll dice',
    description: 'Instant decision maker. Shuffle and choose random items from a custom list, flip a binary coin, or roll virtual dice.',
    category: 'utility',
    status: 'operational',
    badge: 'Fair',
  },
  {
    slug: 'password-generator',
    name: 'Password & PIN Generator',
    nameJp: 'パスワード生成',
    tagline: 'Cryptographically secure random passwords and PINs',
    description: 'Generate strong uncrackable passwords, memorable passphrases, or quick PINs. Runs strictly in-memory using crypto.getRandomValues. Not stored anywhere.',
    category: 'security',
    status: 'operational',
    badge: 'Not Stored',
  },
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
