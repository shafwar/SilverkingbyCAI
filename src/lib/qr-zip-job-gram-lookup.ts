import type { QrZipDownloadJob } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Avoid large MySQL filesorts (1038 out of sort memory) on QrZipDownloadJob:
 * - Never use `cacheKey IN (...) ORDER BY createdAt|updatedAt` across huge history.
 * - Prefer `ORDER BY id DESC`: InnoDB secondary index on cacheKey is ordered by PK id per key → cheap LIMIT 1.
 */

/** Latest COMPLETED job per candidate cacheKey; pick newest row by primary key among keys. */
export async function findLatestCompletedZipJobForGramKeys(
  cacheKeyCandidates: string[]
): Promise<QrZipDownloadJob | null> {
  const keys = cacheKeyCandidates.filter((k) => k && k.trim() !== "");
  if (keys.length === 0) return null;

  const rows = await Promise.all(
    keys.map((cacheKey) =>
      prisma.qrZipDownloadJob.findFirst({
        where: { cacheKey, status: "COMPLETED" },
        orderBy: { id: "desc" },
      })
    )
  );

  let best: QrZipDownloadJob | null = null;
  for (const r of rows) {
    if (!r) continue;
    if (!best || r.id > best.id) best = r;
  }
  return best;
}

/** Latest job row for any of the gram cache keys (any status), by primary key (newest row). */
export async function findLatestZipJobForGramKeys(
  cacheKeyCandidates: string[]
): Promise<QrZipDownloadJob | null> {
  const keys = cacheKeyCandidates.filter((k) => k && k.trim() !== "");
  if (keys.length === 0) return null;

  const rows = await Promise.all(
    keys.map((cacheKey) =>
      prisma.qrZipDownloadJob.findFirst({
        where: { cacheKey },
        orderBy: { id: "desc" },
      })
    )
  );

  let best: QrZipDownloadJob | null = null;
  for (const r of rows) {
    if (!r) continue;
    if (!best || r.id > best.id) best = r;
  }
  return best;
}

/**
 * Latest PENDING or PROCESSING job for one cacheKey (background ZIP dedupe).
 * Two equality queries + ORDER BY id — avoids `status IN (...) ORDER BY createdAt` filesort.
 */
export async function findLatestActiveZipJobForCacheKey(
  cacheKey: string | null | undefined
): Promise<QrZipDownloadJob | null> {
  if (cacheKey == null || String(cacheKey).trim() === "") return null;
  const key = String(cacheKey);
  const [pending, processing] = await Promise.all([
    prisma.qrZipDownloadJob.findFirst({
      where: { cacheKey: key, status: "PENDING" },
      orderBy: { id: "desc" },
    }),
    prisma.qrZipDownloadJob.findFirst({
      where: { cacheKey: key, status: "PROCESSING" },
      orderBy: { id: "desc" },
    }),
  ]);
  if (!pending) return processing;
  if (!processing) return pending;
  return pending.id > processing.id ? pending : processing;
}
