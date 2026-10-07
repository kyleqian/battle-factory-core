/**
 * prep26: source-derived sprite program + hardware-OAM + hardware-matrix assembler prototype for MOVE_ICE_BALL (301), every counter body (0..4).
 * hardwareOam[row] = build(sprite state of row-1) (prep20 0.1).  Move-owned OAM objects: the ice chunk (InitIceBallAnim / AnimThrowIceBall,
 * battle_anim_ice.c:1526-1566, affine matrix 0 = 65536 / scale, tile frame 0 during the arc, 16 * (1..4) after), the impact shards
 * (InitIceBallParticle / AnimIceBallParticle :1581-1607, words from the Random2 stream), the target battler (AnimTask_ShakeTargetBasedOnMovePowerOrDmg
 * x2, battle_anim_mon_movement.c:971-1050).  Healthbox block, battler art attrs, tile / bank ids and the sprite order are known-entry / lent inputs.
 * Step indices: `e(row)` = row minus the number of "lag rows" up to it (0-step frames: no sprite / task step).  Lag rows are an H class (VBlank
 * overrun, measured from the animationRng stall) and are an INPUT here, never derived.
 */
import { linearTranslationDeltaQ8, linearTranslationOffsetAfterCallbacks } from "../../src/animation/animLinearTranslation.ts";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";

