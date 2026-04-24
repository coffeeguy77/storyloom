// src/lib/epubMetadata.ts
//
// Client-side extractor for EPUB metadata + cover.
// Uses epubjs (already a dep). Returns best-effort values; fields that
// can't be extracted return null rather than throwing.
//
// Usage:
//   const meta = await extractEpubMetadata(file)
//   // meta.title, meta.author, meta.description, meta.coverBlob
//
// The coverBlob is ready to upload to Storage as-is. Its media type is in
// meta.coverMimeType.

"use client"

export type EpubMetadata = {
  title: string | null
  author: string | null
  description: string | null
  publisher: string | null
  language: string | null
  isbn: string | null
  coverBlob: Blob | null
  coverMimeType: string | null
}

export async function extractEpubMetadata(file: File | Blob): Promise<EpubMetadata> {
  const result: EpubMetadata = {
    title: null,
    author: null,
    description: null,
    publisher: null,
    language: null,
    isbn: null,
    coverBlob: null,
    coverMimeType: null,
  }

  try {
    const ePubModule: any = await import("epubjs")
    const ePub = ePubModule.default || ePubModule
    const buffer = await file.arrayBuffer()
    const book = ePub(buffer)
    await book.ready

    // Metadata
    const packaging = book.packaging ?? book.package
    const md = packaging?.metadata ?? {}

    result.title = firstNonEmpty(md.title)
    result.author = firstNonEmpty(md.creator)
    result.description = cleanDescription(firstNonEmpty(md.description))
    result.publisher = firstNonEmpty(md.publisher)
    result.language = firstNonEmpty(md.language)
    result.isbn = extractIsbn(md)

    // Cover — try standard locations in order
    const coverUrl = await findCover(book)
    if (coverUrl) {
      try {
        const res = await fetch(coverUrl)
        if (res.ok) {
          const blob = await res.blob()
          result.coverBlob = blob
          result.coverMimeType = blob.type || "image/jpeg"
        }
      } catch {
        // Cover fetch failed — not critical, skip
      }
    }

    try { book.destroy() } catch {}
  } catch (e) {
    console.warn("extractEpubMetadata: failed to parse", e)
  }

  return result
}

function firstNonEmpty(value: any): string | null {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = stringify(v)
      if (s) return s
    }
    return null
  }
  return stringify(value)
}

function stringify(v: any): string | null {
  if (typeof v === "string") {
    const trimmed = v.trim()
    return trimmed || null
  }
  if (typeof v === "object" && v !== null) {
    // epubjs sometimes returns { _: "text", $: { role: "aut" } }
    if (typeof v._ === "string") return v._.trim() || null
    if (typeof v["#text"] === "string") return v["#text"].trim() || null
    if (typeof v.value === "string") return v.value.trim() || null
  }
  return null
}

function cleanDescription(desc: string | null): string | null {
  if (!desc) return null
  // EPUB descriptions often contain HTML. Strip tags for a clean text version.
  // Keep paragraph breaks as newlines.
  const withBreaks = desc
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
  return withBreaks
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || null
}

function extractIsbn(md: any): string | null {
  // ISBN often lives in identifier. Can be an object, array, or string.
  const ids = md.identifier
  if (!ids) return null
  const items = Array.isArray(ids) ? ids : [ids]
  for (const item of items) {
    const s = typeof item === "string" ? item : (item?._ ?? item?.value ?? "")
    if (typeof s === "string" && /\d{10,13}/.test(s)) {
      const match = s.match(/(\d[\d\-]{8,16})/)
      if (match) return match[1].replace(/-/g, "")
    }
  }
  return null
}

async function findCover(book: any): Promise<string | null> {
  // 1) Try the modern API: book.coverUrl()
  try {
    if (typeof book.coverUrl === "function") {
      const url = await book.coverUrl()
      if (url) return url
    }
  } catch {}

  // 2) Try resolving via manifest items with properties="cover-image"
  try {
    const manifest = book.packaging?.manifest ?? {}
    for (const key of Object.keys(manifest)) {
      const item = manifest[key]
      const props = item?.properties || ""
      if (typeof props === "string" && props.includes("cover-image")) {
        if (item.href) {
          const resolved = book.resolve ? book.resolve(item.href) : item.href
          return await book.archive?.createUrl?.(resolved, { base64: false }) ?? resolved
        }
      }
    }
  } catch {}

  // 3) Look for meta name="cover" pointing at a manifest id
  try {
    const metadata = book.packaging?.metadata ?? {}
    const coverMetaId = metadata?.cover
    if (coverMetaId) {
      const manifest = book.packaging?.manifest ?? {}
      const item = manifest[coverMetaId]
      if (item?.href) {
        const resolved = book.resolve ? book.resolve(item.href) : item.href
        return await book.archive?.createUrl?.(resolved, { base64: false }) ?? resolved
      }
    }
  } catch {}

  return null
}
