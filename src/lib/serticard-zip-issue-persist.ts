import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ZipVerificationSummary, ZipVerificationWarning } from "@/lib/serticard-zip-verification";

type TemplateMeta = {
  templateVariant: string;
  useCustomTemplate: boolean;
  cmsTemplateId: number | null;
  includeRootKey: boolean;
};

/** Persist ZIP buffer verification failures (PDF not added to ZIP). */
export async function persistSerticardZipRenderIssuesFromVerification(args: {
  jobId?: number | null;
  verification: ZipVerificationSummary;
} & TemplateMeta): Promise<void> {
  const failures = args.verification.renderFailures;
  if (!failures.length) return;

  const data = failures.map((f) => ({
    jobId: args.jobId ?? null,
    source: "RENDER_FAIL",
    serialCode: String(f.serialCode || "UNKNOWN").slice(0, 191),
    productName:
      f.productName != null && String(f.productName).trim() !== ""
        ? String(f.productName).trim().slice(0, 500)
        : null,
    productId: f.productId != null && Number.isFinite(Number(f.productId)) ? Math.floor(Number(f.productId)) : null,
    weight: typeof f.weight === "number" && !Number.isNaN(f.weight) ? f.weight : 0,
    isGram: f.isGram === true,
    rootKey:
      f.rootKey != null && String(f.rootKey).trim() !== "" ? String(f.rootKey).trim().slice(0, 255) : null,
    reasons: f.reasons as Prisma.InputJsonValue,
    templateVariant: String(args.templateVariant || "01").slice(0, 32),
    useCustomTemplate: Boolean(args.useCustomTemplate),
    cmsTemplateId:
      args.cmsTemplateId != null && Number.isFinite(args.cmsTemplateId) ? Math.floor(args.cmsTemplateId) : null,
    includeRootKey: args.includeRootKey !== false,
  }));

  await prisma.serticardZipRenderIssue.createMany({ data });
}

/** When ZIP expects root key on Gram items but none was found, verification only had a warning — persist for admin ZIP issues UI. */
export async function persistSerticardZipRootKeyWarningsAsIssues(args: {
  jobId?: number | null;
  verification: ZipVerificationSummary;
} & TemplateMeta): Promise<void> {
  if (args.includeRootKey === false) return;

  const warnings = args.verification.warnings.filter(
    (w: ZipVerificationWarning) => w.code === "ROOT_KEY_MISSING"
  );
  if (!warnings.length) return;

  const data = warnings.map((w) => ({
    jobId: args.jobId ?? null,
    source: "MISSING_ROOT_KEY",
    serialCode: String(w.serialCode || "UNKNOWN").slice(0, 191),
    productName:
      w.productName != null && String(w.productName).trim() !== ""
        ? String(w.productName).trim().slice(0, 500)
        : null,
    productId:
      w.productId != null && Number.isFinite(Number(w.productId)) ? Math.floor(Number(w.productId)) : null,
    weight: typeof w.weight === "number" && !Number.isNaN(w.weight) ? w.weight : 0,
    isGram: w.isGram === true,
    rootKey:
      w.rootKey != null && String(w.rootKey).trim() !== "" ? String(w.rootKey).trim().slice(0, 255) : null,
    reasons: ["ROOT_KEY_MISSING"] as Prisma.InputJsonValue,
    templateVariant: String(args.templateVariant || "01").slice(0, 32),
    useCustomTemplate: Boolean(args.useCustomTemplate),
    cmsTemplateId:
      args.cmsTemplateId != null && Number.isFinite(args.cmsTemplateId)
        ? Math.floor(args.cmsTemplateId)
        : null,
    includeRootKey: args.includeRootKey !== false,
  }));

  await prisma.serticardZipRenderIssue.createMany({ data });
}

/** Persist rows skipped before render (empty name/serial, 0000, etc.). */
export async function persistInvalidZipProductsAsIssues(args: {
  jobId?: number | null;
  invalidProducts: Array<{
    id?: number;
    name?: string | null;
    serialCode?: string | null;
    weight?: number;
    isGram?: boolean;
    rootKey?: string | null;
  }>;
} & TemplateMeta): Promise<void> {
  if (!args.invalidProducts.length) return;

  const data = args.invalidProducts.map((p) => ({
    jobId: args.jobId ?? null,
    source: "INVALID_INPUT",
    serialCode: String(p.serialCode ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 191) || "UNKNOWN",
    productName:
      p.name != null && String(p.name).trim() !== "" ? String(p.name).trim().slice(0, 500) : null,
    productId: p.id != null && Number.isFinite(Number(p.id)) ? Math.floor(Number(p.id)) : null,
    weight: typeof p.weight === "number" && !Number.isNaN(p.weight) ? p.weight : 0,
    isGram: p.isGram === true,
    rootKey:
      p.rootKey != null && String(p.rootKey).trim() !== "" ? String(p.rootKey).trim().slice(0, 255) : null,
    reasons: ["INVALID_INPUT_FILTER"] as Prisma.InputJsonValue,
    templateVariant: String(args.templateVariant || "01").slice(0, 32),
    useCustomTemplate: Boolean(args.useCustomTemplate),
    cmsTemplateId:
      args.cmsTemplateId != null && Number.isFinite(args.cmsTemplateId) ? Math.floor(args.cmsTemplateId) : null,
    includeRootKey: args.includeRootKey !== false,
  }));

  await prisma.serticardZipRenderIssue.createMany({ data });
}
