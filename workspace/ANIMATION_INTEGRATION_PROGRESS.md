# Animation integration progress

## 2026-10-07 (day) — S10A finish run: D4 faithful timing implemented

- Folded Opus worker `6e4142713` (fast-forward; src tree `57de0763`): D4 accounting + policy.
  `src/engine/liveMoveTimingPolicy.ts` (`live-move-timing.v1.dominant-measured-phase.tie-no-optional-event`;
  fixed global table, no gameplay/RNG/capture inputs, no session-export field because nothing is per battle);
  live status `faithfulTimingAdapters` / `faithfulTimingCount` / `faithfulTimingClaim`; census and inventory
  tests assert exact + faithful random + faithful timing + remaining = 276, disjoint. FAITHFUL-TIMING
  Mach Punch (183; first body; optional lag at age 91 in 5 of 8 measured scenarios -> 110 rows; tie-break
  probes `fixtures/d4a/lag-frames-tiebreak.json`). Nightmare declined (needs a per-age palette / order host
  model and a Hypnosis / sleep-status lend). Worker gates 1,550 files / 12,681 tests, build, differential 389
  byte-identical. Supervisor: `d4aTimingCheck.ts` on all 8 fixtures, two fresh runs each — 5 policy-phase
  windows 0 px, 3 other-phase windows residual only on ages 92..107 (max 18,252 px/row), digests r1 == r2;
  typecheck, smoke 448, 7 targeted files 144/144 on master. Logs `.integration/validation/d4a-20261007/`.
  Counts: 246 scoped-exact + 12 faithful-random + 1 faithful-timing, 17 remaining.
- Folded Opus worker `37c7751ef` as `f2554c70e` (src tree `5ae017dd`): FAITHFUL-TIMING Megahorn (224; prep24 model
  + assembler, `liveMegahornInputs.ts`; late restorebg fade 9 of 10 -> 177 rows, monbg BGnCNT row 8 7 of 10 after a
  4-window tie-break; activation registers = the S0 first-body block, exact after a Tackle because the renderer reads
  only registers the body writes), Revenge (279; prep26 model, `liveRevengeInputs.ts`; BGnCNT row 5, 5 of 6 — pixels
  identical in both phases, kept in the timing bucket conservatively), Meteor Mash (309; explicit restore lag
  `restoreLagRows`, policy L = 1 (5 of 7) -> 215 rows; D3 words from the presentation host, counted once with
  d3: true; renderer generalised from METANG/ONIX to live battler art; declines shiny / displayed status). Routes
  5/35 RHYDON, 75/14 QWILFISH, 15/21 METAGROSS (two seeds) with ON/OFF parity. Worker gates 1,550 files / 12,696
  tests, build 865, differential 389. Supervisor: `d4aTimingCheck.ts` on all 21 windows x2 fresh — 0 violations
  (policy-phase windows 0 px; Megahorn early-fade accepted O only ages 158..173, Meteor Mash no-lag windows only
  196..211); union typecheck, smoke 448, 19 targeted files 779/779, own differential vs `ae9f3c623` 389/389.
  Counts: 246 + 12 + 4 faithful-timing, 14 remaining.
- prep37 (side, `71de9b745`, new files only): Substitute (164) scoped — body 87 rows 0 px with production-derived inputs
  (accepted pair, unchanged renderer; other species need the liveField art patch, 0 px PERSIAN<->SLOWBRO); the doll
  shown on every non-animation frame is source-exact (1993 / 4399 / 2207 Scene OFF / 6898 elevated doll pixels);
  SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE 42/40 rows, SUBSTITUTE_FADE 103/101; FINDING: every live adapter draws a
  subbed defender from species art (wrong while the doll is shown) — production has no doll state; plan = a
  presentation-only "doll shown" field flag + shared declines + the body adapter. Supervisor: `prep37Run.sh` into
  fresh dirs — 9/9 receipts byte-identical.
- Folded Opus worker `a91177f80` as `138f79ad4` (src tree `51b5f3b6`): audit-10 fixes (Extrasensory clone carries the
  attacker idle rest: RATTATA 8,009 -> 0 px; Spit Up gate narrowed to targets: ONIX / RATTATA attackers 0 px; checker:
  a window missing its phase label now FAILS — 146 windows rerun, 0 violations). EXACT Extreme Speed (245; age offset
  43, attacker pic y-offset from the art view, hit-splat anchor = target sprite centre; 5 windows incl. elevated
  GOLBAT; route 182/21 ARCANINE) and Memento (262; first body only; `liveMementoReducerConfig` from the field;
  FIRST_BODY_SCANLINE; the shared #142 hook now skips the row-0 shadow of an opponent at HP 0, as the ROM does; route
  259/28 WEEZING faints -> forced replacement -> next prompt). Staged digests identical. Worker gates 1,558 files /
  12,782 tests, build, differential 389; timing regression 156 windows 0 violations. Supervisor: 10 new windows + the
  two audit-10 fixed rows x2 fresh 0 px; union typecheck, smoke, 9 targeted files 178/178, own differential vs
  `2b31a6151` 389/389. Counts: 248 + 12 + 12, 4 remaining.
- prep36 (side, `dbaaab075`, new files only): Eruption (284) READY-WITH-CHANGE as scoped exact — source-derived profile
  (launch / falling rock / shake, sort keys, palettes) exact on every row of 10 windows; pixels 1,946/1,946 accepted +
  prep29 rows 0 px, 4,850/4,874 overall (row 0 shadow x2; ONIX idle-rest attacker -> decline); no Random2, no CPU-phase
  field. Supervisor: `prep36Run.sh` into fresh dirs — 8/8 receipts byte-identical.
- Folded Opus worker `7074ed95d` as `dc0283345` (src tree `797960f7`): checker fix (other-phase windows without
  documented rows must be 0 px; all 55 timing fixtures rerun, 0 violations). FAITHFUL-TIMING + D3 Ice Ball counter 0
  (301; `liveIceBallInputs.ts`; policy no lag, 15 of 18; counters 1..4 decline — order-lend blocker; the hit-chain
  attackanimation request now also carries the presentation-only rollout counter for 301, as for Rollout; routes
  seed 1 DELIBIRD, two seeds, ON/OFF parity). FAITHFUL-TIMING + D3 Dive setup turn (291; new kind oam-transfer-row:
  player row 68 shows the age-66 state in 4 of 6, age-67 in 2 -> documented 284 px on row 68; anchor split behind
  optional fields, staged Dive unchanged; attack body declines; route seed 111). ISSUES #151 closed: Sheer Cold (329)
  and Hyper Voice (304) read per-side / band phases from the policy (dominant == old defaults; accepted fixtures 0 px)
  and are RECLASSIFIED from scoped exact to faithful timing (28 + 32 windows incl. audit-7 rows, other phase only on
  documented rows). Worker gates 1,556 files / 12,762 tests, build, differential 624 (3 traces). Supervisor: 19
  windows (4 Ice Ball, 9 Dive, 3 Sheer Cold, 3 Hyper Voice) x2 fresh one process each — 0 violations; union typecheck,
  smoke, 12 targeted files 217/217, own differential vs `ab85c19c8` 624/624 (3 traces). Counts: 246 scoped-exact + 12 faithful-random + 12 faithful-timing, 6 remaining.
- Species audit 10 (side, `ba13d9d12`, new files only): Shock Wave, Superpower, Psywave, Extrasensory, Nightmare, Spit
  Up — 208 rows x2 fresh: 14 TIMING-PHASE (documented rows only), 30 declines confirmed by gate lifts, 1 SPECIES-DEFECT
  (Extrasensory clone ignores the attacker's idle rest; patch proof RATTATA 8,009 -> 0 px, reproduced by the
  supervisor), Spit Up attacker gate too strict, 6 UNRESOLVED Extrasensory rows (likely scanline split). ISSUES #152.
- prep35 (side, `a41cfc5bd`, new files only): Skill Swap (285) READY as faithful timing — full hardware OAM rows 1..end,
  32 matrices, 64-slot order, palette program (psychic BG rotation, two white blends) exact in 6 windows; pixels
  1172/1174 rows 0 px at the measured phase (row 0 enemy shadow of two elevated windows); lag at row 176 (4 of 6) +
  a display-neutral restore row. Flatter (260) READY as faithful random — spotlight, VerticalDip dips, 38 confetti in
  sort order, burst latch; hardware OAM exact rows 1..218 in 4/4 windows; 876/876 rows 0 px. Supervisor:
  `prep35Run.sh` into fresh dirs — probes r1 == r2, 11/11 receipts byte-identical.
- Folded Opus worker `fb101d18d` as `0b4f5bf83` (src tree `0fa8e76b`): FAITHFUL-TIMING Nightmare (171; prep32 model
  port; lag at 149 policy; second display-neutral parameter palette-transfer-row 4:4 tie -> 148 by the tie rule; GOLBAT
  row-0 shadow via the live #142 hook; routes 30/28 HYPNO (Hypnosis first), 166/14 HAUNTER). EXACT Shock Wave (351;
  prep33 builder; derived timing behind an opt-in `derivedTiming` flag used only by the live builder — staged digests
  and `shockWaveActualCore` 530/530 unchanged; routes 7/7 CASTFORM, 27/0, 122/7). Worker gates 1,553 files / 12,737
  tests, build, differential 389. Supervisor: 14 windows x2 fresh via `d4aTimingCheck.ts`, 0 violations (Nightmare
  no-lag windows only ages 150..165; Shock Wave 6/6 0 px); union typecheck, smoke, 19 targeted files 810/810, own
  differential vs `3c599fa9e` 389/389. Checker gap found by the worker (other-phase window without documented rows
  was unchecked) — fix queued in the next step; supervisor reruns all printed per-window px, unaffected.
  Counts: 248 + 12 + 8 faithful-timing, 8 remaining.
- prep34 (side, `f69afd93e`, new files only): Extreme Speed (245) X-AGE closed — reducer age 43 at activation in all 4
  windows (ARCANINE->DUGTRIO, new SMEARGLE->GOLEM, both sides), body 321 rows, 8,916/8,916 visible field-rows,
  accepted pair 321/321 rows 0 px; the only missing input is the attacker pic y-offset hard-coded for ARCANINE.
  Memento (262) D-SCAN closed — first-body activation scanline == production FIRST_BODY_SCANLINE (up to a pixel-
  neutral buffer swap); 8,531/8,532 field-rows; accepted pair 0 px with production-derived inputs; later bodies differ
  -> first-body gate. Supervisor: `prep34Run.sh` into fresh dirs — probes r1 == r2 (20 scenarios), 21/21 receipts
  byte-identical.
- Integration step D4d (Ice Ball + Dive) STOPPED at a measured blocker, evidence merged (`57ca6674e`, no src change):
  Ice Ball counters 1..4 and the Dive attack body start from the previous body's end-of-body sprite order, which
  depends on that body's Random2 words (shard / droplet y-sort before death), so no constant lend exists and the order
  tracker lives on the logical side without the words. Words-free lend: Ice Ball counter-0 bodies 0 px, later bodies
  482 px (rows 38-42); Dive attack 116 / 61 px (rows 17-22). Design checked: a deferred lend resolved in the render
  seam (replay the earlier body from its true start order, then the tracker plans) gives the ROM start order on 12/12
  Ice Ball transitions (`docs/s10a-random2-order-lend-blocker.md`). Supervisor: fresh `prep26Probes.sh iceball`, both
  blocker receipts byte-identical. Decision: ship Ice Ball counter 0 and the Dive setup turn first; the deferred lend
  is remaining work (est. 60-90 min infrastructure + 45-60 min per move).
- prep33 (side, `6f9b9f7a8`, new files only): Shock Wave (351) READY-WITH-CHANGE as scoped exact — the reducer's
  side-keyed timing table is wrong for 3 of 4 alternates; derived rule (attacker pic-offset y, target battle y, lightning
  count N: ShakeMon = lightning + 2N + 30, clear + 67, end + 4) matches 6/6 windows; every renderer-read field exact on
  1591 rows; pixels 1590/1592 (row 0 enemy shadow of two elevated opponents). No CPU-phase field. Skill Swap (285)
  partial: tasks / 24 orbs / blend registers exact on 1173 rows; body 194/195 = lag at row 176 (T, 4 of 6); no
  outcome input needed (animation only on the success path); still needs the OAM order, orb matrices and palette
  program. Supervisor: `prep33Run.sh` into fresh dirs — probes r1 == r2, 9/9 receipts byte-identical.
- Folded Opus worker `9398ab3a8` as `a7402719b` (src tree `58b592bc`): audit-9 fixes (Mach Punch attacker idle rest
  in `machPunch.ts`; Mach Punch declines idle-rest targets; Revenge gate narrowed to targets; Meteor Mash FLYGON =
  fixture Random2 offset, no production change). EXACT Spit Up (255; `liveSpitUpInputs.ts`, counters 1-3 =
  request.turn, 12 windows 1300/1300 rows 0 px; route 33/7 SWALOT). FAITHFUL-TIMING Superpower (276;
  `liveSuperpowerInputs.ts`; per-side monbg write row player 10 / opponent 11; all 6 windows 0 px in both phases;
  gate = known order; Superpower branch now paints the armed #142 shadow after its scrolled BG3; route 179/42
  NIDOQUEEN). Eruption not attempted (needs dense falling-rock / shake / palette profiles; prep29 R2). Worker gates
  1,552 files / 12,725 tests, build, differential 389. Supervisor: Spit Up 4 windows (counters 1/3/2/3, accepted +
  alternates) and Superpower 6 windows x2 fresh 0 px; the audit-9 ONIX / RATTATA Mach Punch and ONIX Revenge rows 0 px
  on production, accepted Mach Punch / Revenge unchanged; union typecheck, smoke, 18 targeted files 1712/1712, own
  differential vs `42ee4514f` 389/389. Counts: 247 + 12 + 7 faithful-timing, 10 remaining.
- prep32 (side, `7ea9671a7`, new files only): Nightmare (171) READY as faithful timing — per-age caller inputs
  (palettes, registers, battler sprites, SortSprites order, clone / tasks) exact on 22,921 / 22,925 field-rows in 8
  windows (misses = state-only restore row T); pixels 1348/1349 rows 0 px at the measured phase (GENGAR->GOLBAT row 0
  = opponent shadow, renderer); order after Hypnosis + SLP: occupied part == known entry. Flatter (260): 114 words
  derived from the activation Random2 value, registers / palettes / 38 confetti exact in 4 windows, birth split T is
  display-neutral (0 px all alternatives); NEEDS the hardware OAM / matrix provider. Supervisor: `prep32Run.sh` into
  fresh dirs — probes r1 == r2, 20/20 receipts byte-identical.
- Folded Opus worker `49b31367b` as `af53ffb4a` (src tree `efec2d66`): FAITHFUL-TIMING Psywave (149; prep30 model,
  `livePsywaveInputs.ts`; late lag at 185, 4 of 6 -> 205 rows; elevated-opponent row-0 shadow via the live #142 row
  0 hook) and Extrasensory (326; `liveExtrasensoryInputs.ts`; reducer `targetYElevation` input, defaults unchanged;
  first animation unit of the battle only — activation scanline buffers are intro residue; no lag at 142 (4 of 6)
  -> 161 rows; scanline split S = 0 with per-window documented residuals: GOLEM P 1,433 px / 22 rows, CROBAT P
  lag + split 85 rows). Routes 84/7 CHIMECHO, 9/35 EXPLOUD (42/7 STANTLER declines: Intimidate runs first). Worker
  gates 1,550 files / 12,708 tests, build 867, differential 389. Supervisor: all 12 windows x2 fresh, 0 violations;
  union typecheck, smoke, 16 targeted files 947/947, own differential vs `d8b2aebdb` 389/389.
  Counts: 246 + 12 + 6 faithful-timing, 12 remaining.
