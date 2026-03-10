-- Add cacheKey to QrZipDownloadJob
ALTER TABLE `QrZipDownloadJob` ADD COLUMN `cacheKey` VARCHAR(255) NULL;
CREATE INDEX `QrZipDownloadJob_cacheKey_idx` ON `QrZipDownloadJob`(`cacheKey`);

-- Cache table: reuse existing R2 ZIP results for identical requests
CREATE TABLE `QrZipDownloadCache` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `cacheKey` VARCHAR(255) NOT NULL,
  `result` JSON NOT NULL,
  `hitCount` INTEGER NOT NULL DEFAULT 0,
  `lastAccessedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `QrZipDownloadCache_cacheKey_key`(`cacheKey`),
  INDEX `QrZipDownloadCache_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

