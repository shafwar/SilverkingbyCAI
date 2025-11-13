-- Silver King by CAI - Create Tables Script
-- Run this in phpMyAdmin SQL tab

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key`(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `weight` ENUM('FIVE_GR', 'TEN_GR', 'TWENTY_FIVE_GR', 'FIFTY_GR', 'HUNDRED_GR', 'TWO_FIFTY_GR', 'FIVE_HUNDRED_GR') NOT NULL,
  `purity` DOUBLE NOT NULL DEFAULT 99.99,
  `serialNumber` VARCHAR(191) NOT NULL,
  `uniqueCode` VARCHAR(191) NOT NULL DEFAULT 'Be part of this kingdom',
  `qrCode` TEXT NOT NULL,
  `scannedCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `products_serialNumber_key`(`serialNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

