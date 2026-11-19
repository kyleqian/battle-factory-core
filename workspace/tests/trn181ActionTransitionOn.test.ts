// trn181 (ISSUES #167 (a') Scene ON half, docs/trn181-action-transition-on.md): the trn178 rule (P = d + 6 + u) is one rule for both scenes.
// Scene ON marks the draw-nothing pause `actionTransition` so it leaves the semi-invulnerable hide and the live hosts alone.
import { describe, expect, it } from "vitest";
import { trn176Cases, trn176Evaluate, trn176Production } from "../tools/integration/trn176Predict.ts";
import { applyLiveSemiInvulnerableCommand } from "../src/engine/battleResolutionPresentationRender.ts";

const MOVE = { BULK_UP: 339, SAND_ATTACK: 28, PROTECT: 182, TOXIC: 92, SCRATCH: 10, DOUBLE_EDGE: 38, REST: 156, TACKLE: 33, WISH: 273 };
const pauses = (rows: readonly { type: string; frames: number }[]) =>
  rows.flatMap((row, i) => (row.type === "move-animation" && rows[i + 1]?.type === "sprite-visibility" ? [row.frames] : []));
const prod = (species: string, move: number, scene: "on" | "off", first = true) =>
  trn176Production(species, move, "ONIX", MOVE.TACKLE, first, scene);

describe("trn181: the action-transition pause in Scene ON", () => {
  it("ON pause values equal the OFF values (same anchor, same d + 6 + u)", () => {
    for (const [species, move, first, p] of [["PRIMEAPE", MOVE.BULK_UP, true, 12], ["PRIMEAPE", MOVE.SAND_ATTACK, true, 12],
      ["PRIMEAPE", MOVE.PROTECT, true, 12], ["PRIMEAPE", MOVE.SCRATCH, true, 13], ["PRIMEAPE", MOVE.DOUBLE_EDGE, true, 14],
      ["SNORLAX", MOVE.REST, false, 15], ["PRIMEAPE", MOVE.TOXIC, true, 16]] as const) {
      expect([move, pauses(prod(species, move, "on", first).rows)]).toEqual([move, [p]]);
      expect([move, pauses(prod(species, move, "off", first).rows)]).toEqual([move, [p]]);
    }
  });

  it("controls: no USEDMOVE next adds nothing; Wish keeps msg175's pause; Thunder Wave (next action opens elsewhere) is skipped", () => {
    expect(pauses(prod("PRIMEAPE", MOVE.TOXIC, "on").rows)).toEqual([16]);
    // Wish: the anchor is the used print itself, so no transition pause; ON's only move-animation before a visibility row is the live body.
    expect(prod("PRIMEAPE", MOVE.WISH, "on").rows.slice(0, 3).map((row) => [row.type, row.frames])).toEqual([["message", 18], ["move-animation", 274], ["sprite-visibility", 1]]);
    expect(pauses(prod("PRIMEAPE", MOVE.WISH, "off").rows)).toEqual([49]);
    const tw = trn176Cases(["off108"], ["off108-thunder-wave-ply-primeape-snorlax"]).find((c) => c.scene === "on")!;
    expect((trn176Evaluate(tw) as any).skipped).toBeTruthy();
  });

  it("ON residuals land on the anchor-end error (ont193 + lsd196: Bulk Up 0 (the second stat's single-row instructions), Sand-Attack 0, Protect 0 after the script tail; Rest -14 (hpf1 / hpf2: the synthetic route's hit and heal bars are 15 rows against the ROM lab's 8, 7 rows each; docs/hpd1-hp-hold.md, hpf2), Solar Beam 0)", () => {
    for (const [name, residual] of [["off108-bulk-up-ply-primeape-onix", 0], ["off108-sand-attack-ply-primeape-snorlax", 0],
      ["off108-protect-ply-primeape-onix", 0], ["off108-rest-ply-snorlax-onix", -14], ["off108-solar-beam-ply-primeape-snorlax", 0]] as const) {
      const c = trn176Cases(["off108"], [name]).find((x) => x.scene === "on")!;
      const r = trn176Evaluate(c) as any;
      expect([name, r.residual, r.residual - r.anchorEndDelta]).toEqual([name, residual, 0]);
    }
  });

  it("the pause leaves a semi-invulnerable hide alone, a real strike body or sprite-visibility still clears it", () => {
    const hidden = Object.freeze([true, false] as const);
    const pause = { type: "move-animation", actionTransition: true, eventSequence: 1, battler: 0, timing: { minimumFrames: 12 } } as any;
    expect(applyLiveSemiInvulnerableCommand(hidden, pause)).toBe(hidden);
    expect(applyLiveSemiInvulnerableCommand(hidden, { ...pause, actionTransition: undefined })[0]).toBe(false);
    expect(applyLiveSemiInvulnerableCommand(hidden, { type: "sprite-visibility", eventSequence: 2, battler: 0 } as any)[0]).toBe(false);
  });
});
