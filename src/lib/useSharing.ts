// src/lib/useSharing.ts

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSupabase } from "./useSupabase"

export type LibraryShare = {
  id: string
  owner_id: string
  invitee_email: string
  scope: "all" | "selected"
  created_at: string
  scoped_story_ids?: string[]
}

export type PublicLink = {
  owner_id: string
  slug: string
  scope: "all" | "selected"
  enabled: boolean
  created_at: string
  scoped_story_ids?: string[]
}

function randomSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let s = ""
  for (let i = 0; i < 10; i++) s += alphabet[bytes[i] % alphabet.length]
  return s
}

export function useSharing() {
  const { client, user } = useSupabase()
  const [shares, setShares] = useState<LibraryShare[]>([])
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!client || !user) return
    setLoading(true); setError(null)
    try {
      const [sharesRes, scopesRes, linkRes, linkScopesRes] = await Promise.all([
        client.from("library_shares").select("*").eq("owner_id", user.id),
        client.from("share_story_scopes").select("share_id, story_id"),
        client.from("library_public_links").select("*").eq("owner_id", user.id).maybeSingle(),
        client.from("public_link_story_scopes").select("story_id").eq("owner_id", user.id),
      ])
      if (sharesRes.error) throw sharesRes.error
      if (scopesRes.error) throw scopesRes.error
      if (linkRes.error) throw linkRes.error
      if (linkScopesRes.error) throw linkScopesRes.error

      const scopeMap = new Map<string, string[]>()
      for (const row of scopesRes.data ?? []) {
        const list = scopeMap.get(row.share_id) ?? []
        list.push(row.story_id)
        scopeMap.set(row.share_id, list)
      }
      setShares((sharesRes.data ?? []).map((s: any) => ({ ...s, scoped_story_ids: scopeMap.get(s.id) ?? [] })))

      if (linkRes.data) {
        setPublicLink({
          ...linkRes.data,
          scoped_story_ids: (linkScopesRes.data ?? []).map((r: any) => r.story_id),
        })
      } else {
        setPublicLink(null)
      }
    } catch (e: any) {
      console.error("useSharing.reload:", e)
      setError(e?.message ?? "Failed to load sharing settings")
    } finally {
      setLoading(false)
    }
  }, [client, user])

  useEffect(() => { void reload() }, [reload])

  const inviteByEmail = useCallback(async (
    email: string, scope: "all" | "selected", selectedStoryIds: string[] = []
  ) => {
    if (!client || !user) throw new Error("Not signed in")
    const clean = email.trim().toLowerCase()
    if (!clean) throw new Error("Email required")

    const { data, error } = await client.from("library_shares")
      .upsert({ owner_id: user.id, invitee_email: clean, scope }, { onConflict: "owner_id,invitee_email" })
      .select().single()
    if (error) throw error

    await client.from("share_story_scopes").delete().eq("share_id", data.id)
    if (scope === "selected" && selectedStoryIds.length > 0) {
      const rows = selectedStoryIds.map((story_id) => ({ share_id: data.id, story_id }))
      const ins = await client.from("share_story_scopes").insert(rows)
      if (ins.error) throw ins.error
    }
    await reload()
  }, [client, user, reload])

  const revokeShare = useCallback(async (shareId: string) => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("library_shares").delete().eq("id", shareId).eq("owner_id", user.id)
    if (error) throw error
    setShares((prev) => prev.filter((s) => s.id !== shareId))
  }, [client, user])

  const enablePublicLink = useCallback(async (
    scope: "all" | "selected", selectedStoryIds: string[] = []
  ) => {
    if (!client || !user) throw new Error("Not signed in")
    const existingSlug = publicLink?.slug ?? randomSlug()
    const { error } = await client.from("library_public_links")
      .upsert({ owner_id: user.id, slug: existingSlug, scope, enabled: true })
    if (error) throw error

    await client.from("public_link_story_scopes").delete().eq("owner_id", user.id)
    if (scope === "selected" && selectedStoryIds.length > 0) {
      const rows = selectedStoryIds.map((story_id) => ({ owner_id: user.id, story_id }))
      const ins = await client.from("public_link_story_scopes").insert(rows)
      if (ins.error) throw ins.error
    }
    await reload()
  }, [client, user, publicLink, reload])

  const disablePublicLink = useCallback(async () => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("library_public_links")
      .update({ enabled: false }).eq("owner_id", user.id)
    if (error) throw error
    await reload()
  }, [client, user, reload])

  const rotatePublicSlug = useCallback(async () => {
    if (!client || !user) throw new Error("Not signed in")
    const { error } = await client.from("library_public_links")
      .update({ slug: randomSlug() }).eq("owner_id", user.id)
    if (error) throw error
    await reload()
  }, [client, user, reload])

  return {
    shares, publicLink, loading, error, reload,
    inviteByEmail, revokeShare,
    enablePublicLink, disablePublicLink, rotatePublicSlug,
  }
}

export function useSharedWithMe() {
  const { client, user } = useSupabase()
  const [incoming, setIncoming] = useState<
    Array<{ owner_id: string; owner_name: string; story_count: number }>
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client || !user) return
    ;(async () => {
      setLoading(true)
      try {
        const { data: sharesRaw } = await client.from("library_shares").select("owner_id")
        const ownerIds = Array.from(new Set((sharesRaw ?? []).map((r: any) => r.owner_id)))
        if (ownerIds.length === 0) { setIncoming([]); return }

        const { data: profiles } = await client.from("profiles").select("id, display_name").in("id", ownerIds)

        // Count stories visible (RLS will return only the ones we're allowed to see).
        // To avoid pulling story bodies, join via families.
        const { data: fams } = await client.from("families").select("id, user_id").in("user_id", ownerIds)
        const familyIds = (fams ?? []).map((f: any) => f.id)
        const { data: visibleStories } = familyIds.length
          ? await client.from("stories").select("id, family_id").in("family_id", familyIds)
          : { data: [] as Array<{ id: string; family_id: string }> }

        const famToOwner = new Map<string, string>((fams ?? []).map((f: any) => [f.id, f.user_id]))
        const counts: Record<string, number> = {}
        for (const s of visibleStories ?? []) {
          const owner = famToOwner.get(s.family_id)
          if (!owner) continue
          counts[owner] = (counts[owner] ?? 0) + 1
        }

        setIncoming(ownerIds.map((id) => ({
          owner_id: id,
          owner_name: profiles?.find((p: any) => p.id === id)?.display_name ?? "Someone",
          story_count: counts[id] ?? 0,
        })))
      } finally {
        setLoading(false)
      }
    })()
  }, [client, user])

  return { incoming, loading }
}
