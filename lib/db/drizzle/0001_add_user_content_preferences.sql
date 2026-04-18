-- Migration: Add content preference columns to users table
-- These columns support the Personal AI Memory System feature

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "niche" text,
  ADD COLUMN IF NOT EXISTS "tone_preference" text,
  ADD COLUMN IF NOT EXISTS "platform_preference" text;
