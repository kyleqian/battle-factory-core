// trn178 (ISSUES #167 (a'), docs/trn178-action-transition-live.md; rule and ROM evidence: docs/trn176-action-transition.md): Scene OFF
// presents a draw-nothing pause P = d + 6 + u before an action's first MoveEnd sprite-visibility receipt when the next action opens
// with STRINGID_USEDMOVE (d = rows from the anchor's release E to the first `moveend`, u the next USEDMOVE's instructionExecution).
// Production kernel (trn176Production: the full-turn kernel, Scene OFF = HITMARKER_NO_ANIMATIONS) against the committed ROM receipts.
import { describe, expect, it } from "vitest";
import { trn176Cases, trn176Evaluate, trn176Production } from "../tools/integration/trn176Predict.ts";

const FIXTURES = ["off108", "off148", "trn176"];
const MOVE = { BULK_UP: 339, SAND_ATTACK: 28, PROTECT: 182, TOXIC: 92, SCRATCH: 10, DOUBLE_EDGE: 38, REST: 156, TACKLE: 33, WISH: 273 };

/** The draw-nothing transition pauses: a move-animation row immediately before a sprite-visibility row. */
function transitionPauses(rows: readonly { type: string; frames: number }[]) {
  return rows.flatMap((row, i) => (row.type === "move-animation" && rows[i + 1]?.type === "sprite-visibility" ? [row.frames] : []));
}

function evaluate(name: string, scene: "on" | "off") {
  const c = trn176Cases(FIXTURES, [name]).find((x) => x.scene === scene)!;
  return trn176Evaluate(c) as any;
}

