"use client";

import { useTranslations } from "next-intl";

export type DistributorFormValues = {
  id?: number;
  distributorName: string;
  storeName: string;
  address: string;
  city: string;
  phone: string;
  mapLink: string | null;
  status: string;
};

type DistributorFormProps = {
  defaultValues: DistributorFormValues | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
};

const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-luxury-gold";
const labelClass = "block text-xs font-medium text-white/70 mb-1";

/**
 * Reusable form for create/edit distributor (Admin CMS).
 * Parent owns modal, API calls, and list refresh.
 */
export function DistributorForm({
  defaultValues,
  onSubmit,
  onCancel,
  saving,
}: DistributorFormProps) {
  const t = useTranslations("admin.distributorsDetail");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>{t("distributorName")}</label>
        <input
          name="distributorName"
          defaultValue={defaultValues?.distributorName ?? ""}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t("storeName")}</label>
        <input
          name="storeName"
          defaultValue={defaultValues?.storeName ?? ""}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t("address")}</label>
        <textarea
          name="address"
          defaultValue={defaultValues?.address ?? ""}
          required
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>{t("city")}</label>
        <input
          name="city"
          defaultValue={defaultValues?.city ?? ""}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t("phone")}</label>
        <input
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone ?? ""}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t("mapLink")}</label>
        <input
          name="mapLink"
          type="url"
          defaultValue={defaultValues?.mapLink ?? ""}
          placeholder="https://..."
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{t("status")}</label>
        <select name="status" defaultValue={defaultValues?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">{t("statusActive")}</option>
          <option value="INACTIVE">{t("statusInactive")}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-luxury-gold px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {saving ? t("saving") : "Save"}
        </button>
      </div>
    </form>
  );
}
