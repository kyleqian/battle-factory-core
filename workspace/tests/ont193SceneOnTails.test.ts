/**
 * ont193 (docs/ont193-scene-on-tails.md; ISSUES #167 ON -3..-6, #139 ON +2): the Scene ON script tail of live no-hit bodies and the
 * Focus Punch pre-pass menu-SE launch wait, through production against the ROM receipts. Hermetic.
 */
import { describe, expect, it } from "vitest";
import { trn176Cases, trn176Evaluate, trn176Production } from "../tools/integration/trn176Predict.ts";
import { allResults } from "../tools/integration/fpc180Compare.ts";
import { liveMoveScriptTailFrames } from "../src/engine/battleResolutionPresentationRender.ts";
import { FOCUS_PUNCH_PRE_PASS_MENU_SE_LAUNCH_WAIT_FRAMES } from "../src/engine/battleResolutionPresentation.ts";

const body = (species: string, move: number, target: string, scene: "on" | "off") => {
  const p = trn176Production(species, move, target, 33, true, scene);
  const i = p.commands.findIndex((c: any) => c.type === "move-animation");
  const command = p.commands[i] as any;
  return { frames: p.rows[i]!.frames, tailRows: command.timing?.scriptTailRows as number | undefined,
    tailFrames: command.animation ? liveMoveScriptTailFrames(command.timing, command.animation, p.field) : null };
};
const evaluate = (name: string, scene: "on" | "off") => trn176Evaluate(trn176Cases(["off108"], [name]).find((c) => c.scene === scene)!) as any;

describe("ont193 A: Scene ON live no-hit bodies carry the source-derived script tail", () => {
  it("tail frames: Bulk Up 2, Protect 1, Detect 1, Sand-Attack 5 (lead4: the old 4 / 3 / 3 / 6 minus the script lead 2 / 2 / 2 / 1 now before the body); body rows 117 / 131 / 118 / 67", () => {
    for (const [name, species, move, target, tail, frames] of [["Bulk Up", "PRIMEAPE", 339, "ONIX", 2, 117], ["Protect", "PRIMEAPE", 182, "ONIX", 1, 131],
      ["Detect", "PRIMEAPE", 197, "ONIX", 1, 118], ["Sand-Attack", "PRIMEAPE", 28, "SNORLAX", 5, 67]] as const) {
      const b = body(species, move, target, "on");
      expect([name, b.tailFrames, b.frames]).toEqual([name, tail, frames]);
    }
  });

  // lsd194 re-pin: Bulk Up's two stat prints ("ATTACK rose!" L=22, "DEFENSE rose!" L=23) were held 24-floor (88 / 88+1 rows); the ROM is L+64 (86 / 87),
  // so the floor drop unmasked a -3 that sits between the two stat prints (the ROM's 4 single-row instructions BulkUpTryDef+0 / +6 / +12 / +23).
  // lsd196 closes it at the source: the `stat` between the prints presents those rows (instructionExecution delta), so Bulk Up is 0 / 0 / 0 again.
  it("ROM anchor-end delta 0 on Sand-Attack / Protect / Detect; Bulk Up 0 / 0 (lsd196: the second stat's single-row instructions)", () => {
    for (const [name, startDelta, endDelta, residual] of [["bulk-up-ply-primeape-onix", 0, 0, 0], ["sand-attack-ply-primeape-snorlax", 0, 0, 0], ["protect-ply-primeape-onix", 0, 0, 0], ["detect-ply-primeape-onix", 0, 0, 0]] as const) {
      const r = evaluate(`off108-${name}`, "on");
      expect([name, r.anchorStartDelta, r.anchorEndDelta, r.residual]).toEqual([name, startDelta, endDelta, residual]);
    }
    expect(evaluate("off108-bulk-up-ply-primeape-onix", "off").anchorStartDelta).toBe(0);
  });

  // tl205 re-pin (docs/tl204-zero-tail-rows.md): Double Team (masked pre, trail -1 measured by tl204) now carries its 5-row script tail: 239 -> 244 rows, anchors -5 -> 0.
  it("the Double Team window (tl205: 239 + 5 tail rows), Rest (synthetic route) and Scene OFF keep their pre-ont193 values", () => {
    expect(body("PRIMEAPE", 104, "ONIX", "on")).toMatchObject({ frames: 244, tailFrames: 4 }); // lead4: tail 5 -> 4, the 1-row script lead moved before the body (244 total)
    expect(evaluate("off108-double-team-ply-primeape-onix", "on")).toMatchObject({ anchorStartDelta: 0, anchorEndDelta: 0 });
    // hpf2: the Rest ROM lab (ON / OFF, hp -> printstring: bar 9 rows, next rise +11 = the heal tail 3 on the app's bar + 1, landed) leaves -14: the route's hit and heal bars are 15 rows, the lab's 8 (-7 each); kept.
    // hpf1: -3 -> -14 (the synthetic route's foe Tackle on the player no longer carries the 28-row floor; hpf1-p{c,a}-* ROM labs pin the floor-free hold, the route's -22 start is its own)
    expect(evaluate("off108-rest-ply-snorlax-onix", "on")).toMatchObject({ anchorStartDelta: -22, anchorEndDelta: -14 });
    for (const [species, move, target, frames] of [["PRIMEAPE", 339, "ONIX", 40], ["PRIMEAPE", 182, "ONIX", 39], ["PRIMEAPE", 197, "ONIX", 39], ["PRIMEAPE", 28, "SNORLAX", 39]] as const) {
      const b = body(species, move, target, "off");
      expect([move, b.tailRows, b.tailFrames, b.frames]).toEqual([move, undefined, null, frames]);
    }
    for (const [name, endDelta] of [["bulk-up-ply-primeape-onix", 0], ["sand-attack-ply-primeape-snorlax", 0], ["protect-ply-primeape-onix", 0], ["detect-ply-primeape-onix", 0]] as const) {
      const r = evaluate(`off108-${name}`, "off");
      expect([name, r.anchorEndDelta]).toEqual([name, endDelta]);
    }
  });

  it("control: a hit body (Scratch) has no script tail and keeps its 32-row ON body", () => {
    expect(body("PRIMEAPE", 10, "ONIX", "on")).toEqual({ frames: 32, tailRows: undefined, tailFrames: 0 });
  });
});

