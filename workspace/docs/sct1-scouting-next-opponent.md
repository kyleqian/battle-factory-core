# sct1: the scouting report names the next opponent; the Factory Head's call before battle 21 (2026-11-21)

Kyle asked for the fix of the frame catcher's round-2 finding 1 (`docs/fcr2-catcher-round2.md`, "1. The scouting report after a win
describes the trainer just beaten" and "The Factory Head", "Before the Head"). Branch `fix/scouting-next-opponent`, cut from
`claude/distracted-shtern-921c31` (Mac master plus the round-2 frame catcher, 9a28a00fb). Evidence (not in git):
`.integration/evidence/fix-scouting/` (traces, catcher runs, contact sheets in `curated/`).

## What was wrong

1. **After every win the attendant described the trainer just beaten.** On the ROM "I've conducted a little investigation about your
   upcoming opponent." is followed by the next trainer's favourite type and battle style. Ours printed the beaten trainer's: 70 of the
   83 after-battle reports in fcr2's 7 traces (both scenes, every round, round 1 too; the other 13 read the same by chance).
2. **Before battle 21 (and 42) the Factory Head's phone call never played after a played battle 20 (41).** Ours printed "Finally, the
   7th match is next!" and an ordinary scouting report of the beaten trainer, with no call sound.
3. (found on the way, once the call played) **The call scene ran 29 frames early, and its two page turns were silent**: the first call
   box opened while the call sound was still playing, and the A on the boss message's `\p` pages played no SE_SELECT; B did nothing on
   the call boxes.

One cause for 1 and 2: `createPostwinStateFromRound` (`src/engine/postwin.ts`) built the postwin at the win from
`round.rules.currentOpponent`, which is still the trainer just beaten then: its rental records for the scouting pages, its `frontierBrain`
marker for the call scene (walk-up step A, `docs/walkup-step-a-design.md`). The next opponent is rolled later, at the GO ON answer, and
only the Head himself has the marker, so the call scene was reachable from the walk-up staging only, where 3 was hidden (below).

## The ROM

