// lbr-g (ISSUES #221 E1 + E2 + E3): the gameplay RNG draws of a challenge-ending battle's return to the Lobby, in Random() calls per tick.
// Evidence: docs/lbw1-lobby-wander-evidence.md (lbw1 + lbw2 + lbr-g). Ages are PostwinState.elapsed after the tick; 43 is the ROM exit frame.
import { POSTWIN_IN_BATTLE_CLEAR_AGE } from "./postwin.ts";

/** Postwin age of the Lobby CB2_LoadMap's `entry + 3` tick (the `entry + 4` tick is the next age); the forfeit return is one tick shorter. */
export const BATTLE_EXIT_LOBBY_LOAD_AGE = 105;
export const BATTLE_EXIT_LOBBY_LOAD_AGE_FORFEIT = 104;

/**
 * Random() calls in the tick that leaves the postwin age `age - 1` for `age`, on a return to the Lobby (loss, forfeit, 7th win).
 *
 * E1: main.c:366 `VBlankIntr` draws only when `!gMain.inBattle`, and `inBattle` stays set until `ReturnFromBattleToOverworld`
 * (battle_main.c:5217-5230), so ages below 43 draw nothing.
 * E2: age 43 is that frame: `RandomlyGivePartyPokerus` + `PartySpreadPokerus` (battle_main.c:5221-5222, 2 draws; the VBlank of that frame is
 * still suppressed). Ages 45 / 46: `CB2_ReturnToFieldLocal` -> `ReturnToFieldLocal` -> `ResetMirageTowerAndSaveBlockPtrs` ->
 * `MoveSaveBlocks_ResetHeap` (load_save.c:74,129; overworld.c:2074): 1 draw in `SetSaveBlocksPointers` (`offset + Random()`), then the 2-draw
 * encryption key, each frame on top of its VBlank draw.
 * E3: the Lobby map load at `entry + 3` / `entry + 4`: `LoadMapFromWarp` -> `RoamerMoveToOtherLocationSet` (overworld.c:862) + `UpdateTVScreensOnMap`
 * -> `GetRandomActiveShowIdx` (overworld.c:872, tv.c:826), 2 draws, then `LoadMapInStepsLocal` -> `MoveSaveBlocks_ResetHeap`, 3 draws.
 */
export function lobbyReturnRngSteps(age: number, forfeit: boolean): number {
  if (age < POSTWIN_IN_BATTLE_CLEAR_AGE) return 0;
  if (age === 43 || age === 45) return 2;
  if (age === 46) return 3;
  const load = forfeit ? BATTLE_EXIT_LOBBY_LOAD_AGE_FORFEIT : BATTLE_EXIT_LOBBY_LOAD_AGE;
  if (age === load) return 3;
  if (age === load + 1) return 4;
  return 1;
}

/** The Lobby fade-in's first frame is `entry + 13` (the won terminal's `fieldFirstAge`, the loss terminal's 114 - 101). */
export const LOBBY_FADE_IN_AFTER_ENTRY = 13;

/** E3 alone, for a Lobby entry that has no battle exit before it (RETIRE-YES from the PreBattleRoom, a staged 7th-win terminal): extra draws on `entry + 3` / `entry + 4`. */
export function lobbyLoadExtraRng(ticksSinceEntry: number): number {
  if (ticksSinceEntry === 3) return 2;
  if (ticksSinceEntry === 4) return 3;
  return 0;
}
