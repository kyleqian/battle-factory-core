import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };
import parameterizationData from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };
import trainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };
import monsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import hooksData from "../src/data/gen/ability-item-hooks.json" with { type: "json" };

type JsonObject = Record<string, unknown>;

const JSON_PATH = "docs/gate6-coverage-manifest.json";
const MARKDOWN_PATH = "docs/gate6-coverage-manifest.md";
const PER_MOVE_HOOK_JOIN_AXES = ["item", "ability"] as const;
const SOURCE_PROVEN_FAMILY_STATUS = "source-proven-family";
const SOUNDPROOF_MOVES_BLOCK_CATEGORY = "moves-block-soundproof";
const CONTACT_CATEGORY = "moveend-contact-on-damage";
const COLOR_CHANGE_CATEGORY = "moveend-color-change";
const SYNCHRONIZE_CATEGORY = "moveend-synchronize-status";
const TRYINFATUATING_OBLIVIOUS_CATEGORY = "tryinfatuating-oblivious";
const TRYEXPLOSION_DAMP_CATEGORY = "tryexplosion-damp";
const KINGS_ROCK_CATEGORY = "moveend-kings-rock";
const SHELL_BELL_CATEGORY = "moveend-shell-bell";
const IMMUNITY_CATEGORY = "moveend-immunity-abilities";
const ITEM_MOVE_END_CATEGORY = "moveend-item-effects-all";
const SOUNDPROOF_ROSTER_MOVES = [
  "MOVE_ROAR", "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_SCREECH", "MOVE_SNORE",
  "MOVE_UPROAR", "MOVE_METAL_SOUND", "MOVE_GRASS_WHISTLE", "MOVE_HYPER_VOICE",
] as const;
const SOUNDPROOF_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "reference/pokeemerald/src/battle_script_commands.c",
  "src/engine/battleScriptAbilityMovesBlock.ts",
  "tests/battleScriptAbilityMovesBlock.test.ts",
  "tests/soundproofOracleEvidence.test.ts",
  "tests/fixtures/soundproof-off-evidence.json",
] as const;
const ABSORBING_CATEGORIES = [
  "absorbing-volt-absorb",
  "absorbing-water-absorb",
  "absorbing-flash-fire",
] as const;
const ABSORBING_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "reference/pokeemerald/src/battle_script_commands.c",
  "src/engine/battleScriptHitChainOpcode.ts",
  "tests/battleScriptHitChainOpcode.test.ts",
  "tests/damageCalc.test.ts",
  "docs/absorbing-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-absorbing-volt-absorb-off.json",
  "tools/probe/probe-absorbing-ability-off.py",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json",
  "tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json",
] as const;
const COLOR_CHANGE_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/battleScriptMoveEndOpcode.test.ts",
  "tests/colorChangeOracleEvidence.test.ts",
  "tools/battle-lab/mechanic-color-change-off.json",
  "tools/probe/probe-color-change-ability-off.py",
  "tools/probe/receipts/color-change-off-seed-610839776.json",
  "tools/probe/receipts/color-change-off-seed-324508639.json",
] as const;
const CONTACT_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/battle.h",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/data/gen/moves.json",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/battleScriptMoveEndOpcode.test.ts",
  "tests/onDamageContactOracleEvidence.test.ts",
  "docs/on-damage-contact-scout.md",
  "tools/battle-lab/mechanic-on-damage-static-off.json",
  "tools/probe/verify-on-damage-static.py",
  "tools/probe/receipts/on-damage-static-off.json",
] as const;
const SYNCHRONIZE_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/battleScriptMoveEndOpcode.test.ts",
  "docs/synchronize-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-synchronize-thunder-wave-off.json",
  "tools/probe/probe-synchronize-off.py",
  "tools/probe/receipts/synchronize-off-seed-610839776.json",
  "tools/probe/receipts/synchronize-off-seed-324508639.json",
] as const;
const TRYINFATUATING_OBLIVIOUS_PROOF_PATHS = [
  "src/data/gen/moves.json",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/abilities.h",
  "src/engine/battleScriptTryinfatuatingOpcode.ts",
  "tests/battleScriptTryinfatuatingOpcode.test.ts",
  "tests/tryinfatuatingObliviousHookJoinBatch.test.ts",
  "tests/gate6R10AttractObliviousReceipt.test.ts",
  "tools/battle-lab/gate6-r10-attract-off.json",
  "tools/battle-lab/gate6-r10-attract-control-off.json",
  "tools/probe/probe-gate6-r10-off.py",
  "tools/probe/receipts/gate6-r10-attract-oblivious-off.json",
] as const;
const TRYEXPLOSION_DAMP_PROOF_PATHS = [
  "src/data/gen/moves.json",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/abilities.h",
  "src/engine/battleScriptExplosionOpcode.ts",
  "tests/battleScriptExplosionOpcode.test.ts",
  "tests/tryexplosionDampHookJoinBatch.test.ts",
  "tests/gate6DampExplosionReceipt.test.ts",
  "tools/probe/probe-gate6-damp-explosion-off.py",
  "tools/probe/receipts/gate6-damp-explosion-off.json",
] as const;
const KINGS_ROCK_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/battleScriptMoveEndOpcode.test.ts",
  "tests/kingsRockHookJoinBatch.test.ts",
  "tests/kingsRockOracleEvidence.test.ts",
  "docs/kings-rock-moveend-ground-truth.md",
  "tools/battle-lab/mechanic-kings-rock-flinch-off.json",
  "tools/probe/probe-kings-rock-flinch-off.py",
  "tools/probe/receipts/kings-rock-flinch-off.json",
] as const;
const SHELL_BELL_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "src/data/gen/battle-script-graph.json",
  "src/data/gen/battle-script-program.json",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/shellBellHookJoinBatch.test.ts",
  "tests/shellBellOracleEvidence.test.ts",
  "docs/shell-bell-moveend-ground-truth.md",
  "tools/battle-lab/mechanic-shell-bell-heal-off.json",
  "tools/battle-lab/mechanic-shell-bell-control-off.json",
  "tools/probe/probe-shell-bell-heal-off.py",
  "tools/probe/receipts/shell-bell-heal-off.json",
] as const;
const IMMUNITY_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/statusImmunityHookJoinBatch.test.ts",
  "tests/statusImmunityOracleEvidence.test.ts",
  "docs/immunity-abilities-ground-truth.md",
  "tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json",
  "tools/probe/probe-immunity-limber-off.py",
  "tools/probe/receipts/immunity-limber-off-seed-610839776.json",
  "tools/probe/receipts/immunity-limber-off-seed-324508639.json",
] as const;
const ITEM_MOVE_END_PROOF_PATHS = [
  "reference/pokeemerald/src/battle_util.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/include/constants/battle_script_commands.h",
  "src/engine/battleScriptMoveEndOpcode.ts",
  "tests/itemMoveEndHookJoinBatch.test.ts",
  "tests/itemMoveEndOracleEvidence.test.ts",
  "docs/item-move-end-family-ground-truth.md",
  "tools/battle-lab/mechanic-item-move-end-paralysis-cheri-off.json",
  "tools/battle-lab/mechanic-item-move-end-paralysis-control-off.json",
  "tools/probe/verify-item-move-end-paralysis-off.py",
  "tools/probe/receipts/item-move-end-paralysis-cheri-off.json",
  "tools/probe/receipts/item-move-end-paralysis-control-off.json",
] as const;

