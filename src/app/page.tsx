"use client"

import { useState, useEffect } from "react"

interface Character {
  id: string
  name: string
  age?: string
  imageUrl?: string
  personality?: string
  favoriteThings?: string
  isChild: boolean
  isActive: boolean // For checkbox selection in stories
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

export default function StoryLoomWithSavedCharacters() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "story" | "reading" | "library" | "manage-characters">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [storyDescription, setStoryDescription] = useState("")
  const [storyTitle, setStoryTitle] = useState("")
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load stories
      const savedStoriesData = localStorage.getItem("storyloom_stories")
      if (savedStoriesData) {
        try {
          setSavedStories(JSON.parse(savedStoriesData))
        } catch (error) {
          console.error("Failed to load stories:", error)
        }
      }

      // Load characters
      const savedCharactersData = localStorage.getItem("storyloom_characters")
      if (savedCharactersData) {
        try {
          const characters = JSON.parse(savedCharactersData)
          setSavedCharacters(characters)
          // Automatically select children as active for stories
          const children = characters.filter((c: Character) => c.isChild)
          setActiveCharacters(children)
        } catch (error) {
          console.error("Failed to load characters:", error)
        }
      }
    }
  }, [])

  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data))
    }
  }

  // Character management functions
  const addNewCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "",
      age: "",
      personality: "",
      favoriteThings: "",
      isChild: true,
      isActive: false
    }
    const updated = [...savedCharacters, newChar]
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
  }

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    const updated = savedCharacters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    )
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
    
    // Update active characters if this character is active
    if (activeCharacters.find(c => c.id === id)) {
      const updatedActive = activeCharacters.map(char =>
        char.id === id ? { ...char, ...updates } : char
      )
      setActiveCharacters(updatedActive)
    }
  }

  const removeCharacter = (id: string) => {
    const updated = savedCharacters.filter(char => char.id !== id)
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
    
    // Remove from active characters too
    setActiveCharacters(activeCharacters.filter(c => c.id !== id))
  }

  const toggleCharacterActive = (characterId: string) => {
    const character = savedCharacters.find(c => c.id === characterId)
    if (!character) return

    if (activeCharacters.find(c => c.id === characterId)) {
      // Remove from active
      setActiveCharacters(activeCharacters.filter(c => c.id !== characterId))
    } else {
      // Add to active
      setActiveCharacters([...activeCharacters, character])
    }
  }

  const handleImageUpload = (file: File, characterId: string) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      updateCharacter(characterId, { imageUrl })
    }
    reader.readAsDataURL(file)
  }

  // Generate story with selected characters
  const generateAIStory = async () => {
    if (activeCharacters.length === 0) {
      alert("Please select at least one character for your story!")
      return
    }

    setIsGeneratingStory(true)
    try {
      const characterNames = activeCharacters.map(c => c.name).join(" and ")
      const characterDescriptions = activeCharacters.map(c => 
        `${c.name} (age ${c.age || "unknown"}, personality: ${c.personality || "adventurous"})`
      ).join(", ")
      
      console.log("Generating story with characters:", characterNames)
      
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: storyDescription || "magical adventure",
          ageGroup: "6-8",
          tone: "adventure", 
          length: "medium",
          artStyle: "cartoon",
          character: { 
            name: characterNames,
            description: characterDescriptions,
            role: "adventurers"
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Story generation failed: ${response.status}`)
      }
      
      const apiStory = await response.json()
      console.log("Story generated successfully:", apiStory)
      
      if (apiStory.success && apiStory.fullText) {
        // Auto-generate cover image
        setIsGeneratingCover(true)
        let coverImageUrl = apiStory.coverImageUrl

        if (apiStory.coverImagePrompt) {
          try {
            const imageResponse = await fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: apiStory.coverImagePrompt })
            })
            
            if (imageResponse.ok) {
              const imageResult = await imageResponse.json()
              if (imageResult.success && imageResult.imageUrl) {
                coverImageUrl = imageResult.imageUrl
              }
            }
          } catch (error) {
            console.log("Auto cover generation failed, using fallback")
          }
        }
        setIsGeneratingCover(false)

        const story: Story = {
          id: apiStory.id || Date.now().toString(),
          title: apiStory.title || storyTitle || "Your Amazing Story",
          fullText: apiStory.fullText,
          coverImagePrompt: apiStory.coverImagePrompt,
          coverImageUrl: coverImageUrl,
          wordCount: apiStory.wordCount,
          characters: [...activeCharacters], // Save which characters were in this story
          createdAt: new Date().toISOString()
        }
        
        setCurrentStory(story)
        
        // Save story
        const updatedStories = [...savedStories, story]
        setSavedStories(updatedStories)
        saveToStorage("storyloom_stories", updatedStories)
        
        setCurrentStep("reading")
      } else {
        throw new Error("Invalid API response format")
      }
    } catch (error) {
      console.error("Story generation failed:", error)
      alert(`Story generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`)
    } finally {
      setIsGeneratingStory(false)
      setIsGeneratingCover(false)
    }
  }

  // Generate additional cover image if needed
  const generateCoverImage = async () => {
    if (!currentStory) return
    
    setIsGeneratingCover(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentStory.coverImagePrompt })
      })
      
      if (!response.ok) {
        throw new Error(`Cover generation failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.imageUrl) {
        const updatedStory = { ...currentStory, coverImageUrl: result.imageUrl }
        setCurrentStory(updatedStory)
        
        const updatedSavedStories = savedStories.map(story =>
          story.id === currentStory.id ? updatedStory : story
        )
        setSavedStories(updatedSavedStories)
        saveToStorage("storyloom_stories", updatedSavedStories)
      }
    } catch (error) {
      console.error("Cover generation failed:", error)
      alert(`Cover generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGeneratingCover(false)
    }
  }

  // Start screen
  if (currentStep === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="bg-black/20 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold text-white drop-shadow-2xl">StoryLoom</h1>
              <p className="text-lg text-white/90">AI-Powered Children's Storybook Generator</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create Your Story</h2>
            
            {savedCharacters.filter(c => c.isChild).length > 0 ? (
              <div className="space-y-6">
                <p className="text-white/80 mb-4">
                  Ready to create a story with your saved characters!
                </p>
                
                <div className="bg-white/20 rounded-xl p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2">Your Characters:</h3>
                  <div className="flex flex-wrap gap-2">
                    {savedCharacters.filter(c => c.isChild).map((character) => (
                      <div key={character.id} className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                        {character.imageUrl && (
                          <img src={character.imageUrl} alt={character.name} className="w-6 h-6 rounded-full object-cover" />
                        )}
                        <span className="text-white text-sm">{character.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => setCurrentStep("characters")}
                  className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all"
                >
                  Start Creating Stories
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-lg text-white/80 mb-6">
                  Let's save your children's information first, so you never have to enter it again!
                </p>
                
                <button
                  onClick={() => setCurrentStep("manage-characters")}
                  className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all"
                >
                  Add Your Children
                </button>
              </div>
            )}
            
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setCurrentStep("manage-characters")}
                className="text-white/80 hover:text-white underline"
              >
                Manage Characters
              </button>
              <button
                onClick={() => setCurrentStep("library")}
                className="text-white/80 hover:text-white underline"
              >
                View Library
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Character management screen
  if (currentStep === "manage-characters") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Manage Characters</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              Back to Home
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4">
              Save your family members here so you can quickly select them for stories. 
              Children will automatically be selected for new stories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {savedCharacters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="aspect-square w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                    {character.imageUrl ? (
                      <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-2xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={character.isChild}
                        onChange={(e) => updateCharacter(character.id, { isChild: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-white text-sm">Child</label>
                    </div>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Name"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 font-medium"
                />
                
                <input
                  type="text"
                  placeholder="Age"
                  value={character.age || ""}
                  onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300"
                />
                
                <textarea
                  placeholder="Personality (e.g., curious and brave, loves dinosaurs)"
                  value={character.personality || ""}
                  onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-20 resize-none text-sm"
                />
                
                <textarea
                  placeholder="Favorite things (e.g., trucks, animals, space)"
                  value={character.favoriteThings || ""}
                  onChange={(e) => updateCharacter(character.id, { favoriteThings: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-16 resize-none text-sm"
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
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-center cursor-pointer hover:bg-blue-600 text-sm"
                  >
                    Add Photo
                  </label>
                  <button
                    onClick={() => removeCharacter(character.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <button
              onClick={addNewCharacter}
              className="bg-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-600 text-lg"
            >
              + Add New Character
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Character selection screen
  if (currentStep === "characters") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Who's in this story?</h1>
          
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4">
              Select the characters for your story. You can add friends who are visiting too!
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {savedCharacters.map((character) => {
              const isActive = activeCharacters.find(c => c.id === character.id)
              return (
                <div
                  key={character.id}
                  onClick={() => toggleCharacterActive(character.id)}
                  className={`cursor-pointer transition-all rounded-2xl p-4 border-2 ${
                    isActive 
                      ? "bg-white/30 border-yellow-400 shadow-lg" 
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="aspect-square bg-gray-200 rounded-xl mb-3 overflow-hidden">
                    {character.imageUrl ? (
                      <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl">
                        👤
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-white font-semibold">{character.name}</p>
                    {character.age && <p className="text-white/70 text-sm">Age {character.age}</p>}
                    {character.isChild && <p className="text-yellow-300 text-xs">Child</p>}
                    
                    <div className="mt-2">
                      {isActive ? (
                        <div className="bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-medium">
                          ✓ Selected
                        </div>
                      ) : (
                        <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                          Tap to select
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {activeCharacters.length > 0 && (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">Selected for story:</h3>
              <p className="text-white/90">{activeCharacters.map(c => c.name).join(", ")}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCurrentStep("manage-characters")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30"
            >
              Add/Edit Characters
            </button>
            <button
              onClick={() => setCurrentStep("story")}
              disabled={activeCharacters.length === 0}
              className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Create Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Story creation screen
  if (currentStep === "story") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Create Your Story</h1>
          
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            {activeCharacters.length > 0 && (
              <div className="bg-white/20 rounded-xl p-4 mb-6">
                <h3 className="text-white font-semibold mb-2">Story Characters:</h3>
                <div className="flex flex-wrap gap-2">
                  {activeCharacters.map((character) => (
                    <div key={character.id} className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                      {character.imageUrl && (
                        <img src={character.imageUrl} alt={character.name} className="w-6 h-6 rounded-full object-cover" />
                      )}
                      <span className="text-white text-sm">{character.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
                placeholder="Describe your story idea... What adventure should the characters go on?"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 h-32 resize-none text-lg"
              />
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setCurrentStep("characters")}
                className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
              >
                Back to Characters
              </button>
              <button
                onClick={generateAIStory}
                disabled={isGeneratingStory || activeCharacters.length === 0}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingStory ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating Story...
                  </>
                ) : (
                  "Generate Story with AI"
                )}
              </button>
            </div>
            
            {isGeneratingCover && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-white/80">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Auto-generating cover art...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Reading screen
  if (currentStep === "reading" && currentStory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Your Story</h1>
            <p className="text-xl text-white/80">Featuring: {currentStory.characters.map(c => c.name).join(", ")}</p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-center text-purple-800 mb-8">
              {currentStory.title}
            </h2>
            
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
                
                {!currentStory.coverImageUrl && (
                  <button
                    onClick={generateCoverImage}
                    disabled={isGeneratingCover}
                    className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed shadow-lg"
                  >
                    {isGeneratingCover ? "Generating..." : "Generate Cover"}
                  </button>
                )}
              </div>
            </div>
            
            <div className="prose prose-lg max-w-none">
              {currentStory.fullText.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-gray-800 leading-relaxed mb-4 text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-600">
              <p className="text-sm">
                {currentStory.wordCount} words • Created {new Date(currentStory.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex justify-center mt-8 gap-4">
            <button
              onClick={() => setCurrentStep("story")}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
            >
              Create Another Story
            </button>
            <button
              onClick={() => setCurrentStep("library")}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
            >
              View Library
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Library screen
  if (currentStep === "library") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Story Library ({savedStories.length})</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep("manage-characters")}
                className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30"
              >
                Manage Characters
              </button>
              <button
                onClick={() => setCurrentStep("start")}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                Create New Story
              </button>
            </div>
          </div>
          
          {savedStories.length === 0 ? (
            <div className="text-center text-white/80 py-16">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl mb-8">No stories yet! Create your first magical story.</p>
              <button
                onClick={() => setCurrentStep("start")}
                className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500"
              >
                Start Creating
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => {
                    setCurrentStory(story)
                    setCurrentStep("reading")
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
                  <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                  <p className="text-white/70 text-sm mb-2">
                    Starring: {story.characters.map(c => c.name).join(", ")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {story.wordCount} words • {new Date(story.createdAt).toLocaleDateString()}
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
