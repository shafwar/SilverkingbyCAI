/**
 * Translation Service Layer – Enterprise CMS.
 * No external AI/API: admin fills both ID and EN manually.
 * detectLanguage uses heuristic only. translate/generate leave secondary empty when no provider.
 */

import { detectLanguageHeuristic } from "./detect";
import {
  translateIdToEn,
  translateEnToId,
  isTranslationAvailable,
} from "./translate-openai";
import type { BilingualText, DetectedLanguage, TranslationMeta } from "./types";

const LOG_PREFIX = "[TranslationService]";

function log(message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development" || process.env.LOG_TRANSLATION === "1") {
    console.log(LOG_PREFIX, message, meta ?? "");
  }
}

/**
 * Detect language: heuristic only (no external API).
 */
export async function detectLanguage(_text: string): Promise<DetectedLanguage> {
  const heuristic = detectLanguageHeuristic(_text);
  log("detect (heuristic)", { result: heuristic });
  return heuristic;
}

/**
 * Translate one text to the other language (ID↔EN).
 * No provider configured: throws. Admin should fill both languages manually.
 */
export async function translateToOtherLanguage(
  text: string,
  fromLang: "id" | "en"
): Promise<string> {
  if (!text?.trim()) return "";
  if (!isTranslationAvailable()) {
    throw new Error(
      "Translation is disabled. Please fill both languages manually in the form."
    );
  }
  const result =
    fromLang === "id"
      ? await translateIdToEn(text)
      : await translateEnToId(text);
  log("translate", { from: fromLang, length: text.length });
  return result.trim();
}

/**
 * Fill missing bilingual fields from one input.
 * - If input looks ID: set title.id/description.id, generate EN.
 * - If input looks EN: set title.en/description.en, generate ID.
 * - If unknown: treat as primary (e.g. ID), generate EN.
 * Returns new BilingualText and flags for which side was auto-translated.
 */
export async function generateBilingual(
  titleInput: string,
  descriptionInput: string | null | undefined
): Promise<{
  title: BilingualText;
  description: BilingualText | null;
  translationMeta: TranslationMeta;
}> {
  const title = (titleInput || "").trim();
  const desc = (descriptionInput || "").trim() || null;
  const detected = await detectLanguage(title);

  const primaryLang: "id" | "en" =
    detected === "id" ? "id" : detected === "en" ? "en" : "id";
  const secondaryLang: "id" | "en" = primaryLang === "id" ? "en" : "id";

  const titlePrimary = title || "";
  const descPrimary = desc || null;

  let titleSecondary = "";
  let descriptionSecondary: string | null = null;

  if (titlePrimary && isTranslationAvailable()) {
    try {
      titleSecondary = await translateToOtherLanguage(titlePrimary, primaryLang);
    } catch {
      titleSecondary = "";
    }
  }
  if (descPrimary && isTranslationAvailable()) {
    try {
      descriptionSecondary = await translateToOtherLanguage(
        descPrimary,
        primaryLang
      );
    } catch {
      descriptionSecondary = null;
    }
  }

  const titleBilingual: BilingualText = {
    id: primaryLang === "id" ? titlePrimary : titleSecondary,
    en: primaryLang === "en" ? titlePrimary : titleSecondary,
  };
  const descriptionBilingual: BilingualText | null =
    descPrimary || descriptionSecondary
      ? {
          id:
            primaryLang === "id"
              ? descPrimary ?? ""
              : descriptionSecondary ?? "",
          en:
            primaryLang === "en"
              ? descPrimary ?? ""
              : descriptionSecondary ?? "",
        }
      : null;

  const translationMeta: TranslationMeta = {
    titleIdAuto: primaryLang === "en",
    titleEnAuto: primaryLang === "id",
    descriptionIdAuto: !!descPrimary && primaryLang === "en",
    descriptionEnAuto: !!descPrimary && primaryLang === "id",
  };

  return {
    title: titleBilingual,
    description: descriptionBilingual,
    translationMeta,
  };
}

/**
 * Regenerate the other language for a single field.
 * Used by "Regenerate Translation" when we don't want to overwrite manual edits.
 */
export async function regenerateTranslation(
  text: string,
  fromLang: "id" | "en"
): Promise<string> {
  return translateToOtherLanguage(text, fromLang);
}

export { isTranslationAvailable };
