export type ThemeId = "dinosaur" | "space" | "jungle" | "pirate" | "ocean" | "monster-trucks"

export interface PromptCharacter {
  name: string
  isGuest: boolean
}

interface BuildImagePromptParams {
  theme: ThemeId
  characters: PromptCharacter[]
  storyTitle: string
}

export function buildImagePrompt({ theme, characters, storyTitle }: BuildImagePromptParams): string {
  const themeDescriptions = {
    dinosaur: "prehistoric world with massive dinosaurs, ancient landscapes, volcanic backgrounds",
    space: "cosmic adventure with planets, spaceships, alien worlds, starfields, nebulae",
    jungle: "lush rainforest with exotic animals, hanging vines, mysterious temples, waterfalls",
    pirate: "pirate ship adventure with treasure maps, ocean waves, tropical islands, flags",
    ocean: "underwater world with colorful coral reefs, sea creatures, submarines, treasure",
    "monster-trucks": "high-energy rally with giant trucks, dirt tracks, ramps, excitement"
  }

  const characterNames = characters.length > 0 
    ? `Featuring characters: ${characters.map(c => c.name).join(", ")}.`
    : "Child-friendly characters."

  return `Children's book cover illustration for "${storyTitle}". ${characterNames} Setting: ${themeDescriptions[theme]}. Style: vibrant, colorful, whimsical, suitable for ages 4-8, professional children's book illustration style.`
}
