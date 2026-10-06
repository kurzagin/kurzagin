import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import Nav from '@/components/Nav';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import RouteEvents from '@/components/RouteEvents';

export const metadata: Metadata = {
  metadataBase: new URL('https://kurzagin.com'),
  title: 'kurzagin',
  description: 'System architect, solo developer, and builder of strange but useful things.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kur Zagin',
  },
  applicationName: 'Kur Zagin',
  other: {
    'msapplication-TileColor': '#0a0a0c',
    'msapplication-TileImage': '/pwa-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: [
    { color: '#0a0a0c' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0c' },
  ],
};

const SW_REGISTER = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        try { reg.update(); } catch (_) {}
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New update available.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* PERSISTENT GLOBAL AUDIO HOST (root layout never unmounts on navigation) */}
        <div id="globalAudioHost" style={{ display: 'none' }}>
          <audio id="globalPersistentAudio" preload="metadata"></audio>
        </div>

        <Nav />

        <div className="page">
          <div className="main">{children}</div>
          <Sidebar />
        </div>

        <Footer />

        <MobileNav />

        <RouteEvents />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
        <Script src="/main.js?v=2.0.6" strategy="afterInteractive" />
      </body>
    </html>
  );
}
