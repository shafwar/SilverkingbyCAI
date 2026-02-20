/**
 * Enterprise CMS – Translation layer types.
 * Bilingual content uses { id, en }; extensible for more locales later.
 */

export type BilingualText = {
  id: string;
  en: string;
};

/** Which fields were auto-translated (vs manually edited). Regenerate only overwrites auto fields. */
export type TranslationMeta = {
  titleIdAuto?: boolean;
  titleEnAuto?: boolean;
  descriptionIdAuto?: boolean;
  descriptionEnAuto?: boolean;
};

export type DetectedLanguage = "id" | "en" | "unknown";

export type TranslationResult = {
  text: string;
  detectedLanguage: DetectedLanguage;
};

export type BilingualContent = {
  title: BilingualText;
  description?: BilingualText | null;
  translationMeta?: TranslationMeta | null;
};
