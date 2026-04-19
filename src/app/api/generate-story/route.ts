import { NextRequest, NextResponse } from 'next/server'

interface StoryRequest {
  idea: string
  ageGroup: '3-5' | '6-8' | '9-12' 
  tone: 'funny' | 'calm' | 'adventure' | 'educational'
  length: 'short' | 'medium' | 'long'
  artStyle: 'cartoon' | 'watercolor' | 'sketch'
  character?: { name?: string; age?: string; appearance?: string; description?: string; role?: string }
}

interface StoryPage {
  pageNumber: number
  text: string
  imagePrompt: string
  imageUrl?: string
}

interface StoryResponse {
  id: string
  title: string
  pages: StoryPage[]
  coverImagePrompt: string
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
    
    console.log('🎯 Generating story with OpenAI for:', { idea, characterName, characterRole, ageGroup, tone, length })

    // Build the character context
    let characterContext = characterName
    if (characterRole) characterContext += ` the ${characterRole}`
    if (characterDescription) characterContext += ` (${characterDescription})`

    // Create the primary prompt exactly as requested
    const primaryPrompt = `create a children's story about ${characterContext} and ${idea}`

    // Enhanced system prompt for intelligent story creation
    const systemPrompt = `You are a master children's book author who creates engaging, unique stories that capture children's imagination. You write stories that:

- Are age-appropriate for ${ageGroup} year olds
- Have a ${tone} tone throughout
- Create natural narrative flow with clear story progression
- Include vivid descriptions perfect for illustrations
- Have satisfying resolutions where characters learn and grow
- Use language that's engaging but accessible for the target age

CRITICAL: You MUST structure your response with clear page breaks using "--- PAGE BREAK ---" markers. Each page should contain 2-4 paragraphs of substantial content (60-100 words per page).

Format your response as a complete story with natural page breaks, not JSON. Write engaging narrative prose with clear paragraph structure.`

    try {
      console.log('🚀 Calling OpenAI GPT-4 for story generation...')
      
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
          max_tokens: 2000,
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

        // Extract title from the first line or create one - FIXED: Added type annotation
        const lines = storyContent.split('\n').filter((line: string) => line.trim())
        let title = lines[0]
        
        // If first line looks like a title (short, no period), use it; otherwise create one
        if (title.length > 50 || title.includes('.') || title.includes(',')) {
          title = `${characterName} and the ${idea.split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')}`
        } else {
          // Remove title from content
          lines.shift()
        }

        // Clean title
        title = title.replace(/^(Title:|Chapter \d+:?|\d+\.)\s*/i, '').trim()

        // Split content into pages intelligently
        let fullContent = lines.join('\n')
        
        // Try to split on page break markers first
        let pageTexts: string[] = []
        if (fullContent.includes('--- PAGE BREAK ---') || fullContent.includes('PAGE BREAK')) {
          pageTexts = fullContent.split(/---\s*PAGE\s*BREAK\s*---|PAGE\s*BREAK/i)
            .map((text: string) => text.trim())
            .filter((text: string) => text.length > 0)
        } else {
          // Smart paragraph-based splitting
          const paragraphs = fullContent.split('\n\n').filter((p: string) => p.trim().length > 0)
          
          // Group paragraphs into pages based on length and natural breaks
          const targetPages = length === 'short' ? 4 : length === 'medium' ? 6 : 8
          const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / targetPages))
          
