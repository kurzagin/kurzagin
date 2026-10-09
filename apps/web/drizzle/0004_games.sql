CREATE TABLE IF NOT EXISTS "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(120) NOT NULL UNIQUE,
  "title" varchar(255) NOT NULL,
  "summary" text,
  "cover_url" text,
  "meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "game_id" uuid REFERENCES "games"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_posts_game_id" ON "posts"("game_id", "created_at" DESC);
