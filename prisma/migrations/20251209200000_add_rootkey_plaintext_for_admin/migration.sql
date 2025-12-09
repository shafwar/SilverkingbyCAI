-- Add rootKey plain text field for admin display
-- This field stores the plain text root key for admin convenience
-- Note: rootKeyHash is still used for verification, this is just for display

ALTER TABLE `GramProductItem` ADD COLUMN `rootKey` VARCHAR(191) NULL;
