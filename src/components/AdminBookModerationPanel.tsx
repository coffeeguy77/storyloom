// src/components/AdminBookModerationPanel.tsx
//
// Admin-only panel for moderating community books.
// Renders three tabs:
//   - Pending: awaiting approval
//   - All books: approved books with delete
//   - Flagged: books flagged by users, sorted by unresolved flag count
//
// This component assumes the caller already verified admin status before
// rendering it. It does NOT gate itself — do that in the parent page.

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

type Book = {
  id: string
  title: string
  author: string | null
  description: string | null
  cover_url: string | null
  file_type: "pdf" | "epub"
  is_approved: boolean
  uploaded_by: string | null
  uploader_display_name?: string | null
  uploader_email?: string | null
  created_at: string
  unresolved_flag_count?: number
  flag_count?: number
}

type FlagRow = {
  id: string
  book_id: string
  flagged_by: string
  reason: string | null
  created_at: string
  flagger_display_name?: string | null
}

type Tab = "pending" | "all" | "flagged"

export default function AdminBookModerationPanel({
  onChange,
}: {
  onChange: () => void   // called after approve/delete so parent list reloads
}) {
  const { client, session } = useSupabase()
  const [tab, setTab] = useState<Tab>("pending")
  const [pending, setPending] = useState<Book[]>([])
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [flagged, setFlagged] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!client) return
    setLoading(true); setError(null)
    try {
      // Pending
      const pendingRes = await client
        .from("community_books")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false })
      if (pendingRes.error) throw pendingRes.error
      setPending((pendingRes.data as Book[]) ?? [])

      // All books with flag counts (via view)
      const allRes = await client
        .from("community_books_with_flags")
        .select("*")
        .order("created_at", { ascending: false })
      if (allRes.error) throw allRes.error
      const allData = (allRes.data as Book[]) ?? []
      setAllBooks(allData.filter((b) => b.is_approved))
      setFlagged(
        allData.filter((b) => (b.unresolved_flag_count ?? 0) > 0)
               .sort((a, b) =>
                 (b.unresolved_flag_count ?? 0) - (a.unresolved_flag_count ?? 0))
      )
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? "Failed to load moderation data")
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { void loadAll() }, [loadAll])

  async function approve(id: string) {
    if (!session?.access_token) return
    try {
      const res = await fetch(`/api/community-books/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? "Approve failed")
      }
      await loadAll()
      onChange()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function doDelete(id: string, confirmMsg: string) {
    if (!session?.access_token) return
    if (typeof window !== "undefined" && !confirm(confirmMsg)) return
    try {
      const res = await fetch(`/api/community-books/${id}/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? "Delete failed")
      }
      await loadAll()
      onChange()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function tabBtn(t: Tab, label: string, count: number) {
    const active = tab === t
    return (
      <button
        onClick={() => setTab(t)}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          active
            ? "bg-white text-purple-900"
            : "bg-white/10 text-white/80 hover:bg-white/20"
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            active ? "bg-purple-900 text-white" : "bg-red-500 text-white"
          }`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">🛡️ Admin Moderation</h2>
        <button
          onClick={() => void loadAll()}
          disabled={loading}
          className="text-white/70 hover:text-white text-sm underline disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {tabBtn("pending", "Pending", pending.length)}
        {tabBtn("flagged", "Flagged", flagged.length)}
        {tabBtn("all", "All books", allBooks.length)}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/60 text-center py-6">Loading…</p>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <p className="text-white/60 text-center py-6">No submissions waiting for review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => (
              <BookRow
                key={b.id}
                book={b}
                actions={
                  <>
                    <button
                      onClick={() => approve(b.id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => doDelete(b.id, `Reject and delete "${b.title}"? This removes the file permanently.`)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Reject
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )
      ) : tab === "flagged" ? (
        flagged.length === 0 ? (
          <p className="text-white/60 text-center py-6">No books have been flagged.</p>
        ) : (
          <div className="space-y-3">
            {flagged.map((b) => (
              <BookRow
                key={b.id}
                book={b}
                actions={
                  <>
                    <FlagDetailsButton bookId={b.id} count={b.unresolved_flag_count ?? 0} />
                    <button
                      onClick={() => doDelete(b.id, `Remove "${b.title}"? Deletes the file and all flags.`)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )
      ) : (
        allBooks.length === 0 ? (
          <p className="text-white/60 text-center py-6">No approved books yet.</p>
        ) : (
          <div className="space-y-3">
            {allBooks.map((b) => (
              <BookRow
                key={b.id}
                book={b}
                actions={
                  <button
                    onClick={() => doDelete(b.id, `Delete "${b.title}"? This permanently removes the book and its file.`)}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Delete
                  </button>
                }
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function BookRow({ book, actions }: { book: Book; actions: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="w-12 h-16 bg-white/10 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/40 text-lg">📖</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{book.title}</p>
        <p className="text-white/60 text-xs truncate">
          {book.author && `${book.author} · `}
          {book.file_type.toUpperCase()} · {new Date(book.created_at).toLocaleDateString()}
        </p>
        {(book.unresolved_flag_count ?? 0) > 0 && (
          <p className="text-red-300 text-xs mt-1">
            🚩 {book.unresolved_flag_count} flag{book.unresolved_flag_count !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">{actions}</div>
    </div>
  )
}

function FlagDetailsButton({ bookId, count }: { bookId: string; count: number }) {
  const { client } = useSupabase()
  const [open, setOpen] = useState(false)
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!client) return
    setLoading(true)
    try {
      const { data } = await client
        .from("community_book_flags")
        .select("*")
        .eq("book_id", bookId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
      setFlags((data as FlagRow[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    if (!open) void load()
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm"
        title="View flag details"
      >
        🚩 {count}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-white/20 rounded-lg p-3 shadow-2xl z-20">
          {loading ? (
            <p className="text-white/60 text-xs">Loading flags…</p>
          ) : flags.length === 0 ? (
            <p className="text-white/60 text-xs">No flag details.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {flags.map((f) => (
                <li key={f.id} className="text-xs text-white/80 border-b border-white/10 pb-2 last:border-0">
                  <p className="text-white/50">{new Date(f.created_at).toLocaleString()}</p>
                  <p>{f.reason || <em className="text-white/40">(no reason provided)</em>}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
