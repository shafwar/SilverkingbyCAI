/**
 * Language detection for translation.
 * Uses heuristics + optional OpenAI for accuracy.
 */

import type { DetectedLanguage } from "./types";

const INDONESIAN_INDICATORS = [
  /\b(dan|yang|dengan|ini|itu|untuk|dari|ada|adalah|dapat|akan|telah|atau|pada|dalam|ke|di|dari)\b/i,
  /\b(kami|kita|anda|mereka|nya)\b/i,
  /\b(tidak|juga|sangat|sudah|masih|pernah)\b/i,
  /[àáâãäåāăą]/i, // rare in English
];
const INDONESIAN_WORD_RATIO_THRESHOLD = 0.15; // 15% of words match ID patterns

/**
 * Heuristic detection: ID vs EN based on common words.
 * For short or ambiguous text, returns "unknown" so caller can use both directions or ask.
 */
export function detectLanguageHeuristic(text: string): DetectedLanguage {
  const t = (text || "").trim();
  if (!t) return "unknown";

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "unknown";

  let idScore = 0;
  for (const pattern of INDONESIAN_INDICATORS) {
    if (pattern.test(t)) idScore++;
  }
  const wordCount = words.length;
  const idWordMatches = words.filter((w) =>
    INDONESIAN_INDICATORS.some((p) => p.test(w))
  ).length;
  const idRatio = idWordMatches / wordCount;

  if (idScore >= 2 || idRatio >= INDONESIAN_WORD_RATIO_THRESHOLD) return "id";
  if (/^[a-zA-Z\s.,!?'-]+$/.test(t) && idScore === 0) return "en";
  return "unknown";
}
