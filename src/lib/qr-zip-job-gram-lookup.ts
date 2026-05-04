import type { QrZipDownloadJob } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Avoid `WHERE cacheKey IN (...) ORDER BY ...` on QrZipDownloadJob: many historical rows
 * can share the same cacheKey, which forces large sorts (MySQL 1038 out of sort memory).
 * Instead: one indexed lookup per candidate key (small bounded sort per key).
 */
export async function findLatestCompletedZipJobForGramKeys(
  cacheKeyCandidates: string[]
): Promise<QrZipDownloadJob | null> {
  const keys = cacheKeyCandidates.filter((k) => k && k.trim() !== "");
  if (keys.length === 0) return null;

  const rows = await Promise.all(
    keys.map((cacheKey) =>
      prisma.qrZipDownloadJob.findFirst({
        where: { cacheKey, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
      })
    )
  );

  let best: QrZipDownloadJob | null = null;
  for (const r of rows) {
    if (!r) continue;
    if (!best || r.updatedAt > best.updatedAt) best = r;
  }
  return best;
}

/** Latest job row for any of the gram cache keys (any status), by createdAt. */
export async function findLatestZipJobForGramKeys(
  cacheKeyCandidates: string[]
): Promise<QrZipDownloadJob | null> {
  const keys = cacheKeyCandidates.filter((k) => k && k.trim() !== "");
  if (keys.length === 0) return null;

  const rows = await Promise.all(
    keys.map((cacheKey) =>
      prisma.qrZipDownloadJob.findFirst({
        where: { cacheKey },
        orderBy: { createdAt: "desc" },
      })
    )
  );

  let best: QrZipDownloadJob | null = null;
  for (const r of rows) {
    if (!r) continue;
    if (!best || r.createdAt > best.createdAt) best = r;
  }
  return best;
}
