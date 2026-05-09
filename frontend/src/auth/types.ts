export type UserRole = "farmer" | "extension_agent" | "district_admin";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
};

export function roleHome(role: UserRole): string {
  switch (role) {
    case "farmer":
      return "/farmer";
    case "extension_agent":
      return "/agent";
    case "district_admin":
      return "/admin";
    default:
      return "/";
  }
}
