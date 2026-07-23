import { advanceRngValue } from "./rng.ts";

/**
 * PlayerHandleChooseAction is scheduled from the encounter's send-out
 * handoff. Battle 2 clears B_WIN_MSG at handoff+325, waits six displayed
 * frames for the off-screen BG0 DMA, and reveals the input-ready action menu
 * at handoff+331. A fresh replay of the exact canonical ground-truth segments
 * corrected the earlier dossier's +280/+286 claim. (The renderer's handoff
 * tick is the first post-text controller frame, two displays before the
 * dossier's earlier visual label.)
 */
export const ACTION_MENU_BLANK_START_OFFSET = 325;
export const ACTION_MENU_BLANK_END_OFFSET = 330;
export const ACTION_MENU_REVEAL_OFFSET = 331;

export const BATTLE2_ACTION_MENU_MODEL = {
  encounter: "jenson",
  promptBattler: "ONIX",
  options: ["FIGHT", "BAG", "POKéMON", "RUN"],
  cursor: 0,
  player: {
    species: 95,
    name: "ONIX",
    level: 50,
    hp: 117,
    maxHP: 117,
    gender: "male" as const,
  },
  opponent: {
    species: 140,
    name: "KABUTO",
    level: 50,
    hp: 91,
    maxHP: 91,
    gender: "male" as const,
  },
} as const;

export function actionMenuAge(t: number, handoffTick: number): number {
  return t - handoffTick;
}

export function actionMenuInputReady(t: number, handoffTick: number): boolean {
  return actionMenuAge(t, handoffTick) >= ACTION_MENU_REVEAL_OFFSET;
}

/** Rebase a later encounter's action-menu bounce onto Battle 1's proven epoch. */
export function actionMenuBounceTick(t: number, handoffTick: number): number {
  return 1748 + actionMenuAge(t, handoffTick) - ACTION_MENU_REVEAL_OFFSET;
}

/**
 * Source/RAM-pinned on-demand Random() calls before the first turn. These
 * are cumulative counts from the stable pre-menu seed, not per-VBlank calls:
 * the frontier-battle ownership gate remains closed throughout.
 */
export function battle2PreTurnRngCalls(t: number, handoffTick: number): number {
  const age = actionMenuAge(t, handoffTick);
  if (age >= 330) return 8;
  if (age >= 328) return 3;
  if (age >= 324) return 1;
  return 0;
}

export function advanceBattle2PreTurnRng(seed: number, calls: number): number {
  let value = seed;
  for (let i = 0; i < calls; i += 1) value = advanceRngValue(value);
  return value;
}
