-- CreateIndex (idempotent — safe if index already exists)
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'GramProductItem'
    AND index_name = 'GramProductItem_uniqCode_rootKey_idx'
);
SET @sql := IF(
  @idx_exists > 0,
  'SELECT ''GramProductItem_uniqCode_rootKey_idx already exists''',
  'CREATE INDEX `GramProductItem_uniqCode_rootKey_idx` ON `GramProductItem`(`uniqCode`, `rootKey`)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
