import { describe, expect, it } from "vitest";
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchBenchMember,
} from "../src/engine/battleAiSwitchInto.ts";

const MOVE_KARATE_CHOP = 2;
const MOVE_TACKLE = 33;
const MOVE_NONE = 0;

const URSARING_TYPES = ["TYPE_NORMAL", "TYPE_NORMAL"] as const;

function member(changes: Partial<BattleAiSwitchBenchMember> = {}): BattleAiSwitchBenchMember {
  return Object.freeze({
    species: changes.species ?? 0,
    hp: changes.hp ?? 0,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: changes.moves ?? Object.freeze([MOVE_NONE, MOVE_NONE, MOVE_NONE, MOVE_NONE]),
  });
}

function bench(slots: readonly Partial<BattleAiSwitchBenchMember>[]): BattleAiSwitchBench {
  const filled = [0, 1, 2, 3, 4, 5].map((i) => member(slots[i] ?? {}));
  return filled as unknown as BattleAiSwitchBench;
}

describe("GetMostSuitableMonToSwitchInto pass 1 (type matchup + super-effective-move gate)", () => {
  it(
    "docs/forced-switch-ground-truth.md §2a live ledger: AI sends MACHOP (index 2), skipping PIDGEY "
      + "(index 1, the 'next living index' decoy) -- PIDGEY's Tackle is neutral vs NORMAL, MACHOP's "
      + "Karate Chop is super effective",
    () => {
      const result = getMostSuitableMonToSwitchInto(
        bench([
          { species: 191, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], moves: [MOVE_TACKLE, 0, 0, 0] }, // SUNKERN, fainted (active slot)
          { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_TACKLE, 0, 0, 0] }, // PIDGEY
          { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }, // MACHOP
        ]),
        0, // activePartyIndex: SUNKERN's own slot
        URSARING_TYPES,
      );
      expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
    },
  );

  it("excludes the active battler's own party slot even if it were (impossibly) still HP > 0", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
  });

  it("skips empty (species 0) and fainted (hp 0) slots", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 0, hp: 0 },
        { species: 66, hp: 0, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
        { species: 16, hp: 50, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 3 });
  });

  it("damage-fallback-needed: no bench mon has a super-effective move (pass 2's own scope, not modeled here)", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_TACKLE, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "damage-fallback-needed" });
  });

  it("MOVE_NONE slots never count as a super-effective move", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_NONE, MOVE_NONE, MOVE_NONE, MOVE_NONE] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "damage-fallback-needed" });
  });
});
