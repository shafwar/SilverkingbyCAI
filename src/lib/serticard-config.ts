/**
 * Serticard config - get/upsert single-row config
 */
import { prisma } from "@/lib/prisma";

export const FONT_FAMILIES = [
  { value: "Arial", label: "Arial" },
  { value: "Lucida Sans", label: "Lucida Sans" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "SF Mono", label: "SF Mono" },
] as const;

export const FONT_SIZE_PRESETS = [
  { value: "BESAR", label: "Besar" },
  { value: "KECIL", label: "Kecil" },
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number]["value"];
export type FontSizePreset = (typeof FONT_SIZE_PRESETS)[number]["value"];

export type SerticardConfigData = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
  fontFamily: string;
  fontSizePreset: string;
};

const DEFAULT_CONFIG: SerticardConfigData = {
  customFrontR2Key: null,
  customBackR2Key: null,
  fontFamily: "Arial",
  fontSizePreset: "BESAR",
};

/** Get serticard config - ensures row exists */
export async function getSerticardConfig(): Promise<SerticardConfigData> {
  let row = await prisma.serticardConfig.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.serticardConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...DEFAULT_CONFIG },
      update: {},
    });
  }
  return {
    customFrontR2Key: row.customFrontR2Key,
    customBackR2Key: row.customBackR2Key,
    fontFamily: row.fontFamily,
    fontSizePreset: row.fontSizePreset,
  };
}

/** Update serticard config */
export async function updateSerticardConfig(data: Partial<SerticardConfigData>) {
  await prisma.serticardConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULT_CONFIG, ...data },
    update: data,
  });
  return getSerticardConfig();
}

/** Font size multipliers: BESAR = larger, KECIL = smaller (relative to template width) */
export function getFontSizeMultipliers(preset: FontSizePreset): {
  nameMultiplier: number;
  serialMultiplier: number;
} {
  if (preset === "KECIL") {
    return { nameMultiplier: 0.028, serialMultiplier: 0.032 };
  }
  // BESAR
  return { nameMultiplier: 0.044, serialMultiplier: 0.050 };
}