const EXPLICIT_STATE_BEHAVIOR_ROWS = [
  [
    "BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT",
    [[
      "tests/battleScriptHitChainOpcode.test.ts",
      "STATUS3_CANT_SCORE_A_CRIT short-circuits a would-crit roll without consuming RNG",
    ]],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_LEECHSEED",
    [
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id"],
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation"],
    ],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK",
    [
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Leech Seed setter writes STATUS3_LEECHSEED plus its encoded seeder id"],
      ["tests/battleEndTurnOrchestration.test.ts", "Leech Seed end-turn decodes a nonzero encoded seeder owner and retains the seed lifecycle bit"],
      ["tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts", "Rapid Spin lifecycle clears STATUS3_LEECHSEED and its encoded seeder before the LeechSeedFree continuation"],
    ],
  ],
  [
    "BATTLE_SCRIPT_STATUS3_YAWN",
    [
      ["tests/battleEndTurnOrchestration.test.ts", "first end-turn pass only decrements the counter (TURN(2) -> TURN(1)), no sleep transition, zero RNG"],
      ["tests/battleEndTurnOrchestration.test.ts", "second end-turn pass empties the counter and fires the real sleep transition"],
    ],
  ],
  [
    "SIDE_STATUS_WORE_OFF_LABEL",
    [[
      "tests/battleScriptScreensWeatherOrchestration.test.ts",
      "Light Screen: set -> 4 silent decrement ticks -> SideStatusWoreOff message/buffer on tick 5 -> re-set succeeds",
    ]],
  ],
] as const;

function readManifest(): JsonObject {
  return JSON.parse(readFileSync(JSON_PATH, "utf8")) as JsonObject;
}

function record(value: unknown): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("expected object");
  return value as JsonObject;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("expected array");
  return value;
}

function pathWithoutLocator(value: unknown): string {
  const path = record(value).path;
  if (typeof path !== "string") throw new Error("evidence path is not a string");
  return path.split("#", 1)[0]!;
}

function collectEvidenceRows(value: unknown, rows: JsonObject[] = []): JsonObject[] {
  if (Array.isArray(value)) {
    for (const child of value) collectEvidenceRows(child, rows);
    return rows;
  }
  if (value === null || typeof value !== "object") return rows;
  const object = record(value);
  if (Array.isArray(object.evidence)) rows.push(object);
  for (const child of Object.values(object)) collectEvidenceRows(child, rows);
  return rows;
}

function sourceProvenPathsFor(category: string): readonly string[] {
  if (category === SOUNDPROOF_MOVES_BLOCK_CATEGORY) return SOUNDPROOF_PROOF_PATHS;
  if ((ABSORBING_CATEGORIES as readonly string[]).includes(category)) return ABSORBING_PROOF_PATHS;
  if (category === CONTACT_CATEGORY) return CONTACT_PROOF_PATHS;
  if (category === COLOR_CHANGE_CATEGORY) return COLOR_CHANGE_PROOF_PATHS;
  if (category === SYNCHRONIZE_CATEGORY) return SYNCHRONIZE_PROOF_PATHS;
  if (category === TRYINFATUATING_OBLIVIOUS_CATEGORY) return TRYINFATUATING_OBLIVIOUS_PROOF_PATHS;
  if (category === TRYEXPLOSION_DAMP_CATEGORY) return TRYEXPLOSION_DAMP_PROOF_PATHS;
  if (category === KINGS_ROCK_CATEGORY) return KINGS_ROCK_PROOF_PATHS;
  if (category === SHELL_BELL_CATEGORY) return SHELL_BELL_PROOF_PATHS;
  if (category === IMMUNITY_CATEGORY) return IMMUNITY_PROOF_PATHS;
  if (category === ITEM_MOVE_END_CATEGORY) return ITEM_MOVE_END_PROOF_PATHS;
  throw new Error(`unknown source-proven hook category ${category}`);
}

