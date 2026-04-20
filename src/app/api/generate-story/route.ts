// src/app/api/generate-story/route.ts
// Server-side: calls OpenAI GPT-4o to generate a 500+ word children's story.
// Env var required: OPENAI_API_KEY

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

type Body = {
  systemPrompt: string
  userPrompt: string
  model?: "gpt-4o" | "gpt-4o-mini"
  temperature?: number
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    const { systemPrompt, userPrompt } = body
    const model = body.model ?? "gpt-4o"
    const temperature = body.temperature ?? 0.9

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: "Missing prompts" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 })
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("OpenAI chat error:", errText)
      return NextResponse.json(
        { error: "Story generation failed", detail: errText },
        { status: 502 }
      )
    }

    const json = await res.json()
    const story: string | undefined = json?.choices?.[0]?.message?.content?.trim()
    if (!story) {
      return NextResponse.json({ error: "No story returned" }, { status: 502 })
    }

    return NextResponse.json({ story, model, usage: json.usage })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("generate-story route error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
