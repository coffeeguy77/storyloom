import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      )
    }

    console.log('Generating story with GPT-4...')

    // Use GPT-4 for high-quality story generation
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for highest quality
      messages: [
        {
          role: "system",
          content: `You are Tommy, a magical storyteller who creates enchanting children's stories. Your stories should be:
- Age-appropriate for children 4-8 years old
- Engaging and imaginative with vivid descriptions
- Educational and include positive life lessons
- Well-structured with clear beginning, middle, and end
- Written in a warm, friendly tone
- About 300-500 words long
- Free of scary, violent, or inappropriate content

Create a complete story that parents would love to read to their children.`
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8, // Creative but controlled
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const story = completion.choices[0]?.message?.content

    if (!story) {
      throw new Error('No story generated')
    }

    console.log('Story generated successfully with GPT-4')

    return NextResponse.json({
      story: story.trim(),
      model: 'gpt-4',
      usage: completion.usage
    })

  } catch (error) {
    console.error('Story generation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate story',
        details: 'Story generation failed using GPT-4'
      },
      { status: 500 }
    )
  }
}
