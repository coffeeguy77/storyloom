'use client'

import { useState, useEffect } from 'react'

interface Character {
  id: string
  name: string
  imageUrl?: string
  role?: string
  description?: string
}

interface StoryPage {
  id: string
  text: string
  imageUrl?: string
  imagePrompt?: string
}

interface Story {
  id: string
  title: string
  pages: StoryPage[]
  characters: Character[]
  createdAt: string
  coverImage?: string
}

export default function CreateStoryPage() {
  const [currentStep, setCurrentStep] = useState<'start' | 'characters' | 'story' | 'pages' | 'library'>('characters') // Start directly on characters
  const [characters, setCharacters] = useState<Character[]>([])
  const [storyDescription, setStoryDescription] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)

  // Load saved stories from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('storyloom_stories')
      if (saved) {
        try {
          setSavedStories(JSON.parse(saved))
        } catch (error) {
          console.error('Failed to load saved stories:', error)
        }
      }
    }
  }, [])

  // Save stories to localStorage
  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    }
  }

  const addNewCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: '',
      role: '',
      description: ''
    }
    const updated = [...characters, newChar]
    setCharacters(updated)
    saveToStorage('storyloom_characters', updated)
  }

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    const updated = characters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    )
    setCharacters(updated)
    saveToStorage('storyloom_characters', updated)
  }

  const removeCharacter = (id: string) => {
    const filtered = characters.filter(char => char.id !== id)
    setCharacters(filtered)
    saveToStorage('storyloom_characters', filtered)
  }

  // FIXED: Replace hardcoded story with actual API call
  const generateAIStory = async () => {
    setIsGeneratingStory(true)
    try {
      const mainCharacter = characters.find(c => c.name.trim()) || { name: 'Alex', id: 'default' }
      
      console.log('Calling API with:', {
        idea: storyDescription || 'magical adventure',
        character: mainCharacter.name
      })
      
      // Call the actual API instead of hardcoded content
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: storyDescription || 'magical adventure',
          ageGroup: '6-8',
          tone: 'adventure', 
          length: 'medium',
          artStyle: 'cartoon',
          character: { 
            name: mainCharacter.name,
            description: mainCharacter.description || '',
            role: mainCharacter.role || ''
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const apiStory = await response.json()
      console.log('API Response:', apiStory)
      
      if (apiStory.success && apiStory.pages) {
        const story: Story = {
          id: apiStory.id || Date.now().toString(),
          title: apiStory.title || storyTitle || 'Your Amazing Story',
          pages: apiStory.pages.map((page: any) => ({
            id: page.pageNumber.toString(),
            text: page.text,
            imagePrompt: page.imagePrompt,
            imageUrl: page.imageUrl
          })),
          characters: [mainCharacter as Character],
          createdAt: new Date().toISOString(),
          coverImage: apiStory.pages[0]?.imageUrl
        }
        
        console.log('Generated Story:', story)
        setCurrentStory(story)
        
        // Save to localStorage
        const updatedStories = [...savedStories, story]
        setSavedStories(updatedStories)
        saveToStorage('storyloom_stories', updatedStories)
        
        // Move to story pages view
        setCurrentStep('pages')
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (error) {
      console.error('Story generation failed:', error)
      
      // User-friendly error message
      alert(`Story generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsGeneratingStory(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Create Your Story</h1>
        
        {currentStep === 'characters' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Add Characters</h2>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <p className="text-white/80 mb-4">Add characters to your story. You can create multiple characters or just one main character.</p>
              
              {characters.map((character) => (
                <div key={character.id} className="bg-white/10 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Character name"
                      value={character.name}
                      onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g., brave knight)"
                      value={character.role || ''}
                      onChange={(e) => updateCharacter(character.id, { role: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => removeCharacter(character.id)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    placeholder="Character description"
                    value={character.description || ''}
                    onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                    className="w-full mt-3 px-3 py-2 rounded-lg border border-gray-300 h-20 resize-none"
                  />
                </div>
              ))}
              
              <button
                onClick={addNewCharacter}
                className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 mb-4"
              >
                + Add Character
              </button>
            </div>
            
            <button
              onClick={() => setCurrentStep('story')}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
            >
              Next: Story Details →
            </button>
          </div>
        )}

        {currentStep === 'story' && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="mb-6">
              <label className="block text-white font-semibold mb-3">Story Title</label>
              <input
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter a title for your story"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg"
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-white font-semibold mb-3">Story Idea</label>
              <textarea
                value={storyDescription}
                onChange={(e) => setStoryDescription(e.target.value)}
                placeholder="Describe your story idea... (e.g., 'a magical dragon adventure', 'space exploration with aliens', 'underwater treasure hunt')"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 h-32 resize-none text-lg"
              />
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setCurrentStep('characters')}
                className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
              >
                ← Back to Characters
              </button>
              <button
                onClick={generateAIStory}
                disabled={isGeneratingStory}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingStory ? '🎨 Generating Amazing Story...' : '✨ Generate Story with AI'}
              </button>
            </div>
          </div>
        )}

        {/* Show success message if story was generated */}
        {currentStory && (
          <div className="bg-green-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-400/20 mt-8">
            <h3 className="text-xl font-bold text-white mb-2">✅ Story Generated!</h3>
            <p className="text-white/80">
              <strong>&quot;{currentStory.title}&quot;</strong> with {currentStory.pages.length} pages has been created!
            </p>
            <button
              onClick={() => setCurrentStep('pages')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 mt-4"
            >
              View Story Pages →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
