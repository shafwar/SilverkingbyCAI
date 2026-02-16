-- CreateTable
CREATE TABLE `Distributor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `distributorName` VARCHAR(191) NOT NULL,
    `storeName` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `mapLink` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Distributor_status_idx` ON `Distributor`(`status`);

-- CreateIndex
CREATE INDEX `Distributor_city_idx` ON `Distributor`(`city`);

-- CreateIndex
CREATE INDEX `Distributor_deletedAt_idx` ON `Distributor`(`deletedAt`);
