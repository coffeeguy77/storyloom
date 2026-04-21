// src/app/api/regenerate-cover/route.ts
//
// Re-runs cover generation for an existing story. Uses the story's saved
// `image_prompt` (so the regenerated cover is consistent with what the user
// originally reviewed) unless an override is provided. Updates `image_url`
// in place.
//
// Auth: the request must carry the user's Supabase access token. We validate
// the token server-side and ensure the caller owns the story being updated.
//
// Body: { storyId: string, overridePrompt?: string }
// Returns: { imageUrl: string }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { uploadToCloudinary } from "../generate-image/route"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const cloudKey = process.env.CLOUDINARY_API_KEY
  const cloudSecret = process.env.CLOUDINARY_API_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!openaiKey || !cloudName || !cloudKey || !cloudSecret) {
    return NextResponse.json({ error: "Server env vars missing" }, { status: 500 })
  }
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 })
  }

  // ---- Auth ----------------------------------------------------------------
  const authHeader = req.headers.get("authorization") ?? ""
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  // Build a client scoped to this user's token — RLS will enforce ownership
  // when we read and write stories below.
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  // ---- Body ----------------------------------------------------------------
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }
  const storyId: string | undefined = body?.storyId
  const overridePrompt: string | undefined =
    typeof body?.overridePrompt === "string" && body.overridePrompt.trim()
      ? body.overridePrompt.trim() : undefined
  if (!storyId) {
    return NextResponse.json({ error: "storyId required" }, { status: 400 })
  }

  // ---- Fetch story (RLS enforces ownership) --------------------------------
  const { data: story, error: storyErr } = await supabase
    .from("stories")
    .select("id, title, image_prompt, content")
    .eq("id", storyId)
    .maybeSingle()
  if (storyErr || !story) {
    return NextResponse.json({ error: "Story not found or not yours" }, { status: 404 })
  }

  const prompt =
    overridePrompt ??
    story.image_prompt ??
    `Children's book cover illustration for "${story.title}". ${(story.content ?? "").slice(0, 200)}. Style: colorful, vibrant, magical, suitable for children.`

  // ---- Generate via DALL-E 3 ----------------------------------------------
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
        response_format: "url",
      }),
    })
    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      return NextResponse.json(
        { error: "OpenAI regeneration failed", detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }
    const openaiData = await openaiRes.json()
    const tempUrl: string | undefined = openaiData?.data?.[0]?.url
    if (!tempUrl) {
      return NextResponse.json({ error: "OpenAI returned no image URL" }, { status: 502 })
    }

    // ---- Upload to Cloudinary ---------------------------------------------
    const permanentUrl = await uploadToCloudinary({
      sourceUrl: tempUrl,
      cloudName, apiKey: cloudKey, apiSecret: cloudSecret,
      folder: "storyloom/covers",
    })

    // ---- Persist (RLS enforces ownership again on the update) -------------
    const { error: updateErr } = await supabase
      .from("stories")
      .update({ image_url: permanentUrl })
      .eq("id", storyId)
    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to save new cover", detail: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageUrl: permanentUrl })
  } catch (err: any) {
    console.error("regenerate-cover error:", err)
    return NextResponse.json(
      { error: "Unexpected server error", detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
