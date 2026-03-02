-- CreateTable: audit admin download clicks for R2 ZIP batches
CREATE TABLE `QrZipDownloadAudit` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `cacheKey` VARCHAR(255) NOT NULL,
  `r2Key` VARCHAR(1024) NOT NULL,
  `batchIndex` INTEGER NULL,
  `totalBatches` INTEGER NULL,
  `downloadedByEmail` VARCHAR(191) NULL,
  `downloadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `QrZipDownloadAudit_cacheKey_idx`(`cacheKey`),
  INDEX `QrZipDownloadAudit_r2Key_idx`(`r2Key`),
  INDEX `QrZipDownloadAudit_downloadedAt_idx`(`downloadedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