function assertSourceProvenFamilyContract(
  sourceHook: JsonObject,
  row: JsonObject,
): void {
  const categories = array(sourceHook.supportedCategories).map(String);
  const evidence = record(sourceHook.evidence);
  const families = array(evidence.families).map(record);
  if (categories.length === 0 || new Set(categories).size !== categories.length) {
    throw new Error("source-proven hook categories must be nonempty and unique");
  }
  if (JSON.stringify(families.map((family) => family.category)) !== JSON.stringify(categories)) {
    throw new Error("source-proven hook evidence must preserve one ordered family witness per category");
  }
  if (JSON.stringify(array(row.categories).map(String)) !== JSON.stringify(categories)) {
    throw new Error("manifest row categories drift from the source-proven family categories");
  }
  if (!String(row.notes).includes(`unrelated ${String(row.axis)} families`)) {
    throw new Error("source-proven row must retain the unrelated-family boundary");
  }
  for (const family of families) {
    if (!categories.includes(String(family.category))) throw new Error("family evidence has an unclaimed category");
    const entryPath = record(family.entryPath);
    const graph = record(entryPath.graph);
    const program = record(entryPath.program);
    if (graph.path !== "src/data/gen/battle-script-graph.json" || program.path !== "src/data/gen/battle-script-program.json") {
      throw new Error("source-proven family lost generated graph/program evidence");
    }
    if (family.category === SOUNDPROOF_MOVES_BLOCK_CATEGORY && !record(graph.attackCanceler).label) {
      throw new Error("Soundproof family lacks attackcanceler evidence");
    }
    if ((ABSORBING_CATEGORIES as readonly string[]).includes(String(family.category)) && !record(graph.accuracyCheck).label) {
      throw new Error("absorbing family lacks accuracycheck evidence");
    }
    if (family.category === COLOR_CHANGE_CATEGORY) {
      const selector = record(family.selector);
      const dataHpUpdate = record(entryPath.dataHpUpdate);
      const moveEnd = record(entryPath.moveEnd);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      expect(selector.guard).toBe("gBattleMoves[move].power != 0");
      expect(String(selector.derivedFrom)).toContain("moveend-color-change candidate selector");
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(dataHpUpdate).toMatchObject({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] });
      expect(moveEnd).toMatchObject({ state: "MOVEEND_ON_DAMAGE_ABILITIES", stateValue: 3 });
      expect(record(family.runtimeGuardSignature).orderedAbilityGuards).toEqual(expect.arrayContaining([
        "TARGET_TURN_DAMAGED",
        "!IS_BATTLER_OF_TYPE(battler, moveType)",
        "gBattleMons[battler].hp != 0",
      ]));
      expect(record(family.familyVerification).oracleReceipt).toBe("tests/colorChangeOracleEvidence.test.ts#shared ON_DAMAGE Color Change arm");
    }
    if (family.category === CONTACT_CATEGORY) {
      const selector = record(family.selector);
      const dataHpUpdate = record(entryPath.dataHpUpdate);
      const moveEnd = record(entryPath.moveEnd);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      expect(selector.guard).toBe("(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)");
      expect(String(selector.derivedFrom)).toContain("moveend-contact-on-damage candidate selector");
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(dataHpUpdate).toMatchObject({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] });
      expect(moveEnd).toMatchObject({ state: "MOVEEND_ON_DAMAGE_ABILITIES", stateValue: 3 });
      expect(record(family.runtimeGuardSignature).orderedAbilityGuards).toEqual(expect.arrayContaining([
        "TARGET_TURN_DAMAGED",
        "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
      ]));
      expect(record(record(family.runtimeGuardSignature).dataHpUpdate).writes).toEqual(expect.arrayContaining([
        "gSpecialStatuses[gActiveBattler].physicalDmg = gHpDealt",
        "gSpecialStatuses[gActiveBattler].specialDmg = gHpDealt",
      ]));
      expect(record(family.familyVerification).oracleReceipt).toBe("tests/onDamageContactOracleEvidence.test.ts#shared ON_DAMAGE contact dispatcher arm");
      expect(array(record(family.familyVerification).oracleReceiptFiles)).toEqual([
        "tools/probe/receipts/on-damage-static-off.json",
      ]);
      expect(array(record(family.familyVerification).abilityOutcomes)).toHaveLength(6);
      expect(String(record(family.familyVerification).scopeBoundary)).toMatch(/No per-move oracle receipts are authored/);
    }
    if (family.category === SYNCHRONIZE_CATEGORY) {
      const selector = record(family.selector);
      const dispatcher = record(family.dispatcher);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      expect(String(selector.entryScript)).toMatch(/^BattleScript_/);
      expect(array(selector.selectedEffects).length).toBeGreaterThan(0);
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: String(record(entryPath.setter).mnemonic) }),
        expect.objectContaining({ mnemonic: String(record(entryPath.dispatch).mnemonic) }),
        expect.objectContaining({ mnemonic: String(record(entryPath.moveEnd).mnemonic) }),
      ]));
      expect(record(dispatcher.target)).toMatchObject({ state: "MOVEEND_SYNCHRONIZE_TARGET", stateValue: 2 });
      expect(record(dispatcher.attacker)).toMatchObject({ state: "MOVEEND_SYNCHRONIZE_ATTACKER", stateValue: 5 });
      const runtimeGuardSignature = record(family.runtimeGuardSignature);
      expect(array(record(runtimeGuardSignature.selector).effects).length).toBe(4);
      expect(array(record(runtimeGuardSignature.chance).guards).length).toBeGreaterThan(0);
      expect(record(family.familyVerification)).toMatchObject({
        oracleReceipt: "docs/synchronize-abilities-ground-truth.md#3-two-seed-battle-scene-off-receipts",
        oracleFixture: "tools/battle-lab/mechanic-synchronize-thunder-wave-off.json",
        oracleProbe: "tools/probe/probe-synchronize-off.py",
      });
      expect(array(record(family.familyVerification).oracleReceiptFiles)).toEqual([
        "tools/probe/receipts/synchronize-off-seed-610839776.json",
        "tools/probe/receipts/synchronize-off-seed-324508639.json",
      ]);
    }
    if (family.category === TRYINFATUATING_OBLIVIOUS_CATEGORY) {
      const selector = record(family.selector);
      const runtime = record(family.runtimeGuardSignature);
      const verification = record(family.familyVerification);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      const tailEndsAtMoveEnd = (tail: unknown) => {
        const statements = array(record(tail).statements).map(record);
        expect(statements.at(-1)).toMatchObject({ mnemonic: "goto", operands: ["BattleScript_MoveEnd"] });
      };
      expect(selector).toMatchObject({ symbol: "MOVE_ATTRACT", effect: "EFFECT_ATTRACT", guard: "moveTable.effect === EFFECT_ATTRACT" });
      expect(entryPath.declaredEntryScript).toBe("BattleScript_EffectAttract");
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute.map((step) => String(record(step).mnemonic))).toEqual([
        "attackcanceler", "attackstring", "ppreduce", "accuracycheck", "tryinfatuating",
        "attackanimation", "waitanimation", "printstring", "waitmessage", "goto",
      ]);
      expect(record(graph.attackCanceler)).toMatchObject({ mnemonic: "attackcanceler" });
      expect(record(graph.accuracyCheck)).toMatchObject({ mnemonic: "accuracycheck", operands: ["BattleScript_ButItFailed", "ACC_CURR_MOVE"] });
      expect(record(graph.tryInfatuating)).toMatchObject({ mnemonic: "tryinfatuating", operands: ["BattleScript_ButItFailed"] });
      tailEndsAtMoveEnd(graph.entry);
      tailEndsAtMoveEnd(graph.ordinaryFailureTail);
      tailEndsAtMoveEnd(graph.obliviousTail);
      tailEndsAtMoveEnd(program.entry);
      tailEndsAtMoveEnd(program.ordinaryFailureTail);
      tailEndsAtMoveEnd(program.obliviousTail);
      expect(record(entryPath.tails)).toEqual({
        success: "BattleScript_MoveEnd",
        ordinaryFailure: "BattleScript_ButItFailed -> BattleScript_MoveEnd",
        oblivious: "BattleScript_ObliviousPreventsAttraction -> BattleScript_MoveEnd",
      });
      expect(graphRoute).not.toEqual(expect.arrayContaining([expect.objectContaining({ mnemonic: "datahpupdate" })]));
      expect(runtime).toMatchObject({
        ability: { symbol: "ABILITY_OBLIVIOUS", value: 12 },
        orderedGuards: [
          "gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS first",
          "same attacker/target gender",
          "gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION",
          "attacker gender == MON_GENDERLESS",
          "target gender == MON_GENDERLESS",
        ],
        oblivious: { destination: "BattleScript_ObliviousPreventsAttraction", destinationKind: "hardcoded-not-operand-pointer", lastUsedAbility: 12 },
        ordinaryFailure: { operandDestination: "BattleScript_ButItFailed" },
        success: { advanceBytes: 5 },
      });
      expect(String(runtime.scopeBoundary)).toMatch(/no datahpupdate.*MOVEEND state 12.*King's Rock.*Shell Bell.*charge.*faint/);
      expect(verification).toMatchObject({
        implementation: "src/engine/battleScriptTryinfatuatingOpcode.ts#createBattleScriptTryinfatuatingOpcodeHandlers",
        batchTest: "tests/tryinfatuatingObliviousHookJoinBatch.test.ts",
        oracleReceipt: "tests/gate6R10AttractObliviousReceipt.test.ts",
        oracleFixture: "tools/battle-lab/gate6-r10-attract-off.json",
        oracleControl: "tools/battle-lab/gate6-r10-attract-control-off.json",
        oracleProbe: "tools/probe/probe-gate6-r10-off.py",
      });
      expect(array(verification.oracleReceiptFiles)).toEqual([
        "tools/probe/receipts/gate6-r10-attract-oblivious-off.json",
      ]);
    }
    if (family.category === KINGS_ROCK_CATEGORY) {
      const selector = record(family.selector);
      const dataHpUpdate = record(entryPath.dataHpUpdate);
      const moveEnd = record(entryPath.moveEnd);
      const dispatcher = record(family.dispatcher);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      expect(selector.guard).toBe("gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED");
      expect(String(selector.derivedFrom)).toContain("power != 0");
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(dataHpUpdate).toMatchObject({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] });
      expect(moveEnd).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 });
      expect(dispatcher).toMatchObject({
        state: "MOVEEND_KINGSROCK_SHELLBELL",
        stateValue: 12,
        call: "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)",
      });
      expect(array(record(family.runtimeGuardSignature).orderedGuards)).toEqual([
        "gBattleMoveDamage != 0",
        "atkHoldEffect == HOLD_EFFECT_FLINCH",
        "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
        "TARGET_TURN_DAMAGED",
        "Random() % 100 (draw occurs before the move-flag and target-HP tests)",
        "roll < atkHoldEffectParam",
        "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
        "gBattleMons[gBattlerTarget].hp != 0",
        "SetMoveEffect(FALSE, 0) with MOVE_EFFECT_FLINCH",
      ]);
      expect(record(record(family.runtimeGuardSignature).holdEffect)).toEqual({
        item: "ITEM_KINGS_ROCK",
        effect: "HOLD_EFFECT_FLINCH",
        parameter: 10,
      });
      expect(record(family.familyVerification)).toMatchObject({
        oracleReceipt: "docs/kings-rock-moveend-ground-truth.md",
        oracleFixture: "tools/battle-lab/mechanic-kings-rock-flinch-off.json",
        oracleProbe: "tools/probe/probe-kings-rock-flinch-off.py",
      });
      expect(String(record(family.familyVerification).scopeBoundary)).toMatch(/TICKLE.*Shell Bell/);
      expect(String(record(family.runtimeGuardSignature).scopeBoundary)).toMatch(/HOLD_EFFECT_SHELL_BELL arm is not promoted/);
    }
    if (family.category === SHELL_BELL_CATEGORY) {
      const selector = record(family.selector);
      const dataHpUpdate = record(entryPath.dataHpUpdate);
      const moveEnd = record(entryPath.moveEnd);
      const dispatcher = record(family.dispatcher);
      const graphRoute = array(graph.route);
      const programRoute = array(program.route);
      expect(selector.guard).toBe("gBattleMoves[move].power != 0");
      expect(String(selector.derivedFrom)).toContain("moveend-shell-bell candidate selector");
      expect(graphRoute).toEqual(programRoute);
      expect(graphRoute).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(dataHpUpdate).toMatchObject({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] });
      expect(moveEnd).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 });
      expect(dispatcher).toMatchObject({
        state: "MOVEEND_KINGSROCK_SHELLBELL",
        stateValue: 12,
        call: "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)",
      });
      expect(array(record(family.runtimeGuardSignature).orderedGuards)).toEqual([
        "gBattleMoveDamage != 0",
        "atkHoldEffect == HOLD_EFFECT_SHELL_BELL",
        "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
        "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0",
        "gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL",
        "gBattlerAttacker != gBattlerTarget",
        "gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP",
        "gBattleMons[gBattlerAttacker].hp != 0",
      ]);
      expect(record(record(family.runtimeGuardSignature).holdEffect)).toEqual({
        item: "ITEM_SHELL_BELL",
        effect: "HOLD_EFFECT_SHELL_BELL",
        parameter: 8,
      });
      expect(record(family.familyVerification)).toMatchObject({
        oracleReceipt: "docs/shell-bell-moveend-ground-truth.md",
        oracleFixture: "tools/battle-lab/mechanic-shell-bell-heal-off.json",
        oracleProbe: "tools/probe/probe-shell-bell-heal-off.py",
      });
      expect(String(record(family.familyVerification).scopeBoundary)).toMatch(/FUTURE_SIGHT.*IGNORE_SHELL_BELL/);
      expect(String(record(family.runtimeGuardSignature).scopeBoundary)).toMatch(/HOLD_EFFECT_FLINCH.*is not promoted/);
    }
    for (const path of sourceProvenPathsFor(String(family.category))) {
      if (!array(row.evidence).some((item) => record(item).path === path)) {
        throw new Error(`source-proven row lacks ${path} for ${String(family.category)}`);
      }
    }
  }
}

