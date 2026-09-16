import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  NIGHTMARE_CONTEST_BLEND,
  nightmareAtAge,
  nightmareSourceAtAge,
  type NightmareLiveInputs,
} from "../../src/animation/nightmare.ts";
import {
  sceneOnNightmareView,
  type SceneOnNightmarePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  nightmareConfigFor,
  nightmareInputsFor,
  verifyNightmareReducer,
} from "../../tools/compare/verifyNightmareReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
function playerRows(): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, "tools/compare/evidence/nightmare-player-dense-state.json.gz"))).toString("utf8")) as Json).frames;
}

describe("MOVE_NIGHTMARE legal-battle reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral row twice through reducer and typed seam byte-identically", () => {
    const first = verifyNightmareReducer();
    expect(verifyNightmareReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 169, reducerRows: 338, seamRows: 338, cleanup: 168, digest: "2badd5e0774aba8378c27c51175a6049df7d37f95c04b9625f6181bbed500f48", framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 169, reducerRows: 338, seamRows: 338, cleanup: 168, digest: "6388680a3e8594be05b638379b54f5dff55d91c574a8b3f98f884ceb2276c09e", framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 338, passes: 2, reducerRows: 676, seamRows: 676, digest: "eb6c068f153849de04f43603da14167478ad3de760c9e7614e48dfdcdfdae8b5", framebufferCompared: false, coverageCredit: false },
    });
  });

  it("ports the legal root cursor, fades, target MonBg/shake, clone blend, latches, RNG stalls, and cleanup", () => {
    const rows = playerRows(), at43 = nightmareInputsFor("player-back", rows, 43);
    expect(NIGHTMARE_CONTEST_BLEND).toEqual({ color: "RGB_WHITE", coefficient: 10, delay: 2, repeats: 1 });
    expect(nightmareSourceAtAge(0)).toEqual({ owner: "Move_NIGHTMARE", pointer: 0x082cd4a3, pointerOffset: 0, active: true, wait: 0 });
    expect(nightmareSourceAtAge(40)).toMatchObject({ pointerOffset: 10, wait: 1 });
    expect(nightmareSourceAtAge(43)).toMatchObject({ pointerOffset: 38, wait: 1 });
    expect(nightmareSourceAtAge(127)).toMatchObject({ pointerOffset: 42, wait: 1 });
    expect(nightmareSourceAtAge(168)).toMatchObject({ pointerOffset: 43, active: false, wait: 0 });
    expect(nightmareAtAge(43, at43)).toMatchObject({
      animArgs: [1, 3, 0, 40, 1, 0, 0, 0],
      sprites: [expect.objectContaining({ slot: 3, x: 176, y: 49, x2: 0, y2: -1, data: [79, 144, -112, 144, -112, 0, 29737, 2048] })],
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_NightmareClone_Step", data: expect.arrayContaining([3, 1, 14, 2, 0, 1]) }),
        expect.objectContaining({ callback: "AnimTask_ShakeMon_Step", data: expect.arrayContaining([8, 39, 1, 1, 3, 0]) }),
      ]),
      registers: { bldcnt: 16192, bldalpha: 527, bldy: 0 },
      audio: [{ channel: "SE1", sound: "SE_M_NIGHTMARE", sourcePan: "SOUND_PAN_TARGET", pan: 63 }],
    });
    expect(nightmareAtAge(46, nightmareInputsFor("player-back", rows, 46))).toMatchObject({
      battlers: { target: { shake: { x: 3, y: 0 } } },
      background: { sourceX: -147, sourceY: -17, hardwareX: 365, hardwareY: 495 },
      registers: { bldalpha: 782, bg1hofs: 365 },
    });
    expect(nightmareAtAge(168, nightmareInputsFor("player-back", rows, 168))).toMatchObject({
      active: false, sprites: [], tasks: [], registers: { bldcnt: 0, bldalpha: 0, bldy: 0 },
      cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, ownedSprites: 0, resourcesReleased: false, monBgCleared: true },
    });
  });

  it("takes material live side/species/origin/allocation/painter/palette/BG/register/audio/RNG controls through both seams without touching gameplay", () => {
    const rows = playerRows(), input = nightmareInputsFor("player-back", rows, 50);
    const altered: NightmareLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, attr: [31, 0xc0c9, 0x1234], matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, attr: [47, 0xc027, 0x2345], matrixNum: 7, matrix: [224, 0, 0, 224] },
      clone: { slot: 29, template: "gMultiuseSpriteTemplate", attr: [47, 0xc027, 0x2345], flags: 1, matrixNum: 7, matrix: [224, 0, 0, 224], subpriority: 14, dataTail: [9, 0x1234, 0x5678], sourceCreationOrder: 17 },
      tasks: { fadeToGhost: 9, clone: 10, shake: 11, fadeRestore: 12 },
      monBg: { updateTaskSlot: 13, clearTaskSlot: 14, selected: "BG2", backgroundOrigin: { x: -71, y: -29 }, inBg2: 1, battler: 0, setupControl: 0x6a5b },
      painterOrder: input.painterOrder.slice().reverse(),
      resources: { opaqueAllocator: "altered", resourceSlot: 37 }, matrixBitmap: 0x95,
      matrices: input.matrices.map((matrix, index) => index === 7 ? [224, 0, 0, 224] : matrix),
      palettes: { unfaded: Array.from({ length: 512 }, (_, index) => (index * 17) & 0x7fff), faded: Array.from({ length: 512 }, (_, index) => (index * 29) & 0x7fff), hardware: Array.from({ length: 512 }, (_, index) => (index * 47) & 0x7fff) },
      backgrounds: { battle: { id: "battle-a" }, ghost: { id: "ghost-a" }, monBg: { id: "monbg-a" }, clear: { id: "clear-a" }, clearedGhost: { id: "cleared-a" }, restoredBattle: { id: "restored-a" } },
      registers: { ...input.registers, bg1cnt: 0x1111, bg2cnt: 0x2222, bg1hofs: 7, bg1vofs: 8, bg2hofs: 9, bg2vofs: 10 },
      audio: { targetPan: -63 }, animationRngSeed: 0x12345678, gameplayRng: { opaque: "gameplay-owned" }, gameplayState: { opaque: "gameplay-state" },
    };
    const source = nightmareAtAge(50, altered), baseline = nightmareAtAge(50, input);
    expect(source).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT", pictureOrigin: { x: 201, y: 43 } }, target: { side: "player", species: "BLISSEY", pictureOrigin: { x: 39, y: 117 } } },
      sprites: [expect.objectContaining({ slot: 29, x: 39, y: 117, matrixNum: 7, sourceCreationOrder: 17 })],
      tasks: expect.arrayContaining([expect.objectContaining({ slot: 10 }), expect.objectContaining({ slot: 11 }), expect.objectContaining({ slot: 13 })]),
      resources: { allocator: { opaqueAllocator: "altered", resourceSlot: 37 }, matrixBitmap: 0x95 },
      palette: { unfaded: altered.palettes.unfaded, faded: altered.palettes.faded, hardware: altered.palettes.hardware },
      background: { selected: "BG2", sourceX: -74, sourceY: -29, vram: { id: "monbg-a" } },
      registers: { bg2cnt: 0x6a5b, bg2hofs: 438, bg2vofs: 483 },
      audio: [], rng: { gameplay: { opaque: "gameplay-owned" }, gameplayUnchanged: true }, gameplay: { opaque: "gameplay-state" },
    });
    expect(source).not.toEqual(baseline);
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(source.resources.matrices).toEqual(altered.matrices);
    expect(source.rng.animation).not.toEqual(baseline.rng.animation);
    const config = nightmareConfigFor("player-back", rows, 50);
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerPictureOrigin: _attackerOrigin, targetPictureOrigin: _targetOrigin, ...animationInputs } = altered;
    const seam = sceneOnNightmareView({
      age: 50,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT", geometry: { side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: altered.attackerPictureOrigin, battlePositionCenter: altered.attackerPictureOrigin } },
        target: { ...config.target, species: "BLISSEY", geometry: { side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: altered.targetPictureOrigin, battlePositionCenter: altered.targetPictureOrigin } },
        animationInputs,
      },
    } as unknown as SceneOnNightmarePresentationState);
    expect(seam.sprites).toEqual(source.sprites);
    expect(seam.tasks).toEqual(source.tasks);
    expect(seam.resources).toEqual(source.resources);
    expect(seam.rng).toEqual(source.rng);
    expect(seam.attacker.geometry.animationCenter).toEqual({ x: 201, y: 43 });
    expect(seam.target.geometry.animationCenter).toEqual({ x: 39, y: 117 });
  });

  it("keeps retained evidence out of production and the contest track unfulfilled", () => {
    const source = readFileSync(resolve(root, "src/animation/nightmare.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_NIGHTMARE"))
      .toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "nightmare-clone-blend")).toMatchObject({ representatives: ["MOVE_NIGHTMARE"], fulfilled: false });
  });
});
