// src/app/api/community-posts/[id]/reject/route.ts
//
// Delete a community story submission. Admin can delete any; author can
// delete their own (pending or approved). No storage cleanup needed — the
// underlying story belongs to the author's library regardless.
//
// DELETE /api/community-posts/{id}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: post } = await client
    .from("community_posts").select("published_by").eq("id", params.id).maybeSingle()
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  const isOwner = post.published_by === userData.user.id
  const { data: profile } = await client
    .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle()
  const isAdmin = !!profile?.is_admin

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 })
  }

  const { error: deleteErr } = await client
    .from("community_posts").delete().eq("id", params.id)
  if (deleteErr) {
    return NextResponse.json({ error: "Failed to delete", detail: deleteErr.message }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}
