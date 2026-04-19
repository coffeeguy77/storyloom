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
  const [currentStep, setCurrentStep] = useState<'characters' | 'story' | 'pages' | 'library'>('characters')
  const [characters, setCharacters] = useState<Character[]>([])
  const [storyDescription, setStoryDescription] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set())
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set())

  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStoriesData = localStorage.getItem('storyloom_stories')
      const savedCharactersData = localStorage.getItem('storyloom_characters')
      
      if (savedStoriesData) {
        try {
          setSavedStories(JSON.parse(savedStoriesData))
        } catch (error) {
          console.error('Failed to load saved stories:', error)
        }
      }
      
      if (savedCharactersData) {
        try {
          setCharacters(JSON.parse(savedCharactersData))
        } catch (error) {
          console.error('Failed to load saved characters:', error)
        }
      }
    }
  }, [])

  // Save to localStorage utility
  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    }
  }

  // Character management functions
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

  // Story generation function - calls actual API
  const generateAIStory = async () => {
    setIsGeneratingStory(true)
    try {
      const mainCharacter = characters.find(c => c.name.trim()) || { name: 'Alex', id: 'default' }
      
      console.log('Calling story generation API with:', {
        idea: storyDescription || 'magical adventure',
        character: mainCharacter.name
      })
      
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
        throw new Error(`Story generation failed: ${response.status}`)
      }
      
      const apiStory = await response.json()
      console.log('Story generation API response:', apiStory)
      
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
        
        setCurrentStory(story)
        
        // Save to localStorage
        const updatedStories = [...savedStories, story]
        setSavedStories(updatedStories)
        saveToStorage('storyloom_stories', updatedStories)
        
        setCurrentStep('pages')
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (error) {
      console.error('Story generation failed:', error)
      alert(`Story generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsGeneratingStory(false)
    }
  }

  // AI Image generation function - calls OpenAI DALL-E 3
  const generateStoryImage = async (pageId: string, prompt: string) => {
    if (!currentStory) return

    // Add this page to generating state - FIXED: Convert Set to Array first
    setGeneratingImages(prev => new Set(Array.from(prev).concat(pageId)))

    try {
      console.log('Generating AI image for prompt:', prompt)
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt,
          pageId: pageId 
        })
      })
      
      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Image generation result:', result)
      
      if (result.success && result.imageUrl) {
        // Update the story with the generated image
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
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('AI image generation failed:', error)
      alert(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      // Remove from generating state - FIXED: Convert Set to Array first
      setGeneratingImages(prev => new Set(Array.from(prev).filter(id => id !== pageId)))
    }
  }

  // Handle custom image uploads for story pages
  const handleStoryImageUpload = (file: File, pageId: string) => {
    if (!currentStory) return

    setUploadingImages(prev => new Set(Array.from(prev).concat(pageId)))

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      
      const updatedStory = {
        ...currentStory,
        pages: currentStory.pages.map(page =>
          page.id === pageId ? { ...page, imageUrl } : page
        )
      }
      
      setCurrentStory(updatedStory)
      
      const updatedSavedStories = savedStories.map(story =>
        story.id === currentStory.id ? updatedStory : story
      )
      setSavedStories(updatedSavedStories)
      saveToStorage('storyloom_stories', updatedSavedStories)
      
      setUploadingImages(prev => new Set(Array.from(prev).filter(id => id !== pageId)))
    }
    
    reader.readAsDataURL(file)
  }

  // Update story text
  const updateStoryText = (pageId: string, newText: string) => {
    if (!currentStory) return

    const updatedStory = {
      ...currentStory,
      pages: currentStory.pages.map(page =>
        page.id === pageId ? { ...page, text: newText } : page
      )
    }
    
    setCurrentStory(updatedStory)
    
    const updatedSavedStories = savedStories.map(story =>
      story.id === currentStory.id ? updatedStory : story
    )
    setSavedStories(updatedSavedStories)
    saveToStorage('storyloom_stories', updatedSavedStories)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      {/* Header */}
      <div className="bg-black/20 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">StoryLoom</h1>
            <span className="text-white/60">•</span>
            <p className="text-white/80">Create Your Story</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
            <button
              onClick={() => setCurrentStep('characters')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                currentStep === 'characters'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              1. Characters
            </button>
            <button
              onClick={() => setCurrentStep('story')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                currentStep === 'story'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              2. Story
            </button>
            {currentStory && (
              <button
                onClick={() => setCurrentStep('pages')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  currentStep === 'pages'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                3. Pages
              </button>
            )}
            <button
              onClick={() => setCurrentStep('library')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                currentStep === 'library'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Library
            </button>
          </div>
        </div>

        {/* Characters Step */}
        {currentStep === 'characters' && (
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Create Your Characters</h2>
              <p className="text-white/80 mb-6">Add the characters that will star in your story. You can create multiple characters or just one main character.</p>
              
              {characters.map((character) => (
                <div key={character.id} className="bg-white/10 rounded-xl p-6 mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Character name"
                      value={character.name}
                      onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-gray-300 text-lg font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g., brave knight, curious explorer)"
                      value={character.role || ''}
                      onChange={(e) => updateCharacter(character.id, { role: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-gray-300"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file, character.id)
                      }}
                      className="px-4 py-3 rounded-xl border border-gray-300 text-sm"
                    />
                    <button
                      onClick={() => removeCharacter(character.id)}
                      className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-3 rounded-xl font-semibold transition-all"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <textarea
                    placeholder="Character description (personality, appearance, special abilities)"
                    value={character.description || ''}
                    onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 h-24 resize-none"
                  />
                  
                  {character.imageUrl && (
                    <div className="mt-4">
                      <img
                        src={character.imageUrl}
                        alt={character.name || 'Character'}
                        className="w-24 h-24 rounded-xl object-cover border-2 border-white/20"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={addNewCharacter}
                className="bg-green-500/80 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-semibold transition-all mb-6"
              >
                + Add New Character
              </button>
            </div>
          </div>
        )}

        {/* Story Step */}
        {currentStep === 'story' && (
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Design Your Story</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-3 text-lg">Story Title</label>
                  <input
                    type="text"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    placeholder="Give your story an exciting title"
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 text-lg font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-white font-semibold mb-3 text-lg">Story Idea</label>
                  <textarea
                    value={storyDescription}
                    onChange={(e) => setStoryDescription(e.target.value)}
                    placeholder="Describe your story idea in detail... What adventure will your characters go on? What challenges will they face? What will they discover?"
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 h-40 resize-none text-lg"
                  />
                  <p className="text-white/60 text-sm mt-2">
                    Examples: "a magical dragon adventure in an enchanted forest", "space exploration with friendly aliens", "underwater treasure hunt with sea creatures"
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={generateAIStory}
                    disabled={isGeneratingStory || !storyDescription.trim()}
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl"
                  >
                    {isGeneratingStory ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full"></div>
                        Generating Your Amazing Story...
                      </div>
                    ) : (
                      '✨ Generate Story with AI'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Success message */}
            {currentStory && (
              <div className="bg-green-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-400/20">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  ✅ Story Generated Successfully!
                </h3>
                <p className="text-white/80 mb-4">
                  <strong>"{currentStory.title}"</strong> has been created with {currentStory.pages.length} pages. 
                  Your story is ready for you to review and customize!
                </p>
                <button
                  onClick={() => setCurrentStep('pages')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  View & Edit Story Pages →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pages Step */}
        {currentStep === 'pages' && currentStory && (
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">"{currentStory.title}"</h2>
                <p className="text-white/60">{currentStory.pages.length} pages</p>
              </div>
              
              <div className="grid gap-6">
                {currentStory.pages.map((page, index) => (
                  <div key={page.id} className="bg-white/10 rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full font-semibold">
                        Page {index + 1}
                      </span>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Text Section */}
                      <div>
                        <label className="block text-white font-medium mb-2">Story Text</label>
                        <textarea
                          value={page.text}
                          onChange={(e) => updateStoryText(page.id, e.target.value)}
                          className="w-full p-4 rounded-xl border border-gray-300 h-32 resize-none text-lg"
                          placeholder="Enter the story text for this page..."
                        />
                      </div>
                      
                      {/* Image Section */}
                      <div>
                        <label className="block text-white font-medium mb-2">Page Image</label>
                        <div className="bg-gray-100 rounded-xl p-4 min-h-[200px] flex flex-col items-center justify-center border border-gray-300">
                          {page.imageUrl ? (
                            <div className="relative w-full">
                              <img
                                src={page.imageUrl}
                                alt={`Page ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => updateStoryText(page.id, page.text)} // Force re-render
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : generatingImages.has(page.id) ? (
                            <div className="text-center">
                              <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p className="text-gray-600">🎨 Generating AI image...</p>
                            </div>
                          ) : uploadingImages.has(page.id) ? (
                            <div className="text-center">
                              <div className="animate-pulse w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2"></div>
                              <p className="text-gray-600">📤 Uploading image...</p>
                            </div>
                          ) : (
                            <div className="text-center w-full">
                              <div className="text-gray-400 mb-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                  <span className="text-2xl">📷</span>
                                </div>
                                <p>Page {index + 1}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Image generation buttons */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => generateStoryImage(page.id, page.imagePrompt || `${page.text.slice(0, 100)}...`)}
                            disabled={generatingImages.has(page.id)}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                          >
                            {generatingImages.has(page.id) ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Generating...
                              </div>
                            ) : (
                              '🎨 Generate AI Image with DALL-E'
                            )}
                          </button>
                          
                          <label className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all cursor-pointer">
                            📤 Upload Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleStoryImageUpload(file, page.id)
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        
                        {/* Image prompt display */}
                        {page.imagePrompt && (
                          <div className="mt-2">
                            <p className="text-white/60 text-sm">
                              <strong>AI Prompt:</strong> {page.imagePrompt}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Library Step */}
        {currentStep === 'library' && (
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Your Story Library</h2>
              
              {savedStories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60 text-lg mb-4">No stories created yet</p>
                  <button
                    onClick={() => setCurrentStep('characters')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    Create Your First Story
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedStories.map((story) => (
                    <div key={story.id} className="bg-white/10 rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all cursor-pointer">
                      <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
                        {story.coverImage ? (
                          <img
                            src={story.coverImage}
                            alt={story.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-4xl">📚</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                      <p className="text-white/60 text-sm mb-3">
                        {story.pages.length} pages • Created {new Date(story.createdAt).toLocaleDateString()}
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrentStory(story)
                            setCurrentStep('pages')
                          }}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-all text-sm"
                        >
                          View Story
                        </button>
                        <button
                          onClick={() => {
                            const filtered = savedStories.filter(s => s.id !== story.id)
                            setSavedStories(filtered)
                            saveToStorage('storyloom_stories', filtered)
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-medium transition-all text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
