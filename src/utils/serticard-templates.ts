/**
 * Serticard template configuration
 * Templates are paired: front (odd) + back (even) = 1 output file
 * Pattern: 01-02, 03-04, 05-06, 07-08, etc.
 */
export type SerticardVariantId = "01" | "03" | "05" | "07" | "09" | "11" | "13" | "15" | "17";

export type SerticardVariant = {
  id: SerticardVariantId;
  label: string; // Serticard A, B, C, ...
  frontNum: string; // 01, 03, 05, ...
  backNum: string;  // 02, 04, 06, ...
  ext: "png" | "jpeg";
  /** Local path prefix (no leading slash) - images/serticard/ */
  localBase: string;
};

/** Default variant (01-02) - same as existing behavior */
export const DEFAULT_SERTICARD_VARIANT: SerticardVariantId = "01";

/** All available serticard template pairs */
export const SERTICARD_VARIANTS: SerticardVariant[] = [
  { id: "01", label: "Serticard A", frontNum: "01", backNum: "02", ext: "png", localBase: "images/serticard" },
  { id: "03", label: "Serticard B", frontNum: "03", backNum: "04", ext: "jpeg", localBase: "images/serticard" },
  { id: "05", label: "Serticard C", frontNum: "05", backNum: "06", ext: "jpeg", localBase: "images/serticard" },
  { id: "07", label: "Serticard D", frontNum: "07", backNum: "08", ext: "jpeg", localBase: "images/serticard" },
  { id: "09", label: "Serticard E", frontNum: "09", backNum: "10", ext: "jpeg", localBase: "images/serticard" },
  { id: "11", label: "Serticard F", frontNum: "11", backNum: "12", ext: "jpeg", localBase: "images/serticard" },
  { id: "13", label: "Serticard G", frontNum: "13", backNum: "14", ext: "jpeg", localBase: "images/serticard" },
  { id: "15", label: "Serticard H", frontNum: "15", backNum: "16", ext: "jpeg", localBase: "images/serticard" },
  { id: "17", label: "Serticard I", frontNum: "17", backNum: "18", ext: "jpeg", localBase: "images/serticard" },
];

/** Local filename: Serticard-01.png for 01, serticard-03.jpeg for 03 (note: 03 has lowercase in filesystem) */
export function getLocalTemplateFilename(num: string, ext: "png" | "jpeg"): string {
  const prefix = num === "03" ? "serticard" : "Serticard"; // Handle existing serticard-03.jpeg
  return `${prefix}-${num}.${ext}`;
}

/** R2 object key: templates/serticard-01.png, templates/serticard-03.jpeg, etc. */
export function getR2TemplateKey(num: string, ext: "png" | "jpeg"): string {
  return `templates/serticard-${num}.${ext}`;
}

/** Get variant by id */
export function getSerticardVariant(id: string): SerticardVariant | undefined {
  return SERTICARD_VARIANTS.find((v) => v.id === id);
}

/** Validate variant id */
export function isValidSerticardVariant(id: string): id is SerticardVariantId {
  return SERTICARD_VARIANTS.some((v) => v.id === id);
}
