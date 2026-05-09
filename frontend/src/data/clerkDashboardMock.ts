/**
 * Dummy data for clerk dashboard (Bank Teller + Disbursement) — demo mode only.
 */

export type InvitationUiStatus = "Sent" | "Opened" | "Password Set" | "Completed";
export type AdminVerificationUi = "Pending" | "Verified" | "Rejected";

export type MockEnrollmentRow = {
  id: string;
  org_name: string;
  tin_last4: string;
  contact_name: string;
  invitation_status: InvitationUiStatus;
  admin_status: AdminVerificationUi;
  enrolled_at: string;
  older_than_3d_invite: boolean;
};

export type MockDisbursementQueueRow = {
  investment_id: string;
  farmer_code: string;
  investor_code: string;
  purpose: string;
  total_etb: number;
  stage_current: number;
  stages_total: number;
  next_due: string;
  status: "Overdue" | "Pending" | "On Track";
  overdue_days?: number;
};

export type MockStage = {
  label: string;
  amount_etb: number;
  planned_date: string;
  status: "disbursed" | "pending" | "upcoming";
};

export type MockInvestmentCard = {
  id: string;
  farmer_code: string;
  investor_code: string;
  center: string;
  total_etb: number;
  purpose: string;
  stages: MockStage[];
};

export type MockNotification = {
  id: string;
  level: "info" | "warning" | "success";
  title: string;
  body: string;
  time: string;
};

export const MOCK_CENTER = "Bako AgriService Center";
export const MOCK_WOREDA = "Bako";

/** Service hub teaser stats (Clerk–Farmer platform spec — demo). */
export const CLERK_SERVICE_HUB_STATS = {
  pendingQuestions: 12,
  activeAlerts: 3,
  preOrdersWeek: 8,
  farmersListed: 45,
  gapAreas: 3,
  activeOffers: 6,
} as const;

export const MOCK_ENROLLMENTS: MockEnrollmentRow[] = [
  {
    id: "e1",
    org_name: "North Shewa Growers Cooperative",
    tin_last4: "7821",
    contact_name: "Almaz Tadesse",
    invitation_status: "Password Set",
    admin_status: "Pending",
    enrolled_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    older_than_3d_invite: false,
  },
  {
    id: "e2",
    org_name: "Jimma Coffee Union",
    tin_last4: "4402",
    contact_name: "Kebede Haile",
    invitation_status: "Sent",
    admin_status: "Pending",
    enrolled_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    older_than_3d_invite: true,
  },
];

export const MOCK_DISBURSEMENT_QUEUE: MockDisbursementQueueRow[] = [
  {
    investment_id: "demo-inv-1",
    farmer_code: "ETH-0042",
    investor_code: "INV-8912",
    purpose: "Ox-drawn plough",
    total_etb: 12500,
    stage_current: 2,
    stages_total: 3,
    next_due: "2026-05-15",
    status: "Overdue",
    overdue_days: 3,
  },
  {
    investment_id: "inv-7721",
    farmer_code: "ETH-1122",
    investor_code: "INV-4450",
    purpose: "Soil improvement & lime",
    total_etb: 8200,
    stage_current: 1,
    stages_total: 2,
    next_due: "2026-05-20",
    status: "Pending",
  },
  {
    investment_id: "inv-8801",
    farmer_code: "ETH-9901",
    investor_code: "INV-2299",
    purpose: "Irrigation hose roll",
    total_etb: 4300,
    stage_current: 1,
    stages_total: 3,
    next_due: "2026-06-01",
    status: "On Track",
  },
];

