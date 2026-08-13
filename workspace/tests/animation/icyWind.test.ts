import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import animationComponents from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import {
  ICY_WIND_AUDIO,
  ICY_WIND_COMPONENTS,
  ICY_WIND_PRESENTATION_EFFECTS,
  ICY_WIND_ROOT_SCRIPT,
  ICY_WIND_SNOWBALL_CALLS,
  ICY_WIND_SOURCE_SET_ID,
  ICY_WIND_SOURCE_SPECIES_ID,
  ICY_WIND_SPIKE_CALLS,
  icyWindAtAge,
  icyWindSnowballStep2State,
} from "../../src/animation/icyWind.ts";
import { createSceneOnMovePresentation, sceneOnIcyWindView } from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_ICY_WIND source checkpoint", () => {
  it("pins the complete exclusive graph and root call order", () => {
    const graph = animationComponents.moves.find(({ move }) => move === "MOVE_ICY_WIND");
    expect(graph?.blocks).toEqual(["Move_ICY_WIND", "IcyWindSwirlingSnowballs", "IceSpikesEffectLong"]);
    expect(graph?.componentIds).toEqual(ICY_WIND_COMPONENTS);
    expect(ICY_WIND_ROOT_SCRIPT).toHaveLength(23);
    expect(ICY_WIND_ROOT_SCRIPT.slice(-6)).toEqual(ICY_WIND_PRESENTATION_EFFECTS.cleanup);
    expect(ICY_WIND_AUDIO).toEqual([
      ["playsewithpan", "SE_M_ICY_WIND", 0],
      ["panse", "SE_M_GUST", "SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", 2, 0],
      ["playsewithpan", "SE_M_GUST2", "SOUND_PAN_TARGET"],
      ["loopsewithpan", "SE_M_ICY_WIND", "SOUND_PAN_TARGET", 6, 4],
    ]);
  });

  it("pins both ten-snowball batches and the thirteen-spike call arguments", () => {
    expect(ICY_WIND_SNOWBALL_CALLS.map(({ burst, initialY, targetY, speed, multipleTargets, delayAfter }) =>
      [burst, initialY, targetY, speed, multipleTargets, delayAfter])).toEqual([
      [0, 0, 0, 72, true, 5], [0, 10, 10, 72, true, 5], [0, -10, -10, 72, true, 5], [0, 15, 15, 72, true, 5], [0, -5, -5, 72, true, 0],
      [1, 0, 0, 72, true, 5], [1, 10, 10, 72, true, 5], [1, -10, -10, 72, true, 5], [1, 15, 15, 72, true, 5], [1, -5, -5, 72, true, 0],
    ]);
    expect(ICY_WIND_SPIKE_CALLS.map(({ x, y, averageTargets, delayAfter }) => [x, y, averageTargets, delayAfter])).toEqual([
      [0, 24, true, 4], [8, 24, true, 0], [-8, 24, true, 4], [16, 24, true, 0], [-16, 24, true, 4],
      [24, 24, true, 0], [-24, 24, true, 4], [32, 24, true, 0], [-32, 24, true, 4], [40, 24, true, 0],
      [-40, 24, true, 4], [48, 24, true, 0], [-48, 24, true, 0],
    ]);
  });

  it("reuses only the shared Step2 callback math, never Blizzard ages or receipts", () => {
    const initial = { x: 100, y: 40, x2: 4, y2: -2, data: [0, 72, 0, 0, 0, 0, 0, 0] as const };
    expect(icyWindSnowballStep2State(initial, 0, "player")).toMatchObject({ x: 104, y: 38, x2: 0, y2: 0, data: [144, 72, 0, 0, -15, 1, 0, 0] });
    expect(icyWindSnowballStep2State(initial, 1, "opponent")).toMatchObject({ x2: -8, y2: 1, data: [160, 72, 0, 0, -15, 2, 0, 0] });
  });

  it("reduces the complete move relative to explicit bilateral geometry", () => {
    const geometry = { attackerCenter: { x: 72, y: 104 }, targetCenter: { x: 176, y: 42 }, spikeTargetCenter: { x: 176, y: 40 } };
    expect(icyWindAtAge(-1, "player", geometry)).toMatchObject({ active: false, snowballs: [], spikes: [], background: "field" });
    expect(icyWindAtAge(48, "player", geometry).snowballs).toEqual([
      expect.objectContaining({ callIndex: 0, oamSlot: 3, callback: "AnimFastTranslateLinearWaitEnd", x: -19, y: 156, x2: 4, y2: -2 }),
    ]);
    expect(icyWindAtAge(168, "player", geometry).spikes).toContainEqual(
      expect.objectContaining({ callIndex: 0, oamSlot: 3, x: 176, y: 64, tileFrame: 0 }),
    );
    expect(icyWindAtAge(172, "player", geometry).spikes[0]).toMatchObject({ tileFrame: 2 });
    expect(icyWindAtAge(286, "player", geometry)).toMatchObject({ active: false, snowballs: [], spikes: [], background: "field", blendCnt: 0 });
    expect(() => icyWindAtAge(1.5, "player", geometry)).toThrow(/integer/u);
  });

  it("exposes a narrow fail-closed ICY_WIND Scene-ON seam", () => {
    const attacker = { species: "SWINUB" as const, geometry: { side: "player" as const, spriteCorner: { x: 40, y: 69 }, animationCenter: { x: 72, y: 104 }, battlePositionCenter: { x: 72, y: 80 } } };
    const target = { species: "ONIX" as const, geometry: { side: "opponent" as const, spriteCorner: { x: 145, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } };
    const effectGeometry = { attackerCenter: { x: 72, y: 104 }, targetCenter: { x: 176, y: 42 }, spikeTargetCenter: { x: 176, y: 40 } };
    const stage = createSceneOnMovePresentation({ move: "ICY_WIND", attacker, target, effectGeometry, fieldProfile: { playerHp: 108, playerMaxHp: 125, opponentHp: 110, opponentMaxHp: 110 } });
    expect(sceneOnIcyWindView({ ...stage, age: 168 })).toMatchObject({ age: 168, attacker, target, spikes: [expect.objectContaining({ x: 176, y: 64 })] });
    expect(() => sceneOnIcyWindView({ ...stage, config: { ...stage.config, move: "THUNDER" } } as never)).toThrow(/expected ICY_WIND/u);
  });

  it("audits ROM intervals, assets, callbacks, cleanup, and the lowest legal carrier", () => {
    expect([ICY_WIND_SOURCE_SET_ID, ICY_WIND_SOURCE_SPECIES_ID]).toEqual([31, 220]);
    const run = spawnSync("node", ["--experimental-strip-types", "tools/compare/icyWindSourceAudit.ts"], { cwd: resolve("."), encoding: "utf8" });
    expect(run.status, run.stderr).toBe(0);
    const audit = JSON.parse(run.stdout);
    expect(audit).toMatchObject({ moveId: 196, snowballCalls: 10, spikeCalls: 13, status: "unsupported-source-checkpoint" });
    expect(audit.selectedSharedWithBlizzard).toEqual(["asset:ANIM_TAG_ICE_CRYSTALS", "sprite:gSwirlingSnowballSpriteTemplate"]);
    expect(audit.lowestLevel50Carrier).toEqual({ setId: 31, speciesId: 220, label: "FRONTIER_MON_SWINUB", species: "SPECIES_SWINUB" });
    expect(audit.exclusiveIntervals).toHaveLength(2);
  });
});
