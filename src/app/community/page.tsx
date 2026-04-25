// src/app/community/page.tsx
//
// Unified Community page. Five tabs:
//   Books | Stories | My Submissions | Upload | Moderate (admin only)
//
// Story schema uses author_id, show_author, status (pending/approved/rejected),
// with display name resolved via profiles join (author_display_name).

"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import { useCommunity, type CommunityBook, type CommunityStory, type CommunityItem } from "@/lib/useCommunity"
import { extractEpubMetadata } from "@/lib/epubMetadata"
import { uploadBookDirect } from "@/lib/directBookUpload"

type Tab = "books" | "stories" | "mine" | "upload" | "moderate"

export default function CommunityPage() {
  const { user, isAdmin } = useSupabase()
  const community = useCommunity()
  const [tab, setTab] = useState<Tab>("books")

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to use Community</h1>
          <p className="text-white/80 mb-6">
            The Community is available to signed-in StoryLoom members.
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

  const pendingTotal = community.pendingBooks.length + community.pendingStories.length
  const flaggedTotal = community.flaggedBooks.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-2xl">Community</h1>
          <Link href="/" className="text-white/80 hover:text-white underline">
            ← Home
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <TabButton active={tab === "books"} onClick={() => setTab("books")}>Books</TabButton>
          <TabButton active={tab === "stories"} onClick={() => setTab("stories")}>Stories</TabButton>
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>My Submissions</TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>Upload</TabButton>
          {isAdmin && (
            <TabButton
              active={tab === "moderate"}
              onClick={() => setTab("moderate")}
              badge={pendingTotal + flaggedTotal}
            >
              Moderate
            </TabButton>
          )}
        </div>

        {community.error && (
          <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-8">
            {community.error}
          </div>
        )}

        {tab === "books" && <BooksTab books={community.books} loading={community.isLoading} />}
        {tab === "stories" && <StoriesTab stories={community.stories} loading={community.isLoading} />}
        {tab === "mine" && <MyTab items={community.mySubmissions} loading={community.isLoading} onChange={community.reload} />}
        {tab === "upload" && <UploadTab isAdmin={isAdmin} onUploaded={community.reload} />}
        {tab === "moderate" && isAdmin && (
          <ModerateTab
            pendingBooks={community.pendingBooks}
            pendingStories={community.pendingStories}
            flaggedBooks={community.flaggedBooks}
            allBooks={community.allBooks}
            onChange={community.reload}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TAB: Books
// ============================================================================
function BooksTab({ books, loading }: { books: CommunityBook[]; loading: boolean }) {
  if (loading) return <Loading />
  if (books.length === 0) return <EmptyState msg="No books yet." sub="Upload one from the Upload tab." />
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {books.map((b) => <BookCard key={b.id} book={b} />)}
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

// ============================================================================
// TAB: Stories
// ============================================================================
function StoriesTab({ stories, loading }: { stories: CommunityStory[]; loading: boolean }) {
  if (loading) return <Loading />
  if (stories.length === 0) return <EmptyState msg="No stories published yet." sub="Publish one from any of your stories." />
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {stories.map((s) => <StoryCard key={s.id} story={s} />)}
    </div>
  )
}

function StoryCard({ story }: { story: CommunityStory }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
      <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
        {story.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.image_url} alt={story.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">✨</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold leading-tight line-clamp-2">{story.title}</h3>
        {story.show_author && story.author_display_name && (
          <p className="text-white/60 text-sm mt-1">by {story.author_display_name}</p>
        )}
        <p className="text-white/60 text-xs mt-2">
          {new Date(story.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// TAB: My Submissions
// ============================================================================
function MyTab({
  items, loading, onChange,
}: {
  items: CommunityItem[]
  loading: boolean
  onChange: () => void
}) {
  const { session } = useSupabase()

  if (loading) return <Loading />
  if (items.length === 0) {
    return <EmptyState msg="You haven't submitted anything yet." sub="Upload a book or publish a story to start." />
  }

  async function withdraw(item: CommunityItem) {
    if (!session?.access_token) return
    const name = item.title
    if (!confirm(`Withdraw "${name}" from the community?`)) return
    try {
      const url = item.kind === "book"
        ? `/api/community-books/${item.id}/delete`
        : `/api/community-posts/${item.id}/reject`
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? "Withdraw failed")
      }
      onChange()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-xl p-4">
          <TypeBadge kind={item.kind} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{item.title}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {item.kind === "book"
                ? `${(item as CommunityBook).file_type.toUpperCase()} · ${new Date(item.created_at).toLocaleDateString()}`
                : `${new Date(item.created_at).toLocaleDateString()}`}
            </p>
            <StatusPill item={item} />
          </div>
          <button
            onClick={() => withdraw(item)}
            className="bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-white border border-white/20 px-4 py-2 rounded-lg text-sm"
          >
            Withdraw
          </button>
        </div>
      ))}
    </div>
  )
}

function StatusPill({ item }: { item: CommunityItem }) {
  let label = "", colour = ""
  if (item.kind === "book") {
    if (item.is_approved) { label = "Approved"; colour = "bg-green-500/20 text-green-200" }
    else { label = "Pending review"; colour = "bg-yellow-500/20 text-yellow-200" }
  } else {
    if (item.status === "approved") { label = "Approved"; colour = "bg-green-500/20 text-green-200" }
    else if (item.status === "rejected") { label = "Rejected"; colour = "bg-red-500/20 text-red-200" }
    else { label = "Pending review"; colour = "bg-yellow-500/20 text-yellow-200" }
  }
  return (
    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${colour}`}>
      {label}
    </span>
  )
}

// ============================================================================
// TAB: Upload
// ============================================================================
function UploadTab({ isAdmin, onUploaded }: { isAdmin: boolean; onUploaded: () => void }) {
  const { client, session } = useSupabase()
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
    setFile(f); setExtractNote(null)
    if (!f) return

    const isEpub = f.type === "application/epub+zip" || f.name.toLowerCase().endsWith(".epub")
    if (!isEpub) {
      setExtractNote("Metadata auto-fill is EPUB-only. Please enter details manually for PDFs.")
      return
    }

    setExtracting(true)
    try {
      const meta = await extractEpubMetadata(f)
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
      setCover(null); setCoverMimeType(null); setCoverPreviewUrl(null); return
    }
    setCover(c)
    setCoverMimeType(c.type || "image/jpeg")
    setCoverPreviewUrl(URL.createObjectURL(c))
  }

  function clearCover() {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCover(null); setCoverMimeType(null); setCoverPreviewUrl(null)
    if (coverInputRef.current) coverInputRef.current.value = ""
  }

  async function submit() {
    setErrMsg(null); setOkMsg(null); setStage("")
    if (!client) { setErrMsg("Client not ready"); return }
    if (!session?.access_token) { setErrMsg("Not signed in"); return }
    if (!title.trim() || !file) { setErrMsg("Title and file are required"); return }

    setBusy(true)
    try {
      const result = await uploadBookDirect(client, {
        file, cover, coverMimeType,
        onProgress: (info) => setStage(info.stage),
      })
      setStage("Saving…")
      const res = await fetch("/api/community-books/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
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
      if (!res.ok) throw new Error(data?.error ?? "Register failed")

      setOkMsg(isAdmin ? `Uploaded "${data.book.title}"` : `Submitted "${data.book.title}" for review.`)
      setTitle(""); setAuthor(""); setDescription("")
      setFile(null); clearCover(); setExtractNote(null)
      onUploaded()
    } catch (e: any) {
      setErrMsg(e?.message ?? "Upload failed")
    } finally {
      setBusy(false); setStage("")
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-2">
        {isAdmin ? "Upload a book" : "Submit a book for review"}
      </h2>
      <p className="text-white/70 text-sm mb-6">
        {isAdmin
          ? "Your upload will be published to the Books tab immediately."
          : "Your submission will appear in the Books tab once an admin approves it. Please only submit books you have the right to share."}
      </p>

      <div className="space-y-4">
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
          {extracting && <p className="text-white/60 text-xs mt-1">Reading EPUB metadata…</p>}
          {extractNote && !extracting && <p className="text-white/70 text-xs mt-1 italic">{extractNote}</p>}
        </div>

        <Field label="Title *" value={title} setValue={setTitle} disabled={busy} placeholder="The Jungle Book" />
        <Field label="Author" value={author} setValue={setAuthor} disabled={busy} placeholder="Rudyard Kipling" />

        <div>
          <label className="block text-white/90 text-sm mb-1">Description</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            disabled={busy} rows={4}
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
                <img src={coverPreviewUrl} alt="Cover preview" className="w-24 h-32 object-cover rounded border border-white/20" />
                <button type="button" onClick={clearCover} disabled={busy}
                  className="block text-white/60 hover:text-white text-xs underline mt-1">
                  Remove cover
                </button>
              </div>
            )}
            <input ref={coverInputRef} type="file" accept="image/*"
              onChange={onCoverPick} disabled={busy}
              className="flex-1 text-white/90 text-sm"
            />
          </div>
        </div>

        {errMsg && <AlertBox type="err">{errMsg}</AlertBox>}
        {okMsg && <AlertBox type="ok">{okMsg}</AlertBox>}
        {busy && stage && <AlertBox type="info">{stage}</AlertBox>}

        <div className="flex justify-end">
          <button onClick={submit} disabled={busy || !title.trim() || !file}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? (stage || "Working…") : (isAdmin ? "Upload book" : "Submit for review")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TAB: Moderate
// ============================================================================
function ModerateTab({
  pendingBooks, pendingStories, flaggedBooks, allBooks, onChange,
}: {
  pendingBooks: CommunityBook[]
  pendingStories: CommunityStory[]
  flaggedBooks: CommunityBook[]
  allBooks: CommunityBook[]
  onChange: () => void
}) {
  const { session } = useSupabase()
  const [sub, setSub] = useState<"pending" | "flagged" | "all">("pending")

  async function bookApprove(id: string) {
    if (!session?.access_token) return
    const res = await fetch(`/api/community-books/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Approve failed"); return }
    onChange()
  }
  async function bookDelete(id: string, title: string) {
    if (!session?.access_token) return
    if (!confirm(`Delete "${title}"? This removes the file permanently.`)) return
    const res = await fetch(`/api/community-books/${id}/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Delete failed"); return }
    onChange()
  }
  async function storyApprove(id: string) {
    if (!session?.access_token) return
    const res = await fetch(`/api/community-posts/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Approve failed"); return }
    onChange()
  }
  async function storyReject(id: string, title: string) {
    if (!session?.access_token) return
    if (!confirm(`Reject "${title}"? This removes it from the community (but not from the author's library).`)) return
    const res = await fetch(`/api/community-posts/${id}/reject`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Reject failed"); return }
    onChange()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SubTab active={sub === "pending"} onClick={() => setSub("pending")}
          count={pendingBooks.length + pendingStories.length}>Pending</SubTab>
        <SubTab active={sub === "flagged"} onClick={() => setSub("flagged")}
          count={flaggedBooks.length}>Flagged</SubTab>
        <SubTab active={sub === "all"} onClick={() => setSub("all")}
          count={allBooks.length}>All books</SubTab>
      </div>

      {sub === "pending" && (
        (pendingBooks.length === 0 && pendingStories.length === 0) ? (
          <EmptyState msg="No submissions waiting for review." />
        ) : (
          <div className="space-y-3">
            {pendingBooks.map((b) => (
              <ModRow key={`pb-${b.id}`} kind="book" title={b.title}
                subtitle={`${b.author ?? "Unknown author"} · ${b.file_type.toUpperCase()}`}
                cover={b.cover_url}
                actions={
                  <>
                    <GreenBtn onClick={() => bookApprove(b.id)}>Approve</GreenBtn>
                    <RedBtn onClick={() => bookDelete(b.id, b.title)}>Reject</RedBtn>
                  </>
                }
              />
            ))}
            {pendingStories.map((s) => (
              <ModRow key={`ps-${s.id}`} kind="story" title={s.title}
                subtitle={s.show_author && s.author_display_name ? `by ${s.author_display_name}` : "Anonymous"}
                cover={s.image_url}
                actions={
                  <>
                    <GreenBtn onClick={() => storyApprove(s.id)}>Approve</GreenBtn>
                    <RedBtn onClick={() => storyReject(s.id, s.title)}>Reject</RedBtn>
                  </>
                }
              />
            ))}
          </div>
        )
      )}

      {sub === "flagged" && (
        flaggedBooks.length === 0 ? (
          <EmptyState msg="No flagged books." />
        ) : (
          <div className="space-y-3">
            {flaggedBooks.map((b) => (
              <ModRow key={b.id} kind="book" title={b.title}
                subtitle={`${b.author ?? "Unknown author"} · 🚩 ${b.unresolved_flag_count}`}
                cover={b.cover_url}
                actions={<RedBtn onClick={() => bookDelete(b.id, b.title)}>Remove</RedBtn>}
              />
            ))}
          </div>
        )
      )}

      {sub === "all" && (
        allBooks.length === 0 ? (
          <EmptyState msg="No approved books yet." />
        ) : (
          <div className="space-y-3">
            {allBooks.map((b) => (
              <ModRow key={b.id} kind="book" title={b.title}
                subtitle={`${b.author ?? "Unknown author"} · ${b.file_type.toUpperCase()}`}
                cover={b.cover_url}
                actions={<RedBtn onClick={() => bookDelete(b.id, b.title)}>Delete</RedBtn>}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ============================================================================
// Shared small components
// ============================================================================
function TabButton({ children, active, onClick, badge }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
        active ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
      }`}>
      {children}
      {!!badge && badge > 0 && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? "bg-purple-900 text-white" : "bg-red-500 text-white"
        }`}>{badge}</span>
      )}
    </button>
  )
}

function SubTab({ children, active, onClick, count }: {
  children: React.ReactNode; active: boolean; onClick: () => void; count: number
}) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition-all ${
        active ? "bg-white text-purple-900 font-semibold"
               : "bg-white/10 text-white/80 hover:bg-white/20"
      }`}>
      {children}
      {count > 0 && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
        active ? "bg-purple-900 text-white" : "bg-red-500 text-white"
      }`}>{count}</span>}
    </button>
  )
}

function Field({ label, value, setValue, disabled, placeholder }: {
  label: string; value: string; setValue: (v: string) => void
  disabled?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-white/90 text-sm mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
        disabled={disabled} placeholder={placeholder}
        className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
      />
    </div>
  )
}

function AlertBox({ children, type }: { children: React.ReactNode; type: "ok" | "err" | "info" }) {
  const style = type === "ok" ? "bg-green-500/20 border-green-400/30 text-green-100"
              : type === "err" ? "bg-red-500/20 border-red-400/30 text-red-100"
              : "bg-blue-500/20 border-blue-400/30 text-blue-100"
  return <div className={`rounded-lg p-3 text-sm border ${style}`}>{children}</div>
}

function TypeBadge({ kind }: { kind: "book" | "story" }) {
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xl flex-shrink-0 ${
      kind === "book" ? "bg-blue-500/20" : "bg-purple-500/20"
    }`}>
      {kind === "book" ? "📖" : "✨"}
    </span>
  )
}

function ModRow({ kind, title, subtitle, cover, actions }: {
  kind: "book" | "story"
  title: string
  subtitle: string
  cover: string | null
  actions: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="w-12 h-16 bg-white/10 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/40 text-lg">{kind === "book" ? "📖" : "✨"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{title}</p>
        <p className="text-white/60 text-xs truncate">{subtitle}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">{actions}</div>
    </div>
  )
}

function GreenBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">{children}</button>
}
function RedBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">{children}</button>
}

function Loading() {
  return <div className="text-center py-12 text-white/60">Loading…</div>
}
function EmptyState({ msg, sub }: { msg: string; sub?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center">
      <p className="text-white/80">{msg}</p>
      {sub && <p className="text-white/60 text-sm mt-2">{sub}</p>}
    </div>
  )
}
