"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { buildImagePrompt, type ThemeId, type PromptCharacter } from "@/lib/imagePrompts"
import { buildStoryPrompt, buildStoryTitle } from "@/lib/storyPrompts"
import { useSupabase, SupabaseProvider } from "@/lib/useSupabase"
import AuthGate from "@/components/AuthGate"
import SharingPanel from "@/components/SharingPanel"
import CommunityFeed from "@/components/CommunityFeed"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
type Theme = {
  id: string
  name: string
  description: string
  image: string
  colors: { primary: string; secondary: string }
}

type LocalCharacter = {
  id: string
  name: string
  isGuest?: boolean
}

type LocalStory = {
  id: string
  title: string
  content: string
  imageUrl: string
  themeId?: ThemeId
  characters: LocalCharacter[]
  createdAt: string
  storyType: "theme" | "manual" | "ai"
  userPrompt?: string
  imagePrompt?: string
}

type Screen =
  | "home"
  | "characters"
  | "builder"
  | "manualBuilder"
  | "aiBuilder"
  | "themeList"
  | "prepare"
  | "review"
  | "generating"
  | "reading"
  | "library"
  | "sharing"
  | "community"
  | "familySettings"

// ============================================================================
// CLOUDINARY ASSETS
// ============================================================================
const CLOUDINARY = {
  tommyLogo: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662026/tommy-logo.png",
  icons: {
    myKids: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688045/my-kids.png",
    tommyDream: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688046/tommy-dream.png",
    tommyRead: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688047/tommy-read.png",
    tommyWrite: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688046/tommy-write.png",
    tommyAi: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688049/tommy-ai.png",
    tommyTheme: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688052/tommy-theme.png",
  },
}

// ============================================================================
// THEMES DATA
// ============================================================================
const themes: Theme[] = [
  {
    id: "dinosaur",
    name: "Dinosaur Adventure",
    description: "Explore a world where dinosaurs roam free",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/dinosaur.png",
    colors: { primary: "#8B4513", secondary: "#228B22" },
  },
  {
    id: "space",
    name: "Space Explorer",
    description: "Journey to the stars and beyond",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776661893/space.png",
    colors: { primary: "#1e3a8a", secondary: "#fbbf24" },
  },
  {
    id: "jungle",
    name: "Jungle Adventure",
    description: "Discover enchanted forests and magical creatures",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662020/jungle.png",
    colors: { primary: "#db2777", secondary: "#a855f7" },
  },
  {
    id: "pirate",
    name: "Pirate Adventure",
    description: "Sail the seven seas in search of treasure",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662161/pirate.png",
    colors: { primary: "#92400e", secondary: "#1f2937" },
  },
  {
    id: "ocean",
    name: "Ocean Quest",
    description: "Dive deep into ocean mysteries",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/ocean.png",
    colors: { primary: "#0ea5e9", secondary: "#10b981" },
  },
  {
    id: "monster-trucks",
    name: "Monster Truck Rally",
    description: "Rev up for high-octane adventures",
    image: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662021/monster-trucks.png",
    colors: { primary: "#dc2626", secondary: "#1d4ed8" },
  },
]

// ============================================================================
// OPENAI API CALLS
// ============================================================================
async function generateAIBookCover(prompt: string): Promise<string> {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Image generation failed: ${error}`)
  }
  const data = await response.json()
  if (!data.imageUrl) throw new Error("No image URL returned")
  return data.imageUrl
}

async function generateAIStory(prompt: string): Promise<string> {
  const response = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Story generation failed: ${error}`)
  }
  const data = await response.json()
  if (!data.story) throw new Error("No story content returned")
  return data.story
}

