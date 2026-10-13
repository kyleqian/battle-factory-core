/**
 * Pure, UNWIRED Scene-ON reducers for the B_ANIM_STATUS_* scripts that need new motion code
 * (docs/stp128-status-condition-render-prep.md): Status_Curse / Status_Nightmare (AnimGhostStatusSprite + monbg ANIM_DEF_PARTNER +
 * AnimTask_ShakeMon2), Status_Confusion (5 x AnimConfusionDuck) and Status_Freeze (monbg + splitbgprio + AnimTask_FrozenIceCube).
 * No production module imports this file yet; the landing recipe is in the doc.
 *
 * Rows are relative to the gAnimScriptActive rise (rel 0 = the controller's LaunchStatusAnimation row). Two views per row:
 *  - `statusConditionSourceRow`: RAM / register state at the end of the row (what tools/integration/stp128Probe.py samples);
 *  - `statusConditionDisplayRow`: what the screen of that row shows (the frame-order lags below applied).
 * Callbacks are literal ports of battle_anim_ghost.c:1127-1174 (AnimGhostStatusSprite / _Step) and battle_anim_normal.c:258-296
 * (AnimConfusionDuck / _Step); ShakeMon2 reuses ./shakeMon2.ts.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type StatusConditionAnimation = "CURSED" | "NIGHTMARE" | "CONFUSION";
export type StatusConditionSide = "player" | "opponent";

/** The animated battler (gBattleAnimAttacker == gBattleAnimTarget == the status battler). */
export interface StatusConditionTarget {
  readonly side: StatusConditionSide;
  /** gSprites[gBattlerSpriteIds[battler]].x / y (the battler sprite's center; production corner + 32 + elevation). */
  readonly spriteX: number;
  readonly spriteY: number;
  /** GetBattlerSpriteCoord(battler, BATTLER_COORD_X_2 / BATTLER_COORD_Y_PIC_OFFSET): the createsprite origin. */
  readonly animX: number;
  readonly animY: number;
  /** The battler sprite's x2 before the animation (e.g. a front sprite's idle offset); ShakeMon2 leaves 0 behind. */
  readonly idleX2?: number;
}

export interface StatusConditionSprite {
  readonly template: "gCurseGhostSpriteTemplate" | "gNightmareDevilSpriteTemplate" | "gConfusionDuckSpriteTemplate";
  /** Creation order inside the script (the lowest-free slot rule assigns the real slot). */
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  readonly priority: number;
  readonly subpriority: number;
  readonly animNum: number;
  readonly animCmdIndex: number;
  /** Tile offset of the shown frame inside the sheet (16x16 duck: 0 / 4 / 8; ghost / devil: 0). */
  readonly tileOffset: number;
  readonly hFlip: boolean;
  /** OAM objMode blend (semi-transparent OBJ: BLDCNT's blend applies with this sprite as the first target). */
  readonly blend: boolean;
  readonly size: 16 | 32;
  readonly data: readonly number[];
}

export interface StatusConditionSourceRow {
  readonly rel: number;
  /** gAnimScriptActive. */
  readonly active: boolean;
  /** gBattleControllerExecFlags != 0 (the controller is held until the trailing row). */
  readonly controllerBusy: boolean;
  /** The battler sprite's x2 / y2 (AnimTask_ShakeMon2). */
  readonly battlerX2: number;
  readonly battlerY2: number;
  /** monbg moved the battler to a BG layer (its sprite is invisible). */
  readonly battlerInvisible: boolean;
  /** gBattle_BG1_X / Y, gBattle_BG2_X / Y RAM shadows. */
  readonly bg: readonly [number, number, number, number];
  readonly sprites: readonly StatusConditionSprite[];
  readonly bldcnt: number;
  readonly bldalpha: number;
}

export interface StatusConditionDisplaySprite {
  readonly template: StatusConditionSprite["template"];
  readonly index: number;
  /** OAM top-left on screen (x + x2 + centerToCornerVec). */
  readonly left: number;
  readonly top: number;
  readonly size: 16 | 32;
  readonly tileOffset: number;
  readonly hFlip: boolean;
  readonly priority: number;
  readonly subpriority: number;
  /** BLDALPHA coefficients when the sprite is a blended OBJ, else null (opaque). */
  readonly blend: Readonly<{ eva: number; evb: number }> | null;
}

export interface StatusConditionDisplayRow {
  readonly rel: number;
  /** The animated battler's visible offset (the monbg copy follows the sprite's x2 / y2 one row late). */
  readonly battlerOffset: Readonly<{ x: number; y: number }>;
  /** True while the battler is drawn from the monbg copy (pixel-identical to the sprite at offset 0). */
  readonly battlerOnBg: boolean;
  /** Back-to-front draw order: priority descending, then subpriority descending, then slot (creation) order descending. */
  readonly sprites: readonly StatusConditionDisplaySprite[];
  /** An elevated opponent's shadow is hidden while any battle animation runs (stat102: rel 1 .. E + 1). */
  readonly enemyShadowHidden: boolean;
}

