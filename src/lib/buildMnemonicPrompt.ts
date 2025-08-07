import type { MnemonicPromptSpec, MnemonicPromptOverrides } from "@/types/mnemonicPrompt";
import {
  visualStylePresets,
  compositionPresets,
  palettePresets,
  techniquePresets,
  defaultMnemonicSpec,
  scenarioPresets,
} from "@/config/mnemonicPromptPresets";

/**
 * Builds a structured prompt for mnemonic image generation
 *
 * @param word - The Indonesian word to learn
 * @param translations - English translations
 * @param memoryTip - Optional memory tip to incorporate
 * @param overrides - Optional spec overrides
 * @returns Structured prompt string for image generation
 */
const buildMnemonicPrompt = (
  word: string,
  translations: string[],
  memoryTip?: string,
  overrides?: MnemonicPromptOverrides
): string => {
  // Merge with defaults
  const spec: MnemonicPromptSpec = {
    ...defaultMnemonicSpec,
    ...overrides,
  };

  // Get preset details
  const stylePreset = visualStylePresets[spec.style];
  const compositionPreset = compositionPresets[spec.composition];
  const palettePreset = palettePresets[spec.palette];
  const techniquePreset = techniquePresets[spec.technique];

  // Build the structured prompt object
  const structuredPrompt = {
    objective: "Create a memorable visual mnemonic for language learning",
    word: {
      text: word,
      language: "Indonesian",
      translations: translations,
      memoryTip: memoryTip || undefined,
    },
    style: {
      visual: stylePreset.style,
      material: stylePreset.material,
      lighting: stylePreset.lighting,
      rendering: stylePreset.rendering,
    },
    composition: {
      layout: compositionPreset,
      focus: spec.emphasis || "both",
      complexity: spec.complexity || "simple",
    },
    colors: {
      palette: palettePreset.description,
      specific: palettePreset.colors,
      rationale: palettePreset.psychology,
    },
    technique: {
      method: techniquePreset.description,
      instruction: techniquePreset.instruction,
    },
    requirements: [
      "Image must be square (1024x1024)",
      "Clear visual connection between word and meaning",
      "Culturally appropriate imagery",
      "No text or letters in the image",
      "Single cohesive scene",
      "Memorable and distinctive",
    ],
    culturalContext: spec.culturalNotes || "Consider Indonesian cultural context where appropriate",
  };

  // Convert to formatted JSON block with instructions
  const jsonBlock = JSON.stringify(structuredPrompt, null, 2);

  // Build the final prompt
  const finalPrompt = `/* MNEMONIC IMAGE SPECIFICATION */
${jsonBlock}
/* END SPECIFICATION */

Generate a single square image based on the specification above. The image should help someone remember that "${word}" means "${translations.join(", ")}" in English.${memoryTip ? ` Incorporate this memory tip: "${memoryTip}"` : ""}

Key focus: Create a memorable visual that connects the SOUND of "${word}" with its MEANING (${translations.join(", ")}) using the ${spec.technique} technique.

Style: ${spec.style} with ${spec.palette} colors.`;

  return finalPrompt;
};

/**
 * Simplified builder for quick generation with scenario presets
 */
export const buildQuickMnemonicPrompt = (
  word: string,
  translations: string[],
  scenario: "beginner" | "intermediate" | "advanced" | "kids" | "quickReview" = "beginner",
  memoryTip?: string
): string => {
  const spec = scenarioPresets[scenario];
  return buildMnemonicPrompt(word, translations, memoryTip, spec);
};
