/**
 * prep20: pure source-derived hardware-OAM assembler prototype for MOVE_FURY_CUTTER (one body).
 * hardwareOam[row] = build(sprite state row-1).  Move-owned OAM: ONE gCuttingSliceSpriteTemplate sprite
 * (AffineOff ObjBlend 32x32, priority 2) alive states 7..30; the gComplexPaletteBlend "sprite" is invisible (no OAM).
 * AnimCuttingSlice / AnimSlice_Step are replayed exactly (data[1..5] Q8 integration, hFlip for the Right branch).
 * Counter 5 is the counter-3 body (same script, direction = counter & 1) -> pass `rightHit` explicitly.
 */
export interface FuryCutterKnownEntry {
  readonly healthboxAttr: readonly (readonly [number, number, number])[];
  readonly healthboxSlots: readonly number[];
  readonly attackerSlot: number; readonly targetSlot: number;
  readonly attackerAttr: readonly [number, number, number]; readonly targetAttr: readonly [number, number, number];
  readonly occupiedSlots: readonly number[]; readonly cutTileBase: number; readonly cutPaletteBank: number;
  readonly dummyAttr: readonly [number, number, number];
}
export interface FuryCutterAssemblerInputs {
  readonly rightHit: boolean;                                   // AnimTask_IsFuryCutterHitRight: furyCutterCounter & 1
  readonly targetSide: "player" | "opponent";
  readonly known: FuryCutterKnownEntry;
  readonly spriteOrderAt: (state: number) => readonly number[];
}
const hex4 = (v: number) => ((v & 0xff) << 8 | v >> 8 & 0xff).toString(16).padStart(4, "0");
/** sBattlerCoords[singles] (battle_anim_mons.c): GetBattlerSpriteCoord(BATTLER_COORD_X / BATTLER_COORD_Y) is this static table, not the live sprite. */
export const SINGLES_BATTLER_COORDS = { player: { x: 72, y: 80 }, opponent: { x: 176, y: 40 } } as const;
export const FURY_SLICE_FIRST = 7, FURY_SLICE_LAST = 30, FURY_TARGET_HIDDEN_FIRST = 5, FURY_TARGET_HIDDEN_LAST = 32;

export function furySliceAtState(state: number, input: FuryCutterAssemblerInputs) {
  if (state < FURY_SLICE_FIRST || state > FURY_SLICE_LAST) return null;
  const L = state - FURY_SLICE_FIRST, steps = Math.min(L + 1, 20);       // AnimSlice_Step runs 20 times, then WaitAnimForDuration(3)
  let d1 = input.rightHit ? 0x400 : -0x400, d2 = 0x400, d3 = 0, d4 = 0;
  for (let i = 0; i < steps; i += 1) { d3 += d1; d4 += d2; d1 += input.rightHit ? -0x18 : 0x18; d2 -= 0x18; }
  const c = SINGLES_BATTLER_COORDS[input.targetSide], x = c.x + (input.rightHit ? -40 : 40), y = c.y + (input.targetSide === "player" ? 8 : 0) - 32;
  const frame = Math.min(3, Math.floor((L + 1) / 5));                    // ANIMCMD_FRAME(0/16/32/48, 5), first frame 4 rows, last frame held
  return { L, x, y, x2: d3 >> 8, y2: d4 >> 8, tile: input.known.cutTileBase + frame * 16 };
}
export function assembleFuryCutterHardwareOam(row: number, input: FuryCutterAssemblerInputs): string[] {
  const state = row - 1, k = input.known;
  const attrs = new Map<number, readonly [number, number, number]>();
  attrs.set(k.attackerSlot, k.attackerAttr);
  if (!(state >= FURY_TARGET_HIDDEN_FIRST && state <= FURY_TARGET_HIDDEN_LAST)) attrs.set(k.targetSlot, k.targetAttr);
  const slice = furySliceAtState(state, input);
  if (slice) {
    let slot = 0; while (k.occupiedSlots.includes(slot)) slot += 1;       // lowest-free (known-entry allocator)
    attrs.set(slot, [0x0400 | slice.y + slice.y2 - 16 & 0xff, 0x8000 | (input.rightHit ? 0x1000 : 0) | slice.x + slice.x2 - 16 & 0x1ff,
      slice.tile | 2 << 10 | k.cutPaletteBank << 12]);
  }
  const list: (readonly [number, number, number])[] = []; let health = false;
  for (const slot of input.spriteOrderAt(state)) {
    if (k.healthboxSlots.includes(slot)) { if (!health) { list.push(...k.healthboxAttr); health = true; } continue; }
    const a = attrs.get(slot); if (a) list.push(a);
  }
  while (list.length < 128) list.push(k.dummyAttr);
  const ident = [256, 0, 0, 256];                                         // no affine sprite in this move: hardware matrices stay identity
  return list.map((a, i) => hex4(a[0]) + hex4(a[1]) + hex4(a[2]) + hex4(ident[i & 3]!));
}
