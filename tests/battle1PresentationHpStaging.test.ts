import { describe, expect, it } from "vitest";
import { resolveBattle1PresentationHpValues } from "../src/engine/battle1PresentationHpStaging.ts";
import turn1Dump from "../src/data/gen/battle1-turn1-ram-dump.json" with { type: "json" };
import turn2Dump from "../src/data/gen/battle1-turn2-ram-dump.json" with { type: "json" };
import faintDump from "../src/data/gen/battle1-grovyle-faint-ram-dump.json" with { type: "json" };

describe("Battle 1 presentation HP staging", () => {
  it("matches every RAM-recording field formerly consumed by battleScene.ts", () => {
    const actual = resolveBattle1PresentationHpValues();
    const turn1 = turn1Dump.battlerSnapshots;
    const turn2 = turn2Dump.battlerSnapshots;
    const faint = faintDump.battlerSnapshots["4892"];

    expect(actual).toEqual({
      opponent: {
        species: turn1.before_turn.battler1.species,
        level: turn1.before_turn.battler1.level,
        hp: turn1.before_turn.battler1.hp,
        maxHP: turn1.before_turn.battler1.maxHP,
      },
      opponentAfterTurn1Hp: turn1.after_turn.battler1.hp,
      player: {
        hp: turn2.before_turn2.battler0.hp,
        maxHP: turn2.before_turn2.battler0.maxHP,
      },
      playerAfterTurn2Hp: turn2.after_turn2.battler0.hp,
      opponentAfterTurn2Hp: turn2.after_turn2.battler1.hp,
      playerAfterTurn3Hp: faint.battler0.hp,
      opponentAfterTurn3Hp: faint.battler1.hp,
    });
  });
});
