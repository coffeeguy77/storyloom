// src/lib/useCommunityBooks.ts
//
// Client hook for listing community books (approved only, via RLS).
// Exposes: books, isLoading, error, reload.

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

export type CommunityBook = {
  id: string
  title: string
  author: string | null
  description: string | null
  cover_url: string | null
  file_type: "pdf" | "epub"
  file_size_bytes: number | null
  page_count: number | null
  is_approved: boolean
  created_at: string
}

export function useCommunityBooks() {
  const { client, user } = useSupabase()
  const [books, setBooks] = useState<CommunityBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!client) return
    setIsLoading(true); setError(null)
    try {
      const { data, error: fetchErr } = await client
        .from("community_books")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
      if (fetchErr) throw fetchErr
      setBooks((data as CommunityBook[]) ?? [])
    } catch (e: any) {
      console.error("useCommunityBooks:", e)
      setError(e?.message ?? "Failed to load books")
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  return { books, isLoading, error, reload: load }
}
