import type { StaffProficiencyLevel } from "@/types/location";

export type StaffProficiencyPillKind = "supported" | "unknown" | "limited" | "unsupported";

export interface StaffProficiencyOption {
  level: StaffProficiencyLevel;
  label: string;
  description: string;
  badgeClassName: string;
  cardClassName: string;
  pillKind: StaffProficiencyPillKind;
}

export const STAFF_PROFICIENCY_OPTIONS: StaffProficiencyOption[] = [
  {
    level: 1,
    label: "Completely Unfamiliar",
    description: "Has never used a POS device and does not know the basic workflow.",
    badgeClassName: "bg-[#FEF2F2] text-[#B42318] ring-1 ring-inset ring-[#FECACA]",
    cardClassName: "border-[#FECACA] bg-[#FFF7F7]",
    pillKind: "unsupported"
  },
  {
    level: 2,
    label: "Knows the Basics",
    description: "Understands what the POS is for but cannot complete a transaction alone.",
    badgeClassName: "bg-[#FFF7ED] text-[#C2410C] ring-1 ring-inset ring-[#FED7AA]",
    cardClassName: "border-[#FED7AA] bg-[#FFFBF5]",
    pillKind: "limited"
  },
  {
    level: 3,
    label: "Needs Guided Operation",
    description: "Can finish basic checkout steps with docs or someone guiding them.",
    badgeClassName: "bg-[#FFFBEA] text-[#A16207] ring-1 ring-inset ring-[#FDE68A]",
    cardClassName: "border-[#FDE68A] bg-[#FFFDF5]",
    pillKind: "unknown"
  },
  {
    level: 4,
    label: "Independent Operator",
    description: "Can independently handle everyday checkout and refund flows.",
    badgeClassName: "bg-[#ECFDF3] text-[#027A48] ring-1 ring-inset ring-[#A7F3D0]",
    cardClassName: "border-[#A7F3D0] bg-[#F5FFF9]",
    pillKind: "supported"
  },
  {
    level: 5,
    label: "Highly Proficient",
    description: "Comfortably handles advanced features, reports, and exception cases.",
    badgeClassName: "bg-[#E8FFF4] text-[#05603A] ring-1 ring-inset ring-[#6EE7B7]",
    cardClassName: "border-[#6EE7B7] bg-[#F2FFF8]",
    pillKind: "supported"
  }
];

const STAFF_PROFICIENCY_OPTION_MAP = new Map(
  STAFF_PROFICIENCY_OPTIONS.map((option) => [option.level, option] as const)
);

export function normalizeStaffProficiencyLevel(value: unknown): StaffProficiencyLevel | null {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (numericValue >= 1 && numericValue <= 5 && Number.isInteger(numericValue)) {
    return numericValue as StaffProficiencyLevel;
  }

  return null;
}

export function getStaffProficiencyOption(level: StaffProficiencyLevel | null | undefined): StaffProficiencyOption | null {
  if (!level) {
    return null;
  }

  return STAFF_PROFICIENCY_OPTION_MAP.get(level) || null;
}

export function formatStaffProficiencyLevelLabel(level: StaffProficiencyLevel): string {
  return `Level ${level}`;
}

export function formatStaffProficiencyValue(option: StaffProficiencyOption): string {
  return `${formatStaffProficiencyLevelLabel(option.level)} · ${option.label}`;
}
