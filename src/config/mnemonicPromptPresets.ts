import type {
  VisualStyle,
  Composition,
  ColorPalette,
  MnemonicTechnique,
  MnemonicPromptSpec,
} from "@/types/mnemonicPrompt";

/**
 * Visual style presets with detailed rendering instructions
 */
export const visualStylePresets: Record<
  VisualStyle,
  {
    style: string;
    material?: string;
    lighting?: string;
    rendering?: string;
  }
> = {
  voxel3d: {
    style: "voxel 3D art, chunky pixel blocks, low-poly geometric shapes",
    material: "hard plastic with smooth surfaces, subtle gridlines, semi-matte finish",
    lighting: "studio lightbox setup, medium intensity, sharp short shadows, mild reflections",
    rendering: "3D voxel renderer, high resolution, simplified structure",
  },
  "flat-illustration": {
    style: "flat vector illustration, clean geometric shapes, no gradients",
    material: "flat colors, no texture",
    lighting: "even lighting, minimal shadows",
    rendering: "vector graphics, crisp edges, 2D composition",
  },
  "hand-drawn": {
    style: "hand-drawn sketch, pencil and watercolor style",
    material: "paper texture, organic lines",
    lighting: "natural soft lighting",
    rendering: "artistic sketch, visible brush strokes",
  },
  "pixel-art": {
    style: "8-bit pixel art, retro gaming aesthetic",
    material: "pixel blocks, limited color palette",
    lighting: "flat lighting, no gradients",
    rendering: "pixel-perfect, sharp edges, no anti-aliasing",
  },
  watercolor: {
    style: "watercolor painting, soft edges, color bleeding",
    material: "watercolor on paper, translucent layers",
    lighting: "soft natural light, subtle shadows",
    rendering: "artistic watercolor technique, organic flow",
  },
  minimalist: {
    style: "minimalist design, essential elements only",
    material: "flat solid colors, clean surfaces",
    lighting: "uniform lighting, no shadows",
    rendering: "simple shapes, maximum clarity",
  },
  "comic-style": {
    style: "comic book illustration, bold outlines, action lines",
    material: "cel-shaded colors, halftone patterns",
    lighting: "dramatic lighting, strong contrasts",
    rendering: "comic art style, speech bubbles optional",
  },
};

/**
 * Composition presets for memory optimization
 */
export const compositionPresets: Record<Composition, string> = {
  "single-centered": "single main object centered on plain light gray background, clear focus",
  "story-scene": "two to three objects interacting, simple background context, narrative flow",
  "split-comparison":
    "split screen showing word association, left side for sound, right for meaning",
  flashcard: "flashcard layout, word at top, visual representation below, clean borders",
  isometric: "isometric 3D view, 45-degree angle, depth perception aids memory",
  "rule-of-thirds":
    "balanced composition using rule of thirds, key elements at intersection points",
};

/**
 * Color palette presets based on learning psychology
 */
export const palettePresets: Record<
  ColorPalette,
  {
    description: string;
    colors: string[];
    psychology: string;
  }
> = {
  "high-contrast": {
    description: "bold complementary colors for maximum recall",
    colors: ["#FFCC00", "#FF3C3C", "#000000", "#FFFFFF", "#00CFFF"],
    psychology: "high contrast improves retention and attention",
  },
  pastel: {
    description: "soft desaturated palette for calming effect",
    colors: ["#FFE5CC", "#E5CCFF", "#CCFFE5", "#FFFFFF", "#F0F0F0"],
    psychology: "reduces cognitive load, suitable for complex concepts",
  },
  monochrome: {
    description: "single color with tonal variations",
    colors: ["#000000", "#404040", "#808080", "#C0C0C0", "#FFFFFF"],
    psychology: "focuses attention on form and concept rather than color",
  },
  warm: {
    description: "warm colors for emotional engagement",
    colors: ["#FF6B6B", "#FFA500", "#FFD700", "#FF69B4", "#FFF5E6"],
    psychology: "creates positive associations, enhances mood",
  },
  cool: {
    description: "cool colors for calm focus",
    colors: ["#4A90E2", "#50E3C2", "#7B68EE", "#00CED1", "#E6F7FF"],
    psychology: "promotes concentration and reduces anxiety",
  },
  vibrant: {
    description: "saturated colors for energy and memorability",
    colors: ["#FF0080", "#00FF00", "#0080FF", "#FFFF00", "#FF00FF"],
    psychology: "high saturation increases arousal and attention",
  },
  soft: {
    description: "muted tones and watercolor washes",
    colors: ["#E8D5C4", "#C3D9E1", "#D4C5E8", "#E1D3C3", "#F5F0E8"],
    psychology: "gentle colors reduce stress and promote relaxation",
  },
  playful: {
    description: "candy colors and bright pastels",
    colors: ["#FF6EC7", "#FFD93D", "#6EC4FF", "#95FF6E", "#FFA06E"],
    psychology: "fun colors increase engagement and positive emotions",
  },
};