- Species audit 9 (side, `5383b9b10`, new files only): Megahorn / Revenge / Mach Punch / Meteor Mash, 154 swap rows
  x2 fresh: 99 rows 0 px, 30 TIMING-PHASE (residual only on the documented rows; with swapped species the fade rows
  reach 19,175 px/row, above the documented per-fixture maximum — the check gates on ages, not px), no new lag class.
  Defect: Mach Punch opponent attacker with an idle rest (ISSUES #152; patch proof 86,089 -> 0 px). Revenge's
  idle-rest gate too broad for attackers; Meteor Mash player-side FLYGON target unresolved. Supervisor reran the patch
  proof (3 rows 0 px, identical) and the unpatched ONIX row (86,089 px x2).
- prep31 (side, `201cdf91c`, new files only): source-derived Superpower (276) and Spit Up (255, Stockpile counters
  1-3 = request.turn) providers. Superpower: every field exact in 6 windows (accepted P/O, MACHAMP->GOLEM,
  MACHAMP->WEEZING elevated, WEEZING->SNORLAX), OAM order derived by SortSprites; pixels 1487/1488 rows — the one
  row is the T bit monbg BGnCNT row (player {10: 2, 11: 1}, opponent {11: 3}). Spit Up: 12/12 windows field- and
  pixel-exact (1300 rows, 0 px); the 8-orb burst overrun at row 59 (+67 for counter 3) is constant (M), not T.
  Supervisor: `prep31Run.sh` into fresh dirs — probes r1 == r2, 17/17 receipts byte-identical.
- prep30 (side, `cc3786f20`, new files only, merged `3f0023e1e`): source-derived Extrasensory (326) and Psywave
  (149) providers — every field the renderer reads exact on every row in 6 windows each (accepted P/O, ALAKAZAM->GOLEM,
  new ESPEON->CROBAT elevated). Pixels at the measured phase: Psywave 0 px in 5/6 (CROBAT P row 0: 200 px renderer
  age-0 shadow, also with corpus input); Extrasensory 0 px in 4/6 — opponent-target alternates 1,433 / 11,551 px from
  a mid-frame scanline-buffer write (D4 class; no constant split line). Extrasensory reducer must take the target
  elevation (CROBAT window 2/66, not 8/48); activation scanline buffers are battle-intro history. Phases: Extrasensory
  late lag absent 4/6, Psywave present 4/6. Supervisor: `prep30Run.sh` into fresh dirs — probes r1 == r2, 16/16
  receipts byte-identical.

## 2026-10-07 — D4 approved; finish remaining S10A integration

- The user authorized unblocking and finishing the campaign. D4 option (b) is
  approved: deterministic dominant measured CPU-load timing, separately counted
  as "faithful timing". `docs/faithful-timing.md` records the scope, banked
  evidence and disjoint D3/D4 accounting; ANIMATION_VERIFICATION.md defines the
  dense phase-aware proof and ordinary-play requirements.
- No further approval is needed for evidenced cases of the same lag-frame /
  VBlank-phase class. Preserve gameplay/RNG and Factory acceptance; unknown
  host state and unrelated pixel defects remain real implementation work.
- Production remains src tree `1efb1872`: 246 scoped-exact + 12 faithful-random,
  18 accepted bodies remaining. This docs-only checkpoint adds no adapter credit
  and reuses `final-supervisor-gates-20261007.json` on the unchanged code.
- Next run: implement timing claim accounting and the banked consumers; finish
  remaining adapters/providers and ordinary continuations, batch proved shared
  mechanisms, then deliver an honest final census and verified playable preview.
  Reuse valid receipts; avoid further scouting of settled CPU-phase limitations.

## 2026-10-06 (night, wind-down 2026-10-07) — 226 -> 246 scoped-exact, 10 -> 12 faithful-random; D4 OPEN

- prep22 (side, `c31dfd3c1`, new files only, merged `e7b7a1ac3`): Fire Punch is a 101-row body identical across
  burn / no-burn / faint outcomes (flames = separate Status_Burn body 152-155 frames later; status animations are
  not drawn in production today); body-only through the accepted renderer 101/101 rows 0 px both orientations with a
  neutral profile, reducer age 27 at activation. Random2 re-probe: Signal Beam, Sheer Cold, Spikes, Octazooka, Skill
  Swap, Shock Wave draw none (stale C); Lovely Kiss draws 4 words at age +120 (plan replay == accepted words). Spikes /
  Octazooka / Lovely Kiss / Signal Beam / Sheer Cold reducers equal the ROM per-age sprite state from
  production-derivable inputs; Skill Swap / Shock Wave need a graphics-host provider. Supervisor: `prep22Run.sh` into
  fresh dirs — Fire Punch 101/101 0 px, plans / palette / lowest-free / 7 per-move receipts byte-identical.
- Folded Opus worker `425bff8fb` (src tree `89c9294d`) as `8502a5d71`: production hardware-OAM provider
  `src/engine/liveMoveOamAssembler.ts` (+ `liveOamMoves.ts`); G1 solved (lent activation order carried by a full
  64-slot SortSprites, ResetSprite dummy keys for free slots, stale oam.y for invisible sprites; carried order ==
  sSpriteOrder on every corpus row). EXACT first bodies: Will-O-Wisp (261; real InitAnimLinearTranslationWithSpeed
  orb math, staged outputs unchanged), Pursuit normal body (228; switch interception declines, duration null), Fury
  Cutter counter-1 body (210; a first body implies counter 1; counters 2-5 decline with duration 43). Dense 18
  windows x 2 fresh 0 px (accepted + BANETTE/UMBREON/SCYTHER->GOLEM + NINETALES/SNEASEL/SCYTHER -> GOLBAT/SNORLAX);
  routes 82/7, 52/0, 38/14, 58/0, 60/0 active every age, ON/OFF parity. Worker gates 1,537 files / 12,486 tests,
  build 859. Supervisor: dense rerun 6 windows 0 px r1 == r2; differential fight-submenu 235/235 +
  battle1-postwin-next-prompt 216/216; presentation-rng-playable-live-bodies-seeded-on 45/173 — the shift comes only
  from a declined second-body Fury Cutter now taking its 43 source rows (case 210 -> null experiment: 173/173);
  accepted (same pattern as later Overheat). Route 38/14 reproduced; union typecheck, smoke 448, 7 files 124/124.
  Receipt `oam1-live-adapter-receipt.json`; supervisor logs `.integration/validation/oam1-20261006/`.
- prep23 (side, `46818fdda`, new files only, merged `95664e651`): source-derived Curse models
  (`tools/integration/prep23Curse*.ts`) replace every corpus input of the existing renderer. Stats (non-Ghost)
  branch exact on every field in 5 windows (accepted P/O, MILTANK->GOLEM P/O, ONIX->PIDGEOT), renderer 879/880 rows
  (ONIX row 142: the falling-lines mask gate `data[11] < 4` ends 3 rows early). Ghost branch exact except R1 (BG2
  scroll one row early, 2/4 windows) and P1 (row-26 palette-transfer phase: 15 / 135 px on alternates). Variant =
  Ghost iff the attacker is Ghost type. Supervisor: `prep23Run.sh` with fresh probes (r1 == r2) — all four receipts
  byte-identical.
- Species audit 5 (side, `89cc60935`, merged `7eac909ee`): oam1 adapters vs STEELIX / TYRANITAR / PICHU / WAILORD /
  FLYGON / SHEDINJA swaps (both sides, attacker and target): no species defects. Player-side TYRANITAR attacker
  Pursuit 86/102 = LAG FRAME (the ROM lacks the usual age-82 lag; body 102 vs 103; counter evidence) — the live
  Pursuit timeline assumes that lag. Declines confirmed: RATTATA/ONIX target (correct), RATTATA/ONIX opponent
  attacker (over-conservative: 6/6 exact with the gate lifted — coverage opportunity), shiny (correct; the verifier
  ignores target personality without a harness patch). Supervisor reran 8 rows twice fresh: 7 exact, the TYRANITAR
  lag row reproduces (284,768 px).
- Folded Sonnet worker `c173bb959` (src unchanged since `6dc962856`) as the r2-gates merge: EXACT Fire Punch body
  (7; 101 rows, neutral resolution profile at reducer age 27, `liveField` renderer branch with live species art and
  the target hit shake; no burn flames — Status_Burn is a separate body production does not draw yet) -> 230;
  Overheat (315) widened to any known order lend, both sides; Psych Up (244) opponent attacker (duration 179,
  opponent-orientation inputs). 50 fixtures 0 px twice fresh on the unpatched renderer (lb21 17, prep16 8,
  later-bodies-bg 11, Fire Punch 12 = staged + burn / no-burn / faint per side + 4 alternates; Psych Up opponent
  HYPNO->GOLBAT, CLAYDOL->GOLEM). Routes: later Overheat 43/35, 162/14, 175/35 (143/28 declines: unplanned
  predecessor); opponent Psych Up 336/7, 713/7 (no later-body route with a known lend found); Fire Punch 70, 180, 65,
  389; burn route 780 reaches its prompt. Open: MR_MIME->MAGNETON opponent Psych Up constant 537 px/row from age 0
  (not body-dependent, unresolved, not committed). Worker gates 1,539 files / 12,508 tests, build. Supervisor:
  dense rerun 6 fixtures 0 px r1 == r2; differential battle1-postwin-next-prompt 216/216 +
  presentation-rng-playable-live-bodies-seeded-on 173/173; union typecheck, smoke 448, 10 files 160/160.
  Receipt `r2-gates-firepunch-receipt.json`.
- prep24 (side, `104138545`, new files only): source-derived Megahorn and Return (strongest branch, the only one
  the Factory reaches) input models. Return: OAM 35,968/35,968 entries, matrices, registers, battleBg, palettes,
  tasks, target x2 exact in 6 windows (accepted P/O, SNORLAX->GOLEM, SNORLAX->PIDGEOT elevated); pixels 1691/1692
  (row 0 of the elevated-target player window: the Return renderer draws the age-0 enemy shadow only for an opponent
  attacker). Megahorn: every non-OAM field exact in 6 windows (incl. HERACROSS->ONIX) GIVEN two VBlank frame-phase
  bits — monbg BGnCNT write row 7/8 and the restorebg fade ending early/late — which vary across windows
  ((8,late) accP, (8,early) accO, (7,late) altP/altO/onP, (8,late) onO) and are not derivable (flipping costs 16
  rows x 17.5k px). Supervisor: `prep24Run.sh` with fresh probes — all 12 receipts byte-identical.
- Folded Opus worker `949b3c6fc` (src unchanged since `1b3ded85f`): EXACT Curse (174) non-Ghost body — source model
  `src/animation/curseModel.ts` + provider `liveCurseStatsInputs` (`liveOamMoves.ts`); gate stats variant
  (request.turn & 1), known order lend, non-shiny, zero idle rests -> 231. Falling-lines mask gate fixed (keyed on
  the clearing step's BG1VOFS pre-wrap scroll; ONIX row 142 exact; 1,098 staged Curse framebuffers digest
  unchanged). Ghost branch DECLINES: the row-26 palette transfer lands at a CPU-load-dependent vcount (17+HBlank vs
  9 at the same script row; `curse-live/ghost-p1-vcount.json`). 19 of 20 Factory Curse sets are non-Ghost
  (DUSCLOPS set 666). Dense 7 windows x 2 fresh 0 px (accepted SNORLAX P/O after Splash, MILTANK->GOLEM P/O,
  ONIX->PIDGEOT, SKARMORY->GOLBAT, SKARMORY->PICHU); routes 28/28 MUK, 47/28 FLAREON active every age, 143/42
  DUSCLOPS Ghost declines; ON/OFF parity. Worker gates 1,540 files / 12,515 tests, build 860. Supervisor: dense
  rerun 4 windows 0 px r1 == r2; staged digest recomputed on the base (== branch); differential 389/389; union
  typecheck, smoke, 7 files 126/126. OPEN: the gate admits any known lend but later-body evidence covers only a
  Splash predecessor — >= 3 predecessors queued next (narrow to first body if any fails).
- prep25 (side, `241b12cf4`, new files only): 14-move triage. No Random2 in 11 (stale C); Dive (setup 20 words,
  attack 56) READY-WITH-CHANGE (dive.ts anchor split measured 8/8); Ice Ball (2 words per shard) and Flatter (114
  words) draw Random2. READY-WITH-CHANGE builders: Snore, Sky Attack, Hyper Voice, Sand Tomb, Smog (constant
  lengths), Mach Punch, Nightmare (+-1 row). Hardware-OAM batch: Extrasensory, Ice Ball, Flatter, Psywave, Revenge,
  Superpower. Mach Punch / Extrasensory / Nightmare / Psywave body length varies +-1 row across scenarios from one
  optional late lag frame (`fixtures/prep25/lag-frames.json`). Supervisor: `prep25Run.sh` (112 probe pairs, 0
  differing) — 23 receipts byte-identical.
- lb26 (side, `99e92585b`, new files only): later bodies after Tackle / Splash / Psychic / Growl+unit / Swords
  Dance+unit / Surf, both sides. Curse 12/12 0 px on UNPATCHED production (the any-known-lend gate stands); Will-O-Wisp
  12/12 0 px with firstBody bypassed (widen next); Pursuit 8/12 — four later bodies one frame short from age 84 (the
  fade-back starts one frame early: lag-schedule class, not determined by side or predecessor) -> keep firstBody.
  Supervisor: probes + fixtures regenerated byte-identical, dense p1/p2 rerun — both receipts byte-identical
  (`lb26Run.sh` stops early under set -e; remaining steps run by hand).
- Folded Sonnet worker `0dd5824fe` (production unchanged since `da497d02d`): shared profile builder
  `src/engine/liveProfileMoves.ts` (slots lowest-free, subpriority, attr2, palette snapshots from production
  sources) — FAITHFUL-RANDOM Lovely Kiss (142; plan row 4 words at age +120) -> 11; EXACT Spikes (191), Octazooka
  (190) (known lend) and Signal Beam (324; first body) -> 234; live opponent idle rest in the three profile
  renderers (staged outputs unchanged). 32 dense fixtures x 2 fresh 0 px (accepted, prep22 alternates, GOLBAT and
  SNORLAX targets, both orientations); Lovely Kiss 4 ROM-probed + 4 range-covering pinned values; routes 11/21,
  11/35 (surrogate), 17/21, 75/7, 116/7, 239/7, 8/14, 10/0 active every age, ON/OFF parity. Worker gates 1,541 files
  / 12,574 tests, build; shadow scan 513 / 0. Supervisor: dense rerun 6 fixtures 0 px r1 == r2; differential
  389/389; union typecheck, smoke, 11 files 223/223. Receipt `r3-profile-live-receipt.json`.
- Preview refreshed: `a1d8036bf` served at :5191 (234 + 11), 4 samples hash-equal, mode control + session export
  passed, no browser errors (`playable-preview-a1d8036bf-receipt.json`).
- prep26 (side, `699217c53`, new files only): source-derived Ice Ball (all 5 counter bodies; 18 windows, 1,535 rows;
  OAM 194,176/194,176) and Revenge (4 windows, 580 rows) models — every field and every pixel row exact GIVEN
  frame-phase inputs that are not derivable: Ice Ball lag rows (accepted player body 4 row 38, accepted bodies 5 row
  112; none in the alternates), Revenge `bg*cnt` write row 4 (accepted opponent) vs 5. Superpower not reached.
  Supervisor: `prep26Run.sh` with fresh probes — 12 receipts byte-identical.
- Folded Sonnet worker `6c3bb10d5` (tested `332161c18`, src tree `7584e7a5`): EXACT Return (216, strongest branch;
  hardware-OAM provider port of prep24; known lend + first body, non-shiny) -> 235; RETURN renderer draws the age-0
  enemy shadow for an elevated opponent target (prep24 windows 1692/1692; staged unchanged); Will-O-Wisp widened to
  later bodies (lb26 12/12); attacker-side idle-rest gate lifted for Will-O-Wisp (first body) / Pursuit / Fury
  Cutter (RATTATA / ONIX attackers 12/12). 50 dense fixtures x 2 fresh 0 px; routes 24/14 PIDGEOT, 51/28 EXEGGUTOR
  (29/42 GYARADOS inactive, undiagnosed). Worker gates 1,542 files / 12,579 tests, build; shadow scan 515 / 0.
  Supervisor: dense rerun 5 fixtures + 3 gate-lift rows 0 px r1 == r2; differential 389/389; union typecheck,
  smoke, 9 files 190/190. Receipt `return-live-adapter-receipt.json`.
- Species audit 6 (side, `fbc1036c1`, new files only): 140 swapped rows x 2 fresh over Fire Punch, Curse, Psych Up
  opponent, Signal Beam, Lovely Kiss, Spikes, Octazooka (STEELIX / TYRANITAR / WAILORD / PICHU / FLYGON / GOLBAT /
  SHEDINJA / RATTATA): 122 exact. Defects -> ISSUES #150: Signal Beam keeps the RATTATA idle x2 under its shake
  tasks (41,134 / 54,510 px -> 0 with a patch); Fire Punch lacks the shiny decline; the verifier names battlers by
  species constant (MR_MIME -> "MRMIME": the r2 537 px/row is this artifact, 0 px with a harness patch). Curse's
  target-side idle decline is over-conservative. Supervisor reran 4 rows + both patch proofs.
- Folded Sonnet worker `768569da9` (src last changed `8fa34f420`, tree `f16cabf6`): `src/engine/liveQ2Moves.ts`
  builders — EXACT Hyper Voice (304), Smog (123; exact after a Tackle too), Sand Tomb (328) on a known lend and the
  Sky Attack charge body (143; first body; the strike declines: no order plan after the charge) -> 239. Snore not
  wired (all measured bodies follow Sleep Powder, which has no order plan). 29 dense fixtures x 2 fresh 0 px; routes
  75/21, 141/21, 29/0, 70/0, 345/21, 543/21, 244/42, 376/42. Worker gates 1,543 files / 12,606 tests, build; shadow
  scan 523 / 0. Supervisor: dense rerun 5 fixtures 0 px r1 == r2; differential 389/389; union typecheck, smoke,
  8 files 196/196. Receipt `q2-live-adapter-receipt.json`.
- prep27 (side, `a2a84fb46`, new files only): Baton Pass body 53 rows constant, attacker hidden from age 9;
  `batonPassAtAge` exact from production anchors (component 53/53 x 4 pairs; framebuffer 53/53 AIPOM<->ONIX); ROM flow
  opponent: removal E+9, message E+14, ball E+51, species-keyed healthbox tail; player: party screen, removal A+76,
  old healthbox shown A+48..A+75 (production misses those 28 frames; otherwise within +2..+5 frames); production has no
  opponent-attacker flow. Endeavor: source-relative prototype exact 68/68 rows on 4 fresh pairs; W3 (battle-TV)
  predicate written from battle_tv.c and reachable on generated routes (decline until ported). Supervisor:
  `prep27Run.sh` with fresh R1/R2 dirs — probes (RGB incl.) R1 == R2, receipts identical.
- Folded Sonnet worker `e74701d86` (src tree `acf610da`): ISSUES #150 fixed and removed — Signal Beam shake tasks own
  x2 (`shakeOwnsX2`; RATTATA attacker / target rows 41,134 / 54,510 px -> 0), Fire Punch shiny decline, verifier
  display names (MR_MIME 537 px/row -> 0); Curse target-side idle decline lifted (RATTATA / ONIX 176/176); EXACT Sheer
  Cold (329; first body; 191 / 190 rows constant per side; accepted, CLOYSTER->GOLEM, DEWGONG->SNORLAX both
  orientations; route 267/35) -> 240. Open: no #142 shadow row for Sheer Cold (elevated opponents unmeasured). 45
  fixtures 0 px twice fresh; worker gates 1,544 files / 12,618 tests, build. Supervisor: reran 7 #150 / Curse rows +
  2 Sheer Cold fixtures 0 px r1 == r2; differential 389/389; union typecheck, smoke, 10 files 218/218. Receipt
  `fix150-live-receipt.json`.
- prep28 (side, `149b62374`, new files only): 94 (move, side) cells lack production order plans (~16.3% of weighted
  uses; ranked in `fixtures/prep28/ranked-gaps.json`); 14 new EXACT-PLAN rows (Sleep Powder both sides, Thunderbolt
  opponent, 95, 78 opponent, 352, 337, 309, 348) via synthetic dense-rank words for y ties; Sky Attack charge / strike
  plans differ (host must key the strike by request.turn). With the rows: corpus replay known edges 1210 -> 1285 (0
  mismatches), Snore after Sleep Powder known, route scans 140 -> 149 of 317 later bodies; the named declined routes
  stay declined on other causes (Sand-Attack 28:opponent, TURN_TRAP / Flatter, Confusion status). Rows not yet in
  production. Supervisor: `prep28Run.sh` with a fresh OUT — 0 differing probe pairs, replays reproduced, receipts
  unchanged.
- Species audit 7 (side, `896a8ebd4`, new files only): Return 57/57 non-shiny rows exact; residuals filed as ISSUES
  #151 (Sheer Cold elevated-target age-0 shadow; Sheer Cold tail ages 173-189 with TYRANITAR / PICHU / FLYGON /
  GOLBAT; RATTATA / ONIX idle-x2 rows in Sheer Cold / Sand Tomb / Sky Attack; Hyper Voice one row at age 59).
  Supervisor reran 5 rows (4 residuals reproduce). D4 filed in DEFERRED.md (CPU-load timing class).
