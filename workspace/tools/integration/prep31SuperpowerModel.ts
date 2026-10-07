/**
 * prep31: source-derived per-age input model for MOVE_SUPERPOWER (276): sprite programs, hardware OAM + matrices (prep20 / prep26 assembler shape:
 * hardwareOam[row] = build(sprite state of row - 1)), registers, battleBg, hardware / faded / unfaded palettes, live tasks, target x2.
 *
 * Script (battle_anim_scripts.s Move_SUPERPOWER) -> rows (row = snapshot after frame `row`; a `delay N` puts the next command N + 2 rows later):
 *   loadspritegfx CIRCLE_OF_LIGHT / METEOR / FLAT_ROCK rows 1 / 4 / 7 (OBJ banks 7 / 8 / 9: unfaded + faded that row, hardware one row later)
 *   monbg ANIM_ATK_PARTNER row 10 (attacker -> BG2 for PLAYER_LEFT, BG1 for OPPONENT_LEFT; palette copy, Task_UpdateMonBg), splitbgprio + setalpha 12,8 +
 *   orb row 13; delay 20 -> shake_mon_or_platform (4, 1, 180, SHAKE_BG_Y) row 35; delay 40 -> rocks rows 77 / 87 / 97 / 107 / 117 (delay 8 each);
 *   delay 74 -> fireball row 193; delay 16 -> AnimTask_ShakeMon2(target, 8, 0, 16, 1) row 211; waitforvisualfinish -> clearmonbg row 242, blendoff.
 * Sprite programs (battle_anim_fight.c): AnimSuperpowerOrb(_Step) (affine sAffineAnim_SuperpowerOrb: set 0x20, +4 x64, then -6 x8 / +6 x8 forever;
 *   data[0]++ until 180 -> SetGpuReg(BLDCNT, 0) + AnimTranslateLinear 16 steps to the target -> DestroySpriteAndMatrix), AnimSuperpowerRock
 *   (Step1: y = (120 << 8 - speed * n) >> 8 for `arg3` frames, then Step2: (x, y) << 4 += (target - attacker) per frame, destroy when x + 8 > 256 (u16),
 *   y < -8 or y > 120), AnimSuperpowerFireball (AnimTranslateLinear 16 steps, HFLIP|VFLIP when the target is on the player side).
 *   AnimShakeMonOrBattlePlatforms (battle_anim_normal.c): gBattle_BG3_Y += velocity every 2nd frame, velocity negated, 180 frames, then restored.
 */
