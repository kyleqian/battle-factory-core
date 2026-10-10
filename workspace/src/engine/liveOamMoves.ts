/**
 * Live input builders for the move bodies whose renderer branch decodes a hardware-OAM buffer (prep20). Each builder
 * derives every per-row input from production values only: battler anchors (`liveBattlerAnchors`), the asset palette
 * composite (`composeLivePalettes`), the known-entry allocator/scene constants, the lent activation order and the
 * source animation programs; the OAM rows come from liveMoveOamAssembler.ts. Never a capture row.
 */
import darkBgAsset from "../assets/gen/battle-anim-bg-dark.json" with { type: "json" };
import psychicBgAsset from "../assets/gen/battle-anim-psychic-bg.json" with { type: "json" };
import ghostBgAsset from "../assets/gen/battle-anim-ghost-bg.json" with { type: "json" };
import enemyElevations from "../data/gen/enemy-mon-elevations.json" with { type: "json" };
import paletteData from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "./liveBgSnapshotMoves.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import {
  FURY_CUTTER_ROWS, KNOWN_ENTRY_HEALTHBOX_OAM, buildLiveHardwareOam, carryLiveSpriteOrder, KNOWN_ENTRY_HEALTHBOX_SLOTS, PURSUIT_ROWS, RETURN_ROWS, liveFuryCutterHardwareOamRows, liveMegahornHardwareOamRows, livePursuitHardwareOamRows, liveReturnHardwareOamRows, liveReturnLives, liveRevengeHardwareOamRows, liveWillOWispHardwareOamRows, livePsywaveHardwareOamRows, livePsywaveRingAttr, liveExtrasensoryCloneStep, liveExtrasensoryHardwareOamRows,
  SKILL_SWAP_ORB, SKILL_SWAP_ORB_PAIRS, liveSkillSwapHardwareOamRows, liveSkillSwapOrbLives, type LiveSkillSwapOrbPosition,
  FLATTER_ROWS, liveFlatterHardwareOamRows, type LiveFlatterBuildSprites,
  type LiveOamScene, type LiveSpriteOrderSort, type OamAttr, type WispProgram,
} from "./liveMoveOamAssembler.ts";
import { liveMegahornBodyRows, liveMegahornRows } from "./liveMegahornInputs.ts";
import { LIVE_REVENGE_ROWS, liveRevengeRows } from "./liveRevengeInputs.ts";
import { livePsywaveRowCount, livePsywaveRows } from "./livePsywaveInputs.ts";
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import { liveExtrasensoryRowCount, liveExtrasensoryRows } from "./liveExtrasensoryInputs.ts";
import { liveSkillSwapBlend, liveSkillSwapPalettes, liveSkillSwapRowCount } from "./liveSkillSwapInputs.ts";
import {
  liveNightmareBattlers, liveNightmareClone, liveNightmareFirstInactive, liveNightmareMonbgBg, liveNightmareMonbgOrigin, liveNightmareOrders,
  liveNightmarePalettes, liveNightmareRegisters, type LiveNightmareKnown, type LiveNightmarePhase, type LiveNightmareSprite,
} from "./liveNightmareInputs.ts";

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
 * The renderer reads no activation BG register the body does not overwrite. Declines (null) on a non-zero ATTACKER idle rest (SwayMon
 * writes x2 absolutely and ends at 0: a resting battler's history is unproven).
 */
export function liveCurseStatsInputs(args: LiveCurseStatsArgs): LiveCurseStatsInputs | null {
  const { attackerSide, attacker, target, model } = args;
  // Only the ATTACKER's idle rest declines (unproven); the target's rest is exact (species audit 6: RATTATA / ONIX targets 176/176, 0 px).
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0) return null;
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

export interface LiveMegahornInputArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** Seam-provided (liveMoveAnimation.ts): mega-horn-horn-hit-2.json and horn-drill.json palettes. */
  readonly hornPalette: readonly Rgb[];
  readonly drillPalette: readonly Rgb[];
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_MEGAHORN): the restorebg fade ends one row late; the monbg BGnCNT write row. */
  readonly endLate: boolean;
  readonly monbgCntRow: 7 | 8;
}
const megahornCache = new Map<string, ReturnType<typeof liveMegahornHardwareOamRows>>();

/**
 * MOVE_MEGAHORN (224) live inputs (prep24 s1.4; D4b faithful timing). Hardware OAM + matrices from the assembler over the lent order
 * (known-entry allocator: ANIM_TAG_HORN_HIT_2 tile 305 / palette slot 7 / matrix 0, ANIM_TAG_IMPACT tile 313 / slot 8 / matrix 3 --
 * matrices 1 and 2 are held at the known entry, as for Return); every other input from the prep24 source model
 * (liveMegahornInputs.ts) with the activation palette = the asset composite and the activation register block = S0. The corpora
 * follow a Tackle (bg1cnt / bg2cnt 0x5c02 / 0x5e02 at activation); the MEGAHORN renderer branch reads only bg3cnt, BG3 / monbg
 * scroll and BLDY, all written by the body, so the activation BGnCNT values are never read. Declines (null) when the attacker has
 * a non-zero idle rest (ShakeMon resets the attacker's x2 absolutely: unproven); the target's rest is modelled (ONIX corpus).
 */
export function liveMegahornInputs(args: LiveMegahornInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const rows = liveMegahornBodyRows(args.endLate);
  const key = JSON.stringify([attackerSide, target.frontIdleRest, target.picOffsetPoint, attackerObject.attr, targetObject.attr, args.activationOrder, rows]);
  let built = megahornCache.get(key);
  if (!built) {
    built = liveMegahornHardwareOamRows({ attackerSide, attacker: attackerObject, target: targetObject, targetIdle: target.frontIdleRest,
      targetPicCenter: target.picOffsetPoint, scene: KNOWN_ENTRY_SCENE, hornTileBase: 305, hornPaletteSlot: 7, hornMatrixNum: 0,
      impactTileBase: 313, impactPaletteSlot: 8, impactMatrixNum: 3, occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS,
      activationOrder: args.activationOrder, sort: args.sort, rows });
    if (megahornCache.size > 16) megahornCache.clear();
    megahornCache.set(key, built);
  }
  const oamRows = built;
  const model = liveMegahornRows({ attackerSide, targetSpriteCenter: target.spriteCenter, targetIdleRest: target.frontIdleRest,
    attackerSlot: attackerObject.slot, targetSlot: targetObject.slot, registers0: S0_REGISTERS, palette0: args.palettes.hardware,
    hornBank: 23, impactBank: 24, hornPalette: args.hornPalette, impactPalette: resourceWords("ANIM_TAG_IMPACT"), drillPalette: args.drillPalette,
    endLate: args.endLate, monbgCntRow: args.monbgCntRow });
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, rows - 1), m = model[row]!;
      const registers = { ...m.registers };
      if (age >= 1) { registers.win0h = 0; registers.win0v = 0; }
      return {
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        liveTasks: m.tasks,
        buffers: { softwareOam: [], hardwareOam: oamRows.oam[row]!, softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: oamRows.matrices[row]! },
        palette: { unfaded: m.unfadedPalette, faded: m.hardwarePalette, hardware: m.hardwarePalette },
        registers,
        background: { battleVram: null, currentVram: null, monbgPaletteBank: targetSide === "opponent" ? 8 : 9 },
        resources: { hornTileBase: 305, impactTileBase: 313, hornPaletteBank: 23, impactPaletteBank: 24,
          hornLoaded: age >= 2, impactLoaded: age >= 5, allocator: null },
        spriteOrder: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveRevengeInputArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** Seam-provided (liveMoveAnimation.ts): revenge-purple-scratch-swipe.json purpleScratch palette. */
  readonly scratchPalette: readonly Rgb[];
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_REVENGE bg-write-row): the monbg BGnCNT write row. */
  readonly monbgCntRow: 4 | 5;
}
const revengeCache = new Map<string, ReturnType<typeof liveRevengeHardwareOamRows>>();