- Folded Opus worker `fafd380ca`: EXACT Baton Pass body (226; 53 rows; renderer pair gate generalised; attacker hidden
  after the body through its switch-out) and Endeavor (283; 68 rows; source-relative inputs; stale power from the
  register; W3 battle-TV case declined by a conservative presentation-only flag carried across battles) -> 242.
  15 dense windows x 2 fresh 0 px; routes Baton 71/0, 2/7, Endeavor 58/0, 38/7, 52/0, 61/0 with ON/OFF parity.
  Open: opponent Baton Pass removal ~25 frames late, message / ball timing unmodelled (no route reaches it);
  player outgoing healthbox A+48..A+75 not drawn. Worker gates 1,546 files / 12,647 tests, build. Supervisor: dense
  rerun 5 windows 0 px r1 == r2; compare:endeavor-portable 141/141; differential 389/389; union typecheck, smoke,
  9 files 194/194. Receipt `baton-endeavor-live-receipt.json`.
- #151 diagnosis (side, `069dad5a8`, new files only): the Sheer Cold tail (ages 172-189) is a LAG FRAME — the
  residual rows are exactly those whose age-171 lag differs from their orientation's accepted pair (counter
  evidence on 31 rows; shift test 0 px; the field BG is one fade step off); no species property predicts it. The
  Hyper Voice age-59 row is a scanline-phase palette upload (band depth 16 / 15 / 0 by pair; 0 lag frames). Both are
  the CPU-timing class (DEFERRED D4). Supervisor reran both env-override patch proofs (0 px, reverted).
- Folded Opus worker `7754fb14d` (src tree `e7259f42`): ISSUES #151 idle-x2 class fixed — Sheer Cold
  (`config.idleRest`: no task writes x2 and `Task_UpdateMonBg` copies at x + x2), Sand Tomb (attacker rest), Sky Attack
  charge (`AnimTask_ShakeBattlers` makes no write on its first frame and ends at x2 = 0; monbg copy at x + x2) — plus
  the Sheer Cold elevated-opponent age-0 shadow row; #151 trimmed to the D4 timing remainder. 84 dense rows x 2 fresh;
  audit-7 non-shiny rows of the three moves 57/64 exact (the 7 others = the lag tail); accepted / alternate fixtures
  unchanged; shadow scan 529 / 0. Worker gates 1,547 files / 12,657 tests, build. Supervisor: reran 6 fixed rows + 3
  regression fixtures 0 px twice fresh; differential 389/389; union typecheck, smoke, 8 files 153/153. Receipt
  `fix151-live-receipt.json`.
- Species audit 8 (side, `7f93ec44b`, new files only): Baton Pass body, Endeavor, Fire Punch opponent attackers — 141
  rows x 2 fresh, 135 exact, 6 shiny (decline confirmed with the ROM personality); no species defect. Endeavor is
  exact when the stale-power register matches the ROM (40 / 0 in these fixtures; 17k-58k px at other values). The
  verifier cannot pass a target personality, so a target-side shiny decline is untested. Supervisor reran 4 rows.
- Folded Sonnet worker `69474d445` (src tree `34e54570`): 14 prep28 EXACT-PLAN rows in the production order table via
  the generator (bodies 467 -> 485, plans 187 -> 196), Sky Attack strike keyed 10143 by request.turn; EXACT Sky
  Attack strike body (180 rows, WIN0 (0,0) after the charge) and Snore (173; known lend after Sleep Powder + sleep
  status animations; no generated route has that history in seeds 0-599) -> 243. 16 new dense fixtures 0 px twice
  fresh; regression samples across six adapter families 0 px; newly known lends make the r2 Overheat route 143/28/1
  live. The worker ran out of cap before its differential and post-fix full suite. Supervisor: dense rerun 4 fixtures
  0 px r1 == r2; `prep28Replay.ts` 1,285 known / 1,285 exact / 0 mismatched; differential 624/624 byte-identical
  (three traces) vs `2ee877356`; census regenerated `243+11+0+22=276`.
- prep29 (side, `a9cd93c84`, new files only): the six untriaged moves — Bonemerang (70/70 rows x 8 bodies), Outrage
  (118/118 x 5), Rapid Spin (129/129 x 4) READY-WITH-CHANGE; Luster Purge READY-WITH-PRESENTATION-RNG (12 words, ages
  170..195; 331/331 x 4); Eruption length = 2 x wave-1 end + 277 from the attacker Y (no lag frames); Spit Up
  NEEDS-PROVIDER (request.turn = Stockpile counter). None in the D4 class. Supervisor: probes reproduced (64 pairs
  r1 == r2), analysis receipts 18/18 byte-identical.
- Wind-down: supervisor final gates on master `8122e5672` (src tree `34e54570`): typecheck, 1,547 files / 12,658
  tests, build 862 (`final-supervisor-gates-20261007.json`); preview `ba696679b` served at :5191, 4 samples
  hash-equal, mode control + session export passed, no browser errors (`playable-preview-ba696679b-receipt.json`).
  DEFERRED D4 OPEN (CPU-load timing class). Next: ROADMAP S10A "Next (2026-10-07 morning)".
- Folded Sonnet worker `aca3fd801` (src tree `1efb1872`): `liveQ2Moves.ts` builders — EXACT Bonemerang (155; both hits,
  hit 2 behind a first-body hit 1 via a host marker), Rapid Spin (229; S0 scanline carry, mixed anchors), Outrage
  (200; first body) -> 246; FAITHFUL-RANDOM Luster Purge (295; plan rows 170 + 5k x 2; species-generic renderer art)
  -> 12. 20 dense fixtures x 2 fresh 0 px; Bonemerang route 246 both hits active; worker gates 1,548 files / 12,665
  tests, build; census `246+12+0+18=276`. Supervisor: dense rerun 4 alternates 0 px r1 == r2; differential 389/389.
- Final wind-down: supervisor final gates on master `e09090833` (src tree `1efb1872`): typecheck, 1,548 files / 12,665 tests, build 862
  (`final-supervisor-gates-20261007.json`); preview refreshed on this src (`playable-preview-d01f11d1e-receipt.json`, serves `d01f11d1e`). DEFERRED D4 OPEN. Next: ROADMAP S10A
  "Next (2026-10-07 morning)".

## 2026-10-06 (day, wind-down) — D3 implemented: 218 -> 226 exact + 10 faithful-random live adapters

- Folded Opus worker `08c3c4ce3` as `26b3f525a`: D3 option (a) infrastructure, no adapter consumer
  yet. `src/engine/presentationRng.ts` (Random2 = ISO_RANDOMIZE1 then `>>> 16`, u32 exact, O(log n)
  jump-ahead); `src/engine/presentationRngHost.ts` (policy
  `presentation-rng.v1.frame-step.no-lag.battle-stride-2^20`: battle n seed = session seed jumped
  n x 2^20; one step per presented battle frame after the logical tick; `activatePresentationRngBody`
  consumes a body's draws exactly once per key; `presentationRngBodyWords` read-only for render;
  pinned hosts via `createPresentationRngHostAt`); `EngineState.presentationRng` top-level,
  outside battle/RNG/facility state; `SessionTrace.presentationRng {seed, policy}` with legacy
  default 0x808DB3EB; replay tools honour it; live status `faithfulRandomCount` 0 /
  `faithfulRandomAdapters` [] disjoint from `implementedCount` 218. Doc `docs/presentation-rng.md`.
  Worker gates: typecheck, smoke 448, 1,527 files / 12,335 tests, build 853; differential vs
  `e45e9c361` 941/941. Supervisor: `compare:differential` fight-submenu +
  presentation-rng-playable-live-bodies-seeded-on 408/408 byte-identical; 5 affected test files
  42/42; smoke 448 on the union. Known approximation: overlapping bodies do not interleave draws.
- prep12 (side, `04967a636`): census regenerated at 218 live (218 + 0 + 58 = 276; 52 Random2;
  non-Random2: Baton Pass, Endeavor, Extreme Speed, Fire Punch, Memento, Substitute). Draw plans
  (`tools/integration/fixtures/prep12-random2/plans.json`) reproduce the accepted pinned words for
  Double Kick, Astonish, Thrash, Flail (5 power tiers), Wish, Meteor Mash, Mud-Slap, Sand-Attack,
  Hyper Beam; 0 body-internal lag before the last draw everywhere. Ice Beam, Water Spout, Hidden
  Power draw no Random2 (stale C label). Supervisor reran Thrash + Wish probes twice: runsSha1 equal
  to the receipts. Batch picks: R1 Double Kick/Astonish/Thrash/Flail, R2 Wish/Meteor Mash, R3 Ice
  Beam/Water Spout/Hidden Power (no RNG), R4 Mud-Slap/Sand-Attack, R5 Hyper Beam.
- Folded Opus worker `77d124b7e` (src tree `b318199d`) as `4f0a93368`: first FAITHFUL-RANDOM adapters
  Double Kick (24), Astonish (310), Thrash (37), Flail (175), Wish (273). Plumbing
  `src/engine/liveMovePresentationRng.ts` (plans checked against prep12 plans.json; `core.ts` tick
  activates a body at live age 0 with key `move:<requestId>:<segment>:<command>`; render reads words
  read-only; no host / no body -> scene-off fallback); verifier pinned input `presentationRngActivation`
  (fixtures carry no word arrays). Pinned dense both orientations + one alternate per move, twice fresh,
  0 px; branch coverage (sign parities, velocity parities, twinkle tiles/y signs, Flail powers 20/40).
  Surrogate routes 5/5 (`random2-r1/*`): active every age, action menu reached, words differ across
  seeds, boundaries/RNG/facility equal across seeds and ON/OFF. Accounting: faithfulRandomCount 5,
  implementedCount 218; census bucket 218 + 5 + 0 + 53 = 276. Shadow-row scan repaired (Rollout rows,
  Future Sight return rows) -> 457 rows / 0 mismatches. Worker gates 1,528 files / 12,357 tests, build
  854. Supervisor: dense rerun Double Kick O 36, Thrash SNORLAX 103, Wish P 271, Flail MAGIKARP 114,
  0 px twice fresh; routeReceipt 5/5; 7 test files 132/132; smoke 448 on the union. Receipt
  `random2-r1-live-receipt.json`. Limits: Flail powers 80-200 (bodies 2-5 after a shake) 1,091 px/row
  = ISSUES #148 (x2 history; 0 px with x2 = 0); Meteor Mash dropped (SHIFTRY->GOLEM body 215 frames,
  bg fade ends one frame later; accepted P/O were exact).
- prep13 (side, `e881a6423`, new files only): Ice Beam (all inputs production/constant, 48/48 births,
  203/203 order rows, LAPRAS alt), Water Spout (`attackerSourceHeight` = pictureHeight; rain seed 185 /
  65 per side; tiers 0..3 births exact), Hidden Power (needs Unown letter-form coords; personality),
  Hyper Beam (orb slots = lowest-free released at birth + visible rows + 1; persistentOrder = lent
  index). Supervisor reran the Ice Beam and Water Spout checks from the receipts.
- Folded Sonnet worker `609dbb2e1` (src tree `0375dc73`) as `4abe570f9`: EXACT Ice Beam (58; anchors,
  monbg base, lent order), Water Spout (323; HP tier, attackerSourceHeight = pictureHeight, lent order;
  `liveMoveAnimationDuration(request, field?)` takes the displayed field), Hidden Power (237; Unown
  attackers only, letter form from personality -> `UNOWN_<letter>` pic coords, 8th scatter y from the
  target anchor; non-Unown declines) -> implementedCount 221; FAITHFUL-RANDOM Hyper Beam (63; host
  words, orb slots lowest-free over closed-form lifetimes, persistentOrder = lent index) -> 6. Dense both
  orientations + alternates zero residual twice fresh; routes Ice Beam 0/14 + 1/14 DELCATTY/DUNSPARCE,
  Water Spout 83/14, Hyper Beam 10/28 (seed + ON/OFF parity); Hidden Power has no ordinary route (Unown
  is never a generated rental). Shadow scan 473 rows / 0 mismatches. Worker gates 1,529 files / 12,382
  tests, build 854. Supervisor: dense rerun twice fresh 0 px — Ice Beam LAPRAS 203, Hidden Power second
  Unown personality 180, Hyper Beam SNORLAX pinned 280, Water Spout KINGDRA 276; 7 test files 149/149;
  smoke 448 on the union. Receipt `prep13-live-adapter-receipt.json`. Limit: Water Spout tier bodies 1-2
  and lower-HP tier 3 (later bodies) 16-298 px in orb rows 55-71; fixtures lack `precedingBodies`, so
  the verifier lends the first-body order (suspected harness cause).
- prep14 (side, `3dc9394c2`): Rain Dance (160 draws, reducer replays from one seed) and Water Pulse (12
  draws) READY-WITH-PRESENTATION-RNG; Hail READY (no RNG; target table from anchors); Overheat/Silver
  Wind need the palette composite (+ Silver Wind opponent BG registers after an earlier body); Psych Up
  needs activation BG/matrix state; Curse needs a reducer port. Supervisor reran the Rain Dance and Hail
  checks; fixed two trailing-whitespace lines at merge.
- #148 evidence (side, `b17e9753e`, `docs/x2-history-148.md`): only ONIX and RATTATA (opponent front)
  have idle x2 1 (376/376 species measured; production table equal); absolute-reset target bodies zero
  it until the next send-in; per-move/role table over 188 moves; rule == ROM 788/788 first and
  1,139/1,156 later activations (misses after move-0 / mixed bodies). Supervisor reproduced the
  faint+send-in probe twice (3/3) and the tracker check from receipts.
- Preview refreshed: `4abe570f9` served at :5191, browser replay 4 samples hash-equal, mode control +
  session export passed, no errors (`playable-preview-4abe570f9-receipt.json`).
- Ops: a worker's `pkill -f mgba` killed both shared oracles; supervisor restarted ON/OFF at 11:29 via
  `pokebench_ensure_oracle_profile` (anchor 1/1, fight-submenu 235/235 after restart).
- Folded Sonnet worker `af6855919` (src tree `e5a8c9aa`) as `cce4739da`: Rain Dance (240) and Water
  Pulse (352) FAITHFUL-RANDOM (reducers replay their own draws from the host activation state; plans
  registered so the stream consumes them once) and Hail (258) EXACT (target table from anchors; rng
  echo proven pixel-neutral) -> implementedCount 222, faithfulRandomCount 8. Rain Dance/Hail/Water Pulse
  renderer blocks yield to the live seam under liveField and apply the opponent idle rest. Dense both
  orientations + alternate (POLIWRATH, BLASTOISE, GLALIE -> GOLEM) 0 px twice fresh; 12 pinned values
  each for branch coverage; routes 2/21 BLASTOISE, 7/7 CASTFORM (non-first body), 1/0 DELIBIRD. Shadow
  scan 479 rows / 0 mismatches. Worker gates 1,530 files / 12,394 tests, build. Supervisor: dense rerun
  twice fresh 0 px (Rain Dance P/O/alt, Water Pulse O/alt, Hail alt); routeReceipt 3/3; targeted tests
  150/150; smoke 448. Receipt `random2-r4-live-receipt.json`.
- prep16 (side, `f69850675`): palette composite from assets (BG 2/3/4 battle-bg, OBJ 16/17 battler
  species palettes, OBJ 23/24 move assets; shiny missing -> gate) makes Overheat 230/230 and Silver Wind
  193/196 exact for FIRST bodies (Silver Wind opponent first-body capture 196/196 with first-body
  registers; the accepted fixture is post-Tackle); BG-register history is a 20-state per-move table
  (first-body gate today); Psych Up player first body exact. Supervisor reran the Overheat pixel gate.
