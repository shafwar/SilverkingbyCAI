import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ZipVerificationSummary } from "@/lib/serticard-zip-verification";

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
