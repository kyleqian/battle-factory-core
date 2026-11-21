// cln11: the generic lab-backed compare stage (appStage id "lab") builds ANY `overrides.parties` lab with the engine's own stat code.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import { APP_STAGES, applyTraceStage, labBackedStage } from "../tools/compare/appTrace.ts";
import { buildLabMon, labPersonality, labStageEquivalenceView, type LabMonContext } from "../tools/compare/labMon.ts";

const initial = (scene: "on" | "off") => createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
const ctx = (over: Partial<LabMonContext> = {}): LabMonContext => ({ lab: "t", side: "player", index: 0, seed: 1, defaultLevel: 50, ...over });
const ALL_IV = { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 };

const battlers = (state: ReturnType<typeof initial>) => state.factoryRoundBattleOrchestrator!.battle!.rules.rulesContext.battlers;

describe("generic lab stage reproduces hand-written stages", () => {
  const CASES: readonly (readonly [string, "on" | "off"])[] = [
    ["fsc1-dig-eq-off", "off"], ["fsc1-eqko-on", "on"], ["chg1-dig-plr-off", "off"], ["chg1-dig-foe-off", "off"],
    ["lead3-shadowball-player-on", "on"], ["lead3-crunch-player-on", "on"], ["pau5-switch-intimidate-on", "on"], ["pau5-opp-trace-off", "off"],
  ];
  for (const [id, scene] of CASES) {
    it(`${id}: same battle state (active battlers, stats, HP, types, moves, item, seed, presentation)`, () => {
      const generic = labBackedStage(`../../battle-lab/${id}.json`, initial(scene));
      const hand = APP_STAGES[id]!(initial(scene));
      expect(labStageEquivalenceView(generic)).toEqual(labStageEquivalenceView(hand));
    });
  }

  it("non-Rattata lab: Machop (species 66) foe has the lab's real ability (Guts), Lv12 stats equal the hand-written Machop stage's", () => {
    const generic = battlers(labBackedStage("../../battle-lab/lead3-shadowball-player-on.json", initial("on")));
    const hand = battlers(APP_STAGES["lead3-shadowball-player-on"]!(initial("on")));
    expect(generic[1]).toMatchObject({ species: 66, level: 12, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], ability: 62, friendship: 70, personality: 150 });
    expect(hand[1]!.ability).toBe(50);
    for (const stat of ["hp", "maxHP", "attack", "defense", "spAttack", "spDefense", "speed"] as const) expect(generic[1]![stat]).toBe(hand[1]![stat]);
    expect(generic[0]!.pp[0]).toBe(15);
  });

  it("the lab's seed is the staged battle's RNG seed", () => {
    expect(labBackedStage("../../battle-lab/chg1-dig-plr-off.json", initial("off")).factoryRoundBattleOrchestrator!.battle!.rng.value).toBe(1);
  });
});

describe("appStage.rngSeed (the ROM's gRngValue at the first menu)", () => {
  const trace = (rngSeed?: number) => ({
    appRoute: "generated-orchestrator", oracleProfile: "battle-scene-off", segments: [], captureFrames: [0],
    appStage: { id: "lab", frame: 0, ...(rngSeed === undefined ? {} : { rngSeed }) },
    oracleBattleLab: { scenario: "../../battle-lab/chg1-bounce-foe-off.json" },
  }) as unknown as Parameters<typeof applyTraceStage>[0];
  it("overrides the lab seed; absent, the lab seed stays", () => {
    expect(applyTraceStage(trace(530917129), initial("off")).factoryRoundBattleOrchestrator!.battle!.rng.value).toBe(530917129);
    expect(applyTraceStage(trace(), initial("off")).factoryRoundBattleOrchestrator!.battle!.rng.value).toBe(1);
  });
});