/**
 * MOVE_REVENGE (279) live inputs (prep26 s2 / s4; D4b faithful timing). Hardware OAM + matrices from the assembler over the lent order
 * (known-entry allocator: PURPLE_SCRATCH tile 305, PURPLE_SWIPE 537, IMPACT 305 (reloaded after the scratch is freed), all on palette
 * slot 7 = OBJ bank 23; matrices 1 and 2 held at the known entry); every other input from the prep26 source model (liveRevengeInputs.ts)
 * with the activation palette = the asset composite and the registers = S0 (the accepted bodies are first bodies; after a Tackle the
 * renderer branch reads only registers the body writes: the monbg scroll and the blend). Declines (null) for a non-zero TARGET idle rest
 * (the AnimTask_ShakeMon2 x2 program is proven from a zero rest only: lifted, ONIX / RATTATA targets leave 99,435 / 37,733 px); an
 * attacker rest is exact (species audit 9 gate lift: ONIX / RATTATA opponent attackers 0 px).
 */
export function liveRevengeInputs(args: LiveRevengeInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const key = JSON.stringify([attackerSide, attacker.battlePositionCenter, target.battlePositionCenter, target.picOffsetPoint, attackerObject.attr, targetObject.attr, args.activationOrder]);
  let built = revengeCache.get(key);
  if (!built) {
    built = liveRevengeHardwareOamRows({ attackerSide, attacker: attackerObject, target: targetObject, targetIdle: target.frontIdleRest,
      attackerCoord: attacker.battlePositionCenter, targetCoord: target.battlePositionCenter, targetPic: target.picOffsetPoint, scene: KNOWN_ENTRY_SCENE,
      scratchTileBase: 305, swipeTileBase: 537, impactTileBase: 305, paletteSlot: 7,
      freeMatrices: Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== 1 && i !== 2), occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS,
      activationOrder: args.activationOrder, sort: args.sort, rows: LIVE_REVENGE_ROWS });
    if (revengeCache.size > 16) revengeCache.clear();
    revengeCache.set(key, built);
  }
  const oamRows = built;
  const model = liveRevengeRows({ attackerSide, registers0: S0_REGISTERS, palette0: args.palettes.hardware, targetSlot: targetObject.slot,
    targetSpriteCenter: target.spriteCenter, targetIdleRest: target.frontIdleRest, scratchPalette: args.scratchPalette,
    impactPalette: resourceWords("ANIM_TAG_IMPACT"), bank: 7, monbgCntRow: args.monbgCntRow });
  const selected = targetSide === "opponent" ? "bg1" : "bg2";
  const signed = (v: number) => { const raw = v & 0x1ff; return raw >= 256 ? raw - 512 : raw; };
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: LIVE_REVENGE_ROWS,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, LIVE_REVENGE_ROWS - 1), m = model[row]!;
      return {
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        ownedSprites: [], liveTasks: m.tasks,
        buffers: { softwareOam: [], hardwareOam: oamRows.oam[row]!, softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: oamRows.matrices[row]! },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette },
        registers: m.registers,
        background: { battleVram: null, currentVram: null, monbgPaletteBank: targetSide === "opponent" ? 8 : 9, selected,
          scroll: { x: signed(m.registers[`${selected}hofs`] ?? 0), y: signed(m.registers[`${selected}vofs`] ?? 0) } },
        resources: { scratchTileBase: 305, swipeTileBase: 537, impactTileBase: 305,
          scratchLoaded: age >= 1 && age <= 72, swipeLoaded: age >= 73 && age <= 95, impactLoaded: age >= 96, allocator: null },
        spriteOrder: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LivePsywaveInputArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_PSYWAVE optional-lag-age): the optional late lag at task row 185. */
  readonly lateLag: boolean;
}
/** graphics/battle_anims/sprites/blue_ring.pal (JASC, 16 colours) as BGR555 words (gBattleAnimSpritePal_BlueRing). */
const BLUE_RING_PALETTE: readonly number[] = Object.freeze([18004, 0, 32326, 32640, 32767, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
/** ANIM_TAG_BLUE_RING (10165) at the known entry: tile slot 6 = tiles 305..312, palette slot 7 (OBJ bank 23); first bodies and after a Tackle. */
const PSYWAVE_RING_RESOURCES = Object.freeze({ tag: 10165, tileSlot: 6, paletteSlot: 7, paletteBank: 23, tileRange: [305, 8] as const, allocator: null });
const psywaveCache = new Map<string, ReturnType<typeof livePsywaveHardwareOamRows>>();

/**
 * MOVE_PSYWAVE (149) live inputs (docs/next-adapters-prep30.md s2 / s3; D4c faithful timing). Hardware OAM + matrices + the ring sprite
 * states + the carried painter order from the assembler (known-entry allocator: BLUE_RING tile 305, palette slot 7; matrices 1 and 2 held at the
 * known entry; ring slots lowest-free over the known-entry occupants); palettes / registers / modelled tasks / VRAM label from livePsywaveInputs.ts
 * with the activation palette = the asset composite and the registers = S0 (the renderer branch reads only bldy and the hardware palette, both
 * written by the body). Task slots (fade 0, psy 1, sin timer 0, loop sound 2, blend cycle 3, restore 0) and the loop-sound pans are constants
 * equal in every measured window (K). The BlendColorCycleLoop / LoopSEAdjustPanning task data are not modelled (not rendered; empty).
 */
export function livePsywaveInputs(args: LivePsywaveInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } {
  const { attackerSide, attacker, target } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const rows = livePsywaveRowCount(args.lateLag);
  // InitSpritePosToAnimAttacker: attacker X_2 +-10 (toward the target), Y_PIC_OFFSET + 10; AnimToTargetInSinWave: target X_2 / Y_PIC_OFFSET.
  const origin = { x: attacker.picOffsetPoint.x + (attackerSide === "player" ? 10 : -10), y: attacker.picOffsetPoint.y + 10 };
  const dest = target.picOffsetPoint;
  const key = JSON.stringify([attackerSide, origin, dest, attackerObject.attr, targetObject.attr, args.activationOrder, rows]);
  let built = psywaveCache.get(key);
  if (!built) {
    built = livePsywaveHardwareOamRows({ attacker: attackerObject, target: targetObject, origin, dest, scene: KNOWN_ENTRY_SCENE,
      ringTileBase: PSYWAVE_RING_RESOURCES.tileRange[0], ringPaletteSlot: PSYWAVE_RING_RESOURCES.paletteSlot,
      freeMatrices: Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== 1 && i !== 2), occupiedSlots: KNOWN_ENTRY_OCCUPIED_SLOTS,
      activationOrder: args.activationOrder, sort: args.sort, sine: GBA_SINE_TABLE_256, rows });
    if (psywaveCache.size > 16) psywaveCache.clear();
    psywaveCache.set(key, built);
  }
  const oamRows = built;
  const model = livePsywaveRows({ registers0: S0_REGISTERS, palette0: args.palettes.hardware, faded0: args.palettes.faded, unfaded0: args.palettes.unfaded,
    psychicPalette: (psychicBgAsset as { palette: readonly Rgb[] }).palette.map(bgr555), ringPalette: BLUE_RING_PALETTE,
    ringBank: PSYWAVE_RING_RESOURCES.paletteSlot, targetObjBank: targetObject.attr[2] >>> 12 & 0xf, lateLag: args.lateLag });
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority, matrixNum: 0, matrix: [256, 0, 0, 256] });
  const playerAttacker = attackerSide === "player";
  return {
    duration: rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, rows - 1), m = model[row]!;
      const fade = m.tasks.find((t) => t.callback === "Task_FadeToBg")?.data ?? [];
      return {
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        taskSlots: { fadeToPsychic: 0, psychicBackground: 1, sinTimer: 0, loopSound: 2, paletteCycle: 3, restoreBattle: 0 },
        ringAllocations: oamRows.allocations,
        ringOam: oamRows.rings[row]!.map((s) => ({ slot: s.slot, attr: livePsywaveRingAttr(s, PSYWAVE_RING_RESOURCES.tileRange[0], PSYWAVE_RING_RESOURCES.paletteSlot),
          subpriority: targetObject.subpriority - 3 })),
        spriteOrder: oamRows.orders[row]!,
        buffers: { softwareOam: oamRows.oam[row]!, hardwareOam: oamRows.oam[row]!, softwareMatrices: oamRows.matrices[row]!, hardwareMatrices: oamRows.matrices[row]! },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette },
        targetPaletteBank: 16 + (targetObject.attr[2] >>> 12 & 0xf),
        registers: m.registers,
        background: { currentVram: `vram-${m.vram}`, battleVram: "vram-0", psychicVram: "vram-1" },
        resources: PSYWAVE_RING_RESOURCES,
        sharedTaskData: { fadeToPsychic: fade, paletteCycle: [], restoreBattle: fade },
        // SoundTask_LoopSEAdjustPanning pans (SOUND_PAN_ATTACKER -> SOUND_PAN_TARGET), equal in both accepted orientations (K; not rendered).
        audio: { current: null, attackerPan: playerAttacker ? -64 : 63, targetPan: playerAttacker ? 63 : -63 },
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveExtrasensoryInputArgs {
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  /** 64 - 2 * the attacker picture's y_offset (SetBattlerSpriteYOffsetFromOtherYScale). */
  readonly attackerPictureHeight: number;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_EXTRASENSORY optional-lag-age): the optional lag at task row 142. */
  readonly lateLag: boolean;
}
/**
 * First-body scanline entry S0 (the battle intro's residue; prep18 s1.1 / prep30 s0.2 H: bank 0 = 80 x +2, 80 x -2, then zeros; bank 1 zero;
 * srcBuffer 1, state 0; equal in every measured scenario; the same constant as the Dig / Rapid Spin first bodies).
 */
