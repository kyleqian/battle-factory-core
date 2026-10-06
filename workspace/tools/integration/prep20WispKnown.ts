/** prep20 Will-O-Wisp known-entry constants (measured identical, rows >= 1, in all four corpora). */
import { willOWispInputsFor, type WillOWispWindow } from "../compare/verifyWillOWispReducer.ts";
import type { WispKnownEntry } from "./prep20WispAssembler.ts";
type Json = Record<string, any>;
// 9 healthbox/healthbar OAM entries that lead every row (sprites 62,60,0,63,1,61 of the lent order).
export const WISP_HEALTHBOX = ["58409e401c610001", "5840be4020610000", "1e40244024610000", "1e40444028610001", "1e0014002c610001",
  "48007ec01c500000", "4800bec05c500000", "0e400cc09c500001", "0e404cc0bc500001"];
const attr3 = (a: readonly number[]) => [a[0]!, a[1]!, a[2]!] as const;
export function knownFor(window: WillOWispWindow, rows: Json[]): WispKnownEntry {
  const input = willOWispInputsFor(window, rows, 0), player = window === "player-back";
  return { healthboxChunk: WISP_HEALTHBOX, healthboxSlots: [62, 60, 0, 63, 1, 61], occupiedSlots: [0, 1, 2, 6, 8, 60, 61, 62, 63],
    attackerSlot: player ? 6 : 8, targetSlot: player ? 8 : 6, attackerSubpriority: player ? 30 : 40, targetSubpriority: player ? 40 : 30,
    orbTileBase: 537, fireTileBase: 305, orbPaletteBank: 8, firePaletteBank: 7,
    attackerAttr: attr3(input.attackerArt.attr), targetAttr: attr3(input.targetArt.attr), dummyAttr: [0x00a0, 0x0130, 0x0c00] };
}
