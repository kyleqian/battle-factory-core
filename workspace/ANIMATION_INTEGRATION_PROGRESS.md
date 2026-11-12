# Animation integration progress

## 2026-10-23 (later) — CAX31: lsd198 / lsd199 drain animation, sst200, fnt201 + hpb202, tl204 folded

- **lsd198 + lsd199 (INTEGRATION, merged `5021eb05e`):** Scene ON LEECH_SEED_DRAIN draws Move_ABSORB's body through the live ABSORB
  adapter (seed owner = attacker, seeded = target, body age = command age - 21). lsd199 (Opus) named the last row: the general-animation
  script is task-hosted (Task_ClearBitWhenBattleTableAnimDone, priority 10), so AnimTask_ShakeMon's creation state (y2 +5) reaches
  Task_UpdateMonBg one pass early (InsertTask order); RAM probes both orientations. Supervisor: fresh `lsd198Probes.sh` r1 == r2, dense
  446 / 446 and 437 / 437 rows 0 px (animation span 218 / 218 each); ordinary Absorb render digests unchanged at every age.
  Union gates: typecheck (after a `findLast` fix), census both scenes identical, differential 641 / 641, suite 13,983 / 0 (one lost
  vitest fork, its file rerun 9 / 9), build.
- **sst200 (evidence, merged `7786505c9`):** second-stat rows vs ROM, 26 twice-fresh cases both scenes residual 0 (Tickle, Memento,
  Superpower, Silver Wind, AncientPower, Calm Mind, Dragon Dance, Cosmic Power, Curse, foe sides). Found the faint gap below.
- **fnt201 + hpb202 + rep203 (merged `54a1e35de`):** fnt201: every faint route lacked BattleScript_FaintTarget / FaintAttacker's
  `playfaintcry` + `pause B_WAIT_TIME_LONG` + `dofaintanimation` rows (66) and the pre-cry rows; player slide length from the back-pic
  y_offset; the `cleareffectsonfaint` status 1 row in both scenes (was 32 in ON). 16 / 16 route x scene cases 0 (ordinary KO both
  sides, Self-Destruct, Memento, Sandstorm / Toxic). hpb202: `CalcNewBarValue`'s Q24.8 path ported (maxHp < 48): a SHEDINJA (rental
  set 21) KO threw `did not converge 1->0/1` in ordinary play; fixed, Shedinja KO 0 px both scenes / sides; the census "invalid HP
  program" throws were a harness stale-field bug (fixed). rep203 re-pinned 12 attributed frame pins. Gates: docs/fnt201-faint-timing.md.
- **tl204 (evidence, merged `bccd97904`):** Scene ON zero-tail live bodies vs ROM, 10 moves: the next print is early -1 .. -39
  (missing battle-script rows after the body); proposed source rule; tl205 implementing it (unfolded at this writing).

## 2026-10-23 — CAX31 session: lsd194 + lsd196 + rst197 folded (final-code gates by the supervisor)

- **Fold (`worker/integration-20261022-230803`, tested `5e9e7ab6c` / src tree `9f76866e2`, re-pin `a9ea9c923`, gates doc `0a3153c81`):**
  lsd194 (24-frame `WAITMESSAGE_LONG_TIMING` floor dropped, prints are L + 64; Leech Seed turn-end drain rows from source, both scenes),
  lsd196 (a `stat` between two prints presents its instruction-execution rows; Bulk Up -3 -> 0), rst197 (Scene OFF Rest pause anchored on
  the status icon's execution, P 37 -> 40; 15 / 15 census bodies -3 -> 0; off148's 24-frame `proxyFrames` removed), and a
  `BattleStatTiming` type widening that fixed lsd196's typecheck error. Presentation timing only.
- **Supervisor gates on the exact code:** typecheck 0; census 0..999 both scenes vs lsd194's audited `2dcbb64b9`: digests / errors /
  type sequences identical in 1000 / 1000, changed commands = 961 second-stat rows per scene (4 / 5 / 6 rows by script shape) + 451
  OFF Rest pauses, nothing else (`rst197CensusDelta.py`); differential 641 / 641; full suite 13,965 passed / 2 failed (randomRoundSoak
  pins moved by lsd196 through the jittered press cooldown, attributed on four trees and re-pinned; file 64 / 64); build 0.
  Master's commits since the branch base were docs only, so the union src / tests equal the tested tree. Details:
  docs/lsd194-print-floor-and-drain.md sections 9-10. Logs `.integration/validation/sv-20261022/rst197/`.
- **Open (then):** drain animation body and second-stat ROM rows -- both closed later the same day (entry above).

## 2026-10-15 — CAX31 recovery session: trn178 + snd179 + fpc180 + trn181 + snd182 + sub183 + pfr185 folded

