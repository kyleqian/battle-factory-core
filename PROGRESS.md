# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **USER DIRECTIVE (2026-07-26, temporary):** the animation lane is paused to
> conserve tokens while the user evaluates splitting animation into its own
> supervisor/worktree. Next sessions run main + side lanes only; skip entry
> 468's animation "Next" items until this note is removed (they are deferred,
> not abandoned). See the matching note in SUPERVISOR.md.

---
## 470 — ENDTURN_ITEMS1 registered: REMOVEITEM opcode + Leftovers/8 cure berries/White Herb (doc §5 slice 4's mandatory rung), live-verified

- **Side merge (same round, supervisor-verified in-worktree + on the merged
  tree):** END3 design scout banked (branch `worker/side-20260726-112551`,
  merged, worktree removed) — `docs/end3-design.md` + UNWIRED
  `src/engine/battleScriptCallbackStack.ts` prototype (5 Tier-1 tests).
  Load-bearing design facts, supervisor re-verified against
  `battle_script_commands.c:3967-3973`: `Cmd_end3` pops BOTH stacks
  (script cursor via `BattleScriptPop()` + `gBattleMainFunc` from
  `battleCallbackStack`); for the end-turn abilities the popped cursor is
  observably dead — the real resume point is `turnEffectsTracker` state —
  while the mid-script (Intimidate `ON_SWITCHIN`) case is a live
  continuation; stack depth caps at 1 (`if (effect) return` short-circuit).
  Registration checklist for the main-lane END3 step: `docs/end3-design.md`
  §4. Two endturn-doc §1b imprecisions corrected (no
  `gBattlescriptCurrInstrStackPtr` symbol; `end3` restores
  `BattleTurnPassed`, not a re-entry point). Merged tree: **223 files /
  2810 tests + build green.**

