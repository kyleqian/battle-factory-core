import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  BONEMERANG_FIRST_INACTIVE_AGE,
  bonemerangAtAge,
  bonemerangSourceAtAge,
  type BonemerangLiveInputs,
} from "../../src/animation/bonemerang.ts";
import {
  sceneOnBonemerangView,
  type SceneOnBonemerangPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  bonemerangConfigFor,
  bonemerangInputsFor,
  verifyBonemerangReducer,
} from "../../tools/compare/verifyBonemerangReducer.ts";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
function playerRows(): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, "tools/compare/evidence/bonemerang-player-dense-state.json.gz"))).toString("utf8")) as Json).frames;
}

describe("MOVE_BONEMERANG source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral component/state row twice through reducer and typed seam", () => {
    const first = verifyBonemerangReducer();
    expect(verifyBonemerangReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 72, reducerRows: 144, seamRows: 144, cleanup: 71, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 72, reducerRows: 144, seamRows: 144, cleanup: 71, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 144, passes: 2, reducerRows: 288, seamRows: 288, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("ports the root cursor, affine Q8.8 projectile, hit/shake, lunge, monbg latch, and cleanup", () => {
    const input = bonemerangInputsFor("player-back", playerRows());
    expect(bonemerangSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(bonemerangSourceAtAge(10)).toMatchObject({ pointerOffset: 26, wait: 20 });
    expect(bonemerangSourceAtAge(32)).toMatchObject({ pointerOffset: 64, wait: 17 });
    expect(bonemerangSourceAtAge(51)).toMatchObject({ pointerOffset: 79, wait: 1 });
    expect(bonemerangSourceAtAge(71)).toMatchObject({ pointerOffset: 83, wait: 1, active: false });
    expect(bonemerangAtAge(10, input)).toMatchObject({
      sprites: [expect.objectContaining({ template: "gBonemerangSpriteTemplate", callback: "AnimBonemerangProjectile_Step", x: 72, y: 96, x2: 5, y2: -8, data: [19, 1330, 601, 1330, 601, -40, 1638, 1638], matrix: [189, -171, 171, 189] })],
      registers: { bldcnt: 16192, bldalpha: 2060 },
      resources: { allocator: { matrixBitmap: 7 } },
    });
    expect(bonemerangAtAge(30, input).sprites[0]).toMatchObject({ callback: "AnimBonemerangProjectile_End", x: 175, y: 49, x2: 0, y2: 0, data: [20, 1319, 600, 0, 0, 40, 1638, 0] });
    expect(bonemerangAtAge(32, input)).toMatchObject({
      battlers: { target: { shake: { x: 0, y: 0 } } },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_ShakeMon_Step", data: expect.arrayContaining([8, 4, 1, 1, 5]) })]),
      sprites: expect.arrayContaining([expect.objectContaining({ template: "gBasicHitSplatSpriteTemplate", matrix: [303, 0, 0, 303] })]),
      audio: [{ sound: "SE_M_HORN_ATTACK", sourcePan: "SOUND_PAN_TARGET", pan: 63 }],
    });
    expect(bonemerangAtAge(34, input)).toMatchObject({ battlers: { target: { shake: { x: 5, y: 0 } } }, background: { softwareScroll: { x: -149, y: -17 } } });
    expect(bonemerangAtAge(51, input)).toMatchObject({ battlers: { attacker: { lunge: { x: -4, y: 0 } } }, sprites: [expect.objectContaining({ template: "gHorizontalLungeSpriteTemplate", callback: "TranslateSpriteLinearById" })] });
    expect(bonemerangAtAge(BONEMERANG_FIRST_INACTIVE_AGE, input)).toMatchObject({
      active: false, sprites: [], tasks: [], resources: { bone: { loaded: false }, impact: { loaded: false } },
      cleanup: { firstInactive: true, resourcesReleased: true, visualTasks: 0, soundTasks: 0 },
    });
  });

  it("takes material live side/species/geometry/allocation/order controls through the typed seam", () => {
    const rows = playerRows();
    const input = bonemerangInputsFor("player-back", rows);
    const altered: BonemerangLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "ONIX", targetSpecies: "ARON",
      attackerPictureCenter: { x: 201, y: 43 }, targetPictureCenter: { x: 39, y: 117 },
      allocations: { ...input.allocations, boneSpriteSlot: 12, impactSpriteSlot: 13, lungeSpriteSlot: 14, boneMatrixSlot: 4, impactMatrixSlot: 5 },
      spriteOrder: input.spriteOrder.slice().reverse(),
    };
    const source = bonemerangAtAge(10, altered);
    expect(source.sprites[0]).toMatchObject({ slot: 12, x: 201, y: 43, x2: -8, y2: -3, subpriority: input.attackerSprite.subpriority - 2, matrixNum: 4 });
    expect(source.audio).toEqual([{ channel: "SE1", sound: "SE_M_BONEMERANG", sourcePan: "SOUND_PAN_ATTACKER", pan: 63 }]);
    expect(source.painterOrder).not.toEqual(input.spriteOrder);
    const config = bonemerangConfigFor("player-back", rows);
    const seam = sceneOnBonemerangView({
      age: 10,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "ONIX", geometry: { ...config.attacker.geometry, side: "opponent", animationCenter: altered.attackerPictureCenter } },
        target: { ...config.target, species: "ARON", geometry: { ...config.target.geometry, side: "player", animationCenter: altered.targetPictureCenter } },
        animationInputs: (() => { const { attackerSide: _a, targetSide: _t, attackerSpecies: _as, targetSpecies: _ts, attackerPictureCenter: _ap, targetPictureCenter: _tp, ...rest } = altered; return rest; })(),
      },
    } as unknown as SceneOnBonemerangPresentationState);
    expect(seam.sprites[0]).toMatchObject({ slot: 12, x: 201, y: 43 });
  });

  it("keeps retained evidence out of production and promotes only Bonemerang and its own track", () => {
    const source = readFileSync(resolve(root, "src/animation/bonemerang.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_BONEMERANG")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "bone-projectile-bonemerang")).toMatchObject({
      representatives: ["MOVE_BONEMERANG"], fulfilled: true,
    });
  });
});
