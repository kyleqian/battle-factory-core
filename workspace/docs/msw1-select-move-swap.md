# msw1: SELECT move switching in the fight menu

Authorized source-proven gameplay correction (docs/factory-finish-scope.md). The ROM lets the player press SELECT in the FIGHT move menu and swap two move slots (`HandleMoveSwitching`). The port had no such branch. It is now the same in Battle Scene OFF and ON: one rule, no scene branch.

## ROM (battle_controller_player.c)

- `HandleInputChooseMove` SELECT branch (:599-612), last in the chain: with more than one move (always true for a Factory mon) and no link battle it sets `gMultiUsePlayerCursor` to 0, or to 1 if `gMoveSelectionCursor` is already 0, and enters `HandleMoveSwitching`. No sound on entry.
- `HandleMoveSwitching` (:668-840) chain: A or SELECT confirm (SE_SELECT), B cancel (SE_SELECT), then four D-pad branches. LEFT/RIGHT flip bit 0 of the target and UP/DOWN flip bit 1; a press toward the edge keeps the target and is silent, a move plays SE_SELECT. (The `B|SELECT` branch is unreachable, SELECT always confirms.)
- Confirm with target == source: nothing is written. Otherwise (:673-736) `gBattleMons[b]` moves, pp, ppBonuses and the Mimic bit (`mimickedMoves`, only when the source's bit is set) swap. Unless `STATUS2_TRANSFORMED`, the party mon's moves/pp/ppBonuses swap too (`BtlController_EmitSetMonData`). The cursor then becomes the target slot (:738).

## Engine

- `src/engine/battleMoveSwitching.ts`: cursor rules, `swapPackedPpBonuses`, `swapMimickedMask`, `swapBattleScriptBattlerMoves` (battler and party mon, Transform skips the party).
- Presentation (`battleCommandPresentation.ts`) holds the state (`moveSwitch`, `pendingMoveSwitch`) and never edits rules. The orchestrator applies `switchFactoryCommandMoves` (republishes the same request id's legal decisions), then `applyBattleCommandMoveSwitch` installs the new move surface and moves the cursor to the target.
- Persistence: the battle's party mon keeps the new order; at the terminal boundary `recordsWithTerminalMoveOrder` writes `moveOrder` (a permutation of the set's moves) into the player's rental records; `createFactoryCorpusPartyMember` applies it and `healFactoryKernelParty` carries it, so the next battle, the swap screen and the summary see the swapped order. Identity order removes the field. Records without `moveOrder` are byte-identical to before.
- Drawing: "Switch\nwhich?" in `B_WIN_SWITCH_PROMPT`; source cursor is tile 29 (light gray 214,206,214), the target arrow is tile 27 (black arrow without its shadow); the normal arrow returns after the swap.

## Oracle timing (empirical, mechanic-lab traces)

The render at frame N reflects the state after tick N-1.

- SELECT entry and exit show one tick late (mirror `moveSwitchDisplay`).
- Swap confirm at tick P: P+1 old UI; P+2 name row 0 (slots 0,1) redrawn, source gray gone, old target arrow gone if its row is 0; P+3 row 1 (slots 2,3); the normal arrow reappears at elapsed >= lastChangedRow+2; P+4 normal PP window.
- The oracle loses idle-bounce ticks to the VRAM copies: B cancel 1, same-target confirm 1, swap confirm 3, SELECT entry 0 (`bounceHold` bitmask).

## Compare traces

`npm run compare -- <trace> --summary`; each trace presses A, then SELECT / D-pad / B / same-target A / swap A / SELECT-confirm / second swap (0<->3) / A to pick the move.

| Trace | Scene | Result |
| --- | --- | --- |
| `msw1-select-swap-off` | OFF :8014 | 117 frames, **115 exact**. Residuals: frames 69 and 78 only |
| `msw1-select-swap-on` | ON :8012 | 134 frames, 75 exact, 59 differ (all attributed below) |

OFF residuals 69 and 78: the pre-existing app idle-bounce model error (player sprite at idle age ~56, enemy healthbox at ~65). A no-input idle probe shows them at frames 64 and 73; the five held ticks of this trace shift them to 69 and 78. Frames after 124 (the oracle's move-resolution text starts later than the app's) are not captured; the same offset exists in a plain A/DOWN/A trace without SELECT.

ON: in the menu region (y >= 113) every frame 15..141 is exact except 76, 121 and 122; all other differences lie above it.

- Frame 14 (7205 px): the ON oracle opens the fight menu one frame after the app (`FIGHT_SUBMENU_OPEN_DELAY` is OFF-calibrated). A no-input ON probe shows the same 18.76% at frame 14.
- 55 frames (644 px / 1705 px, bboxes 42,59-100,111 and 127,74-229,110; 62 and 78 are both bursts at once): the ON idle-bounce phase of the player sprite and the healthbox, periodic with period ~9. The no-input ON probe has the same bursts (same px counts and bboxes) and no msw1 code runs there. Pre-existing.
- Frame 76 (29 px extra, a half-drawn arrow tile) and frame 122 (54 px, the last glyph of the PP window): the oracle's capture lands mid VRAM copy; the app draws whole tiles.
- Frame 121 (43 px): on the slot-3 swap the ON oracle shows the new arrow one frame earlier than the OFF-derived pipeline. Not modelled (3 frames, <= 54 px each, mine).

Later turn on the oracle: after the swaps the A at the end uses the cursor's move; the oracle's text reads "GRANBULL used MEGA KICK", the app agrees (OFF, dense captures past the first glyph).

## Replay check (engine)

`tests/msw1SelectMoveSwap.test.ts` (generated battle, seed 4): swap slots 0 and 1, move the cursor to slot 0, A. The use-move decision is slot 0, the move used and the PP decrement are the former slot 1's (`pp[0]` = old `pp[1]` - 1, `pp[1]` = old `pp[0]`). The party mon has the same order. After the battle is won, `playerRentalRecords[0].moveOrder` is `[1,0,2,3]`, and in battle 1 the lead's slot 0 is the former slot 1 move.

## Tests

`tests/msw1SelectMoveSwap.test.ts` (10 tests): cursor rule and D-pad bounds, PP Up / Mimic bits, sounds and cancel / same-target, rules swap (battler + party, Transform skips the party, same slot returns the same context), orchestrator flow, persistence into the next battle, the settle render view, `tick` with SELECT. Without the src changes (the nine touched engine files reverted to 687c474a0) 6 of the 10 fail; the other four test the new module's pure helpers.

## Library input

No library API change. SELECT already exists in `GbaButton` / `GBA_BUTTONS`, `normalizeButtons`, the keyboard map (Shift) and the gamepad map (button 8); `FactorySession.tick(buttons)` passes the set straight to the engine `tick`. The public input path is unchanged and docs/library-package.md needs no edit.

## Known edge cases

- A swap combined with Mimic in the same battle is exact (msw2, below): Mimic never writes the party. Sketch is the only `REQUEST_MOVES_PP_BATTLE` party write and no Factory rental has it. The port still keeps `moveOrder` only when the terminal party's moves are a permutation of the set's moves.
- Not in scope: test-player policies pressing SELECT, the Lobby, other menus.

## Gates

Census 0..99 (`lsd194Census.sh`, `LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4`, base 687c474a0 vs this branch, `rst197CensusDelta.py`): Scene OFF 100/100 identical (30813 commands), Scene ON 100/100 identical (31593 commands), bad 0 (the census never presses SELECT). Vanilla soak 0:20 OFF 20/20 (budget). Re-pin: `docs/gate6-coverage-manifest.{json,md}` regenerated (the new test references `BATTLE_SCRIPT_STATUS2_TRANSFORMED`).

## msw2: SELECT swap + Mimic on the ROM (ISSUES #227, closed; 2026-11-21)

The earlier worry (a Mimic party write replacing the swapped order and losing `moveOrder`) is not what the ROM does; the engine already agreed, so no engine change.

- ROM (`.integration/evidence/msw2/romSwapMimic.py`, a `mechanicLab` with `overrides.parties`, both scenes identical): lead MACHAMP [MIMIC, CROSS CHOP, SPLASH, SING] vs three MAGIKARP with TACKLE. SELECT swaps 0<->1, MIMIC (cursor on slot 1) copies TACKLE, SELECT swaps 1<->3, the battle is won. After the first swap battler and party are [CC, MIMIC, SPLASH, SING]. After MIMIC the battler is [CC, TACKLE, SPLASH, SING] with `mimickedMoves` 0b0010 and the party is still [CC, MIMIC, SPLASH, SING] (party pp[1] 9). After the second swap the battler is [CC, SING, SPLASH, TACKLE] (mimicked 0b1000) and the party [CC, SING, SPLASH, MIMIC] (pp[3] 9).
- Why: `Cmd_mimicattackcopy` writes `gBattleMons` only (and the mimicked bit). The party write `REQUEST_MOVES_PP_BATTLE` belongs to `Cmd_copymovepermanently` (Sketch), which a Factory mon cannot have (no rental has it; Mimic and Metronome cannot be Sketched in).
- Engine before -> after: identical (battler, party, PP, mimicked bit after every step). `moveOrder` in the records after the win is the swap permutation ([1,0,3,2] in the test), the next battle starts with the party's order and no Mimic copy.
- Pin: `tests/msw2MimicSwapPersistence.test.ts` (set 43 lead, seed 0: swap 0<->1, Wish, Mimic, swap 2<->3, win; and Mimic without a swap leaves every `moveOrder` unset).
- Not modelled: a paused challenge resumed on the ROM rebuilds the party from `rentalMons` (`factory_setparties` on ResumeChallenge), which drops the swap order. The engine has no paused-challenge resume.
