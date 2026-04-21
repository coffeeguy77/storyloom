// src/lib/useSupabase.ts
//
// Rewritten to use React Context so state is shared across every component
// that calls useSupabase(). Public shape unchanged — same fields, same
// methods, same signatures. Existing call sites work without modification.
//
// The one thing callers must do: wrap their tree in <SupabaseProvider> once,
// at the root. See page.tsx integration note.

"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js"

// ---------- Types (unchanged from previous version) -------------------------
export type Family = {
  id: string
  user_id: string
  name: string
  created_at?: string
}

export type CharacterRow = {
  id: string
  family_id: string
  name: string
  is_guest: boolean
  created_at?: string
}

export type StoryRow = {
  id: string
  family_id: string
  title: string
  content: string
  image_url: string
  theme_id: string | null
  story_type: "theme" | "manual" | "ai"
  user_prompt: string | null
  image_prompt: string | null
  characters: Array<{ id?: string; name: string; isGuest?: boolean }>
  created_at: string
}

export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
}

export type NewStoryInput = {
  title: string
  content: string
  image_url: string
  theme_id?: string
  story_type: "theme" | "manual" | "ai"
  user_prompt?: string
  image_prompt?: string
  characters: Array<{ id?: string; name: string; isGuest?: boolean }>
}

// ---------- Context shape ---------------------------------------------------
type SupabaseContextValue = {
  client: SupabaseClient | null
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  authLoading: boolean

  family: Family | null
  characters: CharacterRow[]
  stories: StoryRow[]
  isLoading: boolean
  error: string | null

  signUp: (email: string, password: string, displayName: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>

  createFamily: (name: string) => Promise<Family>
  renameFamily: (newName: string) => Promise<void>

  addCharacter: (name: string, isGuest: boolean) => Promise<CharacterRow>
  deleteCharacter: (id: string) => Promise<void>
  addStory: (input: NewStoryInput) => Promise<StoryRow | null>
  deleteStory: (id: string) => Promise<void>
  reload: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

// ---------- Singleton client -----------------------------------------------
let _client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error("Supabase env vars missing")
    return null
  }
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return _client
}

