# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-23 — rcv1 (worker, main/ts lane): restore-HP body tails re-fit to the ROM print row (ON); Scene OFF hit -> Leech Seed drain 35 rows

- **State:** master, no push; ac70e23a3 (Recover 6 / Soft-Boiled 5 / Milk Drink 6 / Moonlight 4 tails; print +19 / +5 / +21 / +4 -> 0), e66ff81e6 (Synthesis 7, six etp3-*ls2 labs), 492d78b67 (OFF drain: hit hp tail 15 + drain 35; OFF Leech Seed labs +9 / -6 -> 0). T2 ON 9,441 -> 9,241, OFF 786 -> 782; census 0..199 eventsDigest identical both scenes; typecheck, test:gate 2,839, build green.
- **Did:** the +19 was the restore body's tail overshoot, not the hp -> print hold; OFF drain is 35 rows from Pausex20 after a hit and the OFF hit hp command needed the ON 15-row tail for long bars. See the rcv1 section of docs/aud251-s11-scoreboard-refresh.md.
- **Next:** Slack Off (print -91) / Morning Sun (+94) have no live body adapter; faint box press-ready frame (OFF s6568 d104) needs a one-frame ROM press scan; 5 pre-existing failures in liveNext5MoveAdapters / liveAnchorMoveAdapters.

---

## 2026-11-22 — sep1 (worker, main/ts lane): Scene ON Leech Seed drain follows the IsBattleSEPlaying gate (hit SE end) and runs 7 + 2 rows after a print; T2 ON 10,051 -> 9,939, OFF 861 unchanged

- **State:** master, no push; commits 219676c82 (hit -> drain tail 15 + SE-gated launch lag), 985f3464b (pin), 17354087d (drain after a print +2, new lab etp3-recoverls4). Labs: etp1-leechseedc-on ON mass 80 -> 0, every other Leech Seed / hie1 / shb1 lab unchanged; census 0..199 eventsDigest identical both scenes (ON sound rows only); typecheck, test:gate 360 files / 2,839 tests, build green; 158 importing test files + soak + lbrd green, no re-pin.
- **Did:** one gate (battle SE 13 = 73 rows from se-song-rows.json) explains shb1's 73 - (49 + bar) (49 = 36 SE -> hp start + 13 hp start -> exec, not a fit) and the long-bar Leech Seed lag 0; Recover -> drain +17 is the Recover body's +19 (hp -> regained-health print) minus a 2-row early drain, not a gate term. See the sep1 section of docs/aud251-s11-scoreboard-refresh.md.
- **Next:** Recover body hp -> "regained health" print +19 (etp3-recoverls4-on); the drain body pixels keep age 21 (lsd198 receipt vs the 7 + 2 SE rows, not re-measured); Scene OFF drain command +9 (not touched).

---

## 2026-11-22 — ekd1 (worker, main/ts lane): hit on a hidden Dig/Fly/Dive target skips the blink in Scene ON and on KO; T2 ON 10,580 -> 10,418 (s648 only)

- **State:** master, no push; commit 2a907fec7 (+ docs). Lab ekd1-dig-eqko-on ON 41 -> 8; 32 existing lab-scene runs mass 646 -> 646; census 0..199 eventsDigest identical both scenes (ON s81 Sky Uppercut on a Fly user 35 -> 2 rows, intended); fsc1/eqk1/etp/hie7/hpb3/lbrd/Leech Seed pins/randomRoundSoak* green, typecheck green, test:gate 360 files / 2,839 tests, build green.
- **Did:** KO clears status3 and the ON path never used the 2-row hidden hit step; items 2 (Leech Seed drain start: ROM hp start -> exec = bar + 17, launch lag 7 short bar / 0 long bar, no rule landed) and 3 (OFF s6568 d104) not landed, see the ekd1 section of docs/aud251-s11-scoreboard-refresh.md.
- **Next:** Recover -> drain lab to fix (command start, launch lag) from the bar length; tests/aud245bLibRestore.test.ts fails on baseline too (BGM 695 vs 701).

