import {
  getZipCacheTemplateSegment,
  isSerticardPackagesVariant,
} from "@/utils/serticard-templates";

/**
 * Kunci cache gram di DB memakai suffix `:rk:0|1` (lihat buildZipCacheKey di download-multiple-pdf).
 * zip-ready & UI mencari ZIP siap unduh harus mencoba semua varian agar konsisten.
 */
export function gramBatchZipCacheKeyCandidates(
  batchId: number,
  templateVariant: string,
  useCustom: boolean,
  cmsTemplateId: number
): string[] {
  const gram = 1;
  const cms =
    Number.isFinite(cmsTemplateId) && cmsTemplateId > 0 ? Math.floor(cmsTemplateId) : 0;

  const tplSegments = new Set<string>();
  tplSegments.add(getZipCacheTemplateSegment(templateVariant));
  // Legacy: Packages pernah pakai `tpl:packages` sebelum layout revision `packages:lvN`
  if (isSerticardPackagesVariant(templateVariant)) {
    tplSegments.add("packages");
  }

  const keys = new Set<string>();
  for (const tpl of tplSegments) {
    const base = `gram-batch:${batchId}:tpl:${tpl}:custom:${useCustom ? 1 : 0}:cms:${cms}:gram:${gram}`;
    keys.add(base);
    keys.add(`${base}:rk:0`);
    keys.add(`${base}:rk:1`);
  }
  return Array.from(keys);
}
