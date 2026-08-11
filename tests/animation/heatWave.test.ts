import { describe, expect, it } from "vitest";
import { HEAT_WAVE_FRAME_COUNT, heatWaveAtAge } from "../../src/animation/heatWave.ts";

describe("MOVE_HEAT_WAVE source-relative reducer", () => {
  it("ports the mirrored background, blend, pan, and complete cleanup", () => {
    expect(heatWaveAtAge(0, "player")).toMatchObject({ active: true, flyingDirtLoaded: false });
    expect(heatWaveAtAge(10, "player")).toMatchObject({
      bgScroll: { x: 482, y: 507 }, blend: { eva: 1, evb: 15 },
      particleRedCoefficient: 6, backgroundRedCoefficient: 6,
    });
    expect(heatWaveAtAge(10, "opponent").bgScroll).toEqual({ x: 30, y: 507 });
    expect(heatWaveAtAge(12, "player").targetX2).toBe(2);
    expect(heatWaveAtAge(12, "opponent").targetX2).toBe(-2);
    expect(heatWaveAtAge(139, "player").targetX2).toBe(2);
    expect(heatWaveAtAge(140, "player").targetX2).toBe(0);
    expect(heatWaveAtAge(167, "player")).toMatchObject({
      active: false, flyingDirtLoaded: false, backgroundLoaded: false,
      visualTaskCount: 0, bgScroll: { x: 0, y: 0 }, blend: { eva: 0, evb: 0 },
    });
    expect(HEAT_WAVE_FRAME_COUNT).toBe(168);
  });

  it("ports all seven signed fixed-point crescent programs in both orientations", () => {
    expect(heatWaveAtAge(26, "player").crescents[0]).toMatchObject({
      spawnIndex: 0, oamSlot: 3, x: -64, x2: 9, fractionalX: 0, mirrored: false,
    });
    expect(heatWaveAtAge(26, "opponent").crescents[0]).toMatchObject({
      spawnIndex: 0, oamSlot: 3, x: 304, x2: -9, fractionalX: 0, mirrored: true,
    });
    expect(heatWaveAtAge(88, "opponent").crescents.at(-1)).toMatchObject({
      spawnIndex: 5, oamSlot: 4, velocityX: -2816, fractionalX: 0,
    });
    expect(heatWaveAtAge(98, "player").crescents.at(-1)?.spawnIndex).toBe(6);
    expect(heatWaveAtAge(138, "player").crescents).toHaveLength(0);
  });
});