export const FIRST_BODY_SCANLINE = Object.freeze({ state: 0, srcBuffer: 1, dmaDest: 67108892,
  buffers: Object.freeze([Object.freeze([...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)]), Object.freeze(Array(320).fill(0))]) });
const extrasensoryCache = new Map<string, ReturnType<typeof liveExtrasensoryHardwareOamRows>>();

/**
 * MOVE_EXTRASENSORY (326) live inputs (docs/next-adapters-prep30.md s1 / s3; D4c faithful timing). Hardware OAM + matrices + the carried painter
 * order from the assembler (clone slot 3 / matrix 0 = lowest free at the known entry); palettes / registers / tasks / scanline / VRAM label / clone
 * y2 from liveExtrasensoryInputs.ts with the activation palette = the asset composite, the registers = S0 and the FIRST-BODY scanline entry
 * buffers (history: the caller gates the body on the battle's first animation unit). The distortion window is GetBattlerYCoordWithElevation(target)
 * -+ 32 (the reducer's targetYElevation input). Task slots (fade 0, psy 1, blend 0, distortion 3, clone 0, monbg 2, clear 0, restore 3) are K.
 * Declines (null) for a non-zero target idle rest (the reducer's base HOFS is 32 - the target X).
 */
export function liveExtrasensoryInputs(args: LiveExtrasensoryInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const rows = liveExtrasensoryRowCount(args.lateLag), cloneSlot = 3, cloneMatrix = 0;
  const elevation = targetSide === "opponent" ? (enemyElevations as Readonly<Record<string, number>>)[args.targetSpecies] ?? 0 : 0;
  const targetYElevation = targetSide === "opponent" ? 40 - elevation : 80;
  // CloneBattlerSpriteWithBlend copies the whole attacker sprite struct, so the clone carries the attacker's idle x2 / y2 rest.
  const attackerPosition = { x: attacker.spriteCenter.x + attacker.frontIdleRest.x2, y: attacker.spriteCenter.y + attacker.frontIdleRest.y2 };
  const key = JSON.stringify([attackerSide, attackerPosition, args.attackerPictureHeight, attackerObject.attr, targetObject.attr, args.activationOrder, rows]);
  let built = extrasensoryCache.get(key);
  if (!built) {
    built = liveExtrasensoryHardwareOamRows({ attacker: attackerObject, target: targetObject, attackerPosition,
      attackerPictureHeight: args.attackerPictureHeight, scene: KNOWN_ENTRY_SCENE, cloneSlot, cloneMatrix,
      activationOrder: args.activationOrder, sort: args.sort, sine: GBA_SINE_TABLE_256, rows });
    if (extrasensoryCache.size > 16) extrasensoryCache.clear();
    extrasensoryCache.set(key, built);
  }
  const oamRows = built;
  const model = liveExtrasensoryRows({ side: attackerSide, registers0: S0_REGISTERS, palette0: args.palettes.hardware, faded0: args.palettes.faded,
    unfaded0: args.palettes.unfaded, psychicPalette: (psychicBgAsset as { palette: readonly Rgb[] }).palette.map(bgr555),
    attackerSlot: attackerObject.slot, attackerObjBank: attackerObject.attr[2] >>> 12 & 0xf,
    target: { slot: targetObject.slot, x: target.spriteCenter.x, y: target.spriteCenter.y, x2: 0, y2: 0, objBank: targetObject.attr[2] >>> 12 & 0xf },
    targetBattler: targetSide === "player" ? 0 : 1, cloneSlot, cloneMatrix,
    cloneStep: (j) => liveExtrasensoryCloneStep(j, args.attackerPictureHeight, GBA_SINE_TABLE_256),
    targetYElevation, scanline0: FIRST_BODY_SCANLINE, lateLag: args.lateLag, sine: GBA_SINE_TABLE_256 });
  const art = (species: string, object: ReturnType<typeof battlerObject>) =>
    ({ displaySpecies: species, slot: object.slot, attr: object.attr, subpriority: object.subpriority });
  return {
    duration: rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, rows - 1), m = model[row]!;
      return {
        attackerArt: art(args.attackerSpecies, attackerObject), targetArt: art(args.targetSpecies, targetObject),
        taskSlots: { fadeToPsychic: 0, psychicBackground: 1, blend: 0, distortion: 3, clone: 0, updateMonBg: 2, clearMonBg: 0, restoreBattle: 3 },
        sharedTaskData: Object.fromEntries(m.tasks.filter((t) => !t.callback.startsWith("AnimTask_")).map((t) => [t.callback, t.data])),
        clone: { slot: cloneSlot, matrixNum: cloneMatrix, attr: attackerObject.attr, subpriority: attackerObject.subpriority + 1,
          x: attacker.spriteCenter.x, y: attacker.spriteCenter.y, x2: m.clone?.x2 ?? 0, y2: m.clone?.y2 ?? 0 },
        spriteOrder: oamRows.orders[row]!,
        buffers: { softwareOam: oamRows.oam[row]!, hardwareOam: oamRows.oam[row]!, softwareMatrices: oamRows.matrices[row]!, hardwareMatrices: oamRows.matrices[row]! },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette },
        registers: m.registers,
        background: { currentVram: `vram-${m.vram}`, battleVram: "vram-0", psychicVram: "vram-1", monbgPaletteBank: targetSide === "opponent" ? 8 : 9 },
        scanline: m.scanline,
        targetYElevation,
        allocator: null, audio: null, liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveNightmareInputArgs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  /** Species numbers (battler sprite data[2]; carried, never rendered). */
  readonly attackerSpeciesId: number;
  readonly targetSpeciesId: number;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_NIGHTMARE): the optional lag at age 149 and the BG-palette restore row (148 | 149). */
  readonly phase: LiveNightmarePhase;
}
/** The first-body register block S0 with WIN0 cleared: Nightmare always follows an earlier body (its target is asleep), whose window
 *  registers end at 0,0 (prep25 s B.5; equal in all 8 prep32 windows). */
