-- AlterTable
ALTER TABLE `CmsProduct` ADD COLUMN `filterCategory` VARCHAR(191) NULL DEFAULT 'all',
    MODIFY `description` VARCHAR(191) NULL,
    MODIFY `category` VARCHAR(191) NULL;
