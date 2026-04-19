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
  const [currentStep, setCurrentStep] = useState<'start' | 'characters' | 'story' | 'pages' | 'library'>('start')
  const [storyMode, setStoryMode] = useState<'ai' | 'manual'>('ai')
  const [characters, setCharacters] = useState<Character[]>([])
  const [storyDescription, setStoryDescription] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set())

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

  const handleImageUpload = (file: File, characterId: string) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      updateCharacter(characterId, { imageUrl })
    }
    reader.readAsDataURL(file)
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

  // FIXED: Proper AI image generation with OpenAI DALL-E 3
  const generateStoryImage = async (pageId: string, prompt: string) => {
    if (!currentStory) return

    // Add this page to generating state
    setGeneratingImages(prev => new Set([...prev, pageId]))

    try {
      console.log('Generating AI image for prompt:', prompt)
      
      // Call your optimized image generation API
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          style: 'children-book-illustration',
          size: '1024x1024'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Image API Error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Image API Response:', result)

      if (result.success && result.imageUrl) {
        // Update the story with the new AI-generated image
        const updatedStory = {
          ...currentStory,
          pages: currentStory.pages.map(page =>
            page.id === pageId ? { ...page, imageUrl: result.imageUrl } : page
          )
        }
        
        setCurrentStory(updatedStory)
        
        // Update saved stories
        const updatedSavedStories = savedStories.map(story =>
          story.id === currentStory.id ? updatedStory : story
        )
        setSavedStories(updatedSavedStories)
        saveToStorage('storyloom_stories', updatedSavedStories)

        // Show success message
        console.log(`✅ AI image generated successfully using ${result.provider}`)
      } else {
        throw new Error(result.error || 'Invalid image API response')
      }
    } catch (error) {
      console.error('AI image generation failed:', error)
      
      // Show user-friendly error
      alert(`AI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or upload a custom image.`)
    } finally {
      // Remove from generating state
      setGeneratingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(pageId)
        return newSet
      })
    }
  }

  // Auto-redirect to characters step after brief moment
  useEffect(() => {
    if (currentStep === 'start') {
      const timer = setTimeout(() => {
        setCurrentStep('characters')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [currentStep])

  if (currentStep === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="bg-black/20 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="StoryLoom Logo"
                  width="60"
                  height="40"
                  className="rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const nextElement = target.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'block';
                    }
                  }}
                />
                <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 drop-shadow-2xl">
                  StoryLoom
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
                AI-Powered Children&apos;s Storybook Generator
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
            <p className="text-lg text-white/80 mb-6">
              Create magical personalized stories with AI. Build characters, generate beautiful illustrations, and bring your imagination to life.
            </p>
            
            <div className="inline-block bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl">
              Start Creating Stories →
            </div>
            
            <p className="text-sm text-white/60 mt-4">
              Redirecting to story builder in a moment...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'characters') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white text-center mb-8">Create Your Characters</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="aspect-square bg-gray-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {character.imageUrl ? (
                    <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500">No image yet</span>
                  )}
                </div>
                
                <input
                  type="text"
                  placeholder="Character name"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300"
                />
                
                <input
                  type="text"
                  placeholder="Role (e.g., brave knight)"
                  value={character.role || ''}
                  onChange={(e) => updateCharacter(character.id, { role: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300"
                />
                
                <textarea
                  placeholder="Character description"
                  value={character.description || ''}
                  onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-20 resize-none"
                />
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], character.id)}
                    className="hidden"
                    id={`upload-${character.id}`}
                  />
                  <label
                    htmlFor={`upload-${character.id}`}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-blue-600"
                  >
                    📷 Upload Image
                  </label>
                  <button
                    onClick={() => removeCharacter(character.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center mt-8 gap-4">
            <button
              onClick={addNewCharacter}
              className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600"
            >
              + Add Character
            </button>
            <button
              onClick={() => setCurrentStep('story')}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
            >
              Next: Create Story →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'story') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white text-center mb-8">Tell Your Story</h1>
          
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
        </div>
      </div>
    )
  }

  if (currentStep === 'pages' && currentStory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">📚 Story Pages</h1>
            <p className="text-xl text-white/80">Edit your story and add AI-generated images to each page</p>
            <h2 className="text-3xl font-bold text-yellow-300 mt-4">{currentStory.title}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentStory.pages.map((page, index) => (
              <div key={page.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Page {index + 1}</h3>
                
                <div className="aspect-video bg-gray-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {generatingImages.has(page.id) ? (
                    <div className="text-center">
                      <div className="animate-spin text-4xl mb-2">🎨</div>
                      <span className="text-gray-600">Generating AI image...</span>
                    </div>
                  ) : page.imageUrl ? (
                    <img src={page.imageUrl} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <span className="text-gray-500">No image yet</span>
                    </div>
                  )}
                </div>
                
                <textarea
                  value={page.text}
                  onChange={(e) => {
                    const updatedStory = {
                      ...currentStory,
                      pages: currentStory.pages.map(p =>
                        p.id === page.id ? { ...p, text: e.target.value } : p
                      )
                    }
                    setCurrentStory(updatedStory)
                  }}
                  className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-300 h-32 resize-none"
                />
                
                <button
                  onClick={() => generateStoryImage(page.id, page.imagePrompt || page.text)}
                  disabled={generatingImages.has(page.id)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 mb-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {generatingImages.has(page.id) ? '🎨 Generating AI Image...' : '✨ Generate AI Image with DALL-E'}
                </button>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0]
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        const imageUrl = event.target?.result as string
                        const updatedStory = {
                          ...currentStory,
                          pages: currentStory.pages.map(p =>
                            p.id === page.id ? { ...p, imageUrl } : p
                          )
                        }
                        setCurrentStory(updatedStory)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="hidden"
                  id={`page-upload-${page.id}`}
                />
                <label
                  htmlFor={`page-upload-${page.id}`}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-xl text-center cursor-pointer hover:bg-blue-600 block"
                >
                  📷 Upload Custom Image
                </label>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center mt-8 gap-4">
            <button
              onClick={() => setCurrentStep('story')}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
            >
              ← Edit Story Details
            </button>
            <button
              onClick={() => setCurrentStep('library')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
            >
              📚 View Library
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'library') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-white">📚 Story Library ({savedStories.length})</h1>
            <button
              onClick={() => setCurrentStep('start')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
            >
              ➕ Create New Story
            </button>
          </div>
          
          {savedStories.length === 0 ? (
            <div className="text-center text-white/80 py-16">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl mb-8">No stories yet! Create your first magical story with AI.</p>
              <button
                onClick={() => setCurrentStep('start')}
                className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500"
              >
                Start Creating →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => {
                    setCurrentStory(story)
                    setCurrentStep('pages')
                  }}
                  className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/30 transition-all"
                >
                  <div className="aspect-video bg-gray-200 rounded-xl mb-4 overflow-hidden">
                    {story.coverImage ? (
                      <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-500">📖 {story.title}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                  <p className="text-white/70 text-sm">
                    {story.pages.length} pages • Created {new Date(story.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
