/**
 * prep31: source-derived per-age input model for MOVE_SPIT_UP (255), all three Stockpile-counter branches (counter = request.turn = ROM animTurn - 1 at activation).
 * Script (battle_anim_scripts.s Move_SPIT_UP; a `delay N` puts the next command N + 2 script rows later):
 *   loadspritegfx RED_ORB_2 / IMPACT rows 1 / 4 (OBJ banks 7 / 8); row 7: AnimTask_SpitUpDeformMon (attacker rot-scale, gSpitUpDeformMonAffineAnimCmds) +
 *   AnimTask_ShakeMon2(ATTACKER, 1, 0, 8, 2); delay 45, delay 3 -> wave 1: 8 x gSpitUpOrbSpriteTemplate (angles 0..224 step 32, 12 steps) row 59;
 *   delay 5 -> jumpifmoveturn: counter 2 adds 4 orbs (16, 80, 144, 208), counter 3 adds 8 (16..240 step 32) at nominal row 66; delay 5 -> nominal 73:
 *   AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, 8, 1, 0) + flashing hit splat (-12, +10); delay 5 -> nominal 80: hit splat (+12, -10).
 * Programs: AnimSpitUpOrb (x2 += Sin(a, 10), y2 += Cos(a, 7); destroyed on the 13th step; affine: scale 0x80 then +8 / frame -> matrix 0x10000 / scale),
 *   RunAffineAnimFromTaskData (matrix = [xScale, 0, 0, yScale], y2 = (var - min(var << 8 / yScale, 128)) / 2 with var = 64 - 2 * yDelta), AnimFlashingHitSplat
 *   (invisible ^= 1 per frame, destroyed at data[0] 13; affine anim 1 -> matrix 303), ShakeMon2 / ShakeTargetBasedOnMovePowerOrDmg x2 toggles.
 * M (measured constant, prep29: identical in every scenario): an 8-orb createsprite burst overruns its frame: tasks hold on the burst row (`taskLag`), the
 *   sprites of the burst row are a partial snapshot (the first 4 orbs stepped) and hold on the next row (`spriteLag`); script rows after a burst shift by one.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
type Attr = readonly [number, number, number];
type Side = "player" | "opponent";
const trig = readFileSync(resolve(import.meta.dirname, "../../reference/pokeemerald/src/trig.c"), "utf8");
const SINE = [...trig.slice(trig.indexOf("gSineTable[]"), trig.indexOf("};", trig.indexOf("gSineTable[]"))).matchAll(/Q_8_8\((-?[0-9.]+)\)/g)].map((m) => Math.trunc(Number(m[1]) * 256));
const sin = (a: number, amp: number) => (SINE[a & 0xff]! * amp) >> 8, cos = (a: number, amp: number) => (SINE[(a & 0xff) + 64]! * amp) >> 8;
export interface SpitUpKnown31 {
  readonly counter: 1 | 2 | 3; readonly attackerSide: Side;
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Attr;
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Attr; readonly targetAttr: Attr; readonly attackerMatrix: number;
  readonly attackerXY: Readonly<{ x: number; y: number }>; readonly targetXY: Readonly<{ x: number; y: number }>;
  readonly attackerAnchor: Readonly<{ x: number; y: number }>;   // A: attacker X_2 / Y_PIC_OFFSET (orb origin)
  readonly targetAnchor: Readonly<{ x: number; y: number }>;     // A: target X_2 / Y_PIC_OFFSET (hit splats)
  readonly yDelta: number;                                        // A: GetBattlerYDeltaFromSpriteId of the attacker (pic coords y_offset)
  readonly occupiedSlots: readonly number[]; readonly matrixBitmap: number;
  readonly orb: Readonly<{ tile: number; bank: number; prio: number }>; readonly impact: Readonly<{ tile: number; bank: number; prio: number }>;
}
const WAVE1 = [0, 32, 64, 96, 128, 160, 192, 224], WAVE2 = { 1: [] as number[], 2: [16, 80, 144, 208], 3: [16, 48, 80, 112, 144, 176, 208, 240] } as const;
const DEFORM = [[0, 6, 20], [0, 0, 20], [0, -18, 6], [-18, -18, 3], [0, 0, 15], [4, 4, 13]] as const;
export function spitUpRows(k: SpitUpKnown31) {
  const w2 = WAVE2[k.counter], bursts = [59, ...(w2.length === 8 ? [67] : [])];
  const taskLag = bursts, spriteLag = bursts.map((b) => b + 1);
  const script = (nominal: number) => { let a = nominal; for (const b of bursts) if (b < a) a += 1; return a; };   // a burst row shifts later script rows by one
  return { bursts, taskLag, spriteLag, wave1: 59, wave2: script(66), shakeTarget: script(73), splat2: script(80), rows: k.counter === 3 ? 109 : 108 };
}
/** steps a task / sprite created on `birth` has run by the end of row r (Step runs on the creation row unless noted). */
const stepsSince = (birth: number, r: number, holds: readonly number[]) => r < birth ? 0 : r - birth + 1 - holds.filter((h) => h >= birth && h <= r).length;
export function deformState(r: number, k: SpitUpKnown31) {
  const T = spitUpRows(k), n = stepsSince(7, r, T.taskLag);
  let x = 256, y = 256, left = n, cmd = 0, inCmd = 0;
  for (; cmd < DEFORM.length && left > 0; cmd += 1) { const [dx, dy, dur] = DEFORM[cmd]!; const s = Math.min(left, dur); x += dx * s; y += dy * s; left -= s; if (s < dur) { inCmd = s; break; } }
  const ended = n > 77, varH = 64 - 2 * k.yDelta, v2 = Math.min(Math.trunc((varH << 8) / y), 128);
  return { active: n >= 1 && !ended, ended, xScale: x, yScale: y, y2: n >= 1 && !ended ? Math.trunc((varH - v2) / 2) : 0, d7: cmd, d8: inCmd };
}
/** AnimTask_ShakeMon2(ATTACKER, 1, 0, 8, 2): init x2 = 1 on row 7, toggles every 3rd row from row 8, x2 = 0 after 8 counts. */
export function attackerX2(r: number): number { if (r < 7) return 0; const t = r - 8; if (t < 0) return 1; const toggles = Math.floor(t / 3) + 1; if (toggles >= 8) return 0; return toggles % 2 === 1 ? -1 : 1; }
/** AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, 8, 1, 0), gAnimMovePower 100 -> d15 8, d13 = d14 = 4: +4 / -4 every 2nd row from birth + 1. */
export function targetX2(r: number, birth: number): number { const t = r - birth; if (t < 1) return 0; const toggles = Math.floor((t - 1) / 2) + 1; if (toggles >= 8) return 0; return toggles % 2 === 1 ? 4 : -4; }
export interface SpitUpSprite31 { kind: "orb" | "splat"; slot: number; matrixNum: number; x: number; y: number; x2: number; y2: number; invisible: boolean; scale: number }
export function spitUpSprites(r: number, k: SpitUpKnown31): SpitUpSprite31[] {
  const T = spitUpRows(k), xs = k.attackerSide === "player" ? 1 : -1;
  const births: { kind: "orb" | "splat"; birth: number; angle: number; idx: number; last: number; partial: boolean }[] = [];
  const orbLife = (birth: number, burst: boolean) => { let r2 = birth; for (; r2 < 400; r2 += 1) { const s = burst ? r2 - birth + 1 - T.spriteLag.filter((h) => h >= birth && h <= r2).length : r2 - birth + 1; if (s >= 13) return r2 - 1; } return r2; };
  WAVE1.forEach((a, i) => births.push({ kind: "orb", birth: T.wave1, angle: a, idx: i, last: orbLife(T.wave1, true), partial: true }));
  const w2 = WAVE2[k.counter], burst2 = w2.length === 8;
  w2.forEach((a, i) => births.push({ kind: "orb", birth: T.wave2, angle: a, idx: i, last: orbLife(T.wave2, burst2), partial: burst2 }));
  births.push({ kind: "splat", birth: T.shakeTarget, angle: 0, idx: 0, last: T.shakeTarget + 12, partial: false }, { kind: "splat", birth: T.splat2, angle: 0, idx: 1, last: T.splat2 + 12, partial: false });
  const placed: { slot: number; matrix: number; last: number }[] = [], out: SpitUpSprite31[] = [];
  for (const b of births) {
    const used = new Set(k.occupiedSlots), mused = new Set<number>(); for (const p of placed) if (p.last >= b.birth) { used.add(p.slot); mused.add(p.matrix); }
    let s = 0; while (used.has(s)) s += 1; let m = 0; while ((k.matrixBitmap >> m & 1) || mused.has(m)) m += 1; placed.push({ slot: s, matrix: m, last: b.last });
    if (r < b.birth || r > b.last) continue;
    if (b.kind === "orb") {
      let steps: number;
      if (!b.partial) steps = r - b.birth + 1;
      else if (r === b.birth) steps = b.idx < 4 ? 1 : 0;   // M: partial snapshot of the burst row
      else steps = r - b.birth + 1 - T.spriteLag.filter((h) => h >= b.birth && h <= r).length;
      out.push({ kind: "orb", slot: s, matrixNum: m, x: k.attackerAnchor.x, y: k.attackerAnchor.y, x2: steps * sin(b.angle, 10), y2: steps * cos(b.angle, 7), invisible: false, scale: 0x80 + 8 * steps });
    } else { const n = r - b.birth + 1;
      const [ox, oy] = b.idx === 0 ? [-12, 10] : [12, -10];
      out.push({ kind: "splat", slot: s, matrixNum: m, x: k.targetAnchor.x + xs * ox, y: k.targetAnchor.y + oy, x2: 0, y2: 0, invisible: n % 2 === 1, scale: 0xd8 }); }
  }
  return out.sort((p, q) => p.slot - q.slot);
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
/** hardwareOam[row] = build(sprite state of row - 1); task-written fields (attacker rot-scale + y2, shake x2 steps) as of the previous task run. */
export function assembleSpitUpHardwareOam(row: number, k: SpitUpKnown31, spriteOrderAt: (state: number) => readonly number[]): { oam: string[]; matrices: number[][] } {
  if (spitUpRows(k).spriteLag.includes(row)) return assembleSpitUpHardwareOam(row - 1, k, spriteOrderAt);   // M: the burst frame misses the OAM transfer (hardware repeats)
  const T = spitUpRows(k), state = row - 1, attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  const dPrev = deformState(state - 1, k), dNow = deformState(state, k), ax = k.attackerXY.x + (state === 7 ? 1 : attackerX2(state - 1)), ay = k.attackerXY.y;
  if (state < 7) attrs.set(k.attackerSlot, k.attackerAttr);
  else if (!dPrev.ended) { matrices[k.attackerMatrix] = [dPrev.xScale, 0, 0, dPrev.yScale];
    attrs.set(k.attackerSlot, [0x0300 | (ay + dPrev.y2 - 64) & 0xff, 0xc000 | k.attackerMatrix << 9 | (ax - 64) & 0x1ff, k.attackerAttr[2]]); }
  else attrs.set(k.attackerSlot, [0x0100 | (ay - 32) & 0xff, 0xc000 | k.attackerMatrix << 9 | (ax - 32) & 0x1ff, k.attackerAttr[2]]);
  void dNow;
  const tx = k.targetXY.x + (state === T.shakeTarget ? 0 : targetX2(state - 1, T.shakeTarget));
  attrs.set(k.targetSlot, [k.targetAttr[0], k.targetAttr[1] & ~0x1ff | (tx - 32) & 0x1ff, k.targetAttr[2]]);
  for (const s of spitUpSprites(state, k)) {
    if (s.kind === "orb") { const m = Math.trunc(0x10000 / s.scale); matrices[s.matrixNum] = [m, 0, 0, m];
      attrs.set(s.slot, [0x0300 | (s.y + s.y2 - 8) & 0xff, s.matrixNum << 9 | (s.x + s.x2 - 8) & 0x1ff, k.orb.tile | k.orb.prio << 10 | k.orb.bank << 12]); }
    else { matrices[s.matrixNum] = [303, 0, 0, 303]; if (!s.invisible) attrs.set(s.slot, [0x0100 | (s.y - 16) & 0xff, 0x8000 | s.matrixNum << 9 | (s.x - 16) & 0x1ff, k.impact.tile | k.impact.prio << 10 | k.impact.bank << 12]); }
  }
  const list: Attr[] = []; let health = false;
  for (const slot of spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const at = attrs.get(slot); if (at) list.push(at); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((at, i) => hex4(at[0]) + hex4(at[1]) + hex4(at[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
/** Live tasks (state row r): AnimTask_SpitUpDeformMon (slot 0), AnimTask_ShakeMon2_Step (slot 1, rows 7..28), AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step (slot 1). */
export function spitUpTasks(r: number, k: SpitUpKnown31, deformPtr: readonly [number, number]): { slot: number; callback: string; data: number[] }[] {
  const T = spitUpRows(k), out: { slot: number; callback: string; data: number[] }[] = [], d = deformState(r, k), z = (n: number) => Array(n).fill(0) as number[];
  if (d.active) out.push({ slot: 0, callback: "AnimTask_SpitUpDeformMon", data: [1, ...z(6), d.d7, d.d8, 0, d.xScale, d.yScale, 0, deformPtr[0], deformPtr[1], k.attackerSlot] });
  if (r >= 7 && r <= 28) { const toggles = r < 8 ? 0 : Math.floor((r - 8) / 3) + 1; out.push({ slot: 1, callback: "AnimTask_ShakeMon2_Step", data: [k.attackerSlot, 8 - toggles, 2, r < 8 ? 0 : 2 - (r - 8) % 3, 1, ...z(11)] }); }
  const t = r - T.shakeTarget, tg = (t + 1) >> 1;
  if (t >= 0 && tg < 8) out.push({ slot: 1, callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", data: [t % 2 === 0 ? 1 : 0, 1, 8 - tg, 0, 0, 0, 0, k.targetSlot, 0, 0, 1, 0, tg % 2, 4, 4, 8] });
  return out;
}
