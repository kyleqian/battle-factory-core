/**
 * prep20: pure source-derived hardware-OAM + hardware-matrix assembler prototype for MOVE_MEGAHORN.
 * hardwareOam[row] = build(sprite state row-1).  Move-owned OAM objects: attacker (shake / slide-to-offset / slide-to-original x2),
 * one gMegahornHorn (AffineDouble ObjNormal 32x16, linear translation 6 steps, constant rotation matrix 30 / -99, states 94..100),
 * one gBasicHitSplat (AffineNormal ObjBlend 32x32, matrix 3, states 100..108).  Target is on monbg (absent from OAM) states 8..134.
 * BG_DRILL scroll / palette fade / white flash are NOT OAM and are not covered here.
 */
export interface MegahornKnownEntry {
  readonly healthboxAttr: readonly (readonly [number, number, number])[]; readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number;
  readonly attackerAttr: readonly [number, number, number]; readonly targetAttr: readonly [number, number, number];
  readonly hornTile: number; readonly hornPaletteBank: number; readonly impactTile: number; readonly impactPaletteBank: number;
  readonly hornMatrixNum: number; readonly impactMatrixNum: number;
  readonly occupiedSlots: readonly number[]; readonly dummyAttr: readonly [number, number, number];
}
export interface MegahornAssemblerInputs {
  readonly attackerSide: "player" | "opponent";
  /** target battler (x2, y2) at activation (frontIdleRest anchor): SlideMonToOriginalPos / ShakeMonInPlace leave it at (0, 0) after the monbg window */
  readonly targetInitialOffset: Readonly<{ x: number; y: number }>;
  readonly targetPicCenter: Readonly<{ x: number; y: number }>;   // BATTLER_COORD_X_2 / Y_PIC_OFFSET of the target (resolved pic anchor)
  readonly known: MegahornKnownEntry;
  readonly spriteOrderAt: (state: number) => readonly number[];
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
const HORN_FIRST = 94, HORN_LAST = 100, SPLAT_FIRST = 100, SPLAT_LAST = 108, TARGET_HIDDEN_FIRST = 8, TARGET_HIDDEN_LAST = 134;
const SHAKE_FIRST = 48, SLIDE_OUT_FIRST = 89, SLIDE_BACK_FIRST = 122;

/** Attacker x2: AnimTask_ShakeMon (2,0,15,1) cycles, SlideMonToOffset(0,24,..,6), SlideMonToOriginalPos (24<<8)/11 per step. */
export function megahornAttackerX2(state: number, side: "player" | "opponent"): number {
  const sign = side === "player" ? 1 : -1;
  // AnimTask_ShakeMon(args 2,0,15,1) created at state 48: x2 = 2 at creation, then toggles every 2nd frame (15 toggles): x2 = 2 at 48+{0, 3,4, 7,8, ..., 27,28}
  const shake = state - SHAKE_FIRST;
  if (shake === 0 || (shake >= 3 && shake <= 28 && ((shake - 3) & 3) < 2)) return 2;
  if (state >= SLIDE_OUT_FIRST && state < SLIDE_BACK_FIRST) return sign * 4 * Math.min(state - SLIDE_OUT_FIRST + 1, 6);
  if (state >= SLIDE_BACK_FIRST && state < SLIDE_BACK_FIRST + 11) { const step = Math.floor((24 << 8) / 11);
    return (sign * ((24 << 8) - (state - SLIDE_BACK_FIRST + 1) * step)) >> 8; }
  return 0;
}
/** InitAnimLinearTranslation + AnimTranslateLinear: Q8 per-step deltas with a sign flag in the low bit. */
function linear(dx: number, dy: number, duration: number, n: number) {
  const xd = ((Math.abs(dx) << 8) / duration | 0) & 0xffff & ~1 | (dx < 0 ? 1 : 0), yd = ((Math.abs(dy) << 8) / duration | 0) & 0xffff & ~1 | (dy < 0 ? 1 : 0);
  const X = (n * xd) & 0xffff, Y = (n * yd) & 0xffff;
  return { x2: xd & 1 ? -(X >> 8) : X >> 8, y2: yd & 1 ? -(Y >> 8) : Y >> 8 };
}
const ROT = { player: 30, opponent: -99 } as const;     // sAffineAnim_MegahornHorn_0 / _1 (AFFINEANIMCMD_FRAME(0x100,0x100,rot,0))
export function megahornHornMatrix(side: "player" | "opponent"): number[] {
  const radians = (ROT[side] & 0xff) * 2 * Math.PI / 256, c = Math.cos(radians), s = Math.sin(radians);   // HLE ObjAffineSet at unit scale, signed word truncation
  return [Math.trunc(256 * c), Math.trunc(-256 * s), Math.trunc(256 * s), Math.trunc(256 * c)];
}
export function megahornMatricesAtState(state: number, input: MegahornAssemblerInputs): number[][] {
  const m = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  if (state >= HORN_FIRST && state <= HORN_LAST) m[input.known.hornMatrixNum] = megahornHornMatrix(input.attackerSide);
  return m;
}
/** Lowest-free sprite slots over the helper-sprite lifetimes of the body (slide helpers are invisible but hold slots). */
function slots(input: MegahornAssemblerInputs) {
  const life = [["slideA", 89, 95], ["horn", 94, 100], ["splat", 100, 108], ["slideB", 100, 104], ["blend", 110, 121], ["backA", 122, 132], ["backB", 127, 133]] as const;
  const held = new Map<string, number>();
  for (const [name, first] of life) { const used = new Set(input.known.occupiedSlots);
    for (const [other, f, l] of life) if (held.has(other) && f <= first && first <= l) used.add(held.get(other)!);
    let s = 0; while (used.has(s)) s += 1; held.set(name, s); }
  return held;
}
export function assembleMegahornHardwareOam(row: number, input: MegahornAssemblerInputs): { oam: string[]; matrices: number[][] } {
  const state = row - 1, k = input.known, side = input.attackerSide, flip = side === "opponent" ? -1 : 1;
  const attrs = new Map<number, readonly [number, number, number]>();
  const x2 = megahornAttackerX2(state, side);
  attrs.set(k.attackerSlot, [k.attackerAttr[0], k.attackerAttr[1] & ~0x1ff | k.attackerAttr[1] + x2 & 0x1ff, k.attackerAttr[2]]);
  if (state < TARGET_HIDDEN_FIRST) attrs.set(k.targetSlot, k.targetAttr);
  else if (state > TARGET_HIDDEN_LAST) { const o = input.targetInitialOffset;
    attrs.set(k.targetSlot, [k.targetAttr[0] & ~0xff | k.targetAttr[0] - o.y & 0xff, k.targetAttr[1] & ~0x1ff | k.targetAttr[1] - o.x & 0x1ff, k.targetAttr[2]]); }
  const held = slots(input), t = input.targetPicCenter;
  if (state >= HORN_FIRST && state <= HORN_LAST) {
    const sx = t.x - 42 * flip, sy = t.y + 25 * flip, n = Math.min(state - HORN_FIRST + 1, 6), d = linear(t.x - sx, t.y - sy, 6, n);
    attrs.set(held.get("horn")!, [0x4000 | 0x0300 | sy + d.y2 - 16 & 0xff, 0x8000 | k.hornMatrixNum << 9 | sx + d.x2 - 32 & 0x1ff,
      k.hornTile | 2 << 10 | k.hornPaletteBank << 12]);
  }
  if (state >= SPLAT_FIRST && state <= SPLAT_LAST)
    attrs.set(held.get("splat")!, [0x0100 | 0x0400 | t.y - 16 & 0xff, 0x8000 | k.impactMatrixNum << 9 | t.x - 16 & 0x1ff,
      k.impactTile | 2 << 10 | k.impactPaletteBank << 12]);
  const list: (readonly [number, number, number])[] = []; let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a);
  }
  while (list.length < 128) list.push(k.dummyAttr);
  const matrices = megahornMatricesAtState(state, input);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
