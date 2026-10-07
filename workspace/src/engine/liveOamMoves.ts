/**
 * Live input builders for the move bodies whose renderer branch decodes a hardware-OAM buffer (prep20). Each builder
 * derives every per-row input from production values only: battler anchors (`liveBattlerAnchors`), the asset palette
 * composite (`composeLivePalettes`), the known-entry allocator/scene constants, the lent activation order and the
 * source animation programs; the OAM rows come from liveMoveOamAssembler.ts. Never a capture row.
 */
import willOWispAsset from "../animation/assets/will-o-wisp.json" with { type: "json" };
import { willOWispTimeline } from "../animation/willOWisp.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "./liveBgSnapshotMoves.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import {
  KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, liveWillOWispHardwareOamRows, type LiveOamScene, type OamAttr,
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
