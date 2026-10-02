import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const auditText = () => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/waterPulseSourceAudit.ts"], { cwd: root, encoding: "utf8" });
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

describe("MOVE_WATER_PULSE source/classification checkpoint", () => {
  it("regenerates its complete pointer-owned root, nine generated components, and every source-owned callback/task byte-identically", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("7ea11b57647851582a680baf0b7dd67bca80af5d2db5a21e95c2309eb4642dd4");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "water-pulse-source-audit/v1", move: "MOVE_WATER_PULSE", moveId: 352,
      status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: {
        symbol: "Move_WATER_PULSE", nextDispatchLabel: "Move_PSYCHO_BOOST", pointerContract: expect.stringContaining("half-open"),
        source: { path: "data/battle_anim_scripts.s", start: 371190, endExclusive: 372671, byteLength: 1481, sha256: "408d63bdab439bac29e457f15ff6249d9fc7ceb539e424ec8fda002a78583949" },
        rom: { start: "0x082d6c7a", endExclusive: "0x082d6d6f", byteLength: 245, romSha256: "de4d4b7682c3c0dbc9af023cf6e7ca02bb39a55a88c029d6424c56ace21c9e68" },
      } },
      graph: { blocks: ["Move_WATER_PULSE"], components: [
        "asset:ANIM_TAG_BLUE_RING_2", "asset:ANIM_TAG_SMALL_BUBBLES", "sprite:gWaterPulseBubbleSpriteTemplate", "sprite:gWaterPulseRingSpriteTemplate",
        "task:AnimTask_ShakeMon", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:simple_palette_blend", "visualCommand:splitbgprio",
      ] },
      behavior: { bubbles: { count: 5 }, rings: { count: 3 }, shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 0, 8, 18, 1] } },
      resources: { smallBubbles: { tagValue: 10155, tileBytes: 320 }, blueRing2: { tagValue: 10288, tileBytes: 256 } },
      coverageBoundary: { waterPulseEntryPresent: false, waterPulseStatus: "unsupported-absent", noTimingOrLatchTransfer: expect.stringContaining("no other move transfers") },
      checkpoint: { sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, sourceBoundedSemanticCheckpoint: true, coveragePromotion: false, latchPromotion: false, unsupportedNoCreditBoundary: true },
    });
    expect(Object.keys(audit.source.directBodies.callbacks).sort()).toEqual([
      "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
      "AnimWaterPulseBubble", "AnimWaterPulseBubble_Step", "AnimWaterPulseRing", "AnimWaterPulseRingBubble", "AnimWaterPulseRing_Step",
      "CreateWaterPulseRingBubbles", "Task_ClearMonBg", "Task_InitUpdateMonBg", "Task_UpdateMonBg",
    ]);
    expect(Object.keys(audit.source.directBodies.runtimeCommands).sort()).toEqual([
      "Cmd_clearmonbg", "Cmd_createsprite", "Cmd_createvisualtask", "Cmd_delay", "Cmd_end", "Cmd_loadspritegfx", "Cmd_monbg", "Cmd_playsewithpan", "Cmd_splitbgprio", "Cmd_waitforvisualfinish",
    ]);
  });

  it("pins the complete legal Level-50 carrier census and original no-credit source checkpoint", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carriers).toMatchObject({
      count: 12,
      lowest: { index: 131, label: "FRONTIER_MON_LOMBRE", species: "SPECIES_LOMBRE", moves: ["MOVE_WATER_PULSE", "MOVE_FAKE_OUT", "MOVE_BRICK_BREAK", "MOVE_ABSORB"] },
      excludedOutsideLevel50: [1, 14, 19, 28, 45, 55, 59, 71, 87, 97, 98, 99], excludedOpenOnly: [],
    });
    expect(audit.carriers.level50Ranges.map((range: Json) => [range.start, range.end])).toEqual([
      [110, 199], [162, 266], [267, 371], [372, 467], [468, 563], [564, 659], [660, 755], [372, 849],
    ]);
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([131, 147, 155, 176, 182, 204, 213, 228, 242, 259, 309, 756]);
    expect(audit.coverageBoundary).toMatchObject({ componentTrack: "water-gun-small-bubbles-water-impact", componentTrackPreexisting: true, waterPulseDoesNotAlterTrack: true });
  });
});
