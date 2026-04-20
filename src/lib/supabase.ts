import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Family {
  id: string
  name: string
  browser_id: string
  created_at: string
}

export interface Character {
  id: string
  family_id: string
  name: string
  is_guest: boolean
  created_at: string
}

export interface Story {
  id: string
  family_id: string
  title: string
  content: string
  image_url: string
  theme_id?: string
  story_type: 'theme' | 'manual' | 'ai'
  user_prompt?: string
  image_prompt?: string
  characters: any[]
  created_at: string
}
