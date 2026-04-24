// src/app/community/books/page.tsx
//
// Lists all approved community books. If the current user is an admin, shows
// an "Upload a book" panel at the top.

"use client"

import Link from "next/link"
import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import { useCommunityBooks, type CommunityBook } from "@/lib/useCommunityBooks"

export default function CommunityBooksPage() {
  const { user, isAdmin, session } = useSupabase()
  const { books, isLoading, error, reload } = useCommunityBooks()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to read</h1>
          <p className="text-white/80 mb-6">
            The community book library is available to signed-in StoryLoom members.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go to StoryLoom
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-2xl">Community Library</h1>
            <p className="text-white/80 mt-2">
              {books.length > 0
                ? `${books.length} book${books.length !== 1 ? "s" : ""} to read`
                : "Books will appear here once they're uploaded"}
            </p>
          </div>
          <Link
            href="/"
            className="text-white/80 hover:text-white underline"
          >
            ← Home
          </Link>
        </div>

        {isAdmin && (
          <AdminUploadPanel
            accessToken={session?.access_token}
            onUploaded={reload}
          />
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-white/60">Loading books…</div>
        ) : books.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center">
            <p className="text-white/80">No books yet.</p>
            {isAdmin && (
              <p className="text-white/60 text-sm mt-2">Upload one above to get started.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BookCard({ book }: { book: CommunityBook }) {
  return (
    <Link
      href={`/community/books/${book.id}`}
      className="group block bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden transition-all hover:scale-[1.03] hover:bg-white/15"
    >
      <div className="aspect-[2/3] bg-white/5 relative overflow-hidden">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">📖</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/60 text-white/90 text-xs px-2 py-1 rounded-full uppercase tracking-wider">
          {book.file_type}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold leading-tight line-clamp-2">{book.title}</h3>
        {book.author && (
          <p className="text-white/60 text-sm mt-1">{book.author}</p>
        )}
      </div>
    </Link>
  )
}

function AdminUploadPanel({
  accessToken,
  onUploaded,
}: {
  accessToken: string | undefined
  onUploaded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function submit() {
    setErrMsg(null); setOkMsg(null)
    if (!accessToken) { setErrMsg("Not signed in"); return }
    if (!title.trim() || !file) { setErrMsg("Title and file are required"); return }

    setBusy(true)
    try {
      const form = new FormData()
      form.append("title", title.trim())
      form.append("author", author.trim())
      form.append("description", description.trim())
      form.append("file", file)
      if (cover) form.append("cover", cover)

      const res = await fetch("/api/community-books/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload failed")

      setOkMsg(`Uploaded "${data.book.title}"`)
      setTitle(""); setAuthor(""); setDescription(""); setFile(null); setCover(null)
      onUploaded()
    } catch (e: any) {
      setErrMsg(e?.message ?? "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between text-white"
      >
        <span className="text-lg font-semibold">
          📤 Upload a book {open ? "" : "(admin)"}
        </span>
        <span className="text-2xl">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-white/90 text-sm mb-1">Title *</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
              placeholder="The Jungle Book"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/90 text-sm mb-1">Author</label>
              <input
                type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
                placeholder="Rudyard Kipling"
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm mb-1">
                Book file * <span className="text-white/50">(.pdf or .epub, max 50MB)</span>
              </label>
              <input
                type="file" accept=".pdf,.epub,application/pdf,application/epub+zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-white/90 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/90 text-sm mb-1">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none resize-none"
              placeholder="A short description…"
            />
          </div>
          <div>
            <label className="block text-white/90 text-sm mb-1">
              Cover image <span className="text-white/50">(optional)</span>
            </label>
            <input
              type="file" accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="w-full text-white/90 text-sm"
            />
          </div>

          {errMsg && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-3 text-sm">
              {errMsg}
            </div>
          )}
          {okMsg && (
            <div className="bg-green-500/20 border border-green-400/30 text-green-100 rounded-lg p-3 text-sm">
              {okMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={busy || !title.trim() || !file}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Uploading…" : "Upload book"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