- **trn178 (INTEGRATION, saved ref `d9ebff43b`, merged `fcf57a388`):** Scene OFF action-transition pause (#167 (a'); P = d + 6 + u
  before an action's first MoveEnd sprite-visibility receipt; docs/trn178-action-transition-live.md). Supervisor: `trn176Predict.ts
  --scene=off` on the worker tree reproduces every claimed row (stat / protect / control / two-turn 0; HIT transitions 0; Baton Pass +1);
  trn178 / msg175 / chg161 / sub157 tests 17 / 17; src diff is one presentation-only Scene OFF branch. Worker: census 1,000 battles both
  scenes digests identical (OFF 13,706 pauses, ON byte-identical), differential 641 / 641, full suite 13,918 / 0 failed, build.
- **snd179 (SIDE, evidence only, saved ref `eb266b432`, merged `a01b965c0`):** Scene ON forced player send-in message
  = max(91, cry + 66, T_back + 70) (+1 CASTFORM), 339 / 339 sweep rows (docs/snd179-scene-on-forced-player-send-in.md). Supervisor:
  predictor + both probe receipts reproduced; 4 fresh ROM probes (slide / cry / 2 back-anim bound) 4 / 4 exact. No production change.
- **fpc180 (INTEGRATION, merged `0fdbb6128`):** fpc177's Focus Punch presentation fixes (#139): recall after the pre-pass, switch hold
  7, next-pre-pass lead 5, action lead 5 + u (docs/fpc180-focus-punch-live.md). Supervisor: `fpc180Compare.ts` reproduced every OFF card
  row 0 (switch order / Go!, two users, Scratch / Agility / Thunder Wave / Sand-Attack); ON +2 only on the known 125-vs-127 pre-pass
  row; src diff presentation-only. Worker: census both scenes digests identical, 65 changed commands per scene all attributed; differential
  641 / 641; full suite 13,926 / 0 failed on the final src; build. Union smoke 448 / 448.
- **trn181 (INTEGRATION, merged `14bb5777c`):** the action-transition pause in Scene ON (#167 (a')): one shared rule
  (`actionTransitionPauseFrames`), the ON pause marked `actionTransition` so live-render consumers treat it as draw-nothing
  (docs/trn181-action-transition-on.md). Supervisor: `trn176Predict.ts --scene=on` reproduced 13 / 13 ON rows on prediction
  (remaining = anchor-end errors). Worker: dense ON windows (Bulk Up / Scratch pause rows 0 px), census OFF byte-identical, ON 12,942
  pauses 0 unattributed, digests identical (bar the 3 budget-stalled tails); seeded-ON differential 144 / 190 moved, all attributed.
  Worker capped while its suite finished; the suite log (`.integration/validation/from-workers/trn181/t2`) shows 13,930 / 0 failed on
  src-final `4ba17ca5b`, build OK. Union: typecheck 0, smoke 448, trn178 / trn181 / fpc180 tests 18 / 18.
- **snd182 (INTEGRATION, merged `e0f3dd6ac`):** Scene ON forced player send-in "dragged out!" timing in production (#146), nature =
  personality % 25 (docs/snd182-scene-on-forced-player-send-in-live.md). Supervisor: `snd182Rows.ts` rerun, 27 / 27 cases exact, receipt
  byte-identical; src diff presentation-only. Worker: 6 dense ON windows (healthbox + message 0 px; mon region = the undrawn back
  animation, predates), census OFF byte-identical, ON 32 commands in 20 battles all forced player send-ins, differential 641 / 641, full
  suite on final src 13,933 passed + 2 files fixed by attributed re-pins (14 / 14), typecheck, smoke, build. **Supervisor decision:**
  accepted `src/engine/switchInTail.ts` in the animation-boundary ratchet allowlist (pure back send-out reducers, presentation timing
  only; same precedent as `battleResolutionPresentationRender.ts`). Union: smoke 448, affected 25 / 25.
- **sub183 (INTEGRATION, merged `fc0517c39`):** Substitute turn timing (#153): `scriptLeadFrames` 4 (`attackstring; waitstate` ..
  `attackanimation`), 164 post rows 2, HP -> print `tailFrames` 3 (docs/sub183-substitute-turn-timing.md). Supervisor: fresh direct-mGBA
  probes (prep37 ON opponent, sub157 OFF opponent; r1 == r2) through `sub183Dense.ts`: 291 / 291 rows 0 px in both scenes, rows equal to
  the committed fixtures. Worker: 4 / 4 dense windows 0 px (before 135-142 / 291 rows), census both scenes digests identical, 94 changed
  commands per scene all Substitute, differential 641 / 641; full suite on `bb11e4064` 1 failure (attributed re-pin `a3337807a`, file 4 / 4),
  typecheck, smoke, build on final. Evidence copied to `.integration/validation/from-workers/sub183/`.
- **pfr185 (SIDE, evidence only, merged `f0471b405`):** player faint-replacement send-in timing (#146): the ROM follows the forced-player
  model (D = `scene{On,Off}PlayerForcedSwitchInDuration`; idle D - 2, next print D + 10, prompt D + 17); production's partySelect SEND OUT
  clock is fixed (prompt 325 from confirm), late by up to +120. Supervisor: `pfr185Model.ts` receipt byte-identical; a fresh METAPOD
  probe (both scenes) byte-identical to the committed rows. Production step = route the faint-replacement clock through that model.
- **lsd186 (SIDE, evidence only, merged `78f561511`):** Leech Seed turn-end drain timing (#153 note): production lacks the drain lead /
  ON general animation (208 rows) and floors the HP bars; ON print -198 .. -188. Supervisor: `lsd186Compare.ts` receipt byte-identical;
  a fresh ON probe rows byte-identical to the committed fixture. The 4-term "exact change" is a fit over 6 cases, not yet source-derived.
- **fpo187 (SIDE, evidence only, merged `3659e7991`):** the Scene ON Focus Punch pre-pass +2 row is the controller's `IsBattleSEPlaying`
  wait for the player's last SE_SELECT before `General_FocusPunchSetUp` (source-named). Supervisor: fresh a-switch-on probe byte-identical.
- **btl188 (SIDE, evidence only, merged `0e3b667b8`):** the Scene ON -3 .. -6 anchor-start errors are the unpresented post-waitanimation
  script rows after a no-hit live body (rule in docs/btl188-scene-on-anchor-start.md). Supervisor: `btl188Rows.ts` output == committed rows.
- **msg189 (SIDE, evidence only, `86c86a90c`):** short `waitmessage B_WAIT_TIME_LONG` prints over-hold by max(0, 24 − L): the 24-frame
  floor in `WAITMESSAGE_LONG_TIMING` (ROM = L + 64; "was seeded!" +8 / +4). Supervisor: code lines confirmed. Lane slip: the worker
  committed its doc directly on master instead of its side branch (doc only; kept after review).
- **Final union gates (`fc0517c39`, src tree `0eee3727b`; later commits docs/tools only):** supervisor full suite 1,682 files /
  13,940 tests passed, 0 failed; build OK. Logs `.integration/validation/sv-20261016-final/`.
- Union `a01b965c0`: smoke 448 / 448 (master's later commits since the worker base are tooling only).

## 2026-10-14 — CAX31 session: Transform live (trf174) + enc160 / plr162 / enc173 folds

- **trf174 (INTEGRATION, Opus, merged on master after `0d6ec248e`):** Move_TRANSFORM live in both scenes + the transformed field
  (docs/trf174-transform-live.md). Supervisor: fresh `trf174Probes.sh` 8 / 8 r1 == r2; `trf174Check.ts` 109 / 109 rows 0 px on all 8;
  `trf174Field.ts` 140 / 140 rows 0 px (own / unblended controls nonzero). Census both scenes: kernel digests identical; only battle 197
  (CHANSEY Metronome -> Transform) moves. Differential 641 / 641. Not yet in `LIVE_MOVE_ANIMATION_IDS` / live-status counts.
- **plr162 (INTEGRATION, folded from the Mac's saved ref):** Scene OFF forced player send-in tail; supervisor reproduced CASTFORM fresh.
- **msg175 (INTEGRATION, Opus):** "used" print = printable length (no 24-frame floor), Scene OFF Wish pause (#167 (a)); census both
  scenes digests identical, every retimed print attributed; supervisor reproduced the anchor table and a fresh off148 Wish probe.
  docs/msg175-used-message-duration.md.
- Union gates and engine folds: see PROGRESS.md 2026-10-14.

## 2026-10-13 (day, in progress) — finish-up session: engine fixes #165 / #141b / #140 + presentation landings

- **Engine (main/ts lane, see PROGRESS.md):** ret165 (#165 Return -> Frustration; census Return 84 -> 0, Frustration 90 -> 154 all live;
  supervisor reproduced the ROM receipt byte-identically), rng146 (#141b Sticky Hold + #140 `:130-134` arm; verify-rcp143 R2 / R3 /
  R3-control PASS on master, R1 THRASH deferred -> thr153 re-land).
- **inl144 (INTEGRATION, Sonnet, merged `1c801184b`): inv142 LANDED** (#168 hidden-battler remainder): the status animation draws over an
  invisible battler, the battler stays hidden. Supervisor: inv142Run.sh --census into a fresh dir ALL SAME (5 / 5 windows 0 px, controls,
  route delta 92 frames in the one INFATUATION command, census identical). Differential 641 / 641 (235 + 216 + 190).
- **snd145 (INTEGRATION, Opus, merged `84335c25a`): species-keyed OPPONENT send-in tail, Scene ON** (#146): generated
  `src/data/sendInTail.ts` (376 species; 338 / 338 vs the sweep), `src/engine/switchInTail.ts`; every Scene ON opponent switch-in (voluntary,
  forced, faint replacement) uses its species' healthbox slide + duration; send-in white fade + particles keyed to every switch-in command;
  faint-replacement turn-end hold. 12 Scene ON dense windows (6 species x Roar / faint): healthbox + message rows 0 px (faint path: 1 blank
  row one frame late; TYPHLOSION faint D4 lag frame). The sweep was Scene ON; **Scene OFF skips the front animation** (SKIP_FRONT_ANIM):
  OFF unchanged here — ROM OFF slide el 36 / next message ~62 vs production 33 / 102 (68 rows per window) -> offs152. Census: only
  switch-in commands move (1,783 / 3,550, +75,870 frames), 0 move-animation changes. Supervisor: snd145Run.sh --census ALL SAME.
  Named residual: the species front animation is not drawn (16k-232k px per window) -> fra151.
- **fps147 (SIDE, Opus, new files, merged `597263842`):** unwired `src/animation/focusPunchSetUp.ts` (General_FocusPunchSetUp == Move_ENDURE
  body on a general-animation host): 7 dense Scene ON windows 0 px (incl. elevated other battler), controls fail, no D4 phase; behind a
  Substitute no animation. Landing recipe docs/fps147-focus-punch-setup.md §4 (consumed by the #139 step). Supervisor: fps147Run.sh ALL SAME.
- **rcp143 (SIDE, Opus, new files, merged `77370de52`):** ROM receipts R1-R4 for #141 / #140 / #139 (docs/rcp143-engine-fix-receipts.md);
  #140's real singles route is a lock cancelled mid-turn by a faster foe's sleep / freeze / Spite (Mimic / Transform cannot reach :133).
- **Union gates:** `1c801184b` (ret165 + inl144 + rcp143): typecheck, smoke 448, full suite 1,656 files / 13,741 tests 0 failed, build.
  `84335c25a` (+ rng146 + fps147 + snd145): typecheck, smoke 448, affected 88 / 88; full suite + gameplay gates running.

## 2026-10-13 — User-authorized Factory finish-up scope (instructions only)

All remaining animation variants, presentation corrections and discussed battle-engine accuracy defects are now in the current
mission (`docs/factory-finish-scope.md`). The former presentation-only scope block is superseded for source-proven main-lane fixes.
Queue #165 first, then #141 / #140 and #139; continue independent #168 / timing / fallback work. Scene ON/OFF must agree on the
corrected rules, while intentional source-correct damage / AI / RNG / event-order changes may move old trajectories. Use the full
engine verification contract and gameplay gates. Audio and prior settled exceptions remain deferred/settled.

The roadmap, main/worker guides, verification policy and actual main-supervisor launch prompt now carry this authorization.
Production src `65a45fcc`, its full-test/build receipt on `12e9ea2d7`, the served preview `159c9e694` and measured coverage 99.34% /
99.60% remain unchanged. This checkpoint changes scope/instructions only and starts no run; no implementation credit is added.
Validation: scope/ledger checks, `git diff --check`, `bash -n run-supervisor.sh`, launcher `--print-config`, and
`npm test -- tests/codexLauncherProfiles.test.ts` (62 / 62 passed). No production full-suite/build rerun is needed for this checkpoint.

## 2026-10-12 (evening) .. 2026-10-13 — S10A: ISSUES #168 DONE (all nine Scene ON status animations timed + drawn), SE gates, #166 DT tail, Smokescreen D4, ordinary-row idle rest; 98.95 / 99.32 -> 99.34 / 99.60 % live

- **Final (supervisor):** master `159c9e694` (production src == union `12e9ea2d7`). Gates on that union: typecheck, smoke 448, full suite
  1,653 files / 13,710 tests 0 failed, build; differential vs session start `9a184dfa6`: fight-submenu 235 / 235 + battle1-postwin-next-prompt
  216 / 216 byte-identical, app-only presentation-rng trace 172 / 173 (frame 3622, 673 px: tmr136's Double Team tail). Census 0..999
  (`.integration/validation/final-63f6850b2/census/merged.json`): **27,221 / 27,402 commands (99.34 %), 4,149,717 / 4,166,351 frames
  (99.60 %)**, 0 render throws (session start 98.95 / 99.32 %). Catalogue `236+13+27+0+0=276` + Struggle. Status animations: 8,063
  Scene ON commands, all nine drawn. Preview <http://127.0.0.1:5191/> serves `159c9e694`: 4 samples hash-equal, session export + ON -> OFF
  restart passed, no browser errors (`tools/integration/fixtures/playable-preview-63f6850b2-receipt.json`). Soak (run because sgl138 changed
  Scene OFF timing) on `361829128` (the last Scene OFF change; later folds are Scene ON only): vanilla 0:20 **20 / 20**, full 0:60 **60 / 60**,
  winning 0:60 **60 / 60**, winning-swap 0:60 **60 / 60** OK (all budget-ended; the script's own repeat of the fifth gate also 100 / 100 x 4); fifth gate winning --vary-rng carry 0 / 14 / 28 **100 / 100 each**, winning-swap carry
  0 **100 / 100**.
- Supervisor, after the final gates (`d6ecfd654`, tools only): the app-only presentation-rng differential traces regenerated on the
  current timeline (presentationRngTraces.ts: 173 -> 190 captures); differential vs `4f77f1517` 831 / 831 byte-identical; smoke 448.
- gaf140 (MAIN lane, Opus, on master `b4c540c6c` .. `a95993c94`): the union DEFECT fixed — the status-animation command carries
  `seGateFrames`; the render effect age = command age - gate (the ordinary field during the gate): **16 / 16 gated ROM windows 0 px on every
  row incl. the 139 gate rows**; controls (pre-fix, gate +- 1) 0 / 16; census identical; 4 gated routes OK. Supervisor: gaf140Run.sh
  --census ALL SAME.
- Live audit 28 (aud137, INTEGRATION, Opus, new files only, base `61d26be5a`): status animations widened — 127 windows, **121 / 121 command
  rows 0 px**, 153 ROM timing receipts rule-exact (2 gated), x2 next-body checks OK, **no new defect**; FRZ active 115 vs production's 116
  on 4 / 10 frozen-turn windows = a 1-frame TIMING-PHASE (D4 class; next message 1 frame late; cause named, not proven). Supervisor:
  aud137Run.sh ALL SAME.
- rsl141 (SIDE, Opus, `e2df4386c` .. `5155ff3e7`, cap-killed during its final full suite with everything committed; supervisor salvage +
  doc): rst139's ordinary-row idle rest LANDED — 22,746 / 22,746 ROM rows 0 px, routes 4,349 changed == at stake, census identical.
  Supervisor: rsl141Run.sh ALL SAME; union `12e9ea2d7` gates above.
- inv142 (INTEGRATION, Opus, new files only): a status animation over an INVISIBLE battler (Dig charge, the battler's own in-love check):
  the ROM runs the script and draws its sprites (hearts / letter Z) while the battler stays hidden; production draws nothing (sar131's
  guard); census exposure 5 / 8,063; banked `fixtures/inv142/inv142-invisible.diff` 5 / 5 windows 0 px, census identical. NOT landed (time).
  Supervisor: inv142Run.sh ALL SAME.
- Session start: master `9a184dfa6`, production src `b4befa039` == the 2026-10-11 final gates' tree -> baseline receipt reused. Oracle
  freshness FAIL = the known false positive (services 2026-10-06; last `oracle/` commit 2026-08-15).
- ordl126 (SIDE, Sonnet, merged `a4ab64cb9`): ord124's banked plans landed through the table generator (src hunk == the banked hunk,
  checked); tests/ordl126OrderPlans.test.ts (revert experiment: static `D0,1` fails the 21 [4, 3] instances). Census 0..999 **98.95 /
  99.32 -> 99.34 / 99.60 %** (+106 commands / +11,832 frames, battle 705; 0 other changes; lend unknown 125 -> 19). Worker gates: full
  suite, build, differential 624 / 624. Supervisor: ordl126Run.sh into a fresh dir ALL SAME (12 / 12 windows live, 10 / 10 0 px — the other
  2 are the Golbat Mega Punch flag, see aud129). Union `a4ab64cb9` (+ seg127): typecheck, smoke, targeted 38 / 38.
- seg127 (MAIN lane, Opus, new files only): the controller's IsBattleSEPlaying gate before a status animation. Source rule
  `gate = clamp(seRows[songId] - seAge, 0, 29)` (effectivenesssound SE: not very 18 / neutral 73 / super 88 rows; any print in between ->
  0), **56 / 56 ROM receipts residual 0** both sides (sta123's Ice Beam 17 / 18 explained by HP drain, not side); census 0..999 72 gated /
  729 frames. Banked unwired `src/engine/seg127StatusSeGate.ts`. Also: the same gate sits in the battle-animation controller -> a
  General_StatsChange right after a neutral hit's secondary probably waits too (unmeasured; #166 timing candidate). Supervisor:
  seg127Run.sh --census ALL SAME.
- sa125 (INTEGRATION, Opus, `8990da5ed` .. `05c6e898f`): **ISSUES #168 SA1 + SA3** — a Scene ON `status-animation` command per kernel
  receipt (animation = InitAndLaunchChosenStatusAnimation's pick; `STATUS_ANIMATION_ADDED_ROWS` PSN 71, CONFUSION 100, BRN 39, INFATUATION
  97, SLP 97, PRZ 39, FRZ 117, CURSED 75, NIGHTMARE 75); the ON `status` command followed by its battler's status animation lasts off121's
  delta(print) - delta(status) (32 -> 2 / 1). Production ON - OFF from each anchor = the ROM controller rows on **212 / 212** anchored
  census commands (only the SE-gated class differs -> sag130). Census 0..999: 7,894 commands / +650,788 frames, SA3 -85,797; 0 move status
  changes; Scene OFF 10 / 10 shards byte-identical; 5 pins moved (pins.json); no soak pin (the soak plays Scene OFF); differential 624 /
  624 identical. Timing only — nothing drawn. Supervisor: sa125Run.sh into a fresh dir ALL OK; production diff reviewed (92 lines).
  **Union `4919b7fa2` (master + sa125; src then + stp128's unwired module on master `4a5a02135`)**: typecheck, smoke 448, full suite
  1,642 files / 13,555 tests 0 failed, build.
- stp128 (SIDE, Opus, new files only, merged `0c84ed68f`): unwired reducer `src/animation/statusConditionAnimations.ts` for CURSED /
  NIGHTMARE / CONFUSION / FRZ (AnimGhostStatusSprite, AnimConfusionDuck ported literally; FRZ through frozenIceCube.ts + monbg; FRZ 115 vs
  116 isolated): dense ROM windows 14 scenarios r1 == r2, **34 / 34 windows 0 px on every row** through existing production helpers
  (incl. elevated GOLBAT / HAUNTER shadows); controls fail as designed. Supervisor: stp128Run.sh ALL SAME.
- sag130 (MAIN lane, Opus, on master `edd30214a` .. `b9669e7d8`): **ISSUES #168 SA2** — seg127's gate wired into the status-animation
  command (`minimumFrames = gate + controllerRows`; HP-bar rows = |from - to|). Production ON - OFF == gate + rows on 222 anchored
  commands (19 gated / 167 gate frames, 15 classes both sides where the census has them); census 0..999: exactly 72 commands +729 frames ==
  seg127's projection receipt by receipt, 0 status changes, OFF 10 / 10 identical; 0 pins moved; worker gates full suite 1,644 files, build,
  soak vanilla 20 / 20, differential 624 / 624. Supervisor: sag130Run.sh ALL OK (census 99.34 / 99.60 %).
- sar131 (INTEGRATION, Opus, `36592fd5b` .. `d2e720b63`, base = sa125 tip): **ISSUES #168 SA4 — PSN / PRZ DRAWN** in Scene ON: the
  `status-animation` render effect + `battleScene.ts statusAnimationRenderView` + `statusAnimation.ts liveStatusAnimationRow` (ShakeMon2 +
  BlendColorCycle / ElectricityEffect; command age a == ROM row X + 1 + a); **17 / 17 dense ROM windows 0 px** every row (elevated LEDIAN /
  GOLBAT incl.), controls fail (age+1 0 / 17, no-shake 0 / 17, wrong-side 0 / 17); source-derived x2 rows for all nine B_ANIM_STATUS_*
  (`LIVE_BATTLER_X2_STATUS_ANIMATION`: ShakeMon2 ones zeroed, sprite-only ones keep; the next live body at the predicted x2 14 / 14);
  routes 5 / 5; census 0..999 identical (pixels only). The canonical Thunder Wave fixture untouched. Supervisor: sar131Run.sh --census ALL SAME.
- stq132 (SIDE, Opus, base `0c84ed68f`): stp128's reducer extended (unwired) with SLP / BRN / INFATUATION through rest.ts / firePunch.ts /
  charm.ts: 13 scenarios, **37 / 37 windows 0 px**, 24 / 24 perturbations fail the pins. Supervisor: stq132Run.sh ALL SAME.
- **Union `a9310d3f2` (master `b9669e7d8` + stq132 + sar131; = master `3d34c823c` src)**: typecheck, smoke 448, full suite 1,646 files /
  13,649 tests 0 failed, build.
- sad133 (INTEGRATION, Opus, `0d7940fb6` .. `0c793efbb`, base = sar131 tip + stp128 cherry-picked unchanged): **ISSUES #168 SA6 / SA7 /
  SA8 — CURSED / NIGHTMARE / CONFUSION / FRZ DRAWN** through `liveStatusAnimationRow` (stp128's reducer at rel = age; FRZ's 115 / 116 load
  lag from a presentation-only `inflicted` input = the command follows its battler's `status` command): **34 / 34 ROM windows 0 px on every
  command row** (31 / 34 full screen: 3 ONIX-opponent CONFUSION windows show 1,091 px on the NEXT message's rows a = 100 / 101 — the
  pre-existing "ordinary rows never draw the opponent's idle rest" gap, not fitted -> rst139); controls fail each its own class; x2 34 / 34;
  sar131's PSN / PRZ still 17 / 17; routes 5 / 5; census 0..999 identical. Supervisor: sad133Run.sh --census ALL SAME.
- sgs134 (MAIN lane, Opus, new files only): the same IsBattleSEPlaying gate on OTHER controller requests — General_StatsChange after a
  neutral non-crit hit (target drops, attacker raises; fixed rows 44, BOTH scenes) and multi-hit 2nd+ hits (fixed rows 62, Scene ON):
  production SHORT by exactly the gate on every receipt; banked `sgs134-gate.diff`: census ON 366 commands / 3,654 frames, OFF 240 / 3,114,
  gameplay identical (±1 message-parity allowance from the census driver's even-frame presses). Supervisor: sgs134Run.sh --delta (below).
- **Union `985926fe2` (master `5c170e32f` + sad133 + a supervisor fix)**: the sad133 x stq132 union broke typecheck (TS2366: stq132 widened
  the reducer's sprite-template union; sad133's switch lost exhaustiveness) — fixed with explicit unreachable cases (`985926fe2`); smoke
  448, full suite 1,648 files / 13,674 tests 0 failed (pre-fix, runtime-identical), typecheck + build + 7 status test files 123 / 123
  post-fix. Master `8de3a0441`.
- sae135 (SIDE, Opus, base `a9310d3f2`): **ISSUES #168 SA5 — SLP / BRN / INFATUATION DRAWN** (stq132's reducer; letter Z affine, flames,
  hearts): 37 / 37 ROM windows 0 px on every command row (6 ONIX-opponent windows carry the ordinary-row idle-rest residual on the next
  command -> rst139), controls fail, x2 kept 13 / 13, routes 6 / 6, census identical. Found the union DEFECT: on the 72 SE-GATED
  status-animation commands the drawn animation starts gate rows early (the effect age does not skip the gate) -> gaf140. Supervisor:
  sae135Run.sh --census ALL SAME.
- **Union `d0cab7057` (master + sae135; supervisor resolution)**: sad133 and sae135 diverged on `liveStatusAnimationRow`'s 4th argument
  ({ sprite, inflicted } vs { x, y }) — unified on the context form for all nine; one sprite type (behindBattlers / blend / affine); the
  draw helper routes affine sprites; sae135's tests call the context form. Typecheck, smoke, full suite 1,649 files / 13,686 tests 0
  failed, build; sar131 / sad133 / sae135 window comparators byte-identical on the union (their route checks flag only the OTHER slices'
  newly drawn commands — expected).
- sgl138 (MAIN lane, Opus, on master `a9e606e36` .. `a3835ebb1`): sgs134's gate LANDED — `seGateFrames` lead before the stats-change
  banner (both scenes) and multi-hit 2nd+ hits (Scene ON); census 0..999 == sgs134's patched copy (ON 366 commands / 3,654 frames, OFF
  240 / 3,114; gameplay identical); pins: sc106 route +8 +9, COMET_PUNCH hit 2 +1; soak vanilla / default 0:20 20 / 20; differential
  624 / 624.
- tmr136 (INTEGRATION, Opus, `d83d10655` .. `0eca8b38f`, base `5c170e32f`): (A) **ISSUES #166 remainder FIXED** — the live Double Team
  window holds the General_StatsChange's rel 69..77 (`LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS` 9: 230 -> 239 rows; every existing body row
  byte-identical; the tail rows 0 px and the next glyph on ROM age 239 on 12 / 12 dt60 windows); (B) Smokescreen 108 -> D4 faithful timing
  keyed by its use in the battle (first use 124 rows / no lag, later 125; the x2 history host counts the battle's own MOVE_ANIMATION bodies;
  in-phase windows 22 / 24 0 px, 2 the minority phase): catalogue **236 + 13 + 27 + 0 + 0 = 276** + Struggle. Supervisor: tmr136Run.sh
  ALL same; census 0..999 base vs final (the worker did not run it): **859 live Double Team +9 frames, 66 first-use Smokescreens -1, 0
  status / decline-reason changes** (decline `gate` line refs shift only); shard 7's digest / key differences = battle 796, a census
  frame-budget-truncated battle that loses one record (pairing shifts for 796..799).
- **Union `361829128` = master** (U3 + sgl138 + tmr136; supervisor: one render conflict (moveUse x seGate) resolved keeping both; sgl138's
  seed-9 Scene ON route total re-pinned 15,260 -> 15,288 = tmr136's 3 live Double Teams +9 each + 1 even-frame press parity, anchors
  identical): typecheck, 12 cross-branch test files green; full gates below.
- rst139 (SIDE, Opus, new files only): ordinary Scene ON rows never drew the opponent's idle rest: ROM holds x2 outside scripts (8
  scenarios r1 == r2); exposure = ONIX only (Factory pool): 4,349 tracked-idle frames / 9 battles (12,477 `unknown` not claimable); banked
  patch -> 22,746 / 22,746 ROM rows 0 px, census identical, differential identical -> rsl141 landing.
- Live audit 27 (aud129, MAIN lane, Opus, new files only): 105 windows, lend == ROM 105 / 105, **85 OK, 20 TIMING-PHASE (D4 class; each
  residual row is 0 px one age off), 0 DEFECT**. ord124's Golbat Mega Punch flag = Mega Punch's own BG-write row 71 + restore-fade phase
  (no party dependency); Spark = alignment artefact; Smokescreen use-1 phase quantified (66 live / 8,580 frames on 0..999).

## 2026-10-11 (afternoon / evening) — S10A: Struggle LIVE, General_StatsChange LIVE, timeline fixes; 95.38 / 98.72 -> 98.95 / 99.32 % live

- **Final (supervisor):** code `01811d964`, production src `b4befa039`. Gates in a detached worktree: typecheck, full suite 1,639 files /
  13,532 tests 0 failed, build; differential vs `bddc3d69c`: fight-submenu 235 / 235 + battle1-postwin-next-prompt 216 / 216 byte-identical,
  presentation-rng-playable-live-bodies-seeded-on 42 / 173 (moved by shp116 / iu120's intended timing; regenerate its capture frames).
  Census 0..999 (`.integration/validation/final-2131feda7/census/`): 27,139 / 27,426 commands (98.95 %), 4,132,330 / 4,160,787 frames
  (99.32 %), 0 render throws. Adapters `237+13+26+0+0=276` + Struggle. Preview `d7e4f4792` (src `b4befa039`): 4 samples hash-equal,
  session export + ON -> OFF restart passed, no browser errors (`tools/integration/fixtures/playable-preview-8d815e080-receipt.json`).
- sta123 (SIDE, Opus, new files only, merged `8b7294763`): ISSUES #168 prep pack — 9 / 9 B_ANIM_STATUS_* on the ROM both sides (PSN 71,
  CONFUSION 100, BRN 39, INFATUATION 97, SLP 97, PRZ 39, FRZ 117 (133-134 after Ice Beam: the controller waits for battle SEs), CURSE 75,
  NIGHTMARE 75 rows; Scene OFF skips all), census 8,080 occurrences, none drawn; slices SA1..SA10. Supervisor: sta123Run.sh ALL SAME.
- Soak (S10A's scoped policy does not require it; run because soak111 changed the driver), first pass on `ac2f2b7ee` (pre-fix driver):
  vanilla 0:20 **20 / 20 OK**; full 0:60 59 / 60, winning 0:60 57 / 60, winning-swap 0:60 59 / 60 — every HANG `@ postwin:page0`: soak111's
  sticky post-win roll (keyed by menu + cursor) chose a deliberate no-op (REST: full 25, winning 4 / 27 / 48; RECORD: winning-swap 17) and
  pressed A forever. Fixed `09954ab3f` + `b22c2a61e` (re-draw after every A on RECORD / REST); all five seeds rerun OK (winning 4 / 27 / 48
  and winning-swap 17 reach carry 14 at the 1,000,000-frame budget); soak tests 70 / 70, no pin moved.
  Confirmation on the fixed driver (`b22c2a61e`): full 0:60 **60 / 60**, winning 0:60 **60 / 60**, winning-swap 0:60 **60 / 60** OK.
- ord124 (SIDE, Opus, new files only, branch `worker/side-20261011-204243`): the lend-unknown bucket is 106 / 125 commands from ONE
  battle (705: a Metronome-called Odor Sleuth, then a False Swipe); computed plans exact on ROM RAM (Odor Sleuth 51 / 51 bodies — equal
  sort keys keep the lend's slot order, so plans69's "target species" classes were lend classes; False Swipe 18 / 18); banked patch
  (generator line + rows fixture + fold-pin diff): census 98.95 / 99.32 -> **99.34 / 99.60 %** on its patched copy, 0 other changes.
  Hyper Beam stays negative (Random2 orb words). FLAG: Golbat Mega Punch first window on the `wos-*-143-42-5` routes 287,402 /
  17,984 px (lend == ROM; base == patched) — a live defect or an alignment artefact: audit it next. Fifth gate on the fixed driver (src `b4befa039`): winning --vary-rng
  --first-round carry 0 / 14 / 28 **100 / 100 each**, winning-swap carry 0 **100 / 100** (0 CRASH / 0 HANG).

- Session start: master `bddc3d69c`, production src `14d1be159` == the 2026-10-10 night final gates' tree -> baseline receipt reused.
  Oracle services (2026-10-06) postdate the last `oracle/` commit (2026-08-15); the freshness script's FAIL compares against any HEAD
  commit (docs-only) and is a false positive.
- off108 (MAIN lane, Opus, new files only, `0ffd401a4` .. `af91e3eb2`): ISSUES #167 anchors. Scene OFF no-hit pause rule
  P = Δ(N) + lead(N) - D_between exact on 16 / 16 classes (Rest open); the MoveMissedPause is LOST in both scenes (ROM "missed" first
  glyph G+37, production G+1). Banked `off108-scene-off-pauses.diff`; census OFF +9,717 pauses / +7,386 holds, ON 0 changes. New
  finding: Scene OFF `status` command is 32 frames where the ROM takes 2. Supervisor: off108Run.sh into a fresh dir ALL SAME.
- stg107 (SIDE, Opus, new files only; merged `80bb333bd`): Struggle 165 source table, real forced-Struggle routes (Taunt on an
  all-status set; PP exhaustion vs Pressure), 19 ROM windows r1 == r2, banked live adapter `stg107-struggle.diff` (new
  src/animation/struggle.ts + the MOVEMENT_WAVES asset): 15 / 15 live windows 0 px on every row; census on the patched copy 95.38 / 98.72
  -> 98.80 / 99.27 % (884 / 1,033 Struggle live; declines: lend unknown 106, attacker doll 24, defender doll 19). Supervisor:
  STG107_PATCH=1 stg107Run.sh into a fresh dir — every receipt same, 15 live 0 px, 19 r1 == r2.
- sc106 (INTEGRATION, Opus, `dfb0fe5c5` .. `356f2eefc`) + soak111 (INTEGRATION, Opus, stacked, .. `f3e84dac6`), merged `0962e7b38`
  (src `94a7f48b3`): ISSUES #166 slice (c) — a `stats-change` command per played STATS_CHANGE (76 / 90 frames, both scenes; none behind a
  displayed doll; none right after a live Double Team body, whose window owns the banner — that window still ends 9 rows before the ROM's
  next message, pre-existing). Census 0..999: 0 move status changes, +3,667 commands / +298,348 frames (= stat101's 4,529 played - 862
  live-DT exemptions). sc106 broke 4 randomRoundSoak pins: the soak's RandomPlayer drew press cooldowns from its decision stream, so any
  presentation-length change re-rolled its games. soak111 split the press stream (plus four input-dead-press fixes the proof exposed):
  17 / 17 seeds identical decisions with the off108 patch applied (old driver 0 / 17); pins re-pinned; ISSUES #89 coverage moved from
  seed 27 (lost before sc106) to natural seed 226. Gates on `bb0e8b4cd` (== merge code + master's new tool files): full suite 0 failed,
  typecheck, smoke 448, build, soak gates vanilla 0:20 20 / 20, full 0:20 20 / 20, winning vary-rng 0:30 30 / 30. Supervisor: sc106
  production diff reviewed; soak111Run.sh into a fresh dir ALL SAME.
- Live audit 25 (aud110, MAIN lane, Sonnet, new files only): stg107's Taunt / Harden flags are window-alignment ARTIFACTS; widening
  found 3 live DEFECTS with banked patches (Taunt marks behind a player target, Harden ignores an opponent attacker's idle rest, Swagger
  hard-codes RATTATA's picture height) -> fix114.
- fix114 (MAIN lane, Opus, on master `fc656b943` .. `c73c5deac`, src `876dfd41`): the three audit-25 patches landed + 22 widened windows
  (Taunt 23 / 23, Harden 45 / 45, Swagger 16 / 16, Mean Look 4 / 4, Substitute 3 / 3 at 0 px, r1 == r2; base Taunt 17 / 23, Harden 39 / 45,
  Swagger 4 / 16); tests/fix114LiveAuditDefects.test.ts (revert experiments fail each rule); census: pixels only (0 status / frame / key
  changes). Worker gates: full suite, build, differential 624 / 624. Supervisor: fix114Run.sh on `c73c5deac` into a fresh dir — every
  receipt same, the five totals above reproduced.
- stl109 (SIDE, Sonnet, `f650e54cc` .. `aa37ae1fb`, merged `f4fd956f2`): **Struggle 165 LIVE** — stg107's adapter + 165 in
  LIVE_MOVE_ANIMATION_IDS, tests/stl109Struggle.test.ts (ROM rows, gates, two real kernel routes with Scene ON / OFF parity; 11 revert
  experiments), accounting: catalogue `238+13+25+0+0=276` kept, Struggle tracked as `additionalRequiredBodies.MOVE_STRUGGLE` (required ->
  accepted -> live) => **239 live adapters**. Supervisor: STL109_PATCH=1 stl109Run.sh from the landed tree — every receipt same,
  15 live 0 px, 19 r1 == r2.
- **Supervisor union gates on `f4fd956f2` (src `2ed518f1f` = sc106 + soak111 + fix114 + stl109)**, detached worktree: typecheck, full suite
  1,630 files / 13,431 tests 0 failed, build (`.integration/validation/union-7390bf8ca/`). Census 0..999 (ret88Census.sh shards):
  **98.80 % of move-animation commands / 99.27 % of frames live** (27,128 / 27,458; session start 95.38 / 98.72), 0 render throws.
  Struggle declines left: lend unknown, doll cells (-> stf115).
- scd112 (INTEGRATION, Opus, merged `0ad17c291`, src `c477ee81` on `0962e7b38`): ISSUES #166 slice (d) — the General_StatsChange banner
  drawn in BOTH scenes through the production path (reducer rows, existing exact helpers, mask at the displayed picture + tracked x2 rest,
  elevated shadow hidden): 19 / 20 ROM windows 0 px both scenes (Growl ON 82,916 px: liveBattlerX2History has no Growl row; with it
  zeroed 20 / 20 -> scf117); 8 production routes: pixels only on stats-change frames; census identical. Supervisor: scd112Run.sh ALL SAME.
- olnd113 (SIDE, Opus, merged `c1ddccc74`, src `b46ad30e` on `8cc0c3a34`): ISSUES #167 — off108's patch landed (Scene OFF no-hit pause per
  class; the MoveMissedPause / failed / Protect-blocked hold in BOTH scenes); lead(STATS_CHANGE) = 1 (stat102's age 0 = rel 1). OFF rule
  16 / 16, ON pause-path 5 / 5 at 0 residual; post-stats-change first glyph still -2 / -1 / -1 (-> scf117). Census ON 0 status changes;
  OFF +9,717 pauses / +407,249 frames, 0 command mismatches; soak pins moved by frames only (decision logs identical). Supervisor:
  olnd113Run.sh ALL SAME.
- **Supervisor union gates on `c1ddccc74` (src `e00a22788`)**: typecheck, smoke 448, full suite 1,632 files / 13,467 tests 0 failed, build.
- stf115 (MAIN lane, Opus, new files only, `e71bd0944` .. `1cb9e6de2`): rung 1 refuted its brief's premise — Struggle already has an
  exact order plan (SPRITE_ORDER_PRODUCTION_BODIES 165 -> 94; production lend == ROM on 66 / 66 activations, 24 after a Struggle; 54 / 54
  live windows 0 px). The 106 "lend unknown" Struggle declines are host invalidations by OTHER bodies: 101 after a Metronome-called Odor
  Sleuth 316 (no plan either side), 5 after Hyper Beam 63 (plan keys missing). Rung 2: banked doll-cell patch (doll-aware art + doll
  palette). Supervisor: stf115Run.sh on `1cb9e6de2` — every receipt same.
- sdl119 (MAIN lane, Sonnet, on master `b5dd805f4` .. `72e79aa4b`, src `377ed0c48`): the doll cells landed (defender 5 / 5, attacker-doll swap
  6 / 6 at 0 px, composites 197 / 193 rows); census 0..999 **98.80 / 99.27 -> 98.95 / 99.31 %** (the worker reported 99.44 %: a fixed base-arm denominator; corrected) (+43 Struggle live; 895 / 1,001 Struggle
  commands live; 0 other status changes). Worker gates: full suite 1,633 files 0 failed, build, differential 624 / 624. Supervisor:
  sdl119Run.sh on `72e79aa4b` — 59 / 59 live 0 px, 6 / 6 composites, every receipt same.
- scf117 (INTEGRATION, Opus, merged `2f07ed3de`, src `d4988e08` on `c1ddccc74`): **ISSUES #166 finished** — (1) the print after a
  stats-change shows its first glyph on the ROM row (a `holdFrames` on the command; residual 0 on 22 census paths in both scenes; olnd113's
  joint target -2 / -1 / -1 -> 0 / 0 / 0; AllStatsUp anchored on issue69's frames); (2) source-derived x2 tracker rows (Growl / Will-O-Wisp /
  Trick target; Screech / Soft-Boiled / Belly Drum / Trick attacker): Growl ON 20 / 20, live bodies after a Growl 43 / 43 rows 0 px (base
  ONIX body 70,910 px off); (3) args 56 / 58 take class 2 (host binding needed no change); (4) `generalAnimations.STATS_CHANGE` in the
  live status (ON 3,667 commands / 302,540 frames, OFF 4,529 / 368,914; a separate line, not move coverage). Census: 0 status changes.
  Supervisor: scf117Run.sh into a fresh dir ALL SAME (19 paths 0 residual on 0..199, 20 / 20). Census-doc conflict with sdl119 resolved
  (both sections kept).
- shp116 (SIDE, Opus, `22813b257` .. `80e3d5b35`, folded via union `61e1128ab`): shadow105 (the elevated opponent's shadow on lead row 0;
  the audit-24 decline removed) + sp103 (Shadow Punch 325's age-90 lag as D4 faithful timing; catalogue `237+13+26+0+0=276` + Struggle)
  + sp103's DEFECT (an elevated opponent TARGET's shadow return in Shadow Punch: ages 102..105 200 -> 0 px). Census: 0 status changes,
  458 lead commands regain +N (+2,576 frames), 27 Shadow Punch +1 frame; differential: the app-only presentation-rng trace moves 21 / 173
  captures (Shadow Punch fade rows, the menu one frame later), canonical traces identical. Supervisor: shp116Run.sh ALL SAME; the sc106
  Intimidate anchor conflict resolved as +10 (lead rows) +1 (hold) — the test passes on the union.
- **Union `61e1128ab` (src `530600bb1`)**: typecheck, smoke 448, full suite 1,636 files / 13,493 tests 0 failed, build. Census 0..999:
  **98.95 % / 99.31 %** (27,140 / 27,427 commands; 4,037,631 / 4,065,771 frames), 0 render throws.
- Live audit 26 (aud118, MAIN lane, Opus, new files only, `d8064e53d` .. `ac2f2b7ee`, base `72e79aa4b`): Struggle 6 new pairs + KO switch-in
  OK (16 / 16 0 px); banner 9 new scenarios x ON / OFF 18 / 18 0 px; OFF pauses 8 new classes 0 residual; **2 DEFECTS** with banked
  patches: (A) Struggle's target keeps its idle rest (x2 tracker had no 165 row: next live body 1 px off, 136,375 / 50,661 px; census 0
  but reachable), (B) Scene ON "But it failed!" after a no-effect attackanimation starts ~40 frames early (519 uses / 234 battles). #153
  quantified. Supervisor: aud118Run.sh on `ac2f2b7ee` — 15 receipts same.
- fix122 (MAIN lane, Opus, on master `e360735e3` .. `c9e13b69f`, src `649b374d9`): both audit-26 fixes landed; (B) restricted to ROM-proven
  sites and every measured class matched: Reflect / Rain Dance / Protect / Detect / Endure / Stockpile (glyph 40), Light Screen / Safeguard
  / Sunny Day / Sandstorm / Hail (41), Leech Seed (74) — 12 / 12 classes -> 0 residual, Scene OFF byte-identical; census 0 status changes.
- iu120 (INTEGRATION, Opus, `df2671638` .. `5f07587c1`, merged `99462e31d`): idle98's universal pre / post rows folded into land97's lead
  hold (P + N + D + T; Struggle and other unmeasured bodies 0 / 0): 14 / 14 render routes; census: 0 status changes, 23,870 commands +P+T
  (+95,148 frames), Scene OFF unchanged; 283 timing pins / 68 files via tests/helpers/iu120Rows.ts. The app-only
  `presentation-rng-playable-live-bodies-seeded-on` trace now moves 120 / 173 captures (fixed capture frames vs a longer timeline):
  regenerate its capture frames with tools/integration/presentationRngTraces.ts (not done). Supervisor: iu120Run.sh ALL SAME.
- off121 (SIDE, Opus, `4170dd954` .. `aeae8ab9f` + supervisor runner fix `1285f3c84`, merged `01811d964`): Scene OFF `status` command ends
  at the next print (move-inflicted 32 -> 2, sleep turn / faint -> 1, wake-up 2, item cure 35, Rest 38; Toxic G+51 / Thunder Wave G+50
  exact); OFF 8,479 status commands 0 mismatches (-235,502 frames); Scene ON byte-identical. Evidence: Scene ON status animations are
  missing (PSN 71 / PRZ 39 / BRN 39 / SLP 97 rows) -> ISSUES #168. Supervisor: off121Run.sh failed on setup (no reference/ link in its
  archive copies) -> fixed -> ALL SAME, 18 / 18 probes r1 == r2.

## 2026-10-11 — User-directed Struggle inclusion (docs only)

The user explicitly included Struggle 165 in S10A after reviewing its roadmap exclusion. It is the first next-run animation task,
alongside #166, under `docs/struggle-integration-scope.md`. ROADMAP, supervisor/worker instructions, verification scope, local setup,
live-status pending work and census guidance now record this requirement. The historical 276 accepted bodies retain their counts;
Struggle is one additional required body, currently missing and unaccepted. Extend accounting before live promotion and include it
in headline ordinary-play coverage. S10A cannot be completed while this adapter remains missing.

No production change or run launch: src `14d1be15`, tests/build receipt on `758cd54cf`, preview `f9a1ef162`, and measured coverage
95.38% / 98.72% remain unchanged. JSON/queue ledger checks, the historical catalogue census (`238+13+25+0+0=276`) and
`git diff --check` passed; no full-suite/build rerun is needed for this docs-only checkpoint under ANIMATION_VERIFICATION.md.

## 2026-10-10 (night) — S10A: 12 production folds + 4 live audits + 7 evidence steps; live share 0..999 93.79 -> 95.38 % of commands (97.37 -> 98.72 % of frames; 99.32 / 99.59 % excluding Struggle); 238 + 13 + 25

- Session start: master `f49b7d03f`, production src `4c4fe4c7` == the 2026-10-10 day final gates' tree -> baseline receipt reused. Oracle
  services (started 2026-10-06) postdate the last oracle / harness commit (2026-08-15). Supervisor baseline census seeds 0..999 (10
  `--index-from` shards, merged with hist73Merge.py) == the day-final report: 93.79 % / 97.37 %, command-key digest `26489b387dcfa50e`.
- prep flat84 (MAIN lane, Opus, `983c99d1d` .. `54cac37bd`, new files only): Flatter 260 as a words-order unit. Plan == ROM endOrder
  47 / 47 bodies (predictions committed first); lends after a Flatter == ROM 61 / 63 fixtures (2 = fixture-history limit; words57 KO
  chain EXACT 9 / 9 consumers, 207 windows); 37 / 37 after-a-Flatter windows 0 px r1 == r2 through the patched renderer; census 0..999
  +44 / +6,401, 0 regressions, keys + digests identical; no pin moves. BANKED -> land86. Named: a first-body player Quick Attack residual
  (NIDORINA -> NIDORINO, 14,223 px ages 14..32, target-shake rows) — to audit.
- Folded Sonnet worker `0364a3bbd` (INTEGRATION) as `005101dfc` (src `9f3b877d`): land82 — doll81's 13 Substitute-doll cells (Dream Eater
  opponent, GrassWhistle player, SolarBeam charge turn both, Lovely Kiss both, Sing player, Sunny Day both as the first self-target swap
  body; Leaf Blade / ThunderPunch defender cells both), 3 pins moved, tests/land82DollCells.test.ts (5 revert experiments fail).
  land82Run.sh (BASE=f49b7d03f): 60 / 60 scenarios r1 == r2, summaries byte-identical to doll81; 6 windows re-rendered through the final
  code 0 px (ThunderPunch GOLBAT row 0 = the control's own shadow). Worker gates: full suite 1,615 files (2 shards), build, differential
  624 byte-identical. Supervisor: census 0..999 on the worker tree vs the baseline: **+77 commands / +18,659 live frames**, 0 live ->
  fallback, keys identical except seed 881 (a Struggle stall cut 2 commands earlier by the 200,000-frame budget; prefix identical);
  land82Run.sh into a fresh dir: probes 60 / 60 r1 == r2, summary / explore / pins `same`; clean merge (src == worker's tested tree) ->
  smoke 448, touched tests 74 / 74.
- Folded Opus worker `271810939` (SIDE, narrow grant) as `3033719c6` (src `e7a4775e` = land82 + cast83): cast83 — ISSUES #143 per-form
  CASTFORM art: new catalog src/assets/gen/castform-forms.json (4 forms' front / back frames, castformPalette[form], the three source tables;
  extractor tools/extract/cast83-extract-castform-forms.ts; form 0 == the existing entries), form-aware field art (battleCommandFieldArt.ts),
  the live renderer's species sheets + `composeLiveArtPalettes` (27 calls); Scene OFF / fallback frames now draw the form too (the ROM
  does). `liveCastformFormDeclines` lifts 29 ROM-proven (move, Castform role, form) keys: 181 windows (58 scenarios, all 3 forms, both
  orientations, elevated CROBAT / GOLBAT / PELIPPER), 134 live all 0 px, r1 == r2. Still declining: unmeasured keys, an unknown form, the
  Substitute swap composite, 5 measured residuals — Ember / Flamethrower BY and Scary Face AT Castform show the same residual with a
  NORMAL-form Castform (live in production today: audit 21 checks), Icy Wind in rain (unexplained). Worker gates: full suite 1,615 files /
  13,267 tests, build, differential 624. Supervisor: census 0..999 on the worker tree vs the baseline **+32 / +6,521**, 0 regressions, keys
  + battle digest identical, 0 frame-length changes; cast83Run.sh into a fresh dir — staged / derived / both receipts == committed.
- Supervisor reproduction of flat84: flat84Run.sh into a fresh dir under the repo (an out dir outside the repo cannot find ../oracle —
  flat77Probe.py's harness lookup) — 35 / 35 non-census receipts `same`.
- Folded Sonnet worker `72fb7db58` (INTEGRATION) as `f0b7bce06`: land86 — flat84's patch (Flatter 260 joins WORDS_ORDER_UNIT_MOVE_IDS,
  liveFlatterWordsPostFree, the marker records the body species), tests/land86FlatterWordsUnit.test.ts (revert: 4 / 4 fail); 32 after-a-
  Flatter windows re-rendered through the final code 0 px, == flat84's checks. Worker gates: full suite (2 shards, 0 failed), build,
  differential 624. Supervisor: census on the worker tree vs land82's **+44 / +6,401**, 0 regressions, keys identical.
- **Union defect caught by the supervisor's union census (fixed `b78274e56`):** land86's patch (cut on the pre-cast83 tree) added a
  `composeLivePalettes` call; cast83 had replaced that function's import with the form-aware `composeLiveArtPalettes`. Both branches were
  green alone and the textual merge was clean, but the union threw ReferenceError on every Flatter words carry: census 17 battles
  aborted (errors 0 -> 17), typecheck TS2552. Fix: `composeLiveArtPalettes(art)` (identical without a Castform form). Census on
  `b78274e56` (src `8150be72`) vs the session baseline: **+153 commands / +31,581 live frames = land82 + cast83 + land86 exactly**,
  0 regressions, 0 errors, keys identical except seed 881's budget-cut tail: **94.35 % / 97.77 %** (start 93.79 / 97.37).
- Supervisor union gates on `b78274e56` (src `8150be72`; land82 + cast83 + land86 + the fix), in a detached worktree: typecheck, full
  suite 1,617 files / 13,276 tests (2 shards, 0 failed), build, differential 624 / 624 byte-identical vs `f49b7d03f`
  (logs `.integration/validation/union-302e39bdb/`).
- Live audit 21 (SIDE, Opus, `7d21cea69` .. `f8889dc5b`, new files only): **DEFECT — player Quick Attack 98**: `quickAttack.ts`'s fitted
  `targetBaseX2 = -1` (prep7's PIDGEOTTO -> ONIX first body) drew every other target 1 px left: 16 / 18 windows 14.2k..18.7k px
  (NIDORINO / SNORLAX / CROBAT; ONIX after its first body); flat84's "Quick Attack residual" is this. cast83's Ember / Flamethrower /
  Scary Face "normal-form residuals" are an ARTIFACT (its checker started windows at the activation; production's accepted windows
  start at activation + 4): aligned, all 0 px, and the 3 declined keys 52:by:1 / 53:by:1 / 184:at:3 lift live 0 px (14 / 14). Icy Wind
  in rain = TIMING-PHASE (lag at age 241 / 242 vs 261; not rain, not the form). land82's doll cells hold for SNORLAX / AZURILL / CROBAT
  / WAILORD incl. the doll-breaking hit; Castform form tracking exact through 4 mid-battle changes (17 / 17 ENTRY windows). -> qa91.
- Main-lane Opus worker ret88 (`942560ccf` .. `338e50763`, src `662f378b`): rung 1 (honest correction) — Return 216 fails closed
  unless returnPowerLevel(friendship) is a proven branch: the 37 live census Return bodies (ReturnStrongest drawn where the ROM plays
  ReturnWeak) -> fallback. Rung 2 — ReturnWeak (friendship < 61, the kernel's 0): order key 40216 + ROM plan (production plan 223;
  predicted `Cf;D0;Cf;Cf;D2;D1` exact per frame 24 / 24 bodies) and the 88-row body live (38 windows, 34 live 0 px, r1 == r2;
  consumer lends after it == ROM 26 / 26). Census 0..999: **+123 commands**, 0 live -> fallback overall, all 84 Return commands live as
  ReturnWeak. Flag: 5 live Double Team consumer windows in the lab show ~317k..364k px on rows 2..57 — the same on a pre-ret88
  control (fixture personality suspected) -> audit 22 priority. Supervisor: census on master vs `b78274e56` **+123 / 0 regressions**,
  keys identical; ret88Run.sh into a fresh dir — every receipt `same`.
- Folded Sonnet worker `d0eb37dfc` (INTEGRATION) as `edc46c8c0` (src `615e6cb3`): land87 — reseed85's occupancy shadow
  (liveSpriteOrderHost.ts), tests/land87WordsOccupancyReseed.test.ts (revert: the 4 reseed tests fail); 8 of reseed85's windows
  re-rendered 0 px. Census vs the fixed union **+58 / +6,955** (more than +47: land86's Flatter unit lets 3 Magic Coat + 8 Flatter reach
  the shadow); allocator-unknown 55 -> 6. The branch's own import fix for the union break was dropped in the merge (master fixed the
  call site; an unused import fails noUnusedLocals). Supervisor: census on the worker tree vs `b78274e56` +58 / +6,955, 0 regressions.
- Census on `edc46c8c0` (src `615e6cb3`; all folds so far) vs the session baseline: **+335 commands / +48,264 live frames, 0 live ->
  fallback, keys identical except seed 881's budget-cut tail: 95.01 % / 98.60 %** (start 93.79 / 97.37); 0 errors.
- Supervisor union gates on `edc46c8c0` (src `615e6cb3`; + ret88 + land87): typecheck, full suite 1,619 files / 13,291 tests, build,
  differential 624 / 624 vs `f49b7d03f` (`.integration/validation/union-9df9b234a/`).
- Folded Opus worker `5ac7aa1c7` (SIDE, narrow grant, stacked on audit 21) with audit 21 as `a444b39ef` (src `a9290e8d`): qa91 — the
  Quick Attack target offset is `-(target's tracked rest)` from the impact age (RAM, r1 == r2: ONIX x2 +1 at its first activation, 0 at
  later ones; NIDORINO 0; AnimTask_ShakeMon writes x2 absolutely), not prep7's fitted -1: all 18 audit-21 player windows CHAIN 0 px
  (the ONIX later-body ENTRY rows 0..13 keep 15,274 px — the audit's single-body ENTRY history never learns ONIX was zeroed;
  production always runs CHAIN); prep7 comparators still exact; opponent side unchanged; +2 lines in sceneOnPresentation.ts to pass
  the rest (outside the grant, needed). Census 0..999 identical (no claim moves: the 144 live player Quick Attack bodies now draw
  the target where the ROM does — they were 1 px left). Castform proven keys += 52:by:1 / 53:by:1 / 184:at:3 (audit 21 ARTIFACT;
  14 / 14 windows 0 px); rain Icy Wind stays declined as TIMING-PHASE. Worker gates: full suite 1,617 files / 13,278 tests, build,
  differential 624; qa91Run.sh run B == committed.
- Live audit 22 (MAIN lane, Opus, `6ea53638f` .. `e3af65432`, new files only, on a `edc46c8c0` copy): **no production DEFECT**. ret88's
  Double Team flag is an ARTIFACT (audit20Fixtures.py writes no ageOffset; production's accepted DT framing is age 0 = activation + 1):
  aligned, ret88's 5 windows and the census's newly live PONYTA / BLISSEY Double Teams 12 / 12 are 0 px. ReturnWeak bodies with other
  species 35 / 35 (incl. the idle-rest RATTATA's first body); Swift / Shock Wave / Water Pulse after a ReturnWeak 15 / 15; land87 reseed
  routes incl. two KOs in one pending chain 17 / 17 (after a fixture-level ablation); land86 Flatter-after-Flatter 11 / 11. Runs A / B
  byte-identical. PAPERCUT (2 false alarms tonight): checkers built on audit20Fixtures.py / cast83Check.ts start windows at the ROM
  activation, not the production accepted window — use audit21Align.py.
- Folded Opus worker `bcf20dba8` (INTEGRATION) as `fed91f2de` (src `081a0570`): doll90 — Psych Up 244 defender-doll cell both sides (the
  renderer drew the doll box with the species sheet / bank; now the doll sheet + composeLiveFieldPalettes), Double Team 104 self-target
  swap cell both sides (the ROM skips the stats banner behind a doll; framing {rows 159, shift -1}; the swaps never touch data[3]),
  Sing 47 opponent swap cell (body ends 97 rows after the last on-screen note: predicted 230 / 248 rows for two new pairs before
  probing, measured exactly). Still declining with named residuals: Recover (the doll-FREE controls are off 180k px), GrassWhistle /
  Focus Punch opponent (doll-free controls miss whole-field BG rows), Focus Punch player (one 153-row body, D4 class), Iron Tail,
  Dream Eater player, Dig, Double-Edge. Worker gates: full suite 2 shards 0 failed, build, differential 624. Supervisor: census on the
  worker tree vs `b78274e56` **+37 / +8,760**, 0 regressions; doll90Run.sh into a fresh dir: probes r1 == r2, `same summary.tsv`.
- Census on `fed91f2de` (src `081a0570`; every fold so far) vs the session baseline: **+372 commands / +57,024 live frames, 0 live ->
  fallback, 0 errors, keys identical except seed 881's budget-cut tail: 95.15 % / 98.63 %** (start 93.79 / 97.37).
- Supervisor union gates on `fed91f2de` (src `081a0570`): typecheck, full suite 1,621 files / 13,308 tests (2 shards, 0 failed), build,
  differential 624 / 624 vs `f49b7d03f` (`.integration/validation/union-d46da5755/`).
- prep scan93 (SIDE, Opus, `9c68cbd0c` .. `eae6920c9`, new files only; merged `4a9f6a06f`): a presentation-only scanline-buffer history
  (battle intro S0; Extrasensory modelled — its target window, both banks, no randomness; Memento / Dragon Dance / Rapid Spin / Acid
  Armor / Dig / Surf / Spite invalidate; Psywave and every general / status script write nothing): prediction == RAM on 67 / 67
  known-history activations (22 scenarios x2 fresh), and display-neutral (28 / 28 live renders identical with S0). Patch A: Memento
  later bodies live (+4 / +713). Patch B (player Extrasensory later bodies) NOT taken: its dominant-phase windows keep 16..11,293 px
  (the scanout-split line is per-row, `event` in 11 / 11 later windows) — D4 requires 0 px in the dominant phase.
- Folded Sonnet worker `a05831276` (SIDE, narrow grant) as `b6030846b` (src `2e5b1d7c`): land96 — scan93 patch A
  (src/engine/liveScanlineHistory.ts, the order host carries / lends it, the Memento later-body gate), 2 pins moved,
  tests/land96ScanlineHistory.test.ts (103 scan93 receipt bodies; revert fails 3 / 7); 17 windows re-rendered 0 px == scan93's checks.
  Worker gates: full suite 2 shards 0 failed, build, differential 624. Supervisor: census on the worker tree vs `fed91f2de` **+4 / +713**
  (the 4 player Memento later bodies), 0 regressions, keys + battle digest identical; clean merge (src == the worker's tested tree) ->
  touched tests 18 / 18.
- prep idle94 (MAIN lane, Opus, new files only): the accepted-window-after-activation convention quantified — ordinary play loses
  L = pre (3) + N (lead) + trail + post (2) frames per live body (20 / 20 ROM scenarios ON / OFF); lead N > 0 on 100 of 552 adapter-sides
  (5,124 census commands); for 40 moves the N lead rows == production's own age-0 frame -> BANKED patch (40 ids present D + N rows;
  3,842 commands +N frames, 0 status changes, keys identical; 30 pins in 16 files) -> land97. Flagged: STATS_CHANGE (production's `stat`
  command 2 frames vs the ROM's 75-frame General_StatsChange, Scene ON and OFF) and the Scene OFF status-move pause (35 frames, no
  production command) -> idle98 measures them.
- Folded Opus worker `12ea561d1` (INTEGRATION) as `f4dbfe1f4` (src `e3c8092c`): ctl95 — doll81 / doll90's DOLL-FREE control residuals
  classified: **GrassWhistle 320 DEFECT fixed** (the BG fade-back starts 2 rows after the last on-screen note — position-dependent;
  production used fixed per-side ages 163 / 166; four new pairs predicted before probing, all matched; + the elevated opponent's shadow
  on rows 221..224): 12 bodies 228k / 181k -> 0 px, accepted fixtures still exact; **Iron Tail 231 DEFECT fixed** (the metal band is
  masked by the attacker from the first step, not from a scroll gate fitted to AZUMARILL): 14 bodies 8..244 -> 0 px; **Recover 105
  ARTIFACT** (the adapter's age 0 is the first orb, 10 rows after activation; the doll labs started at the activation) -> its doll cell
  lands both sides {184, -10}; GrassWhistle opponent doll cell; **Focus Punch 264 = CPU-timing** (a dropped frame at age 131 varies per
  body, `gRng2Value` repeats exactly in the 154-row bodies; production's fixed per-side phase is right on 3 / 13 opponent and 5 / 9
  player lab bodies) -> D4 entry (fp100, in flight; the standing D4 approval covers it). Census vs `fed91f2de` **+24 / +6,779**
  (GrassWhistle opponent 11, Recover 13), 0 live -> fallback; seed 796 (a Struggle stall) cut one command earlier (prefix identical).
  Supervisor: census reproduced, ctl95Run.sh fresh: 30 scenarios r1 == r2, `same summary.tsv`; union `f4dbfe1f4` census 95.25 / 98.67 %.
- Folded Opus worker `e75653c2d` (SIDE, narrow grant) as `853642606` (src `47b5b0c8`): fury99 — Fury Cutter 210 counters 2..5 at later
  bodies: the counter is `request.rolloutCounter` (plans54); only the slice direction (counter & 1) and the palette blend (none / once /
  three times, from source; the target's bg copy blends too) change; no history to carry (the blend sprite restores the palettes);
  ONIX-type rests zeroed by the previous hit. 49 / 50 ROM windows 0 px (r1 == r2; the 50th is a counter-1 first body that still
  declines). Census vs `b6030846b` **+36 / +1,548**, 0 regressions, keys + digests identical. Supervisor: census reproduced.
- prep idle98 (MAIN lane, Opus, new files only): pre (3) / post (2) rows are universal (37 / 37 damaging + status bodies); BANKED
  `idle98-universal-rows.diff` (23,814 commands +3 / +5 frames, keys identical; 273 timing pins in 65 files — next session). Filed ISSUES
  **#166** (General_StatsChange is MISSING in both scenes: 75 / 89-frame stat-arrow overlay vs a 2-frame `stat` command; 897 / 1,000
  battles, ~8.6 % of the timeline) and **#167** (Scene OFF no-hit pause, 36 % of move bodies; miss pause to anchor).
- Folded Opus worker `0419a5aec` (INTEGRATION) as `16d0b355b` (src `72e4e0ab`): fp100 — Focus Punch 264 under the standing D4 approval:
  the age-131 lag is the dominant phase on both sides (opponent 14 : 3, player 9 : 5 measured bodies; fixed lags at 30 / 151 / 152), a
  `liveMoveTimingPolicy.ts` entry (event), `focusPunch.ts` `restoreLag` (default reproduces the accepted bodies), 155-row duration both
  sides; dominant-phase windows 22 / 22 0 px (the 14 opponent ones were 271k..292k px before); minority-phase residual = rows 132..147
  only (16,972..18,267 px / row, the fade-back starting one row earlier) + the elevated GOLBAT's shadow on row 154 (200 px); the accepted
  opponent fixture is now the documented minority. **Accounting: 239 + 13 + 24 -> 238 + 13 + 25 = 276** (264 scoped exact -> faithful
  timing; Factory acceptance unchanged). +3 lines in sceneOnPresentation.ts (the lsbz precedent). Supervisor: census on the worker tree vs
  `f4dbfe1f4`: exactly the 19 opponent Focus Punch commands 154 -> 155 frames, 0 status changes, keys identical, 0 errors.
- prep stat101 (MAIN lane, Opus, new files only): the ISSUES #166 pack — source table (stat -> palette, direction -> scroll / BG X,
  sharply -> fade / hold, battler -> OBJ-window mask), 20 ROM variants ON == OFF with per-row register tables, the production consumer map
  (the kernel already emits STATS_CHANGE; the builder ignores it; ON and OFF share one renderer; the sprite-order host already consumes
  it; the invisible copy takes slot 3), exposure (4,529 inserted commands, +363,860 frames) and six bounded slices (a)..(f) with
  acceptance commands (docs/stat101-stats-change-design.md).
- Live audit 23 (SIDE, Opus, `7fc640b62` .. `fb56ec6d3`, new files only; merged): **no production DEFECT** — GrassWhistle (elevated
  attacker / target, big / small; the elevated BUTTERFREE's fade-back starts 13 rows before the old constant) 10 / 10, Iron Tail 6 / 6, Fury
  Cutter counters 1..5 with Extrasensory / Tackle / Growl in between and target switches 16 / 16 live (2 = a fixture-level ARTIFACT), Memento
  later 4 / 4, Psych Up doll 8 / 8, Double Team swap 9 / 9, Sing opponent 4 / 4, Recover swap 8 / 8; runs A / B 142 receipts byte-identical.
- prep stat102 (MAIN lane, Opus, `1e84d59c7` .. `458e62453`): ISSUES #166 slices (a) + (b): the pure reducer `src/animation/statsChange.ts`
  (UNWIRED: statsChangeParams / statsChangeSpan / statsChangeRow — a literal replay of StatsChangeAnimation_Step3; only row anchors from the
  ROM) pinned on every row of all 20 stat101 ROM tables (1,684 rows; 4 one-constant mutations each fail); the comparator on it through the
  production corner: 20 / 20 windows 0 px, Scene ON and OFF (`docs/stat102-stats-change-reducer.md`). Next: slice (c).
- Folded Sonnet worker `ac0ea1e70` (INTEGRATION) as `a2f01119b` (src `8706d10c`): land97 — idle94's lead rows for 40 adapters
  (`liveMoveIdleLeadRows` in battleResolutionPresentationRender.ts; Scene ON only; Substitute-swap composites keep 0), 30 pins in 16 files
  +N, tests/land97IdleLeadRows.test.ts; idle94's runner on the new base SAME (8 / 8 routes); census: 3,842 commands +N frames, 0 status
  changes, keys + battleDigestExcludingFrames identical; Scene OFF unchanged (battles 154 / 3). The app-only differential trace
  `presentation-rng-playable-live-bodies-seeded-on` samples Shadow Punch (N = 8): 163 / 173 captures differ vs pre-land97 bases (intended;
  canonical railroad traces byte-identical).
- Live audit 24 (SIDE, Opus, `a6b4defc9` .. `89c315fec`, new files only; merged `bb4057853`): **DEFECT (land97)**: an ELEVATED opponent
  attacker's lead row 0 misses the enemy shadow (200 px; the ROM's activation row still shows it): Shadow Punch HAUNTER, Bite CROBAT, Sludge
  Bomb GOLBAT; everything else exact (18 land97 windows, 6 Substitute-swap bodies, Scene OFF battle 38 identical). **Fixed narrowly by the
  supervisor (`86d983b80`)**: an elevated opponent attacker keeps NO lead rows (exactly the pre-land97 presentation) until the row-0
  shadow is modelled; pins: the HAUNTER route back to 0..104, a new elevated-case test. fp100: 5 lag-phase bodies 0 px, 5 minority
  bodies rows 132..147 only (pooled opponent 16 : 7, player 12 : 6 — lag still dominant). NEW D4 candidate: Shadow Punch's optional
  lag at body age 90 (4 : 4 pooled; production renders the no-lag phase = the accepted fixtures).
- prep reseed85 (MAIN lane, Opus, `fdd28d635` .. `28c610da8`, new files only): the post-KO send-out allocator reseed after a words-order
  unit. The reseed reads slot OCCUPANCY only and every words unit is allocator-net-zero, so the order host can keep a word-free
  occupancy shadow while the free order stays deferred. ROM: 13 routes x 2 probes x 2 runs A == B; 4 / 4 words-vs-control pairs SAME
  occupancy, differing free order; 20 / 20 windows 0 px through the patched renderer; census +47 / +4,834 (allocator-unknown 52 -> 6),
  keys + digests identical; no pin moves; runner 13 / 13 receipts byte-identical. BANKED -> land87 (in flight).
- FINDING (supervisor, from the census + source): the live Return 216 body adapter renders ReturnStrongest for every request and never
  reads `request.friendship`; the kernel sends friendship 0 (ret80 / #165), where Move_RETURN plays ReturnWeak (two dips + one hitsplat).
  37 census Return bodies were therefore wrong live claims. ret88 (MAIN lane) fails them closed first, then builds the Weak body + plan.
- prep shadow105 (MAIN lane, Opus, `f1ae16291` .. `eb5245cc2`, new files only): the ROM shows an elevated opponent's enemy shadow on idle
  LEAD row 0 only (N = 4 / 8 / 10 measured), WHICHEVER side attacks — so a PLAYER attacker into an elevated opponent was also 200 px wrong
  on row 0 (219 live census commands; audit 24's decline covered only opponent attackers). BANKED `shadow105-lead-row0-shadow.diff`
  (keeps the move effect, draws the shadow on row 0, removes the decline): every lead row 0 px on 11 bodies / 5 census routes; census
  239 + 219 commands regain +N, 0 status changes. **Supervisor fix `758cd54cf`**: no lead rows while an elevated opponent is on the field
  (either attacker) — census vs `bb4057853`: exactly 219 more commands back to the pre-land97 presentation, 0 status changes, 0 errors.
- prep sp103 (SIDE, Opus, `8346c7de9` .. `150f1a8a6`, new files only; merged `14e67eb2c`): Shadow Punch 325's age-90 lag is DOMINANT on
  both sides (fresh 11 : 1 player, 10 : 2 opponent; pooled with audit 24 13 : 3 / 12 : 4); BANKED D4 patch `sp103-shadow-punch-d4.diff`
  (237 + 13 + 26 if landed): lag-phase opponent windows 10 / 10 0 px, player lag rows 0 px (a known trail row aside).
- Supervisor FINAL gates on `758cd54cf` (src `14d1be15`; every fold + the audit-24 / shadow105 lead-row fixes): typecheck, full suite **1,627 files / 13,387
  tests** (2 shards, 0 failed), build; differential vs `f49b7d03f` (session start): `fight-submenu` 235 / 235 and `battle1-postwin-next-prompt`
  216 / 216 byte-identical; `presentation-rng-playable-live-bodies-seeded-on` 10 / 173 (163 differ = land97's 8 Shadow Punch lead rows by
  the player HAUNTER shifting every later capture; intended). Census seeds 0..999 (10 `--index-from` shards; two runs on `bb4057853` byte-identical, re-run on `758cd54cf` = 219 lead-row commands
  -0 status changes; `report-seeds0-999-final-20261011-night.json` is the `758cd54cf` run): **95.38 % of move-animation commands / 98.72 % of frames** (start 93.79 / 97.37);
  excluding Struggle (1,089 commands, outside the 276) **99.32 % / 99.59 %**; +436 commands vs session start, 0 live -> fallback,
  0 errors, keys identical except two Struggle stalls' budget-cut tails (seeds 796 / 881, prefixes identical); seeds 0..299 **99.12 % /
  99.68 %** (start 97.98 / 98.40; on `bb4057853`); seeds 50000..50999 96.67 / 98.84 % (start 95.20 / 97.18). Preview <http://127.0.0.1:5191/> serves `f9a1ef162` (src `14d1be15`):
  4 samples hash-equal (canvas == ABI == screenshot), session export + ON -> OFF restart passed, no browser errors
  (`playable-preview-66dbf4973-receipt.json`). Soak gates not run (S10A scoped policy; no kernel / rules / RNG file changed tonight).

## 2026-10-10 (day) — S10A: #159 fixed, 12 production folds + 7 audit / evidence steps; honest corrections (Castform, Return); ordinary-play live share 0..999 91.89 -> 93.79 % of commands (95.82 -> 97.37 % of frames); 239 + 13 + 24

- Session start: master `82690e775`, production src `06b791ff` == the 2026-10-09 final gates' tree (`final-supervisor-gates-20261009-day.json`)
  -> baseline receipt reused, no fresh baseline run. Oracle services predate the HEAD commit time but no oracle/harness file changed since
  2026-10-01 (`git log -- oracle run-oracle.sh`), so `check-oracle-freshness.sh`'s FAIL is the HEAD-time heuristic only; workers use
  direct mGBA.
- Folded Opus worker `a8f2c5aef` (SIDE, narrow grant) as `5f8279de1` (src `c3ab72f5`): sw67 — Shock Wave 351 geometry-keyed sprite-order
  plan. shockWave.ts's lifetimes were already source-correct; plans51's "window 37" divergence was its generator tracking sprites by kind /
  birth age instead of SLOT occupancy (CreateSprite lowest free, `sprite.c:502-511`; BattleMainCB2 runs AnimateSprites before RunTasks,
  `battle_main.c:1863-1869`, so a charging particle's slot passes to the bolt created on its destroy frame). New
  `shockWaveSpriteOrderPlanText` + `liveShockWaveSpriteOrderPlanText` (case 351 in `liveMoveGeometrySpriteOrderPlanText`), 351 in
  `SPRITE_ORDER_GEOMETRY_KEYED_BODIES`. plans48's 8 ROM receipts 8 / 8 exact; geometry classes depend on the attacker species only (player
  106 / 102 / 104 windows, opponent 79 / 86); predictions committed before an 18-pair grid -> 18 / 18 per-frame exact, r1 == r2. Census
  0..299 +4 / +781, chain predictor 3 / 693 == measured, 0 regressions, key sequence + digest identical; ON/OFF parity (Castform route).
  Worker gates 1,598 files / 13,159 tests, build, differential 624. Supervisor: `sw67Run.sh` into a fresh dir — every output == committed;
  clean merge (src == worker's tested tree) -> smoke 448, the 16 Shock Wave test files 61 / 61.
- Folded Opus worker `b14b70b9a` (INTEGRATION) as `024b846bb` (src `10884465`): hide66 — ISSUES #159 sprite half. The ROM's
  semi-invulnerable charger is an invisible OBJ (`battle_anim_flying.c:476 / :975 / :1016`, `battle_anim_ground.c:327 / :366 / :374`), its
  shadow follows (`battle_gfx_sfx_util.c:1214`), the doll is the same sprite. `liveMoveHiddenSides(view.visibility, request)` (non-attacker
  side only) is passed through `liveMoveAnimationPresentation` and `renderSceneOnMovePresentation`, which draw the hidden side's sheets
  transparent (both `liveSceneOnBattlerArt` and the per-move species maps) and skip its shadow; no module-global flag. Census 0..999 on
  `82690e775`: **90 live commands / 12,744 frames had drawn the hidden battler -> 0**. Sky Uppercut 327 at a hidden target fails closed
  (`liveMoveHiddenTargetDeclines`: the ROM skips its 148 / 149 lag frames when the target is invisible; 1 command / 188 frames). fly63
  re-landed by reverting the revert. Audit-17 windows through production (no patch): 104 / 104 r1 == r2, Heal Bell / Double Team hidden
  span 20 windows -> 0 px, 67 / 67 earlier 0-px windows unchanged. Census 0..299 +10 / +1,203 (fly63 +11 / +1,391 minus the Sky Uppercut
  body); on 0..999 two bodies of battle 713 (Barrier, Magic Coat after a Bounce) go live -> fallback "allocator history unknown" (from the
  fly63 re-land; audit 18 explains). ON/OFF parity on a Fly and a Dig route. Worker gates 1,599 files / 13,163 tests, build, differential.
  Supervisor: `audit17Run.sh` on the branch into fresh dirs — 38 / 38 check receipts byte-identical to `fixtures/hide66-audit17/`.
- Supervisor union gates on `024b846bb` (src `10884465`; sw67 + hide66): typecheck, full suite 1,600 files / 13,169 tests, build,
  differential 624 / 624 vs `82690e775`, census seeds 0..299 **97.15 % / 98.16 %** (+14 / +1,984 vs `82690e775` = the sum of both folds;
  0 regressions, key sequence + digest identical) (`tools/integration/fixtures/union-gates-f3efec8bf.json`).
- Preview <http://127.0.0.1:5191/> serves `8fd7eea70` (src `10884465`): 4 samples hash-equal (canvas == ABI == screenshot), session
  export + ON -> OFF restart passed, no browser errors (`playable-preview-31f11ed70-receipt.json`).
- Folded Opus worker `5cb9a1d7d` (INTEGRATION) as `889a5baf6` (src `afcf8175`): land68 — the two BANKED patches. prep65: Dive 291 joins
  `WORDS_ORDER_UNIT_MOVE_IDS`, `TWO_TURN_ANIM_MOVE_IDS` / `SEMI_INVULNERABLE_SETUP_MOVE_IDS` gain 291 (the order host now hides the diver
  like the render's hide66 span — a new agreement test failed on master's host), `deferredBodyOrderKey` arms the marker on the 10291
  event, `liveDiveWordsPlanText` / `liveDiveWordsPostFree`; new tests/spriteOrderPrep65.test.ts (vectors via `land68DiveVectors.ts`,
  fixtures/land68/dive-vectors.json; revert experiments fail). prep64: SUBSTITUTE_FADE -> the existing empty plan 9 (generator
  regenerated, byte-identical to the banked diff) + allocator NET-ZERO; the 6 listed pins moved, tests/spriteOrderPrep64.test.ts added.
  Census 0..299 vs `024b846bb`: **+51 / +9,091** (= prep65 +35 / +5,361 + prep64 +16 / +3,730 exactly), 0 regressions, key sequence +
  digest identical; 0 frames draw a hidden battler; ON/OFF parity on a Dive and a Substitute-broken route. Worker gates 1,602 files /
  13,180 tests, build, differential 624. Supervisor: fresh prep61 DIVE / HIDDENHIT probes (12 jobs x2, 0 A/B differ) -> units sha256 ==
  `fixtures/prep65/units.sha256`, host-words + check == committed (15 / 15 plan == ROM, 215 frames, 7 / 7 lends); `prep64Run.sh
  SKIP_CENSUS=1` all `same` (11 / 11); census rerun +51 / +9,091, key sequence + digest identical; clean merge (src == worker's
  tested tree) -> smoke 448, touched tests 68 / 68. Census seeds 0..299 now **97.79 % / 98.94 %**.
- Mid-session census, seeds 0..999, src `afcf8175` (after land68): **92.95 % of move-animation commands / 97.13 % of frames** live
  (session start 91.89 / 95.82). New order-host stop from today's hidden rules: "faint-animation of a hidden battler" 4,010 / 26 (+ reshow
  616 / 4). Allocator history unknown 18,554 / 183 (Protect 10.8k, Light Screen 3.3k, Magic Coat, Barrier).
- prep plans69 (SIDE, Opus, `f0381b4a5`, new files only; merged `2c77c9c61`): the remaining order-host stops, predictions committed
  first, 104 direct-mGBA jobs x2 (0 A/B differ) + 24 Magnitude power runs. EXACT: CASTFORM_CHANGE (empty plan, 8 / 8), Conversion 2 176
  (8 / 8), Needle Arm 302:opponent (6 / 6, a burst split 9 + 1 merged), Magnitude 222 keyed by `gAnimMovePower > 99` ("" 36 / 36,
  `Cf;D0;Cf;D1` 8 / 8). Kernel payload gap: the Speed Boost tick never set `animArg1` (ROM `battle_util.c:2646` = 17) -> "stat
  animation 0 / 3" stops. Negatives with resume conditions: Ice Ball 301 (marker only at entry occupancy, lends only to Ice Ball;
  Mud-Slap's chains all meet an Ice Ball), Hyper Beam (Random2 + geometry), Flatter / Astonish (Random2), Odor Sleuth (geometry by
  target). Supervisor: `plans69Run.sh` into a fresh dir — all 28 artefacts == committed (probes, check, rows, 3 x 3 census ranges, chains,
  fold pins).
- Folded Sonnet MAIN-lane worker (master `9d33e860d` .. `cd7930472`, src `a96642c9`): fold71 — plans69's rows (generator regenerated,
  bodies 543 -> 550, plans 221 -> 222, `CASTFORM_CHANGE`), the `20222` Magnitude-intense host key (+ three tooling mirrors), the Speed Boost
  tick's `animArg1 = STAT_ANIM_PLUS1 + STAT_SPEED` (only reader: `battleScriptStatbuffchangeOpcode.ts:334` readsAnimArg1 -> event
  arguments) with a Tier-1 test (17 on the first and a later activation). Worker: 3 census ranges +43 / +5,594, digests + key
  sequences identical; ON/OFF parity seed 927 (Ninjask); full suite (2 shards) 1,603 files, build, differential 624. Supervisor: census
  seeds 0..999 (one run) `afcf8175` -> `a96642c9`: **+49 / +8,403, 93.13 % / 97.34 %**, 0 regressions, key sequence + digest identical, 0
  render throws (range-split runs are a different battle set — liveShareCensus restarts ids per range — hence the different delta);
  touched tests 41 / 41 (incl. the executable-frontier ratchet).
- Folded Opus worker `fa6d3669b` (INTEGRATION) as `45c23b901` (src `5cd1b684`): dive70 — the Dive 291 ATTACK body (turn 1) live
  adapter: 93 rows (prep25's "92" is the first inactive age), the real-slot profile from `liveDiveWordsPlan` (the same allocation as
  land68's order carry), 56 host words shaped 20 + 9 x 4, the resolved lend; declines on a shiny battler / displayed status / an elevated
  opponent diver (no census Dive user is elevated); no row-0 shadow for the still-invisible opponent diver. Dive stays one faithful-timing
  adapter with the D3 flag, scope now both bodies. 15 windows 0 px both sides (CHINCHOU / LANTURN / CLAMPERL / SEEL, elevated GOLBAT and
  WAILORD targets, Surf / Whirlpool at the hidden diver, a Protect history; the ROM plays no attack body on a protected Dive), r1 == r2 x2
  batches; ON/OFF parity battles 68 / 162; seed-111 ordinary route + export replay. Census 0..299 +15 / +1,395, 0 regressions, key
  sequence identical; the 19 Dive attack bodies' length moves 32 -> 93 (live or fallback). Open: the Whirlpool-at-hidden-diver lend
  residual (ISSUES #160, 0 px in its window). Worker gates 1,603 files / 13,185 tests, build, differential 624. Supervisor: the 15
  committed fixtures through `liveAdapterFramebuffer.ts` with fresh probes — 15 / 15 93 rows 0 px, r1 == r2, digests == the receipt.
- Supervisor union gates on `45c23b901` (src `5cd1b684`; fold71 + dive70): typecheck, full suite 1,604 files / 13,191 tests, build,
  differential 624 / 624 vs `cd7930472`, census seeds 0..299 **97.98 % / 98.96 %** (by the census's own frame total; +15 / +1,395 vs land68's = dive70; fold71 changes
  nothing on 0..299), 0 regressions, key sequence identical (`tools/integration/fixtures/union-gates-702313ef1.json`).
- Live audit 18 (SIDE, Opus, `c09bfd03e`, new files only; merged with fix74 as `ce51c7444`): 442 windows (Fly / Bounce / Dig / Dive hidden
  spans x Safeguard / Wish / Bulk Up / Rest / Iron Defense / Double Team / Sandstorm / Earthquake / Light Screen, Shock Wave chains 40,
  SUBSTITUTE_FADE 17, 85 no-unit controls), explicit lab seeds. **No production DEFECT**; production's hide == the ROM's invisible flags
  442 / 442; hidden-span consumers 0 px or = control. TIMING-PHASE: the player's Light Screen with the opponent Dive-hidden (the ROM drops
  the age-68 / 69 lag frames, 148 px over 8 rows). OPEN, Factory-unreachable: Sandstorm with GOLEM hidden by Fly (1 row; fix74 found
  SKARMORY / SWELLOW 0 px). Method corrections: a player-locked strike turn has no prompt (production invalidates -> fallback, safe);
  missed strikes; Shock Wave consumers need the field + lent order. Battle 713 explained (hidden-battler reshow; master's fallback is the
  safe direction). Supervisor: `audit18Run.sh` into fresh dirs on master — the same 4 DIFF windows, no new verdict class; text receipts
  byte-identical (c713 differs only by dive70's live Dive attack).
- Folded Opus worker `318b7e199` (SIDE, narrow grant, stacked on audit 18) in `ce51c7444` (src `e6f98bf9`): fix74 — `liveMoveHiddenTargetDeclines`
  also declines a PLAYER Light Screen 113 while the opponent is hidden (any of Fly / Bounce / Dig / Dive; the opponent's Light Screen stays
  live). Bulk Up 339: the brief's premise (species-dependent) was REFUTED from source + ROM — `Move_BULK_UP` frame counts are
  species-free; the species inputs (y_offset height, corner, scaled picture, breath origin) are already source-derived; audit 18's
  CHANSEY residual was its own framing (production's accepted window starts 4 rows after activation, at the first grown frame). 22 windows
  (PRIMEAPE / SLAKING / HERACROSS / MACHAMP / URSARING both sides x SNORLAX / SHUCKLE + CHANSEY) 0 px, predictions committed first;
  inventory scope line updated. Flagged, not changed: adapters whose accepted window starts after activation present a body 4 idle frames
  shorter than the ROM (Bulk Up, Swagger, Scary Face, Taunt, Iron Defense, ...) — a shared convention. Census 0..999: 0 changes. Worker
  gates 1,606 files / 13,219 tests, build, differential. Supervisor: `fix74Verify.ts` on all 22 fixtures with fresh probes — 22 / 22 0 px.
- Folded Opus worker `fb82e75bb` (INTEGRATION) as `ab2414692` (src `9ec2aba1`): ice72 — Ice Ball 301 is a words-order unit for ANY consumer
  (`WORDS_ORDER_UNIT_MOVE_IDS` + 301, `DEFERRED_LEND_MOVE_IDS` = the words units, the marker at a role-isomorphic occupancy with the body
  species, the carry `liveIceBallWordsPostFree` at the body's words / counter / species). 32 ROM Ice Ball bodies (both sides, counters
  1..5, 10 at a non-entry occupancy): plan == ROM 31 / 31 + 1 fail-closed (Onix idle-rest x2), consumer lends 27 / 27, nested 42 / 42,
  chains 46 / 47; predictions committed before comparison. Census 0..999 (3 ranges) +76 / +7,295 (chain predictor +32 / +3,523; the
  rest are later Ice Ball bodies and Mud-Slap chains), 0 regressions; ON/OFF parity battle 19 (63 boundaries); presentation-seed replay.
  Six tests that encoded the old "Ice Ball lends only to Ice Ball" rule updated (all fail in the revert experiment). Supervisor:
  `ice72Run.sh` into a fresh dir — r1 == r2, every receipt == committed.
- prep hist73 (MAIN lane, Opus, `6dc80c815`, new files only): Part A — the allocator bucket's top stops are 37 live bodies no allocator
  audit covered; all 37 NET-ZERO (154 run pairs A == B); temp patch census 0..999 +119 / +12,250 == predictor (67 % of the bucket; residual
  = post-KO reseeds blocked by words-unit order plans). Part B — a hidden battler's faint frees its slot like a visible faint; a reshow
  with the opponent hidden allocates like a normal reshow and re-creates it INVISIBLE (CopyAllBattleSpritesInvisibilities, so hide66's
  render hide is right and its doc sentence about Scene ON is wrong); temp patch +33 / +4,854. Both +154 / +17,256. Supervisor:
  `hist73Run.sh SKIP_CENSUS=1` into a fresh dir — 308 + 20 probe runs A == B, both audit receipts == committed.
- Supervisor union gates on `ce51c7444` (src `e6f98bf9`; ice72 + fix74): typecheck, full suite 1,607 files / 13,225 tests, build,
  differential 624 / 624 vs `a7904fcc0`, census seeds 0..299 **98.53 % / 99.28 %** (+44 / +3,730 = ice72; 0 regressions, key sequence +
  digests identical) (`tools/integration/fixtures/union-gates-dc173666b.json`). ISSUES #159 closed (hidden-span bodies ROM-checked by audit
  18; Sky Uppercut / player Light Screen at a hidden battler fail closed by design).
- Folded Opus worker `096266253` (INTEGRATION) as `c661631c6` (src `8e543d91` + st76): land75 — hist73 Part A (37 audited NET-ZERO bodies
  in `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`; pins moved as hist73 listed + `playableAnimationIntegration`'s Light Screen seed 84) and
  Part B (`liveSpriteOrderHost.ts`: a hidden battler's faint = the visible faint plan and un-hides; a reshow with a hidden opponent = the
  normal reshow keeping `hidden`; a hidden player at a reshow / a hidden battler's switch-in still invalidate; the render hide already
  clears on faint / switch commands). hide66's doc sentence corrected (the reshow re-creates the charger invisible:
  CopyAllBattleSpritesInvisibilities). Dense route checks 0 px, r1 == r2: wall seeds 10 (Barrier) / 260 (Magic Coat after a Dive setup) /
  Light Screen seed 84. Census 0..999 (10 `--index-from` shards): **+154 / +17,256, 93.70 -> 94.26 % / 97.64 -> 98.08 %**, key sequence
  + digests identical, 0 regressions; ON/OFF parity battles 533 / 713. Supervisor: `land75Run.sh` into a fresh dir — every receipt same.
- Folded Opus MAIN-lane worker (master `4573df325` .. `0fb3cf930`, src `e7eec09f`): st76 — the "battler has a status condition" gates of
  Dive 291 (both bodies) and Meteor Mash 309 removed: the live view redraws both healthboxes (status icon included) over every live body.
  12 statused windows (PSN / BRN / PRZ / SLP on attacker or target, both sides), r1 == r2: 10 x 0 px, the 2 Dive setup windows show only the
  documented D4 phases (player row 68, 284 px; opponent age-64 lag, 15,777 px). Census 0..999 +31 / +4,035, key sequence + digest
  identical; ON/OFF parity seeds 428 / 518. Flagged: a Dive attack extra lag at age 17 on poisoned player divers (5 / 34; ISSUES #161).
  Supervisor: the 12 fixtures through `liveAdapterFramebuffer.ts` with fresh probes == the worker's table.
- Supervisor union gates on `c661631c6` (src `d73cf1af`; st76 + land75): typecheck, full suite 1,610 files / 13,235 tests, build,
  differential 624 / 624 vs `ce51c7444`, census seeds 0..299 **98.62 % / 99.34 %** (+7 / +740 = st76; land75's gains are all on seeds
  300..999), 0 regressions, key sequence + digests identical (`tools/integration/fixtures/union-gates-f60c16622.json`).
- Live audit 19 (SIDE, Opus, `0b2994d78`, new files only; merged `9115d5ec3`): 599 windows / 130 scenarios (Magnitude both power
  classes 37, Conversion 2 59, Needle Arm 44, Speed Boost 31 (argument 17 in all 45 ROM events), Castform 48, Ice Ball 190, Dive 126, #160
  24, controls 40); hide == ROM 599 / 599, r1 == r2 599 / 599, run B and run C byte-identical to run A. DEFECTs: **Castform in a weather
  form drawn as the normal form in 44 live windows** (fold71's CASTFORM_CHANGE plan exposed ISSUES #143's remainder -> ISSUES #162) and a
  latent **Needle Arm 302 SortSprites tie** (6 / 44 lends != ROM, 0 px so far -> ISSUES #163). ISSUES #160 is a dive70 FIXTURE artifact
  (the ROM's action prompt precedes the Whirlpool; with the ROM turn split the lend == ROM; staged as described, 19 windows 0 px) —
  closed. 195 fallbacks are production's own declines (174 after player-locked turns). ice72's player-side counter 2..5 lend evidence
  assumed a prompt every turn (production never lends there; its census gain stands).
- Folded Opus worker `4665cb45a` (INTEGRATION) as `4f5ad0a03` (src `cdae97b8`): cf78 — (1) ISSUES #162: a presentation-only per-slot
  Castform form (the ROM's `gBattleMonForms`, set by every CASTFORM_CHANGE argument, persisting across switches / faints like the ROM's
  per-slot array, reset by a change back to normal and at battle start; carried between resolutions by the orchestrator) gives the field
  `castformForm`; `liveCastformFormDeclines` makes EVERY live body (and the Substitute swap view) fall back while a CASTFORM is shown in a
  weather form — the fallback draws the same normal-form art (the pixel fix is #143's per-form art), but nothing claims those pixels live.
  Census 0..999: **54 commands / 9,587 live frames -> fallback** (battles 950 hail 18, 651 16, 603 rain 13, 643 7; Icy Wind, Water Pulse,
  Ice Beam, Ember, ...), 94.37 / 98.18 -> 94.17 / 97.94 %, key sequence + digests identical; audit-19 windows 404 -> 360 live (exactly the
  44 Castform ones). (2) ISSUES #163: plan 162 (Needle Arm 302) models its SortSprites tie via `fixtures/cf78/plan-overrides.json` (the tied
  pair shares a rank, so their order is the start order): 44 / 44 lends == ROM. ON/OFF parity battles 950 / 603. Worker gates 1,612 files /
  13,245 tests, build, differential. Supervisor: `cf78Audit19Windows.ts` rerun == committed (360 / 599 live); clean merge (src == worker's
  tested tree).
- prep flat77 (MAIN lane, Opus, `9f816d580`, new files only): Flatter 260 at LATER bodies. Source: LaunchBattleAnimation zeroes WIN0 at
  every launch (a later body's row 0 is S0 with WIN0 0 / 0); spotlight tile slot 6 [305, 64] / palette 7, confetti slot 7 [433, 12] /
  palette 8; earlier bodies' residue (OBJWIN off, BG priority / scroll bits) is invisible. 36 scenarios x2 fresh, predictions committed
  per batch before probing: 20 / 20 later-body windows 0 px under the temp patch (`fixtures/flat77/flat77-temp-src.diff`: the gate
  `!known || (!firstBody && !spriteAllocatorInput?.historyKnown)`, a history-only allocator input for 260, the later-body register base),
  14 first-body controls 0 px; after a Flatter the lend is null (Flatter acts as a words-order unit) and after Tackle the allocator is
  unknown — both still decline. Census 0..999 +17 / +3,723, 0 pins move; runner reproduces 50 / 50 receipts.
- Live audit 20 (SIDE, Opus, `881e3d487`, new files only): 436 windows. **No DEFECT in land75 / st76**: Part A allocator consumers (Barrier
  / Light Screen / Reflect / Protect / Magic Coat / Mirror Coat after the top-8 Part A bodies) allocator == ROM 190 / 190 + chains 28 / 28;
  Part B (a hidden Fly / Dig user KO'd, then the replacement and the hitter) 44 / 44 0 px, hide == ROM. TIMING-PHASE: statused Meteor Mash
  windows whose ROM body has no age-194 lag (5 windows, rows 196..211, history-independent — Meteor Mash's D4 restore-lag parameter);
  the Dive setup's documented phase. Latent, outside the folds: **Return 216's order plan** (`"216:*": 117` is a weak-branch shape, Factory
  friendship 255 plays ReturnStrongest: 31 creates in slots 3 / 4 / 5 / 7) — the lend after a Return != ROM 0 / 15 (0 px so far). Runs A /
  B / C byte-identical. Supervisor: `audit20Extra.sh` into fresh dirs — every receipt byte-identical.
- Supervisor union gates on `4f5ad0a03` (src `cdae97b8`): typecheck, full suite 1,612 files / 13,245 tests, build, differential 624 / 624
  vs `9115d5ec3`, census seeds 0..299 98.62 % / 99.34 % (no change: the Castform routes are on seeds 600..999)
  (`tools/integration/fixtures/union-gates-c6f60846e.json`).
- Folded Sonnet worker `9bc6c0fec` (INTEGRATION) as `89fe1a16c` (src `a91aa685`): land79 — flat77's patch (Flatter 260 live at a later body
  when the allocator history is known; the history-only allocator input for 260; the later-body register base). 9 new tests (revert: 9 / 9
  fail); 6 later-body windows re-rendered fresh (219 rows, 0 px, r1 == r2, check JSONs == flat77's). Census 0..999 +17 / +3,723 == the
  banked number; key sequence + digests identical. Worker gates 1,613 files, build, differential. Supervisor: 2 windows re-rendered fresh
  == flat77's committed checks.
- Folded Opus worker `b994ef5da` (SIDE, stacked on audit 20) with audit 20 as `4265d81c8` (src `4c4fe4c7`): ret80 — Return 216's order key
  follows its power level (`AnimTask_GetReturnPowerLevel`, battle_anim_effects_3.c:5060-5073: Weak < 61, Medium 61..91, Strong 92..200,
  Strongest > 200): plan 117 is ReturnMedium (re-checked 2 / 2); Strongest gets its ROM plan (key 30216, 31 creates, 12 / 12 per frame,
  588 windows); Weak / Strong invalidate. audit 20's post-Return lends 0 / 15 -> 15 / 15; Swift / Shock Wave / Water Pulse after a 255
  Return 26 windows 0 px. **FINDING (gameplay, ISSUES #165):** the ROM's Factory builds every mon with friendship 0 and turns Return into
  Frustration (`battle_factory.c:459-462`, `:820-823`, `SetMonMoveAvoidReturn :913-919`); production keeps Return at friendship 0, so the
  census only reaches the Weak (invalidate) path: **123 commands live -> fallback on 0..999** (RETURN 47 + later bodies), 0 the other way,
  key sequence + digests identical. Honest direction (the wrong-order lends and the Strongest-length Return body no longer claim live);
  the gameplay fix is out of S10A's presentation-only mandate. Supervisor: fresh `ret80Probe.py` + extract + check == committed.
- prep doll81 (MAIN lane, Opus, `ec03249eb`, new files only; BANKED for the next session): Substitute-doll cells. 60 scenarios x2 fresh
  (r1 == r2), two species pairs per cell incl. an elevated GOLBAT. Proven through the patched production renderer (0 px or = the doll-free
  control): Dream Eater opponent, Leaf Blade both, ThunderPunch both, GrassWhistle player, SolarBeam charge turn both, Lovely Kiss both, Sing
  player, Sunny Day both (the self-target class = any attacker-doll body: `PlayerDoMoveAnimation` swaps the doll first). Residuals named:
  Dream Eater player / Sing opponent (ROM length by species pair), GrassWhistle / Focus Punch opponent, Double Team (banner after the
  swap-back + clone phase), Recover (orbs), Iron Tail, Double-Edge player; Psych Up is a real decline (species palette in the doll box).
  Temp patch `fixtures/doll81/doll81-cells.diff` (13 cells + framing + `LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS = {241}` + a SolarBeam turn
  gate + 2 defender cells + one census-classifier string); census 0..999 on `e6c51fec4`: +77 commands (doll declines 255 -> 178), 0 live
  -> fallback; only stall-battle seed 881 is cut one turn earlier at the frame cap (proven harmless at a 20M-frame cap). Pins: 3 (listed
  in the doc). The patch dry-runs on `4265d81c8`; rerun its runner on the fold's base.
- Supervisor FINAL gates on `4265d81c8` (src `4c4fe4c7`): typecheck, full suite **1,614 files / 13,258 tests**, build, differential
  **624 / 624 vs `82690e775`** (session start), census seeds 0..299 **97.98 % / 98.40 %** (vs `4f5ad0a03`: 56 live -> fallback = ret80's
  Return chains, 5 fallback -> live = land79's Flatter; key sequence + digests identical), seeds 0..999 **93.79 % / 97.37 %** (two runs
  byte-identical; session start 91.89 / 95.82), seeds 50000..50999 **95.20 % / 97.18 %** (start 93.07 / 95.47); soak gates on `4265d81c8` (a kernel file changed: Speed Boost animArg1): vanilla 0:20 20 / 20 OK, full 0:60 60 / 60, winning
  0:60 60 / 60, winning-swap 0:60 60 / 60 (all budget-ended = OK; the varied-RNG fifth gate was not run).
- Preview <http://127.0.0.1:5191/> serves `ac9e518e9` (src `4c4fe4c7`): 4 samples hash-equal (canvas == ABI == screenshot), session
  export + ON -> OFF restart passed, no browser errors (`playable-preview-20023b861-receipt.json`).

## 2026-10-09 (day) — S10A: allocator / order / words-lend histories + live-claim fixes; ordinary-play live share 87.95 -> 91.89 % of commands (92.09 -> 95.82 % of frames); 239 + 13 + 24

- Session-start census on `92ef1f6f9` (src `dde58985`), seeds 0..999: **87.95 % of move-animation commands / 92.09 % of frames live**
  (`tools/integration/fixtures/live-share-census/report-seeds0-999-start-20261009-day.json`, sha256 `5e4507ca`; battle digest
  `f8c6617d`). Remaining fallback frames: sprite-order lend unknown 118,478 (758 cmds), case-local gates 64,308 (351), allocator
  history unknown 58,159 (563), Struggle (no adapter, not a rental move) 33,792, later-body 20,467 (173). Largest order-host stops:
  Fury Cutter 210 both sides (17.3k), Shock Wave 351 (13.4k), SUBSTITUTE_FADE (9.3k), Bounce 340 (9.6k), Dive 291 (12.1k), Fly 19
  (9.7k), Blizzard 59 (6.4k), FOCUS_BAND (6.2k), hail 258 (11.0k) + HAIL_CONTINUES (3.2k), Ice Ball 301 (5.6k).
- Folded Sonnet worker `1df330d26` as `8e72343a7` (src tree `cc1fcc8a`): prep50 live — `LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS`
  (SLP, CONFUSION, PSN, PRZ, BRN); `prepareResolutionPalette` invalidates the allocator only for a crossed / trailing status animation
  outside the set (FRZ, INFATUATION, ... still invalidate); palette invalidation unchanged. Pins moved only where an audited status now
  precedes the body: playable Light Screen seeds 50 / 62, wall route seed 58 (Reflect) -> exact adapter. Census seeds 0..299:
  92.66 -> 93.35 % by count, 94.12 -> 94.66 % by frames (+55 / +6,302 = prep50's measurement = the chain predictor), 0 regressions,
  identical command sequence + battle digest; ON/OFF parity on seed 41 (SLP crossing). Worker gates 1,584 files / 13,048 tests,
  build, differential 624/624 vs `92ef1f6f9`. Supervisor: liveShareCensus.ts before / after rerun independently (prep43CensusDelta:
  0 pairing mismatches, 0 regressions, +55 / +6,302, battle digest identical); clean merge on unchanged master -> touched tests 47/47,
  smoke 448.
- Folded Opus worker `ba972400b` (SIDE lane, narrow production grant) as `f038cc861` (src tree `dae0a8b9`): plans51 — EXACT order
  plans for Outrage 200 (both sides identical, 147/147 ROM instances / 6,468 allocation frames) and FOCUS_BAND (`Cf;D0;Cf;D1;Cf` +
  carry, 14/14; staged by a 120-seed sweep with the holder taking an Outrage KO). Table 525 -> 527 bodies / 219 -> 221 plans / 24 -> 25
  anims. Census seeds 0..299: +5 / +1,062 (predictor 7 / 1,342: the other 2 stop at the later-body consumer gate), 0 regressions.
  NOT landed, each with its exact blocker (docs/next-adapters-plans51.md): Dive / Fly / Bounce (the host invalidates on every
  semi-invulnerable hide; greedy gain 5,013 on 0..299 — the largest stop), SUBSTITUTE_FADE (staging never showed the fade), Water
  Spout (needs attacker HP at the orchestrator seam), HAIL_CONTINUES (the orchestrator looks up the displayed field only at
  move-animation commands), Fury Cutter (needs furyCutterCounter on the MOVE_ANIMATION payload), Shock Wave (reducer allocation
  timeline diverges from the ROM at window 37), Eruption (geometry-keyed; the base table's 284:opponent plan is WRONG for an elevated
  attacker -> ISSUES #155). Worker gates 1,584 files / 13,043 tests, build, differential 624/624. Supervisor: generator regen no diff;
  plans51Check on the committed units byte-identical; census rerun +5 / +1,062, 0 regressions, digest identical; fresh probes of 2
  Outrage + 4 FOCUS_BAND jobs all EXACT under the plan (10/10, 4/4) — but the Outrage stagings replay a different trajectory than the
  worker's batch (A == B inside each batch; ISSUES #154).
- Supervisor union gates on `f038cc861` (src `dae0a8b9`; alloc50 + plans51): typecheck, full suite 1,585 files / 13,052 tests, build,
  differential 624/624 vs `92ef1f6f9`, census seeds 0..299 93.41 % by count / 94.75 % by frames (+60 / +7,364 vs `92ef1f6f9` = the sum
  of both folds; 0 regressions, identical commands + digest) (`tools/integration/fixtures/union-gates-b8b169745.json`).
- Folded Opus worker `bb3e82dce` as `28f1f1ee4` (union src tree `d71d9924`): lsbz — (A) Light Screen (113) opponent: D4 entry
  (`liveMoveTimingPolicy.ts`, `bg-write-row`) renders the dominant row-59 BLDALPHA phase (no hold; audit-15 counters 9 direct : 2 hold);
  `lightScreen.ts` reducer keeps the hold as its default for the acceptance fixtures; Light Screen scoped exact -> faithful timing
  (census `240+13+23+0+0=276`). (B) Blizzard (59): the case-59 gate read the fixed 361 because it omitted the field — the live window is
  now `blizzardImpactStartAge(side, geometry) + 164` from the geoice particle replay (opponent impact 194..206 -> 358..370 rows; player
  always 208). Predictions for a 25-pair grid committed before the probes; 24 staged pairs matched the predicted lag shape (16 lag : 8
  none); 17 policy-phase windows 0 px, 8 other-phase windows only on documented ages I+141..I+156. ARBOK -> CATERPIE (geoice control) is
  now live at 362 rows but every row carries the same static 133-px battler-palette residual (bbox x 98..221 y 33..103; outside the
  Blizzard program) — excluded, unexplained (ISSUES #152). Census seeds 0..299 vs `8e72343a7`: +5 / +1,810 (battle 87 WALREIN -> JYNX
  Blizzard, 361 fallback -> 362 live), 0 regressions, command sequence identical (battle frames +4: the corrected Blizzard length).
  d4a regression 286 fixtures 0 violations; ON/OFF parity on a Light Screen and a Blizzard route. Worker gates 1,586 files / 13,058
  tests, build, differential 624/624. Supervisor: lsbzTimingCheck rerun fresh — 44/44 windows == receipt (rows, px, A == B), 0
  violations; census rerun +5 / +1,810, sequence identical.
- Supervisor union gates on `28f1f1ee4` (src `d71d9924`; alloc50 + plans51 + lsbz): typecheck, full suite 1,587 files / 13,062 tests,
  build, differential 624/624 vs `92ef1f6f9`, census seeds 0..299 93.48 % / 94.91 % (+65 / +9,174 vs `92ef1f6f9` = the sum of the three
  folds; 0 regressions; command sequence identical) (`tools/integration/fixtures/union-gates-bb0415c82.json`).
- prep52 (side, `4abe5efed`, new files only; merged `17d9b8ee5`): the allocator TAIL. Chain census on `f038cc861`: 89 declines / 9,153
  frames (greedy Future Sight, Seismic Toss, Ice Ball, FRZ, Pursuit, Perish Song, then ~24 two-command bodies). 47 / 47 units NET-ZERO
  (150 scenarios x2 fresh, all A == B): 42 bodies by move id (incl. Future Sight 248's setup), the delayed hit `General_FutureSightHit`
  (sAnimMoveIndex 0; no sprites), FRZ / INFATUATION / CURSED / NIGHTMARE by script label; WRAPPED never plays (source comment). Temp
  patch census seeds 0..299: 93.41 -> 94.17 % by count, 94.75 -> 95.27 % by frames (+60 / +6,012), 0 regressions, predictor exact.
  Residual after the patch: 29 / 3,141, all post-KO send-outs whose ORDER host has no EXACT plan (hail, Sand-Attack, Bounce, Rain Dance,
  Fly, Mud-Slap, HAIL_CONTINUES, Shock Wave). FINDING (open): production never invalidates the allocator on general / hit / stat
  animations and no receipt covers that assumption (six seen by chance are net-zero; rain / sandstorm / hail continuing, Leech Seed
  drain, Focus Band, Knock Off, Wish heal, Substitute fade, traps unproven). Supervisor: `prep52Run.sh` into fresh dirs — 9 / 9 receipts
  byte-identical, src reverted.
- Folded Sonnet worker `df75c7237` (SIDE lane, narrow production grant) as `2fb7ccc62` (src tree `93d0f033`): prep52 live — 40 ids
  appended to `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` (incl. Future Sight 248; Gust 16 / Transform 144 left out: not live adapters)
  and FRZ / INFATUATION / CURSED / NIGHTMARE in the status set (9 labels; WRAPPED has no script). Pins moved only where a newly audited
  predecessor precedes the body: wall seeds 20 / 64 / 231, playable Light Screen seed 2 [0,3], Double Slap 3 in the multihit list. Census
  seeds 0..299 vs `17d9b8ee5`: 93.48 -> 94.23 % by count, 94.91 -> 95.42 % by frames (+60 / +6,012 = prep52 = the chain predictor), 0
  regressions, identical command sequence + battle digest; ON/OFF parity seed 84 (FRZ crossing). Worker gates 1,588 files / 13,070
  tests, build, differential 624/624. Supervisor: liveShareCensus rerun +60 / +6,012, 0 regressions, digest identical; union src ==
  the worker's tested tree (master had docs only since its base) -> touched tests 65/65, smoke 448.
- gates53 (integration, `16cac43f6`, tools + docs only; merged `841d54df4`): an instrumented copy of `liveMoveAnimationPresentation`
  records which `return null` disjunct fired (0 null mismatches vs production over 3.94 M calls on seeds 0..999). The census's
  "case-local" bucket is mostly NOT case-local: 77.4 % (247 commands / 41,104 frames on 0..999) is the words-deferred lend that
  cannot replay past a faint (35,457), switch-out (3,749) or forced switch-out (1,898) after Sand-Attack / Mud-Slap / Rain Dance /
  RAIN_CONTINUES (`DEFERRED_REPLAY_UNITS`); 9.0 % the same resolution leaving an unlendable order; Flatter `firstBody` 6.6 % (not
  proven: needs later-body register + allocator evidence); Flatter plain unknown lend 4.5 %; Ice Ball's own carried lend 2.5 %. No
  gate lifted. Supervisor: the 0..299 instrument report rerun byte-identical.
- Folded Opus worker `f0bf518bc` (SIDE lane, narrow production grant) as `99493737c` (src tree `db20b3ec`): aud56 — ISSUES #156
  closed. Every animation id the kernel emits besides MOVE_ANIMATION enumerated (HIT_ANIMATION, STATS_CHANGE, the playanimation table,
  WEATHER_VAR 12 / 13, CASTFORM_CHANGE, SCENE_OFF_ATTACK_PAUSE) and ranked by exposure (live allocator consumers carried across:
  HIT 193, STATS_CHANGE 105, HELD_ITEM_EFFECT 69, HAIL / SANDSTORM / RAIN_CONTINUES 19 / 13 / 10, ...). Script-keyed net-zero audit (OBJ
  slots + tiles + palette tags + matrices; 93 jobs x2 fresh in one batch, explicit lab seeds, all A == B): 20 units NET-ZERO (the hit
  sprite holds slot 3 for 20 frames and is released before the next script; ITEM_KNOCKOFF / FOCUS_BAND survivors are destroyed on the
  cleanup frame — order carries, not allocator survivors); none NOT net-zero. Production now fails closed: SUBSTITUTE_FADE, SNATCH_MOVE,
  DOOM_DESIRE_HIT, TURN_TRAP for Clamp / unknown wrapped moves, other WEATHER_VAR arguments, SCENE_OFF_ATTACK_PAUSE and any future id
  invalidate the allocator. Census seeds 0..299 identical to `2fb7ccc62` (0 / 0; the new rule fires once, no live consumer follows).
  Worker gates 1,589 files / 13,092 tests, build, differential 624/624. Supervisor: aud56Probe full rerun (186 runs) + extract —
  every audit field byte-identical to the committed receipt; union src == the worker's tested tree -> touched tests 61/61, smoke 448.
  Finding -> ISSUES #157 (weather-continuing event battler vs the ROM's battler 0).
- Folded Opus worker `f3452b28f` as `b3160da57` (union src tree `8d3b44bb`): words57 — the words-deferred order lend now REPLAYS PAST
  battle units (opponent faint, party summary next / hide, next-mon send-out, the opponent's recall, forced switch-out + switch-in on
  either side) for Rain Dance / RAIN_CONTINUES markers (opt-in `LIVE_WORDS_ORDER_DEFERRED_REPLAY`); the replay tracker's entry-label
  roles give the real-slot lend 66/66 (`words57RhoCheck.ts`). ROM chain check: 24 jobs x2 fresh, explicit lab seed, 47/47 chains exact
  (27 through battle units, 30/30 consumers after a battle unit; 161,079 frames). Sand-Attack / Mud-Slap stay declining after a send-in:
  their carry reads the CONSUMER's field and one species change moves the post-body order in 32 / 1,008 trials -> the marker must record
  the body's displayed species (orchestrator call site; next step words59). Census seeds 0..299 vs `2fb7ccc62`: 94.23 -> 94.40 % by
  count, 95.42 -> 95.68 % by frames (+14 / +2,968), faithful-random history 153 / 25,599 -> 172 / 29,188 (incl. 5 already-live
  order-independent Flamethrower / Rock Slide commands that now read the resolved lend), 0 regressions, identical commands + digest;
  gates53 row A 0..999 258 / 42,054 -> 208 / 32,186. Parity: census battle 40 across Scene ON, a second presentation seed and Scene OFF
  (47 decision snapshots). Worker gates 1,589 files / 13,074 tests, build, differential 624/624. Supervisor: `words57Run.sh` into fresh
  dirs — 24/24 A == B, 47/47 exact, all receipts byte-identical; census rerun +14 / +2,968, 0 regressions, digest identical.
- Supervisor union gates on `b3160da57` (src `8d3b44bb`; + aud56 + words57): typecheck, full suite 1,590 files / 13,096 tests, build,
  differential 624/624 vs `92ef1f6f9`, census seeds 0..299 94.40 % / 95.68 % (report sha256 `8477f8ca` == words57's after-report; +139 /
  +18,154 vs `92ef1f6f9`, 0 regressions, command sequence identical).
- Folded Opus worker `34a333f97` (SIDE lane, narrow production grant: move live cases only) as `8f2a2974f` (src tree `64e91f1d`): later58 —
  LATER-BODY gates narrowed to "known lend AND (first body OR both species idle rests {0,0})" for Signal Beam, Mach Punch (D4), Sheer Cold
  (D4), Extrasensory (opponent attacker, D4), Sky Attack charge (a later charge starts with WIN0 (0,0), the ROM value), Bonemerang (hits 1
  and 2), Outrage, Fury Cutter counter 1 (request power 10 / 15). At every later activation probed (after Quick Attack, Growl + stat,
  Splash, the move's own body; both sides, two pairs; 166/166 runs A == B, explicit lab seeds) the allocator / tasks / matrices equal the
  first body's and the differing register history is never read; the battler idle rest is the remaining history, hence the rest guard
  (an opponent ONIX after its own Quick Attack would be 40,367 px off). Windows 0 px (D4 moves: policy phase 0 px, other phase only on
  documented rows; d4aTimingCheck 77 fixtures 0 violations). Left declining: Extrasensory player (undocumented 18..298k px residual),
  Memento (reads the scanline entry), Fury Cutter counter 2+, Sheer Cold after its own body (always a KO). Census seeds 0..299 vs
  `99493737c`: 94.23 -> 94.63 % by count, 95.42 -> 95.77 % by frames (+32 / +4,013), 0 regressions, identical commands + digest.
  TIMING NOTE (supervisor decision, reversible): Sheer Cold and Extrasensory with an OPPONENT attacker measured the lag phase at every later
  body (5/5, 11/11) while their D4 policy (first bodies) picks no-lag, so those later bodies render the documented other phase (16 tail
  rows, ~17-19k px each). Kept (documented other phase, checker clean); next step keys the phase by first / later body. Also reported:
  the Sky Attack strike measured 181 rows in 14 / 24 probes vs production 180 (possible D4 case). Worker gates 1,590 files / 13,117 tests,
  build, differential 624/624. Supervisor: later58Check rerun fresh for Signal Beam / Bonemerang / Outrage — 94/94 rows identical to the
  receipts; census rerun +32 / +4,013, 0 regressions, digest identical.
- Supervisor union gates on `8f2a2974f` (src `64e91f1d`; + later58): typecheck, full suite 1,591 files / 13,121 tests, build, differential
  624/624 vs `92ef1f6f9`, census seeds 0..299 94.82 % by count / 96.03 % by frames (+172 / +22,277 vs `92ef1f6f9`; one command more than
  the sum of the folds: a later58 body after a words57-resolved chain; 0 regressions, command sequence identical; faithful-random history
  175 / 29,514).
- Folded Opus worker `e1f813995` as `2ac607535` (src tree `503eb721`): words59 — (1) `SpriteOrderDeferredLend.bodySpecies` (species ids
  only) recorded for Sand-Attack 28 / Mud-Slap 189 markers at the orchestrator call site from the field the renderer draws the body on;
  the dirt carry takes its anchors from them, so the words57 replay now passes faint / send-out / switch units for dirt markers too
  (species-free markers keep declining); all 79 words57 ROM vectors + 16 new words59 vectors resolve to the ROM order, three species-swap
  vectors fail without it. (2) A RAIN_CONTINUES that is the LAST event of its resolution had no command at or after it, so the tick seam
  never recorded its words; now recorded at the resolution's last command (non-consuming; rain trailing an earlier segment keeps its
  timing): "words null" declines 15 / 2,737 -> 0 on 0..299. Census seeds 0..299 vs `b3160da57`: 94.40 -> 95.12 % by count, 95.68 ->
  96.42 % by frames (+57 / +8,698: +42 marker, +15 rain), faithful-random history 172 / 29,188 -> 237 / 38,898, 0 regressions, identical
  commands + digest; gates53 row A (0..999) 208 / 32,186 -> 46 / 6,841. Dense windows (Water Pulse / Silver Wind after dirt + KO +
  send-out) 0 px twice fresh — order-independent consumers (entry-lend control also exact), so they prove the live path, not the lend;
  the lend is proven by the ROM chains + vectors. Parity: census battles 183 and 264 (Scene ON seed A x2, a second seed, Scene OFF).
  Worker gates 1,592 files / 13,101 tests, build, differential 624/624. Supervisor: `words59Run.sh` into fresh dirs — 3/3 A == B, 5/5
  chains exact, receipts byte-identical; census rerun +57 / +8,698, 0 regressions, digest identical.
- Supervisor union gates on `2ac607535` (src `503eb721`; + words59): typecheck, full suite 1,593 files / 13,127 tests, build, differential
  624/624 vs `92ef1f6f9`, census seeds 0..299 95.57 % by count / 96.81 % by frames (+232 / +31,375 vs `92ef1f6f9`; 0 regressions; command
  sequence identical; faithful-random history 243 / 39,624).
- Live audit 16 (side, `719bbf46d`, new files only; merged `ac8060192`): CHAIN routes made live this session, 122 scenarios / 239 consumer
  windows, every window twice fresh with identical per-row digests (a from-scratch rerun matched 236). NO species / history defect.
  Status animation -> Light Screen / Reflect / Protect 27 / 31 exact + 4 Light Screen phase (SLP, CONFUSION, PSN, PRZ, BRN, FRZ,
  INFATUATION; two species pairs; opponent Light Screen after BRN, a decline in audit 15, is now live and exact); newly net-zero bodies
  29 / 32 (+3 phase); Outrage -> Thunderbolt / Ice Beam / Blaze Kick / Heal Bell 39 / 39 (Heal Bell discriminates the lend in 5);
  FOCUS_BAND carry -> Swift / Thunderbolt / Heal Bell exact (2 Blaze Kick rows = age -10 framing artifact); later58 moves after
  predecessors OUTSIDE later58's probe set (Thunder Wave + PRZ, Double Team + stat, Sunny Day, Thunderbolt, confusion) 50 / 50. #152
  ARBOK -> CATERPIE = fixture HP artifact. New: the Light Screen PLAYER side also has the hold phase (5 / 20) + a row-19 step (#152);
  Double Team first body is one frame off on CHANSEY / ARBOK (188-236k / 49k px) while rendered live -> ISSUES #158. The audit-15 harness
  (`postkoHostReplay.ts`) does not follow the alloc50 / alloc52 rules (audit16Check.ts replays the hosts as the orchestrator does today).
  Supervisor: audit16Check rerun fresh on 6 scenarios (Light Screen after CONFUSION / BRN, Outrage -> Heal Bell / Double Team, later
  Signal Beam / Bonemerang) — all byte-identical to the receipts.
- Folded Opus worker `ae1bafbcf` as `df6e26a7e` (src tree `1af9db01`): d4later — D4 parameters can be keyed `body: "later"` (a known
  order-host lend without firstBody; wins over the unkeyed parameter of the same kind / side). Fresh counters (98 scenarios x2, explicit
  lab seeds, 98/98 r0 == r1): Sheer Cold opponent first 0 : 12 lag, later 5 : 0; Extrasensory opponent first 3 : 4, later 11 : 0 -> 329 /
  326 `{side: opponent, body: later}` take the lag (191 / 162 rows); all 16 later windows now 0 px (were the other phase on 16 tail rows).
  Sky Attack strike: CPU-phase class (fixed lags 141 / 142, optional lag at 161 -> 181 rows), 18 : 18 over 36 strikes (accepted 0 / 8,
  battle-first 5 / 12, later 13 / 16; a per-move strike-count key does not exist) -> tie rule keeps 180 rows (rendering unchanged), the
  181-row windows documented (ages 163..178); Sky Attack scoped exact -> faithful timing (census `239+13+24+0+0=276`). d4a regression 329
  fixtures 0 violations. Census seeds 0..299 vs `2ac607535`: 0 live-count change, +4 live frames (2 opponent later Sheer Cold 190 -> 191,
  2 opponent later Extrasensory 161 -> 162), command key sequence identical, battle frames +2. Worker gates 1,594 files / 13,131 tests,
  build, differential 624/624. Supervisor: d4aTimingCheck rerun fresh on the 11 Sky Attack windows + 32 later58 Sheer Cold / Extrasensory
  opponent windows — rows / px / A == B as in the receipt, 0 violations; census rerun identical delta; union src == the worker's tested
  tree -> touched tests 88/88, smoke 448.
- Folded Opus worker `e9e71907c` (SIDE lane, narrow production grant) as `395f619dd` (src tree `b13260d0`): plans54 — order-host units
  that needed a presentation input. Fury Cutter 210: MOVE_ANIMATION carries the counter as a 7th argument (read after the counter calc,
  the Rollout / Ice Ball pattern; no gameplay change) -> keys 210 / 10210 / 20210 / 30210 (25/25 ROM, counters 1..5 both sides; the
  right / left branch does not change allocation). Hail 258 + HAIL_CONTINUES (new seam lookup of the displayed species at a
  general-animation event), Blizzard 59 (blizzard.ts allocator replay) and Water Spout 323 (attacker HP tier + picture + lent order from
  waterSpout.ts) GEOMETRY-KEYED from the renderers' own timelines, every prediction committed before its probes (8/8, 16/16, 11/11,
  23/23 ROM instances exact). Eruption 284 (ISSUES #155, now closed): FAIL-CLOSED — plans only at ROM-proven attacker species (incl.
  CAMERUPT, the only Factory Eruption user, probed both sides; plans51's "camerupt" scenarios actually staged BARBOACH), invalidates
  elsewhere. Table 527 -> 535 bodies; corpus replays 0 mismatches. Census seeds 0..299 vs `ac8060192`: 95.57 -> 96.74 % by count, 96.81
  -> 97.96 % by frames (+93 / +13,427; predictor 56 / 8,469, +19 / 2,184 unpredicted later Fury Cutter-chain bodies), 0 regressions,
  identical commands + digest. Parity on census battles 45 / 14 / 153 / 48 (Scene ON / OFF / second seed). Worker gates 1,594 files /
  13,139 tests, build, differential 624/624. Supervisor: generator regen no diff; plans54Check byte-identical; a full fresh probe batch
  (28 jobs x2) gave a byte-equal units.json; census rerun +93 / +13,427, 0 regressions, digest identical.
- Supervisor union gates on `395f619dd` (src `b13260d0`; + d4later + plans54): typecheck, full suite 1,595 files / 13,143 tests, build,
  differential 624/624 vs `92ef1f6f9`, census seeds 0..299 96.74 % by count / 97.96 % by frames (+325 / +44,806 vs `92ef1f6f9`, 0
  regressions, command key sequence identical; battle frames +6 from the corrected Blizzard / Sheer Cold / Extrasensory lengths).
- Folded Opus worker `e3ca0fb4a` as `5184ed234` (src tree `d16bac8c`): dt60 — ISSUES #158 closed. Mechanism (RAM + source):
  `CloneBattlerSpriteWithBlend` copies the whole battler sprite; `AnimTask_DoubleTeam` sets only data[0..2], so `AnimDoubleTeam`'s
  two-frame step counter (`++data[3] > 1`) starts at the battler sprite's own data[3], which the SEND-OUT mon animation leaves behind
  (`Task_HandleMonAnimation` zeroes data[2..7] only before it runs; opponent = species front anim, player = back anim by species +
  nature). data[3] >= 1 -> the clones run one call ahead and are destroyed one frame earlier (CHANSEY player 6 / opponent 124, GARDEVOIR
  120, SCYTHER 3, SHUCKLE 1; ONIX / ARBOK 0); not task order (clone task slot 0 everywhere), not CPU load. Production reads each
  animation's hand-off data[3] from `src/data/gen/dt60-mon-anim-data3.json`, generated by EXECUTING the pret `pokemon_animation.c` on the
  host (clang, matrix / palette / task calls stubbed; `tools/integration/dt60MonAnimData3*`); the executed value matches RAM for all 17
  probed animations (supervisor judgment: source-derived generated data, not a captured table). Case 104: data[3] >= 1 -> clone anchor
  age -1 / visible end 128; 0 -> accepted profile; < 0 (MAGNEMITE only) or a player with no personality -> declined. Prediction committed
  before the grid: zero class 7/7, one-call-ahead class 5/5 at 0 px; ARBOK's residual is a clone-ORDER fixture artifact (its entry
  Intimidate runs during the lab prepare). 34 / 36 windows 0 px (CHANSEY controls, 9 Outrage chains, 10-species grid, ONIX accepted).
  Census seeds 0..299: counts unchanged, identical commands + digest; 86 of 214 live Double Team commands now render the corrected phase
  (they were one frame off on master). Worker gates 1,595 files / 13,135 tests, build, differential 624/624. Supervisor: generated table
  `--check` up to date; dt60Check rerun fresh on CHANSEY controls (both sides) + GARDEVOIR / UMBREON / SCYTHER / SHUCKLE — 12/12 windows 0
  px, A == B; census rerun identical.
- Supervisor union gates on `5184ed234` (src `d16bac8c`; + dt60): typecheck, full suite 1,596 files / 13,147 tests, build, differential
  624/624 vs `92ef1f6f9`, census seeds 0..299 96.74 % / 97.96 % (+325 / +44,806 vs `92ef1f6f9`, 0 regressions, command key sequence
  identical).
- Census seeds 0..999 on `5184ed234` (src `d16bac8c`; two runs byte-identical, sha256 `514554f7`): 91.73 % of move-animation commands /
  95.79 % of frames live (session start 87.95 / 92.09); faithful-random history 762 / 123,772 (2.77 % / 3.14 %); remaining fallback
  frames: order lend unknown 75,118 (463), Struggle (no adapter, not a rental move) 33,792 (1,056), allocator history 20,516 (200),
  case-local 17,267 (130), later-body 4,416 (27), Substitute doll cells ~6k, Dive attack body (unsupported turn 1) 2,048. Seeds
  50000..50999: 92.96 % / 95.46 % (session start 88.38 / 90.47 at the overnight final).
- prep61 (side, `0c873d60d`, new files only; merged `c0d8f05e2`): SEMI-INVULNERABLE two-turn units. With Battle Scene ON the ROM never
  sends the attacker-hide toggle (`MOVEEND_ATTACKER_INVISIBLE` is Scene-OFF only; the setup animation hides the attacker itself): 0 hide
  events in 300 census battles, so the host's "semi-invulnerable battler hidden" invalidation never fires; the real stop is that setup
  and unleash share one key with no plan. Fly 19 setup `Cf;D0` 14/14 + unleash `Cf;Cf;D0;D1` 12/12, Bounce 340 setup `Cf;D0` 15/15 +
  unleash per side 12/12 (EXACT, per frame); Dive 291 setup / unleash orders are functions of the RAM-read words through dive.ts (8/8, 7/7,
  70/70 destroy groups; another body's words fail 8/8); Dive's lend through the hidden turn == ROM 7/7. Hidden-battler rules: table
  animations skipped (kernel already ports it), status animations suppressed, misses emit nothing, hits on the hidden battler play their
  body, the hit animation allocates nothing (controllers return for an invisible sprite). Temp patch census seeds 0..299 on `395f619dd`:
  +11 / +1,391 (incl. 7 Protects whose allocator now re-seeds), 0 regressions, predictor 3 / 427 + 1 / 103 chain-naming artefact.
  Supervisor: `prep61Run.sh` into fresh dirs — all 16 receipts byte-identical, src reverted.
- Folded Opus worker `80f4b79d1` as `36cdb6981` (src tree `06b791ff`): spark62 — Spark (209) OPPONENT attacker live (duration 115 for
  both attackers). prep10's unexplained "initial callback advance [1,1,0,...]" is not a side rule: the 8 flashing sprites are created from
  CB1 (`BattleMainCB1 -> ...DoMoveAnimation -> Cmd_createsprite -> CreateSpriteAndAnimate`, instruction-stepped), that iteration
  overruns and the VBlank lands INSIDE AnimateSprites, so slots stepped before it show one extra step in the end-of-frame RAM sample
  (species-dependent CPU timing) — and that frame is a lag frame whose screen equals the previous one on all 8 rows, so the first sprite
  age is never displayed: all-zero advances are pixel-neutral (any {0,1} vector renders identically on all 115 rows; an advance of 2
  changes row 44 — the check is not vacuous). Tie order kept as the accepted constant behind the known-order lend gate (as the player
  side). 11 / 11 windows 0 px twice fresh (opponent MINUN / CHINCHOU / VOLTORB -> SHUCKLE / SNORLAX; player MINUN / PLUSLE / CHINCHOU).
  Census seeds 0..299 vs `5184ed234`: 96.74 -> 96.98 % by count (+19), live frames +2,185, 0 regressions, command key sequence identical;
  battle frames +1,826 = 22 opponent Sparks x (115 - 32): those bodies now present the 115-frame body instead of the 32-frame fallback (3
  still decline at the order gate). Parity battle 85. Worker gates 1,597 files / 13,153 tests, build, differential 624/624. Supervisor:
  liveFixtureBatch rerun fresh — 11 / 11 windows 0 px both runs; census rerun +19 / +2,185, 22 changed records all opponent Spark.
- [REVERTED in `5bda030cd` — live audit 17 DEFECT, ISSUES #159] Folded Opus worker `b6c9d3c2a` (SIDE lane, narrow production grant) as `edb8237b0` (src tree `d7f24b03`): fly63 — prep61 landed minus
  Dive: `TWO_TURN_ANIM_MOVE_IDS` + 19 / 340 (unleash keys 10019 / 10340), `SEMI_INVULNERABLE_SETUP_MOVE_IDS` {19, 340} mark the attacker
  hidden from the setup body to the unleash body, a hit on a hidden battler leaves the tracker unchanged (allocates nothing), a hidden
  battler fainting / switching in invalidates; Dive 291 unchanged (one unplanned key; words carry next session). Table 535 -> 543 bodies,
  0 new plan texts; corpus replay 1,181 / 1,181 / 0. Census seeds 0..299 vs `c0d8f05e2`: +11 / +1,391 (= prep61; Sky Uppercut on a hidden
  Fly user, 7 Protects whose allocator now re-seeds, Mud-Slap, Pursuit), 0 regressions, identical commands + digest; parity battle 81.
  Worker gates 1,597 files / 13,153 tests, build, differential 624/624. Supervisor: generator regen no diff; prep61Check on the committed
  units byte-identical.
- [SUPERSEDED by the post-revert final gates below] Supervisor gates on `edb8237b0` (src `d7f24b03`): typecheck, full suite 1,598 files / 13,159 tests, build, differential 624/624
  vs `92ef1f6f9`, census seeds 0..299 97.11 % by count / 98.11 % by frames (session start 92.66 / 94.12; +355 commands live, 0
  regressions, command key sequence identical, player turns identical), seeds 0..999 92.26 % / 96.23 % (two runs byte-identical, sha256
  `4ca4aaf8`; start 87.95 / 92.09), seeds 50000.. 93.52 % / 96.02 % (`final-supervisor-gates-20261009-day.json`).
- Preview <http://127.0.0.1:5191/> serves `7520d4bae` (src `d7f24b03`; adapters 239 + 13 + 24): 4 samples hash-equal (canvas == ABI ==
  screenshot), session export + ON -> OFF restart passed, no browser errors (`playable-preview-9e2dac58f-receipt.json`).
- prep64 (side, `073fdaf45`, new files only; merged `10ee4f75c`): SUBSTITUTE_FADE. Earlier stagings stalled at a MESSAGE, not the
  break: a hit on the doll prints "The SUBSTITUTE took damage for X!" (`Cmd_healthbarupdate`), whose `\p` waits for a button — plans48 /
  plans51 pressed nothing. Trigger: `Cmd_datahpupdate` damage >= substituteHP -> `BattleScript_SubstituteFade`; `Cmd_playanimation` sends
  it before the no-animations check (Scene OFF too). Staged PERSIAN / GOLBAT both sides, both scenes, + CROBAT (10 jobs x2, explicit lab
  seeds, all A == B; a separate batch byte-identical): EMPTY plan, exact per frame 11 / 11, hand-offs 11 / 11, next bodies 6 / 6; allocator
  NET-ZERO both scenes. Temp patch (plan row + allocator entry) census seeds 0..299 on `edb8237b0`: +16 / +3,730 (97.11 -> 97.31 % / 98.11 ->
  98.43 %), 0 regressions, identical commands + digest; plan row alone gives the identical record. Fold: 6 pins to move (doc lists them).
  Supervisor: `prep64Run.sh` into fresh dirs — all 12 receipts byte-identical (incl. both censuses), src reverted.
- prep65 (integration lane, evidence only, `0938cddc6`; merged `37be71479`): DIVE as a words unit end to end. The tick seam already records
  Dive's setup AND unleash words (`LIVE_DIVE_RANDOM2_PLANS`; 15 / 15 bodies == RAM). Temp patch (291 in WORDS_ORDER_UNIT_MOVE_IDS /
  TWO_TURN_ANIM_MOVE_IDS / SEMI_INVULNERABLE_SETUP_MOVE_IDS, bodySpecies, `deferredBodyOrderKey` so the 10291 unleash arms the marker, a
  dive.ts-derived plan + carry): plan == ROM 15 / 15, per frame exact (215 windows), another body's words 0 / 15, lend through the hidden
  turn 7 / 7, species-free markers decline 7 / 7. Census seeds 0..299 on `edb8237b0`: +35 / +5,361 (97.11 -> 97.55 % / 98.11 -> 98.57 %),
  faithful-random history 274 -> 309, 0 regressions, identical commands + digest. Fold: move one pin (`tests/spriteOrderFly63.test.ts`
  "Dive keeps master's key"); run the full suite / build. Attack-body adapter design note in the doc (92-row body; dive.ts already ports
  it). Supervisor: `prep65Run.sh` (SKIP_CENSUS) into fresh dirs — 12 jobs A == B, all four probe / check receipts byte-identical, src
  reverted.
- Live audit 17 (side, `983d20590`, new files only; merged `cdaeb9f24`): routes made live late this session. 104 windows (88 fly63 + 16
  dt60), all live with the order lend known, r1 == r2 everywhere, a from-scratch rerun 104 / 104 identical. dt60: prediction (committed
  first) == RAM data[3] 16 / 16 for 8 Factory Double Team users outside dt60's grid, both classes / sides, 16 / 16 windows 0 px. fly63:
  consumers right after a Fly / Bounce UNLEASH 0 px; but a live body of the OTHER battler while the charger is HIDDEN draws the hidden
  battler (production hides it only through `view.visibility` on the fallback path; `battleScene.ts` liveSceneOnBattlerArt never reads it):
  Heal Bell 420k-610k px, Double Team 256k-372k px per window -> 0 px with a reverted patch (20 windows); Sky Uppercut hitting the hidden
  user 830k-975k px (patch fixes rows 0..149; ages 150..186 remain) -> ISSUES #159. Not reached: later58 after a switch-in.
- REVERTED fly63 (`5bda030cd`, src back to `06b791ff` = spark62's tested tree): too little session time for the #159 fix + full gates;
  shipping a known wrong-pixel live claim was not acceptable. prep61's Fly / Bounce plans stay banked.
- Supervisor FINAL gates on `5bda030cd` (src `06b791ff`): typecheck, full suite 1,597 files / 13,153 tests, build, differential 624/624
  vs `92ef1f6f9`, census seeds 0..299 96.98 % by count / 97.99 % by frames (start 92.66 / 94.12; +344 commands, 0 regressions, command key
  sequence identical), seeds 0..999 91.89 % / 95.82 % (sha256 `eda0c77f`; start 87.95 / 92.09), seeds 50000.. 93.07 % / 95.47 %
  (`final-supervisor-gates-20261009-day.json`).
- Preview <http://127.0.0.1:5191/> serves `7497593b0` (src `06b791ff`, after the fly63 revert; the earlier `7520d4bae` preview is
  superseded): 4 samples hash-equal (canvas == ABI == screenshot), session export + ON -> OFF restart passed, no browser errors
  (`playable-preview-897a18dd6-receipt.json`).

## 2026-10-09 (overnight) — S10A: order / allocator host histories widened; ordinary-play live share 77.7 -> 87.2 % (91.1 % of frames); 241 + 13 + 22

- Folded Sonnet worker `15dba75cf` as `a556f6cdf` (src tree `df965113`): prep44's 50 audited allocator NET-ZERO bodies appended
  to LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS (Future Sight 248 kept out: only its setup body was measured); pin extended to the
  prep44 receipt (window-incomplete rows need an audited row of the same orientation; both orientations audited per id). Pins
  that moved because an earlier body is now audited: Light Screen seed 27 (after Faint Attack 185), wall seed 67 Reflect (after
  Quick Attack 98), voluntary slot2@2432 (after Swift 129) — fallback -> exact adapter. Census seeds 0..299: 81.54 -> 82.48 %
  live by count, 80.19 -> 80.87 % by frames (+75 / +8017), 0 regressions, command sequence identical. Worker gates 1,573 files /
  12,958 tests, build, differential 624/624 vs `5779aa253`. Supervisor: id set == prep44 tier-2 diff set; census rerun byte-
  identical to the committed after-report (`c4d8255e`); touched tests 52/52, smoke 448.
- prep45 (side, `8d172388f`, new files only; merged `a0141ffc4`): sprite-ORDER invalidator chains + the next plan tier. Order
  chains are mostly short (523 / 954 declines single-unit; the forced party menu is the only revival seen). 18 units EXACT per
  frame against fresh probes (108 jobs x2, all A == B): BRN, TURN_TRAP keyed by the wrapped move (Fire Spin / Whirlpool / Sand
  Tomb / Bind-Wrap; Clamp not probed), WISH_HEAL, INGRAIN_HEAL (= Leech Seed drain plan), FUTURE_SIGHT_HIT (empty), Hydro Pump,
  Reversal, Solar Beam keyed by turn, Perish Song, Dragon Dance side-keyed, other sides of Softboiled / Overheat / Magical Leaf /
  Moonlight. WORDS-DEPENDENT: Sand-Attack, Mud-Slap (AnimDirtScatter), Dive. GEOMETRY-KEYED: Attract, Mega Drain, Dream Eater,
  Blizzard (+ Giga Drain, hail). NOT REACHED: FRZ, ITEM_KNOCKOFF, return to ball (Scene ON AI switch not reached in 4 tries).
  Temp patch census seeds 0..299 (base `5779aa253`): 81.54 -> 83.73 % by count, 80.19 -> 83.23 % by frames (+174 / +35,614),
  0 regressions, identical commands + digest; predictor 0 unpredicted live; corpus 1136 -> 1143 / 213 -> 241, 0 mismatches.
  Supervisor: `prep45Run.sh` into fresh dirs — all 12 receipts byte-identical (216 probe runs, 0 A/B differ).
- Folded Opus worker `ed9636dee` (SIDE lane, narrow production grant) as `6a7af5b47` (src tree `76bb0125`): the prep45 plans —
  plan-rows appended after prep43's in the generator, table regenerated (508 bodies / 212 plans / 20 anims; BRN's text equals
  STATUS_INFATUATION's and dedupes), Solar Beam in TWO_TURN_ANIM_MOVE_IDS (odd turn -> 10076), TURN_TRAP keyed by the trapped
  battler's wrappedMove (Fire Spin / Whirlpool / Sand Tomb / Bind-Wrap; Clamp and others stay unplanned), the B_ANIM_TURN_TRAP
  event argument = wrappedMove (presentation payload; ON/OFF parity on Fire Spin seed 36 / Wrap seed 139). Census seeds 0..299:
  82.48 -> 84.73 % live by count, 80.87 -> 83.97 % by frames (+179 / +36,229; 5 more Protects than prep45 measured = the prep44
  interaction), 0 regressions, command sequence + battle digest identical. Pins moved only where a newly planned unit lends (route
  scans, Sky Attack seed 244 strike after Dragon Dance opponent). Worker gates 1,574 files / 12,963 tests, build, differential
  624/624 vs `70d3180f9`. Supervisor: census rerun byte-identical (`672f2df1`), corpus replay + per-frame check byte-identical to the
  prep45 receipts; union typecheck, smoke 448, 8 targeted files 80/80.
- Folded Opus worker `613c778f8` as `73efbff63` (union src tree `21729666`): GEOMETRY-KEYED order plans for Giga Drain (202) and Mega
  Drain (72). Mechanism proven: same-period absorption orbs are destroyed on one frame and their freed slots keep the last
  SortSprites y order (orb oam.y 288/288 + 28/28 == model), so the same-frame destroy pairs flip with the attacker / target
  picture coordinates. One generator (`src/animation/absorptionOrbSpriteOrderPlan.ts`) walks the renderers' own orb timelines;
  the seam (`liveMoveGeometrySpriteOrderPlanText`, displayed species via liveBattlerAnchors) passes the plan text on the
  move-animation event; no geometry -> invalidates as before; Absorb control == ROM plan 44. ROM grids (predictions recorded before
  the probes): Giga Drain 24 pairs + prep43's 10 = 34/34 plans, 1,360 allocation frames per-frame exact, 9/9 predicted flips; Mega
  Drain 14/14, 518 frames. Census seeds 0..299 vs `a556f6cdf`: 82.48 -> 83.10 % by count, 80.87 -> 81.76 % by frames (+49 / +10,319),
  0 regressions, identical commands + digest. Worker gates 1,574 files / 12,968 tests, build, differential 624/624. Supervisor:
  `gdgeoRun.sh` into fresh dirs — all 8 receipts byte-identical; clean auto-merge with order45 (both touch liveSpriteOrderHost.ts)
  -> fresh union gates below.
- Supervisor union gates on `73efbff63` (src `21729666`): census seeds 0..299 85.71 % live by count / 85.41 % by frames (session
  start 81.54 / 80.19), typecheck, full suite 1,575 files / 12,973 tests, build, differential 624/624 vs `0274c9d13`
  (`tools/integration/fixtures/union-gates-45a5832f7.json`).
- prep46 (side, `5f6b5e81c`, new files only): WORDS-DEPENDENT order units. With RAM-read Random2 words (gRng2Value per frame),
  the carry through the body's own sprite program is exact for Sand-Attack 28 (8 bodies, 120/120 allocation windows), Mud-Slap
  189 (6, 90/90), Rain Dance 240 (4, 320/320) and RAIN_CONTINUES (General_Rain; new drop program, 8, 320/320); 15/15 chains to the
  next consumer exact (12 jobs x2 fresh, all A == B). RAIN_CONTINUES can take words as a NON-CONSUMING per-event read (existing
  move-body words byte-identical in 40/40 schedules; a consuming read moves 240/320 bodies and would need a policy bump). Temp
  patch (generalized deferred lend for any consumer after 28 / 189 / 240; seam resolve memoized) census seeds 0..299 on
  `6a7af5b47`: 84.73 -> 85.17 % by count, 83.97 -> 84.36 % by frames (+35 / +4,550), 0 regressions; with RAIN_CONTINUES predicted
  +162 / +26,931. CLAIM: such consumers are faithful random (their order depends on surrogate words) — a fold needs per-command
  accounting. Dive not reached. Supervisor: `prep46Run.sh` into fresh dirs — all 13 receipts byte-identical.
- Folded Opus worker `d38be2b30` as `213918b23` (src tree `df4b263e`): Icy Wind (196) / Blizzard (59) at ARBITRARY species
  geometry — OAM slots + order derived from the reducers' own allocator replay (CreateSprite / SortSprites with the subpriority at
  Sprite+0x43; the retained table is reproduced at the accepted geometry) instead of the captured-table gate; history
  experiment (40 random pre-move orders x 11 geometries): pixel-neutral, no lend gate needed. 15 new pairs through the production
  renderer twice fresh: 12 exact 0 px; 3 short ROM bodies (early Task_FadeToBg restore, 16-18 tail rows; also in 2 pairs live
  before) recorded in ISSUES #152 as a D4 candidate. Blizzard opponent pairs with impact age != 197 now DECLINE (the old gate
  had accepted 50 such geometries at the wrong age; none in the census). Census seeds 0..299: 85.71 -> 86.37 % by count, 85.41 ->
  86.73 % by frames (+53 / +15,466), 0 regressions, identical commands + digest. Worker gates 1,576 files / 12,981 tests, build,
  differential 624/624. Supervisor: 4 new pairs rerun fresh through liveAdapterFramebuffer.ts — 0 px, digests identical to the
  receipt; clean merge on unchanged master src -> touched tests 28/28, smoke 448.
- prep47 (side, `e5cfbddde`, new files only): ORCHESTRATOR-side order stops. (A) "command resolution without an action prompt"
  is always an OPPONENT locked action (Dig 89, Petal Dance 25, Rollout 5, Solar Beam 3, Ice Ball 1 first-unit commands) retained
  across a player command; the ROM shows the player's ordinary prompt bounce pair at each turn boundary between the locked bodies
  (26 jobs x2 fresh; 36/36 boundaries, 37/37 prompt windows, 114/114 next-body orders exact) -> patch `promptShown = !playerLocked`.
  (B) battle-start seeds: Trace / prevented-Intimidate messages = known entry, Intimidate on both sides / + Trace = pre-prompt +
  one stat plan per triple (17 jobs x2, 56/56 windows exact). (C) the Factory AI voluntary switch reached in Scene ON (Perish Song
  timer): the opponent recall = the player's recall plan on slot 8, exact 3/3 (census +0 today). Temp patches census seeds 0..299
  on `2a5c0e2f9`: 85.71 -> 86.65 % by count, 85.41 -> 86.59 % by frames (+75 / +13,882), 0 regressions, identical commands +
  digest; next stop the Dig unleash later-body gate (59 commands / 7,314 frames). Supervisor: `prep47Run.sh` into fresh dirs —
  all 22 receipts byte-identical.
- Folded Opus worker `12128d464` (SIDE lane, narrow production grant) as `024efddfd` (src tree `0ee75849`): prep47 live — (A) a
  retained locked-action continuation applies the player's prompt cycle (`promptShown = !playerLocked`); (B) battle-start seeds
  accept Intimidate-triple sequences + Trace / prevented-Intimidate messages; (C) the opponent's voluntary switch-out recalls slot 8
  (`switch-out {side: "opponent"}`; a recall after a body still invalidates). Census seeds 0..299: 86.37 -> 87.31 % by count, 86.73
  -> 87.92 % by frames (+75 / +13,882, exactly prep47's), 0 regressions, identical commands + digest; ON/OFF parity on the retained
  Dig route. prep47 checks byte-identical to its receipts. Pins moved: route sweep hostKnown 646 -> 709 (declines 63 -> 0),
  voluntaryLend opponent recall. Worker gates 1,578 files / 12,988 tests, build, differential 624/624. Supervisor: census rerun
  byte-identical (`06803fca`); clean merge -> touched tests 36/36, smoke 448.
- Folded Opus worker `4858943f7` as `55df8e845` (union src tree `1fb74f37`): prep46 live — a GENERALIZED seam-resolved deferred
  sprite-order lend after Random2-words units (Sand-Attack 28, Mud-Slap 189, Rain Dance 240) and the RAIN_CONTINUES general
  animation. Reducers export their own sort loops (renderer and carry share them); the Mud-Slap 4/3 start rule is replaced by the
  slide-helper carry (second Mud-Slap bodies now live; first bodies' draw order unchanged at every age); any consumer takes a words
  marker's lend (Ice Ball keeps its own rule), resolved at the render seam (memoized). RAIN_CONTINUES: per-event NON-CONSUMING
  sub-stream read (supervisor decision: no policy bump; all existing move-body words identical in 40/40 schedules; the 80-draw
  shortfall is documented in docs/presentation-rng.md). ACCOUNTING: a live command whose adapter reads a lend resolved through a
  words marker carries `faithfulRandomHistory` (counted separately by the census; adapter counts unchanged). Tier-1: carry 26/26
  vs RAM-read words, 18 production deferred lends == ROM activation orders. Dense windows with RAM words pinned (test-only hook):
  Sand-Attack / Mud-Slap second bodies 5/5 and Ice Beam after Rain Dance + General_Rain 203/203 rows, 0 px twice fresh. Census
  seeds 0..299 on `213918b23`: 86.37 -> 88.12 % by count, 86.73 -> 88.56 % by frames (+139 / +21,327), of which faithful-random
  history 128 commands / 21,283 frames (incl. 7 previously-live Flamethrower / Rock Slide commands now reading the resolved lend);
  0 regressions, identical commands + digest; rain route ON/OFF + two presentation seeds identical logic. Worker gates 1,577 files /
  12,995 tests, build, differential 624/624. Supervisor: the 6 dense windows rerun fresh — 0 px, digests in the receipt; merge with
  order47 conflicted only in tools/integration/orderCrossBodyRouteScan.ts (kept both flags) -> fresh union gates below.
- Supervisor union gates on `55df8e845` (src `1fb74f37`): census seeds 0..299 89.10 % live by count / 89.76 % by frames,
  typecheck, full suite 1,579 files / 13,002 tests, build, differential 624/624 vs `876b76d84` (`union-gates-0209f0d22.json`).
- prep48 (side, `0781d0085`, new files only): LATER-BODY gates. Dig setup: the protected history (monbg BGxCNT, scanline lines
  above the attacker band, active buffer) differs at later bodies but never reaches the renderer's pixels; Dig unleash after a
  later setup: the host lend == ROM order 17/17; Return: registers it does not write are never read, the allocator was identical at
  every probed activation, but battler x2 rests are real history the x2 tracker gets wrong for ONIX / RATTATA (Quick Attack /
  Return rows) -> later bodies need both species rests {0,0}. 20 scenarios x2 fresh (predecessors Quick Attack, Growl, Splash, own
  body); Dig 21/21 + 21/21 and Return 29/29 windows 0 px through the production renderer. Temp patch census seeds 0..299 on
  `024efddfd`: 87.31 -> 88.96 % by count, 87.92 -> 89.83 % by frames (+131 / +22,306), 0 regressions; later-body declines 161 -> 30.
  Supervisor: `prep48Run.sh` into fresh dirs — all receipts + 78 window fixtures byte-identical. Open supervisor concern for the
  fold: allocator constants after a NON-net-zero predecessor (not probed).
- Folded Opus worker `9ada5e2dd` (+ supervisor rename `230946aa9`: its tools prep48* -> plans48*, outputs byte-identical) as
  `d586acb45` (src tree `f34f016f`): TAIL order plans — FRZ (staged by an Ice Beam seed sweep), NIGHTMARE, CURSED, ITEM_KNOCKOFF
  (bag sprite carries), Ice Punch, Razor Leaf opponent, Snore, Struggle opponent, Grudge player, Razor Wind by turn, Present by
  branch (damage <= 0 -> 20217 heal), Attract (one plan: prep45's "geometry key" was a probe frame-boundary split; identical
  post-unit order from 3,618/3,618 start orders), Dream Eater GEOMETRY-KEYED through the absorption-orb generator (predictions
  recorded before the grid; 4 predicted flips held). 291 jobs x2 fresh, all A == B. Table 508 -> 525 bodies / 212 -> 219 plans /
  20 -> 24 anims, no index moved; corpus 1143 -> 1159 known, 0 mismatches. Not landed: Shock Wave (opponent geometry), SUBSTITUTE_FADE
  / FOCUS_BAND (not reached), Fury Cutter / Water Spout (need event fields), Blizzard / hail (time). Census seeds 0..299:
  89.10 -> 90.16 % by count, 89.76 -> 91.21 % by frames (+85 / +17,015), 0 regressions, identical commands + digest. Worker gates
  1,580 files / 13,008 tests, build, differential 624/624. Supervisor: census rerun byte-identical (`0238a463`); generator regen
  no diff; check / plan rows / Dream Eater predictions regenerated byte-identical; 32 fresh probe jobs (Ice Punch, NIGHTMARE,
  Attract) identical to the committed units; clean merge on unchanged master src -> touched tests 47/47, smoke 448.
- Folded Opus worker `e3807319e` (SIDE lane, narrow production grant) as `5364b05c4` (union src tree `da34a188`): Dig (91) setup /
  unleash and Return (216) live at LATER bodies — a known lend, then first body / right after the first setup / both species rests
  {0,0} (the ONIX / RATTATA x2-tracker gap keeps declining); shiny gates kept. The supervisor's allocator concern was settled by
  fresh probes (verdict (ii)): after Will-O-Wisp + Status_Burn and Toxic + Status_Poison (non-net-zero; also Growl / Splash / Return
  were already non-net-zero in prep48) the tile bitmap, palette tags, matrix bitmap and task list equal the first body's at 50/50
  starts; 16 scenarios x2 fresh; Dig 32 + Return 16 later48 windows and all 78 prep48 windows 0 px x2 (ONIX declines). Harness fix:
  the fixture builder now reads the healthbox status from the ROM. Census seeds 0..299 on `554ff334e`: 89.10 -> 90.84 % by count,
  89.76 -> 91.82 % by frames (+139 / +24,047; Dig 107, Return 32), 0 regressions, identical commands + digest; ON/OFF parity on a later
  Dig route. Worker gates 1,580 files / 13,013 tests, build, differential 624/624. Supervisor: both later48 pixel checks rerun fresh —
  byte-identical to the committed receipts -> fresh union gates (with plans48) below.
- Supervisor union gates on `5364b05c4` (src `da34a188`; plans48 + later48): census seeds 0..299 92.01 % live by count / 93.38 % by
  frames, typecheck, full suite 1,581 files / 13,019 tests, build, differential 624/624 vs `272fa0b84`.
- Folded Opus worker `73f237e35` as `60ae3a406` (src tree `f7cf9a74`): D4 accounting for the short-body / early-fade class. Fresh
  counters (46 scenarios x2): the short body has the same fixed lags and lacks exactly one optional lag — Icy Wind optional 261 (11
  present : 4 absent), Blizzard player 347 (7 : 0) / opponent 336 (3 : 1), Confuse Ray 249 or 250 (no visible difference; counted
  from uninstrumented window lengths because the counter instrument can itself add the borderline lag), Faint Attack 205 (opponent
  2 : 1, player 0 : 6 + the accepted long body). Policy entries pick the long body (today's renderer) for Icy Wind / Blizzard /
  Confuse Ray; 28 windows through d4aTimingCheck x3 passes, other phase only on documented ages, 0 violations; d4a regression 232
  fixtures 0 violations. ACCOUNTING: Icy Wind, Blizzard, Confuse Ray scoped exact -> faithful timing (census 245+13+18 ->
  242+13+21; LIVE_MOVE_ANIMATION_IDS list edit outside the grant, accounting-only, d4w precedent). Faint Attack stays scoped exact:
  its player-side dominant phase is the short body, which needs a renderer change (ISSUES #152). Worker gates 1,581 files / 13,016
  tests, build, differential 624/624. Supervisor: d4tailsTimingCheck rerun fresh — all 28 windows match the receipt (px, rows,
  affected ages), 0 violations; a stale main-tree `.git/index.lock` (no holder) blocked the first merge attempt and was removed.
- Supervisor union gates on `60ae3a406` (src `f7cf9a74`): census seeds 0..299 92.01 % / 93.38 % (accounting-only change), typecheck,
  full suite 1,582 files / 13,027 tests, build, differential 624/624 vs `cf9fabc44` (`union-gates-7993b02fd.json`).
- Live audit 15 (side, `fce69fb16`, new files only): CHAIN routes that became live tonight. 65 scenarios / 142 consumer windows
  (BRN, Fire Spin trap, Hydro Pump, Solar Beam unleash, Petal Dance / Dig continuations, Icy Wind, Ice Beam, Double Team, Faint
  Attack, Swift, Giga Drain -> Blaze Kick / Heal Bell / Flamethrower / Thunderbolt / Reflect / Protect / Light Screen; two species
  pairs), every window twice fresh: NO species / history defect; 130 / 139 live windows 0 px (33 of them lend-discriminating: the
  first-body lend would leave 4-66 px); the one residual class is the Light Screen opponent row-59 VBlank-write CPU phase (ISSUES
  #152, D4 candidate). Correct declines: Light Screen after Will-O-Wisp + burn / Tackle (allocator unknown). Supervisor:
  `audit15Run.sh` into fresh dirs — main + entry-lend receipts byte-identical.
- Final ordinary-play census on src `f7cf9a74` (seeds 0..999, two runs byte-identical): 87.23 % live by count / 91.13 % by frames
  (session start 77.68 / 78.76); seeds 50000..: 88.38 / 90.47 (`docs/live-share-census.md` "Latest").
- Folded Opus worker `a605186ce` as `b264ff21b` (src tree `f1f2de08`): Faint Attack (185) per-side restore lag derived from source
  (`Task_FadeToBg` state 2 redraws the BG and starts the fade-in in one step; the optional lag at age 205 is that decompress frame
  running past VBlank while the screen is black): player attacker no lag -> 220 rows (1 : 6 measured), opponent lag -> 221 rows
  (2 : 1); `faintAttackRestoreProfile`. 10 windows x4 runs: policy phase 0 px both sides; other phase only on ages 203..218
  (DELCATTY -> GOLEM 297,920 px, the accepted prep6 player body 281,024 px — now the documented other phase). Faint Attack scoped
  exact -> faithful timing: census 241+13+22+0+0=276. d4a regression 243 fixtures 0 violations; worker gates 1,583 files /
  13,031 tests, build, differential 624/624. Supervisor: fa185TimingCheck rerun fresh — all 10 windows == receipt.
- prep49 (side, `2a1bdf505`, new files only; banked for the next session): the remaining largest order stops classified from
  script labels — "return to ball" = player Baton Pass (13 stops, 33 / 5,035: EXACT via the returntoball skip path), opponent Baton
  Pass (EXACT), and the end-of-battle loss return (124; no change needed); "next-mon summary while the opponent battler is tracked" =
  the Factory AI voluntary switch (the kernel's returnatktoball emits no visibility event — why prep47's opponent recall never fired;
  EXACT at the next body edge); "reshow without the opponent battler" = double KO (new reshow plan `Cfee;Cfee;Cf`, EXACT). 8 jobs x2
  fresh. Temp patch census seeds 0..299 on `edbb2d8a1`: 92.01 -> 92.66 % by count, 93.38 -> 94.12 % by frames (+52 / +8,685), 0
  regressions. Supervisor: `prep49Run.sh` into fresh dirs — all 10 receipts byte-identical.
- Supervisor gates on `b264ff21b` (src `f1f2de08`): typecheck, full suite 1,583 files / 13,031 tests, build, differential 624/624 vs
  `edbb2d8a1`, census seeds 0..299 92.01 % / 93.38 %. Preview `365027e82` served in between.
- Folded Opus worker `bbc46662c` as `c26e134bb` (src tree `dde58985`): prep49 live — Baton Pass recall (both sides; `returntoball`
  labelled BattleScript_EffectBatonPass, the Roar / Whirlwind skip path), the AI voluntary switch's next-mon summary under
  BattleScript_DoSwitchOut (opponent recall first; a Pursuit-intercepted switch still invalidates), the double-KO reshow with neither
  battler (`Cfee;Cfee;Cf`). prep49 checks byte-identical; corpus 0 mismatches. Census seeds 0..299 on `eb3ae0163`: 92.01 -> 92.66 % by
  count, 93.38 -> 94.12 % by frames (+52 / +8,685), 0 regressions, identical commands + digest; ON/OFF parity on a Baton Pass route.
  Worker gates 1,583 files / 13,039 tests, build, differential 624/624. Supervisor: census rerun byte-identical (`6b12ede3`), prep49
  check byte-identical.
- Supervisor FINAL gates on `c26e134bb` (src `dde58985`): typecheck, full suite 1,583 files / 13,039 tests, build,
  differential 624/624 vs `eb3ae0163`, census seeds 0..299 92.66 % / 94.12 % (`final-supervisor-gates-20261009.json`). Preview
  <http://127.0.0.1:5191/> serves `dc4c31b53` (4 samples hash-equal, session export + ON->OFF restart, no errors;
  `playable-preview-96aaaebbe-receipt.json`).
- prep50 (side, `7588d50c0`, new files only; banked for the next session): allocator history after STATUS animations. Chain census on
  `eb3ae0163` (seeds 0..299): 147 allocator declines / 15,787 frames, greedy SLP -> CONFUSION -> PSN -> FUTURE SIGHT hit -> PRZ -> BRN.
  A status-script-keyed net-zero probe (sAnimMoveIndex is 0 for status animations): SLP, CONFUSION, PSN, PRZ, BRN NET-ZERO (35
  scenarios x2 fresh, both sides, two afflicted species each); FRZ and the status2 animations not audited. Temp patch (status set +
  a separate crossedAllocatorUnknown flag; palette invalidation unchanged) census 92.01 -> 92.70 % by count, 93.38 -> 93.92 % by
  frames (+55 / +6,302), predictor exact, 0 regressions. The post-KO reseed is blocked by the ORDER host (all 159 non-reseeding
  switch-ins have an invalid order host). Supervisor: `prep50Run.sh` into fresh dirs — all 7 receipts byte-identical.

## 2026-10-08 (overnight) — S10A: Substitute presentation live, deferred order lend, live-share census, sprite-order plans; 245 + 13 + 18

- Final: production src tree `e3fc2240` (`660b67f7c`); supervisor final gates on the union typecheck, 1,573 files / 12,958
  tests, build 874, differential 624 / 624 vs `fff36d5f9` (`final-supervisor-gates-20261008.json`). Census
  `245+13+18+0+0=276` (Crunch, Psychic, Extreme Speed, Pursuit, Hidden Power moved scoped exact -> faithful timing).
- prep44 (side, `70c9a351a`, new files only; after the final gates — evidence only): allocator-history gaps. Allocator
  fallbacks come from CHAINS of invalidating units (only 38 / 232 single-cause; the history only returns at a post-KO
  reseed). 50 move bodies audited NET-ZERO (both orientations, twice fresh, 103 pairs identical); appending them to
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS (liveMoveSpriteAllocator.ts ~:64; pin tests/liveSpriteAllocator.test.ts) raises
  census seeds 0..299 81.54 -> 82.48 % by count, 80.19 -> 80.87 % by frames, 0 regressions, identical gameplay commands
  (chain predictor matches both measured patches). Not audited: status animations (sleep / confusion / poison: 39 cmds /
  4,428 frames; separate orchestrator path ~:2391), Future Sight, long tail; post-KO summary + switch-in reseed blocked
  by order-host state. Supervisor: `prep44Run.sh` into fresh dirs — all 10 receipts byte-identical.
- Folded Opus worker `35c22dd18` as `e50d115f8` (src tree `ab030259`): Substitute STATUS animations SUBSTITUTE_TO_MON /
  MON_TO_SUBSTITUTE presented live around a subbed ATTACKER's proven body (`src/engine/liveSubstituteSwap.ts`: source
  AnimTask_SwapMonSpriteToFromSubstitute, x2 5 per row, 42 / 40 script rows, graphics load row 21 / 20, one idle row,
  2-row OAM latch; swap-back only on the last hit). Proven bodies Headbutt (29), Body Slam (34), Leech Seed (73); every
  other attacker-doll body and every defender-doll body still declines. x2-history fix: Substitute animates its own
  user, so the other battler keeps its idle rest (ONIX +1). Not an accepted body: counts unchanged 250 + 13 + 13.
  Open: the row after the swap-back (600 / 679 px, ROM still 5 px out), swaps before faint / switch-out, the fade.
  Worker gates 1,563 files / 12,823 tests, build 873, differential 624. Supervisor: `substSwapRun.sh` into fresh dirs —
  probes r1 == r2 (13 scenarios), 21 windows x2 runs 0 px, GOLEM-player residual == non-subbed control, negatives fail;
  union typecheck, smoke 448, 9 targeted files 128/128, own differential vs `1ee47efd6` 624/624. Logs `.integration/validation/swap-20261008/`.
- Folded Opus worker `30c5ca309` (SIDE lane with a narrow production grant, disjoint from the sides step) as `660b67f7c`
  (union src tree `e3fc2240`): the prep43 sprite-order plans — PRZ survivor count (each slot counted at its last creation),
  STATUS_CONFUSION `Cfffff;D1,2,0,3,4`, LEECH_SEED_DRAIN, SANDSTORM_CONTINUES (WEATHER_VAR argument 12 / 13 now carried by the
  weather animation event, derived from the weather bits; gameplay state identical), Dig / Brick Break turn-keyed (10000 +
  id, as Sky Attack); generated table appended (493 bodies / 201 plans, no index moved). Census seeds 0..199: 75.72 -> 78.18 %
  live by count, 75.98 -> 79.28 % by frames, +131 commands, 0 live -> fallback, identical command set and battle digest.
  Corpus replay turn-keyed known 1130 -> 1136, 0 mismatches. 8 existing test pins moved because more bodies now lend
  (listed in the worker report; post-KO Rock Tomb lend checked against the ROM free order). Worker gates 1,570 files /
  12,941 tests, build; differential not run by the worker. Supervisor: census seeds 0..199 on the branch — report sha256
  `ab5ff1ec` identical to the worker's "after"; turn-keyed corpus replay 1136 / 1136 exact, 0 mismatches; final union gates
  below.
- Folded Opus worker `35df6fc8c` as `fff36d5f9` (src tree `09b0062a`): the missing ATTACKER SIDES — Double Team (104) opponent
  (230 rows; opponent battler drawn at its front idle rest; new #142 gap rows 158..161 for an elevated opponent in either
  role), Faint Attack (185) opponent (221 rows; roles by attacker / target), Rock Slide (157) player (138 rows). 13 windows
  incl. the existing-side controls, all 0 px except Faint Attack DELCATTY -> GOLEM (297,920 px on ages 203..218 only: a
  one-frame-shorter body, the restore fade lands early — the same tail as the recorded MURKROW alternate; pinned by test).
  Routes 3014/14 (Double Team), 186/0 (Faint Attack), 4/7 (Rock Slide) live, ON/OFF parity. Counts unchanged. Differential
  presentation-rng-playable-live-bodies-seeded-on frame 3622 now differs (9,461 px): an opponent Double Team body that
  used to fall back is live (revert of the gate restores 173 / 173). Worker gates 1,573 files / 12,953 tests, build.
  Supervisor: `sidesLiveReceipt.ts` rerun — 13 windows x 2 invocations x 2 fresh runs identical to the committed receipt;
  union typecheck, smoke 448, 9 targeted files 128/128, own differential vs `1dbc7b0ce`: 623 / 624 byte-identical, the one difference exactly frame 3622 (9,461 px) as attributed. Logs `.integration/validation/sides-20261008/`.
- prep43 (side, `f549980b0`, new files only; merged `740d3fdbd`): sprite-order EXACT plans for the census's top order-host
  stops: CONFUSION (`Cfffff;D1,2,0,3,4`, 17 / 17 ROM checks), PRZ (a survivor-count bug in spriteOrderProvider.ts ~:407: the
  alternating spark slots were counted four times; existing plan + carry 13 / 13 exact), Dig setup / unleash and Brick Break
  normal / shattered keyed by turn, LEECH_SEED_DRAIN, sandstorm WEATHER_VAR; BLOCKED: Giga Drain (species geometry), hail
  (battler coordinates), RAIN_CONTINUES (Random2 words, not covered by the deferred lend), locked-turn continuation
  (orchestrator), return to ball (not reached). Temp patch (4 files): census seeds 0..199 75.68 -> 78.10 % by count, 75.95
  -> 79.22 % by frames, 0 regressions, identical command set; corpus replay known 1130 -> 1136, 0 mismatches. Supervisor:
  `prep43Run.sh` into fresh dirs — all 10 receipts byte-identical.
- Folded Opus worker `adedf369a` as `1dbc7b0ce` (src tree `15be9e2a`): (a) Pursuit (228) later bodies FAITHFUL TIMING (lag at
  82, fixed 60 / 61; 24 : 9 -> lag, 103 rows; first-body gate lifted, body 2 after the attacker's own Pursuit proven with 12
  turn-2 windows); (b) Hidden Power (237, Unown) FAITHFUL TIMING (lag 64, fixed 118; 1 : 9 -> no lag, 180 rows); (c) audit-14
  fixes: Confuse Ray / Bite opponent idle-rest attacker (ONIX 294,419 / RATTATA 110,700; 10,660 / 28,366 -> 0 px), fade row-0
  shadow of an elevated non-doll opponent (200 -> 0); Confuse Ray D4 entry NOT landed (its optional lag lands at 249 or 250:
  one policy age would mislabel windows; 270 rows already the dominant length); (d) Flatter on the #142 row-0 hook (elevated
  decline dropped; 26 windows 0 px), Skill Swap idle-rest gate lifted, documented max 18,778; (e) NIDORAN F / M battle
  healthbox: no gender symbol when un-nicknamed (battle_interface.c:1929-1930; 7,008 -> 0 px; no committed trace shows a
  NIDORAN). Census `245+13+18+0+0=276`. Worker gates 1,570 files / 12,936 tests, build, differential 624, 204 timing
  fixtures 0 violations. Supervisor: `d4wDense.sh` over all 43 d4w-live fixtures fresh — 33 policy-phase 0 px, 10
  other-phase only on documented ages (Pursuit 84..99, Hidden Power 65..179), 0 violations; NIDORAN F player / opponent
  windows 219 / 219 rows 0 px twice fresh; union typecheck, smoke 448, 13 targeted files 262/262, own differential vs `1f6057c54` 624/624. Logs `.integration/validation/d4w-20261008/`.
- Live-share census (side, `af26241e9`, new files only): `tools/integration/liveShareCensus.ts` plays 1000 ordinary Scene ON
  battles (generated rentals, all-slot move policy) and classifies every move-animation / fade command by the production
  gate that fired. On src `d15bc413`: 72.56 % live by count, 75.15 % by presented frames (seeds 50000..: 75.12 / 76.13);
  the sprite-order lend causes 72 % of fallback frames (17.9 % of all move frames): host stopped at the CONFUSION status
  animation (97k), PRZ survivors (61k), Giga Drain / Dig bodies, WEATHER_VAR / RAIN_CONTINUES; allocator history 9 %
  (Protect / screens). `docs/live-share-census.md`. Supervisor: seeds 0..999 rerun — report byte-identical (afd335f3).
- Folded Opus worker `fdab52356` as `1f6057c54` (src tree `9a1e8a70`): audit-13 fixes. (a) Ice Beam / Thunderbolt / Sludge
  (Bomb) draw a live opponent attacker at its tracked front idle rest (ONIX 221,473 / 258,567 / 182,849 -> 0 px; 41 committed
  fixtures render-identical; static scan lists 15 more candidate renderers, unproven). (b) Substitute swaps decline a shiny
  battler. (c) Ice Ball resting target already declined (`liveIceBallInputs.ts:147`; test pins it); lend-live counter labels
  confirmed (chain 30 / 60 / 120). (d) D4 policy: Crunch (lag 121: 17 : 13), Psychic (124: 26 : 2), Extreme Speed (292:
  38 : 4), Dive opponent setup (64: 6 no-lag : 1). ACCOUNTING: Crunch, Psychic, Extreme Speed move scoped exact -> faithful
  timing: census `247+13+16+0+0=276`. Worker gates 1,568 files / 12,920 tests, build 874, differential 624, 161 timing
  fixtures 0 violations; swap / attdoll / dolldef / lend evidence unchanged except the intended shiny decline. Supervisor:
  the 12 ONIX-attacker windows (Ice Beam, Thunderbolt, Sludge Bomb, Crunch, Psychic, Earthquake, both sides) through the
  fixed code with MY fresh audit-13 probes — all 0 px, r1 == r2; union typecheck, smoke 448, 14 targeted files 298/298, own differential vs `973022e68` 624/624. Logs `.integration/validation/a13fix-20261008/`.
- Species audit 14 (side, `b3ae63290`, new files only): subbed-attacker swap grid 219 scenarios / 565 windows (418 / 430
  presented composites 0 px; tail latch 430 / 430) + fade 28 scenarios / 34 windows (32 exact). DEFECTS (patch proofs 0 px):
  fade with an elevated OTHER opponent keeps its shadow on row 0 (200 px; liveSubstituteFade.ts ~:155); Confuse Ray (ONIX
  294,419 / RATTATA 110,700) and Bite (10,660 / 28,366) draw an idle-rest opponent attacker without its rest (audit-13
  class; doll-free bodies). D4: Crunch 141 vs 140 body rows confirmed in composites; NEW Confuse Ray 269 vs 268 (ages
  251..266). Supervisor: fade set re-probed fresh — r1 / r2 receipts semantically identical, txt byte-identical; Confuse
  Ray rest patch proof summary byte-identical.
- prep41 (side, `c68c39c6f`, new files only): D4 widening readiness. Pursuit (228) later bodies READY as faithful timing
  (optional-lag-age 82, fixed lags 60 / 61; 24 lag : 9 no-lag -> lag, 103 rows; 21 windows through the patched production
  renderer: 15 policy-phase 0 px, 6 other-phase only on ages 84..99). Hidden Power (237, Unown) READY as a reclassification
  (optional-lag-age 64, fixed lag 118; 1 : 9 -> no lag, 180 rows; UNOWN -> GOLBAT other phase ages 65..179). Ghost Curse
  BLOCKED not by D4 (line 14 in 5 / 8; production has no Ghost-branch provider; port plan §4.3). Accounting if both land:
  exact -2, faithful timing +2. Supervisor: `prep41Run.sh` into fresh dirs — all 7 receipts byte-identical.
- Folded Opus worker `6c35783f9` as `973022e68` (src tree `d15bc413`): General_SubstituteFade presented live as a
  presentation-only `substitute-fade` command (`src/engine/liveSubstituteFade.ts`; 106 player / 104 opponent rows = script
  rows + first inactive row + 2-row OAM tail; Scene ON and OFF), inserted before the "faded" message; BG-copy alpha + white
  blend renderer branch; doll cleared at the fade's start; x2 history zeroes the fading side; elevated shadow back at script
  rows + 2; D4 policy `LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE` (alpha step later row 222 / 2 early, blendoff
  12 / 2). 14 windows / 1,464 rows: 13 at 0 px, PERSIAN -> ONIX 542 px only on documented rows 27 / 45, Scene OFF 0 px —
  claim scoped OUTSIDE the message-box wait-cursor footprint (the ROM shows a frozen cursor on the fade rows after the
  automatic "took damage" message; 37 px / row, 50,246 px total; message-host question, ISSUES #152). Route JYNX 11/35:
  Sludge Bomb breaks the doll, fade 106 rows, next prompt with the mon shown, ON/OFF parity. Not an accepted body: counts
  unchanged. Worker gates 1,567 files / 12,902 tests, build 874, differential 624, 161 timing fixtures 0 violations, swap /
  dolldef evidence unchanged. Supervisor: `fadeLiveRun.sh` into fresh dirs — probes r1 == r2 (8), 14 / 14 window results
  identical to the committed receipt, negatives fail; union typecheck, smoke 448, 10 targeted files 194/194, own differential vs `431ad3147` 624/624. Logs `.integration/validation/fade-20261008/`.
- Species audit 13 (side, `9c74311c3`, new files only; merged `ff120e45d`): defender doll 330 windows (11 moves x 2 sides;
  defenders STEELIX / WAILORD / TYRANITAR / PICHU / GOLBAT / FLYGON / WEEZING / ONIX / RATTATA / shiny STEELIX), swaps 67
  scenarios, Ice Ball 28 windows; the doll itself exact for every defender species. DEFECTS (patch proofs 0 px): opponent
  idle-rest ATTACKER drawn without its rest in the Ice Beam / Thunderbolt / Sludge Bomb renderers (ONIX 221k / 259k / 183k
  px, with or without the doll — pre-existing); swaps with a SHINY attacker (no shiny gate). Ice Ball resting target (ONIX /
  RATTATA) 30k-79k px, no gate. New D4 cases: Crunch 13 / 30 windows 141 rows, Psychic 2 / 28 windows 144 rows. Supervisor:
  defender set re-probed fresh — 310 + 20 receipts byte-identical, summary identical; rest patch proof 0 px x3; swap
  receipts 134 byte-identical.
- Folded Opus worker `9e361312e` as `431ad3147` (src tree `4af0870a`): subbed-ATTACKER swaps widened per (move, attacker side)
  (`LIVE_SUBSTITUTE_SWAP_BODY_CELLS`): the prep40 one-batch (14 bodies, 26 cells), ROM body framing
  (`LIVE_SUBSTITUTE_SWAP_BODY_FRAMING`: first inactive row + activation shift; Earthquake, Psychic p, Sludge Bomb,
  Flamethrower, Toxic, Bite, Fire Punch, Explosion), the order-dependent bodies via the order-neutral Substitute lend (Ice
  Beam, Thunderbolt, Giga Drain, Overheat, Seismic Toss, Megahorn D4) — 53 cells; one-row tail latch (doll at x2 -5 / +5 on
  the next command's first row, same segment; composite length unchanged). 84 windows / 21,821 rows, 81 at 0 px; the 3
  others are not swap-related (Giga Drain after [164, 33, 202, 33]: no order lend, falls back as doll-free; Megahorn
  opponent 175-row ROM body = the D4 phase not shipped). Still declining: Mud-Slap (first-body lend), Shadow Ball (154 / 155
  phase; player control residual), Solar Beam (turn gate), Roar (target x2 +98), Dig (hidden attacker), multi-hit split,
  faint / switch-out swap-in, doll-free-control residual cells. Route SHUCKLE 243/35 subbed Toxic 316-row composite, ON/OFF
  parity. Counts unchanged. Worker gates 1,566 files / 12,893 tests, build 873, differential 624, 161 timing fixtures 0
  violations, 21 swap windows rerun 0. Supervisor: `attdollRun.sh` into fresh dirs — probes r1 == r2 (59; one exit-138
  teardown papercut, output complete), all 84 windows identical to the committed receipt (px, digests, tail rows; tail latch
  84/84 0 px vs 600 / 679 without); union typecheck, smoke 448, 12 targeted files 204/204, own differential vs `c37ebb4c7` 624/624. Logs `.integration/validation/attdoll-20261008/`.
- prep39 (side, `3d1d02fc0`, new files only): General_SubstituteFade source model READY-WITH-CHANGE through the production
  compositor: 14 windows / 1,436 rows (GOLEM<->ONIX both sides, PERSIAN<->SLOWBRO, Scene OFF, RATTATA, elevated GOLBAT):
  11 policy-exact 0 px, 3 alternate-phase (alpha step / blendoff one row early; 2 x 271 px) attributed; 5 negatives fail.
  Rows 2-51 BG copy with alpha every 3 rows + white blend per row, 52-84/83 invisible, slide back = substituteSwapRows
  verbatim from row 61. Port plan: a 103 / 101-row fade command at substituteFades.at before the 'faded' message; missing
  input = the dismissed message's frozen wait cursor. Supervisor: `prep39Run.sh` into fresh dirs — probes r1 == r2,
  all 7 receipts byte-identical to the committed ones.
- Folded Opus worker `3d69e958b` as `c37ebb4c7` (src tree `ccde138a`): DEFENDER shown as the Substitute doll — prep38 v1 in
  production behind `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS` (37 proven (move, attacker side) cells, weight ~28.4: the 27 v1
  cells + Giga Drain / Mud-Slap (D3) via the order-neutral Substitute body + Ice Beam / Thunderbolt / Megahorn (D4) via
  doll art lookups and the doll palette bank). Effect / hit anchors stay on the species corner (GetBattlerSpriteCoord),
  doll OBJ at its corner with rest 0. Move 164 removed from OWNERSHIP_CHANGING_MOVES (source: Move_SUBSTITUTE creates /
  destroys no sprite; measured empty plan); corpus replay known 1,130 / 0 mismatches unchanged. Still declining: Aerial
  Ace o / Shadow Ball o (doll-free control residuals), Quick Attack p, Double-Edge p, both dolls, unmeasured moves;
  Swagger / Confuse Ray / Thunder Wave / Toxic skip their animation against a substitute (source). Route 103/28 MEGANIUM:
  opponent Earthquake live on the player's doll 198 rows, ON/OFF parity. Noted (not doll-caused, pre-existing adapter
  limits): Shadow Ball PERSIAN -> SLOWBRO 304,556 px (doll-free control residual rows 69..99 + 156-row tail phase), Psychic
  o HAUNTER -> KADABRA 200 px on the pre-activation row. Worker gates 1,565 files / 12,888 tests, build 873, differential
  624, 161 timing fixtures 0 violations. Supervisor: fresh prep38 probes (65 scenarios, r1 == r2) -> all 53 dolldef-live fixtures regenerated byte-identical; dolldefLiveCheck 50 / 53 every row exact, the 3 others exactly the documented non-doll residuals; union typecheck, smoke 448, 14 targeted files 213/213, own differential vs `73df30168` 624/624. Logs `.integration/validation/dolldef-20261008/`.
- prep40 (side, `a100c477e`, new files only): live adapters used by a subbed ATTACKER inside the production swap composite
  (75 scenarios x2 fresh, two passes byte-identical; no swap row ever carried a residual). 28 cells 0 px (17.04); one-batch
  14 ids (26 cells, 16.49). NEEDS-BODY-FRAMING 12.25 (swap-back starts at the body's ROM first inactive row: Earthquake,
  Psychic p, Sludge Bomb, Flamethrower, Toxic, Bite, Fire Punch, Explosion -> 0 px), NEEDS-ORDER 6.82 (no order input after
  the attacker's own Substitute body; Seismic Toss also needs damage), Roar target x2, Dig hidden attacker, Double Kick split.
  Tail row: the ROM shows the doll at x2 -5 / +5 on the row after the window (draw it on the next command's first row).
  Faint / switch-out: swap-in first (42 / 40 rows, same rows as substituteSwapRows). Supervisor: `prep40Run.sh` into fresh
  dirs — probes r1 == r2 (75), summary.txt / summary.json byte-identical to the committed receipts.
- Folded Opus worker `7b7658087` as `73df30168` (src tree `70fd1474`): seam-resolved DEFERRED sprite-order lend (design 1 of
  `docs/s10a-random2-order-lend-blocker.md`): the order host records a word-free marker at an Ice Ball body (presentation
  body key, request fields, its own lend — known-entry free order or itself deferred — and the order events after it);
  later Ice Ball bodies get `{ known, free: [], deferred }`; the render seam (`resolveSpriteOrderDeferredLend`) carries
  the order through the earlier body with that body's recorded words and replays the following units with the existing
  plans (8/8 ROM transitions in tests). Ice Ball counters 1..4 LIVE (faithful timing + d3; per-counter policy: no lag
  for counters 0..3, lag at row 112 for counter 4 -> 133 rows). Post-KO / send-in chains still decline (gate + test);
  Dive attack body not reached. Counts unchanged (250 + 13 + 13). Worker gates on `193f7e2cf` (same src): 1,564 files /
  12,828 tests, build 873, differential 624, 161 timing fixtures 0 violations. Supervisor: fresh probes (r1 == r2),
  fixtures regenerated byte-identical, 12 windows x2 one process each — 11 policy-phase 0 px, accepted player body 4
  (lag row 38, other phase) 55,632 px only on documented ages 38..74 (0 violations); union typecheck, smoke 448, 10 targeted files 182/182, own differential vs `e50d115f8` 624/624. Logs `.integration/validation/lend-20261008/`.
- prep38 (side, `1f102ddb3`, new files only; merged `6903b5209`): live adapters with a subbed DEFENDER. With the doll
  as the defender's art (patch v1: hit / effect anchors stay on the species, sprite corner = doll corner without
  elevation, idle rest 0, opponent shadow hidden; negative controls fail) 27 (move, side) cells are 0 px, weight 22.55
  (Earthquake, Psychic, Surf, Attract, Brick Break, Sludge Bomb, Crunch, Body Slam, Flamethrower, Bite, Mega Kick both
  sides; Aerial Ace / Shadow Ball p; Rock Slide / Quick Attack / Double-Edge o). NEEDS-ORDER 5.8 (move 164 is listed as
  ownership-changing in the order tracker; order-neutral -> Giga Drain, Mud-Slap, Ice Beam, Thunderbolt, Megahorn 0 px),
  NEEDS-ART-LOOKUP 3.9 (direct species-art reads), Swagger / stat-down moves blocked by source. Supervisor:
  `prep38Run.sh` into fresh dirs — 743 receipt records identical on residual / digests / rows (committed copies trim
  per-row detail only).

## 2026-10-07 (day) — S10A finish run: D4 implemented; census complete 250 + 13 + 13 + 0 = 276

- Folded Opus worker `422f43834` (fast-forward; src tree `57de0763`): D4 accounting + policy.
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
- Folded Opus worker `40080ca0a` as `60fa7d894` (src tree `5ae017dd`): FAITHFUL-TIMING Megahorn (224; prep24 model
  + assembler, `liveMegahornInputs.ts`; late restorebg fade 9 of 10 -> 177 rows, monbg BGnCNT row 8 7 of 10 after a
  4-window tie-break; activation registers = the S0 first-body block, exact after a Tackle because the renderer reads
  only registers the body writes), Revenge (279; prep26 model, `liveRevengeInputs.ts`; BGnCNT row 5, 5 of 6 — pixels
  identical in both phases, kept in the timing bucket conservatively), Meteor Mash (309; explicit restore lag
  `restoreLagRows`, policy L = 1 (5 of 7) -> 215 rows; D3 words from the presentation host, counted once with
  d3: true; renderer generalised from METANG/ONIX to live battler art; declines shiny / displayed status). Routes
  5/35 RHYDON, 75/14 QWILFISH, 15/21 METAGROSS (two seeds) with ON/OFF parity. Worker gates 1,550 files / 12,696
  tests, build 865, differential 389. Supervisor: `d4aTimingCheck.ts` on all 21 windows x2 fresh — 0 violations
  (policy-phase windows 0 px; Megahorn early-fade accepted O only ages 158..173, Meteor Mash no-lag windows only
  196..211); union typecheck, smoke 448, 19 targeted files 779/779, own differential vs `f53a241f9` 389/389.
  Counts: 246 + 12 + 4 faithful-timing, 14 remaining.
- Final: production src tree `e1a47502` (`e3a68d289`, Substitute shiny gate); supervisor final gates typecheck, 1,562
  files / 12,816 tests, build 872, differential 624/624 (`final-supervisor-gates-20261007-evening.json`). Preview
  refreshed: `f3ccf44ed` served at :5191 (250 + 13 + 13), 4 samples hash-equal, mode control + session export passed,
  no browser errors (`playable-preview-2a3f8398c-receipt.json`; live status `verifiedPreview`).
- Species audit 12 (side, `0ec130a37`, new files only): Substitute / Skill Swap / Flatter / Eruption, 182 rows x2 fresh:
  144 0 px, 12 TIMING-PHASE (Skill Swap ages 177..192), declines confirmed; defects: Substitute had no shiny gate
  (shiny STEELIX 12-14k px on ages 0..10) — FIXED by the supervisor in `e3a68d289` (shared gate + test that fails
  without it); NIDORAN F / M healthbox gender symbol in every live view (open, ISSUES #152); Flatter elevated and
  Skill Swap idle-rest gates over-strict (coverage). Newly proven: Substitute ONIX / RATTATA attackers 0 px.
- Preview refreshed: `f34415c84` served at :5191 (250 + 13 + 13), 4 samples hash-equal (renderer / canvas / PNG),
  mode control + session export passed, no browser errors (`playable-preview-dc21cd1db-receipt.json`); live status
  `verifiedPreview` updated.
- Folded Opus worker `6421f1bae` as `4508d6a3b` (src tree `7d28da92`): EXACT Substitute body (164; 87 rows; renderer
  branch generalised under liveField with live battler art, doll at the attacker corner + the body's own x2; staged
  GOLEM/ONIX digests byte-identical; the first frame after the body shows the doll; route 11/35 JYNX live every age,
  ON/OFF parity). 6 windows (accepted P/O, PERSIAN<->SLOWBRO both sides, Scene OFF ROM body, elevated GOLBAT) 0 px.
  Status animations (swaps / fade) stay on fallback; Scene OFF never plays the body (ISSUES #153). Worker gates 1,562
  files / 12,815 tests, build, differential 624. Supervisor: 6 windows x2 fresh 0 px; final independent gates on `4508d6a3b` (src `7d28da92`): typecheck,
  1,562 files / 12,815 tests, build 872, differential 624/624 (`final-supervisor-gates-20261007-evening.json`).
  CENSUS COMPLETE: 250 scoped-exact + 13 faithful-random + 13 faithful-timing + 0 remaining = 276.
- Folded Opus worker `719d01fa3` as `77fbd6139` (src tree `807fb60b`): Dive setup length from the attacker's ball rule
  (`picOffsetPoint.y` on the displayed field; callers without a field keep 117 / 114), droplet Random2 draw age keyed to
  the splash birth via a `LiveMoveRandom2PlanContext` passed from `core.ts` (words still only from the presentation
  host), row-68 rule at firstInactive - 49; the seed-111 route's CLAMPERL setup is now 119 rows (audit-measured).
  Extreme Speed reclassification (new lag case) deferred. Worker gates 1,561 files / 12,812 tests, build, differential
  624. Supervisor: 4 audit-11 rows (CLOYSTER, GOLBAT, WAILORD, CLAMPERL) + all 9 s10a-live Dive windows x2 fresh —
  0 px, the two documented no-event windows exactly 284 px on row 68.
- Folded Opus worker `7e47ffd3c` as `74131ae54` (src tree `9df94a55`): Substitute parts 1-2 (body adapter not reached).
  Presentation-only `substituteDoll` field flag read from STATUS2_SUBSTITUTE at reducer boundaries (gameplay never
  written); field art draws the source doll at (40,65) / (144,24), no elevation, opponent shadow hidden; set after a
  completed Substitute body, cleared at the "substitute faded" message, faint, switch-out and ordinary switch-in
  (Baton Pass keeps it). Every live adapter now DECLINES while the attacker's or defender's doll is shown (they drew the
  defender from species art). Explosion route test moved from 17/35 (opponent subs first, now declines) to 35/35.
  Boundary ratchet widened narrowly: `battleCommandFieldArt.ts` may import the static doll asset `substitute.json`
  (supervisor-accepted, presentation-only). Found ISSUES #153 (Scene OFF skips the body). Worker gates 1,561 files /
  12,811 tests, build, differential 624. Supervisor: prep37 probes fresh + `substDollFieldCheck.ts` twice — doll band
  0 px on 1993 / 4399 / 2207 (Scene OFF) / 6898 rows, r1 == r2; union typecheck, smoke, 7 targeted files 42/42, own differential vs `6d78853b2` 624/624.
  Counts unchanged: 249 + 13 + 13,
  1 remaining (Substitute body).
- Species audit 11 (side, `d04b81d0d`, new files only): Dive / Extreme Speed / Ice Ball / Memento, 176 rows x2 fresh:
  139 0 px, 16 declines confirmed by gate lifts, DEFECT: Dive setup length hard-coded (most attacker species ~23-27k
  px; patch proof 0 px — reproduced by the supervisor), new lag cases (Extreme Speed 320/321; Dive CLAMPERL), TYRANITAR
  rows unresolved. ISSUES #152. Skill Swap / Flatter not audited (not on master when it started).
- Folded Opus worker `bfb575422` as `23cfd2faa` (src tree `452c09b4`): FAITHFUL-TIMING Skill Swap (285; prep35 model;
  lag at 176, 4 of 6 -> 196 rows; display-neutral restore row 175; 6 windows; route 8/7 VENOMOTH), FAITHFUL-RANDOM
  Flatter (260; 114 words from the presentation host; prep35 OAM provider; live-view healthbox fade generalised from
  Encore — the ROM darkens the healthboxes with the sprite blend; declines elevated opponents (row-0 shadow unmeasured);
  6 windows incl. two extra pinned activation values; route 51/0 NIDORINA, two seeds, ON/OFF parity), EXACT Eruption
  (284; prep36 profile; 9 windows 4,374 rows 0 px; route 88/14 CAMERUPT). Worker gates 1,559 files / 12,799 tests,
  build, differential 389. Supervisor: all 21 windows x2 fresh (Skill Swap no-lag windows only ages 177..192; others
  0 px; Eruption 9/9 0 px); union typecheck, smoke, 9 targeted files 181/181, own differential vs `5f0bbdd73`
  389/389. Counts: 249 scoped-exact + 13 faithful-random + 13 faithful-timing, 1 remaining
  (Substitute).
- prep37 (side, `355ebbef4`, new files only): Substitute (164) scoped — body 87 rows 0 px with production-derived inputs
  (accepted pair, unchanged renderer; other species need the liveField art patch, 0 px PERSIAN<->SLOWBRO); the doll
  shown on every non-animation frame is source-exact (1993 / 4399 / 2207 Scene OFF / 6898 elevated doll pixels);
  SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE 42/40 rows, SUBSTITUTE_FADE 103/101; FINDING: every live adapter draws a
  subbed defender from species art (wrong while the doll is shown) — production has no doll state; plan = a
  presentation-only "doll shown" field flag + shared declines + the body adapter. Supervisor: `prep37Run.sh` into
  fresh dirs — 9/9 receipts byte-identical.
- Folded Opus worker `5a8007b2c` as `e252f681b` (src tree `51b5f3b6`): audit-10 fixes (Extrasensory clone carries the
  attacker idle rest: RATTATA 8,009 -> 0 px; Spit Up gate narrowed to targets: ONIX / RATTATA attackers 0 px; checker:
  a window missing its phase label now FAILS — 146 windows rerun, 0 violations). EXACT Extreme Speed (245; age offset
  43, attacker pic y-offset from the art view, hit-splat anchor = target sprite centre; 5 windows incl. elevated
  GOLBAT; route 182/21 ARCANINE) and Memento (262; first body only; `liveMementoReducerConfig` from the field;
  FIRST_BODY_SCANLINE; the shared #142 hook now skips the row-0 shadow of an opponent at HP 0, as the ROM does; route
  259/28 WEEZING faints -> forced replacement -> next prompt). Staged digests identical. Worker gates 1,558 files /
  12,782 tests, build, differential 389; timing regression 156 windows 0 violations. Supervisor: 10 new windows + the
  two audit-10 fixed rows x2 fresh 0 px; union typecheck, smoke, 9 targeted files 178/178, own differential vs
  `2067d8bbd` 389/389. Counts: 248 + 12 + 12, 4 remaining.
- prep36 (side, `d076f71d2`, new files only): Eruption (284) READY-WITH-CHANGE as scoped exact — source-derived profile
  (launch / falling rock / shake, sort keys, palettes) exact on every row of 10 windows; pixels 1,946/1,946 accepted +
  prep29 rows 0 px, 4,850/4,874 overall (row 0 shadow x2; ONIX idle-rest attacker -> decline); no Random2, no CPU-phase
  field. Supervisor: `prep36Run.sh` into fresh dirs — 8/8 receipts byte-identical.
- Folded Opus worker `4c8d01139` as `876b8ad5a` (src tree `797960f7`): checker fix (other-phase windows without
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
  smoke, 12 targeted files 217/217, own differential vs `af095fe14` 624/624 (3 traces). Counts: 246 scoped-exact + 12 faithful-random + 12 faithful-timing, 6 remaining.
- Species audit 10 (side, `39ace69fb`, new files only): Shock Wave, Superpower, Psywave, Extrasensory, Nightmare, Spit
  Up — 208 rows x2 fresh: 14 TIMING-PHASE (documented rows only), 30 declines confirmed by gate lifts, 1 SPECIES-DEFECT
  (Extrasensory clone ignores the attacker's idle rest; patch proof RATTATA 8,009 -> 0 px, reproduced by the
  supervisor), Spit Up attacker gate too strict, 6 UNRESOLVED Extrasensory rows (likely scanline split). ISSUES #152.
- prep35 (side, `f387aa8bd`, new files only): Skill Swap (285) READY as faithful timing — full hardware OAM rows 1..end,
  32 matrices, 64-slot order, palette program (psychic BG rotation, two white blends) exact in 6 windows; pixels
  1172/1174 rows 0 px at the measured phase (row 0 enemy shadow of two elevated windows); lag at row 176 (4 of 6) +
  a display-neutral restore row. Flatter (260) READY as faithful random — spotlight, VerticalDip dips, 38 confetti in
  sort order, burst latch; hardware OAM exact rows 1..218 in 4/4 windows; 876/876 rows 0 px. Supervisor:
  `prep35Run.sh` into fresh dirs — probes r1 == r2, 11/11 receipts byte-identical.
- Folded Opus worker `dd183a0db` as `c0e81263f` (src tree `0fa8e76b`): FAITHFUL-TIMING Nightmare (171; prep32 model
  port; lag at 149 policy; second display-neutral parameter palette-transfer-row 4:4 tie -> 148 by the tie rule; GOLBAT
  row-0 shadow via the live #142 hook; routes 30/28 HYPNO (Hypnosis first), 166/14 HAUNTER). EXACT Shock Wave (351;
  prep33 builder; derived timing behind an opt-in `derivedTiming` flag used only by the live builder — staged digests
  and `shockWaveActualCore` 530/530 unchanged; routes 7/7 CASTFORM, 27/0, 122/7). Worker gates 1,553 files / 12,737
  tests, build, differential 389. Supervisor: 14 windows x2 fresh via `d4aTimingCheck.ts`, 0 violations (Nightmare
  no-lag windows only ages 150..165; Shock Wave 6/6 0 px); union typecheck, smoke, 19 targeted files 810/810, own
  differential vs `1f1f3f990` 389/389. Checker gap found by the worker (other-phase window without documented rows
  was unchecked) — fix queued in the next step; supervisor reruns all printed per-window px, unaffected.
  Counts: 248 + 12 + 8 faithful-timing, 8 remaining.
- prep34 (side, `899a2d952`, new files only): Extreme Speed (245) X-AGE closed — reducer age 43 at activation in all 4
  windows (ARCANINE->DUGTRIO, new SMEARGLE->GOLEM, both sides), body 321 rows, 8,916/8,916 visible field-rows,
  accepted pair 321/321 rows 0 px; the only missing input is the attacker pic y-offset hard-coded for ARCANINE.
  Memento (262) D-SCAN closed — first-body activation scanline == production FIRST_BODY_SCANLINE (up to a pixel-
  neutral buffer swap); 8,531/8,532 field-rows; accepted pair 0 px with production-derived inputs; later bodies differ
  -> first-body gate. Supervisor: `prep34Run.sh` into fresh dirs — probes r1 == r2 (20 scenarios), 21/21 receipts
  byte-identical.
- Integration step D4d (Ice Ball + Dive) STOPPED at a measured blocker, evidence merged (`8211781cc`, no src change):
  Ice Ball counters 1..4 and the Dive attack body start from the previous body's end-of-body sprite order, which
  depends on that body's Random2 words (shard / droplet y-sort before death), so no constant lend exists and the order
  tracker lives on the logical side without the words. Words-free lend: Ice Ball counter-0 bodies 0 px, later bodies
  482 px (rows 38-42); Dive attack 116 / 61 px (rows 17-22). Design checked: a deferred lend resolved in the render
  seam (replay the earlier body from its true start order, then the tracker plans) gives the ROM start order on 12/12
  Ice Ball transitions (`docs/s10a-random2-order-lend-blocker.md`). Supervisor: fresh `prep26Probes.sh iceball`, both
  blocker receipts byte-identical. Decision: ship Ice Ball counter 0 and the Dive setup turn first; the deferred lend
  is remaining work (est. 60-90 min infrastructure + 45-60 min per move).
- prep33 (side, `1aa59ac7b`, new files only): Shock Wave (351) READY-WITH-CHANGE as scoped exact — the reducer's
  side-keyed timing table is wrong for 3 of 4 alternates; derived rule (attacker pic-offset y, target battle y, lightning
  count N: ShakeMon = lightning + 2N + 30, clear + 67, end + 4) matches 6/6 windows; every renderer-read field exact on
  1591 rows; pixels 1590/1592 (row 0 enemy shadow of two elevated opponents). No CPU-phase field. Skill Swap (285)
  partial: tasks / 24 orbs / blend registers exact on 1173 rows; body 194/195 = lag at row 176 (T, 4 of 6); no
  outcome input needed (animation only on the success path); still needs the OAM order, orb matrices and palette
  program. Supervisor: `prep33Run.sh` into fresh dirs — probes r1 == r2, 9/9 receipts byte-identical.
- Folded Opus worker `f6e9b7dd1` as `1795d405a` (src tree `58b592bc`): audit-9 fixes (Mach Punch attacker idle rest
  in `machPunch.ts`; Mach Punch declines idle-rest targets; Revenge gate narrowed to targets; Meteor Mash FLYGON =
  fixture Random2 offset, no production change). EXACT Spit Up (255; `liveSpitUpInputs.ts`, counters 1-3 =
  request.turn, 12 windows 1300/1300 rows 0 px; route 33/7 SWALOT). FAITHFUL-TIMING Superpower (276;
  `liveSuperpowerInputs.ts`; per-side monbg write row player 10 / opponent 11; all 6 windows 0 px in both phases;
  gate = known order; Superpower branch now paints the armed #142 shadow after its scrolled BG3; route 179/42
  NIDOQUEEN). Eruption not attempted (needs dense falling-rock / shake / palette profiles; prep29 R2). Worker gates
  1,552 files / 12,725 tests, build, differential 389. Supervisor: Spit Up 4 windows (counters 1/3/2/3, accepted +
  alternates) and Superpower 6 windows x2 fresh 0 px; the audit-9 ONIX / RATTATA Mach Punch and ONIX Revenge rows 0 px
  on production, accepted Mach Punch / Revenge unchanged; union typecheck, smoke, 18 targeted files 1712/1712, own
  differential vs `ee73842de` 389/389. Counts: 247 + 12 + 7 faithful-timing, 10 remaining.
- prep32 (side, `d6e7a9639`, new files only): Nightmare (171) READY as faithful timing — per-age caller inputs
  (palettes, registers, battler sprites, SortSprites order, clone / tasks) exact on 22,921 / 22,925 field-rows in 8
  windows (misses = state-only restore row T); pixels 1348/1349 rows 0 px at the measured phase (GENGAR->GOLBAT row 0
  = opponent shadow, renderer); order after Hypnosis + SLP: occupied part == known entry. Flatter (260): 114 words
  derived from the activation Random2 value, registers / palettes / 38 confetti exact in 4 windows, birth split T is
  display-neutral (0 px all alternatives); NEEDS the hardware OAM / matrix provider. Supervisor: `prep32Run.sh` into
  fresh dirs — probes r1 == r2, 20/20 receipts byte-identical.
- Folded Opus worker `43e980f84` as `a0e76b90e` (src tree `efec2d66`): FAITHFUL-TIMING Psywave (149; prep30 model,
  `livePsywaveInputs.ts`; late lag at 185, 4 of 6 -> 205 rows; elevated-opponent row-0 shadow via the live #142 row
  0 hook) and Extrasensory (326; `liveExtrasensoryInputs.ts`; reducer `targetYElevation` input, defaults unchanged;
  first animation unit of the battle only — activation scanline buffers are intro residue; no lag at 142 (4 of 6)
  -> 161 rows; scanline split S = 0 with per-window documented residuals: GOLEM P 1,433 px / 22 rows, CROBAT P
  lag + split 85 rows). Routes 84/7 CHIMECHO, 9/35 EXPLOUD (42/7 STANTLER declines: Intimidate runs first). Worker
  gates 1,550 files / 12,708 tests, build 867, differential 389. Supervisor: all 12 windows x2 fresh, 0 violations;
  union typecheck, smoke, 16 targeted files 947/947, own differential vs `99c820778` 389/389.
  Counts: 246 + 12 + 6 faithful-timing, 12 remaining.
- Species audit 9 (side, `443f3f602`, new files only): Megahorn / Revenge / Mach Punch / Meteor Mash, 154 swap rows
  x2 fresh: 99 rows 0 px, 30 TIMING-PHASE (residual only on the documented rows; with swapped species the fade rows
  reach 19,175 px/row, above the documented per-fixture maximum — the check gates on ages, not px), no new lag class.
  Defect: Mach Punch opponent attacker with an idle rest (ISSUES #152; patch proof 86,089 -> 0 px). Revenge's
  idle-rest gate too broad for attackers; Meteor Mash player-side FLYGON target unresolved. Supervisor reran the patch
  proof (3 rows 0 px, identical) and the unpatched ONIX row (86,089 px x2).
- prep31 (side, `6bbd1aa56`, new files only): source-derived Superpower (276) and Spit Up (255, Stockpile counters
  1-3 = request.turn) providers. Superpower: every field exact in 6 windows (accepted P/O, MACHAMP->GOLEM,
  MACHAMP->WEEZING elevated, WEEZING->SNORLAX), OAM order derived by SortSprites; pixels 1487/1488 rows — the one
  row is the T bit monbg BGnCNT row (player {10: 2, 11: 1}, opponent {11: 3}). Spit Up: 12/12 windows field- and
  pixel-exact (1300 rows, 0 px); the 8-orb burst overrun at row 59 (+67 for counter 3) is constant (M), not T.
  Supervisor: `prep31Run.sh` into fresh dirs — probes r1 == r2, 17/17 receipts byte-identical.
- prep30 (side, `8435f4771`, new files only, merged `f77936450`): source-derived Extrasensory (326) and Psywave
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

- prep22 (side, `947d5073c`, new files only, merged `0bf2e9667`): Fire Punch is a 101-row body identical across
  burn / no-burn / faint outcomes (flames = separate Status_Burn body 152-155 frames later; status animations are
  not drawn in production today); body-only through the accepted renderer 101/101 rows 0 px both orientations with a
  neutral profile, reducer age 27 at activation. Random2 re-probe: Signal Beam, Sheer Cold, Spikes, Octazooka, Skill
  Swap, Shock Wave draw none (stale C); Lovely Kiss draws 4 words at age +120 (plan replay == accepted words). Spikes /
  Octazooka / Lovely Kiss / Signal Beam / Sheer Cold reducers equal the ROM per-age sprite state from
  production-derivable inputs; Skill Swap / Shock Wave need a graphics-host provider. Supervisor: `prep22Run.sh` into
  fresh dirs — Fire Punch 101/101 0 px, plans / palette / lowest-free / 7 per-move receipts byte-identical.
- Folded Opus worker `3ee1d3f17` (src tree `89c9294d`) as `90df06bce`: production hardware-OAM provider
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
- prep23 (side, `1a2635092`, new files only, merged `941896e06`): source-derived Curse models
  (`tools/integration/prep23Curse*.ts`) replace every corpus input of the existing renderer. Stats (non-Ghost)
  branch exact on every field in 5 windows (accepted P/O, MILTANK->GOLEM P/O, ONIX->PIDGEOT), renderer 879/880 rows
  (ONIX row 142: the falling-lines mask gate `data[11] < 4` ends 3 rows early). Ghost branch exact except R1 (BG2
  scroll one row early, 2/4 windows) and P1 (row-26 palette-transfer phase: 15 / 135 px on alternates). Variant =
  Ghost iff the attacker is Ghost type. Supervisor: `prep23Run.sh` with fresh probes (r1 == r2) — all four receipts
  byte-identical.
- Species audit 5 (side, `e869dfd48`, merged `5a0c1a1c3`): oam1 adapters vs STEELIX / TYRANITAR / PICHU / WAILORD /
  FLYGON / SHEDINJA swaps (both sides, attacker and target): no species defects. Player-side TYRANITAR attacker
  Pursuit 86/102 = LAG FRAME (the ROM lacks the usual age-82 lag; body 102 vs 103; counter evidence) — the live
  Pursuit timeline assumes that lag. Declines confirmed: RATTATA/ONIX target (correct), RATTATA/ONIX opponent
  attacker (over-conservative: 6/6 exact with the gate lifted — coverage opportunity), shiny (correct; the verifier
  ignores target personality without a harness patch). Supervisor reran 8 rows twice fresh: 7 exact, the TYRANITAR
  lag row reproduces (284,768 px).
- Folded Sonnet worker `8b9b062a7` (src unchanged since `9b3993282`) as the r2-gates merge: EXACT Fire Punch body
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
- prep24 (side, `a42e99e38`, new files only): source-derived Megahorn and Return (strongest branch, the only one
  the Factory reaches) input models. Return: OAM 35,968/35,968 entries, matrices, registers, battleBg, palettes,
  tasks, target x2 exact in 6 windows (accepted P/O, SNORLAX->GOLEM, SNORLAX->PIDGEOT elevated); pixels 1691/1692
  (row 0 of the elevated-target player window: the Return renderer draws the age-0 enemy shadow only for an opponent
  attacker). Megahorn: every non-OAM field exact in 6 windows (incl. HERACROSS->ONIX) GIVEN two VBlank frame-phase
  bits — monbg BGnCNT write row 7/8 and the restorebg fade ending early/late — which vary across windows
  ((8,late) accP, (8,early) accO, (7,late) altP/altO/onP, (8,late) onO) and are not derivable (flipping costs 16
  rows x 17.5k px). Supervisor: `prep24Run.sh` with fresh probes — all 12 receipts byte-identical.
- Folded Opus worker `f4f03fb98` (src unchanged since `72f31ef75`): EXACT Curse (174) non-Ghost body — source model
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
- prep25 (side, `0071d3f4b`, new files only): 14-move triage. No Random2 in 11 (stale C); Dive (setup 20 words,
  attack 56) READY-WITH-CHANGE (dive.ts anchor split measured 8/8); Ice Ball (2 words per shard) and Flatter (114
  words) draw Random2. READY-WITH-CHANGE builders: Snore, Sky Attack, Hyper Voice, Sand Tomb, Smog (constant
  lengths), Mach Punch, Nightmare (+-1 row). Hardware-OAM batch: Extrasensory, Ice Ball, Flatter, Psywave, Revenge,
  Superpower. Mach Punch / Extrasensory / Nightmare / Psywave body length varies +-1 row across scenarios from one
  optional late lag frame (`fixtures/prep25/lag-frames.json`). Supervisor: `prep25Run.sh` (112 probe pairs, 0
  differing) — 23 receipts byte-identical.
- lb26 (side, `14c1236af`, new files only): later bodies after Tackle / Splash / Psychic / Growl+unit / Swords
  Dance+unit / Surf, both sides. Curse 12/12 0 px on UNPATCHED production (the any-known-lend gate stands); Will-O-Wisp
  12/12 0 px with firstBody bypassed (widen next); Pursuit 8/12 — four later bodies one frame short from age 84 (the
  fade-back starts one frame early: lag-schedule class, not determined by side or predecessor) -> keep firstBody.
  Supervisor: probes + fixtures regenerated byte-identical, dense p1/p2 rerun — both receipts byte-identical
  (`lb26Run.sh` stops early under set -e; remaining steps run by hand).
- Folded Sonnet worker `c6e48b443` (production unchanged since `409cdd83f`): shared profile builder
  `src/engine/liveProfileMoves.ts` (slots lowest-free, subpriority, attr2, palette snapshots from production
  sources) — FAITHFUL-RANDOM Lovely Kiss (142; plan row 4 words at age +120) -> 11; EXACT Spikes (191), Octazooka
  (190) (known lend) and Signal Beam (324; first body) -> 234; live opponent idle rest in the three profile
  renderers (staged outputs unchanged). 32 dense fixtures x 2 fresh 0 px (accepted, prep22 alternates, GOLBAT and
  SNORLAX targets, both orientations); Lovely Kiss 4 ROM-probed + 4 range-covering pinned values; routes 11/21,
  11/35 (surrogate), 17/21, 75/7, 116/7, 239/7, 8/14, 10/0 active every age, ON/OFF parity. Worker gates 1,541 files
  / 12,574 tests, build; shadow scan 513 / 0. Supervisor: dense rerun 6 fixtures 0 px r1 == r2; differential
  389/389; union typecheck, smoke, 11 files 223/223. Receipt `r3-profile-live-receipt.json`.
- Preview refreshed: `9fbff796d` served at :5191 (234 + 11), 4 samples hash-equal, mode control + session export
  passed, no browser errors (`playable-preview-a1d8036bf-receipt.json`).
- prep26 (side, `56a406eaf`, new files only): source-derived Ice Ball (all 5 counter bodies; 18 windows, 1,535 rows;
  OAM 194,176/194,176) and Revenge (4 windows, 580 rows) models — every field and every pixel row exact GIVEN
  frame-phase inputs that are not derivable: Ice Ball lag rows (accepted player body 4 row 38, accepted bodies 5 row
  112; none in the alternates), Revenge `bg*cnt` write row 4 (accepted opponent) vs 5. Superpower not reached.
  Supervisor: `prep26Run.sh` with fresh probes — 12 receipts byte-identical.
- Folded Sonnet worker `eedbc9fae` (tested `d48e786cd`, src tree `7584e7a5`): EXACT Return (216, strongest branch;
  hardware-OAM provider port of prep24; known lend + first body, non-shiny) -> 235; RETURN renderer draws the age-0
  enemy shadow for an elevated opponent target (prep24 windows 1692/1692; staged unchanged); Will-O-Wisp widened to
  later bodies (lb26 12/12); attacker-side idle-rest gate lifted for Will-O-Wisp (first body) / Pursuit / Fury
  Cutter (RATTATA / ONIX attackers 12/12). 50 dense fixtures x 2 fresh 0 px; routes 24/14 PIDGEOT, 51/28 EXEGGUTOR
  (29/42 GYARADOS inactive, undiagnosed). Worker gates 1,542 files / 12,579 tests, build; shadow scan 515 / 0.
  Supervisor: dense rerun 5 fixtures + 3 gate-lift rows 0 px r1 == r2; differential 389/389; union typecheck,
  smoke, 9 files 190/190. Receipt `return-live-adapter-receipt.json`.
- Species audit 6 (side, `257c16626`, new files only): 140 swapped rows x 2 fresh over Fire Punch, Curse, Psych Up
  opponent, Signal Beam, Lovely Kiss, Spikes, Octazooka (STEELIX / TYRANITAR / WAILORD / PICHU / FLYGON / GOLBAT /
  SHEDINJA / RATTATA): 122 exact. Defects -> ISSUES #150: Signal Beam keeps the RATTATA idle x2 under its shake
  tasks (41,134 / 54,510 px -> 0 with a patch); Fire Punch lacks the shiny decline; the verifier names battlers by
  species constant (MR_MIME -> "MRMIME": the r2 537 px/row is this artifact, 0 px with a harness patch). Curse's
  target-side idle decline is over-conservative. Supervisor reran 4 rows + both patch proofs.
- Folded Sonnet worker `d3bf0d7bf` (src last changed `55457aecb`, tree `f16cabf6`): `src/engine/liveQ2Moves.ts`
  builders — EXACT Hyper Voice (304), Smog (123; exact after a Tackle too), Sand Tomb (328) on a known lend and the
  Sky Attack charge body (143; first body; the strike declines: no order plan after the charge) -> 239. Snore not
  wired (all measured bodies follow Sleep Powder, which has no order plan). 29 dense fixtures x 2 fresh 0 px; routes
  75/21, 141/21, 29/0, 70/0, 345/21, 543/21, 244/42, 376/42. Worker gates 1,543 files / 12,606 tests, build; shadow
  scan 523 / 0. Supervisor: dense rerun 5 fixtures 0 px r1 == r2; differential 389/389; union typecheck, smoke,
  8 files 196/196. Receipt `q2-live-adapter-receipt.json`.
- prep27 (side, `99cee343a`, new files only): Baton Pass body 53 rows constant, attacker hidden from age 9;
  `batonPassAtAge` exact from production anchors (component 53/53 x 4 pairs; framebuffer 53/53 AIPOM<->ONIX); ROM flow
  opponent: removal E+9, message E+14, ball E+51, species-keyed healthbox tail; player: party screen, removal A+76,
  old healthbox shown A+48..A+75 (production misses those 28 frames; otherwise within +2..+5 frames); production has no
  opponent-attacker flow. Endeavor: source-relative prototype exact 68/68 rows on 4 fresh pairs; W3 (battle-TV)
  predicate written from battle_tv.c and reachable on generated routes (decline until ported). Supervisor:
  `prep27Run.sh` with fresh R1/R2 dirs — probes (RGB incl.) R1 == R2, receipts identical.
- Folded Sonnet worker `1681180f9` (src tree `acf610da`): ISSUES #150 fixed and removed — Signal Beam shake tasks own
  x2 (`shakeOwnsX2`; RATTATA attacker / target rows 41,134 / 54,510 px -> 0), Fire Punch shiny decline, verifier
  display names (MR_MIME 537 px/row -> 0); Curse target-side idle decline lifted (RATTATA / ONIX 176/176); EXACT Sheer
  Cold (329; first body; 191 / 190 rows constant per side; accepted, CLOYSTER->GOLEM, DEWGONG->SNORLAX both
  orientations; route 267/35) -> 240. Open: no #142 shadow row for Sheer Cold (elevated opponents unmeasured). 45
  fixtures 0 px twice fresh; worker gates 1,544 files / 12,618 tests, build. Supervisor: reran 7 #150 / Curse rows +
  2 Sheer Cold fixtures 0 px r1 == r2; differential 389/389; union typecheck, smoke, 10 files 218/218. Receipt
  `fix150-live-receipt.json`.
- prep28 (side, `d3df9f878`, new files only): 94 (move, side) cells lack production order plans (~16.3% of weighted
  uses; ranked in `fixtures/prep28/ranked-gaps.json`); 14 new EXACT-PLAN rows (Sleep Powder both sides, Thunderbolt
  opponent, 95, 78 opponent, 352, 337, 309, 348) via synthetic dense-rank words for y ties; Sky Attack charge / strike
  plans differ (host must key the strike by request.turn). With the rows: corpus replay known edges 1210 -> 1285 (0
  mismatches), Snore after Sleep Powder known, route scans 140 -> 149 of 317 later bodies; the named declined routes
  stay declined on other causes (Sand-Attack 28:opponent, TURN_TRAP / Flatter, Confusion status). Rows not yet in
  production. Supervisor: `prep28Run.sh` with a fresh OUT — 0 differing probe pairs, replays reproduced, receipts
  unchanged.
- Species audit 7 (side, `cfbc8abe3`, new files only): Return 57/57 non-shiny rows exact; residuals filed as ISSUES
  #151 (Sheer Cold elevated-target age-0 shadow; Sheer Cold tail ages 173-189 with TYRANITAR / PICHU / FLYGON /
  GOLBAT; RATTATA / ONIX idle-x2 rows in Sheer Cold / Sand Tomb / Sky Attack; Hyper Voice one row at age 59).
  Supervisor reran 5 rows (4 residuals reproduce). D4 filed in DEFERRED.md (CPU-load timing class).
- Folded Opus worker `15a42c7f3`: EXACT Baton Pass body (226; 53 rows; renderer pair gate generalised; attacker hidden
  after the body through its switch-out) and Endeavor (283; 68 rows; source-relative inputs; stale power from the
  register; W3 battle-TV case declined by a conservative presentation-only flag carried across battles) -> 242.
  15 dense windows x 2 fresh 0 px; routes Baton 71/0, 2/7, Endeavor 58/0, 38/7, 52/0, 61/0 with ON/OFF parity.
  Open: opponent Baton Pass removal ~25 frames late, message / ball timing unmodelled (no route reaches it);
  player outgoing healthbox A+48..A+75 not drawn. Worker gates 1,546 files / 12,647 tests, build. Supervisor: dense
  rerun 5 windows 0 px r1 == r2; compare:endeavor-portable 141/141; differential 389/389; union typecheck, smoke,
  9 files 194/194. Receipt `baton-endeavor-live-receipt.json`.
- #151 diagnosis (side, `15a04d578`, new files only): the Sheer Cold tail (ages 172-189) is a LAG FRAME — the
  residual rows are exactly those whose age-171 lag differs from their orientation's accepted pair (counter
  evidence on 31 rows; shift test 0 px; the field BG is one fade step off); no species property predicts it. The
  Hyper Voice age-59 row is a scanline-phase palette upload (band depth 16 / 15 / 0 by pair; 0 lag frames). Both are
  the CPU-timing class (DEFERRED D4). Supervisor reran both env-override patch proofs (0 px, reverted).
- Folded Opus worker `004eaea62` (src tree `e7259f42`): ISSUES #151 idle-x2 class fixed — Sheer Cold
  (`config.idleRest`: no task writes x2 and `Task_UpdateMonBg` copies at x + x2), Sand Tomb (attacker rest), Sky Attack
  charge (`AnimTask_ShakeBattlers` makes no write on its first frame and ends at x2 = 0; monbg copy at x + x2) — plus
  the Sheer Cold elevated-opponent age-0 shadow row; #151 trimmed to the D4 timing remainder. 84 dense rows x 2 fresh;
  audit-7 non-shiny rows of the three moves 57/64 exact (the 7 others = the lag tail); accepted / alternate fixtures
  unchanged; shadow scan 529 / 0. Worker gates 1,547 files / 12,657 tests, build. Supervisor: reran 6 fixed rows + 3
  regression fixtures 0 px twice fresh; differential 389/389; union typecheck, smoke, 8 files 153/153. Receipt
  `fix151-live-receipt.json`.
- Species audit 8 (side, `1f39906ba`, new files only): Baton Pass body, Endeavor, Fire Punch opponent attackers — 141
  rows x 2 fresh, 135 exact, 6 shiny (decline confirmed with the ROM personality); no species defect. Endeavor is
  exact when the stale-power register matches the ROM (40 / 0 in these fixtures; 17k-58k px at other values). The
  verifier cannot pass a target personality, so a target-side shiny decline is untested. Supervisor reran 4 rows.
- Folded Sonnet worker `a8ef9a39e` (src tree `34e54570`): 14 prep28 EXACT-PLAN rows in the production order table via
  the generator (bodies 467 -> 485, plans 187 -> 196), Sky Attack strike keyed 10143 by request.turn; EXACT Sky
  Attack strike body (180 rows, WIN0 (0,0) after the charge) and Snore (173; known lend after Sleep Powder + sleep
  status animations; no generated route has that history in seeds 0-599) -> 243. 16 new dense fixtures 0 px twice
  fresh; regression samples across six adapter families 0 px; newly known lends make the r2 Overheat route 143/28/1
  live. The worker ran out of cap before its differential and post-fix full suite. Supervisor: dense rerun 4 fixtures
  0 px r1 == r2; `prep28Replay.ts` 1,285 known / 1,285 exact / 0 mismatched; differential 624/624 byte-identical
  (three traces) vs `55c4f0079`; census regenerated `243+11+0+22=276`.
- prep29 (side, `56594bb8c`, new files only): the six untriaged moves — Bonemerang (70/70 rows x 8 bodies), Outrage
  (118/118 x 5), Rapid Spin (129/129 x 4) READY-WITH-CHANGE; Luster Purge READY-WITH-PRESENTATION-RNG (12 words, ages
  170..195; 331/331 x 4); Eruption length = 2 x wave-1 end + 277 from the attacker Y (no lag frames); Spit Up
  NEEDS-PROVIDER (request.turn = Stockpile counter). None in the D4 class. Supervisor: probes reproduced (64 pairs
  r1 == r2), analysis receipts 18/18 byte-identical.
- Wind-down: supervisor final gates on master `bc9c16f91` (src tree `34e54570`): typecheck, 1,547 files / 12,658
  tests, build 862 (`final-supervisor-gates-20261007.json`); preview `2b8d83a16` served at :5191, 4 samples
  hash-equal, mode control + session export passed, no browser errors (`playable-preview-ba696679b-receipt.json`).
  DEFERRED D4 OPEN (CPU-load timing class). Next: ROADMAP S10A "Next (2026-10-07 morning)".
- Folded Sonnet worker `0ce56d69a` (src tree `1efb1872`): `liveQ2Moves.ts` builders — EXACT Bonemerang (155; both hits,
  hit 2 behind a first-body hit 1 via a host marker), Rapid Spin (229; S0 scanline carry, mixed anchors), Outrage
  (200; first body) -> 246; FAITHFUL-RANDOM Luster Purge (295; plan rows 170 + 5k x 2; species-generic renderer art)
  -> 12. 20 dense fixtures x 2 fresh 0 px; Bonemerang route 246 both hits active; worker gates 1,548 files / 12,665
  tests, build; census `246+12+0+18=276`. Supervisor: dense rerun 4 alternates 0 px r1 == r2; differential 389/389.
- Final wind-down: supervisor final gates on master `5d67b0057` (src tree `1efb1872`): typecheck, 1,548 files / 12,665 tests, build 862
  (`final-supervisor-gates-20261007.json`); preview refreshed on this src (`playable-preview-d01f11d1e-receipt.json`, serves `d71d755b0`). DEFERRED D4 OPEN. Next: ROADMAP S10A
  "Next (2026-10-07 morning)".

## 2026-10-06 (day, wind-down) — D3 implemented: 218 -> 226 exact + 10 faithful-random live adapters

- Folded Opus worker `3a88f94b3` as `2ca5278cf`: D3 option (a) infrastructure, no adapter consumer
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
  `c1fe6ced1` 941/941. Supervisor: `compare:differential` fight-submenu +
  presentation-rng-playable-live-bodies-seeded-on 408/408 byte-identical; 5 affected test files
  42/42; smoke 448 on the union. Known approximation: overlapping bodies do not interleave draws.
- prep12 (side, `604c61580`): census regenerated at 218 live (218 + 0 + 58 = 276; 52 Random2;
  non-Random2: Baton Pass, Endeavor, Extreme Speed, Fire Punch, Memento, Substitute). Draw plans
  (`tools/integration/fixtures/prep12-random2/plans.json`) reproduce the accepted pinned words for
  Double Kick, Astonish, Thrash, Flail (5 power tiers), Wish, Meteor Mash, Mud-Slap, Sand-Attack,
  Hyper Beam; 0 body-internal lag before the last draw everywhere. Ice Beam, Water Spout, Hidden
  Power draw no Random2 (stale C label). Supervisor reran Thrash + Wish probes twice: runsSha1 equal
  to the receipts. Batch picks: R1 Double Kick/Astonish/Thrash/Flail, R2 Wish/Meteor Mash, R3 Ice
  Beam/Water Spout/Hidden Power (no RNG), R4 Mud-Slap/Sand-Attack, R5 Hyper Beam.
- Folded Opus worker `358ac85c4` (src tree `b318199d`) as `221c680fe`: first FAITHFUL-RANDOM adapters
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
- prep13 (side, `3a5b7de75`, new files only): Ice Beam (all inputs production/constant, 48/48 births,
  203/203 order rows, LAPRAS alt), Water Spout (`attackerSourceHeight` = pictureHeight; rain seed 185 /
  65 per side; tiers 0..3 births exact), Hidden Power (needs Unown letter-form coords; personality),
  Hyper Beam (orb slots = lowest-free released at birth + visible rows + 1; persistentOrder = lent
  index). Supervisor reran the Ice Beam and Water Spout checks from the receipts.
- Folded Sonnet worker `c879a29f6` (src tree `0375dc73`) as `aa424d9e9`: EXACT Ice Beam (58; anchors,
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
- prep14 (side, `aa2a17b7c`): Rain Dance (160 draws, reducer replays from one seed) and Water Pulse (12
  draws) READY-WITH-PRESENTATION-RNG; Hail READY (no RNG; target table from anchors); Overheat/Silver
  Wind need the palette composite (+ Silver Wind opponent BG registers after an earlier body); Psych Up
  needs activation BG/matrix state; Curse needs a reducer port. Supervisor reran the Rain Dance and Hail
  checks; fixed two trailing-whitespace lines at merge.
- #148 evidence (side, `1bd730418`, `docs/x2-history-148.md`): only ONIX and RATTATA (opponent front)
  have idle x2 1 (376/376 species measured; production table equal); absolute-reset target bodies zero
  it until the next send-in; per-move/role table over 188 moves; rule == ROM 788/788 first and
  1,139/1,156 later activations (misses after move-0 / mixed bodies). Supervisor reproduced the
  faint+send-in probe twice (3/3) and the tracker check from receipts.
- Preview refreshed: `aa424d9e9` served at :5191, browser replay 4 samples hash-equal, mode control +
  session export passed, no errors (`playable-preview-4abe570f9-receipt.json`).
- Ops: a worker's `pkill -f mgba` killed both shared oracles; supervisor restarted ON/OFF at 11:29 via
  `pokebench_ensure_oracle_profile` (anchor 1/1, fight-submenu 235/235 after restart).
- Folded Sonnet worker `8d9511e0a` (src tree `e5a8c9aa`) as `0ced3d484`: Rain Dance (240) and Water
  Pulse (352) FAITHFUL-RANDOM (reducers replay their own draws from the host activation state; plans
  registered so the stream consumes them once) and Hail (258) EXACT (target table from anchors; rng
  echo proven pixel-neutral) -> implementedCount 222, faithfulRandomCount 8. Rain Dance/Hail/Water Pulse
  renderer blocks yield to the live seam under liveField and apply the opponent idle rest. Dense both
  orientations + alternate (POLIWRATH, BLASTOISE, GLALIE -> GOLEM) 0 px twice fresh; 12 pinned values
  each for branch coverage; routes 2/21 BLASTOISE, 7/7 CASTFORM (non-first body), 1/0 DELIBIRD. Shadow
  scan 479 rows / 0 mismatches. Worker gates 1,530 files / 12,394 tests, build. Supervisor: dense rerun
  twice fresh 0 px (Rain Dance P/O/alt, Water Pulse O/alt, Hail alt); routeReceipt 3/3; targeted tests
  150/150; smoke 448. Receipt `random2-r4-live-receipt.json`.
- prep16 (side, `15a3de6a2`): palette composite from assets (BG 2/3/4 battle-bg, OBJ 16/17 battler
  species palettes, OBJ 23/24 move assets; shiny missing -> gate) makes Overheat 230/230 and Silver Wind
  193/196 exact for FIRST bodies (Silver Wind opponent first-body capture 196/196 with first-body
  registers; the accepted fixture is post-Tackle); BG-register history is a 20-state per-move table
  (first-body gate today); Psych Up player first body exact. Supervisor reran the Overheat pixel gate.
- Folded Opus worker `7d498cf14` (src tree `34a9b1f7`): ISSUES #148 tracker `src/engine/liveBattlerX2History.ts`
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
- prep17 (side, `a207a0d3a`): Meteor Mash's 1-row tail difference is a ROM lag frame at `restorebg`
  (`LoadDefaultBg` ~92k instructions; 4 of 5 bodies lag) — not computable from battle state, so Meteor
  Mash stays on fallback (would need a lag-timing claim like D3). Mud-Slap / Sand-Attack READY: windows
  re-anchored to activation, lowest-free dirt slots, anchor geometry, lent order identical across bodies.
- Folded Sonnet worker `f5f37266d` (src tree `be6eec82`): EXACT first-body Overheat (315), Silver Wind
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
- prep18 (side, `017d97f15`): Dig, Megahorn, Will-O-Wisp, Fury Cutter, Return, Pursuit draw NO Random2
  (stale C). Dig READY (reducer == ROM on 4 scenarios incl. elevated FLYGON; geometry 46/46). The other
  five decode a per-frame hardware-OAM buffer nothing in production builds (reducer ports needed; Fury
  Cutter also needs its counter on the request; Return only reaches the strongest branch in the Factory).
- Folded Sonnet worker `a5a68d49d` (src tree `6f596c07`) as `7af690386`: FAITHFUL-RANDOM Mud-Slap (189) and
  Sand-Attack (28) (60 words in 6 draw rows; prep17 activation windows; lowest-free dirt slots over
  computed lifetimes; anchor geometry; tracker lend; Mud needs the 4/3 slot pair) -> 10; EXACT Dig (91)
  (setup 195 / unleash 68 rows by request.turn; hidden attacker between turns; setup gated on firstBody,
  unleash on a new `afterDigSetup` lend; unleash has no opponent shadow row) -> 226. Dense 14 fixtures 0 px
  twice fresh (both orientations, ONIX->NIDORINA and FLYGON->GOLEM alternates; 10 pinned values per dirt
  move); routes 9/14 POLITOED, 3/0 PIDGEOTTO, 13/7 AZUMARILL (both Dig turns, 241 hidden gap frames).
  Shadow scan 494 / 0. Worker gates 1,534 files / 12,457 tests, build. Supervisor: dense rerun twice fresh
  0 px (Mud alt 51, Sand O 58, Dig FLYGON O setup 195 + unleash 68); differential 533/533; 6 test files
  138/138; smoke 448. Receipt `random2-r5-live-receipt.json`.
- Species audit 3 (side, `4930e6659`): 89 swapped rows over this session's 12 adapters, 84 exact; 3
  SPECIES-DEFECTs patch-proven (ISSUES #149: Ice Beam and Water Spout omit the target idle x2 before monbg —
  RATTATA 15,990 / 48,755 px; Astonish droplet origin ignores target elevation — GOLBAT 3,351 px); Hidden
  Power vs GOLBAT tail = ROM lag frame. Supervisor reproduced Ice Beam RATTATA 164/203 -> 203/203 with the
  patch. Audit 4 (`26d628c8e`): Overheat / Silver Wind / Psych Up 29/34 exact, 5 documented idle-offset
  declines, no defects.
- Folded Sonnet worker `cd0b93089` (src tree `3f95f3a8`) as `509eec81c`: ISSUES #149 fixed (Ice Beam / Water
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
- prep19 (side, `89e94a790`, `docs/bg-register-history.md`): 68-field register signature; per (move, side,
  stat args) delta table; end+30 / end+1 chain; rule == ROM at 1,408/1,497 later activations in-sample
  (72/72 later Overheat / Silver Wind / Psych Up bodies); Silver Wind pixels did not change under register
  overrides (Open #1). prep20 (side, `5119b0173`): source-derived hardware-OAM assembler prototypes for
  Will-O-Wisp, Pursuit, Fury Cutter, Megahorn — OAM rows exact vs corpora and fresh alternates, pixels 0 px
  with the prototype buffer; open input = per-row full 64-slot order; Will-O-Wisp reducer orb math drifts on
  other geometries (port the exact math); supervisor reran prep20Run.sh.
- Folded Opus worker `2a43e39f8` (src tree `c41c4949`) as `98e17cd42`: Silver Wind (both sides) and Psych Up
  (player) live on LATER bodies when the order lend is known (Silver Wind also needs the known-entry slot
  occupancy): their history-dependent registers never reach the compositor (reducers overwrite bld* /
  scroll / bgcnt first; code path + S0 / rule / absurd render test + positive control); 11 later-body
  fixtures (Tackle, Splash, Psychic, own Silver Wind, stat predecessors) 0 px twice fresh; routes 106 / 160
  later Silver Wind bodies live. Overheat keeps the first-body gate (only 1 later body per side measured).
  Worker gates 1,536 files / 12,472 tests, build. Supervisor: dense rerun 4 later-body fixtures 0 px twice
  fresh; differential 533/533; 5 test files 45/45. Receipt `later-bodies-bg-receipt.json`.
- Wind-down: supervisor final gates on `98e17cd42`: typecheck, 1,536 files / 12,472 tests, build 857
  (`final-supervisor-gates-20261006.json`); preview `a501d1a9e` verified
  (`playable-preview-10ad8606c-receipt.json`). Live: 226 scoped-exact + 10 faithful-random; 40 remain.
  Next: ROADMAP S10A "Next (2026-10-06 evening)".
- Last evidence merge (side, `23873f4e7`, new files only): Overheat (both sides, 5 predecessors each) and
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
- Production remains `d1044f128`, 218 live / 58 remaining (52 Random2).
  No surrogate implementation or adapter promotion in this docs checkpoint.
  Final production receipt remains `final-supervisor-gates-20261005-day.json`.
- Next: module + replay/export + claim accounting, then a bounded Double
  Kick/Astonish batch using the reproduced word vectors. Update stale census
  and picks; preserve all other host guards and acceptance gates. See ROADMAP
  S10A, ANIMATION_INTEGRATION_SUPERVISOR.md and ANIMATION_VERIFICATION.md.

## 2026-10-05 (day, wind-down) — 198 -> 218 live adapters; lends across faints/switches; species fixes; elevated renderer

- Folded Opus worker `e87d8861d` (code `2adc90977`, src tree `badeb050`) as `7858b6b57`:
  the production sprite-order tracker models faint, next-mon summary + send-out, forced
  switch-in, party-menu reset (open and return) + battle reshow, and the win trainer slide
  (`docs/sprite-order-uncovered-units.md` §2); the lend gate is unchanged, so no adapter
  output moved. Evidence replay through the production transform: route 84/84/0, lab
  25/25/0 (23/23 with the recall still invalidating), unit checks 36/36. Supervisor: 8
  sprite-order test files green; route comparison over 43 generated battles (master vs
  branch, `.codex-logs/verify-postko-neutral.mjs`): every body decision identical; retained
  order known after a faint 0 -> most commands. Worker gates: 1,510 files / 12,186 tests,
  build 851. Receipt `postko-tracker-receipt.json`.
- Post-KO consumer audit (`392f25046`, `docs/postko-consumer-audit.md`, new files only):
  37 consumers (16.7% of Level-50 move uses); post-KO model vs ROM 0 mismatches at 37 known
  edges (8 BattleLab scenarios, twice fresh); lending the order relabelled to entry slot
  labels (π) makes all 13 probed bodies exact (7 already generalize, 6 need π), 0 need new
  inputs. Supervisor reproduced the Thunderbolt-opponent case: probe twice byte-identical,
  π lend 237/237 zero residual, raw lend 12/237.
- Folded Opus worker `fc62b6664` (code `e229f5ec9`, src tree `b9da2cf4`) as `f39b91ff7`: post-KO
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
- Census regenerated at 198 live (`dafea7133`; 78 remaining: READY-NOW 2, SMALL-INPUT 6,
  PROVIDER 22, MULTI 48, OUT 1; Random2 = code C is the dominant blocker, 52 moves) and prep10
  measured prep (`docs/next-adapters-prep10.md`): Magnitude/Reversal/Flail power = gBattleMovePower
  (request carries the static table power today), Reversal reducer toggle bug, Pain Split
  closed formula 24/24, Fire Punch player body-only, Rock Blast / Razor Wind ready, Spark player
  conditional, Endeavor needs the persistent register. Supervisor reran the Magnitude probes:
  byte-identical, power 110 / 70.
- Folded Sonnet worker `7864a976c` (src tree `7864a976`) as `8517c42b9`: **204 live adapters**
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
- Random2 trackability (`2a475b4b7`, `docs/random2-trackability.md`): NOT TRACKABLE in play —
  the wireless-link layer draws one Random2 per main-loop pass and between-turn lag frames vary
  with identical inputs (strict chain 2/29 route bodies); words are exact from a known activation
  value. Supervisor reproduced the lab probe (102 step runs, caller lists identical). User
  decision recorded as DEFERRED D3 (surrogate presentation RNG vs fallback).
- Folded Sonnet worker `68a866c70` (src tree `da2ba8d4`): 22 abs-invariant REL-Y rows into the
  production order table (445 -> 467 bodies), all 23 source-confirmed (sprite y = battler position
  + script constants; `docs/sprite-order-absinv-source-check.md`); corpus known 1,101 -> 1,110,
  later-known 547 -> 556, lab unit checks 18 -> 22, 0 mismatches; seed 54 opponent Heal Bells
  now lent. Supervisor: 8 sprite-order test files green; generator reproduces the table
  byte-identically; Roar citation spot-checked. Caveat: Fissure plumes' absolute y follows the
  opponent elevation (relative y unchanged). Receipt `absinv-rows-receipt.json`.
- prep11 (`e94ba76b5`, `docs/next-adapters-prep11.md`): **ISSUES #144** — live Leaf Blade holds
  the target x2 = 1 at ages 0-11 for every opponent (ONIX-only in the ROM): GOLEM 11,843 px at
  the first body (supervisor reran: GOLEM 212/224 twice, ONIX 224/224). GOLEM target-swap audit
  of 58 accepted fixtures: 22 exact, Dragon Rage projectile residual, ~32 untriaged (window
  suspected). D-PAL/D-BG/E-TASK/F-AFFINE labels stale for 9 moves (constants == accepted corpora
  18/18; monbg formula 25/25); Roar/Whirlwind continuation and Baton Pass flow unresolved;
  Rollout needs the counter; Fly/Bounce need the hidden-attacker seam.
- Folded Sonnet worker `44b935179` (src tree `9c687e34`): **213 live adapters** (+Leech Seed main
  body, Tri Attack, Petal Dance, Destiny Bond, Air Cutter, Foresight, Sky Uppercut, Recycle,
  Spider Web) and the #144 fix (Leaf Blade target x2 from the species front idle; ONIX output
  byte-identical; GOLEM/STEELIX now exact; post-KO exclusion lifted, 224/224). Supervisor:
  dense rerun 7 fixtures twice fresh, zero residual (1,451 rows/run); routes 9/9 PASS. Limits:
  Sky Uppercut COMBUSKEN script ends 1 frame later (ages 170-188); Spider Web ARIADOS back
  sprite 14 px. Worker gates 1,514 files / 12,244 tests + build. Receipt
  `prep11-live-adapter-receipt.json`. ISSUES #144 deleted.
- Live-adapter species audit (`273da9fbd`, `docs/live-species-audit.md`, new files only): GOLEM,
  GOLBAT, SHUCKLE and player-side GOLEM swaps over ~250 accepted fixtures; two new live defects
  filed as **ISSUES #145** (Dragon Rage fire-spit aim from ONIX literals; Aerial Ace hard-coded
  ONIX idle x2), both proven by one-value patches (supervisor reran: Dragon Rage GOLEM 139/150 ->
  150/150, Aerial Ace 50/50). Unresolved: one-frame-later tail fades (suspected lag frame),
  GOLBAT-only small residuals.
- Folded Sonnet worker `9e8db7fee` (src tree `8ecf09bb`): #145 fixes — Dragon Rage fire-spit aim
  from attacker/target pic offsets (ROM u16 low-bit rule; accepted ONIX literal reproduced) and
  Aerial Ace settled target x from the species idle x2. Supervisor dense rerun twice fresh zero
  residual: Dragon Rage GOLBAT 150, player-GOLEM 150, accepted ONIX 150; Aerial Ace SHUCKLE 50;
  routes PASS on branch and master. Fly/Bounce dropped: the attacker must stay hidden between
  turns, which needs a timed presentation visibility write from a body (new host decision;
  `battleCommandPresentation.ts:165-172` only follows queue receipts). Receipt
  `issue145-flybounce-receipt.json`; ISSUES #145 trimmed to the unresolved audit residuals.
- Player-faint lend audit (`d1e5f385a`, `docs/playerfaint-lend-audit.md`, new files only): after a
  player faint + forced menu + reshow + forced switch-in the occupants relabel exactly to the entry
  under a ROLE map (41 known edges, 0 mismatches; 13 role-lend what-ifs exact); second opponent
  KO = first-KO geometry (today's lend already exact). Forced-menu staging recipe documented.
  Supervisor reran one scenario (identical rows, model 0 mismatches, Heal Bell 261/261).
- Folded Opus worker `0bebafc8a` (src tree `3172ec9f`): player-faint lends — tracker occupant
  roles (healthbox mains + shadow), role relabel ρ (= π at the entry / after opponent KOs), lend
  and allocator re-seed after a forced switch-in; replay driver answers the forced party screen
  (`answerForcedSwitch`, tools only). 13/13 playerfaint drafts exact twice fresh (2,029 rows);
  25 post-KO digests unchanged; 28 of 57 post-switch bodies on 12 generated routes newly lent and
  active. Supervisor: Light Screen 88 / Protect 123 (re-seeded host) / Thunderbolt O 237 exact twice
  fresh; RNG parity 0 mismatches on 4 forced-switch routes. Cancelled voluntary menu still declines
  (conservative). Receipt `playerfaint-lend-receipt.json`.
- Forced-switch continuation evidence (`966cc2c30`, `docs/forced-switch-continuation.md`): ROM
  removes the Roar/Whirlwind target instantly (skipAnim) at E+4, send-in at E+10; production plays
  a 27-frame recall and sends in at +33; send-in tail (healthbox slide / message) is species-
  dependent in the ROM, fixed in production; Baton Pass flow does present a replacement once the
  party screen is answered. Filed ISSUES #146.
- Folded Opus worker `c09a3677a` (src tree `35967507`): **215 live adapters** (+Roar, Whirlwind) with a
  Scene-ON forced switch-out after a live body (no recall; hold 4 + hide 6; send-in at the
  framebuffer E+11) and tracker `forced-switch-out` / side-generic switch-in units (host known after
  forced switches; sweep hostKnown 477 -> 524). Supervisor: dense Roar P / VAPOREON / Whirlwind O
  zero residual twice fresh; Roar player-attacker continuation exact body start -> emerge
  (128/128 both runs); tests 29/29. Limits (#146): send-in tail (ball-open fade/particles,
  species-keyed slide/message), opponent-attacker continuation, elevated-attacker field after the
  body (1,444 px, untriaged), Scene OFF unchanged. Receipt `roar-live-receipt.json`.
- Live-species audit 2 (`8dbd0e96a`, `docs/live-species-audit-2.md`): three more live defects,
  patch-proven (Rock Throw idle x2, Smelling Salt y clamp, Light Screen / Future Sight end-of-body
  shadow; supervisor reran Rock Throw GOLBAT 66/87 -> 87/87); tail fades are species-keyed lag
  frames (not defects). ISSUES #145 updated.
- Folded Sonnet worker `dfcd0861f` (src tree `29450955`): #145 species fixes — Rock Throw target idle
  x2 (ONIX keeps +1), Smelling Salt exclamation y clamp (`max(8, top) - 16`), Light Screen /
  Future Sight end-of-body elevated-shadow return (`LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS`),
  Foresight glass legs via exact `InitAnimLinearTranslation` truncation (GOLBAT 66 -> 167/167).
  Supervisor: dense vs GOLBAT twice fresh zero residual (Foresight 167, Smelling Salt 121, Future
  Sight 114), accepted Foresight unchanged, routes 5/5 PASS. Receipt `issue145b-receipt.json`.
- Voluntary-switch lend audit (`163142ea5`, `docs/voluntary-switch-lend-audit.md`): after a
  cancelled party menu or a voluntary switch the role relabel is exact (45 edges, 0 mismatches;
  12/12 what-ifs); the provisional recall unit is promoted (18 edges). Supervisor reran
  voluntary-cancel-slot1 (identical) + Swift O 80/80, Sunny Day P 158/158.
- Folded Opus worker `07a139fa9` (src tree `d4bccd58`): voluntary-switch lends — roles after the
  both-battlers reshow (cancelled menu / return from choosing), the player's voluntary recall
  (`RETURNATKTOBALL`, battler 0, synthesized `BattleScript_ActionSwitch`) maps to the promoted
  `switch-out` unit, allocator re-seed at the cancel return; opponent AI switches, Pursuit,
  Baton Pass still invalidate. 13/15 drafts exact twice fresh (2,132 rows); 2 later Light Screens
  decline (allocator history lost after earlier non-net-zero bodies, as on master). Supervisor:
  Light Screen after cancel 88 / Thunderbolt O 237 / Swift O 80 exact twice fresh; seed-16 switch
  and cancel routes rules + RNG parity 0 mismatches. Receipt `voluntary-lend-receipt.json`.
- Elevated-opponent post-body audit (`ecd680810`, `docs/elevated-postbody-audit.md`): ordinary
  resolution frames draw elevated opponents 8 px low without their shadow (ISSUES #147; every
  ordinary frame, before and after bodies); script-end shadow-return table over 214 fixtures;
  2-line patch proof (supervisor reran Whirlwind BUTTERFREE: post-body 0/30 -> 30/30).
- Folded Opus worker `a35e87160` (src tree `3ce320a6`): ISSUES #147 fix — the shared ordinary
  resolution renderer draws elevated opponents at the elevated origin with their shadow (both
  scene modes; `docs/elevated-renderer-off-check.md`: Scene OFF had the same bug), post-body
  shadow hide table (Absorb 2, Dragon Rage 21, Dream Eater / Psybeam / Razor Wind / Sing / Sky
  Uppercut / Horn Drill 1 by side), faint sink from the elevated origin, no shadow at HP 0.
  Supervisor: post-body Whirlwind BUTTERFREE / Air Cutter GOLBAT 30/30 (master 0/30); Scene OFF
  GOLBAT / BUTTERFREE 919/935 (master 0/935); magneton OFF trace 703/751 unchanged. Worker: 203
  committed traces byte-identical; gates 1,523 files / 12,309 tests + build. Receipt
  `elevated-renderer-receipt.json`. #147 trimmed to the hit-blink / HP-0 remainder.
- Rollout / Endeavor prep (`4fbd2d460`, `docs/rollout-endeavor-prep.md`): Rollout counter =
  `rolloutTimerStartValues - rolloutTimer` equals the ROM at every body (Defense Curl included);
  Endeavor's stale gBattleMovePower is trackable (damagecalc, AI decision rule 16/16 movesets,
  Battle TV writer, cross-battle persistence, 0 at the first battle). Drafts ready.
- Folded Opus worker `9f218b004` (src tree `b8565b22`): **217 live adapters** (+Fly, Bounce) with a
  presentation-only semi-invulnerable attacker hide across the turn gap (Scene ON; set by a live
  charge body, cleared by the battler's next body / visibility receipt / faint / switch).
  Supervisor: Fly SWELLOW 43/68 and Bounce PONYTA 64/55 exact twice fresh; routes 38/7, 65/7 PASS.
  Worker turn-gap proof: attacker region 0 px over 251/245 gap frames. Limits: Bounce opponent
  strike unevidenced; a live body hitting the hidden mon draws it. Receipt
  `flybounce-live-receipt.json`.
- Send-in tail model (`02cc82d90`, `docs/send-in-tail-model.md`): opponent healthbox slide start =
  46 + max(front frame animation, delay + callback) (338/338; leave-one-out 318/318; callback
  durations fitted); the forced-switch fade is the voluntary send-in effect gated by
  `sourceDecision.kind === "switch"`.
- Folded Sonnet worker `0d585e288` (src tree `6418776b`): **218 live adapters** (+Rollout): presentation-
  only `rolloutCounter` (7th MOVE_ANIMATION argument, move 205 only); bodies 1-5 by counter; the
  plain power ladder only (Defense Curl bodies decline: SHUCKLE->BLISSEY residual unexplained).
  Supervisor: player bodies 1/5, opponent body 3, WAILMER body 1 exact twice fresh; route 2/0
  VOLTORB 5 bodies active, parity PASS. Receipt `rollout-live-receipt.json`.
- Session final (supervisor, code `d1044f128`): typecheck; full suite 1,525 files / 12,317 tests;
  build 851 (`final-supervisor-gates-20261005-day.json`); preview `d1044f128` verified (four
  hashes, export, ON->OFF, no errors). DEFERRED D3 open (Random2).

## 2026-10-05 (wind-down) — CASTFORM fix + order table 445 bodies

- CASTFORM normal-form Y placement fixed (`6f6641fe7`, ISSUES #143 trimmed to weather
  forms): player back delta from `sCastformBackSpriteYCoords` (0), elevation from
  `sCastformElevations` (13, via the extractor). Supervisor: retained ROM runs 237/237
  exact both sides; MINUN controls zero residual. Receipt `castform-fix-receipt.json`.
- Production order table 381 -> 445 bodies (`cccdd4811`): Endeavor/Fake Tears
  relative-y rows + 60 REL-Y-confirmed rows. Corpus 1,044 -> 1,101 known (all exact);
  strict real-route 3 -> 10 known per trace (all exact). Supervisor: 54 sprite-order
  tests green; later-body consumer routes PASS. Receipt `order-table-rows-receipt.json`.
- `implementedCount` corrected 191 -> 198 (a batch had not bumped it) and pinned by
  `tests/liveStatusImplementedCount.test.ts`.
- Intimidate battle-start seed (`a6b7b3cdf`): pre-prompt entry state + stat-animation plan
  (12/12 corpus exact at the Intimidate and first-move edges); route seed 53 (Intimidate
  lead) lends a known order, both bodies live. Receipt `intimidate-seed-receipt.json`.
- Final supervisor gates on `a6b7b3cdf`: typecheck, 1,509 files / 12,178 tests, build 851.

## 2026-10-05 — final batch folded: 198 live adapters; session gates

- Folded worker `505055810` as `6be8bc130`: Giga Drain, Sunny Day, Mega Drain,
  Absorb (live age 0 = window start, activation + 10), Dream Eater (sleep from the
  displayed field), Double Team (player attacker; frontClone from the lend; dense
  source = prep7 first-body lab scenario), Feather Dance — all gated on the lent
  order. Supervisor dense 25 fixtures (13 + 12 alternate species) twice fresh,
  5,292 rows/run, zero residual; routes 7/7 PASS. Receipt `prep9-supervisor-receipt.json`.
- Supervisor final gates on `6be8bc130`: typecheck, 1,508 files / 12,175 tests,
  build 851 modules (`final-supervisor-gates-20261005.json`).
- ISSUES #143 diagnosed (`84d222bcf`, `docs/castform-art-diagnosis.md`): CASTFORM
  art/palette are exact; its Y placement comes from `sCastformBackSpriteYCoords`
  (back delta 0) and `sCastformElevations` (13) that the app does not apply;
  in-memory what-if exact 237/237 both sides.

## 2026-10-05 — prep8 batch folded: 191 live adapters; uncovered-unit evidence

- Folded worker `80bbf9483` as `e74e8dd03` (src `4bf17bef1`): Swift, Trick,
  Frustration (friendship ≤ 30), Seismic Toss (damage 33..65), Horn Drill,
  Aurora Beam, Uproar, Thunderbolt, Stockpile, Zap Cannon — allocator constants
  + lent order, gated on the tracked order being known. Supervisor dense 24
  fixtures twice fresh, 4,013 rows/run, zero residual; routes 10/10 PASS.
  Receipt `prep8-supervisor-receipt.json`. New ISSUES #143 (CASTFORM art).
- Uncovered units (`8258a8c56`, `docs/sprite-order-uncovered-units.md`): faint,
  summary, send-out, switch-in, party menu, reshow, recall and trainer-slide
  order transforms 36/36 exact (strict route edges known rise accordingly), but
  after a KO the battler slots and the affine baseline change, so lends stay
  gated (needs occupancy-aware consumers + post-unit affine/task baselines).
- Running: final batch (Giga Drain, Sunny Day, Mega Drain, Absorb, Dream
  Eater, Double Team player, Feather Dance).

## 2026-10-05 — prep7 batch folded: 181 live adapters

- Folded worker `66da912c7` as `37d9d1047` (src `907516e6b`): Aerial Ace,
  Quick Attack (live age 0 = activation, reducer age + 42 / 44), Ice Punch,
  Fake Tears, Sleep Talk, Fire Blast, Dragon Dance (lent order), Rock Slide
  (opponent attacker only). Supervisor dense 19 fixtures twice fresh, 2,367
  rows/run, zero residual; routes 8/8 PASS. Receipt `prep7-supervisor-receipt.json`.
- Limit: Aerial Ace with CHARIZARD/DRAGONAIR opponent attackers leaves 14/51 px
  at ages 10-11 on the opponent platform clip row.
- REL-Y-STATIC confirmation (`75b25fe60`, `docs/sprite-order-rely-confirmation.md`;
  supervisor regenerated the 83-row file identically): 60 candidate bodies
  confirmed order-static across ≥2 geometries (+23 absolute-invariant), 30
  refuted; weighted EXACT plan coverage 68.2% → 80.6% (83.7% with all rows);
  union replay 2,158/2,158 exact. Rows are not yet in the production table.
- Running: prep8 batch (ten allocator-plan-v2 moves); uncovered units
  (faint / send-out / switch / party menu) order evidence (side).

## 2026-10-05 — prep6 batch folded: 173 live adapters; prep8 prep

- Folded worker `0cffc9e43` as `056278783` (src `5a9ef5cdf`): Rock Tomb,
  Safeguard, Sweet Scent (reducer age = live − 4), Self-Destruct, Swallow
  (stockpile = request.turn), Knock Off (ageOffset −11), Faint Attack (player
  attacker only). Supervisor dense 20 fixtures twice fresh, 2,771 rows/run,
  zero residual; routes 8/8 PASS. Receipt `prep6-supervisor-receipt.json`.
- Limit to resolve: Faint Attack's last 16 ages (fade back from the dark
  background) differ by one script frame between BattleLab-context renders
  and the accepted staged probe; the adapter matches the staged probe.
- prep8 measured prep (`ec4ad08fd`, `docs/next-adapters-prep8.md`): Swift,
  Trick, Thunderbolt, Frustration, Horn Drill, Seismic Toss, Aurora Beam,
  Stockpile, Uproar, Zap Cannon all READY (allocator literals = ROM plan;
  order pixel-neutral except Zap Cannon ≤4/117 frames); gate on the lent
  order (`spriteOrderInput.known`), no new provider module needed.
- Order policy gaps (`d3d40e53b`, `docs/sprite-order-policy-gaps.md`): the
  prep7 "stat command invalidates" finding is stale (the cross-body host maps
  `stat-stage-change` to a no-op; Double Team/Feather Dance first bodies now get
  a known order 3/3); Intimidate entry seed (pre-prompt state + stat plan)
  reproduces the ROM 12/12; Endeavor and Fake Tears are order-static under a
  constant relative-y spread (strict real-route known edges 15 → 44, 0
  mismatches). Production change proposal §1 (A-C) not yet applied.
- prep9 (`088b7284d`, `docs/next-adapters-prep9.md`; supervisor regenerated the
  palette baseline identically): Absorb, Mega Drain, Giga Drain, Dream Eater,
  Sunny Day need NO palette snapshots (census D-PAL stale): BG banks constant at
  53/53 activations, OBJ banks = species art; allocator profiles constant;
  order pixel-neutral. All READY (four with the lent order).
- Running: prep7 batch (integration); REL-Y-STATIC confirmation for 121
  candidate bodies (side).

## 2026-10-05 — cross-body sprite-order tracking live

- Folded Opus worker `69e855789` (code `72880ce1a`) as `4eb56e287`: event-driven
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
- prep7 measured prep (`5188a3cd8`, `docs/next-adapters-prep7.md`): READY Aerial
  Ace, Quick Attack, Ice Punch, Fake Tears, Sleep Talk, Rock Slide (opponent);
  Fire Blast, Dragon Dance via the provider; Feather Dance / Double Team need
  the order kept across their leading `stat` command.
- Allocator plan v2 evidence (`aebbebbda`, `docs/allocator-plan-v2-evidence.md`;
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

- Folded worker `8038dcb93` as `a1c7c408e` (src `53130b776`): Ember, Dragon
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
- Plan coverage (`be704eddc`, `docs/sprite-order-plan-coverage.md`): 228 more
  scenarios (two identical runs each) raise EXACT body plans to 68% of
  weighted Factory move uses (was 52%); union replay 1,053/1,053 exact.
- Remaining-adapters census (`c6990c1cc`, `docs/remaining-adapters-census.md`,
  regenerate `node tools/integration/remainingAdaptersCensus.mjs --write --doc`):
  276 = 158 live + 15 in flight + 103 remaining (READY-NOW 10, SMALL-INPUT 5,
  single provider 31, multi 56). Provider ranking: allocator plan v2
  (affine matrix + task slots) +12 moves; Random2 surrogate +7 (non-exact,
  claim-boundary question); graphics host +6; palette snapshots +5.
- Running: cross-body order tracking (Opus); prep7 measured prep for the
  census READY-NOW batch (side).

## 2026-10-04 (night) — sprite-order provider wired (first body) + Grudge: 158

- Folded Opus worker `b4ca7555d` (code `79ce132af`, src `953b81b0a`) as
  `b51b49ca8`: provider API (`spriteOrderForSlots`, occupied prefix, body/gap
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
- prep6 measured prep (`b2a41d4ea`, `docs/next-adapters-prep6.md`; supervisor
  reproduced pins/slots): READY Rock Tomb, Safeguard, Sweet Scent,
  Self-Destruct, Knock Off (age basis −6), Swallow (stockpile = request.turn),
  Faint Attack (player attacker only); Pain Split needs per-side coords
  yOffset in its reducer; Dragon Dance (1 frame), Fire Blast and Double Team
  need the order provider.
- Real-route order validation (`8f80061be`, `docs/sprite-order-real-route.md`;
  supervisor fresh rerun identical): five canonical Factory battle-1 traces,
  ROM per-frame order. Event rules (prompt bounce pair, hit-animation blip,
  stat ±1/±2) 121/121 unit checks exact; with resync after each unknown unit
  all 91 move edges exact. Strict tracking stops at the first body without a
  plan (the opponent's Double Team on turn 1): table coverage is the limit.
  Faint, next-mon summary/send-out, forced switch-in, party menu, battle
  reshow and the end-of-battle slide must invalidate.

## 2026-10-04 (night) — prep5 folded: 157 live adapters; order-consumer prep

- Folded worker `8715c5885` as `6ca4b7cab` (src tree `1f73449b5`): Mist Ball
  (ad-hoc shadow retired; Registeel drafts fixed to genderless), Aromatherapy
  (duration 400 player / 396 opponent attacker, same script-end frame), Follow
  Me, Metronome (body only; called move is an ordinary second request), Taunt
  (age 0 = window start, 10 frames after activation), Belly Drum. No palette plans.
- Supervisor dense: 12 fixtures + Follow Me CLEFABLE/FURRET, Taunt MIGHTYENA,
  Metronome CLEFABLE (`altSpecies8.py`) twice fresh, 2,938 rows/run, zero
  residual. Routes 6/6 exact ON/OFF parity; Mist Ball prep seed 90 has no body
  because Latias flinched (checked). Union typecheck/smoke/affected green.
  Receipt `prep5-supervisor-receipt.json`.
- Order-consumer measured prep (`56cab64e2`, `docs/order-consumer-prep.md`):
  18/18 accepted order literals equal the provider. Ember and Dragon Rage need
  no order input (one sprite per sort window); Flamethrower's seed is
  pixel-neutral; Rock Throw, Heal Bell, Leaf Blade, Perish Song, Blaze Kick,
  Grudge (first body), Mud Slap, Sand Attack need the provider; consumers need
  `F` filtered to their allocation slots, not `F.slice(0, n)`. Dive attack body
  needs live keys; Magnitude's own evidence is not accepted.
- Running: provider wiring step (first body of a battle + Grudge consumer,
  Opus worker).
- Gap causes (`7572e08b6`, `docs/sprite-order-gap-causes.md`): the
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

- Folded worker `67e82dafa` as `852506e76` (src tree `c449f3775`): Mean Look,
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

- `src/engine/spriteOrderProvider.ts` (design §4 slice 1, `4e9d11475`): pure
  frozen `SpriteOrderState`; TS corpus replay 80,370/0 frames (2×40,185) and
  112/112 activation heads; `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` checked in all
  44 raw files; `knownEntrySpriteOrderState` replays the 78 entry sort windows.
  Not wired into any adapter yet.
- Ordinary Factory entry ROM-confirmed (`4ea4f7695`,
  `docs/sprite-order-factory-entry.md`): canonical draft → battle 1
  (`traces-groundtruth/battle1-turn1.json`) plus an RNG-shifted variant (other
  opponent lead and first move), two byte-identical runs each (supervisor fresh
  rerun identical): same 78 windows, same first-action free order, allocator
  `ordinary-factory` occupants confirmed. Different player rentals and battle 2+
  are not covered.
- Body/gap order plans (`0342eb2c8`, `docs/sprite-order-body-plans.md`,
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

- Folded worker `dbc5fd8f5` (tested code `3d1978ba2`, src tree `702752ac5`):
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

- Folded worker `09027ecf1` as `baacb602f` (src tree `8a0b13c30`): Scary Face,
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

- Side-lane `1e61ca85f` folded as `e179ea2b9` (new files only):
  `docs/next-adapters-prep2.md` triages the 33 unadapted H_BASIC/H_DERIVED
  moves: READY 11, small-input 12, blocked 10 (switch flow Baton Pass/Roar/
  Whirlwind; Sleep Talk called move; Substitute doll; Memento scanline; Spark
  order; Wish/Meteor Mash Random2; Extreme Speed age basis). Drafted
  `prep2-*` fixtures for the next batch (Surf, Muddy Water, Icy Wind,
  Blizzard, Fake Out, Explosion, Cosmic Power, Future Sight); activation
  receipt `docs/next-adapters-prep2-activation.json`. Supervisor re-measured
  Surf activation 72..215 fresh (matches).

## 2026-10-04 — next-adapters prep banked (evidence only)

- Side-lane prep `cf4cebf88` folded (new files only): `docs/next-adapters-prep.md`
  and ten drafted fixtures `tools/integration/fixtures/next-*.json` for Dizzy
  Punch, Teeter Dance, Soft-Boiled, Scary Face, Glare (windows, activation,
  #142 shadow rows: Teeter Dance/Soft-Boiled/Glare 0; Dizzy Punch -13 and Scary
  Face -4 = no shadow). Inputs: personality must be threaded from
  `BattleScriptRulesBattlerState.personality` (only Spinda pixels depend on
  it); Soft-Boiled renderer hard-codes Onix and needs self-target support in
  the harness; eye centers derive from anchors + pic height for any species.
  Not yet framebuffer-verified.

## 2026-10-04 — visual-randomness prep banked (evidence only)

- Side-lane prep `53c7c143e` folded (new files only):
  `docs/visual-randomness-prep.md`. Astonish, Double Kick, Thrash, Flail,
  Luster Purge, Mud Slap and Sand Attack draw only `Random2()` (gRng2Value;
  never gameplay RNG — Scene ON/OFF cannot desync gameplay); Dizzy Punch and
  Teeter Dance need only the attacker personality (exact now). gRng2Value's
  per-frame advance during Double Kick is empirical (caller not found) — open.
- Recommended next: Dizzy Punch + Teeter Dance (personality), Flail (power +
  2 words), then a presentation-only Random2 helper for the rest.

## 2026-10-04 — session wind-down: anchor4 folded, 131 live adapters

- Folded anchor4 `faa7d37d6` as `1ad102b5f` (src tree `3dc209a36`):
  Earthquake, Fissure, Crabhammer, Magical Leaf, Psybeam, Amnesia (idle x2 /
  picture size from live species; shadow rows 0; shifted-X static BG now fires
  the shared #142 hook). Supervisor dense 12 fixtures twice fresh, 2,228
  rows/run, zero residual; routes 6/6; scan 281 rows / 131 ids, 0 mismatches.
- Final production `1ad102b5f`: adapters 131, accepted 276, remaining 145.
  Supervisor final full 1,493 files / 11,963 tests, build 847
  (`final-supervisor-gates-20261004.json`). Preview serves `1ad102b5f`; four
  exact canvas/PNG hashes, export, ON->OFF restart, no errors.
- Next (resume points, all with banked evidence): sprite-order provider
  slices (`docs/sprite-order-provider-design.md`); status-animation occupancy
  persistence; Reversal reducer change (needs the animation program);
  Soft-Boiled; Scary Face/Glare eye anchors; H_BUFFER/H_RANDOM/H_OUTCOME
  groups. No arbitrary-history framebuffer claim.

## 2026-10-04 — multi-hit per-hit adapters (125 live)

- Folded worker `e38bf1647` (tested code `c5f6dad4e`, src tree `c14cdb45a`):
  Double Slap, Comet Punch, Triple Kick, one body per hit with moveTurn from
  request.turn; staged-only draw cases ported to the live field; shadow row 0
  per hit. Adapters 125, remaining 151.
- Supervisor dense: all 21 per-hit fixtures twice fresh, 759 rows/run, zero
  residual. Routes: Double Slap 4 and 3 hits, Comet Punch 3 hits; Triple Kick
  has no generated-rental carrier (dense only). Comet Punch's target anchor
  was found by a y sweep then tied to the reducer's own opponent offset;
  accepted on the exact ROM proof. Receipt `multihit-supervisor-receipt.json`.

## 2026-10-04 — ISSUES #142 fixed: elevated-opponent shadow + Sandstorm idle

- Folded worker `e08df1fb7` as `e6354e006` (tested code `6683458cb`, src tree
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

- Side-lane evidence `d8ea6262c` folded (new files only):
  `docs/reversal-shake-evidence.md`, receipt
  `tools/integration/fixtures/reversal-shake-evidence.json`. Power 20/40/80/
  100/150/200, both sides, twice fresh: x2 = +ceil(A/2), -floor(A/2) toggling
  every 2 frames (7 visible toggles), A = clamp(gAnimMovePower/12, 1, 16) from
  the dynamic HP power; accepted reducer `reversal.ts` (A/0) exact only at A=1.
- Resume: change the reducer's toggle, add A>1 tests from this receipt, then
  wire Reversal live with amplitude from request.power. Caveat: HP was lowered
  by Super Fang from a non-learner (Chansey); the shake depends only on power.

## 2026-10-04 — multi-hit adapter prep banked

- Side-lane prep `813a2a1a3` folded (new files only): `docs/multihit-prep.md`,
  per-hit evidence and 21 drafted fixtures
  `tools/integration/fixtures/multihit-<move>-<side>-hit<i>.json` for Double
  Slap (34 rows/hit), Comet Punch (37), Triple Kick (37), both sides; each hit
  window starts at its own activation; request.turn = hit index; hits >= 1
  show a blank message box; target x2 0 after hit 0.
- Resume: port the three staged-only draw cases (battleScene.ts Comet Punch,
  Double Slap, Triple Kick) to liveField like Fury Swipes, wire moveTurn from
  request.turn, run the drafted fixtures. Not yet framebuffer-verified.

## 2026-10-04 — selectors batch: four request-selector adapters (122 live)

- Folded worker `cb0aa8eae` (tested code `6aab2c40d`, src tree `379f96d40`):
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

- Side-lane evidence `0ec669200` folded (new files only):
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

- Side-lane evidence `163301fe2` folded as `5aa6c943b` (new files only): all
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

- Side-lane evidence `889a4dfbd` folded as `c665c8885` (new files only): 16
  alternate-species cases on older adapters, twice fresh. Reliable #142
  acceptance: Body Slam/Golbat and Mega Punch/Magneton (200 px at age 0),
  Brick Break/Haunter row 0. Window starts for the rest came from a biased
  live-match finder; two unattributed residual families (Brick Break vs
  Haunter ages 23-191 ~2,587 px/row; Night Shade vs Golbat 59 px/row).
- Follow-up running (side lane): re-derive starts from the source activation
  frame and attribute both families.

## 2026-10-04 — anchor3 batch (118 live), net-zero list 110, #142 scoped

- Folded anchor3 `9b5478b71` as `d772bad95` (src tree `dabce926b`): Endure,
  Focus Energy, Facade, Minimize, Thunder, Thunder Wave, Swagger, Bulk Up
  (fields mapped from `liveBattlerAnchors`; row-0 shadow and opponent idle
  applied in these branches). Rung 0 widened the audited net-zero list to all
  110 then-live ids: Light Screen now exact after Bubble Beam/Acid, Mirror Coat
  after Bubble Beam. Adapters 118, remaining 158.
- Supervisor: dense 16 fixtures twice fresh, 2,250 rows/run, zero residual;
  routes 8/8 and eligibility 5/5. Worker full gate had one expected route
  failure (fixed test-only), so the supervisor ran a fresh full suite and build
  on `d772bad95`: 1,489 files / 11,884 tests passed, build 847 modules.
  Receipt `anchor3-supervisor-receipt.json`.
- #142 scope scan folded (`e2c65e26d`): 101/110 live ids miss the elevated
  row-0 shadow as target, 89 as attacker; draw order says insert right after
  the battle background. Fix step queued after the selectors batch.

## 2026-10-04 — alternate-species dense proofs confirm ISSUES #142

- Side-lane evidence `e2ab4e0e1` folded (new files only): twelve alternate-
  species cases (elevated Golbat/Magneton/Haunter/Koffing/Jumpluff opponents;
  Onix/Rattata opponent attackers), each twice fresh with identical source
  digests. Receipt `altspecies-live-evidence.json`; doc
  `docs/altspecies-live-evidence.md`.
- CONFIRMED: elevated-opponent shadow missing on row 0 (200 px) for Mud Shot,
  Flame Wheel, Heat Wave, Block, Torment, Detect; Sandstorm opponent-attacker
  Onix idle x2 missing. Acid, Synthesis, Hyper Fang/Rattata correct. Filed
  as ISSUES #142 with fix shape and acceptance; fix step queued.

## 2026-10-04 — allocator history persists across audited net-zero bodies

- Folded worker `ae261d2d6` (src tree `8566da639`): 90 audited net-zero live
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

- Side-lane evidence `4ea50192e` folded (new files only): receipt
  `tools/integration/fixtures/allocator-net-zero-audit-ext.json` (with a
  `combined` section), doc `docs/allocator-net-zero-audit-ext.md`, new staged
  scenarios for Twineedle, Bite, Hyper Fang, Super Fang and Shadow Punch.
- 20 new rows (anchor + anchor2 batches, the five previously unaudited ids,
  Fury Swipes opponent), twice fresh, all net-zero; combined 110/110 live ids
  net-zero, none uncovered. Supervisor rerun of both Bite rows identical.
- The in-flight history-persistence worker pins against the original receipt;
  widening its constant to the combined list is a follow-up.

## 2026-10-04 — anchor2 batch: seven picture-anchor adapters (110 live)

- Folded worker `8a103f227` (tested code `cb7d1c2cf`, src tree `08b2ac222`):
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

- Side-lane evidence `c650c4b34` folded (new files only): receipt
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

- Folded worker `605b2d1d2` (tested code `525f350ad`, src tree `ea6ba1893`):
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

- Side-lane evidence `739a9192d` folded (new files only): receipt
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

- Side-lane evidence/design `286504ac2` folded (new files only):
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

- Side-lane evidence `790a641ef` folded (new files only): probe, batch runner,
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

- Folded worker `39e4edccf` (tested code `511c70fd0`, src tree `bcc9f0d2c`):
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

- Side-lane evidence `a175ce469` folded (new files only): probe
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

- Side-lane evidence `9e47c41a1` folded as `7c45361d6` (new files only):
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

- Folded worker `d1fb4fde1` (tested code `3f9207b4c`, src tree `f14e250a1`):
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

- Folded `76d57239b` (worker `fcca69d32`, tested code `5e4ec84df`, src tree
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

- Production `8d433daae` (src tree `b24b89ddbdeffb5e3b3cf19e7091e478537f0ef3`);
  adapters 80, accepted 276, remaining 196. Fast-forward of the repair worker.
- Repair `df1f791ab`: every move animation now passes the allocator seam, so
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
- Preview <http://127.0.0.1:5191/> serves `02f4f9005` (847 modules): four
  canvas/PNG hashes identical to `66afe3ed2`, export, ON-to-OFF restart, no
  errors. `playable-preview-28d5be550-receipt.json`.
- Next: bounded H_BASIC adapter batches (Flame Wheel, Fire Spin, Heat Wave,
  Sandstorm, Sonic Boom, Block; then Synthesis, Milk Drink, Flash, Role Play,
  Spite). Light Screen after other bodies stays bounded fallback until more
  allocator plans exist.

## 2026-10-03 — known-entry sprite allocator provider verified

- Production helper `f242ca815`, tested tree `02b775a5d988d6884c722a48829c8b01931c8e64`;
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
- Preview: <http://127.0.0.1:5191/> serves `66afe3ed2`; ordinary input, four
  exact canvas/saved PNG hashes, export, ON-to-OFF restart and no page errors.
  `playable-preview-e3f60734c-receipt.json`; no adapter/source-body credit added.
- Next: immediate provider consumer is Light Screen. Correct activation/wall
  clock and text ownership; dense full script-load/body/cleanup/following display
  bilateral twice and Slowpoke complete; ordinary repeats/prompts and full mode
  parity. Old `db1d4f37d` stays unmerged and uncounted. Later history remains
  unknown; this helper adds no arbitrary-history framebuffer claim.

## 2026-10-03 — exact allocator lifecycle source checkpoint

- Accepted tooling `2b7fff229`; production unchanged at `bb8f6d315`, src tree
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
  bilateral plus complete Slowpoke. Candidate `db1d4f37d` stays unmerged.
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
  whole-playable exact0. Production `bb8f6d315`, src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
- Source: Burn tooling `712d1d0e4` independently verified bilateral twice,
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
  choice deferred. Preview currently verified `71dab65a3`; final refresh follows.
- Next: Light Screen `db1d4f37d` remains unmerged. Derive intro/sendout/summary
  allocator ownership; actual clock303..388(player)/213..298(opponent), preserve
  completed text and extend full framebuffer proof through cleanup/following
  display, both sides twice and complete Slowpoke. See clock/review receipts.
  Then source-owned semantic status provider may use audited Duck/Small Ember
  resources with event subject/priority, lifecycle and real follow-up proof.
  Unknown entry/switch/summary/substitute/transform ownership stays open;
  keep outcomes/RNG/damage/order/progression intact. Factory/Rust not dispatched.

## 2026-10-02 — Light Screen source clock separated from prior controller text

- State: source/tool `9967b5c20` accepted; runtime `bb8f6d315` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Candidate `db1d4f37d` remains unmerged; no source allocator recipe claimed.
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
- Preview: <http://127.0.0.1:5191/> serves verified `71dab65a3`, eleven exact
  canvas/PNG samples, exports/restarts and no errors. Accepted worktrees
  retired after all fresh pass/failure evidence preservation; refs/logs kept.
- Next: bounded burn-status source witness if deadline permits, then clean
  final handoff. Actual status histories remain unknown. No material decision
  deferred; do not dispatch Factory acceptance or Rust work.

## 2026-10-02 — confusion source checkpoint and independent final production gates

- State: accepted tooling/source `48c7af534`; production `bb8f6d315` unchanged.
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
- Preview: <http://127.0.0.1:5191/> refreshed at `71dab65a3`; eleven exact
  canvas/PNG samples, ordinary party-cancel and Razor Leaf routes, eleven
  full ON/OFF rules/RNG boundaries, exports/restarts and no browser errors.
  `playable-preview-4815edf58-receipt.json`. Retired worker worktrees removed;
  refs/logs and all fresh pass/failure raw evidence preserved in primary.
- Next: bounded Light Screen source load/text-clock audit, then handoff.
  Light Screen candidate stays unmerged; do not register Reflect by copying
  its allocator. Future confusion provider requires a semantic event lifecycle,
  source allocator and non-Shadow follow-up proof. No material choice deferred.
