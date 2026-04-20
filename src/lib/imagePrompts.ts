// src/lib/imagePrompts.ts
// Builds rich, art-directed prompts for DALL-E 3.
//
// DALL-E 3 NOTE: OpenAI silently rewrites prompts before generation. That's often what turns
// a carefully-crafted prompt into generic clip art. The documented workaround is to prefix with:
//   "I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail,
//    just use it AS-IS:"
// This dramatically reduces (though doesn't eliminate) DALL-E 3's prompt revision.

export type ThemeId =
  | "space"
  | "jungle"
  | "ocean"
  | "dinosaur"
  | "pirate"
  | "monster-trucks"

export type PromptCharacter = {
  name: string
  age?: number | string
  personality?: string
  isGuest?: boolean
}

// Shared style spine — every cover looks like it belongs to the same book series.
const STYLE_SPINE = [
  "Children's picture book cover illustration",
  "warm Pixar-meets-watercolor style",
  "soft painterly brush textures, gentle gradients, rich saturated colors",
  "friendly rounded character design with expressive eyes",
  "cinematic lighting with soft rim light and warm golden highlights",
  "clear focal hero composition, rule of thirds",
  "portrait orientation, suitable for a book cover",
  "NO text, NO letters, NO logos, NO watermarks on the image",
].join(", ")

// Per-theme art direction — each scene is specific, not generic.
const THEME_SCENES: Record<ThemeId, { subject: string; setting: string; palette: string; props: string }> = {
  space: {
    subject: "a young adventurer in a cozy orange spacesuit with a bubble helmet, floating joyfully",
    setting: "inside a candy-colored nebula with swirling purple and pink cosmic clouds, distant ringed planets, and scattered golden stars",
    palette: "deep violets, magenta, teal, with warm orange accents on the suit",
    props: "a small friendly alien creature companion, a glowing star held in one hand, tiny silver rockets drifting past",
  },
  jungle: {
    subject: "a young explorer in khaki shorts and a wide-brim hat, peeking through giant leaves with a grin",
    setting: "a lush rainforest with shafts of sunlight, hanging vines, enormous ferns, and a distant waterfall",
    palette: "emerald greens, mossy olives, warm amber sunlight, touches of hibiscus pink and parrot red",
    props: "a curious toucan on a branch, a playful monkey swinging on a vine, glowing fireflies",
  },
  ocean: {
    subject: "a young hero with snorkel goggles pushed up on their forehead, smiling underwater",
    setting: "a sunlit coral reef with rays of light piercing the turquoise water, soft sand below, coral in pastel shapes",
    palette: "aqua, teal, coral pink, sandy gold, pearl white bubbles",
    props: "a friendly dolphin beside them, a sea turtle gliding past, tiny clownfish schooling around",
  },
  dinosaur: {
    subject: "a young adventurer riding bareback on the neck of a gentle long-necked dinosaur",
    setting: "a prehistoric valley at golden hour with distant volcanoes puffing pink smoke, giant ferns, and a shallow river",
    palette: "sunset oranges, warm sage greens, dusty rose, deep teal shadows",
    props: "a small hatchling triceratops trotting alongside, a pterodactyl silhouette in the sky, ancient cycad trees",
  },
  pirate: {
    subject: "a young pirate captain in a tricorn hat and red coat, standing boldly at the ship's wheel",
    setting: "the deck of a wooden pirate ship on a crystal-blue sea, tropical island on the horizon, puffy white clouds",
    palette: "ocean blue, sun-bleached wood, ruby red coat, brass gold accents",
    props: "a colorful parrot on the shoulder, a rolled treasure map tucked under the arm, a small wooden treasure chest on deck",
  },
  "monster-trucks": {
    subject: "a young driver in a racing helmet grinning from the cab of a giant cartoon monster truck mid-jump",
    setting: "a sunny off-road arena with dirt ramps, checkered flags in the distance, cheering stadium crowd blurred in background",
    palette: "fire-engine red, chrome silver, racing yellow, sky blue, rich mud brown",
    props: "oversized knobby tires kicking up a dust cloud, flame decals on the truck, a second smaller truck racing behind",
  },
}

function describeCharacters(chars: PromptCharacter[]): string {
  if (!chars.length) return "Tommy, a cheerful child with curly brown hair"

  const parts = chars.map((c) => {
    const bits: string[] = []
    bits.push(c.name)
    if (c.age) bits.push(`age ${c.age}`)
    if (c.personality) bits.push(c.personality.toLowerCase())
    return bits.join(", ")
  })

  const hasTommy = chars.some((c) => c.name.toLowerCase() === "tommy")
  return hasTommy
    ? parts.join(" and ")
    : `Tommy (the series mascot, a curly-haired child) together with ${parts.join(" and ")}`
}

export function buildImagePrompt(opts: {
  theme: ThemeId
  characters: PromptCharacter[]
  storyTitle?: string
  storyExcerpt?: string
}): string {
  const scene = THEME_SCENES[opts.theme]
  const cast = describeCharacters(opts.characters)

  const grounding = opts.storyExcerpt
    ? `Scene inspired by this story opening: "${opts.storyExcerpt.slice(0, 240)}"`
    : ""

  const body = [
    `Subject: ${cast} as ${scene.subject}.`,
    `Setting: ${scene.setting}.`,
    `Props and companions: ${scene.props}.`,
    `Color palette: ${scene.palette}.`,
    `Style: ${STYLE_SPINE}.`,
    grounding,
    `Mood: wonder, warmth, gentle adventure, safe for young children.`,
    `Composition: characters as clear hero focal point, centered in upper two-thirds, breathing room at the bottom for a title.`,
    `Absolutely no text, captions, titles, or written words anywhere in the image.`,
  ]
    .filter(Boolean)
    .join(" ")

  // DALL-E 3 prompt-rewrite suppression prefix.
  // Total prompt must stay under 4000 chars (DALL-E 3 hard limit).
  const prefix =
    "I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: "

  const full = prefix + body
  return full.length > 3900 ? full.slice(0, 3900) : full
}