export interface StatusConditionSpan {
  /** gAnimScriptActive rows 0 .. activeRows - 1; E = activeRows is the first inactive row. */
  readonly activeRows: number;
  /** = activeRows + 1: the controller releases on E + 1 (the hold of the next battle-script instruction). */
  readonly controllerRows: number;
  /** The script's createsprite row(s). */
  readonly createRow: number;
}

/**
 * The target geometry from the battler sprite alone: GetBattlerSpriteCoord(X_2) == sprite x and (Y_PIC_OFFSET) == sprite y + 8 on the
 * player side, the sprite y on the opponent side (every stp128 ROM window: Onix / Golbat / Shuckle, elevated or not). The sprite x / y
 * are production's battleCommandFieldSpriteOrigin (elevation included) + 32.
 */
export function statusConditionTarget(side: StatusConditionSide, spriteX: number, spriteY: number, idleX2 = 0): StatusConditionTarget {
  return { side, spriteX, spriteY, animX: spriteX, animY: spriteY + (side === "player" ? 8 : 0), idleX2 };
}

// ---- frame-order anchors (each identical in every ROM window; see the doc) --------------------------------------------------------
/** monbg ANIM_DEF_PARTNER: the battler sprite turns invisible and the BG copy is placed on rel 3; clearmonbg restores it. */
const MONBG_ROW = 3;
/** Status_Curse / Status_Nightmare: createsprite + createvisualtask AnimTask_ShakeMon2 run on rel 6 (after loadspritegfx / monbg / SE). */
const GHOST_CREATE_ROW = 6;
/** clearmonbg: the battler sprite is visible again on rel 47 (the frame after the ghost's destroy), the BG shadows return to 0 on 51. */
const GHOST_BATTLER_VISIBLE_ROW = 47;
const GHOST_BG_RESET_ROW = 51;
/** Status_Confusion: the five create_confusion_duck_sprite run on rel 3 (after loadspritegfx + loopsewithpan). */
const DUCK_CREATE_ROW = 3;
/** Sprites created by the script (a task, after BuildOamBuffer) reach OAM one row later and the screen one more row later. */
const SPRITE_DISPLAY_LAG = 1;

export const STATUS_CONDITION_SPANS: Readonly<Record<StatusConditionAnimation, StatusConditionSpan>> = {
  CURSED: { activeRows: 74, controllerRows: 75, createRow: GHOST_CREATE_ROW },
  NIGHTMARE: { activeRows: 74, controllerRows: 75, createRow: GHOST_CREATE_ROW },
  CONFUSION: { activeRows: 99, controllerRows: 100, createRow: DUCK_CREATE_ROW },
};

