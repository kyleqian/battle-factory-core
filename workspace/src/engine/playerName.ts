// The player's name as printed by every message that expands `{PLAYER}`.
// Default is "PLAYER" (user decision 2026-11-12); the oracle save's "MEMORY"
// is reproduced only by the ROM-comparison harness (tools/compare/harnessPlayerName.ts),
// which sets the global below before this module is first evaluated.
const harnessOverride = (globalThis as { __POKEBENCH_PLAYER_NAME__?: unknown }).__POKEBENCH_PLAYER_NAME__;

export const PLAYER_NAME: string = typeof harnessOverride === "string" && harnessOverride.length > 0 ? harnessOverride : "PLAYER";
