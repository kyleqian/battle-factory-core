# pic1-pic8: live pictures and transitions from Kyle's 2026-11-20 round

Kyle played battlefactory.app on 2026-11-20 (site build eb-01c15b77495c4068 = core aeac1cdcb) and reported wrong pictures and
transitions. His recorded trace replays in sync on that build; on this branch (cut from the box tip 2cd8b3039) it stays in sync
through battle 1's first turns and then drifts (228 commits of presentation timing since the site build), so each fix here is
reproduced on this branch by its own test, from a real route (soak driver / `core.tick`) where possible.

Presentation only: no tick-side rules or RNG change. The ROM labs below were run on a private oracle (ports 8042 / 8044) with the
request files committed under `tools/battle-lab/pic*.json`; frames stayed out of git.

## What was wrong, why, and the fix

| step | what Kyle saw | cause | fix | ROM evidence | test |
|---|---|---|---|---|---|
| pic1 | After IVYSAUR fainted he sent MAGBY; the foe was drawn as MURKROW (DELIBIRD was out) and MAGBY's box read 138/138, then jumped to 65/138 | `renderBattleResolutionForcedPartySelect` and the path-A send-in view took `name === "MAGBY" && species === 240` for the canonical sample battle and drew its recorded field (`turn15FieldPpuAsset`, MURKROW) and `drawTurn15MagbyHealthbox` (138) | both name tests removed; the send-in draws the live field, the live incoming mon and its own healthbox | the ROM's send-out has no species branch: pokeball.c `SpriteCB_PlayerMonSendOut_1/_2` keys only on Y_PIC_OFFSET, and the healthbox prints `gBattleMons[battler].hp`; path A is the ROM-measured pfb228 timeline | `pic1LiveFieldPictures.test.ts` (fails on the old code: no DELIBIRD drawn) |
| pic2 | (not reported, found by the check) his FIRST battle room showed a BUG CATCHER walking in saying "IT'S WAY TOO HOT" before BEAUTY LIZBETH | battle 1's orchestrator is only created at battle start, so `currentTrainerPresentation` was undefined and the generated route fell back to `CANONICAL_DESTIN_PRESENTATION` | `pendingRoundFirstTrainer` (core.ts) derives battle 1's trainer from the pending round with the same pure construction battle start uses (`createPendingRoundOrchestrator`) | the ROM sets the round's trainers on the room's map transition (`BattleFrontier_BattleFactoryBattleRoom_OnTransition: frontier_settrainers`) | `pic3DrawnFieldCheck.test.ts` Scene ON (fails on the old code: "first room opponent BUG_CATCHER, battle 1 trainer BIRD KEEPER TREVIN") |
| pic2 | the room after a win showed a BUG CATCHER (TUBER JASON) | the after-battle room had no trainer presentation | already fixed on this branch by the box's lbw7 (d2c243acd, 11-18, not on the site yet): it reads `round.rules.currentOpponent` | - | covered by the soak check (after-win rooms of soak seed 0) |
| pic3 | the class | - | `drawRecord.ts` records what a render draws (pictures read through monPicPixels.ts, healthbox name / level / HP at compose, room sprites); canonical sample helpers call `noteCanonicalSample`, which throws inside `withLiveRender` (core.ts `render()` for any generated round); 18 staged move bodies no longer read their sample sheets on the live route; the canonical party-list snapshot (and its fade mask) needs the anchor's full rows, not only its species | - | `pic3DrawnFieldCheck.test.ts`, `tools/integration/drawnFieldCheck.ts`, soak `drawCheck` option, `ROM_REPLAY_DRAW_CHECK=N` |
| pic4 | TUBER JASON stopped one tile above the player | the room drew every trainer at a 16x32 sprite's top | `drawNpcFrame` anchors at the tile bottom; TUBER_M, TUBER_F and NINJA_BOY are the only 16x16 room sheets | event_object_movement.c:1461-1464 (`centerToCornerVecY = -(height >> 1); y += 16 + centerToCornerVecY`); graphics info 16x16 for the three | `pic4SmallTrainerSpriteAnchor.test.ts` (every sheet's feet on the player's line) |
| pic5 | (found by the agent sweep) the swap screen's SUMMARY | it paged through `draftScreen.rentals`, the opening draft's six, so after any draft not renting slots 0-2 it showed another Pokemon (soak seed 0: ANORITH for the party's PONYTA) | `factorySwapSummaryRentals` reads the round's own `playerRentalRecords` | battle_factory_screen.c:2404 `ShowPokemonSummaryScreen(SUMMARY_MODE_NORMAL, gPlayerParty, cursorPos, ...)` | `pic5SwapSummaryParty.test.ts` |
| pic6 | B in the battle POKéMON menu cut straight back to the battle | the orchestrator dropped the selector on the B edge | B keeps the selector through the measured SEND OUT close, then 6 frames of the field before the action menu (`PARTY_SELECT_CANCEL_CLOSE_TOTAL_FRAMES` 78) | party_menu.c:1394-1403 + :1227; lab `pic6-party-cancel-{on,off}` (B at 160): fade 163-177, black 178-216, fade-in 217-232, empty box 233-238, menu 239; `pic6-party-shift-off` (A at 206) shares the schedule to the fade-in | `pic6PartyCancelFade.test.ts`, re-pinned `factoryRoundBattleOrchestrator.test.ts` |
| pic7 | the background went fully white for ~8 frames at the send-out | that frame on his build was the sample battle's recorded palette (pic1); the ROM does whiten BG palettes 1-3 at every send-out, and Scene ON path A already drew it exactly. Scene OFF drew no white fade and MAGBY's ball arc for every species | Scene OFF takes path A without the back animation | pokeball.c:758 `LaunchBallFadeMonTask(TRUE, battler, 14, ...)`, battle_anim_throw.c:2058 `BeginNormalPaletteFade(14, 0, 0, 16, RGB_WHITE)`; lab `pic7-player-faint-send-in-{on,off}`: 0 px through e 171 in both scenes (before: Scene OFF 80-110 px at e 105-141 and up to 18.9k px at e 147-183) | `pic7SendInWhiteFade.test.ts` |
| pic9 | (planning session's ROM replay) switching MAGBY for IVYSAUR printed "MAGBY, OK! Come back!" / "Go! IVYSAUR!"; the ROM: "MAGBY, good! Come back!" / "Go for it, IVYSAUR!" | the come-back line read the outgoing mon's own HP, the send-in line was always "Go!" | both from the foe's HP: the come-back line from the damage dealt since the side's `hpOnSwitchout` (kept in the display ledger, reset for both sides at every committed switch-in, carried across action menus; the stored HP is truncated to 8 bits as the ROM's u8 local), the send-in line (voluntary and after a faint) from the foe's current HP percent | battle_script_commands.c:6258-6306 (`Cmd_hpthresholds` / `Cmd_hpthresholds2`), :5276-5280, battle_main.c:3421, battle_message.c:2081-2110; ROM replay of Kyle's battle 1 (ELEKID 26 / 138: 81 % dealt, 18 % left); Castform lab (full-HP foe: "that's enough!" / "Go!") | `pic9SwitchLines.test.ts` (decomp tables, Kyle's numbers, every switch of two full soak games) |
| pic8 | the fade into the party menu after a faint looked like "to white" | the colours are the ROM's (it fades to black; the near-white field passes through light greys); the start was 2 frames late: two one-frame sprite-visibility restores after the faint message ran before the selector's "frames since the dismiss edge" clock started | the selector starts at the frames of that bookkeeping tail | lab `pic7-player-faint-send-in-on`: A at 560, first fade step 582 (21 held frames, `PARTY_ENTRY_FADE_OUT_START`) | `pic8FaintPartyFadeStart.test.ts` |

Engine frame N shows ROM capture N; a button first held at trace (segment) index P is read on engine frame P + 1 (the dense SEND OUT
trace: A at 962, `closeElapsed` 0 at 963), which is how the lab rows above map onto the engine's clocks.

## What the check found (frames checked, findings)

- Round replay fixtures, every frame, all 14 (`ROM_REPLAY_DRAW_CHECK=1`, all Scene OFF, 154 battles): 1,434,618 frames, **0 findings**.
- Census battles (`soundCensusRomReplay native`, every frame): seeds 0-24 in each scene, 50 battles: 448,133 Scene ON + 320,137
  Scene OFF frames, **0 findings**.
- Soak, every frame (vary-rng seeds 0-5 both scenes, anchor seeds 0-2): the findings before the fixes were the first room's BUG
  CATCHER (pic2) and SWINUB read by the staged Icy Wind body on the live route (a read the live view did not draw: fixed by the
  lazy sample lookups); the two healthbox HP rows were the checker's own gap (a hit then a berry heal inside one segment), closed by
  counting the segment's hp-command endpoints. 0 findings after.

## Pins moved (presentation only)

- `tests/randomRoundSoak.test.ts`, frames / render calls only (same battles, turns and outcomes): seven-win seed 21 43_336 -> 43_334
  (renderCalls 3_042 -> 3_044); full seed 0 18678 -> 19042, seed 1 111140 -> 113091; vanilla seed 0 9209 -> 9205, seed 1 9404 -> 9400;
  the carry-14 pin seed 14 -> 10 (re-scan 0..49: 10, 17, 27, 47). Cause: pic6's 78-frame cancel close and pic8's 2-frame earlier clock.
- `tests/factoryRoundBattleOrchestrator.test.ts` "cancels POKéMON": walks the 78-frame close instead of the instant cut.
- `tests/pfb229FaintReplacementSendIn.test.ts`: MAGBY and Scene OFF now carry the path-A view (Scene OFF without the back animation).
- `tests/battlesceneSplitEligibility.test.ts`: three canonical-only palette helpers pinned by name (pic1 removed their live caller).
- pic9: `cff232CastformOff.test.ts` player-water-send-in compares its text rows from the send-in line's replacement on (its lab's foe was at
  full HP, census seed 603's HUNTAIL at 50 %: "Do it! CASTFORM!"; the Castform rows stay 202 / 202); soak full seed 0 19042 / turn 23 ->
  22844 / turn 30, seed 1 113091 / battle 6 / depth 5 -> 60400 / battle 3 / depth 2; Baton Pass pin seed 7 -> 15 (re-scan 0..39: 15,
  16, 27, 39).
- Round replay fixtures (`parityMacRoundReplayFixtures`): unchanged and passing.

Full suite on the branch: 16,125 passed, 5 failed; 3 were this branch's and are fixed (contain213 x2: the sample guard on placeholder
chrome; split eligibility). Final run after pic9: 16,132 passed, 2 failed, both failing identically on the base 2cd8b3039 (`iss215ToolPixelInstall`:
`tools/integration/btn2EngineRows.ts` lacks the installer import; `liveSpeciesAudit14Fixes` Substitute fade "player fade" rows).

## Measured, not fixed here (open)

- **Thunder Punch's lead and tail (Kyle's 6c).** ROM replay of his battle 1 turn 1 (the planning session's rom-drive with frame
  capture): first glyph of "Foe ELEKID used THUNDERPUNCH!" at ROM 19 = engine 9392; print done 46 / 9419 (same); the body's visible
  fade starts 72 on the ROM, 9427 (= 54) in the engine: **the ROM has 18 more rows before the body**; the visible end 161 / 9516 (=
  143, same 89-row visible body); the hit flicker starts 195 on the ROM, 9525 (= 152) in the engine: **25 more rows between the body
  and the hit**; drain and the rest match. Turn total 306 ROM vs 272 engine (this branch), turn 2 (on IVYSAUR) 241 vs 195. The body
  itself (104 rows) stays exact; these are the plain-hit lead / tail rows `docs/lead1m-rule-lead-design.md` says are not presented
  yet ("for the plain hit bodies ... no lead row exists at all"). Belongs to the box's lead-by-rule work.
- **Ordinary battle rooms run on the sample trainers' recorded schedules** (agent sweep): `opponentSetupExtraRngSteps` burns DESTIN's /
  JENSON's recorded nature-loop counts before `selectFrontierTransition(rngValue)`, the intro hand-off uses DESTIN's / JENSON's fixed
  elapsed (197 / 209) whatever transition was drawn, and the quote gate / msgboxIdle tick key on `encounter: "jenson"`. Touches RNG and
  the box's transition work (#225), so not changed here.
- Scene OFF **voluntary** player send-in still uses the fitted ball arc (`MID_BATTLE_SWITCH_BALL_MON_Y` 93) and particle origin; the
  voluntary recall fade runs on the ISSUES #78 fixture clock (`MID_BATTLE_SWITCH_FADE_BASE_TRACE`); the live intro passes `"destin"`
  to `drawOpponentSummaryExit`'s stall. Plausible, not ROM-checked.
- Sound (for the sound session): the swap SUMMARY's open cry still comes from `draftSummarySoundContext(state.draftScreen)`, i.e.
  the draft slot's species; the forced party menu's clock now starts 2 frames earlier (pic8), so any sound keyed on its `elapsed`
  moves with it; the B close (pic6) carries no new sound (the ROM's SE_SELECT on the press is unchanged).
