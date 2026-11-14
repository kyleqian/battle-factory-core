# lbr-e: the PreBattleRoom entry for an in-game new challenge (Battle Scene OFF)

Written after the fact (lbr-f) from commits `e7638246a` (state machine, renderer, core wiring, traces), `7eb3a887c` / `e64463ff0` (tests),
`be40b048f` (soak re-pins). Code: `src/engine/prebattleEntry.ts`, `src/engine/prebattleEntryRender.ts`, `src/engine/core.ts`
(`enterPrebattleEntry`, the `state.prebattleEntry` branch of `tickEngineState`, `renderPrebattleEntryState`). Tests: `tests/lbre.test.ts`.
(Code comments in `prebattleEntry.ts`, `lbre.test.ts` and `randomRoundSoak.test.ts` cite this doc under its earlier working name
`lbre-prebattle-briefing.md`.)

## What is modelled

After the Lobby attendant's "new challenge" hand-off and the door fade (`attendant.done === "draft"`), a challenge started in-game used to be
dealt its rentals on the hand-off tick and jump straight to the draft. The ROM does not: it warps into `BattleFrontier_BattleFactoryPreBattleRoom`
and runs the room script first. The app now models that script as a `PrebattleEntryState` (`phase`: `intro` -> `talk` -> `closing` -> `fadeOut` ->
`black` -> `draftFadeIn`), age 0 = the hand-off tick (the frame the room's fade-in starts).

ROM source: `data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`, `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterRoom`
(lines 28-42):

1. both NPCs walk 5 tiles up (`applymovement` + `waitmovement`) while the camera follows the player;
2. THEN `factory_generaterentalmons` / `factory_generateopponentmons` run (the deal);
3. THEN the briefing texts: opponent favourite type, battle style, then "First, we will hold your POKeMON for safekeeping." `\p` "You may then
   choose from our selection of POKeMON.";
4. then `fadescreen FADE_TO_BLACK` and the warp into the draft.

Ticks (`PREBATTLE_ENTRY_TIMING`, all ROM-measured on the lbrb happy-path window):

| item | value |
| --- | --- |
| room fade-in | 15 ticks, then 8 settled (walk starts at age 23) |
| walk | 80 ticks (5 tiles x 16), camera origin Y 136 -> 56, 1 px per tick; NPC poses alternate leg / standing every 8 ticks |
| deal | age 104 (walk end 103 + 1), ROM frame 6660 |
| briefing box first (blank) frame | age 106 (deal + 2) |
| next message first glyph | 4 ticks after the A tick; next page after `\p` 2; box close 3 |
| fade to black | 15 ticks, black 72, draft fade-in 15 |
| wait arrow | 9-frame groups over the 4-entry bob table (same as the attendant's) |
| warp RNG | +2 draws on fade tick 27 and +3 on fade tick 28 (ROM frames 6546 / 6547, map-load RNG the app does not otherwise model) |

The briefing needs one A per message (opponent type, battle style, safekeeping + page turn = 5 presses with the page turn); A before the text has
finished typing is ignored (`briefingAcceptsInput`, the attendant's gate). Messages 2 and 3 come from the opponent set generated from the deal
cursor (`buildBriefingMessages`); there is no streak-dependent text, so a kept streak runs the identical timeline.

## Which deal an in-game new challenge gets, and why it moved

Before lbr-e the draft was generated at the hand-off tick from the cursor at that tick. The ROM generates it at the END of the walk, so the cursor
it reads is the live vblank cursor 104 ticks later (the cursor advances once per frame and the door warp adds its extra draws). The deal now runs
on age 104 with `state.rngValue` at the end of the previous tick (`dealPrebattleEntry(carry, state.rngValue)`), so the in-game new challenge is
dealt a different six rentals (and opponent set) than before for the same hand-off cursor. The deal is checked against the ROM:
`tests/lbre.test.ts` "the deal against the ROM" rebases the app cursor to the ROM's at frame 6540 (`appRngRebase`, below), asserts the cursor at
frames 6548 (`0x620d7ebb`) and 6659 (`0xdb35a7d8`, the generator's input) and that the six rentals equal the ROM's set ids
`[150, 173, 123, 168, 132, 124]`.

## Traces

`tools/compare/traces/lbre-prebattle-{a,b,c}-off.json`: oracle profile `battle-scene-off`, battle-lab scenario
`scratch-loss-beyond-boundary-probe.json`, app stage `loss-terminal-window-off` at frame 2996, three consecutive capture windows
(a 6540-6794, b 6795-7049, c 7050-7304), **255 / 255 each**. Together they cover the room fade-in, the walk, the deal, the briefing (all four
messages and the page turn), the box close, the fade to black and the draft fade-in.

`appRngRebase` (new optional trace field, `tools/compare/traceTypes.ts`, applied in `tools/compare/appTrace.ts`): after the tick that yields
`frame`, set the app's RNG cursor to `rngValue` (the ROM's cursor at that frame). Lab-staged routes leave the app and ROM cursors on one orbit
but far apart; the rebase aligns them so cursor-dependent screens compare equal. App-only, never sent to the oracle. The traces use
`{ frame: 6540, rngValue: 4055554748 }`. The ROM cursors were read with `tools/probe/lbre-deal-ram.py` (per-frame `gRngValue` and
`rentalMons[0..5].monId`).

## Re-pins (`be40b048f`, tests only)

The deal moving changes which seeds hit the pinned events in `tests/randomRoundSoak.test.ts`:

* Baton Pass green-milestone pin: seed 3 -> **12** (re-scanned full-policy seeds 0..13 with the same options and joint event; seed 12 is the
  first and lowest hit: commit 31364, halt 31613, four Lobby new challenges).
* winning chain (two round wins, carry 14): seed 10 -> **16** (re-scanned seeds 0..39; 16, 19 and 35 chain two wins, 16 is the lowest).

Drivers and tests that walk through an in-game new challenge now press A through the briefing (`tests/helpers/lobbyAttendant.ts`
`driveBriefing`; `goalPlay`, `lbra`..`lbrd`, `newChallengeFromLobby` tests and `tools/soak/randomRoundSoakDriver.ts` were updated).

ENGINE_BUILD after lbr-e: `eb-84e322b3e8acddc2`.
