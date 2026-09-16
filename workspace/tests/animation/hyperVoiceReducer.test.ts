import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  HYPER_VOICE_FIRST_INACTIVE_AGE,
  hyperVoiceAtAge,
  hyperVoiceSourceAtAge,
  type HyperVoiceLiveInputs,
} from "../../src/animation/hyperVoice.ts";
import {
  sceneOnHyperVoiceView,
  type SceneOnHyperVoicePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  hyperVoiceConfigFor,
  hyperVoiceInputsFor,
  verifyHyperVoiceReducer,
} from "../../tools/compare/verifyHyperVoiceReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_HYPER_VOICE source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all 210 retained bilateral rows twice through reducer and typed seam", () => {
    const first = verifyHyperVoiceReducer();
    expect(verifyHyperVoiceReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 105, reducerRows: 210, seamRows: 210, cleanup: 104, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 105, reducerRows: 210, seamRows: 210, cleanup: 104, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 210, passes: 2, reducerRows: 420, seamRows: 420, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps the complete root, dual effect calls, source tasks, latches, and first inactive cleanup", () => {
    const player = hyperVoiceInputsFor("player-back");
    expect(hyperVoiceSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(hyperVoiceSourceAtAge(1)).toMatchObject({ pointerOffset: 3, wait: 1 });
    expect(hyperVoiceSourceAtAge(4)).toMatchObject({ pointerOffset: 17, wait: 1 });
    expect(hyperVoiceSourceAtAge(48)).toMatchObject({ pointerOffset: 17, wait: 1 });
    expect(hyperVoiceSourceAtAge(49)).toMatchObject({ pointerOffset: 20, wait: 8 });
    expect(hyperVoiceSourceAtAge(57)).toMatchObject({ pointerOffset: 20, wait: 0 });
    expect(hyperVoiceSourceAtAge(59)).toMatchObject({ pointerOffset: 34, wait: 1 });
    expect(hyperVoiceSourceAtAge(HYPER_VOICE_FIRST_INACTIVE_AGE)).toMatchObject({ pointerOffset: 35, wait: 0, active: false });
    expect(hyperVoiceAtAge(4, player)).toMatchObject({
      animArgs: [1, 0, 6, 1, 1, 0, 1, 0],
      effect: { call: 1, localAge: 0, callsStarted: 1 },
      sprites: {
        paletteBlend: { template: "gSimplePaletteBlendSpriteTemplate", sourceCreationOrder: 0 },
        ring: { template: "gHyperVoiceRingSpriteTemplate", x: 27, y: 91, x2: 6, y2: -2, matrix: [2427, 0, 0, 2427], sourceCreationOrder: 1 },
      },
      tasks: [
        { callback: "SoundTask_PlayCryWithEcho_Step", data: expect.arrayContaining([0, 372, -64, 0, 0, 0, 0, 0, 0, 1, 0]) },
        { callback: "AnimTask_ScaleMonAndRestore_Step", data: expect.arrayContaining([-5, -5, 4, 5]) },
        { callback: "AnimTask_ShakeMon2_Step", data: expect.arrayContaining([player.targetSprite.slot, 5, 1, 1, 1]) },
        { callback: "AnimTask_ShakeBattlePlatforms_Step", data: expect.arrayContaining([1, 0, 5, 1]) },
        { callback: "SoundTask_WaitForCry", data: expect.arrayContaining([0, 0, 0, 0, 0, 0, 0, 0, 0, 2]) },
      ],
      displayTransfer: {
        oam: "preceding-software", ringMatrix: "preceding-software", attackerScaleMatrix: "preceding-software",
        targetShake: "initial", platform: "preceding-software",
        palette: { thinRing: "preceding-faded", battlers: "preceding-faded", backgrounds: "same-row-effect-setup" },
      },
      platform: { sourceX: -1, hardwareX: 0 },
      partnerShake: { requested: true, active: false, reason: "singles-no-visible-partner" },
    });
    expect(hyperVoiceAtAge(6, player)).toMatchObject({
      effect: { call: 1, localAge: 2 },
      battlers: { attacker: { sprite: { matrix: [241, 0, 0, 241] } }, target: { shake: { x: 1, y: 0 } } },
      displayTransfer: { attackerScaleMatrix: "two-source-rows", targetShake: "two-source-rows", platform: "preceding-software" },
      audio: { events: [] },
    });
    expect(hyperVoiceAtAge(5, player).audio.events).toEqual([{ kind: "cry-echo-start", species: "EXPLOUD", pan: -64 }]);
    expect(hyperVoiceAtAge(32, player).audio.events).toEqual([{ kind: "cry-echo-end", species: "EXPLOUD", pan: -64 }]);
    expect(hyperVoiceAtAge(59, player)).toMatchObject({ effect: { call: 2, localAge: 0, callsStarted: 2 }, resources: { thinRing: { loaded: true, tag: 10203 } } });
    expect(hyperVoiceAtAge(103, player)).toMatchObject({ active: true, sprites: { ring: null, paletteBlend: null }, resources: { thinRing: { loaded: true } }, cleanup: { visualTasks: 0, resourcesReleased: false } });
    expect(hyperVoiceAtAge(HYPER_VOICE_FIRST_INACTIVE_AGE, player)).toMatchObject({
      active: false, tasks: [{ callback: "Task_DuckBGMForPokemonCry" }], sprites: { ring: null, paletteBlend: null },
      resources: { thinRing: { loaded: false, tag: null } }, matrices: { bitmap: 6 },
      cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, resourcesReleased: true },
    });
  });

  it("takes material live identity, side, geometry, allocation, painter, matrix, audio, and RNG controls through the seam", () => {
    const input = hyperVoiceInputsFor("player-back");
    const gameplay = Object.freeze({ opaque: "gameplay-owned", rng: 0x0badc0de });
    const altered: HyperVoiceLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY", attackerCrySpecies: 169,
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, oamPriority: 3, matrixNum: 6, matrix: [192, 16, -16, 192], attr: [43, 0xc0a9, 0x6d23] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, oamPriority: 1, matrixNum: 7, matrix: [224, 0, 0, 224], attr: [117, 0xc007, 0x4123] },
      taskSlots: { cry: 5, scale: 6, targetShake: 7, platform: 8, waitForCry: 9, duckBgm: 10 },
      spriteSlots: { paletteBlend: 30, ring: 31 }, paletteBlendSubpriority: 53,
      matrixSlots: { ring: 5, attackerScale: 6 },
      resource: { tag: 10203, tileSlot: 31, paletteBank: 11, tileRange: [620, 64] },
      spriteOrder: input.spriteOrder.slice().reverse(), painter: { shadowSlot: 2, ringInsertionBefore: 21 },
      palettes: { ...input.palettes, backgroundBanks: [3, 4, 5], attackerBank: 21, targetBank: 22, thinRingBank: 27 },
      matrixBitmap: 0xd5, animationRngSeed: 0x12345678, gameplayRng: gameplay,
    };
    const baseline = hyperVoiceAtAge(59, input), source = hyperVoiceAtAge(59, altered);
    expect(source).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 21, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", sprite: { slot: 22 } } },
      sprites: {
        paletteBlend: { slot: 30, x: 39, y: 117, subpriority: 53 },
        ring: { slot: 31, x: 246, y: 43, matrixNum: 5, subpriority: 13 },
      },
      resources: { thinRing: { allocation: { tileSlot: 31, paletteBank: 11 } } },
      matrices: { bitmap: 0xf5 },
      rng: { animation: expect.any(Number), gameplay, gameplayUnchanged: true },
    });
    expect(source.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: 5, callback: "SoundTask_PlayCryWithEcho_Step", data: expect.arrayContaining([0, 169, 63]) }),
    ]));
    expect(source).not.toEqual(baseline);
    expect(source.painterOrder).not.toEqual(baseline.painterOrder);
    expect(gameplay).toEqual({ opaque: "gameplay-owned", rng: 0x0badc0de });
    const config = hyperVoiceConfigFor("player-back");
    const {
      attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
      attackerPictureOrigin: _attackerPictureOrigin, targetPictureOrigin: _targetPictureOrigin, ...animationInputs
    } = altered;
    const seam = sceneOnHyperVoiceView({ age: 59, config: {
      ...config,
      attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", animationCenter: altered.attackerPictureOrigin, battlePositionCenter: { x: 201, y: 43 } } },
      target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", animationCenter: altered.targetPictureOrigin, battlePositionCenter: { x: 39, y: 117 } } },
      animationInputs,
    } } as SceneOnHyperVoicePresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(source);
    expect(attacker.geometry.animationCenter).toEqual({ x: 201, y: 43 });
    expect(target.geometry.animationCenter).toEqual({ x: 39, y: 117 });
  });

  it("keeps production evidence-free and credits Hyper Voice alone", () => {
    const source = readFileSync(resolve(root, "src/animation/hyperVoice.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.entries).toHaveLength(257);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "hyper-voice-ring-cry-platform")).toMatchObject({
      representatives: ["MOVE_HYPER_VOICE"], fulfilled: true,
    });
    for (const move of ["MOVE_UPROAR", "MOVE_ROAR", "MOVE_ROCK_TOMB", "MOVE_SNORE"]) {
      expect(JSON.stringify(data.componentTracks.find((track: Json) => track.representatives?.includes(move)) ?? {}))
        .not.toContain("hyper-voice-ring-cry-platform");
    }
  });
});
