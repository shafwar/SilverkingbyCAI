/**
 * Translation provider – no external API (manual bilingual only).
 * Admin fills both ID and EN in the CMS. No API key required.
 * To add AI translation later, implement this module with a real provider.
 */

import type { DetectedLanguage } from "./types";

const TRANSLATION_UNAVAILABLE_MSG =
  "Translation is disabled. Please fill both languages manually in the form.";

export function isTranslationAvailable(): boolean {
  return false;
}

export async function detectLanguageOpenAI(_text: string): Promise<DetectedLanguage> {
  return "unknown";
}

export async function translateIdToEn(_indonesianText: string): Promise<string> {
  throw new Error(TRANSLATION_UNAVAILABLE_MSG);
}

export async function translateEnToId(_englishText: string): Promise<string> {
  throw new Error(TRANSLATION_UNAVAILABLE_MSG);
}
