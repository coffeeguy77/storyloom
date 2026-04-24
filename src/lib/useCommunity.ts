// src/lib/useCommunity.ts
//
// Unified community data: approved books + stories, my submissions, and
// admin pending queues. One hook, everything you need.

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
  is_approved: boolean
  uploaded_by: string | null
  created_at: string
  unresolved_flag_count?: number
  kind: "book"
}

export type CommunityStory = {
  id: string
  title: string
  content: string
  image_url: string | null
  theme_id: string | null
  characters: any
  status: "pending" | "approved" | "rejected"
  published_by: string | null
  publisher_display_name: string | null
  show_display_name: boolean
  favourite_count: number
  created_at: string
  kind: "story"
}

export type CommunityItem = CommunityBook | CommunityStory

export function useCommunity() {
  const { client, user, isAdmin } = useSupabase()

  const [books, setBooks] = useState<CommunityBook[]>([])
  const [stories, setStories] = useState<CommunityStory[]>([])
  const [mySubmissions, setMySubmissions] = useState<CommunityItem[]>([])
  const [pendingBooks, setPendingBooks] = useState<CommunityBook[]>([])
  const [pendingStories, setPendingStories] = useState<CommunityStory[]>([])
  const [flaggedBooks, setFlaggedBooks] = useState<CommunityBook[]>([])
  const [allBooks, setAllBooks] = useState<CommunityBook[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!client || !user) return
    setIsLoading(true); setError(null)
    try {
      // Approved books (public feed)
      const booksRes = await client
        .from("community_books")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
      if (booksRes.error) throw booksRes.error
      const approvedBooks: CommunityBook[] = ((booksRes.data ?? []) as any[]).map((b) => ({
        ...b, kind: "book" as const,
      }))
      setBooks(approvedBooks)

      // Approved stories from the community_feed view (from 03-community.sql)
      const storiesRes = await client
        .from("community_feed")
        .select("*")
        .order("created_at", { ascending: false })
      // View may not exist yet for some projects; fall back to community_posts
      let approvedStories: CommunityStory[] = []
      if (storiesRes.error) {
        const fallback = await client
          .from("community_posts")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
        if (!fallback.error) {
          approvedStories = ((fallback.data ?? []) as any[]).map((s) => ({
            ...s, kind: "story" as const, favourite_count: s.favourite_count ?? 0,
          }))
        }
      } else {
        approvedStories = ((storiesRes.data ?? []) as any[]).map((s) => ({
          ...s, kind: "story" as const,
        }))
      }
      setStories(approvedStories)

      // My submissions (books + stories) — relies on RLS "see own pending" + admin
      const [myBooks, myStories] = await Promise.all([
        client.from("community_books").select("*").eq("uploaded_by", user.id).order("created_at", { ascending: false }),
        client.from("community_posts").select("*").eq("published_by", user.id).order("created_at", { ascending: false }),
      ])
      const myMerged: CommunityItem[] = [
        ...((myBooks.data ?? []) as any[]).map((b) => ({ ...b, kind: "book" as const })),
        ...((myStories.data ?? []) as any[]).map((s) => ({
          ...s, kind: "story" as const, favourite_count: s.favourite_count ?? 0,
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      setMySubmissions(myMerged)

      // Admin-only queues
      if (isAdmin) {
        const [pBooks, pStories, flagged] = await Promise.all([
          client.from("community_books").select("*").eq("is_approved", false).order("created_at", { ascending: false }),
          client.from("community_posts").select("*").eq("status", "pending").order("created_at", { ascending: false }),
          client.from("community_books_with_flags").select("*").order("created_at", { ascending: false }),
        ])
        setPendingBooks(((pBooks.data ?? []) as any[]).map((b) => ({ ...b, kind: "book" as const })))
        setPendingStories(((pStories.data ?? []) as any[]).map((s) => ({
          ...s, kind: "story" as const, favourite_count: s.favourite_count ?? 0,
        })))
        const withFlags = ((flagged.data ?? []) as any[]).map((b) => ({ ...b, kind: "book" as const })) as CommunityBook[]
        setFlaggedBooks(withFlags.filter((b) => (b.unresolved_flag_count ?? 0) > 0))
        setAllBooks(withFlags.filter((b) => b.is_approved))
      }
    } catch (e: any) {
      console.error("useCommunity:", e)
      setError(e?.message ?? "Failed to load community")
    } finally {
      setIsLoading(false)
    }
  }, [client, user, isAdmin])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  return {
    books, stories, mySubmissions,
    pendingBooks, pendingStories, flaggedBooks, allBooks,
    isLoading, error,
    reload: load,
  }
}
