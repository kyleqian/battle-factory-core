# aud240 scout (read-only, 2026-11-02, Sonnet worker; supervisor-saved, unverified mapping)

Input to the aud240 brief. Line numbers are as read on master `9bfafe083`; re-check before wiring.

**aud240 scout is done: read-only, no edits or commits, and `git status` is clean.**

`pan` is null for every `PlaySE`, and all sites are `kind=se`. "Ours" means `src/engine/`, and line numbers are from the worktree. The ROM-side line numbers are from `audio-sound-sources.json` (aud238).

## Mapping table

| ROM site (file:line, function, trigger) | Our branch (file:function:line) | Exists? | Expected `(kind, id, pan)` |
|---|---|---|---|
| **Draft** | | | |
| `battle_factory_screen.c` 1688, `Select_Task_HandleChooseMons` A | `core.ts` draft input block 2538–2866, cursor mode 2785–2802 | yes | se, 5, null |
| 1695 / 1702 LEFT / RIGHT | same block, cursor mode (`newAndRepeatedKeys`) | yes | se, 5, null |
| 1711 A on invalid pick | none | **no** | se, 5, null |
| 1607 A / 1633 B / 1642 UP / 1647 DOWN, `Select_Task_HandleMenu` | `core.ts` menu mode 2803–2848 (SUMMARY 2817, RENT 2819, OTHERS 2842) | yes | se, 5, null |
| 1543 A / 1564 B / 1573 UP / 1578 DOWN, `Select_Task_HandleYesNo` | `core.ts` yes/no 2733–2780 | yes | se, 5, null |
| **Swap** | | | |
| 2649 A / 2658 B, `Swap_Task_HandleChooseMons` | `factorySwap.ts:handleFactorySwapInput` 280 (playerPicker / enemyPicker) | yes | se, 5, null |
| 3572 / 3595 / 3642 `Swap_Update{Ball,Action,Menu}CursorPosition` | same phase machine (cursor moves); `core.ts` swap input 1306–1400 | yes | se, 5, null |
| 2606 A / 2611 B, `Swap_Task_HandleMenu` | `factorySwap.ts` playerOptions | yes | se, 5, null |
| 2481 A / 2502 B / 2511 UP / 2516 DOWN, `Swap_Task_HandleYesNo` | `factorySwap.ts` acceptPrompt / quitPrompt | yes | se, 5, null |
| 4135 `Swap_TaskCantHaveSameMons` | `factorySwap.ts` duplicateSpecies phase | yes | se, 5, null |
| **Summary** (`pokemon_summary_screen.c`) | `summaryScreen.ts`; input at `core.ts` 2588–2612 | | |
| 1572 B closes | `requestSummaryScreenExit` 316 (swap B-exit at `core.ts` 1353–1360) | yes | se, 5, null |
| 1559 A on Info page closes | none; ours only closes on B | **no (behaviour gap)** | se, 5, null |
| 1564 A on Moves pages (move select) | `requestSummaryMoveSelect` 388 | yes | se, 5, null |
| 1613 mon change | `requestSummaryMonChange` 359 | yes | se, 5, null, only if the mon id changes |
| 1773 page change | `requestSummaryPageChange` 329 | yes | se, 5, null, only if the page changes |
| 1932 / 1937 / 1947 / 1969 / 2085 move-select SEs | `requestSummaryMoveSelectionChange` 414, `requestSummaryMoveSelectClose` 458 | yes | se, 5, null |
| 1942 swap-failure | same move-select code | yes | se, 32, null |
| 2223 / 2237 / 2230 learn-move replace | none; not on the Factory path | n/a | skip |
| 3969 / 3971 `PlayMonCry` NORMAL / WEAK | summary mon animation, `monAnimClock` (`core.ts` ~3646, 3829) | partial; start tick not pinned | cry, species2, pan 0, mode normal/weak |
| 1523 / 1635 `StopCryAndClearCrySongs`, 1524 `m4aMPlayVolumeControl(BGM, ALL, 0x100)` | `openSummaryScreen` 292 and exit | yes | stop, plus a BGM duck/volume event |
| **Party menu** (`party_menu.c`) | | | |
| 1322–1361 `HandleChooseMonSelection` A | `battlePartySelect.ts:advanceBattlePartySelect` 539–620 (voluntary); `partySelect.ts:advancePartySelect` 526–570 (forced) | yes | se, 5, null |
| 1517 cursor move | same two functions | yes | se, 5, null, only if the slot changed |
| 1383 SEND_OUT cancel | `partySelect.ts` ~526–570 | branch exists, silent | se, 32, null |
| 1387 / 1391 / 1395 other cancels | `battlePartySelect.ts`; `factoryRoundBattleOrchestrator.ts` 3078–3100 | yes | se, 5, null |
| 1372 egg-fail | none | n/a (no eggs) | skip |
| 1276 START (choose-half only) | none | n/a | skip |
| 2758 `Task_HandleSelectionMenuInput` B, 3064 `CursorCb_Cancel1` | submenu B | **no**; ours has no submenu cursor | se, 5, null twice in the same frame |
| 2772 `CursorCb_Summary` | none; SUMMARY is unreachable in `battlePartySelect.ts` | **no** | se, 5, null twice |
| 2799 `CursorCb_Switch`, 3507 `CursorCb_SendMon`, 3534 / 3546 `CursorCb_Enter` | `battlePartySelect.ts` SHIFT / SEND OUT confirm | partial | se, 5, null twice (menu.c plus `CursorCb`) |
| **Yes/no and list menus** | | | |
| `menu.c` 990–1550, `Menu_ProcessInput*` | in-game dialog menus, e.g. `core.ts` 1596–1610 (postwin question), 1620–1630 (continuation), 1684–1710 (swap offer) | yes | A and UP/DOWN se, 5, null; **B emits no SE** |
| `menu_helpers.c` 168 / 173, `Task_CallYesOrNoCallback` | same | yes | se, 5, null |
| `list_menu.c` 884, `menu_helpers.c` 196–244 | quantity/list screens | not on the Factory path | skip |
| **Lobby / PreBattleRoom / BattleRoom scripts** | | | |
| Lobby 60 / 73 / 101, PreBattleRoom 194, `SE_SAVE` | `factoryTerminalPresentation.ts`, `prebattleRoom.ts` | needs a quick grep (see gaps) | se, 55, null |
| PreBattleRoom 58 `MUS_HEAL` | `postwin.ts` heal scene (`core.ts` ~3120–3145) | yes | fanfare, 368 |
| PreBattleRoom 63 `SE_POKENAV_CALL` | `postwin.ts` ~362 (`CALL_SCENE_BRAIN_BRANCH_LAG` 368) | yes | se, 263, null |
| BattleRoom 135 / 161 `MUS_OBTAIN_SYMBOL` | `factoryBrainRoundOutcome.ts` (symbol port) | yes | fanfare, 466 |
| Lobby `GiveBattlePoints` line 54 `MSGBOX_GETPOINTS`, `Std_MsgboxGetPoints` | `factoryBrainRoundOutcome.ts` (BP port) | yes | fanfare, 459 (`MUS_OBTAIN_B_POINTS`) |
| Lobby BGM, `MUS_B_FACTORY` | `factoryLobbyFreeRoam.ts:advanceFactoryLobbyFreeRoam` 207 and map entry | yes | bgm, 469 |

