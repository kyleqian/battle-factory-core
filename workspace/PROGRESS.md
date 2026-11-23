# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-23 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-22 13:30 -> 2026-11-23 05:30 UTC): wind-down: sound timing ON -36 % / OFF -60 % (T2 13,629 -> 8,684 / 1,819 -> 719), every luck-only rare rule covered, Lobby / room / draft press gates, party-menu bob phases

- **State:** master clean, no push. **No DEFERRED items.** Final engine `74e01547a` (later commits: the soak driver fix `0adffbeed`, docs / handoff). **ENGINE_BUILD `eb-678abd85a36c3611`** (dist-lib of `74e01547a`; tell the website).
  Evidence `.integration/validation/sv-20261122/`; briefs + supervisor ledger `.integration/briefs/` (`supervisor-notes.txt`). Run start: the Mac delivery `3dd105fbc` (hit1, sfa2, rc1, tdr1, wtl1 / tri1 / sst1, Open Level opl1-opl5, rtc1); oracles restarted for rtc1.
- **Website (Mac):** no API change (`challenge-request` / `start`, `ready`, input unchanged); no new audio files. **Play changes (older recorded games replay on their own build only):** the battle-room opponent box takes its first A 3 frames after its last letter and the transition starts on the ROM's odd frame (abs1 / rmw1); the draft menu takes A 2 frames earlier (rmw1); Lobby free control after the farewell 1 frame earlier (lbf1); the Lobby page / end presses (abs1); every move / print timing change below shifts later presses.
- **Sound (S11, T2 25 ON + 24 OFF, `tools/audio/rescoreAll.sh` + `soundScoreboard.py`):** 0 missing / 0 extra throughout; **ON 13,629 -> 8,684 (exact 2,951 -> 3,251), OFF 1,819 -> 719 (exact 725 -> 849)** (`.integration/evidence/t2final-20261123`).
  drv2 (tools): the replay presses A on the ROM drive's first acceptable frame and forced-move ROM anchors move to the accepted press (ON -530 / OFF -204 at that point: harness, not engine). Engine steps (sections of `docs/aud251-s11-scoreboard-refresh.md` unless named): hse2, chg4, hie7, hit2 (`docs/hit1-move-hit-timing.md`), etp3, bbk1, hpb3 (`docs/hpb3-hp-bar-length.md`), shb1, fsi1 (the player's replacement ball follows the "Go!" print: all 47 send-in ball windows exact), ekd1, cfs1, sbm1, swt1, sep1 (IsBattleSEPlaying gate before the Leech Seed drain), ftp1, rcv1, ohs1, pso1; rankings t2k4 / t2k5 / t2k6 (`tools/integration/t2k4/`). Census eventsDigest identical on every fold (0..199 both scenes): no battle-rule change this run.
