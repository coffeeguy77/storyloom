// src/lib/useCommunity.ts

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSupabase } from "./useSupabase"

export type CommunityFeedItem = {
  id: string
  title: string
  content: string
  image_url: string | null
  submitted_at: string
  reviewed_at: string | null
  author_name: string | null
  author_id: string | null
  favourite_count: number
}

export type MyPost = {
  id: string
  story_id: string
  status: "pending" | "approved" | "rejected" | "removed"
  show_author: boolean
  moderation_note: string | null
  submitted_at: string
  title: string
}

export type PendingPost = MyPost & {
  author_id: string
  content: string
  image_url: string | null
}

export function useCommunityFeed() {
  const { client } = useSupabase()
  const [items, setItems] = useState<CommunityFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data, error } = await client
      .from("community_feed").select("*").order("reviewed_at", { ascending: false })
    if (!error) setItems((data as CommunityFeedItem[]) ?? [])
    setLoading(false)
  }, [client])

  useEffect(() => { void reload() }, [reload])
  return { items, loading, reload }
}

export function useFavourites() {
  const { client, user } = useSupabase()
  const [myFavIds, setMyFavIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!client || !user) { setMyFavIds(new Set()); return }
    ;(async () => {
      const { data } = await client.from("community_favourites").select("post_id").eq("user_id", user.id)
      setMyFavIds(new Set((data ?? []).map((r: any) => r.post_id)))
    })()
  }, [client, user])

  const toggle = useCallback(async (postId: string) => {
    if (!client || !user) throw new Error("Sign in to favourite")
    if (myFavIds.has(postId)) {
      await client.from("community_favourites").delete().eq("user_id", user.id).eq("post_id", postId)
      setMyFavIds((prev) => { const n = new Set(prev); n.delete(postId); return n })
    } else {
      await client.from("community_favourites").insert({ user_id: user.id, post_id: postId })
      setMyFavIds((prev) => new Set(prev).add(postId))
    }
  }, [client, user, myFavIds])

  return { myFavIds, toggle }
}

export function useMyPublishing() {
  const { client, user } = useSupabase()
  const [myPosts, setMyPosts] = useState<MyPost[]>([])

  const reload = useCallback(async () => {
    if (!client || !user) return
    const { data } = await client.from("community_posts")
      .select("id, story_id, status, show_author, moderation_note, submitted_at, title")
      .eq("author_id", user.id)
      .order("submitted_at", { ascending: false })
    setMyPosts((data as MyPost[]) ?? [])
  }, [client, user])

  useEffect(() => { void reload() }, [reload])

  const publish = useCallback(async (opts: {
    story: { id: string; title: string; content: string; image_url: string | null }
    showAuthor: boolean
  }) => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("community_posts").insert({
      story_id: opts.story.id,
      author_id: user.id,
      show_author: opts.showAuthor,
      status: "pending",
      title: opts.story.title,
      content: opts.story.content,
      image_url: opts.story.image_url,
    })
    if (error) throw error
    await reload()
  }, [client, user, reload])

  const unpublish = useCallback(async (postId: string) => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("community_posts").delete().eq("id", postId).eq("author_id", user.id)
    if (error) throw error
    await reload()
  }, [client, user, reload])

  return { myPosts, publish, unpublish, reload }
}

export function useModerationQueue() {
  const { client, user, isAdmin } = useSupabase()
  const [queue, setQueue] = useState<PendingPost[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!client || !user || !isAdmin) { setQueue([]); return }
    setLoading(true)
    const { data, error } = await client.from("community_posts")
      .select("id, story_id, author_id, status, show_author, moderation_note, submitted_at, title, content, image_url")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true })
    if (!error) setQueue((data as PendingPost[]) ?? [])
    setLoading(false)
  }, [client, user, isAdmin])

  useEffect(() => { void reload() }, [reload])

  const decide = useCallback(async (postId: string, decision: "approved" | "rejected", note?: string) => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("community_posts").update({
      status: decision,
      moderation_note: note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq("id", postId)
    if (error) throw error
    await reload()
  }, [client, user, reload])

  const removeLive = useCallback(async (postId: string, note?: string) => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("community_posts").update({
      status: "removed",
      moderation_note: note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq("id", postId)
    if (error) throw error
    await reload()
  }, [client, user, reload])

  return { queue, loading, isAdmin, reload, decide, removeLive }
}
