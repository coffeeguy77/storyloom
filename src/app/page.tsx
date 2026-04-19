'use client'

import { useState, useEffect } from 'react'

interface Character {
  id: string
  name: string
  imageUrl?: string
  role?: string
  description?: string
}

interface Story {
  id: string
  title: string
  fullText: string
  coverImagePrompt: string
  coverImageUrl?: string
  wordCount: number
  characters: Character[]
  createdAt: string
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<'start' | 'characters' | 'story' | 'reading' | 'library'>('start')
  const [characters, setCharacters] = useState<Character[]>([])
  const [storyDescription, setStoryDescription] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)

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

  // Generate complete story with single cover image
  const generateAIStory = async () => {
    setIsGeneratingStory(true)
    try {
      const mainCharacter = characters.find(c => c.name.trim()) || { name: 'Alex', id: 'default' }
      
      console.log('🎯 Generating single-format story:', {
        idea: storyDescription,
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
      console.log('✅ Single-format story generated:', apiStory)
      
      if (apiStory.success && apiStory.fullText) {
        const story: Story = {
          id: apiStory.id || Date.now().toString(),
          title: apiStory.title || storyTitle || 'Your Amazing Story',
          fullText: apiStory.fullText,
          coverImagePrompt: apiStory.coverImagePrompt,
          coverImageUrl: apiStory.coverImageUrl,
          wordCount: apiStory.wordCount,
          characters: [mainCharacter as Character],
          createdAt: new Date().toISOString()
        }
        
        setCurrentStory(story)
        
        // Save to localStorage
        const updatedStories = [...savedStories, story]
        setSavedStories(updatedStories)
        saveToStorage('storyloom_stories', updatedStories)
        
        setCurrentStep('reading')
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

  // Generate AI cover image
  const generateCoverImage = async () => {
    if (!currentStory) return
    
    setIsGeneratingCover(true)
    try {
      console.log('🎨 Generating cover image with prompt:', currentStory.coverImagePrompt)
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentStory.coverImagePrompt
        })
      })
      
      if (!response.ok) {
        throw new Error(`Cover image generation failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ Cover image generated:', result)
      
      if (result.success && result.imageUrl) {
        const updatedStory = {
          ...currentStory,
          coverImageUrl: result.imageUrl
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
      console.error('Cover image generation failed:', error)
      alert(`Cover image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsGeneratingCover(false)
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
                <h1 className="text-6xl md:text-8xl font-bold text-white drop-shadow-2xl">
                  StoryLoom
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                AI-Powered Children&apos;s Storybook Generator
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
            <p className="text-lg text-white/80 mb-6">
              Create magical personalized stories with AI. One beautiful story, one amazing cover image.
            </p>
            
            <div 
              onClick={() => setCurrentStep('characters')}
              className="inline-block bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl cursor-pointer hover:bg-yellow-300 transition-all"
            >
              Start Creating Stories →
            </div>
            
            <p className="text-sm text-white/60 mt-4">
              Click above to begin your storytelling adventure!
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
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-blue-600 text-sm"
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
              <label className="block text-white font-semibold mb-3">Story Title (Optional)</label>
              <input
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="AI will create a great title for you!"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg"
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-white font-semibold mb-3">Story Idea</label>
              <textarea
                value={storyDescription}
                onChange={(e) => setStoryDescription(e.target.value)}
                placeholder="Describe your story idea... (e.g., 'a magical dragon adventure', 'space exploration with aliens', 'Uber driving with a monster truck')"
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
                {isGeneratingStory ? '🎨 Creating Your Story...' : '✨ Generate Story with AI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'reading' && currentStory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">📖 Your Story</h1>
            <p className="text-xl text-white/80">Beautiful story, single amazing illustration</p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            {/* Story Title */}
            <h2 className="text-3xl font-bold text-center text-purple-800 mb-8">
              {currentStory.title}
            </h2>
            
            {/* Cover Image */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-80 h-96 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl overflow-hidden shadow-xl">
                  {currentStory.coverImageUrl ? (
                    <img
                      src={currentStory.coverImageUrl}
                      alt={currentStory.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-center px-4">{currentStory.title}</p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={generateCoverImage}
                  disabled={isGeneratingCover}
                  className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed shadow-lg"
                >
                  {isGeneratingCover ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating Cover...
                    </div>
                  ) : (
                    '🎨 Generate AI Cover Art'
                  )}
                </button>
              </div>
            </div>
            
            {/* Story Text */}
            <div className="prose prose-lg max-w-none">
              {currentStory.fullText.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-gray-800 leading-relaxed mb-4 text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
            
            {/* Story Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-600">
              <p className="text-sm">
                📝 {currentStory.wordCount} words • Created {new Date(currentStory.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex justify-center mt-8 gap-4">
            <button
              onClick={() => setCurrentStep('story')}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
            >
              ← Edit Story
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
              <p className="text-xl mb-8">No stories yet! Create your first magical story.</p>
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
                    setCurrentStep('reading')
                  }}
                  className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/30 transition-all group"
                >
                  <div className="aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl mb-4 overflow-hidden shadow-lg group-hover:shadow-xl transition-all">
                    {story.coverImageUrl ? (
                      <img src={story.coverImageUrl} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="text-4xl mb-2">📖</div>
                        <p className="text-sm text-center px-2">{story.title}</p>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{story.title}</h3>
                  <p className="text-white/70 text-sm">
                    {story.wordCount} words • Created {new Date(story.createdAt).toLocaleDateString()}
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
