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
  it("tail frames: Bulk Up 4, Protect 3, Detect 3, Sand-Attack 6; body rows 117 / 131 / 118 / 67", () => {
    for (const [name, species, move, target, tail, frames] of [["Bulk Up", "PRIMEAPE", 339, "ONIX", 4, 117], ["Protect", "PRIMEAPE", 182, "ONIX", 3, 131],
      ["Detect", "PRIMEAPE", 197, "ONIX", 3, 118], ["Sand-Attack", "PRIMEAPE", 28, "SNORLAX", 6, 67]] as const) {
      const b = body(species, move, target, "on");
      expect([name, b.tailFrames, b.frames]).toEqual([name, tail, frames]);
    }
  });

  // lsd194 re-pin: Bulk Up's two stat prints ("ATTACK rose!" L=22, "DEFENSE rose!" L=23) were held 24-floor (88 / 88+1 rows); the ROM is L+64 (86 / 87),
  // so the start delta moves -1 -> -3 (-2 from the first print) and the end delta 0 -> -3 (-2 and -1). The old 0 / -1 hid a -3 offset that sits before the
  // first stat print and is unchanged by lsd194 (not a print row). Sand-Attack / Protect / Detect have no short print and keep their pins.
  it("ROM anchor-end delta 0 on Sand-Attack / Protect / Detect; Bulk Up -3 / -3 (lsd194: the 24-floor over-hold of its two short stat prints no longer masks a -3 offset before them)", () => {
    for (const [name, startDelta, endDelta, residual] of [["bulk-up-ply-primeape-onix", -3, -3, -3], ["sand-attack-ply-primeape-snorlax", 0, 0, 0], ["protect-ply-primeape-onix", 0, 0, 0], ["detect-ply-primeape-onix", 0, 0, 0]] as const) {
      const r = evaluate(`off108-${name}`, "on");
      expect([name, r.anchorStartDelta, r.anchorEndDelta, r.residual]).toEqual([name, startDelta, endDelta, residual]);
    }
    expect(evaluate("off108-bulk-up-ply-primeape-onix", "off").anchorStartDelta).toBe(-3);
  });

  it("the Double Team window (masked pre), Rest (synthetic route) and Scene OFF keep their pre-ont193 values", () => {
    expect(body("PRIMEAPE", 104, "ONIX", "on")).toMatchObject({ frames: 239, tailFrames: 0 });
    expect(evaluate("off108-double-team-ply-primeape-onix", "on")).toMatchObject({ anchorStartDelta: -5, anchorEndDelta: -5 });
    expect(evaluate("off108-rest-ply-snorlax-onix", "on")).toMatchObject({ anchorStartDelta: -22, anchorEndDelta: -3 });
    for (const [species, move, target, frames] of [["PRIMEAPE", 339, "ONIX", 40], ["PRIMEAPE", 182, "ONIX", 39], ["PRIMEAPE", 197, "ONIX", 39], ["PRIMEAPE", 28, "SNORLAX", 39]] as const) {
      const b = body(species, move, target, "off");
      expect([move, b.tailRows, b.tailFrames, b.frames]).toEqual([move, undefined, null, frames]);
    }
    for (const [name, endDelta] of [["bulk-up-ply-primeape-onix", -3], ["sand-attack-ply-primeape-snorlax", 0], ["protect-ply-primeape-onix", 0], ["detect-ply-primeape-onix", 0]] as const) {
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
