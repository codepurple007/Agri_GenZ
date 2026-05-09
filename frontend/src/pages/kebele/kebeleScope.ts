import type { AuthUser } from "@/auth/types";
import {
  DEMO_KEBELE_SCOPE,
  KEBELE_UNIT_IDS,
  type SmsKebeleUnitId,
  formatDistrictLabel,
  kebeleUnitLabel,
} from "@/agriSms/constants";
import type { Locale } from "@/i18n/landing";

export function coalesceDistrictNum(v: unknown): number | undefined {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) return undefined;
  return n;
}

function isSmsKebeleUnitId(id: string): id is SmsKebeleUnitId {
  return (KEBELE_UNIT_IDS as readonly string[]).includes(id);
}

/**
 * Clerk login scope: kebele unit + district 1–5, with sane defaults for `kebele_worker`.
 */
export function resolveSmsWorkerJurisdiction(user: AuthUser | null): {
  regionId: SmsKebeleUnitId | undefined;
  districtNum: number | undefined;
} {
  const isWorker = user?.role === "kebele_worker";

  let regionId: SmsKebeleUnitId | undefined;
  const rawRg = typeof user?.smsRegion === "string" ? user.smsRegion.trim() : "";
  if (rawRg && isSmsKebeleUnitId(rawRg)) regionId = rawRg;
  else if (isWorker) regionId = DEMO_KEBELE_SCOPE.region;

  let districtNum = coalesceDistrictNum(user?.smsDistrict);
  if (districtNum == null && isWorker) districtNum = DEMO_KEBELE_SCOPE.district;

  return { regionId, districtNum };
}

export function formatJurisdictionLine(
  regionId: SmsKebeleUnitId | undefined,
  districtNum: number | undefined,
  locale: Locale,
): string {
  if (regionId != null && districtNum != null) {
    return `${kebeleUnitLabel(regionId, locale)} · ${formatDistrictLabel(districtNum, locale)}`;
  }
  return "—";
}

const KEBELE_COMPOUND = /^([\w\d_]+)-d(\d+)$/i;

export function farmerJurisdictionLine(
  row: {
    region_state?: string;
    district_number?: number;
    kebele: string;
  },
  locale: Locale,
): string {
  let rid =
    typeof row.region_state === "string" && isSmsKebeleUnitId(row.region_state) ? row.region_state : undefined;
  let dn = coalesceDistrictNum(row.district_number);
  const m = row.kebele.match(KEBELE_COMPOUND);
  if ((!rid || dn == null) && m) {
    const [, rRaw, dRaw] = m;
    if (!rid && rRaw && isSmsKebeleUnitId(rRaw)) rid = rRaw;
    if (dn == null) dn = coalesceDistrictNum(Number(dRaw));
  }
  return formatJurisdictionLine(rid, dn, locale);
}
