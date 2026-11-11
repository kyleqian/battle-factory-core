import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { land75Parity } from "../tools/integration/land75Parity.ts";

// land75 (hist73 Part B fold, src/engine/liveSpriteOrderHost.ts): a hidden (semi-invulnerable) battler's faint is the shown faint and
// a reshow with a hidden OPPONENT is the normal reshow (`hidden` kept). Evidence: hist73's direct-mGBA hidden-battler audit (10 scenarios x
// 2 fresh runs); routes: the two census battles that stopped on these rules (docs/next-adapters-hist73.md Part B).
describe("land75: hidden battler faint / reshow (hist73 Part B)", () => {
  it("hist73 hidden-battler-audit.json: every hidden / shown pair allocates the SAME events, every run A == B", () => {
    const audit = JSON.parse(readFileSync("tools/integration/fixtures/hist73/hidden-battler-audit.json", "utf8")) as {
      allSame: boolean; allIdenticalAB: boolean; scenarios: Record<string, { identicalAB: boolean }>;
      pairs: { hidden: string; window: string; verdict: string; hiddenInfo: { flagsBefore: { invisibleBits: number };
        flagsAfterReshow?: { invisibleBits: number }[] } }[] };
    expect(audit.allSame).toBe(true);
    expect(audit.allIdenticalAB).toBe(true);
    expect(Object.values(audit.scenarios).every((s) => s.identicalAB)).toBe(true);
    expect(audit.pairs.map((p) => [p.hidden, p.window, p.verdict])).toEqual([
      ["hf-opp-swellow", "faint", "SAME"], ["hf-opp-pidgeot", "faint", "SAME"], ["hf-ply-swellow", "faint", "SAME"],
      ["hf-ply-pidgeot", "faint", "SAME"], ["rs-opp-swellow", "reshow", "SAME"], ["rs-opp-pidgeot", "reshow", "SAME"]]);
    for (const pair of audit.pairs) {
      // the battler was hidden (its invisible bit set) when the window began: bit 1 = player battler 0, bit 2 = opponent battler 1
      expect(pair.hiddenInfo.flagsBefore.invisibleBits).toBe(pair.hidden.includes("-opp-") ? 2 : 1);
      // the reshow re-creates the hidden opponent INVISIBLE (CopyAllBattleSpritesInvisibilities -> battlerData; reshow_battle_screen.c:272)
      if (pair.window === "reshow") expect(pair.hiddenInfo.flagsAfterReshow!.every((f) => f.invisibleBits === 2)).toBe(true);
    }
  });

  it("battle 533 (seed 533, streak 32): the airborne Fly charger's Toxic KO keeps the order host; Scene ON/OFF parity", () => {
    const r = land75Parity(533, 32);
    expect(r.turnBoundariesCompared).toBe(68); // aiv266: 64 before the live AI view fields (seed 533 is a changed census seed; the AI now picks differently, +4 boundaries); every other assertion is unchanged
    expect(r.orderStopsOn).not.toContain("faint-animation of a hidden battler");
    // the next opponent's Dig x20 and Double Team x6 (hist73's 26 declined bodies) now carry a known order and allocator history
    const after = r.bodies.filter((b) => b.side === 1 && (b.moveId === 91 || b.moveId === 104));
    expect(after).toHaveLength(26);
    expect(after.every((b) => b.orderKnown && b.allocatorKnown)).toBe(true);
    // the Fly charge before the faint hid the opponent
    expect(r.bodies.filter((b) => b.moveId === 19 && b.moveTurn === 0).at(-1)!.hidden).toEqual([false, true]);
  }, 120_000);

  it("battle 713 (seed 713, streak 3): the reshow while the opponent is mid-Bounce keeps the order host; Scene ON/OFF parity", () => {
    const r = land75Parity(713, 3);
    expect(r.turnBoundariesCompared).toBe(23);
    expect(r.orderStopsOn).not.toContain("reshow with a hidden battler");
    // the reshow happened with the opponent hidden (Dive + Bounce charges both pending)
    expect(r.bodies.find((b) => b.moveId === 340 && b.moveTurn === 0 && b.hidden[0] === true)?.hidden).toEqual([true, true]);
    // hist73's 4 declined bodies (Psywave x2, Pursuit x2) and every later body: order and allocator known
    const reshowAt = r.bodies.findIndex((b) => b.moveId === 340 && b.moveTurn === 0 && b.hidden[0] === true);
    const later = r.bodies.slice(reshowAt + 1);
    expect(later.length).toBeGreaterThanOrEqual(30);
    expect(later.every((b) => b.orderKnown && b.allocatorKnown)).toBe(true);
    expect(later.filter((b) => b.moveId === 149 || b.moveId === 228)).toHaveLength(4);
  }, 120_000);
});