type Attr = readonly [number, number, number];
export interface IceBallKnown26 {
  readonly counter: 0 | 1 | 2 | 3 | 4; readonly attackerSide: "player" | "opponent";
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Attr; readonly targetAttr: Attr;
  readonly attackerPic: Readonly<{ x: number; y: number }>; readonly targetPic: Readonly<{ x: number; y: number }>;   // Y_PIC_OFFSET anchors (A)
  readonly occupiedSlots: readonly number[];                                                                         // known-entry sprite slots (K)
  readonly chunkTile: number; readonly chunkBank: number; readonly crystalTile: number; readonly crystalBank: number; // allocator tile / palette ids (K)
  readonly dummyAttr: Attr; readonly rng0: number;                                                                   // presentation RNG at row 0 (request plan)
  readonly lagRows: readonly number[]; readonly taskLagRows: readonly number[];  // H: sprite 0-step rows / task 0-step rows (= stall row - 1)
                                                                               // H
  readonly chunkMatrix: number;                                                                                      // lowest free OAM matrix id of the activation bitmap (K): 0-step rows
}
export const IB_SHARDS = [5, 7, 9, 10, 10] as const, IB_SHAKE = [8, 10, 14, 18, 30] as const;
export const IB_SCALE = [0xe0, 0x118, 0x150, 0x180, 0x1c0] as const;
export const IB_POWER = [30, 60, 120, 240, 480] as const;                       // gAnimMovePower = gDynamicBasePower = 30 << counter (Rollout / Ice Ball)
export const ibEnd = (counter: number) => (counter === 4 ? 131 : 75);          // first inactive step index
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
const sine = (index: number, amplitude: number) => (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
/** Step index of a row. */
export function stepOf(row: number, lagRows: readonly number[]): number { let lag = 0; for (const l of lagRows) if (l <= row) lag += 1; return row - lag; }
export interface ChunkState { x2: number; y2: number; frame: number; callback: string; data: number[] }
export interface ShardState { slot: number; x2: number; y2: number; localAge: number; randA: number; randB: number; data: number[] }
export interface ShakeState { x2: number; data: number[] | null }
/** AnimThrowIceBall (translate-arc 30 ticks, arc -40) then RunStoredCallbackWhenAnimEnds; created step 7 (script 48 + 28-frame delay chain). */
export function chunkAt(e: number, k: IceBallKnown26): ChunkState | null {
  if (e < 7 || e > 54) return null;
  const callbacks = Math.min(30, e - 6), side = k.attackerSide === "player" ? 1 : -1;
  const x = k.attackerPic.x + 15 * side, y = k.attackerPic.y, tx = k.targetPic.x - 12 * side, ty = k.targetPic.y - 16;
  const dx = linearTranslationDeltaQ8(tx - x, 30), dy = linearTranslationDeltaQ8(ty - y, 30), phase = Math.trunc(0x8000 / 30);
  const x2 = linearTranslationOffsetAfterCallbacks(dx, callbacks, 30), y2 = linearTranslationOffsetAfterCallbacks(dy, callbacks, 30) + sine(phase * callbacks >> 8, -40);
  const after = e >= 37, frame = after ? Math.min(4, 1 + Math.floor((e - 37) / 4)) : 0;
  return { x2, y2, frame, callback: e === 54 ? "DestroyAnimSprite" : after ? "RunStoredCallbackWhenAnimEnds" : "AnimThrowIceBall",
    data: after ? [0, Math.abs(dx), Math.abs(dy), Math.abs(dx) * 30, Math.abs(dy) * 30, -40] : [30 - callbacks, Math.abs(dx), Math.abs(dy), Math.abs(dx) * callbacks, Math.abs(dy) * callbacks, -40, phase, phase * callbacks] };
}
/** Lowest-free sprite slots for the shards (all created in one frame, script order). */
export function shardSlots(k: IceBallKnown26): number[] {
  const used = new Set<number>([...k.occupiedSlots, chunkSlot(k)]); const out: number[] = [];
  while (out.length < IB_SHARDS[k.counter]) { let s = 0; while (used.has(s)) s += 1; used.add(s); out.push(s); } return out;
}
export const chunkSlot = (k: IceBallKnown26): number => { let s = 0; while (k.occupiedSlots.includes(s)) s += 1; return s; };
/** The Random2 words of the shard frame (step 37): 2 per shard (randA = (w & 0xff) + 256, randB = w & 0x1ff folded), RfuMain1 steps once per non-lag frame. */
export function shardWords(k: IceBallKnown26): number[] { let r = k.rng0 >>> 0; for (let t = 1; t <= 37; t += 1) r = advanceRngValue(r);
  const words: number[] = []; for (let i = 0; i < IB_SHARDS[k.counter] * 2; i += 1) { r = advanceRngValue(r); words.push(r >>> 16 & 0xffff); } return words; }
export function shardsAt(e: number, k: IceBallKnown26): ShardState[] {
  if (e < 37 || e > 56) return [];
  const words = shardWords(k), slots = shardSlots(k), local = e - 36;
  return slots.map((slot, i) => { const randA = (words[2 * i]! & 0xff) + 256; let randB = words[2 * i + 1]! & 0x1ff; if (randB > 0xff) randB = 256 - randB;
    const a = randA * local, b = randB * local; return { slot, x2: randA & 1 ? -(a >> 8) : a >> 8, y2: b >> 8, localAge: local, randA, randB, data: [local, randA, randB, a, b, 0, 0, 0] }; });
}
/** AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, dur, 1, 0): init + one Step at step 37, then a toggle every 2nd step. */
export function shakeAt(e: number, k: IceBallKnown26, row = 37): ShakeState {
  const dur = IB_SHAKE[k.counter], d15 = Math.max(1, Math.min(16, Math.trunc(IB_POWER[k.counter] / 12))), d14 = d15 >> 1, d13 = d14 + (d15 & 1);
  let d0 = 0, d2 = dur, d12 = 0, x2 = 0;
  for (let step = 37; step <= e; step += 1) {
    if (++d0 > 1) { d0 = 0; d12 = (d12 + 1) & 1; x2 = d12 ? d13 : -d14; if (!--d2) return { x2: 0, data: null }; }
  }
  if (e < 37 && !(e === 36 && row === 37 && k.taskLagRows.includes(37))) return { x2: 0, data: null };    // lag at the creation row: init ran, RunTasks step did not (d0 = 0)
  return { x2, data: [d0, 1, d2, 0, 0, 0, 0, k.targetSlot, 0, 0, 1, 0, d12, d13, d14, d15] };
}
export interface IceBallAssemblerInputs { readonly known: IceBallKnown26; readonly spriteOrderAt: (state: number) => readonly number[]; }
export function assembleIceBallHardwareOam(row: number, input: IceBallAssemblerInputs): { oam: string[]; matrices: number[][] } {
  const k = input.known, state = (k.lagRows.includes(row) ? row - 1 : row) - 1, e = stepOf(state, k.lagRows);   // a lag row misses the OAM transfer: hardware OAM repeats the previous row
  const attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  attrs.set(k.attackerSlot, k.attackerAttr);
  const sh = shakeAt(stepOf(state, k.taskLagRows) - 1, k);
  attrs.set(k.targetSlot, [k.targetAttr[0], k.targetAttr[1] & ~0x1ff | (k.targetAttr[1] & 0x1ff) + sh.x2 & 0x1ff, k.targetAttr[2]]);   // task-written x2 reaches OAM one frame later than a sprite callback's (RunTasks after BuildOamBuffer)
  const chunk = chunkAt(e, k);
  if (chunk) { const side = k.attackerSide === "player" ? 1 : -1, x = k.attackerPic.x + 15 * side, y = k.attackerPic.y;
    attrs.set(chunkSlot(k), [0x0300 | y + chunk.y2 - 32 & 0xff, 0x8000 | k.chunkMatrix << 9 | x + chunk.x2 - 32 & 0x1ff, k.chunkTile + 16 * chunk.frame | 2 << 10 | k.chunkBank << 12]);
    const inv = Math.trunc(65536 / IB_SCALE[k.counter]); matrices[k.chunkMatrix] = [inv, 0, 0, inv]; }
  const side = k.attackerSide === "player" ? 1 : -1;
  for (const s of shardsAt(e, k)) attrs.set(s.slot, [(k.targetPic.y - 16 + s.y2 - 4) & 0xff, (k.targetPic.x - 12 * side + s.x2 - 4) & 0x1ff, k.crystalTile + 6 | 2 << 10 | k.crystalBank << 12]);
  const list: Attr[] = []; let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
