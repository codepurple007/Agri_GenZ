import type { AuthUser } from "@/auth/types";
import {
  DEMO_KEBELE_SCOPE,
  ETHIOPIA_REGION_IDS,
  type EthiopiaRegionId,
  formatDistrictLabel,
  regionLabel,
} from "@/agriSms/constants";
import type { Locale } from "@/i18n/landing";

export function coalesceDistrictNum(v: unknown): number | undefined {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 9) return undefined;
  return n;
}

function isEthRegionId(id: string): id is EthiopiaRegionId {
  return (ETHIOPIA_REGION_IDS as readonly string[]).includes(id);
}

/**
 * Clerk login scope for AgriSMS: region id + district 1–9, with sane defaults for `kebele_worker`.
 */
export function resolveSmsWorkerJurisdiction(user: AuthUser | null): {
  regionId: EthiopiaRegionId | undefined;
  districtNum: number | undefined;
} {
  const isKebele = user?.role === "kebele_worker";

  let regionId: EthiopiaRegionId | undefined;
  const rawRg = typeof user?.smsRegion === "string" ? user.smsRegion.trim() : "";
  if (rawRg && isEthRegionId(rawRg)) regionId = rawRg;
  else if (isKebele) regionId = DEMO_KEBELE_SCOPE.region;

  let districtNum = coalesceDistrictNum(user?.smsDistrict);
  if (districtNum == null && isKebele) districtNum = DEMO_KEBELE_SCOPE.district;

  return { regionId, districtNum };
}

export function formatJurisdictionLine(
  regionId: EthiopiaRegionId | undefined,
  districtNum: number | undefined,
  locale: Locale,
): string {
  if (regionId != null && districtNum != null) {
    return `${regionLabel(regionId, locale)} · ${formatDistrictLabel(districtNum, locale)}`;
  }
  return "—";
}

const KEBELE_COMPOUND = /^([a-z0-9_]+)-d(\d+)$/i;

export function farmerJurisdictionLine(
  row: {
    region_state?: string;
    district_number?: number;
    kebele: string;
  },
  locale: Locale,
): string {
  let rid = typeof row.region_state === "string" && isEthRegionId(row.region_state) ? row.region_state : undefined;
  let dn = coalesceDistrictNum(row.district_number);
  const m = row.kebele.match(KEBELE_COMPOUND);
  if ((!rid || dn == null) && m) {
    const [, rRaw, dRaw] = m;
    if (!rid && rRaw && isEthRegionId(rRaw)) rid = rRaw;
    if (dn == null) dn = coalesceDistrictNum(Number(dRaw));
  }
  return formatJurisdictionLine(rid, dn, locale);
}
