-- CreateTable
CREATE TABLE `QrZipDownloadJob` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(191) NOT NULL,
    `requestPayload` JSON NOT NULL,
    `result` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `QrZipDownloadJob_status_idx` ON `QrZipDownloadJob`(`status`);

-- CreateIndex
CREATE INDEX `QrZipDownloadJob_createdAt_idx` ON `QrZipDownloadJob`(`createdAt`);
