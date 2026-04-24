// src/app/api/community-books/[id]/delete/route.ts
//
// Admin-only. Hard-deletes a book: removes the DB row, the file, and the
// cover from Supabase Storage. Works for both pending (reject) and approved
// (remove) books.
//
// DELETE /api/community-books/{id}
// Optional body: { reason?: string }
//   - If provided and book was pending, reason is logged via rejection_reason
//     before deletion (future audit trail). For now we just delete.
//
// Returns: { deleted: true }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function DELETE(
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

  // Verify caller is admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser(token)
  if (!userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Fetch storage paths BEFORE deleting the DB row
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: book, error: fetchErr } = await admin
    .from("community_books")
    .select("file_storage_path, cover_storage_path")
    .eq("id", params.id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json(
      { error: "Failed to fetch book", detail: fetchErr.message },
      { status: 500 }
    )
  }
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 })
  }

  // Delete storage objects. We collect paths and issue one remove() call.
  const toRemove: string[] = []
  if (book.file_storage_path) toRemove.push(book.file_storage_path)
  if (book.cover_storage_path) toRemove.push(book.cover_storage_path)

  if (toRemove.length > 0) {
    const { error: storageErr } = await admin.storage
      .from("community-books")
      .remove(toRemove)
    if (storageErr) {
      // Log but don't fail — we still want the DB row gone.
      // Worst case: orphaned storage object that the admin can clean up later.
      console.warn("Storage delete failed:", storageErr.message, toRemove)
    }
  }

  const { error: deleteErr } = await admin
    .from("community_books")
    .delete()
    .eq("id", params.id)

  if (deleteErr) {
    return NextResponse.json(
      { error: "Failed to delete book record", detail: deleteErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ deleted: true })
}
