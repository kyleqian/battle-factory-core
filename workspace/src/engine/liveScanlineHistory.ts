/**
 * scan93: the presentation-only scanline-buffer history (docs/next-adapters-scan93.md). gScanlineEffect + gScanlineEffectRegBuffers at an
 * animation body's activation, folded over the battle's earlier bodies (ROM-proven on 22 scenarios x2 fresh, 67/67 known activations):
 *   - the battle starts at the intro residue FIRST_BODY_SCANLINE (canonical: srcBuffer 1; the measured srcBuffer-0 form is the same
 *     buffers relabelled, display-neutral: every HBlank DMA reads banks[srcBuffer] and flips);
 *   - a body whose script never touches the scanline effect leaves it unchanged;
 *   - Move_EXTRASENSORY is modelled (both banks over the target window; srcBuffer parity unchanged after 3 x 24 active VBlanks);
 *   - every other writer (Memento, Dragon Dance, Rapid Spin, Acid Armor, Dig, Surf / Muddy Water, Spite, Sketch), a party menu, a skipped
 *     resolution or a faint / switch after an Extrasensory body (its window geometry is the then-current target) invalidates it.
 * The host carries the attacker sides of the Extrasensory bodies so far (null = invalidated); it never touches gameplay.
 */
import enemyElevations from "../data/gen/enemy-mon-elevations.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export type LiveScanlineSide = "player" | "opponent";
/** Attacker sides of the Extrasensory bodies since the battle began; null = invalidated (consumers of a history decline). */
export type LiveScanlineHistory = readonly LiveScanlineSide[] | null;
export type LiveScanlineEntry = Readonly<{ state: number; srcBuffer: number; dmaDest: number; buffers: readonly (readonly number[])[] }>;

/** Move ids whose bodies write the scanline effect but are not modelled (pret source table, scan93). */
export const LIVE_SCANLINE_UNMODELLED_WRITER_MOVE_IDS: ReadonlySet<number> = new Set([262, 349, 229, 151, 91, 57, 330, 180, 166]);
const SCANLINE_INVALIDATING_EVENTS: ReadonlySet<string> = new Set(["faint", "switch-out", "forced-switch-out", "switch-in-start", "next-mon-send-out"]);

export function applyLiveScanlineHistoryEvent(
  history: LiveScanlineHistory, event: Readonly<{ kind: string; moveId?: number; attackerSide?: LiveScanlineSide }>,
): LiveScanlineHistory {
  if (history === null) return null;
  if (event.kind === "move-animation" && event.moveId === 326 && event.attackerSide !== undefined) return Object.freeze([...history, event.attackerSide]);
  if (event.kind === "move-animation" && event.moveId !== undefined && LIVE_SCANLINE_UNMODELLED_WRITER_MOVE_IDS.has(event.moveId)) return null;
  if (history.length > 0 && SCANLINE_INVALIDATING_EVENTS.has(event.kind)) return null;
  return history;
}

const sine = (i: number) => (i < 320 ? GBA_SINE_TABLE_256[i & 0xff]! : 0);
const SPRITE_X: Record<LiveScanlineSide, number> = { player: 72, opponent: 176 };

/** The scanline entry after the history's Extrasensory bodies (target species per side = the current, unchanged since). */
export function liveScanlineEntry(
  entry: LiveScanlineEntry, history: readonly LiveScanlineSide[], speciesOf: (side: LiveScanlineSide) => string,
): LiveScanlineEntry {
  let s = entry;
  for (const attackerSide of history) {
    const targetSide: LiveScanlineSide = attackerSide === "player" ? "opponent" : "player";
    const y = targetSide === "opponent" ? 40 - ((enemyElevations as Readonly<Record<string, number>>)[speciesOf(targetSide)] ?? 0) : 80;
    const lo = Math.max(0, y - 32), hi = y + 32, bgX0 = 32 - SPRITE_X[targetSide];
    const banks = [[...s.buffers[0]!], [...s.buffers[1]!]];
    for (const [step, shift, phase] of [[2, 5, 64], [2, 5, 192], [4, 4, 0]] as const) {
      for (let i = lo; i <= lo + 64; i += 1) { banks[0]![i] = bgX0; banks[1]![i] = bgX0; }
      for (let j = 0; j <= 23; j += 1) {
        let k = phase;
        for (let i = lo; i <= hi; i += 1) {
          let v = sine(k) >> shift;
          if (v > 0) v += j & 3; else if (v < 0) v -= j & 3;
          banks[0]![i] = bgX0 + v; banks[1]![i] = bgX0 + v; k += step;
        }
      }
    }
    s = Object.freeze({ state: 0, srcBuffer: s.srcBuffer, dmaDest: targetSide === "opponent" ? 0x4000014 : 0x4000018, buffers: Object.freeze(banks) });
  }
  return s;
}