describe("ont193 B: Focus Punch pre-pass launch waits for the menu SE only on a Fight-menu first pre-pass", () => {
  const results = Object.fromEntries(allResults().map((r) => [r.name.replace(/\.json$/, ""), r]));
  const tight = (name: string) => results[name]!.prodMessages.filter((m) => m.text.includes("tightening")).map((m) => m.glyph);
  const rom = (name: string) => results[name]!.romMessages.filter((m) => m.text.includes("tightening")).map((m) => m.glyph);

  it("the wait is the 2 rows of the menu SE_SELECT remainder", () => {
    expect(FOCUS_PUNCH_PRE_PASS_MENU_SE_LAUNCH_WAIT_FRAMES).toBe(2);
  });

  it("ON: voluntary-switch turn 437 and the second pre-pass 424 (125 rows after E), Fight-menu first pre-pass 199 (127 rows) -- all on the ROM", () => {
    expect(tight("fpc177-a-switch-on")).toEqual([437]);
    expect(tight("fpc177-b1-two-users-on")).toEqual([199, 424]);
    expect(tight("fpc177-b2-hit-scratch-on")).toEqual([199]);
    for (const name of ["fpc177-a-switch-on", "fpc177-b1-two-users-on", "fpc177-b2-hit-scratch-on", "fpc177-b2-statup-agility-on", "fpc177-b2-status-thunder-wave-on", "r4-b2-statdown-sand-attack-on"]) {
      expect([name, tight(name)]).toEqual([name, rom(name)]);
    }
  });

  it("OFF cards are unchanged and on the ROM", () => {
    for (const name of ["fpc177-a-switch-off", "fpc177-b1-two-users-off", "fpc177-b2-hit-scratch-off", "fpc177-b2-statup-agility-off", "fpc177-b2-status-thunder-wave-off", "r4-b2-statdown-sand-attack-off"]) {
      expect([name, tight(name)]).toEqual([name, rom(name)]);
    }
  });
});
