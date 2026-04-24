// src/app/api/community-posts/[id]/approve/route.ts
//
// Admin-only. Approves a pending community story submission.
// POST /api/community-posts/{id}/approve

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function POST(
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

  const { data: profile } = await client
    .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { data: updated, error: updateErr } = await client
    .from("community_posts")
    .update({
      status: "approved",
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: "Failed to approve", detail: updateErr.message }, { status: 500 })
  }
  return NextResponse.json({ post: updated })
}
