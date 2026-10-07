/**
 * Live input builders for the move bodies whose renderer branch decodes a hardware-OAM buffer (prep20). Each builder
 * derives every per-row input from production values only: battler anchors (`liveBattlerAnchors`), the asset palette
 * composite (`composeLivePalettes`), the known-entry allocator/scene constants, the lent activation order and the
 * source animation programs; the OAM rows come from liveMoveOamAssembler.ts. Never a capture row.
 */
import darkBgAsset from "../assets/gen/battle-anim-bg-dark.json" with { type: "json" };
import paletteData from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "./liveBgSnapshotMoves.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import {
  FURY_CUTTER_ROWS, KNOWN_ENTRY_HEALTHBOX_OAM, buildLiveHardwareOam, carryLiveSpriteOrder, KNOWN_ENTRY_HEALTHBOX_SLOTS, PURSUIT_ROWS, RETURN_ROWS, liveFuryCutterHardwareOamRows, livePursuitHardwareOamRows, liveReturnHardwareOamRows, liveReturnLives, liveWillOWispHardwareOamRows,
  type LiveOamScene, type LiveSpriteOrderSort, type OamAttr, type WispProgram,
} from "./liveMoveOamAssembler.ts";

type Side = "player" | "opponent";
type Point = Readonly<{ x: number; y: number }>;
type Rgb = Readonly<{ r: number; g: number; b: number }>;
export interface LiveOamBattlerAnchors {
  readonly picOffsetPoint: Point;
  readonly battlePositionCenter: Point;
  readonly spriteCenter: Point;
  readonly frontIdleRest: Readonly<{ x2: number; y2: number }>;
}

/** The first-body BG register state S0 (liveBgSnapshotMoves.ts; prep16 s0.3). */
const S0_REGISTERS: Readonly<Record<string, number>> = Object.freeze({
  dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b,
  bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0,
  win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0,
});
/** Battler OBJ attr2 (tile | priority 2 | palette bank << 12): player bank 0 tile 0x171, opponent bank 1 tile 0x1d9. */
const BATTLER_ATTR2: Readonly<Record<Side, number>> = Object.freeze({ player: 2417, opponent: 6617 });
const KNOWN_ENTRY_OCCUPIED_SLOTS: readonly number[] = Object.freeze([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const KNOWN_ENTRY_SCENE: LiveOamScene = Object.freeze({
  occupants: KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({
    slot: s.slot, attr: s.attr as unknown as OamAttr, subpriority: s.subpriority, visible: s.slot !== 2,
  })),
  healthbox: { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM },
});
const IDENTITY_MATRICES = Object.freeze(Array.from({ length: 32 }, () => Object.freeze([256, 0, 0, 256] as const)));
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;

/** CreateSprite of the 64x64 battler OBJ at its sprite centre (+ idle rest): attr0 y = centre - 32, attr1 size 3 | x. */
const battlerObject = (side: Side, anchors: LiveOamBattlerAnchors) => {
  const { x, y } = anchors.spriteCenter, { x2, y2 } = anchors.frontIdleRest;
  return Object.freeze({
    slot: side === "player" ? 6 : 8, subpriority: side === "player" ? 30 : 40,
    attr: Object.freeze([(y + y2 - 32) & 0xff, 0xc000 | (x + x2 - 32) & 0x1ff, BATTLER_ATTR2[side]] as [number, number, number]),
  });
};

export interface LiveWillOWispArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  /** The lent full 64-slot activation order (known-entry occupied prefix + the host's free order). */
  readonly activationOrder: readonly number[];
  /** Seam-provided (liveMoveAnimation.ts): sortGbaSpriteOrder, willOWisp.ts programs and the will-o-wisp.json palettes. */
  readonly sort: LiveSpriteOrderSort;
  readonly timeline: (attackerCenter: Point, targetCenter: Point) =>
    Readonly<{ orbEnd: number; fireStart: number; fireEnd: number; cleanup: number }>;
  readonly spritesAt: (state: number, attackerCenter: Point, targetCenter: Point) => readonly WispProgram[];
  readonly orbPalette: readonly Rgb[];
  readonly firePalette: readonly Rgb[];
  /** The host's order lend is not the first body's (later bodies: the attacker idle-rest lift is unproven). */
  readonly laterBody?: boolean;
}
export interface LiveWillOWispInputs {
  readonly attackerCenter: Point;
  readonly targetCenter: Point;
  readonly duration: number;
  /** `animationInputs` of the WILL_O_WISP config at a live age. */
  readonly animationInputsAt: (age: number) => Record<string, unknown>;
}

