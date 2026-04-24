// src/app/api/community-books/[id]/flag/route.ts
//
// Any signed-in user can flag a book for admin review.
// POST /api/community-books/{id}/flag
// Body: { reason?: string }
// Returns: { flagged: true }
//
// The unique (book_id, flagged_by) constraint means a user can only flag
// a book once. Re-submitting will return 409.

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

  let body: any = {}
  try { body = await req.json() } catch {}
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null

  const { error } = await client
    .from("community_book_flags")
    .insert({
      book_id: params.id,
      flagged_by: userData.user.id,
      reason: reason || null,
    })

  if (error) {
    // Unique constraint → already flagged
    if (error.code === "23505") {
      return NextResponse.json({ error: "You've already flagged this book" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to flag book", detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ flagged: true })
}