## Gaps

- **Missing from aud238:** `MUS_OBTAIN_B_POINTS` (459) is absent from `audio-sound-sources.json`.
  - `Std_MsgboxGetPoints` (`data/scripts/std_msgbox.inc` 30–35) plays it, and the extractor doesn't follow std scripts.
  - The Lobby `MSGBOX_GETPOINTS` at line 54 needs it. Check the other std-script macros the same way.
- **ROM sites with no counterpart in ours:**
  - Draft invalid-pick SE (1711).
  - Summary A-closes-on-Info-page (1559). This is a behaviour gap as well as a sound gap.
  - Party-menu submenu cursor and SUMMARY, plus their UP/DOWN SEs.
- **Silent branches in ours that need `SE_FAILURE` (32):**
  - Forced SEND_OUT menu: B, and A on CANCEL (`partySelect.ts` ~526–570). The comment there already cites `party_menu.c` 1378–1384, and the menu stays open.
  - Summary move swap-failure (1942).
- **Double SE:**
  - The ROM plays two `SE_SELECT` in the same frame on party-submenu A (menu.c plus `CursorCb_*`) and on submenu B (`Task_HandleSelectionMenuInput` plus `CursorCb_Cancel1`).
  - `menu.c` itself plays nothing on B.
- **Placement differences (not hard blockers):**
  - The swap plays cursor SEs inside `Swap_Update*CursorPosition`, but the swap yes/no UP/DOWN in the handler.
  - NoWrap menus emit SE only if the cursor actually moved.
  - Repeat-capable handlers use `newAndRepeatedKeys` in ours, so the frame gating must match.
- **Our branches that look like they should sound but have no ROM site:** I didn't find any on the draft, swap or summary. In the lobby, ROM sites exist for the start menu, wall bump, doors and warps, in `start_menu.c`, `field_player_avatar.c`, `field_control_avatar.c` and `field_screen_effect.c`. Free-roam in ours may need them.
- **Unverified (no time):**
  - The exact lines of our `SE_SAVE` branches in `factoryTerminalPresentation.ts` and `prebattleRoom.ts`.
  - The summary cry start tick.
  - Whether the swap's summary page/mon change input is driven.

## Proof-window candidates

- **Draft:** `tools/audio/fixtures/draft-window.json` shows `se 5 SE_SELECT` (pan null) at f21, f43 and f85. These are the first frame of each press, with probe frame = press-segment start, matching our `state.frame + 1`.
- **Other fixtures:** `battle-window(-off)`, `battle-intro-window(-off)`. None covers the swap, summary or party menu.
- **Swap:** the traces under `tools/compare/traces/*.json`, which come from `tools/compare/traces-groundtruth/battle1-swapyes-a.json`. I didn't read the exact frame ranges.
- **Summary, party menu, lobby:** no dedicated probe fixture exists. aud240 should capture new windows.
- **Kernel `play-se` events:** these are timing gates and must stay unchanged. New events are additive, write-only, and scene-off only.

## Suggested aud240 split

1. **aud240a:** draft, swap, and the dialog yes/no and list menus (all `SE_SELECT`).
   - Proof: `draft-window.json`, plus a swap window from `battle1-swapyes-a`.
   - Include the B-silent rule.
2. **aud240b:** summary SEs (including the swap-failure `SE_FAILURE`), cry with pan 0, cry stop, and the BGM duck restore.
   - Needs a new probe window, and fixes the A-on-Info gap.
3. **aud240c:** voluntary and forced battle party menu, with the double SE and `SE_FAILURE`. The submenu cursor is a behaviour change, so check it before wiring.
4. **aud240d:** lobby, PreBattleRoom and BattleRoom script SEs and fanfares, including `MUS_OBTAIN_B_POINTS` (needs an aud238 extractor fix first) and the lobby BGM.

Steps 1 and 4 are the cheapest. 2 and 3 each need a new probe window.

