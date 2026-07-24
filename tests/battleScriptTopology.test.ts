import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import inventoryData from "../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Effect = { id: number; effect: string; entryScript: string };
type Opcode = { id: number; opcode: string; dispatcher: string };
type MoveTopology = { id: number; move: string; effectId: number; effect: string; entryScript: string };
type InventoryMove = { id: number; move: string; effect: string; frontierMonCount: number; speciesCount: number };

const topology = topologyData as {
  counts: { effects: number; opcodes: number; moves: number; level50FactoryReachableMoves: number; level50FactoryReachableEffectFamilies: number };
  effects: Effect[];
  opcodes: Opcode[];
  moves: MoveTopology[];
  level50FactoryReachableEffects: Array<Effect & { moves: InventoryMove[] }>;
};
const moves = (movesData as { moves: Array<{ id: number; move: string; effect: string }> }).moves;
const level50Moves = (inventoryData as { tiers: { level50: { moves: InventoryMove[] } } }).tiers.level50.moves;

describe("Battle Script topology extraction", () => {
  it("regenerates byte-for-byte with its generated move input in one isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-topology-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-moves.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-topology.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "battle-script-topology.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-topology.json", "utf8"),
    );
  });

  it("preserves all 214 numeric EFFECT rows in source order, including shared entry labels", () => {
    expect(topology.counts.effects).toBe(214);
    expect(topology.effects).toHaveLength(214);
    for (const [id, effect] of topology.effects.entries()) {
      expect(effect.id).toBe(id);
      expect(effect.effect).toMatch(/^EFFECT_[A-Z0-9_]+$/);
      expect(effect.entryScript).toMatch(/^BattleScript_[A-Za-z0-9_]+$/);
    }
    expect(topology.effects[0]).toEqual({ id: 0, effect: "EFFECT_HIT", entryScript: "BattleScript_EffectHit" });
    expect(topology.effects[12]).toEqual({ id: 12, effect: "EFFECT_SPEED_UP", entryScript: "BattleScript_EffectHit" });
    expect(topology.effects[13]).toEqual({ id: 13, effect: "EFFECT_SPECIAL_ATTACK_UP", entryScript: "BattleScript_EffectSpecialAttackUp" });
  });

  it("preserves all BattleScriptOpcode enum rows in numeric order and maps each to its Cmd dispatcher", () => {
    expect(topology.counts.opcodes).toBe(249);
    expect(topology.opcodes).toHaveLength(249);
    for (const [id, opcode] of topology.opcodes.entries()) {
      expect(opcode.id).toBe(id);
      expect(opcode.opcode).toMatch(/^B_SCR_OP_[A-Z0-9_]+$/);
      expect(opcode.dispatcher).toMatch(/^Cmd_[A-Za-z0-9_]+$/);
    }
    expect(topology.opcodes[0]).toEqual({ id: 0, opcode: "B_SCR_OP_ATTACKCANCELER", dispatcher: "Cmd_attackcanceler" });
    expect(topology.opcodes.at(-1)).toEqual({ id: 248, opcode: "B_SCR_OP_TRAINERSLIDEOUT", dispatcher: "Cmd_trainerslideout" });
  });

  it("joins every generated move to an indexed effect and its source entry script", () => {
    expect(topology.counts.moves).toBe(355);
    expect(topology.moves).toHaveLength(355);
    const effects = new Map(topology.effects.map((effect) => [effect.effect, effect]));
    for (const [id, move] of topology.moves.entries()) {
      const generated = moves[id]!;
      const effect = effects.get(move.effect);
      expect(move.id).toBe(id);
      expect(move.move).toBe(generated.move);
      expect(move.effect).toBe(generated.effect);
      expect(effect).toBeDefined();
      expect(move.effectId).toBe(effect!.id);
      expect(move.entryScript).toBe(effect!.entryScript);
    }
  });

  it("proves sibling moves sharing an effect resolve to the same source script entry", () => {
    const siblings = new Map<string, MoveTopology[]>();
    for (const move of topology.moves) siblings.set(move.effect, [...(siblings.get(move.effect) ?? []), move]);
    for (const [effect, family] of siblings) {
      if (family.length < 2) continue;
      expect(new Set(family.map((move) => move.entryScript)), `${effect} sibling entrypoints`).toHaveLength(1);
    }
    const alwaysHit = siblings.get("EFFECT_ALWAYS_HIT")!;
    expect(alwaysHit.map((move) => move.move)).toContain("MOVE_AERIAL_ACE");
    expect(new Set(alwaysHit.map((move) => move.entryScript))).toEqual(new Set(["BattleScript_EffectHit"]));
  });

  it("enumerates exactly the Level-50 Factory inventory's reachable effect families in effect-id order", () => {
    const inventoryIds = new Set(level50Moves.map((move) => move.id));
    const expectedEffects = new Set(level50Moves.map((move) => move.effect));
    expect(topology.counts.level50FactoryReachableMoves).toBe(level50Moves.length);
    expect(topology.counts.level50FactoryReachableEffectFamilies).toBe(expectedEffects.size);
    expect(topology.level50FactoryReachableEffects).toHaveLength(expectedEffects.size);
    let lastId = -1;
    for (const family of topology.level50FactoryReachableEffects) {
      expect(family.id).toBeGreaterThan(lastId);
      lastId = family.id;
      expect(expectedEffects.has(family.effect)).toBe(true);
      expect(family.moves.length).toBeGreaterThan(0);
      for (const move of family.moves) {
        expect(inventoryIds.has(move.id)).toBe(true);
        expect(move.effect).toBe(family.effect);
      }
    }
  });
});
