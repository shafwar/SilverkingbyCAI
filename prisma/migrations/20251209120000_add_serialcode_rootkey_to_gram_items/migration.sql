-- AlterTable: Make serialCode required and add rootKeyHash
-- This migration updates GramProductItem for Page 2 two-step verification

-- Step 1: Add rootKeyHash column (nullable first for existing data)
ALTER TABLE `GramProductItem` ADD COLUMN `rootKeyHash` VARCHAR(191) NULL;

-- Step 2: Update existing NULL serialCode to a placeholder (if any exist)
-- Note: This assumes existing data might have NULL serialCode
UPDATE `GramProductItem` SET `serialCode` = CONCAT('SKP', LPAD(id, 6, '0')) WHERE `serialCode` IS NULL;

-- Step 3: Make serialCode NOT NULL
ALTER TABLE `GramProductItem` MODIFY COLUMN `serialCode` VARCHAR(191) NOT NULL;

-- Step 4: Make rootKeyHash NOT NULL (after we populate it)
-- For existing records, we'll generate a default hash
-- Note: In production, you should manually set rootKeyHash for existing records
UPDATE `GramProductItem` SET `rootKeyHash` = '$2b$10$defaultplaceholderhashforoldrecords' WHERE `rootKeyHash` IS NULL;

ALTER TABLE `GramProductItem` MODIFY COLUMN `rootKeyHash` VARCHAR(191) NOT NULL;
