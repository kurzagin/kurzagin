ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "theme" varchar(50) DEFAULT 'default' NOT NULL;
