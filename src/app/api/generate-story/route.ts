// src/app/api/generate-story/route.ts
//
// Story generation endpoint. Uses GPT-4 only.
//
// Accepts EITHER of these request body shapes (whichever the frontend sends):
//   1. { prompt: string }
//   2. { systemPrompt?: string, userPrompt: string }
//   3. { messages: [{ role, content }, ...] }
//
// Returns: { story: string, title?: string }

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY" },
      { status: 500 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    )
  }

  // Normalise the incoming shape into a messages array.
  const messages: ChatMessage[] = []

  const defaultSystem =
    "You are a master children's storyteller. Write warm, imaginative, age-appropriate stories with vivid sensory detail, a clear beginning, middle, and end, and a gentle, hopeful tone. Keep language simple enough for a child to follow but rich enough to delight a parent reading aloud. Avoid scary, violent, or upsetting content. Use the named characters consistently throughout."

  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    // Shape 3: explicit messages array
    for (const m of body.messages) {
      if (m && typeof m.content === "string" && m.role) {
        messages.push({ role: m.role, content: m.content })
      }
    }
  } else if (typeof body?.userPrompt === "string" && body.userPrompt.trim()) {
    // Shape 2: system + user
    messages.push({
      role: "system",
      content:
        typeof body.systemPrompt === "string" && body.systemPrompt.trim()
          ? body.systemPrompt
          : defaultSystem,
    })
    messages.push({ role: "user", content: body.userPrompt })
  } else if (typeof body?.prompt === "string" && body.prompt.trim()) {
    // Shape 1: single prompt string
    messages.push({ role: "system", content: defaultSystem })
    messages.push({ role: "user", content: body.prompt })
  } else {
    return NextResponse.json(
      {
        error:
          "Request must include `prompt` (string), `userPrompt` (string), or `messages` (array).",
      },
      { status: 400 }
    )
  }

  // Make sure there is at least one system message at the front.
  if (messages[0]?.role !== "system") {
    messages.unshift({ role: "system", content: defaultSystem })
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        temperature: 0.85,
        max_tokens: 1800,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error("OpenAI story API error:", openaiRes.status, errText)
      return NextResponse.json(
        {
          error: "OpenAI story generation failed",
          status: openaiRes.status,
          detail: errText.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const data = await openaiRes.json()
    const story: string = data?.choices?.[0]?.message?.content?.trim() ?? ""

    if (!story) {
      return NextResponse.json(
        { error: "OpenAI returned an empty story" },
        { status: 502 }
      )
    }

    // Try to extract a title from the first non-empty line if it looks title-ish.
    let title: string | undefined
    const firstLine = story.split("\n").find((l) => l.trim().length > 0)?.trim()
    if (firstLine && firstLine.length <= 120) {
      title = firstLine.replace(/^#+\s*/, "").replace(/^["'"']|["'"']$/g, "")
    }

    return NextResponse.json({ story, title })
  } catch (err: any) {
    console.error("generate-story unexpected error:", err)
    return NextResponse.json(
      { error: "Unexpected server error", detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