const wispCache = new Map<string, readonly string[][]>();

/**
 * MOVE_WILL_O_WISP (261) live inputs (prep20 s1.1 + G1). Declines (null) when the target has a non-zero idle rest (and, on later bodies, the attacker)
 * (Task_UpdateMonBg follows the target's x + x2 and AnimTask_ShakeMon2 restores x2 to 0, unproven for a non-zero rest).
 * Rows: hardware OAM from the assembler; palette = composite + ANIM_TAG_WISP_FIRE (slot 7, OBJ bank 23) loaded on row 2,
 * ANIM_TAG_WISP_ORB (slot 8, bank 24) on row 5, and the monbg copy of the target's OBJ palette into BG bank 8 (opponent
 * target) / 9 (player target) on row 7; BG registers = S0 + MoveBattlerSpriteToBG / Task_UpdateMonBg (row 8: cnt
 * 0x5c02 / 0x5e02, scroll 32 - (centre + x2), the shake x2 of AnimTask_ShakeMon2 one row later), splitbgprio_all (BG1
 * priority 1 at the fire start for an opponent target) and Task_ClearMonBg (scroll 0 at fireEnd + 6).
 */
export function liveWillOWispInputs(args: LiveWillOWispArgs): LiveWillOWispInputs | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  // The attacker-side idle rest is proven on first bodies only (RATTATA / ONIX opponent attackers, species audit 5); a later body declines.
  if (args.laterBody && (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0)) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  // AnimWillOWispOrb: InitSpritePosToAnimAttacker(sprite, FALSE) = the attacker's sBattlerCoords X / Y; AnimWillOWispFire
  // re-anchors on the target's X_2 / Y_PIC_OFFSET (corpora + alternates: orb (72, 80) / (176, 40), fire = target pic point).
  const attackerCenter = attacker.battlePositionCenter, targetCenter = target.picOffsetPoint;
  const t = args.timeline(attackerCenter, targetCenter);
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, attackerCenter, targetCenter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let rows = wispCache.get(key);
  if (!rows) {
    rows = liveWillOWispHardwareOamRows({
      attackerSide, attackerCenter, targetCenter, attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE,
      orbTileBase: 537, fireTileBase: 305, orbPaletteSlot: 8, firePaletteSlot: 7,
      occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS, activationOrder: args.activationOrder, sort: args.sort, timeline: t,
      spritesAt: (state) => args.spritesAt(state, attackerCenter, targetCenter),
    });
    if (wispCache.size > 16) wispCache.clear();
    wispCache.set(key, rows);
  }
  const hardwareRows = rows;
  const monbgBank = targetSide === "opponent" ? 8 : 9, targetObjBank = targetSide === "opponent" ? 17 : 16;
  const layer = targetSide === "opponent" ? "bg1" : "bg2";
  const shakeX2 = (state: number) => state >= t.fireStart && state <= t.fireStart + 23
    ? (Math.floor((state - t.fireStart) / 2) % 2 ? 4 : -4) : 0;
  const paletteAt = (age: number): number[] => {
    const out = args.palettes.hardware.slice();
    if (age >= 2) args.firePalette.forEach((c, i) => { out[23 * 16 + i] = bgr555(c); });
    if (age >= 5) args.orbPalette.forEach((c, i) => { out[24 * 16 + i] = bgr555(c); });
    if (age >= 7) for (let i = 0; i < 16; i += 1) out[monbgBank * 16 + i] = out[targetObjBank * 16 + i]!;
    return out;
  };
  const registersAt = (age: number): Record<string, number> => {
    const registers: Record<string, number> = { ...S0_REGISTERS };
    if (age >= 1) { registers.win0h = 0; registers.win0v = 0; }
    if (age >= 8) {
      registers[`${layer}cnt`] = targetSide === "opponent" ? (age >= t.fireStart ? 0x5c01 : 0x5c02) : 0x5e02;
      if (age < t.fireEnd + 6) {
        registers[`${layer}hofs`] = (32 - (target.spriteCenter.x + shakeX2(age - 1))) & 0x1ff;
        registers[`${layer}vofs`] = (32 - target.spriteCenter.y) & 0x1ff;
      }
    }
    return registers;
  };
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    attackerCenter, targetCenter, duration: t.cleanup + 1,
    animationInputsAt: (age: number) => {
      const palette = paletteAt(age);
      return {
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        // Not consumed by the renderer branch (the reducer passes them through).
        taskSlots: { updateMonBg: 1, clearMonBg: 1, panning: 0, shake: 2 }, liveTasks: [],
        buffers: { softwareOam: [], hardwareOam: hardwareRows[Math.min(age, hardwareRows.length - 1)]!,
          softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: IDENTITY_MATRICES },
        palette: { unfaded: palette, faded: palette, hardware: palette },
        registers: registersAt(age),
        background: { battleVram: null, currentVram: null, monbgPaletteBank: monbgBank },
        resources: { orbTileBase: 537, fireTileBase: 305, orbPaletteBank: 24, firePaletteBank: 23,
          orbLoaded: age >= 5, fireLoaded: age >= 2, allocator: null },
        spriteOrder: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LivePursuitArgs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  /** gAnimMovePower (AnimTask_ShakeTargetBasedOnMovePowerOrDmg amplitude). */
  readonly movePower: number;
  /** Seam-provided: sortGbaSpriteOrder and pursuit.ts pursuitTargetOffsetAtAge (the reducer's own shake). */
  readonly sort: LiveSpriteOrderSort;
  readonly targetOffsetAt: (age: number, movePower: number) => Point;
}
export interface LivePursuitInputs {
  readonly impactCenter: Point;
  readonly duration: number;
  readonly animationInputsAt: (age: number) => Record<string, unknown>;
}

const pursuitCache = new Map<string, ReturnType<typeof livePursuitHardwareOamRows>>();
const resourceWords = (name: string): readonly number[] =>
  (paletteData.resources as Record<string, { colors: readonly number[] }>)[name]!.colors;
/**
 * Move_PURSUIT fadetobg BG_DARK / restorebg (Task_FadeToBg: BLDCNT 0xe8 darken, BLDY 0 -> 16, BG swap, 16 -> 0): rows 8..43
 * (peak held 25..27) and 64..100 (peak held 81..84), measured identical in both accepted orientations and the alternates.
 */
const pursuitBldy = (age: number): { bldcnt: number; bldy: number } => {
  if (age >= 8 && age <= 43) return { bldcnt: 0xe8, bldy: age <= 24 ? age - 8 : age <= 27 ? 16 : 43 - age };
  if (age >= 64 && age <= 100) return { bldcnt: 0xe8, bldy: age <= 80 ? age - 64 : age <= 84 ? 16 : 100 - age };
  return { bldcnt: 0, bldy: 0 };
};

/**
 * MOVE_PURSUIT (228) normal body live inputs (prep20 s1.2): hardware OAM + matrices from the assembler (IMPACT slot 3 /
 * matrix 0 / tile 305 / palette slot 7 = the known-entry lowest-free allocation), the target impact centre = target X_2 /
 * Y_PIC_OFFSET; palette = composite + ANIM_TAG_IMPACT (OBJ bank 23) from row 2, the monbg copy of the target's OBJ bank
 * into BG bank 8 / 9 from row 4, the BG_DARK bank-2 palette on rows 27..83; registers = S0 + MoveBattlerSpriteToBG /
 * Task_UpdateMonBg (row 5: cnt, scroll 32 - (centre + shake x2 one row later); cleared on row 63), the BLDY ramps of
 * fadetobg / restorebg and the hit-splat blend (bldcnt 0x3f40, bldalpha 0x080c on rows 47..58). Declines on a non-zero
 * idle rest (the shake restores x2 to 0).
 */
export function livePursuitInputs(args: LivePursuitArgs): LivePursuitInputs | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const impactCenter = target.picOffsetPoint;
  const key = JSON.stringify([attackerSide, impactCenter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let built = pursuitCache.get(key);
  if (!built) {
    built = livePursuitHardwareOamRows({ attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE, impactCenter,
      impactSlot: 3, impactMatrixNum: 0, impactTileBase: 305, impactPaletteSlot: 7, impactScale: 372, activationOrder: args.activationOrder,
      sort: args.sort });
    if (pursuitCache.size > 16) pursuitCache.clear();
    pursuitCache.set(key, built);
  }
  const rows = built;
  const monbgBank = targetSide === "opponent" ? 8 : 9, targetObjBank = targetSide === "opponent" ? 17 : 16;
  const layer = targetSide === "opponent" ? "bg1" : "bg2";
  const darkBank2 = (darkBgAsset as unknown as { paletteBank2Bgr555: number[] }).paletteBank2Bgr555;
  const impactPalette = resourceWords("ANIM_TAG_IMPACT");
  const paletteAt = (age: number): number[] => {
    const out = args.palettes.hardware.slice();
    if (age >= 2) impactPalette.forEach((word, i) => { out[23 * 16 + i] = word; });
    if (age >= 4) for (let i = 0; i < 16; i += 1) out[monbgBank * 16 + i] = out[targetObjBank * 16 + i]!;
    if (age >= 27 && age < 84) darkBank2.forEach((word, i) => { out[2 * 16 + i] = word; });
    return out;
  };
  const registersAt = (age: number): Record<string, number> => {
    const registers: Record<string, number> = { ...S0_REGISTERS, ...pursuitBldy(age) };
    if (age >= 1) { registers.win0h = 0; registers.win0v = 0; }
    if (age >= 47 && age <= 58) { registers.bldcnt = 0x3f40; registers.bldalpha = 0x080c; }
    if (age >= 5) {
      registers[`${layer}cnt`] = targetSide === "opponent" ? 0x5c02 : 0x5e02;
      if (age < 63) {
        const shake = args.targetOffsetAt(age - 1, args.movePower);
        registers[`${layer}hofs`] = (32 - (target.spriteCenter.x + shake.x)) & 0x1ff;
        registers[`${layer}vofs`] = (32 - (target.spriteCenter.y + shake.y)) & 0x1ff;
      }
    }
    return registers;
  };
  const unconsumedOam = Object.freeze(Array<null>(128).fill(null));
  return {
    impactCenter, duration: PURSUIT_ROWS,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, rows.oam.length - 1), palette = paletteAt(age);
      return {
        branch: "normal",
        attackerSpriteSlot: attackerObject.slot, targetSpriteSlot: targetObject.slot,
        attackerAttr2: attackerObject.attr[2], targetAttr2: targetObject.attr[2],
        targetInitialOffset: { x: 0, y: 0 },
        // Task slots only label the reducer's task records (not drawn).
        taskSlots: { fadeToDark: 2, monbg: 1, shake: 3, clearMonbg: 1, restoreBattle: 2 },
        impact: { slot: 3, matrixSlot: 0, attr: [0, 0, 0], subpriority: attackerObject.subpriority - 3, paletteSlot: 7, tileSlot: 6,
          allocator: { tileRanges: Object.assign([], { 6: [305, 16] }) } },
        monbg: { layer, spriteX: target.spriteCenter.x, spriteY: target.spriteCenter.y,
          bgX: 32 - target.spriteCenter.x, bgY: 32 - target.spriteCenter.y, inBg2: targetSide === "player", battlerId: targetSide === "player" ? 0 : 1 },
        spriteOrder: args.activationOrder,
        buffers: { softwareOam: unconsumedOam, hardwareOam: rows.oam[row]!, softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: rows.matrices[row]! },
        palette: { unfaded: palette, faded: palette, hardware: palette },
        registers: registersAt(age),
        background: { currentVram: null, battleVram: null, darkVram: null },
        sharedTaskData: { fadeToDark: Array(16).fill(0), restoreBattle: Array(16).fill(0) },
        audio: { current: null, targetPan: 0 },
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 },
        movePower: args.movePower, moveDamage: 0, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveFuryCutterArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  /** gDisableStructs[attacker].furyCutterCounter after Cmd_furycuttercalc (only 1 is provided: the first body). */
  readonly counter: 1;
  readonly sort: LiveSpriteOrderSort;
}
const furyCache = new Map<string, readonly string[][]>();

/**
 * MOVE_FURY_CUTTER (210) counter-1 body live inputs (prep20 s1.3): the right-hit slice (counter & 1), no complex palette
 * blend (counter 1 takes FuryCutterContinue2 directly). Palette = composite + ANIM_TAG_CUT (OBJ bank 23) from row 2 and the
 * monbg copy into BG bank 8 / 9 from row 4; registers = S0 + monbg (row 5: cnt, scroll 32 - centre; cleared on row 37),
 * setalpha 12, 8 (rows 7..32) and AnimTask_ShakeMon(ANIM_TARGET, 0, 3, 10, 1) on the monbg y (+3 on rows 17..30 in
 * 2-row phases, measured identical in both accepted orientations and the SCYTHER -> GOLEM alternates).
 */
export function liveFuryCutterInputs(args: LiveFuryCutterArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, args.counter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let rows = furyCache.get(key);
  if (!rows) {
    rows = liveFuryCutterHardwareOamRows({ attacker: attackerObject, target: targetObject, targetSide, scene: KNOWN_ENTRY_SCENE,
      rightHit: (args.counter & 1) === 1, sliceSlot: 3, cutTileBase: 305, cutPaletteSlot: 7, activationOrder: args.activationOrder,
      sort: args.sort });
    if (furyCache.size > 16) furyCache.clear();
    furyCache.set(key, rows);
  }
  const hardwareRows = rows;
  const monbgBank = targetSide === "opponent" ? 8 : 9, targetObjBank = targetSide === "opponent" ? 17 : 16;
  const layer = targetSide === "opponent" ? "bg1" : "bg2";
  const cutPalette = resourceWords("ANIM_TAG_CUT");
  const paletteAt = (age: number): number[] => {
    const out = args.palettes.hardware.slice();
    if (age >= 2) cutPalette.forEach((word, i) => { out[23 * 16 + i] = word; });
    if (age >= 4) for (let i = 0; i < 16; i += 1) out[monbgBank * 16 + i] = out[targetObjBank * 16 + i]!;
    return out;
  };
  const registersAt = (age: number): Record<string, number> => {
    const registers: Record<string, number> = { ...S0_REGISTERS };
    if (age >= 1) { registers.win0h = 0; registers.win0v = 0; }
    if (age >= 7 && age <= 32) { registers.bldcnt = 0x3f40; registers.bldalpha = 0x080c; }
    if (age >= 5) {
      registers[`${layer}cnt`] = targetSide === "opponent" ? 0x5c02 : 0x5e02;
      if (age < 37) {
        const shakeY = age >= 17 && age <= 30 && Math.floor((age - 17) / 2) % 2 === 0 ? 3 : 0;
        registers[`${layer}hofs`] = (32 - target.spriteCenter.x) & 0x1ff;
        registers[`${layer}vofs`] = (32 - (target.spriteCenter.y + shakeY)) & 0x1ff;
      }
    }
    return registers;
  };
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: FURY_CUTTER_ROWS,
    animationInputsAt: (age: number) => {
      const palette = paletteAt(age);
      return {
        counter: args.counter,
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        // Not consumed by the renderer branch (the reducer passes them through).
        ownedSprites: [], liveTasks: [],
        buffers: { softwareOam: [], hardwareOam: hardwareRows[Math.min(age, hardwareRows.length - 1)]!,
          softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: IDENTITY_MATRICES },
        palette: { unfaded: palette, faded: palette, hardware: palette },
        registers: registersAt(age),
        resources: { cutTileBase: 305, cutLoaded: age >= 2, allocator: null },
        order: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

/** Seam-provided curseModel.ts programs (src/animation/curseModel.ts; liveMoveAnimation.ts passes them in). */
export interface LiveCurseStatsModel {
  readonly rows: number;
  readonly tasksAt: (row: number, side: Side, attackerSpriteId: number, copySpriteId: number) =>
    readonly Readonly<{ slot: number; callback: string; data: readonly number[] }>[];
  readonly registersAt: (row: number, activation: Readonly<Record<string, number>>, body: Readonly<Record<string, number>>,
    attackerSprite: Point) => Record<string, number>;
  readonly battleBgAt: (row: number, attackerSprite: Point) => Record<string, number>;
  readonly paletteAt: (row: number, activation: readonly number[], attackerObjBank: number) => number[];
  readonly spritesAt: (state: number, side: Side) => Readonly<{ attackerX2: number; copy: boolean }>;
}
export interface LiveCurseStatsArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  /** The lent full 64-slot activation order and its free slots (CreateInvisibleSpriteCopy takes the lowest free slot). */
  readonly activationOrder: readonly number[];
  readonly free: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly model: LiveCurseStatsModel;
}
export interface LiveCurseStatsInputs {
  readonly duration: number;
  /** `animationInputs` of the CURSE config at a live age (branch "stats"). */
  readonly animationInputsAt: (age: number) => Record<string, unknown>;
}
const curseStatsCache = new Map<string, readonly string[][]>();

/**
 * MOVE_CURSE (174) non-Ghost ("CurseStats") live inputs (docs/next-adapters-prep23.md s1.3 / s3). The display plan decodes the
 * hardware OAM built here: the scene occupants, the attacker swaying by the SwayMon x2 (two rows behind its sprite), the static
 * target and the OBJ-window copy of the attacker (attr0 | OBJ-window mode, priority 0, the attacker's tiles; lowest-free slot)
 * keyed into the lent order carried through the body. Registers = S0 (row 0) / S0 with WIN0 cleared (rows >= 1) plus the
 * DrawFallingWhiteLines writes; palette = the assets-only composite + the Curse lines colour + the attacker bank's red blend.
 * The renderer reads no activation BG register the body does not overwrite. Declines (null) on a non-zero idle rest (SwayMon
 * writes x2 absolutely and ends at 0: a resting battler's history is unproven).
 */
export function liveCurseStatsInputs(args: LiveCurseStatsArgs): LiveCurseStatsInputs | null {
  const { attackerSide, attacker, target, model } = args;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0
    || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  if (args.free.length === 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const copySlot = Math.min(...args.free);
  const a = attackerObject.attr;
  const copyAttr: OamAttr = [a[0] | 0x800, a[1], a[2] & ~0xc00];
  const key = JSON.stringify([attackerSide, attackerObject.attr, targetObject.attr, copySlot, args.activationOrder]);
  let rows = curseStatsCache.get(key);
  if (!rows) {
    const spritesAt = (state: number) => {
      const out = KNOWN_ENTRY_SCENE.occupants.map((o) => ({ ...o, oamY: o.attr[0] & 0xff }));
      const s = model.spritesAt(state, attackerSide);
      out.push({ slot: attackerObject.slot, attr: [a[0], a[1] & ~0x1ff | (a[1] + s.attackerX2) & 0x1ff, a[2]],
        subpriority: attackerObject.subpriority, visible: true, oamY: a[0] & 0xff });
      out.push({ slot: targetObject.slot, attr: targetObject.attr, subpriority: targetObject.subpriority, visible: true,
        oamY: targetObject.attr[0] & 0xff });
      if (s.copy) out.push({ slot: copySlot, attr: copyAttr, subpriority: attackerObject.subpriority, visible: true, oamY: a[0] & 0xff });
      return out;
    };
    const built: string[][] = [];
    let order: readonly number[] = args.activationOrder;
    let previous = spritesAt(-1);
    for (let row = 0; row < model.rows; row += 1) {
      built.push(buildLiveHardwareOam(order, previous, KNOWN_ENTRY_SCENE.healthbox));
      previous = spritesAt(row);
      order = carryLiveSpriteOrder(order, previous, args.sort);
    }
    rows = built;
    if (curseStatsCache.size > 16) curseStatsCache.clear();
    curseStatsCache.set(key, rows);
  }
  const hardwareRows = rows;
  const bodyRegisters = { ...S0_REGISTERS, win0h: 0, win0v: 0 };
  const attackerSprite = attacker.spriteCenter, objBank = BATTLER_ATTR2[attackerSide] >> 12;
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: model.rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(Math.max(age, 0), model.rows - 1);
      const palette = model.paletteAt(row, args.palettes.hardware, objBank);
      return {
        branch: "stats",
        attackerArt: art(args.attackerSpecies, attackerObject), defenderArt: art(args.targetSpecies, targetObject),
        // gBattleAnimTarget aliases the attacker in the stats branch (battle_scripts_1.s:1491 copybyte gBattlerTarget).
        animationTargetArt: art(args.attackerSpecies, attackerObject),
        ownedSprites: [], liveTasks: model.tasksAt(row, attackerSide, attackerObject.slot, copySlot),
        buffers: { softwareOam: [], hardwareOam: hardwareRows[row]!, softwareMatrices: IDENTITY_MATRICES,
          hardwareMatrices: IDENTITY_MATRICES, scanlineBuffers: [] },
        palette: { unfaded: palette, faded: palette, hardware: palette }, paletteScanoutTransfer: null,
        registers: model.registersAt(row, S0_REGISTERS, bodyRegisters, attackerSprite),
        battleBg: model.battleBgAt(row, attackerSprite),
        resources: { nailTileBase: 0, ghostTileBase: 0, nailLoaded: false, ghostLoaded: false, allocator: null },
        order: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveReturnArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
}
const returnCache = new Map<string, ReturnType<typeof liveReturnHardwareOamRows>>();
/** AnimTask_ShakeMon(target, x, 0, reps, 1) starts [row, reps, x] of ReturnStrongest (return.ts PROGRAMS.strongest). */
const RETURN_SHAKES = [[67, 8, 6], [101, 8, 6], [120, 8, 6], [142, 8, 6], [157, 8, 6], [172, 8, 6], [187, 8, 6], [202, 8, 6], [217, 24, 8]] as const;
/** The target x2 per row: x2 = x at the shake's creation, then toggled every delay-1 step, 0 when the shake ends. */
function returnTargetX2(rows: number, idleX2: number): number[] {
  const out: number[] = []; let x2 = idleX2;
  const active: { start: number; data: number[] }[] = [];
  for (let f = 0; f < rows; f += 1) {
    for (const [start, reps, x] of RETURN_SHAKES) if (f === start) { x2 = x; active.push({ start, data: [0, reps, 1, 1, x] }); }
    for (const a of [...active]) {
      const d = a.data;
      if (f === a.start) d[3]! -= 1;
      if (d[3] === 0) { x2 = x2 === 0 ? d[4]! : 0; d[3] = d[2]!; if (--d[1]! === 0) { x2 = 0; active.splice(active.indexOf(a), 1); } }
      else if (f !== a.start) d[3]! -= 1;
    }
    out.push(x2);
  }
  return out;
}
const returnBlendY = (r: number): number => {
  const [b1, b2] = [11, 264] as const;
  return r >= b1 + 6 && r < b2 + 2 ? 6 : r >= b1 + 4 && r < b1 + 6 ? 4 : r >= b1 + 2 && r < b1 + 4 ? 2
    : r >= b2 + 6 ? 0 : r >= b2 + 4 ? 2 : r >= b2 + 2 ? 4 : 0;
};
const blendToBlack = (c: number, y: number): number => {
  const ch = (s: number) => { const a = c >> s & 31; return (a + (-a * y >> 4)) & 31; };
  return ch(0) | ch(5) << 5 | ch(10) << 10;
};

/**
 * MOVE_RETURN (216) strongest-branch live inputs (prep24 s2): hardware OAM + matrices from the assembler (the Factory's Return
 * is always friendship 255), palette = composite + ANIM_TAG_IMPACT (OBJ bank 23; unfaded row 1, faded row 2), the BG 2/3
 * darkening of the two gSimplePaletteBlend helpers (rows 11 / 264) and the monbg copy of the target's OBJ bank (row 4);
 * registers = S0 + MoveBattlerSpriteToBG / Task_UpdateMonBg (cnt from row 5, scroll 32 - (centre + x2) one row later, x2 =
 * the AnimTask_ShakeMon programs, cleared on row 280), setalpha 12, 8 (rows 7..276). The monbg BGnCNT write row (4 | 5) is
 * a VBlank frame phase the renderer never reads (the target is drawn on the BG from age 5): 5.
 */
export function liveReturnInputs(args: LiveReturnArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, attacker.frontIdleRest, target.frontIdleRest, target.picOffsetPoint, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let built = returnCache.get(key);
  if (!built) {
    built = liveReturnHardwareOamRows({ attackerSide, attacker: attackerObject, target: targetObject, attackerIdleY2: attacker.frontIdleRest.y2,
      targetIdle: target.frontIdleRest, scene: KNOWN_ENTRY_SCENE, impactCenter: target.picOffsetPoint, impactTileBase: 305, impactPaletteSlot: 7,
      freeMatrices: Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== 1 && i !== 2), occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS,
      activationOrder: args.activationOrder, sort: args.sort });
    if (returnCache.size > 16) returnCache.clear();
    returnCache.set(key, built);
  }
  const rows = built;
  const lives = liveReturnLives(KNOWN_ENTRY_OCCUPIED_SLOTS, Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== 1 && i !== 2));
  const monbgBank = targetSide === "opponent" ? 8 : 9, targetObjBank = targetSide === "opponent" ? 17 : 16;
  const layer = targetSide === "opponent" ? "bg1" : "bg2";
  const impactPalette = resourceWords("ANIM_TAG_IMPACT");
  const x2s = returnTargetX2(RETURN_ROWS, target.frontIdleRest.x2);
  const paletteAt = (age: number): number[] => {
    const out = args.palettes.hardware.slice();
    if (age >= 2) impactPalette.forEach((word, i) => { out[23 * 16 + i] = word; });
    const y = age >= 13 ? returnBlendY(age) : 0;
    if (y) for (const bank of [2, 3]) for (let i = 0; i < 16; i += 1) out[bank * 16 + i] = blendToBlack(args.palettes.hardware[bank * 16 + i]!, y);
    if (age >= 4) for (let i = 0; i < 16; i += 1) out[monbgBank * 16 + i] = out[targetObjBank * 16 + i]!;
    return out;
  };
  const registersAt = (age: number): Record<string, number> => {
    const registers: Record<string, number> = { ...S0_REGISTERS };
    if (age >= 1) { registers.win0h = 0; registers.win0v = 0; }
    if (age >= 5) registers[`${layer}cnt`] = (S0_REGISTERS[`${layer}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (age >= 1 && age - 1 >= 4 && age - 1 < 280) {
      registers[`${layer}hofs`] = (32 - (target.spriteCenter.x + x2s[age - 1]!)) & 0x1ff;
      registers[`${layer}vofs`] = (32 - (target.spriteCenter.y + target.frontIdleRest.y2)) & 0x1ff;
    }
    if (age >= 7 && age < 277) { registers.bldcnt = 16192; registers.bldalpha = 2060; }
    return registers;
  };
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority, matrixNum: 0, matrix: [256, 0, 0, 256] });
  const dips = lives.filter((l) => l.kind === "dip").map((l) => l.slot);
  const splats = lives.filter((l) => l.kind === "splat");
  const traces = lives.filter((l) => l.kind === "trace");
  return {
    duration: RETURN_ROWS,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, rows.oam.length - 1), palette = paletteAt(age);
      return {
        friendship: 255,
        attackerInitialOffset: attacker.frontIdleRest, targetInitialOffset: target.frontIdleRest,
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        // Task / sprite slots only label the reducer's records (the renderer draws the hardware OAM buffer).
        taskSlots: { monbg: 1, clearMonbg: 0, shake: Array(9).fill(0), trace: Array(7).fill(0) },
        motionSlots: { verticalDip: dips, horizontalLunge: 0 },
        impactAllocations: splats.map((l, sourceCreationOrder) => ({ slot: l.slot, matrixNum: l.matrix, attr: [0, 0, 0], subpriority: attackerObject.subpriority - 2, sourceCreationOrder })),
        traceAllocations: traces.map((l, sourceCreationOrder) => ({ slot: l.slot, sourceCreationOrder })),
        spriteOrder: args.activationOrder,
        buffers: { softwareOam: [], hardwareOam: rows.oam[row]!, softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: rows.matrices[row]! },
        palette: { unfaded: palette, faded: palette, hardware: palette },
        registers: registersAt(age),
        background: { current: null, battle: null, sourceScroll: { x: 0, y: 0 }, layer, monbgTaskData: [], clearTaskData: [] },
        // ANIM_TAG_IMPACT (10135): known-entry allocation, tile slot 6 range [305, 16], palette slot 7 = OBJ bank 23.
        resources: { impactTag: 10135, tileSlot: 6, paletteSlot: 7, paletteBank: 23, tileRange: [305, 16], allocator: null },
        audio: { current: null, attackerPan: attackerSide === "player" ? -64 : 63, targetPan: targetSide === "player" ? -64 : 63 },
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}
