-- Speed up ZIP job lookups by cacheKey + status + sort column (reduces filesort / sort memory).
-- Complements app-side per-key queries in zip-ready (see qr-zip-job-gram-lookup.ts).
-- Idempotent: indexes may already exist if a prior deploy partially applied or schema was synced manually.

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'QrZipDownloadJob'
    AND index_name = 'QrZipDownloadJob_cacheKey_status_updatedAt_idx'
);
SET @sql := IF(
  @idx_exists > 0,
  'SELECT ''QrZipDownloadJob_cacheKey_status_updatedAt_idx already exists''',
  'CREATE INDEX `QrZipDownloadJob_cacheKey_status_updatedAt_idx` ON `QrZipDownloadJob`(`cacheKey`, `status`, `updatedAt`)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'QrZipDownloadJob'
    AND index_name = 'QrZipDownloadJob_cacheKey_status_createdAt_idx'
);
SET @sql := IF(
  @idx_exists > 0,
  'SELECT ''QrZipDownloadJob_cacheKey_status_createdAt_idx already exists''',
  'CREATE INDEX `QrZipDownloadJob_cacheKey_status_createdAt_idx` ON `QrZipDownloadJob`(`cacheKey`, `status`, `createdAt`)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
