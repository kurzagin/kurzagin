'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fires a `app:page-load` DOM event after every client-side route change (and the initial load).
 * Legacy shared scripts (public/main.js) hook into it, replacing Astro's `astro:page-load`.
 */
export default function RouteEvents() {
  const pathname = usePathname();
  useEffect(() => {
    const t = window.setTimeout(() => document.dispatchEvent(new Event('app:page-load')), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}