const NIGHTMARE_REGISTERS0: Readonly<Record<string, number>> = Object.freeze({ ...S0_REGISTERS, win0h: 0, win0v: 0 });
/** SpriteCallbackDummy (pokeemerald.sym 0x08007429; equal in all 8 prep32 windows): stored in the clone's data[6..7], never rendered. */
const SPRITE_CALLBACK_DUMMY = 0x08007429;
/** The known-entry matrix bitmap (matrices 1, 2 held by the battlers) and resource label: carried by the reducer, never read. */
const NIGHTMARE_MATRIX_BITMAP = 6;
const nightmareCache = new Map<string, number[][]>();

/**
 * MOVE_NIGHTMARE (171) live inputs (docs/next-adapters-prep32.md s1 / s3; D4 faithful timing): the reducer's caller-owned inputs of each age
 * from liveNightmareInputs.ts (the prep32 model), ported 1:1 from tools/integration/prep32NightmareLib.ts liveInputs. Host values: battler
 * sprites from the anchors (slot 6 / 8, subpriority 30 / 40, the battler OBJ words; idle rests zero, gated by the caller), the known-entry
 * host sprites and occupied slots (the clone takes slot 3), the asset palette composite, the ghost BG asset palette, the lent activation
 * order. Task slots (fade 0, clone 0, shake 2, restore 2, monbg update 1 / clear 0) are constants equal in all 8 windows (K). The battler
 * data words beyond the battler id / species are history residue (not rendered) and start at zero here.
 */
