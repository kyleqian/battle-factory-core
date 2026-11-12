// Harness-only player-name override (pnm273). The oracle save's player is
// "MEMORY"; the app prints "PLAYER" by default. Importing this module FIRST
// makes `src/engine/playerName.ts` evaluate to the oracle name so ROM-pixel
// comparisons over the {PLAYER} message boxes stay byte-exact.
// POKEBENCH_HARNESS_PLAYER_NAME=PLAYER renders the production name instead
// (used by the differential to show the production-mode change).
// Skipped under vitest: the suite runs with isolate:false, so a process
// global set by one test file's appTrace import would leak into every later file.
const name = process.env.VITEST === undefined ? (process.env.POKEBENCH_HARNESS_PLAYER_NAME ?? "MEMORY") : undefined;
if (name !== undefined) (globalThis as { __POKEBENCH_PLAYER_NAME__?: string }).__POKEBENCH_PLAYER_NAME__ = name;
export const HARNESS_PLAYER_NAME = name;
