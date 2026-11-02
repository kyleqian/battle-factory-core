// S11 aud240a: screen sound-effect emitters. Write-only presentation (src/audio/soundEvents.ts):
// nothing here reads engine state or changes a branch's outcome.
import { emitSound } from "../audio/soundEvents.ts";

/** SE_SELECT (include/constants/songs.h), pan-less `PlaySE`. */
export const SE_SELECT = 5;

/** One `PlaySE(SE_SELECT)` on the tick being collected. */
export function playSelectSe(): void {
  emitSound({ kind: "se", id: SE_SELECT, pan: null });
}
