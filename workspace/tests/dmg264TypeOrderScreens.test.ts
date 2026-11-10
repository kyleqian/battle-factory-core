// dmg264 (ISSUES #206, #208; docs/dmg264-type-order-screens.md): type effectiveness walks gTypeEffectiveness in ROW order
// (battle_script_commands.c:1321, :1355-1415) and the defender side's Reflect / Light Screen reach CalculateBaseDamage
// (battle_script_commands.c:1288, pokemon.c:3267, :3318).
import { describe, expect, it } from "vitest";
import typeEffectivenessData from "../src/data/gen/type-effectiveness.json" with { type: "json" };
import { applyTypeEffectiveness, matchingTypeEffectivenessRows, type TypeEffectivenessEntry } from "../src/engine/damageCalc.ts";
import { calculateBattleScriptBaseDamageWithPowerForCurrentMove } from "../src/engine/battleScriptHitChainOpcode.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";

const TABLE = typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];
const TACKLE = 33;
const FLAMETHROWER = 53;
const FIRE_PUNCH = 7;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const STATUS2_FORESIGHT = 1 << 29;
const program = loadBattleScriptProgram();

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 0, hp: 150, maxHP: 150, moves: [TACKLE, 0, 0, 0] as const, pp: [10, 0, 0, 0] as const,
    status1: 0, status2: changes.status2 ?? 0, status3: 0, substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0,
    truantCounter: 0, rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, attack: 100, defense: 100, spAttack: 100, spDefense: 100, level: 50,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 1, partyIndex: 0,
  });
}

function rules(
  move: number,
  defender: Partial<BattleScriptRulesBattler> = {},
  sideStatus = 0,
  critMultiplier = 1,
  battleMoveDamage = 0,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler(0), battler(1, defender), battler(0, { }), battler(1, { })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0, currentMove: move, currentMovePosition: 0,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier, moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0,
    sideStatuses: [0, sideStatus], battleMoveDamage,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null,
  resolveByteOperand: () => null,
});

function typecalc(rc: BattleScriptRulesContext, opcode = "B_SCR_OP_TYPECALC"): BattleScriptRulesContext {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_HitFromCritCalc", rc, 1, ports);
  const start = program.instructions.find((i) => i.opcodeName === opcode)!;
  const result = stepBattleScriptMachine(program, Object.freeze({ ...execution.state, programCounter: start.programCounter }), execution.handlers);
  if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
  return result.state.rulesContext;
}

const NVE = 1 << 2;
const SE = 1 << 1;

describe("dmg264 #206: ModulateDmgByType in table row order (Cmd_typecalc :1355-1415)", () => {
  it("Fire on Rock/Grass is 47 in either defender type order (Grass x2 row precedes Rock x0.5 row)", () => {
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_ROCK", "TYPE_GRASS"], TABLE).damage).toBe(47);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_GRASS", "TYPE_ROCK"], TABLE).damage).toBe(47);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_ROCK", "TYPE_GRASS"], TABLE).multiplierTenths).toBe(10);
  });

  it("matched rows come out in ROM row order", () => {
    const rows = matchingTypeEffectivenessRows("TYPE_FIRE", ["TYPE_ROCK", "TYPE_GRASS"], TABLE);
    expect(rows.map((r) => r.defendingType)).toEqual(["TYPE_GRASS", "TYPE_ROCK"]);
  });

  it("4x and 0.25x dual types, either defender order", () => {
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_GRASS", "TYPE_BUG"], TABLE).damage).toBe(188);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_BUG", "TYPE_GRASS"], TABLE).damage).toBe(188);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_WATER", "TYPE_ROCK"], TABLE).damage).toBe(11);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_ROCK", "TYPE_WATER"], TABLE).damage).toBe(11);
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_WATER", "TYPE_ROCK"], TABLE).multiplierTenths).toBe(2);
  });

  it("a mono-type defender applies a row once; Foresight ends the walk before the Ghost immunity rows", () => {
    expect(applyTypeEffectiveness(47, "TYPE_FIRE", ["TYPE_ROCK", "TYPE_ROCK"], TABLE).damage).toBe(23);
    expect(applyTypeEffectiveness(47, "TYPE_NORMAL", ["TYPE_GHOST", "TYPE_GHOST"], TABLE).damage).toBe(0);
    expect(applyTypeEffectiveness(47, "TYPE_NORMAL", ["TYPE_GHOST", "TYPE_GHOST"], TABLE, true).damage).toBe(47);
    expect(applyTypeEffectiveness(47, "TYPE_NORMAL", ["TYPE_GHOST", "TYPE_STEEL"], TABLE, true).damage).toBe(23);
  });

  it("the live typecalc opcode takes the same order (ROM Fire Punch 47 -> 47, not 46 / 23 -> 46)", () => {
    for (const types of [["TYPE_ROCK", "TYPE_GRASS"], ["TYPE_GRASS", "TYPE_ROCK"]] as const) {
      const out = typecalc(rules(FIRE_PUNCH, { types }, 0, 1, 47));
      expect(out.battleMoveDamage).toBe(47);
      expect(out.moveResultFlags & (NVE | SE)).toBe(0);
    }
  });

  it("typecalc: Foresight on Normal vs Ghost/Steel keeps the Steel row, drops the Ghost immunity", () => {
    const out = typecalc(rules(TACKLE, { types: ["TYPE_GHOST", "TYPE_STEEL"], status2: STATUS2_FORESIGHT }, 0, 1, 47));
    expect(out.battleMoveDamage).toBe(35); // STAB 70, Steel x0.5; the Ghost x0 row is past the Foresight sentinel
  });

  it("typecalc2 (flags only) still flags a Fire move on Rock/Grass in table order without touching damage", () => {
    const out = typecalc(rules(FIRE_PUNCH, { types: ["TYPE_ROCK", "TYPE_GRASS"] }, 0, 1, 47), "B_SCR_OP_TYPECALC2");
    expect(out.battleMoveDamage).toBe(47);
  });
});

