/**
 * MOVE_ICE_BALL (301) live inputs (docs/next-adapters-prep26.md s1 / s4 items 1-3): a 1:1 port of the prep26 source-derived prototypes
 * (tools/integration/prep26IceBallAssembler.ts sprite programs + hardware OAM / matrices, prep26IceBallModel.ts registers / palettes / tasks),
 * with the prototype's `known.*` replaced by production values: the battler anchors (`liveBattlerAnchors` picOffsetPoint / sprite centre /
 * idle rest), the known-entry allocator constants (occupied slots, ICE_CHUNK tile 537 bank 7, ICE_CRYSTALS tile 305 bank 8, chunk matrix =
 * the lowest free bit of the known-entry matrix bitmap 0b110), the assets-only palette composite (`composeLivePalettes`), the S0 registers,
 * the lent activation order carried through the body (`carryLiveSpriteOrder`), the presentation host's Random2 words (2 per shard at step
 * 37; liveMovePresentationRng.ts plan 301, D3) and the D4 lag rows of the timing policy (liveMoveTimingPolicy.ts 301: dominant = no lag).
 * Never a capture row. src/engine reaches src/animation only through liveMoveAnimation.ts, which passes the linear-translation helpers
 * and the ice-ball / icy-wind palettes in.
 */
import crystalAsset from "../assets/gen/battle-anim-ice-crystals.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "./liveBgSnapshotMoves.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";
import {
  KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, buildLiveHardwareOam, carryLiveSpriteOrder,
  type LiveOamSprite, type LiveSpriteOrderSort, type OamAttr,
} from "./liveMoveOamAssembler.ts";
import type { LiveOamBattlerAnchors } from "./liveOamMoves.ts";

type Side = "player" | "opponent";
type Point = Readonly<{ x: number; y: number }>;
type Rgb = Readonly<{ r: number; g: number; b: number }>;
type Matrix = readonly [number, number, number, number];
export type LiveIceBallCounter = 0 | 1 | 2 | 3 | 4;

