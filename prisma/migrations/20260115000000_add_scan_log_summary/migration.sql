-- CreateTable
CREATE TABLE `ScanLogSummary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `page1Scans` INTEGER NOT NULL DEFAULT 0,
    `page2Scans` INTEGER NOT NULL DEFAULT 0,
    `totalScans` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ScanLogSummary_date_key`(`date`),
    INDEX `ScanLogSummary_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
