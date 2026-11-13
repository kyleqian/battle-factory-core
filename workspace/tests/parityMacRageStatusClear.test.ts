import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/rage-status-clear.md. TryClearRageStatuses (battle_util.c:1973-1981), called before action 1 of every turn
// (battle_main.c:4925): STATUS2_RAGE is dropped from a battler whose chosen move this turn is not Rage. The engine never
// dropped it. ROM seed 1904: Clefable's Metronome called Rage; in the ROM the flag is gone at the next turn's first action,
// in the engine every later hit kept printing "rage is building" and raising Attack.

const TACKLE = 33;
const RAGE = 99;
const STATUS2_RAGE = 1 << 23;
const STAT_ATK = 1;

function config(rngSeed: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 29,
      moveId: TACKLE,
      moves: [TACKLE, RAGE, 0, 0],
      pp: [35, 20, 0, 0],
      attack: 100,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 50,
      hp: 500,
    },
    trainer: {
      species: 32,
      moveId: TACKLE,
      moves: [TACKLE, 0, 0, 0],
      pp: [35, 0, 0, 0],
      attack: 80,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 100, // moves first every turn
      hp: 500,
    },
  };
}

/** Plays one turn (player slot, trainer Tackle) and returns the next turn's state. */
function turn(state: ReturnType<typeof createFactoryFullTurnBattleState>, requestId: number, playerSlot: 0 | 1) {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId, side: "player", decision: { kind: "use-move", moveSlot: playerSlot, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
  const done = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (done.kind !== "decision-required") throw new Error("expected the next turn's player command");
  return done;
}

/** First seed whose two turns land every hit, so both arms compare the same battle. */
function afterRageTurn(seed: number) {
  const first = turn(createFactoryFullTurnBattleState(config(seed)), 1, 1);
  const player = first.state.rules.rulesContext.battlers[0];
  // The trainer hit first, before Rage was up: no Attack rise yet. Then the player's Rage landed and set the flag.
  expect(player.status2 & STATUS2_RAGE).toBe(STATUS2_RAGE);
  expect(player.statStages[STAT_ATK]).toBe(6);
  return first;
}

describe("TryClearRageStatuses: Rage lasts only while Rage is the chosen move", () => {
  it("choosing another move drops the flag before the first action: the foe's hit raises no Attack", () => {
    const first = afterRageTurn(3);
    const second = turn(first.state, 3, 0); // Tackle, not Rage
    const player = second.state.rules.rulesContext.battlers[0];
    expect(player.hp).toBeLessThan(first.state.rules.rulesContext.battlers[0].hp); // the foe's Tackle landed
    expect(player.status2 & STATUS2_RAGE).toBe(0); // unfixed: still set
    expect(player.statStages[STAT_ATK]).toBe(6); // unfixed: 7
    const messages = second.events.flatMap(({ payload }) => (payload.kind === "message" ? [payload.messageId] : []));
    expect(messages).not.toContain("STRINGID_PKMNRAGEBUILDING");
  });

  it("control: choosing Rage again keeps the flag, and the foe's hit raises Attack", () => {
    const first = afterRageTurn(3);
    const second = turn(first.state, 3, 1); // Rage again
    const player = second.state.rules.rulesContext.battlers[0];
    expect(player.hp).toBeLessThan(first.state.rules.rulesContext.battlers[0].hp);
    expect(player.status2 & STATUS2_RAGE).toBe(STATUS2_RAGE);
    expect(player.statStages[STAT_ATK]).toBe(7);
  });
});
