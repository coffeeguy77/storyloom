-- StoryLoom Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable RLS (Row Level Security) - important for data protection
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Families table - one per browser/device
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Family',
  browser_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Characters table - family members and guests
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table - all generated stories
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  theme_id TEXT,
  story_type TEXT DEFAULT 'theme' CHECK (story_type IN ('theme', 'manual', 'ai')),
  user_prompt TEXT,
  image_prompt TEXT,
  characters JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're not using auth yet)
-- These allow all operations on all tables

-- Families policies
CREATE POLICY "Allow all operations on families" 
ON families FOR ALL 
USING (true);

-- Characters policies
CREATE POLICY "Allow all operations on characters" 
ON characters FOR ALL 
USING (true);

-- Stories policies  
CREATE POLICY "Allow all operations on stories" 
ON stories FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_families_browser_id ON families(browser_id);
CREATE INDEX IF NOT EXISTS idx_characters_family_id ON characters(family_id);
CREATE INDEX IF NOT EXISTS idx_stories_family_id ON stories(family_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- Insert a test family (optional - you can remove this)
-- INSERT INTO families (name, browser_id) VALUES ('Test Family', 'test_browser_123');

-- Grant permissions to anon role (this allows public access)
GRANT ALL ON families TO anon;
GRANT ALL ON characters TO anon;
GRANT ALL ON stories TO anon;

-- Grant permissions to authenticated role (for future auth)
GRANT ALL ON families TO authenticated;
GRANT ALL ON characters TO authenticated;
GRANT ALL ON stories TO authenticated;
