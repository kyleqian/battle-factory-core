/**
 * Live input builders for the move bodies whose renderer branch decodes a hardware-OAM buffer (prep20). Each builder
 * derives every per-row input from production values only: battler anchors (`liveBattlerAnchors`), the asset palette
 * composite (`composeLivePalettes`), the known-entry allocator/scene constants, the lent activation order and the
 * source animation programs; the OAM rows come from liveMoveOamAssembler.ts. Never a capture row.
 */
import willOWispAsset from "../animation/assets/will-o-wisp.json" with { type: "json" };
import darkBgAsset from "../assets/gen/battle-anim-bg-dark.json" with { type: "json" };
import paletteData from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import { willOWispTimeline } from "../animation/willOWisp.ts";
import { pursuitTargetOffsetAtAge } from "../animation/pursuit.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "./liveBgSnapshotMoves.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import {
  FURY_CUTTER_ROWS, KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, PURSUIT_ROWS, liveFuryCutterHardwareOamRows, livePursuitHardwareOamRows, liveWillOWispHardwareOamRows,
  type LiveOamScene, type OamAttr,
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
 * MOVE_WILL_O_WISP (261) live inputs (prep20 s1.1 + G1). Declines (null) when a battler has a non-zero idle rest
 * (Task_UpdateMonBg follows the target's x + x2 and AnimTask_ShakeMon2 restores x2 to 0, unproven for a non-zero rest).
 * Rows: hardware OAM from the assembler; palette = composite + ANIM_TAG_WISP_FIRE (slot 7, OBJ bank 23) loaded on row 2,
 * ANIM_TAG_WISP_ORB (slot 8, bank 24) on row 5, and the monbg copy of the target's OBJ palette into BG bank 8 (opponent
 * target) / 9 (player target) on row 7; BG registers = S0 + MoveBattlerSpriteToBG / Task_UpdateMonBg (row 8: cnt
 * 0x5c02 / 0x5e02, scroll 32 - (centre + x2), the shake x2 of AnimTask_ShakeMon2 one row later), splitbgprio_all (BG1
 * priority 1 at the fire start for an opponent target) and Task_ClearMonBg (scroll 0 at fireEnd + 6).
 */
export function liveWillOWispInputs(args: LiveWillOWispArgs): LiveWillOWispInputs | null {
  const { attackerSide, attacker, target } = args;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0
    || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  // AnimWillOWispOrb: InitSpritePosToAnimAttacker(sprite, FALSE) = the attacker's sBattlerCoords X / Y; AnimWillOWispFire
  // re-anchors on the target's X_2 / Y_PIC_OFFSET (corpora + alternates: orb (72, 80) / (176, 40), fire = target pic point).
  const attackerCenter = attacker.battlePositionCenter, targetCenter = target.picOffsetPoint;
  const t = willOWispTimeline(attackerSide, attackerCenter, targetCenter);
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, attackerCenter, targetCenter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let rows = wispCache.get(key);
  if (!rows) {
    rows = liveWillOWispHardwareOamRows({
      attackerSide, attackerCenter, targetCenter, attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE,
      orbTileBase: 537, fireTileBase: 305, orbPaletteSlot: 8, firePaletteSlot: 7,
      occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS, activationOrder: args.activationOrder,
    });
    if (wispCache.size > 16) wispCache.clear();
    wispCache.set(key, rows);
  }
  const hardwareRows = rows;
  const wispPalette = (willOWispAsset as unknown as { fire: { palette: Rgb[] }; orb: { palette: Rgb[] } });
  const monbgBank = targetSide === "opponent" ? 8 : 9, targetObjBank = targetSide === "opponent" ? 17 : 16;
  const layer = targetSide === "opponent" ? "bg1" : "bg2";
  const shakeX2 = (state: number) => state >= t.fireStart && state <= t.fireStart + 23
    ? (Math.floor((state - t.fireStart) / 2) % 2 ? 4 : -4) : 0;
  const paletteAt = (age: number): number[] => {
    const out = args.palettes.hardware.slice();
    if (age >= 2) wispPalette.fire.palette.forEach((c, i) => { out[23 * 16 + i] = bgr555(c); });
    if (age >= 5) wispPalette.orb.palette.forEach((c, i) => { out[24 * 16 + i] = bgr555(c); });
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
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0
    || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const impactCenter = target.picOffsetPoint;
  const key = JSON.stringify([attackerSide, impactCenter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let built = pursuitCache.get(key);
  if (!built) {
    built = livePursuitHardwareOamRows({ attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE, impactCenter,
      impactSlot: 3, impactMatrixNum: 0, impactTileBase: 305, impactPaletteSlot: 7, impactScale: 372, activationOrder: args.activationOrder });
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
        const shake = pursuitTargetOffsetAtAge(age - 1, args.movePower, { x: 0, y: 0 });
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
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0
    || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, args.counter, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let rows = furyCache.get(key);
  if (!rows) {
    rows = liveFuryCutterHardwareOamRows({ attacker: attackerObject, target: targetObject, targetSide, scene: KNOWN_ENTRY_SCENE,
      rightHit: (args.counter & 1) === 1, sliceSlot: 3, cutTileBase: 305, cutPaletteSlot: 7, activationOrder: args.activationOrder });
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
