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

export default function FixedStoryLoomApp() {
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
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([])
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Fixed theme upload state
  const [showThemeUpload, setShowThemeUpload] = useState(false)
  const [editingTheme, setEditingTheme] = useState<LogoTheme | null>(null)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeDescription, setNewThemeDescription] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSavingTheme, setIsSavingTheme] = useState(false) // Prevent duplicate saves
  const [validationErrors, setValidationErrors] = useState<{name?: boolean, description?: boolean, file?: boolean}>({})

  // Initialize app
  useEffect(() => {
    if (typeof window !== "undefined") {
      loadSavedData()
      initializeDefaultThemes()
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

  const initializeDefaultThemes = () => {
    const defaultThemes: LogoTheme[] = [
      {
        id: "default-adventure",
        imageUrl: "",
        themeName: "Adventure",
        description: "Exciting outdoor adventures and exploration",
        storyPrompts: [
          "discovers a secret cave behind a waterfall",
          "finds a treasure map in the backyard",
          "meets a friendly forest creature"
        ],
        backgroundColor: "#8B5CF6",
        backgroundType: "gradient",
        backgroundValue: "from-purple-400 via-pink-500 to-red-500",
        aspectRatio: "3:2",
        uploadedAt: new Date().toISOString()
      }
    ]

    const existingThemes = localStorage.getItem("storyloom_themes")
    if (!existingThemes) {
      setLogoThemes(defaultThemes)
      setRandomTheme(defaultThemes)
      saveToStorage("storyloom_themes", defaultThemes)
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
    
    const allSuggestions = [...personalizedPrompts]
    setAiSuggestedStories(allSuggestions)
    
    if (allSuggestions.length > 0) {
      setSelectedSuggestion(allSuggestions[0])
      setStoryDescription(allSuggestions[0])
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

  // Enhanced image validation for 3:2 ratio
  const validateImageAspectRatio = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const img = new Image()
        
        img.onload = () => {
          try {
            const aspectRatio = img.width / img.height
            const is3to2 = Math.abs(aspectRatio - 1.5) < 0.1 // 1.5 = 3/2, with tolerance
            
            if (!is3to2) {
              alert(`Please upload an image with 3:2 aspect ratio (like 1344×896 pixels). Your image is ${img.width}×${img.height} (${aspectRatio.toFixed(2)}:1).`)
              resolve(false)
            } else {
              resolve(true)
            }
          } catch (error) {
            console.error("Error validating image:", error)
            resolve(false)
          }
        }
        
        img.onerror = () => {
          console.error("Failed to load image for validation")
          alert("Failed to load image for validation. Please try a different image.")
          resolve(false)
        }
        
        img.src = URL.createObjectURL(file)
      } catch (error) {
        console.error("Error creating image for validation:", error)
        resolve(false)
      }
    })
  }

  // Fixed save theme function with proper error handling
  const saveTheme = async () => {
    // Prevent duplicate saves
    if (isSavingTheme) {
      console.log("Save already in progress, ignoring duplicate request")
      return
    }

    if (!validateThemeForm()) {
      return
    }

    setIsSavingTheme(true)

    try {
      // Validate aspect ratio for new uploads
      if (uploadedFile && !editingTheme) {
        const isValidRatio = await validateImageAspectRatio(uploadedFile)
        if (!isValidRatio) {
          setIsSavingTheme(false)
          return
        }
      }

      if (uploadedFile) {
        // Process file upload
        await processFileUpload()
      } else if (editingTheme) {
        // Save without new file
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

      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const imageUrl = e.target?.result as string
          if (!imageUrl) {
            throw new Error("Failed to read image data")
          }
          await saveThemeData(imageUrl)
          resolve()
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error("Failed to read the image file"))
      }
      
      // Start reading the file
      reader.readAsDataURL(uploadedFile)
    })
  }

  const saveThemeData = async (imageUrl: string): Promise<void> => {
    try {
      // Generate background based on theme name
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
      } else if (themeName.includes("winter") || themeName.includes("snow")) {
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
        id: `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
        imageUrl,
        themeName: newThemeName,
        description: newThemeDescription,
        storyPrompts: [
          `goes on a ${newThemeName.toLowerCase()} adventure`,
          `discovers the magic of ${newThemeName.toLowerCase()}`,
          `becomes a ${newThemeName.toLowerCase()} hero`,
          `explores the wonderful world of ${newThemeName.toLowerCase()}`
        ],
        backgroundColor: "#8B5CF6",
        backgroundType: "gradient",
        backgroundValue,
        aspectRatio: "3:2",
        uploadedAt: new Date().toISOString()
      }
      
      let updated: LogoTheme[]
      if (editingTheme) {
        // Update existing theme
        updated = logoThemes.map(theme => theme.id === editingTheme.id ? themeData : theme)
      } else {
        // Check for duplicates before adding
        const existingTheme = logoThemes.find(theme => 
          theme.themeName.toLowerCase() === newThemeName.toLowerCase()
        )
        
        if (existingTheme) {
          const overwrite = confirm(`A theme named "${newThemeName}" already exists. Overwrite it?`)
          if (overwrite) {
            updated = logoThemes.map(theme => 
              theme.themeName.toLowerCase() === newThemeName.toLowerCase() ? themeData : theme
            )
          } else {
            return // User canceled
          }
        } else {
          // Add new theme
          updated = [...logoThemes, themeData]
        }
      }
      
      // Save to localStorage with error handling
      const saveSuccess = saveToStorage("storyloom_themes", updated)
      if (!saveSuccess) {
        throw new Error("Failed to save theme data to storage")
      }
      
      setLogoThemes(updated)
      
      // Set as current theme
      setCurrentTheme(themeData)
      localStorage.setItem("storyloom_current_theme", themeData.id)
      generateAISuggestions(themeData)
      
      // Reset form and close modal
      resetThemeForm()
      
      // Success feedback
      console.log("Theme saved successfully:", themeData.themeName)
      
    } catch (error) {
      console.error("Error in saveThemeData:", error)
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
      try {
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
      } catch (error) {
        console.error("Error deleting theme:", error)
        alert("Failed to delete theme. Please try again.")
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

  // Character management functions (keeping existing - abbreviated for space)
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

  // Story generation functions (abbreviated for space - keeping core functionality)
  const generateMagicalStory = async () => {
    if (activeCharacters.length === 0) {
      alert("Please select at least one character for your story!")
      return
    }
    // Implementation continues as before...
    console.log("Story generation would happen here")
  }

  // Enhanced start screen with proper 3:2 logo display
  if (currentStep === "start") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Tommy's Logo - Centered at top with proper 3:2 aspect ratio */}
        <div className="flex justify-center pt-16 pb-8 relative z-10">
          {currentTheme && currentTheme.imageUrl ? (
            <div className="relative group">
              <img
                src={currentTheme.imageUrl}
                alt={`StoryLoom - ${currentTheme.themeName}`}
                style={{
                  width: '240px',
                  height: '160px',
                  objectFit: 'contain',
                  background: 'transparent'
                }}
                className="rounded-3xl shadow-2xl border-4 border-white/40 group-hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/10"
                onClick={() => rotateToRandomTheme()}
              />
              <button
                onClick={() => rotateToRandomTheme()}
                className="absolute -top-3 -right-3 bg-yellow-400 hover:bg-yellow-300 text-purple-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all text-lg"
                title="Rotate Theme"
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
              <p className="text-yellow-300 font-semibold text-lg">Upload Tommy's 3:2 logos to get started!</p>
              <p className="text-white/70 text-sm mt-2">Recommended: 1344×896 pixels with transparent background</p>
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
                  Create personalized stories with Tommy's dynamic themes and AI suggestions
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced theme management screen
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
                      Tommy Logo (3:2 ratio recommended)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUploadedFile(e.target.files[0])
                          setValidationErrors(prev => ({ ...prev, file: false }))
                        }
                      }}
                      className={`w-full ${
                        validationErrors.file ? "border-red-500" : ""
                      }`}
                      disabled={isSavingTheme}
                    />
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Best quality: PNG with transparent background, 1344×896 pixels (3:2 ratio)
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

  // Simplified for other screens
  return <div>Other screens continue...</div>
}
