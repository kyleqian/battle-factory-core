/**
 * prep26: source-derived hardware-OAM + hardware-matrix assembler prototype for MOVE_REVENGE (279).  hardwareOam[row] = build(sprite state of row-1) (prep20 0.1).
 * Move-owned OAM objects (battle_anim_scripts.s Move_REVENGE): gRevengeSmallScratch (attacker, AnimRevengeScratch, 3 anim cmds x 4 rows), gHorizontalLunge
 * (invisible; its callback drives the ATTACKER battler x2: +4 / row x6, hold, -4 / row), gRevengeBigScratch (target, 2 cmds x 6), 2 gPersistHitSplat
 * (affine anim 1 = scale 0xd8 -> matrix 303, DestroyAnimSpriteAfterTime 8).  Target = monbg (absent [UpdateMonBg birth + 1, ClearMonBg - 1]).
 * Event rows are the script's waits (see the Model header); slots / matrix ids are lowest-free in creation order.
 */
type Attr = readonly [number, number, number];
export interface RevengeKnown26 {
  readonly attackerSide: "player" | "opponent";
  readonly healthboxAttr: readonly Attr[]; readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number; readonly attackerAttr: Attr; readonly targetAttr: Attr; readonly targetIdle: Readonly<{ x2: number; y2: number }>;
  readonly attackerAnchor: Readonly<{ x: number; y: number }>;     // attacker pic anchor (A): small scratch = anchor + (10 xs, -10)
  readonly targetCoord: Readonly<{ x: number; y: number }>;        // target coord anchor (A): big scratch = coord + (10 xs, -10)
  readonly targetPic: Readonly<{ x: number; y: number }>;          // target pic-offset anchor (A): hit splats = pic + (+-10 xs, +-8)
  readonly occupiedSlots: readonly number[]; readonly dummyAttr: Attr;
  readonly scratch: Readonly<{ tile: number; bank: number }>; readonly swipe: Readonly<{ tile: number; bank: number }>; readonly impact: Readonly<{ tile: number; bank: number }>;
  readonly freeMatrices: readonly number[]; readonly monbgBirth: number; readonly clearMonbg: number;
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
export const RV = { SMALL: 7, SMALL_LIFE: 13, LUNGE: 76, LUNGE_LIFE: 15, BIG: 82, BIG_LIFE: 13, SPLAT: [99, 109] as const, SPLAT_LIFE: 18 } as const;
export const xsOf = (side: "player" | "opponent") => (side === "player" ? 1 : -1);
/** HorizontalLunge: attacker x2 (sprite callback, state row): +4 x6 (rows 76..81), hold 82-83, then -4 x5 and 0 at 89. */
export function lungeX2(row: number, side: "player" | "opponent"): number {
  const k = row - RV.LUNGE; let v = 0;
  if (k >= 0 && k <= 5) v = 4 * (k + 1); else if (k >= 6 && k <= 7) v = 24; else if (k >= 8 && k <= 12) v = 24 - 4 * (k - 7); else v = 0;
  return xsOf(side) * v;
}
export interface RevengeLife { kind: "small" | "lunge" | "big" | "splat"; first: number; last: number; slot: number; matrix?: number; idx: number }
export function revengeAllocations(k: RevengeKnown26): RevengeLife[] {
  const ev = [{ kind: "small", first: RV.SMALL, life: RV.SMALL_LIFE, idx: 0 }, { kind: "lunge", first: RV.LUNGE, life: RV.LUNGE_LIFE, idx: 0 }, { kind: "big", first: RV.BIG, life: RV.BIG_LIFE, idx: 0 },
    { kind: "splat", first: RV.SPLAT[0], life: RV.SPLAT_LIFE, idx: 0 }, { kind: "splat", first: RV.SPLAT[1], life: RV.SPLAT_LIFE, idx: 1 }] as const;
  const out: RevengeLife[] = [];
  for (const e of [...ev].sort((a, b) => a.first - b.first)) {
    const used = new Set(k.occupiedSlots); for (const o of out) if (o.last >= e.first) used.add(o.slot);
    let s = 0; while (used.has(s)) s += 1;
    const l: RevengeLife = { kind: e.kind, first: e.first, last: e.first + e.life - 1, slot: s, idx: e.idx };
    if (e.kind === "splat") { const mu = new Set(out.filter((o) => o.kind === "splat" && o.last >= e.first).map((o) => o.matrix!)); l.matrix = k.freeMatrices.find((m) => !mu.has(m))!; }
    out.push(l);
  }
  return out;
}
export interface RevengeAssemblerInputs { readonly known: RevengeKnown26; readonly spriteOrderAt: (state: number) => readonly number[]; }
export function assembleRevengeHardwareOam(row: number, input: RevengeAssemblerInputs): { oam: string[]; matrices: number[][] } {
  const state = row - 1, k = input.known, xs = xsOf(k.attackerSide), flip = k.attackerSide === "player" ? 0 : 1;
  const attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  attrs.set(k.attackerSlot, [k.attackerAttr[0], k.attackerAttr[1] & ~0x1ff | (k.attackerAttr[1] & 0x1ff) + lungeX2(state, k.attackerSide) & 0x1ff, k.attackerAttr[2]]);
  if (state < k.monbgBirth + 1) attrs.set(k.targetSlot, k.targetAttr);
  else if (state >= k.clearMonbg) attrs.set(k.targetSlot, [k.targetAttr[0] & ~0xff | k.targetAttr[0] - k.targetIdle.y2 & 0xff, k.targetAttr[1] & ~0x1ff | k.targetAttr[1] - k.targetIdle.x2 & 0x1ff, k.targetAttr[2]]);
  for (const l of revengeAllocations(k)) { if (state < l.first || state > l.last) continue; const age = state - l.first;
    if (l.kind === "small") { const x = k.attackerAnchor.x + 10 * xs, y = k.attackerAnchor.y - 10, f = age < 3 ? 0 : age < 7 ? 1 : 2;
      attrs.set(l.slot, [y - 16 & 0xff, 0x8000 | (flip ? 0x2000 : 0) | x - 16 & 0x1ff, k.scratch.tile + 16 * f | 2 << 10 | k.scratch.bank << 12]); }
    if (l.kind === "big") { const x = k.targetCoord.x + 10 * xs, y = k.targetCoord.y - 10, f = age < 5 ? 0 : 1;
      attrs.set(l.slot, [y - 32 & 0xff, 0xc000 | (flip ? 0x3000 : 0) | x - 32 & 0x1ff, k.swipe.tile + 64 * f | 2 << 10 | k.swipe.bank << 12]); }
    if (l.kind === "splat") { const [sx, sy] = l.idx === 0 ? [-10, -8] : [10, 8], cx = k.targetPic.x + xs * sx, cy = k.targetPic.y + sy;
      attrs.set(l.slot, [0x0100 | 0x0400 | cy - 16 & 0xff, 0x8000 | l.matrix! << 9 | cx - 16 & 0x1ff, k.impact.tile | 2 << 10 | k.impact.bank << 12]); matrices[l.matrix!] = [303, 0, 0, 303]; } }
  const list: Attr[] = []; let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
