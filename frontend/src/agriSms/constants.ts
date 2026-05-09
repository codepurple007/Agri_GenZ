/** Village / kebele labels aligned with SRS examples and demo seed data. */
export const KEBELE_VILLAGES = ["Bako", "Guto Gida", "Chaliya"] as const;

export type KebeleVillage = (typeof KEBELE_VILLAGES)[number];
