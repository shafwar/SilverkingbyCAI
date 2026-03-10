/**
 * Enterprise CMS – Translation Service Layer.
 * Bi-directional auto translation (ID ↔ EN) with corporate tone.
 */

export {
  detectLanguage,
  translateToOtherLanguage,
  generateBilingual,
  regenerateTranslation,
  isTranslationAvailable,
} from "./service";
export type {
  BilingualText,
  BilingualContent,
  TranslationMeta,
  DetectedLanguage,
  TranslationResult,
} from "./types";