---

## 2026-11-22 — shb1 (worker, main/ts lane): Shell Bell heal -> next used print (both scenes) and the Scene ON item-animation SE gate; T2 ON 11,531 -> 10,811, OFF 1,186 -> 1,039

- **State:** master, no push; commits 625729d46 (used print after the heal: tail 3 + 1 + 6 + u), 7722ce273 (ON gate 73 - (49 + bar) on the Shell Bell animation) + docs. Labs shb1-holder-first-{player,foe} 60 / 20, 50 / 10 -> 0; census 0..199 eventsDigest identical; hie* / hpb3* / lbrd / randomRoundSoak* green, typecheck, test:gate 360 files / 2,838 tests, build green (not the 185 files importing battleResolutionPresentation.ts one by one; the named 16 + the gate).
- **Did:** the foe-battler +12 vs +8 was an IsBattleSEPlaying wait (hit SE 73 rows, bar 20), not a foe rule; the 10-row early print was the missing action-transition pause (no MoveEnd receipt after the heal).
- **Next:** OFF s97 d13 item stand-in 45 vs ROM 35 rows (now ~7 late); the gate constant 49 rests on 3 windows; s97 ON res11 carries +25 from before the heal.

## 2026-11-22 — bob1 (worker, main/ts lane): healthbox/battler bob after the party menu and party-icon bob phase (both scenes); OFF cancel lab 246 -> 276 / 300, hp lab 977 -> 1029 / 1100

- **State:** master, no push; commits 51365b7b4, a7f526b7b, 45c61dbf9, a184ec3e4 + docs. typecheck, test:gate 360 files / 2,838 tests, build green; 350 importing/pin test files green (no re-pins); census 0..199 eventsDigest identical both scenes; canonical party traces 200/200, 200/200, 115/115, 142/142 unchanged.
- **Did:** cancel restarts the bounce at age 0 (ReshowBattleScreenAfterMenu); the open window keeps bouncing (Class B fixed offsets removed); party icons use sAnim_0..4 by HP level (cycles 15/19/31/47/61), creation tick = open fade-in start, no y2 hold at menu-open selection. docs/bob1-bob-phases.md.
- **Next:** the ROM party-open black hold is 1 frame longer in the lab (flw252-party-fade-on 261/340, cause unproven); yellow / forced-menu icon phase unverified; stage bounceAge frames 31/38.

## 2026-11-22 — bbk1 (worker, main/ts lane): Brick Break through a screen (OFF), OFF asleep print head, chg4 item 3 narrowed; T2 ON 11,911 -> 11,750, OFF 1,348 -> 1,203

- **State:** master, no push; commits a5d7e4d7b (Brick Break), 092b01639 (asleep head), 8accfc5b0 (ON plain-hit continuation), eaf6c115b (soak re-pin), typecheck fix on top. typecheck, test:gate 360 files, build green; 183 importing test files green; census 0..199 eventsDigest identical both scenes.
- **Did:** OFF Brick Break through Light Screen / Reflect exact (body 46, wall print 86; SE mass 126 -> 0); OFF asleep print -15 -> 0 (wkl1m labs); ON continuation after the foe's charge holds the OFF confirm-walk lead for a plain damaging hit (s830 487 -> 357, s165 / s310 unchanged). Re-pin: randomRoundSoak seed 0 full (named in the test). Section "bbk1" in docs/aud251-s11-scoreboard-refresh.md.
- **Next:** Brick Break ON residuals (body +1, own SE +1); tests/audioProbeFixtures.test.ts has 3 pre-existing failures (hit2 fixtures), not in the gate.

## 2026-11-22 — hit2 (worker, main/ts lane): Hail + Future Sight hit sounds on the ROM rows (T2 ON 13,166 -> 13,068); monbg-wait item not uniform, not landed