- Folded Opus worker `73e311248` (src tree `34a9b1f7`): ISSUES #148 tracker `src/engine/liveBattlerX2History.ts`
  (per battler idle | zeroed | unknown; table generated from the x2-history receipts: attacker 30 zeroed /
  91 keep, target 96 zeroed / 71 keep; mixed -> unknown = species rest; unmeasured damaging target ->
  zeroed; send-in -> idle; fed by the orchestrator at each body's activation edge, invalidated by party
  menu / undrained resolution); `liveBattlerAnchors(side, art, x2Input)` + 242 renderer species-rest reads
  routed through it. Dense twice fresh 0 px: Flail natural-HP 2-5, Double Kick hit 2, Spike Cannon / Fury
  Swipes hits 2-3, Flail after an ONIX replacement send-in (controls 12,001-118,919 px); route replay seeds
  110 / 134 (3 and 9 later-body inputs changed); differential 911/911 on 6 traces; gates 1,531 files /
  12,419 tests, build. Supervisor: dense rerun 4 cases 0 px, control reproduces 118,919 px, differential
  fight-submenu + battle1-postwin-next-prompt 451/451, 7 test files 106/106, smoke 448. Water Spout tier
  re-proof blocked: `fixtureSpriteOrder` has no plan units for the Water Spout + Toxic history.
- prep17 (side, `a81a203b9`): Meteor Mash's 1-row tail difference is a ROM lag frame at `restorebg`
  (`LoadDefaultBg` ~92k instructions; 4 of 5 bodies lag) — not computable from battle state, so Meteor
  Mash stays on fallback (would need a lag-timing claim like D3). Mud-Slap / Sand-Attack READY: windows
  re-anchored to activation, lowest-free dirt slots, anchor geometry, lent order identical across bodies.
- Folded Sonnet worker `e7b97688a` (src tree `be6eec82`): EXACT first-body Overheat (315), Silver Wind
  (318) and Psych Up (244, player attacker) -> implementedCount 225. `src/engine/liveMovePaletteComposite.ts`
  `composeLivePalettes` (assets only; equals the prep16 composite) + `liveBattlerIsShiny` gate; palette
  plan rows 244/315/318 + SPARKLE_6/SPIRAL resources; input builders `liveBgSnapshotMoves.ts`;
  `LiveSpriteOrderHost` body counter -> `LiveMoveSpriteOrderInput.firstBody` (the order host tracks across
  bodies, so `known` no longer implies first body; Intimidate seed counts as a unit). Decline: later
  bodies (BG-register tracker needed), shiny battlers, Psych Up opponent attacker, Overheat/Psych Up with
  an idle-offset species (ONIX/RATTATA). Durations 230 / 193 / 196 / 179 rows. Routes 4/14 MAGCARGO,
  69/14 SOLROCK, 3/7 VOLBEAT, 8/7 VENOMOTH, 66/7 JUMPLUFF, 15/28 METAGROSS; fallback 9/0 BUTTERFREE (later
  body). Shadow scan 484 rows / 0. Census 225 + 8 + 0 + 43 = 276. Worker gates 1,532 files / 12,434
  tests, build. Supervisor: dense rerun twice fresh 0 px (Overheat P/O/CHARIZARD, Psych Up SKIPLOOM,
  Silver Wind O-first-body / BEAUTIFLY); differential 533/533 on 3 traces; route receipt 7/7; 8 test
  files 159/159; smoke 448. Receipt `prep16-live-adapter-receipt.json`.
- prep18 (side, `209e94592`): Dig, Megahorn, Will-O-Wisp, Fury Cutter, Return, Pursuit draw NO Random2
  (stale C). Dig READY (reducer == ROM on 4 scenarios incl. elevated FLYGON; geometry 46/46). The other
  five decode a per-frame hardware-OAM buffer nothing in production builds (reducer ports needed; Fury
  Cutter also needs its counter on the request; Return only reaches the strongest branch in the Factory).
- Folded Sonnet worker `c886fc9a7` (src tree `6f596c07`) as `5330218e8`: FAITHFUL-RANDOM Mud-Slap (189) and
  Sand-Attack (28) (60 words in 6 draw rows; prep17 activation windows; lowest-free dirt slots over
  computed lifetimes; anchor geometry; tracker lend; Mud needs the 4/3 slot pair) -> 10; EXACT Dig (91)
  (setup 195 / unleash 68 rows by request.turn; hidden attacker between turns; setup gated on firstBody,
  unleash on a new `afterDigSetup` lend; unleash has no opponent shadow row) -> 226. Dense 14 fixtures 0 px
  twice fresh (both orientations, ONIX->NIDORINA and FLYGON->GOLEM alternates; 10 pinned values per dirt
  move); routes 9/14 POLITOED, 3/0 PIDGEOTTO, 13/7 AZUMARILL (both Dig turns, 241 hidden gap frames).
  Shadow scan 494 / 0. Worker gates 1,534 files / 12,457 tests, build. Supervisor: dense rerun twice fresh
  0 px (Mud alt 51, Sand O 58, Dig FLYGON O setup 195 + unleash 68); differential 533/533; 6 test files
  138/138; smoke 448. Receipt `random2-r5-live-receipt.json`.
- Species audit 3 (side, `f674ca13d`): 89 swapped rows over this session's 12 adapters, 84 exact; 3
  SPECIES-DEFECTs patch-proven (ISSUES #149: Ice Beam and Water Spout omit the target idle x2 before monbg —
  RATTATA 15,990 / 48,755 px; Astonish droplet origin ignores target elevation — GOLBAT 3,351 px); Hidden
  Power vs GOLBAT tail = ROM lag frame. Supervisor reproduced Ice Beam RATTATA 164/203 -> 203/203 with the
  patch. Audit 4 (`99d7c2c84`): Overheat / Silver Wind / Psych Up 29/34 exact, 5 documented idle-offset
  declines, no defects.
- Folded Sonnet worker `d8e4eaa7e` (src tree `3f95f3a8`) as `aaa945463`: ISSUES #149 fixed (Ice Beam / Water
  Spout add the tracker's target idle x2 before monbg — RATTATA 15,990 / 48,755 px -> 0; Astonish droplet origin
  adds the target elevation from art — GOLBAT 3,351 -> 0; accepted fixtures unchanged); Rollout Defense Curl
  bodies 1-4 live (shake amplitude clamp(power/12, 1, 16) from the request; hit splat at the target
  picOffsetPoint; power declines removed; Curl + SHUCKLE plain + accepted ladder 0 px); Endeavor stale
  gBattleMovePower register plumbing only (W1 emitted for 283, W2 rule R at AI decisions, W4 confusion /
  Future Sight, cross-battle carry) — NO Endeavor adapter (the staged reducer is GROVYLE/ONIX-specific;
  source-relative reducer still needed; W3 TV loop not ported). Worker gates 1,535 files / 12,462 tests,
  build. Supervisor: #149 derived fixtures 0 px twice fresh; Curl bodies 1/4 + accepted plain body 3 0 px;
  the register's only reader is the MOVE_ANIMATION argument; winning soak seeds 0:20 per-seed outcomes
  identical master vs branch (1M frames each); 7 test files 155/155; smoke 448.
- prep19 (side, `65fb765b9`, `docs/bg-register-history.md`): 68-field register signature; per (move, side,
  stat args) delta table; end+30 / end+1 chain; rule == ROM at 1,408/1,497 later activations in-sample
  (72/72 later Overheat / Silver Wind / Psych Up bodies); Silver Wind pixels did not change under register
  overrides (Open #1). prep20 (side, `f0e428683`): source-derived hardware-OAM assembler prototypes for
  Will-O-Wisp, Pursuit, Fury Cutter, Megahorn — OAM rows exact vs corpora and fresh alternates, pixels 0 px
  with the prototype buffer; open input = per-row full 64-slot order; Will-O-Wisp reducer orb math drifts on
  other geometries (port the exact math); supervisor reran prep20Run.sh.
- Folded Opus worker `fe582f183` (src tree `c41c4949`) as `7e7816b98`: Silver Wind (both sides) and Psych Up
  (player) live on LATER bodies when the order lend is known (Silver Wind also needs the known-entry slot
  occupancy): their history-dependent registers never reach the compositor (reducers overwrite bld* /
  scroll / bgcnt first; code path + S0 / rule / absurd render test + positive control); 11 later-body
  fixtures (Tackle, Splash, Psychic, own Silver Wind, stat predecessors) 0 px twice fresh; routes 106 / 160
  later Silver Wind bodies live. Overheat keeps the first-body gate (only 1 later body per side measured).
  Worker gates 1,536 files / 12,472 tests, build. Supervisor: dense rerun 4 later-body fixtures 0 px twice
  fresh; differential 533/533; 5 test files 45/45. Receipt `later-bodies-bg-receipt.json`.
- Wind-down: supervisor final gates on `7e7816b98`: typecheck, 1,536 files / 12,472 tests, build 857
  (`final-supervisor-gates-20261006.json`); preview `10ad8606c` verified
  (`playable-preview-10ad8606c-receipt.json`). Live: 226 scoped-exact + 10 faithful-random; 40 remain.
  Next: ROADMAP S10A "Next (2026-10-06 evening)".
- Last evidence merge (side, `877e4485e`, new files only): Overheat (both sides, 5 predecessors each) and
  Psych Up opponent attacker (first body + 6 later cases) 0 px through the production renderer with the
  first-body gate temporarily bypassed (src reverted; patch `later-bodies-bg-2/lb21-temp-bypass.patch`);
  Psych Up opponent inputs listed in `docs/later-bodies-overheat-psychup.md`. Not supervisor-reproduced
  (wind-down); the gate-widening step must re-prove them.

## 2026-10-06 — User answered D3: separate deterministic presentation RNG

- Approved option (a) for the next run: source animation algorithms/draw rules,
  independent deterministic per-battle visual RNG, seed/policy version in
  session exports, reproducible reset/replay, separate "faithful random" claims.
- Removed D3's open heading from DEFERRED.md. No further approval needed;
  gameplay RNG, outcomes and Factory acceptance remain unchanged.
- Production remains `24df8af5e`, 218 live / 58 remaining (52 Random2).
  No surrogate implementation or adapter promotion in this docs checkpoint.
  Final production receipt remains `final-supervisor-gates-20261005-day.json`.
- Next: module + replay/export + claim accounting, then a bounded Double
  Kick/Astonish batch using the reproduced word vectors. Update stale census
  and picks; preserve all other host guards and acceptance gates. See ROADMAP
  S10A, ANIMATION_INTEGRATION_SUPERVISOR.md and ANIMATION_VERIFICATION.md.

## 2026-10-05 (day, wind-down) — 198 -> 218 live adapters; lends across faints/switches; species fixes; elevated renderer

- Folded Opus worker `0f08fa4d1` (code `be86f3141`, src tree `badeb050`) as `e2eb653b6`:
  the production sprite-order tracker models faint, next-mon summary + send-out, forced
  switch-in, party-menu reset (open and return) + battle reshow, and the win trainer slide
  (`docs/sprite-order-uncovered-units.md` §2); the lend gate is unchanged, so no adapter
  output moved. Evidence replay through the production transform: route 84/84/0, lab
  25/25/0 (23/23 with the recall still invalidating), unit checks 36/36. Supervisor: 8
  sprite-order test files green; route comparison over 43 generated battles (master vs
  branch, `.codex-logs/verify-postko-neutral.mjs`): every body decision identical; retained
  order known after a faint 0 -> most commands. Worker gates: 1,510 files / 12,186 tests,
  build 851. Receipt `postko-tracker-receipt.json`.
- Post-KO consumer audit (`f78de13fd`, `docs/postko-consumer-audit.md`, new files only):
  37 consumers (16.7% of Level-50 move uses); post-KO model vs ROM 0 mismatches at 37 known
  edges (8 BattleLab scenarios, twice fresh); lending the order relabelled to entry slot
  labels (π) makes all 13 probed bodies exact (7 already generalize, 6 need π), 0 need new
  inputs. Supervisor reproduced the Thunderbolt-opponent case: probe twice byte-identical,
  π lend 237/237 zero residual, raw lend 12/237.
- Folded Opus worker `a4a5e2fca` (code `17d6212c4`, src tree `b9da2cf4`) as `c35b3b64c`: post-KO
  lends (rung 2). After an opponent KO + next-mon summary + send-out the occupancy is role-isomorphic
  to the entry, so the tracker lends F relabelled to entry slot labels (π) and the allocator host is
  re-seeded with the known-entry host; first bodies unchanged (π = identity). Dense through the
  production lend, twice fresh, zero residual: the 13 audit drafts (2,001 rows) + Barrier, Reflect,
  Magic Coat, Frustration, Seismic Toss, Safeguard, Heal Bell, Sweet Scent, Mega Drain, Perish Song,
  Grudge. Leaf Blade (GOLEM target, ages 0-11 inside the target box, 212/224) is pinned out post-KO
  (`POSTKO_LEND_EXCLUDED_MOVE_IDS`); cause not isolated (target species suspected, not π).
  Supervisor: dense rerun Giga Drain O / Sunny Day P / Barrier P / Heal Bell P exact twice fresh;
  64 generated battles master vs branch: 3 bodies changed, all fallback -> live after a faint;
  ON/OFF parity exact on both changed routes. Worker gates: 1,511 files / 12,195 tests, build 851.
  Receipt `postko-lend-receipt.json`. Limits: player-faint reshow geometry still declines; second
  opponent KO predicted by the unit plans (route evidence), not pixel-probed; Horn Drill, Mirror
  Coat and 11 more consumers class-inferred.
- Census regenerated at 198 live (`61be66957`; 78 remaining: READY-NOW 2, SMALL-INPUT 6,
  PROVIDER 22, MULTI 48, OUT 1; Random2 = code C is the dominant blocker, 52 moves) and prep10
  measured prep (`docs/next-adapters-prep10.md`): Magnitude/Reversal/Flail power = gBattleMovePower
  (request carries the static table power today), Reversal reducer toggle bug, Pain Split
  closed formula 24/24, Fire Punch player body-only, Rock Blast / Razor Wind ready, Spark player
  conditional, Endeavor needs the persistent register. Supervisor reran the Magnitude probes:
  byte-identical, power 110 / 70.
- Folded Sonnet worker `58c49a7ae` (src tree `58c49a7a`) as `538047fc3`: **204 live adapters**
  (+Magnitude, Reversal, Pain Split, Rock Blast, Razor Wind, Spark player attacker). Engine seam:
  the MOVE_ANIMATION `power` argument is the ROM's gBattleMovePower when the move's damagecalc ran
  (presentation-only register; damage unchanged); Reversal reducer toggle fixed (+ceil/-floor);
  Pain Split closed-form y2 from per-side pic yOffset. Worker: 36/37 dense fixtures zero residual
  twice fresh (4,237 rows/run), gates 1,512 files / 12,220 tests + build. Supervisor: dense rerun
  of 6 fixtures (Magnitude CAMERUPT intense opp, Reversal power 80 and Vigoroth, Pain Split
  DUSCLOPS, Rock Blast hit 3 OCTILLERY, Spark PLUSLE) zero residual twice fresh; routes 7/7 PASS.
  Limits: Razor Wind ABSOL-opponent unleash 23 px at age 18 (reproduced; Nuzleaf exact); Spark
  opponent attacker returns null; Fire Punch dropped (accepted body exists only in the staged
  PPU scene; needs a generic Scene-ON renderer); Endeavor needs the persistent power register.
  Receipt `prep10-live-adapter-receipt.json`.
- Random2 trackability (`86bc0d7a1`, `docs/random2-trackability.md`): NOT TRACKABLE in play —
  the wireless-link layer draws one Random2 per main-loop pass and between-turn lag frames vary
  with identical inputs (strict chain 2/29 route bodies); words are exact from a known activation
  value. Supervisor reproduced the lab probe (102 step runs, caller lists identical). User
  decision recorded as DEFERRED D3 (surrogate presentation RNG vs fallback).
- Folded Sonnet worker `2264ecf0e` (src tree `da2ba8d4`): 22 abs-invariant REL-Y rows into the
  production order table (445 -> 467 bodies), all 23 source-confirmed (sprite y = battler position
  + script constants; `docs/sprite-order-absinv-source-check.md`); corpus known 1,101 -> 1,110,
  later-known 547 -> 556, lab unit checks 18 -> 22, 0 mismatches; seed 54 opponent Heal Bells
  now lent. Supervisor: 8 sprite-order test files green; generator reproduces the table
  byte-identically; Roar citation spot-checked. Caveat: Fissure plumes' absolute y follows the
  opponent elevation (relative y unchanged). Receipt `absinv-rows-receipt.json`.
- prep11 (`6586f3ea2`, `docs/next-adapters-prep11.md`): **ISSUES #144** — live Leaf Blade holds
  the target x2 = 1 at ages 0-11 for every opponent (ONIX-only in the ROM): GOLEM 11,843 px at
  the first body (supervisor reran: GOLEM 212/224 twice, ONIX 224/224). GOLEM target-swap audit
  of 58 accepted fixtures: 22 exact, Dragon Rage projectile residual, ~32 untriaged (window
  suspected). D-PAL/D-BG/E-TASK/F-AFFINE labels stale for 9 moves (constants == accepted corpora
  18/18; monbg formula 25/25); Roar/Whirlwind continuation and Baton Pass flow unresolved;
  Rollout needs the counter; Fly/Bounce need the hidden-attacker seam.
- Folded Sonnet worker `bbbea5ac0` (src tree `9c687e34`): **213 live adapters** (+Leech Seed main
  body, Tri Attack, Petal Dance, Destiny Bond, Air Cutter, Foresight, Sky Uppercut, Recycle,
  Spider Web) and the #144 fix (Leaf Blade target x2 from the species front idle; ONIX output
  byte-identical; GOLEM/STEELIX now exact; post-KO exclusion lifted, 224/224). Supervisor:
  dense rerun 7 fixtures twice fresh, zero residual (1,451 rows/run); routes 9/9 PASS. Limits:
  Sky Uppercut COMBUSKEN script ends 1 frame later (ages 170-188); Spider Web ARIADOS back
  sprite 14 px. Worker gates 1,514 files / 12,244 tests + build. Receipt
  `prep11-live-adapter-receipt.json`. ISSUES #144 deleted.
