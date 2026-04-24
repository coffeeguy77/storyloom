// src/app/api/community-books/upload/route.ts
//
// Admin-only: upload a community book (PDF or EPUB) plus optional cover image.
// Saves file(s) to Supabase Storage bucket `community-books` at
// {book_id}/original.{ext} and {book_id}/cover.{ext}, then creates a row.
//
// Body: multipart/form-data with fields:
//   file        (required, .pdf or .epub)
//   cover       (optional, image file)
//   title       (required, string)
//   author      (optional, string)
//   description (optional, string)
//
// Returns: { book: CommunityBook }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXT: Record<string, "pdf" | "epub"> = {
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server env vars missing" }, { status: 500 })
  }

  // Authenticate the caller with their JWT, confirm they're admin.
  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
  const user = userData.user

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Parse multipart form
  let form: FormData
  try {
    form = await req.formData()
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to parse multipart body", detail: e?.message },
      { status: 400 }
    )
  }

  const file = form.get("file")
  const cover = form.get("cover")
  const title = String(form.get("title") ?? "").trim()
  const author = String(form.get("author") ?? "").trim() || null
  const description = String(form.get("description") ?? "").trim() || null

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 400 }
    )
  }

  const fileType = ALLOWED_EXT[file.type]
  if (!fileType) {
    return NextResponse.json(
      { error: `Unsupported file type ${file.type}. Must be PDF or EPUB.` },
      { status: 400 }
    )
  }

  // Use service role for Storage writes + DB insert — simpler than juggling
  // Storage RLS with the user's JWT. We've already verified admin above.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Generate UUID client-side so we can use it in the storage path BEFORE insert
  const bookId = crypto.randomUUID()
  const filePath = `${bookId}/original.${fileType}`

  // Upload main file
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  const { error: fileUploadErr } = await admin.storage
    .from("community-books")
    .upload(filePath, fileBytes, {
      contentType: file.type,
      upsert: false,
    })
  if (fileUploadErr) {
    return NextResponse.json(
      { error: "File upload failed", detail: fileUploadErr.message },
      { status: 500 }
    )
  }

  // Upload cover if provided
  let coverPath: string | null = null
  if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) {
      // clean up the file we just uploaded
      await admin.storage.from("community-books").remove([filePath])
      return NextResponse.json(
        { error: "Cover must be an image" },
        { status: 400 }
      )
    }
    const coverExt =
      cover.type === "image/png" ? "png" :
      cover.type === "image/webp" ? "webp" :
      cover.type === "image/gif" ? "gif" : "jpg"
    coverPath = `${bookId}/cover.${coverExt}`
    const coverBytes = new Uint8Array(await cover.arrayBuffer())
    const { error: coverUploadErr } = await admin.storage
      .from("community-books")
      .upload(coverPath, coverBytes, {
        contentType: cover.type,
        upsert: false,
      })
    if (coverUploadErr) {
      await admin.storage.from("community-books").remove([filePath])
      return NextResponse.json(
        { error: "Cover upload failed", detail: coverUploadErr.message },
        { status: 500 }
      )
    }
  }

  // Create a 1-year signed URL for the cover so the list page can render it
  // without needing another round-trip. Files get signed URLs on demand from
  // the reader route (shorter TTL) for stronger access control.
  let coverSignedUrl: string | null = null
  if (coverPath) {
    const { data: signed } = await admin.storage
      .from("community-books")
      .createSignedUrl(coverPath, 60 * 60 * 24 * 365)
    coverSignedUrl = signed?.signedUrl ?? null
  }

  // Insert DB row
  const { data: inserted, error: insertErr } = await admin
    .from("community_books")
    .insert({
      id: bookId,
      title,
      author,
      description,
      cover_url: coverSignedUrl,
      cover_storage_path: coverPath,
      file_storage_path: filePath,
      file_type: fileType,
      file_size_bytes: file.size,
      uploaded_by: user.id,
      is_approved: true, // admin uploads are auto-approved
    })
    .select()
    .single()

  if (insertErr) {
    // Clean up storage on DB failure
    const toRemove = [filePath]
    if (coverPath) toRemove.push(coverPath)
    await admin.storage.from("community-books").remove(toRemove)
    return NextResponse.json(
      { error: "Failed to save book record", detail: insertErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ book: inserted })
}