describe("buildLabMon (legal party mons)", () => {
  it("derives stats / PP / ability / types for the BATTLE_LAB.md Pikachu: Timid, EVs 4/252/252, PP Ups 3,2,1,0, Light Ball", () => {
    const built = buildLabMon({
      species: 25, level: 50, nature: 10, ivs: ALL_IV, evs: { hp: 4, attack: 252, defense: 0, speed: 252, spAttack: 0, spDefense: 0 },
      moves: [33, 73, 92, 150], ppUps: [3, 2, 1, 0], item: 186, abilitySlot: 0, friendship: 200, gender: "male",
    }, ctx());
    expect(built.config).toMatchObject({
      species: 25, level: 50, hp: 111, maxHp: 111, attack: 96, defense: 50, speed: 156, spAttack: 70, spDefense: 60,
      ability: 9, abilityNum: 0, item: 186, friendship: 200, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], moves: [33, 73, 92, 150],
      pp: [56, 14, 12, 40],
    });
    expect(built.personality % 25).toBe(10);
    expect(built.personality & 0xff).toBeGreaterThanOrEqual(127);
  });

  it("second ability slot, a single-HP Shedinja, the species' base friendship when the lab omits it", () => {
    const rattata = buildLabMon({ species: 19, moves: [150, 150, 150, 150], abilitySlot: 1 }, ctx());
    expect(rattata.config).toMatchObject({ ability: 62, abilityNum: 1, friendship: 70, level: 50 });
    expect(buildLabMon({ species: 303, moves: [150, 0, 0, 0] }, ctx()).config).toMatchObject({ maxHp: 1, pp: [40, 0, 0, 0], types: ["TYPE_BUG", "TYPE_GHOST"] });
  });

  it("bench member carries the same record", () => {
    const built = buildLabMon({ species: 287, level: 50, moves: [69, 69, 69, 69], personality: 1013904250 }, ctx({ index: 1 }));
    expect(built.member).toMatchObject({ species: 287, hp: built.maxHp, maxHP: built.maxHp, personality: 1013904250, attack: 110, speed: 90, moves: [69, 69, 69, 69], pp: [20, 20, 20, 20] });
  });

  it("personality follows the oracle's search when the lab gives none (seed, side, slot) and honours gender", () => {
    // seed 1, player[0]: start 1 ^ 0x9E3779B9 = 0x9E3779B8; first value >= it with % 25 == 0 (nature 0) and male for Rattata (ratio 127).
    expect(labPersonality({ species: 19, moves: [1, 1, 1, 1] }, ctx(), 0, 127)).toBe(2654435775);
    expect(labPersonality({ species: 19, moves: [1, 1, 1, 1] }, ctx({ side: "opponent" }), 0, 127)).toBe(2027808500);
    const female = labPersonality({ species: 19, moves: [1, 1, 1, 1], gender: "female" }, ctx(), 0, 127);
    expect(female & 0xff).toBeLessThan(127);
    expect(female % 25).toBe(0);
  });

  it("throws, naming lab / side / field, on what the staged battler cannot carry", () => {
    expect(() => buildLabMon({ species: 19, moves: [237, 1, 1, 1] }, ctx({ lab: "x", side: "opponent", index: 2 }))).toThrow(/lab stage x: opponent\[2\] has Hidden Power/);
    expect(() => buildLabMon({ species: 19, moves: [1, 1, 1, 1], shiny: true }, ctx())).toThrow(/asks for shiny without an exact personality/);
    expect(() => buildLabMon({ species: 129, moves: [150, 0, 0, 0], abilitySlot: 1 }, ctx())).toThrow(/abilitySlot 1 is not available for SPECIES_MAGIKARP/);
    expect(() => buildLabMon({ species: 999, moves: [1, 1, 1, 1] }, ctx())).toThrow(/species 999/);
    expect(() => buildLabMon({ species: 19, moves: [1, 1, 1] }, ctx())).toThrow(/four moves/);
  });

  it("whole-lab rejects: legacy overrides.battlers and set-id (factoryLegal) labs", () => {
    expect(() => labBackedStage("../../battle-lab/attack-canceler-asleep-off.json", initial("off"))).toThrow(/legacy overrides.battlers/);
    expect(() => labBackedStage("../../battle-lab/factory-arbitrary-intro-magneton-off.json", initial("off"))).toThrow(/no overrides.parties/);
  });

  it("every overrides.parties lab in tools/battle-lab either builds or throws a named error (sampled)", () => {
    const names = ["aud241b-heavy-on", "adp1-pikachu-on", "hie1-leftovers-off", "pau5-faint-trace-off", "b4m-sing-s2-player-on"]
      .filter((name) => { try { readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url)); return true; } catch { return false; } });
    for (const name of names) {
      const scene = name.endsWith("-on") ? "on" : "off";
      try { labBackedStage(`../../battle-lab/${name}.json`, initial(scene)); } catch (error) { expect(String(error)).toMatch(/^Error: lab stage /); }
    }
  });
});
