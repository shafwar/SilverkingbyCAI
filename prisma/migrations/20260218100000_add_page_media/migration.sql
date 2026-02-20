-- CreateTable
CREATE TABLE `PageMedia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageName` VARCHAR(191) NOT NULL,
    `heroImageR2Key` VARCHAR(191) NULL,
    `heroVideoR2Key` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PageMedia_pageName_key` ON `PageMedia`(`pageName`);

-- CreateIndex
CREATE INDEX `PageMedia_pageName_idx` ON `PageMedia`(`pageName`);
