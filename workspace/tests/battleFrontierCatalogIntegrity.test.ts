import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import frontierHeldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import speciesNamesData from "../src/data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

type FrontierMon = {
  index: number;
  label: string;
  species: string;
  moves: string[];
  itemTableId: number;
  itemName: string;
  evSpread: number;
  evSpreadStats: string[];
  nature: string;
};
type Move = { move: string; id: number; name: string; type: string; power: number; accuracy: number; pp: number; effect: string; secondaryEffectChance: number; target: string[]; priority: number; flags: string[]; description: string; contest: unknown };

const mons = frontierMonsData.entries as FrontierMon[];
const moves = movesData.moves as Move[];
const sourceSoundMoves = movesData.sourceTables.soundMoves as Array<{
  move: string;
  id: number;
}>;
const speciesStats = new Map((speciesStatsData.species as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const speciesTypes = new Map((speciesTypesData.species as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const speciesNames = new Map((speciesNamesData.species as Array<{ species: string }>).map((entry) => [entry.species, entry]));
const natures = new Map((naturesData.natures as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const heldById = new Map((frontierHeldItemsData.entries as Array<{ itemTableId: number; itemName: string }>).map((entry) => [entry.itemTableId, entry]));
const heldByName = new Map((frontierHeldItemsData.entries as Array<{ itemTableId: number; itemName: string }>).map((entry) => [entry.itemName, entry]));
const movesBySymbol = new Map(moves.map((entry) => [entry.move, entry]));

const generatedArtifacts = [
  { extractor: "tools/extract/extract-moves.ts", artifact: "moves.json" },
  { extractor: "tools/extract/extract-species-types.ts", artifact: "species-types.json" },
  { extractor: "tools/extract/extract-battle-frontier-data.ts", artifact: "battle-frontier-mons.json" },
  { extractor: "tools/extract/extract-battle-frontier-data.ts", artifact: "natures.json" },
] as const;

const evFlagValues = new Map(
  [...readFileSync("reference/pokeemerald/include/constants/battle_frontier.h", "utf8").matchAll(
    /^#define\s+(F_EV_SPREAD_[A-Z_]+)\s+\(1\s*<<\s*(\d+)\)\s*$/gm,
  )].map(([, flag, shift]) => [flag!, 1 << Number(shift)]),
);
const sourceEvSpreads = new Map(
  [...readFileSync("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h", "utf8").matchAll(
    /\[(FRONTIER_MON_[A-Z0-9_]+)\]\s*=\s*\{\s*\.species\s*=\s*SPECIES_[A-Z0-9_]+,\s*\.moves\s*=\s*\{[^}]*\},\s*\.itemTableId\s*=\s*BATTLE_FRONTIER_ITEM_[A-Z0-9_]+,\s*\.evSpread\s*=\s*([^,]+?),\s*\.nature\s*=\s*NATURE_[A-Z0-9_]+\s*\}/g,
  )].map(([, label, evSpread]) => [label!, evSpread!.split("|").map((flag) => flag.trim())]),
);

describe("Battle Factory generated-catalog integrity", () => {
  it("regenerates every complete catalog artifact byte-for-byte in isolated output directories", () => {
    // The extractors default to the committed directory for developer use. Tests
    // direct each run into a fresh directory so Vitest workers cannot race while
    // proving deterministic bytes.
    for (const { extractor, artifact } of generatedArtifacts) {
      const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-catalog-"));
      execFileSync(process.execPath, ["--experimental-strip-types", extractor, "--out-dir", outputDirectory], { stdio: "pipe" });
      expect(readFileSync(join(outputDirectory, artifact), "utf8"), `regenerated ${artifact}`).toBe(
        readFileSync(join("src/data/gen", artifact), "utf8"),
      );
    }
  });

  it("enumerates all 882 source sets in numeric order and preserves the explicit Level-50 0-849 split", () => {
    expect(frontierMonsData.count).toBe(882);
    expect(mons).toHaveLength(882);
    for (const [index, mon] of mons.entries()) expect(mon.index, `unexpected index for ${mon.label}`).toBe(index);
    const level50 = mons.filter((mon) => mon.index <= 849);
    const openOnly = mons.filter((mon) => mon.index >= 850);
    expect(level50).toHaveLength(850);
    expect(openOnly).toHaveLength(32);
    expect(level50.at(-1)!.index).toBe(849);
    expect(openOnly[0]!.index).toBe(850);
  });

  it("resolves every set's species, nature, held-item indirection, and exactly four move symbols", () => {
    for (const mon of mons) {
      expect(speciesStats.get(mon.species), `stats missing for ${mon.label}`).toBeDefined();
      expect(speciesTypes.get(mon.species), `types missing for ${mon.label}`).toBeDefined();
      expect(speciesNames.get(mon.species), `display name missing for ${mon.label}`).toBeDefined();
      expect(natures.get(mon.nature), `nature missing for ${mon.label}`).toBeDefined();
      const itemById = heldById.get(mon.itemTableId);
      const itemByName = heldByName.get(mon.itemName);
      expect(itemById, `held item ID missing for ${mon.label}`).toBeDefined();
      expect(itemByName, `held item symbol missing for ${mon.label}`).toBeDefined();
      expect(itemById).toBe(itemByName);
      expect(itemById!.itemName).toBe(mon.itemName);
      expect(mon.moves, `expected four move slots for ${mon.label}`).toHaveLength(4);
      for (const move of mon.moves) expect(movesBySymbol.get(move), `move missing for ${mon.label}: ${move}`).toBeDefined();
    }
  });

  it("resolves all 882 source EV spreads to the six pinned constants with no unknown bits", () => {
    expect(evFlagValues).toEqual(
      new Map([
        ["F_EV_SPREAD_HP", 1],
        ["F_EV_SPREAD_ATTACK", 2],
        ["F_EV_SPREAD_DEFENSE", 4],
        ["F_EV_SPREAD_SPEED", 8],
        ["F_EV_SPREAD_SP_ATTACK", 16],
        ["F_EV_SPREAD_SP_DEFENSE", 32],
      ]),
    );
    expect(sourceEvSpreads).toHaveLength(882);
    const knownMask = [...evFlagValues.values()].reduce((mask, flag) => mask | flag, 0);
    expect(knownMask).toBe(0x3f);

    for (const mon of mons) {
      const sourceFlags = sourceEvSpreads.get(mon.label);
      expect(sourceFlags, `source EV spread missing for ${mon.label}`).toBeDefined();
      expect(mon.evSpreadStats, `named EV components for ${mon.label}`).toEqual(sourceFlags);
      expect(mon.evSpreadStats, `empty EV spread for ${mon.label}`).not.toHaveLength(0);
      expect(new Set(mon.evSpreadStats).size, `duplicate EV component for ${mon.label}`).toBe(mon.evSpreadStats.length);
      for (const flag of mon.evSpreadStats) expect(evFlagValues.get(flag), `unknown EV component ${flag} for ${mon.label}`).toBeDefined();

      const resolvedMask = mon.evSpreadStats.reduce((mask, flag) => mask | evFlagValues.get(flag)!, 0);
      expect(mon.evSpread, `numeric EV mask for ${mon.label}`).toBe(resolvedMask);
      expect(mon.evSpread & ~knownMask, `unknown EV bit for ${mon.label}`).toBe(0);
      expect(mon.evSpread, `source-legal nonzero EV mask for ${mon.label}`).toBeGreaterThan(0);
    }
  });

  it("validates all 355 move records carry the already-extracted battle-engine fields", () => {
    expect(moves).toHaveLength(355);
    for (const [id, move] of moves.entries()) {
      expect(move.id, `numeric ID for ${move.move}`).toBe(id);
      expect(move.move).toMatch(/^MOVE_[A-Z0-9_]+$/);
      expect(move.name).toEqual(expect.any(String));
      expect(move.type).toMatch(/^TYPE_[A-Z0-9_]+$/);
      expect(move.power).toBeGreaterThanOrEqual(0);
      expect(move.accuracy).toBeGreaterThanOrEqual(0);
      expect(move.pp).toBeGreaterThanOrEqual(0);
      expect(move.effect).toMatch(/^EFFECT_[A-Z0-9_]+$/);
      expect(move.secondaryEffectChance).toBeGreaterThanOrEqual(0);
      expect(move.secondaryEffectChance).toBeLessThanOrEqual(100);
      expect(move.priority).toEqual(expect.any(Number));
      for (const target of move.target) expect(target).toMatch(/^MOVE_TARGET_[A-Z0-9_]+$/);
      for (const flag of move.flags) expect(flag).toMatch(/^FLAG_[A-Z0-9_]+$/);
      if (move.id === 0) {
        expect(move.move).toBe("MOVE_NONE");
        expect(move.contest).toBeNull();
      } else {
        expect(move.description.length).toBeGreaterThan(0);
        expect(move.contest).not.toBeNull();
      }
    }
  });

  it("extracts the complete sSoundMovesTable in exact source order", () => {
    expect(sourceSoundMoves).toEqual([
      { move: "MOVE_GROWL", id: 45 },
      { move: "MOVE_ROAR", id: 46 },
      { move: "MOVE_SING", id: 47 },
      { move: "MOVE_SUPERSONIC", id: 48 },
      { move: "MOVE_SCREECH", id: 103 },
      { move: "MOVE_SNORE", id: 173 },
      { move: "MOVE_UPROAR", id: 253 },
      { move: "MOVE_METAL_SOUND", id: 319 },
      { move: "MOVE_GRASS_WHISTLE", id: 320 },
      { move: "MOVE_HYPER_VOICE", id: 304 },
    ]);
    expect(new Set(sourceSoundMoves.map(({ id }) => id)).size).toBe(10);
    for (const selector of sourceSoundMoves) {
      expect(moves[selector.id]).toMatchObject(selector);
    }
  });
});
