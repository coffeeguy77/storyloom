import { useState, useEffect } from 'react'
import { supabase, type Family, type Character, type Story } from './supabase'

// Generate browser fingerprint for family identification (SSR-safe)
function getBrowserId(): string {
  // Only access localStorage in browser environment
  if (typeof window === 'undefined') {
    // During SSR, return a temporary ID
    return 'ssr_temp_' + Math.random().toString(36).substr(2, 9)
  }
  
  let browserId = localStorage.getItem('storyloom_browser_id')
  if (!browserId) {
    browserId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('storyloom_browser_id', browserId)
  }
  return browserId
}

export function useSupabase() {
  const [family, setFamily] = useState<Family | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [browserId, setBrowserId] = useState<string>('')

  // Initialize browserId in useEffect to avoid SSR issues
  useEffect(() => {
    setBrowserId(getBrowserId())
  }, [])

  // Initialize family and load data
  useEffect(() => {
    if (browserId) {
      initializeFamily()
    }
  }, [browserId])

  const initializeFamily = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Find or create family by browser ID
      let { data: existingFamily, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('browser_id', browserId)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        throw findError
      }

      if (!existingFamily) {
        // Create new family
        const { data: newFamily, error: createError } = await supabase
          .from('families')
          .insert({ 
            name: 'My Family',
            browser_id: browserId 
          })
          .select()
          .single()
        
        if (createError) throw createError
        existingFamily = newFamily
      }

      setFamily(existingFamily)
      
      // Load characters and stories
      await Promise.all([
        loadCharacters(existingFamily.id),
        loadStories(existingFamily.id)
      ])

      // Migrate from localStorage if needed (browser-only)
      if (typeof window !== 'undefined') {
        await migrateFromLocalStorage(existingFamily.id)
      }

    } catch (err) {
      console.error('Failed to initialize family:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize family')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCharacters = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at')
      
      if (error) throw error
      setCharacters(data || [])
    } catch (err) {
      console.error('Failed to load characters:', err)
    }
  }

  const loadStories = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setStories(data || [])
    } catch (err) {
      console.error('Failed to load stories:', err)
    }
  }

  const migrateFromLocalStorage = async (familyId: string) => {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined') return

      const localChars = localStorage.getItem('storyloom_characters')
      const localStories = localStorage.getItem('storyloom_stories')

      if (localChars && characters.length === 0) {
        const chars = JSON.parse(localChars)
        console.log('Migrating characters from localStorage:', chars.length)
        for (const char of chars) {
          await addCharacter(char.name, char.isGuest || false)
        }
        localStorage.removeItem('storyloom_characters')
        console.log('Characters migration completed')
      }

      if (localStories && stories.length === 0) {
        const strs = JSON.parse(localStories)
        console.log('Migrating stories from localStorage:', strs.length)
        for (const story of strs) {
          await addStory({
            title: story.title,
            content: story.content,
            image_url: story.imageUrl,
            theme_id: story.themeId,
            story_type: story.storyType || 'theme',
            user_prompt: story.userPrompt,
            image_prompt: story.imagePrompt,
            characters: story.characters || []
          })
        }
        localStorage.removeItem('storyloom_stories')
        console.log('Stories migration completed')
      }
    } catch (err) {
      console.error('Migration error:', err)
    }
  }

  const addCharacter = async (name: string, isGuest = false) => {
    if (!family) return

    try {
      const { data, error } = await supabase
        .from('characters')
        .insert({ 
          family_id: family.id,
          name: name.trim(),
          is_guest: isGuest 
        })
        .select()
        .single()

      if (error) throw error
      
      if (data) {
        setCharacters(prev => [...prev, data])
      }
    } catch (err) {
      console.error('Failed to add character:', err)
      throw err
    }
  }

  const deleteCharacter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setCharacters(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete character:', err)
      throw err
    }
  }

  const addStory = async (storyData: {
    title: string
    content: string
    image_url: string
    theme_id?: string
    story_type: 'theme' | 'manual' | 'ai'
    user_prompt?: string
    image_prompt?: string
    characters: any[]
  }) => {
    if (!family) return null

    try {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          family_id: family.id,
          ...storyData
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setStories(prev => [data, ...prev])
        return data
      }
      return null
    } catch (err) {
      console.error('Failed to add story:', err)
      throw err
    }
  }

  const deleteStory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setStories(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Failed to delete story:', err)
      throw err
    }
  }

  // Subscribe to real-time changes
  useEffect(() => {
    if (!family) return

    const charactersSubscription = supabase
      .channel('characters')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'characters', 
          filter: `family_id=eq.${family.id}` 
        },
        () => {
          console.log('Characters changed, reloading...')
          loadCharacters(family.id)
        }
      )
      .subscribe()

    const storiesSubscription = supabase
      .channel('stories')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'stories', 
          filter: `family_id=eq.${family.id}` 
        },
        () => {
          console.log('Stories changed, reloading...')
          loadStories(family.id)
        }
      )
      .subscribe()

    return () => {
      charactersSubscription.unsubscribe()
      storiesSubscription.unsubscribe()
    }
  }, [family])

  return {
    family,
    characters,
    stories,
    isLoading,
    error,
    addCharacter,
    deleteCharacter,
    addStory,
    deleteStory,
  }
}