// ============================================================================
// ANIMATED BACKGROUND COMPONENT
// ============================================================================
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400 animate-[hue-rotate_20s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-500/20 to-purple-600/40 animate-[orb-shift_15s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-gradient-radial from-pink-400/30 via-transparent to-yellow-400/20 animate-[orb-shift-alt_12s_ease-in-out_infinite]" />
      <style jsx>{`
        @keyframes hue-rotate {
          0%, 100% { filter: hue-rotate(0deg) brightness(1.1) saturate(1.2); }
          25% { filter: hue-rotate(90deg) brightness(1.2) saturate(1.3); }
          50% { filter: hue-rotate(180deg) brightness(1.1) saturate(1.4); }
          75% { filter: hue-rotate(270deg) brightness(1.3) saturate(1.2); }
        }
        @keyframes orb-shift {
          0%, 100% { background: radial-gradient(at 20% 30%, transparent, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.4)); }
          25% { background: radial-gradient(at 80% 20%, transparent, rgba(34, 197, 94, 0.2), rgba(59, 130, 246, 0.4)); }
          50% { background: radial-gradient(at 70% 80%, transparent, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.4)); }
          75% { background: radial-gradient(at 30% 70%, transparent, rgba(236, 72, 153, 0.2), rgba(147, 51, 234, 0.4)); }
        }
        @keyframes orb-shift-alt {
          0%, 100% { background: radial-gradient(at 80% 80%, rgba(244, 114, 182, 0.3), transparent, rgba(250, 204, 21, 0.2)); }
          33% { background: radial-gradient(at 20% 20%, rgba(34, 211, 238, 0.3), transparent, rgba(34, 197, 94, 0.2)); }
          66% { background: radial-gradient(at 50% 10%, rgba(251, 146, 60, 0.3), transparent, rgba(59, 130, 246, 0.2)); }
        }
        .bg-gradient-radial {
          background: radial-gradient(50% 50% at 50% 50%, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// UI COMPONENTS
// ============================================================================
function TommyLogo() {
  return (
    <div className="flex justify-center mb-12">
      <img
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom — Tommy's magical stories"
        className="w-full max-w-[768px] h-auto drop-shadow-2xl relative z-50"
        style={{ opacity: 1 }}
      />
    </div>
  )
}

function TommyHeaderLogo() {
  return (
    <div className="flex justify-center mb-8">
      <img
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom"
        className="w-full max-w-[400px] h-auto drop-shadow-xl relative z-50"
        style={{ opacity: 1 }}
      />
    </div>
  )
}

function TommyIcon({
  iconKey,
  alt,
  className = "",
}: {
  iconKey: keyof typeof CLOUDINARY.icons
  alt: string
  className?: string
}) {
  return (
    <img
      src={CLOUDINARY.icons[iconKey]}
      alt={alt}
      className={`w-full max-w-[272px] h-auto object-contain drop-shadow-xl ${className}`}
    />
  )
}

function MagicalCard({
  children,
  className = "",
  glowColor = "rgba(168, 85, 247, 0.2)",
  onClick,
}: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white/10 backdrop-blur-md rounded-3xl
        border border-white/20 shadow-2xl
        transition-all duration-500 ease-out
        ${onClick ? "cursor-pointer hover:scale-[1.02] hover:-translate-y-1" : ""}
        ${className}
      `}
      style={{
        boxShadow: `0 25px 50px -12px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.05)`,
      }}
    >
      {children}
    </div>
  )
}

function UserBar() {
  const { profile, user, signOut } = useSupabase()
  if (!user) return null
  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
      <span className="text-white/90 text-sm">{profile?.display_name ?? user.email}</span>
      <button
        onClick={signOut}
        className="text-white/80 hover:text-white text-sm underline"
      >
        Sign out
      </button>
    </div>
  )
}

// ============================================================================
// FIRST-RUN FAMILY SETUP — shown when signed in but family is null
// ============================================================================
function FamilySetupScreen() {
  const { profile, createFamily } = useSupabase()
  const [name, setName] = useState(
    profile?.display_name ? `${profile.display_name}'s Family` : ""
  )
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function onCreate() {
    setBusy(true); setErrMsg(null)
    try { await createFamily(name) }
    catch (e: any) { setErrMsg(e?.message ?? "Failed to create family") }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <UserBar />
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 min-h-screen">
        <TommyHeaderLogo />
        <div className="max-w-xl w-full">
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl">
            Welcome to StoryLoom!
          </h1>
          <p className="text-lg text-white/85 mb-8 drop-shadow">
            Before we start, what should we call your family? This is where all
            your stories and characters will live. You can change it any time.
          </p>

          <MagicalCard>
            <div className="p-8 space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="e.g. The Smith Family"
                className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 text-lg focus:border-white/60 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onCreate() }}
              />
              {errMsg && (
                <div className="text-red-200 text-center bg-red-500/20 p-3 rounded-lg text-sm">
                  {errMsg}
                </div>
              )}
              <button
                onClick={onCreate}
                disabled={busy || !name.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Creating…" : "Create my family"}
              </button>
              <p className="text-white/60 text-xs text-center pt-2">
                You can rename your family any time from the home screen.
              </p>
            </div>
          </MagicalCard>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN APP COMPONENT (wrapped in SupabaseProvider + AuthGate)
// ============================================================================
export default function StoryLoomPage() {
  return (
    <SupabaseProvider>
      <AuthGate>
        <StoryLoomShell />
      </AuthGate>
    </SupabaseProvider>
  )
}

// Intermediate shell: shows family-setup screen if no family yet, otherwise
// shows the main app.
function StoryLoomShell() {
  const { isLoading, error: dbError, family } = useSupabase()

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 min-h-screen">
          <MagicalCard>
            <div className="p-12 text-center">
              <div className="animate-spin w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Loading StoryLoom...</h2>
              <p className="text-white/80">Connecting to your stories...</p>
            </div>
          </MagicalCard>
        </div>
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 min-h-screen">
          <MagicalCard>
            <div className="p-12 text-center">
              <h2 className="text-2xl font-bold text-red-300 mb-4">Connection Error</h2>
              <p className="text-white/80 mb-6">{dbError}</p>
              <button
                onClick={() => typeof window !== "undefined" && window.location.reload()}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </MagicalCard>
        </div>
      </div>
    )
  }

  if (!family) return <FamilySetupScreen />

  return <StoryLoom />
}

