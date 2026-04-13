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
  const base = `gram-batch:${batchId}:tpl:${templateVariant}:custom:${useCustom ? 1 : 0}:cms:${cms}:gram:${gram}`;
  return [base, `${base}:rk:0`, `${base}:rk:1`];
}
