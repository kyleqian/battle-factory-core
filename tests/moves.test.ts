import { describe, expect, it } from "vitest";
import moves from "../src/data/gen/moves.json" with { type: "json" };

type Move = {
  move: string;
  id: number;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  description: string;
  contest: { category: string; appeal: number; jam: number } | null;
};
const byMove = new Map<string, Move>((moves.moves as Move[]).map((m) => [m.move, m]));

describe("moves.json (Battle-Moves / Contest-Moves page extraction)", () => {
  it("covers all MOVES_COUNT=355 gen-3 moves (MOVE_NONE..MOVE_PSYCHO_BOOST)", () => {
    expect(moves.moves).toHaveLength(355);
    expect(byMove.get("MOVE_NONE")!.id).toBe(0);
    expect(byMove.get("MOVE_PSYCHO_BOOST")!.id).toBe(354);
  });

  it("pins battle_moves.h fields for a spot-checked move (POUND)", () => {
    const pound = byMove.get("MOVE_POUND")!;
    expect(pound.name).toBe("POUND");
    expect(pound.type).toBe("TYPE_NORMAL");
    expect(pound.power).toBe(40);
    expect(pound.accuracy).toBe(100);
    expect(pound.pp).toBe(35);
  });

  it("pins battle_moves.h fields for THUNDERBOLT and PSYCHO BOOST", () => {
    const thunderbolt = byMove.get("MOVE_THUNDERBOLT")!;
    expect(thunderbolt.type).toBe("TYPE_ELECTRIC");
    expect(thunderbolt.power).toBe(95);
    expect(thunderbolt.accuracy).toBe(100);
    expect(thunderbolt.pp).toBe(15);

    const psychoBoost = byMove.get("MOVE_PSYCHO_BOOST")!;
    expect(psychoBoost.power).toBe(140);
    expect(psychoBoost.accuracy).toBe(90);
    expect(psychoBoost.pp).toBe(5);
  });

  it("decodes move_descriptions.h's \\n escape to a real line break", () => {
    expect(byMove.get("MOVE_POUND")!.description).toBe("Pounds the foe with\nforelegs or tail.");
  });

  it("resolves contest_moves.h's category + gContestEffects' appeal/jam (POUND: highly appealing, tough)", () => {
    expect(byMove.get("MOVE_POUND")!.contest).toEqual({
      category: "CONTEST_CATEGORY_TOUGH",
      appeal: 40,
      jam: 0,
    });
  });

  it("MOVE_NONE has no description/contest data (placeholder entry, never printed)", () => {
    const none = byMove.get("MOVE_NONE")!;
    expect(none.description).toBe("");
    expect(none.contest).toBeNull();
  });

  it("every real move (excluding MOVE_NONE) has non-empty description and contest data", () => {
    for (const move of moves.moves as Move[]) {
      if (move.move === "MOVE_NONE") continue;
      expect(move.description.length).toBeGreaterThan(0);
      expect(move.contest).not.toBeNull();
    }
  });
});
