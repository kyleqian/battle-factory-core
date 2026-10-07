/**
 * prep24: source-derived hardware-OAM + hardware-matrix assembler prototype for MOVE_RETURN, strongest branch (friendship 255; Factory-reachable).
 * hardwareOam[row] = build(sprite state of row-1) (prep20 0.1).  Move-owned OAM objects: the attacker (gVerticalDip y2 programs), the target (monbg: absent
 * [UpdateMonBg birth + 1, ClearMonBg - 1]; back at its art attr minus the activation offset), up to 2 gBasicHitSplat (affine matrix 372 / identity), up to 2
 * blended trace clones of the attacker (AnimTask_TraceMonBlended -> CloneBattlerSpriteWithBlend).  gVerticalDip / gSimplePaletteBlend helpers hold slots only.
 * The event schedule is the script's (Move_RETURN ReturnStrongest, battle_anim_scripts.s:8991-9060) as expressed in src/animation/return.ts PROGRAMS.strongest.
 */
export interface ReturnKnown24 {
  readonly healthboxAttr: readonly (readonly [number, number, number])[]; readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number;
  readonly attackerAttr: readonly [number, number, number]; readonly targetAttr: readonly [number, number, number];
  readonly attackerIdleY2: number; readonly targetIdle: Readonly<{ x2: number; y2: number }>;
  readonly impactTile: number; readonly impactBank: number; readonly impactMatrixBase: number[]; /* free matrix ids in ascending order */
  readonly occupiedSlots: readonly number[]; readonly dummyAttr: readonly [number, number, number];
  readonly targetCenter: Readonly<{ x: number; y: number }>;     // BATTLER_COORD_X_2 / Y_PIC_OFFSET of the target (resolved pic anchor)
  readonly xSign: 1 | -1;                                         // InitSpritePosToAnimTarget: x offset negated when the attacker is on the opponent side (y never)
  readonly monbgBirth: number; readonly clearMonbg: number;
}
export interface ReturnAssemblerInputs { readonly known: ReturnKnown24; readonly rows: number; readonly spriteOrderAt: (state: number) => readonly number[]; }
type Attr = readonly [number, number, number];
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
export const RETURN_DIPS = [[24, 16, 1], [60, 12, 1], [94, 8, 1], [120, 4, 1], [135, 4, 2], [157, 4, 3], [172, 4, 3], [187, 4, 3], [202, 4, 3]] as const;   // [start, duration, dy]
export const RETURN_IMPACTS = [[34, 3, -5, 2], [67, -10, -8, 2], [101, -10, -8, 2], [120, -10, -8, 2], [142, -10, -8, 2], [157, 0, 0, 2], [172, 0, 0, 2], [187, 0, 0, 2], [202, 0, 0, 2],
  [217, -10, -8, 0], [225, 10, 10, 0], [233, 3, -5, 0], [241, -5, 3, 0]] as const;                                                     // [start, x, y, anim]