- **Presentation / flow:** bob1 (`docs/bob1-bob-phases.md`: healthbox bounce after a party-menu cancel, party icons on the HP-level animation); sbx1 (`docs/sbx1-end-turn-box-clear.md`: no box blank before "is buffeted" / hail); lbf1 (`docs/lbf1-lobby-farewell.md`); abs1 (`docs/abs1-ab-text-speedup.md`: no A / B text speed-up at the save's FAST speed, the engine already matched; two press gates fixed); rmw1 (`docs/rmw1-room-walk-and-summary-fade.md`; five `battle1-postwin-*` traces were 0 / N for a missing `appRoute`, now 199 / 199 etc.).
- **Gameplay coverage (item 0d):** run-start ROM replay on `3dd105fbc` **44 / 44** (1,668 states) + **125 / 125** stages, and the new **Open Level line 7 / 7** (118 states; one CHALLENGE 7, one gold Noland) + opl3 **7 / 7** (`docs/replay-ledger.md`). Luck day 7: 0 hits -> luck7 rebuilt the designs: **R040 and R110 promoted (ROM 11 / 11, 20 / 20; supervisor re-drive), R063 class (b): 99 -> 101 / 110; the 9 left are unreachable**, so the day hunt has no open design (the top layer may repurpose it). etk1: no Level 50 end-turn KO press gap. No wind-down replay (no rule change).
- **Tools / cleanup:** lsf2 (labs run past a player faint replacement: optional `labParty` seam, production unchanged, census + differential identical); pso1 (`labBackedStage(..., romTrainer)`); hit2 fixtures re-recorded in step mode; disk: 8 census `tree/` dirs + rmw1 scratch (13 GB) pruned (`.integration/evidence/TREES-PRUNED-20261122.txt`); orphan `.worktrees/verify-0d119486d` removed; PAPERCUTS 2026-11-22.
- **Decisions (reversible):** shb1's Scene ON gate `73 - (49 + bar)` and ftp1's Focus Punch print lead 16 rest on 3 / 1 T2 windows (sep1 explained the 49 as 36 + 13); chg4's Scene ON -10 is T2-fitted (second Dig instance -2). Kept, named in their sections.
- **Lapses:** an ftp1 launch based on fold-g before its t2k6 merge commit (conflict) was killed within 30 s and relaunched; a `fold-b` worktree add failed (the name is the kept 11-20 branch `0a63934b2`, untouched) and the next `git merge` ran against the main tree (refused on a worker's dirty file, nothing changed). Tests outside `test:gate` broke four times and were fixed by the supervisor (postwin, aud245bLibRestore, live adapter durations, audioProbeFixtures).
- **Gates (final engine `74e01547a`):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each (0 crash / 0 hang). The first wave-1 pass on `74e01547a` HANGed in the free-roam Lobby after a loss (vanilla OFF 6 / 20, ON 1 / 20, 0:60 7-10 / 60): lbf1's ROM-faithful hand-off frame lets a held direction turn the player and the soak driver only pressed while facing the attendant; fixed in the driver (`0adffbeed`, tools only; lbf1 reverted -> OK proved the cause) and wave 1 re-run there (engine unchanged); the varied-RNG sweeps end at the first round decision (no Lobby) and stand from the first pass. Full suite **16,945 passed / 0 failed** (1,966 files; 2 workers, 50 min beside the soaks); typecheck / build / build:lib 0. Mid-run full suite `82c6aaa20` 16,910 / 1 (the appRoute ratchet, fixed by rmw1). `play:random --minutes 10 --scene both --lobby-new-challenge` (build of `74e01547a`): ON 30 battles / 14 swaps, OFF 64 / 29; **0 page / console errors, 0 overlays**, 0 Lobby / stall restarts.
- **Next:** handoff "Next work" (ranked): the faint box's press-ready frame (OFF s6568 d104, lab now possible), the Focus Punch family's next row, Supersonic (needs a supported lab pair), the end-turn last-print box blank (~30 frames, sbx1 open), the Leech Seed drain body pixels (age 21 vs SE 7 + 2), Slack Off / Morning Sun live bodies; re-measure the soak / lbrd pins on every merged tree.

---

## 2026-11-22 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-21 13:30 -> 2026-11-22 05:30 UTC): wind-down: sound timing ON -44 % / OFF -36 %, "Player defeated" / end-turn prints on the ROM rows, 14 more rare rules, two Frontier transitions

- **State:** master clean, no push. **No DEFERRED items.** Final engine `30cd3dfac` (later commits: tests / docs / tools). **ENGINE_BUILD `eb-99fc9734e67828a5`** (dist-lib of `30cd3dfac`;
  tell the website). Evidence `.integration/validation/sv-20261121/`; briefs + supervisor ledger `.integration/briefs/` (`supervisor-notes.txt`).
- **Website (Mac):** no API change (`challenge-request` / `start`, `ready`, input unchanged). **Play changes (older recorded games replay on their own build only):** "Player defeated" takes its
  first A 24 frames later (wtl1); end-turn prints (weather, poison / burn / Future Sight / Wish / Ingrain ticks, after "was dragged out!") open on the ROM's rows (wtl1 / etp1); a super-effective drain
  KO prints "fainted!" 6 frames later, a Shell Bell KO's party summary 6 earlier (fnt2); every move-timing change below shifts later presses. No new audio files.
- **Sound (S11, T2 25 ON + 24 OFF, drv1 cadence, `tools/audio/rescoreAll.sh` + `soundScoreboard.py`, t2k -> t2k3):** 0 missing / 0 extra throughout; **ON 25,747 -> 14,435 (-44 %), exact 2,366 -> 2,935;
  OFF 3,164 -> 2,040 (-36 %), exact 600 -> 725.** Landed (sections of `docs/aud251-s11-scoreboard-refresh.md` unless named): b4l / b4l2 (11 B4 bodies present the kernel lead + per-id window; Ghost Curse
  ROM-checked), stc1 / stc2 (OFF stat SE; hp -> stat = bar + 8 both scenes; OFF confusion self-hit), hcr3 (stat-next / recoil hp rows, faint SE clip), bdt1 (Metal Claw window 154, Dig, Rest), gsp3 (asleep
  turn, poison / burn tick, infatuation), fch1 (AI replacement choice 0..4 frames, D4 faithful timing), chg2 / chg3 (two-turn moves; Aerial Ace's impossible stat change), hie5 (held item after print-ended
  scripts, restore-HP tails), eqk1 (Earthquake hit-all transition, Pausex20 before "doesn't affect", Magnitude OFF), itm1 (held item after a faint waits for SE_FAINT), mxp1 (Explosion / Self-Destruct /
  Magnitude ON), wtl1 / etp1 / etp2 / fnt2 (`docs/fnt1-fainted-box-clear.md`). Census eventsDigest identical on every fold (0..199 both scenes; hcr3 0..999): no battle-rule change this run.
- **Presentation:** trn226 (#225): LOGO_WIGGLE drawn from source, LOGO_WAVE starts at te 32: 0 bad frames of ~1,300 both scenes (Noland room only). msw2: #227 closed (ROM = engine after SELECT + Mimic,
  pinned), #223 Substitute box clear on the ROM row.
- **Gameplay coverage (item 0d):** run start: luck day 6 0 hits; ROM replay on `5fbac1476` **44 / 44** (1,289 states) + **110 / 110** stages. rrh6 + rrh7: 14 rare rules hand-staged, ROM-matched:
  **85 -> 99 / 110**. No wind-down replay (no rule change; handoff item 0d).
- **Cleanup:** cln12 / cln13 (`tools/integration/labCompare.sh`: ROM probe + engine + aligned SE / first-glyph table, cross-run ROM reuse; `tools/battle-lab/README.md` "Lab compare"); branch / worktree
  prune as steps folded; disk: 28 census `tree/` dirs and 47 stale `/tmp` scratch entries + two closed 11-13 oracle logs (62 GB) removed (`.integration/evidence/TREES-PRUNED-20261121b.txt`, `TMP-PRUNED-20261121.txt`).
- **Decision (reversible):** hcr3's aud252 item rows moved away (+4 -> -8 / -6) while the faint / select rows went exact: accepted as a #219 residual; itm1 then closed it (-2 / 0).
- **Lapses:** rrh6 (side) ran git in the main tree (8 commits on master; a `commit -a` swept b4l's WIP `moveAnimSounds.ts` into a stage-file commit; content correct, kept). A supervisor `cd` failure merged fnt2
  straight into master while msw2 ran there (no conflict, kept) and deleted the merged 11-20 `fold-b` branch (restored at `0a63934b2`). Disk reached 99 % at 20:10. The master chain on `5819467ba` lost its build to OOM (re-run green later).
- **Gates (final engine `30cd3dfac`):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0
  **100 / 100** each (0 crash / 0 hang). Full suite on `30cd3dfac` **16,711 passed / 3 failed**, all test-side (mxp1's Explosion window 212 -> 213, etp1's poison end-turn rows; fixed in `bcde22ba2`, 11 / 11);
  typecheck / build / build:lib 0. **Final tip** (tools / docs after the gates): full suite **16,715 passed / 1 failed** (the iss215 ratchet: nrv1's new tool lacked the pixel installer; fixed in `8e37b066d`,
  24 / 24 with the lab-folder tests), build 0. Mid-run full suites: `0a6b92a55` 16,671 / 0; `14f3e5a44` 16,671 / 0; `2aa2d69e1` 16,671 / 0; `62ebcc5b3` 16,680 / 0; earlier `9e5a45dbc` 11 failed (b4l pins, b4l2),
  `22c58649b` 5 (stc2), `5819467ba` 2 (lbrd trajectory). `play:random --minutes 10 --scene both --lobby-new-challenge`: ON 28 battles / 12 swaps, OFF 59 / 22; **0 page / console errors, 0 overlays**.
- **After the gates (tools / docs only, engine unchanged; sections of `docs/aud251-s11-scoreboard-refresh.md`):** t2k3 (the ranking above); fch2m: the faint-chain "cliff" is the census driver's
  A gate (3-frame dead zone), opt-in `soundCensusRomReplay.ts --dismiss-accept=1` / `AUD249_DISMISS_ACCEPT=1`: OFF 2,040 -> 1,841, ON +83 (three upstream windows it un-hides); hse1m: t2k3 item 2 was
  misattributed: OFF hit-SE mass = Struggle's no-moves box (driver; now follows the ROM drive's A frames by default, OFF T2 baseline 2,040 -> **1,819**) + the OFF wake-up print hold / icon (Scene ON-only
  rules today) + the OFF confusion head (-4 rows); hie6m: the held-item +21 class is the foe's Leftovers after the player's forced send-in (start +6, then the 15-frame restart lead); g180m: t2k3 item 4 is
  the Leech Seed drain (post-send-in +13, end-turn print heads / holds) and Sun's unreceipted age, item 5 is Dig's charge-turn print after a previous move (-8 .. -19); nrv1: trn226 did not change the Head
  battle's RNG (40 / 40 identical) — but on the Noland-room recordings the engine's RNG at the Head battle start never equals the ROM's (Noland's lead differs 40 / 40), against the Mac catcher's "the Head's
  team is the engine's" (hdt1); hdt2m (`docs/hdt1-factory-head-team.md` "hdt2m"): both are right: the engine's Head-team rule is the ROM's (fed the ROM's own cursor, the lead matches 20 / 20; 2nd / 3rd 17 / 20 with 8-13 VBlank
  draws between builds), the difference is the RNG input stream (the room's per-VBlank cursor, the parked #55 distribution class), not a missing draw; t68m: t2k3 items 6-8 are mostly inherited offsets (poison tick first row after
  the preceding command; Rock Slide's own interval exact), one press gate (Ice Beam s2230) and the Scene ON continuation-segment lead after a charge turn (`usedMovePrintLeadU`). wkl1m: two Scene OFF wake-up labs (`tools/battle-lab/wkl1m-wakeup-*-off.json`, Rest) for hse1m's rule (Spore labs desync on
  sleep length: the lab-RNG class, the ROM replay matched 44 / 44 real battles). Each doc has a landing recipe.
- **Next:** (1) land hse1m's OFF wake-up hold / confusion head and g180m's Dig charge-turn
  print (recipes in the doc), then fch2m's dismiss-accept default (with hse1m's hit-SE windows it un-hides); (2) hie6m's send-in Leftovers start / lead; (3) Leech Seed drain rows (g180m, etp2 labs); (4) t2k3's
  poison first row / Ice Beam first window / Rock Slide; also the Wrap print after the hit, Magnitude power-roll labs, #225 ordinary room. Re-scan the soak / lbrd trajectory pins after every timing merge.

