import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/cure-berry-after-action.md (fix 34). After every action the game runs `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` for battler 0
// (HandleFaintedMonActions state 6, battle_util.c:1958-1962, reached through HandleAction_TryFinish :638-645). A Pursuit hit on a switching Pokemon
// runs only `moveendfromto MOVEEND_ON_DAMAGE_ABILITIES, MOVEEND_CHOICE_MOVE` (battle_scripts_1.s:3143): the leaving Pokemon's Static can paralyse the
// user and the move-end item step is skipped, so state 6 is where the game eats the Cheri Berry. That is before the end of the turn, whose first step
// sorts the battlers by speed (a paralysed Pokemon has a quarter of its speed) and then deals the sandstorm damage in that order.
// ROM (Mechanic Lab, seed 502): Jolteon with a Cheri Berry is cured after the replacement comes in and takes the sandstorm damage FIRST; the same
// battle without the berry: the slower replacement takes it first.

const PURSUIT = 228;
const SPLASH = 150;
const CHERI_BERRY = 133;
const ABILITY_STATIC = 9;
const SPECIES_WOBBUFFET = 202;
const WEATHER_SANDSTORM = 0x18;

function config(rngSeed: number, item: number): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed,
    weather: WEATHER_SANDSTORM,
    player: {
      species: SPECIES_WOBBUFFET, moveId: PURSUIT, item,
      attack: 60, defense: 100, spAttack: 100, spDefense: 100, speed: 100, hp: 300,
    },
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: ABILITY_STATIC,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 10, hp: 300,
    },
    trainerBenchHp: [200, 0] as [number, number],
    // slower than the healthy Pursuit user (100), faster than the paralysed one (25)
    trainerBenchOverride: [{
      species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0,
      maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100,
    }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

function commandDecisions(state: ReturnType<typeof createFactoryFullTurnBattleState>) {
  const boundary = state.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
  return boundary.request.legalDecisions;
}

/** One turn: the player uses Pursuit, the trainer switches out. Returns the turn's messages / HP changes in order, and the rules after it. */
function pursuitOnTheSwitch(rngSeed: number, item: number) {
  const initial = createFactoryFullTurnBattleState(config(rngSeed, item));
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1, side: "player", decision: commandDecisions(initial).find((d) => d.kind === "use-move")!,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
  const switchOut = commandDecisions(afterPlayer.state).find((d) => d.kind === "switch");
  if (switchOut === undefined) throw new Error("the trainer has no switch decision");
  const done = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: switchOut });
  if (done.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(done.barrier)}`);
  const steps = done.events.flatMap(({ payload }) =>
    payload.kind === "message" ? [payload.messageId] : payload.kind === "hp-change" ? [`hp-change:${(payload as { battler: number }).battler}`] : []);
  return { steps, rules: done.state.rules.rulesContext };
}

/** The first seed on which the leaving Pokemon's Static paralyses the Pursuit user (a one-in-three roll). */
function seedWhereStaticStrikes(): number {
  for (let seed = 1; seed <= 60; seed += 1) {
    if (pursuitOnTheSwitch(seed, 0).rules.battlers[0].status1 === 0x40) return seed;
  }
  throw new Error("Static never struck in 60 seeds");
}

describe("the game's item check after every action (HandleFaintedMonActions state 6)", () => {
  const seed = seedWhereStaticStrikes();

  it("without a berry the paralysed Pursuit user is slower at the end of the turn: the replacement takes the sandstorm first", () => {
    const { steps, rules } = pursuitOnTheSwitch(seed, 0);
    expect(rules.battlers[0].status1).toBe(0x40);
    const storm = steps.slice(steps.indexOf("STRINGID_SANDSTORMRAGES")).filter((s) => s.startsWith("hp-change:"));
    expect(storm.slice(0, 2)).toEqual(["hp-change:1", "hp-change:0"]);
  });

  it("with a Cheri Berry it is cured right after the switch, before the end of the turn: it takes the sandstorm first", () => {
    const { steps, rules } = pursuitOnTheSwitch(seed, CHERI_BERRY);
    expect(rules.battlers[0].status1).toBe(0);
    expect(rules.battlers[0].item).toBe(0);
    const cure = steps.indexOf("STRINGID_PKMNSITEMCUREDPARALYSIS");
    const stormStart = steps.indexOf("STRINGID_SANDSTORMRAGES");
    expect(cure).toBeGreaterThan(-1);
    expect(stormStart).toBeGreaterThan(-1);
    expect(cure).toBeLessThan(stormStart);
    const storm = steps.slice(stormStart).filter((s) => s.startsWith("hp-change:"));
    expect(storm.slice(0, 2)).toEqual(["hp-change:0", "hp-change:1"]);
  });
});
