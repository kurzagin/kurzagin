import { pgTable, uuid, text, varchar, integer, boolean, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

// 1. Admin Users Table (Neon Auth backend / operator credentials)
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique('admin_users_username_key'),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 1b. Global retro-style page hit counter
export const siteStats = pgTable('site_stats', {
  id: integer('id').primaryKey().default(1),
  total_visits: integer('total_visits').notNull().default(0),
});

export type SiteStats = typeof siteStats.$inferSelect;
export type NewSiteStats = typeof siteStats.$inferInsert;

export interface AnimePostMeta {
  anilist_id?: number;
  anime_id?: string;
  title?: string;
  romaji_title?: string;
  cover_url?: string;
  episode?: number | null;
  score?: number | null;
  review_type?: string;
  has_spoilers?: boolean;
}

// 2. Posts Table (Personal microblog entries)
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    content: text('content').notNull(),
    author_name: varchar('author_name', { length: 50 }).default('Kur Zagin').notNull(),
    author_handle: varchar('author_handle', { length: 50 }).default('@kurzagin').notNull(),
    category: varchar('category', { length: 50 }).default('text').notNull(), // 'text' | 'media' | 'anime'
    anime_meta: jsonb('anime_meta').$type<AnimePostMeta>(),
    has_media: boolean('has_media').default(false).notNull(),
    likes_count: integer('likes_count').default(0).notNull(),
    reposts_count: integer('reposts_count').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_posts_created_at').on(table.created_at.desc()),
    index('idx_posts_has_media').on(table.has_media, table.created_at.desc()),
    index('idx_posts_category').on(table.category, table.created_at.desc()),
  ]
);

// 2b. Post Media Table (Images & visual attachments categorized as media)
export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    post_id: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 50 }).default('media').notNull(), // categorized as 'media'
    media_type: varchar('media_type', { length: 50 }).default('image').notNull(), // 'image'
    url: text('url').notNull(),
    alt_text: text('alt_text'),
    width: integer('width'),
    height: integer('height'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_post_media_post_id').on(table.post_id),
    index('idx_post_media_category').on(table.category, table.created_at.desc()),
  ]
);

// 3. Comments Table (Public comments: Guest vs Named)
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    post_id: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parent_comment_id: uuid('parent_comment_id'),
    author_name: varchar('author_name', { length: 50 }).default('guest').notNull(),
    content: text('content').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_comments_post_id').on(table.post_id, table.created_at.asc()),
    index('idx_comments_parent_id').on(table.parent_comment_id, table.created_at.asc()),
  ]
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type PostMedia = typeof postMedia.$inferSelect;
export type NewPostMedia = typeof postMedia.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

// 4. Tracks Table (Audio playlist entries with Opus stream & AVIF vinyl center / album art)
export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    artist: varchar('artist', { length: 255 }).notNull(),
    album: varchar('album', { length: 255 }),
    audio_url: text('audio_url').notNull(),
    cover_url: text('cover_url'),
    duration: varchar('duration', { length: 20 }).default('0:00'),
    duration_sec: integer('duration_sec').default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_tracks_created_at').on(table.created_at.desc()),
  ]
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

// 5. Post Likes Table (IP-gated 1 time only)
export const postLikes = pgTable(
  'post_likes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    post_id: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ip_hash: varchar('ip_hash', { length: 64 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_post_likes_post_ip').on(table.post_id, table.ip_hash),
    index('idx_post_likes_post_id').on(table.post_id),
    index('idx_post_likes_ip_hash').on(table.ip_hash),
  ]
);

export type PostLike = typeof postLikes.$inferSelect;
export type NewPostLike = typeof postLikes.$inferInsert;

// 6. Profiles Table (Operator persona, bio, projects, stack, social media & contact)
export interface ProjectEntry {
  title: string;
  description: string;
  url?: string;
  badge?: string; // e.g. "Active", "WIP", "Archive", "Experimental"
}

export interface SocialLinkEntry {
  platform: string; // e.g. "Website", "VXNUS Studio", "GitHub", "X", "Bluesky", "Telegram", "Discord"
  label: string;
  url: string;
}

export interface ContactDetailEntry {
  method: string; // e.g. "Email", "Direct Message", "GitHub Discussions", "PGP Key", "Matrix"
  value: string;
  link?: string;
}