---

## 2026-11-21 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-20 13:30 -> 2026-11-21 05:30 UTC): wind-down: sound timing ON -25 % / OFF -35 %, swap-return room, SELECT move swap, Lobby save wait, used-move print timing both scenes

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `c6117abdc` (later commits are tools / tests / docs; full suite on the tip
  `e7c1c4d2f` **16,405 passed / 0 failed**). ENGINE_BUILD: see Gates. Evidence
  `.integration/validation/sv-20261120/`; briefs + supervisor ledger `.integration/briefs/` (`supervisor-notes.txt`).
- **Website (Mac):** no API change (`challenge-request` / `start`, `ready`, input contract unchanged; SELECT already reaches the engine through `GbaButton` / Shift / gamepad).
  **Play changes (older recorded games replay on their own build only):** after a post-win swap the room holds black, fades in and says "Thank you! Your POKéMON swap is complete." (waits
  for A / B; rsw1 / rsw2, `docs/rsw1-swap-return-room.md`); the Lobby save waits 60 frames after the save sound or a held A, and the Lobby menus no longer wrap (lbw9,
  `docs/lbw9-lobby-save-wait.md`); SELECT in the move menu swaps moves as in the ROM, and the order persists into later battles (msw1, `docs/msw1-select-move-swap.md`). **New audio files:**
  10 recordings (Blizzard / Gust sweep pans and 7 centred SEs, OGG + AAC, ~240 KB; snd3, `docs/snd3-pan-recordings.md`).
