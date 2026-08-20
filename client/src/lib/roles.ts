// Shared courtroom role presentation helpers.

export const ROLE_COLORS: Record<string, string> = {
  Plaintiff: "#FF1744",
  Defendant: "#4A90D9",
  Judge: "#FFD700",
  Witness: "#2ECC71",
  Narrator: "#FFD700",
};

/** Role color map with section-specific overrides (e.g. a different Narrator accent). */
export function roleColors(overrides: Record<string, string> = {}): Record<string, string> {
  return { ...ROLE_COLORS, ...overrides };
}

/**
 * Story participants are stored as "Name (context)" — strip the parenthetical
 * so only the display name is shown.
 */
export function shortName(participant: string): string {
  return participant.split(" (")[0];
}
