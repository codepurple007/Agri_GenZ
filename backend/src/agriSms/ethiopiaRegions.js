/** Canonical region ids (ASCII) for API / storage — matches frontend `agriSms/constants`. */
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
];

const REGION_SET = new Set(ETHIOPIA_REGION_IDS);

export function isValidRegionId(id) {
  return typeof id === "string" && REGION_SET.has(id);
}

/** @param {unknown} n */
export function normalizeDistrictNumber(n) {
  const x = Number(n);
  if (!Number.isInteger(x) || x < 1 || x > 9) return null;
  return x;
}

/** Readable English area line for SMS headers (region + district). */
export function fallbackLocationEnglish(regionId, districtNum) {
  const titles = {
    addis_ababa: "Addis Ababa",
    afar: "Afar",
    amhara: "Amhara",
    benishangul_gumuz: "Benishangul-Gumuz",
    central_ethiopia: "Central Ethiopia",
    dire_dawa: "Dire Dawa",
    gambella: "Gambella",
    harari: "Harari",
    oromia: "Oromia",
    sidama: "Sidama",
    somali: "Somali",
    snnpr: "SNNPR",
    south_west_ethiopia_peoples: "South West Ethiopia Peoples",
    tigray: "Tigray",
  };
  const t = titles[regionId] ?? String(regionId);
  return `${t} · District ${districtNum}`;
}

export function smsHeaderAreaEnglish(regionId, districtNum) {
  return fallbackLocationEnglish(regionId, districtNum);
}
