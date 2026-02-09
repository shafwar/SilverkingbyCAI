-- CreateTable
CREATE TABLE `SerticardConfig` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `customFrontR2Key` VARCHAR(191) NULL,
    `customBackR2Key` VARCHAR(191) NULL,
    `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'Arial',
    `fontSizePreset` VARCHAR(191) NOT NULL DEFAULT 'BESAR',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