function StoryLoom() {
  const {
    family,
    characters,
    stories,
    addCharacter: dbAddCharacter,
    deleteCharacter: dbDeleteCharacter,
    addStory,
    deleteStory: dbDeleteStory,
    renameFamily,
  } = useSupabase()

  // App state
  const [screen, setScreen] = useState<Screen>("home")
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [selectedCharacters, setSelectedCharacters] = useState<LocalCharacter[]>([])
  const [customPrompt, setCustomPrompt] = useState("")
  const [storyTitle, setStoryTitle] = useState("")
  const [storyPrompt, setStoryPrompt] = useState("")
  const [imagePrompt, setImagePrompt] = useState("")
  const [currentStory, setCurrentStory] = useState<LocalStory | null>(null)
  const [generationStage, setGenerationStage] = useState("")
  const [error, setError] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const [newCharacterName, setNewCharacterName] = useState("")
  const [newGuestName, setNewGuestName] = useState("")

  const [manualTitle, setManualTitle] = useState("")
  const [manualContent, setManualContent] = useState("")

  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenre, setAiGenre] = useState("Adventure")
  const [aiLength, setAiLength] = useState("Medium")

  const [familyNameInput, setFamilyNameInput] = useState("")
  const [familySaveBusy, setFamilySaveBusy] = useState(false)

  const go = (newScreen: Screen) => { setScreen(newScreen); setError("") }

  const showTommyHeader =
    screen !== "home" && screen !== "themeList" && screen !== "prepare"

  const localCharacters: LocalCharacter[] = characters.map((c) => ({
    id: c.id, name: c.name, isGuest: c.is_guest,
  }))

  const localStories: LocalStory[] = stories.map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
    imageUrl: s.image_url,
    themeId: s.theme_id as ThemeId,
    characters: (s.characters ?? []) as LocalCharacter[],
    createdAt: s.created_at,
    storyType: s.story_type,
    userPrompt: s.user_prompt ?? undefined,
    imagePrompt: s.image_prompt ?? undefined,
  }))

  // ========== Characters ==========
  const addCharacter = async () => {
    if (!newCharacterName.trim()) return
    try { await dbAddCharacter(newCharacterName.trim(), false); setNewCharacterName("") }
    catch (err) { setError("Failed to add character"); console.error(err) }
  }

  const addGuest = async () => {
    if (!newGuestName.trim()) return
    try { await dbAddCharacter(newGuestName.trim(), true); setNewGuestName("") }
    catch (err) { setError("Failed to add guest"); console.error(err) }
  }

  const deleteCharacter = async (id: string) => {
    if (typeof window !== "undefined" && confirm("Delete this character permanently?")) {
      try { await dbDeleteCharacter(id) }
      catch (err) { setError("Failed to delete character"); console.error(err) }
    }
  }

  // ========== Story generation ==========
  const startThemeStory = (theme: Theme) => {
    setSelectedTheme(theme); setSelectedCharacters([]); setCustomPrompt(""); go("prepare")
  }

  const startManualStory = () => {
    setManualTitle(""); setManualContent(""); setSelectedTheme(null); go("manualBuilder")
  }

  const startAIStory = () => {
    setAiPrompt(""); setAiGenre("Adventure"); setAiLength("Medium"); setSelectedTheme(null); go("aiBuilder")
  }

  const proceedToReview = () => {
    if (!selectedTheme) return
    const promptCharacters: PromptCharacter[] = selectedCharacters.map((c) => ({
      name: c.name, isGuest: c.isGuest || false,
    }))
    const generatedTitle = buildStoryTitle({
      theme: selectedTheme.id as ThemeId, characters: promptCharacters,
    })
    const generatedStoryPrompt = buildStoryPrompt({
      theme: selectedTheme.id as ThemeId,
      characters: promptCharacters,
      customAngle: customPrompt || undefined,
    })
    const generatedImagePrompt = buildImagePrompt({
      theme: selectedTheme.id as ThemeId,
      characters: promptCharacters,
      storyTitle: generatedTitle,
    })
    setStoryTitle(generatedTitle)
    setStoryPrompt(generatedStoryPrompt.user)
    setImagePrompt(generatedImagePrompt)
    go("review")
  }

  const proceedManualToReview = () => {
    if (!manualTitle.trim() || !manualContent.trim()) {
      setError("Please fill in both title and story content"); return
    }
    setStoryTitle(manualTitle)
    setStoryPrompt(`Create a children's book cover for this story:\n\n"${manualTitle}"\n\n${manualContent.substring(0, 200)}...`)
    setImagePrompt(`Children's book cover illustration for "${manualTitle}". ${manualContent.substring(0, 100)}... Style: colorful, engaging, suitable for children`)
    go("review")
  }

  const proceedAIToReview = () => {
    if (!aiPrompt.trim()) { setError("Please describe your story idea"); return }
    const titleGuess = aiPrompt.split(/\s+/).slice(0, 6).join(" ")
    const storyPromptText = `Write a ${aiLength.toLowerCase()} children's story in the ${aiGenre.toLowerCase()} genre about: ${aiPrompt}. Include the characters: ${selectedCharacters.map((c) => c.name).join(", ")}. Make it magical and engaging for children ages 4-8.`
    const coverPrompt = `Children's book cover illustration: ${aiPrompt}. Characters: ${selectedCharacters.map((c) => c.name).join(", ")}. Style: vibrant, magical, ${aiGenre.toLowerCase()} theme, suitable for children`
    setStoryTitle(titleGuess)
    setStoryPrompt(storyPromptText)
    setImagePrompt(coverPrompt)
    go("review")
  }

  const generateStory = async () => {
    setIsGenerating(true); setError(""); go("generating")
    try {
      let finalStoryContent = ""
      let storyType: "theme" | "manual" | "ai" = "theme"

      if (selectedTheme) {
        storyType = "theme"
        setGenerationStage("Writing your story with GPT-4...")
        finalStoryContent = await generateAIStory(storyPrompt)
      } else if (manualContent) {
        storyType = "manual"
        finalStoryContent = manualContent
      } else {
        storyType = "ai"
        setGenerationStage("Writing your story with GPT-4...")
        finalStoryContent = await generateAIStory(storyPrompt)
      }

      setGenerationStage("Painting the cover with DALL-E 3...")
      const imageUrl = await generateAIBookCover(
        imagePrompt + (finalStoryContent ? `\n\nStory beginning: ${finalStoryContent.substring(0, 200)}...` : "")
      )

      const newStory = await addStory({
        title: storyTitle,
        content: finalStoryContent,
        image_url: imageUrl,
        theme_id: selectedTheme?.id,
        story_type: storyType,
        user_prompt: customPrompt || aiPrompt || undefined,
        image_prompt: imagePrompt,
        characters: selectedCharacters,
      })

      if (newStory) {
        setCurrentStory({
          id: newStory.id,
          title: newStory.title,
          content: newStory.content,
          imageUrl: newStory.image_url,
          themeId: newStory.theme_id as ThemeId,
          characters: (newStory.characters ?? []) as LocalCharacter[],
          createdAt: newStory.created_at,
          storyType: newStory.story_type,
          userPrompt: newStory.user_prompt ?? undefined,
          imagePrompt: newStory.image_prompt ?? undefined,
        })
        go("reading")
      }
    } catch (err) {
      console.error("Generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate story")
    } finally {
      setIsGenerating(false)
    }
  }

  const readStory = (story: LocalStory) => { setCurrentStory(story); go("reading") }

  const deleteStory = async (id: string) => {
    if (typeof window !== "undefined" && confirm("Delete this story permanently?")) {
      try { await dbDeleteStory(id) }
      catch (err) { setError("Failed to delete story"); console.error(err) }
    }
  }

  // ========== Family rename ==========
  const openFamilySettings = () => {
    setFamilyNameInput(family?.name ?? "")
    go("familySettings")
  }
  const saveFamilyName = async () => {
    setFamilySaveBusy(true); setError("")
    try { await renameFamily(familyNameInput); go("home") }
    catch (e: any) { setError(e?.message ?? "Failed to rename family") }
    finally { setFamilySaveBusy(false) }
  }

  // ========== Screens ==========
  if (screen === "home") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 flex flex-col items-center text-center pt-6">
          <TommyLogo />

          <div className="mb-16">
            <h1 className="text-6xl font-bold text-white mb-6 drop-shadow-2xl">Welcome to Tommy's World</h1>
            <p className="text-xl text-white/90 max-w-3xl leading-relaxed drop-shadow-lg">
              Create magical stories with AI-powered adventures, beautiful illustrations, and characters that come to life
            </p>
            {family && (
              <p className="text-white/60 text-sm mt-4">
                ✨ {family.name} — stories safely saved to the cloud ✨{" "}
                <button onClick={openFamilySettings} className="text-white/80 hover:text-white underline ml-1">
                  Rename
                </button>
              </p>
            )}
            <p className="text-white/60 text-xs mt-2">🤖 Powered by GPT-4 stories & DALL-E 3 images</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            <MagicalCard onClick={() => go("characters")} glowColor="rgba(255, 107, 107, 0.2)">
              <div className="flex flex-col items-center text-center py-4 px-4">
                <TommyIcon iconKey="myKids" alt="Add Your Family" />
                <h3 className="text-xl font-bold text-white mt-3 mb-2">Add Your Family</h3>
                <p className="text-base text-white/80 leading-snug">Create characters inspired by your loved ones</p>
                {localCharacters.length > 0 && (
                  <p className="text-white/60 text-sm mt-2">
                    {localCharacters.length} character{localCharacters.length !== 1 ? "s" : ""} added
                  </p>
                )}
              </div>
            </MagicalCard>

            <MagicalCard onClick={() => go("builder")} glowColor="rgba(168, 85, 247, 0.2)">
              <div className="flex flex-col items-center text-center py-4 px-4">
                <TommyIcon iconKey="tommyDream" alt="Create Stories" />
                <h3 className="text-xl font-bold text-white mt-3 mb-2">Create Stories</h3>
                <p className="text-base text-white/80 leading-snug">Choose themes and generate magical adventures</p>
              </div>
            </MagicalCard>

            <MagicalCard onClick={() => go("library")} glowColor="rgba(59, 130, 246, 0.2)">
              <div className="flex flex-col items-center text-center py-4 px-4">
                <TommyIcon iconKey="tommyRead" alt="Story Library" />
                <h3 className="text-xl font-bold text-white mt-3 mb-2">Story Library</h3>
                <p className="text-base text-white/80 leading-snug">Revisit your magical collection</p>
                {localStories.length > 0 && (
                  <p className="text-white/60 text-sm mt-2">
                    {localStories.length} stor{localStories.length !== 1 ? "ies" : "y"} saved
                  </p>
                )}
              </div>
            </MagicalCard>
          </div>

          <div className="flex gap-4 flex-wrap justify-center mt-8 mb-12">
            <button
              onClick={() => go("sharing")}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full hover:bg-white/20 transition-colors"
            >
              🔗 Sharing
            </button>
            <button
              onClick={() => go("community")}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full hover:bg-white/20 transition-colors"
            >
              🌍 Community
            </button>
            <Link
              href="/shared"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full hover:bg-white/20 transition-colors"
            >
              📚 Shared with me
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "sharing") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <SharingPanel onBack={() => go("home")} />
        </div>
      </div>
    )
  }

  if (screen === "community") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <CommunityFeed onBack={() => go("home")} />
        </div>
      </div>
    )
  }

  if (screen === "familySettings") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Family Settings</h1>
            <MagicalCard>
              <div className="p-8 space-y-4">
                <label className="block text-white font-semibold">Family name</label>
                <input
                  type="text" value={familyNameInput} onChange={(e) => setFamilyNameInput(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-white/50 focus:outline-none"
                  placeholder="The Smith Family"
                />
                {error && <div className="text-red-300 text-center bg-red-500/20 p-3 rounded-lg">{error}</div>}
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={() => go("home")} className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700">
                    Cancel
                  </button>
                  <button
                    onClick={saveFamilyName} disabled={familySaveBusy || !familyNameInput.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                  >
                    {familySaveBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </MagicalCard>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "characters") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Manage Characters</h1>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Add Family Member</h2>
                  <div className="space-y-4">
                    <input
                      type="text" placeholder="Character name"
                      value={newCharacterName} onChange={(e) => setNewCharacterName(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      onKeyDown={(e) => e.key === "Enter" && addCharacter()}
                    />
                    <button
                      onClick={addCharacter} disabled={!newCharacterName.trim()}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Character
                    </button>
                  </div>
                </div>
              </MagicalCard>

              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Add Guest</h2>
                  <div className="space-y-4">
                    <input
                      type="text" placeholder="Guest name"
                      value={newGuestName} onChange={(e) => setNewGuestName(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      onKeyDown={(e) => e.key === "Enter" && addGuest()}
                    />
                    <button
                      onClick={addGuest} disabled={!newGuestName.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Guest
                    </button>
                  </div>
                </div>
              </MagicalCard>
            </div>

            {localCharacters.length > 0 && (
              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Your Characters ({localCharacters.length})</h2>
                  <div className="grid gap-4">
                    {localCharacters.map((character) => (
                      <div key={character.id} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{character.name}</span>
                          {character.isGuest && (
                            <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">Guest</span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteCharacter(character.id)}
                          className="text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </MagicalCard>
            )}

            {error && (
              <MagicalCard className="mt-4">
                <div className="p-4">
                  <div className="text-red-300 text-center bg-red-500/20 p-3 rounded-lg">{error}</div>
                </div>
              </MagicalCard>
            )}

            <div className="text-center mt-8">
              <button
                onClick={() => go("home")}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "builder") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-12 text-center drop-shadow-2xl">
              How would you like to create your story?
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <MagicalCard onClick={startManualStory} glowColor="rgba(34, 197, 94, 0.2)">
                <div className="flex flex-col items-center text-center py-4 px-4">
                  <TommyIcon iconKey="tommyWrite" alt="Build Your Own Story" />
                  <h3 className="text-xl font-bold text-white mt-3 mb-2">Build Your Own Story</h3>
                  <p className="text-base text-white/80 leading-snug">Write a tale and we'll create the cover</p>
                </div>
              </MagicalCard>

              <MagicalCard onClick={startAIStory} glowColor="rgba(168, 85, 247, 0.2)">
                <div className="flex flex-col items-center text-center py-4 px-4">
                  <TommyIcon iconKey="tommyAi" alt="AI Generate a Story" />
                  <h3 className="text-xl font-bold text-white mt-3 mb-2">AI Generate a Story</h3>
                  <p className="text-base text-white/80 leading-snug">Describe an idea and let Tommy spin the tale</p>
                </div>
              </MagicalCard>

              <MagicalCard onClick={() => go("themeList")} glowColor="rgba(236, 72, 153, 0.2)">
                <div className="flex flex-col items-center text-center py-4 px-4">
                  <TommyIcon iconKey="tommyTheme" alt="Choose a Theme" />
                  <h3 className="text-xl font-bold text-white mt-3 mb-2">Choose a Theme</h3>
                  <p className="text-base text-white/80 leading-snug">Pick from six magical worlds</p>
                </div>
              </MagicalCard>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => go("home")}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "manualBuilder") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Write Your Story</h1>
            <MagicalCard>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-3">Story Title</label>
                  <input
                    type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Enter your story title..."
                    className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 text-lg focus:border-white/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-semibold mb-3">Your Story</label>
                  <textarea
                    value={manualContent} onChange={(e) => setManualContent(e.target.value)}
                    placeholder="Write your magical story here..." rows={12}
                    className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 text-lg leading-relaxed resize-none focus:border-white/50 focus:outline-none"
                  />
                  <p className="text-white/60 text-sm mt-2">Characters: {manualContent.length} / Recommended: 500+ characters</p>
                </div>
                {error && <div className="text-red-300 text-center bg-red-500/20 p-3 rounded-lg">{error}</div>}
                <div className="flex gap-4 justify-center">
                  <button onClick={() => go("builder")} className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Back</button>
                  <button
                    onClick={proceedManualToReview}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!manualTitle.trim() || !manualContent.trim()}
                  >
                    Create Cover
                  </button>
                </div>
              </div>
            </MagicalCard>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "aiBuilder") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Describe Your Story</h1>
            <MagicalCard>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-3">What's your story about?</label>
                  <textarea
                    value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe your story idea..." rows={4}
                    className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 text-lg leading-relaxed resize-none focus:border-white/50 focus:outline-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-3">Genre</label>
                    <select
                      value={aiGenre} onChange={(e) => setAiGenre(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/50 focus:outline-none"
                    >
                      <option value="Adventure" className="text-black">Adventure</option>
                      <option value="Fantasy" className="text-black">Fantasy</option>
                      <option value="Friendship" className="text-black">Friendship</option>
                      <option value="Mystery" className="text-black">Mystery</option>
                      <option value="Comedy" className="text-black">Comedy</option>
                      <option value="Educational" className="text-black">Educational</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-3">Story Length</label>
                    <select
                      value={aiLength} onChange={(e) => setAiLength(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/50 focus:outline-none"
                    >
                      <option value="Short" className="text-black">Short (3-5 paragraphs)</option>
                      <option value="Medium" className="text-black">Medium (6-8 paragraphs)</option>
                      <option value="Long" className="text-black">Long (9-12 paragraphs)</option>
                    </select>
                  </div>
                </div>

                {localCharacters.length > 0 && (
                  <div>
                    <label className="block text-white font-semibold mb-3">Include Characters (Optional)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {localCharacters.map((character) => (
                        <label key={character.id} className="flex items-center gap-2 p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCharacters.some((c) => c.id === character.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCharacters((prev) => [...prev, character])
                              else setSelectedCharacters((prev) => prev.filter((c) => c.id !== character.id))
                            }}
                            className="rounded"
                          />
                          <span className="text-white text-sm">
                            {character.name}
                            {character.isGuest && <span className="ml-1 text-blue-300">(Guest)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {error && <div className="text-red-300 text-center bg-red-500/20 p-3 rounded-lg">{error}</div>}

                <div className="flex gap-4 justify-center">
                  <button onClick={() => go("builder")} className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Back</button>
                  <button
                    onClick={proceedAIToReview}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!aiPrompt.trim()}
                  >
                    Generate Story
                  </button>
                </div>
              </div>
            </MagicalCard>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "themeList") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-white mb-12 text-center drop-shadow-2xl">Choose Your Adventure</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {themes.map((theme) => (
              <MagicalCard
                key={theme.id} onClick={() => startThemeStory(theme)}
                glowColor={`${theme.colors.primary}40`}
                className="overflow-hidden hover:scale-105"
              >
                <div className="aspect-video relative">
                  <img src={theme.image} alt={theme.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white mb-2">{theme.name}</h3>
                    <p className="text-white/90 text-sm">{theme.description}</p>
                  </div>
                </div>
              </MagicalCard>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => go("builder")} className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Back</button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "prepare") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {selectedTheme && (
              <div className="flex justify-center mb-8">
                <img src={selectedTheme.image} alt={selectedTheme.name} className="w-full max-w-[400px] h-auto rounded-2xl drop-shadow-2xl" />
              </div>
            )}
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Prepare Your {selectedTheme?.name}</h1>
            <MagicalCard>
              <div className="p-8 space-y-6">
                {localCharacters.length > 0 ? (
                  <div>
                    <label className="block text-white font-semibold mb-4">Choose Characters for Your Story</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {localCharacters.map((character) => (
                        <label key={character.id} className="flex items-center gap-2 p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCharacters.some((c) => c.id === character.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCharacters((prev) => [...prev, character])
                              else setSelectedCharacters((prev) => prev.filter((c) => c.id !== character.id))
                            }}
                            className="rounded"
                          />
                          <span className="text-white text-sm">
                            {character.name}
                            {character.isGuest && <span className="ml-1 text-blue-300">(Guest)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/80 mb-4">No characters added yet!</p>
                    <button onClick={() => go("characters")} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Add Characters First</button>
                  </div>
                )}

                <div>
                  <label className="block text-white font-semibold mb-3">What should this story be about? (Optional)</label>
                  <textarea
                    value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add your own ideas for the story..." rows={3}
                    className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-white/50 focus:outline-none"
                  />
                </div>

                <div className="flex gap-4 justify-center">
                  <button onClick={() => go("themeList")} className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Back</button>
                  <button
                    onClick={proceedToReview}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </MagicalCard>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "review") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Review & Edit Prompts</h1>
            <p className="text-center text-white/60 mb-8">✨ Stories powered by GPT-4 • Images created with DALL-E 3 ✨</p>
            <div className="space-y-6">
              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-3">Story Title</h2>
                  <input
                    type="text" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-white/50 focus:outline-none"
                  />
                </div>
              </MagicalCard>
              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-3">Story Prompt (GPT-4)</h2>
                  <textarea
                    value={storyPrompt} onChange={(e) => setStoryPrompt(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 resize-none focus:border-white/50 focus:outline-none"
                  />
                </div>
              </MagicalCard>
              <MagicalCard>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-3">Image Prompt (DALL-E 3)</h2>
                  <textarea
                    value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 resize-none focus:border-white/50 focus:outline-none"
                  />
                </div>
              </MagicalCard>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => go(selectedTheme ? "prepare" : "builder")}
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={generateStory}
                  disabled={!storyTitle.trim() || !storyPrompt.trim() || !imagePrompt.trim() || isGenerating}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "Generating..." : "Generate Story"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "generating") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-md mx-auto">
            <MagicalCard>
              <div className="p-12 text-center">
                <div className="animate-spin w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">{generationStage}</h2>
                <p className="text-white/80">Tommy is working his magic...</p>
                <div className="mt-4 w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"
                    style={{ width: generationStage.includes("Writing") ? "50%" : "90%" }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-4">
                  {generationStage.includes("GPT-4") && "🤖 Using GPT-4 for premium story quality"}
                  {generationStage.includes("DALL-E") && "🎨 Using DALL-E 3 for stunning artwork"}
                </p>
              </div>
            </MagicalCard>
            {error && (
              <MagicalCard className="mt-6">
                <div className="p-6 text-center">
                  <div className="text-red-300 mb-4">{error}</div>
                  <button onClick={() => go("review")} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">Try Again</button>
                </div>
              </MagicalCard>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (screen === "reading" && currentStory) {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-4xl mx-auto">
            <MagicalCard>
              <div className="p-8">
                <div className="text-center mb-8">
                  <img src={currentStory.imageUrl} alt={currentStory.title} className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-6" />
                  <h1 className="text-3xl font-bold text-white mb-4">{currentStory.title}</h1>
                  <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
                    {currentStory.storyType === "manual" && "✍️ Written by You"}
                    {currentStory.storyType === "ai" && "🤖 AI Generated"}
                    {currentStory.storyType === "theme" && "🎨 Theme Story"}
                    {currentStory.characters.length > 0 && (
                      <span>• Featuring {currentStory.characters.map((c) => c.name).join(", ")}</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-2">Generated with GPT-4 & DALL-E 3</p>
                </div>
                <div className="prose prose-invert prose-lg max-w-none">
                  {currentStory.content.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="text-white/90 leading-relaxed mb-4 text-lg">{paragraph}</p>
                  ))}
                </div>
                <div className="flex gap-4 justify-center mt-8 flex-wrap">
                  <button onClick={() => go("home")} className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Home</button>
                  <button onClick={() => go("library")} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Library</button>
                  <button
                    onClick={() => go("builder")}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            </MagicalCard>
          </div>
        </div>
      </div>
    )
  }

  if (screen === "library") {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <UserBar />
        <div className="relative z-10 container mx-auto px-6 py-12">
          {showTommyHeader && <TommyHeaderLogo />}
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-12 text-center drop-shadow-2xl">Your Story Library</h1>

            {localStories.length === 0 ? (
              <MagicalCard>
                <div className="p-12 text-center">
                  <TommyIcon iconKey="tommyRead" alt="Empty library" className="mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-4">No stories yet!</h2>
                  <p className="text-white/80 mb-6">Create your first magical adventure</p>
                  <button
                    onClick={() => go("builder")}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Create Your First Story
                  </button>
                </div>
              </MagicalCard>
            ) : (
              <>
                <div className="text-center mb-8">
                  <p className="text-white/80">
                    {localStories.length} stor{localStories.length !== 1 ? "ies" : "y"} saved permanently to your cloud library
                  </p>
                  <p className="text-white/60 text-xs mt-2">All powered by GPT-4 & DALL-E 3</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localStories.map((story) => (
                    <MagicalCard key={story.id} className="overflow-hidden hover:scale-[1.02]">
                      <div className="aspect-[3/4] relative">
                        <img src={story.imageUrl} alt={story.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-white/60">
                              {story.storyType === "manual" ? "✍️ Written" :
                                story.storyType === "ai" ? "🤖 AI Generated" :
                                "🎨 Theme Story"}
                            </span>
                            <span className="text-xs text-white/40">{new Date(story.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{story.title}</h3>
                          {story.characters.length > 0 && (
                            <p className="text-white/60 text-xs mb-3">
                              Featuring: {story.characters.slice(0, 2).map((c) => c.name).join(", ")}
                              {story.characters.length > 2 && ` +${story.characters.length - 2} more`}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => readStory(story)}
                              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                              Read
                            </button>
                            <button
                              onClick={() => deleteStory(story.id)}
                              className="bg-red-600 text-white py-2 px-3 rounded text-sm font-semibold hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </MagicalCard>
                  ))}
                </div>
              </>
            )}

            <div className="text-center mt-8">
              <button onClick={() => go("home")} className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors">Back to Home</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
