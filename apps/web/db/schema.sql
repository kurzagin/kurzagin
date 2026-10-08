-- ============================================================
-- kurzagin — Neon Database Schema
-- Run this in the Neon Console SQL Editor or via migration
-- ============================================================

-- 1. Admin Users Table (Neon Auth backend)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global retro-style page hit counter
CREATE TABLE IF NOT EXISTS site_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_visits INT NOT NULL DEFAULT 0
);

-- 2. Posts Table (Personal microblog entries)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_name VARCHAR(50) NOT NULL DEFAULT 'Kur Zagin',
  author_handle VARCHAR(50) NOT NULL DEFAULT '@kurzagin',
  likes_count INT NOT NULL DEFAULT 0,
  reposts_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Comments Table (Public comments: Guest vs Named)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_name VARCHAR(50) NOT NULL DEFAULT 'guest',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries on Vercel Serverless
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);

-- 4. Post Likes Table (IP-gated likes)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_post_likes_post_ip UNIQUE (post_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_ip_hash ON post_likes(ip_hash);

-- 5. Post Media Table (AVIF / images attached to posts)
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'media',
  media_type VARCHAR(50) NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  alt_text TEXT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_category ON post_media(category, created_at DESC);

-- 6. Tracks Table (Audio playlist entries)
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration VARCHAR(20) DEFAULT '0:00',
  duration_sec INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);

-- 7. Profiles Table (Operator persona, bio, projects, stack, social media & contact)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  name VARCHAR(100) NOT NULL DEFAULT 'Kur Zagin 𒀭𒆳𒍝𒆳',
  handle VARCHAR(50) NOT NULL DEFAULT '@kurzagin',
  headline TEXT DEFAULT 'System architect, solo developer, and builder of strange but useful things.',
  bio TEXT DEFAULT 'I design products where software, knowledge systems, AI, and immersive interfaces overlap.',
  avatar_url TEXT,
  banner_url TEXT,
  location VARCHAR(100) DEFAULT '35.6614° N, 139.6681° E',
  status_message VARCHAR(255) DEFAULT 'building tools I wish already existed',
  currently_building JSONB NOT NULL DEFAULT '[]'::jsonb,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_email VARCHAR(255) DEFAULT 'venus@krzgn.xyz',
  contact_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_note TEXT DEFAULT 'Ideas, feedback, technical conversations, and unusual collaborations are welcome ✨',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add category and anime_meta to posts table if not present
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'text';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS anime_meta JSONB;
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category, created_at DESC);

-- 8. Anime Watchlist Table (custom MAL-like list integrated with AniList)
CREATE TABLE IF NOT EXISTS anime_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anilist_id INT UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  romaji_title VARCHAR(255),
  native_title VARCHAR(255),
  cover_url TEXT,
  banner_url TEXT,
  format VARCHAR(50) DEFAULT 'TV',
  status VARCHAR(50) NOT NULL DEFAULT 'watching',
  current_episode INT NOT NULL DEFAULT 0,
  total_episodes INT,
  score INT,
  genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  studio VARCHAR(255),
  season_year INT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anime_watchlist_status ON anime_watchlist(status);
CREATE INDEX IF NOT EXISTS idx_anime_watchlist_updated_at ON anime_watchlist(updated_at DESC);

-- 9. Anime Reviews Table (Episodic logs & staged reviews e.g. Ep 10 mid-watch, first impression, final)
CREATE TABLE IF NOT EXISTS anime_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID NOT NULL REFERENCES anime_watchlist(id) ON DELETE CASCADE,
  episode INT,
  review_type VARCHAR(50) NOT NULL DEFAULT 'mid_watch',
  content TEXT NOT NULL,
  rating INT,
  has_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
  share_to_feed BOOLEAN NOT NULL DEFAULT FALSE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anime_reviews_anime_id ON anime_reviews(anime_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anime_reviews_review_type ON anime_reviews(review_type);

-- 10. Gallery Items Table (Dedicated imageboard / polaroids)
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  caption TEXT,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INT,
  height INT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at ON gallery_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_is_nsfw ON gallery_items(is_nsfw);
