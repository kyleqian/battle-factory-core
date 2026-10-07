/**
 * prep35: MOVE_FLATTER (260) hardware OAM / matrix provider prototype (docs/next-adapters-prep35.md s2), completing prep32 (words, confetti,
 * registers, palettes: prep32FlatterModel.ts). Sprite states come from the production reducer (src/animation/flatter.ts flatterAtAge: the
 * spotlight program + gSpotlightAffineAnimTable matrices, the two VerticalDip target y2 programs, the confetti steps) fed with inputs built
 * here from production-available facts only: species tables (A), the prep32 confetti words from the activation Random2 value (S), the
 * known-entry allocator (K: spotlight tile slot 6 = [305, 64], confetti slot 7 = [433, 12], palette slots 7 / 8, matrix 0) and the lent
 * activation sSpriteOrder (L). The 128-entry OAM is assembled with the merged buildLiveHardwareOam / carryLiveSpriteOrder.
 *
 * Build rule (all 4 windows): script-created sprites are in the build of their creation frame, hardware row r = build of state r - 1,
 * except the confetti burst: the burst is one main-loop iteration spanning the VBlanks of rows 65 / 66 / 67 with no BuildOamBuffer, so
 * hardware rows 66..68 repeat row 65's latch (build of state 64) and row 69 is the build of state 68 (all 38 confetti after one step).
 */
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import { flatterAtAge, type FlatterLiveInputs } from "../../src/animation/flatter.ts";
import { sceneOnBattlerFrontIdleRest } from "../../src/animation/sceneOnPresentation.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "../../src/engine/liveBgSnapshotMoves.ts";
import { KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, buildLiveHardwareOam, carryLiveSpriteOrder, type LiveOamSprite, type OamAttr } from "../../src/engine/liveMoveOamAssembler.ts";
import { coordX, speciesName, yDelta, yWithElevation } from "./prep30Species.ts";
import { flatterConfetti } from "./prep32FlatterModel.ts";

export type Side = "player" | "opponent";
type Mat = readonly [number, number, number, number];
const IDENTITY: Mat = [256, 0, 0, 256];
/** K (equal in the accepted P / O windows' allocator at row 4 and in every window's OAM words). */
export const FL35 = Object.freeze({
  spotlightTileSlot: 6, confettiTileSlot: 7, tileRanges: { 6: [305, 64], 7: [433, 12] } as Record<number, readonly [number, number]>,
  spotlightPaletteSlot: 7, confettiPaletteSlot: 8, spotlightMatrix: 0, sceneOccupied: [0, 1, 2, 6, 8, 60, 61, 62, 63],
  spotlightStart: 49, dipStarts: [51, 63] as const, burstRow: 65, rows: 219,
});
/** A: battler OBJ (spriteCenter + front idle rest x2 for an opponent), side attr2 / subpriority. */
export function battler35(species: number, side: Side) {
  const rest = side === "opponent" ? sceneOnBattlerFrontIdleRest({ species: speciesName(species) }) : { x2: 0, y2: 0 };
  const x = coordX(side), y = side === "player" ? 80 + yDelta(species, side) : yWithElevation(species, side) + yDelta(species, side);
  return { slot: side === "player" ? 6 : 8, subpriority: side === "player" ? 30 : 40, x, y, x2: rest.x2, y2: rest.y2,
    attr: (y2: number): OamAttr => [(y + rest.y2 + y2 - 32) & 0xff, 0xc000 | ((x + rest.x2 - 32) & 0x1ff), side === "player" ? 2417 : 6617] };
}
/** Lowest-free slot after `occupied`. */
const lowestFree = (occupied: Iterable<number>) => { const u = new Set(occupied); let s = 0; while (u.has(s)) s += 1; return s; };

