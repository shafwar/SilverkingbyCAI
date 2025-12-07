/*
  Warnings:

  - You are about to alter the column `overridesDefault` on the `CmsProduct` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `CmsProduct` MODIFY `overridesDefault` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `GramProductBatch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `qrMode` VARCHAR(191) NOT NULL,
    `weightGroup` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GramProductItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `uniqCode` VARCHAR(191) NOT NULL,
    `serialCode` VARCHAR(191) NULL,
    `qrImageUrl` VARCHAR(191) NOT NULL,
    `scanCount` INTEGER NOT NULL DEFAULT 0,
    `lastScannedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GramProductItem_uniqCode_key`(`uniqCode`),
    UNIQUE INDEX `GramProductItem_serialCode_key`(`serialCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GramQRScanLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qrItemId` INTEGER NOT NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GramProductItem` ADD CONSTRAINT `GramProductItem_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `GramProductBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GramQRScanLog` ADD CONSTRAINT `GramQRScanLog_qrItemId_fkey` FOREIGN KEY (`qrItemId`) REFERENCES `GramProductItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE UNIQUE INDEX `CmsProduct_overridesDefault_key` ON `CmsProduct`(`overridesDefault`);
DROP INDEX `overridesDefault` ON `CmsProduct`;