- `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_ReturnToRoomFromBattle` (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/
  scripts.inc:54-80`): the heal message, `playfanfare MUS_HEAL`, `HealPlayerParty`, then `frontier_getbrainstatus`, which reads the win
  streak only (`GetFrontierBrainStatus`, `frontier_util.c:1657-1698`: streak + 1 against {21, 42}); no opponent is rolled yet. Not ready:
  `AskReadyForRegularOpponent` ("The Nth match is next!"). Ready: `playse SE_POKENAV_CALL`, `waitse`, the call ("Excuse me! Excuse me,
  please! ...", the attendant at the phone, "Oh, my... Sorry to keep you waiting!", the boss's message in three `\p` pages), `delay 16`,
  `AskReadyForHead` (`:349-367`, "The FACTORY HEAD is demanding you. Are you prepared..." and the GO ON menu).
- `AskSwapMon` (`:137-149`), after an ordinary GO ON: `factory_generateopponentmons` rolls the next opponent, then
  `factory_getopponentmontype` / `factory_getopponentstyle` read it (`GetOpponentMostCommonMonType`, `GetOpponentBattleStyle`,
  `battle_factory.c`), then `CommentOnOpponentType` / `CommentOnOpponentStyle` (`:207-346`) print the pages, then the swap offer.
- `AskSwapBeforeHead` (`:370-376`), after the Head's GO ON: "I'm terribly sorry, but I can't tell you anything about the FACTORY HEAD."
  and the swap offer; nothing is rolled (the Head's party is built at the battle's start, `FillFactoryBrainParty`).
- Every scouting page and call box is `msgbox ..., MSGBOX_DEFAULT`: one character a frame; the `$` end takes A or B from three frames
  after the last character (`waitbuttonpress`, `WaitForAorBPress`); a `\p` page waits in `TextPrinterWaitWithDownArrow` (`text.c:865-882`),
  A or B, and plays SE_SELECT.
- `waitse` (`ScrCmd_waitse` / `WaitForSoundEffectFinish`, `scrcmd.c:910-922`) waits while `IsSEPlaying` (`sound.c:606-613`) sees SE1 or
  SE2 busy; SE_POKENAV_CALL plays on SE1 (`sound/song_table.inc:272`), two tracks of 24 ticks at tempo 136 (`se_pokenav_call.s`).

### Measured: the scouting pages

fcr2's ROM runs (`.integration/evidence/fcr2/final*/*/rom`, 8 runs, 100 after-battle reports, 300 scouting pages; text-box ink per frame):

| what | ROM |
|---|---|
| GO ON press -> page 1's first character | +4 frames in all 100 reports |
| page lengths | 55, 56, 62, 64, 65, 66, 67, 68, 70 characters, one a frame (the newline costs none) |
| press taken | from the last character + 3: 24 presses taken at exactly +3; none earlier (21 presses at +2, 26 at +1, 24 at 0 not taken) |
| next page | its box clears 3 frames after the press, its first character the frame after |

Seed 9 Scene ON after battle 1 (`fcr2/final/s9-on-ws`, ROM): GO ON 6,833; page 1 6,837-6,902 (66 characters), press 6,908; page 2 "The
TRAINER is apparently skilled / in the handling of the WATER type." 6,912-6,978 (67), press 6,990; page 3 "The favorite battle style
appears / to be weakening the foe to start." 6,994-7,059 (66), press 7,074; the swap offer from 7,078. That is MAXWELL's team (SEALEO,
KRABBY, VOLTORB), the next opponent; ours (6,790-6,930) printed CHELSEA's, beaten a moment before ("no clear favorites", "free-spirited
and unrestrained"). After battle 12 (ROM 158,200-158,400) the ROM says "no clear favorites" / "free-spirited" (JAMAL), ours said WATER
(CHLOE, beaten). The old engine also took presses one and two frames after a page's last character (3 of 36 pages in that run, e.g. page 3
after battle 12: last character 150,083, press 150,084): its accept delays were fixed at [72, 74, 72], which is the rule above for the
canonical pages' 66, 68 and 66 characters only.

### Measured: the call scene

| | MUS_HEAL | SE_POKENAV_CALL | first call box clears / first character | every ordinary prompt of the same run |
|---|---|---|---|---|
| ROM, fcr2 Head run (seed 2 OFF) | 258,746 | 258,909 (+163) | 258,941 (+195) / +196 | +165 / +166 |
| ROM, sct1 Head run (seed 9 ON) | 289,306 | 289,469 (+163) | 289,501 (+195) / +196 | +165 / +166 (17 prompts) |
| ROM, walk-up fixture 01 + its lab sound log (`brain-heal-setup-window.json`) | 634 | 797 (+163) | 829 (+195) / 830 | |
| ours before the fix (sct1 run 1) | 274,712 | 274,875 (+163) | 274,878 (+166) / +167 | +165 / +166 (17 prompts) |

Then, with the boxes aligned on their first characters, the five call boxes, the walks and `AskReadyForHead` have the same lengths on
both sides (box 1 65 frames, the walk 47 frames, ...). The ROM plays SE_SELECT on the two `\p` page turns (289,773 and 289,836; the fcr2
run 259,435 and 259,557; the lab log 1,169 and 1,303); ours played none.

The walk-up fixtures (August) could not show the wait: the heal press is invisible in pictures, and the compare trace pressed it 28 frames
late (oracle 661), which put the engine's box on the fixture's frame 829 with the wait missing. The lab's own sound log of the same
scenario puts MUS_HEAL at 634, so the press was at 632.

## The change

- `src/engine/postwin.ts`
  - `createPostwinStateFromRound(round, frozenSceneView, upcomingFrontierBrain)`: the call scene is chosen by the new argument, the next
    battle's brain status, not by the beaten trainer's marker. The scouting pages start as `POSTWIN_SCOUTING_LINES_BEFORE_ROLL` (the
    intro and the swap offer; pages 2-3 empty: no opponent exists yet, and nothing shows them before the GO ON).
  - `withPostwinUpcomingOpponentScouting(state, records)`: the pages from the opponent just rolled (the same `getFactoryOpponentCommentary`
    rule, `factoryCommentary.ts`, unchanged).
  - `postwinScoutingInputReadyDelay(lines)`: a scouting page takes A from first glyph (+4) + its characters - 1 + 3.
    `POSTWIN_SCOUTING_INPUT_READY_DELAYS` stays as the canonical pages' values ([72, 74, 72], now derived).
  - `CALL_SCENE_POKENAV_CALL_WAIT = 29` joins `CALL_SCENE_BRAIN_BRANCH_LAG` (1 -> 30): the heal text stays up and the first call box
    opens at MUS_HEAL + 195 / + 196. `postwinCallSceneAcceptPlaysSelect`: the `\p` boxes (3 and 4).
- `src/engine/factoryRoundBattleOrchestrator.ts`: `factoryRoundNextBattleBrainStatus(state)`, `frontier_getbrainstatus` for the battle
  after the current one (the round's streak + the next battle index, symbols); `preGenerateFactoryRoundNextOpponent` uses it for its
  existing "no GO ON roll before the Head" check (same values). The first-opponent roll is untouched.
- `src/engine/core.ts`: the generated postwin is created with `factoryRoundNextBattleBrainStatus(...) !== "not-ready"`; at the accepted
  GO ON, right after the existing `preGenerateFactoryRoundNextOpponent`, the pages are filled from `pendingNextOpponent` (not before the
  Head, which keeps `AskSwapBeforeHead`'s line); the call boxes take A or B and play SE_SELECT on a `\p` page.
- `tools/compare/traces/factory-brain-silver-walkup-callscene-01-off.json`: the heal press at the lab's frame (trace 142 = oracle 632,
  was 171 = 661). `npm run compare` against the oracle: 131/131 frames (old build with the old trace: 131/131 too).
  `docs/walkup-call-scene-ground-truth.md` has a correction note.

The rest of the call scene (its text from `factory-brain-walkup-script.json`, the walks, the `\p` page timing, the call at the heal
fanfare + 163, `AskReadyForHead`, `AskSwapBeforeHead`, no intro draws at the Head's GO ON) is the existing walk-up step A code; it now
runs after a played battle 20.

## RNG

No gameplay draw moved. The next opponent is still rolled by `preGenerateFactoryRoundNextOpponent` at the same accepted GO ON tick, from
the same orchestrator cursor; only its text is now shown. Checked:

- Seed 9 Scene ON, `makeTrace --battles 14` on this build against fcr2's trace of the same seed on the old build: all 14 battles' text
  (every move, hit, miss, faint, switch, opponent) is the same, line for line (180 lines; only the frame numbers move, a few frames after
  each win). The same seed played to battle 21 on this build, before and after the call-scene change, has the same 21 battles.
- With the old fixed accept delays put back (and the new text), every soak pin of `tests/randomRoundSoak.test.ts` and the old pic9 pin
  pass unchanged: the pins that moved (below) moved with the pages' accept frames, not with the text.
- Seed 2 Scene OFF (fcr2's Head seed) no longer reaches battle 21 on this build: in its battle 5 the test player sends out SUDOWOODO where
  the old build sent out AZUMARILL. That is the player's own choice: its forced party menu walk ("wander UP", "open SEND OUT") draws from
  its press-timing stream (the fsw235 note in the soak test), and the pages' new accept frames move its presses. A scan of seeds 0-29 in
  both scenes (`scan21/`, made before the call-scene change) found two seeds that reach the Head, 9 and 26 Scene ON (both win it);
  seed 9 is used below (made again on the final build: the same 21 battles).
- The per-frame (VBlank) model before the Head: the GO ON no longer adds an ordinary trainer's 4 intro draws (`postwinRngSteps(...,
  frontierBrain)`, already the ROM's in the walk-up fixtures, noland-room-scenes fix 8), and the call scene is 29 frames longer. That
  cursor is not the gameplay stream: the Head's party and his battle are drawn from the orchestrator's.

## Tests

- `tests/sct1ScoutingNextOpponent.test.ts` (new, Tier 1; the strong-route soak player plays a real first battle, core makes the postwin,
  the test presses through it):
  - after a win (rngValue 1: the next opponent's type and style lines both differ from the beaten one's, and are not the canonical
    lengths): pages 2-3 are empty until the GO ON, then the rolled opponent's; that opponent is the one fought next; each page's A is
    taken at its own accept delay; a 70-character page accepts at 76, not 74;
  - before the Head (round streak 19: the battle just won is the 20th, the next the 21st): call boxes 1-5, `AskReadyForHead`, page 1
    (`AskSwapBeforeHead`) straight to the swap offer; one SE_POKENAV_CALL 163 frames after MUS_HEAL; the first box's first character at
    MUS_HEAL + 196; SE_SELECT on the two `\p` page turns only; B takes a call box; no opponent rolled at the GO ON; the silver Head
    published at the swap answer;
  - `factoryRoundNextBattleBrainStatus`: silver after battle 20, gold after 41 with the silver symbol, none after 41 without it, the
    return battles with both symbols.
  Each fails with its part undone (checked: the old pages / brain flag; the wait at 0; no page-turn SE; A only).
- `tests/postwin.test.ts`, `tests/factoryBattleReturnPresentation.test.ts`: the new argument; the brain-flag test now checks that the
  beaten trainer's marker does not select the call scene and the next battle's status does.
- `tests/aud240dScriptSounds.test.ts`: the staged call-scene trace's fanfare, continue and call on the lab log's frames, and its two
  page-turn SE_SELECTs.

## Re-pins (separate commit)

- `tests/randomRoundSoak.test.ts`, M-B step 2 (c), the exploring ("full") policy's seed 1: 61,504 / battle 3 / turn 22 -> 58,793 /
  battle 3 / turn 19, same depth 2 / roundLost.
- `tests/pic9SwitchLines.test.ts`: full-policy seeds 0 and 1 now reach the come-back scales [0, 2, 3] (seed 1's new trajectory); seed 2
  reaches scale 1, so the seeds are 0..2 and the pin keeps [0, 1, 2, 3].

With the old accept delays both old pins pass again; every other pin is unmoved.

## Catcher, before and after

All runs from this build's own traces (`makeTrace`, the commands of the brief; evidence `catcher/`, `catcher-head/`, `catcher-head2/`),
`KEEP=1 JOBS=2 tools/frame-catcher/run.sh`; before = fcr2's runs (`.integration/evidence/fcr2/final/s9-on-ws`, `final3/s2-off-ws21-head`).

**Seed 9 Scene ON, 14 battles** (`s9-on-ws`): all 587 menus followed on both builds.

| | stretches content / timing | after-battle GO ON -> swap offer stretches | presses taken before a page's last character + 3 |
|---|---|---|---|
| before | 256 / 329 | 9 of 12 content (the wrong report's text) | 3 (at +1, +1, +2) |
| after | 246 / 339 | 0 of 12 content (all timing) | 0 (presses at +1 / +2 ignored, as on the ROM) |

After battle 1 both sides now print WATER / "weakening the foe to start." (67 and 66 characters, first characters at GO ON + 4, + 78 / + 79,
+ 160 / + 161: the ROM's replayed press on page 1 came one frame later), after battle 12 "no clear favorites" / "free-spirited"
(`curated/s1-after-battle1-s9on.png`, `s1-after-battle12-s9on.png`; ours on top).

**The Factory Head.** fcr2's seed 2 Scene OFF does not reach battle 21 on this build (RNG section); seed 9 Scene ON does
(`s9-on-ws21-head`, 21 battles, the Head beaten): 1,002 of 1,007 menus followed.

| | battle 20's last menu -> the Head's GO ON | GO ON -> the swap offer | after-battle stretches |
|---|---|---|---|
| before (fcr2, seed 2 OFF) | content: no SE_POKENAV_CALL, no call boxes, "Finally, the 7th match is next!" | content: the beaten trainer's report | 2 of 18 timing |
| after, first run (pages + brain flag only) | content: the call plays, SE_POKENAV_CALL at MUS_HEAL + 163 on both sides; the first box 29 frames early (ours + 166, ROM + 195); two SE_SELECT missing | timing ("I'm terribly sorry ...") | 18 of 18 timing |
| after, final build | sounds timing (24 of 24 events, the call and both page-turn SE_SELECTs); the first box clears at + 195 and types from + 196 on both sides, every box the same length | timing | 18 of 18 timing |

The one picture left in that stretch is ours showing the bobbing arrow on "Oh, my... Sorry to keep you waiting!" for 8 frames: the ROM's
replayed press came one frame after the box's last character (before any arrow), ours nine (the catcher's press replay drifts in a
stretch this long, README "What it cannot compare yet"); the ROM draws the same arrow when it waits (fcr2 run, 259,402-259,436).
`curated/h1-before-the-head-after-fix.png` (ours on top, both aligned on the call sound).

## Left open

- **The Head's own battle on the ROM is not the engine's here**: in both seed 9 runs the catcher's staging logs "Factory Head party
  ... same: false" and "opponent party is not the engine's at battle start" (the ROM's third Pokémon species 312, ours 287), so battle 21
  diverges at the foe's second send-out and the run stops 5 menus before the end (`stuck-at-unplanned-menu`). That is the Head party's
  staging (`romRun.py` `brain_traps`, the #55 build class, fcr2 "The Factory Head"), the same in the run before the call-scene change; not
  traced further.
- The Head's own win / loss lines (fcr2 finding 2) are not part of this change.
- Gold (battle 42) and the return battles take the same call scene by `factoryRoundNextBattleBrainStatus` (pinned by unit test); no ROM run
  reached them.
- `npm run typecheck` is `flock ... tsc -b` and the Mac has no `flock`; it was run as `NODE_OPTIONS=--max-old-space-size=8192 tsc -b`.

## Gates (final tree)

`tsc -b` clean; `npm test` (full suite) 1,909 files / 16,406 tests passed, 44 files / 243 tests skipped, 0 failed; `npm run test:gate`
360 files / 2,832 tests passed.