export const profiles = pgTable('profiles', {
  id: varchar('id', { length: 50 }).primaryKey().default('default'),
  name: varchar('name', { length: 100 }).notNull().default('Kur Zagin 𒀭𒆳𒍝𒆳'),
  handle: varchar('handle', { length: 50 }).notNull().default('@kurzagin'),
  headline: text('headline').default('System architect, solo developer, and builder of strange but useful things.'),
  bio: text('bio').default('I design products where software, knowledge systems, AI, and immersive interfaces overlap.\n\nMy work usually begins with a small irritation:\n> “Why is this still difficult?”\n\nThen I build the tool I wish already existed.'),
  avatar_url: text('avatar_url'),
  banner_url: text('banner_url'),
  theme: varchar('theme', { length: 50 }).notNull().default('default'),
  location: varchar('location', { length: 100 }).default('35.6614° N, 139.6681° E'),
  status_message: varchar('status_message', { length: 255 }).default('building tools I wish already existed'),
  currently_building: jsonb('currently_building').$type<ProjectEntry[]>().default([
    {
      title: 'Siduri',
      description: 'An AI companion and knowledge layer designed to understand applications without becoming tightly coupled to them',
      url: 'https://github.com/vxnus-studio/siduri-x',
      badge: 'Active',
    },
    {
      title: 'e-teyvat',
      description: 'A structured and immersive Genshin Impact knowledge platform 🎐',
      url: 'https://github.com/vxnus-studio/e-teyvat',
      badge: 'Active',
    },
    {
      title: 'Experimental Creator Tools',
      description: 'Tools for creators, media workflows, archives, and versioned knowledge',
      url: 'https://github.com/kurzagin/kurzagin-archive',
      badge: 'Archive',
    }
  ]).notNull(),
  tech_stack: jsonb('tech_stack').$type<string[]>().default([
    'TypeScript',
    'JavaScript',
    'Python',
    'Rust',
    'Next.js',
    'React',
    'Astro',
    'PostgreSQL',
    'AI workflows',
    'System architecture',
  ]).notNull(),
  social_links: jsonb('social_links').$type<SocialLinkEntry[]>().default([
    { platform: 'Website', label: 'krzgn.xyz', url: 'https://krzgn.xyz' },
    { platform: 'VXNUS Studio', label: 'vxnus.xyz', url: 'https://vxnus.xyz' },
    { platform: 'GitHub', label: '@vxnus-studio', url: 'https://github.com/vxnus-studio' },
    { platform: 'X', label: '@kurzagin', url: 'https://x.com/kurzagin' },
  ]).notNull(),
  contact_email: varchar('contact_email', { length: 255 }).default('venus@krzgn.xyz'),
  contact_details: jsonb('contact_details').$type<ContactDetailEntry[]>().default([
    { method: 'Email', value: 'venus@krzgn.xyz', link: 'mailto:venus@krzgn.xyz' },
    { method: 'GitHub Discussions', value: 'vxnus-studio', link: 'https://github.com/vxnus-studio' },
    { method: 'Direct Message', value: '@kurzagin on X', link: 'https://x.com/kurzagin' },
  ]).notNull(),
  contact_note: text('contact_note').default('Ideas, feedback, technical conversations, and unusual collaborations are welcome ✨'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// 7. Anime Watchlist Table (custom MAL-like list integrated with AniList)
export const animeWatchlist = pgTable(
  'anime_watchlist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    anilist_id: integer('anilist_id').notNull().unique('anime_watchlist_anilist_id_key'),
    title: varchar('title', { length: 255 }).notNull(),
    romaji_title: varchar('romaji_title', { length: 255 }),
    native_title: varchar('native_title', { length: 255 }),
    cover_url: text('cover_url'),
    banner_url: text('banner_url'),
    format: varchar('format', { length: 50 }).default('TV'),
    status: varchar('status', { length: 50 }).default('watching').notNull(), // 'watching' | 'completed' | 'rewatching' | 'paused' | 'dropped' | 'planning'
    current_episode: integer('current_episode').default(0).notNull(),
    total_episodes: integer('total_episodes'),
    score: integer('score'), // 1-10
    genres: jsonb('genres').$type<string[]>().default([]).notNull(),
    studio: varchar('studio', { length: 255 }),
    season_year: integer('season_year'),
    summary: text('summary'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_anime_watchlist_status').on(table.status),
    index('idx_anime_watchlist_updated_at').on(table.updated_at.desc()),
  ]
);

export type AnimeWatchlistItem = typeof animeWatchlist.$inferSelect;
export type NewAnimeWatchlistItem = typeof animeWatchlist.$inferInsert;

// 8. Anime Reviews Table (Episodic logs & staged reviews e.g. Ep 10 mid-watch, first impression, final)
export const animeReviews = pgTable(
  'anime_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    anime_id: uuid('anime_id')
      .notNull()
      .references(() => animeWatchlist.id, { onDelete: 'cascade' }),
    episode: integer('episode'), // e.g. 10, or null if entire series
    review_type: varchar('review_type', { length: 50 }).default('mid_watch').notNull(), // 'first_impression' | 'episodic' | 'mid_watch' | 'final' | 'dropped' | 'rewatch'
    content: text('content').notNull(),
    rating: integer('rating'), // 1-10
    has_spoilers: boolean('has_spoilers').default(false).notNull(),
    share_to_feed: boolean('share_to_feed').default(false).notNull(),
    post_id: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_anime_reviews_anime_id').on(table.anime_id, table.created_at.desc()),
    index('idx_anime_reviews_review_type').on(table.review_type),
  ]
);

export type AnimeReview = typeof animeReviews.$inferSelect;
export type NewAnimeReview = typeof animeReviews.$inferInsert;

// 10. Gallery Items Table (Dedicated imageboard / visual fragments)
export const galleryItems = pgTable(
  'gallery_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }),
    caption: text('caption'),
    url: text('url').notNull(),
    alt_text: text('alt_text'),
    width: integer('width'),
    height: integer('height'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    is_nsfw: boolean('is_nsfw').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_gallery_items_created_at').on(table.created_at.desc()),
    index('idx_gallery_items_is_nsfw').on(table.is_nsfw),
  ]
);

export type GalleryItem = typeof galleryItems.$inferSelect;
export type NewGalleryItem = typeof galleryItems.$inferInsert;

// 11. Media Assets Registry (Track all uploaded media, active vs detached ghost files)
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique('idx_media_assets_key'),
    url: text('url').notNull().unique('idx_media_assets_url'),
    storage: varchar('storage', { length: 20 }).default('r2').notNull(), // 'r2' | 'local' | 'external'
    media_type: varchar('media_type', { length: 50 }).default('image').notNull(), // 'banner' | 'avatar' | 'cover' | 'track' | 'post_image' | 'gallery'
    status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'detached' | 'deleted'
    size_bytes: integer('size_bytes'),
    mime_type: varchar('mime_type', { length: 100 }),
    detached_at: timestamp('detached_at', { withTimezone: true }),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_media_assets_status').on(table.status),
    index('idx_media_assets_media_type').on(table.media_type),
    index('idx_media_assets_created_at').on(table.created_at.desc()),
  ]
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
