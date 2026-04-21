// src/lib/regenerateCover.ts
//
// Calls /api/regenerate-cover with the current Supabase access token.
// Returns the new permanent Cloudinary URL.

"use client"

import { createClient } from "@supabase/supabase-js"

let _client: ReturnType<typeof createClient> | null = null
function client() {
  if (_client) return _client
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}

export async function regenerateCover(storyId: string, overridePrompt?: string): Promise<string> {
  const { data: { session } } = await client().auth.getSession()
  if (!session?.access_token) throw new Error("Not signed in")

  const res = await fetch("/api/regenerate-cover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ storyId, overridePrompt }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? `Failed (${res.status})`)
  }
  if (!data?.imageUrl) throw new Error("No image URL returned")
  return data.imageUrl
}

// Heuristic: does this URL look like an expired OpenAI temporary URL?
export function isDeadCoverUrl(url: string | null | undefined): boolean {
  if (!url) return true
  return url.includes("oaidalleapiprodscus.blob.core.windows.net")
}