// ---------- Provider --------------------------------------------------------
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [family, setFamily] = useState<Family | null>(null)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [stories, setStories] = useState<StoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = profile?.is_admin ?? false

  useEffect(() => {
    const c = getClient()
    setClient(c)
    if (!c) { setAuthLoading(false); setIsLoading(false); return }

    c.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: sub } = c.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
      setUser(newSession?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadEverything = useCallback(async () => {
    if (!client || !user) return
    setIsLoading(true); setError(null)
    try {
      const { data: prof, error: profErr } = await client
        .from("profiles").select("id, display_name, is_admin").eq("id", user.id).maybeSingle()
      if (profErr) throw profErr
      setProfile(prof ?? null)

      const { data: fams, error: famErr } = await client
        .from("families").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1)
      if (famErr) throw famErr
      const fam = fams?.[0] ?? null
      setFamily(fam)

      if (!fam) {
        setCharacters([]); setStories([])
        setIsLoading(false)
        return
      }

      const [chRes, stRes] = await Promise.all([
        client.from("characters").select("*").eq("family_id", fam.id).order("created_at"),
        client.from("stories").select("*").eq("family_id", fam.id).order("created_at", { ascending: false }),
      ])
      if (chRes.error) throw chRes.error
      if (stRes.error) throw stRes.error
      setCharacters((chRes.data as CharacterRow[]) ?? [])
      setStories((stRes.data as StoryRow[]) ?? [])
    } catch (e: any) {
      console.error("SupabaseProvider.loadEverything:", e)
      setError(e?.message ?? "Failed to load your library")
    } finally {
      setIsLoading(false)
    }
  }, [client, user])

  useEffect(() => {
    if (!client) return
    if (!user) {
      setProfile(null); setFamily(null); setCharacters([]); setStories([])
      setIsLoading(false); setError(null)
      return
    }
    void loadEverything()
  }, [client, user?.id, loadEverything])

  // ---------- Auth ----------------------------------------------------------
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (!client) throw new Error("Not ready")
    const { data, error } = await client.auth.signUp({
      email, password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    })
    if (error) throw error
    return data
  }, [client])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) throw new Error("Not ready")
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) return
    await client.auth.signOut()
  }, [client])

  const resetPassword = useCallback(async (email: string) => {
    if (!client) throw new Error("Not ready")
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    })
    if (error) throw error
  }, [client])

  // ---------- Family --------------------------------------------------------
  const createFamily = useCallback(async (name: string) => {
    if (!client || !user) throw new Error("Not signed in")
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Family name is required")
    const { data, error } = await client
      .from("families").insert({ user_id: user.id, name: trimmed }).select().single()
    if (error) throw error
    setFamily(data as Family)
    setCharacters([])
    setStories([])
    return data as Family
  }, [client, user])

  const renameFamily = useCallback(async (newName: string) => {
    if (!client || !user || !family) throw new Error("Not ready")
    const trimmed = newName.trim()
    if (!trimmed) throw new Error("Name required")
    const { data, error } = await client
      .from("families").update({ name: trimmed }).eq("id", family.id).select().single()
    if (error) throw error
    setFamily(data as Family)
  }, [client, user, family])

  // ---------- Characters ----------------------------------------------------
  const addCharacter = useCallback(async (name: string, isGuest: boolean) => {
    if (!client || !family) throw new Error("Not ready")
    const { data, error } = await client.from("characters")
      .insert({ family_id: family.id, name: name.trim(), is_guest: !!isGuest })
      .select().single()
    if (error) throw error
    setCharacters((prev) => [...prev, data as CharacterRow])
    return data as CharacterRow
  }, [client, family])

  const deleteCharacter = useCallback(async (id: string) => {
    if (!client || !family) throw new Error("Not ready")
    const { error } = await client.from("characters").delete().eq("id", id).eq("family_id", family.id)
    if (error) throw error
    setCharacters((prev) => prev.filter((c) => c.id !== id))
  }, [client, family])

  // ---------- Stories -------------------------------------------------------
  const addStory = useCallback(async (input: NewStoryInput): Promise<StoryRow | null> => {
    if (!client || !family) throw new Error("Not ready")
    const payload = {
      family_id: family.id,
      title: input.title,
      content: input.content,
      image_url: input.image_url,
      theme_id: input.theme_id ?? null,
      story_type: input.story_type,
      user_prompt: input.user_prompt ?? null,
      image_prompt: input.image_prompt ?? null,
      characters: input.characters ?? [],
    }
    const { data, error } = await client.from("stories").insert(payload).select().single()
    if (error) throw error
    const row = data as StoryRow
    setStories((prev) => [row, ...prev])
    return row
  }, [client, family])

  const deleteStory = useCallback(async (id: string) => {
    if (!client || !family) throw new Error("Not ready")
    const { error } = await client.from("stories").delete().eq("id", id).eq("family_id", family.id)
    if (error) throw error
    setStories((prev) => prev.filter((s) => s.id !== id))
  }, [client, family])

  const value = useMemo<SupabaseContextValue>(() => ({
    client, session, user, profile, isAdmin, authLoading,
    family, characters, stories, isLoading, error,
    signUp, signIn, signOut, resetPassword,
    createFamily, renameFamily,
    addCharacter, deleteCharacter, addStory, deleteStory,
    reload: loadEverything,
  }), [
    client, session, user, profile, isAdmin, authLoading,
    family, characters, stories, isLoading, error,
    signUp, signIn, signOut, resetPassword,
    createFamily, renameFamily, addCharacter, deleteCharacter, addStory, deleteStory, loadEverything,
  ])

  return React.createElement(SupabaseContext.Provider, { value }, children)
}

// ---------- Hook ------------------------------------------------------------
// Keeps the exact same API your components already use. Just reads from
// context instead of owning state.
export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) {
    throw new Error(
      "useSupabase must be used inside <SupabaseProvider>. Wrap your app in page.tsx (or layout.tsx) with <SupabaseProvider>."
    )
  }
  return ctx
}
