# lbr-d1: a 7-win returns to the walkable Lobby in the same mount

User decision 2026-11-12: every challenge end returns to the Lobby. Before lbr-d1 a 7-win chained straight into a new
draft (`enterChainedFactoryChallenge`); now it ends in the Lobby, as in the ROM. Scout: `docs/lbr-d-scout.md`; ROM tail
ticks: `docs/lbrd2a-won-tail-rom.md`. Tests: `tests/lbrd.test.ts` (Scene OFF and ON).

## Library contract (website)

After `round-end` the mount keeps running in the Lobby: there is no `challenge-end` and no `challenge-request` hold for a won
round, and the attendant starts the next challenge in the same mount and trace with the streak continued. A later retire or loss
still emits `challenge-end` (and the usual `challenge-request` hold after the player's save), so the host only ever sees
`challenge-end` once per streak, at the loss or retire.

## Mechanics

* **Carry banked on Lobby entry.** `core.ts` calls `advanceFactoryCarry(state.factoryCarry, roundWon, roundOutcome, rents)` on the
  tick the Lobby free-roam begins after a generated round (streak +7, symbols, BP, rents). The ROM's WonChallenge Lobby script never
  clears `FACTORY_DATA_WIN_STREAK_ACTIVE` (`battle_factory.c:208-212`); LostChallenge does.
* **`EngineState.lobbyStreakKept`.** True after a won Lobby entry. The attendant hand-off then uses `state.factoryCarry` as is,
  otherwise `carryForNewChallengeAfterLobby` (loss / retire: streak reset). The flag is false in `createInitialState` and
  `enterChainedFactoryChallenge`.
* **Draft RNG.** The draft after the attendant is dealt from the Lobby's live vblank cursor (nch231), not the round-end cursor, so
  seven-win trajectories moved and ENGINE_BUILD moves.
* **`FactorySession` retire-guard.** `wonLobbyPending` is set on `round-end` and swallows exactly one Lobby entry; without it
  the Lobby entry would be reported as `challenge-end retire`. Reset in `reset()`.
* **Soak / `play:random`.** `decide()` walks to the attendant in the Lobby after a 7-win (same code as the retire / loss path).

## Won terminal BP text

`roundOutcome.battlePointsAwarded` drives the text (`factoryBrainRoundOutcome.ts`, frontier_util): a per-challenge row (3 / 4 / 5 by the
post-win streak, `FACTORY_SINGLES_BP_BY_CHALLENGE_ROW`), +10 for a Brain win (silver at streak 21 gives 14). `createFactoryTerminalPresentation(command, { before, awarded })`; the default 3 BP returns the
frozen `FACTORY_ROUND_WON_TERMINAL_PROFILE` itself, other awards a frozen copy with `battlePointAward` and `getPoints` replaced.

## Won farewell input gates (ROM, lbr-d2a)

`declineInputDelay` 39 -> **41** and `recordSavedInputDelay` 70 -> **74** on the won profile (the loss profile's 39 / 70 stay).

## Residuals (named, not settled here)

* Farewell glyph +-1 tick (first glyph, last glyph, post-recorded-dismiss farewell): the fixture cannot separate a tick-convention
  difference from a real offset; needs the lbr-d2b compare trace.
* `recordDisabledFarewellEdgeFromRestore` (166, copied from the loss) is unmeasured on the won branch.
* The attendant door-walk window after a won Lobby, and the PreBattleRoom briefing before the draft (nch231 divergence), as before.
