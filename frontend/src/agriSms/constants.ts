import type { Locale } from "@/i18n/landing";

/** Canonical region ids — same order as backend `ethiopiaRegions.js` */
export const ETHIOPIA_REGION_IDS = [
  "addis_ababa",
  "afar",
  "amhara",
  "benishangul_gumuz",
  "central_ethiopia",
  "dire_dawa",
  "gambella",
  "harari",
  "oromia",
  "sidama",
  "somali",
  "snnpr",
  "south_west_ethiopia_peoples",
  "tigray",
] as const;

export type EthiopiaRegionId = (typeof ETHIOPIA_REGION_IDS)[number];

/** Localized labels for registration & worker UIs */
export const ETHIOPIA_REGION_LABELS: Record<EthiopiaRegionId, Record<Locale, string>> = {
  addis_ababa: {
    en: "Addis Ababa",
    am: "አዲስ አበባ",
    om: "Finfinnee / Addis Ababa",
  },
  afar: {
    en: "Afar",
    am: "ዓፋር",
    om: "Afaar",
  },
  amhara: {
    en: "Amhara",
    am: "አማራ",
    om: "Amaraa",
  },
  benishangul_gumuz: {
    en: "Benishangul-Gumuz",
    am: "በኒሻንጉል ጉሙዝ",
    om: "Benishaangul-Gumuuz",
  },
  central_ethiopia: {
    en: "Central Ethiopia Region",
    am: "መካከለኛ ኢትዮጵያ ክልል",
    om: "Naannoo Itoophiyaa Giddugaleessaa",
  },
  dire_dawa: {
    en: "Dire Dawa",
    am: "ድሬዳዋ",
    om: "Dirree Dhawaa",
  },
  gambella: {
    en: "Gambella",
    am: "ጋምቤላ",
    om: "Gaambeellaa",
  },
  harari: {
    en: "Harari",
    am: "ሐረሪ",
    om: "Hararii",
  },
  oromia: {
    en: "Oromia",
    am: "ኦሮሚያ",
    om: "Oromiyaa",
  },
  sidama: {
    en: "Sidama",
    am: "ሲዳማ",
    om: "Sidaamaa",
  },
  somali: {
    en: "Somali",
    am: "ሶማሌ",
    om: "Sumalee",
  },
  snnpr: {
    en: "Southern Nations, Nationalities and Peoples (SNNPR)",
    am: "ደቡብ ብሔሮች ብሔረሰቦችና ሕዝቦች",
    om: "Naannoo Biyyoota Kibbaa",
  },
  south_west_ethiopia_peoples: {
    en: "South West Ethiopia Peoples’ Region",
    am: "ደቡብ ምዕራብ ኢትዮጵያ ሕዝቦች ክልል",
    om: "Naannoo Biyyoota Kibba Lixaa Itoophiyaa",
  },
  tigray: {
    en: "Tigray",
    am: "ትግራይ",
    om: "Tigraay",
  },
};

export const DISTRICT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function formatDistrictLabel(n: number, locale: Locale): string {
  if (locale === "am") return `ወረዳ ${n}`;
  if (locale === "om") return `Diristiriktii ${n}`;
  return `District ${n}`;
}

export function regionLabel(id: EthiopiaRegionId, locale: Locale): string {
  return ETHIOPIA_REGION_LABELS[id][locale];
}

/**
 * Demo scope previously used literal village names; workers now use region + district only.
 */
export const DEMO_KEBELE_SCOPE = {
  region: "amhara" as EthiopiaRegionId,
  district: 3,
};
