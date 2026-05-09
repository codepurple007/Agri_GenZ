/** Canonical IDs stored in `region_state` — kebele units (matches frontend `KEBELE_UNIT_IDS`). */
export const KEBELE_UNIT_IDS = ["kebele_1", "kebele_2", "kebele_3", "kebele_4"];

const KEBELE_SET = new Set(KEBELE_UNIT_IDS);

export function isValidRegionId(id) {
  return typeof id === "string" && KEBELE_SET.has(id);
}

/** @param {unknown} n District within kebele (1–5) */
export function normalizeDistrictNumber(n) {
  const x = Number(n);
  if (!Number.isInteger(x) || x < 1 || x > 5) return null;
  return x;
}

const EN_TITLES = {
  kebele_1: "Kebele 1",
  kebele_2: "Kebele 2",
  kebele_3: "Kebele 3",
  kebele_4: "Kebele 4",
};

/** English line for SMS headers / Gemini (API supports three UI languages separately). */
export function fallbackLocationEnglish(kebeleUnitId, districtNum) {
  const t = EN_TITLES[kebeleUnitId] ?? String(kebeleUnitId);
  return `${t} · District ${districtNum}`;
}

export function smsHeaderAreaEnglish(kebeleUnitId, districtNum) {
  return fallbackLocationEnglish(kebeleUnitId, districtNum);
}

/** @deprecated Prefer KEBELE_UNIT_IDS — kept if old imports referenced regions */
export const ETHIOPIA_REGION_IDS = KEBELE_UNIT_IDS;
