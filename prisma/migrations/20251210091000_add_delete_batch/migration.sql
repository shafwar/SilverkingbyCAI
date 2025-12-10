-- CreateTable
CREATE TABLE `ProductDeleteHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `weight` INTEGER NOT NULL,
    `serialCode` VARCHAR(191) NOT NULL,
    `price` DOUBLE NULL,
    `stock` INTEGER NULL,
    `qrImageUrl` VARCHAR(191) NULL,
    `scanCount` INTEGER NULL DEFAULT 0,
    `deletedBy` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `restoredAt` DATETIME(3) NULL,
    `restoredProductId` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `batchId` INTEGER NULL,

    INDEX `ProductDeleteHistory_deletedAt_idx`(`deletedAt`),
    INDEX `ProductDeleteHistory_serialCode_idx`(`serialCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductDeleteBatch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedBy` VARCHAR(191) NULL,
    `itemCount` INTEGER NOT NULL,

    INDEX `ProductDeleteBatch_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductDeleteHistory` ADD CONSTRAINT `ProductDeleteHistory_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductDeleteBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
