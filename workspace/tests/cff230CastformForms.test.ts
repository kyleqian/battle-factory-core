// cff230 (docs/cff230-castform-forms.md): Scene ON draws the ROM's CASTFORM_CHANGE morph (General_CastformChange = the Transform body's
// BG-mosaic ramp, the form swapped on body row 50) between the weather print and "CASTFORM transformed!". Hermetic: the census routes
// run the production orchestrator and renderer; the ROM side is the committed per-frame hashes of the Castform box (battle-scene-on lab
// frames, tools/integration/fixtures/castform-forms/*.json, 0 px on every row).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  projectBattleResolutionCommands, type BattleResolutionPresentationCommand,
} from "../src/engine/battleResolutionPresentation.ts";
import { LIVE_CASTFORM_FORM_PROVEN } from "../src/engine/liveMoveAnimation.ts";
import { battleResolutionCommandDuration, battleResolutionFieldBeforeCommand } from "../src/engine/battleResolutionPresentationRender.ts";
import { CASTFORM_CHANGE_COMMAND_FRAMES, CASTFORM_CHANGE_LEAD_FRAMES, LIVE_TRANSFORM_ROWS, LIVE_TRANSFORM_SWAP_ROW } from "../src/engine/liveTransform.ts";
import { boxHash, CFF230_CLASSES } from "../tools/integration/cff230Fixtures.ts";
import { cff230Route } from "../tools/integration/cff230Route.ts";

const BODY_START = CASTFORM_CHANGE_LEAD_FRAMES;
const TAIL = CASTFORM_CHANGE_COMMAND_FRAMES - BODY_START - LIVE_TRANSFORM_ROWS;

describe("cff230: the command's timing is the ROM's: 5 lead rows + the 109-row Transform body + 3 rows to the next print", () => {
  it("117 = 5 + 109 + 3", () => {
    expect([CASTFORM_CHANGE_LEAD_FRAMES, LIVE_TRANSFORM_ROWS, TAIL, CASTFORM_CHANGE_COMMAND_FRAMES]).toEqual([5, 109, 3, 117]);
    expect(LIVE_TRANSFORM_SWAP_ROW).toBe(50);
  });
});

