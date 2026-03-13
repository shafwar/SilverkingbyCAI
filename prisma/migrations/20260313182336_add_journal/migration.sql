/*
  Warnings:

  - You are about to alter the column `cacheKey` on the `QrZipDownloadAudit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `r2Key` on the `QrZipDownloadAudit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(1024)` to `VarChar(191)`.
  - You are about to alter the column `cacheKey` on the `QrZipDownloadCache` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `cacheKey` on the `QrZipDownloadJob` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- DropIndex
DROP INDEX `QrZipDownloadAudit_r2Key_idx` ON `QrZipDownloadAudit`;

-- AlterTable
ALTER TABLE `QrZipDownloadAudit` MODIFY `cacheKey` VARCHAR(191) NOT NULL,
    MODIFY `r2Key` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `QrZipDownloadCache` MODIFY `cacheKey` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `QrZipDownloadJob` MODIFY `cacheKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PageSection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageName` VARCHAR(191) NOT NULL,
    `sectionKey` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `r2Key` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PageSection_pageName_idx`(`pageName`),
    UNIQUE INDEX `PageSection_pageName_sectionKey_key`(`pageName`, `sectionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Journal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `titleId` VARCHAR(500) NOT NULL,
    `titleEn` VARCHAR(500) NOT NULL,
    `contentId` TEXT NOT NULL,
    `contentEn` TEXT NOT NULL,
    `excerptId` VARCHAR(1000) NULL,
    `excerptEn` VARCHAR(1000) NULL,
    `heroImageR2Key` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Journal_slug_key`(`slug`),
    INDEX `Journal_publishedAt_idx`(`publishedAt`),
    INDEX `Journal_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `QrZipDownloadAudit_r2Key_idx` ON `QrZipDownloadAudit`(`r2Key`);
