import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  SAFEGUARD_FIRST_INACTIVE_AGE,
  safeguardAtAge,
  type SafeguardAnimationProfile,
} from "../../src/animation/safeguard.ts";

const playerProfile: SafeguardAnimationProfile = {
  ringSlots: [3, 4, 5],
  ringSubpriority: 28,
};
const opponentProfile: SafeguardAnimationProfile = {
  ringSlots: [3, 4, 5],
  ringSubpriority: 38,
};

describe("MOVE_SAFEGUARD pure source-age reducer", () => {
  it("ports the three literal Guard Ring creates and 13-step Q8 translation", () => {
    expect(safeguardAtAge(6, { x: 72, y: 80 }, playerProfile).rings).toEqual([]);
    expect(safeguardAtAge(7, { x: 72, y: 80 }, playerProfile).rings).toEqual([
      expect.objectContaining({ slot: 3, x: 72, y: 120, y2: -5, subpriority: 28 }),
    ]);
    expect(safeguardAtAge(13, { x: 72, y: 80 }, playerProfile).rings).toMatchObject([
      { slot: 3, y2: -38 }, { slot: 4, y2: -5 },
    ]);
    expect(safeguardAtAge(19, { x: 72, y: 80 }, playerProfile).rings).toMatchObject([
      {
        slot: 3,
        y2: -71,
        callback: "AnimTranslateLinear_WithFollowup",
        data: [0, 0, 1417, 0, 18421, 0, 15357, 2058],
      },
      { slot: 4, y2: -38 }, { slot: 5, y2: -5 },
    ]);
    expect(safeguardAtAge(20, { x: 72, y: 80 }, playerProfile).rings[0])
      .toMatchObject({ callback: "DestroyAnimSprite", affineMode: "double", objMode: "blend" });
    expect(safeguardAtAge(33, { x: 72, y: 80 }, playerProfile).rings).toEqual([]);
    expect(safeguardAtAge(7, { x: 176, y: 40 }, opponentProfile).rings[0])
      .toMatchObject({ x: 176, y: 80, y2: -5, subpriority: 38 });
  });

  it("keeps the source pointer, setup/cleanup, and white cycle source-relative", () => {
    expect(safeguardAtAge(0, { x: 72, y: 80 }, playerProfile))
      .toMatchObject({ sourceOffset: 0, scriptActive: true, resources: { loaded: false } });
    expect(safeguardAtAge(1, { x: 72, y: 80 }, playerProfile))
      .toMatchObject({ sourceOffset: 3, sourceWait: 1, resources: { loaded: true, paletteTransferred: false } });
    expect(safeguardAtAge(7, { x: 72, y: 80 }, playerProfile))
      .toMatchObject({ sourceOffset: 21, sourceWait: 4, alpha: { eva: 8, evb: 8 }, monBg: { active: true } });
    expect([34, 35, 36, 38, 40, 42, 44, 52, 54, 56, 58, 60].map((age) =>
      safeguardAtAge(age, { x: 72, y: 80 }, playerProfile).blend.bgY,
    )).toEqual([0, 0, 2, 4, 6, 8, 10, 8, 6, 4, 2, 0]);
    expect(safeguardAtAge(66, { x: 72, y: 80 }, playerProfile))
      .toMatchObject({ sourceOffset: 65, alpha: null, monBg: { active: true, clearing: true } });
    expect(safeguardAtAge(SAFEGUARD_FIRST_INACTIVE_AGE, { x: 72, y: 80 }, playerProfile))
      .toMatchObject({ active: true, scriptActive: false, resources: { loaded: false } });
    expect(safeguardAtAge(SAFEGUARD_FIRST_INACTIVE_AGE + 1, { x: 72, y: 80 }, playerProfile).active)
      .toBe(false);
  });

  it("matches every retained pointer, Guard Ring, task, tag, and alpha row bilaterally", () => {
    const orientations = [
      {
        dense: "tools/compare/evidence/safeguard-player-dense-state.json.gz",
        center: { x: 72, y: 80 },
        profile: playerProfile,
      },
      {
        dense: "tools/compare/evidence/safeguard-opponent-dense-state.json.gz",
        center: { x: 176, y: 40 },
        profile: opponentProfile,
      },
    ];
    for (const orientation of orientations) {
      const rows = JSON.parse(gunzipSync(readFileSync(orientation.dense)).toString("utf8")).frames;
      expect(rows).toHaveLength(SAFEGUARD_FIRST_INACTIVE_AGE + 1);
      for (const [age, row] of rows.entries()) {
        const state = safeguardAtAge(age, orientation.center, orientation.profile);
        const taskSymbols = row.tasks.map((task: { func?: { symbol?: string } }) => task.func?.symbol);
        const liveRings = row.sprites
          .filter((sprite: { template?: { symbol?: string } }) =>
            sprite.template?.symbol === "gGuardRingSpriteTemplate",
          )
          .map((sprite: {
            slot: number; x: number; y: number; x2: number; y2: number;
            subpriority: number; callback?: { symbol?: string }; data: number[]; matrix: number[];
          }) => ({
            slot: sprite.slot,
            x: sprite.x,
            y: sprite.y,
            x2: sprite.x2,
            y2: sprite.y2,
            subpriority: sprite.subpriority,
            callback: sprite.callback?.symbol,
            data: sprite.data,
            matrix: sprite.matrix,
          }));
        expect({
          sourceOffset: state.sourceOffset,
          sourceWait: state.sourceWait,
          scriptActive: state.scriptActive,
          rings: state.rings.map((ring) => ({
            slot: ring.slot,
            x: ring.x,
            y: ring.y,
            x2: ring.x2,
            y2: ring.y2,
            subpriority: ring.subpriority,
            callback: ring.callback,
            data: ring.data,
            matrix: ring.matrix,
          })),
          monBg: state.monBg,
          blendTaskActive: state.blend.taskActive,
          registers: state.alpha ? [16192, 2056] : [0, 0],
          tagged: state.resources.loaded,
        }).toEqual({
          sourceOffset: row.scriptOffset,
          sourceWait: row.scriptWait,
          scriptActive: row.animScriptActive,
          rings: liveRings,
          monBg: {
            active: taskSymbols.includes("Task_UpdateMonBg"),
            clearing: taskSymbols.includes("Task_ClearMonBg"),
          },
          blendTaskActive: taskSymbols.includes("AnimTask_BlendColorCycleLoop"),
          registers: [row.registers.bldcnt, row.registers.bldalpha],
          tagged: row.paletteTags.includes(10244) && row.tileTags.includes(10244),
        });
      }
    }
  });
});
