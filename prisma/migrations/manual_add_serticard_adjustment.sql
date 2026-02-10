-- Migration: Add SerticardAdjustment table
-- Run this manually in production database

CREATE TABLE IF NOT EXISTS `SerticardAdjustment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `templateVariant` VARCHAR(191) NOT NULL,
  `userId` INT NULL,
  `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'Arial',
  `fontSizePreset` VARCHAR(191) NOT NULL DEFAULT 'BESAR',
  `productTitleSize` DOUBLE NOT NULL DEFAULT 1.0,
  `uniqcodeSize` DOUBLE NOT NULL DEFAULT 1.0,
  `serialcodeSize` DOUBLE NOT NULL DEFAULT 1.0,
  `qrSize` DOUBLE NOT NULL DEFAULT 1.0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SerticardAdjustment_templateVariant_userId_key` (`templateVariant`, `userId`),
  KEY `SerticardAdjustment_templateVariant_idx` (`templateVariant`),
  KEY `SerticardAdjustment_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
