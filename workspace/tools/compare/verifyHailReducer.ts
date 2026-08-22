/** Verify the source-relative Hail reducer and its typed Scene-ON seam. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { hailAtAge, HAIL_TAG, ICE_CRYSTALS_TAG, type HailProfile } from "../../src/animation/hail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHailView,
  type SceneOnHailConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/hail-evidence.json", "utf8")) as Json;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const fail = (message: string): never => { throw new Error(message); };

const TARGETS: Record<Orientation, readonly Readonly<{ targetX: number; targetY: number; initialX: number; initialY: -8; impact: boolean }>[]> = {
  "player-back": [
    { targetX: 100, targetY: 120, initialX: 36, initialY: -8, impact: false }, { targetX: 64, targetY: 85, initialX: 18, initialY: -8, impact: true }, { targetX: 185, targetY: 52, initialX: 155, initialY: -8, impact: true }, { targetX: 66, targetY: 120, initialX: 2, initialY: -8, impact: false }, { targetX: 182, targetY: 120, initialX: 118, initialY: -8, impact: false }, { targetX: 60, targetY: 120, initialX: -4, initialY: -8, impact: false }, { targetX: 167, targetY: 32, initialX: 147, initialY: -8, impact: true }, { targetX: 80, targetY: 103, initialX: 25, initialY: -8, impact: true }, { targetX: 210, targetY: 120, initialX: 146, initialY: -8, impact: false }, { targetX: 38, targetY: 120, initialX: -26, initialY: -8, impact: false },
  ],
  "opponent-front": [
    { targetX: 100, targetY: 120, initialX: 36, initialY: -8, impact: false }, { targetX: 63, targetY: 78, initialX: 20, initialY: -8, impact: true }, { targetX: 182, targetY: 56, initialX: 150, initialY: -8, impact: true }, { targetX: 66, targetY: 120, initialX: 2, initialY: -8, impact: false }, { targetX: 182, targetY: 120, initialX: 118, initialY: -8, impact: false }, { targetX: 60, targetY: 120, initialX: -4, initialY: -8, impact: false }, { targetX: 170, targetY: 40, initialX: 146, initialY: -8, impact: true }, { targetX: 81, targetY: 98, initialX: 28, initialY: -8, impact: true }, { targetX: 210, targetY: 120, initialX: 146, initialY: -8, impact: false }, { targetX: 38, targetY: 120, initialX: -26, initialY: -8, impact: false },
  ],
};

function battler(side: "player" | "opponent") {
  return { species: "ONIX" as const, geometry: { side, spriteCorner: { x: 0, y: 0 }, animationCenter: { x: 0, y: 0 }, battlePositionCenter: { x: 0, y: 0 } } } as const;
}

function profileFor(orientation: Orientation, rows: Json[]): HailProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    occupiedSpriteSlots: rows[0]!.sprites.map((sprite: Json) => sprite.slot), occupiedAffineMatrixSlots: [1, 2],
    targets: TARGETS[orientation] as HailProfile["targets"],
    unfadedPaletteBeforeLoad: rows[0]!.unfadedPalette, fadedPaletteBeforeLoad: rows[0]!.fadedPalette, hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    unfadedPaletteAfterHailLoad: rows[1]!.unfadedPalette, fadedPaletteAfterHailLoad: rows[1]!.fadedPalette,
    unfadedPaletteAfterCrystalLoad: rows[4]!.unfadedPalette, fadedPaletteAfterCrystalLoad: rows[4]!.fadedPalette,
    hardwareMatricesAtAge0: rows[0]!.hardwareMatrices,
  };
}

function effectRow(row: Json): readonly Json[] {
  return row.sprites.filter((sprite: Json) => ["gHailParticleSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate"].includes(sprite.template?.symbol)).map((sprite: Json) => ({
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority,
    invisible: sprite.invisible, matrix: sprite.matrix, data: sprite.data, attr: sprite.attr,
  }));
}

export function verifyHailReducer(): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation] as Json;
    const rows = (JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json).frames as Json[];
    const profile = profileFor(orientation, rows); const playerAttacker = orientation === "player-back";
    const config: SceneOnHailConfig = { move: "HAIL", attacker: battler(playerAttacker ? "player" : "opponent"), target: battler(playerAttacker ? "opponent" : "player"), fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100, playerGender: "male", opponentGender: "male" }, animationProfile: profile };
    const stage = createSceneOnMovePresentation(config); let reducerRows = 0; let seamRows = 0; let particleCreates = 0; let impactCreates = 0; let peakHail = 0; let peakSprites = 0; let priorCrystals = new Set<number>();
    for (let age = 0; age < rows.length; age += 1) {
      const row = rows[age]!; const reduced = hailAtAge(age, profile); const prefix = `${orientation} age ${age}`;
      if (!same([row.scriptOwner, row.scriptOffset, row.scriptWait, row.animArgs, row.animScriptActive], [reduced.source.owner, reduced.source.offset, reduced.source.wait, reduced.source.args, reduced.active])) fail(`${prefix}: script cursor/args drift`);
      if (row.scriptPtr !== reduced.source.pointer || row.scriptPtrParity !== reduced.source.pointerParity) fail(`${prefix}: source pointer drift`);
      if (row.animationRng !== reduced.animationRng) fail(`${prefix}: animation RNG drift`);
      const actualTasks = row.tasks.filter((task: Json) => ["AnimTask_Hail2", "AnimTask_BlendSpriteColor_Step2", "Task_LoopAndPlaySE"].includes(task.func?.symbol)).map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }));
      if (!same(actualTasks, reduced.tasks)) fail(`${prefix}: task lifecycle/data drift`);
      const expectedEffects = reduced.sprites.map((sprite) => ({ slot: sprite.slot, template: sprite.template, callback: sprite.callback, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority, invisible: sprite.invisible, matrix: sprite.matrix, data: sprite.data, attr: sprite.attr }));
      if (!same(effectRow(row), expectedEffects)) fail(`${prefix}: Hail sprite lifecycle/OAM drift`);
      if (!same(row.softwareMatrices, reduced.matrices.software) || !same(row.hardwareMatrices, reduced.matrices.hardware)) fail(`${prefix}: affine matrix transfer drift`);
      if (!same(row.unfadedPalette, reduced.palette.unfaded) || !same(row.fadedPalette, reduced.palette.faded) || !same(row.hardwarePalette, reduced.palette.hardware)) fail(`${prefix}: palette transfer drift`);
      if (row.tileTags.includes(HAIL_TAG) !== (age >= 1 && age <= 156) || row.tileTags.includes(ICE_CRYSTALS_TAG) !== (age >= 4 && age <= 156)) fail(`${prefix}: resource lifetime drift`);
      const actualAudioActive = row.audio.SE1.songHeaderIdentity.symbol === "se_m_hail" && (row.audio.SE1.status & 0x80000000) === 0;
      if (actualAudioActive !== reduced.audio.active) fail(`${prefix}: audio lifetime drift`);
      if (row.visualTaskCount !== reduced.visualTaskCount || row.soundTaskCount !== reduced.soundTaskCount) fail(`${prefix}: task counts drift`);
      const view = sceneOnHailView({ ...stage, age }); const { attacker: _a, target: _t, ...seamState } = view;
      if (!same(reduced, seamState)) fail(`${prefix}: typed Scene-ON seam drift`);
      const crystals = new Set(reduced.sprites.filter((sprite) => sprite.kind === "crystal").map((sprite) => sprite.slot));
      if (age >= 37 && age <= 113 && (age - 37) % 2 === 0 && (age - 37) % 8 <= 4) particleCreates += 1;
      impactCreates += [...crystals].filter((slot) => !priorCrystals.has(slot)).length;
      peakHail = Math.max(peakHail, reduced.sprites.filter((sprite) => sprite.kind === "particle").length); peakSprites = Math.max(peakSprites, reduced.sprites.length); priorCrystals = crystals; reducerRows += 1; seamRows += 1;
    }
    result[orientation] = { reducerRows, seamRows, lifecycle: { particleCreates, impactCreates, peakHail, peakSprites }, cleanup: { age: 157, active: false, sprites: 0, tasks: 0, framebufferCompared: false } };
  }
  return result;
}

if (import.meta.main) console.log(JSON.stringify(verifyHailReducer(), null, 2));
