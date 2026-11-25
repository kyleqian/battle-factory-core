# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-11-25)

The user approved `docs/finish-plan.md` on 2026-10-26 and restarted the
running CAX31 session on it. Run on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`, Opus 5.5 supervisor,
Sonnet 5.5 workers, headless in tmux. Commit locally; never push. Keep the
Mac supervisor stopped. Read the plan first, then PROGRESS.md's top entry.

## Standing user authorization (2026-10-26): daily runs

The user asked on 2026-10-26 for a run every day (16 hours since 2026-11-16).
The pokebench crontab starts `/srv/pokebench/ops/daily-run.sh` at 13:30 UTC,
and each run it starts is authorized. This supersedes the "fresh user authorization" and
"no recurring timers" wording in earlier handoffs, AGENTS.md and
LOCAL_SETUP.md; automatic push stays off. Do not edit or disable the
schedule. Leave this handoff ready for the next day's run and keep this
section when rewriting it. An OPEN entry in DEFERRED.md stops the next runs
from starting until the user resolves it, so use one only for a real user
decision. The run that was killed on 2026-10-26 (`cax31-20261026.jsonl`, exs207
worker on `worker/integration-20261026-213055`) was timing work; its branch is
kept and is long-tail.

## New schedule and the luck hunt (Kyle, 2026-11-16 ~07:50 UTC; set up by the top layer)

Kyle: "feel free to adjust the hours ... 10 hours was completely arbitrary ... I think sound is more important, though, like
as a priority." So:

- **Your run is now 16 hours, 13:30 -> 05:30 UTC** (`daily-run.sh` passes `-c 16`; the first one starts 2026-11-16 13:30). The
  extra hours go to **sound (S11), still the main program.** Plan the wind-down for about 05:10 UTC.
- **New day job, no Claude:** `/srv/pokebench/ops/day-hunt.sh` (crontab 05:45 UTC) runs `workspace/tools/replay-hunt/luckHunt.sh` under
  `nice -n 19` until 13:15 UTC and writes `.integration/evidence/luck-hunt/<YYYYMMDD>/` (log `/srv/pokebench/ops/day-hunt.log`; off switch
  `touch /srv/pokebench/ops/day-hunt.off`). It skips while that script does not exist, while a supervisor runs, or when the checkout has changes.
  Do not edit the ops scripts or the crontab; ask in DEFERRED only if the job cannot work as specified.
- **DONE 2026-11-16 night run (luck1): `tools/replay-hunt/luckHunt.sh` + 14 designs in `tools/replay-hunt/luck-designs/` (README "luckHunt"; seeds `1,000,000 + 20,000 x days since 2026-11-16 + k`). Spec kept below for reference.** One worker step in this run (and none later unless it breaks): build `tools/replay-hunt/luckHunt.sh`. Why: about 18 of the 56 rare
  rules left have no steer; they happen only when random events line up (Metronome's pick, an AI's random choice, a faint on an exact
  turn), under 1% of lab seeds at ~15 s a seed (rrh3, `docs/parity-mac/STATUS.md` "Box hunt 2026-11-14"). That is machine time, not
  night time. Spec:
  - **Designs:** one lab design per luck-only rule that makes the event possible: the rrh3 "not attempted" list (R030 R032 R035
    R037-R040 R067 R068 R080 R081 R097 R103 R105-R108 R110), plus R095 and R109 (tried, marker never ran), plus any other left rule whose
    blocker is luck rather than a missing set-up. Each passes `designcheck.py`; commit them (e.g. `tools/replay-hunt/luck-designs/`). A rule
    with no possible design in the Factory pools: give the reason in `rule-coverage.md` and leave it out.
  - **Loop:** round-robin over the designs, fresh lab seeds each round, never reusing a seed across days (keep a seed cursor in the
    evidence root, or derive seeds from the date); engine first (`prehunt.py` / `huntq.py`); on a marker hit, drive the ROM for that seed
    (`romReplayWide.sh --stage`) and record match / differ with the stage file.
  - **Interface:** env `LUCK_HUNT_DEADLINE_EPOCH` (start no new seed after it; exit 0), `LUCK_HUNT_OUT` (everything goes there),
    `LUCK_HUNT_JOBS` (parallel seeds, default 3). Writes nothing outside `LUCK_HUNT_OUT`: no tracked file, no git command. Ends with
    `summary.json` + `summary.md`: per rule, seeds tried, marker hits, ROM match / differ, stage files ready to promote.
  - **Prove it** on this box before the step closes: a 15-minute run with a deadline, on at least 3 designs, and a test that the
    deadline stops it. Name the result in PROGRESS.
- **Every run start, next to the nightly replay (minutes when nothing is new):** read the newest `luck-hunt/*/summary.json`. A ROM
  difference is that run's main program (a real bug: one commit per fix, a test that fails without it). A match: promote its stage file
  to `stages/coverage/` (the nightly replay then guards it) and count the rule covered in the tally.
- **The other rare rules** (about 38, each needs a hand-built set-up) stay a side job after sound, one step per run at most.

## Getting the repo ready to be public (Kyle, 2026-11-17; done by the top layer, nothing to do here)

Kyle plans to make this repo public with its full history (no rewrite, no license). The top layer changed only these:
- The root `README.md` is now the short public front page. The layout notes it used to hold moved to the root `CLAUDE.md`.
  `oracle/SETUP.md` has the `../vendor` rebuild steps.
- The box's address, the Hetzner and firewall IDs and the SSH key name were taken out of `docs/cax31-arm-runner.md`
  (the `pokebench-cax31` SSH alias on the Mac holds them). Home-folder paths became placeholders.
- `tests/setup/decompCheck.ts` (a second `globalSetup` in `vite.config.ts`) only prints a notice when
  `reference/pokeemerald` is missing or not built (no `pokeemerald.elf`), as on a fresh clone. It never fails or skips a test; here it stays silent.
- Once the repo is public, everything committed is published at the next push. Keep secrets, server addresses and
  personal paths out of commits, as before.

## From the Mac, 2026-11-23 (top layer): first-use move animations and sounds on the website

- **Where these came from:** Kyle's live play on the website on 11-22 (build `eb-aeaa423d18bf34fe`). These were the problems:
  - The first hit of WHIRLPOOL and a SPARK were not animated.
  - The first BITE sounded faint, because its attack was cut.
  - The Salac Berry sparkle (SE_SHINY) was silent.
  - All four happened in the browser only: the headless engine and the frame catcher matched the ROM picture for picture. The site's
    `contained-error` events named the two animations (`AnimAssetPending water-orb`, `dynamicPunch`).
  - Kyle approved both fixes on 11-22. They are on Mac master `2f69f51b2`. The website has run them since 11-22 ~19:05 UTC (build
    `eb-bc9f337e6d54769f`).
  - **Delivered as branch `box-merge-20261123`:** Mac master `2f69f51b2`, then your 11-22 night run (cax31/master) merged, then this
    handoff.
    - Merge commit `8dea83294` (your `195b47e29`). On it: `tsc -b` clean; full suite 1,972 files / 17,246 tests passed, 1 failed:
      `tests/animation/helpingHandEvidence.test.ts`, whose ROM probe hit its 60 s timeout while the Mac was loaded (the suite took
      28 min); it passes alone in 7 s. `battleSoundTable.ts --check`: current.
- **fam1, first-use move animations** (`docs/fam1-first-use-move-animations.md`):
  - `presentationContainment.ts` `withPresentationRender()` (wrapped around `render()` in core.ts) rethrows `AnimAssetPending` inside a
    render. The loop then holds the frame until the file arrives (the dl3/dl4 hold), as for `MonPicPending`. Before, the error was
    contained, the command degraded, and the animation was dropped. Seams on the tick still contain it.
  - `src/assets/gen/anim-asset-moves.json` (the prefetch table) is rebuilt from per-move recordings
    (`tools/bundle/animAssetMoveReads.ts`, `tools/bundle/animAssetNeeds.ts build`). It has 175 entries: 45 Factory moves gained files,
    WHIRLPOOL and SPARK among them. Over 42 soak and 277 staged battles, no read was missed.
  - Still open: Open Level TYRANITAR's Sand Stream. Its sandstorm file comes from the ability, not a move, so the first sandstorm holds
    briefly while it loads. It is not dropped.
- **fsn1, first-use sounds** (`docs/fsn1-first-use-sounds.md`):
  - Each battle's sounds are fetched during the walk-in and the intro. This uses `src/audio/battleSoundNeeds.ts` with
    `src/assets/gen/battle-sounds.json`, which maps a move to its SEs and is made by `tools/bundle/battleSoundTable.ts --write`
    (`--check` compares).
  - `src/audio/player.ts` plays a late file from its start, a little delayed, if it is a one-shot SE or cry of at most 2 s and at
    most 0.25 s late. Before, it started mid-sound. Counters: `lateDelayed`, `lateClipped`, `lateLost`.
  - First battle: about 1.3 MB more sound up front. Later battles: about 100-150 KB each.
- **What this means for you:**
  - Headless output is unchanged: census seeds 200..209 are identical, and soak, census and catcher pins do not move.
  - If you change a move animation script or the move-to-SE wiring (`moveAnimSounds.ts`), run
    `tools/bundle/battleSoundTable.ts --check` and `tests/fam1*.test.ts`.
  - Keep the containment rule: `AnimAssetPending` is rethrown only inside renders.

## From the Mac, 2026-11-22 (top layer): move-hit timing, info-card animations, result cards, sound timing, Open Level

- **Where these came from:** Kyle's live battle of 11-21 on the website, compared with the ROM by the frame catcher
  (`tools/frame-catcher/`). Kyle approved all three fixes on 11-21. Each doc has the ROM evidence and the tests.
  - **Delivered as branch `box-merge-20261122`:**
    - master `fe9b51517`: `32c233e62` (the Mac fixes below and your night run `3507c89b2`, merged by hand) plus Open Level's
      first part;
    - then merge `4aa473749`: Open Level's ROM checks (opl5) and the oracle clock pin (rtc1);
    - then this handoff.
    - On the delivery tree, `tsc -b` is clean and the full suite passes: 1,946 files, 16,852 tests, 0 failed (44 files skipped,
      as on master).
- **hit1, move-hit timing** (`docs/hit1-move-hit-timing.md`, `src/engine/animEndSeWait.ts`):
  - The ROM's `Cmd_end` (battle_anim.c:476-524) waits up to 90 frames while a move's sound is still playing (`IsSEPlaying`).
    The effectiveness SE, the hit blink and the HP drain all wait for that end.
  - The engine now models this wait for every live move animation, from the new `src/data/gen/se-song-rows.json`
    (extractor `tools/extract/extract-se-song-rows.ts`). Before, it covered only Rain Dance, stat change, Sing and Charm.
  - THUNDER PUNCH: the effectiveness SE now plays 85 frames after the punch (ROM 86, 33 of 33 hits); before, 52.
  - A second bug: after an earlier sound lead, a later move's effectiveness SE played 7-9 frames early. Fixed.
  - Still open: FUTURE SIGHT is 14 frames late, hail 4 frames late, and a +6 group (WATER GUN, ACID, CRABHAMMER,
    DIZZY PUNCH). POUND and STRENGTH are not yet measured.
- **sfa2, info-card (summary) front animations** (`docs/sfa2-summary-front-animations.md`):
  - All 62 motion types are ported from `pokemon_animation.c`, checked against a ROM probe over all 376 Factory species
    (`tools/probe/sfa2-summary-front-anim-rom.py`). sfa214 (10-27) used a static stand-in for 137 species.
  - Still open: the ROM's start lag varies by 1-2 frames, and UNOWN always draws letter A.
- **rc1, result holds** (`docs/rc1-result-holds.md`, `src/engine/resultHold.ts`): a new library option, `lobby: "walk" | "skip"`.
  - The default is "walk", which is unchanged: soak, census and the catcher do not move.
  - Under "skip" (the website's new challenges), the game holds a black frame instead of warping to the Lobby:
    - after a loss, forfeit or retire ("end");
    - after a 7-win round, following Noland's symbol scene ("round"). A or START after 30 frames applies the carry
      (+7 streak, symbols, BP) and deals the next round's draft.
  - This is not ROM behaviour, by design (Kyle, 11-21: a result card instead of the Lobby walk for new players).
- **tdr1, the frame catcher's timing report** (`docs/tdr1-catcher-timing-report.md`, `tools/frame-catcher/timing.py`):
  - Every catcher run now measures how far its sounds drift from the ROM's and ranks the gaps that lose the most frames
    (report.md near the top, the console line, summary.md). Before, a "timing" stretch was never measured.
  - A gap that spans a text box press is split at the press. If the ROM took the same press, the drift up to it is the
    driver's, not the game's. romRun.py now logs which of our presses each ROM press replays.
  - Baseline on 6 fresh traces (28 battles): 79.3% of sound gaps within 1 frame, 9.9% off by 6+; after the three fixes
    below (25 battles): 81.2% and 8.0%. Game frames off per 7 battles: 1,419 -> 1,045.
- **Three timing fixes found with it, each checked against the ROM:**
  - wtl1, after every win (`docs/wtl1-win-tail-timing.md`): "Player defeated" printed 24 frames early and the trainer
    slid in 17 early. Both now wait for the victory BGM and the slide's dispatch as on the ROM (22 of 22 wins).
  - tri1, battle intro (`docs/tri1-transition-intro-handoff.md`): every transition handed over to the battle intro after
    one of two fixed lengths. Each now hands over at its own ROM frame (`ORDINARY_INTRO_HANDOFF_AFTER_BGM` in battleRoom.ts),
    and the transition's clock runs from the battle BGM. Music -> ball tray matches in 30 of 30 battles (was -31 to +15).
  - sst1, end-of-turn sandstorm (`docs/sst1-sandstorm-continues.md`): SE_M_SANDSTORM 8 frames late, and "X is buffeted"
    2 or 8 frames early by turn order. Both are on the ROM's frames now.
- **Your night run (3507c89b2) is merged in 32c233e62 by hand, because it fixed some of the same things.** Where both
  sides fixed the same ROM behaviour, your version stays:
  - "Player defeated": your wtl1 (WIN_TAIL_PRE/POST_RECEIPT_ROWS) stays. The Mac's wtl1 hold (withWinPrintHold) is
    removed; both landed on P + 26. The Mac's trainer-slide lead after the press (WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES 14,
    lose text 55 frames after the press, 22 of 22 wins) is Mac-only and stays. Note: two docs now say "wtl1"
    (yours in `fnt1-fainted-box-clear.md`, the Mac's `wtl1-win-tail-timing.md`).
  - Sandstorm "is buffeted": your etp1 print lead stays and sst1's command tail is removed. sst1's sandstorm SE
    (8 frames sooner) is Mac-only and stays.
  - Metal Claw: your bdt1 window (154) stays. hit1's Cmd_end SE wait skips move 232, since it is the same 14 rows.
  - Transitions: tri1 times the ordinary room's handoff per transition (#225's ordinary room), and now uses trn226's
    LOGO_WAVE start te 32 and LOGO_WIGGLE drawing there too.
  - Catcher on the merged tree (6 fresh traces, 28 battles): 83.1% of sound gaps within 1 frame, 6.7% off by 6+, 782 game
    frames off per 7 battles (e7ea2caf8 alone: 81.2%, 8.0%, 1,045). Music -> ball tray 28 of 28.
  - Open: a win by an end-of-turn KO (poison) still prints "Player defeated" ~24 frames early (neither rule covers
    it); our box blanks 2-8 frames before the sandstorm text while the ROM keeps "The sandstorm rages."; LOGO_WIGGLE
    hands over at BGM + 160 in the ordinary room vs trn226's 161 (Noland room).
- **Still open from tdr1:**
  - The Speed Boost gap, the SHIFT recall and the punch moves. The ROM's victory BGM sometimes starts 1 frame sooner.
  - Hail and sun likely share sandstorm's faults; they were not in the sweep.
  - The ROM's battle RNG depends on how long the transition runs; ours does not.
  - The canonical recorded route draws ASYMMETRIC_SPIRAL_IN_SEQ for battle 1 where the ROM drew CIRCLES_MEET. That route
    keeps the old fixed clock (`perTransition` false) so its fixtures still match.
  - Not game bugs: the ball tray after a foe faints is 0-4 frames later on the ROM (its AI's CPU time picking the next
    Pokemon), and the "fainted!" print is 3-6 frames early (fnt1, already open).
- **Luck hunt, three designs stuck (Mac, 11-22) — RESOLVED 2026-11-23 (luck7):** R040 / R110 rebuilt as hand-built labs and promoted, R063 class (b); no open design is left, so the day hunt now skips every design (repurposing it is the top layer's call). the day hunt found 16 rare battles from 11-17 to 11-20, all ROM-matched.
  On 11-21 and 11-22 its three open designs (R040 clefable-taunt-mirror-coat-replacement, R063 chansey-metronome-transform-
  ends-disable, R110 roar-drags-wounded-onto-spikes) got 0 marker hits in about 5,900 seeds. Rework them so less luck is
  needed: hand-set more of the situation, more tries per battle, or a shared battle (luck5's coverAny). Use `PREHUNT_CALLS=1`
  to estimate each design's chance per seed first. Until they change, the day hunt spends its hours on them for nothing.
- **Open Level is being built ON THE MAC, not here (Kyle, 11-22: "can we get started on making sure open levels work
  ... I want you to be able to play through different rounds and have it match what the actual ROM would produce").**
  Kyle split the two machines: the Mac takes Open Level, and this box keeps sound timing (item 0) as its headline, plus the
  luck-hunt rework above.
  - Do not start Open Level work here. The Mac lane's branch merges into master at its checkpoints, and you fold master at
    run start as usual.
  - **Its first part is in this delivery (master `fe9b51517`, Kyle's OK 11-22):**
    - The engine option `level: "open"` is for tools only. The website stays at Level 50 until Kyle decides.
    - New: the Open bootstrap profiles (`oracle/bootstrap/factory-open*.json`), the Open ROM tools (`tools/openlevel/`), and
      `REPLAY_LEVEL=open` in `romReplayWide.sh`.
    - Fixed: Sand Stream's permanent sandstorm no longer runs down (Level 50 can't reach it).
    - Checked: the Level 50 census is byte-identical to `32c233e62`, and the full suite passes.
    - Evidence: `docs/opl1`..`opl4-*.md` (15 Open challenges and 121 battles against the ROM's RAM; 165 whole Open battles
      replayed; 620 Open soak runs with 0 crashes).
  - **Also in this delivery (opl5, `docs/opl5-open-level-more-runs.md`):** these all match the ROM, over 97 more battles:
    switching levels at the Lobby both ways, a gold Noland run, and the after-save start at Open (new snapshot
    `oracle/bootstrap/factory-open-after-save*.json`). Tools only, no engine change.
  - **New for item 0d's nightly replay (Kyle, 11-22: "nightly replay should do some open battles"):** from this run on, also drive
    these at Open Level, scene OFF:
    - 6 census seeds drawn by the same generator as the pool seeds, with `REPLAY_LEVEL=open`. Give one of them `CHALLENGE` 7
      (sets 372..881, full AI).
    - 1 gold Noland (`SYMBOLS` 1, a seed with seed % 49 == 26).
    - The 7 stages in `docs/parity-mac/stages/opl3/` (`--stage`; each stage names its own level).
    - Put them on their own line in `docs/replay-ledger.md`.
    - Level 100 battles last longer. If a battle stops on the engine frame budget or the ROM drive cap with every state so far
      matching, it is a Struggle stall, not a mismatch: drive it again with `REPLAY_FRAME_BUDGET=6000000
      REPLAY_DRIVE_FRAMES=2500000` (Open seed 208 runs 365 turns and matches the ROM to the end).
  - **The "drive again once" flake's cause is found** (`docs/opl3-open-level-rom-replay.md`, "c7 seeds 22, 26, 27"):
    - The emulated clock starts at the process's start time (`oracle/emerald_core.py`, `use_simulated_time()` with no
      argument).
    - Once a day, a start time inside a ~30-second window makes the game's daily update spend extra random draws, so the ROM
      plays another battle. This hits Level 50 too: the bulk run's nine seeds in a row, 4777..4812.
    - **Fixed in this delivery (rtc1, `docs/rtc1-oracle-clock.md`):** `oracle/emerald_core.py` now starts the clock at a fixed
      local time (`RTC_START`, 12:00), so it is the same on every host and in every time zone.
    - Checked on the Mac:
      - c7 seed 26 gives the normal battle at every faked host time.
      - Every bootstrap's frame-0 picture and `gRngValue` are unchanged.
      - The last ledger line's 44 battles plus all 125 stages match: 169 / 169, no re-drive.
      - The catcher's Level 50 findings are identical.
    - **Restart the oracle servers (:8012 / :8014) at run start** so they pick it up.
    - A battle that matches 0 states should not happen any more. If one does, record it in PROGRESS with the process start time.
  - To avoid another double fix like the two wtl1s, leave these alone unless your step needs them, and keep any change
    small and named in PROGRESS: the Lobby level menu (`factoryLobbyAttendant.ts`), rental / opponent / Noland
    generation (`factoryRentalGeneration.ts`, `factoryOpponentGeneration.ts`, `factoryBrainOpponentGeneration.ts`),
    `factoryCorpusParty.ts`, `factoryRoundChaining.ts`, `factoryAiDecisionPolicy.ts`, `prebattleRoom.ts`,
    `factoryAnchorSession.ts`, `oracle/battle_lab.py` and the oracle bootstrap, and the ROM drivers' level handling
    (`soundCensusRomReplay.ts`, `romRoundDriver.py`, `romNolandScene.py`, the frame catcher's `romRun.py`).
  - Lv50 must stay unchanged: the Mac lane checks census eventsDigest at Lv50 before each merge.
  - Two timing finds from the Mac's Open Level catcher runs belong to YOUR sound-timing lane, since neither rule reads the level
    (details in `docs/opl4-open-level-proof.md`, "Found, not fixed"):
    - A player's Pokemon knocked out at the end of the turn by Leech Seed or Perish Song: the ROM waits for the press on
      "X fainted!"; ours waits on the message before it and shows "fainted!" for only a few frames. Seen at Open in o14on (DODRIO)
      and o5off (SLAKING). This goes with fnt1's end-turn knock-out timing. **Checked 2026-11-23 (etk1, `docs/etk1-end-turn-ko.md`): not reproduced at Level 50 (Leech Seed / poison / Perish Song end-turn KO prints exact in OFF); the Open runs need their own reproduction.**
    - The Lobby after a lost challenge: after "record your last BATTLE FACTORY match?" NO, the ROM's farewell box closes earlier
      than ours, so presses made during our text walk the ROM's player away from the attendant. Measure the farewell's first-glyph
      frame on both sides (see `docs/lbb1-lobby-b-press.md`). **Fixed 2026-11-23 (lbf1, `docs/lbf1-lobby-farewell.md`): the farewell text was already ROM-exact; free control returned 1 frame late (D + 3 vs the ROM's D + 2).**
- **For your tools:** fixed-frame traces recorded before hit1 and tri1 drift on this build, because every move
  animation's end and every battle intro move. Make fresh traces with makeTrace.
- The website runs **eb-aeaa423d18bf34fe** (master 32c233e62 = the Mac's fixes above + your night run 3507c89b2) since
  11-22 08:53 UTC (Worker 3abe2d2d). Open challenges on older builds (eb-12ab, eb-c3f7, eb-01c1, eb-f174) finish on their own build.

## From the Mac, 2026-11-21 (top layer): the frame catcher over whole challenges, and sixteen fixes

- **The frame catcher** (`tools/frame-catcher/`, README) now follows whole challenges in both scenes: round 1 (fcs1,
  `docs/fcs1-catcher-sweep.md`), round 2, the Lobby between rounds and the Factory Head (fcr2, `docs/fcr2-catcher-round2.md`; the
  Head's party trap holds the VBlank undo to the build's return, `docs/hdt1-factory-head-team.md`), and rounds picked for unseen moves,
  items and abilities (fcm1, `docs/fcm1-catcher-sweep.md`, `tools/frame-catcher/pickTraces.py`): 92 rounds so far, 244 of 300 moves seen.
- **Game fixes now in master** (Kyle's word, 11-20 and 11-21; each doc has the ROM evidence and tests):
  - fcs1: rnc1 (rain continues draws General_Rain), lrc1 (the loss's animated return to ball; it replaces aud252's loss SE_BALL_OPEN
    call: the recall switch-out plays it), snd3 (Intimidate SE, Baton Pass return, quiet BGM), pkm1 (PKMN glyphs).
  - fcr2: sct1 (the scouting report names the next opponent; the Head's phone call before battle 21 / 42), hdl1 (Noland's end-of-battle
    lines by tier; the bike TRIATHLETEs centred on their tile), lha1 (victory music after the turn's last command: no low-HP alarm after
    a SHELL BELL win; a stat-up berry flashes its holder), **fop1 (gameplay: a challenge's first opponent is rolled in the ROM's order,
    ids -> opponent -> personalities; Kyle reversed the 11-18 "leave Finding 47")**.
  - fcm1: wbh1 (the battle-start WHITE HERB is presented), msg2 (WISH names the wisher; "HP is full!" pause; the dragged-out release
    tail), fnt1 (the "fainted!" / "Player defeated" box: press from G+1, arrow every 9 frames, a press on a redraw frame blanks the box,
    checked on 1,502 ROM boxes), mvs1 (WILL-O-WISP's orb SEs; Scene OFF SUBSTITUTE / TRANSFORM SEs, called or not), lbb1 (B on every
    box that waits for A or B; B = NO on RECORD / RETIRE; the pre-battle room's three-entry menu no longer wraps).
- **This merge** (your run f5274b48a + Mac master ea3220630): conflicts resolved in battleResolutionPresentation.ts (lrc1 beside chg1),
  the Lobby attendant menus (your lbw9 kept: it covers lbb1's Lobby part), tickSounds.ts, appTrace.ts stage tables (both). One code change
  on the combined tree: bb06468b3 (hcr1b's Scene OFF one-frame sound lead counted twice on mvs1's Transform / Substitute bodies, which
  were fitted to the ROM's sound log; now 0 on that emitter only). Re-pins (5bd740c44): soak seed 21 / full seeds 0-1 / #89 Baton Pass seed 4
  (halt 1,329 frames inside its budget) / #99 vanilla seed 2, lbre cursor 0xca70e7db, flow1 Dig recall seed 163 (ROM-checked). Full suite
  1,929 files / 16,655 tests passed.
- **For your tools:** since fop1, a census or measurement tool that builds a round from a seed should go through
  `tools/integration/censusRound.ts` (keeps the old-order battles the census pins were made on); the tools you added on 11-20 / 11-21
  (b4m, hcr3m, drv1, cln10 / cln11 labs) were not checked against it.
- **The catcher's findings are fixed on the Mac (Kyle, 11-21).** What they left open is listed in each doc's last section so you know it
  (the 65 METRONOME-only moves have no animation; "fainted!" prints 3-6 frames early in the turn; "Player defeated" ~25 frames early after
  the winning faint; WILL-O-WISP's picture 8 frames early; end-of-turn lines after a drag-in 13 frames early; stat-change SE timing). Your
  own plan is unchanged.
- Fixed-frame traces recorded on an older build replay only on that build (fop1 moves every challenge's first opponent; fnt1 / lbb1
  move when presses are taken).
- Not on the website yet.

## From the Mac, 2026-11-20 (top layer): Kyle's live-play fixes merged, website on `eb-c3f7c43f5c1a9e62`, frame catcher, menu cursors + trap animation

- **Kyle played the website on 11-20 and reported gaps.** The Mac fixed them, and they are merged into master with your
  11-19/20 run (merge `f384faa7d`, no conflicts: your side changed notes only). Merged Mac master `aa4cc49ce` (with snd2 + fcp1 below): `tsc -b` clean; full suite 16,279 passed, 2 failed only from old untracked files in the Mac's main folder (a stale `dist-lib/`, a July scratch file under the ignored `tools/compare/out/`), both pass on a fresh build / clean tree.
  - Sound: cursor and A sounds in the battle action menu and move list; the ball-tray sounds no longer cut each other off
    (voice release + prefetch in `src/audio/player.ts`); SE_EXIT on the first walk into the battle room; the Ice Ball impact
    and effectiveness sound anchor; 187 move sound recordings that were missing; Lobby and briefing sounds.
  - Pictures: a live route never draws the canonical sample battle any more (`noteCanonicalSample` in `src/engine/drawRecord.ts`
    throws under tests and records a contained error in the browser; Kyle saw Murkrow at a send-in, and a Bug Catcher in the
    room after a win). The first room draws its trainer; 16x16 overworld sprites stand with their feet on the tile bottom (the
    Tuber was a tile high); B in the battle party menu fades out and in (`party_menu.c`); the Scene OFF send-in fade; the forced
    party menu clock; the switch lines come from the foe's HP (`Cmd_hpthresholds2`).
  - Not a bug: Petal Dance ended with no confusion because Protect blocked it (`battle_script_commands.c` cancels a blocked
    rampage without confusion). Kyle's three battles match the ROM on rules (battle-only ROM replay).
- **Frame catcher** (`tools/frame-catcher/`, see its README): one whole round, engine against ROM, every frame and every sound.
  It is a bug catcher to run now and then on different battles, not a gate. Its README lists its traps (judge a sprite position
  on a frame after the sprite stops; patch the ROM's foe party only after the ROM has built it).
- **The catcher's open findings, fixed and merged too** (merges `fce4577b7` snd2 and `aa4cc49ce` fcp1, Kyle's word; write-ups
  `docs/snd2-catcher-sounds.md`, `docs/fcp1-frame-catcher-pictures.md`):
  - Sound: a Pokémon sent in and knocked out in the same turn cries as itself; the swap screen's SUMMARY cries the party
    Pokémon it shows; the same sound started twice on one frame is one sound. Four sound findings were the catcher's own
    mistakes (Rollout x10, swap and party menu sounds, SE_FAILURE in the party menu, summary music calls); fixed in the catcher.
  - Pictures: the player's HP box after a re-sent Pokémon; Ingrain's end-of-turn heal animation and its sounds
    (`INGRAIN_HEAL`); the foe Spinda's spots; the draft's name red after a summary visit; the party menu's message box while
    it closes, and "Choose POKéMON or CANCEL." with one Pokémon left.
  - Confirmed on the ROM, NOT fixed (yours, with the room timing work): the room after the swap screen. The ROM holds black
    15 frames, fades in over 15, then "Thank you! Your POKéMON swap is complete." (waits for A) before "Right this way,
    please!"; ours shows the room at once and skips the message. It moves the room's per-frame RNG for every later battle.
    Details: `docs/fcp1-frame-catcher-pictures.md` "Not fixed" item 4.
- **Three more Mac fixes, merged** (Mac master `43669b6f1`, Kyle's word, 11-20; checked against the ROM by the catcher and labs):
  - flow1 (`docs/flow1-menu-cursors-and-locked-switch-recall.md`): the move menu opens on the first move after every switch-in
    and after Transform (`HandleAction_Switch`, `SwitchInClearSetData`, `PlayerHandleSwitchInAnim`); ours kept the old cursor
    after a voluntary switch. A switch while one side is locked into a two-turn move (Dig, Fly, Bounce, Ice Ball, Rollout,
    Petal Dance, a recharge) now prints the recall line and plays the recall, both for the player ("that's enough! Come back!")
    and the trainer ("withdrew"). Open: the player's Dig charge turn in Scene OFF ends ~20 frames early (seed 18).
  - trp1 (`docs/trp1-turn-trap-animation.md`): the end-of-turn trap animation (`General_TurnTrap`) before "X is hurt by Y!":
    Fire Spin, Whirlpool, Sand Tomb (their move bodies, cut down), Wrap / Bind (Constrict's tendrils, new art), Scene OFF the
    35-row pause; frame-exact and sound-exact on 24 labs. Clamp is timed and sounded but not drawn (no Factory set has it).
  - fcr1 (`docs/fcr1-catcher-rental-personalities.md`): the catcher's ROM side gets the engine's rentals' personalities, so
    gender and ability match; seeds 6, 3, 1 and 8 now match the ROM turn for turn.
  - Gameplay digests of Kyle's trace and the catcher seeds are unchanged; soak test-player pins moved (each re-checked, no rule
    change). Merged together: `tsc -b` clean, full suite 16,320 passed + 1 soak pin re-pinned (#104 two-round-wins seed
    13 -> 19, scan 0..49: seeds 19 and 47 carry 14, 0 crash / 0 hang), then that file and the four other moved files pass.
    Not on the website yet.
- **Leads from the Mac sessions, not fixed, not filed** (reports, not all checked on the ROM; yours to check and file, or fold
  into #219): our sound recordings play 1.2-1.45x quieter than the game; A does not speed up text; the attendant menu wrap
  and the save wait; the left pans of Blizzard and sound 132; Ice Ball's 4th and 5th rolls hit late; SELECT move swap;
  Elekid's Thunder Punch lead +18 / tail +25 frames (your hit-sound lead work covers this).
- **The website runs `eb-c3f7c43f5c1a9e62`** (Mac `dfd34c432`, same `src/` as master; deployed 2026-11-20 ~06:55 UTC, Worker `040bab81`, on
  Kyle's word). Site fix with it: the site's bundler no longer inlines the game's small files as data: URLs, which the
  content security policy refused (Safari lost 33 sounds on the live site). A host with a content security policy must do
  the same (`docs/library-package.md`).

## From the Mac, 2026-11-19 (top layer): fixes 44-51 merged, website on `eb-01c15b77495c4068`, #225 queued

- **Merged into master with your 2026-11-18 run** (merge `d75ddd3b0`; its message lists the conflicts and re-pins): the whole-round ROM
  replay (fixes 44-46, `docs/parity-mac/STATUS.md`), Noland's lines and heard-speech bits (48-49), and Noland's battle-room scenes and the
  symbol scene frame for frame on the ROM (50-51, `docs/parity-mac/noland-room-scenes.md`, 13 recordings in `tests/fixtures/noland-room`).
  Finding 47 stays as it is (Kyle). Re-pinned in the merge: `tests/lbrd.test.ts` seeds (0) and `tests/randomRoundSoak.test.ts`.
- **The website runs `eb-01c15b77495c4068`** (Mac `aeac1cdcb`, deployed 2026-11-19 ~03:20 UTC on Kyle's word, with the save's Factory
  record kept per player). This replaces the build named under **Website** below. Later builds reach the site only when Kyle asks.
- **ISSUES:** the Mac's Factory Head music entry is now #224 (you took #223). **#225** (seven of the twelve Frontier transitions drawn as
  CIRCLES_MEET, every trainer) is queued at **low priority** on Kyle's word: after sound and the battle rules, when a run has room.

## Website load time: the engine's start-up and download size (Kyle, 2026-11-16 ~12:50 UTC: "Yes, brief the box")

The top layer measured the live site (Chromium with network and 4x CPU throttling for a phone) and fixed the site side
(factory-web `2c4e1d9`): the page no longer waits for the engine, the files are prefetched and cached, the Start screen
shows in ~0.4 s. What is left is the library's. Sound stays the main program; this is **one bounded worker step in
this run** (step A), and step B only as a measured proposal.

- **Where the time goes (game build `eb-c26961a07ff6b07b`, the site's):**
  - Unpacking on a phone CPU: the `lib` chunk's module evaluation **~1.9 s**. Each data chunk ~30 ms, the sprite
    chunk 0.18 s.
  - Node profile of `import('<abs>/dist-lib/index.js')`: **~770 ms** unthrottled (headless 627 ms; the Worker's replay
    check pays this too).
    - The lib top level is ~550 ms.
    - `createBattleScriptStatusRulesHandlers` / `createBattleScriptStatusRulesExecution` (~450 ms) build the
      battle-script rule tables at import.
    - Fixed sample battle turns run at import (~250 ms inclusive): `stagePlayerHitChainToTerminalMachineState`,
      `submitFactoryFullTurnDecision`, `resolveTurn15FlyResolutionAdapter`, `stageFeatherDanceKickoff`,
      `resolveBattle1PresentationHpValues`, `stageTurn13DragonBreathHitChain`, `stageTurn2EndeavorHitChain`,
      `stageRockSlideTail`, `stageTurn8Bind` ... (old precomputed tables, it looks like).
    - Compile ~150 ms.
    - Reproduce: `node --cpu-prof --cpu-prof-interval 200 --input-type=module -e "await import('<abs>/dist-lib/index.js')"`,
      then rank by inclusive time.
  - Download, brotli, 3.26 MB in all: `assets-sprites` ~1.0 MB, `lib` 0.81 MB, `assets-gen` 0.42, `animation-assets`
    0.36, `data-gen` 0.26, `data-battle-script` 0.24. On a 1.6 Mbps phone network that is ~18 s before the first
    battle, whatever the site does.
- **Step A: DONE 2026-11-16 night run (lazy1, `docs/lazy1-import-time.md`): Node `import()` of `index.js` ~3x faster at the same load (2,480 -> 810 ms on the loaded box; ~230 ms quiet estimate, the 200 ms target not reached: the rest is compiling the chunks).** Step A (this run): make import-time work lazy.
  - The rule tables: build them on first use, or once per session.
  - The sample-battle code that runs at import: make it lazy, or delete it if nothing reads it (say which, per table).
  - Target: Node `import()` of `index.js` under ~200 ms; report before / after ms for `index.js` and `headless.js`
    in PROGRESS.
  - **No behaviour change.** A differential like every presentation slice (digests, kernel events and frame hashes
    identical on the soak / census seeds), full suite, build / build:lib, the usual soaks, and the nightly replay set.
  - `ENGINE_BUILD` moves: name it in PROGRESS for the website. Keep the library contract as it is:
    `mountFactoryGame` returns synchronously, and `ready` / input behaviour is unchanged (`docs/library-package.md`).
- **Step B: measured (dl1, `docs/dl1-download-size.md`: ranked ideas) and idea 2 built (dl2, `docs/dl2-sprite-repack.md`: sprite sheets as image rows, first-battle download ~2,363 -> ~2,102 KiB brotli-11, frames identical). Not built: per-species pictures (~677 KiB, needs a hold rule + an optional `spriteBase` option), per-move animation assets, the retired canonical march (needs a product decision). The handoff's 3.26 MB matches gzip-9, so check that the CDN serves brotli-11.** Step B (measure and propose; build only if A is in and a run has room): download size.
  - Load battle pictures per battle (the species on screen) through the existing pixel provider
    (`src/engine/monPicPixels.ts`) instead of the whole 11.8 MB sheet.
  - Find dead code in `lib` (the legacy sample-turn adapters above).
  - Pack the big number-array tables tighter.
  - Estimate bytes saved per idea, and the risk. Any API change is additive and named for the website.

## State at restart (written at the 2026-11-13 wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`062a82a3f`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `90c6684d5`; if the Mac moves that branch again, merge the new tip the same way
  (typecheck, its touched tests, full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`); steps 1-3 folded; **step 4 (screens) DONE**: aud240a (draft /
  swap / dialogs), aud240b (summary), aud240c (battle party menus, `docs/aud240c-party-menu-sounds.md`), aud240d (Lobby /
  PreBattleRoom / BattleRoom scripts, heal + BP fanfares, `docs/aud240d-script-sounds.md`). Emitters live in
  `src/engine/screenSounds.ts`. Prove windows in probe **step mode** (the hybrid `--fast` mode drops no-op SEs); one-command fixture
  recipe in PROGRESS (sep257: `--compact`, trace key, `--rm-log-on-success`); `compare:differential --harness-from-head` (dif256).
  aud240d left unmeasured: MUS_OBTAIN_SYMBOL, PauseChallenge SE_SAVE, the Brain SE_POKENAV_CALL absolute frame.
  **Step 5 (battle controller) DONE (2026-11-05):** aud241c battle end / return (`src/engine/battleEndSounds.ts`,
  `docs/aud241c-battle-end-sounds.md`, ROM fixtures `docs/aud241c-fixtures.md`; generated route only), aud241a battle start / send-outs
  (`src/engine/battleStartSounds.ts`, `docs/aud241a-battle-start-sounds.md`, ISSUES #196) and aud241b effectiveness / SE_FAINT /
  faint cry / low-HP (`src/engine/battleHitSounds.ts`, `docs/aud241b-battle-sounds.md`, timing deltas ISSUES #197). Both emit
  from `tick()` in `src/engine/core.ts` behind `soundCollecting()`. Lab staging for sound windows: `tools/compare/appTrace.ts`
  stages (`midBattleSwitchStage` options bag) + `tools/battle-lab/aud241*`.
- **Audio step 6 (aud242) first slice DONE (2026-11-06):** aud242a `src/engine/moveAnimSounds.ts` plays the decoded script
  `playsewithpan` / `playse` / `waitplaysewithpan` / `loopsewithpan` (Scene ON only) from `src/data/gen/anim-sound-timing.json`
  (`npm run extract:anim-sound-timing`) at body age `f + 1 + 7`; `docs/aud242-move-anim-sounds.md` has the age map, op inventory
  and slice plan; residuals and unemitted families ISSUES #198. **aud242b / aud242c DONE (2026-11-07):** the extractor resolves
  `waitforvisualfinish` (known task / sprite / `simple_palette_blend` lifetimes), `waitbgfade*` (Task_FadeToBg model + measured BG load
  lag for IMPACT / HIGHSPEED / DARK), side branches; `panse*` / `setpan` emit the new `pan` SoundEvent kind; createsoundtask
  LoopSEAdjustPanning / FireBlast and PlaySE1/2WithPanning ported (doc sections 6-7; 739 ops resolved). **aud242d / e / f DONE
  (2026-11-07 / 08, doc sections 8-10):** instant-task table, palette-blend family, fixed-length sprite and mon-task lifetimes; Level-50
  emitted 550 -> 674 (160 still gated), all resolved 868. Per-move offsets ISSUES #198. Remaining: Blizzard (per-species off-screen
  lifetime), Tri Attack / Bubblebeam / Luster Purge / ExtremeSpeed / Psychic / Curse / Spark / Attract, `blend_color_cycle`,
  `HardwarePaletteFade`, cry tasks (Roar 36 sets), the waitsound SE-length table, the #198 alignment audit (most moves sit at +2).
  **aud242g DONE (2026-11-09, doc section 11):** SetPsychicBackground, Tri Attack, Bubblebeam (SwayMon simulated), Thunderbolt orb, Spark;
  Level-50 emitted 692 (142 gated), all resolved 894.
- **Audio step 7 (census parity):** aud243a DONE (`docs/aud243a-sound-census.md`): `emitTickSounds` (`src/engine/tickSounds.ts`) shared by
  `tick()` and the census; census rows carry `sound` / `soundDigest` / `soundAnim`; `soundCensusDelta.py` (arm-vs-arm, `--t1`; T1 is
  self-consistency only). aud243b (gate failed) + aud243c DONE (`docs/aud243c-alignment.md`): the ROM menu RNG is post-AI, the replay
  (`tools/integration/soundCensusRomReplay.ts`) aligns on `gRandomTurnNumber`; turn 1-2 match on 4 runs; frame-timed inputs drift after the
  first faint. It found ISSUES #201 (fixed by sub260, below).
- **sub260 DONE (2026-11-09, `docs/sub260-ignore-substitute.md`):** source-proven gameplay fix, `Cmd_datahpupdate` clears
  HITMARKER_IGNORE_SUBSTITUTE; 13 / 1000 census seeds change, identical in both scenes, all explained.
- **sum259 DONE (2026-11-09, `docs/sum259-summary-flow.md`):** #192 (a) draft return cursor, (b) open+63 summary input gate (ROM-exact),
  (c) swap summary UP / DOWN (residuals in #192).
- **Bundle:** bnd256c DONE (`docs/bnd256c-pixel-provider.md`): headless 22.5 -> 10.7 MB. `lib.ts` must CALL `installBundledMonPicPixels()` (`"sideEffects": false` drops bare imports; fixed at wind-down). **Cleanup 5:** cln244 DONE (Dive reducer
  incremental, full suite 17.1 min at 5 workers; `docs/cln244-dive-incremental.md`). ENGINE_BUILD moved this run (tell the website).
- **Cleanup:** steps 1, 2, 3 (cln239), 4 (cln241, 2026-11-06: `core-rs/` removed from master, `docs/cln241-core-rs-removal.md`;
  local branch `core-rs-archive` `4b2a07d67` keeps it, the user pushes it to its own repo) and 6 are done. Step 5 first half DONE
  (cln240: `npm run test:gate`, `docs/cln240-test-gate.md`). **Step 5 second half DONE (cln242, 2026-11-07, `docs/cln242-suite-speed.md`):**
  vitest `json.stringify` in test mode; test:gate ~97 s; the full suite runs at `POKEBENCH_VITEST_MAX_WORKERS=5` in ~21 min when
  nothing else runs (peak <= 11 GB); census-superseded sc106 / sgl138 route pins deleted. Next lever: `src/animation/dive.ts` re-simulates
  from tick 0 per row. No wasm artifact is needed any more.
- **4b(g) DONE (2026-11-06):** frf250a BAG prints "Items can't be used now." and RUN opens the forfeit prompt (NO / B back to the
  menu), ROM-measured both scenes (`tests/frf250aBagRunMenu.test.ts`, traces `frf250a-*`); frf250b YES prints "<PLAYER> forfeited
  the match!" and ends the battle as a loss through the normal lost-battle return (`src/engine/battleForfeit.ts`,
  `tests/frf250bForfeit.test.ts`, trace `frf250b-run-yes-off`). The soak random player answers the prompt (see the driver).
- **User reports:** 4b(b) also covers Quick Attack / Aerial Ace now (qak248 / qak249). 4b(a) fully fixed (vis243a mid-battle send-in; go246 battle-start "Go!" intro waits for both species
  animations in Scene ON, `docs/go246-intro-wait.md`; Kyle's SPOINK was cut short by 137 frames, now exact); 4b(b) Agility
  clip fixed (agi245); 4b(c) rate check permanent (`tests/rng244OutcomeRates.test.ts`).
- **4b(e) DONE (obr251, 2026-11-07, `docs/obr251-opponent-party-summary.md`):** the opponent faint-replacement ball bar slides, holds
  100 frames, fades, mirrors its balls and plays SE_BALL_TRAY_ENTER; residuals ISSUES #200. **#195 / #191 fixed (flw252):** party menu
  input waits for the open fade, refusal text for its printer; postwin multichoices step on new presses only.
- **2026-11-10 run: the census ROM replay became a gameplay-bug finder.** aud243d (`docs/aud243d-rom-driver.md`): closed-loop ROM driver
  (`tools/audio/romDriveSeed.sh SEED on|off DIR`, one JSON line per seed; driver `tools/audio/romDecisionDriver.py`) replays the engine's decision list on the
  ROM by menu state to battle end and compares HP / RNG / last moves per state. Fixes it found and landed: **abl261** (#202, abilities in the damage calc,
  179 / 1000 census seeds change, `docs/abl261-ability-damage.md`), **aip262** (#203, AI usable party count, 97 / 1000, `docs/aip262-usable-party-mons.md`).
  **dia263** (`docs/dia263-leads.md`) fixed the driver's party-slot mapping and root-caused the rest: ISSUES #204 (16 unfilled AI-view fields, `gender`
  first), #206 (type-effectiveness row order), #207 (confusion self-hit hold items), #208 (Reflect / Light Screen). Seeds 0..40: fully matching
  1-10, 12, 14-16, 18-21, 23-25, 29, 34-38, 40, 177, 224, 552; diverging seeds are listed per issue in the dia263 doc.
- **2026-11-11 run: three more ROM-driver gameplay fix steps folded.** dmg264 (#206 type-table row order, #208 Reflect / Light Screen in the live calc,
  `docs/dmg264-type-order-screens.md`), aiv266 (#204: all 16 live AI-view fields filled, `docs/aiv266-ai-view-fields.md`), aiv267 (AI damage sims see the
  target's screens; #207 confusion self-hit hold items, `docs/aiv267-ai-screens-self-hit.md`). Seeds 1..60 ON (0 unchecked) now match the ROM to battle end except
  22, 30, 39 (#204 remainder, AI scoring, not view fields) and 42, 50, 53, 57, 60 (aiv267 doc section 7, first-row classes only, not root-caused); 33 is
  not drivable (Brain trainer id). The aiv266 "Attract female user" lead was refuted (ISSUES #204).
- **2026-11-12 run: five gameplay fixes, the first sound assets, the Lobby return, the PLAYER name.** aiv270 (#204 A type-effectiveness probe quirk, B full
  GetWhoStrikesFirst speed in the AI), aiv271 (#204 C: AI damage sims use the real hit chain's `battleScriptDamageTerms`), fix274 (#209 MOVE_EFFECT_BYTE cleared
  per action, #210 `chosenMovePositions` written at selection); seeds 22 / 30 / 39 / 42 / 50 / 53 / 57 now match (dia272 `docs/dia272-leads.md` proved 42 / 50 / 53
  and leads seed 60: forced-Struggle turn runs the AI chooser, scratch 36 / 82 -> 73 / 82). aud244a recorder + 6.14 MB OGG cries / SEs
  (`docs/aud244a-recorder-assets.md`). lbr-a (`docs/lbra-lobby-return.md`): loss / forfeit / retire end in the walkable Lobby; soak / play:random walk to the
  attendant. pnm273: `PLAYER_NAME` (`docs/pnm273-player-name.md`; compare harness renders MEMORY).
- **2026-11-13 run: the Mac lane's 28 battle-rule fixes folded, sound playback, the attendant conversation and the host hand-off event.** `mac/parity-mac`
  `344eda36c` merged at run start (suite 14,613 / 14,613; ISSUES #211 / #212 / #204 closed); nightly replay 44 / 44 (`docs/replay-ledger.md`). aud244b (BGM / fanfare /
  looping-SE assets, `docs/aud244b-bgm-fanfare-loops.md`), aud245 + aud245b (WebAudio player, `docs/aud245-audio-player.md`; additive `options.audio` / `setAudio` /
  `getAudio`; Ogg + AAC fallback), lbr-b (attendant conversation, `docs/lbrb-attendant-conversation.md`), lbr-c (`challenge-request` event + hold, `start: "after-save"`,
  `docs/lbrc-challenge-request.md`), enc276 (#213: Encore / Struggle skip the move menu, census-neutral, `docs/enc276-forced-turn-no-menu.md`), bnd257d (lazy browser
  sprite chunk; `ready` waits for it; presses before `ready` dropped; `docs/bnd257d-lazy-sprites.md`), cln277 (suite wall measured: < 15 min not reachable test-side,
  `docs/cln277-suite-wall.md`). Census baseline for enc276-style deltas: `.integration/evidence/enc276/census/{on,off}-17af89768` (pre-enc276; enc276 moved no digest).
- **2026-11-14 run: the Mac lane's last fold, three hunt batches, the General_* sounds, the Lobby flow up to the draft.** `mac/parity-mac` `165548c4b`
  merged at run start (suite 14,750 / 14,750); nightly replay 44 / 44 + 32 / 32 staged. rrh1-rrh3 (50 / 110 rules covered), aud248 (S11 scoreboard +
  stat-change SE), aud249 / aud250 (General_* SEs), lbr-d1 / d2b / e / f (7-win Lobby return, PreBattleRoom briefing), iss216 (#216 / #217), cln279.
- **2026-11-15 run: the held-item effect, cries in move tasks, the Lobby cursor.** Nightly replay 44 / 44 + 69 / 69 staged; `lbr-f-residual2` merged;
  hie1 / hie2 / hie2b / hie3 (#220: held-item effect timed in both scenes, drawn in Scene ON, its SEs), cry1 (Roar / Howl / Hyper Voice cries), lbw1 / lbw2
  (Lobby NPC wander simulator + RNG cursor classification, ISSUES #221), lbr-g (#221 E1-E3: the Lobby cursor after a challenge-ending battle).
  Lesson (PAPERCUTS): a lab is often 9-20 frames out of step before the window; measure windows at the pre-segment offset, never by equal frame index.
- **2026-11-16 run: the Lobby NPCs, cry-task samples, three move-sound slices.** Nightly replay 44 / 44 + 69 / 69; run-start soaks on `ec10cf3bf` all green;
  lbw3 / lbw4 (#221 E4: Lobby wander port + player collision; the in-game new-challenge deal now follows the ROM), cry2 (cry-task mode assets + player),
  aud242h / i / j (move-animation SE lifetimes; Sludge Bomb, blend_color_cycle, Faint Attack, Struggle, Silver Wind, Dig). T1 census arm for the next
  slice: `on-bd46a5fbf` (t1cls: same src as aud242j, with the `soundCmd` windows; `unclassified` 0).
- **2026-11-16 night run (13:30 -> 05:30 UTC): luck hunt built, load time, sound gaps, presentation timing.** Nightly replay 44 / 44 + 69 / 69; luck1, lazy1, dl1 / dl2,
  aud242k-r (move-SE lifetimes: T1 0..99 ON missing-gated 570 -> 41), aud251 / aud255 (T2 scoreboard: OFF 0 missing / 0 extra on 20 seeds, ON 76 missing), aud252-254, cry3 / cry4 (all cry lengths
  source-derived), rrh4 (53 / 110 rules), lbw5 (#221 player <-> NPC cases), hie4 (#220 post-heal tail), rol1 / hpd1 / hpd2 (post-hit hold measured; locked-turn handoff 14), sta3 (second
  `Status_*` play exact), ais1-ais3 (#222 AI switch withdraw + return-to-ball), pin1 (`tools/soak/batonPassSearch.ts`).
- **2026-11-17 daily run (13:30 -> 05:30 UTC): S11 event parity, the script lead, three new adapters.** Nightly replay 44 / 44 + 72 / 72; luck2 / luck3 / luck4 (rare rules 53 -> 60 / 110);
  aud257-aud262 (move-SE lifetimes and variant dimensions: T2 ON 63 -> 0 missing, T1 0..999 ON gated 467 -> 0), wsh1 / wsh1b / wsh2 (Wish heal / Future Sight hit / Focus Band commands,
  sounds, drawing), aud263 (T1 rules + the acceptance table), adp1 (Withdraw / Rock Smash / Beat Up adapters, 0 px), hpd3-hpd5 (Scene ON script lead + floor-free hold), lbw6 (Lobby), ice1.
- Census baseline for the next delta: `.integration/evidence/fix274/census/{on,off}-237ee0e5e` (the fix274 fixed arms; src == master's final engine src at the 2026-11-12 wind-down
  except pnm273's name strings, which the pnm273 0..49 census showed digest-neutral).
- **4b(d) DONE** (frs247, `docs/frs247-faint-replacement-reshow.md`): the faint-replacement return rises from black, no player bar.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

**Status at the 2026-11-25 wind-down (daily run 2026-11-24 13:30 -> 05:30; PROGRESS top entry has the gates):** run start on master `a952017d5` (no Mac delivery); oracles fresh; luck day 9 had no design to run; run-start replay 44 / 44 (1,702 states) + 127 / 127 stages + Open line 7 / 7 (104 states) + opl3 7 / 7 (`docs/replay-ledger.md`). No battle-rule change this run: census eventsDigest identical on every fold and on the final engine vs `c22d60e57` (0..199 both scenes). Final engine `ffe35b64a`.
- **Item 0 (sound): T2 (25 ON + 24 OFF) ON 6,186 -> 3,659 (exact 3,598 -> 4,292), OFF 597 -> 470 (exact 897 -> 923), 0 missing / 0 extra throughout.** Last night's measured recipes all landed, then t2k10's classes. Steps (sections of `docs/aud251-s11-scoreboard-refresh.md`): lrl1 (lrm1 loss recall lead 24 / Explosion 22, ecm1 Scene ON ConfusedNoMore holds), ssl1 (ssm1 Supersonic c-lead, stm1 Belly Drum tail + Ghost Curse), mhl1 (mhm1 multi-hit shape A + trim 7, lpm1 Luster Purge / Signal Beam / Thunderbolt D4), msc1 (shape-A multi-hit play sound clock: what the website hears now matches the stamps), fpl1 (fpm1 Focus Punch lost-focus 17 / 7, chp1 confusion head, ssm1 Psych Up chain), tnl1 (tnm1 move-inflicted status next action, Rest -> Chesto), ihl1 (ihm1 OFF Shell Bell heal, mem1 / crs1 crit -> result 81 rows both scenes, bcm1 term A), kst1 (Knock Off print tail 0, Struggle lead -2), fcl1 (faint cry / SE 16 after a lead body: no controller lag; 40 new labs), pmk1 (Scene ON "is in love" head), cfx1 (MoveEffectConfusion anim -> print +2, confusion head 64 + 1), cre1 (used print after a confusion head = the move's attackcanceler -> attackstring rows), sdb1 (Defense Curl / Growth lead 4), snr1 (Roar / Whirlwind drag tail 6), ttb1 (Solar Beam second turn, confused charger lead 11), mmc1 (confirm walk after a foe's locked Dig / Fly, Fly shape A), mtl1 (Confuse Ray result tail before a tick, Pain Split body / SE / hp tail), fpr1 (Focus Punch strike lead -2, Leftovers after an asleep turn), hic1 (Yawn sleep chain), dgt1 (player's charging-turn tail; its mechanism 2 NOT folded: one window), opr1 (Scene OFF Leftovers / Yawn sleep prints), mlb1 (Mean Look / Block tail 7), lpa1 (the sound-tick lead from each action's own used print: -277 ON); rankings t2k10, t2k11.
  **Next (ranked: "t2k11", the re-rank of the final engine; ~55 % of the ON mass and ~49 % of OFF is +-2-row VBlank-phase jitter, not rules):** (1) t2k11's new recipes A (AllStatsUp hp -> stat SE early, s7295 d0 / d1, ON 199 / OFF 65 chain), C (end-of-turn poison / burn tick SE +1, 16 windows: split by the preceding command), B (Charm after SafeguardProtected -11: needs a lab pair); (2) fpr1's s1415 d50 forced-turn Focus Punch pre-pass (~97, a forced-handoff lead like Struggle's); (3) hic1's Yawn SLP lead overshoot after Curse (~50: a per-previous-command term); (4) dgt1 mechanism 2 (wake-up charger SE lead 13: build a wake-up -> charge lab pair first; branch `worker/integration-20261124-230452` kept); (5) the lab-start charge-turn glyph 5-8 rows early (mmc1 / dgt1: separate the miss-chain first print from the glyph lead first); (6) the class-1 per-move rows that are not constants (pmk1 list) only through a shape class.
- **Not folded / decisions (reversible, in their doc sections):** dgt1 mechanism 2 (one T2 window, no lab); cfx1 accepted although four confusion labs got a uniform +1 (cre1 then showed it is the ROM's Confuse Ray 269 / 270 CPU phase, `liveMoveTimingPolicy.ts` 109); lpa1 leaves cry1's Roar opponent lab 1 frame worse (no constant fits both player labs and the foe lab); hic1's Yawn lead 8 overshoots the Curse-before-Yawn shape by ~4 (net -82).
- **Cleanup:** cln17 (Cleanup 7: two moved-aside full suites with a read hook: only 32 files / 0.6 MB of tracked evidence are unread; untracked + ignored, `docs/cln17-evidence-untrack.md`; the rest is read by tests). Cleanup 7 is effectively exhausted (a third pass exempting `iss215ToolPixelInstall`'s directory read could find a little more).
- **Lessons:** five times a worker changed a production timing table that `tests/helpers/iu120Rows.ts` mirrors without updating the mirror (Psych Up, Roar / Whirlwind, Fly, Mean Look / Block; Pain Split pre-empted): the adapter-duration tests under `tests/animation/live*` are outside the engine file's importer set. Briefs: "grep tests/helpers/iu120Rows.ts for every table you touch"; a better fix is a test comparing the mirror with production (PAPERCUTS 2026-11-24).

**Previous status (2026-11-24 wind-down (daily run 2026-11-23 13:30 -> 05:30; PROGRESS top entry has the gates):** run start on master `fe5ffd11f` (the Mac's fam1 / fsn1 delivery, already merged); oracles fresh; luck day 8 had no design to run; replay 44 / 44 + 127 / 127 stages + Open line 7 / 7 + opl3 7 / 7 (`docs/replay-ledger.md`). No battle-rule change this run: census eventsDigest identical on every fold (0..199 both scenes). Final engine `c22d60e57`.
- **Item 0 (sound): T2 (25 ON + 24 OFF) ON 8,684 -> 6,186 (exact 3,251 -> 3,598), OFF 719 -> 597 (exact 849 -> 897), 0 missing / 0 extra throughout.** Engine steps (sections of `docs/aud251-s11-scoreboard-refresh.md`): ldw1 / ldw2 (Leech Seed drain launch after a weather tick / foe send-in / the damaging-weather loop), rsl1 (the sound clock keeps the 3 pre rows of masked no-pre damaging bodies), ohr1 / ohr2 (Scene OFF head prints: confusion / infatuation / wake-up / asleep at commit + 6 + u), fkt1 (no controller lag for a faint after a tick; weather-KO ball tray 4 + 6n), ptc1 / ptc2 (an end-turn print after an end-turn print +5 = 3 hand-off + 2 glyph rows, ROM labs), fpf1 (Focus Punch shape A), kse1 (Knock Off window 44, Scary Face Cmd_end SE wait, held item after a Rain / Sun tick), pmc1 (script-derived sound leads: Surf, Wish, Future Sight, Soft-Boiled, Belly Drum, Mean Look, Swagger, Smokescreen), swi1 (Pain Split hp rows), hsw1 (16 damaging moves without a lead class join shape A), ztl1 (Spikes / Foresight / Destiny Bond / Feather Dance tails; stat SE after a status body +2), mhs1 / cfa1 (multi-hit hit 1 shape A, loop boxes 25 / 27, hits 2+ lead (trims 8 / 5 lab-fitted, named); confusion animation ends 5 rows before the used print), bwf1 / bwf2 (Fake Tears, Light Screen both sides, Calm Mind, Cosmic Power, Spark, Dragon Breath: ROM-length bodies, full-frame compares 100 %).
  **Next (ranked; t2k9 re-ranked the final engine, `docs/aud251-s11-scoreboard-refresh.md` "t2k9"; measured recipes after the gates: "cfm1", "lrm1", "tnm1", "stm1", "ssm1", "ohm1", "lpm1", "mhm1", "ihm1", "lcm1", "ecm1", "bcm1", "fpm1", "chp1"):** (0) land the measured recipes first: lrm1 (`LOSS_RECALL_LEAD_FRAMES` 20 -> 24 for target / end-turn faints, Explosion 22; labs `lrm1-loss-targetfaint-{on,off}`; ~-124), tnm1 C (move-inflicted status next action, ~-148 Toxic + ~-92 Paralysis) and B (Rest -> Chesto, ~-114; guard the Cheri-after-hit path), ssm1 Supersonic (`C_LEAD_WINDOW_ADJUST` [48, 28], `C_LEAD_SOUND_CLOCK_LEADS` [48, 4]; patches in `tools/integration/ssm1/`; ~-148; guard: a target that cannot be confused skips the status animation), stm1 Belly Drum (`hpPrintTailTiming` PRINTSTRING follower tail 3 both scenes + `LIVE_MOVE_LEADLESS_TAIL_ROWS` [187, 3] ON; check `BattleScript_DoGhostCurse`, which the widened pattern also matches), lpm1 (patch `tools/integration/lpm1/lpm1-landing.patch`: Luster Purge / Signal Beam, Thunderbolt as D4 faithful timing; ~-28), mhm1 (Pin Missile 41 / Rock Blast 350 / Twineedle 42 into `MHS1_SHAPE_A_MOVE_IDS`, DoMultiHit trim 7 for them (Bonemerang keeps 5); labs `mhm1-*`), ihm1 (Scene OFF, `docs/ihm1-landing.patch`; ~-23 OFF; s1914 needs its message -> MoveEnd term too: mem1 / crs1 = a crit message followed by a result message holds 81 rows on the ROM vs the engine's 79: 7 ROM windows, rule ready, labs `crs1-*`) with bcm1 (extend its edit B to a `MoveMissed` message, lead 9 -> 4; then the turn-end -> second-turn print 31 vs 26 after an end-turn item heal, together), fpm1 (`FOCUS_PUNCH_LOST_FOCUS_PRE_PRINT_ROWS` 16 -> a rule: 17 after a printed hit message, 7 after an hp command; three labs +9 -> 0), chp1 (confusion head, Scene ON: the head start u - 2 hold, `PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS` 3 -> 2, self-hit print 104; re-derive cfa1's `PRE_MOVE_CONFUSION_TO_USED_PRINT_ROWS` 5 on the same labs; then ssm1's Psych Up chain), ecm1 (Scene ON ConfusedNoMore: the OFF head u - 2 (hold only) and the 64 + 5 hold in both scenes, after lrm1; ~200 -> 28), cfm1 (drop the sa125 / sag130 OFF-hold normalisation on the pre-move confusion path and the `cfa1PreMoveConfusionRows` exception; optional 6 / 5 split, T2-gated); (1) [superseded by lrm1] the battle-end loss recall SE 15 -4; (2) the OFF hit-SE rows (hse1m + hit2 item 1, -150 .. -230; largest single window s2230 d5 Bounce post-miss +6); (3) C, the Toxic next-action gap (-110 .. -150); (4) B, Rest -> Chesto berry cure chain +6 (-90); (5) Rock Slide after Belly Drum s8612 d8 -6 print leg (self-target stat move, `usedMovePrintLeadU`); then Dig +9 after Dig / -6 after the Confusion detour (two-turn family), Supersonic's tail (needs the ttf1 Magneton / Mantine lab pair), Scary Face SE 245 residual, the two drain heads (s648 d10 / d12), Psych Up as a second mover, Twineedle / Pin Missile / Rock Blast (multi-hit labs with controlled hit counts), Luster Purge / Signal Beam 1 row, the Focus Punch lost-focus 16 (17 plateau, a refit: not landed). Do not chase the 2,745 ON remainder (342 windows of per-move segment-start constants) one move at a time unless a script-shape class like pmc1 / hsw1 groups them.
- **Presentation:** sbx3 (`docs/sbx1-end-turn-box-clear.md`: Scene OFF Sun / Rain continues hold the print through `BattleScript_Pausex20`; ON Sun +8 / Rain +3 left, no rule); ais5 (`docs/ais1-ai-switch-withdraw.md`: player "Go! X!" glyphs + 1, #222 (3) / (5) closed); obr2 (#200 closed: ball tray tile order). AI tray 101 / 102 settled by ohm1 (20 independent real-play trays: 101 x 14; keep 101; optional rule: 102 when the player also switches that turn, 4 / 5), Drizzle / Drought / Sand Stream OFF activation Pausex20 (no Lv50 lab).
- **For the Mac (Mac-owned file):** fbp1: T2 OFF s6568 d104 -20 is a one-row gap between `soundCensusRomReplay.ts` `dismissPress` and its sound / commit alignment (the engine's faint box ready frame is ROM-exact at one-frame resolution); any window whose ROM accept row sits on a pulse edge shows the same 17-row step.
- **sa125 / sag130 (full suite at the freeze, 2 failed):** cfa1's pre-move confusion +5 broke their ON - OFF identity check; the engine was kept (cfm1 then proved it right on the ROM) and both tests carry a named exception (`cfa1PreMoveConfusionRows`) until the normalisation fix above.
- **Decisions (reversible, in their doc sections):** ttf1's Solar Beam-only lead drop not folded (bht1 later showed the hit -> next action transition is exact and the two-turn lead is +11 / +16 late after real bodies: drop it once Tackle / Growl-style lab actors are not the reference); ait1's 102 tray not folded; cfa1's 8 / 5 trims kept.
- **Lessons:** stale residual pins outside `test:gate` broke on almost every timing fold (aud242i / n, aud259, aud248, apx222, aud241b): briefs now say "grep ALL tests/ for the moves you touch"; keep doing a mid-run full suite after each big fold. Worker briefs that name a value as "expected" should also say "a ROM-faithful play change is allowed" (sbx2 stopped short of one).

**Website:** the live site runs **`eb-c26961a07ff6b07b`** (your `49287331f`, the 2026-11-15 wind-down build; deployed 2026-11-15 ~13:30 UTC on Kyle's
word, "Yes, update it"). The site adopted the lazy sprites and sound (a sound switch, off by default), and (same day, Kyle: "Yes, build it")
**`challenge-request` + `start: "after-save"`**: after a loss / retire the game runs on in the Lobby, the player asks the attendant, and the site opens
the next server challenge with `start: "after-save"` and mounts it (server column `start_mode`; the replay check passes `start`). Checked live: loss ->
Lobby -> attendant -> new challenge -> a few turns -> forfeit, verified; the same trace replayed with `start` "draft" reaches no battle. So keep
`challenge-request` / `start` stable, and name any change to them in PROGRESS. Games already open on `eb-adfdcfdc91f4247f`
or `eb-9d34d28f1b19ef3d` finish on those builds (checked live: an `eb-adfd` game resumed after the deploy, ended, replay-verified on its own build).
Later builds reach the site only when Kyle asks again. The 2026-11-25 wind-down build is **`eb-d1f97fe24ea79aa2`** (`ffe35b64a`; no API change; no new audio files; play changes: Scene ON / OFF sound and print timing across ~30 steps (confusion / in-love heads, status next actions, Focus Punch, Pain Split, Mean Look / Block, Roar / Whirlwind drag, two-turn moves, item heals, the crit -> result message 81 rows in both scenes), Scene OFF Yawn sleep / Leftovers prints; every one shifts later presses; PROGRESS top entry). The 2026-11-24 wind-down build is **`eb-98540cad897c0482`** (`c22d60e57`; no API change; no new audio files; play changes: Scene OFF Sun / Rain turns keep the weather text through the ROM pause (menu ~30 frames later), the next command after a voluntary player switch moves by the name length, and every sound / animation-timing shift; PROGRESS top entry). The 2026-11-23 wind-down build is **`eb-678abd85a36c3611`** (`74e01547a`; no API change; no new audio files; play changes: the room box / transition, draft menu and Lobby press gates (abs1 / rmw1 / lbf1) and every sound-timing shift; PROGRESS top entry). The 2026-11-22 wind-down build is **`eb-99fc9734e67828a5`** (`30cd3dfac`; no API change; no new audio files; play changes: "Player defeated" and the end-turn prints on the ROM rows, the drain / Shell Bell KO prints, every move-timing shift; PROGRESS top entry). The 2026-11-21 wind-down build is **`eb-3c2651248c642b97`** (`c6117abdc`; no API change; NEW audio files: snd3's 10 recordings, `docs/snd3-pan-recordings.md`; play changes: the swap-return "Thank you!" A wait, the Lobby save wait, SELECT move swap; PROGRESS top entry). The 2026-11-20 wind-down build is **`eb-ffe38fb0b685bbe6`** (`17f2a47e8`; no API change; NEW audio files `bgm-471.ogg` + `aac/bgm-471.m4a`; `\p` / `\l` battle messages now wait for A / B; PROGRESS top entry). The 2026-11-19 wind-down build is **`eb-b3ecf44f29f55d03`** (`f9cdc9c47`, engine `26ed71da7`; one ADDITIVE option `FactoryGameOptions.spriteBase`: pictures and move-animation assets load as files from `dist-lib/sprites/` (bundlers emit them; unbundled hosts serve that folder or pass `spriteBase`), first-battle download ~2,112 -> ~1,541 KiB; no other API change, no new audio files; PROGRESS top entry). The 2026-11-18 wind-down build is **`eb-f174716c006360f8`** (`6909b8d6c`, engine `a7cf4dfdb`; no API change, no new audio files; Wish heal / Future Sight hit / Focus Band / Withdraw / Rock Smash / Beat Up animate in Scene ON, the script lead on six moves, the Lobby in-flight turn; PROGRESS top entry). The 2026-11-17 night-run wind-down build is **`eb-d0136314103d21fb`** (`74e657c03`; no API change, no new audio files; ~3x faster library import, ~260 KiB smaller first-battle download, the AI switch's withdraw text; PROGRESS top entry). The 2026-11-16 wind-down build is `eb-b17e87a4a52c33ad` (`36e9335ab`; no API change; it adds 112 `cry-NNN-task` audio files + AAC twins that the site must serve with the rest of the audio). Cleanup 5's "< 15 min" suite target: measured non-goal on this box (cln277); the 670 s render lever in
`tools/integration/generatedCommandAnimationReplay.ts` would trade render-crash coverage (not taken).

0. **User decision 2026-11-11 (Kyle, "Yes, start sound"): start sound PLAYBACK now, alongside the ROM-driver gameplay
   fixes.**
   - **Pace:** every run folds at least one playback step and one gameplay-fix step from item 1, one worker at a time as usual.
     **Superseded 2026-11-12 (item 0d, "Two machines"): battle-rule fixes moved to the Mac lane (`worker/parity-mac`); the
     box folds that branch at run start and gives its own steps to sound, cleanup and the Lobby work.**
   - **No more waiting:** playback no longer waits for census parity (0 missing / 0 extra, design step 7) or for the remaining
     aud242 lifetimes. A sound we don't emit yet just stays silent and gets filled in as parity improves.
   - **aud244, recorder + assets** (design section 5 / step 8). It may split into cries / SEs / music.
     - A python recorder over mGBA `core.get_audio_channels()`.
     - Asset list: the distinct `(kind, id, pan | species, mode)` tuples in the ROM logs so far, plus every Factory species'
       cry in NORMAL / WEAK / FAINT. The register-poke driver is allowed for recording only.
     - BGM / fanfares get their ROM loop points from `sound/songs/midi/*.s`.
     - Output: OGG plus `manifest.json` under `src/assets/gen/audio/`. Report the sizes. The headless graph stays free of audio.
   - **aud245, player** (design section 6 / step 9).
     - `src/audio/player.ts`: WebAudio, loaded by dynamic import. It models m4a's SE1/2/3 priority, the BGM duck under cries,
       fanfare pause / continue, and fades.
     - API: `FactoryGameOptions.audio`, `setAudio` / `getAudio`, a `?audio=1` dev shell, `lib-types` and
       `docs/library-package.md`. Muted by default.
     - Accept:
       - frame hashes identical with audio on and off;
       - full suite + build + build:lib;
       - browser play with audio audible;
       - Safari decode checked, with an AAC fallback.
   - **Hosting:** the Nintendo-derived audio follows the user's existing decision on the art. `options.audio.baseUrl` lets the
     website serve the files.
   - **Website:** the mute button is the Mac's job. Name the API change and the new ENGINE_BUILD in PROGRESS when aud245 lands.
0b. **User decision 2026-11-12 (Kyle approved the top layer's recommendation): every challenge end returns to the Lobby,
   as in the ROM, and a new challenge starts in-game at the attendant.**
   - **Pace:** one step per run, alongside item 0 and the gameplay fixes.
   - **Why:** the website used to freeze the game at `challenge-end`. It will now let the game run on (the Mac's job), so
     whatever the engine does after the end is now on screen.
   - **ROM flow** (read-only scout 2026-11-12, top layer, verified in the decomp; re-check each line before you build on it).
     Every end type warps to the Lobby (BattleRoom:86-90, 104-111, 222-227) and then runs the Lobby `OnFrame` result script:
     - **Loss / retire / forfeit:** `LostChallenge`, Lobby:65-75, text 370-375. The streak flag is cleared (:71), then
       `factory_save 0` (`SaveGameFrontier`, battle_factory.c:269-275) with SE_SAVE (:72-74).
     - **Record question:** asked if allowed, YES/NO with NO preselected (:76-85). A forfeit sets `disableRecordBattle` and
       skips it (battle_main.c:5058-5062, Lobby:77-78). Then the farewell (:89-94) and free control.
     - **7 wins:** the won script, Lobby:40-59. Congratulations, the BP award, the exchange, save, record, farewell. The
       streak flag is kept, so the next attendant start continues the streak (battle_factory.c:208-212). The Brain
       variants are at Lobby:48-50.
     - **Starting again** (singles attendant at (4,7), Lobby:108-172):
       1. welcome, then CHALLENGE / INFO / EXIT;
       2. "Level 50 or Open Level?";
       3. "I need to save the game. Is that okay?";
       4. YES runs `factory_init`, then the full save dialog (:159);
       5. "Please step this way.", the door walk and warp, then the PreBattleRoom and the draft.
   - **What our engine does today** (`core.ts:1270-1300`, `docs/nch231-new-challenge.md`):
     - After a loss, and after a 7-win, the record answer chains straight into a new draft (`enterChainedFactoryChallenge`).
       Only RETIRE-YES reaches the farewell and the walkable Lobby.
     - In the Lobby, A at the attendant deals a draft at once, with none of the dialogue above (`core.ts:1204-1221`).
     - Probably also a bug: after a forfeit we still ask the record question (`factoryTerminalPresentation.ts:395-417`,
       inferred, not run).
   - **Steps:**
     1. **lbr-a.** Loss, forfeit and retire all play the ROM result script, then the farewell, then the walkable Lobby;
        delete the loss -> new-draft chaining on the production route. Fix the forfeit record-question skip. ROM windows for
        each, both scenes.
     2. **lbr-b.** The attendant conversation (ROM text and menus, ROM-measured):
        - CHALLENGE / INFO / EXIT;
        - the level menu: Open Level shown but unselectable, the same treatment as REST (deliberate divergence; only Lv50
          is modelled; record it in the scope doc);
        - the save prompt, then the save dialog.
     3. **lbr-c, the library contract change (additive):**
        - When the player confirms the save at the attendant after a challenge ended, emit a new event
          `{ type: "challenge-request", frame }` at the moment the ROM's save dialog starts.
        - The game then holds on that screen (no input, keeps drawing) until the host destroys the mount.
        - The host creates the next server challenge (it prefetches one at `challenge-end`) and mounts it. That new mount
          starts at the draft, as today.
        - `challenge-end` stays exactly where it fires now: the trace and the anti-cheat stay one challenge per mount, and
          nothing after the end is uploaded.
        - Also add a mount option `start: "after-save"` that begins at "Please step this way." / the door walk, so the
          cut is short; it is optional, and can follow later.
        - Document it in `docs/library-package.md` and `lib-types`, and name the event plus the new ENGINE_BUILD in
          PROGRESS so the Mac wires the site.
     4. **lbr-d, 7 wins (lbr-d1 DONE 2026-11-13; compare trace lbr-d2b open):** return to the Lobby inside the same mount and trace (BP, save, record, farewell), then the
        attendant continues the streak in-game. That is the same server challenge, so no host hand-off and no
        `challenge-request`; `round-end` stays where it is.
0c. **User decision 2026-11-12 (Kyle): the player's name defaults to "PLAYER", not the oracle save's "MEMORY".**
   - **Scope:** one small step, first free slot.
   - **Where MEMORY is baked in today:** `FORFEIT_MESSAGE_PLAYER_NAME` (`battleCommandPresentation.ts:324`), the record
     messages (`factoryTerminalPresentation.ts:207`, `:270`, `postwin.ts:808`), the BP award (`factoryTerminalPresentation.ts:292`),
     and 5 test files. Grep the rest of the tree, the generated data included, before you trust that list.
   - **Shape:** one constant, `PLAYER_NAME = "PLAYER"`, in one module, used by every site.
   - **Timing:** both names are 6 characters and the text prints 1 frame per glyph, so frame timing is unchanged. Prove it:
     a differential over the census traces must show only those message boxes' pixels changing, and the kernel digest must
     not change.
   - **ROM comparisons:** the oracle save stays "MEMORY". Any ROM-pixel comparison over those boxes passes "MEMORY"
     through a harness-only override, or masks the name. Never change the oracle save.
   - **Later, not now:** a per-player name. That would be a `playerName` mount option stored with the server challenge,
     and nothing is needed for it today.
   - **Website:** ENGINE_BUILD moves. Open site challenges finish on the build they started on (the site archives every
     build), so nothing strands.
0d. **User decision 2026-11-12 (Kyle): the real-game replay becomes THE gameplay check, and it must not slow development
   down. He left the schedule to the top layer; the schedule below is that choice.**
   - **Why:** `docs/gameplay-parity-audit-2026-11-12.md`. Soak, census, pins and the coverage docs never compared a live
     battle number with the ROM; only `tools/audio/romDriveSeed.sh` does. Kyle's goal is sound core battle logic with complete
     parity. His constraint: the check must not bog the work down, and it need not be exhaustive, only probabilistically sound.
   - **First batch (top layer, Mac, tree `389a7985a`, seeds 61..160 OFF; audit doc section 6):** 78 full match, **20 diverge**,
     2 not drivable (Brain). 279 s wall at 8 lanes on the Mac.
   - **Second batch (top layer, Mac, seeds 161..1160 OFF; audit doc section 7):** 840 full match, **139 diverge**, 21 Brain.
     34 min wall at 12 lanes. Re-driven on `46b01b7ce` (with your aiv271 and fix274): **115 seeds are open in total**
     (audit doc section 8). They are sorted by signature in sections 7 / 8.
   - **Division of labour (Kyle, 2026-11-12: "keep the nightly job lean; harvest in bulk on the Mac"):** bulk discovery is the
     Mac top layer's job (1,000 new seeds in about 34 minutes there), and it re-drives the open list after fixes land and
     updates the lists in the audit doc. The box's nightly job stays small (below). The box does not need to hunt for new
     mismatches: there are 115 open seeds waiting.
   - **Claim rule (now):** report gameplay status only from replay results: seeds driven, matched, consecutive clean, and what
     the replay cannot reach yet (audit doc section 5). Do not call battle logic complete or parity-verified from soak, census,
     pins, "engine-referenced" or message-count coverage.
   - **When the replay runs. This is all of it; nothing runs per code change:**
     1. **Once per run, at run start, in the background.** `nohup`, `nice -n 19`, 2 lanes, a hard 60-minute wall cap, on the
        tree as it stands at run start. **The regression list only** (it must stay matching): its job is to catch a fixed
        battle that the box's own work or a merge broke. No new seeds on the box (Kyle, 2026-11-12: discovery is the Mac's
        job) and no open seeds (they are known failures). Scene OFF, and every tenth regression seed ON as well. Do not wait for
        it: dispatch the first worker as usual and read the result when it ends. Use 1 lane if it starves a full suite.
     2. **Gameplay-fix steps, as today:** the worker re-drives the seed(s) it fixes and the permanent list. No new seeds in
        worker steps.
     3. **Wind-down:** the permanent list on the final tree, only if an engine gameplay change landed in the run.
     - Audio, presentation and cleanup steps never run the replay. No existing gate is removed: the soaks still cover deep
       rounds and swaps, which the replay does not reach yet.
   - **Two lists (state on `46b01b7ce`, your 2026-11-12 wind-down engine, re-driven on the Mac; "the permanent list" in this
     item means the regression list):**
     - **Regression list** = seeds that diverged once and match now; they must keep matching (64):
       2 6 8 11 13 17 20 22 26 27 28 30 31 32 39 42 50 53 57 75 88 110 155 158 190 198 202 235 248 260 279 298 311 366 435 440 459 521 530 543 555 564 591 596 613 619 650 665 698 761 770 841 846 872 894 971 999 1001 1011 1028 1031 1103 1118 1134.
     - **Open list** = seeds that still diverge (115): 60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 and the 99 listed as still open in
       audit doc section 8. A seed moves from open to regression when a fix makes it match to battle end.
     - A new divergence joins the open list with its seed, scene and first diverging row. One ISSUES entry per CAUSE, not per seed.
     - Not drivable until replay upgrade 3: 24 Brain seeds (33, 82, 131 and 21 in section 7's batch).
   - **Top layer, 2026-11-12 evening (the Mac bulk run is finished). This bullet applies from the fold of `mac/parity-mac`
     `344eda36c` on. From then it replaces the "Two lists" bullet above, the "24 Brain seeds" line and rule 1 of "When the
     replay runs".**
     - **Result:** seeds 1161..10000 OFF, 8,840 battles: `docs/replay-batches/2026-11-12-seeds-1161-10000.md` (and `.json`).
       Old engine: 7,828 match, 830 diverge, 182 not staged (180 silver Brain, 6048, 9073). On the Mac lane's engine
       `680b907f3`, all 8,660 ordinary seeds: 8,612 match to battle end with the stock chain, 25 more with the long caps,
       16 are endless stalls with every state matching up to the 600,000-frame ROM cap, 7 are refused by the lab, **0 diverge**.
       The top layer then drove 460 of them from scratch on `344eda36c` (all 310 seeds whose opponent runs the full AI and
       has one of the seven moves of fixes 27 / 28, plus 150 random others): 460 match.
     - **The open list is empty.** No seed is known to diverge on `344eda36c`. These are not rule bugs; do not chase them
       on the box:
       1. long battles and endless Struggle / Leftovers stalls (`docs/parity-mac/STATUS.md`; long caps = `replay
          --frame-budget=2000000` and drive `--frames 600000`). Top layer's additions above seed 7056: 7503 7651 7878 7985
          8773 9045 9336 9425 9553 9562 9563 match to the end; 7267 matches to the end with drive `--frames 1500000`
          (1,017,274 ROM frames, 1,446 states); 7130 7816 7834 7944 9579 are endless (813 to 946 states match, no mismatch);
       2. lab failures: **FIXED by the top layer 2026-11-13 (`oracle: battle lab never taps A once the first action menu is
          issued`, `oracle/battle_lab.py` + 4 tests in `oracle/test_battle_lab.py`).** One cause for all: a check frame
          could land where the player's choose-action command was issued but the exec flags still carried the opponent's
          bit, so the next blind A tap picked FIGHT and the one after it move 1 (in 6048 / gold 1447 the player's Pokemon
          then fainted and the taps sat in the party menu). Now 3623 5633 5736 8075 9188 6048, silver Brain 10127, gold
          Brain 1447 and 10022 all match to battle end; 98 seeds that already worked (300..399) stage byte-identical
          `setup.json`. 9073 was a one-time failure of the bulk run (matches when driven again). So for seeds 1..10000 on
          the fold engine: no lab failure is left; gold 1447 is a normal gold Brain seed again.
     - **Regression pool** = `docs/replay-batches/regression-pool.txt`: 962 ordinary seeds that diverged on an older engine
       and match to battle end with the stock chain now (the 64 above, 113 of the old open list, 785 of the bulk batch).
       Brain seeds, 1..10000: silver = seed % 49 == 33 (not 9098, a long battle); gold = seed % 49 == 26 driven with
       `ROM_REPLAY_SYMBOLS=1` (not 1447, 6347). The Brain part of replay upgrade 3 is done by the Mac lane
       (`docs/parity-mac/brain-replay-seam.md`).
     - **Nightly check from the fold on.** Same budget as rule 1 (background, `nice -n 19`, 2 lanes, hard 60-minute wall
       cap, do not wait for it). The seeds change every night: draw them at random from the pool file, seeded with the run
       date, as many as the cap allows (start with 40), plus 2 silver and 2 gold Brain seeds. Do not drive the fixed 64
       every night. Write the drawn seeds and the result in `docs/replay-ledger.md`. "The permanent list" in rules 2 and 3
       stays the fixed 64.
     - **Re-drive once before a failure counts.** In the bulk run 9 seeds in a row (4777..4812) matched 0 states once and
       matched fully when driven again: the ROM side started from another `gRngValue` on the same request
       (`frozenTimelineEqualsDrive` false). Cause not found. A seed with `matched` 0 or `frozenTimelineEqualsDrive` false is
       driven a second time; only a repeated mismatch is a regression.
     - **The whole pool is the Mac's job:** the top layer re-drives all of it after each fold that changes gameplay (about
       25 minutes there) and edits this bullet and the pool file. **Last re-drive: 2026-11-13 on `937c7caee` (your
       2026-11-13 wind-down engine + the lab fix), old player, stock chain: 962 / 962 match to battle end.**
   - **Ledger:** create and keep `docs/replay-ledger.md`: per run the commit, seed range, matched / driven, new divergent seeds,
     the highest seed driven (10000 now: the Mac bulk run of 2026-11-12, results in `docs/replay-batches/`; the box drives no new seeds) and the consecutive-clean count. A seed is driven as "new" once only.
   - **Two machines (Kyle, 2026-11-12, last decision of the day: "Sure, let's try that"). This replaces the earlier
     "battle-rule fixes are the MAIN program of every box run" pace of the same day.**
     - **The Mac lane owns battle-rule diagnosis and fixes.** It is a separate session on the Mac working on branch
       `worker/parity-mac` (real-ROM replay is about 5x faster there). It turns the open seeds into bug reports and fixes,
       one cause group at a time, in the queue order below. Its records are new files under `docs/parity-mac/`
       (`STATUS.md` first); it does not touch PROGRESS / ISSUES / ROADMAP / this handoff.
     - **It ships its branch to this box as `refs/remotes/mac/parity-mac`** (fetch-only; it never touches your working tree,
       `master` or processes).
     - **Your part, at run start, before the first worker:** if `mac/parity-mac` moved, fold it: `git merge mac/parity-mac`,
       typecheck, its touched tests, full suite, build, re-pin any sound / census anchor the gameplay change moves, then write
       the PROGRESS and ISSUES entries from its `docs/parity-mac/*.md`. Each Mac fix arrives with its own ROM proof (group
       seeds + the regression list); do not redo the census-attribution step for it.
     - **Sound is your main program again** (item 0 / item 1), with cleanup and the Lobby work as before. Do not start
       battle-rule fixes of your own while the Mac lane is active: two lanes on the same rules collide on the engine and
       on the census-anchored pins. If you find a gameplay bug, file it in ISSUES; the Mac lane reads ISSUES.
     - **Fallback:** if `mac/parity-mac` has not moved for two runs in a row, the Mac lane has stalled: resume the queue
       below on the box, battle-rule fixes first, and say so in PROGRESS.
     - Kyle wants both sound and battle parity finished; the split exists so neither waits for the other.
     Order of the gameplay queue (the Mac lane's, and yours under the fallback):
     1. the signature groups of audit doc section 7, largest first. A signature is not a proven cause: open each group with
        a diagnosis step on 2 or 3 of its seeds (dia263 / dia269 shape), then fix, then re-drive the whole group:
        (a) the ROM sends in a different opponent after a faint, 21 seeds (leads A2 / A3 / A4; your #204 remainder
        "switch-into scorer stub"); (b) Struggle, 24 seeds (new, not diagnosed); (c) Encore: the ROM opens the action menu,
        10 seeds (lead B2; this also lets the replay continue past any Encore); (d) confusion self-hit, 5 seeds (lead B6, seed
        218 shows ROM 31 vs engine 16); (e) infatuation, 5 seeds left (new). The recoil-on-a-non-recoil-move group is DONE:
        fix274 cleared all 7;
     2. the older open seeds (60 and 79..159; your dia272 Struggle lead on seed 60 may be group (b)), then the unsigned rest;
     3. the audit doc's section 2 rows that the replay cannot show yet, by reach: the rest of A1 (aiv271 fixed the #204 C
        part; check burn / pinch `maxHp` / Guts / weather / Flash Fire against it), A5-A7, B1 (Toxic counter), B3-B8.
     - Every audit row is source-read only. Confirm it on the ROM with the fix (a seed, or a Mechanic Lab `overrides.parties`
       scenario). File ISSUES entries from the audit doc at your next ISSUES edit; the top layer did not touch `ISSUES.md`.
   - **Mac lane stopped, 2026-11-13 evening (Kyle is winding down the Mac: "can we offload fixes to hcloud?"). This
     replaces "Two machines" above and the Mac-lane ownership in the next bullet; the finish line there still stands.**
     - **Battle rules and the replay tools are yours again.** The do-not-edit list in the next bullet no longer applies.
       Fold `mac/parity-mac` once more (the status paragraph near the top names the tip); after that the branch does not
       move, so the two-runs fallback does not apply either.
     - **The rare-rule hunt is yours, as a side job next to sound (Kyle, 2026-11-13 ~20:30 UTC: "Yeah, let the box do
       it. ... the Mac is going to be offline for ... a day or two. So any work that needs to ... get done needs to be in
       the box").** The list: `docs/parity-mac/rule-coverage-c-rules.json`, R001..R110, the reachable battle rules whose
       code no ROM-matched battle has run (`docs/parity-mac/rule-coverage.md`, class (c)); 12 are covered
       (`stages/coverage/`), 98 are left. Why it matters: of the first 15 rules checked, 3 were wrong (fixes 41, 42, 43).
       - **Pace (superseded 2026-11-16, see "New schedule and the luck hunt" at the top):** the luck-only rules go to the day
         job; the hand-built ones stay one step per run at most, after sound. A difference the hunt finds is that run's main program: one commit per fix, a test that fails without it,
         a ROM battle (or a Mechanic Lab run when no Factory set-up reaches it, as for 42 and 43).
       - **Order:** first the 31 designs in `docs/parity-mac/on-hold/designs/` (README there: check one, rename it to
         `.json`, drive it over several lab seeds; one that matches moves to `stages/coverage/`). Then design stages for
         the rest in list order (the uncommon rules first). The scratch hunter (`on-hold/hunter/`) has Mac paths: copy it
         under `tools/` with box paths if you use it. A rule no stage can reach gets its reason in `rule-coverage.md`
         (class (a) or (b)); check the designers' unchecked "cannot occur" notes (R029, R031, R033, R035, R040) at source
         before you accept them.
       - **Record** per run in a box section of `docs/parity-mac/STATUS.md` and in PROGRESS: rules covered, left,
         differences found.
     - **Still on hold:** the discovery batches (1,793 battles found nothing new after fix 41; record in
       `on-hold/discovery2-793.json`) and the swap between battles / Open Level (plan only, `STATUS.md`, "Stopped
       2026-11-13"). Do not start them unless Kyle asks.
     - **Also fix, not only file:** the two findings in the status paragraph near the top (duplicate species at the rental
       select; the trapped party-menu text). Small steps; any run.
     - **What you keep:** the nightly check from the pool, and now also every staged battle
       (`docs/parity-mac/stages/*.json` and `stages/coverage/*.json`, 32 on 2026-11-13;
       `REPLAY_OUT=/abs tools/audio/romReplayWide.sh --stage FILE`, cwd `workspace/`; the hunt adds to `stages/coverage/`):
       they guard the rare-rule fixes. If either shows a difference, fixing it is the main program of that run: one commit
       per fix, a test that fails without it, a ROM battle. Otherwise sound stays the main program.
     - **The new tools run on this box:** on 2026-11-13 the top layer ran `romReplayWide.sh` from `42e1f4f91` here, a
       staged battle (`stages/noland-foresight-ghost.json`, 20 / 20) and an `ai-v1` battle (seed 20126, 11 / 11); both
       match and equal the Mac's rows, under a minute each. How to re-drive any recorded battle: `howToReDrive` in
       `docs/replay-batches/2026-11-13-fifth-pass.json`.
   - **Top layer, 2026-11-13 (Kyle's decisions of that night). The Mac lane owns every replay upgrade below and the replay
     tools. This replaces "at most one per run" and the old finish line.** (Ownership superseded the same evening by
     "Mac lane stopped" above.)
     - **Do not edit on the box:** `tools/audio/romDrive*`, `tools/audio/romReplay*`, `tools/audio/soundEventProbe.py`,
       `tools/integration/soundCensusRomReplay.ts`, `tools/integration/romReplayPlayers.ts`, top-level `tools/replay-batch/`
       and `oracle/battle_lab.py`. The Mac lane is changing them (fourth pass, `docs/parity-mac/STATUS.md`); a box edit
       collides at the next fold. If a box change breaks one of them, say so in PROGRESS and leave the fix to the Mac.
     - **Your replay work stays as it is:** the nightly check from the pool (40 seeds + 4 Brain, old player, stock chain)
       and the fold of `mac/parity-mac` at run start. Nothing else.
     - **What the Mac lane built (arrives with the next fold):** three test players (`census` = the old one, `ai-v1` =
       the game's own trainer AI on the player's side, `random-v1` = random legal actions with voluntary switches; Kyle:
       AI against AI is the main share, random is a subset only), a wide compare at every decision (status, volatiles,
       stat stages, PP, item, ability, types, bench, side statuses and timers, weather, the winner), a tally of what
       really took effect per move effect / ability / hold effect / situation, and staged battles
       (`docs/parity-mac/stages/`). So upgrades 2, 4, 5 and the Brain part of 3 are done there; 1 and the rest of 3 are
       its to schedule.
     - **Finish line for "battle logic is done" (Kyle: a battle count "doesn't itself mean any quality"):** the tally is
       full (every row is covered by a battle that matches the ROM, by a staged battle, or by a source proof that it cannot
       occur in the Factory), no difference is open, the old lists still match, the gates are green. No number of battles
       is part of it. Do not report a battle count as a measure of quality.
   - **Replay upgrades (tools only; the Mac lane's from 2026-11-13, see the bullet above; kept here as the record of what
     each one is):**
     1. **One pass and a batch runner.** Read the state timeline during the drive (`romStateTimeline.py` re-runs the ROM
        today), fewer process starts per seed, and a `--jobs N --minutes M` runner that writes the ledger rows. Mac: 18 s per
        seed alone (audit doc section 5). Report the CAX31 per-seed time before and after.
     2. **A random player.** A seeded random legal action each turn, voluntary switches included (the driver already drives the
        party menu for forced switches). Without it B1 / B2 / Pursuit / trapping / Natural Cure never occur at any seed count.
     3. **Reach.** Later battles of a round, Open Level, the Brain (the lab accepts `trainerId` 0..299 only; seeds 33 / 82 / 131).
     4. **Wider compare.** Per turn also status1 / status2, stat stages, PP, side statuses and timers, weather. The lab `state`
        capture already exposes them.
     5. **Tally and steering.** Count, per move effect / ability / hold effect, how often it took effect in a fully matched
        battle (not "named in source", not "printed a message"). Steer new battles toward the zero rows with Mechanic Lab
        `overrides.parties` teams.
   - **Finish line for "battle logic is done":** superseded 2026-11-13 by the top-layer bullet above (the full tally, no
     battle count). The old text was: 3,000 consecutive clean new seeds with the random player across Level 50, Open Level
     and the Brain, and no zero row in the tally without a source proof that it cannot occur in the Factory.

1. **Audio (S11)** — the main program for several runs: `docs/s11-audio-design.md` section 7. Next: **aud241** battle
   controller family (effectiveness, SE_FAINT, faint / send-out cries with mode + pan, ball / tray / low-HP, battle BGM start /
   fade / victory, the battle-return BGM / SE_EXIT that aud240d measured: fade P+6, BGM 469 P+53, SE_EXIT P+79). Map and
   proposed split: `docs/aud241-scout.md`. **aud241a / b / c DONE 2026-11-05. aud242a DONE 2026-11-06** (generic script-op
   emitter, `docs/aud242-move-anim-sounds.md` section 4 is the slice plan). **aud242b / c DONE 2026-11-07; aud242d / e / f DONE
   2026-11-08; aud242g, aud243a / b / c DONE 2026-11-09.** **aud243d DONE 2026-11-10** (ROM driver). **Next, before more audio event work (playback is item 0 and runs alongside): the ROM-driver gameplay fixes** (dmg264, aiv266, aiv267 DONE 2026-11-11), one ts-lane step each with the
   abl261 / aip262 / aiv267 proof shape (tests, re-drive seeds, census attribution, full suite): the causes are in `docs/dia269-leads.md` (2026-11-11): fix ISSUES #204 A
   (seed 22), B (30), C (39), #209 (53), #210 (42) one step each, then seeds 50 / 57 / 60 (unconfirmed), then drive seeds 61..100 for new leads. After that, the sound segment diff
   (`tools/audio/soundSegmentDiff.py`, aud243d section 5: missing move-animation SE streams and stat-change SEs) over K >= 20 aligned seeds per scene; remaining aud242 lifetimes and the #198 alignment audit (`docs/al198-scout.md`) can interleave; next lifetimes ranked in `docs/aud242g-scout.md`. Open aud241 gaps: ISSUES #196 / #197, the canonical battleScene route plays no end sounds.
2. **Cleanup (one commit per step, verified by typecheck + full suite + build), in this order:** (1) DONE (cln237 first sweep 2,103 files; cln279 second sweep 2026-11-14: 236 more step-id scripts / fixtures, 1.18 MB, `docs/archive/cln279-deleted.txt`, closure tool `tools/cleanup/keepClosure.ts`), (2), (3), (6) DONE;
   (5) DONE (cln240 + cln242 + cln244 Dive; optional: `summaryAllFactorySpecies` 134 s and `substituteDollDefenderLive` 80 s for < 15 min); (4) DONE (cln241);
   (7) evidence stops going into git (policy line in AGENTS.md DONE 2026-11-07; cln243 DONE 2026-11-07, 11,691 files / 204 MB untracked,
   `docs/cln243-evidence-untrack.md`; the ~593 MB rest of `tools/compare/evidence` is read by tests; remaining per `docs/cln7-scout.md`: ~590 MB of tracked evidence looks write-only;
   first a policy + new-output default to the ignored `.integration/evidence/`, then `git rm --cached` only after a moved-aside full
   suite; no rclone / R2 remote exists on this host, so off-host backup needs the user's setup -- keep evidence local meanwhile).
3. **Bundle hygiene** (scout: `docs/bnd-scout.md`; **bnd-a DONE 2026-11-08** as bnd253a, `docs/bnd253a-test-json.md`; **bnd-b DONE** as bnd254b, `docs/bnd254b-pic-geometry.md`; gamepad DONE as bnd255f (`connectGamepad`, `docs/library-package.md`); bnd-c DONE as bnd256c, `docs/bnd256c-pixel-provider.md`; next bnd-d (scout `docs/bnd-d-scout.md`; move `party-mon-icons` out of the `assets-sprites` manual chunk first): browser chunk split / lazy sprite sheets, `battleScene.ts` / `monPicRender.ts` / `summaryInfoPage.ts` still import the pixel JSON statically): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
4. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
4b. **User-reported visuals (Kyle, website, 2026-11-02): one step per run, after that run's audio + cleanup steps.**
   - (a) DONE (vis243a + go246). Named residuals in `docs/go246-intro-wait.md`: ELEKID / ARON frame animation one frame long,
     the long-cry (> 74) 4-frame early message clear (both scenes), bso226 release / ball-open frames.
   - (b) DONE (agi245 Agility; qak248 Quick Attack / Aerial Ace live clip 74 -> 160, `docs/qak247-clip-sweep.md`). Receipts:
     `tests/animation/quickAttackAerialAceOpponentClip.test.ts` (qak249). Open: ISSUES #194 (RATTATA Quick Attack residual, not the clip).
   - Flow gaps: ISSUES #191 (dialog cursors move on held repeat), #192 (summary flow gaps), #195 (party menu: cursor moves during the
     open fade; refusal text dismisses before it finishes printing).
   - **(g) DONE 2026-11-06 (frf250a / frf250b; see State at restart). Next in 4b: (e) below.** Original report:
     not visual (found 2026-11-05 by the top layer's live-site play-test on 6bdb3c6c1): BAG and RUN do
     nothing in battle.** On the action menu, A on BAG or RUN is ignored: `battleCommandPresentation.ts:638-646` handles only
     FIGHT (0) and POKéMON (2), and returns the state unchanged otherwise. No sound, no text, the cursor stays. In a site trace
     (`437157099938d5e9c8cb6da1ee5c0a58`, test player) A on RUN at app 110024 / 110064 / 110092 changes nothing. The ROM:
     - **BAG:** `battle_main.c:4221-4232` (FRONTIER_NO_PYRAMID) -> `BattleScript_ActionSelectionItemsCantBeUsed`
       (`battle_scripts_1.s:4426`: printselectionstring STRINGID_ITEMSCANTBEUSEDNOW, then back to the action menu).
     - **RUN:** `battle_main.c:4322-4330` (TRAINER + FRONTIER) -> `BattleScript_AskIfWantsToForfeitMatch` (`:4547`:
       "Would you like to forfeit the match and quit now?" + forfeityesnobox). NO returns to the action menu.
     - **YES:** `battle_main.c:5058-5067` sets `B_OUTCOME_FORFEITED`, then `BattleScript_PrintPlayerForfeited` (`:4552`):
       "{B_PLAYER_NAME} forfeited the match!" + waitmessage, then the battle ends as a loss.
     - The kernel note at `factoryBattleScriptFullTurnDecision.ts:225-240` already cites this path and leaves the forfeit UI out.
     - **Do it in two steps.** (1) The BAG message plus the forfeit prompt with NO, which are presentation only. (2) YES: the
       forfeit loss through the round controller to the library's battle-end / challenge-end events. A forfeit must end the
       challenge as a loss, exactly like a lost battle, and replay identically (`replayChallenge`).
     - **DONE** (frf250a presentation, frf250b forfeit YES; `docs/frf250b-forfeit.md`). Scene OFF is ROM-exact; Scene ON has a named
       healthbox / fade gap there.
     - **Proofs:** ROM labs for both prompts and the forfeit text window. Measure the SE_SELECT on A and the frames from A to
       the first glyph.
   - **New, Kyle 2026-11-04** (website on 90c6684d5), reproduced on the Mac from his trace `47192107276c654fbcdc1d038304aa0e`
     (seeds 2513123525 / 2478499883) through `FactorySession.replayStep` + `render()`. Prove each against the ROM, then fix the family:
     - **(d) DONE 2026-11-05 (frs247).** White flash after a faint replacement. After the forced party menu's SEND OUT, the screen is black for about 37 frames
       (app 17400..17437). Then the battle appears fully drawn but washed toward white (mean brightness 246 vs about 200 at rest)
       and fades down to normal over about 15 frames (17438..17453). The same in the second faint (25529). Every other return from
       black in that trace (voluntary switch 12543, battle starts) rises from black. The ROM reshow is one path for both:
       `CB2_SetUpReshowBattleScreenAfterMenu` -> `BeginHardwarePaletteFade(0xFF, 0, 16, 0, 1)` (`reshow_battle_screen.c:162`).
       BLDCNT 0xFF is effect 11 = brightness decrease, so it fades from black. Also, the washed frames draw the PLAYER's 6-ball
       bar (bottom right, unfaded, gone at 17453). The ROM never draws it here: `Cmd_drawpartystatussummary` emits flags 1 =
       "skip player side" (`battle_controllers.c:1509`). Likely class: the faint-replacement path reuses an intro / send-out
       presentation (white fade + player bar) instead of the reshow. ROM lab:
       `tools/battle-lab/playerfaint-slot2-sunnyday.json` (pfr185).
     - **(e) DONE 2026-11-07 (obr251; ISSUES #200 residuals). Original scout (2026-11-05, `docs/obr248-scout.md`, unverified: ROM slides in over 20 frames, holds 100 frames to the
       first glyph, BLDALPHA-fades out over 16, one SE_BALL_TRAY_ENTER; ours is static for 26 frames; balls must be mirrored
       `states[5-index]`; presentation-only but adds ~99 app frames per opponent replacement, so frame-anchored pins move, kernel
       digest unchanged; new code must stay out of `battleScene.ts`, split-eligibility ratchet).** Opponent replacement ball bar pops in and out. After "Foe PARASECT fainted!" the 6-ball bar appears whole in one
       frame (13365..13367), stays about 30 frames, and vanishes in one frame (13394..13397) before "BEAUTY LIZBETH sent out MINUN!"
       starts. In the ROM, `BattleScript_FaintedMonSendOutNew` (`battle_scripts_1.s:2883`) runs
       `drawpartystatussummary > ... > printstring STRINGID_SWITCHINMON > hidepartystatussummary`. The flags are 1, so the
       draw delay is NOT skipped: `OpponentHandleDrawPartyStatusSummary` -> `EndDrawPartyStatusSummary` holds 93 frames
       (`battle_controller_opponent.c:1925-1965`) before the text. The bar slides in (`SpriteCB_StatusSummaryBar_Enter`; balls via
       `SpriteCB_StatusSummaryBalls_Enter` with per-ball delays), stays up while "sent out" prints, then exits after it
       (`hidepartystatussummary`, `..._Exit`). `faint-switch-notes.md` §3 measured bar ~6588 and text 6687 in the ROM (≈ 93 + slide).
       Kyle: "takes slightly longer than what we currently have".
     - **(f) Message holds — check, likely no bug.** Kyle: "X was dragged out!" after Roar shows only briefly, and "a number of
       text" feel the same. In his trace the line prints 32634..32657, the box clears at 32668, and the action prompt shows at
       32674. The ROM has no `waitmessage` after `printstring STRINGID_PKMNWASDRAGGEDOUT` (`battle_scripts_1.s:3339`), so it is
       brief in the ROM too, at the oracle save's FAST text speed (1 frame per glyph). At MID (4 / glyph, the new-save default)
       every message lasts about 4× longer, so he may be comparing against a MID emulator. Asked him. If he wants a text-speed
       option, that is a feature: the print term scales by `sTextSpeedFrameDelays`, the holds do not
       (`docs/battle-message-hold-cadence-ground-truth.md`).
   - **New, Kyle 2026-11-12** (website, game build `eb-9d34d28f1b19ef3d`), reproduced on the Mac from his trace
     `b476b7edd9fd8260b28760d96abd8ffe` (seeds 4025223145 / 3542704685, Scene ON, 22,641 frames) through
     `FactorySession.replayStep` + `render()`. The trace is in the repo: `tests/fixtures/user-sessions/2026-11-12-b476b7ed.trace.json`
     (app frame N below = the session frame after N steps). Kyle: not the highest priority, but queued, fixed and VERIFIED.
     One step per run each, after that run's audio step. Prove each against the ROM, then fix the family:
     - **(h) Pursuit on a switching target draws no animation. LOW priority: the switch in this trace was itself an engine
       error, already fixed on `worker/parity-mac` (see the last bullet).** App 17134: the opponent LOMBRE (6 / 153 HP) chose to switch,
       BEEDRILL's Pursuit caught it (`BattleScript_PursuitDmgOnSwitchOut`, `battle_scripts_1.s:3123`) and it fainted. The
       `move-animation` command (moveId 228, `turn: 1`, `multihit: 1`) holds 32 frames (17164..17195) and draws nothing. The
       ordinary Pursuit one turn later (app 17840, `turn: 0`) plays 106 frames (17870..17975). Cause, known and left on
       purpose: `liveMoveAnimation.ts:1589` declines the switch-interception body (`request.turn & 1`). ROM:
       `Cmd_jumpifnopursuitswitchdmg` sets `gBattleScripting.animTurn = 1` (`battle_script_commands.c:8758`), and `Move_PURSUIT`
       runs `choosetwoturnanim PursuitNormal, PursuitOnSwitchout` (`battle_anim_scripts.s:1273-1280`). Needed: the
       `PursuitOnSwitchout` body, live.
       - **Check in the same step (lead, not ROM-proven):** the ROM prints the withdraw line first (`BattleScript_ActionSwitch`,
         `battle_scripts_1.s:3088-3090`: `printstring STRINGID_RETURNMON`) and only then runs the Pursuit loop. In the trace the
         turn's first event is the Pursuit `STRINGID_USEDMOVE` (sequence 42, straight after 41): no RETURNMON event and no
         command for it. If the ROM lab confirms it, a message is missing in both scenes.
       - **Verified when:** a ROM capture of a genuine Pursuit interception matches the engine like the other live bodies.
       - **Top layer, later the same day (Kyle doubted the switch, and he was right):** on the fixed engine (`worker/parity-mac`
         960f65235) the same trace has the same RNG up to this turn (1808560935 after 26 calls), but the opponent does NOT
         switch: Pursuit is an ordinary hit (`BattleScript_HitFromAtkString`, `turn: 0`, the normal animation), LOMBRE faints
         (`BattleScript_FaintedMonSendOutNew`), and the recording diverges from there. Cause: fix 8 of that lane
         (`docs/parity-mac/ai-resist-switch-battlerin1.md`): the ROM's bench scan skips the opponent's slot 2 (DELIBIRD)
         because the player's active BEEDRILL is in the player's slot 2, after slot 1 (LEDIAN) resisted Twineedle. So what
         Kyle saw goes away with the fold of `mac/parity-mac` and a site redeploy. What stays open here is only the genuine
         interception (rare) and the withdraw-line lead.
     - **(i) The player's HP box disappears during the locked turns of Ice Ball.** App 18609: Kyle switched BEEDRILL ->
       WARTORTLE and DELIBIRD used Ice Ball on that turn. In the next two turns (DELIBIRD is locked into Ice Ball; the player
       chose Water Pulse) the player's HP box is not drawn in app 19364..19389, 19469..19662, 19826..19948, 19987..20012,
       20092..20308 and 20472..21017 (through "Foe DELIBIRD fainted!" and LEDIAN's send-out). It is drawn during Water Pulse's
       own animation and on the action menu, and it is back for good at 21018. The opponent's box is not affected.
       - **Lead:** the two locked turns are appended as segments 2 and 3 to the SAME resolution presentation
         (`retainedLockedActionPresentationOwner`, `factoryRoundBattleOrchestrator.ts:1833` / `:3059`). Its `sourceDecision`
         is still the earlier `{kind: "switch", partyIndex: 0}`, and a player switch hides the player's box between the recall
         and the send-in. Check whether the box-visibility pass treats every retained segment as part of that switch. If it
         does, the family is every locked multi-turn move (Ice Ball, Rollout, Outrage, Petal Dance, Thrash, Uproar) that
         starts on a turn where the player switched.
       - **Verified when:** a test replays the trace and finds the player's box in every frame of app 19364..21017 where the
         ROM draws it (ROM lab: a player switch into Ice Ball, then two more turns), plus one other locked move.
       - **Repro note:** the frames above were measured on master `e2cd1f1cd` (before the fold of `mac/parity-mac`). The
         website itself ran an older build (`worker/lib-v2-mac` 18329ff0f, stamp `eb-9d34d28f1b19ef3d`, 63 commits behind
         that master); the trace plays the battle Kyle described on both, with different kernel digests (the fixture lists
         both). After the fold the trace diverges at app 17134 (see (h)), and its Ice Ball then starts on a turn with no
         player switch. Reproduce at `e2cd1f1cd`, or stage it: the player switches on the turn the opponent starts a
         locked move.
5. **Timing / visible residuals** last, never while items 1–3 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291`, ISSUES #146 shd234; CASTFORM message region on the faint path,
   ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform "at"-role keys, Flamethrower +7 alignment, revert /
   switch-out unmeasured), the party-menu entry one frame early after a switch (pmo239), the forced party card's other 486 px
   vs the ROM (pmf240, `turn15-party-select` f20100; `tools/integration/pmf240CardProof.ts`), #188, #189,
   the Lobby attendant dialogue (nch231 skips it); exs207 refs kept. Note: `battle1-postwin-next-prompt` is not ROM-aligned
   around f25800 (the oracle is already in the Lobby); use `turn15-party-select` for party-menu ROM proofs.

**Host note (2026-10-28, again 2026-11-01):** two full suites at once on 16 GiB OOM-kill forks. Keep ONE worker at a time, and
the supervisor runs no suite / census while a worker may run vitest.

**Test note (2026-11-02):** the suite runs `isolate: false`; a test that mocks an engine module must use `vi.resetModules()` +
`vi.doMock` and undo both in `afterAll` (`tests/audioSinkPlumbing.test.ts`, contain209 / contain213), or it passes alone and
fails depending on file order.

## Gate recipe (unchanged)

Serialize heavy jobs; at most one worker beside them. typecheck;
`lsd194Census.sh` both scenes with `LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4` +
`rst197CensusDelta.py`; `compare:differential` (3 traces); full suite under
`nohup` with an exit file (~47–66 min; diff reported files against
`git ls-files` if a vitest fork dies); build; soaks at wind-down. A supervisor
verification checkout made with `git worktree add` needs the `reference`
symlink and `node_modules` (the launcher does this for worker worktrees; the wasm
artifact is gone with core-rs, cln241). Production changes need full suite + build on
the exact folded code; evidence / tooling-only changes use the affected gates.

## Headless execution discipline

`tools/run-claude-supervisor.py` owns the one original campaign deadline.
Never use Monitor, ScheduleWakeup or end your turn waiting for notifications.
Retain worker PIDs/logs and poll with bounded foreground calls. If a turn
accidentally ends, the controller waits for worker completion and resumes the
same conversation; it does not reset the clock or duplicate the worker.

State lives next to the raw log in `.controller.json`. Before a genuine final
exit, commit a clean handoff and write the JSON file named by
`POKEBENCH_SUPERVISOR_STOP_FILE`, with `session_id` from
`POKEBENCH_SUPERVISOR_SESSION_ID`, `status=complete|blocked|wind_down` and a
nonempty `reason`. This is not a waiting mechanism. A stop cannot leave active
workers or a dirty checkout; wind-down is accepted only in the last 20 minutes.
Usage limits/provider failures stop the controller without automatic retries.
Use one worker at a time on this 16 GiB machine. Budget validation before
launching more production work; do not dispatch a worker whose cap exceeds
remaining campaign time. Leave a truthful committed handoff before the cap:
rewrite "State at restart" and "Next work" above, keep the daily-runs section.

## Host budget

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~21 minutes at 5 workers when run alone (cln242), else ~50 at 2. Serialize typecheck, full
suite, build, census and soak fan-outs; use retained PID/log/status files for
long jobs and keep polling in bounded calls. Do not kill/retry a job just
because its shell tool yielded. Read CAX31 `PAPERCUTS.md`; bound any soak
fan-out to free memory and collect every per-seed result. Use host path
helpers and `/srv/pokebench/vendor/mgba-venv/bin/python`, not Mac-specific
paths. Claude Code 2.1.280 and the Opus/Sonnet model defaults remain pinned.
Disk: each run leaves ~5 GB under `.integration/validation/`, and the daily
launcher refuses to start under 15 GB free. At wind-down delete evidence
folders older than the last three runs (keep the census baselines the next
run's delta needs; the user approved this on 2026-10-31, when the folders
from before 2026-10-28 were removed).
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. The Mac imports results through bundles; never push.
