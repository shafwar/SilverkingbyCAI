-- AlterTable: add progress fields to QrZipDownloadJob for real-time progress (Item 1-100: X%, etc.)
ALTER TABLE `QrZipDownloadJob` ADD COLUMN `progressPercent` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `QrZipDownloadJob` ADD COLUMN `progressMessage` TEXT NULL;
