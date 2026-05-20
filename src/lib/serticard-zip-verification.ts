/**
 * Server-side checks for each Serticard PDF before it is added to a ZIP.
 * Ensures PNG/PDF buffers look valid (not empty/corrupt) after render.
 */

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasPngSignature(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG);
}

export type ZipVerificationItem = {
  serialCode: string;
  productNameLen: number;
  serialLen: number;
  rootKeyRendered: boolean;
  frontPngBytes: number;
  backPngBytes: number;
  pdfBytes: number;
  checks: string[];
};

export type ZipVerificationWarning = {
  code: string;
  serialCode: string;
  message: string;
  /** Set for ROOT_KEY_MISSING so ZIP issues can retry with full product context */
  productId?: number;
  productName?: string | null;
  weight?: number;
  isGram?: boolean;
  rootKey?: string | null;
};

export type ZipVerificationRenderFailure = {
  serialCode: string;
  reasons: string[];
  productId?: number;
  productName?: string | null;
  weight?: number;
  isGram?: boolean;
  rootKey?: string | null;
};

export type ZipVerificationSummary = {
  schemaVersion: 1;
  generatedAt: string;
  totalInputProducts: number;
  items: ZipVerificationItem[];
  warnings: ZipVerificationWarning[];
  renderFailures: ZipVerificationRenderFailure[];
};

export function createZipVerificationSummary(totalInputProducts: number): ZipVerificationSummary {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalInputProducts,
    items: [],
    warnings: [],
    renderFailures: [],
  };
}

/** Returns ok=false if buffers look invalid — caller should not add this PDF to the ZIP. */
export function verifySerticardZipItemBuffers(args: {
  frontBuffer: Buffer;
  backBuffer: Buffer;
  pdfBuffer: Buffer;
  productName: string;
  productSerialCode: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const name = (args.productName || "").trim();
  const serial = (args.productSerialCode || "").trim();

  if (!name) reasons.push("EMPTY_PRODUCT_NAME");
  if (!serial) reasons.push("EMPTY_SERIAL");

  if (!hasPngSignature(args.frontBuffer)) reasons.push("FRONT_NOT_PNG");
  if (!hasPngSignature(args.backBuffer)) reasons.push("BACK_NOT_PNG");

  if (args.frontBuffer.length < 2048) reasons.push("FRONT_PNG_TOO_SMALL");
  if (args.backBuffer.length < 2048) reasons.push("BACK_PNG_TOO_SMALL");
  if (args.pdfBuffer.length < 800) reasons.push("PDF_TOO_SMALL");

  const pdfHead = args.pdfBuffer.subarray(0, Math.min(5, args.pdfBuffer.length)).toString("latin1");
  if (!pdfHead.startsWith("%PDF")) reasons.push("PDF_BAD_HEADER");

  return { ok: reasons.length === 0, reasons };
}

export function buildZipVerificationManifest(v: ZipVerificationSummary): Record<string, unknown> {
  return {
    schemaVersion: v.schemaVersion,
    generatedAt: v.generatedAt,
    totalInputProducts: v.totalInputProducts,
    summary: {
      verifiedPdfCount: v.items.length,
      warningCount: v.warnings.length,
      renderFailureCount: v.renderFailures.length,
    },
    items: v.items,
    warnings: v.warnings,
    renderFailures: v.renderFailures,
    note:
      "Each listed PDF passed buffer checks (valid PNG sides + PDF header/size). " +
      "Warnings flag data issues (e.g. missing root key). " +
      "Render failures were not added to the ZIP.",
  };
}

/**
 * When the API returns a raw ZIP body, verification counts are exposed on these headers
 * (see download-multiple-pdf). Reconstructs a summary compatible with merge/toast logic.
 */
export function zipVerificationSummaryFromHttpHeaders(headers: {
  get(name: string): string | null;
}): ZipVerificationSummary | null {
  const v = headers.get("X-Serticard-Verified-Count");
  if (v == null || v === "") return null;
  const verified = Math.max(0, parseInt(v, 10) || 0);
  const warnings = Math.max(0, parseInt(headers.get("X-Serticard-Warning-Count") || "0", 10));
  const failed = Math.max(0, parseInt(headers.get("X-Serticard-Failed-Count") || "0", 10));
  const stubItem = (): ZipVerificationItem => ({
    serialCode: "",
    productNameLen: 0,
    serialLen: 0,
    rootKeyRendered: false,
    frontPngBytes: 0,
    backPngBytes: 0,
    pdfBytes: 0,
    checks: [],
  });
  const stubWarn = (): ZipVerificationWarning => ({
    code: "SUMMARY",
    serialCode: "",
    message: "",
  });
  const stubFail = (): ZipVerificationRenderFailure => ({
    serialCode: "",
    reasons: [],
  });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalInputProducts: verified + failed,
    items: Array.from({ length: verified }, stubItem),
    warnings: Array.from({ length: warnings }, stubWarn),
    renderFailures: Array.from({ length: failed }, stubFail),
  };
}

export function mergeZipVerificationSummaries(
  parts: ZipVerificationSummary[]
): ZipVerificationSummary | null {
  if (!parts.length) return null;
  const merged = createZipVerificationSummary(
    parts.reduce((sum, p) => sum + (p.totalInputProducts || 0), 0)
  );
  merged.generatedAt = new Date().toISOString();
  for (const p of parts) {
    merged.items.push(...p.items);
    merged.warnings.push(...p.warnings);
    merged.renderFailures.push(...p.renderFailures);
  }
  return merged;
}
