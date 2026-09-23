/**
 * Serticard template configuration
 * Standard templates are paired: front (odd) + back (even) = 1 output file
 * Pattern: 01-02, 03-04, 05-06, 07-08, etc.
 * Packages: separate pair — QR-only front; root key pill on back (ZIP bulk only)
 */
export type SerticardStandardVariantId =
  | "01"
  | "03"
  | "05"
  | "07"
  | "09"
  | "11"
  | "13"
  | "15"
  | "17";

export type SerticardPackagesVariantId = "packages";

export type SerticardVariantId = SerticardStandardVariantId | SerticardPackagesVariantId;

export type SerticardVariant = {
  id: SerticardVariantId;
  label: string;
  frontNum: string;
  backNum: string;
  ext: "png" | "jpeg";
  /** Local path prefix (no leading slash) - images/serticard/ */
  localBase: string;
  kind: "standard" | "packages";
};

/** Default variant (01-02) - same as existing behavior */
export const DEFAULT_SERTICARD_VARIANT: SerticardVariantId = "01";

/** Serticard A–I (standard layout: QR center) */
export const SERTICARD_STANDARD_VARIANTS: SerticardVariant[] = [
  { id: "01", label: "Serticard A", frontNum: "01", backNum: "02", ext: "png", localBase: "images/serticard", kind: "standard" },
  { id: "03", label: "Serticard B", frontNum: "03", backNum: "04", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "05", label: "Serticard C", frontNum: "05", backNum: "06", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "07", label: "Serticard D", frontNum: "07", backNum: "08", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "09", label: "Serticard E", frontNum: "09", backNum: "10", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "11", label: "Serticard F", frontNum: "11", backNum: "12", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "13", label: "Serticard G", frontNum: "13", backNum: "14", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "15", label: "Serticard H", frontNum: "15", backNum: "16", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
  { id: "17", label: "Serticard I", frontNum: "17", backNum: "18", ext: "jpeg", localBase: "images/serticard", kind: "standard" },
];

/** Serticard Packages (QR-only front; root key on back when bulk ZIP) */
export const SERTICARD_PACKAGES_VARIANTS: SerticardVariant[] = [
  {
    id: "packages",
    label: "Serticard Packages",
    frontNum: "packages-01",
    backNum: "packages-02",
    ext: "jpeg",
    localBase: "images/serticard",
    kind: "packages",
  },
];

/** All built-in variants (standard + packages) */
export const SERTICARD_VARIANTS: SerticardVariant[] = [
  ...SERTICARD_STANDARD_VARIANTS,
  ...SERTICARD_PACKAGES_VARIANTS,
];

/** Local filename: Serticard-01.png for 01, serticard-03.jpeg for 03 (note: 03 has lowercase in filesystem) */
export function getLocalTemplateFilename(num: string, ext: "png" | "jpeg"): string {
  if (num === "packages-01") return "Serticard Packages-01.jpeg";
  if (num === "packages-02") return "Serticard Packages-02.jpeg";
  const prefix = num === "03" ? "serticard" : "Serticard";
  return `${prefix}-${num}.${ext}`;
}

/** R2 object key: templates/serticard-01.png, templates/serticard-packages-01.jpeg, etc. */
export function getR2TemplateKey(num: string, ext: "png" | "jpeg"): string {
  if (num === "packages-01") return "templates/serticard-packages-01.jpeg";
  if (num === "packages-02") return "templates/serticard-packages-02.jpeg";
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

export function isSerticardPackagesVariant(id: string): id is SerticardPackagesVariantId {
  return id === "packages";
}

/**
 * Bump when Packages front/back compose rules change so gram ZIP cache regenerates
 * (QR-only front, root key on back for bulk ZIP).
 */
export const SERTICARD_PACKAGES_ZIP_LAYOUT_REV = 1;

/** Template segment in ZIP cache keys — Packages includes layout revision. */
export function getZipCacheTemplateSegment(templateVariant: string): string {
  if (isSerticardPackagesVariant(templateVariant)) {
    return `packages:lv${SERTICARD_PACKAGES_ZIP_LAYOUT_REV}`;
  }
  return templateVariant;
}