- Live-adapter species audit (`ffe363f39`, `docs/live-species-audit.md`, new files only): GOLEM,
  GOLBAT, SHUCKLE and player-side GOLEM swaps over ~250 accepted fixtures; two new live defects
  filed as **ISSUES #145** (Dragon Rage fire-spit aim from ONIX literals; Aerial Ace hard-coded
  ONIX idle x2), both proven by one-value patches (supervisor reran: Dragon Rage GOLEM 139/150 ->
  150/150, Aerial Ace 50/50). Unresolved: one-frame-later tail fades (suspected lag frame),
  GOLBAT-only small residuals.
- Folded Sonnet worker `5b7a1ff3b` (src tree `8ecf09bb`): #145 fixes — Dragon Rage fire-spit aim
  from attacker/target pic offsets (ROM u16 low-bit rule; accepted ONIX literal reproduced) and
  Aerial Ace settled target x from the species idle x2. Supervisor dense rerun twice fresh zero
  residual: Dragon Rage GOLBAT 150, player-GOLEM 150, accepted ONIX 150; Aerial Ace SHUCKLE 50;
  routes PASS on branch and master. Fly/Bounce dropped: the attacker must stay hidden between
  turns, which needs a timed presentation visibility write from a body (new host decision;
  `battleCommandPresentation.ts:165-172` only follows queue receipts). Receipt
  `issue145-flybounce-receipt.json`; ISSUES #145 trimmed to the unresolved audit residuals.
- Player-faint lend audit (`f91d6e15e`, `docs/playerfaint-lend-audit.md`, new files only): after a
  player faint + forced menu + reshow + forced switch-in the occupants relabel exactly to the entry
  under a ROLE map (41 known edges, 0 mismatches; 13 role-lend what-ifs exact); second opponent
  KO = first-KO geometry (today's lend already exact). Forced-menu staging recipe documented.
  Supervisor reran one scenario (identical rows, model 0 mismatches, Heal Bell 261/261).
- Folded Opus worker `3cdc5c4a1` (src tree `3172ec9f`): player-faint lends — tracker occupant
  roles (healthbox mains + shadow), role relabel ρ (= π at the entry / after opponent KOs), lend
  and allocator re-seed after a forced switch-in; replay driver answers the forced party screen
  (`answerForcedSwitch`, tools only). 13/13 playerfaint drafts exact twice fresh (2,029 rows);
  25 post-KO digests unchanged; 28 of 57 post-switch bodies on 12 generated routes newly lent and
  active. Supervisor: Light Screen 88 / Protect 123 (re-seeded host) / Thunderbolt O 237 exact twice
  fresh; RNG parity 0 mismatches on 4 forced-switch routes. Cancelled voluntary menu still declines
  (conservative). Receipt `playerfaint-lend-receipt.json`.
- Forced-switch continuation evidence (`071a913e1`, `docs/forced-switch-continuation.md`): ROM
  removes the Roar/Whirlwind target instantly (skipAnim) at E+4, send-in at E+10; production plays
  a 27-frame recall and sends in at +33; send-in tail (healthbox slide / message) is species-
  dependent in the ROM, fixed in production; Baton Pass flow does present a replacement once the
  party screen is answered. Filed ISSUES #146.
- Folded Opus worker `634207ed8` (src tree `35967507`): **215 live adapters** (+Roar, Whirlwind) with a
  Scene-ON forced switch-out after a live body (no recall; hold 4 + hide 6; send-in at the
  framebuffer E+11) and tracker `forced-switch-out` / side-generic switch-in units (host known after
  forced switches; sweep hostKnown 477 -> 524). Supervisor: dense Roar P / VAPOREON / Whirlwind O
  zero residual twice fresh; Roar player-attacker continuation exact body start -> emerge
  (128/128 both runs); tests 29/29. Limits (#146): send-in tail (ball-open fade/particles,
  species-keyed slide/message), opponent-attacker continuation, elevated-attacker field after the
  body (1,444 px, untriaged), Scene OFF unchanged. Receipt `roar-live-receipt.json`.
- Live-species audit 2 (`812ce5ea2`, `docs/live-species-audit-2.md`): three more live defects,
  patch-proven (Rock Throw idle x2, Smelling Salt y clamp, Light Screen / Future Sight end-of-body
  shadow; supervisor reran Rock Throw GOLBAT 66/87 -> 87/87); tail fades are species-keyed lag
  frames (not defects). ISSUES #145 updated.
- Folded Sonnet worker `48a1bd913` (src tree `29450955`): #145 species fixes — Rock Throw target idle
  x2 (ONIX keeps +1), Smelling Salt exclamation y clamp (`max(8, top) - 16`), Light Screen /
  Future Sight end-of-body elevated-shadow return (`LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS`),
  Foresight glass legs via exact `InitAnimLinearTranslation` truncation (GOLBAT 66 -> 167/167).
  Supervisor: dense vs GOLBAT twice fresh zero residual (Foresight 167, Smelling Salt 121, Future
  Sight 114), accepted Foresight unchanged, routes 5/5 PASS. Receipt `issue145b-receipt.json`.
- Voluntary-switch lend audit (`8e58b3da1`, `docs/voluntary-switch-lend-audit.md`): after a
  cancelled party menu or a voluntary switch the role relabel is exact (45 edges, 0 mismatches;
  12/12 what-ifs); the provisional recall unit is promoted (18 edges). Supervisor reran
  voluntary-cancel-slot1 (identical) + Swift O 80/80, Sunny Day P 158/158.
- Folded Opus worker `1f1202568` (src tree `d4bccd58`): voluntary-switch lends — roles after the
  both-battlers reshow (cancelled menu / return from choosing), the player's voluntary recall
  (`RETURNATKTOBALL`, battler 0, synthesized `BattleScript_ActionSwitch`) maps to the promoted
  `switch-out` unit, allocator re-seed at the cancel return; opponent AI switches, Pursuit,
  Baton Pass still invalidate. 13/15 drafts exact twice fresh (2,132 rows); 2 later Light Screens
  decline (allocator history lost after earlier non-net-zero bodies, as on master). Supervisor:
  Light Screen after cancel 88 / Thunderbolt O 237 / Swift O 80 exact twice fresh; seed-16 switch
  and cancel routes rules + RNG parity 0 mismatches. Receipt `voluntary-lend-receipt.json`.
- Elevated-opponent post-body audit (`c8ad855cc`, `docs/elevated-postbody-audit.md`): ordinary
  resolution frames draw elevated opponents 8 px low without their shadow (ISSUES #147; every
  ordinary frame, before and after bodies); script-end shadow-return table over 214 fixtures;
  2-line patch proof (supervisor reran Whirlwind BUTTERFREE: post-body 0/30 -> 30/30).
- Folded Opus worker `fb313c49e` (src tree `3ce320a6`): ISSUES #147 fix — the shared ordinary
  resolution renderer draws elevated opponents at the elevated origin with their shadow (both
  scene modes; `docs/elevated-renderer-off-check.md`: Scene OFF had the same bug), post-body
  shadow hide table (Absorb 2, Dragon Rage 21, Dream Eater / Psybeam / Razor Wind / Sing / Sky
  Uppercut / Horn Drill 1 by side), faint sink from the elevated origin, no shadow at HP 0.
  Supervisor: post-body Whirlwind BUTTERFREE / Air Cutter GOLBAT 30/30 (master 0/30); Scene OFF
  GOLBAT / BUTTERFREE 919/935 (master 0/935); magneton OFF trace 703/751 unchanged. Worker: 203
  committed traces byte-identical; gates 1,523 files / 12,309 tests + build. Receipt
  `elevated-renderer-receipt.json`. #147 trimmed to the hit-blink / HP-0 remainder.
- Rollout / Endeavor prep (`a3093fa8e`, `docs/rollout-endeavor-prep.md`): Rollout counter =
  `rolloutTimerStartValues - rolloutTimer` equals the ROM at every body (Defense Curl included);
  Endeavor's stale gBattleMovePower is trackable (damagecalc, AI decision rule 16/16 movesets,
  Battle TV writer, cross-battle persistence, 0 at the first battle). Drafts ready.
- Folded Opus worker `8f2a167a4` (src tree `b8565b22`): **217 live adapters** (+Fly, Bounce) with a
  presentation-only semi-invulnerable attacker hide across the turn gap (Scene ON; set by a live
  charge body, cleared by the battler's next body / visibility receipt / faint / switch).
  Supervisor: Fly SWELLOW 43/68 and Bounce PONYTA 64/55 exact twice fresh; routes 38/7, 65/7 PASS.
  Worker turn-gap proof: attacker region 0 px over 251/245 gap frames. Limits: Bounce opponent
  strike unevidenced; a live body hitting the hidden mon draws it. Receipt
  `flybounce-live-receipt.json`.
- Send-in tail model (`2cb458c4b`, `docs/send-in-tail-model.md`): opponent healthbox slide start =
  46 + max(front frame animation, delay + callback) (338/338; leave-one-out 318/318; callback
  durations fitted); the forced-switch fade is the voluntary send-in effect gated by
  `sourceDecision.kind === "switch"`.
- Folded Sonnet worker `3cbdbb943` (src tree `6418776b`): **218 live adapters** (+Rollout): presentation-
  only `rolloutCounter` (7th MOVE_ANIMATION argument, move 205 only); bodies 1-5 by counter; the
  plain power ladder only (Defense Curl bodies decline: SHUCKLE->BLISSEY residual unexplained).
  Supervisor: player bodies 1/5, opponent body 3, WAILMER body 1 exact twice fresh; route 2/0
  VOLTORB 5 bodies active, parity PASS. Receipt `rollout-live-receipt.json`.
- Session final (supervisor, code `24df8af5e`): typecheck; full suite 1,525 files / 12,317 tests;
  build 851 (`final-supervisor-gates-20261005-day.json`); preview `24df8af5e` verified (four
  hashes, export, ON->OFF, no errors). DEFERRED D3 open (Random2).

## 2026-10-05 (wind-down) — CASTFORM fix + order table 445 bodies

- CASTFORM normal-form Y placement fixed (`55d1ef1dd`, ISSUES #143 trimmed to weather
  forms): player back delta from `sCastformBackSpriteYCoords` (0), elevation from
  `sCastformElevations` (13, via the extractor). Supervisor: retained ROM runs 237/237
  exact both sides; MINUN controls zero residual. Receipt `castform-fix-receipt.json`.
- Production order table 381 -> 445 bodies (`d9195447f`): Endeavor/Fake Tears
  relative-y rows + 60 REL-Y-confirmed rows. Corpus 1,044 -> 1,101 known (all exact);
  strict real-route 3 -> 10 known per trace (all exact). Supervisor: 54 sprite-order
  tests green; later-body consumer routes PASS. Receipt `order-table-rows-receipt.json`.
- `implementedCount` corrected 191 -> 198 (a batch had not bumped it) and pinned by
  `tests/liveStatusImplementedCount.test.ts`.
- Intimidate battle-start seed (`782822914`): pre-prompt entry state + stat-animation plan
  (12/12 corpus exact at the Intimidate and first-move edges); route seed 53 (Intimidate
  lead) lends a known order, both bodies live. Receipt `intimidate-seed-receipt.json`.
- Final supervisor gates on `782822914`: typecheck, 1,509 files / 12,178 tests, build 851.

## 2026-10-05 — final batch folded: 198 live adapters; session gates

- Folded worker `3b64e52e9` as `09b92c56d`: Giga Drain, Sunny Day, Mega Drain,
  Absorb (live age 0 = window start, activation + 10), Dream Eater (sleep from the
  displayed field), Double Team (player attacker; frontClone from the lend; dense
  source = prep7 first-body lab scenario), Feather Dance — all gated on the lent
  order. Supervisor dense 25 fixtures (13 + 12 alternate species) twice fresh,
  5,292 rows/run, zero residual; routes 7/7 PASS. Receipt `prep9-supervisor-receipt.json`.
- Supervisor final gates on `09b92c56d`: typecheck, 1,508 files / 12,175 tests,
  build 851 modules (`final-supervisor-gates-20261005.json`).
- ISSUES #143 diagnosed (`a3511d54c`, `docs/castform-art-diagnosis.md`): CASTFORM
  art/palette are exact; its Y placement comes from `sCastformBackSpriteYCoords`
  (back delta 0) and `sCastformElevations` (13) that the app does not apply;
  in-memory what-if exact 237/237 both sides.

## 2026-10-05 — prep8 batch folded: 191 live adapters; uncovered-unit evidence

- Folded worker `6598eb715` as `4c7791984` (src `4bf17bef1`): Swift, Trick,
  Frustration (friendship ≤ 30), Seismic Toss (damage 33..65), Horn Drill,
  Aurora Beam, Uproar, Thunderbolt, Stockpile, Zap Cannon — allocator constants
  + lent order, gated on the tracked order being known. Supervisor dense 24
  fixtures twice fresh, 4,013 rows/run, zero residual; routes 10/10 PASS.
  Receipt `prep8-supervisor-receipt.json`. New ISSUES #143 (CASTFORM art).
- Uncovered units (`80a12ace4`, `docs/sprite-order-uncovered-units.md`): faint,
  summary, send-out, switch-in, party menu, reshow, recall and trainer-slide
  order transforms 36/36 exact (strict route edges known rise accordingly), but
  after a KO the battler slots and the affine baseline change, so lends stay
  gated (needs occupancy-aware consumers + post-unit affine/task baselines).
- Running: final batch (Giga Drain, Sunny Day, Mega Drain, Absorb, Dream
  Eater, Double Team player, Feather Dance).

## 2026-10-05 — prep7 batch folded: 181 live adapters

- Folded worker `81929ce83` as `d244f2f79` (src `907516e6b`): Aerial Ace,
  Quick Attack (live age 0 = activation, reducer age + 42 / 44), Ice Punch,
  Fake Tears, Sleep Talk, Fire Blast, Dragon Dance (lent order), Rock Slide
  (opponent attacker only). Supervisor dense 19 fixtures twice fresh, 2,367
  rows/run, zero residual; routes 8/8 PASS. Receipt `prep7-supervisor-receipt.json`.
- Limit: Aerial Ace with CHARIZARD/DRAGONAIR opponent attackers leaves 14/51 px
  at ages 10-11 on the opponent platform clip row.
- REL-Y-STATIC confirmation (`259c1a694`, `docs/sprite-order-rely-confirmation.md`;
  supervisor regenerated the 83-row file identically): 60 candidate bodies
  confirmed order-static across ≥2 geometries (+23 absolute-invariant), 30
  refuted; weighted EXACT plan coverage 68.2% → 80.6% (83.7% with all rows);
  union replay 2,158/2,158 exact. Rows are not yet in the production table.
- Running: prep8 batch (ten allocator-plan-v2 moves); uncovered units
  (faint / send-out / switch / party menu) order evidence (side).

## 2026-10-05 — prep6 batch folded: 173 live adapters; prep8 prep

- Folded worker `776478118` as `91e78cb74` (src `5a9ef5cdf`): Rock Tomb,
  Safeguard, Sweet Scent (reducer age = live − 4), Self-Destruct, Swallow
  (stockpile = request.turn), Knock Off (ageOffset −11), Faint Attack (player
  attacker only). Supervisor dense 20 fixtures twice fresh, 2,771 rows/run,
  zero residual; routes 8/8 PASS. Receipt `prep6-supervisor-receipt.json`.
- Limit to resolve: Faint Attack's last 16 ages (fade back from the dark
  background) differ by one script frame between BattleLab-context renders
  and the accepted staged probe; the adapter matches the staged probe.
- prep8 measured prep (`a6d0bb7d8`, `docs/next-adapters-prep8.md`): Swift,
  Trick, Thunderbolt, Frustration, Horn Drill, Seismic Toss, Aurora Beam,
  Stockpile, Uproar, Zap Cannon all READY (allocator literals = ROM plan;
  order pixel-neutral except Zap Cannon ≤4/117 frames); gate on the lent
  order (`spriteOrderInput.known`), no new provider module needed.
- Order policy gaps (`e82018fd9`, `docs/sprite-order-policy-gaps.md`): the
  prep7 "stat command invalidates" finding is stale (the cross-body host maps
  `stat-stage-change` to a no-op; Double Team/Feather Dance first bodies now get
  a known order 3/3); Intimidate entry seed (pre-prompt state + stat plan)
  reproduces the ROM 12/12; Endeavor and Fake Tears are order-static under a
  constant relative-y spread (strict real-route known edges 15 → 44, 0
  mismatches). Production change proposal §1 (A-C) not yet applied.
- prep9 (`69f218f0a`, `docs/next-adapters-prep9.md`; supervisor regenerated the
  palette baseline identically): Absorb, Mega Drain, Giga Drain, Dream Eater,
  Sunny Day need NO palette snapshots (census D-PAL stale): BG banks constant at
  53/53 activations, OBJ banks = species art; allocator profiles constant;
  order pixel-neutral. All READY (four with the lent order).
- Running: prep7 batch (integration); REL-Y-STATIC confirmation for 121
  candidate bodies (side).

## 2026-10-05 — cross-body sprite-order tracking live

- Folded Opus worker `a7753047a` (code `35c7f902f`) as `27ae6f331`: event-driven
  order host (`src/engine/liveSpriteOrderHost.ts`), pure presentation-event
  transform, generated production table (381 EXACT bodies, 16.6 kB; +6 kB
  gzip bundle). Order consumers (Grudge, Heal Bell, Leaf Blade, Rock Throw,
  Blaze Kick, Perish Song) now render whenever the tracked order is known.
- Evidence: TS corpus 1,044/1,044 exact; real-route strict 3/3 per trace (stops
  at the unplanned Endeavor body); host == pure transform on 200 seeds (239
  later bodies known, 0 mismatches). Supervisor: five later-body routes (both
  sides) PASS, new tests green. Receipt `order-cross-body-supervisor-receipt.json`.
