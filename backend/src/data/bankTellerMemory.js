import { randomUUID } from "crypto";
import {
  hashPassword,
  randomInvitationToken,
  verifyPasswordHash,
} from "../auth/passwordUtil.js";

/**
 * In-memory Bank Teller model (used when DATABASE_URL unset or as dev companion).
 */

const farmersById = new Map();
const farmersByCode = new Map();

const investorOrgsById = new Map();
const inviteByToken = new Map();
const investorAuthByUserId = new Map();
const farmerAccessByToken = new Map();

function seedFarmers() {
  const id = randomUUID();
  const row = {
    id,
    anonymous_code: "ETH-0042",
    full_name: "Abebe Beyene",
    phone_e164: "+251912345678",
    kebele: "Hidden until scan",
    photo_url: null,
  };
  farmersById.set(id, row);
  farmersByCode.set(row.anonymous_code.toUpperCase(), row);
}

seedFarmers();

export function getFarmerByAnonymousCode(code) {
  if (!code) return null;
  return farmersByCode.get(String(code).trim().toUpperCase()) ?? null;
}

export function getFarmerById(id) {
  return farmersById.get(id) ?? null;
}

export function createInvestorEnrollment(payload, enrolledByUserId) {
  const {
    org_name,
    org_type,
    tin_number,
    contact_name,
    contact_phone,
    contact_email,
    registration_doc_url,
  } = payload;

  const inviteDays = Number(process.env.INVESTOR_INVITATION_EXPIRY_DAYS) || 7;
  const expiresAt = new Date(Date.now() + inviteDays * 86400_000);
  const token = randomInvitationToken();
  const investorOrgId = randomUUID();
  const userId = randomUUID();

  let phoneNorm = String(contact_phone ?? "").replace(/[\s-]/g, "");
  if (!phoneNorm.startsWith("+")) {
    phoneNorm = phoneNorm.startsWith("0") ? `+251${phoneNorm.slice(1)}` : `+251${phoneNorm}`;
  }

  const row = {
    id: investorOrgId,
    user_id: userId,
    org_name: String(org_name || "").trim(),
    org_type: String(org_type || "").trim(),
    tin_number: String(tin_number || "").trim(),
    contact_name: String(contact_name || "").trim(),
    contact_phone: phoneNorm,
    contact_email: String(contact_email || "").trim().toLowerCase(),
    registration_doc_url: registration_doc_url ?? null,
    enrolled_by: enrolledByUserId,
    invitation_token: token,
    invitation_expires_at: expiresAt.toISOString(),
    account_setup_completed_at: null,
    verification_status: "PENDING_VERIFICATION",
    created_at: new Date().toISOString(),
  };

  investorOrgsById.set(investorOrgId, row);
  inviteByToken.set(token, investorOrgId);

  investorAuthByUserId.set(userId, {
    email: row.contact_email,
    password_hash: null,
    investor_org_id: investorOrgId,
  });

  return {
    investor_org: row,
    invitation_token: token,
    magic_link_path: `/investor/setup?token=${token}`,
  };
}

export function getInvitationByToken(token) {
  const orgId = inviteByToken.get(token);
  if (!orgId) return null;
  const org = investorOrgsById.get(orgId);
  if (!org) return null;
  if (new Date(org.invitation_expires_at).getTime() < Date.now()) return { expired: true, org };
  return { expired: false, org };
}

export function completeInvestorSetup(token, password) {
  const inv = getInvitationByToken(token);
  if (!inv || inv.expired) {
    const err = new Error(inv?.expired ? "expired_token" : "invalid_token");
    err.code = inv?.expired ? "INVITE_EXPIRED" : "INVALID_TOKEN";
    throw err;
  }
  const org = inv.org;
  if (org.account_setup_completed_at) {
    const err = new Error("already_completed");
    err.code = "ALREADY_COMPLETED";
    throw err;
  }
  const auth = investorAuthByUserId.get(org.user_id);
  if (!auth) {
    const err = new Error("missing_user");
    err.code = "SERVER_ERROR";
    throw err;
  }
  auth.password_hash = hashPassword(password);
  org.account_setup_completed_at = new Date().toISOString();
  return org;
}

export function findInvestorUserForLogin(username, password) {
  const u = String(username ?? "").trim().toLowerCase();
  for (const [uid, auth] of investorAuthByUserId) {
    if (auth.email !== u) continue;
    if (!auth.password_hash) continue;
    if (!verifyPasswordHash(password, auth.password_hash)) continue;
    const org = [...investorOrgsById.values()].find((o) => o.user_id === uid);
    if (!org) continue;
    return {
      userId: uid,
      full_name: org.org_name,
      phone_e164: org.contact_phone,
      role: "investor",
      investor_org_id: org.id,
    };
  }
  return null;
}

export function listPendingInvestorsForEnroller(enrolledByUserId, isAdmin) {
  const rows = [...investorOrgsById.values()];
  const filtered = isAdmin ? rows : rows.filter((r) => r.enrolled_by === enrolledByUserId);
  return filtered.map((r) => ({
    id: r.id,
    org_name: r.org_name,
    verification_status: r.verification_status,
    invitation_sent: !!r.invitation_token,
    setup_completed: !!r.account_setup_completed_at,
    created_at: r.created_at,
    enrolled_by: r.enrolled_by,
  }));
}

export function recordFarmerAccess(clerkId, farmerId, purpose, ttlMinutes) {
  const ttl = Number(process.env.CLERK_FARMER_ACCESS_TTL_MINUTES) || ttlMinutes || 15;
  const accessToken = randomInvitationToken();
  const expiresAt = new Date(Date.now() + ttl * 60_000);
  farmerAccessByToken.set(accessToken, {
    clerkId,
    farmerId,
    expiresAt,
    purpose: purpose || "DISBURSEMENT",
  });
  return { access_token: accessToken, expires_at: expiresAt.toISOString() };
}

export function consumeFarmerAccessToken(accessToken) {
  const row = farmerAccessByToken.get(accessToken);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    farmerAccessByToken.delete(accessToken);
    return null;
  }
  const farmer = getFarmerById(row.farmerId);
  return { ...row, farmer };
}

/** Single synthetic queue row for clerk UI (anonymous_code visible; name only after verify). */
export function listClerkDisbursementQueue() {
  const farmer = farmersById.values().next().value;
  if (!farmer) return [];
  return [
    {
      investment_id: "demo-inv-1",
      farmer_id: farmer.id,
      anonymous_code: farmer.anonymous_code,
      crop: "Teff",
      stage_current: 2,
      stages_total: 3,
      next_disbursement_etb: 12000,
    },
  ];
}