export function liveNightmareInputs(args: LiveNightmareInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } {
  const { attackerSide, phase } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const sprite = (side: Side, anchors: LiveOamBattlerAnchors, species: number): LiveNightmareSprite => {
    const o = battlerObject(side, anchors);
    return { slot: o.slot, template: "gMultiuseSpriteTemplate", callback: "SpriteCallbackDummy", x: anchors.spriteCenter.x, y: anchors.spriteCenter.y,
      x2: anchors.frontIdleRest.x2, y2: anchors.frontIdleRest.y2, subpriority: o.subpriority, attr: o.attr, flags: 1, matrixNum: 0,
      matrix: [256, 0, 0, 256], data: [side === "player" ? 0 : 1, 0, species, 0, 0, 0, 0, 0] };
  };
  const k: LiveNightmareKnown = {
    attackerSide, registers0: NIGHTMARE_REGISTERS0,
    unfaded0: args.palettes.unfaded, faded0: args.palettes.faded, hardware0: args.palettes.hardware,
    attacker0: sprite(attackerSide, args.attacker, args.attackerSpeciesId), target0: sprite(targetSide, args.target, args.targetSpeciesId),
    order0: args.activationOrder,
    hostSprites: KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as unknown as [number, number, number], subpriority: s.subpriority })),
    inUse0: KNOWN_ENTRY_OCCUPIED_SLOTS,
    ghostPalette: (ghostBgAsset as { palette: readonly Rgb[] }).palette.map(bgr555),
    battlerMatrix: { attacker: attackerSide === "player" ? 1 : 2, target: attackerSide === "player" ? 2 : 1 },
    spriteCallbackDummy: SPRITE_CALLBACK_DUMMY,
  };
  const rows = liveNightmareFirstInactive(phase) + 1;
  const key = JSON.stringify([attackerSide, k.attacker0.attr, k.target0.attr, args.activationOrder, phase]);
  let orders = nightmareCache.get(key);
  if (!orders) {
    orders = liveNightmareOrders(rows, k, phase, args.sort);
    if (nightmareCache.size > 16) nightmareCache.clear();
    nightmareCache.set(key, orders);
  }
  const painter = orders;
  const clone = liveNightmareClone(k), origin = liveNightmareMonbgOrigin(k), bg = liveNightmareMonbgBg(k);
  const setupControl = liveNightmareRegisters(liveNightmareFirstInactive(phase) - 1, k, phase)[`${bg}cnt`]!;
  return {
    duration: rows - 1,
    // `age` is the reducer (program) age; a no-lag body skips program age 149 (liveNightmareProgramAge).
    animationInputsAt: (age: number) => {
      const row = Math.min(!phase.lag149 && age >= 150 ? age - 1 : age, rows - 1);
      const b = liveNightmareBattlers(row, k, phase);
      return {
        attackerSprite: b.attacker, targetSprite: b.target, clone,
        tasks: { fadeToGhost: 0, clone: 0, shake: 2, fadeRestore: 2 },
        monBg: { updateTaskSlot: 1, clearTaskSlot: 0, selected: bg === "bg1" ? "BG1" : "BG2", backgroundOrigin: origin,
          inBg2: bg === "bg1" ? 0 : 1, battler: attackerSide === "player" ? 1 : 0, setupControl },
        painterOrder: painter[row]!, resources: "known-entry", matrixBitmap: NIGHTMARE_MATRIX_BITMAP, matrices: IDENTITY_MATRICES,
        palettes: liveNightmarePalettes(row, k, phase),
        backgrounds: { battle: "battle", ghost: "ghost", monBg: "monbg", clear: "clear", clearedGhost: "cleared-ghost", restoredBattle: "restored" },
        registers: liveNightmareRegisters(row, k, phase), audio: { targetPan: attackerSide === "player" ? 63 : -64 },
        animationRngSeed: 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}

export interface LiveShockWaveInputArgs {
  readonly attackerSide: Side;
  readonly opponentSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  /** shock-wave.json asset palettes (BGR555) of the four resources. */
  readonly resourcePalettes: Readonly<Record<"circleOfLight" | "electricOrbs" | "spark" | "lightning", readonly number[]>>;
  readonly activationOrder: readonly number[];
}
/** prep33 SW_K: known-entry constants, identical in all 6 measured windows (docs/next-adapters-prep33.md s0.5 K). */
const SHOCK_WAVE_K = Object.freeze({
  taskSlots: Object.freeze({ charging: 0, progressing: 2, lightning: 0, shake: 0, blend: 2, monbg: 1, clear: 0 }),
  matrixBitmap: 6,
  // resource allocator (first load into the known entry): tile slot, tile range, OBJ palette allocator slot
  resources: Object.freeze({ electricOrbs: [6, [305, 4], 7], circleOfLight: [7, [537, 64], 8], spark: [10, [309, 24], 9], lightning: [11, [601, 80], 10] } as const),
  tags: Object.freeze({ circleOfLight: 10212, electricOrbs: 10211, spark: 10001, lightning: 10037 } as const),
  attr2: Object.freeze({ charging: 0x7000 | 0x800 | 308, orb: 35353, progressing: 0x9000 | 0x800 | 316, lightning: 0xa000 | 0x800 | 601 }),
  paletteBlendAttr: Object.freeze([160, 304, 65535] as const),
  monbg: Object.freeze({ player: { bg: 2, cnt: 24066, bank: 9 }, opponent: { bg: 1, cnt: 23554, bank: 8 } } as const),
  shadowAttr2: 23853,
});
const ZERO_BATTLE_BG = Object.freeze({ gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0,
  gBattle_BG3_X: 0, gBattle_BG3_Y: 0 });
/** Lowest-free simulation of the move's sprite births up to the orb over the known-entry occupants (palette-blend sprite row 16, 20 charging
 *  particles from row 31, orb row 45; prep33 shockWaveSpriteSlots). */
const SHOCK_WAVE_SPRITE_SLOTS = (() => {
  const occ = new Set<number>(KNOWN_ENTRY_OCCUPIED_SLOTS);
  const low = () => { for (let s = 0; s < 64; s += 1) if (!occ.has(s)) { occ.add(s); return s; } throw new Error("full"); };
  const paletteBlend = low(); const live: { slot: number; end: number }[] = [{ slot: paletteBlend, end: 29 }];
  const free = (age: number) => { for (let i = live.length - 1; i >= 0; i -= 1) if (live[i]!.end < age) { occ.delete(live[i]!.slot); live.splice(i, 1); } };
  const durations = [40, 40, 35, 35, 30, 30, 25, 25, 20, 20, 15, 15, 10, 10];
  for (let age = 31; age < 45; age += 1) { free(age); live.push({ slot: low(), end: age + durations[age - 31]! + 7 }); }
  free(45);
  return Object.freeze({ paletteBlend, orb: low() });
})();

/**
 * MOVE_SHOCK_WAVE (351) live inputs (docs/next-adapters-prep33.md s1.2 / s3 item 1; scoped exact): the accepted reducer is a source model,
 * so the live provider is an input builder, ported 1:1 from tools/integration/prep33ShockWaveModel.ts shockWaveInputs33 with production
 * values only: the anchors (X_2 / Y_PIC_OFFSET picture origins, sprite centres, the plain BATTLER_COORD_Y of the target), the known-entry
 * constants (SHOCK_WAVE_K), the asset palette composite, the shock-wave.json resource palettes and the lent activation order. Registers /
 * BG scroll are the first-body block S0 (the renderer branch reads only the monbg BG values and bldalpha, both written by the body).
 * The seam fields (sides, species, picture origins, target battle position) come from the presentation battlers. Never a capture row.
 */
export function liveShockWaveInputs(args: LiveShockWaveInputArgs): Record<string, unknown> {
  const { attackerSide, attacker, target } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const sprite = (side: Side, anchors: LiveOamBattlerAnchors) => {
    const o = battlerObject(side, anchors);
    return { slot: o.slot, x: anchors.spriteCenter.x, y: anchors.spriteCenter.y, x2: 0, y2: 0, subpriority: o.subpriority, oamPriority: (o.attr[2] >>> 10) & 3,
      matrixNum: 0, matrix: [256, 0, 0, 256] as const, attr: o.attr };
  };
  const attackerSprite = sprite(attackerSide, attacker), targetSprite = sprite(targetSide, target);
  const resource = (name: keyof typeof SHOCK_WAVE_K.tags) => {
    const [tileSlot, tileRange, pal] = SHOCK_WAVE_K.resources[name];
    return { tag: SHOCK_WAVE_K.tags[name], tileSlot, tileRange: [tileRange[0], tileRange[1]] as const, paletteAllocatorSlot: pal, hardwarePaletteBank: 16 + pal,
      palette: [...args.resourcePalettes[name]] };
  };
  const mb = SHOCK_WAVE_K.monbg[attackerSide];
  // The elevated opponent's enemy shadow (slot 2) at activation: x 160 / y 65 (SpriteCB_EnemyShadow), otherwise the invisible template words.
  const elevated = ((enemyElevations as Readonly<Record<string, number>>)[args.opponentSpecies] ?? 0) !== 0;
  const live = [...KNOWN_ENTRY_NON_BATTLER_SPRITES.filter((s) => s.slot !== 2).map((s) => ({ slot: s.slot, attr: [...s.attr] as [number, number, number], subpriority: s.subpriority })),
    { slot: 2, attr: (elevated ? [0x4000 | 65, 0x4000 | 160, SHOCK_WAVE_K.shadowAttr2] : [0x4000, 0x4000, SHOCK_WAVE_K.shadowAttr2]) as [number, number, number], subpriority: 200 },
    { slot: attackerSprite.slot, attr: attackerSprite.attr, subpriority: attackerSprite.subpriority },
    { slot: targetSprite.slot, attr: targetSprite.attr, subpriority: targetSprite.subpriority }].sort((l, r) => l.slot - r.slot);
  let orbMatrix = 0; while (SHOCK_WAVE_K.matrixBitmap & (1 << orbMatrix)) orbMatrix += 1;
  return {
    attackerSprite, targetSprite, taskSlots: { ...SHOCK_WAVE_K.taskSlots }, spriteSlots: { ...SHOCK_WAVE_SPRITE_SLOTS }, matrixSlots: { orb: orbMatrix },
    resources: { circleOfLight: resource("circleOfLight"), electricOrbs: resource("electricOrbs"), spark: resource("spark"), lightning: resource("lightning") },
    allocator: { initialOccupiedSprites: [...KNOWN_ENTRY_OCCUPIED_SLOTS], initialMatrixBitmap: SHOCK_WAVE_K.matrixBitmap, spriteOrder: [...args.activationOrder],
      initialLiveSprites: live },
    oam: { charging: [0, 0, SHOCK_WAVE_K.attr2.charging], orb: [0x500 | ((attacker.picOffsetPoint.y - 32) & 0xff), 0xc000 | ((attacker.picOffsetPoint.x - 32) & 0x1ff), SHOCK_WAVE_K.attr2.orb],
      progressing: [0, 0, SHOCK_WAVE_K.attr2.progressing], lightning: [0, 0, SHOCK_WAVE_K.attr2.lightning], paletteBlend: [...SHOCK_WAVE_K.paletteBlendAttr] },
    palettes: { unfaded: [...args.palettes.unfaded], faded: [...args.palettes.faded], hardware: [...args.palettes.hardware] },
    background: { values: { ...ZERO_BATTLE_BG }, xKey: `gBattle_BG${mb.bg}_X`, yKey: `gBattle_BG${mb.bg}_Y`, controlRegister: `bg${mb.bg}cnt`,
      horizontalRegister: `bg${mb.bg}hofs`, verticalRegister: `bg${mb.bg}vofs`, setupX: 32 - attackerSprite.x, setupY: 32 - attackerSprite.y, setupControl: mb.cnt,
      clearX: 0, clearY: 0, clearControl: mb.cnt, clearHorizontal: 0, clearVertical: 0, monbgPaletteBank: mb.bank,
      initialVram: "vram:activation", setupVram: "vram:monbg-setup", clearingVram: "vram:monbg-clearing", clearVram: "vram:monbg-cleared" },
    registers: { ...S0_REGISTERS }, animationRngSeed: 0, gameplayRng: null,
    // The reducer derives the body timing from the seam geometry (docs/next-adapters-prep33.md s0.2), not the accepted side tables.
    derivedTiming: true,
  };
}

export interface LiveSkillSwapInputArgs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  /** GetBattlerSpriteCoordAttr width / height (the species pic coords; liveMoveAnimation.ts liveBattlerCoordAttrs). */
  readonly attackerPicSize: Readonly<{ width: number; height: number }>;
  readonly targetPicSize: Readonly<{ width: number; height: number }>;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** gBattleAnimSpritePal_BluegreenOrb as BGR555 words (src/animation/assets/skill-swap-bluegreen-orb.json, passed in by the seam). */
  readonly orbPalette: readonly number[];
  /** Seam-provided skillSwap.ts skillSwapAtAge orbs for the orb program input built here (positions only). */
  readonly orbsAt: (state: number, programInput: Record<string, unknown>) => readonly LiveSkillSwapOrbPosition[];
  /** D4 policy (liveMoveTimingPolicy.ts MOVE_SKILL_SWAP): the optional lag at row 176 and the bank-2 restore row (175 / 176). */
  readonly lag: boolean;
  readonly restoreRow: number;
}
/** ANIM_TAG_BLUEGREEN_ORB (10251) at the known entry: tile slot 6 = tiles 305..308, palette slot 7 (OBJ bank 23). */
const SKILL_SWAP_RESOURCES = Object.freeze({ tag: 10251, tileSlot: 6, paletteAllocatorSlot: 7, paletteBank: 23, tileRange: [305, 4] as const, allocator: null });
/** K (prep33 SS_K, 6/6 windows): task slots of the two AnimTask_SkillSwap / BlendMonInAndOut legs and the shared fades. */
const SKILL_SWAP_TASK_SLOTS = Object.freeze({ fadeToPsychic: 0, psychicBackground: 1, targetOrbs: 0, targetBlend: 2, loopReversal: 3, attackerOrbs: 4, attackerBlend: 5, restoreFade: 0 });
const skillSwapCache = new Map<string, ReturnType<typeof liveSkillSwapHardwareOamRows>>();

/**
 * MOVE_SKILL_SWAP (285) live inputs (docs/next-adapters-prep35.md s1 / s3 item 1; faithful timing). Hardware OAM (128 entries, SortSprites
 * order carried from the lent activation order), the 32 hardware / software matrices and the orb program from the assembler; palettes and
 * bldcnt / bldy from liveSkillSwapInputs.ts with the activation palette = the asset composite and the registers = S0 (the renderer branch
 * reads only bldy and the hardware palette). Trajectory bounds = GetBattlerSpriteCoordAttr LEFT / RIGHT / TOP / BOTTOM around X_2 /
 * Y_PIC_OFFSET (battle_anim_mons.c:2273-2280). The ability outcome is not an input: the animation only runs on the success path.
 */
export function liveSkillSwapInputs(args: LiveSkillSwapInputArgs): { duration: number; animationInputsAt: (age: number) => Record<string, unknown> } {
  const { attackerSide, attacker, target } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const rows = liveSkillSwapRowCount(args.lag), firstInactiveAge = rows - 1;
  const bounds = (anchors: LiveOamBattlerAnchors, size: Readonly<{ width: number; height: number }>) => ({
    left: anchors.picOffsetPoint.x - size.width / 2, right: anchors.picOffsetPoint.x + size.width / 2,
    top: anchors.picOffsetPoint.y - size.height / 2, bottom: anchors.picOffsetPoint.y + size.height / 2 });
  const sprite = (object: ReturnType<typeof battlerObject>) =>
    ({ slot: object.slot, x: 0, y: 0, x2: 0, y2: 0, attr: object.attr, subpriority: object.subpriority, matrixNum: 0, matrix: [256, 0, 0, 256] });
  const lives = liveSkillSwapOrbLives();
  const base = {
    attackerBounds: bounds(attacker, args.attackerPicSize), targetBounds: bounds(target, args.targetPicSize),
    attackerSprite: sprite(attackerObject), targetSprite: sprite(targetObject), taskSlots: SKILL_SWAP_TASK_SLOTS,
    orbAllocations: [...lives].sort((l, r) => l.order - r.order).map((l) => ({ slot: l.slot, matrixNum: l.matrixNum, sourceCreationOrder: l.order })),
    orbOam: SKILL_SWAP_ORB_PAIRS.map(([slot]) => ({ slot, attr: [0, 0, SKILL_SWAP_ORB.attr2] as const, subpriority: SKILL_SWAP_ORB.subpriority })),
    background: { currentVram: null, battleVram: null, psychicVram: null }, resources: SKILL_SWAP_RESOURCES,
    sharedTaskData: { fadeToPsychic: [], loopReversal: [], restoreFade: [] },
    targetBlendPaletteStart: (targetSide === "player" ? 16 : 17) * 16 + 1, attackerBlendPaletteStart: (attackerSide === "player" ? 16 : 17) * 16 + 1,
    audio: { current: null, attackerPan: attackerSide === "player" ? -64 : 63 }, liveCounts: { visualTasks: 0, soundTasks: 0 }, animationRng: 0,
    firstInactiveAge, abilityOutcome: { playerAbilityAfterSwap: -1, opponentAbilityAfterSwap: -1 }, gameplayRng: null, gameplayState: null,
  };
  const key = JSON.stringify([attackerSide, base.attackerBounds, base.targetBounds, attackerObject.attr, targetObject.attr, args.activationOrder, rows]);
  let built = skillSwapCache.get(key);
  if (!built) {
    // The orb program needs only positions: the reducer looks up the (identity) software matrices and the orb OAM slots.
    const programInput = { ...base, spriteOrder: [], softwareOam: [], hardwareOam: [], softwareMatrices: IDENTITY_MATRICES, hardwareMatrices: [],
      palette: { unfaded: [], faded: [], hardware: [] }, registers: {} };
    built = liveSkillSwapHardwareOamRows({ attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE, lives,
      activationOrder: args.activationOrder, sort: args.sort, orbsAt: (state) => args.orbsAt(state, programInput), rows });
    if (skillSwapCache.size > 16) skillSwapCache.clear();
    skillSwapCache.set(key, built);
  }
  const display = built;
  const palettes = liveSkillSwapPalettes({ attackerSide, palette0: args.palettes, orbPalette: args.orbPalette,
    psychicPalette: (psychicBgAsset as { palette: readonly Rgb[] }).palette.map(bgr555), rows, restoreRow: args.restoreRow });
  return {
    duration: rows,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, firstInactiveAge), p = palettes[row]!;
      return {
        ...base, spriteOrder: display.orders[row]!, softwareOam: display.oam[row]!, hardwareOam: display.oam[row]!,
        softwareMatrices: display.softwareMatrices[row]!, hardwareMatrices: display.matrices[row]!,
        palette: { unfaded: p.unfaded, faded: p.faded, hardware: p.hardware },
        registers: { ...S0_REGISTERS, ...liveSkillSwapBlend(age, args.lag) },
      };
    },
  };
}

