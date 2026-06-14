import {
  SERTICARD_PACKAGES_VARIANTS,
  SERTICARD_STANDARD_VARIANTS,
} from "@/utils/serticard-templates";

type Props = {
  optionClassName?: string;
  includeCustom?: boolean;
  customLabel?: string;
};

export function SerticardTemplateSelectOptions({
  optionClassName = "bg-[#0a0a0a] text-white",
  includeCustom = false,
  customLabel,
}: Props) {
  return (
    <>
      <optgroup label="Serticard A–I">
        {SERTICARD_STANDARD_VARIANTS.map((v) => (
          <option key={v.id} value={v.id} className={optionClassName}>
            {v.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Serticard Packages">
        {SERTICARD_PACKAGES_VARIANTS.map((v) => (
          <option key={v.id} value={v.id} className={optionClassName}>
            {v.label}
          </option>
        ))}
      </optgroup>
      {includeCustom && customLabel ? (
        <option value="custom" className={`${optionClassName} text-[#FFD700] font-semibold`}>
          {customLabel}
        </option>
      ) : null}
    </>
  );
}