function assertPerMoveHookJoinContract(manifest: JsonObject): void {
  const summary = record(manifest.summary);
  const hookJoinSummary = record(summary.perMoveHookJoins);
  const sections = record(manifest.sections);
  const hookJoinSections = record(sections.perMoveHookJoins);
  let totalRows = 0;
  let totalUnsupported = 0;
  let totalGaps = 0;

  for (const axis of PER_MOVE_HOOK_JOIN_AXES) {
    const rows = array(hookJoinSections[axis]);
    const axisSummary = record(hookJoinSummary[axis]);
    const rowsByMove = new Map<string, JsonObject>();
    for (const candidate of rows) {
      const row = record(candidate);
      if (typeof row.move !== "string" || rowsByMove.has(row.move)) {
        throw new Error(`${axis} hook-join rows must enumerate each move exactly once`);
      }
      rowsByMove.set(row.move, row);
    }
    if (rows.length !== parameterizationData.moves.length) {
      throw new Error(`${axis} hook-join row count is not derived from the parameterization artifact`);
    }

    let unsupported = 0;
    for (const sourceMove of parameterizationData.moves) {
      const sourceHook = record(record(sourceMove.hooks)[axis]);
      if (!String(sourceHook.reason).trim()) throw new Error(`parameterization ${axis} hook for ${sourceMove.move} lacks a reason`);
      const row = rowsByMove.get(sourceMove.move);
      if (!row) throw new Error(`missing ${axis} hook-join row for ${sourceMove.move}`);
      if (row.axis !== axis || row.status !== sourceHook.status || !String(row.reason).trim()) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} drifts from its source status/reason`);
      }
      if (row.effect !== sourceMove.moveTable.effect || row.entryScript !== sourceMove.battleScript.entryScript) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lost its identity/effect evidence`);
      }
      const locator = `moves:${sourceMove.move}.hooks.${axis}`;
      const sourceArtifact = record(row.sourceArtifact);
      if (sourceArtifact.path !== "src/data/gen/level50-move-parameterization.json" || sourceArtifact.locator !== locator) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lost its source artifact locator`);
      }
      if (!array(row.evidence).some((item) => {
        const evidence = record(item);
        return evidence.path === sourceArtifact.path && evidence.locator === locator;
      })) {
        throw new Error(`${axis} hook-join row for ${sourceMove.move} lacks source artifact evidence`);
      }
      if (sourceHook.status === "unsupported") {
        if (array(sourceHook.supportedCategories).length !== 0 || array(row.categories).length !== 0) {
          throw new Error(`unsupported ${axis} hook-join row for ${sourceMove.move} claims a category`);
        }
        unsupported += 1;
      } else if (sourceHook.status === SOURCE_PROVEN_FAMILY_STATUS) {
        assertSourceProvenFamilyContract(sourceHook, row);
      } else {
        throw new Error(`unknown ${axis} hook-join status for ${sourceMove.move}: ${String(sourceHook.status)}`);
      }
    }

    if (axisSummary.rows !== rows.length || axisSummary.unsupported !== unsupported || axisSummary.gaps !== unsupported) {
      throw new Error(`${axis} hook-join summary makes a false count or zero-gap claim`);
    }
    totalRows += rows.length;
    totalUnsupported += unsupported;
    totalGaps += unsupported;
  }

  const total = record(hookJoinSummary.total);
  if (total.rows !== totalRows || total.unsupported !== totalUnsupported || total.gaps !== totalGaps) {
    throw new Error("per-move hook-join total makes a false count or zero-gap claim");
  }
}

function assertManifestContract(manifest: JsonObject): void {
  const gate6 = record(manifest.gate6);
  expect(gate6.closed).toBe(false);
  expect(String(gate6.verdict)).toMatch(/open/i);
  expect(String(gate6.nextAcceptanceUnit).trim().length).toBeGreaterThan(0);
  expect(JSON.stringify(manifest)).not.toMatch(/\bgate\s*6\s+is\s+(closed|complete)\b/i);
  expect(String(gate6.nextAcceptanceUnit)).toMatch(/^Per-move hook-join family:/);
  assertPerMoveHookJoinContract(manifest);
  const onDamageSummary = record(record(manifest.summary).onDamageMoveEnd);
  const onDamageRow = record(record(manifest.sections).onDamageMoveEnd);
  if (onDamageSummary.promotedRows !== 182
    || onDamageSummary.contactPromotedRows !== 94
    || onDamageSummary.contactExceptions !== 0
    || onDamageSummary.contactBlockers !== 0
    || onDamageSummary.contactRetiredBlockers !== 2
    || onDamageRow.promotedRows !== 182
    || onDamageRow.contactPromotedRows !== 94
    || onDamageRow.contactExceptions !== 0
    || onDamageRow.contactBlockers !== 0
    || onDamageRow.contactRetiredBlockers !== 2) {
    throw new Error("ON_DAMAGE evidence checkpoint must retain the 94/94 contact and 182-row Color Change promotions");
  }
  if (onDamageRow.status !== "family-level-color-change-and-contact-promotion"
    || !Array.isArray(onDamageRow.blockerIds)
    || onDamageRow.blockerIds.length !== 0
    || !Array.isArray(onDamageRow.retiredBlockerIds)
    || onDamageRow.retiredBlockerIds.length !== 3
    || !onDamageRow.retiredBlockerIds.includes("ordered-moveend-route-not-proven")
    || !onDamageRow.retiredBlockerIds.includes("damage-state-guard-not-derived-from-selector")) {
    throw new Error("ON_DAMAGE evidence checkpoint must retire its two contact blockers without active blockers");
  }
  for (const row of collectEvidenceRows(manifest.sections)) {
    expect(String(row.status)).not.toMatch(/^(closed|complete)$/i);
    for (const item of array(row.evidence)) {
      const path = pathWithoutLocator(item);
      expect(path.startsWith("/")).toBe(false);
      expect(path.includes("..")).toBe(false);
      expect(existsSync(path)).toBe(true);
    }
  }
}

describe("Gate-6 mechanics coverage manifest", () => {
  it("regenerates both artifacts byte-identically in an isolated output directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-gate6-manifest-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/gate6-coverage-manifest.ts", "--out-dir", outputDirectory],
      { stdio: "pipe" },
    );
    expect(readFileSync(join(outputDirectory, "gate6-coverage-manifest.json"), "utf8")).toBe(
      readFileSync(JSON_PATH, "utf8"),
    );
    expect(readFileSync(join(outputDirectory, "gate6-coverage-manifest.md"), "utf8")).toBe(
      readFileSync(MARKDOWN_PATH, "utf8"),
    );
  });

  it("recomputes finite effect, roster, hook, and receipt counts from committed inputs", () => {
    const manifest = readManifest();
    const summary = record(manifest.summary);
    const effects = record(summary.effects);
    const moves = record(summary.moves);
    const perMoveHookJoins = record(summary.perMoveHookJoins);
    const onDamageMoveEnd = record(summary.onDamageMoveEnd);
    const synchronizeMoveEnd = record(summary.synchronizeMoveEnd);
    const tryinfatuatingOblivious = record(summary.tryinfatuatingOblivious);
    const corpus = record(summary.corpus);
    const hooks = record(summary.hooks);
    const abilities = record(hooks.abilities);
    const holdEffects = record(hooks.holdEffects);
    const oracle = record(summary.parameterizedOracle);
    const sections = record(manifest.sections);
    const moveEffect = record(sections.moveEffect);
    const manifestEffects = array(moveEffect.effects);
    const manifestMoves = array(moveEffect.moves);
    const manifestHookJoinSections = record(sections.perMoveHookJoins);
    const manifestOnDamageMoveEnd = record(sections.onDamageMoveEnd);
    const manifestSynchronizeMoveEnd = record(sections.synchronizeMoveEnd);
    const manifestTryinfatuatingOblivious = record(sections.tryinfatuatingOblivious);
    const stateFamilies = array(sections.stateFamilies);
    const manifestTrainers = array(record(sections.corpus).trainers);
    const manifestSets = array(record(sections.corpus).level50Sets);
    const manifestAbilities = array(record(sections.hooks).abilities);
    const manifestHoldEffects = array(record(sections.hooks).holdEffects);
    const manifestScenarios = array(record(sections.parameterizedOracle).scenarios);

    expect(manifestEffects).toHaveLength(topologyData.effects.length);
    expect(manifestMoves).toHaveLength(topologyData.moves.length);
    expect(effects).toEqual({ total: 214, staticExecutable: 214 });
    for (const effect of manifestEffects) {
      expect(record(effect)).toMatchObject({
        status: "static-executable",
        semanticAcceptance: "not-established-by-static-census",
      });
    }
    expect(manifestTrainers).toHaveLength(trainersData.entries.length);
    expect(manifestSets).toHaveLength(monsData.entries.filter((entry) => entry.index < 850).length);
    expect(manifestAbilities).toHaveLength(hooksData.universes.abilities.length);
    expect(manifestHoldEffects).toHaveLength(hooksData.universes.holdEffects.length);
    expect(manifestScenarios).toHaveLength(
      readdirSync("tools/battle-lab").filter((name) => /^gate6-r\d+b?-.*\.json$/i.test(name)).length,
    );
    expect(effects.total).toBe(manifestEffects.length);
    expect(moves.total).toBe(manifestMoves.length);
    expect(moves.level50Roster).toBe(parameterizationData.moves.length);
    expect(moves.level50Executable).toBe(
      parameterizationData.moves.filter((move) => move.battleScript.executionInventory === "level50-executable").length,
    );
    expect(moves.level50RosterOnly).toBe(
      parameterizationData.moves.filter((move) => move.battleScript.executionInventory === "level50-roster-only").length,
    );
    for (const axis of PER_MOVE_HOOK_JOIN_AXES) {
      const rows = array(manifestHookJoinSections[axis]);
      const sourceUnsupported = parameterizationData.moves.filter((move) => move.hooks[axis].status === "unsupported").length;
      const axisSummary = record(perMoveHookJoins[axis]);
      expect(rows).toHaveLength(parameterizationData.moves.length);
      expect(axisSummary).toEqual({ rows: rows.length, unsupported: sourceUnsupported, gaps: sourceUnsupported });
      expect(sourceUnsupported).toBe(axis === "item" ? 4 : 9);
    }
    expect(record(perMoveHookJoins.total)).toEqual({ rows: 600, unsupported: 13, gaps: 13 });
    expect(record(summary.kingsRockMoveEnd)).toEqual({
      candidates: 106,
      promotedRows: 105,
      exceptions: 1,
      blockers: 0,
      rosterOnlyCandidates: 12,
    });
    expect(record(sections.kingsRockMoveEnd)).toMatchObject({
      status: SOURCE_PROVEN_FAMILY_STATUS,
      candidates: 106,
      promotedRows: 105,
      exceptions: 1,
      blockers: 0,
      rosterOnlyCandidates: 12,
    });
    expect(record(summary.shellBellMoveEnd)).toEqual({
      candidates: 183,
      promotedRows: 182,
      exceptions: 1,
      blockers: 0,
    });
    expect(record(sections.shellBellMoveEnd)).toMatchObject({
      status: SOURCE_PROVEN_FAMILY_STATUS,
      candidates: 183,
      promotedRows: 182,
      exceptions: 1,
      blockers: 0,
    });
    expect(String(record(sections.shellBellMoveEnd).notes)).toMatch(/182 power != 0 candidates/);
    expect(synchronizeMoveEnd).toEqual({ candidates: 30, promotedRows: 30, exceptions: 0, blockers: 0 });
    expect(manifestSynchronizeMoveEnd).toMatchObject({
      status: SOURCE_PROVEN_FAMILY_STATUS,
      candidates: 30,
      promotedRows: 30,
      exceptions: 0,
      blockers: 0,
      candidateMoves: expect.arrayContaining(["MOVE_TOXIC", "MOVE_THUNDER_WAVE", "MOVE_BOUNCE"]),
    });
    expect(String(manifestSynchronizeMoveEnd.notes)).toMatch(/30 candidates are promoted/);
    expect(tryinfatuatingOblivious).toEqual({ candidates: 1, promotedRows: 1, exceptions: 0, blockers: 0, rosterOnlyCandidates: 0 });
    expect(manifestTryinfatuatingOblivious).toMatchObject({
      status: SOURCE_PROVEN_FAMILY_STATUS,
      candidates: 1,
      promotedRows: 1,
      exceptions: 0,
      blockers: 0,
      rosterOnlyCandidates: 0,
      candidateMoves: ["MOVE_ATTRACT"],
    });
    expect(String(manifestTryinfatuatingOblivious.notes)).toMatch(/Oblivious.*zero-damage/);
    expect(onDamageMoveEnd).toEqual({
      contactCandidates: 94,
      colorChangeCandidates: 183,
      overlapCandidates: 94,
      entryBlockShapes: 78,
      blockers: 0,
      retiredBlockers: 3,
      contactPromotedRows: 94,
      contactExceptions: 0,
      contactBlockers: 0,
      contactRetiredBlockers: 2,
      colorChangePromotedRows: 182,
      colorChangeExceptions: 1,
      colorChangeBlockers: 0,
      colorChangeRetiredBlockers: 2,
      promotedRows: 182,
    });
    expect(manifestOnDamageMoveEnd).toMatchObject({
      status: "family-level-color-change-and-contact-promotion",
      contactCandidates: onDamageMoveEnd.contactCandidates,
      colorChangeCandidates: onDamageMoveEnd.colorChangeCandidates,
      overlapCandidates: onDamageMoveEnd.overlapCandidates,
      entryBlockShapes: onDamageMoveEnd.entryBlockShapes,
      blockerIds: [],
      retiredBlockerIds: [
        "missing-direct-on-damage-off-receipt",
        "ordered-moveend-route-not-proven",
        "damage-state-guard-not-derived-from-selector",
      ],
      contactPromotedRows: 94,
      contactExceptions: 0,
      contactBlockers: 0,
      contactRetiredBlockers: 2,
      colorChangePromotedRows: 182,
      colorChangeExceptions: 1,
      colorChangeBlockers: 0,
      colorChangeRetiredBlockers: 2,
      promotedRows: 182,
    });
    expect(String(manifestOnDamageMoveEnd.notes)).toMatch(/94 contact rows are promoted/);
    expect(String(manifestOnDamageMoveEnd.notes)).toMatch(/182 Color Change rows are promoted/);
    const sourceProven = parameterizationData.moves
      .filter((move) => move.hooks.ability.status === SOURCE_PROVEN_FAMILY_STATUS)
      .map((move) => move.move);
    expect(sourceProven).toHaveLength(291);
    const sourceSoundproof = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).includes(SOUNDPROOF_MOVES_BLOCK_CATEGORY))
      .map((move) => move.move)
      .sort();
    expect(sourceSoundproof).toEqual([...SOUNDPROOF_ROSTER_MOVES].sort());
    const sourceAbsorbing = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).some((category) => (ABSORBING_CATEGORIES as readonly string[]).includes(category)))
      .map((move) => move.move);
    expect(sourceAbsorbing).toHaveLength(30);
    const sourceColorChange = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).includes(COLOR_CHANGE_CATEGORY))
      .map((move) => move.move);
    expect(sourceColorChange).toHaveLength(182);
    expect(sourceColorChange).not.toContain("MOVE_FUTURE_SIGHT");
    const soundproofOnlyAbilityGaps = parameterizationData.moves.length - sourceSoundproof.length;
    expect(soundproofOnlyAbilityGaps).toBe(291);
    const sourceSynchronize = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).includes(SYNCHRONIZE_CATEGORY))
      .map((move) => move.move);
    expect(sourceSynchronize).toHaveLength(30);
    const sourceAttract = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).includes(TRYINFATUATING_OBLIVIOUS_CATEGORY))
      .map((move) => move.move);
    expect(sourceAttract).toEqual(["MOVE_ATTRACT"]);
    const sourceImmunity = parameterizationData.moves
      .filter((move) => array(move.hooks.ability.supportedCategories).map(String).includes(IMMUNITY_CATEGORY))
      .map((move) => move.move);
    expect(sourceImmunity).toHaveLength(97);
    const uniqueNonSoundproofProven = new Set([...sourceAbsorbing, ...sourceColorChange, ...sourceSynchronize, ...sourceAttract, ...sourceImmunity]
      .filter((move) => !sourceSoundproof.includes(move)));
    expect(soundproofOnlyAbilityGaps - Number(record(perMoveHookJoins.ability).gaps)).toBe(uniqueNonSoundproofProven.size);
    expect(parameterizationData.moves.length + soundproofOnlyAbilityGaps).toBe(591);
    expect(Number(record(perMoveHookJoins.total).gaps)).toBe(13);
    const sourceKingsRock = parameterizationData.moves
      .filter((move) => array(move.hooks.item.supportedCategories).map(String).includes(KINGS_ROCK_CATEGORY))
      .map((move) => move.move);
    expect(sourceKingsRock).toHaveLength(105);
    expect(sourceKingsRock).not.toContain("MOVE_TICKLE");
    expect(parameterizationData.moves.filter((move) =>
      array(move.hooks.item.supportedCategories).map(String).includes(KINGS_ROCK_CATEGORY)
      && move.battleScript.executionInventory === "level50-roster-only")).toHaveLength(12);
    const sourceShellBell = parameterizationData.moves
      .filter((move) => array(move.hooks.item.supportedCategories).map(String).includes(SHELL_BELL_CATEGORY))
      .map((move) => move.move);
    expect(sourceShellBell).toHaveLength(182);
    expect(sourceShellBell).not.toContain("MOVE_FUTURE_SIGHT");
    expect(sourceKingsRock.every((move) => sourceShellBell.includes(move))).toBe(true);
    const sourceItemMoveEnd = parameterizationData.moves
      .filter((move) => array(move.hooks.item.supportedCategories).map(String).includes(ITEM_MOVE_END_CATEGORY))
      .map((move) => move.move);
    expect(sourceItemMoveEnd).toHaveLength(114);
    expect(sourceItemMoveEnd).not.toContain("MOVE_ASSIST");
    expect(sourceItemMoveEnd).not.toContain("MOVE_METRONOME");
    expect(sourceItemMoveEnd.some((move) => sourceShellBell.includes(move))).toBe(false);
    const sourceProvenItemRows = array(manifestHookJoinSections.item)
      .map(record)
      .filter((row) => row.status === SOURCE_PROVEN_FAMILY_STATUS);
    expect(sourceProvenItemRows.map((row) => String(row.move)).sort()).toEqual([...sourceShellBell, ...sourceItemMoveEnd].sort());
    for (const row of sourceProvenItemRows) {
      const sourceMove = parameterizationData.moves.find((move) => move.move === row.move)!;
      assertSourceProvenFamilyContract(record(sourceMove.hooks.item), row);
    }
    const sourceProvenRows = array(manifestHookJoinSections.ability)
      .map(record)
      .filter((row) => row.status === SOURCE_PROVEN_FAMILY_STATUS);
    expect(sourceProvenRows.map((row) => String(row.move)).sort()).toEqual([...sourceProven].sort());
    for (const row of sourceProvenRows) {
      const sourceMove = parameterizationData.moves.find((move) => move.move === row.move)!;
      assertSourceProvenFamilyContract(record(sourceMove.hooks.ability), row);
    }
    expect(corpus.ordinaryTrainers).toBe(300);
    expect(corpus.level50Sets).toBe(850);
    expect(abilities.total).toBe(manifestAbilities.length);
    expect(holdEffects.total).toBe(manifestHoldEffects.length);
    expect(oracle.scenarioRequests).toBe(manifestScenarios.length);
    expect(oracle.receiptDocumented).toBe(
      manifestScenarios.filter((scenario) => record(scenario).status === "oracle-receipted").length,
    );
    expect(oracle.receiptGaps).toBe(
      manifestScenarios.filter((scenario) => record(scenario).status !== "oracle-receipted").length,
    );
    expect(record(summary.stateFamilies)).toEqual({ total: 55, tier1Covered: 55 });
    expect(record(summary.interactions)).toEqual({ total: 28, kernelProven: 6, oracleReceipted: 22, receiptGaps: 0 });
    for (const [symbol, expectedEvidence] of EXPLICIT_STATE_BEHAVIOR_ROWS) {
      const row = stateFamilies.find((candidate) => record(candidate).label === symbol);
      expect(row).toBeDefined();
      const stateRow = record(row);
      expect(stateRow.status).toBe("tier1-covered");
      expect(array(stateRow.evidence)).toEqual(expect.arrayContaining(
        expectedEvidence.map(([path, locator]) => expect.objectContaining({
          path,
          locator,
          kind: "tier-1-behavior-test",
        })),
      ));
    }
  });

  it("keeps every family witness when a source-proven row legitimately spans multiple families", () => {
    const manifest = readManifest();
    const abilityRows = array(record(record(manifest.sections).perMoveHookJoins).ability).map(record);
    const soundproofMove = parameterizationData.moves.find((move) => move.move === "MOVE_HYPER_VOICE")!;
    const absorbingMove = parameterizationData.moves.find((move) => move.move === "MOVE_THUNDER_PUNCH")!;
    const soundproofRow = abilityRows.find((row) => row.move === soundproofMove.move)!;
    const absorbingRow = abilityRows.find((row) => row.move === absorbingMove.move)!;
    const mixedSourceHook = structuredClone(record(soundproofMove.hooks.ability));
    const mixedEvidence = record(mixedSourceHook.evidence);
    const absorbingEvidence = record(record(absorbingMove.hooks.ability).evidence);
    const absorbingCategories = array(record(absorbingMove.hooks.ability).supportedCategories)
      .filter((category) => category !== COLOR_CHANGE_CATEGORY);
    const absorbingFamilies = array(absorbingEvidence.families)
      .filter((family) => record(family).category !== COLOR_CHANGE_CATEGORY);
    mixedSourceHook.supportedCategories = [
      ...array(mixedSourceHook.supportedCategories),
      ...absorbingCategories,
    ];
    mixedEvidence.families = [
      ...array(mixedEvidence.families),
      ...absorbingFamilies,
    ];
    const mixedRow = structuredClone(soundproofRow);
    mixedRow.categories = [...array(mixedRow.categories), ...absorbingCategories];
    mixedRow.evidence = [...array(mixedRow.evidence), ...array(absorbingRow.evidence)];

    expect(mixedSourceHook.supportedCategories).toEqual([
      SOUNDPROOF_MOVES_BLOCK_CATEGORY,
      COLOR_CHANGE_CATEGORY,
      "absorbing-volt-absorb",
      CONTACT_CATEGORY,
      SYNCHRONIZE_CATEGORY,
    ]);
    expect(() => assertSourceProvenFamilyContract(mixedSourceHook, mixedRow)).not.toThrow();
  });

  it("rejects unknown evidence paths, false hook-join zeroes, and false closure claims", () => {
    const manifest = readManifest();
    assertManifestContract(manifest);

    const unknownPath = structuredClone(manifest);
    const firstRow = collectEvidenceRows(unknownPath.sections)[0]!;
    const firstEvidence = array(firstRow.evidence)[0] as JsonObject;
    firstEvidence.path = "docs/this-gate6-evidence-does-not-exist.md";
    expect(() => assertManifestContract(unknownPath)).toThrow();

    const falseClosure = structuredClone(manifest);
    const falseGate6 = record(falseClosure.gate6);
    falseGate6.closed = true;
    expect(() => assertManifestContract(falseClosure)).toThrow();

    const falseItemZero = structuredClone(manifest);
    const falseItemJoins = record(record(falseItemZero.summary).perMoveHookJoins);
    falseItemJoins.item = {
      ...record(falseItemJoins.item),
      gaps: 0,
    };
    expect(() => assertManifestContract(falseItemZero)).toThrow();

    const falseTotalZero = structuredClone(manifest);
    const falseTotalJoins = record(record(falseTotalZero.summary).perMoveHookJoins);
    falseTotalJoins.total = {
      ...record(falseTotalJoins.total),
      gaps: 0,
    };
    expect(() => assertManifestContract(falseTotalZero)).toThrow();

    const falseOnDamagePromotion = structuredClone(manifest);
    record(record(falseOnDamagePromotion.summary).onDamageMoveEnd).promotedRows = 1;
    expect(() => assertManifestContract(falseOnDamagePromotion)).toThrow();
  });

  it("keeps widened scope and receipts unchanged while surfacing the hook-join gap", () => {
    const manifest = readManifest();
    const sections = record(manifest.sections);
    const hookSections = record(sections.hooks);
    const widened = [
      ...array(hookSections.abilities),
      ...array(hookSections.holdEffects),
    ].filter((row) => {
      const item = record(row);
      return item.factoryCarrierCount === 0 && Number(item.legalCarrierCount) > 0;
    });
    expect(widened.length).toBeGreaterThan(0);
    for (const row of widened) expect(record(row).status).toBe("zero-factory-carrier-widened-scope");

    const oracle = record(record(manifest.summary).parameterizedOracle);
    const scenarios = array(record(sections.parameterizedOracle).scenarios);
    const abilities = array(hookSections.abilities).map(record);
    const r12b = record(scenarios.find((scenario) => record(scenario).cardId === "R12b"));
    const r11 = record(scenarios.find((scenario) => record(scenario).cardId === "R11"));
    const r6 = record(scenarios.find((scenario) => record(scenario).cardId === "R6"));
    const r15 = record(scenarios.find((scenario) => record(scenario).cardId === "R15"));
    const r3 = record(scenarios.find((scenario) => record(scenario).cardId === "R3"));
    const r9 = record(scenarios.find((scenario) => record(scenario).cardId === "R9"));
    const r2 = scenarios
      .filter((scenario) => record(scenario).cardId === "R2")
      .map((scenario) => record(scenario));
    const r12 = record(scenarios.find((scenario) => record(scenario).cardId === "R12"));
    expect(r12b).toMatchObject({ status: "oracle-receipted", captureCount: 20 });
    expect(r11).toMatchObject({ status: "oracle-receipted", captureCount: 44 });
    expect(r6).toMatchObject({ status: "oracle-receipted", captureCount: 23 });
    expect(r15).toMatchObject({ status: "oracle-receipted", captureCount: 12 });
    expect(r3).toMatchObject({ status: "oracle-receipted", captureCount: 18 });
    expect(r9).toMatchObject({ status: "oracle-receipted", captureCount: 20 });
    expect(r2).toHaveLength(2);
    expect(r2.map((scenario) => scenario.captureCount).sort((a, b) => Number(a) - Number(b))).toEqual([14, 17]);
    for (const scenario of r2) expect(scenario.status).toBe("oracle-receipted");
    expect(r12).toMatchObject({ status: "oracle-receipted", captureCount: 10 });
    const voltAbsorb = abilities.find((row) => row.label === "ABILITY_VOLT_ABSORB")!;
    const waterAbsorb = abilities.find((row) => row.label === "ABILITY_WATER_ABSORB")!;
    const flashFire = abilities.find((row) => row.label === "ABILITY_FLASH_FIRE")!;
    const staticAbility = abilities.find((row) => row.label === "ABILITY_STATIC")!;
    expect(voltAbsorb).toMatchObject({
      status: "oracle-receipted-hook",
      oracleReceiptCards: ["absorbing-volt-absorb-off"],
    });
    expect(waterAbsorb).toMatchObject({
      status: "shared-dispatcher-sibling-tier1-verified",
      oracleReceiptCards: [],
    });
    expect(flashFire).toMatchObject({
      status: "shared-dispatcher-sibling-tier1-verified",
      oracleReceiptCards: [],
    });
    expect(String(waterAbsorb.notes)).toMatch(/R10\/R7 only happened to include those abilities/);
    expect(String(flashFire.notes)).toMatch(/R10\/R7 only happened to include those abilities/);
    expect(staticAbility).toMatchObject({
      status: "shared-dispatcher-sibling-tier1-verified",
      oracleReceiptCards: [],
    });
    expect(String(staticAbility.notes)).toMatch(/fresh Battle Scene OFF Static receipt/);
    expect(String(staticAbility.notes)).toMatch(/other five contact ability outcomes retain explicit no-direct-receipt gaps/);
    expect(oracle.receiptDocumented).toBe(24);
    expect(oracle.receiptGaps).toBe(0);
    expect(String(record(manifest.gate6).nextAcceptanceUnit)).toMatch(/^Per-move hook-join family:/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Gate 6 is OPEN/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/\*\*4 item join gaps\*\* and \*\*9 ability join gaps\*\*/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/King's Rock checkpoint: \*\*106\*\* finite Level-50 flag selectors, \*\*105\*\* promoted/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Shell Bell checkpoint: \*\*183\*\* finite Level-50 power != 0 candidates.*\*\*182\*\* promoted/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Item-move-end checkpoint: \*\*116\*\* finite Level-50 item-axis candidates.*\*\*114\*\* promoted to MOVEEND_ITEM_EFFECTS_ALL state 11/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/296 item rows are source-proven/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/291 ability rows are source-proven/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Immunity checkpoint: \*\*99\*\* finite Level-50 ability-axis candidates, \*\*97\*\* promoted/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Synchronize checkpoint: \*\*30\*\* finite Level-50 candidates, \*\*30\*\* promoted/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Attract\/Oblivious checkpoint: \*\*1\*\* finite EFFECT_ATTRACT candidate, \*\*1\*\* promoted, \*\*0\*\* exceptions, \*\*0\*\* roster-only candidates, and \*\*0\*\* active blockers/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Explosion\/Damp checkpoint: \*\*2\*\* finite EFFECT_EXPLOSION candidates, \*\*2\*\* promoted, \*\*0\*\* exceptions, \*\*0\*\* roster-only candidates, \*\*25\*\* selectable occurrences \/ \*\*26\*\* full carrier rows, and \*\*0\*\* active blockers/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/ON_DAMAGE checkpoint: \*\*94\*\* contact candidates and \*\*183\*\* Color Change candidates/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/24\/24.*scenario receipts documented; \*\*0\*\* request-level gaps/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).toMatch(/Receipt count alone does not close the broader Gate-6 breadth acceptance/);
    expect(readFileSync(MARKDOWN_PATH, "utf8")).not.toMatch(/fixture-only-no-committed-receipt/);
  });
});