export interface LiveFlatterInputArgs {
  readonly attackerSide: Side;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  readonly activationOrder: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  /** The body's 114 presentation-host words (plan LIVE_MOVE_RANDOM2_PLANS[260]) and the host state at activation. */
  readonly words: readonly number[];
  readonly animationRng: number;
  /**
   * flat77: the activation register base. A first body latches the intro's WIN0 240 / 161 on row 0 (S0); at a later body
   * LaunchBattleAnimation (battle_anim.c:260) has already zeroed gBattle_WIN0H / V at the previous launch, so row 0 is S0 with WIN0 0 / 0
   * (liveQ2Moves.ts registersFor). Rows >= 1 are the same file (every launch zeroes WIN0 before row 1).
   */
  readonly firstBody: boolean;
  /** flatter.json spotlight / confetti palettes (src/animation/assets/flatter.json, passed in by the seam). */
  readonly spotlightPalette: readonly Rgb[];
  readonly confettiPalette: readonly Rgb[];
  /** Seam-provided flatter.ts flatterAtAge over the program input built here. */
  readonly stateAt: (state: number, programInput: Record<string, unknown>) => LiveFlatterBuildSprites;
}
/** K (prep35 FL35): spotlight tile slot 6 = [305, 64], confetti slot 7 = [433, 12], palette slots 7 / 8, spotlight matrix 0; slots lowest free. */
const FLATTER_K = Object.freeze({ spotlightTileSlot: 6, confettiTileSlot: 7, spotlightTiles: [305, 64] as const, confettiTiles: [433, 12] as const,
  spotlightPaletteSlot: 7, confettiPaletteSlot: 8, spotlightMatrix: 0, burstRow: 65, confettiEnd: 97 });
