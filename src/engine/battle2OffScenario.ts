import type { BattleTurnScenario } from "./battleTurn.ts";

/** Source/RAM-pinned fixture from docs/battle2-off-portability-notes.md. */
export const BATTLE2_OFF_TURN1_SCENARIO: BattleTurnScenario = {
  id: "battle2-off-turn1",
  initial: {
    player: {
      name: "ONIX",
      hp: 117,
      maxHp: 117,
      status: "none",
      accuracyStage: 6,
      moves: { "ROCK SLIDE": 10 },
    },
    opponent: {
      name: "KABUTO",
      hp: 91,
      maxHp: 91,
      status: "none",
      accuracyStage: 6,
      moves: { "SAND-ATTACK": 15 },
    },
    rngValue: 3530724670,
  },
  actions: [
    {
      type: "damage",
      actor: "player",
      target: "opponent",
      move: "ROCK SLIDE",
      damage: 28,
      rng: ["accuracy", "damageSpread", "secondary"],
    },
    {
      type: "stat",
      actor: "opponent",
      target: "player",
      move: "SAND-ATTACK",
      stat: "accuracy",
      stages: -1,
      rng: ["accuracy"],
    },
  ],
  turnEndRngGroups: [1, 2, 5],
};

/**
 * Relative OFF command durations from the confirm edge. They sum to the
 * source/RAM-pinned +405 next-controller readiness boundary.
 */
export const BATTLE2_OFF_TURN1_COMMAND_DURATIONS = [
  145, 1, 14, 100, 1, 50, 89, 4, 1,
] as const;
