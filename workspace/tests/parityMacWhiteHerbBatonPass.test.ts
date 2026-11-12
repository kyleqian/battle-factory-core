import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/white-herb-baton-pass.md. Baton Pass hands the passer's stat stages to the new battler
// (Cmd_switchindataupdate, battle_script_commands.c:4648-4653); Cmd_switchineffects then runs
// ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN) (:5266, battle_util.c:3305-3330): a White Herb holder restores the lowered
// stages at once, before the other side moves. The engine called this unreachable and left the herb for a later item pass.
// ROM (Mechanic Lab): Jolteon passes Attack -1 to a White Herb Snorlax; stage 6 and no item before Arcanine's move.

const TACKLE = 33;
const BATON_PASS = 226;
const SPLASH = 150;
const WHITE_HERB = 180;
const SPECIES_WOBBUFFET = 202;

function config(): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: {
      species: SPECIES_WOBBUFFET, moveId: TACKLE,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 1, hp: 300,
    },
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: BATON_PASS,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200, hp: 300,
      // Defense -2, handed over by Baton Pass
      statStages: [6, 6, 4, 6, 6, 6, 6, 6] as [number, number, number, number, number, number, number, number],
    },
    trainerBenchHp: [200, 0] as [number, number],
    trainerBenchOverride: [{
      species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: WHITE_HERB,
      maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100,
    }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

function commandDecisions(state: ReturnType<typeof createFactoryFullTurnBattleState>) {
  const boundary = state.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
  return boundary.request.legalDecisions;
}

describe("White Herb on a Baton Pass switch-in", () => {
  it("restores the handed-over stage at switch-in, before the foe's move, and the herb is used up", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: commandDecisions(initial).find((d) => d.kind === "use-move")!,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
    const done = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: commandDecisions(afterPlayer.state).find((d) => d.kind === "use-move")!,
    });
    if (done.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(done.barrier)}`);
    const rules = done.state.rules.rulesContext;
    const receiver = rules.battlers[1];
    expect(receiver.partyIndex).toBe(1); // the bench Pokemon came in
    expect(receiver.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(receiver.item).toBe(0);
    // Order: Baton Pass, the herb message, then the player's Tackle (the foe's move comes after the restore).
    const steps = done.events.flatMap(({ payload }) =>
      payload.kind === "message" && (payload.messageId === "STRINGID_USEDMOVE" || payload.messageId === "STRINGID_PKMNSITEMRESTOREDSTATUS")
        ? [payload.messageId]
        : []);
    expect(steps).toEqual(["STRINGID_USEDMOVE", "STRINGID_PKMNSITEMRESTOREDSTATUS", "STRINGID_USEDMOVE"]);
  });
});