export interface FlatterOamArgs {
  attackerSide: Side; attackerSpecies: number; targetSpecies: number;
  /** L: the host's activation 64-slot sSpriteOrder. S input: the activation gRng2 value (presentation RNG). */
  activationOrder: readonly number[]; activationRng: number;
  /** negative controls */
  noCarry?: boolean; noBurstLatch?: boolean; seedXor?: number; dipShift?: number;
}
/** FlatterLiveInputs for the reducer: everything the sprite programs read (no capture row). */
export function flatterInputs35(a: FlatterOamArgs): FlatterLiveInputs {
  const ts: Side = a.attackerSide === "player" ? "opponent" : "player";
  const at = battler35(a.attackerSpecies, a.attackerSide), tg = battler35(a.targetSpecies, ts);
  const spotlightSlot = lowestFree(FL35.sceneOccupied), dip1 = lowestFree([...FL35.sceneOccupied, spotlightSlot]), dip2 = lowestFree([...FL35.sceneOccupied, spotlightSlot, dip1]);
  // occupied at the burst (row 65): the scene, the spotlight and the second dip (the first is destroyed on row 64)
  const words = flatterConfetti((a.activationRng ^ (a.seedXor ?? 0)) >>> 0, [...FL35.sceneOccupied, spotlightSlot, dip2]);
  const confetti = words.confetti.map((c) => {
    const st = { x: c.side === 0 ? -8 : 248, y: 104, x2: 0, y2: 0, data: [c.data0, c.data1, c.side, 0], flags: 1, callback: "AnimFlatterConfetti_Step" as const };
    return { slot: c.slot, start: FL35.burstRow, end: 97, initial: st, initialized: st, tileOffset: c.tileOffset };
  });
  const bpc = (side: Side) => ({ x: coordX(side), y: side === "player" ? 80 : 40 }); // BATTLER_COORD_X / _Y (sBattlerCoords, no elevation)
  const art = (b: ReturnType<typeof battler35>) => ({ slot: b.slot, attr: b.attr(0), subpriority: b.subpriority, matrixNum: 0, matrix: IDENTITY });
  return {
    attackerSide: a.attackerSide, targetSide: ts, attackerSpecies: speciesName(a.attackerSpecies), targetSpecies: speciesName(a.targetSpecies),
    attackerCenter: { x: at.x, y: at.y }, targetCenter: bpc(ts), targetSpriteOrigin: { x: tg.x, y: tg.y },
    attackerInitialOffset: { x2: at.x2, y2: at.y2 }, targetInitialOffset: { x2: tg.x2, y2: tg.y2 },
    attackerArt: art(at), targetArt: art(tg),
    spotlight: { slot: spotlightSlot, attr: [0, 0, FL35.tileRanges[6]![0] | 2 << 10 | FL35.spotlightPaletteSlot << 12], subpriority: tg.subpriority - 2, matrixNum: FL35.spotlightMatrix },
    verticalDipSlots: [dip1, dip2], confetti: confetti as never, taskSlots: { hardwarePaletteFade: 0 }, spriteOrder: a.activationOrder,
    buffers: { softwareOam: [], hardwareOam: [], softwareMatrices: [], hardwareMatrices: [] }, palette: { unfaded: [], faded: [], hardware: [] }, registers: {},
    resources: { spotlightTag: 10227, confettiTag: 10240, spotlightTileSlot: FL35.spotlightTileSlot, spotlightPaletteSlot: FL35.spotlightPaletteSlot,
      confettiTileSlot: FL35.confettiTileSlot, confettiPaletteSlot: FL35.confettiPaletteSlot, allocator: { tileRanges: Array.from({ length: 64 }, (_, i) => FL35.tileRanges[i] ?? [0, 0]) } },
    audio: { current: null, attackerPan: a.attackerSide === "player" ? -64 : 63, targetPan: ts === "player" ? -63 : 63 },
    liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: a.activationRng, gameplayRng: null, gameplayState: null,
  } as FlatterLiveInputs;
}

/** Hardware row r's build state (-1 = the pre-activation idle build). */
export const flatterBuildState = (r: number, noBurstLatch = false): number => (noBurstLatch ? r - 1 : r >= 66 && r <= 68 ? 64 : r - 1);

