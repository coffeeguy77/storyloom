// src/lib/directBookUpload.ts
//
// Uploads a community book file (and optional cover) DIRECTLY from the
// browser to Supabase Storage, bypassing Vercel's 4.5MB function body limit.
//
// Flow:
//   1. Generate bookId (UUID) client-side
//   2. Upload book file to community-books/{bookId}/original.{ext}
//   3. If cover provided, upload to community-books/{bookId}/cover.{ext}
//   4. Get signed URL for cover (so list page can display it)
//   5. Return everything the register endpoint needs
//
// RLS on the bucket allows authenticated users to write. The register
// endpoint then creates the DB row (tiny JSON, well under 4.5MB).

"use client"

import type { SupabaseClient } from "@supabase/supabase-js"

export type DirectUploadResult = {
  bookId: string
  fileStoragePath: string
  fileType: "pdf" | "epub"
  fileSizeBytes: number
  coverStoragePath: string | null
  coverSignedUrl: string | null
}

type ProgressCallback = (info: { stage: string; pct?: number }) => void

export async function uploadBookDirect(
  client: SupabaseClient,
  opts: {
    file: File
    cover?: File | Blob | null
    coverMimeType?: string | null
    onProgress?: ProgressCallback
  }
): Promise<DirectUploadResult> {
  const { file, cover, coverMimeType, onProgress } = opts

  // Determine file type
  const fileType: "pdf" | "epub" =
    file.type === "application/pdf" ? "pdf"
    : file.type === "application/epub+zip" ? "epub"
    : file.name.toLowerCase().endsWith(".pdf") ? "pdf"
    : file.name.toLowerCase().endsWith(".epub") ? "epub"
    : (() => { throw new Error(`Unsupported file type: ${file.type || file.name}`) })()

  // Client-side UUID (compatible with older browsers)
  const bookId = crypto.randomUUID
    ? crypto.randomUUID()
    : fallbackUuid()

  const filePath = `${bookId}/original.${fileType}`

  // Upload book file
  onProgress?.({ stage: "Uploading book file…" })
  const { error: fileErr } = await client.storage
    .from("community-books")
    .upload(filePath, file, {
      contentType: file.type || (fileType === "pdf" ? "application/pdf" : "application/epub+zip"),
      upsert: false,
    })
  if (fileErr) {
    throw new Error(`Book upload failed: ${fileErr.message}`)
  }

  // Upload cover if provided
  let coverPath: string | null = null
  let coverSignedUrl: string | null = null
  if (cover && cover.size > 0) {
    onProgress?.({ stage: "Uploading cover…" })
    const mime = coverMimeType || (cover instanceof File ? cover.type : "image/jpeg")
    const ext =
      mime === "image/png" ? "png" :
      mime === "image/webp" ? "webp" :
      mime === "image/gif" ? "gif" : "jpg"
    coverPath = `${bookId}/cover.${ext}`

    const { error: coverErr } = await client.storage
      .from("community-books")
      .upload(coverPath, cover, {
        contentType: mime,
        upsert: false,
      })
    if (coverErr) {
      // Roll back the book file so we don't leave orphans
      await client.storage.from("community-books").remove([filePath]).catch(() => {})
      throw new Error(`Cover upload failed: ${coverErr.message}`)
    }

    // Get a 1-year signed URL for the cover so the list page can display it
    const { data: signed } = await client.storage
      .from("community-books")
      .createSignedUrl(coverPath, 60 * 60 * 24 * 365)
    coverSignedUrl = signed?.signedUrl ?? null
  }

  onProgress?.({ stage: "Done" })
  return {
    bookId,
    fileStoragePath: filePath,
    fileType,
    fileSizeBytes: file.size,
    coverStoragePath: coverPath,
    coverSignedUrl,
  }
}

function fallbackUuid(): string {
  // Fallback for very old browsers without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
