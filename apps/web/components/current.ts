export type NavCurrent = 'home' | 'music' | 'gallery' | 'anime' | 'games' | 'profile' | 'settings';

/** Maps a pathname to the section highlighted in the navigation (mirrors the old per-page `current` prop). */
export function getCurrent(pathname: string | null): NavCurrent {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  if (p === '/music') return 'music';
  if (p === '/gallery') return 'gallery';
  if (p === '/anime') return 'anime';
  if (p === '/games') return 'games';
  if (p === '/profile') return 'profile';
  if (p === '/settings') return 'settings';
  return 'home';
}