- **Sound (S11, T2 ROM replays on the final engine, `soundScoreboard.py` over `.integration/evidence/t2final`):** 0 missing / 0 extra both scenes; **Scene ON mass 35,592 -> 26,673
  (-25 %), exact rows 1,007 -> 2,362; Scene OFF 5,437 -> 3,537 (-35 %), exact 126 -> 584** (vs t2n). Landed (docs/aud251-s11-scoreboard-refresh.md sections): hcr1b / hcr1c (Scene OFF first
  used-move glyph at commit + 7 + u, pixel-exact on 28 labs; battle-command-generated-off 128 / 128 kept), hcr2 / hcr2b / hcr2c (the same in Scene ON, 28 ON labs; per-emitter sound lead 7 - L),
  gsp2 / gsp2b (Scene ON wake-up head), fsc1 (Scene OFF hit on a Dig / Fly / Dive target, hit-all box: eqko-off 533 -> 742 / 899), chg1 (Scene OFF two-turn moves, e.g. Skull Bash 671 / 671).
  Supervisor decision (reversible, recorded in the doc "hcr2d"): 7 Scene ON pins keep hcr2c's values (named residuals in ISSUES #219): master's values were fitted to the old fixed first print.
- **Gameplay / flow:** rsw1 (swap-return room, RNG per frame through the hold / fade / wait; compare 79 -> 482 / 488, kept path 62 -> 360 / 360), rsw2 ("Thank you!" A ready +1; the walk is exact,
  267 / 267; the catcher's 42 frames were its own press timing), msw1 (#227: SELECT move switching, OFF trace 115 / 117), lbw9 (#228: 8 new Lobby traces exact, e.g. save wait 134 -> 269 / 269).
  Run start: luck day 5, R058 / R096 promoted (rare rules 83 -> 85 / 110); nightly replay **44 / 44** (1,755 states) + **110 / 110** stages. Wind-down replay: see Gates.
- **Found, not fixed:** the room's opponent-setup RNG draws are the canonical trace's fixed nature-loop counts (rsw2; parked #55 class, noted there); fsc2m: the OFF faint -> party-summary
  offset is mostly the ROM driver's 17-frame A pulse (census-driver fix next run).
- **Cleanup:** cln10 (soak `--help` / interrupt summary, `soundScoreboard.py` guard + mass column, census `--digest` / WORKTREE arm, compare `--summary` diff runs, generic lab-backed compare
  stage); cln11 (after the gates: the generic lab stage builds any `overrides.parties` lab from the engine's stat code, `tools/compare/labMon.ts`; `appStage.rngSeed` takes the ROM's
  gRngValue at the first menu, since the ROM makes ~1,600 Random() calls before it: chg1-bounce-foe 442 -> 663 / 671); branch prune (lib-v2-mac + this run's worker branches).
- **Lapses:** a branch glob deleted the two kept 2026-10-26 branches; restored at their tips (`worker/integration-20261026-213055` = `ce83513bb`, `-223044` = `fbc7df1db`). Merging b4m /
  hcr3m tools broke the `iss215ToolPixelInstall` ratchet (not in test:gate); found by cln11, fixed. fsc2m (side lane) committed its docs / tools commit into the main tree, not its worktree (brief named main-tree evidence paths; content kept); two supervisor merge resolutions
  in `tools/compare/appTrace.ts` / soak pins needed fix-ups (typecheck caught a truncated function; the chg1 + hcr2 merge leaked chg1 into Scene ON, caught by the full suite, gated).
- **Gates (final engine `c6117abdc`):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap
  carry 0 **100 / 100** each (0 crash / 0 hang everywhere; the OFF gates ran on `f1a8c2881`, whose Scene OFF path is identical to `c6117abdc`; vanilla ON re-run on `c6117abdc`). Full suite on
  `c6117abdc` **16,387 passed / 0 failed**; typecheck / build / build:lib 0; **ENGINE_BUILD `eb-3c2651248c642b97`** (dist-lib of `c6117abdc`; tell the website). Mid-run full suites: `687c474a0`
  16,327 / 0; `9a12931d7` 8 failed (fixed by hcr1c); `99fca080c` 16,345 / 0; `0a63934b2` 95 failed (hcr2 alone; fixed by hcr2b / hcr2c); `4fc84e424` 16,362 / 0; `350a094a8` 16,370 / 0;
  `40e172bd9` 1 failed (test-side, `17fb498e3`); `40fb8a8bd` 3 failed (chg1 leak into Scene ON, gated in `c6117abdc`). **Wind-down replay** on `c6117abdc`: pool **44 / 44** (1,441 states),
  stages **110 / 110** (`docs/replay-ledger.md`). `play:random --minutes 10 --scene both --lobby-new-challenge`: ON 37 battles / 11 swaps, OFF 61 / 20; **0 page / console errors, 0 overlays**.
- **After the gates (tools / docs only, engine unchanged):** drv1: the engine replay presses A on the ROM driver's frames (`soundCensusRomReplay.ts --romdrive`, default in
  `aud249Rescore.sh`): T2 OFF 3,537 -> **3,164**, ON 26,640 -> **25,840** (faint -> party-summary median -7 -> -0.5; the +13 / +15 rows are a real engine term: ready 1-3 frames after the
  ROM's pulse). hcr3m: the 7 Scene ON residuals traced to commands (Icy Wind hit hp keeps the 28-row floor vs ROM 17; recoil hp floor + 7 unpresented rows; second-mover lead L + 1; Rollout /
  Ice Ball hp = damage + 8 on the ROM). b4m: ROM leads of the 12 B4 bodies (Thunder Wave / Stun Spore / Glare 9 ... Curse 4); the kernel's own lead already equals them; ais2's ON +2 is two
  pixel-correct holds in earlier turns (the re-pin stands).
- **Next** (ranked): (1) land hcr3m (hp floors after a hit / recoil, Rollout / Ice Ball hp = damage + 8, second-mover lead) and b4m (B4 ids into `BODY_LEAD_RULE`, tails, status SE offset +10 -> +3),
  re-scoring with drv1's ROM-cadence replay; then the AI-choice term (fsc2m: 6, +2 with no super-effective candidate); (2) Scene ON per-body interval
  re-derivation for the 7 hcr2 residuals (ISSUES #219: Haze / Seismic Toss second mover, rollout5 / iceball5 later turns, aud252 end rows, ais2 ON window; Icy Wind hit -> stat SE 89 vs 77) and the
  per-print u in Scene ON; (3) the unaudited bodies' Scene ON lead (L < 4: Present 0, Memento 8, Double Team 2) and Curse -3 / Toss -1; (4) lead1m B4 C bodies, B5 adapter windows, multi-hit
  hits 2+; (5) small: chg1 Dive player unleash +1, the hcr2 labs' foe pose at the print end, #227 Mimic edge, #225 LOGO_WIGGLE / LOGO_WAVE, #223 remainder. Run the FULL suite before folding any
  timing change, and re-run the soak pins after every merge of two timing branches (they re-pin against their own bases).
