import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/magnitude-dense-evidence.json" with { type: "json" };

type Json = Record<string, any>;
const root = new URL("../..", import.meta.url);
const path = (relative: string) => new URL(relative, root);
const bytes = (relative: string) => readFileSync(path(relative));
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const ranges = (values: number[]) => {
  const result: number[][] = [];
  let start: number | undefined;
  let previous: number | undefined;
  for (const value of values) {
    if (start === undefined) start = previous = value;
    else if (value === previous! + 1) previous = value;
    else { result.push([start, previous!]); start = previous = value; }
  }
  if (start !== undefined) result.push([start, previous!]);
  return result;
};

describe("MOVE_MAGNITUDE complete unsupported dense evidence", () => {
  it("keeps the evidence-only boundary explicit", () => {
    expect(receipt).toMatchObject({ schema: "magnitude-dense-evidence/v1", move: "MOVE_MAGNITUDE", moveId: 222, oracleProfile: "battle-scene-on", status: "unsupported-evidence", coverageCredit: false });
    expect(receipt.acceptance).toMatchObject({ freshRunsPerBody: 2, bodyCount: 4 });
    expect(receipt.evidenceScope).toMatchObject({ sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, coveragePromotion: false, componentTrackCredit: false, latchPromotion: false, gameplayStateOwned: false });
  });

  it.each(receipt.bodies as Json[])("pins twice-fresh complete $id state, raw RGB, and normalized map", (body) => {
    const compressed = bytes(body.denseState);
    const decoded = gunzipSync(compressed);
    const probe = JSON.parse(decoded.toString("utf8")) as Json;
    const frames = probe.frames as Json[];
    const stage = JSON.parse(bytes(body.scenario).toString("utf8")) as Json;
    expect(sha(compressed)).toBe(body.denseStateSha256);
    expect(sha(decoded)).toBe(body.probeJsonSha256);
    expect(body.repeatProbeJsonSha256).toBe(body.probeJsonSha256);
    expect(body.repeatRawRgbSequenceSha256).toBe(body.rawRgbSequenceSha256);
    expect(probe.schema).toBe("magnitude-dense-evidence/v1");
    expect(probe.profile).toBe("battle-scene-on");
    expect(probe.sourceWindow).toEqual(body.sourceWindow);
    expect(frames).toHaveLength(body.sourceWindow.frameCount);
    expect(frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
    expect(sha(bytes(body.rawRgbArchive))).toBe(body.rawRgbArchiveSha256);
    const map = bytes(body.changeMap).toString("utf8");
    expect(sha(map)).toBe(body.changeMapSha256);
    expect(map).toContain(`# magnitude ${body.id} — ${body.sourceWindow.frameCount} frames, 240x160`);
    expect(map).not.toContain("/tmp/");
    expect(frames.every((frame) => frame.scriptOwner === "Move_MAGNITUDE")).toBe(true);
    for (const side of ["player", "opponent"] as const) {
      for (const [index, requested] of stage.overrides.parties[side].entries()) {
        expect(frames[0]!.parties[side][index]).toMatchObject(requested);
      }
    }
    expect(new Set(frames.map((frame) => JSON.stringify(frame.immutableState))).size).toBe(1);
    expect(new Set(frames.map((frame) => JSON.stringify(frame.parties))).size).toBe(1);
    expect(new Set(frames.map((frame) => JSON.stringify(frame.battlers))).size).toBe(1);
    expect(frames.every((frame) => frame.rawBattleState?.battleOutcome === frames[0]!.rawBattleState?.battleOutcome)).toBe(true);
    const taskAges = (symbol: string) => frames.flatMap((frame, age) => frame.tasks.some((task: Json) => task.func?.symbol === symbol) ? [age] : []);
    expect(ranges(taskAges("AnimTask_ShakePlatforms"))).toEqual([[1, body.branch === "intense" ? 204 : 172]]);
    expect(ranges(taskAges("AnimTask_ShakeBattlers"))).toEqual([[1, body.branch === "intense" ? 204 : 172]]);
    expect(ranges(taskAges("Task_LoopAndPlaySE"))).toEqual([[1, 80]]);
    const complexAges = frames.flatMap((frame, age) => frame.sprites.some((sprite: Json) => sprite.template?.symbol === "gComplexPaletteBlendSpriteTemplate") ? [age] : []);
    if (body.branch === "regular") expect(complexAges).toEqual([]);
    else {
      expect(ranges(complexAges)).toEqual([[13, 20], [31, 38]]);
      const fadedChanges = frames.flatMap((frame, age) => age > 0 && JSON.stringify(frame.fadedPalette) !== JSON.stringify(frames[age - 1]!.fadedPalette) ? [age] : []);
      const hardwareChanges = frames.flatMap((frame, age) => age > 0 && JSON.stringify(frame.hardwarePalette) !== JSON.stringify(frames[age - 1]!.hardwarePalette) ? [age] : []);
      expect(fadedChanges).toEqual([13, 16, 21, 31, 34, 39]);
      expect(hardwareChanges).toEqual([14, 17, 22, 32, 35, 40]);
    }
  });
});