export const MOCK_INVESTMENT_CARDS: MockInvestmentCard[] = [
  {
    id: "demo-inv-1",
    farmer_code: "ETH-0042",
    investor_code: "INV-8912",
    center: MOCK_CENTER,
    total_etb: 12500,
    purpose: "Ox-drawn plough",
    stages: [
      {
        label: "Stage 1: Land prep",
        amount_etb: 4000,
        planned_date: "2026-04-01",
        status: "disbursed",
      },
      {
        label: "Stage 2: Equipment",
        amount_etb: 5000,
        planned_date: "2026-05-15",
        status: "pending",
      },
      {
        label: "Stage 3: Training",
        amount_etb: 3500,
        planned_date: "2026-06-15",
        status: "upcoming",
      },
    ],
  },
  {
    id: "inv-7721",
    farmer_code: "ETH-1122",
    investor_code: "INV-4450",
    center: MOCK_CENTER,
    total_etb: 8200,
    purpose: "Soil improvement & lime",
    stages: [
      {
        label: "Stage 1: Inputs bundle",
        amount_etb: 4200,
        planned_date: "2026-04-10",
        status: "disbursed",
      },
      {
        label: "Stage 2: Follow-up visit",
        amount_etb: 4000,
        planned_date: "2026-05-22",
        status: "pending",
      },
    ],
  },
];

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "n1",
    level: "warning",
    title: "Overdue disbursement",
    body: "Stage 2 for Farmer ETH-0042 is overdue by 3 days.",
    time: "10 min ago",
  },
  {
    id: "n2",
    level: "info",
    title: "Investor funded escrow",
    body: "Investor INV-4450 funded escrow for ETH-1122 — ready to disburse Stage 2.",
    time: "1 h ago",
  },
  {
    id: "n3",
    level: "success",
    title: "Admin approval received",
    body: "Investment INV-8801 approved for disbursement.",
    time: "Yesterday",
  },
];

export function clerkDashboardStats() {
  const today = new Date().toDateString();
  const enrollToday = MOCK_ENROLLMENTS.filter((e) => new Date(e.enrolled_at).toDateString() === today).length;
  const pendingAdmin = MOCK_ENROLLMENTS.filter((e) => e.admin_status === "Pending").length;
  const staleInvites = MOCK_ENROLLMENTS.filter((e) => e.older_than_3d_invite && e.invitation_status !== "Completed").length;

  const dueToday = MOCK_DISBURSEMENT_QUEUE.filter((r) => r.status === "Pending" || r.status === "Overdue").length;
  const overdue = MOCK_DISBURSEMENT_QUEUE.filter((r) => r.status === "Overdue").length;
  const upcoming7 = MOCK_DISBURSEMENT_QUEUE.filter((r) => r.status === "On Track").length;
  const completedMonth = 12;

  const severelyOverdue = MOCK_DISBURSEMENT_QUEUE.filter((r) => (r.overdue_days ?? 0) > 7).length;

  return {
    enrollment: {
      today: enrollToday || 2,
      pendingAdmin,
      staleInvites,
    },
    disbursement: {
      dueToday: Math.max(dueToday, 1),
      overdue,
      upcoming7,
      completedMonth,
      severelyOverdue,
    },
  };
}

export type MockFarmerLookupResult = {
  full_name_am: string;
  full_name_en: string;
  phone: string;
  kebele: string;
  woreda: string;
  land_ha: string;
  crops: string;
  photo_url: string | null;
  prior_investments: { code: string; amount_etb: number; year: string }[];
  disbursements: { date: string; stage: string; amount_etb: number }[];
};

export const MOCK_FARMER_LOOKUP: Record<string, MockFarmerLookupResult> = {
  "ETH-0042": {
    full_name_am: "አበበ በየኔ",
    full_name_en: "Abebe Beyene",
    phone: "+251 91 234 5678",
    kebele: "Gudo Babo",
    woreda: "Bako Tibe",
    land_ha: "2.4 ha",
    crops: "Teff, wheat",
    photo_url: null,
    prior_investments: [{ code: "INV-2201", amount_etb: 4800, year: "2024" }],
    disbursements: [{ date: "2026-04-02", stage: "Land prep", amount_etb: 4000 }],
  },
};