export interface FlatterOamRows { inputs: FlatterLiveInputs; oam: string[][]; matrices: Mat[][]; orders: number[][]; tileOffsets: number[] }
export function flatterOamRows35(a: FlatterOamArgs): FlatterOamRows {
  const input = flatterInputs35(a), ts: Side = a.attackerSide === "player" ? "opponent" : "player";
  const at = battler35(a.attackerSpecies, a.attackerSide), tg = battler35(a.targetSpecies, ts);
  const conf = input.confetti as unknown as { slot: number; tileOffset: number }[];
  const scene = KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as unknown as OamAttr, subpriority: s.subpriority, visible: s.slot !== 2 }));
  const healthbox = { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM };
  const build = (f: number): { sprites: LiveOamSprite[]; matrices: Mat[] } => {
    const matrices: Mat[] = Array.from({ length: 32 }, () => IDENTITY);
    const sprites: LiveOamSprite[] = scene.map((s) => ({ ...s, oamY: s.attr[0] & 0xff }));
    const st = f >= 0 ? flatterAtAge(f, input) : null;
    const dy = st ? st.battlers.target.offset.y2 - tg.y2 + (a.dipShift && f >= 51 && f <= 78 ? a.dipShift : 0) : 0;
    for (const [b, y2] of [[at, 0], [tg, dy]] as const) { const attr = b.attr(y2); sprites.push({ slot: b.slot, attr, subpriority: b.subpriority, visible: true, oamY: attr[0] & 0xff }); }
    if (!st) return { sprites, matrices };
    if (st.spotlight) {
      const s = st.spotlight, attr: OamAttr = [0x0b00 | (s.y - 64) & 0xff, 0xc000 | s.matrixNum << 9 | (s.x - 64) & 0x1ff, input.spotlight.attr[2]];
      sprites.push({ slot: s.slot, attr, subpriority: input.spotlight.subpriority, visible: (s.flags & 4) === 0, oamY: attr[0] & 0xff });
      matrices[s.matrixNum] = s.matrix;
    }
    for (const d of st.verticalDips) sprites.push({ slot: d.slot, attr: [160, 304, 0xffff], subpriority: at.subpriority - 2, visible: false, oamY: 160 });
    for (const c of st.confetti) {
      const off = conf.find((k) => k.slot === c.slot)!.tileOffset;
      const attr: OamAttr = [(c.y + c.y2 - 4) & 0xff, (c.x + c.x2 - 4) & 0x1ff, (FL35.tileRanges[7]![0] + off) | 2 << 10 | FL35.confettiPaletteSlot << 12];
      sprites.push({ slot: c.slot, attr, subpriority: 3, visible: true, oamY: attr[0] & 0xff });
    }
    return { sprites, matrices };
  };
  const out: FlatterOamRows = { inputs: input, oam: [], matrices: [], orders: [], tileOffsets: conf.map((c) => c.tileOffset) };
  const sort = (p: readonly number[], k: Parameters<typeof sortGbaSpriteOrder>[1]) => sortGbaSpriteOrder(p, k);
  // order[f] = the carried sort after build f; one pass per executed build (no build inside the burst)
  const orderAfter = new Map<number, number[]>(); let order: readonly number[] = a.activationOrder;
  const builds = [...new Set(Array.from({ length: FL35.rows }, (_, r) => flatterBuildState(r, a.noBurstLatch)))].filter((f) => f >= 0).sort((x, y) => x - y);
  orderAfter.set(-1, [...order]);
  for (const f of builds) { if (!a.noCarry) order = carryLiveSpriteOrder(order, build(f).sprites, sort); orderAfter.set(f, [...order]); }
  for (let r = 0; r < FL35.rows; r += 1) {
    const f = flatterBuildState(r, a.noBurstLatch), b = build(f);
    out.oam.push(buildLiveHardwareOam(orderAfter.get(f)!, b.sprites, healthbox, b.matrices));
    out.matrices.push(b.matrices); out.orders.push(orderAfter.get(f)!);
  }
  return out;
}
