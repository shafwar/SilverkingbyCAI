/**
 * Serticard adjustment config - per template variant adjustments
 * Allows admin to customize font, size, etc. for each template variant
 */
import { prisma } from "@/lib/prisma";

export type SerticardAdjustmentData = {
  templateVariant: string; // "01", "03", ..., "custom"
  userId?: number | null; // null = global default
  fontFamily: string;
  fontSizePreset: "BESAR" | "KECIL";
  productTitleSize: number; // Multiplier (0.5 - 2.0)
  uniqcodeSize: number; // Multiplier (0.5 - 2.0)
  serialcodeSize: number; // Multiplier (0.5 - 2.0)
  qrSize: number; // Multiplier (0.5 - 2.0)
};

const DEFAULT_ADJUSTMENT: Omit<SerticardAdjustmentData, "templateVariant" | "userId"> = {
  fontFamily: "Arial",
  fontSizePreset: "BESAR",
  productTitleSize: 1.0,
  uniqcodeSize: 1.0,
  serialcodeSize: 1.0,
  qrSize: 1.0,
};

/**
 * Get adjustment config for a template variant
 * Returns default if not found
 */
export async function getSerticardAdjustment(
  templateVariant: string,
  userId?: number | null
): Promise<SerticardAdjustmentData> {
  // Try to find user-specific adjustment first, then global
  let adjustment = null;
  
  if (userId !== null && userId !== undefined) {
    adjustment = await prisma.serticardAdjustment.findUnique({
      where: {
        templateVariant_userId: {
          templateVariant,
          userId: userId,
        },
      },
    });
  }
  
  if (!adjustment) {
    adjustment = await prisma.serticardAdjustment.findUnique({
      where: {
        templateVariant_userId: {
          templateVariant,
          userId: null as any, // Prisma accepts null for optional fields
        },
      },
    });
  }
  
  if (!adjustment) {
    // Return default
    return {
      templateVariant,
      userId: userId || null,
      ...DEFAULT_ADJUSTMENT,
    };
  }
  
  return {
    templateVariant: adjustment.templateVariant,
    userId: adjustment.userId ?? null,
    fontFamily: adjustment.fontFamily,
    fontSizePreset: adjustment.fontSizePreset as "BESAR" | "KECIL",
    productTitleSize: adjustment.productTitleSize,
    uniqcodeSize: adjustment.uniqcodeSize,
    serialcodeSize: adjustment.serialcodeSize,
    qrSize: adjustment.qrSize,
  };
}

/**
 * Upsert adjustment config
 */
export async function upsertSerticardAdjustment(
  data: SerticardAdjustmentData
): Promise<SerticardAdjustmentData> {
  const { templateVariant, userId, ...updateData } = data;
  
  const adjustment = await prisma.serticardAdjustment.upsert({
    where: {
      templateVariant_userId: {
        templateVariant,
        userId: userId ?? (null as any), // Prisma accepts null for optional fields
      },
    },
    create: {
      templateVariant,
      userId: userId ?? (null as any),
      ...updateData,
    },
    update: updateData,
  });
  
  return {
    templateVariant: adjustment.templateVariant,
    userId: adjustment.userId ?? null,
    fontFamily: adjustment.fontFamily,
    fontSizePreset: adjustment.fontSizePreset as "BESAR" | "KECIL",
    productTitleSize: adjustment.productTitleSize,
    uniqcodeSize: adjustment.uniqcodeSize,
    serialcodeSize: adjustment.serialcodeSize,
    qrSize: adjustment.qrSize,
  };
}

/**
 * Delete adjustment config
 */
export async function deleteSerticardAdjustment(
  templateVariant: string,
  userId?: number | null
): Promise<void> {
  await prisma.serticardAdjustment.deleteMany({
    where: {
      templateVariant,
      userId: userId ?? (null as any),
    },
  });
}

/**
 * Get all adjustments for a user (or global if userId is null)
 */
export async function getAllSerticardAdjustments(
  userId?: number | null
): Promise<SerticardAdjustmentData[]> {
  const adjustments = await prisma.serticardAdjustment.findMany({
    where: {
      userId: userId ?? (null as any),
    },
    orderBy: {
      templateVariant: "asc",
    },
  });
  
  return adjustments.map((adj) => ({
    templateVariant: adj.templateVariant,
    userId: adj.userId ?? null,
    fontFamily: adj.fontFamily,
    fontSizePreset: adj.fontSizePreset as "BESAR" | "KECIL",
    productTitleSize: adj.productTitleSize,
    uniqcodeSize: adj.uniqcodeSize,
    serialcodeSize: adj.serialcodeSize,
    qrSize: adj.qrSize,
  }));
}
