import type { Locale } from "@/i18n/landing";

/** Stored in API field `region_state` — simplified kebele units (localized labels below). */
export const KEBELE_UNIT_IDS = ["kebele_1", "kebele_2", "kebele_3"] as const;

export type SmsKebeleUnitId = (typeof KEBELE_UNIT_IDS)[number];

/** @deprecated Prefer `SmsKebeleUnitId` — legacy name kept for gradual refactors */
export type EthiopiaRegionId = SmsKebeleUnitId;

/** Kept alias for imports expecting `ETHIOPIA_REGION_IDS` */
export const ETHIOPIA_REGION_IDS = KEBELE_UNIT_IDS;

/** Localized kebele list labels (registration + worker UI) */
export const KEBELE_UNIT_LABELS: Record<SmsKebeleUnitId, Record<Locale, string>> = {
  kebele_1: {
    en: "Kebele 1",
    am: "ቀበሌ 1",
    om: "Ganda 1",
  },
  kebele_2: {
    en: "Kebele 2",
    am: "ቀበሌ 2",
    om: "Ganda 2",
  },
  kebele_3: {
    en: "Kebele 3",
    am: "ቀበሌ 3",
    om: "Ganda 3",
  },
};

/** Legacy — use `KEBELE_UNIT_LABELS` */
export const ETHIOPIA_REGION_LABELS = KEBELE_UNIT_LABELS;

export const DISTRICT_NUMBERS = [1, 2, 3, 4, 5] as const;

export function formatDistrictLabel(n: number, locale: Locale): string {
  if (locale === "am") return `ወረዳ ${n}`;
  if (locale === "om") return `Diristiriktii ${n}`;
  return `District ${n}`;
}

export function kebeleUnitLabel(id: SmsKebeleUnitId, locale: Locale): string {
  return KEBELE_UNIT_LABELS[id][locale];
}

/** @deprecated Use `kebeleUnitLabel` — same behaviour */
export function regionLabel(id: SmsKebeleUnitId, locale: Locale): string {
  return kebeleUnitLabel(id, locale);
}

/**
 * Demo worker scope (`kebele` / SMS login).
 */
export const DEMO_KEBELE_SCOPE = {
  region: "kebele_3" as SmsKebeleUnitId,
  district: 3,
};
