# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-21 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-21 13:30 -> 2026-11-22 05:30 UTC): INTERIM (20:25 UTC)

- **State:** master `14f3e5a44` (all folds below); full suite on it running (`.integration/validation/sv-20261121/full-14f3e5a44`); the previous fold `0a6b92a55` was **16,671 passed / 0 failed**, typecheck / build 0.
  Workers: eqk1 (main), hie5 (side), chg3 (integration). Briefs + ledger `.integration/briefs/` (`supervisor-notes.txt`). **No DEFERRED items.** No push.
- **Run start:** luck day 6: 4,036 seeds, 0 hits (R040 R063 R110). ROM replay on `5fbac1476` (the Mac merge): pool **44 / 44** (1,289 states), stages **110 / 110** (`docs/replay-ledger.md`).
- **Sound (S11, T2 25 ON + 24 OFF seeds, drv1 cadence, `tools/audio/rescoreAll.sh` + `soundScoreboard.py`):** 0 missing / 0 extra throughout. Run start (t2k on `5fbac1476`): ON 25,747 / 2,366 exact,
  OFF 3,164 / 600. After b4l / b4l2 / stc1 / stc2 / hcr3 / bdt1 / gsp3 / fch1 (t2k2 on the fold): **ON 19,949 / 2,731 (-22.5 %), OFF 2,640 / 700 (-16.6 %)**; chg2 / wtl1 land on top (chg2 alone: ON -4.3 %, OFF -5.8 %).
  Landed (sections of `docs/aud251-s11-scoreboard-refresh.md`): b4l (c-lead: 11 B4 bodies present the kernel lead + per-id window; Ghost Curse ROM-checked by b4l2), stc1 / stc2 (OFF stat SE; hp -> stat = bar + 8
  both scenes; OFF confusion self-hit), hcr3 (stat-next hp tail, recoil rows, faint SE clip), bdt1 (Metal Claw window 154, Dig, Rest), gsp3 (asleep turn, poison / burn tick, infatuation), fch1 (AI replacement
  choice 0..4 frames, D4 faithful timing), chg2 (two-turn moves' charge lead and second-turn print; Aerial Ace's impossible stat change holds B_WAIT_TIME_SHORT), wtl1 (win tail before "Player defeated":
  24 draw-nothing rows, ROM-exact both scenes; rain print after the last action). census eventsDigest identical on every fold (0..199, hcr3 0..999).
- **Gameplay coverage:** rrh6 + rrh7: 14 more rare rules staged by hand and ROM-matched (R039 x2 R049 R055 R056 R059 R061 R062 R068 R081 R086 R090 R095 R104 R106): **85 -> 99 / 110**.
- **Website:** play changes (older recorded games replay on their own build only): "Player defeated" takes its first A 24 frames later; the weather box after a move opens 1-10 frames later. No API change.
- **Decision (reversible):** hcr3 moved `aud252LossBallOpen`'s item rows after a faint +4 -> -8 / -6 while faint / select rows went exact and T2 ON fell 2.5 %: accepted, pinned as a named #219 residual.
- **Lapses:** rrh6 (side) ran its git commands in the main tree (8 commits on master; one `commit -a` swept b4l's WIP `moveAnimSounds.ts` into a stage-file commit; content correct, kept; PAPERCUTS).
  Disk hit 99 % at 20:10 (six census arms x 3.6 GB): pruned 28 census `tree/` dirs (`.integration/evidence/TREES-PRUNED-20261121b.txt`).
- **eqk1 (worker, main; section "eqk1" of `docs/aud251-s11-scoreboard-refresh.md`):** hit-all (Earthquake) tail transition anchored on the EMPTYSTRING3 box (next mover 8 frames early -> exact both scenes, eq-p ON 56 -> 0 / OFF 16 -> 0), Scene ON no-effect Pausex20 rows held before "It doesn't affect" (s1914 seg21 cause, eq-imm ON 570 -> 20), Magnitude OFF double-counted wait rows removed (mag-p 292 -> 8). T2 vs `fad9fdfc6`: **ON 19,862 / 2,737 -> 17,764 / 2,780, OFF 2,640 / 700 -> 2,483 / 707**, 0 missing / 0 extra; census eventsDigest identical 200/200 both scenes, T1 unchanged; gate / importers+aud2/fsc/live/soak / build green, no re-pins. Struggle: no Struggle-specific error (forced player Struggle within +-1; the T2 s7295 -3 was the no-effect hit-all transition). **Named residual:** Magnitude Scene ON 53 -> 81 / 49 -> 89 (the now-correct transition exposes mv222's body +9 tail), plus Explosion / Selfdestruct pre-hit offsets, eq-f hp-drain, Splash ON SE 167 missing.
- **Cleanup:** cln12 (`tools/integration/labCompare.sh`: one lab compare tool, ROM probe + engine + aligned SE table; `tools/battle-lab/README.md` "Lab compare"). Branch / worktree prune as steps fold.
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
