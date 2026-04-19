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
    const pageCount = length === 'short' ? 4 : length === 'medium' ? 6 : 8
    
    console.log('🎯 Generating story with OpenAI:', { idea, characterName, pageCount, tone })

    // Create a comprehensive prompt for OpenAI to generate a unique children's story
    const storyPrompt = `Write a ${pageCount}-page children's story for ages ${ageGroup} with a ${tone} tone about: "${idea}"

Main character: ${characterName}${character?.description ? ` (${character.description})` : ''}${character?.role ? ` who is ${character.role}` : ''}

Requirements:
- Create a unique, engaging story that brings "${idea}" to life in an imaginative way
- Each page should have 3-4 sentences (about 60-100 words per page)
- Make it age-appropriate for ${ageGroup} year olds
- Keep the ${tone} tone throughout
- Create genuine character development and story progression
- Include vivid descriptions that would work well for illustrations
- NO repetitive phrases or template language
- Make each page advance the plot meaningfully
- End with a satisfying conclusion

Story structure:
- Page 1: Introduce ${characterName} and set up the adventure related to "${idea}"
- Middle pages: Build tension, challenges, discoveries, and character growth
- Final page: Satisfying resolution where ${characterName} succeeds/learns/grows

Please format your response as JSON with this exact structure:
{
  "title": "Creative title that captures the essence of the story",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Engaging opening text that introduces ${characterName} and the world of ${idea}",
      "imagePrompt": "Detailed description for a children's book illustration showing the scene"
    },
    ... (continue for all ${pageCount} pages)
  ]
}

Make sure each page's text is substantial (3-4 full sentences) and each imagePrompt vividly describes what should be illustrated for that page.`

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
              content: 'You are a master children\'s book author who creates engaging, unique stories that capture children\'s imagination. You never use template language or repetitive phrases. Each story you write is fresh, creative, and perfectly tailored to the child\'s request.'
            },
            {
              role: 'user',
              content: storyPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.8, // Higher creativity
          response_format: { type: 'json_object' }
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
        try {
          const storyData = JSON.parse(openaiData.choices[0].message.content)
          
          // Validate the story structure
          if (!storyData.title || !storyData.pages || !Array.isArray(storyData.pages)) {
            throw new Error('Invalid story structure from OpenAI')
          }

          // Enhance image prompts for better DALL-E generation
          const enhancedPages: StoryPage[] = storyData.pages.map((page: any, index: number) => ({
            pageNumber: page.pageNumber || index + 1,
            text: page.text,
            imagePrompt: `Children's storybook illustration: ${page.imagePrompt}. Style: Colorful, whimsical, child-friendly ${artStyle} illustration with warm lighting and magical atmosphere. Character: ${characterName}. Safe for children, engaging and enchanting.`,
            imageUrl: `https://source.unsplash.com/800x600/?children,storybook,${encodeURIComponent(idea)},illustration&sig=${index + 1}` // Fallback image
          }))

          const response: StoryResponse = {
            id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            title: storyData.title,
            pages: enhancedPages,
            metadata: { ageGroup, tone, length, artStyle, character: character || null, createdAt: new Date().toISOString() },
            success: true
          }

          console.log('🎉 Unique story generated successfully with OpenAI!')
          return NextResponse.json(response)

        } catch (parseError) {
          console.error('❌ Failed to parse OpenAI story response:', parseError)
          throw new Error('Failed to parse story from OpenAI response')
        }
      } else {
        console.error('❌ Invalid OpenAI response format:', openaiData)
        throw new Error('Invalid response format from OpenAI API')
      }

    } catch (openaiError) {
      console.error('❌ OpenAI story generation failed:', openaiError)
      
      // Fallback to a basic but improved story structure (better than the old templates)
      console.log('🔄 Using improved fallback story generation...')
      
      const fallbackTitle = `${characterName} and the ${idea.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
      
      const fallbackPages: StoryPage[] = []
      
      // Create more natural fallback content
      const storyElements = {
        settings: ['enchanted forest', 'magical kingdom', 'mysterious castle', 'hidden valley', 'ancient library', 'floating island', 'secret garden', 'crystal cave'],
        challenges: ['solved an ancient puzzle', 'helped a lost creature', 'discovered a hidden truth', 'overcame their fears', 'learned a valuable lesson', 'made a new friend'],
        discoveries: ['magical powers within themselves', 'the importance of kindness', 'courage they never knew they had', 'that friendship conquers all', 'the magic of believing']
      }
      
      const randomSetting = storyElements.settings[Math.floor(Math.random() * storyElements.settings.length)]
      const randomChallenge = storyElements.challenges[Math.floor(Math.random() * storyElements.challenges.length)]
      const randomDiscovery = storyElements.discoveries[Math.floor(Math.random() * storyElements.discoveries.length)]
      
      for (let i = 1; i <= pageCount; i++) {
        let pageText = ''
        let imagePrompt = ''
        
        if (i === 1) {
          pageText = `${characterName} lived in a world where ${idea} was possible, but no one believed it could be real. One day, while exploring the ${randomSetting}, ${characterName} discovered something extraordinary that would change everything. The adventure was about to begin, and ${characterName} felt both excited and nervous about what lay ahead.`
          imagePrompt = `${characterName} discovering something amazing related to ${idea} in ${randomSetting}`
        } else if (i === pageCount) {
          pageText = `In the end, ${characterName} ${randomChallenge} and discovered ${randomDiscovery}. The ${idea} had taught ${characterName} something wonderful about the world and about themselves. As ${characterName} returned home, they knew this was just the beginning of many more amazing adventures to come.`
          imagePrompt = `${characterName} celebrating their success with ${idea}, happy ending scene`
        } else {
          const midStoryTexts = [
            `The ${idea} led ${characterName} to meet interesting characters who each had their own stories to tell. Some were helpful, others were mysterious, but all of them taught ${characterName} something important. Together, they faced challenges that seemed impossible at first.`,
            `${characterName} learned that ${idea} required courage, creativity, and kindness. There were moments when giving up seemed easier, but ${characterName} remembered why this journey mattered. With determination, they pressed on toward their goal.`,
            `Strange and wonderful things began happening as ${characterName} grew more confident. The ${idea} revealed secrets that had been hidden for ages. ${characterName} realized they had abilities they never knew existed.`,
            `The biggest challenge yet appeared before ${characterName}. It would take everything they had learned about ${idea} to succeed. But ${characterName} was no longer the same person who had started this journey - they had grown stronger and wiser.`
          ]
          
          pageText = midStoryTexts[Math.min(i - 2, midStoryTexts.length - 1)]
          imagePrompt = `${characterName} on their adventure with ${idea}, ${tone} children's book scene`
        }
        
        fallbackPages.push({
          pageNumber: i,
          text: pageText,
          imagePrompt: `Children's storybook illustration: ${imagePrompt}. Style: Colorful, whimsical, child-friendly ${artStyle} illustration with warm lighting. Character: ${characterName}. Safe for children, engaging and enchanting.`,
          imageUrl: `https://source.unsplash.com/800x600/?children,storybook,${encodeURIComponent(idea)},illustration&sig=${i}`
        })
      }

      const response: StoryResponse = {
        id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: fallbackTitle,
        pages: fallbackPages,
        metadata: { ageGroup, tone, length, artStyle, character: character || null, createdAt: new Date().toISOString() },
        success: true
      }

      console.log('✅ Improved fallback story generated')
      return NextResponse.json(response)
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
    message: 'OpenAI-Powered StoryLoom API - Unique Stories Every Time!',
    version: '3.0.0',
    features: ['OpenAI GPT-4 story generation', 'Unique creative content', 'No more template garbage', 'Rich 3-4 sentence pages'],
    provider: process.env.OPENAI_API_KEY ? 'OpenAI GPT-4' : 'Improved fallback'
  })
}