type Attr = readonly [number, number, number];
type Side = "player" | "opponent";
export interface SuperpowerKnown31 {
  readonly attackerSide: Side;
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[]; readonly dummyAttr: Attr;
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Attr; readonly targetAttr: Attr;
  readonly attackerIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>; readonly targetIdle: Readonly<{ x: number; y: number; x2: number; y2: number }>;
  readonly attackerAnchor: Readonly<{ x: number; y: number }>;   // A: attacker BATTLER_COORD_X_2 / Y_PIC_OFFSET
  readonly targetAnchor: Readonly<{ x: number; y: number }>;     // A: target  BATTLER_COORD_X_2 / Y_PIC_OFFSET
  readonly occupiedSlots: readonly number[]; readonly freeMatrix: number;   // K: lowest free bit of the activation matrixBitmap
  readonly orb: Readonly<{ tile: number; bank: number; prio: number }>; readonly rock: Readonly<{ tile: number; bank: number; prio: number }>;
  readonly meteor: Readonly<{ tile: number; bank: number; prio: number }>;
}
export interface SuperpowerModelKnown31 {
  readonly rows: number; readonly registers0: Readonly<Record<string, number>>; readonly bodyWin: Readonly<{ win0h: number; win0v: number }>;
  readonly palette0: readonly number[]; readonly faded0: readonly number[]; readonly unfaded0: readonly number[];
  readonly attackerBattler: number; readonly targetBattler: number;
  readonly orbPalette: readonly number[]; readonly meteorPalette: readonly number[]; readonly rockPalette: readonly number[];
  readonly phase: Readonly<{ monbgCntRow: number }>;               // T (CPU phase): 10 or 11
  readonly oam: SuperpowerKnown31;
}
const after = (row: number, delay: number) => row + delay + 2;
export const SP = (() => {
  const LOAD = [1, 4, 7] as const, MONBG = 10, ORB = 13, SHAKE = after(ORB, 20), ROCK0 = after(SHAKE, 40);
  const ROCKS = [0, 1, 2, 3, 4].map((i) => ROCK0 + i * after(0, 8));
  const FIREBALL = after(ROCKS[4]!, 74), SHAKEMON = after(FIREBALL, 16);
  return { LOAD, MONBG, ORB, SHAKE, ROCKS, FIREBALL, SHAKEMON, CLEAR: 242, ROWS: 248 } as const;
})();
/** createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, x, speed, tileIndex, frames */
export const ROCK_ARGS = [[200, 96, 1, 120], [20, 248, 4, 112], [130, 160, 2, 104], [160, 192, 0, 96], [60, 288, 3, 88]] as const;
const s16 = (v: number) => (v << 16) >> 16;
export interface SpSprite { kind: "orb" | "shake" | "rock" | "fireball"; idx: number; slot: number; x: number; y: number; x2: number; y2: number; data: number[]; callback: string; scale?: number }
/** orb affine scale at state row r (r >= ORB): k = r - ORB + 1 steps of sAffineAnim_SuperpowerOrb. */
export function orbScale(r: number): number {
  const k = r - SP.ORB + 1; if (k <= 64) return 0x20 + 4 * k;
  const p = (k - 65) % 16; return p < 8 ? 0x120 - 6 * (p + 1) : 0xf0 + 6 * (p - 7);
}
const linear = (from: number, to: number) => { const d = to - from, q = ((Math.abs(d) << 8) / 16) & 0xffff; return d < 0 ? q | 1 : q & ~1; };
const linearStep = (q: number, j: number) => { const acc = (q * j) & 0xffff; return q & 1 ? -(acc >> 8) : acc >> 8; };
/** All move-owned sprites alive in the state of row r (slots lowest-free in creation order). */
export function superpowerSprites(r: number, k: SuperpowerKnown31): SpSprite[] {
  const a = k.attackerAnchor, t = k.targetAnchor, out: SpSprite[] = [];
  const life: { kind: SpSprite["kind"]; idx: number; first: number; last: number }[] = [];
  life.push({ kind: "orb", idx: 0, first: SP.ORB, last: SP.ORB + 196 });                 // data[0] reaches 180 at ORB + 179, +16 steps, destroyed on the next frame
  life.push({ kind: "shake", idx: 0, first: SP.SHAKE, last: SP.SHAKE + 179 });
  const rockLast = ROCK_ARGS.map(([x, speed, , frames], i) => {
    const R = SP.ROCKS[i]!; let y = 120;
    for (let n = 1; n <= frames; n += 1) { y = ((120 << 8) - speed * n) >> 8; if (y < -8) return R + n - 1; }
    let X = x << 4, Y = y << 4; for (let m = 1; m < 400; m += 1) { X = s16(X + (t.x - a.x)); Y = s16(Y + (t.y - a.y)); const sx = X >> 4, sy = Y >> 4; if (((sx + 8) & 0xffff) > 256 || sy < -8 || sy > 120) return R + frames + m - 1; }
    return 9999; });
  ROCK_ARGS.forEach((_, i) => life.push({ kind: "rock", idx: i, first: SP.ROCKS[i]!, last: rockLast[i]! }));
  life.push({ kind: "fireball", idx: 0, first: SP.FIREBALL, last: SP.FIREBALL + 16 });
  const slots = new Map<string, number>(); const placed: { slot: number; last: number }[] = [];
  for (const l of [...life].sort((p, q) => p.first - q.first)) { const used = new Set(k.occupiedSlots); for (const o of placed) if (o.last >= l.first) used.add(o.slot);
    let s = 0; while (used.has(s)) s += 1; placed.push({ slot: s, last: l.last }); slots.set(`${l.kind}${l.idx}`, s); }
  for (const l of life) { if (r < l.first || r > l.last) continue; const slot = slots.get(`${l.kind}${l.idx}`)!;
    if (l.kind === "orb") { const n = r - SP.ORB + 1; const qx = linear(a.x, t.x), qy = linear(a.y, t.y);
      if (n < 180) out.push({ kind: "orb", idx: 0, slot, x: a.x, y: a.y, x2: 0, y2: 0, data: [n, 12, 8, 0], callback: "AnimSuperpowerOrb_Step", scale: orbScale(r) });
      else { const j = Math.min(n - 180, 16); out.push({ kind: "orb", idx: 0, slot, x: a.x, y: a.y, x2: linearStep(qx, j), y2: linearStep(qy, j), data: [16 - j, qx, qy, (qx * j) & 0xffff, (qy * j) & 0xffff].map(s16), callback: n - 180 > 16 ? "DestroySpriteAndMatrix" : "AnimTranslateLinear_WithFollowup", scale: orbScale(r) }); } }
    if (l.kind === "shake") { const steps = r - SP.SHAKE + 1, applied = steps >> 1;   // Step also runs in the creation frame; every 2nd Step applies
      out.push({ kind: "shake", idx: 0, slot, x: t.x, y: t.y, x2: 0, y2: 0, data: [applied % 2 === 0 ? -4 : 4, steps % 2 === 1 ? 0 : 1, 1, 180 - steps], callback: "AnimShakeMonOrBattlePlatforms_Step" }); }
    if (l.kind === "rock") { const [x, speed, , frames] = ROCK_ARGS[l.idx]!; const n = r - l.first + 1;
      if (n <= frames) { const acc = (120 << 8) - speed * n; out.push({ kind: "rock", idx: l.idx, slot, x, y: acc >> 8, x2: 0, y2: 0, data: [frames - n, 0, 0, 0, s16(acc & 0xffff), acc >> 16, speed], callback: "AnimSuperpowerRock_Step1" }); }
      else { const y0 = ((120 << 8) - speed * frames) >> 8, m = n - frames - 1; const X = s16((x << 4) + m * (t.x - a.x)), Y = s16((y0 << 4) + m * (t.y - a.y));
        out.push({ kind: "rock", idx: l.idx, slot, x: X >> 4, y: Y >> 4, x2: 0, y2: 0, data: [t.x - a.x, t.y - a.y, X, Y], callback: "AnimSuperpowerRock_Step2" }); } }
    if (l.kind === "fireball") { const jj = r - SP.FIREBALL + 1, j = Math.min(jj, 16); const qx = linear(a.x, t.x), qy = linear(a.y, t.y);
      out.push({ kind: "fireball", idx: 0, slot, x: a.x, y: a.y, x2: linearStep(qx, j), y2: linearStep(qy, j), data: [16 - j, qx, qy, (qx * j) & 0xffff, (qy * j) & 0xffff].map(s16), callback: jj > 16 ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup" }); } }
  return out.sort((p, q) => p.slot - q.slot);
}
/** AnimTask_ShakeMon2(target, 8, 0, 16, 1): the creation frame toggles once; x2 = -8 / +8 every 2nd frame; 15 toggles, then 0 (state row). */
export function targetX2(r: number): number { const j = r - SP.SHAKEMON; if (j < 0 || j >= 30) return 0; return (j >> 1) % 2 === 0 ? -8 : 8; }
/** gBattle_BG3_Y (state row): the shake sprite applies velocity on every 2nd Step from SHAKE + 1, restores 0 when its 180-frame timer runs out. */
export function bg3Y(r: number): number { const steps = r - SP.SHAKE + 1; if (steps < 1 || steps > 180) return 0; return (steps >> 1) % 2 === 1 ? -4 : 0; }
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
export function assembleSuperpowerHardwareOam(row: number, k: SuperpowerKnown31, spriteOrderAt: (state: number) => readonly number[]): { oam: string[]; matrices: number[][] } {
  const state = row - 1, attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  const flipFireball = k.attackerSide === "opponent" ? 0x3000 : 0;   // target on the player side -> HFLIP | VFLIP
  if (state < SP.MONBG + 1) attrs.set(k.attackerSlot, k.attackerAttr);
  else if (state >= SP.CLEAR) attrs.set(k.attackerSlot, [k.attackerAttr[0] & ~0xff | k.attackerAttr[0] - k.attackerIdle.y2 & 0xff, k.attackerAttr[1] & ~0x1ff | k.attackerAttr[1] - k.attackerIdle.x2 & 0x1ff, k.attackerAttr[2]]);
  const tx2 = state === SP.SHAKEMON ? 8 : targetX2(state - 1);   // createvisualtask runs the init (x2 = arg1 = 8) before BuildOamBuffer, every Step (RunTasks) after it
  attrs.set(k.targetSlot, [k.targetAttr[0], k.targetAttr[1] & ~0x1ff | (k.targetAttr[1] & 0x1ff) + tx2 - k.targetIdle.x2 & 0x1ff, k.targetAttr[2]]);
  for (const s of superpowerSprites(state, k)) {
    if (s.kind === "orb") { const m = Math.trunc(0x10000 / s.scale!); matrices[k.freeMatrix] = [m, 0, 0, m];
      attrs.set(s.slot, [0x0700 | (s.y + s.y2 - 64) & 0xff, 0xc000 | k.freeMatrix << 9 | (s.x + s.x2 - 64) & 0x1ff, k.orb.tile | k.orb.prio << 10 | k.orb.bank << 12]); }
    if (s.kind === "rock") attrs.set(s.slot, [(s.y - 8) & 0xff, 0x4000 | (s.x - 8) & 0x1ff, k.rock.tile + 4 * ROCK_ARGS[s.idx]![2] | k.rock.prio << 10 | k.rock.bank << 12]);
    if (s.kind === "fireball") attrs.set(s.slot, [(s.y + s.y2 - 32) & 0xff, 0xc000 | flipFireball | (s.x + s.x2 - 32) & 0x1ff, k.meteor.tile | k.meteor.prio << 10 | k.meteor.bank << 12]);
  }
  const list: Attr[] = []; let health = false;
  for (const slot of spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const at = attrs.get(slot); if (at) list.push(at); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((at, i) => hex4(at[0]) + hex4(at[1]) + hex4(at[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
export interface SuperpowerRow31 { registers: Record<string, number>; battleBg: Record<string, number>; hardwarePalette: number[]; fadedPalette: number[]; unfadedPalette: number[];
  tasks: { slot: number; callback: string; data: number[] }[]; targetX2: number }
export function superpowerModel(m: SuperpowerModelKnown31): SuperpowerRow31[] {
  const o = m.oam, player = o.attackerSide === "player", bg = player ? "bg2" : "bg1", BG = player ? "gBattle_BG2" : "gBattle_BG1", monbgBank = player ? 9 : 8, objBank = 16 + m.attackerBattler;
  const ax = o.attackerIdle.x + o.attackerIdle.x2, ay = o.attackerIdle.y + o.attackerIdle.y2, bgX0 = 32 - ax, bgY0 = 32 - ay;
  const banks = [[7, m.orbPalette], [8, m.meteorPalette], [9, m.rockPalette]] as const;
  const rows: SuperpowerRow31[] = []; const unfaded = [...m.unfaded0], faded = [...m.faded0]; let prevBg: Record<string, number> = {}, prevFaded = [...m.palette0];
  for (let r = 0; r < m.rows; r += 1) {
    SP.LOAD.forEach((lr, i) => { if (r === lr) { const [bank, pal] = banks[i]!; for (let c = 0; c < 16; c += 1) { unfaded[(16 + bank) * 16 + c] = pal[c]!; faded[(16 + bank) * 16 + c] = pal[c]!; } } });
    if (r === SP.MONBG) for (let c = 0; c < 16; c += 1) { unfaded[monbgBank * 16 + c] = faded[objBank * 16 + c]!; faded[monbgBank * 16 + c] = faded[objBank * 16 + c]!; }
    const hw = r === 0 ? [...m.palette0] : [...prevFaded]; if (r >= SP.MONBG) for (let c = 0; c < 16; c += 1) hw[monbgBank * 16 + c] = faded[monbgBank * 16 + c]!;
    const bb: Record<string, number> = { gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0, gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: bg3Y(r) };
    if (r >= SP.MONBG && r < SP.CLEAR + 3) { bb[`${BG}_X`] = bgX0; bb[`${BG}_Y`] = bgY0; }
    const reg: Record<string, number> = { ...m.registers0 };
    if (r >= 1) { reg.win0h = m.bodyWin.win0h; reg.win0v = m.bodyWin.win0v; }
    if (r >= m.phase.monbgCntRow) reg[`${bg}cnt`] = (m.registers0[`${bg}cnt`]! & ~0xc003 | 0x4000 | 2) & 0xffff;
    if (r >= 1) { const early = r === SP.MONBG && m.phase.monbgCntRow === SP.MONBG, src = early ? bb : prevBg;   // T: with the BGnCNT write on the monbg row the init writes hofs / vofs of the same row
      reg[`${bg}hofs`] = (src[`${BG}_X`] ?? 0) & 0x1ff; reg[`${bg}vofs`] = (src[`${BG}_Y`] ?? 0) & 0x1ff; reg.bg3vofs = (prevBg.gBattle_BG3_Y ?? 0) & 0x1ff; }
    if (player && r >= SP.ORB) reg.bg1cnt = m.registers0.bg1cnt! & ~3 | 1;   // splitbgprio(ATTACKER) for PLAYER_LEFT: BG1 priority 1, BG2 priority 2
    if (r >= SP.ORB && r < SP.CLEAR) reg.bldalpha = 8 << 8 | 12;
    if (r >= SP.ORB && r < SP.ORB + 179) reg.bldcnt = 0x3f40;
    const tasks: SuperpowerRow31["tasks"] = []; const j = r - SP.SHAKEMON;
    if (j >= 0 && j < 30) tasks.push({ slot: 0, callback: "AnimTask_ShakeMon2_Step", data: [o.targetSlot, 15 - (j >> 1), 1, 1 - (j & 1), 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= SP.CLEAR && r <= SP.CLEAR + 2) tasks.push({ slot: 0, callback: "Task_ClearMonBg", data: [0, r === SP.CLEAR ? 1 : 2, m.attackerBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    if (r >= SP.MONBG && r <= SP.CLEAR + 2) tasks.push({ slot: 1, callback: "Task_UpdateMonBg", data: [o.attackerSlot, ax, ay, bgX0, bgY0, player ? 1 : 0, m.attackerBattler, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    rows.push({ registers: reg, battleBg: bb, hardwarePalette: hw, fadedPalette: faded.slice(), unfadedPalette: unfaded.slice(), tasks: tasks.sort((p, q) => p.slot - q.slot), targetX2: targetX2(r) });
    prevBg = bb; prevFaded = faded.slice();
  }
  return rows;
}