describe("trn178: the Scene OFF action-transition pause", () => {
  it("stat class (Bulk Up): P = d + 6 + u = 2 + 6 + 4 = 12, the next used first glyph lands on the ROM row (was -12)", () => {
    const off = trn176Production("PRIMEAPE", MOVE.BULK_UP, "ONIX", MOVE.TACKLE, true, "off");
    expect(transitionPauses(off.rows)).toEqual([12]);
    const r = evaluate("off108-bulk-up-ply-primeape-onix", "off");
    // lsd196: the `stat` between the two stat prints presents the ROM's 4 single-row instructions (instructionExecution delta), so the
    // lsd194 floor drop's -3 is closed at the source (the pause itself is unchanged: 12 above).
    expect([r.d, r.u, r.n, r.residual, r.pause]).toEqual([2, 4, 1, 0, 0]);
  });

  it("stat / protect / control / miss classes: residual 0 (Dynamic Punch ply keeps its miss print's own +1)", () => {
    const rows = [
      "off108-bulk-up-ply-primeape-onix", "off108-double-team-ply-primeape-onix", "off108-sand-attack-ply-primeape-snorlax",
      "off108-protect-ply-primeape-onix", "off108-detect-ply-primeape-onix", "off148-agility-ply",
      "off108-dynamic-punch-opp-machamp-snorlax", "off108-dynamic-punch-ply-machamp-snorlax",
    ].map((name) => [name, evaluate(name, "off").residual]);
    // lsd194: Dynamic Punch ply 1 -> 0 (its miss print "attack missed!" L = 23 lost the 1-row floor over-hold: that +1 was the floor,
    // not a ROM row). Bulk Up stays 0 (lsd196: the second stat's single-row instructions).
    expect(rows.map((x) => x[1])).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("HIT class (Scratch, Double-Edge): P 13 / 14 after the effectiveness / recoil print; the transition itself is exact", () => {
    const scratch = trn176Production("PRIMEAPE", MOVE.SCRATCH, "ONIX", MOVE.TACKLE, true, "off");
    expect(transitionPauses(scratch.rows)).toEqual([13]);
    const doubleEdge = trn176Production("PRIMEAPE", MOVE.DOUBLE_EDGE, "ONIX", MOVE.TACKLE, true, "off");
    expect(transitionPauses(doubleEdge.rows)).toEqual([14]);
    // The kernel here uses synthetic stats, so the hit's own commands differ from the ROM's (anchor-end Δ); the transition from the
    // anchor's end to the next used first glyph (residual - anchor-end Δ) is 0 on every ROM HIT row (was -(d + 6 + u)).
    for (const name of ["trn176-scratch-ply", "trn176-scratch-opp", "trn176-karate-chop-ply", "trn176-double-edge-ply", "trn176-fire-punch-ply"]) {
      const r = evaluate(name, "off");
      expect([name, r.residual - r.anchorEndDelta, r.pause]).toEqual([name, 0, 0]);
    }
  });

  it("Toxic: the status icon anchors (E = updatestatusicon's row, d 6), P = 16; HP anchor (Rest): P = 7 + 6 + 2 = 15", () => {
    const toxic = trn176Production("PRIMEAPE", MOVE.TOXIC, "ONIX", MOVE.TACKLE, true, "off");
    const icon = toxic.rows.findIndex((row) => row.type === "status-icon");
    expect(toxic.rows.slice(icon, icon + 4).map((row) => [row.type, row.frames])).toEqual([
      ["status-icon", 1], ["move-animation", 16], ["sprite-visibility", 1], ["sprite-visibility", 1],
    ]);
    expect(evaluate("off108-toxic-ply-primeape-onix", "off").residual).toBe(-2); // interior (print 90 vs 91 + the 2-row status)
    // Rest after the foe's Tackle (the ROM scenario's order): Snorlax's HP update anchors.
    const rest = trn176Production("SNORLAX", MOVE.REST, "ONIX", MOVE.TACKLE, false, "off");
    expect(transitionPauses(rest.rows)).toEqual([15]);
  });

  it("control: no USEDMOVE next (end-of-turn poison print, the second action's MoveEnd) and Wish add nothing", () => {
    // Toxic turn: the foe's Tackle is followed by the poison end-of-turn print, not a used print: one pause only (the first action's).
    const toxic = trn176Production("PRIMEAPE", MOVE.TOXIC, "ONIX", MOVE.TACKLE, true, "off");
    expect(transitionPauses(toxic.rows)).toEqual([16]);
    expect(toxic.rows.at(-4)!.type).toBe("sprite-visibility");
    // Wish: the anchor is the used print itself; only msg175's pause (49 = 40 + 7 + 4 - 2, now 1 + ACTION_TRANSITION_ROWS) precedes
    // the MoveEnd receipt, unchanged.
    const wish = trn176Production("PRIMEAPE", MOVE.WISH, "ONIX", MOVE.TACKLE, true, "off");
    expect(transitionPauses(wish.rows)).toEqual([49]);
  });

  it("Scene ON presents the same pause (trn181): Bulk Up 12, Scratch 13, Rest 15, Toxic 16; the residual is the anchor-end error", () => {
    for (const [move, species, pause] of [[MOVE.BULK_UP, "PRIMEAPE", 12], [MOVE.SCRATCH, "PRIMEAPE", 13], [MOVE.REST, "SNORLAX", 15], [MOVE.TOXIC, "PRIMEAPE", 16]] as const) {
      const rows = trn176Production(species, move, "ONIX", MOVE.TACKLE, species === "PRIMEAPE", "on").rows;
      expect([move, transitionPauses(rows)]).toEqual([move, [pause]]);
    }
    const on = ["off108-bulk-up-ply-primeape-onix", "off108-sand-attack-ply-primeape-snorlax", "off108-protect-ply-primeape-onix",
      "off108-rest-ply-snorlax-onix"].map((name) => evaluate(name, "on").residual);
    // ont193 (docs/ont193-scene-on-tails.md): the script tail closes Bulk Up, Sand-Attack and Protect to 0; Rest (synthetic route) stays -3.
    expect(on).toEqual([0, 0, 0, -3]);
  });
});
