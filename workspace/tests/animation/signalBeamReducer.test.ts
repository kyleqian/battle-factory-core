import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  signalBeamAtAge,
  signalBeamFirstInactiveAge,
  signalBeamSourceAtAge,
  type SignalBeamLiveInputs,
} from "../../src/animation/signalBeam.ts";
import {
  sceneOnSignalBeamView,
  type SceneOnSignalBeamPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  signalBeamConfigFor,
  signalBeamInputsFor,
  verifySignalBeamReducer,
} from "../../tools/compare/verifySignalBeamReducer.ts";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
function playerRows(): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, "tools/compare/evidence/signal-beam-player-dense-state.json.gz"))).toString("utf8")) as Json).frames;
}

describe("MOVE_SIGNAL_BEAM source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral semantic row twice through reducer and typed seam", () => {
    const first = verifySignalBeamReducer();
    expect(verifySignalBeamReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 146, reducerRows: 292, seamRows: 292, cleanup: 145, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 145, reducerRows: 290, seamRows: 290, cleanup: 144, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 291, passes: 2, reducerRows: 582, seamRows: 582, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("ports the complete root cursor, paired wave stream, timer, shakes, target palette, latches, and cleanup", () => {
    const input = signalBeamInputsFor("player-back", playerRows());
    expect(signalBeamSourceAtAge(0, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(signalBeamSourceAtAge(10, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 28, wait: 6, active: true });
    expect(signalBeamSourceAtAge(18, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 231, wait: 1, active: true });
    expect(signalBeamSourceAtAge(87, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 197, wait: 1, active: true });
    expect(signalBeamSourceAtAge(118, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 198, wait: 1, active: true });
    expect(signalBeamSourceAtAge(145, signalBeamFirstInactiveAge(input))).toMatchObject({ pointerOffset: 198, wait: 1, active: false });
    expect(signalBeamAtAge(18, input)).toMatchObject({
      animArgs: [10, 10, 0, -16, 1, 0, 0, 3],
      sprites: expect.arrayContaining([
        expect.objectContaining({ template: "gSignalBeamRedOrbSpriteTemplate", x: 82, y: 109, x2: 6, y2: -2, data: [28, 802, 513, 1604, 1026, 1792, 3584, 16] }),
        expect.objectContaining({ template: "gSignalBeamGreenOrbSpriteTemplate", x: 82, y: 109, x2: 6, y2: -7, data: [28, 802, 513, 1604, 1026, 1792, 3584, -16] }),
      ]),
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_ShakeMon_Step", data: expect.arrayContaining([6, 20, 1, 1, 0, 2]) }),
        expect.objectContaining({ callback: "Task_PanFromInitialToTarget", data: expect.arrayContaining([-64, 63, 1, 0, -63]) }),
        expect.objectContaining({ callback: "AnimTask_RunSinAnimTimer", data: expect.arrayContaining([99]) }),
      ]),
      audio: [{ channel: "SE1", sound: "SE_M_BUBBLE_BEAM", sourcePan: "SOUND_PAN_ATTACKER", pan: -63 }],
    });
    expect(signalBeamAtAge(36, input)).toMatchObject({
      battlers: { attacker: { shake: { x: 0, y: 2 } }, target: { shake: { x: 0, y: 0 } } },
      palette: { phase: "red", softwareWrite: "red" },
      sprites: expect.arrayContaining([expect.objectContaining({ template: "gComplexPaletteBlendSpriteTemplate", data: [7, 8, 5, 31, 8, 961, 8, 4] })]),
    });
    expect(signalBeamAtAge(90, input)).toMatchObject({ palette: { phase: "base", softwareWrite: "restore" } });
    expect(signalBeamAtAge(145, input)).toMatchObject({
      active: false, sprites: [], tasks: [], resources: { duck: { loaded: false }, redOrb: { loaded: false }, greenOrb: { loaded: false } },
      cleanup: { firstInactive: true, resourcesReleased: true, visualTasks: 0, soundTasks: 0 },
      displayTransfer: { oam: "preceding-software", matrices: "preceding-software", palette: "preceding-faded" },
    });
  });

  it("takes material live side/species/geometry/origin/allocation/matrix/task/resource/order/presentation controls through the seam", () => {
    const rows = playerRows();
    const input = signalBeamInputsFor("player-back", rows);
    const altered: SignalBeamLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 21, subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 22, subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      orbPairs: input.orbPairs.map((_, index) => ({ redSlot: 30 + (index % 10) * 2, greenSlot: 31 + (index % 10) * 2 })),
      taskSlots: { attackerShake: 9, pan: 10, sinTimer: 11, targetShake: 12 }, paletteBlendSpriteSlot: 29,
      resources: {
        redOrb: { paletteBank: 9, tileSlot: 31, tileRange: [620, 1] },
        greenOrb: { paletteBank: 10, tileSlot: 32, tileRange: [621, 1] },
        duck: { paletteBank: 11, tileSlot: 33, tileRange: [622, 4] },
      },
      matrixBitmap: 0x95, matrixSlots: input.matrixSlots.map((matrix, index) => index === 6 ? [192, 16, -16, 192] : matrix),
      spriteOrder: input.spriteOrder.slice().reverse(),
      targetPalette: { bank: 20, unfaded: Array.from({ length: 16 }, (_, index) => (index * 97) & 0x7fff) },
      registers: { win0h: 0xa5, win0v: 0x5a }, animationRngSeed: 0x12345678, gameplayRng: { opaque: "gameplay-owned" },
    };
    const source = signalBeamAtAge(18, altered), baseline = signalBeamAtAge(18, input);
    expect(source).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT" }, target: { side: "player", species: "BLISSEY" } },
      sprites: expect.arrayContaining([expect.objectContaining({ slot: 30, x: 191, y: 53, subpriority: 11 })]),
      tasks: expect.arrayContaining([expect.objectContaining({ slot: 9 }), expect.objectContaining({ slot: 10 }), expect.objectContaining({ slot: 11 })]),
      resources: { redOrb: { paletteBank: 9, tileSlot: 31 }, allocator: { matrixBitmap: 0x95, matrixSlots: expect.any(Array) } },
      palette: { targetBank: 20 }, audio: [{ pan: 62 }], rng: { gameplay: { opaque: "gameplay-owned" }, gameplayUnchanged: true },
    });
    expect(source).not.toEqual(baseline);
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    const config = signalBeamConfigFor("player-back", rows);
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, ...animationInputs } = altered;
    const seam = sceneOnSignalBeamView({
      age: 18,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT", geometry: { side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: altered.attackerPictureOrigin, battlePositionCenter: { x: 201, y: 43 } } },
        target: { ...config.target, species: "BLISSEY", geometry: { side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: altered.targetPictureOrigin, battlePositionCenter: { x: 39, y: 117 } } },
        animationInputs,
      },
    } as unknown as SceneOnSignalBeamPresentationState);
    expect(seam.sprites).toEqual(source.sprites);
    expect(seam.resources).toEqual(source.resources);
    expect(seam.attacker.geometry.animationCenter).toEqual({ x: 201, y: 43 });
    expect(seam.target.geometry.animationCenter).toEqual({ x: 39, y: 117 });
  });

  it("keeps retained evidence out of production and leaves Signal Beam unsupported", () => {
    const source = readFileSync(resolve(root, "src/animation/signalBeam.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as Json;
    expect(data.entries.some((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM")).toBe(false);
    expect(data.queue).toEqual(["MOVE_SIGNAL_BEAM"]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream")).toMatchObject({
      representatives: ["MOVE_SIGNAL_BEAM"], fulfilled: false, goal: expect.stringContaining("UNFULFILLED"),
    });
  });
});
