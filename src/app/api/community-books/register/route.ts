// src/app/api/community-books/register/route.ts
//
// Called AFTER the client has uploaded file(s) directly to Supabase Storage.
// Creates the community_books DB row with metadata + storage paths.
//
// Body (JSON):
//   {
//     bookId: string,
//     title: string,
//     author?: string,
//     description?: string,
//     fileStoragePath: string,     // 'bookId/original.pdf' etc.
//     fileType: 'pdf' | 'epub',
//     fileSizeBytes: number,
//     coverStoragePath?: string,
//     coverSignedUrl?: string,
//   }
//
// Admin uploads auto-approve. Non-admin uploads land as pending.
//
// This endpoint sanity-checks that the uploaded file actually exists in
// Storage (prevents forged rows pointing at non-existent paths).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

type RegisterBody = {
  bookId: string
  title: string
  author?: string
  description?: string
  fileStoragePath: string
  fileType: "pdf" | "epub"
  fileSizeBytes: number
  coverStoragePath?: string
  coverSignedUrl?: string
}

export async function POST(req: NextRequest) {
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
  const user = userData.user

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()
  const isAdmin = !!profile?.is_admin

  let body: RegisterBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }

  // Validate
  if (!body.bookId || typeof body.bookId !== "string") {
    return NextResponse.json({ error: "bookId required" }, { status: 400 })
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }
  if (!body.fileStoragePath || typeof body.fileStoragePath !== "string") {
    return NextResponse.json({ error: "fileStoragePath required" }, { status: 400 })
  }
  if (body.fileType !== "pdf" && body.fileType !== "epub") {
    return NextResponse.json({ error: "fileType must be pdf or epub" }, { status: 400 })
  }
  // Prevent someone from registering a path outside their own bookId folder
  if (!body.fileStoragePath.startsWith(`${body.bookId}/`)) {
    return NextResponse.json({ error: "fileStoragePath must live under bookId" }, { status: 400 })
  }
  if (body.coverStoragePath && !body.coverStoragePath.startsWith(`${body.bookId}/`)) {
    return NextResponse.json({ error: "coverStoragePath must live under bookId" }, { status: 400 })
  }

  // Verify the storage objects exist before we create a DB row
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // `list` inside the bookId folder catches both file and cover if present
  const { data: listed, error: listErr } = await admin.storage
    .from("community-books")
    .list(body.bookId)
  if (listErr) {
    return NextResponse.json(
      { error: "Could not verify upload", detail: listErr.message },
      { status: 500 }
    )
  }
  const fileName = body.fileStoragePath.split("/").slice(-1)[0]
  const fileExists = listed?.some((item) => item.name === fileName)
  if (!fileExists) {
    return NextResponse.json(
      { error: "Book file not found in storage. Upload it first." },
      { status: 400 }
    )
  }

  // Insert DB row
  const { data: inserted, error: insertErr } = await admin
    .from("community_books")
    .insert({
      id: body.bookId,
      title: body.title.trim(),
      author: body.author?.trim() || null,
      description: body.description?.trim() || null,
      cover_url: body.coverSignedUrl || null,
      cover_storage_path: body.coverStoragePath || null,
      file_storage_path: body.fileStoragePath,
      file_type: body.fileType,
      file_size_bytes: body.fileSizeBytes || null,
      uploaded_by: user.id,
      is_approved: isAdmin,
      reviewed_by: isAdmin ? user.id : null,
      reviewed_at: isAdmin ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (insertErr) {
    // Clean up storage on failure so we don't leave orphans
    const toRemove = [body.fileStoragePath]
    if (body.coverStoragePath) toRemove.push(body.coverStoragePath)
    await admin.storage.from("community-books").remove(toRemove).catch(() => {})
    return NextResponse.json(
      { error: "Failed to save book record", detail: insertErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ book: inserted })
}
