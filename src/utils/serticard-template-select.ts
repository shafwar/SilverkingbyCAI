import type { SerticardVariantId } from "@/utils/serticard-templates";

/** Value stored in QR preview template `<select>` state */
export type SerticardTemplateSelectValue = string;

export function templateSelectToApiBody(value: string): {
  templateVariant: SerticardVariantId | string;
  useCustomTemplate: boolean;
  cmsTemplateId?: number;
} {
  if (value.startsWith("cms:")) {
    const id = Number(value.slice(4));
    return {
      templateVariant: "01",
      useCustomTemplate: false,
      cmsTemplateId: Number.isFinite(id) && id > 0 ? id : undefined,
    };
  }
  if (value === "custom") {
    return { templateVariant: "01", useCustomTemplate: true };
  }
  return { templateVariant: value, useCustomTemplate: false };
}
