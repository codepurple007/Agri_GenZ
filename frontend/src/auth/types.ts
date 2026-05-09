export type UserRole =
  | "farmer"
  | "extension_agent"
  | "district_admin"
  | "clerk"
  | "enrollment_clerk"
  | "investor"
  | "kebele_worker"
  | "voice_recorder_officer"
  | "superadmin";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  /** SMS clerk kebele unit id: kebele_1 … kebele_4 */
  smsRegion?: string;
  /** District 1–5 within that unit */
  smsDistrict?: number;
};

export function roleHome(role: UserRole): string {
  switch (role) {
    case "farmer":
      return "/farmer";
    case "clerk":
      return "/clerk/dashboard";
    case "enrollment_clerk":
      return "/clerk/dashboard";
    case "investor":
      return "/investor/dashboard";
    case "extension_agent":
      return "/agent";
    case "district_admin":
      return "/admin";
    case "kebele_worker":
      return "/kebele/farmers";
    case "voice_recorder_officer":
      return "/voice-recorder";
    case "superadmin":
      return "/superadmin/staff";
    default:
      return "/";
  }
}
