import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  machPunchAtAge,
  machPunchFirstInactiveAge,
  machPunchSourceAtAge,
  type MachPunchLiveInputs,
} from "../../src/animation/machPunch.ts";
import {
  machPunchConfigFor,
  machPunchInputsFor,
  verifyMachPunchReducer,
} from "../../tools/compare/verifyMachPunchReducer.ts";
import {
  sceneOnMachPunchView,
  type SceneOnMachPunchPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_MACH_PUNCH source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral semantic row twice through reducer and typed seam", () => {
    const first = verifyMachPunchReducer();
    expect(verifyMachPunchReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 111, reducerRows: 222, seamRows: 222, cleanup: 110, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 110, reducerRows: 220, seamRows: 220, cleanup: 109, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 221, passes: 2, reducerRows: 442, seamRows: 442, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the source cursor, both high-speed branches, dense punch body, latches, and cleanup explicit", () => {
    const player = machPunchInputsFor("player-back");
    const opponent = machPunchInputsFor("opponent-front");
    expect(machPunchSourceAtAge(0, machPunchFirstInactiveAge(player))).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(machPunchSourceAtAge(7, machPunchFirstInactiveAge(player))).toMatchObject({ pointerOffset: 8, wait: 1 });
    expect(machPunchSourceAtAge(29, machPunchFirstInactiveAge(player))).toMatchObject({ pointerOffset: 41, wait: 1 });
    expect(machPunchSourceAtAge(48, machPunchFirstInactiveAge(player))).toMatchObject({ pointerOffset: 44, wait: -1 });
    expect(machPunchSourceAtAge(50, machPunchFirstInactiveAge(player))).toMatchObject({ pointerOffset: 64, wait: 6 });
    expect(machPunchSourceAtAge(58, machPunchFirstInactiveAge(opponent))).toMatchObject({ pointerOffset: 117, wait: 1 });
    expect(machPunchSourceAtAge(109, machPunchFirstInactiveAge(opponent))).toMatchObject({ pointerOffset: 128, wait: 0, active: false });
    expect(machPunchAtAge(29, player)).toMatchObject({ background: { branch: "opponent", scrollX: -9 }, tasks: expect.arrayContaining([expect.objectContaining({ role: "sliding-bg" })]) });
    expect(machPunchAtAge(29, opponent)).toMatchObject({ background: { branch: "player", scrollX: 9 }, tasks: expect.arrayContaining([expect.objectContaining({ role: "sliding-bg" })]) });
    expect(machPunchAtAge(58, player)).toMatchObject({
      alpha: { eva: 9, evb: 8 },
      sprites: expect.arrayContaining([
        expect.objectContaining({ kind: "hitsplat", slot: 13 }),
        expect.objectContaining({ kind: "fist", slot: 14 }),
      ]),
      tasks: expect.arrayContaining([expect.objectContaining({ role: "punch" }), expect.objectContaining({ role: "shake" })]),
      audio: [{ channel: "SE1", sound: "SE_M_COMET_PUNCH", sourcePan: "SOUND_PAN_TARGET", pan: 63 }],
    });
    expect(machPunchAtAge(58, player).sprites.filter((sprite) => sprite.kind === "trace")).toHaveLength(8);
    expect(machPunchAtAge(66, player).sprites.filter((sprite) => sprite.kind === "fist")).toHaveLength(1);
    expect(machPunchAtAge(67, player).sprites.filter((sprite) => sprite.kind === "hitsplat")).toHaveLength(1);
    expect(machPunchAtAge(71, player).rng).toMatchObject({ animation: machPunchAtAge(70, player).rng.animation, sourceDraws: 70 });
    expect(machPunchAtAge(72, opponent).rng).toMatchObject({ animation: machPunchAtAge(70, opponent).rng.animation, sourceDraws: 70 });
    expect(machPunchAtAge(91, player).rng).toMatchObject({ animation: machPunchAtAge(90, player).rng.animation, sourceDraws: 88 });
    expect(machPunchAtAge(110, player).rng.sourceDraws).toBe(107);
    expect(machPunchAtAge(109, opponent).rng.sourceDraws).toBe(107);
    expect(machPunchAtAge(110, player)).toMatchObject({ active: false, sprites: [], tasks: [], resources: { impact: { loaded: false }, handsAndFeet: { loaded: false } }, cleanup: { firstInactive: true, resourcesReleased: true } });
  });

  it("takes material live identity, geometry, allocation, matrix, painter, register, and RNG controls through the seam", () => {
    const input = machPunchInputsFor("player-back");
    const altered: MachPunchLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      taskSlots: { monBg: 9, initialFade: 10, slidingBg: 11, punch: 12, shake: 13, clearMonBg: 14, restoreFade: 15 },
      traceSlots: [30, 31, 32, 33, 34, 35, 36, 37], hitSplatSlot: 28, fistSlot: 29, matrixSlot: 6,
      resources: { impact: { paletteBank: 9, tileSlot: 31, tileRange: [620, 1] }, handsAndFeet: { paletteBank: 10, tileSlot: 32, tileRange: [621, 4] } },
      matrixBitmap: 0x95, matrixSlots: input.matrixSlots.map((matrix, index) => index === 6 ? [192, 16, -16, 192] : matrix), fistMatrix: [303, 0, 0, 303],
      spriteOrder: input.spriteOrder.slice().reverse(), painterSprites: input.painterSprites.map((sprite) => sprite.slot === 0 ? { ...sprite, subpriority: 3 } : sprite),
      registers: { bg3hofs: 0xa5, bldcnt: 0x5a, bldalpha: 0x44, bldy: 0x22 }, animationRngSeed: 0x12345678, gameplayRng: { opaque: "gameplay-owned" },
    };
    const baseline = machPunchAtAge(58, input), source = machPunchAtAge(58, altered);
    expect(source).toMatchObject({ battlers: { attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 21 } }, target: { side: "player", species: "BLISSEY", sprite: { slot: 22 } } }, background: { branch: "player" }, resources: { impact: { allocation: { paletteBank: 9, tileSlot: 31 } }, allocator: { matrixBitmap: 0x95 | (1 << 6) } }, rng: { gameplay: { opaque: "gameplay-owned" }, gameplayUnchanged: true } });
    expect(source).not.toEqual(baseline);
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(machPunchAtAge(0, altered).registers).toEqual({ bg3hofs: 0xa5, bldcnt: 0x5a, bldalpha: 0x44, bldy: 0x22 });
    const config = machPunchConfigFor("player-back");
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, ...animationInputs } = altered;
    const seam = sceneOnMachPunchView({ age: 58, config: {
      ...config,
      attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", animationCenter: altered.attackerPictureOrigin, battlePositionCenter: { x: 201, y: 43 } } },
      target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", animationCenter: altered.targetPictureOrigin, battlePositionCenter: { x: 39, y: 117 } } },
      animationInputs,
    } } as SceneOnMachPunchPresentationState);
    expect(seam.sprites).toEqual(source.sprites);
    expect(seam.resources).toEqual(source.resources);
    expect(seam.attacker.geometry.animationCenter).toEqual({ x: 201, y: 43 });
    expect(seam.target.geometry.animationCenter).toEqual({ x: 39, y: 117 });
  });

  it("keeps the reducer evidence-free while recognizing later exact promotion", () => {
    const source = readFileSync(resolve(root, "src/animation/machPunch.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_MACH_PUNCH")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_MACH_PUNCH");
    expect(data.componentTracks.find((entry: Json) => entry.id === "mach-punch-source-relative-body")).toMatchObject({ representatives: ["MOVE_MACH_PUNCH"], fulfilled: true, goal: expect.stringContaining("FULFILLED") });
  });
});