const flatterCache = new Map<string, ReturnType<typeof liveFlatterHardwareOamRows>>();
const lowestFreeSlot = (occupied: Iterable<number>) => { const used = new Set(occupied); let slot = 0; while (used.has(slot)) slot += 1; return slot; };

/**
 * Move_FLATTER register file of a row (prep32 flatterRegisters; S0 activation registers): row 1 WIN0H / WIN0V = 0; CreateSpotlight 7
 * (DISPCNT | OBJWIN, WININ); AnimTask_HardwarePaletteFade BLDY 1..10 every 4 rows from 8 (BLDCNT 0xf8 8..216); spotlight init 49 (WINOUT);
 * spotlight destroy 175 (WINOUT, DISPCNT ^ WIN0); fade-out BLDY 9..0 every 4 rows from 177; RemoveSpotlight 218.
 */
function liveFlatterRegisters(row: number, firstBody: boolean): Record<string, number> {
  const r0 = S0_REGISTERS, reg: Record<string, number> = firstBody ? { ...r0 } : { ...r0, win0h: 0, win0v: 0 };
  if (row >= 1) { reg.win0h = 0; reg.win0v = 0; }
  if (row >= 7 && row < 218) { reg.dispcnt = r0.dispcnt! | 0x4000; reg.winin = 0x1f3f; }
  if (row >= 8 && row < 217) reg.bldcnt = 0xf8;
  if (row >= 8 && row <= 44) reg.bldy = 1 + Math.floor((row - 8) / 4);
  else if (row > 44 && row < 177) reg.bldy = 10;
  else if (row >= 177 && row <= 213) reg.bldy = 9 - Math.floor((row - 177) / 4);
  if (row >= 49 && row < 175) reg.winout = 0x1f3f;
  if (row >= 175 && row < 218) reg.dispcnt = (r0.dispcnt! | 0x4000) ^ 0x8000;
  if (row >= 218) reg.dispcnt = (r0.dispcnt! ^ 0x8000) & ~0x4000;
  return reg;
}