export const RETURN_TRACES = [120, 120, 142, 157, 172, 187, 202] as const;
export const RETURN_BLEND = [11, 264] as const;                                                                                       // gSimplePaletteBlend helper births (12 rows)
const SPLAT_LIFE = { 2: 10, 0: 9 } as const, TRACE_LIFE = 6, BLEND_LIFE = 12;
/** DoVerticalDip + TranslateSpriteLinearById: d steps of +dy, 2 hold rows, d steps of -dy, destroyed 3 rows after the last step (died c + 2d + 3). */
export function dipY2(row: number, c: number, d: number, dy: number): number {
  const k = row - c; if (k < 0) return 0;
  if (k < d) return dy * (k + 1); if (k < d + 2) return dy * d; if (k < 2 * d + 2) return dy * (2 * d + 2 - k - 1); return 0;
}
export function attackerY2At(row: number): number { let y = 0; for (const [c, d, dy] of RETURN_DIPS) y += dipY2(row, c, d, dy); return y; }
interface Life { kind: "dip" | "splat" | "trace" | "blend"; first: number; last: number; order: number; idx: number; slot?: number; matrix?: number }
function lives(): Life[] {
  const out: Life[] = []; let order = 0;
  const add = (kind: Life["kind"], first: number, life: number, idx: number) => out.push({ kind, first, last: first + life - 1, order: order++, idx });
  const events: { f: number; phase: number; kind: Life["kind"]; life: number; idx: number }[] = [];
  RETURN_DIPS.forEach(([c, d], i) => events.push({ f: c, phase: 0, kind: "dip", life: 2 * d + 3, idx: i }));
  RETURN_IMPACTS.forEach(([c, , , a], i) => events.push({ f: c, phase: 1, kind: "splat", life: SPLAT_LIFE[a as 0 | 2], idx: i }));
  RETURN_TRACES.forEach((c, i) => events.push({ f: c, phase: 2, kind: "trace", life: TRACE_LIFE, idx: i }));
  RETURN_BLEND.forEach((c, i) => events.push({ f: c, phase: -1, kind: "blend", life: BLEND_LIFE, idx: i }));
  events.sort((a, b) => a.f - b.f || a.phase - b.phase || a.idx - b.idx);
  for (const e of events) add(e.kind, e.f, e.life, e.idx);
  return out;
}
export function assembleReturnHardwareOam(row: number, input: ReturnAssemblerInputs): { oam: string[]; matrices: number[][] } {
  const state = row - 1, k = input.known, all = lives();
  // lowest-free sprite slots / matrix ids in creation order
  const held: Life[] = [];
  for (const l of all) { const used = new Set(k.occupiedSlots); for (const o of held) if (o.last >= l.first && o.first <= l.first) used.add(o.slot!);
    let s = 0; while (used.has(s)) s += 1; l.slot = s;
    if (l.kind === "splat") { const mu = new Set<number>(); for (const o of held) if (o.kind === "splat" && o.last >= l.first && o.first <= l.first) mu.add(o.matrix!); let m = 0; for (const free of k.impactMatrixBase) { if (!mu.has(free)) { m = free; break; } } l.matrix = m; }
    held.push(l); }
  const attrs = new Map<number, Attr>(), matrices = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  const y2 = attackerY2At(state);
  attrs.set(k.attackerSlot, [k.attackerAttr[0] + y2 - k.attackerIdleY2 & 0xff | k.attackerAttr[0] & ~0xff, k.attackerAttr[1], k.attackerAttr[2]]);
  if (state < k.monbgBirth + 1) attrs.set(k.targetSlot, k.targetAttr);
  else if (state >= k.clearMonbg) attrs.set(k.targetSlot, [k.targetAttr[0] & ~0xff | k.targetAttr[0] - k.targetIdle.y2 & 0xff, k.targetAttr[1] & ~0x1ff | k.targetAttr[1] - k.targetIdle.x2 & 0x1ff, k.targetAttr[2]]);
  for (const l of all) { if (state < l.first || state > l.last) continue;
    if (l.kind === "splat") { const [, x, y, anim] = RETURN_IMPACTS[l.idx]!, cx = k.targetCenter.x + k.xSign * x, cy = k.targetCenter.y + y;
      attrs.set(l.slot!, [0x0100 | 0x0400 | cy - 16 & 0xff, 0x8000 | l.matrix! << 9 | cx - 16 & 0x1ff, k.impactTile | 2 << 10 | k.impactBank << 12]);
      if (anim === 2 && state >= l.first && state <= l.last) matrices[l.matrix!] = [372, 0, 0, 372]; }
    if (l.kind === "trace" && state > l.first) { const cy2 = attackerY2At(l.first); attrs.set(l.slot!, [k.attackerAttr[0] + cy2 - k.attackerIdleY2 & 0xff | 0x0400 | k.attackerAttr[0] & ~0xff, k.attackerAttr[1], k.attackerAttr[2] & ~0xc00 | 2 << 10]); } }
  const list: Attr[] = []; let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a); }
  while (list.length < 128) list.push(k.dummyAttr);
  return { oam: list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!)), matrices };
}