- Limits: later-body pixels rest on the order claim + first-body dense proofs;
  Intimidate entries, locked continuations, party-menu returns, hidden targets
  invalidate.
- prep7 measured prep (`ae18c3644`, `docs/next-adapters-prep7.md`): READY Aerial
  Ace, Quick Attack, Ice Punch, Fake Tears, Sleep Talk, Rock Slide (opponent);
  Fire Blast, Dragon Dance via the provider; Feather Dance / Double Team need
  the order kept across their leading `stat` command.
- Allocator plan v2 evidence (`d97eed5db`, `docs/allocator-plan-v2-evidence.md`;
  supervisor fresh Swift probe identical, analysis regenerated identically):
  affine matrix bitmap 0x6 and no active task at all 481 body activations
  (195 scenarios + the Factory route); 467/467 closed bodies return to that
  baseline; 12 move timelines reproduce the accepted matrix ids / task slots
  (0 differing ages). Swift, Trick ready; Thunderbolt, Frustration, Horn Drill,
  Seismic Toss, Aurora Beam, Stockpile, Uproar, Zap Cannon also need the order;
  Rock Blast / Razor Wind need outcome input. Faint/send-out/switch baselines
  unprobed.
- Running: prep6 batch (integration); prep8 measured prep for the v2 moves (side).

## 2026-10-04 (night) — order-consumer batch folded: 166 live adapters

- Folded worker `bd04c68bd` as `72610e111` (src `53130b776`): Ember, Dragon
  Rage (no order input), Flamethrower (provider seed or ascending, both exact)
  render always; Heal Bell, Leaf Blade (new `initialOrder` parameters, staged
  defaults unchanged), Rock Throw (occupied prefix + F), Blaze Kick, Perish
  Song (creation rank, 3/3 turns) render as the battle's first body only.
  Harness replays fixture `precedingBodies` with the plan applier (16/16 equal
  the validated seeds).
- Supervisor dense: 16 fixtures + Ember/Flamethrower HOUNDOUR both sides
  twice fresh, 2,874 rows/run, zero residual; routes 8/8 exact ON/OFF parity.
  Receipt `order-consumers-supervisor-receipt.json`.
- Limits: Blaze Kick has no first-body ROM scenario (proof uses its
  Torment-preceded accepted history); tails Flamethrower 80 / Dragon Rage 21 /
  Blaze Kick 9 / Ember 3 frames uncovered.
- Plan coverage (`adc8d04f3`, `docs/sprite-order-plan-coverage.md`): 228 more
  scenarios (two identical runs each) raise EXACT body plans to 68% of
  weighted Factory move uses (was 52%); union replay 1,053/1,053 exact.
- Remaining-adapters census (`2add7576e`, `docs/remaining-adapters-census.md`,
  regenerate `node tools/integration/remainingAdaptersCensus.mjs --write --doc`):
  276 = 158 live + 15 in flight + 103 remaining (READY-NOW 10, SMALL-INPUT 5,
  single provider 31, multi 56). Provider ranking: allocator plan v2
  (affine matrix + task slots) +12 moves; Random2 surrogate +7 (non-exact,
  claim-boundary question); graphics host +6; palette snapshots +5.
- Running: cross-body order tracking (Opus); prep7 measured prep for the
  census READY-NOW batch (side).

## 2026-10-04 (night) — sprite-order provider wired (first body) + Grudge: 158

- Folded Opus worker `3bb021abb` (code `f279df7cc`, src `953b81b0a`) as
  `0d212ae24`: provider API (`spriteOrderForSlots`, occupied prefix, body/gap
  plan applier — TS replay 659/659, equal to Python; tests/harness only),
  presentation-only order state beside the allocator host. Production supplies
  a known order only to the battle's FIRST move body after a known entry with
  no battle-start script events; invalidated by any other preceding command,
  unknown graphics, switch-in, party menu, and after that body.
- Grudge (288) live as the first order consumer (first body only; null →
  bounded fallback otherwise). Supervisor dense 2 fixtures twice fresh, 418
  rows/run, zero residual; route 288@57,3,0 PASS; seed 16 (opponent's Light
  Screen first) falls back 0/209 with ON/OFF parity. Receipt
  `order-wiring-supervisor-receipt.json`.
- Running: order-consumer batch (Ember, Dragon Rage, Flamethrower always-on;
  Heal Bell, Leaf Blade, Rock Throw, Blaze Kick, Perish Song first body).
  Next: cross-body order tracking keyed on prompt / body / hit-animation /
  stat events (`docs/sprite-order-gap-causes.md` §2).
- prep6 measured prep (`9215f385e`, `docs/next-adapters-prep6.md`; supervisor
  reproduced pins/slots): READY Rock Tomb, Safeguard, Sweet Scent,
  Self-Destruct, Knock Off (age basis −6), Swallow (stockpile = request.turn),
  Faint Attack (player attacker only); Pain Split needs per-side coords
  yOffset in its reducer; Dragon Dance (1 frame), Fire Blast and Double Team
  need the order provider.