- **State:** master, no push; commits ed6c88257 (Hail clock), 765a42d76 (Future Sight sounds), e520240fe (typecheck narrowing + docs). Gates: typecheck, test:gate 360 files / 2,835 tests, build green; aud249 / wsh1 / hit1 / lbrd / randomRoundSoak* green; census 0..199 eventsDigest identical both scenes.
- **Did:** (1) item 1 traced, not landed: the ROM's monbg clear is a constant +5 rows after the last visual task (I - c0 = 5 on 7 bodies), but whether our window already includes it is a hand-fitted constant per body, so a script-derived rule would break the exact ones. (2) Hail: General_Hail's ten SE 242 rows were +8, now exact (etp1 / etp2-hail-on; the "+4 damage SE" is not reproduced, left). Future Sight hit: anim SEs -6 -> 0, hit SE +7 -> 0, faint cry / SE +7 -> 0 (lab etp1-futuresight-on, engine seed 2, mass 54 -> 22, rest is the cast turn). T2 ON mass 13,166 -> 13,086 -> 13,068, exact 2,966 -> 2,976; OFF 1,552 / 776 unchanged; 0 missing / 0 extra. (3) lead-body clock not reproduced on today's labs, unchanged. Pin moved: wsh1-fs-on SEs 3 / 41 / 50 -> 9 / 47 / 56 (ROM rows 2868 / 2906 / 2915 vs rise 2865 + 6). Doc: `docs/hit1-move-hit-timing.md` "hit2".
- **Next:** Future Sight cast turn (SE +5, prints -3); per-adapter last-visual-row derivation for the monbg tail bodies.

## 2026-11-22 — chg4 (worker, main/ts lane): first charging turn after another action is a transition print, T2 ON 13,629 -> 13,166, OFF 1,588 -> 1,552

