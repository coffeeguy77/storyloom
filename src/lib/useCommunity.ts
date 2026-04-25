// src/lib/useCommunity.ts
//
// Unified community data: approved books + stories, my submissions, and
// admin pending queues.
//
// Schema note: community_posts columns actually in use:
//   id, story_id, author_id, show_author, status, moderation_note,
//   title, content, image_url, submitted_at, reviewed_at, reviewed_by

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
  story_id: string
  title: string
  content: string
  image_url: string | null
  status: "pending" | "approved" | "rejected"
  author_id: string | null
  show_author: boolean
  author_display_name: string | null  // resolved client-side from profiles
  submitted_at: string
  created_at: string                  // alias of submitted_at for sorting convenience
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
      // ------ Books: approved ------
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

      // ------ Stories: approved ------
      const storiesRes = await client
        .from("community_posts")
        .select("*")
        .eq("status", "approved")
        .order("submitted_at", { ascending: false })
      if (storiesRes.error) throw storiesRes.error
      const approvedStoriesRaw = (storiesRes.data ?? []) as any[]
      const approvedStories = await attachDisplayNames(client, approvedStoriesRaw)
      setStories(approvedStories)

      // ------ My submissions (both types) ------
      const [myBooks, myStories] = await Promise.all([
        client.from("community_books").select("*").eq("uploaded_by", user.id).order("created_at", { ascending: false }),
        client.from("community_posts").select("*").eq("author_id", user.id).order("submitted_at", { ascending: false }),
      ])
      const myStoriesWithNames = await attachDisplayNames(client, (myStories.data ?? []) as any[])
      const myMerged: CommunityItem[] = [
        ...((myBooks.data ?? []) as any[]).map((b) => ({ ...b, kind: "book" as const })),
        ...myStoriesWithNames,
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      setMySubmissions(myMerged)

      // ------ Admin-only queues ------
      if (isAdmin) {
        const [pBooks, pStories, flagged] = await Promise.all([
          client.from("community_books").select("*").eq("is_approved", false).order("created_at", { ascending: false }),
          client.from("community_posts").select("*").eq("status", "pending").order("submitted_at", { ascending: false }),
          client.from("community_books_with_flags").select("*").order("created_at", { ascending: false }),
        ])
        setPendingBooks(((pBooks.data ?? []) as any[]).map((b) => ({ ...b, kind: "book" as const })))
        const pendingStoriesWithNames = await attachDisplayNames(client, (pStories.data ?? []) as any[])
        setPendingStories(pendingStoriesWithNames)
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

// Given an array of community_posts rows, fetch profile display names for
// author_id values and attach them. Returns fully-shaped CommunityStory rows
// with a created_at alias mapped from submitted_at.
async function attachDisplayNames(client: any, rows: any[]): Promise<CommunityStory[]> {
  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id).filter(Boolean))
  ) as string[]

  let nameMap: Record<string, string | null> = {}
  if (authorIds.length > 0) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, display_name")
      .in("id", authorIds)
    for (const p of (profiles ?? []) as any[]) {
      nameMap[p.id] = p.display_name ?? null
    }
  }

  return rows.map((r) => ({
    ...r,
    created_at: r.submitted_at ?? r.created_at ?? new Date().toISOString(),
    author_display_name: r.author_id ? (nameMap[r.author_id] ?? null) : null,
    kind: "story" as const,
  }))
}
