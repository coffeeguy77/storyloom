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
  isActive: boolean
}

interface LogoTheme {
  id: string
  imageUrl: string
  themeName: string
  description: string
  storyPrompts: string[]
  backgroundColor: string
  backgroundType: "gradient" | "image"
  backgroundValue: string
  aspectRatio: "3:2"
  uploadedAt: string
}

interface Story {
  id: string
  title: string
  fullText: string
  coverImagePrompt: string
  coverImageUrl?: string
  wordCount: number
  characters: Character[]
  theme?: string
  createdAt: string
}

interface LoadingStep {
  id: string
  title: string
  description: string
  emoji: string
  duration: number
  completed: boolean
}

export default function CompleteStoryLoomApp() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "themes" | "story" | "generating" | "reading" | "library" | "manage-characters">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [storyDescription, setStoryDescription] = useState("")
  const [storyTitle, setStoryTitle] = useState("")

  // Enhanced theme state
  const [logoThemes, setLogoThemes] = useState<LogoTheme[]>([])
  const [currentTheme, setCurrentTheme] = useState<LogoTheme | null>(null)
  const [aiSuggestedStories, setAiSuggestedStories] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("")
  
  // Loading magic
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([])
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Fixed theme upload state
  const [showThemeUpload, setShowThemeUpload] = useState(false)
  const [editingTheme, setEditingTheme] = useState<LogoTheme | null>(null)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeDescription, setNewThemeDescription] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSavingTheme, setIsSavingTheme] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{name?: boolean, description?: boolean, file?: boolean}>({})

  // Initialize app
  useEffect(() => {
    if (typeof window !== "undefined") {
      loadSavedData()
    }
  }, [])

  const loadSavedData = () => {
    try {
      const savedStoriesData = localStorage.getItem("storyloom_stories")
      if (savedStoriesData) {
        setSavedStories(JSON.parse(savedStoriesData))
      }

      const savedCharactersData = localStorage.getItem("storyloom_characters")
      if (savedCharactersData) {
        const characters = JSON.parse(savedCharactersData)
        setSavedCharacters(characters)
        const children = characters.filter((c: Character) => c.isChild)
        setActiveCharacters(children)
      }

      const savedThemesData = localStorage.getItem("storyloom_themes")
      if (savedThemesData) {
        const themes = JSON.parse(savedThemesData)
        setLogoThemes(themes)
        
        const currentThemeId = localStorage.getItem("storyloom_current_theme")
        if (currentThemeId) {
          const persistedTheme = themes.find((t: LogoTheme) => t.id === currentThemeId)
          if (persistedTheme) {
            setCurrentTheme(persistedTheme)
            generateAISuggestions(persistedTheme)
          } else if (themes.length > 0) {
            setRandomTheme(themes)
          }
        } else if (themes.length > 0) {
          setRandomTheme(themes)
        }
      }
    } catch (error) {
      console.error("Error loading saved data:", error)
    }
  }

  const getThemeBackground = (theme: LogoTheme | null): string => {
    if (!theme) return "from-purple-400 via-pink-500 to-red-500"
    return theme.backgroundValue || "from-purple-400 via-pink-500 to-red-500"
  }

  const setRandomTheme = (themes: LogoTheme[]) => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)]
    setCurrentTheme(randomTheme)
    localStorage.setItem("storyloom_current_theme", randomTheme.id)
    generateAISuggestions(randomTheme)
  }

  const rotateToRandomTheme = () => {
    if (logoThemes.length > 1) {
      const availableThemes = logoThemes.filter(theme => theme.id !== currentTheme?.id)
      setRandomTheme(availableThemes)
    }
  }

  const generateAISuggestions = (theme: LogoTheme) => {
    if (!theme || activeCharacters.length === 0) {
      setAiSuggestedStories(theme?.storyPrompts || [])
      return
    }

    const characterNames = activeCharacters.map(c => c.name).join(" and ")
    const personalizedPrompts = theme.storyPrompts.map(prompt => 
      `${characterNames} ${prompt}`
    )
    
    setAiSuggestedStories(personalizedPrompts)
    
    if (personalizedPrompts.length > 0) {
      setSelectedSuggestion(personalizedPrompts[0])
      setStoryDescription(personalizedPrompts[0])
    }
  }

  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
        return false
      }
    }
    return false
  }

  const validateThemeForm = (): boolean => {
    const errors = {
      name: !newThemeName.trim(),
      description: !newThemeDescription.trim(),
      file: !uploadedFile && !editingTheme
    }
    
    setValidationErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  // Fixed save theme function
  const saveTheme = async () => {
    if (isSavingTheme) return

    if (!validateThemeForm()) return

    setIsSavingTheme(true)

    try {
      if (uploadedFile) {
        await processFileUpload()
      } else if (editingTheme) {
        await saveThemeData(editingTheme.imageUrl)
      }
    } catch (error) {
      console.error("Error saving theme:", error)
      alert("Failed to save theme. Please try again.")
    } finally {
      setIsSavingTheme(false)
    }
  }

  const processFileUpload = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!uploadedFile) {
        reject(new Error("No file selected"))
        return
      }

      try {
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const result = e.target?.result
            if (result && typeof result === 'string') {
              saveThemeData(result).then(resolve).catch(reject)
            } else {
              reject(new Error("Failed to read file"))
            }
          } catch (error) {
            reject(error)
          }
        }
        
        reader.onerror = () => {
          reject(new Error("FileReader error"))
        }
        
        // Read file as data URL - works with any image format (.png, .PNG, .jpg, etc.)
        reader.readAsDataURL(uploadedFile)
      } catch (error) {
        reject(error)
      }
    })
  }

  const saveThemeData = async (imageUrl: string): Promise<void> => {
    try {
      let backgroundValue = "from-purple-400 via-pink-500 to-red-500"
      const themeName = newThemeName.toLowerCase()
      
      if (themeName.includes("jungle")) {
        backgroundValue = "from-green-600 via-emerald-500 to-teal-400"
      } else if (themeName.includes("space")) {
        backgroundValue = "from-indigo-900 via-purple-900 to-pink-900"
      } else if (themeName.includes("ocean")) {
        backgroundValue = "from-blue-600 via-cyan-500 to-teal-400"
      } else if (themeName.includes("desert")) {
        backgroundValue = "from-yellow-600 via-orange-500 to-red-400"
      } else if (themeName.includes("winter")) {
        backgroundValue = "from-blue-200 via-indigo-300 to-purple-400"
      } else if (themeName.includes("pirate")) {
        backgroundValue = "from-amber-600 via-orange-500 to-red-600"
      } else if (themeName.includes("dinosaur")) {
        backgroundValue = "from-green-700 via-amber-600 to-orange-500"
      }

      const themeData: LogoTheme = editingTheme ? {
        ...editingTheme,
        themeName: newThemeName,
        description: newThemeDescription,
        imageUrl
      } : {
        id: `theme_${Date.now()}`,
        imageUrl,
        themeName: newThemeName,
        description: newThemeDescription,
        storyPrompts: [
          `goes on a ${newThemeName.toLowerCase()} adventure`,
          `discovers the magic of ${newThemeName.toLowerCase()}`,
          `becomes a ${newThemeName.toLowerCase()} hero`
        ],
        backgroundColor: "#8B5CF6",
        backgroundType: "gradient",
        backgroundValue,
        aspectRatio: "3:2",
        uploadedAt: new Date().toISOString()
      }
      
      let updated: LogoTheme[]
      if (editingTheme) {
        updated = logoThemes.map(theme => theme.id === editingTheme.id ? themeData : theme)
      } else {
        updated = [...logoThemes, themeData]
      }
      
      const saveSuccess = saveToStorage("storyloom_themes", updated)
      if (!saveSuccess) {
        throw new Error("Failed to save to storage")
      }
      
      setLogoThemes(updated)
      setCurrentTheme(themeData)
      localStorage.setItem("storyloom_current_theme", themeData.id)
      generateAISuggestions(themeData)
      resetThemeForm()
      
    } catch (error) {
      throw error
    }
  }

  const resetThemeForm = () => {
    setNewThemeName("")
    setNewThemeDescription("")
    setUploadedFile(null)
    setEditingTheme(null)
    setShowThemeUpload(false)
    setValidationErrors({})
    setIsSavingTheme(false)
  }

  const deleteTheme = (themeId: string) => {
    if (confirm("Are you sure you want to delete this theme?")) {
      const updated = logoThemes.filter(theme => theme.id !== themeId)
      setLogoThemes(updated)
      saveToStorage("storyloom_themes", updated)
      
      if (currentTheme?.id === themeId) {
        if (updated.length > 0) {
          setRandomTheme(updated)
        } else {
          setCurrentTheme(null)
          localStorage.removeItem("storyloom_current_theme")
        }
      }
    }
  }

  const editTheme = (theme: LogoTheme) => {
    setEditingTheme(theme)
    setNewThemeName(theme.themeName)
    setNewThemeDescription(theme.description)
    setUploadedFile(null)
    setValidationErrors({})
    setIsSavingTheme(false)
    setShowThemeUpload(true)
  }

  // Character management
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
    setActiveCharacters(activeCharacters.filter(c => c.id !== id))
  }

  const toggleCharacterActive = (characterId: string) => {
    const character = savedCharacters.find(c => c.id === characterId)
    if (!character) return

    if (activeCharacters.find(c => c.id === characterId)) {
      setActiveCharacters(activeCharacters.filter(c => c.id !== characterId))
    } else {
      setActiveCharacters([...activeCharacters, character])
      if (currentTheme) {
        generateAISuggestions(currentTheme)
      }
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

  // Story generation
  const generateMagicalStory = async () => {
    if (activeCharacters.length === 0) {
      alert("Please select at least one character for your story!")
      return
    }

    const steps: LoadingStep[] = [
      {
        id: "characters",
        title: "Assembling Your Characters",
        description: "Getting to know your story heroes...",
        emoji: "👥",
        duration: 2000,
        completed: false
      },
      {
        id: "theme",
        title: "Setting the Scene", 
        description: `Preparing your ${currentTheme?.themeName || "magical"} adventure...`,
        emoji: "🎭",
        duration: 1500,
        completed: false
      },
      {
        id: "story",
        title: "Weaving the Story",
        description: "AI is crafting your personalized tale...",
        emoji: "📝",
        duration: 3000,
        completed: false
      },
      {
        id: "artwork",
        title: "Creating Cover Art",
        description: "Painting your story's magical cover...",
        emoji: "🎨",
        duration: 2500,
        completed: false
      },
      {
        id: "magic",
        title: "Adding Final Magic",
        description: "Sprinkling some storytelling fairy dust...",
        emoji: "✨",
        duration: 1000,
        completed: false
      }
    ]

    setLoadingSteps(steps)
    setCurrentLoadingStep(0)
    setLoadingProgress(0)
    setCurrentStep("generating")
    setIsGeneratingStory(true)

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentLoadingStep(i)
        setLoadingSteps(prev => prev.map((step, idx) => ({
          ...step,
          completed: idx < i
        })))

        const startProgress = (i / steps.length) * 100
        const endProgress = ((i + 1) / steps.length) * 100
        
        await animateProgress(startProgress, endProgress, steps[i].duration)

        if (i === 2) {
          await generateStoryAPI()
        } else if (i === 3) {
          await generateCoverAPI()
        }
      }

      setLoadingSteps(prev => prev.map(step => ({ ...step, completed: true })))
      setLoadingProgress(100)

      setTimeout(() => {
        setCurrentStep("reading")
      }, 1000)

    } catch (error) {
      console.error("Story generation failed:", error)
      alert(`Story generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setCurrentStep("story")
    } finally {
      setIsGeneratingStory(false)
    }
  }

  const animateProgress = (start: number, end: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const currentProgress = start + (end - start) * progress
        
        setLoadingProgress(currentProgress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      animate()
    })
  }

  const generateStoryAPI = async () => {
    const characterNames = activeCharacters.map(c => c.name).join(" and ")
    const characterDescriptions = activeCharacters.map(c => 
      `${c.name} (${c.personality || "adventurous"})`
    ).join(", ")
    
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: storyDescription || selectedSuggestion,
        ageGroup: "6-8",
        tone: currentTheme?.themeName.toLowerCase() || "adventure",
        length: "medium",
        artStyle: "cartoon",
        theme: currentTheme?.themeName,
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
    
    if (!apiStory.success || !apiStory.fullText) {
      throw new Error("Invalid API response")
    }

    const story: Story = {
      id: apiStory.id || Date.now().toString(),
      title: apiStory.title || storyTitle || "Your Amazing Story",
      fullText: apiStory.fullText,
      coverImagePrompt: apiStory.coverImagePrompt,
      wordCount: apiStory.wordCount,
      characters: [...activeCharacters],
      theme: currentTheme?.themeName,
      createdAt: new Date().toISOString()
    }
    
    setCurrentStory(story)
    return story
  }

  const generateCoverAPI = async () => {
    if (!currentStory) return

    try {
      const imageResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentStory.coverImagePrompt })
      })
      
      if (imageResponse.ok) {
        const imageResult = await imageResponse.json()
        if (imageResult.success && imageResult.imageUrl) {
          const updatedStory = { ...currentStory, coverImageUrl: imageResult.imageUrl }
          setCurrentStory(updatedStory)
          
          const updatedStories = [...savedStories, updatedStory]
          setSavedStories(updatedStories)
          saveToStorage("storyloom_stories", updatedStories)
        }
      }
    } catch (error) {
      console.log("Cover generation failed, continuing without cover")
    }
  }

  // CLEAN START SCREEN
  if (currentStep === "start") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} relative overflow-hidden`}>
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Clean Tommy Logo Display */}
        <div className="flex justify-center pt-16 pb-8 relative z-10">
          {currentTheme && currentTheme.imageUrl ? (
            <div className="relative group">
              <img
                src={currentTheme.imageUrl}
                alt={`StoryLoom - ${currentTheme.themeName}`}
                style={{
                  width: '240px',
                  height: '160px',
                  objectFit: 'contain'
                }}
                className="rounded-3xl shadow-2xl border-4 border-white/40 group-hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/10"
                onClick={() => rotateToRandomTheme()}
              />
              <button
                onClick={() => rotateToRandomTheme()}
                className="absolute -top-3 -right-3 bg-yellow-400 hover:bg-yellow-300 text-purple-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all text-lg"
              >
                🔄
              </button>
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-center text-sm font-semibold">
                {currentTheme.themeName}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white drop-shadow-2xl mb-4">StoryLoom</h1>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-3xl">
            {currentTheme && aiSuggestedStories.length > 0 && activeCharacters.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white mb-4">
                  ✨ {currentTheme.themeName} Magic Ready!
                </h2>
                
                <div className="bg-white/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-3">
                    Story Ideas for {activeCharacters.map(c => c.name).join(", ")}
                  </h3>
                  
                  <div className="grid gap-3">
                    {aiSuggestedStories.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedSuggestion(suggestion)
                          setStoryDescription(suggestion)
                        }}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          selectedSuggestion === suggestion
                            ? "bg-yellow-400 text-purple-900 font-semibold shadow-lg transform scale-105"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        <p className="text-base">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => generateMagicalStory()}
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    <span className="text-2xl">🪄</span>
                    Create This Magical Story
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep("characters")}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-2xl font-semibold border border-white/30 transition-all"
                  >
                    Customize Characters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Welcome to StoryLoom Magic! ✨
                </h2>
                <p className="text-lg text-white/80 mb-6">
                  Create personalized stories with dynamic themes and AI suggestions
                </p>
                
                <button
                  onClick={() => setCurrentStep(savedCharacters.length > 0 ? "characters" : "manage-characters")}
                  className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all transform hover:scale-105"
                >
                  {savedCharacters.length > 0 ? "Start Creating Stories" : "Add Your Children First"}
                </button>
              </div>
            )}
            
            <div className="flex justify-center gap-6 mt-6 text-sm">
              <button
                onClick={() => setCurrentStep("themes")}
                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
              >
                🎨 Manage Themes
              </button>
              <button
                onClick={() => setCurrentStep("library")}
                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
              >
                📚 Story Library
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CHARACTER MANAGEMENT SCREEN
  if (currentStep === "manage-characters") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
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

  // CHARACTER SELECTION SCREEN  
  if (currentStep === "characters") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
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

  // STORY CREATION SCREEN
  if (currentStep === "story") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
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
                onClick={generateMagicalStory}
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

  // MAGICAL LOADING SCREEN
  if (currentStep === "generating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center relative overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <span className="text-2xl opacity-30">
                {["✨", "⭐", "🌟", "💫", "🎭", "📚", "🎨"][Math.floor(Math.random() * 7)]}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 text-center max-w-2xl mx-4 border border-white/20 relative z-10">
          <h2 className="text-4xl font-bold text-white mb-8">
            Creating Your Story Magic ✨
          </h2>
          
          {/* Current step display */}
          {loadingSteps[currentLoadingStep] && (
            <div className="mb-8">
              <div className="text-6xl mb-4 animate-bounce">
                {loadingSteps[currentLoadingStep].emoji}
              </div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">
                {loadingSteps[currentLoadingStep].title}
              </h3>
              <p className="text-white/90 text-lg">
                {loadingSteps[currentLoadingStep].description}
              </p>
            </div>
          )}

          {/* Progress bar */}
          <div className="mb-8">
            <div className="bg-white/20 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              >
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
            <p className="text-white/70 text-sm mt-2">
              {Math.round(loadingProgress)}% complete
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex justify-center gap-4 mb-6">
            {loadingSteps.map((step, index) => (
              <div
                key={step.id}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step.completed
                    ? "bg-green-400 text-white scale-110"
                    : index === currentLoadingStep
                    ? "bg-yellow-400 text-purple-900 animate-pulse scale-110"
                    : "bg-white/20 text-white/60"
                }`}
              >
                {step.completed ? "✓" : step.emoji}
              </div>
            ))}
          </div>
          
          <p className="text-white/60 text-sm">
            Hang tight! We're crafting something amazing just for you...
          </p>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(120deg); }
            66% { transform: translateY(10px) rotate(240deg); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          .animate-shimmer {
            animation: shimmer 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  // READING SCREEN
  if (currentStep === "reading" && currentStory) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
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
                    onClick={() => generateCoverAPI()}
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

  // LIBRARY SCREEN
  if (currentStep === "library") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
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

  // THEME MANAGEMENT SCREEN
  if (currentStep === "themes") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Theme Gallery</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowThemeUpload(true)}
                className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all font-semibold"
                disabled={isSavingTheme}
              >
                + Upload Tommy Logo
              </button>
              <button
                onClick={() => setCurrentStep("start")}
                className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30"
              >
                Back to Home
              </button>
            </div>
          </div>

          {/* Fixed upload modal */}
          {showThemeUpload && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
                <button
                  onClick={resetThemeForm}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                  disabled={isSavingTheme}
                >
                  ×
                </button>
                
                <h2 className="text-2xl font-bold text-purple-800 mb-6">
                  {editingTheme ? "Edit Theme" : "Upload New Theme"}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Theme name (e.g., 'Jungle Adventure')"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl ${
                        validationErrors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      disabled={isSavingTheme}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-sm mt-1">Theme name is required</p>
                    )}
                  </div>
                  
                  <div>
                    <textarea
                      placeholder="Theme description (e.g., 'Tommy talks to animals and explores the jungle')"
                      value={newThemeDescription}
                      onChange={(e) => setNewThemeDescription(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl h-24 resize-none ${
                        validationErrors.description ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      disabled={isSavingTheme}
                    />
                    {validationErrors.description && (
                      <p className="text-red-500 text-sm mt-1">Description is required</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tommy Logo (3:2 ratio recommended - like 1344×896 pixels)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          console.log("File selected:", file.name, file.type, file.size)
                          setUploadedFile(file)
                          setValidationErrors(prev => ({ ...prev, file: false }))
                        }
                      }}
                      className={`w-full ${
                        validationErrors.file ? "border-red-500" : ""
                      }`}
                      disabled={isSavingTheme}
                    />
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Best quality: PNG with transparent background
                    </p>
                    
                    {validationErrors.file && (
                      <p className="text-red-500 text-sm mt-1">Please select an image file</p>
                    )}
                    
                    {uploadedFile && (
                      <p className="text-green-600 text-sm mt-1">✓ {uploadedFile.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={saveTheme}
                    disabled={isSavingTheme}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                      isSavingTheme 
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {isSavingTheme 
                      ? "Saving..." 
                      : editingTheme 
                        ? "Save Changes" 
                        : "Save Theme"
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logoThemes.map((theme) => (
              <div
                key={theme.id}
                className={`cursor-pointer transition-all rounded-2xl p-6 border-2 relative group ${
                  currentTheme?.id === theme.id
                    ? "bg-white/30 border-yellow-400 shadow-xl scale-105"
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => editTheme(theme)}
                    className="bg-blue-500 hover:bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteTheme(theme.id)}
                    className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    🗑️
                  </button>
                </div>
                
                <div 
                  onClick={() => {
                    setCurrentTheme(theme)
                    localStorage.setItem("storyloom_current_theme", theme.id)
                    generateAISuggestions(theme)
                  }}
                  className="mb-4 overflow-hidden rounded-xl bg-white/10"
                >
                  {theme.imageUrl ? (
                    <img 
                      src={theme.imageUrl} 
                      alt={theme.themeName}
                      style={{
                        width: '100%',
                        aspectRatio: '3/2',
                        objectFit: 'contain',
                        background: 'rgba(255,255,255,0.1)'
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full flex items-center justify-center text-4xl text-white/60"
                      style={{ aspectRatio: '3/2' }}
                    >
                      🎭
                    </div>
                  )}
                </div>
                
                <h3 className="text-white font-bold text-lg">{theme.themeName}</h3>
                <p className="text-white/70 text-sm line-clamp-2">{theme.description}</p>
                
                {currentTheme?.id === theme.id && (
                  <div className="mt-3 bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-medium text-center">
                    ✨ Active Theme
                  </div>
                )}
              </div>
            ))}
          </div>

          {logoThemes.length === 0 && (
            <div className="text-center text-white/80 py-16">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-xl mb-4">No Tommy logos uploaded yet!</p>
              <p className="text-white/60 mb-8">Upload Tommy's artwork to get started</p>
              <button
                onClick={() => setShowThemeUpload(true)}
                className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500"
              >
                Upload First Tommy Logo
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