- **State:** master, no push; commit 2ba5774f4 (item 1) + docs. Gates: typecheck, test:gate 360 files, build green; 166 tests importing `battleResolutionPresentation` green; census 0..199 eventsDigest identical both scenes.
- **Did:** (1) Dig / Fly / Solar Beam ... charge box after another action takes the action-transition pause (OFF +18 rows, ON -10 against it), labs `chg4-dig-lightscreen-{on,off}`; T2 ON exact 2,951 -> 2,966, OFF exact 776 (0 missing / 0 extra); g180m Sandstorm -> Dig extra -11 is the same rule (-19 -> -2), nothing separate. Soak pins re-scanned: Baton Pass 20 -> 24, winning carry 0 -> 19. (2) t68m recipe 1 NOT landed: the ON continuation-segment walk fixes s830 d1 / s8108 (-112 / -121) but worsens s165 d11 (+82, miss tail) and s310 d10 (+71, unleash chain), so it is not uniform.
- **Next:** item 3 limited to a plain-hit first print (see the doc's chg4 section); re-lab s165 d11 / s310 d10 first.

## 2026-11-22 — hse2 (worker, main/ts lane): Scene OFF wake-up / confusion / Struggle heads, T2 OFF 1,819 -> 1,588 (ON unchanged)

- **State:** master, no push; commits d84490954, 5be0a2c3b, f660ee691, soak re-pin, anchor-test fix, docs. Gates: test:gate 360 files green, typecheck, build.
- **Did:** (1) OFF wake-up uses the ON message hold and icon rule; (2) OFF confusion print before the used print holds 64 + 3 + 4; (3) OFF-only Struggle forced handoff 1 frame shorter (shared hold moved ON +16, so not shared). T2 OFF exact 725 -> 776, 0 missing / 0 extra; ON 13,629 / 2,951 identical. Census 0..199 eventsDigest identical both scenes. Numbers and pins: `docs/aud251-s11-scoreboard-refresh.md` "hse2".
- **Next:** asleep / wake print head -15 after a hit, infatuation -3, Focus Punch, two-turn second turn (hse1m ranking in the doc).
- **Notes:** pins moved: randomRoundSoak render calls 3,052 -> 3,054, Baton Pass seed 16 -> 20; sa125 / sag130 read the OFF confusion print at the ON hold. The task said not to touch PROGRESS.md but also to keep its top entry current; only this entry was added.


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

---

## 2026-11-20 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-19 13:30 -> 2026-11-20 05:30 UTC): wind-down: sound timing -36 % (Scene ON), switch-in ability prints, button-wait messages, Brain music, 6 transitions, Shedinja HP

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `17f2a47e8` (later commits are tests / docs). ENGINE_BUILD **`eb-ffe38fb0b685bbe6`**
  (dist-lib of `17f2a47e8`; tell the website). Evidence `.integration/validation/sv-20261119/`; briefs `.integration/briefs/` (supervisor ledger `supervisor-notes.txt`).
- **Website (Mac):** no API change (`challenge-request` / `start`, `ready`, input contract unchanged). **Play changes:** battle messages with a `\p` / `\l` prompt (Substitute damaged / faded, Roar "dragged
  out", the Taunt / Disable / Torment / Imprison "can't use" texts, Trick both items, Static, ability blocks) now wait for a new A or B as in the ROM (btn1 / btn2; `docs/library-package.md`
  "Battle messages that wait for A or B"); games recorded on older builds replay on their own build only. **New audio files:** `bgm-471.ogg` + `aac/bgm-471.m4a` (the Factory Head battle song, ISSUES
  #224 closed; ~1.2 MB together). On screen: Intimidate / Trace prints at battle start and on switch-in, six Frontier transitions drawn as in the ROM, ROM hp-bar lengths for status / weather / wrap ticks.
- **Sound (S11, T2 ROM replays, t2n on `29688b8cd`, `docs/aud251-s11-scoreboard-refresh.md` "t2n"):** 0 missing / 0 extra every family (25 ON + 24 OFF seeds); offset mass **ON 55,711 -> 35,592
  (-36 %, exact rows 479 -> 1,007, move-SE exact 334 -> 820)**, OFF 6,125 -> 5,437 (-11 %). Landed: lead2 / lead3 / lead4 (lead1m B0-B3: 80 + 50 bodies take the ROM script lead; 18 + 4 ROM-checked,
  e.g. Facade 22 -> 480, Rock Tomb 111 -> 549, Protect 753 -> 863 / 1023), lse4 (Absorb / Revenge / Recycle / Razor Wind / Wish: Razor Wind 0 -> 378, Wish 130 -> 394; Recycle 538 -> 508, heal-animation
  residual), lfx1 (3 pins the gate missed, ROM-justified), hpf5 (hpf4m T1-T4 / S1 + sta6m: -5,280 frames per 200 battles, both scenes), pau4 / pau5 (Intimidate / Trace entry scripts at battle start
  and on switch-in / replacement: e.g. sta6m-intro-intimp OFF 334 -> 593, pau5-opp-intimidate OFF 73 -> 445), btn1 / btn2 (#223), bgm1, ice2 (census 0..999 Scene ON static commands 1 -> 0).
- **#225 (trn225):** 6 of 7 undrawn Frontier transitions drawn from source, 0 bad frames vs the ROM both scenes (SQUARES, SQUARES_SCROLL, CIRCLES_*); Noland room recordings compared further
  (e.g. silver-first-slow 1,239 -> 1,622). Open: LOGO_WIGGLE, LOGO_WAVE's older mismatch.
- **Gameplay (item 0d):** run-start replay on `0d2973b40`: pool **44 / 44** (1,346 states), stages **94 / 94**. Luck day 4: 7 / 7 ROM match promoted (`0d2973b40`); rrh5 (hand-built set-ups) +9;
  shd1: **Shedinja max HP 1** (CalculateMonStats; `src/engine/stats.ts` `calculateMaxHp`): the only engine rule change, census 0..999 both scenes 0 changed (set 21 is outside every Factory rental
  range, battle_factory.c:169: lab parties only). Rare rules **66 -> 83 / 110**. Wind-down replay: see Gates.
- **Gates (final engine `17f2a47e8`):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap
  carry 0 **100 / 100** each (0 crash / 0 hang everywhere). Full suite on `17f2a47e8` (2 workers, beside the soaks): **16,112 passed, 3 failed**, all three fixed test / tool-side after it and re-run
  green: `liveIceBallAdapter` x2 (ice2 A now draws an unknown lend approximately; `1d304ea6e`) and `iss215ToolPixelInstall` (btn2's new tool lacked the pixel installer; `452e5415d`). Earlier full
  suites: `41ccb0884` 16,048 / 0; `90e6aaba1` 16,073 / 2 (lead2 pins, fixed by lfx1); `29fd7cf34` 16,090 / 5 (merge pins, fixed by pin1); `29688b8cd` **16,099 / 0**. typecheck / build / build:lib 0.
  **Wind-down replay** on `17f2a47e8` (shd1 is an engine rule change): pool **44 / 44** (1,312 states), stages **108 / 108** (`docs/replay-ledger.md`). `play:random --minutes 10 --scene both --lobby-new-challenge`: ON 40 battles / 19 swaps,
  OFF 62 / 23; **0 page / console errors, 0 overlays**.
- **Cleanup:** cln9 (5 unread scratch JSONs; 109 one-off scripts kept: tracked receipts name / hash them as their generator, `docs/cln9-oneoff-scripts.md`). The aud251 doc's 62 MB sed corruption
  (`b0e4cf53d`, last run) undone by t2n (177 KB). Disk: ~33 GB of census `tree/` dirs pruned (`.integration/evidence/TREES-PRUNED-20261120.txt`).
- **Lapse:** lead3's worktree was removed before its `.integration` evidence was copied (census arms lost; numbers are in `docs/lead1m-rule-lead-design.md` "lead3", log kept).
- **Next** (ranked by t2n section 5): (1) general / status-animation spacing (ON 25 % of the mass): **gsp1m measured the cause** (`docs/aud251-s11-scoreboard-refresh.md` "gsp1m"): the wake-up `status` command takes the 32-frame `STATUS_TIMING` default (ROM prints the wake-up at commit +9..12, ours +41), so every later SE of that turn runs +24..+29 late; a 6-frame probe cut matched |offset| 35,239 -> 31,265 (-11 %) over 25 ON seeds; the ROM head varies by the preceding command (3 / 6 / 12): measure it, then land, then the held-item restart lead (15 -> ~11), infatuation tail, Curse; (2) hit-controller rows SE 13 / 12 / 14 (OFF 41 %): **hcr1m measured the cause** (same doc, "hcr1m"): the first used-move print sits at a fixed commit + 9, the ROM at commit + 6 + u (u = script
  commands before the print: EffectHit 4, secondary hits 6, Struggle / recoil 8, Earthquake / status 2); a probe cut OFF hit-row |offset| 2,255 -> 1,458 (-35 %), all rows -23 %, exact rows 126 -> 560 (land in
  `advanceBattleResolutionConfirmHandoff`; Scene ON: hcr2m, the rule holds there too (417 / 418 turns) but moving the print alone gains only -6 %: land OFF first, find the ON constant on one u 2 / u 4 turn); (3) faint / send-in chain (fsc1m, same doc "fsc1m", OFF s648: 45 % of its mass is engine rows: the faint-message -> party-summary interval (median -8 on 118 rows; ROM AI choice 6..10 frames), the hit blink played on an invisible (Dig) target (+25..+32), Earthquake's EMPTYSTRING3 box held 24 vs ~5 frames; the first-print lead 16 %, the driver anchor 6 %: land with hcr1m); (4) lead1m B6 charge turns (Dig / Solar Beam / Fly), B4 C bodies,
  B5 adapter windows; (5) Recycle's heal-animation start (lse4), LOGO_WIGGLE / LOGO_WAVE (#225), #223 remainder (box clear 1 row late). Run the FULL suite before folding any timing change.
