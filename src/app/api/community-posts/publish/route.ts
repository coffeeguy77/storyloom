// src/app/api/community-posts/publish/route.ts
//
// Publish one of the caller's own stories to the community feed.
// Creates a community_posts row with status='pending'.
//
// POST /api/community-posts/publish
// Body: { storyId: string, showDisplayName: boolean }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server env vars missing" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData } = await client.auth.getUser(token)
  if (!userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
  const user = userData.user

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }
  const storyId = body?.storyId
  const showDisplayName = !!body?.showDisplayName
  if (!storyId) {
    return NextResponse.json({ error: "storyId required" }, { status: 400 })
  }

  // Verify the story belongs to the caller (RLS on stories will enforce this
  // via the owner-all policy; a non-owner select returns null)
  const { data: story, error: storyErr } = await client
    .from("stories")
    .select("id, title, content, image_url, theme_id, characters, family_id")
    .eq("id", storyId)
    .maybeSingle()
  if (storyErr || !story) {
    return NextResponse.json({ error: "Story not found or not yours" }, { status: 404 })
  }

  const { data: profile } = await client
    .from("profiles").select("display_name").eq("id", user.id).maybeSingle()

  // Prevent duplicate publishes
  const { data: existing } = await client
    .from("community_posts").select("id, status").eq("story_id", storyId).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `This story is already ${existing.status} in the community.` },
      { status: 409 }
    )
  }

  const { data: inserted, error: insertErr } = await client
    .from("community_posts")
    .insert({
      story_id: storyId,
      title: story.title,
      content: story.content,
      image_url: story.image_url,
      theme_id: story.theme_id,
      characters: story.characters,
      published_by: user.id,
      publisher_display_name: profile?.display_name ?? null,
      show_display_name: showDisplayName,
      status: "pending",
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json(
      { error: "Failed to publish", detail: insertErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ post: inserted })
}