- Real-route order validation (`2ad3cb4e9`, `docs/sprite-order-real-route.md`;
  supervisor fresh rerun identical): five canonical Factory battle-1 traces,
  ROM per-frame order. Event rules (prompt bounce pair, hit-animation blip,
  stat ±1/±2) 121/121 unit checks exact; with resync after each unknown unit
  all 91 move edges exact. Strict tracking stops at the first body without a
  plan (the opponent's Double Team on turn 1): table coverage is the limit.
  Faint, next-mon summary/send-out, forced switch-in, party menu, battle
  reshow and the end-of-battle slide must invalidate.

## 2026-10-04 (night) — prep5 folded: 157 live adapters; order-consumer prep

- Folded worker `ce8d7a09e` as `c23e165bb` (src tree `1f73449b5`): Mist Ball
  (ad-hoc shadow retired; Registeel drafts fixed to genderless), Aromatherapy
  (duration 400 player / 396 opponent attacker, same script-end frame), Follow
  Me, Metronome (body only; called move is an ordinary second request), Taunt
  (age 0 = window start, 10 frames after activation), Belly Drum. No palette plans.
- Supervisor dense: 12 fixtures + Follow Me CLEFABLE/FURRET, Taunt MIGHTYENA,
  Metronome CLEFABLE (`altSpecies8.py`) twice fresh, 2,938 rows/run, zero
  residual. Routes 6/6 exact ON/OFF parity; Mist Ball prep seed 90 has no body
  because Latias flinched (checked). Union typecheck/smoke/affected green.
  Receipt `prep5-supervisor-receipt.json`.
- Order-consumer measured prep (`66a349c26`, `docs/order-consumer-prep.md`):
  18/18 accepted order literals equal the provider. Ember and Dragon Rage need
  no order input (one sprite per sort window); Flamethrower's seed is
  pixel-neutral; Rock Throw, Heal Bell, Leaf Blade, Perish Song, Blaze Kick,
  Grudge (first body), Mud Slap, Sand Attack need the provider; consumers need
  `F` filtered to their allocation slots, not `F.slice(0, n)`. Dive attack body
  needs live keys; Magnitude's own evidence is not accepted.
- Running: provider wiring step (first body of a battle + Grudge consumer,
  Opus worker).
- Gap causes (`e26052db2`, `docs/sprite-order-gap-causes.md`): the
  between-body one-sprite blip is the target hit animation's healthbox jiggle
  (`DoHitAnimHealthboxEffect`, 20 frames; 170/170 corpus blips = its calls;
  absent on miss/no-effect/heal/charge turns; supervisor fresh probe of
  Tackle-vs-Ghost reproduced, two runs identical) → key on the engine's
  `hit-animation` command with a visible target. The prompt pair is the
  action-prompt bounce pair (create two lowest-free at the prompt, destroy at
  commit; move-menu cancel/cursor no-op; party menu → invalidate). Intimidate
  entries run `B_ANIM_STATS_CHANGE` (`C[f]; D[n0]`) before the first prompt
  (12/12 replay exact). Confusion/Hail/trap end-turn animations need keys.

## 2026-10-04 (night) — H_BUFFER S1 folded: 151 live adapters

- Folded worker `8c5c734a9` as `5fd7ea33b` (src tree `c449f3775`): Mean Look,
  Smelling Salt (ad-hoc shadow retired), Defense Curl (animationCenter =
  battlePositionCenter + (0,6)), Ingrain, Wrap, Bind (shadow row +2, the first
  non-zero row; shared hook needs no change), Dragon Breath (ageOffset −2,
  85 rows, duration 83). Bind/Dragon Breath attackers are drawn without the
  front idle rest offset (ROM-exact on ONIX, rest x2=1). No palette plans.
- Supervisor dense: 14 fixtures + Ingrain/LILEEP, Mean Look/SABLEYE, Defense
  Curl/SANDSHREW (windows = alt activation + accepted offset, `altSpecies7.py`)
  twice fresh, 1,883 rows/run, zero residual. Routes 7/7 exact ON/OFF parity
  (Bind/Wrap prep seeds missed; re-picked hitting seeds, same carriers).
  Receipt `hbuffer-s1-supervisor-receipt.json`.
- Limits: Bind/Wrap end-of-turn trap animation (separate status body) not
  covered; Smelling Salt/Wrap/Bind/Dragon Breath proven on accepted species only.

## 2026-10-04 (night) — free-slot sprite-order provider: module + evidence

- `src/engine/spriteOrderProvider.ts` (design §4 slice 1, `4304d0fb5`): pure
  frozen `SpriteOrderState`; TS corpus replay 80,370/0 frames (2×40,185) and
  112/112 activation heads; `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` checked in all
  44 raw files; `knownEntrySpriteOrderState` replays the 78 entry sort windows.
  Not wired into any adapter yet.
- Ordinary Factory entry ROM-confirmed (`0ead026e7`,
  `docs/sprite-order-factory-entry.md`): canonical draft → battle 1
  (`traces-groundtruth/battle1-turn1.json`) plus an RNG-shifted variant (other
  opponent lead and first move), two byte-identical runs each (supervisor fresh
  rerun identical): same 78 windows, same first-action free order, allocator
  `ordinary-factory` occupants confirmed. Different player rentals and battle 2+
  are not covered.
- Body/gap order plans (`dc7cf6445`, `docs/sprite-order-body-plans.md`,
  reproduce `python3 tools/integration/spriteOrderBodyPlans.py --write`,
  supervisor rerun unchanged): 350 scenarios; live cells 216 EXACT-PLAN / 59
  NEEDS-KEYS / 13 not observed; 107 live ids exact both sides. Plan-only replay
  from the known entry: 659/659 edges exact (321 later actions). Ember,
  Flamethrower, Rock Throw, Dragon Rage, Shadow Punch bodies are EXACT; Blaze
  Kick, Mud Slap, Sand Attack, Grudge, Dive, Heal Bell, Perish Song, Leaf Blade
  bodies need live keys (usable as targets only). Battles with an entry ability
  animation (12 scenarios) start from a different order and must invalidate.
- Next: order-consumer measured prep (side lane), then the integration wiring
  step (provider in the live host + body/gap tables + first consumer).

## 2026-10-04 (evening 2) — prep2 batch folded: 144 live adapters

- Folded worker `773aca6f7` (tested code `ee469399c`, src tree `702752ac5`):
  Surf + Muddy Water (one branch), Icy Wind, Blizzard (anchor-derived
  effectGeometry), Fake Out (new `liveBattlerCoordAttrs`), Cosmic Power,
  Future Sight (turn-1 body), Explosion (displayed HP already 0). Shadow rows
  0 except Future Sight/Explosion (not in map); Blizzard and Cosmic Power
  ad-hoc shadows retired. No palette plans.
- Supervisor dense: 16 fixtures + Surf/SEALEO and Icy Wind/POLIWHIRL
  alternate species twice fresh, 3,620 rows/run, zero residual. Routes 7/7
  exact ON/OFF parity; Explosion route (worker) ends at the forced-replacement
  screen via new `allowStall` in generatedCommandAnimationReplay. Receipt
  `prep2-supervisor-receipt.json`.
- Limit: Icy Wind/Blizzard return the scene-off view when the reducer's
  retained particle slot table cannot verify the live geometry
  (`provableEffectOrder`); Blizzard live for ~90% of player-attacker and ~34%
  of opponent-attacker species pairs. Lifting it needs a reducer change.

## 2026-10-04 (evening 2) — H_BUFFER triage + measured prep (evidence only)

- `docs/h-buffer-triage.md` (static, 84 moves): 14 ready-now, order provider
  alone +5 (19 with ready), order+affine 27. Measured follow-up
  `docs/h-buffer-s1-prep.md` (176 production pins vs accepted): Dragon
  Breath, Defense Curl (animationCenter = battlePositionCenter + (0,6)),
  Ingrain (accepted species Cacturne), Mean Look, Smelling Salt, Bind (shadow
  row +2), Wrap READY with drafted `prep4-*` fixtures and routes; EMBER needs
  the sprite-order provider (117 equal-key pairs, 90 overlapping).
- `docs/next-adapters-prep5.md` (132 pins): Mist Ball, Aromatherapy (400/396
  by side), Follow Me, Metronome, Taunt, Belly Drum READY with `prep5-*`
  fixtures/routes; Heal Bell, Perish Song, Leaf Blade, Dragon Rage need the
  order provider. Metronome's called move is an ordinary second request.
- Next integration batch brief (not dispatched; user asked to wind down):
  Mean Look, Smelling Salt, Defense Curl, Ingrain (+LILEEP alt species),
  Wrap, Bind, Dragon Breath from `prep4-*`; then the six prep5 READY moves.

## 2026-10-04 (evening 2) — next5 folded: 136 live adapters

- Folded worker `172b4024b` as `4818dc692` (src tree `8a0b13c30`): Scary Face,
  Glare (eye points from `liveBattlerAnchors` + pic-coords height), Teeter Dance,
  Dizzy Punch (attacker personality threaded as presentation-only
  `BattleCommandFieldBattler.personality`, also on the battle-start field),
  Soft-Boiled (self-target; new optional `SceneOnSoftBoiledConfig.bystander`
  draws the displayed other-side battler instead of hard-coded Onix).
  Shadow rows 0 for Glare/Teeter Dance/Soft-Boiled; Scary Face (-4) and Dizzy
  Punch (-13) not in map. No palette plans (history invalidates).
- Supervisor dense: 10 fixtures + alt-species Scary Face/ARBOK and
  Glare/SEVIPER (source-derived windows, `altSpecies5.py`) twice fresh,
  2,229 rows/run, zero residual. Routes 4/4 exact ON/OFF parity (Scary Face
  14/[3]/0, Glare 1/[1]/7, Teeter Dance 49/[1]/0 and Dizzy Punch 49/[0]/0 with
  a player SPINDA). Soft-Boiled has no generated-rental carrier (dense only).
  Receipt `next5-supervisor-receipt.json`.
- Limits: Scary Face (14 frames) and Dizzy Punch (5) script tails beyond the
  accepted window are not covered; Soft-Boiled proven for Chansey only;
  a Transform-into-Spinda attacker would need `gTransformedPersonalities`
  (Transform histories already invalidate).
- Worker full suite had one failure (`battleCommandPresentation.test.ts`
  expected projection lacked `personality`); fixed test-only.

## 2026-10-04 (evening 2) — prep2 triage banked (evidence only)

- Side-lane `0b2044ec7` folded as `3699eb6ac` (new files only):
  `docs/next-adapters-prep2.md` triages the 33 unadapted H_BASIC/H_DERIVED
  moves: READY 11, small-input 12, blocked 10 (switch flow Baton Pass/Roar/
  Whirlwind; Sleep Talk called move; Substitute doll; Memento scanline; Spark
  order; Wish/Meteor Mash Random2; Extreme Speed age basis). Drafted
  `prep2-*` fixtures for the next batch (Surf, Muddy Water, Icy Wind,
  Blizzard, Fake Out, Explosion, Cosmic Power, Future Sight); activation
  receipt `docs/next-adapters-prep2-activation.json`. Supervisor re-measured
  Surf activation 72..215 fresh (matches).

## 2026-10-04 — next-adapters prep banked (evidence only)

- Side-lane prep `72ff8df29` folded (new files only): `docs/next-adapters-prep.md`
  and ten drafted fixtures `tools/integration/fixtures/next-*.json` for Dizzy
  Punch, Teeter Dance, Soft-Boiled, Scary Face, Glare (windows, activation,
  #142 shadow rows: Teeter Dance/Soft-Boiled/Glare 0; Dizzy Punch -13 and Scary
  Face -4 = no shadow). Inputs: personality must be threaded from
  `BattleScriptRulesBattlerState.personality` (only Spinda pixels depend on
  it); Soft-Boiled renderer hard-codes Onix and needs self-target support in
  the harness; eye centers derive from anchors + pic height for any species.
  Not yet framebuffer-verified.

## 2026-10-04 — visual-randomness prep banked (evidence only)

- Side-lane prep `d4356b7a1` folded (new files only):
  `docs/visual-randomness-prep.md`. Astonish, Double Kick, Thrash, Flail,
  Luster Purge, Mud Slap and Sand Attack draw only `Random2()` (gRng2Value;
  never gameplay RNG — Scene ON/OFF cannot desync gameplay); Dizzy Punch and
  Teeter Dance need only the attacker personality (exact now). gRng2Value's
  per-frame advance during Double Kick is empirical (caller not found) — open.
- Recommended next: Dizzy Punch + Teeter Dance (personality), Flail (power +
  2 words), then a presentation-only Random2 helper for the rest.

## 2026-10-04 — session wind-down: anchor4 folded, 131 live adapters

- Folded anchor4 `17e7a98f9` as `d935baca4` (src tree `3dc209a36`):
  Earthquake, Fissure, Crabhammer, Magical Leaf, Psybeam, Amnesia (idle x2 /
  picture size from live species; shadow rows 0; shifted-X static BG now fires
  the shared #142 hook). Supervisor dense 12 fixtures twice fresh, 2,228
  rows/run, zero residual; routes 6/6; scan 281 rows / 131 ids, 0 mismatches.
- Final production `d935baca4`: adapters 131, accepted 276, remaining 145.
  Supervisor final full 1,493 files / 11,963 tests, build 847
  (`final-supervisor-gates-20261004.json`). Preview serves `d935baca4`; four
  exact canvas/PNG hashes, export, ON->OFF restart, no errors.
- Next (resume points, all with banked evidence): sprite-order provider
  slices (`docs/sprite-order-provider-design.md`); status-animation occupancy
  persistence; Reversal reducer change (needs the animation program);
  Soft-Boiled; Scary Face/Glare eye anchors; H_BUFFER/H_RANDOM/H_OUTCOME
  groups. No arbitrary-history framebuffer claim.

## 2026-10-04 — multi-hit per-hit adapters (125 live)

- Folded worker `ed4095683` (tested code `fb5b811f6`, src tree `c14cdb45a`):
  Double Slap, Comet Punch, Triple Kick, one body per hit with moveTurn from
  request.turn; staged-only draw cases ported to the live field; shadow row 0
  per hit. Adapters 125, remaining 151.
- Supervisor dense: all 21 per-hit fixtures twice fresh, 759 rows/run, zero
  residual. Routes: Double Slap 4 and 3 hits, Comet Punch 3 hits; Triple Kick
  has no generated-rental carrier (dense only). Comet Punch's target anchor
  was found by a y sweep then tied to the reducer's own opponent offset;
  accepted on the exact ROM proof. Receipt `multihit-supervisor-receipt.json`.

## 2026-10-04 — ISSUES #142 fixed: elevated-opponent shadow + Sandstorm idle

- Folded worker `39675dec0` as `5cbc09758` (tested code `68ff5b22e`, src tree
  `399bfc94a`): `liveMoveOpponentShadowRow` names the live row for the 88 ids
  whose accepted window starts at script activation; the live view arms one
  shadow draw consumed by the battle-background paths (behind battlers and
  effects); ad-hoc age-0 draws removed (Hyper Fang, Swagger, Bulk Up no longer
  draw it); Sandstorm's live opponent keeps its idle rest offset. Staged output
  unchanged. ISSUES #142 deleted.
- Supervisor: row scan rerun 248 rows / 122 ids, 0 mismatches; dense 14
  alternate-species/elevated fixtures twice fresh, zero residual (five 200-px
  row-0 cases and Sandstorm/Onix 180,304 px now exact; controls stay exact).
  Supersonic fixtures unverifiable: its probe wrapper fails on master too.
- Gates: supervisor focused 140 + smoke 448; worker full 1,491 files /
  11,933 tests, build, typecheck reused. Receipt
  `issue142-fix-supervisor-receipt.json`.

## 2026-10-04 — Reversal shake evidence banked

- Side-lane evidence `8fbf3a7ab` folded (new files only):
  `docs/reversal-shake-evidence.md`, receipt
  `tools/integration/fixtures/reversal-shake-evidence.json`. Power 20/40/80/
  100/150/200, both sides, twice fresh: x2 = +ceil(A/2), -floor(A/2) toggling
  every 2 frames (7 visible toggles), A = clamp(gAnimMovePower/12, 1, 16) from
  the dynamic HP power; accepted reducer `reversal.ts` (A/0) exact only at A=1.
- Resume: change the reducer's toggle, add A>1 tests from this receipt, then
  wire Reversal live with amplitude from request.power. Caveat: HP was lowered
  by Super Fang from a non-learner (Chansey); the shake depends only on power.

## 2026-10-04 — multi-hit adapter prep banked

- Side-lane prep `797174269` folded (new files only): `docs/multihit-prep.md`,
  per-hit evidence and 21 drafted fixtures
  `tools/integration/fixtures/multihit-<move>-<side>-hit<i>.json` for Double
  Slap (34 rows/hit), Comet Punch (37), Triple Kick (37), both sides; each hit
  window starts at its own activation; request.turn = hit index; hits >= 1
  show a blank message box; target x2 0 after hit 0.
- Resume: port the three staged-only draw cases (battleScene.ts Comet Punch,
  Double Slap, Triple Kick) to liveField like Fury Swipes, wire moveTurn from
  request.turn, run the drafted fixtures. Not yet framebuffer-verified.

## 2026-10-04 — selectors batch: four request-selector adapters (122 live)

- Folded worker `e6d6c056f` (tested code `786a17110`, src tree `379f96d40`):
  Solar Beam (turn bit 0), Present (damage > 0), Moonlight (healing anchor),
  Whirlpool main body. Adapters 122, remaining 154. Harness gained
  requestFields/denseSegments/messageLines.
- Dropped with blockers: Reversal (source shake +ceil/-floor of
  clamp(power/12) vs accepted reducer A/0), Soft-Boiled (hard-coded Onix
  corners), Double Slap/Comet Punch/Triple Kick (request.turn maps; per-hit
  dense windows not built).
- Supervisor dense: twelve fixtures + three older regression fixtures through
  the new harness, twice fresh, 2,737 rows/run, zero residual; routes 4/4 incl.
  both Solar Beam bodies and both Present branches. Worker full 1,490 files /
  11,900 tests reused. Receipt `selectors-supervisor-receipt.json`.

## 2026-10-04 — #142 per-move shadow-row table banked

- Side-lane evidence `9de65cf17` folded (new files only):
  `tools/integration/fixtures/issue142-shadow-rows.json`, doc
  `docs/issue142-shadow-rows.md`, resolver/probe scripts. 236 rows (118 live
  ids x 2 orientations) from accepted window starts vs probed/audited
  activation frames; every in-window row is live row 0.
- needsFix 70 ids (128 rows); wronglyDrawn 3 ids (Hyper Fang, Swagger, Bulk
  Up draw the shadow although their windows start 4/7/4 frames after
  activation); alreadyCorrect 26; notInWindow 34. Cross-checks 15/15 against
  the source-derived alternate-species proofs; supervisor spot-check of Body
  Slam (offset 0) and Toxic/Swagger (+7) agrees.
- The #142 fix step implements this table (queued after the selectors batch).

## 2026-10-04 — altspecies3: source-derived windows refine #142

- Side-lane evidence `4e720e41b` folded as `d2530865a` (new files only): all
  16 alternate-species cases re-derived from the source activation frame,
  twice fresh. Five reliable #142 fixtures (200 px at row 0): Body Slam,
  Mega Punch, Reflect, Brick Break (shattered wall), Night Shade; eleven exact
  controls. Brick Break/Haunter and Night Shade/Golbat residuals were staging
  artifacts (missing body selector; HP digits). Tail variance of 1 frame in
  `Task_FadeToBg` (Night Shade, Shadow Ball) is ROM behaviour not yet modelled.
- Refinement: the shadow belongs to the activation frame; only moves whose
  accepted window starts at activation (offset 0) need it on row 0. ISSUES
  #142 and the fix brief updated to a per-move offset rule.

## 2026-10-04 — altspecies2 BEFORE set (partial) for #142

- Side-lane evidence `79719cc3b` folded as `8429e7b24` (new files only): 16
  alternate-species cases on older adapters, twice fresh. Reliable #142
  acceptance: Body Slam/Golbat and Mega Punch/Magneton (200 px at age 0),
  Brick Break/Haunter row 0. Window starts for the rest came from a biased
  live-match finder; two unattributed residual families (Brick Break vs
  Haunter ages 23-191 ~2,587 px/row; Night Shade vs Golbat 59 px/row).
- Follow-up running (side lane): re-derive starts from the source activation
  frame and attribute both families.

## 2026-10-04 — anchor3 batch (118 live), net-zero list 110, #142 scoped

- Folded anchor3 `02d753d84` as `6faa70568` (src tree `dabce926b`): Endure,
  Focus Energy, Facade, Minimize, Thunder, Thunder Wave, Swagger, Bulk Up
  (fields mapped from `liveBattlerAnchors`; row-0 shadow and opponent idle
  applied in these branches). Rung 0 widened the audited net-zero list to all
  110 then-live ids: Light Screen now exact after Bubble Beam/Acid, Mirror Coat
  after Bubble Beam. Adapters 118, remaining 158.
- Supervisor: dense 16 fixtures twice fresh, 2,250 rows/run, zero residual;
  routes 8/8 and eligibility 5/5. Worker full gate had one expected route
  failure (fixed test-only), so the supervisor ran a fresh full suite and build
  on `6faa70568`: 1,489 files / 11,884 tests passed, build 847 modules.
  Receipt `anchor3-supervisor-receipt.json`.
- #142 scope scan folded (`760b0cb04`): 101/110 live ids miss the elevated
  row-0 shadow as target, 89 as attacker; draw order says insert right after
  the battle background. Fix step queued after the selectors batch.

## 2026-10-04 — alternate-species dense proofs confirm ISSUES #142

- Side-lane evidence `6a018f986` folded (new files only): twelve alternate-
  species cases (elevated Golbat/Magneton/Haunter/Koffing/Jumpluff opponents;
  Onix/Rattata opponent attackers), each twice fresh with identical source
  digests. Receipt `altspecies-live-evidence.json`; doc
  `docs/altspecies-live-evidence.md`.
- CONFIRMED: elevated-opponent shadow missing on row 0 (200 px) for Mud Shot,
  Flame Wheel, Heat Wave, Block, Torment, Detect; Sandstorm opponent-attacker
  Onix idle x2 missing. Acid, Synthesis, Hyper Fang/Rattata correct. Filed
  as ISSUES #142 with fix shape and acceptance; fix step queued.

## 2026-10-04 — allocator history persists across audited net-zero bodies

- Folded worker `da5965fc2` (src tree `8566da639`): 90 audited net-zero live
  ids without a plan now leave a known sprite-allocator host unchanged, so
  Light Screen and the wall family use their exact adapters after audited
  bodies, not only as the first body. Licensed by the net-zero audit plus the
  consumer tie audit (six consumers only). Palette history unchanged; status,
  switch and summary still invalidate.
- Supervisor eligibility routes 17/17: adapter after Crunch+Rest (Protect),
  Spite and Screech (Light Screen); fallback after unaudited Bubble Beam,
  status animations, a faint + switch-in, or non-live moves.
- Gates: supervisor focused 56 + smoke 448; worker full 1,488 files/11,858
  tests, build, typecheck reused. Receipt
  `allocator-history-persistence-supervisor-receipt.json`.
- Follow-ups: widen the list to the extension's 110 ids; status-animation rung
  was skipped (worker misread source availability) though the status audit
  supports occupancy persistence across the nine scripts.

## 2026-10-04 — read-only day audit of today's 31 adapters

- Read-only audit (no edits): no confirmed defect. Certified: duration/side
  symmetry for all 31 ids (only Mud Shot 145/144 and Block 141/146 asymmetric,
  both handled), view-age offsets vs anchors, allocator plan table vs receipts,
  target-idle x2 windows are script timing (species-independent; only the x2
  value is species-specific and uses the rest offset), shared helpers.
- Suspects being decided by alternate-species dense proofs (side lane):
  (1) elevated-opponent enemy shadow on a body's first displayed row is drawn
  only in a few branches and only for opponent attackers; (2) opponent-
  attacker front idle rest offset (ONIX/RATTATA only) missing in ~10 new
  branches; (3) Castform/Unown y-delta special cases in anchors; (4) Detect's
  skipped first opponent row. Block keys on attacker vs source target side:
  equal in singles.

## 2026-10-04 — net-zero audit extended to all 110 live ids

- Side-lane evidence `fa3cefa22` folded (new files only): receipt
  `tools/integration/fixtures/allocator-net-zero-audit-ext.json` (with a
  `combined` section), doc `docs/allocator-net-zero-audit-ext.md`, new staged
  scenarios for Twineedle, Bite, Hyper Fang, Super Fang and Shadow Punch.
- 20 new rows (anchor + anchor2 batches, the five previously unaudited ids,
  Fury Swipes opponent), twice fresh, all net-zero; combined 110/110 live ids
  net-zero, none uncovered. Supervisor rerun of both Bite rows identical.
- The in-flight history-persistence worker pins against the original receipt;
  widening its constant to the combined list is a follow-up.

## 2026-10-04 — anchor2 batch: seven picture-anchor adapters (110 live)

- Folded worker `66952b8fb` (tested code `26b46eff4`, src tree `08b2ac222`):
  Bubble Beam, Hydro Pump, Mud Shot, Cross Chop, Detect, Tail Glow, Torment.
  Adapters 110, remaining 166. No palette plans.
- Reversal dropped: `resolvedShake` comes from
  AnimTask_ShakeTargetBasedOnMovePowerOrDmg. Resume: derive it from the live
  request's power/damage (ordinary requests carry them, e.g. power 60/dmg 47).
- Supervisor dense proof: fourteen fixtures twice fresh, 2,204 rows/run, zero
  residual. Routes PASS for all seven. Target idle-x2 age windows come from
  Onix captures (value uses the species rest offset; unverified elsewhere).
- Gates: supervisor focused 78 + smoke 448; worker full 1,488 files/11,854
  tests, build, typecheck reused. Receipt `anchor2-supervisor-receipt.json`.

## 2026-10-04 — allocator-consumer draw-order tie audit banked

- Side-lane evidence `d5a781ef9` folded (new files only): receipt
  `tools/integration/fixtures/allocator-consumer-tie-audit.json`, doc
  `docs/allocator-consumer-tie-audit.md`, probe and 44 staged scenarios.
- 54 consumer x scenario rows (~5,200 window frames, twice fresh, identical):
  no visible wall/sparkle/shield sprite ever shares a SortSprites key with any
  other visible sprite, so draw order is key-determined; later-body emission
  order showed no inversions although free-slot order differed. Supervisor
  rerun of Light Screen opponent after Toxic + poison status: identical.
- Thin coverage: Protect later bodies only after Protect; Reflect and Magic
  Coat later bodies player side only. Licenses treating free-slot order as
  irrelevant for these six consumers in Factory L50 singles layouts only.

## 2026-10-04 — wall family live with source allocator plans (103 live)

- Folded worker `5b992edaa` (tested code `c09bcf141`, src tree `ea6ba1893`):
  plan table in `prepareLiveMoveSpriteAllocator` (112/113/115/182/243/277)
  and live renderers for Barrier, Magic Coat, Protect, Reflect, Mirror Coat.
  Adapters 103, remaining 173. Live offsets from each view's anchor:
  Barrier/Magic Coat/Protect 0 (anchor at activation), Reflect/Mirror Coat 7.
- Supervisor dense proof: ten wall fixtures + Light Screen regression twice
  fresh, 1,056 rows/run, zero residual (Light Screen digests unchanged).
  Eligibility routes 17/17: adapter as first body, bounded fallback after an
  unproved body; Mirror Coat can only fall back (never a first body).
- Gates: supervisor focused 52 + smoke 448; worker full 1,487 files/11,832
  tests, build, typecheck reused. Receipt `wall-supervisor-receipt.json`.
- Open: sparkle paint follows plan-slot order; free-slot sSpriteOrder is
  history-dependent, so persisting allocator history past earlier bodies first
  needs proof that consumers are independent of free-slot ties (or the
  sprite-order provider).

## 2026-10-04 — status-animation sprite audit banked

- Side-lane evidence `9f6dad6a6` folded (new files only): receipt
  `tools/integration/fixtures/status-animation-sprite-audit.json`, doc
  `docs/status-animation-sprite-audit.md`, probe/batch/receipt tools.
- Poison, Confusion, Burn, Infatuation, Sleep, Paralysis, Freeze, Curse and
  Nightmare (59 windows, both sides, twice fresh): all OBJ-net-zero; each has a
  fixed create/destroy stream (lowest free slot); sprite-order model exact on
  every frame. B_ANIM_STATUS_WRAPPED does not exist; Wrap/Bind/Fire Spin play
  B_ANIM_TURN_TRAP (not a `status-animation` event) and are also net-zero.
  Supervisor fresh rerun of Confusion-by-opponent identical after trimming.
- Effects a production rule must model: free-slot order is permuted by each
  status's stream (apply it, do not treat as no-op); bank-7 unfaded OBJ palette
  is rewritten and left stale for Burn/Confusion/Curse/Nightmare/Infatuation/
  Sleep/trap, so palette consumers of bank 7 still need invalidation.
- Resume: allocator occupancy can stay known across these status windows;
  sprite order needs the per-status stream; palette stays invalidated.

## 2026-10-04 — sprite-order free-slot event model + provider design banked

- Side-lane evidence/design `5f5680b46` folded (new files only):
  `docs/sprite-order-provider-design.md`, model
  `tools/integration/spriteOrderEventModel.py`, receipt
  `tools/integration/fixtures/sprite-order-event-model.json`, raw and probes.
- Source rule (sprite.c SortSprites :372-460 is a full stable insertion sort;
  DestroySprite/ResetSprite give the max key): a destroyed slot goes to the
  head of the free order; same-sort-window destroys keep previous array order;
  CreateSprite just removes its slot. Model exact on 40,185/40,185 twice-fresh
  frames (22 scenarios) and 373,837/373,837 single-run frames (221 scenarios).
  Supervisor reran the model on committed raw and a fresh Blaze Kick probe:
  identical.
- 39/56 move activations need no live keys; 17 (multi-sprite bodies destroyed
  together, e.g. player-first Flamethrower/Blaze Kick, later Dive/Grudge) need a
  live-key tracker. Slice plan (design doc §4): pure SpriteOrderState module ->
  known-entry wiring -> prior single-sprite bodies -> live-key tracker -> one
  adapter per slice (Mud Slap, Sand Attack, Rock Throw, Grudge, Dive, ...).

## 2026-10-04 — sSpriteOrder evidence banked (no provider yet)

- Side-lane evidence `5c7d4612f` folded (new files only): probe, batch runner,
  analyzer, `tools/integration/fixtures/sprite-order-evidence.json`, doc
  `docs/sprite-order-evidence.md`. 251 bodies / 110 moves, both runs identical;
  supervisor rerun of Flamethrower player identical.
- Verdict: occupied-slot order is a fresh sort of known keys, and effect slots
  always sort behind them, but the order AMONG free (effect) slots is leftover
  history (dummy-key ties; e.g. slots 3/4 swap with the number of prior
  actions). Not derivable from known-entry occupants (best model 126/251).
- A persistent 64-entry order array reset at battle entry and advanced by one
  source SortSprites pass per frame reproduces 36,640/36,903 window frames and
  every activation-1 frame; 8 of 10 accepted seeds match activation-1 exactly
  (Mud Slap matches at its first-allocation frame).
- Resume condition for ~19 order-needing moves (Flamethrower, Blaze Kick,
  Dive, Grudge, Aurora Beam, Hyper Beam, Tri Attack, Water Spout, Rock Throw,
  Mud Slap, Sand Attack, Mega Drain, Dream Eater, Giga Drain, Sunny Day,
  Uproar, Magnitude, Pursuit, Rapid Spin): a production per-frame sprite-key
  tracker (all live sprites incl. transient send-out/healthbox/shadow), which
  is a new provider design. Not started.

## 2026-10-04 — anchor batch: battler-anchor helper + seven adapters (98 live)

- Folded worker `99f9935f9` (tested code `9a3e45f0f`, src tree `bcc9f0d2c`):
  `liveBattlerAnchors` (raw source anchors, pinned on 14 fixtures) and Acid,
  Sludge, Sludge Bomb, Water Gun, Harden, Iron Defense, Metal Claw. Adapters
  98, remaining 178. No palette plans.
- MetallicShine bodies (Harden/Iron Defense/Metal Claw) render view age = live
  age - 1: accepted windows start one frame before the task's age 0
  (convention alignment, not a fit; controller timing remains unclaimed).
- Supervisor dense proof: fourteen fixtures twice fresh, 1,692 rows/run, zero
  residual. Routes PASS for all seven. Repeat routes that end in a player
  faint stop at the forced-replacement screen, which
  `generatedCommandAnimationReplay` does not drive (tool limit; also OFF and
  on master) — single-decision routes used.
- Gates: supervisor focused 80 + smoke 448; worker full 1,486 files/11,810
  tests, build, typecheck reused. Receipt `anchor-supervisor-receipt.json`.
- Next: wall-family adapters with source plans; remaining anchor groups
  (picture offsets, coords, heights, effect centers, initial x2).

## 2026-10-04 — sprite-allocator net-zero audit banked

- Side-lane evidence `eee899bee` folded (new files only): probe
  `tools/compare/allocatorNetZeroProbe.py`, batch/manifest/receipt tools,
  receipt `tools/integration/fixtures/allocator-net-zero-audit.json`, doc
  `docs/allocator-net-zero-audit.md`. Production unchanged.
- 91 ids net-zero (86 live adapters plus the five wall moves), 0 not net-zero;
  every body starts and ends at `[0,1,2,6,8,60,61,62,63]`; 203 scenario pairs
  identical across fresh runs; Light Screen/wall calibration reproduced.
  Supervisor reruns of Razor Leaf, Brick Break and Light Screen identical.
- Not audited: Twineedle, Bite, Hyper Fang, Super Fang (fixtures reuse the
  Poison Fang scenario, move never activates) and Shadow Punch (no fixture).
  Fury Swipes player side only. Slot 3 reappears after many bodies as the next
  animation or the damage healthbox hit effect; outside the move script.
- Scope: Scene ON, scenario-specific; status/stat/switch/summary animations not
  covered and still invalidate.

## 2026-10-04 — wall-family source allocator evidence banked

- Side-lane evidence `0014e69f7` folded as `523265bc5` (new files only):
  generic wall-family clock/allocator-call probes, scenarios, five receipts
  `wall-family-<move>-source-receipt.json`, doc
  `docs/wall-family-allocator-evidence.md`. Production unchanged.
- Both orientations twice fresh, raw pairs identical; supervisor fresh reruns of
  Reflect player and Mirror Coat opponent byte-identical. Live offsets: Reflect,
  Mirror Coat, Protect 7; Barrier, Magic Coat 4. Wall slot 3 throughout.
  Reflect sparkles slots 4/5/4 (life 15); Mirror Coat matches Light Screen's
  six-sparkle cycle 4/5/7 (last two live 22). Every move ends net-zero against
  baseline `[0,1,2,6,8,60,61,62,63]`.
- Mirror Coat can never be a first body (priority -5, needs a prior special
  hit): under first-body eligibility it stays bounded fallback. Barrier's
  accepted fixtures are not first-body; new scenarios cover that.
- Next: wall-family adapters with source plans, and an audited net-zero rule so
  audited moves keep allocator history known.

## 2026-10-04 — glow batch: five live adapters (91 live)

- Folded worker `98348602f` (tested code `394aa629a`, src tree `f14e250a1`):
  Synthesis, Milk Drink, Flash, Role Play, Spite. Adapters 91, remaining 185.
  No palette plans; history invalidates after each body.
- Role Play's silhouette now adds the target species' picture y-offset in the
  attacker's orientation (source `CreateAdditionalMonSpriteForMoveAnim`,
  supervisor-checked). Spite uses the source enemy shadow. The framebuffer
  harness passes start frames to the Synthesis/Milk Drink probes.
- Supervisor dense proof: ten fixtures twice fresh, 1,496 rows/run, zero
  residual. Ordinary routes PASS (Synthesis after a damaging turn, Spite after
  a prior move, Flash repeated, Role Play on an independent seed).
- Gates: supervisor focused 57 + smoke 448; worker full 1,485 files/11,787
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/glow-supervisor-receipt.json`.
- Next: battler-anchor helper batch; wall-family source allocator evidence is
  being banked in parallel (side lane, new files only).

## 2026-10-04 — fieldfx batch: six live adapters (86 live)

- Folded `08ccbcaf9` (worker `7dec4734b`, tested code `caaab87a4`, src tree
  `e45fc575d`): Flame Wheel, Fire Spin, Heat Wave, Sandstorm, Sonic Boom,
  Block. Adapters 86, accepted 276, remaining 190. No palette plans added.
- Sonic Boom's live target idle now uses the species rest offset and the
  source enemy shadow; staged output unchanged. Block duration is per side
  (141/146). Fire Spin's live window is the accepted 104 rows.
- Supervisor dense proof: twelve fixtures twice fresh, 1,611 rows/run, zero
  residual. Ordinary routes PASS for all six (Flame Wheel, Sandstorm and Block
  with repeats); Sandstorm's first-found seed 18 is a legitimate no-body route
  (user immobilized by Attract).
- Gates: supervisor focused 40 + smoke 448; worker full 1,484 files/11,776
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/fieldfx-supervisor-receipt.json`.
- Next: glow batch (Synthesis, Milk Drink, Flash, Role Play, Spite), then the
  battler-anchor helper with seven projectile/sprite-center moves.

## 2026-10-04 — Light Screen live adapter folded with history guard repaired

- Production `a5d52f2fe` (src tree `b24b89ddbdeffb5e3b3cf19e7091e478537f0ef3`);
  adapters 80, accepted 276, remaining 196. Fast-forward of the repair worker.
- Repair `306b5adf1`: every move animation now passes the allocator seam, so
  only the audited Light Screen plan keeps history known. The withheld
  candidate's three commits were cherry-picked unchanged.
- Supervisor eligibility check (`.codex-logs/verify-ls-eligibility.mjs`) PASS
  7/7: adapter on seeds 2/45/59/114 [3,3] and opponent first body seed 16;
  bounded fallback after unproved 185/318/209 (seeds 27/84, 2 [0,3]). All
  routes: 88 ages, full text, success and repeat failure, action-menu, ON/OFF
  rules/RNG/boundaries equal (scene bit only). Candidate fails the same check.
- Dense source: independent 3 cases twice fresh, 264 rows/run, zero residual,
  digests identical to the worker and the candidate.
- Gates: supervisor affected 6 files/47 tests, smoke 448; worker full
  1,483 files/11,763 tests, build 847, typecheck — reused on clean fast-forward.
  Receipt `tools/integration/fixtures/light-screen-guard-supervisor-receipt.json`.
- Preview <http://127.0.0.1:5191/> serves `28d5be550` (847 modules): four
  canvas/PNG hashes identical to `e3f60734c`, export, ON-to-OFF restart, no
  errors. `playable-preview-28d5be550-receipt.json`.
- Next: bounded H_BASIC adapter batches (Flame Wheel, Fire Spin, Heat Wave,
  Sandstorm, Sonic Boom, Block; then Synthesis, Milk Drink, Flash, Role Play,
  Spite). Light Screen after other bodies stays bounded fallback until more
  allocator plans exist.

## 2026-10-03 — known-entry sprite allocator provider verified

- Production helper `277834353`, tested tree `02b775a5d988d6884c722a48829c8b01931c8e64`;
  adapters79, accepted276, remaining197. No move adapter promoted.
- `createKnownEntrySpriteAllocatorProvider(route)` returns commandPrompt and
  cursor-free firstMove hosts from ported source operations; semantic owners
  distinguish mutable templates. Exact in-frame summary/ball destruction and
  reuse traced, first/end allocator returns verified. No captured slot recipe.
- Supervisor six fresh direct-mGBA runs: both Exeggcute sides twice (82 calls
  each), complete Slowpoke twice (84 each), raw pairs identical. Canonical
  ordinary-input first prompt agrees at1886; detailed call order is the Lab proof.
- Receipt `tools/integration/fixtures/known-entry-sprite-allocator-supervisor-receipt.json`;
  raw `.integration/validation/known-entry-provider-supervisor-9f98134ea/`.
  Worker exploratory/failure and final folders copied to primary; ref/logs kept.
- Gates: independent14files/476smoke+affected; worker FINAL277834353 full
  1,483files/11,761tests (223skipped), build844; scoped source/coverage/audit/diff pass.
  Clean fast-forward reuses same-code full/build under verification contract.
- Preview: <http://127.0.0.1:5191/> serves `e3f60734c`; ordinary input, four
  exact canvas/saved PNG hashes, export, ON-to-OFF restart and no page errors.
  `playable-preview-e3f60734c-receipt.json`; no adapter/source-body credit added.
- Next: immediate provider consumer is Light Screen. Correct activation/wall
  clock and text ownership; dense full script-load/body/cleanup/following display
  bilateral twice and Slowpoke complete; ordinary repeats/prompts and full mode
  parity. Old `d12db7f0b` stays unmerged and uncounted. Later history remains
  unknown; this helper adds no arbitrary-history framebuffer claim.

## 2026-10-03 — exact allocator lifecycle source checkpoint

- Accepted tooling `f9bdab222`; production unchanged at `695e10751`, src tree
  `a5ceb566190019a2cbdd29ea24c9c88318374664`. Adapters79, remaining197.
- Independent six fresh direct-mGBA runs: both Exeggcute orientations twice
  and Slowpoke twice, raw pairs identical. Player activation/cleanup303/388,
  opponent213/298, Slowpoke306/391. Wall3, sparkle4/5/7/4/5/7.
- Source reset, healthbox, shadow, intro/tray/sendout and command-cursor
  destruction observed. VBlank deltas coalesce same-frame free/create calls;
  no runtime recipe, adapter or complete displayed-frame acceptance.
- Receipt: `tools/integration/fixtures/light-screen-allocator-supervisor-receipt.json`;
  raw `.integration/validation/light-screen-allocator-supervisor-f9bdab222/`.
  All worker pass/failure folders copied to primary before cleanup; refs/logs kept.
- Gates: independent source6/6, focused19/19, Python compile; unchanged
  boundary/inventory, coverage/audit/source-audit/diff pass. Prior final pair reused.
- Next: instrument exact in-frame allocator calls and map source callers;
  implement bounded known-entry provider, then fix Light Screen live activation
  clock and completed text, prove full body/cleanup/following display twice
  bilateral plus complete Slowpoke. Candidate `d12db7f0b` stays unmerged.
- Correction: worker attributed Slowpoke +3 to a longer name. Name is shorter;
  causal attribution is not accepted. No deferred material decision.

## 2026-10-03 — Continuation uses the main roadmap

- Setup: integration is S10A in `ROADMAP.md`; normal `./run-supervisor.sh` reads
  the current roadmap instead of a hardcoded mechanics mission. The previous
  supervisor integration flag remains an alias; worker contracts are unchanged.
- Checks: shell syntax, 73 affected tests, boundary/inventory, coverage/audit
  and diff checks pass. Production is unchanged; the final session receipt and
  next Light Screen step below remain the current implementation checkpoint.
- Run mode: default interactive terminal; optional `--headless` streams output
  and keeps logs without the chat interface. Both use Sol 6.1/high and the same
  worker routing/cap. No new supervisor session started for this setup change.





## 2026-10-02 — local integration session wind-down; 79 verified adapters

- State: all14 recovered physical adapters accepted (65→79); eight palette
  plans added (58total,57/79live), actual status-event guard and known-entry
  party/B-cancel return provider accepted. Factory276/277, remaining197,
  whole-playable exact0. Production `695e10751`, src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
- Source: Burn tooling `78c85cb3e` independently verified bilateral twice,
  twelve Small Ember bank7 load/free lifetimes38ticks, real Shadow scratch9.
  Confusion non-Shadow Lick control also passes4fresh runs/eight lifetimes.
  Semantic subject is script attacker/target; transient activeBattler2 is
  bookkeeping. No status provider promoted; all actual status history unknown.
- Gates: final independent1,482files /11,754tests pass (223skipped), build844;
  full ON/OFF rules/RNG at eleven actual draft boundaries equal (scene bit
  only excluded). Last source tools pass verifier, boundary/inventory9,
  coverage/audit/source-audit/diff; no production change since final full pair.
- Evidence: `final-supervisor-gates-20261002.json`, Burn/Confusion-Lick source
  supervisor receipts. All refs/logs and fresh pass/failure raw evidence kept
  in primary; no temporary worker worktrees or active workers. No material
  choice deferred. Preview currently verified `4815edf58`; final refresh follows.
- Next: Light Screen `d12db7f0b` remains unmerged. Derive intro/sendout/summary
  allocator ownership; actual clock303..388(player)/213..298(opponent), preserve
  completed text and extend full framebuffer proof through cleanup/following
  display, both sides twice and complete Slowpoke. See clock/review receipts.
  Then source-owned semantic status provider may use audited Duck/Small Ember
  resources with event subject/priority, lifecycle and real follow-up proof.
  Unknown entry/switch/summary/substitute/transform ownership stays open;
  keep outcomes/RNG/damage/order/progression intact. Factory/Rust not dispatched.

## 2026-10-02 — Light Screen source clock separated from prior controller text

- State: source/tool `c3ccc8cd3` accepted; runtime `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Candidate `d12db7f0b` remains unmerged; no source allocator recipe claimed.
- Proof: independent bilateral twice-fresh source clock, reference/tool/source
  hashes pinned. Player printer269..296, script303, loads304/307, wall310,
  cleanup388; opponent175..206, script213, loads214/217, wall220, cleanup298.
  Old currentMove-selected image windows include prior text and end early.
- Resume: derive intro/sendout/summary creation/destruction and slot ownership;
  use actual controller activation without reprinting completed attack text;
  extend dense framebuffer proof through actual script cleanup/following
  display, including complete alternate Slowpoke, then real command/parity.
  `light-screen-clock-supervisor-receipt.json` and withheld review retain limits.
- Gates: source4runs, Python compile, boundary/inventory9, coverage/audit/diff
  passed. Independent final1,482files /11,754tests and build844 remain valid
  on unchanged production. Full rules/RNG draft parity at all11boundaries
  reconfirmed; generated pixels identical to the verified browser artifacts.
- Preview: <http://127.0.0.1:5191/> serves verified `4815edf58`, eleven exact
  canvas/PNG samples, exports/restarts and no errors. Accepted worktrees
  retired after all fresh pass/failure evidence preservation; refs/logs kept.
- Next: bounded burn-status source witness if deadline permits, then clean
  final handoff. Actual status histories remain unknown. No material decision
  deferred; do not dispatch Factory acceptance or Rust work.

## 2026-10-02 — confusion source checkpoint and independent final production gates

- State: accepted tooling/source `8aefa52bb`; production `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Actual status graphics remain unknown; no palette provider promoted.
- Source: supervisor four fresh legal Golbat/Haunter runs, bilateral twice:
  eight Status_Confusion lifetimes, DUCK bank7 load/free after99ticks, affected
  attacker/target, real following Shadow Punch scratch9/faded dependency.
  Reference ROM/ELF/map and tool/source hashes retained. Source-only claim.
- Gates: independent final full1,482files /11,754tests pass (223skipped),
  build844; unchanged src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
  Source checkpoint verifier, boundary/inventory9, coverage/audit/diff pass.
  `final-supervisor-gates-20261002.json`, `status-confusion-supervisor-receipt.json`.
- Preview: <http://127.0.0.1:5191/> refreshed at `4815edf58`; eleven exact
  canvas/PNG samples, ordinary party-cancel and Razor Leaf routes, eleven
  full ON/OFF rules/RNG boundaries, exports/restarts and no browser errors.
  `playable-preview-4815edf58-receipt.json`. Retired worker worktrees removed;
  refs/logs and all fresh pass/failure raw evidence preserved in primary.
- Next: bounded Light Screen source load/text-clock audit, then handoff.
  Light Screen candidate stays unmerged; do not register Reflect by copying
  its allocator. Future confusion provider requires a semantic event lifecycle,
  source allocator and non-Shadow follow-up proof. No material choice deferred.
