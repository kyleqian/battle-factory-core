import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/forced-struggle-never-started.md (fix 35). A Pokemon with no usable move has `gProtectStructs[].noValidMoves` set at selection
// (AreAllMovesUnusable, battle_util.c:1125-1140). HandleAction_UseMove clears it when the forced Struggle starts (:100-102). When the faster Pokemon
// faints from its own move and its replacement comes in at once, `cancelallactions` (battle_scripts_1.s:2895) drops the Struggle: the flag stays, and
// the end-of-turn sort (ENDTURN_ORDER, GetWhoStrikesFirst battle_main.c:4700) reads Struggle's priority 0 for that Pokemon, not the +3 of the Endure
// its cursor points at. ROM (Mechanic Lab): the faster replacement takes the sandstorm first.

const SELFDESTRUCT = 120;
const ENDURE = 203;
const SPLASH = 150;
const SPECIES_WOBBUFFET = 202;
const WEATHER_SANDSTORM = 0x18;

function config(trainerPp: readonly [number, number, number, number]): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 7,
    weather: WEATHER_SANDSTORM,
    player: {
      species: SPECIES_WOBBUFFET, moveId: SELFDESTRUCT,
      attack: 5, defense: 100, spAttack: 100, spDefense: 100, speed: 100, hp: 100,
    },
    // slower than both player Pokemon; every move is Endure (priority +3)
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: ENDURE, moves: [ENDURE, ENDURE, ENDURE, ENDURE], pp: trainerPp,
      attack: 100, defense: 200, spAttack: 100, spDefense: 100, speed: 50, hp: 300,
    },
    playerBenchHp: [200, 0] as [number, number],
    playerBenchOverride: [{
      species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0,
      maxHP: 200, attack: 80, defense: 100, speed: 150, spAttack: 40, spDefense: 100,
    }, undefined] as FactoryFullTurnConfig["playerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

/** The player's faster Pokemon uses Selfdestruct, the replacement comes in, the turn ends. Returns who the sandstorm hits, in order. */
function sandstormOrderAfterSelfdestruct(trainerPp: readonly [number, number, number, number]) {
  const initial = createFactoryFullTurnBattleState(config(trainerPp));
  const first = initial.boundary;
  if (first?.kind !== "decision-required" || first.request.kind !== "command") throw new Error("expected the player's command");
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: first.request.legalDecisions.find((d) => d.kind === "use-move")! });
  if (afterPlayer.kind !== "decision-required" || afterPlayer.nextRequest.kind !== "command") throw new Error("expected the trainer's command");
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer", decision: afterPlayer.nextRequest.legalDecisions.find((d) => d.kind === "use-move")!,
  });
  if (afterTrainer.kind !== "decision-required" || afterTrainer.nextRequest.kind !== "forced-switch") {
    throw new Error(`expected the player's replacement choice, got ${afterTrainer.kind}`);
  }
  const done = submitFactoryFullTurnDecision(afterTrainer.state, {
    requestId: afterTrainer.nextRequest.requestId, side: "player", decision: { kind: "switch", partyIndex: afterTrainer.nextRequest.legalPartyIndexes[0]! },
  });
  if (done.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(done.barrier)}`);
  const all = [...afterTrainer.events, ...done.events];
  const steps = all.flatMap(({ payload }) =>
    payload.kind === "message" ? [payload.messageId] : payload.kind === "hp-change" ? [`hp-change:${(payload as { battler: number }).battler}`] : []);
  const struggled = steps.includes("STRINGID_USEDMOVE") && all.some(({ payload }) => payload.kind === "message" && payload.messageId === "STRINGID_PKMNHITWITHRECOIL");
  return { storm: steps.slice(steps.indexOf("STRINGID_SANDSTORMRAGES")).filter((s) => s.startsWith("hp-change:")).slice(0, 2), struggled, rules: done.state.rules.rulesContext };
}

describe("a forced Struggle that never starts keeps the no-valid-moves flag for the end-of-turn order", () => {
  it("the Pokemon with no usable move sorts as Struggle (priority 0): the faster replacement takes the sandstorm first", () => {
    const { storm, struggled } = sandstormOrderAfterSelfdestruct([0, 0, 0, 0]);
    expect(struggled).toBe(false); // its Struggle was cancelled with the rest of the turn
    expect(storm).toEqual(["hp-change:0", "hp-change:1"]);
  });

  it("control: with PP its chosen Endure (+3) is read, and it takes the sandstorm first", () => {
    const { storm } = sandstormOrderAfterSelfdestruct([10, 10, 10, 10]);
    expect(storm).toEqual(["hp-change:1", "hp-change:0"]);
  });

  it("the flag is gone at the next turn's start", () => {
    const { rules } = sandstormOrderAfterSelfdestruct([0, 0, 0, 0]);
    // kept through the end of this turn; the next turn's first rules object zeroes it (TurnValuesCleanUp(FALSE))
    expect(rules.noValidMovesKept & ~0b10).toBe(0);
  });
});