          pageTexts = []
          for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
            const pageContent = paragraphs.slice(i, i + paragraphsPerPage).join('\n\n')
            if (pageContent.trim()) {
              pageTexts.push(pageContent.trim())
            }
          }
        }

        // Ensure we have the right number of pages
        const targetPageCount = length === 'short' ? 4 : length === 'medium' ? 6 : 8
        
        if (pageTexts.length < targetPageCount) {
          // If we have too few pages, split longer pages
          const newPageTexts: string[] = []
          for (const pageText of pageTexts) {
            const sentences = pageText.split(/(?<=[.!?])\s+/)
            if (sentences.length > 4 && newPageTexts.length < targetPageCount - 1) {
              const mid = Math.ceil(sentences.length / 2)
              newPageTexts.push(sentences.slice(0, mid).join(' '))
              newPageTexts.push(sentences.slice(mid).join(' '))
            } else {
              newPageTexts.push(pageText)
            }
          }
          pageTexts = newPageTexts.slice(0, targetPageCount)
        } else if (pageTexts.length > targetPageCount) {
          // If we have too many pages, combine shorter ones
          pageTexts = pageTexts.slice(0, targetPageCount)
        }

        // Create story pages with enhanced image prompts
        const pages: StoryPage[] = pageTexts.map((pageText: string, index: number) => {
          // Create intelligent image prompt based on page content
          const pageNumber = index + 1
          const isFirstPage = pageNumber === 1
          const isLastPage = pageNumber === pageTexts.length
          
          // Extract key visual elements from the page text
          const imagePrompt = createImagePrompt(pageText, characterName, characterRole, artStyle, isFirstPage, isLastPage)
          
          return {
            pageNumber,
            text: pageText,
            imagePrompt,
            imageUrl: `https://source.unsplash.com/800x600/?children,storybook,${encodeURIComponent(idea)},illustration&sig=${pageNumber}`
          }
        })

        // Create cover art prompt
        const coverImagePrompt = `Children's storybook cover illustration: ${title}. Features ${characterName}${characterRole ? ` the ${characterRole}` : ''} in a scene related to ${idea}. Style: Colorful, whimsical, child-friendly ${artStyle} illustration with title space at top. Book cover design, professional children's literature artwork, engaging and magical.`

        const response: StoryResponse = {
          id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: title,
          pages: pages,
          coverImagePrompt: coverImagePrompt,
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

        console.log('🎉 Intelligent story with natural page breaks generated successfully!')
        console.log(`📚 Title: ${title}`)
        console.log(`📄 Pages: ${pages.length}`)
        console.log(`📝 Average words per page: ${pages.reduce((sum: number, p: StoryPage) => sum + p.text.split(' ').length, 0) / pages.length}`)
        
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

// Helper function to create intelligent image prompts based on page content
function createImagePrompt(pageText: string, characterName: string, characterRole: string, artStyle: string, isFirstPage: boolean, isLastPage: boolean): string {
  // Extract key visual elements from the text
  const lowercaseText = pageText.toLowerCase()
  
  // Look for actions, settings, emotions, and objects
  const actions = ['walking', 'running', 'flying', 'climbing', 'jumping', 'dancing', 'singing', 'laughing', 'crying', 'sleeping', 'waking', 'eating', 'playing', 'working', 'building', 'discovering', 'exploring', 'hiding', 'searching']
  const settings = ['forest', 'garden', 'house', 'farm', 'castle', 'beach', 'mountain', 'field', 'barn', 'kitchen', 'bedroom', 'yard', 'village', 'city', 'school', 'park']
  const emotions = ['happy', 'excited', 'surprised', 'worried', 'scared', 'curious', 'proud', 'sad', 'angry', 'confused', 'determined']
  
  let sceneElements: string[] = []
  
  // Add character
  sceneElements.push(characterName + (characterRole ? ` the ${characterRole}` : ''))
  
  // Find actions in text
  const foundActions = actions.filter((action: string) => lowercaseText.includes(action))
  if (foundActions.length > 0) {
    sceneElements.push(foundActions[0])
  }
  
  // Find settings in text
  const foundSettings = settings.filter((setting: string) => lowercaseText.includes(setting))
  if (foundSettings.length > 0) {
    sceneElements.push(`in ${foundSettings[0]}`)
  }
  
  // Find emotions in text
  const foundEmotions = emotions.filter((emotion: string) => lowercaseText.includes(emotion))
  if (foundEmotions.length > 0) {
    sceneElements.push(`feeling ${foundEmotions[0]}`)
  }
  
  // Special handling for first and last pages
  if (isFirstPage) {
    sceneElements.push('story beginning')
  } else if (isLastPage) {
    sceneElements.push('happy ending')
  }
  
  const sceneDescription = sceneElements.join(', ')
  
  return `Children's storybook illustration: ${sceneDescription}. Style: Colorful, whimsical, child-friendly ${artStyle} illustration with warm lighting and magical atmosphere. Safe for children, engaging and enchanting, professional children's book artwork.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'OpenAI-Powered StoryLoom API - Real Stories, Intelligent Pages!',
    version: '4.0.0',
    features: [
      'OpenAI GPT-4 story generation',
      'Intelligent page breaks based on content',
      'Natural paragraph structure',
      'Smart image prompt generation',
      'Cover art creation',
      'No fallback templates'
    ],
    provider: process.env.OPENAI_API_KEY ? 'OpenAI GPT-4' : 'API key required'
  })
}
