/**
 * fpc180 (ISSUES #139, docs/fpc180-focus-punch-live.md; evidence docs/fpc177-focus-punch-edges.md): the four Focus Punch pre-pass
 * presentation changes through production on fpc177's twelve ROM cards (both scenes). Hermetic: kernel from the committed receipt.
 */
import { describe, expect, it } from "vitest";
import { allResults } from "../tools/integration/fpc180Compare.ts";
import {
  FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES, projectBattleResolutionCommands,
} from "../src/engine/battleResolutionPresentation.ts";

const results = Object.fromEntries(allResults().map((r) => [r.name.replace(/\.json$/, ""), r]));
const glyphs = (name: string) => results[name]!.prodMessages.map((m) => m.glyph);
const rom = (name: string) => results[name]!.romMessages.map((m) => m.glyph);
const messageIds = (name: string) => results[name]!.kernelMessageIds;

describe("fpc180 -- Focus Punch pre-pass edge routes", () => {
  it("order: a switch against a Focus Punch pre-pass presents empty box, focus print, recall, Go, used (the ROM order), both scenes", () => {
    for (const scene of ["off", "on"]) {
      const card = results[`fpc177-a-switch-${scene}`]!;
      const texts = card.prodMessages.map((m) => m.text.split("\\n")[0]);
      expect(texts.slice(0, 5)).toEqual(["", expect.stringContaining("tightening"), expect.stringContaining("that’s enough"), "Go! MAGIKARP!", expect.stringContaining("Foe BRELOOM used")]);
      const romTexts = card.romMessages.map((m) => m.text.split("\\n")[0]);
      expect(romTexts.slice(0, 4)).toEqual(texts.slice(0, 4));
    }
  });

  it("order + lead 7: the recall glyph is 106 rows after the focus glyph and OFF lands on the ROM (recall 455, Go 537)", () => {
    const off = glyphs("fpc177-a-switch-off");
    expect(off.slice(0, 4)).toEqual(rom("fpc177-a-switch-off").slice(0, 4));
    expect(off[2]! - off[1]!).toBe(106);
    // ON: ont193 (fpo187) took the voluntary-switch turn's pre-pass launch to the ROM's 125 rows, so ON is on the ROM too.
    const on = glyphs("fpc177-a-switch-on");
    expect(on.slice(0, 4).map((g, i) => g - rom("fpc177-a-switch-on")[i]!)).toEqual([0, 0, 0, 0]);
    expect(on[2]! - on[1]!).toBe(106);
  });

  it("start: a pre-pass-opening voluntary switch closes the party menu after 7 frames (empty box at turn order + 4); the control keeps 9", () => {
    for (const scene of ["off", "on"]) {
      expect(results[`fpc177-a-switch-${scene}`]!.handoffFrames).toBe(7);
      expect(results[`fpc177-a-switch-${scene}`]!.commandZero).toBe(results[`fpc177-a-switch-${scene}`]!.turnOrderRow + 4);
      expect(results[`fpc177-a-switch-control-${scene}`]!.handoffFrames).toBe(9);
    }
  });

  it("control: a non-Focus-Punch switch presents the recall first, hold 9, recall glyph and Go on the ROM", () => {
    for (const scene of ["off", "on"]) {
      const card = results[`fpc177-a-switch-control-${scene}`]!;
      expect(messageIds(`fpc177-a-switch-control-${scene}`)).toEqual(["STRINGID_SWITCHINMON", "STRINGID_USEDMOVE"]);
      expect(card.prodMessages[0]!.text).toContain("that’s enough");
      expect(glyphs(`fpc177-a-switch-control-${scene}`).slice(0, 2)).toEqual(rom(`fpc177-a-switch-control-${scene}`).slice(0, 2));
    }
  });

  it("next-pre-pass lead 5: the second user's empty box lands on the ROM (209 OFF / 299 ON) and the lead to the action is 5 + u", () => {
    expect(glyphs("fpc177-b1-two-users-off").slice(0, 4)).toEqual(rom("fpc177-b1-two-users-off").slice(0, 4));
    expect(glyphs("fpc177-b1-two-users-off")[2]).toBe(209);
    expect(glyphs("fpc177-b1-two-users-on")[2]).toBe(299);
    // action lead 0 in both scenes: second tightening -> used is 110 rows in the ROM and in production
    for (const scene of ["off", "on"]) {
      const prod = glyphs(`fpc177-b1-two-users-${scene}`), romRows = rom(`fpc177-b1-two-users-${scene}`);
      expect(prod[4]! - prod[3]!).toBe(romRows[4]! - romRows[3]!);
    }
  });

  it("action lead 5 + u: StatDown u 6, Scratch / Agility u 4, Thunder Wave u 2 -- tightening -> used span equals the ROM in both scenes", () => {
    const cards: Array<[string, number]> = [
      ["r4-b2-statdown-sand-attack", 6], ["fpc177-b2-hit-scratch", 4], ["fpc177-b2-statup-agility", 4], ["fpc177-b2-status-thunder-wave", 2],
    ];
    for (const scene of ["off", "on"]) {
      for (const [stem, u] of cards) {
        const name = `${stem}-${scene}`;
        const card = results[name]!;
        expect(card.usedExecution[0]).toBe(u);
        const prod = glyphs(name), romRows = rom(name);
        expect(prod.slice(0, 3)).toEqual(romRows.slice(0, 3));
        expect(prod[2]! - prod[1]!).toBe(romRows[2]! - romRows[1]!);
      }
    }
  });

  it("fallback: no USEDMOVE print next keeps the 11-frame lead", () => {
    const card = results["fpc177-b2-hit-scratch-off"]!;
    const used = card.events.findIndex((e: any) => e.payload.kind === "message" && e.payload.messageId === "STRINGID_USEDMOVE");
    const timing = (events: readonly any[]) => {
      const commands = projectBattleResolutionCommands(events as never, card.beforeRules, card.afterRules, card.field as never, null);
      return (commands.find((c: any) => c.type === "message" && c.lines.join("").includes("tightening")) as any).timing;
    };
    const withUsed = timing(card.events);
    const without = timing(card.events.slice(0, used));
    expect(without.holdFrames - withUsed.holdFrames).toBe(FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES - (5 + 4));
    expect(without.holdFrames).toBe(withUsed.holdFrames + 2);
  });

  it("a silent PP update between the focus print and the used print does not hide the used print (u counts from it)", () => {
    const card = results["fpc177-b2-hit-scratch-off"]!;
    const used = card.events.findIndex((e: any) => e.payload.kind === "message" && e.payload.messageId === "STRINGID_USEDMOVE");
    const pp = { sequence: 0, payload: { kind: "set-battler-pp-data", battler: 1 }, provenance: { ...card.events[used]!.provenance } };
    const events = [...card.events.slice(0, used), pp, ...card.events.slice(used)].map((e: any, i: number) => ({ ...e, sequence: i }));
    const hold = (list: readonly any[]) => (projectBattleResolutionCommands(list as never, card.beforeRules, card.afterRules, card.field as never, null)
      .find((c: any) => c.type === "message" && c.lines.join("").includes("tightening")) as any).timing.holdFrames;
    const plain = card.events.map((e: any, i: number) => ({ ...e, sequence: i }));
    expect(hold(events)).toBe(hold(plain));
  });
});
