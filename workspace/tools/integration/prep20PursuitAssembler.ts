/**
 * prep20: pure source-derived hardware-OAM assembler prototype for MOVE_PURSUIT.
 * hardwareOam[row] = build(sprite state row-1) (VBlank copy lag, measured in all 3 corpora + 2 alternates).
 * Move-owned OAM objects: ONE hit splat (gBasicHitSplatSpriteTemplate: AffineNormal ObjBlend 32x32, priority 2)
 * alive for states 47..56, its affine matrix (constant 372 normal / 303 switchout) in the allocated matrix slot.
 * Battlers: attacker static; target absent from OAM while on monbg (states 5..58).
 */
export type PursuitBranch = "normal" | "switchout";
export interface PursuitKnownEntry {
  /** The 9 leading healthbox/healthbar entries (attr0..2 only; host-provided, NOT consumed by the renderer). */
  readonly healthboxAttr: readonly (readonly [number, number, number])[];
  readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number;
  readonly attackerAttr: readonly [number, number, number]; readonly targetAttr: readonly [number, number, number];
  readonly impactSlot: number; readonly impactMatrixNum: number; readonly impactTile: number; readonly impactPaletteBank: number;
  readonly dummyAttr: readonly [number, number, number];
}
export interface PursuitAssemblerInputs {
  readonly branch: PursuitBranch;
  readonly targetImpactCenter: Readonly<{ x: number; y: number }>;
  readonly known: PursuitKnownEntry;
  readonly spriteOrderAt: (state: number) => readonly number[];
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
const IMPACT_SCALE: Record<PursuitBranch, number> = { normal: 372, switchout: 303 };   // sBasicHitSplat affine anim 2 / 1 end matrix
export const PURSUIT_IMPACT_FIRST = 47, PURSUIT_IMPACT_LAST = 56, PURSUIT_TARGET_HIDDEN_FIRST = 5, PURSUIT_TARGET_HIDDEN_LAST = 58;

export function pursuitMatricesAtState(state: number, input: PursuitAssemblerInputs): number[][] {
  const m = Array.from({ length: 32 }, () => [256, 0, 0, 256]);
  if (state >= PURSUIT_IMPACT_FIRST && state <= PURSUIT_IMPACT_LAST) { const s = IMPACT_SCALE[input.branch]; m[input.known.impactMatrixNum] = [s, 0, 0, s]; }
  return m;
}
export function assemblePursuitHardwareOam(row: number, input: PursuitAssemblerInputs): string[] {
  const state = row - 1, k = input.known;
  const attrs = new Map<number, readonly [number, number, number]>();
  attrs.set(k.attackerSlot, k.attackerAttr);
  if (!(state >= PURSUIT_TARGET_HIDDEN_FIRST && state <= PURSUIT_TARGET_HIDDEN_LAST)) attrs.set(k.targetSlot, k.targetAttr);
  if (state >= PURSUIT_IMPACT_FIRST && state <= PURSUIT_IMPACT_LAST) {
    const x = input.targetImpactCenter.x - 16, y = input.targetImpactCenter.y - 16;
    attrs.set(k.impactSlot, [0x0100 | 0x0400 | y & 0xff, 0x8000 | k.impactMatrixNum << 9 | x & 0x1ff,
      k.impactTile | 2 << 10 | k.impactPaletteBank << 12]);
  }
  const list: (readonly [number, number, number])[] = [];
  let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a);
  }
  while (list.length < 128) list.push(k.dummyAttr);
  const matrices = pursuitMatricesAtState(state, input);
  return list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(matrices[i >> 2]![i & 3]!));
}
