import { describe, expect, it } from "vitest";
import frontierHeldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import speciesNamesData from "../src/data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

type FrontierMon = { index: number; label: string; species: string; moves: string[]; itemTableId: number; itemName: string; nature: string };
type Move = { move: string; id: number; name: string; type: string; power: number; accuracy: number; pp: number; effect: string; secondaryEffectChance: number; target: string[]; priority: number; flags: string[]; description: string; contest: unknown };

const mons = frontierMonsData.entries as FrontierMon[];
const moves = movesData.moves as Move[];
const speciesStats = new Map((speciesStatsData.species as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const speciesTypes = new Map((speciesTypesData.species as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const speciesNames = new Map((speciesNamesData.species as Array<{ species: string }>).map((entry) => [entry.species, entry]));
const natures = new Map((naturesData.natures as Array<{ name: string }>).map((entry) => [entry.name, entry]));
const heldById = new Map((frontierHeldItemsData.entries as Array<{ itemTableId: number; itemName: string }>).map((entry) => [entry.itemTableId, entry]));
const heldByName = new Map((frontierHeldItemsData.entries as Array<{ itemTableId: number; itemName: string }>).map((entry) => [entry.itemName, entry]));
const movesBySymbol = new Map(moves.map((entry) => [entry.move, entry]));

describe("Battle Factory generated-catalog integrity", () => {
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
});
