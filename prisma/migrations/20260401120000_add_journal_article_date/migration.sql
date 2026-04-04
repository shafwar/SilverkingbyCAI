-- AlterTable
ALTER TABLE `Journal` ADD COLUMN `articleDate` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Journal_articleDate_idx` ON `Journal`(`articleDate`);