/**
 * Mnemonic technique presets
 */
export const techniquePresets: Record<
  MnemonicTechnique,
  {
    description: string;
    instruction: string;
  }
> = {
  "visual-association": {
    description: "direct visual link between sound and meaning",
    instruction: "create clear visual association connecting the word's sound to its meaning",
  },
  "story-telling": {
    description: "narrative scene incorporating the word",
    instruction: "tell a mini-story that naturally includes both the word sound and meaning",
  },
  "keyword-method": {
    description: "English keyword that sounds like the Indonesian word",
    instruction: "visualize an English word that sounds similar, interacting with the meaning",
  },
  "phonetic-similarity": {
    description: "objects that sound like word syllables",
    instruction: "break word into syllables, represent each with a similar-sounding object",
  },
  "conceptual-link": {
    description: "conceptual bridge between cultures",
    instruction: "show cultural or conceptual connection between Indonesian and English contexts",
  },
  "spatial-memory": {
    description: "location-based memory using familiar spaces",
    instruction:
      "place the word and its meaning in a 3D environment with clear spatial relationships",
  },
};

/**
 * Default configuration for optimal learning
 */
export const defaultMnemonicSpec: MnemonicPromptSpec = {
  style: "flat-illustration",
  composition: "single-centered",
  palette: "high-contrast",
  technique: "visual-association",
  emphasis: "both",
  complexity: "simple",
};

/**
 * Preset combinations for different learning scenarios
 */
export const scenarioPresets: Record<string, MnemonicPromptSpec> = {
  beginner: {
    style: "flat-illustration",
    composition: "single-centered",
    palette: "high-contrast",
    technique: "visual-association",
    emphasis: "meaning",
    complexity: "simple",
  },
  intermediate: {
    style: "comic-style",
    composition: "story-scene",
    palette: "vibrant",
    technique: "story-telling",
    emphasis: "both",
    complexity: "moderate",
  },
  advanced: {
    style: "watercolor",
    composition: "split-comparison",
    palette: "cool",
    technique: "conceptual-link",
    emphasis: "word-sound",
    complexity: "detailed",
  },
  kids: {
    style: "pixel-art",
    composition: "single-centered",
    palette: "vibrant",
    technique: "visual-association",
    emphasis: "meaning",
    complexity: "simple",
  },
  quickReview: {
    style: "minimalist",
    composition: "flashcard",
    palette: "monochrome",
    technique: "keyword-method",
    emphasis: "both",
    complexity: "simple",
  },
};

/**
 * Named preset configurations for easy access
 */
export const MNEMONIC_PRESETS = {
  voxel: {
    style: "voxel3d" as const,
    composition: "single-centered" as const,
    palette: "vibrant" as const,
    technique: "visual-association" as const,
    emphasis: "meaning" as const,
    complexity: "moderate" as const,
  },
  cartoon: {
    style: "comic-style" as const,
    composition: "story-scene" as const,
    palette: "playful" as const,
    technique: "story-telling" as const,
    emphasis: "both" as const,
    complexity: "simple" as const,
  },
  watercolor: {
    style: "watercolor" as const,
    composition: "split-comparison" as const,
    palette: "soft" as const,
    technique: "conceptual-link" as const,
    emphasis: "meaning" as const,
    complexity: "detailed" as const,
  },
  isometric: {
    style: "voxel3d" as const,
    composition: "isometric" as const,
    palette: "cool" as const,
    technique: "spatial-memory" as const,
    emphasis: "both" as const,
    complexity: "moderate" as const,
  },
  minimalist: {
    style: "minimalist" as const,
    composition: "flashcard" as const,
    palette: "monochrome" as const,
    technique: "keyword-method" as const,
    emphasis: "word-sound" as const,
    complexity: "simple" as const,
  },
} as const;
