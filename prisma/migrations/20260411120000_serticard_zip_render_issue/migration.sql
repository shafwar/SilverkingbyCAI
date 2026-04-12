-- CreateTable
CREATE TABLE `SerticardZipRenderIssue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `jobId` INTEGER NULL,
    `source` VARCHAR(32) NOT NULL DEFAULT 'RENDER_FAIL',
    `serialCode` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(500) NULL,
    `productId` INTEGER NULL,
    `weight` INTEGER NOT NULL DEFAULT 0,
    `isGram` BOOLEAN NOT NULL DEFAULT false,
    `rootKey` VARCHAR(255) NULL,
    `reasons` JSON NOT NULL,
    `templateVariant` VARCHAR(32) NOT NULL DEFAULT '01',
    `useCustomTemplate` BOOLEAN NOT NULL DEFAULT false,
    `cmsTemplateId` INTEGER NULL,
    `includeRootKey` BOOLEAN NOT NULL DEFAULT true,
    `dismissedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SerticardZipRenderIssue_dismissedAt_idx` ON `SerticardZipRenderIssue`(`dismissedAt`);

-- CreateIndex
CREATE INDEX `SerticardZipRenderIssue_createdAt_idx` ON `SerticardZipRenderIssue`(`createdAt`);

-- CreateIndex
CREATE INDEX `SerticardZipRenderIssue_serialCode_idx` ON `SerticardZipRenderIssue`(`serialCode`);

-- CreateIndex
CREATE INDEX `SerticardZipRenderIssue_jobId_idx` ON `SerticardZipRenderIssue`(`jobId`);