- **State:** tree green at **222 files / 2805 tests** (+1 file/+24 tests
  over entry 469's merged 221/2781), build green (`tsc -b && vite build`).
  Ratchet **6/6**
  (`executableFrontierRatchet.test.ts`) — one new pinned entry,
  `battleScriptRemoveitemOpcode.ts: 1` (moved deliberately, named in both
  commit messages): `Cmd_removeitem`'s only unmodeled branch is a selector
  resolving to no live battler role, reachability-tested. The
  `runItemsTick` case-barriers for RESTORE_HP/RESTORE_PP/the 3 stretch
  stat-up berries/the 9 zero-Factory-carrier hold effects do **not** add to
  that ratchet (same `"case-barrier"` shape as the pre-existing
  NIGHTMARES/CURSE/THRASH/DISABLE/TAUNT guards, not a machine-level
  `unsupportedBranch(...)` call). Two commits (`1c8e015` opcode,
  `d8e161a` orchestration wiring), both green; a third (docs/fixtures only)
  follows this entry. `npx tsx tools/report/executable-frontier-census.ts`:
  unchanged (79/214 effects, 163/355 moves, 128/276 Factory-L50 moves,
  1573/2957 weighted, 25/25 checks) — this slice is end-turn breadth, not
  move-effect breadth, exactly as the brief anticipated.
- **Did:** read `docs/endturn-abilities-items-ground-truth.md` in full,
  then (1) registered `B_SCR_OP_REMOVEITEM`/`Cmd_removeitem`
  (`battleScriptRemoveitemOpcode.ts`, all 13 concrete call sites eagerly
  validated), widening the shared `GetBattlerForBattleScript` resolver for
  `BS_SCRIPTING` (the existing non-nullable `scriptingBattler` field) so
  `PLAYANIMATION`/`UPDATESTATUSICON` work inside the new scripts too, plus
  registering `B_ANIM_HELD_ITEM_EFFECT` and `gBerryEffectStringIds`; (2)
  wired `ENDTURN_ITEMS1` (`runItemsTick` in
  `battleEndTurnOrchestration.ts`) for Leftovers (heals floor(maxHP/16)
  capped, persists), White Herb (resets every below-neutral stat stage to
  6, consumes), and the 8 zero-RNG cure berries (Cheri/Pecha/Rawst/Aspear/
  Chesto/Persim/Lum/Mental Herb — each clears its own status1/status2 bit,
  syncs the party status1 mirror the same way `bumpToxicCounter` already
  does, consumes the item) — `runTickScript` reused unchanged, zero new
  control-flow work, matching the doc's own "no new opcode beyond
  REMOVEITEM" finding. Every other real switch case barriers on its own
  genuine trigger condition rather than falling through: RESTORE_HP
  (`hp <= maxHP/2`)/RESTORE_PP (a real zero-PP move exists) are Factory-legal
  but out of this slice's ten; the 3 stretch stat-up berries
  (Liechi/Salac/Petaya, doc §5 slice 5) and the 9 zero-Factory-carrier cases
  (4 stat/crit berries + 5 confuse berries, doc §2b) barrier on mere
  possession since their own HP-threshold gate needs an unmodeled per-item
  `holdEffectParam` table no live carrier will ever exercise.
  **Did NOT reach slice 5** (stretch) — time went to the mandatory ten plus
  live verification instead; see Next.
- **Test:** 20 new Tier-1 tests in `battleEndTurnOrchestration.test.ts`
  (12→32 total: one per cure berry via a small table-driven block,
  Leftovers/White Herb fire+no-fire pairs, and one reachability test per
  (b) guard including a "does NOT barrier below the gate" negative for
  RESTORE_HP) + 4 new tests in `battleScriptRemoveitemOpcode.test.ts` (both
  selectors, plus the opcode's own barrier) + 2 existing
  `battleScriptRulesContext.test.ts` tests widened in place (BS_SCRIPTING
  added to the selector map/composition count, 95→96) — net +24 tests, +1
  file, matching the measured 2781→2805.
  **Live oracle verification (both re-run clean against `battle-scene-off`,
  numbers in doc §6):** `tools/battle-lab/mechanic-endturn-items1-leftovers-off.json`
  (LOTAD holding Leftovers vs. a real MAGIKARP Pound: frame 528→529 the hit
  lands -11, frame 849→850 Leftovers heals +7 = floor(115/16), item
  unchanged at 200 throughout, `rngValue` bit-identical at the exact heal
  boundary) and `tools/battle-lab/mechanic-endturn-items1-cure-par-off.json`
  (same LOTAD holding Cheri Berry vs. a real Thunder Wave: `status1` clears
  612→613, item clears 750→751 — confirms source's real two-step timing,
  the C-side status clear fires synchronously ahead of the queued script's
  animation/message tail that ends in `removeitem` — `rngValue` bit-identical
  across the ENTIRE 491→751 window, zero draws).
- **Next:** doc §5 slice 5 (Liechi/Salac/Petaya, `STATBUFFCHANGE` already
  registered, label-lookup-only addition once `REMOVEITEM` exists — this
  session's own `runItemsTick` dispatch is ready to extend, just add the
  three cases where the stretch barrier bucket currently sits and drop them
  from that `Set`). `ENDTURN_ITEMS2` stays correctly unregistered (its real
  trigger needs Yawn/Thrash's own end-turn cases, doc's own finding).
  `END3` registration (Speed Boost/Rain Dish/Shed Skin, doc slices 1-3)
  remains the next architectural gap after that.
- **Notes:** stayed in scope — no END3, no slices 1-3, no ENDTURN_ITEMS2, no
  factory-AI files, no ground-truth content edits beyond the short §6
  registration-status addendum the brief allowed. No PAPERCUT this session.

---
## 469 — Sixth CheckViability handler pair ported: AI_CBM_AttackDown + AI_CV_AttackDown, the first CBM-blocked pair (entry 468's own "Next" item, per doc §14)

- **Side merge (same round, supervisor-verified ALL PASS live on the merged
  tree):** doc **§15 `AI_CBM_DefenseDown`+`AI_CV_DefenseDown`** and **§16
  `AI_CBM_SpDefDown`+`AI_CV_SpDefDown`** ground truth banked (branch
  `worker/side-20260726-110057`, merged, worktree removed) — twin fixtures
  reusing §13's Anorith/Machamp pairing verbatim (both CV draw sites are
  `if_hp_less_than AI_USER,70`-gated, VitalThrow's shape, so no new damage
  sizing); ledgers 13/13 reach vs 7/7 control per pair, both seeds ×2,
  +4 delta cleanly attributed to `Cmd_if_random_less_than`. Premise
  falsified from source (worker, supervisor re-verified against the raw
  assembly): §7's "target HP ≤ 70%" prose for DefenseDown/SpDefDown was an
  `AI_USER`/`AI_TARGET` mixup — the roll is gated by the opponent's OWN HP;
  target HP only gates the separate deterministic −2 (Gate C). 10-fixture →
  13-fixture verify script ALL PASS ×2 (worker) + once more by the
  supervisor from the worktree. Merged tree: **221 files / 2781 tests +
  build green.** Next porter picks up §15/§16 the way this entry consumed
  §14.

- **State:** tree green at **221 files / 2781 tests** (+0 files/+30 tests
  over entry 468's merged 221/2751), build green (`tsc -b && vite build`).
  Ratchet unchanged (6/6, `executableFrontierRatchet.test.ts` — the
  `factoryAi*` modules' `kind: "unsupported-branch"` literals aren't
  tracked by that ratchet's `unsupportedBranch(...)` regex, same as every
  prior CBM/CV port). `tools/probe/verify-factory-ai-checkviability-ground-truth.ts`
  rerun live against the oracle before AND after the port: **ALL PASS**
  both times, both runs (oracle-only, correctly unaffected by the engine
  change). Three commits (`d7942de` port, `d3221f3` unit tests, `2fbb5f6`
  fixture reproduction + §14.5 bonus), all green.
- **Did:** ported both handlers of doc §14's first CBM-blocked pair.
  1. **`AI_CBM_AttackDown`** (`data/battle_ai_scripts.s:277-281` + the
     shared `CheckIfAbilityBlocksStatChange` tail `:308-312`) into
     `factoryAiCheckBadMove.ts`, retiring the `unsupported-branch:
     factory-ai-check-bad-move` barrier for `EFFECT_ATTACK_DOWN`/`_2` only:
     `MIN_STAT_STAGE` ATK-stage short-circuit, then a genuine SECOND
     `get_ability AI_TARGET` draw site (Hyper Cutter, distinct from
     SpeedDown's zero-RNG `if_ability`/`check_ability` gate) ahead of the
     shared tail's own Clear Body/White Smoke draw — both sites reuse
     `nextGetAbilityDraw` unchanged, zero new RNG machinery (doc §14.2).
     Widened `FactoryAiCheckBadMoveTarget` with `atkStage`.
  2. **`AI_CV_AttackDown`** (`:1090-1123`) into `factoryAiCheckViability.ts`,
     same dispatch-before-barrier shape as the five predecessors: all 6
     gates (A-F) ported straight-line (Gate A's ATK-stage-6 short-circuit
     skipping B/C/DRAW1 entirely; B/D plain HP-threshold fallthroughs that
     never gate reachability; C gating DRAW1 to ATK stages 0-3; E/F's
     combined type1-or-type2-in-physical-list check, computed once since
     `get_target_type1/2` are pure zero-RNG reads, same simplification
     `classifyHighCritEffectiveness` already established), both
     `if_random_less_than 50` draw sites sharing the same jump-skips
     polarity every other ported roll uses. New finding beyond doc §14.1's
     own prose: DRAW SITE 1 and DRAW SITE 2 are **not** mutually exclusive
     — a target with ATK stage in [0,3] AND non-physical typing draws both
     in one pass (worst case -8 total), unit-tested explicitly. Widened
     `FactoryAiCheckViabilityBattler` with `atkStage`; `hp`/`maxHp` are now
     read on BOTH sides by one handler for the first time (Gate B reads
     AI_USER's own HP, Gate D reads AI_TARGET's).
  3. Repointed the stale `MOVE_GROWL`/`EFFECT_ATTACK_DOWN` pass-through
     fixtures across 3 test files (now genuinely ported, no longer a
     barrier) to `MOVE_HAZE`/`MOVE_TAIL_WHIP` (still-unported effects).
- **Test:** every gate and both draw sites of both handlers (28 CBM tests,
  81 CV tests, both files fully green): CBM's MIN_STAT_STAGE shortcut
  (both table effects), single-ability/known-ability zero-draw paths for
  BOTH draw sites, and the ambiguous two-ability 3-draw case (preamble
  soundproof + both AttackDown sites, corrected from an initial 2-draw
  miscount once the universal preamble's own soundproof guess was
  accounted for); CV's all 6 gates isolated one at a time, both roll sites'
  both outcomes, and the combined non-mutually-exclusive case. Engine-side
  reproduction of both §14.3/§14.4 twin fixtures through
  `chooseFactoryAiScoredDecision` at both banked seeds (1, 99): reach
  (Haunter, non-physical) draws exactly 4 check-viability rolls — one per
  identical Growl slot, matching doc §14.4's own `Cmd_if_random_less_than`
  +4 attribution exactly — control (Shuckle, physical) draws zero; both
  assert CBM/TryToFaint also draw zero (single-ability Levitate/Sturdy
  targets, confirming doc §14.2's fix live in engine code). **Acceptance
  bonus landed** (§14.5 item 2, not just time-permitting): §6's ORIGINAL
  `AI_CV_SpeedDown` fixtures (`[MOVE_STRING_SHOT, MOVE_GROWL x3]`) now
  reproduce end-to-end with the real Growl moveset instead of the
  `MOVE_SPLASH` substitute the SpeedDown block needed before this pair was
  ported — both Dugtrio/Shuckle are physical-type and single-ability, so
  all 3 Growl slots score a deterministic 0 through the newly-ported pair,
  identical total draw counts to the substitute-move block.
- **Next:** further CBM+CV pairs from the remaining 16 CBM-blocked
  `AI_CV_*` handlers (§4's own table); DRAW SITE 1 (`:1097`, the
  ATK-stage-already-changed branch) remains an unstaged 2-turn recipe, same
  as doc §7's own `AI_CV_AttackDown` entry — not attempted, ground truth
  unchanged; a CBM-branch-fires fixture (Score_Minus10 via a Clear-Body/
  Hyper-Cutter-ability physical-type target) is also still recipe-only per
  doc §14.6. `END3` registration remains the standing architectural gap
  blocking ENDTURN_ABILITIES's 3 scripted cases; ENDTURN_ITEMS1/2
  registration off the banked recipes; seam's turn-4
  `anchorOpponentAfterTurn4Hp` staging gap; remaining
  blocked-on-opcodes census rows.
- **Notes:** stayed inside scope — no other CBM/CV handler, no ENDTURN
  registration, no `docs/factory-ai-checkviability-ground-truth.md` or
  verify-script edits (side lane's own files this hour, read/run only), no
  seam/animation files. Barrier pin unaffected (see State) — no pin move
  needed since `unsupportedBranch(...)`-based tracking never covered these
  two modules. No PAPERCUT — the ambiguous-target draw-count miscount
  (forgetting the universal preamble's own soundproof draw) was caught by
  the test itself failing immediately, not a source of lost time.

---
## 468 — [SUPERVISOR WIND-DOWN 2026-07-26 ~05:30] session summary

- **State:** tree committed and green at **221 files / 2751 tests**, build
  green, census **79/214 effects, 163/355 moves, 128/276 Factory-L50**
  (session start: 76→79 came mid-session; true session start was 73/214,
  152/355, 118/276; all 25 census self-checks pass), single main worktree,
  zero unmerged branches, zero stale worktrees. **No DEFERRED entries —
  nothing blocks the next `run-supervisor.sh`.** No usage/rate limits all
  session (one worker died to an API connection drop mid-response, salvaged
  and relaunched cleanly — not a limit).
- **Session (~20 workers over 3 lanes, every outcome supervisor-verified
  live; 1 API-drop failure salvaged via scratchpad + relaunch):**
  - **Main (7 steps):** player-side forced-switch full-turn variant (461,
    entry 459's remainder — the `player-choice-required` fork is now a real
    decision boundary); Ingrain/Leech Seed/Wrap registered (462, census
    +3 effects/+8 moves, 18/18 live verify, two hit-chain barriers
    genuinely retired); Factory-AI CheckViability handler bodies ported
    4-for-4 against banked fixtures — SpeedDown CBM+CV pair (463),
    Pursuit + HighCrit (466), AlwaysHit (467), VitalThrow (468, the fifth
    and last CV-only handler, against §13's banked fixtures — HP-band
    truncating-percent gate + the shared speed-order plumbing, with the
    §13.1 target-faster polarity correction and the 50-roll's
    score/no-score polarity read directly off `Cmd_if_random_less_than`
    rather than §11.4's own unverified gloss; engine reproduces both §13
    fixtures' exact 4-vs-0 check-viability draw counts at both banked
    seeds), each with real assembly-quirk corrections pinned (HighCrit's
    1-or-2-draw cascade, AlwaysHit's ScoreUp1 fallthrough); EFFECT_ENDEAVOR
    registered (464,
    3 opcodes + 2 required widenings, census +3 effects/+3 moves);
    presentation-seam window 3 wired (465, `turn5-rockslide.json` 256/256
    ×2 from the real MOVE_ENDEAVOR kernel chain, 14-trace sweep clean,
    2 RAM-dump literals deleted).
  - **Side (7 steps, all merged):** `addbyte`/`jumpifbytenotequal` widened
    onto the shared SETBYTE universe (runtime weather-form loop executable);
    CheckViability scout with two supervisor-re-verified audit corrections
    (no "trivial 0-if_random" handlers exist; CBM blocks 17/22 CV handlers
    — only 5 are CV-only-portable); seam window 3 prep-scout (§9);
    CV fixtures for Pursuit/HighCrit (§11), AlwaysHit (§12, the salvaged
    relaunch), VitalThrow (§13, Battle-Armor crit-block design + §11.4
    polarity correction) — **all 5 CV-only handlers now have banked live
    ground truth, 8-fixture verify script ALL PASS ×2**; ENDTURN
    abilities/items ground truth (only 4 real ability cases; END3
    named as a real architectural gap, ITEMS1/2 recipe-banked).
  - **Animation (6 steps, all merged):** defect A KILLED in three
    instrument-first rungs — window-bounds hypothesis refuted (OAM
    byte-identical), real mechanism found (`objMode=1` hardware 50/50
    alpha blend, formula verified 26/26 pixels via a new DISPCNT-OBJ-off
    underlayer probe), fix landed → **MOVE_FUTURE_SIGHT promoted
    `exact` 114/114**; CONFUSION's OAM-shadow x-lag RAM-proven and fixed
    (108→137/140); **MOVE_PSYCHIC ported** (byte-identical script shape,
    137/140 first run); family window-1 boundary tick fixed (both
    CONFUSION and PSYCHIC now **138/140**), window-2 splice hypothesis
    tested and honestly refuted — a genuinely separate defect class.
    Coverage: **22 exact / 6 partial**.
- **Round-8 side merge (final step of the session, supervisor-verified
  ALL PASS live on the merged tree):** `AI_CBM_AttackDown` +
  `AI_CV_AttackDown` ground truth banked (doc §14) — the FIRST
  CBM-blocked pair, twin Growl fixtures isolating the physical-type-list
  gate (+4 delta, 100% `Cmd_if_random_less_than`, both seeds ×2), with a
  real confound caught and designed out (`Cmd_get_ability`'s ability-guess
  `Random()&1` fires for any two-ability species — use single-ability
  targets). Draw-site 1 (needs a 2-turn build) and a CBM-branch-fires
  fixture remain recipe-only. 10-fixture verify script ALL PASS ×2.
- **Next (in order):** main — port the `AI_CBM_AttackDown`+`AI_CV_AttackDown`
  pair (ground truth banked §14; also makes §6's original Growl fixtures
  engine-reproducible), then further CBM+CV pairs from the blocked 17;
  `END3` registration (architectural, needs its
  own design look) then ENDTURN_ABILITIES's 3 scripted cases;
  ENDTURN_ITEMS1/2 registration off the banked recipes; remaining
  blocked-on-opcodes census rows (DMGTOLEVEL, PSYWAVE, COUNTER/TYPECALC2,
  MIRRORCOAT, STOCKPILE, SETBIDE...). Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap (needs a turn-4 settle staging
  module, currently circular), seam-scout §9 items 1/5. Animation — the
  window-2 splice defect class (CONFUSION/PSYCHIC each 138/140, shared
  2-frame remainder, banked instrument evidence); PSYCHIC opposite
  orientation; next component track from `npm run animation:coverage`.
- **Notes:** PAPERCUTS +1 (raw before/after RNG-window diffs, Hits: 3).
  Supervisor process lessons recorded in memory: run worktree merges from
  the main tree only; never run suite/merges in the main tree while a
  main-lane worker is live; the launcher's "unauthenticated/sandboxed"
  trailer can misdiagnose an API drop (check spend/duration first);
  API-drop salvage via scratchpad-copy + relaunch brief worked cleanly.
