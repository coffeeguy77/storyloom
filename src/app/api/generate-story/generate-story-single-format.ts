import { NextRequest, NextResponse } from 'next/server'

interface StoryRequest {
  idea: string
  ageGroup: '3-5' | '6-8' | '9-12' 
  tone: 'funny' | 'calm' | 'adventure' | 'educational'
  length: 'short' | 'medium' | 'long'
  artStyle: 'cartoon' | 'watercolor' | 'sketch'
  character?: { name?: string; age?: string; appearance?: string; description?: string; role?: string }
}

interface StoryResponse {
  id: string
  title: string
  fullText: string
  coverImagePrompt: string
  coverImageUrl?: string
  wordCount: number
  metadata: { ageGroup: string; tone: string; length: string; artStyle: string; character?: any; createdAt: string }
  success: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: StoryRequest = await request.json()
    const { idea, ageGroup, tone, length, artStyle, character } = body

    if (!idea?.trim()) {
      return NextResponse.json({ success: false, error: 'Story idea is required' }, { status: 400 })
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables')
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
      }, { status: 500 })
    }

    const characterName = character?.name || 'Alex'
    const characterRole = character?.role || ''
    const characterDescription = character?.description || ''
    
    console.log('🎯 Generating single-format story with OpenAI:', { idea, characterName, characterRole, ageGroup, tone, length })

    // Build the character context
    let characterContext = characterName
    if (characterRole) characterContext += ` the ${characterRole}`
    if (characterDescription) characterContext += ` (${characterDescription})`

    // Create the primary prompt for story generation
    const primaryPrompt = `Write a complete children's story about ${characterContext} and ${idea}. 

Requirements:
- Age-appropriate for ${ageGroup} year olds
- ${tone} tone throughout
- ${length === 'short' ? '300-400' : length === 'medium' ? '500-600' : '700-800'} words total
- Complete narrative arc with beginning, middle, end
- Engaging, unique story that brings "${idea}" to life
- Natural paragraph breaks for easy reading
- Vivid descriptions perfect for illustration

Format your response as:
TITLE: [Creative, engaging title]
STORY: [Complete story text with natural paragraph breaks]

Make the title catchy and relevant to both the character and the adventure, not just a combination of names.`

    // System prompt for high-quality story generation
    const systemPrompt = `You are a master children's book author who creates engaging, unique stories. Your stories:
- Have compelling characters and genuine adventures
- Use vivid, age-appropriate language
- Include natural dialogue and emotion
- Have satisfying conclusions where characters learn and grow
- Are perfectly formatted for children's books

Never use template language or repetitive phrases. Each story should be completely unique and tailored to the specific request.`

    try {
      console.log('🚀 Calling OpenAI GPT-4 for complete story generation...')
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: primaryPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.8
        }),
      })

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error('❌ OpenAI API error:', openaiResponse.status, errorText)
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      }

      const openaiData = await openaiResponse.json()
      console.log('✅ OpenAI story generation response received')
      
      if (openaiData.choices?.[0]?.message?.content) {
        const storyContent = openaiData.choices[0].message.content.trim()
        console.log('📖 Raw story content received from OpenAI')

        // Parse the response to extract title and story
        let title = ''
        let fullText = ''
        
        const lines = storyContent.split('\n').filter((line: string) => line.trim())
        
        // Look for TITLE: and STORY: markers
        let foundTitle = false
        let foundStory = false
        let storyLines: string[] = []
        
        for (const line of lines) {
          if (line.startsWith('TITLE:')) {
            title = line.replace('TITLE:', '').trim()
            foundTitle = true
          } else if (line.startsWith('STORY:')) {
            foundStory = true
            const storyPart = line.replace('STORY:', '').trim()
            if (storyPart) storyLines.push(storyPart)
          } else if (foundStory) {
            storyLines.push(line)
          } else if (!foundTitle && !foundStory) {
            // If no markers found, treat first line as title, rest as story
            if (!title && line.length < 100) {
              title = line
            } else {
              storyLines.push(line)
            }
          }
        }
        
        fullText = storyLines.join('\n\n')
        
        // Clean and validate title
        if (!title || title.length < 5) {
          // Generate a proper title based on character and idea
          const cleanIdea = idea.toLowerCase().replace(/[^\w\s]/g, '').split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          title = `${characterName}'s ${cleanIdea} Adventure`
        }
        
        // Remove any remaining formatting artifacts
        title = title.replace(/^(Title:|Chapter \d+:?|\d+\.)\s*/i, '').trim()
        
        // Count words
        const wordCount = fullText.split(/\s+/).length
        
        // Create comprehensive cover image prompt
        const coverImagePrompt = `Children's storybook cover illustration: "${title}". 
        Main character: ${characterName}${characterRole ? ` the ${characterRole}` : ''} in an exciting scene depicting ${idea}.
        Art style: Colorful, whimsical, professional ${artStyle} illustration with magical ${tone} atmosphere.
        Book cover design with space for title at top or bottom.
        Rich details, engaging composition, perfect for children's literature.
        Safe for children, enchanting and magical, professional quality children's book artwork.`

        // Generate fallback cover image URL
        const coverImageUrl = `https://source.unsplash.com/800x1000/?children,storybook,${encodeURIComponent(idea)},book,illustration&sig=${Date.now()}`

        const response: StoryResponse = {
          id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: title,
          fullText: fullText,
          coverImagePrompt: coverImagePrompt,
          coverImageUrl: coverImageUrl,
          wordCount: wordCount,
          metadata: { 
            ageGroup, 
            tone, 
            length, 
            artStyle, 
            character: character || null, 
            createdAt: new Date().toISOString() 
          },
          success: true
        }

        console.log('🎉 Complete story generated successfully!')
        console.log(`📚 Title: ${title}`)
        console.log(`📝 Word count: ${wordCount}`)
        console.log(`🎨 Cover image prompt created`)
        
        return NextResponse.json(response)

      } else {
        console.error('❌ Invalid OpenAI response format:', openaiData)
        throw new Error('Invalid response format from OpenAI API')
      }

    } catch (openaiError) {
      console.error('❌ OpenAI story generation failed:', openaiError)
      throw openaiError // No fallback - force the issue to be fixed
    }

  } catch (error) {
    console.error('❌ Story generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during story generation'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'OpenAI-Powered StoryLoom API - Single Story Format!',
    version: '5.0.0',
    features: [
      'OpenAI GPT-4 complete story generation',
      'Single beautiful cover image',
      'Continuous readable text format',
      'Proper title generation',
      'Clean, simple layout',
      'Perfect for children\'s books'
    ],
    provider: process.env.OPENAI_API_KEY ? 'OpenAI GPT-4' : 'API key required'
  })
}