describe("cff230: census route 950 (the player's CASTFORM turns ICE after the foe's Hail)", () => {
  const route = cff230Route(950, true, 1);
  const segment = route.segments[0]!;
  const at = segment.commands.findIndex((c: BattleResolutionPresentationCommand) => c.type === "general-animation" && c.animation === "CASTFORM_CHANGE");

  it("the command sits between the weather print and the transformed print, 117 frames, carrying the form", () => {
    expect(at).toBeGreaterThan(0);
    expect(segment.commands[at - 1]).toMatchObject({ type: "message", lines: ["It started to hail!"] });
    expect(segment.commands[at + 1]).toMatchObject({ type: "message", lines: ["CASTFORM transformed!"] });
    expect(segment.commands[at]).toMatchObject({ battler: 0, castformForm: 3, timing: { minimumFrames: 117 } });
    const field = battleResolutionFieldBeforeCommand(segment.raw.field, segment.commands, at);
    expect(battleResolutionCommandDuration(segment.commands[at], field)).toBe(117);
    expect(segment.frames.filter((f) => f.command === at)).toHaveLength(117);
  });

  it("the picture is the old form through body row 49, the ICE form from row 50; mosaic rows 7..95 in between; the rest are ordinary", () => {
    const rows = segment.frames.filter((f) => f.command === at);
    const box: [number, number, number, number] = [0, 40, 110, 70];
    const hash = rows.map((f) => boxHash(f.rgba, box));
    const body = (age: number) => hash[BODY_START + age]!;
    const before = hash[0]!;
    for (let k = 0; k <= BODY_START + 6; k++) expect(hash[k], `row ${k}`).toBe(before);
    expect(body(7)).not.toBe(before);
    const after = body(LIVE_TRANSFORM_SWAP_ROW + 50);
    expect(after).not.toBe(before);
    for (let age = 96; age < 109 + TAIL; age++) expect(body(age), `age ${age}`).toBe(after);
    // The row after the command is the transformed print's first row over the same (ICE) picture.
    expect(hash[116]).toBe(after);
  });

  it("Scene OFF projects the same command (cff232; tests/cff232CastformOff.test.ts), the kernel's events are the same; a Substitute-flagged argument projects none", () => {
    const off = cff230Route(950, false, 1, "off");
    expect(off.segments[0]!.commands.filter((c: BattleResolutionPresentationCommand) => c.type === "general-animation").map((c: any) => c.animation)).toEqual(["CASTFORM_CHANGE"]);
    // The kernel emits the same CASTFORM_CHANGE in both scenes.
    const change = (events: readonly any[]) => events.filter((e) => e.payload.animationId === "CASTFORM_CHANGE").map((e) => e.payload.arguments);
    expect(change(off.segments[0]!.events)).toEqual(change(segment.events));
    const raw = segment.raw;
    const behind = raw.events.map((e: any) => e.payload.kind === "animation" && e.payload.animationId === "CASTFORM_CHANGE"
      ? { ...e, payload: { ...e.payload, arguments: [String(0x80 | 3)] } } : e);
    const project = (events: readonly unknown[]) => projectBattleResolutionCommands(
      events as never, raw.beforeRules.rulesContext, raw.afterRules.rulesContext, raw.field, null);
    expect(project(raw.events).filter((c) => c.type === "general-animation").map((c) => c.type === "general-animation" ? c.animation : "")).toEqual(["CASTFORM_CHANGE"]);
    expect(project(behind).some((c) => c.type === "general-animation")).toBe(false);
    expect(project(behind).map((c) => c.type)).toEqual(project(raw.events).filter((c) => c.type !== "general-animation").map((c) => c.type));
  });
});

describe("cff230: the committed ROM receipts (battle-scene-on lab frames, Castform box) replay at 0 px through the production renderer", () => {
  for (const klass of CFF230_CLASSES) {
    it(`${klass.name}: ${klass.rows} rows, seed ${klass.seed}`, () => {
      const receipt = JSON.parse(readFileSync(`tools/integration/fixtures/castform-forms/${klass.name}.json`, "utf8")) as { romBoxHashes: string[]; mismatchedRows: number };
      expect(receipt.romBoxHashes).toHaveLength(klass.rows);
      expect(receipt.mismatchedRows).toBe(0);
      const segment = cff230Route(klass.seed, true, 1).segments[0]!;
      const first = segment.frames.findIndex((f) => f.command === klass.command);
      const ours = receipt.romBoxHashes.map((_, k) => boxHash(segment.frames[first + k]!.rgba, klass.box));
      expect(ours).toEqual(receipt.romBoxHashes);
      expect(segment.commands[klass.command]).toMatchObject({ type: "general-animation", animation: "CASTFORM_CHANGE" });
    }, 120000);
  }
});

describe("cff230: Ember by a CASTFORM in rain / hail is ROM-proven from dense windows", () => {
  it.each(["ember-by-hail-52-by-3", "ember-by-rain-52-by-2"])("%s: 0 px on every visible row, r1 == r2", (name) => {
    const s = JSON.parse(readFileSync(`tools/integration/fixtures/castform-forms/keys/${name}.json`, "utf8"));
    const rows = s.perFrameStartAligned.slice(s.oursVisible.first, s.oursVisible.last + 1) as number[];
    expect(rows.length).toBeGreaterThan(60);
    expect(rows.every((v) => v === 0)).toBe(true);
    expect(LIVE_CASTFORM_FORM_PROVEN.has(`${s.moveId}:by:${name.endsWith("3") ? 3 : 2}`)).toBe(true);
  });
});
