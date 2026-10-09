CREATE TABLE IF NOT EXISTS wiki_visual_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_slug VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  entry_slug VARCHAR(160) NOT NULL,
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wiki_visual_references_entry
  ON wiki_visual_references(novel_slug, category, entry_slug);