const sin = (angle: number, amplitude: number): number => (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
const cos = (angle: number, amplitude: number): number => (GBA_SINE_TABLE_256[(angle + 64) & 0xff]! * amplitude) >> 8;
const s16 = (v: number): number => ((v & 0xffff) ^ 0x8000) - 0x8000;
const BLDCNT_EFFECT_BLEND = 0x40;
const BLDCNT_TGT2_ALL = 0x3f00;
/** GetBattlerSpriteSubpriority (battle_anim_mons.c:2035): singles PLAYER_LEFT 30, OPPONENT_LEFT 40. */
const battlerSubpriority = (side: StatusConditionSide): number => (side === "player" ? 30 : 40);
/** Cmd_createsprite: ANIM_TARGET with subpriority argument 2 -> target subpriority - 2. */
const createSubpriority = (side: StatusConditionSide): number => battlerSubpriority(side) - 2;

// ---- AnimGhostStatusSprite (battle_anim_ghost.c:1127) ------------------------------------------------------------------------------
interface GhostCallState { x2: number; y2: number; data: number[]; invisible: boolean; bldcnt: number; bldalpha: number; destroyed: boolean }

/** Sprite state after callback call k (k = 1 is the CreateSpriteAndAnimate call on the create row). */
function ghostAfterCall(k: number, side: StatusConditionSide): GhostCallState {
  const data = [0, 0, 0, 0, 0, 0, 0, 0];
  let x2 = 0, y2 = 0, invisible = false, bldcnt = 0, bldalpha = 0, destroyed = false, step = false;
  for (let call = 1; call <= k; call += 1) {
    if (step) {
      // AnimGhostStatusSprite_Step
      bldcnt = 0;
      bldalpha = 0;
      destroyed = true;
      break;
    }
    x2 = sin(data[0]!, 12);
    if (side !== "player") x2 = -x2;
    data[0] = (data[0]! + 6) & 0xff;
    data[1] = s16(data[1]! + 0x100);
    y2 = -(data[1]! >> 8);
    data[7] = s16(data[7]! + 1);
    if (data[7] === 1) {
      data[6] = 0x050b;
      bldcnt = BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL;
      bldalpha = data[6]!;
    } else if (data[7]! > 30) {
      data[2] = s16(data[2]! + 1);
      let coeffB = (data[6]! & 0xffff) >> 8;
      let coeffA = data[6]! & 0xff;
      if (++coeffB > 16) coeffB = 16;
      coeffA = (coeffA - 1) & 0xffff;
      if (s16(coeffA) < 0) coeffA = 0;
      bldalpha = coeffA | (coeffB << 8);
      data[6] = s16(bldalpha);
      if (coeffB === 16 && coeffA === 0) {
        invisible = true;
        step = true;
      }
    }
  }
  return { x2, y2, data, invisible, bldcnt, bldalpha, destroyed };
}

// ---- AnimConfusionDuck (battle_anim_normal.c:258) ----------------------------------------------------------------------------------
const DUCK_WAVE_OFFSETS = [0, 51, 102, 153, 204] as const;
const DUCK_ARGS = { x: 0, y: -15, wavePeriod: 3, duration: 90 } as const;
/** sAnims_ConfusionDuck: [tile offset, hFlip] per frame, 8 ticks each, then ANIMCMD_JUMP(0). */
const DUCK_ANIMS: readonly (readonly (readonly [number, boolean])[])[] = [
  [[0, false], [4, false], [0, true], [8, false]],
  [[0, true], [4, false], [0, false], [8, false]],
];
const DUCK_FRAME_TICKS = 8;

interface DuckCallState { x2: number; y2: number; priority: number; data: number[]; destroyed: boolean }

function duckAfterCall(k: number, waveOffset: number, side: StatusConditionSide): DuckCallState {
  const data = [0, 0, 0, 0, 0, 0, 0, 0];
  data[0] = waveOffset;
  data[1] = side !== "player" ? -DUCK_ARGS.wavePeriod : DUCK_ARGS.wavePeriod;
  data[4] = side !== "player" ? 1 : 0;
  data[3] = DUCK_ARGS.duration;
  let x2 = 0, y2 = 0, priority = 2, destroyed = false;
  for (let call = 1; call <= k; call += 1) {
    // AnimConfusionDuck_Step (AnimConfusionDuck calls it directly on the create row)
    x2 = cos(data[0]!, 30);
    y2 = sin(data[0]!, 10);
    priority = (data[0]! & 0xffff) < 128 ? 1 : 3;
    data[0] = (data[0]! + data[1]!) & 0xff;
    data[2] = s16(data[2]! + 1);
    if (data[2] === data[3]) {
      destroyed = true;
      break;
    }
  }
  return { x2, y2, priority, data, destroyed };
}

function ghostTemplate(animation: StatusConditionAnimation): StatusConditionSprite["template"] {
  return animation === "CURSED" ? "gCurseGhostSpriteTemplate" : "gNightmareDevilSpriteTemplate";
}

function assertRel(rel: number): void {
  if (!Number.isInteger(rel)) throw new Error(`invalid status-condition row ${rel}`);
}

/** RAM / register state at the end of row `rel` (rel < 0: before the animation). */
export function statusConditionSourceRow(animation: StatusConditionAnimation, rel: number, target: StatusConditionTarget): StatusConditionSourceRow {
  assertRel(rel);
  const span = STATUS_CONDITION_SPANS[animation];
  const active = rel >= 0 && rel < span.activeRows;
  const controllerBusy = rel >= 0 && rel < span.controllerRows;
  const base = { rel, active, controllerBusy };
  if (animation === "CONFUSION") {
    const sprites: StatusConditionSprite[] = [];
    const k = rel - DUCK_CREATE_ROW + 1;
    if (k >= 1) {
      DUCK_WAVE_OFFSETS.forEach((waveOffset, index) => {
        const s = duckAfterCall(k, waveOffset, target.side);
        if (s.destroyed) return;
        const animNum = target.side === "player" ? 1 : 0;
        // the anim starts on the create row; each frame lasts 8 AnimateSprites ticks, the JUMP costs none
        const animCmdIndex = Math.floor((k - 1) / DUCK_FRAME_TICKS) % 4;
        const [tileOffset, hFlip] = DUCK_ANIMS[animNum]![animCmdIndex]!;
        sprites.push({ template: "gConfusionDuckSpriteTemplate", index, x: target.animX + DUCK_ARGS.x, y: target.animY + DUCK_ARGS.y,
          x2: s.x2, y2: s.y2, invisible: false, priority: s.priority, subpriority: createSubpriority(target.side), animNum, animCmdIndex,
          tileOffset, hFlip, blend: false, size: 16, data: s.data });
      });
    }
    return { ...base, battlerX2: target.idleX2 ?? 0, battlerY2: 0, battlerInvisible: false, bg: [0, 0, 0, 0], sprites, bldcnt: 0, bldalpha: 0 };
  }
  // CURSED / NIGHTMARE
  const shake = shakeMon2OffsetAtTick(2, 0, 14, 1, rel - GHOST_CREATE_ROW);
  const battlerInvisible = rel >= MONBG_ROW && rel < GHOST_BATTLER_VISIBLE_ROW;
  let bg: [number, number, number, number] = [0, 0, 0, 0];
  if (rel >= MONBG_ROW && rel < GHOST_BG_RESET_ROW) {
    // Task_UpdateMonBg: BG X = spriteX0 - (x + x2) + bgX, bgX = 32 - spriteX0 (MoveBattlerSpriteToBG); opponent BG1, player BG2
    const x = 32 - target.spriteX - (rel < GHOST_CREATE_ROW ? target.idleX2 ?? 0 : rel < GHOST_BATTLER_VISIBLE_ROW ? shake.x2 : 0);
    const y = 32 - target.spriteY - (rel < GHOST_BATTLER_VISIBLE_ROW ? shake.y2 : 0);
    bg = target.side === "opponent" ? [x, y, 0, 0] : [0, 0, x, y];
  }
  const k = rel - GHOST_CREATE_ROW + 1;
  const sprites: StatusConditionSprite[] = [];
  let bldcnt = 0, bldalpha = 0;
  if (k >= 1) {
    const g = ghostAfterCall(k, target.side);
    // the create-row BLDCNT / BLDALPHA write is buffered to the next VBlank; later writes land on their own row
    if (k >= 2) {
      bldcnt = g.bldcnt;
      bldalpha = g.bldalpha;
    }
    if (!g.destroyed) {
      sprites.push({ template: ghostTemplate(animation), index: 0, x: target.animX, y: target.animY, x2: g.x2, y2: g.y2,
        invisible: g.invisible, priority: 2, subpriority: createSubpriority(target.side), animNum: 0, animCmdIndex: 0, tileOffset: 0,
        hFlip: false, blend: true, size: 32, data: g.data });
    }
  }
  // ShakeMon2 overwrites x2 from its creation row on and leaves 0 behind
  const battlerX2 = rel < GHOST_CREATE_ROW ? target.idleX2 ?? 0 : rel < GHOST_BATTLER_VISIBLE_ROW ? shake.x2 : 0;
  return { ...base, battlerX2, battlerY2: rel < GHOST_BATTLER_VISIBLE_ROW ? shake.y2 : 0,
    battlerInvisible, bg, sprites, bldcnt, bldalpha };
}

/** What the screen of row `rel` shows. */
export function statusConditionDisplayRow(animation: StatusConditionAnimation, rel: number, target: StatusConditionTarget): StatusConditionDisplayRow {
  assertRel(rel);
  const span = STATUS_CONDITION_SPANS[animation];
  // BG scroll shadows and OAM are copied in the next VBlank; BLDCNT / BLDALPHA written by a sprite callback land in the same row.
  const prev = statusConditionSourceRow(animation, rel - 1, target);
  const now = statusConditionSourceRow(animation, rel, target);
  const oam = statusConditionSourceRow(animation, rel - SPRITE_DISPLAY_LAG, target);
  const created = rel - SPRITE_DISPLAY_LAG - span.createRow;
  const blendOn = (now.bldcnt & BLDCNT_EFFECT_BLEND) !== 0;
  const sprites = created >= 1
    ? oam.sprites.filter((s) => !s.invisible).map((s) => ({ template: s.template, index: s.index,
      left: s.x + s.x2 - s.size / 2, top: s.y + s.y2 - s.size / 2, size: s.size, tileOffset: s.tileOffset, hFlip: s.hFlip,
      priority: s.priority, subpriority: s.subpriority,
      blend: s.blend && blendOn ? { eva: now.bldalpha & 0x1f, evb: (now.bldalpha >> 8) & 0x1f } : null }))
    : [];
  sprites.sort((a, b) => b.priority - a.priority || b.subpriority - a.subpriority || b.index - a.index);
  return { rel, battlerOffset: { x: prev.battlerX2, y: prev.battlerY2 }, battlerOnBg: prev.battlerInvisible, sprites,
    enemyShadowHidden: rel >= 1 && rel <= span.activeRows + 1 };
}
