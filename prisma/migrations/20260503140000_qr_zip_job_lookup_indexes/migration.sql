-- Speed up ZIP job lookups by cacheKey + status + sort column (reduces filesort / sort memory).
-- Complements app-side per-key queries in zip-ready (see qr-zip-job-gram-lookup.ts).

CREATE INDEX `QrZipDownloadJob_cacheKey_status_updatedAt_idx` ON `QrZipDownloadJob`(`cacheKey`, `status`, `updatedAt`);
CREATE INDEX `QrZipDownloadJob_cacheKey_status_createdAt_idx` ON `QrZipDownloadJob`(`cacheKey`, `status`, `createdAt`);
