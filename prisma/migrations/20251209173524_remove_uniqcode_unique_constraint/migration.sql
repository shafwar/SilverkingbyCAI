-- DropIndex
DROP INDEX `GramProductItem_uniqCode_key` ON `GramProductItem`;

-- CreateIndex
CREATE INDEX `GramProductItem_uniqCode_idx` ON `GramProductItem`(`uniqCode`);
