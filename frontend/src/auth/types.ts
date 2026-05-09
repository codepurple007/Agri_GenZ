export type UserRole =
  | "farmer"
  | "extension_agent"
  | "district_admin"
  | "clerk"
  | "enrollment_clerk"
  | "investor"
  | "kebele_worker";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  /** SMS clerk kebele unit id: kebele_1 | kebele_2 | kebele_3 */
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
    default:
      return "/";
  }
}