/**
 * MOVE_FLATTER (260) live inputs (docs/next-adapters-prep35.md s2 / s3 item 2; faithful random, D3). The 38 confetti from the body's 114
 * presentation-host words (prep32 flatterConfetti: 3 words per confetti in source order, tile += w0 % 12, data[0] = 0x5e0 +/- (w1 & 0x1ff),
 * data[1] = 0x480 +/- (w2 & 0xff), sides alternating attacker / target; slots lowest free after the scene, the spotlight and the second dip),
 * the hardware OAM / matrices / carried order from the assembler (sprite states from the seam's reducer), the prep32 registers (S0) and
 * palettes (composite + the spotlight sheet on row 1 / confetti on row 4; hardware = the previous row's faded). Battler OBJ = sprite centre +
 * idle rest; attackerCenter = the attacker sprite centre, targetCenter = BATTLER_COORD_X / _Y (no elevation), targetSpriteOrigin = the target
 * sprite centre (prep35 s2.1). Production values only; never a capture row.
 */
export function liveFlatterInputs(args: LiveFlatterInputArgs): { duration: number; attackerCenter: Point; targetCenter: Point;
  animationInputsAt: (age: number) => Record<string, unknown> } | null {
  if (args.words.length !== 114) return null;
  const { attackerSide, attacker, target } = args;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const attackerObject = battlerObject(attackerSide, attacker), targetObject = battlerObject(targetSide, target);
  const spotlightSlot = lowestFreeSlot(KNOWN_ENTRY_OCCUPIED_SLOTS), dip1 = lowestFreeSlot([...KNOWN_ENTRY_OCCUPIED_SLOTS, spotlightSlot]);
  const dip2 = lowestFreeSlot([...KNOWN_ENTRY_OCCUPIED_SLOTS, spotlightSlot, dip1]);
  // occupied at the burst (row 65): the scene, the spotlight and the second dip (the first is destroyed on row 64)
  const used = new Set([...KNOWN_ENTRY_OCCUPIED_SLOTS, spotlightSlot, dip2]);
  const confetti = Array.from({ length: 38 }, (_, i) => {
    const w0 = args.words[3 * i]!, r1 = args.words[3 * i + 1]! & 0x1ff, r2 = args.words[3 * i + 2]! & 0xff;
    const slot = lowestFreeSlot(used); used.add(slot);
    const side = i & 1, state = { x: side === 0 ? -8 : 248, y: 104, x2: 0, y2: 0,
      data: [r1 & 1 ? 0x5e0 + r1 : 0x5e0 - r1, r2 & 1 ? 0x480 + r2 : 0x480 - r2, side, 0], flags: 1, callback: "AnimFlatterConfetti_Step" };
    return { slot, start: FLATTER_K.burstRow, end: FLATTER_K.confettiEnd, initial: state, initialized: state, tileOffset: w0 % 12 };
  });
  const attackerCenter = attacker.spriteCenter, targetCenter = target.battlePositionCenter;
  const art = (object: ReturnType<typeof battlerObject>) =>
    ({ slot: object.slot, attr: object.attr, subpriority: object.subpriority, matrixNum: 0, matrix: [256, 0, 0, 256] });
  const spotlightAttr2 = FLATTER_K.spotlightTiles[0] | 2 << 10 | FLATTER_K.spotlightPaletteSlot << 12;
  const base = {
    targetSpriteOrigin: target.spriteCenter, attackerInitialOffset: attacker.frontIdleRest, targetInitialOffset: target.frontIdleRest,
    attackerArt: art(attackerObject), targetArt: art(targetObject),
    spotlight: { slot: spotlightSlot, attr: [0, 0, spotlightAttr2], subpriority: targetObject.subpriority - 2, matrixNum: FLATTER_K.spotlightMatrix },
    verticalDipSlots: [dip1, dip2], confetti, taskSlots: { hardwarePaletteFade: 0 },
    resources: { spotlightTag: 10227, confettiTag: 10240, spotlightTileSlot: FLATTER_K.spotlightTileSlot, spotlightPaletteSlot: FLATTER_K.spotlightPaletteSlot,
      confettiTileSlot: FLATTER_K.confettiTileSlot, confettiPaletteSlot: FLATTER_K.confettiPaletteSlot,
      allocator: { tileRanges: Array.from({ length: 64 }, (_, i) => i === FLATTER_K.spotlightTileSlot ? FLATTER_K.spotlightTiles
        : i === FLATTER_K.confettiTileSlot ? FLATTER_K.confettiTiles : [0, 0]) } },
    audio: { current: null, attackerPan: attackerSide === "player" ? -64 : 63, targetPan: targetSide === "player" ? -63 : 63 },
    liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: args.animationRng, gameplayRng: null, gameplayState: null,
  };
  const key = JSON.stringify([attackerSide, attackerCenter, targetCenter, target.spriteCenter, attacker.frontIdleRest, target.frontIdleRest, args.activationOrder, args.words]);
  let built = flatterCache.get(key);
  if (!built) {
    const programInput = { ...base, attackerCenter, targetCenter, spriteOrder: args.activationOrder,
      buffers: { softwareOam: [], hardwareOam: [], softwareMatrices: [], hardwareMatrices: [] }, palette: { unfaded: [], faded: [], hardware: [] }, registers: {} };
    built = liveFlatterHardwareOamRows({ attacker: attackerObject, target: targetObject, scene: KNOWN_ENTRY_SCENE, spotlightAttr2,
      spotlightSubpriority: targetObject.subpriority - 2, confettiTileBase: FLATTER_K.confettiTiles[0], confettiPaletteSlot: FLATTER_K.confettiPaletteSlot,
      confettiTileOffsets: new Map(confetti.map((c) => [c.slot, c.tileOffset])), activationOrder: args.activationOrder, sort: args.sort,
      stateAt: (state) => args.stateAt(state, programInput) });
    if (flatterCache.size > 16) flatterCache.clear();
    flatterCache.set(key, built);
  }
  const rows = built;
  const loads = [{ row: 1, bank: FLATTER_K.spotlightPaletteSlot, words: args.spotlightPalette.map(bgr555) },
    { row: 4, bank: FLATTER_K.confettiPaletteSlot, words: args.confettiPalette.map(bgr555) }];
  const loaded = (r: number, from: readonly number[]) => {
    const out = [...from]; for (const l of loads) if (r >= l.row) for (let i = 0; i < 16; i += 1) out[(16 + l.bank) * 16 + i] = l.words[i]!; return out; };
  return {
    duration: FLATTER_ROWS, attackerCenter, targetCenter,
    animationInputsAt: (age: number) => {
      const row = Math.min(age, FLATTER_ROWS - 1);
      return {
        ...base, spriteOrder: rows.orders[row]!,
        buffers: { softwareOam: rows.oam[row]!, hardwareOam: rows.oam[row]!, softwareMatrices: rows.matrices[row]!, hardwareMatrices: rows.matrices[row]! },
        palette: { unfaded: loaded(row, args.palettes.unfaded), faded: loaded(row, args.palettes.faded),
          hardware: row === 0 ? [...args.palettes.hardware] : loaded(row - 1, args.palettes.faded) },
        registers: liveFlatterRegisters(row, args.firstBody),
      };
    },
  };
}
