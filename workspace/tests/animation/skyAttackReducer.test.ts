import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import { sceneOnSkyAttackView, type SceneOnSkyAttackPresentationState } from "../../src/animation/sceneOnPresentation.ts";
import { skyAttackAtAge, type SkyAttackLiveInputs } from "../../src/animation/skyAttack.ts";
import { skyAttackConfigFor, skyAttackInputsFor, verifySkyAttackReducer } from "../../tools/compare/verifySkyAttackReducer.ts";

const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("MOVE_SKY_ATTACK pure source-age reducer and narrow Scene-ON seam", () => {
  it("replays every retained setup/unleash row for both orientations twice", () => {
    const first = verifySkyAttackReducer();
    expect(verifySkyAttackReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 330, reducerRows: 660, seamRows: 660, reducerSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), seamSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 330, reducerRows: 660, seamRows: 660, reducerSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), seamSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 660, passes: 2, reducerRows: 1320, seamRows: 1320, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the controller-selected setup/unleash bodies and source latches separate", () => {
    const input = skyAttackInputsFor("player-back");
    expect(skyAttackAtAge("setup", 148, input)).toMatchObject({ body: "setup", active: false, cleanup: { firstInactive: true, resourcesReleased: true } });
    expect(skyAttackAtAge("unleash", 180, input)).toMatchObject({ body: "unleash", active: false, cleanup: { firstInactive: true, resourcesReleased: true } });
    expect(skyAttackAtAge("unleash", 26, input).animArgs).toEqual([-2304, 768, 1, -1, 0, 0, 0, 0]);
    expect(skyAttackAtAge("unleash", 86, input).tasks.some((task) => task.callback === "AnimTask_ShakeMon2_Step")).toBe(true);
  });

  it("materially changes presentation inputs while gameplay state and RNG remain opaque", () => {
    const input = skyAttackInputsFor("player-back");
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0badc0de });
    const gameplayState = Object.freeze({ opaque: "battle-state", turn: 17 });
    const altered: SkyAttackLiveInputs = {
      ...input, attackerSide: "opponent", targetSide: "player", attackerSpecies: "WAILORD", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 37 }, targetPictureOrigin: { x: 39, y: 121 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 45, attr: [13, 0xc0a9, 0x6d23], subpriority: 55, oamPriority: 3, matrixNum: 6, matrix: [256, 0, 0, 256] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 113, attr: [81, 0xc007, 0x4123], subpriority: 14, oamPriority: 0 },
      taskSlots: { monbg: 6, blendSetup: 7, shake: 8, sound: 9, fade: 10, blendUnleash: 11, birdShake: 12, slidingBg: 13, clearMonbg: 14, fadeBg: 15 },
      bird: { ...input.bird, slot: 20, matrixNum: 9, attr: [25, 0xc123, 0x8123], subpriority: 7 },
      resources: { impact: { ...input.resources.impact, tileSlot: 31, paletteAllocatorSlot: 8, paletteBank: 24, tileRange: [620, 16], palette: input.resources.impact.palette.map((color, index) => (color ^ (index * 37 + 0x421)) & 0x7fff) }, bird: { ...input.resources.bird, tileSlot: 32, paletteAllocatorSlot: 9, paletteBank: 25 } },
      allocator: { ...input.allocator, matrixBitmap: 0x95, spriteOrder: input.allocator.spriteOrder.slice().reverse() },
      background: { ...input.background, values: { ...input.background.values, callerOwnedAxis: 73 }, registers: { ...input.background.registers, callerOwnedRegister: 0x2468 }, monbg: { ...input.background.monbg, bg: 2, unleashBg: 1, activeCnt: 0x5c02, paletteBank: 7 }, vram: { callerOwnedVram: 91 } },
      animationRngSeed: 0x12345678, gameplayRng, gameplayState,
    };
    const baseline = skyAttackAtAge("unleash", 90, input), changed = skyAttackAtAge("unleash", 90, altered);
    expect(changed).not.toEqual(baseline); expect(digest(changed)).not.toBe(digest(baseline));
    expect(changed).toMatchObject({ battlers: { attacker: { side: "opponent", species: "WAILORD", sprite: { slot: 21, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", sprite: { slot: 22 } } }, resources: { matrixBitmap: 0x95 }, rng: { gameplay: gameplayRng, gameplayState, gameplayUnchanged: true } });
    const config = skyAttackConfigFor("unleash", altered), seam = sceneOnSkyAttackView({ age: 90, config } as SceneOnSkyAttackPresentationState); const { attacker, target, ...seamBody } = seam;
    expect(seamBody).toEqual(changed); expect(attacker.species).toBe("WAILORD"); expect(target.species).toBe("BLISSEY");
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0badc0de }); expect(gameplayState).toEqual({ opaque: "battle-state", turn: 17 });
  });

  it("keeps Sky Attack unsupported and related component tracks unfulfilled", () => {
    const data = coverage as any;
    expect(data.queue).not.toContain("MOVE_SKY_ATTACK");
    expect(data.entries.some((entry: any) => entry.move === "MOVE_SKY_ATTACK")).toBe(false);
    for (const track of data.componentTracks.filter((entry: any) => entry.representatives?.includes("MOVE_SKY_ATTACK"))) expect(track.fulfilled).not.toBe(true);
  });
});
