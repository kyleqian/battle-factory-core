// cff232 (docs/cff230-castform-forms.md, "Scene OFF"): the Castform morph plays with Battle Scene OFF too (Cmd_docastformchangeanimation has no
// NO_ANIMATIONS test). Hermetic: the Scene OFF census routes run the production orchestrator and renderer; the ROM side is the committed
// per-row hashes of the Castform box and the text box (battle-scene-off mechanicLab frames, tools/integration/fixtures/castform-forms/off/*.json).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASTFORM_CHANGE_COMMAND_FRAMES, CASTFORM_CHANGE_WEATHER_LOOP_FRAMES } from "../src/engine/liveTransform.ts";
import { boxHash } from "../tools/integration/cff230Fixtures.ts";
import { cff230Route } from "../tools/integration/cff230Route.ts";
import { CFF232_CLASSES } from "../tools/integration/cff232Classes.ts";
import { TEXT_BOX } from "../tools/integration/cff232Compare.ts";
import { CFF232_DIR, cff232Rows } from "../tools/integration/cff232Fixtures.ts";
import { SND233_ON_DIR, snd233OnClass, snd233OnRows } from "../tools/integration/snd233CastformOn.ts";

const general = (commands: readonly any[]) => commands.filter((c) => c.type === "general-animation");

describe("cff232: Scene OFF builds the command (weather-loop rows only on the battler-1 weather change)", () => {
  it("OFF and ON carry the same 117-row command for the player's CASTFORM (hail); both add 3 rows for the foe's after Rain Dance (snd233: ON follows the same weather loop)", () => {
    expect(CASTFORM_CHANGE_WEATHER_LOOP_FRAMES).toBe(3);
    const hailOff = general(cff230Route(950, false, 1, "off").segments[0]!.commands), hailOn = general(cff230Route(950, false, 1, "on").segments[0]!.commands);
    // wth236: Scene ON also presents the end-turn hail body after the morph; Scene OFF presents no weather command.
    expect(hailOn.map((c) => c.animation)).toEqual(["CASTFORM_CHANGE", "HAIL_CONTINUES"]);
    expect(hailOff).toEqual([hailOn[0]]);
    expect(hailOff[0]).toMatchObject({ battler: 0, castformForm: 3, timing: { minimumFrames: CASTFORM_CHANGE_COMMAND_FRAMES } });
    expect(hailOff[0]).not.toHaveProperty("castformLeadExtra");
    const rainOff = general(cff230Route(651, false, 1, "off").segments[0]!.commands), rainOn = general(cff230Route(651, false, 1, "on").segments[0]!.commands);
    expect(rainOn[0]).toMatchObject({ battler: 1, castformForm: 2, castformLeadExtra: 3, timing: { minimumFrames: 120 } });
    expect(rainOff[0]).toMatchObject({ battler: 1, castformForm: 2, castformLeadExtra: 3, timing: { minimumFrames: 120 } });
  });

  it("the send-in (no weather print before it) carries no extra rows", () => {
    expect(general(cff230Route(603, false, 1, "off").segments[0]!.commands)[0]).toMatchObject({ battler: 0, castformForm: 2, timing: { minimumFrames: 117 } });
  });
});

describe("cff232: the committed Scene OFF ROM receipts replay at 0 px through the production renderer (Castform box and text box, every row)", () => {
  for (const klass of CFF232_CLASSES) {
    it(`${klass.name}: seed ${klass.seed}, ${cff232Rows(klass)} rows`, () => {
      const receipt = JSON.parse(readFileSync(`${CFF232_DIR}/${klass.name}.json`, "utf8")) as { romBoxHashes: string[]; romTextHashes: string[]; mismatchedRows: number };
      expect(receipt.romBoxHashes).toHaveLength(cff232Rows(klass));
      expect(receipt.mismatchedRows).toBe(0);
      const segment = cff230Route(klass.seed, true, 1, "off").segments[0]!;
      const anchor = segment.frames.findIndex((f) => f.command === klass.anchorCommand);
      const rows = receipt.romBoxHashes.map((_, k) => segment.frames[anchor + k]!.rgba);
      expect(rows.map((r) => boxHash(r, klass.box))).toEqual(receipt.romBoxHashes);
      expect(rows.map((r) => boxHash(r, TEXT_BOX))).toEqual(receipt.romTextHashes);
      const command = segment.commands.findIndex((c: any) => c.type === "general-animation" && c.animation === "CASTFORM_CHANGE");
      expect(segment.frames.filter((f) => f.command === command)).toHaveLength(CASTFORM_CHANGE_COMMAND_FRAMES + (klass.leadRows === 86 ? CASTFORM_CHANGE_WEATHER_LOOP_FRAMES : 0));
    }, 120000);
  }
});

describe("snd233 Part A: the Scene ON battler-1 weather loop replays the battle-scene-on ROM receipt at 0 px (Castform box and text box, every row)", () => {
  it(`opponent-water-after-rain-dance (ON): ${snd233OnRows()} rows`, () => {
    const klass = snd233OnClass();
    const receipt = JSON.parse(readFileSync(`${SND233_ON_DIR}/${klass.name}.json`, "utf8")) as { romBoxHashes: string[]; romTextHashes: string[]; mismatchedRows: number };
    expect(receipt.romBoxHashes).toHaveLength(snd233OnRows());
    expect(receipt.mismatchedRows).toBe(0);
    const segment = cff230Route(klass.seed, true, 1, "on").segments[0]!;
    const anchor = segment.frames.findIndex((f) => f.command === klass.anchorCommand);
    const rows = receipt.romBoxHashes.map((_, k) => segment.frames[anchor + k]!.rgba);
    expect(rows.map((r) => boxHash(r, klass.box))).toEqual(receipt.romBoxHashes);
    expect(rows.map((r) => boxHash(r, TEXT_BOX))).toEqual(receipt.romTextHashes);
  }, 120000);
});