describe("dmg264 #208: Reflect / Light Screen in the live damage calc (pokemon.c:3267, :3318)", () => {
  const dmg = (r: BattleScriptRulesContext) => calculateBattleScriptBaseDamageWithPowerForCurrentMove(r).damage;

  it("Reflect halves a physical (Normal) hit and not a special one", () => {
    const plain = dmg(rules(TACKLE));
    expect(plain).toBeGreaterThan(2);
    expect(dmg(rules(TACKLE, {}, SIDE_STATUS_REFLECT))).toBe(Math.trunc(plain_pre(rules(TACKLE)) / 2) + 2);
    expect(dmg(rules(TACKLE, {}, SIDE_STATUS_LIGHTSCREEN))).toBe(plain);
    expect(dmg(rules(FLAMETHROWER, {}, SIDE_STATUS_REFLECT))).toBe(dmg(rules(FLAMETHROWER)));
  });

  it("Light Screen halves a special (Fire) hit and not a physical one", () => {
    const plain = dmg(rules(FLAMETHROWER));
    expect(dmg(rules(FLAMETHROWER, {}, SIDE_STATUS_LIGHTSCREEN))).toBeLessThan(plain);
    expect(dmg(rules(FLAMETHROWER, {}, SIDE_STATUS_LIGHTSCREEN))).toBe(Math.trunc(plain_pre(rules(FLAMETHROWER)) / 2) + 2);
  });

  it("neither screen applies on a critical hit", () => {
    expect(dmg(rules(TACKLE, {}, SIDE_STATUS_REFLECT, 2))).toBe(dmg(rules(TACKLE, {}, 0, 2)));
    expect(dmg(rules(FLAMETHROWER, {}, SIDE_STATUS_LIGHTSCREEN, 2))).toBe(dmg(rules(FLAMETHROWER, {}, 0, 2)));
  });

  it("only the DEFENDER side's screens count (side 0's Reflect does not halve a hit on side 1)", () => {
    const ctx = createBattleScriptRulesContext({
      battlers: [battler(0), battler(1), battler(0), battler(1)],
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
      scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0, currentMove: TACKLE, currentMovePosition: 0,
      moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0,
      sideStatuses: [SIDE_STATUS_REFLECT, 0],
    });
    expect(dmg(ctx)).toBe(dmg(rules(TACKLE)));
  });
});

// CalculateBaseDamage's final `damage += 2` and the pre-screen value: dmg = pre/2 + 2 under a screen, pre + 2 otherwise.
function plain_pre(r: BattleScriptRulesContext): number {
  return calculateBattleScriptBaseDamageWithPowerForCurrentMove(r).damage - 2;
}
