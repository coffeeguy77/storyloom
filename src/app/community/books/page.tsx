// src/app/community/books/page.tsx
//
// Community book library with:
// - Direct browser-to-Supabase upload (bypasses Vercel 4.5MB limit)
// - EPUB auto-extract of title/author/description/cover on file select
// - Admin moderation panel when user is admin

"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import { useCommunityBooks, type CommunityBook } from "@/lib/useCommunityBooks"
import AdminBookModerationPanel from "@/components/AdminBookModerationPanel"
import { extractEpubMetadata } from "@/lib/epubMetadata"
import { uploadBookDirect } from "@/lib/directBookUpload"

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
          <Link href="/" className="text-white/80 hover:text-white underline">
            ← Home
          </Link>
        </div>

        {isAdmin && <AdminBookModerationPanel onChange={reload} />}

        <SubmissionPanel isAdmin={isAdmin} onUploaded={reload} />

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-white/60">Loading books…</div>
        ) : books.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center">
            <p className="text-white/80">No approved books yet.</p>
            <p className="text-white/60 text-sm mt-2">
              {isAdmin ? "Upload one above to get started." : "Submit one above for review."}
            </p>
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
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
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
        {book.author && <p className="text-white/60 text-sm mt-1">{book.author}</p>}
      </div>
    </Link>
  )
}

function SubmissionPanel({
  isAdmin,
  onUploaded,
}: {
  isAdmin: boolean
  onUploaded: () => void
}) {
  const { client, session } = useSupabase()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<File | Blob | null>(null)
  const [coverMimeType, setCoverMimeType] = useState<string | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractNote, setExtractNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState("")
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setExtractNote(null)
    if (!f) return

    // Only auto-extract for EPUBs. PDFs: user enters manually.
    const isEpub =
      f.type === "application/epub+zip" ||
      f.name.toLowerCase().endsWith(".epub")
    if (!isEpub) {
      setExtractNote("Metadata auto-fill is EPUB-only. Please enter details manually for PDFs.")
      return
    }

    setExtracting(true)
    try {
      const meta = await extractEpubMetadata(f)

      // Only overwrite empty fields so the user doesn't lose edits
      if (meta.title && !title) setTitle(meta.title)
      if (meta.author && !author) setAuthor(meta.author)
      if (meta.description && !description) setDescription(meta.description)

      if (meta.coverBlob) {
        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
        setCover(meta.coverBlob)
        setCoverMimeType(meta.coverMimeType)
        setCoverPreviewUrl(URL.createObjectURL(meta.coverBlob))
      }

      const pieces: string[] = []
      if (meta.title) pieces.push("title")
      if (meta.author) pieces.push("author")
      if (meta.description) pieces.push("description")
      if (meta.coverBlob) pieces.push("cover")
      setExtractNote(
        pieces.length > 0
          ? `Auto-filled: ${pieces.join(", ")}. Review and edit anything you like.`
          : "Couldn't auto-extract metadata. Please fill in the details manually."
      )
    } catch (err: any) {
      setExtractNote(`Auto-extract failed (${err?.message ?? "unknown"}). Enter details manually.`)
    } finally {
      setExtracting(false)
    }
  }

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const c = e.target.files?.[0] ?? null
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    if (!c) {
      setCover(null)
      setCoverMimeType(null)
      setCoverPreviewUrl(null)
      return
    }
    setCover(c)
    setCoverMimeType(c.type || "image/jpeg")
    setCoverPreviewUrl(URL.createObjectURL(c))
  }

  function clearCover() {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCover(null)
    setCoverMimeType(null)
    setCoverPreviewUrl(null)
    if (coverInputRef.current) coverInputRef.current.value = ""
  }

  async function submit() {
    setErrMsg(null)
    setOkMsg(null)
    setStage("")
    if (!client) {
      setErrMsg("Client not ready")
      return
    }
    if (!session?.access_token) {
      setErrMsg("Not signed in")
      return
    }
    if (!title.trim() || !file) {
      setErrMsg("Title and file are required")
      return
    }

    setBusy(true)
    try {
      const result = await uploadBookDirect(client, {
        file,
        cover,
        coverMimeType,
        onProgress: (info) => setStage(info.stage),
      })

      setStage("Saving…")
      const res = await fetch("/api/community-books/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookId: result.bookId,
          title: title.trim(),
          author: author.trim(),
          description: description.trim(),
          fileStoragePath: result.fileStoragePath,
          fileType: result.fileType,
          fileSizeBytes: result.fileSizeBytes,
          coverStoragePath: result.coverStoragePath,
          coverSignedUrl: result.coverSignedUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "Register failed")
      }

      setOkMsg(
        isAdmin
          ? `Uploaded "${data.book.title}"`
          : `Submitted "${data.book.title}" for review.`
      )
      setTitle("")
      setAuthor("")
      setDescription("")
      setFile(null)
      clearCover()
      setExtractNote(null)
      onUploaded()
    } catch (e: any) {
      setErrMsg(e?.message ?? "Upload failed")
    } finally {
      setBusy(false)
      setStage("")
    }
  }

  const heading = isAdmin ? "📤 Upload a book" : "📤 Submit a book for review"

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between text-white"
      >
        <span className="text-lg font-semibold">{heading}</span>
        <span className="text-2xl">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-6 space-y-4">
          {!isAdmin && (
            <div className="bg-blue-500/10 border border-blue-400/30 text-blue-100 rounded-lg p-3 text-sm">
              Your submission will be reviewed by an admin before it appears in the library.
              Please only submit books you have the right to share.
            </div>
          )}

          <div>
            <label className="block text-white/90 text-sm mb-1">
              Book file * <span className="text-white/50">(.pdf or .epub, max 50MB)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              onChange={onFilePick}
              disabled={busy}
              className="w-full text-white/90 text-sm"
            />
            {file && (
              <p className="text-white/60 text-xs mt-1">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
            {extracting && (
              <p className="text-white/60 text-xs mt-1">Reading EPUB metadata…</p>
            )}
            {extractNote && !extracting && (
              <p className="text-white/70 text-xs mt-1 italic">{extractNote}</p>
            )}
          </div>

          <div>
            <label className="block text-white/90 text-sm mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
              placeholder="The Jungle Book"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm mb-1">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={busy}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
              placeholder="Rudyard Kipling"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={4}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none resize-none"
              placeholder="A short description…"
            />
          </div>

          <div>
            <label className="block text-white/90 text-sm mb-1">
              Cover image <span className="text-white/50">(optional; auto-extracted for EPUBs)</span>
            </label>
            <div className="flex items-start gap-4">
              {coverPreviewUrl && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreviewUrl}
                    alt="Cover preview"
                    className="w-24 h-32 object-cover rounded border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={clearCover}
                    disabled={busy}
                    className="block text-white/60 hover:text-white text-xs underline mt-1"
                  >
                    Remove cover
                  </button>
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={onCoverPick}
                disabled={busy}
                className="flex-1 text-white/90 text-sm"
              />
            </div>
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
          {busy && stage && (
            <div className="bg-blue-500/20 border border-blue-400/30 text-blue-100 rounded-lg p-3 text-sm">
              {stage}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={busy || !title.trim() || !file}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (stage || "Working…") : (isAdmin ? "Upload book" : "Submit for review")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
