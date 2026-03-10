-- CreateTable
CREATE TABLE `ContentEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageName` VARCHAR(191) NOT NULL,
    `sectionName` VARCHAR(191) NOT NULL,
    `title` JSON NOT NULL,
    `description` JSON NULL,
    `translationMeta` JSON NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ContentEntry_pageName_sectionName_key` ON `ContentEntry`(`pageName`, `sectionName`);

-- CreateIndex
CREATE INDEX `ContentEntry_pageName_idx` ON `ContentEntry`(`pageName`);
