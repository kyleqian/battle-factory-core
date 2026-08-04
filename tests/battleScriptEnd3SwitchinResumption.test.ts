import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleCommandDecision } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72's "STRINGID_PKMNSXWHIPPEDUPSANDSTORM investigated, not landed"
 * block: `battleScriptSwitchinOpcode.ts`'s `callSwitchinScript` enters
 * `BattleScript_SandstreamActivates` via a real interpreter `"call-current"`
 * transition, and the script used to halt at its own `end3`
 * (`playanimation B_ANIM_SANDSTORM_CONTINUES` / `call
 * BattleScript_WeatherFormChanges` / `end3`) as a `machine-barrier`
 * (`opcodeName: "B_SCR_OP_END3"`). `docs/end3-design.md` §1.4(b)/§2 names
 * this the "script" continuation flavor: since `callSwitchinScript`'s
 * `"call-current"` push landed on the SAME shared script-cursor stack
 * (`callStack`, source's `battleScriptsStack`) `Cmd_call`/`Cmd_return`
 * already use, `Cmd_end3` popping that stack and resuming is mechanically
 * identical to `RETURN` -- wired directly into `battleScriptMachine.ts`'s
 * `end3()` helper (no new orchestration-level boundary type needed for this
 * flavor, unlike the already-landed "cCallback" end-turn-abilities flavor in
 * `battleEndTurnOrchestration.ts`). Reuses batch 2's
 * (`presentationStringIssue72Batch2.test.ts`) trainerBenchOverride switch-in
 * staging shape.
 *
 * Red-verify: `git stash -- src/engine/battleScriptMachine.ts` (leaves the
 * animation-map registration in battleScriptStatbuffchangeOpcode.ts staged,
 * since that alone does not unblock the id) reproduces the exact pre-fix
 * failure -- the trainer's switch-in decision resolves to a
 * `"machine-barrier"` transition with `barrier.opcodeName ===
 * "B_SCR_OP_END3"` instead of `"decision-required"`.
 */

const SPLASH = 150;
const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_TYRANITAR = 248; // real ABILITY_SAND_STREAM slot-0 carrier (species-stats.json).
const SPECIES_KYOGRE = 404; // real ABILITY_DRIZZLE slot-0 carrier.
const SPECIES_GROUDON = 405; // real ABILITY_DROUGHT slot-0 carrier.
/** include/constants/battle.h:94-98 -- B_WEATHER_SANDSTORM_{TEMPORARY,PERMANENT} etc. */
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const B_WEATHER_SANDSTORM_PERMANENT = 1 << 4;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_RAIN_PERMANENT = 1 << 2;
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const B_WEATHER_SUN_PERMANENT = 1 << 6;
const ABILITY_SAND_STREAM = 45;
const ABILITY_DRIZZLE = 2;
const ABILITY_DROUGHT = 70;

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

function weatherSwitchConfig(
  benchSpecies: number,
  benchMoveId: number,
): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: {
      species: SPECIES_WOBBUFFET, moveId: SPLASH,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200, hp: 300,
    },
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: SPLASH,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 1, hp: 300,
    },
    trainerBenchHp: [200, 0] as [number, number],
    trainerBenchOverride: [{
      species: benchSpecies, abilityNum: 0, moves: [benchMoveId, 0, 0, 0],
      maxHP: 200, attack: 80, defense: 200, speed: 50,
      spAttack: 40, spDefense: 100,
    }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
  });
}

describe("end3 push/pop resumption -- switch-in weather-ability scripts run to genuine completion", () => {
  it("STRINGID_PKMNSXWHIPPEDUPSANDSTORM: Sand Stream's switch-in script resumes past its own end3, sets sandstorm weather, and the switch-in flow reaches its own completion", () => {
    const config = weatherSwitchConfig(SPECIES_TYRANITAR, SPLASH);
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected the player's command boundary");
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: AT(0),
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command boundary");
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: { kind: "switch", partyIndex: 1 },
    });

    // The genuine-completion assertion: no machine-barrier at B_SCR_OP_END3
    // (or anywhere else) -- the switch-in flow's own script resolves all
    // the way to the next real decision boundary.
    if (transition.kind === "machine-barrier") {
      throw new Error(`unexpected machine-barrier: ${JSON.stringify(transition.barrier)}`);
    }
    expect(transition.kind).toBe("decision-required");

    const sandstormMessage = transition.events.find(
      (event) => event.payload.kind === "message" && event.payload.messageId === "STRINGID_PKMNSXWHIPPEDUPSANDSTORM",
    );
    if (!sandstormMessage) throw new Error("expected a STRINGID_PKMNSXWHIPPEDUPSANDSTORM message event");
    expect((sandstormMessage.payload as { scriptingBattler?: number }).scriptingBattler).toBe(1);

    if (transition.kind !== "decision-required") throw new Error("expected decision-required");
    const rulesContext = transition.state.rules.rulesContext;
    expect(rulesContext.battlers[1]!.ability).toBe(ABILITY_SAND_STREAM);
    expect(rulesContext.weather & (B_WEATHER_SANDSTORM_TEMPORARY | B_WEATHER_SANDSTORM_PERMANENT)).toBe(
      B_WEATHER_SANDSTORM_TEMPORARY | B_WEATHER_SANDSTORM_PERMANENT,
    );
  });

  it("Drizzle's switch-in script (BattleScript_DrizzleActivates) shares the same playanimation+call+end3 shape and also resumes to genuine completion", () => {
    const config = weatherSwitchConfig(SPECIES_KYOGRE, SPLASH);
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected the player's command boundary");
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: AT(0),
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command boundary");
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: { kind: "switch", partyIndex: 1 },
    });
    if (transition.kind === "machine-barrier") {
      throw new Error(`unexpected machine-barrier: ${JSON.stringify(transition.barrier)}`);
    }
    expect(transition.kind).toBe("decision-required");
    if (transition.kind !== "decision-required") throw new Error("expected decision-required");
    const rulesContext = transition.state.rules.rulesContext;
    expect(rulesContext.battlers[1]!.ability).toBe(ABILITY_DRIZZLE);
    expect(rulesContext.weather & (B_WEATHER_RAIN_TEMPORARY | B_WEATHER_RAIN_PERMANENT)).toBe(
      B_WEATHER_RAIN_TEMPORARY | B_WEATHER_RAIN_PERMANENT,
    );
  });

  it("Drought's switch-in script (BattleScript_DroughtActivates) shares the same playanimation+call+end3 shape and also resumes to genuine completion", () => {
    const config = weatherSwitchConfig(SPECIES_GROUDON, SPLASH);
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected the player's command boundary");
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: AT(0),
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command boundary");
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: { kind: "switch", partyIndex: 1 },
    });
    if (transition.kind === "machine-barrier") {
      throw new Error(`unexpected machine-barrier: ${JSON.stringify(transition.barrier)}`);
    }
    expect(transition.kind).toBe("decision-required");
    if (transition.kind !== "decision-required") throw new Error("expected decision-required");
    const rulesContext = transition.state.rules.rulesContext;
    expect(rulesContext.battlers[1]!.ability).toBe(ABILITY_DROUGHT);
    expect(rulesContext.weather & (B_WEATHER_SUN_TEMPORARY | B_WEATHER_SUN_PERMANENT)).toBe(
      B_WEATHER_SUN_TEMPORARY | B_WEATHER_SUN_PERMANENT,
    );
  });
});
