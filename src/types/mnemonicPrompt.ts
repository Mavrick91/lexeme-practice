/**
 * Visual style options for mnemonic images
 */
export type VisualStyle =
  | "voxel3d"
  | "flat-illustration"
  | "hand-drawn"
  | "pixel-art"
  | "watercolor"
  | "minimalist"
  | "comic-style";

/**
 * Composition layout options
 */
export type Composition =
  | "single-centered"
  | "story-scene"
  | "split-comparison"
  | "flashcard"
  | "isometric"
  | "rule-of-thirds";

/**
 * Color palette options optimized for learning
 */
export type ColorPalette =
  | "high-contrast"
  | "pastel"
  | "monochrome"
  | "warm"
  | "cool"
  | "vibrant"
  | "soft"
  | "playful";

/**
 * Mnemonic technique types
 */
export type MnemonicTechnique =
  | "visual-association"
  | "story-telling"
  | "keyword-method"
  | "phonetic-similarity"
  | "conceptual-link"
  | "spatial-memory";

/**
 * Complete specification for generating a mnemonic image
 */
export type MnemonicPromptSpec = {
  style: VisualStyle;
  composition: Composition;
  palette: ColorPalette;
  technique: MnemonicTechnique;
  culturalNotes?: string;
  emphasis?: "word-sound" | "meaning" | "both";
  complexity?: "simple" | "moderate" | "detailed";
};

/**
 * Partial spec for optional overrides
 */
export type MnemonicPromptOverrides = Partial<MnemonicPromptSpec>;