export const ICE_BALL_SHARDS = [5, 7, 9, 10, 10] as const;
const SHAKE = [8, 10, 14, 18, 30] as const;
const SCALE = [0xe0, 0x118, 0x150, 0x180, 0x1c0] as const;
/** gAnimMovePower = gDynamicBasePower = 30 << counter (Rollout / Ice Ball). */
const POWER = [30, 60, 120, 240, 480] as const;
/** First inactive step index of a counter body (prep26 ibEnd). */
export const liveIceBallEnd = (counter: LiveIceBallCounter): number => (counter === 4 ? 131 : 75);
/** Known-entry allocator constants (prep26 s0.2 K; accepted pair + GLALIE -> GOLEM alternates). */
const KNOWN_ENTRY_OCCUPIED_SLOTS: readonly number[] = Object.freeze([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const CHUNK_TILE = 537, CHUNK_BANK = 7, CRYSTAL_TILE = 305, CRYSTAL_BANK = 8, CHUNK_MATRIX = 0;
/** Battler OBJ attr2 (tile | priority 2 | palette bank << 12) and subpriority (GetBattlerSpriteSubpriority). */
const BATTLER_ATTR2: Readonly<Record<Side, number>> = Object.freeze({ player: 2417, opponent: 6617 });
const BATTLER_SUBPRIORITY: Readonly<Record<Side, number>> = Object.freeze({ player: 30, opponent: 40 });
const S0_REGISTERS: Readonly<Record<string, number>> = Object.freeze({
  dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b,
  bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0,
  win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0,
});
const FADE_C1 = 7, FADE_C2 = 92, FADE_LEN = 37;
const IDENTITY: Matrix = Object.freeze([256, 0, 0, 256] as const);
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const sine = (index: number, amplitude: number) => (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;

/** Step index of a row: the row minus the lag rows (0-step frames) up to it. */
const stepOf = (row: number, lagRows: readonly number[]): number => row - lagRows.filter((l) => l <= row).length;

export interface LiveIceBallLinear {
  /** animLinearTranslation.ts linearTranslationDeltaQ8 / linearTranslationOffsetAfterCallbacks (seam-provided). */
  readonly deltaQ8: (delta: number, duration: number) => number;
  readonly offsetAfterCallbacks: (deltaQ8: number, callbacks: number, duration: number) => number;
}
export interface LiveIceBallArgs {
  readonly counter: LiveIceBallCounter;
  readonly attackerSide: Side;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attacker: LiveOamBattlerAnchors;
  readonly target: LiveOamBattlerAnchors;
  readonly palettes: LivePaletteComposite;
  /** The lent full 64-slot activation order (known-entry occupied prefix + the host's free order). */
  readonly activationOrder: readonly number[];
  /** The body's presentation Random2 words (2 per shard, drawn at step 37) and the host activation value. */
  readonly words: readonly number[];
  readonly activationValue: number;
  /** D4 lag rows of the timing policy (0-step frames; the dominant phase has none). */
  readonly lagRows: readonly number[];
  readonly sort: LiveSpriteOrderSort;
  readonly linear: LiveIceBallLinear;
  readonly chunkPalette: readonly Rgb[];
  readonly icePalette: readonly Rgb[];
}
export interface LiveIceBallInputs {
  readonly duration: number;
  /** `animationInputs` of the ICE_BALL config at a live age. */
  readonly animationInputsAt: (age: number) => Record<string, unknown>;
}

interface Program {
  readonly counter: LiveIceBallCounter; readonly side: 1 | -1;
  readonly attackerPic: Point; readonly targetPic: Point; readonly words: readonly number[];
  readonly lagRows: readonly number[]; readonly taskLagRows: readonly number[];
  readonly chunkSlot: number; readonly shardSlots: readonly number[]; readonly targetSlot: number;
  readonly linear: LiveIceBallLinear;
}
/** AnimThrowIceBall (translate-arc 30 ticks, arc -40) then RunStoredCallbackWhenAnimEnds; created step 7 (battle_anim_ice.c:1526-1566). */
function chunkAt(e: number, k: Program): { x2: number; y2: number; frame: number } | null {
  if (e < 7 || e > 54) return null;
  const callbacks = Math.min(30, e - 6);
  const x = k.attackerPic.x + 15 * k.side, y = k.attackerPic.y, tx = k.targetPic.x - 12 * k.side, ty = k.targetPic.y - 16;
  const dx = k.linear.deltaQ8(tx - x, 30), dy = k.linear.deltaQ8(ty - y, 30), phase = Math.trunc(0x8000 / 30);
  const x2 = k.linear.offsetAfterCallbacks(dx, callbacks, 30);
  const y2 = k.linear.offsetAfterCallbacks(dy, callbacks, 30) + sine(phase * callbacks >> 8, -40);
  return { x2, y2, frame: e >= 37 ? Math.min(4, 1 + Math.floor((e - 37) / 4)) : 0 };
}
/** AnimIceBallParticle (:1581-1607): randA = (w & 0xff) + 256, randB = w & 0x1ff folded; x2 sign by randA bit 0; 20 callbacks. */
function shardsAt(e: number, k: Program): { slot: number; x2: number; y2: number; data: number[] }[] {
  if (e < 37 || e > 56) return [];
  const local = e - 36;
  return k.shardSlots.map((slot, i) => {
    const randA = (k.words[2 * i]! & 0xff) + 256;
    let randB = k.words[2 * i + 1]! & 0x1ff;
    if (randB > 0xff) randB = 256 - randB;
    const a = randA * local, b = randB * local;
    return { slot, x2: randA & 1 ? -(a >> 8) : a >> 8, y2: b >> 8, data: [local, randA, randB, a, b, 0, 0, 0] };
  });
}
/** AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, dur, 1, 0) (battle_anim_mon_movement.c:971-1050): init + Step at step 37, toggle every 2nd step. */
function shakeAt(e: number, k: Program, row = 37): { x2: number; data: number[] | null } {
  const dur = SHAKE[k.counter], d15 = Math.max(1, Math.min(16, Math.trunc(POWER[k.counter] / 12))), d14 = d15 >> 1, d13 = d14 + (d15 & 1);
  let d0 = 0, d2: number = dur, d12 = 0, x2 = 0;
  for (let step = 37; step <= e; step += 1) {
    if (++d0 > 1) { d0 = 0; d12 = (d12 + 1) & 1; x2 = d12 ? d13 : -d14; if (!--d2) return { x2: 0, data: null }; }
  }
  // A lag at the creation row: the init ran, the RunTasks step did not (d0 = 0).
  if (e < 37 && !(e === 36 && row === 37 && k.taskLagRows.includes(37))) return { x2: 0, data: null };
  return { x2, data: [d0, 1, d2, 0, 0, 0, 0, k.targetSlot, 0, 0, 1, 0, d12, d13, d14, d15] };
}
const fadeY = (e: number, c: number): { cnt: number; y: number } => {
  if (e < c + 1 || e >= c + FADE_LEN) return { cnt: 0, y: 0 };
  return { cnt: 0xe8, y: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) };
};
const fadeState = (e: number, c: number): number => e < c || e >= c + FADE_LEN ? 0 : e <= c + 17 ? 1 : e === c + 18 ? 2 : 3;

const oamCache = new Map<string, Readonly<{ oam: readonly string[][]; matrices: readonly (readonly Matrix[])[] }>>();

/**
 * Live inputs of one Ice Ball counter body. Declines (null) when the words do not cover the shards, when an idle rest is non-zero (the
 * shake writes the target x2 absolutely and the prototype was checked at rest 0 only) or when the activation occupancy is not the
 * known entry (the allocator constants).
 */
export function liveIceBallInputs(args: LiveIceBallArgs): LiveIceBallInputs | null {
  const { counter, attackerSide, attacker, target } = args;
  const shards = ICE_BALL_SHARDS[counter];
  if (args.words.length < 2 * shards) return null;
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0 || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  if (KNOWN_ENTRY_OCCUPIED_SLOTS.some((slot) => args.activationOrder.indexOf(slot) < 0) || args.activationOrder.length !== 64) return null;
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const used = new Set(KNOWN_ENTRY_OCCUPIED_SLOTS);
  const lowestFree = () => { let s = 0; while (used.has(s)) s += 1; used.add(s); return s; };
  const chunkSlot = lowestFree(), shardSlots = Array.from({ length: shards }, lowestFree);
  const slotOf = (side: Side) => side === "player" ? 6 : 8;
  const program: Program = {
    counter, side: attackerSide === "player" ? 1 : -1, attackerPic: attacker.picOffsetPoint, targetPic: target.picOffsetPoint,
    words: args.words.slice(0, 2 * shards), lagRows: args.lagRows, taskLagRows: args.lagRows.map((r) => r - 1),
    chunkSlot, shardSlots, targetSlot: slotOf(targetSide), linear: args.linear,
  };
  const battlerAttr = (side: Side, anchors: LiveOamBattlerAnchors): OamAttr =>
    [(anchors.spriteCenter.y - 32) & 0xff, 0xc000 | (anchors.spriteCenter.x - 32) & 0x1ff, BATTLER_ATTR2[side]];
  const attackerAttr = battlerAttr(attackerSide, attacker), targetAttr = battlerAttr(targetSide, target);
  const targetSub = BATTLER_SUBPRIORITY[targetSide];
  const rows = liveIceBallEnd(counter) + 1 + args.lagRows.length;
  const key = JSON.stringify([counter, attackerSide, program.attackerPic, program.targetPic, attackerAttr, targetAttr, program.words, args.lagRows, args.activationOrder]);
  let built = oamCache.get(key);
  if (!built) {
    // Sprite state after the callbacks of step-row `state` (createsprite subpriority: chunk target - 2, shards target - 4; Cmd_createsprite).
    const spritesAt = (state: number): { sprites: LiveOamSprite[]; matrices: Matrix[] } => {
      const e = stepOf(state, program.lagRows);
      const sprites: LiveOamSprite[] = KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({
        slot: s.slot, attr: s.attr as unknown as OamAttr, subpriority: s.subpriority, visible: s.slot !== 2, oamY: s.attr[0] & 0xff }));
      sprites.push({ slot: slotOf(attackerSide), attr: attackerAttr, subpriority: BATTLER_SUBPRIORITY[attackerSide], visible: true, oamY: attackerAttr[0] & 0xff });
      // The task-written shake x2 reaches OAM one frame after a sprite callback's (RunTasks after BuildOamBuffer).
      const sh = shakeAt(stepOf(state, program.taskLagRows) - 1, program);
      sprites.push({ slot: program.targetSlot, attr: [targetAttr[0], targetAttr[1] & ~0x1ff | (targetAttr[1] & 0x1ff) + sh.x2 & 0x1ff, targetAttr[2]],
        subpriority: targetSub, visible: true, oamY: targetAttr[0] & 0xff });
      const matrices: Matrix[] = Array.from({ length: 32 }, () => IDENTITY);
      const chunk = chunkAt(e, program);
      if (chunk) {
        const x = program.attackerPic.x + 15 * program.side, y = program.attackerPic.y;
        const attr: OamAttr = [0x0300 | y + chunk.y2 - 32 & 0xff, 0x8000 | CHUNK_MATRIX << 9 | x + chunk.x2 - 32 & 0x1ff,
          CHUNK_TILE + 16 * chunk.frame | 2 << 10 | CHUNK_BANK << 12];
        sprites.push({ slot: chunkSlot, attr, subpriority: targetSub - 2, visible: true, oamY: attr[0] & 0xff });
        const inv = Math.trunc(65536 / SCALE[counter]);
        matrices[CHUNK_MATRIX] = [inv, 0, 0, inv];
      }
      for (const s of shardsAt(e, program)) {
        const attr: OamAttr = [(program.targetPic.y - 16 + s.y2 - 4) & 0xff, (program.targetPic.x - 12 * program.side + s.x2 - 4) & 0x1ff,
          CRYSTAL_TILE + 6 | 2 << 10 | CRYSTAL_BANK << 12];
        sprites.push({ slot: s.slot, attr, subpriority: targetSub - 4, visible: true, oamY: attr[0] & 0xff });
      }
      return { sprites, matrices };
    };
    // hardwareOam[row] = build(sprite state of row - 1); a lag row misses the OAM transfer (repeats the previous row).
    const oam: string[][] = [], matrices: Matrix[][] = [];
    let order: readonly number[] = args.activationOrder;
    let previous = spritesAt(-1);
    for (let row = 0; row < rows; row += 1) {
      if (row > 0 && program.lagRows.includes(row)) { oam.push(oam[row - 1]!); matrices.push(matrices[row - 1]!); }
      else { oam.push(buildLiveHardwareOam(order, previous.sprites, { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM }, previous.matrices));
        matrices.push(previous.matrices); }
      previous = spritesAt(row);
      order = carryLiveSpriteOrder(order, previous.sprites, args.sort);
    }
    built = { oam, matrices };
    if (oamCache.size > 16) oamCache.clear();
    oamCache.set(key, built);
  }
  const hardware = built;
  const chunkWords = args.chunkPalette.map(bgr555), crystalWords = (crystalAsset as { palette: Rgb[] }).palette.map(bgr555);
  const iceWords = args.icePalette.map(bgr555);
  const strongest = counter === 4;
  const withAssets = (e: number, base: readonly number[]): number[] => {
    const u = [...base];
    if (e >= 1) for (let i = 0; i < 16; i += 1) u[(16 + CHUNK_BANK) * 16 + i] = chunkWords[i]!;
    if (e >= 4) for (let i = 0; i < 16; i += 1) u[(16 + CRYSTAL_BANK) * 16 + i] = crystalWords[i]!;
    if (strongest && e >= FADE_C1 + 19 && e < FADE_C2 + 19) for (let i = 0; i < 16; i += 1) u[2 * 16 + i] = iceWords[i]!;
    return u;
  };
  const art = (species: string, side: Side, attr: OamAttr) =>
    ({ displaySpecies: species, slot: slotOf(side), attr, subpriority: BATTLER_SUBPRIORITY[side] });
  return {
    duration: rows,
    animationInputsAt: (age: number) => {
      const r = Math.min(Math.max(age, 0), rows - 1);
      const e = stepOf(r, program.taskLagRows), eHw = stepOf(Math.max(r - 1, 0), program.taskLagRows);
      const registers: Record<string, number> = r === 0 ? { ...S0_REGISTERS } : { ...S0_REGISTERS, win0h: 0, win0v: 0 };
      const tasks: { slot: number; callback: string; data: number[] }[] = [];
      if (strongest) for (const c of [FADE_C1, FADE_C2]) {
        const f = fadeState(e, c);
        if (f) tasks.push({ slot: 0, callback: "Task_FadeToBg", data: [c === FADE_C1 ? 15 : -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, f, 0, 0, 0, 0, 0] });
        const y = fadeY(e, c);
        if (y.cnt) { registers.bldcnt = y.cnt; registers.bldy = y.y; }
      }
      const sh = shakeAt(e, program, r);
      if (sh.data) tasks.push({ slot: strongest ? 1 : 0, callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data: sh.data });
      return {
        counter,
        attackerArt: art(args.attackerSpecies, attackerSide, attackerAttr), targetArt: art(args.targetSpecies, targetSide, targetAttr),
        allocation: { chunkSlot, shardSlots, state: null },
        buffers: { softwareOam: [], hardwareOam: hardware.oam[r]!, softwareMatrices: hardware.matrices[r]!, hardwareMatrices: hardware.matrices[r]! },
        palette: { unfaded: withAssets(e, args.palettes.unfaded), faded: withAssets(e, args.palettes.faded),
          hardware: withAssets(eHw, args.palettes.hardware) },
        registers, resources: { chunkTileBase: CHUNK_TILE, chunkLoaded: true, crystalsTileBase: CRYSTAL_TILE, crystalsLoaded: true },
        tasks, order: args.activationOrder, audio: null,
        liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 },
        initialPresentationRng: args.activationValue >>> 0, gameplayRng: null, gameplayState: null,
      };
    },
  };
}
