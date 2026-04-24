// src/app/api/community-books/[id]/signed-url/route.ts
//
// Generates a short-lived (15 minute) signed URL for a book's file.
// Signed-in users only. Approved books only. Does NOT require admin.
//
// Returns: { url: string, fileType: 'pdf' | 'epub' }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server env vars missing" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser(token)
  if (!userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  // Fetch the book via the user's client so RLS enforces "signed-in + approved"
  const { data: book, error: bookErr } = await userClient
    .from("community_books")
    .select("file_storage_path, file_type, is_approved")
    .eq("id", params.id)
    .maybeSingle()

  if (bookErr || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 })
  }
  if (!book.is_approved) {
    // Admin check
    const { data: profile } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }
  }

  // Use service role to sign (avoids any Storage RLS edge cases)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signed, error: signErr } = await admin.storage
    .from("community-books")
    .createSignedUrl(book.file_storage_path, 60 * 15) // 15 minutes
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to sign URL", detail: signErr?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: signed.signedUrl,
    fileType: book.file_type,
  })
}
