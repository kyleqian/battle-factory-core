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
## 480 — [USER-DIRECTED 2026-07-26 ~19:20] Animation lane modularized: `src/animation/` + `tests/animation/` split out of the engine

- **State:** tree committed and green at **226 files / 3035 tests** (entry
  479's 225/3032 + the new boundary-ratchet file's 3 tests), build green.
  Pure mechanical move — zero behavior changes, all existing tests pass
  unmodified apart from import paths.
- **Did:** moved the 39 animation-lane-owned modules (per-move bodies +
  anim helpers + `sceneOnPresentation.ts`) from `src/engine/` to
  `src/animation/`, and their 34 test files (+ `factoryAnimationInventory`)
  to `tests/animation/`. Ownership was derived mechanically from merge
  history + consumer analysis: every moved module was imported only by
  `battleScene.ts`, `core.ts`, or sibling animation modules.
  `ballAnim`/`kabutoSendOut`/`magbySendOut`/`summaryFrontAnimation` stay in
  the engine (draft/send-out canonical flow, not animation-lane). Tools did
  NOT move (`tools/compare` is mixed shared/animation; recorded evidence
  commands stay rerunnable) — their imports were rewritten in place, as were
  path strings in `ANIMATION_COVERAGE.json`/`ANIMATION_PROGRESS.md` and the
  generated `battle-move-anim-scripts.json` (extractor updated to match).
  New `tests/animation/animationBoundaryRatchet.test.ts` pins the boundary:
  animation→engine imports allowed only for
  `battleMenu.ts`/`bg.ts`/`rng.ts` (shared infra); animation never imports
  the kernel/AI; engine consumes animation only from
  `battleScene.ts`+`core.ts`. Widening any list is an explicit decision.
- **Next:** unchanged from entry 479 (Counter/Mirror Coat etc.). This split
  is groundwork for the animation-lane-as-separate-supervisor plan the user
  is evaluating (see the directive note above); the animation lane itself
  stays paused.
- **Notes:** future animation work lives under `src/animation/**` +
  `tests/animation/**`; the per-move draw cases inside `battleScene.ts`
  remain the one shared surface (carving them into a registry is the named
  follow-up if the separate-supervisor plan proceeds).

---
## 479 — [SUPERVISOR WIND-DOWN 2026-07-26 ~15:50] session summary

- **State:** tree committed and green at **225 files / 3032 tests**, build
  green, census **90/214 effects, 185/355 moves, 148/276 Factory-L50,
  1830/2957 weighted** (all 32 self-checks pass; session start was 79/214,
  163/355, 128/276, 1573/2957 with 25 checks — the census is also
  MORE HONEST now: 4 false positives fixed via ISSUES #45's classifier fix,
  so the true frontier delta is larger than the headline numbers). Single
  main worktree, zero unmerged branches, zero stale worktrees, clean
  `git status`. **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** No usage/rate limits at any point; all 19 workers
  ran to completion (zero cap-kills, zero API drops, zero failed steps).
- **Session (10 rounds / 19 workers over 2 lanes — animation paused by user
  directive; every step supervisor-verified live: side branches verified in
  their own worktrees with my own verify-script reruns before every merge,
  suite+build rerun on every merged tree):**
  - **Factory-AI CheckViability track:** EIGHT CBM+CV pairs ported —
    AttackDown (§14), DefenseDown+SpDefDown (§15/§16), AttackUp+DefenseUp+
    BulkUp (§17/§18), AccuracyDown (§19, all 7 draw sites), SpeedUp+SpAtkUp
    (§20/§21) — 14 of 22 reachable CV handlers now live with CBM
    counterparts, each against side-staged twin-fixture ground truth
    (ledgers at both seeds ×2, draw-site attribution, six sibling-copy/
    prose traps caught by assembly re-derivation). §6's original SpeedDown
    fixtures now reproduce end-to-end through the engine.
  - **End-turn track:** ENDTURN_ITEMS1 registered (REMOVEITEM + Leftovers/
    8 cure berries/White Herb, live-verified to the exact frame); **END3
    registered** (design-scout → registration pipeline; callback-stack
    model, Cmd_end3 pops both stacks) with ENDTURN_ABILITIES completed —
    Speed Boost, Rain Dish, Shed Skin, Truant all wired (barrier set now
    EMPTY); stretch stat-up berries (Liechi/Salac/Petaya) landed.
    ENDTURN_ITEMS2 stays correctly unregistered (Yawn/Thrash prerequisite).
  - **Census clusters:** primary status cluster registered — EFFECT_SLEEP/
    TOXIC/POISON/PARALYZE/CONFUSE (+ bonus SNORE/FACADE) via
    SETEFFECTPRIMARY + 4 jump opcodes + jumpifability/JUMPIFSTATUS2
    widenings; fixed-damage cluster registered — EFFECT_LEVEL_DAMAGE/
    PSYWAVE/BRICK_BREAK via DMGTOLEVEL/PSYWAVEDAMAGEEFFECT/TYPECALC2
    (pure immunity gate, no scaling)/REMOVELIGHTSCREENREFLECT.
  - **Census hygiene:** ISSUES #45 filed AND fixed same-session (4 false
    positives — classifier now knows SETEFFECTPRIMARY; POISON_FANG
    corrected the other way; self-checks 25→32).
  - **Design bank for next session:** `docs/counter-retaliation-design.md`
    (Counter/Mirror Coat: 4 new flat protect-damage fields + turn clear in
    `mapFaintedActionsResult`'s no-fainted branch, 8-step checklist) +
    **ISSUES #46** (the missing ProtectStruct per-turn clear is a LATENT
    staleness bug in landed admission mechanics, not just a Counter
    blocker).
- **Next (in order):** Counter/Mirror Coat registration per
  `docs/counter-retaliation-design.md` §4 + ISSUES #46 (also fixes the
  latent clear bug; +54 weighted); SpDefUp/CosmicPower/CalmMind pair
  (staging groundwork flagged in entry 477's side-merge note: separate CBM
  handlers `:576-593`, Gate F `if_in_bytes` INVERTED vs DefenseUp); then
  LightScreen/Reflect/EvasionUp/EvasionDown/weather-trio pairs (the last 8
  of 22 CV handlers); §19.5's unstaged AccuracyDown sites 2-6 (need mixed
  movesets); entry 476's §18 5-6-draw window discrepancy (probe candidate,
  sRandCount attribution); ENDTURN_ITEMS2 after Yawn/Thrash. Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap and seam-scout §9 items remain
  carried from entry 468 (untouched this session; the AI/census tracks were
  prioritized). Animation — still paused per the user directive at top;
  entry 468's animation items stay deferred, not abandoned.
- **Notes:** zero PAPERCUTS flagged by any of the 19 workers (a first).
  Supervisor process: the cwd-in-worktree self-merge trap fired once during
  a fold (caught immediately, zero loss — branch merged cleanly from the
  main tree; memory updated with the refined merge-block-starts-with-cd
  rule). Oracle services stayed fresh all session
  (`check-oracle-freshness.sh` PASS at start).

---
## 478 — Seventh + eighth CBM-blocked pairs ported: `AI_CBM_SpeedUp`+`AI_CV_SpeedUp` (doc §20, mandatory) and `AI_CBM_SpAtkUp`+`AI_CV_SpAtkUp` (doc §21, expected)

- **State:** tree green at **225 files / 3032 tests** (+0 files/+36 tests
  over entry 477's 225/2996), build green (`tsc -b && vite build`). Ratchets
  **unmoved**: `executableFrontierRatchet.test.ts` (no new opcode — this
  session only touches `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`/
  `factoryAiDecisionPolicy.ts`, none opcode-barrier-tracked) and
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin (106,
  unchanged). Doc's own verify script
  (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
  READ/RUN-only, untouched): **PASS ×2** against the live oracle (before
  touching source, and again at the end) — unaffected either way, as
  expected; both new pairs' fixtures reproduce the doc's own §20.3/§21.3
  live ledgers exactly (SpeedUp 10/10 reach vs 6/6 control; SpAtkUp 10/10 vs
  8/8, both cross-seed-stable).
- **Did (one commit, green):**
  1. **`AI_CBM_SpeedUp`/`AI_CBM_SpAtkUp` port** (`data/battle_ai_scripts.s:
     257-259`/`:261-263`): bare 2-instruction `MAX_STAT_STAGE` gates on
     `AI_USER`'s own SPEED/SPATK stage, byte-for-byte the same shape as
     `AI_CBM_AttackUp`/`AI_CBM_DefenseUp` (entry 476) with the stat swapped
     in. `FactoryAiCheckBadMoveAttacker` gained two new **optional**
     `speedStage`/`spAtkStage` fields defaulting to `DEFAULT_STAT_STAGE` —
     same "optional, so no pre-existing literal needs touching" precedent
     entry 477's `accStage` established, chosen over entry 476's own
     required-field precedent because this type's existing two fields
     (`atkStage`/`defStage`) were required only because the type was brand
     new at the time; widening it further without defaults would have
     forced every AttackUp/DefenseUp/BulkUp test literal to add two
     irrelevant fields.
  2. **`AI_CV_SpeedUp` port** (`:956-965`, doc §20.1): the SAME
     `if_target_faster` gate + `GetWhoStrikesFirst` tie-break machinery
     `AI_CV_SpeedDown` (§6) already ports — doc §20.1's own finding that
     this pair's true structural sibling is SpeedDown, not AttackUp/
     DefenseUp, confirmed by re-deriving the assembly independently rather
     than assumed. Only the fallthrough score differs (+3 vs SpeedDown's
     own +2); the deterministic branch's -3 is identical in both.
  3. **`AI_CV_SpAtkUp` port** (`:967-983`, doc §21.1): byte-for-byte
     `AI_CV_AttackUp`'s own gate topology (§17.1) with `STAT_SPATK` for
     `STAT_ATK`, **except DRAW SITE 3's threshold is 70, not AttackUp's own
     40** (doc §21.1's own citation-level correction against a naive
     "same shape as a sibling" copy — a numeric-operand trap, not a branch-
     direction one). Factored the shared gate topology into a new
     `runCvAttackStyleStatUp` helper (parameterized by the draw-kind labels
     and DRAW SITE 3's threshold) and refactored `runCvAttackUp` to call it
     with threshold 40 — same "shared body, per-caller parameter" precedent
     `runCvStatDown` already established for DefenseDown/SpDefDown (entry
     475), chosen here because SpAtkUp's topology match to AttackUp is
     total (unlike AttackUp/DefenseUp's own genuine Gate C divergence,
     which is why THOSE two stayed separate functions). AttackUp's own
     pre-existing unit/reproduction tests passed unchanged after the
     refactor, confirming no behavior drift.
  4. **Wiring + tests**: `FactoryAiCheckViabilityBattler` gained an
     **optional** `spAtkStage` field (same default convention). Unit tests
     cover every gate × outcome × draw count for both CBM handlers (MAX_
     STAT_STAGE fired/not-fired/omitted-defaults-to-neutral) and both CV
     handlers (SpeedUp: Gate A both branches, DRAW SITE 1 both outcomes,
     the speed-tie burn; SpAtkUp: Gates A/B/D, DRAW SITE 1/2/3 incl. the
     corrected threshold's own succeed/skip split at the SAME seed values
     AttackUp's own tests use — proving the two sites are NOT
     interchangeable rather than assuming it). Engine reproduction of doc
     §20.3's twin fixtures (species-role-swap Crobat/Shuckle, both
     single-ability, all 4 slots `MOVE_AGILITY` vs `MOVE_SPLASH`, post-
     turn-1 SPEED stage 8 constructed directly per this file's own
     "construct the decisive state" precedent) and §21.3's twin fixtures
     (Anorith/Machamp, `MOVE_GROWTH`, reused verbatim from entry 476's own
     AttackUp block) through `chooseFactoryAiScoredDecision`, both seeds:
     reach draws exactly **4** check-viability draws for both pairs
     (matching the doc's own live +4 `Cmd_if_random_less_than` attribution
     exactly), control draws deterministic **zero** for both — no CBM/
     TryToFaint draws in either fixture (both target species single-
     ability, closing the doc §20.2/§14.2 ability-guess confound).
- **Next:** pick up `AI_CBM_SpDefUp`/`AI_CBM_CosmicPower`/`AI_CBM_CalmMind`
  (unstaged per entry 477's own groundwork flag — separate handlers at
  `data/battle_ai_scripts.s:576-593`, Gate F's `if_in_bytes` is INVERTED vs
  DefenseUp's own) or the next unstaged CV-only/CBM-blocked pair from
  `docs/factory-ai-checkviability-ground-truth.md`'s remaining phased body
  of work. Carried forward, unchanged from prior entries: LightScreen/
  Reflect/EvasionUp/EvasionDown/weather-trio handler pairs (not yet staged);
  Counter/Mirror Coat retaliation-bookkeeping registration per
  `docs/counter-retaliation-design.md` §4's 8-step checklist + **ISSUES
  #46** (the latent turn-boundary staleness bug); `ENDTURN_ITEMS2`'s own
  Yawn/Thrash prerequisite (unregistered, entry 475's own finding); doc
  §19.5's 5 unstaged draw-site recipes (sites 2-6, DRAW SITE 2 is the
  cheapest — needs only the player's own real accuracy-lowering hits, no
  opponent moveset change); entry 476's own flagged §18 5-6-draw window
  discrepancy (this port's own branch-by-branch derivation says `AI_CV_
  DefenseUp`'s physical-route contribution is exactly 4, not the doc's raw
  5/6 — still unreconciled, needs a `tools/run-mgba-probe.py` single-step).
  This was this session's own final bounded worker step (40-minute cap) —
  landing here at a clean, small, fully-green resting point rather than
  reaching for extra scope.
- **Notes:** stayed in scope — no other handler pair (SpDefUp/CosmicPower/
  CalmMind correctly left unstaged), no ENDTURN/status-cluster/fixed-damage/
  Counter files, no seam/animation files, doc + verify script read/run only
  (2 runs against the live oracle, PASS both times), no ROADMAP/ISSUES
  edits. No PAPERCUT — doc §20/§21's own citations (exact line numbers, the
  SpeedDown-not-AttackUp sibling correction, the DRAW SITE 3 threshold
  correction) were precise enough that every gate ported cleanly on first
  read and every unit/reproduction test passed on first run; the
  `runCvAttackUp`/`runCvStatDown` refactor precedent-matching was the only
  design decision that took real thought, not a source-reading surprise.

---
## 477 — Sixth CBM-blocked pair ported: `AI_CBM_AccDown` + `AI_CV_AccuracyDown` (doc §19, largest handler in this doc — 7 `if_random_less_than` sites)

- **Side merge (same round, supervisor-verified ALL PASS live from the
  worktree + green on the merged tree):** doc **§20 `AI_CBM_SpeedUp` +
  `AI_CV_SpeedUp`** and **§21 `AI_CBM_SpAtkUp` + `AI_CV_SpAtkUp`** ground
  truth banked (branch `worker/side-20260726-145534`, merged, worktree
  removed). SpeedUp's true sibling is SpeedDown §6 (relative-Speed gate,
  species-role swap: Crobat/Shuckle) not the HP-band pairs; SpAtkUp is
  AttackUp's shape with DRAW SITE 3's constant 70 vs 40 (citation-level
  correction to a naive copy). **Doc-wide confound catch:** CBM's
  UNCONDITIONAL Soundproof-check prologue (`:47-58`) draws `get_ability`
  for ANY dual-ability species independent of handler bodies — single-
  ability species now a hard fixture rule (§20.4). Ledgers: SpeedUp 10/10
  reach vs 6/6 control; SpAtkUp 10/10 vs 8/8; clean +4 attributions.
  SpDefUp stretch not staged; groundwork flagged: separate
  `AI_CBM_CosmicPower`/`AI_CBM_CalmMind` handlers (`:576-593`) and Gate F
  `if_in_bytes` INVERTED vs DefenseUp's — the next scout's trap list.
  24-fixture verify script ALL PASS ×2 (worker) + once by the supervisor.
  Merged tree: **225 files / 2996 tests + build green.**

- **State:** tree green at **225 files / 2996 tests** (+0 files/+35 tests
  over entry 476's 225/2961), build green (`tsc -b && vite build`). Ratchets
  **unmoved**: `executableFrontierRatchet.test.ts` (no new opcode — this
  session only touches `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`/
  `factoryAiDecisionPolicy.ts`, none opcode-barrier-tracked) and
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin (106,
  unchanged). Doc's own verify script
  (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
  READ/RUN-only, untouched): **PASS ×2** (before touching source, and again
  at the end) — unaffected either way, as expected.
- **Did (four commits, all green):**
  1. **CBM port** — `AI_CBM_AccDown` (`data/battle_ai_scripts.s:300-312`):
     MIN_STAT_STAGE gate on the target's own ACC stage, then a genuine
     SECOND `get_ability AI_TARGET` draw site for `ABILITY_KEEN_EYE`
     (confirming the brief's own speculation live — the same two-draw-site
     shape `AI_CBM_AttackDown` already established for Hyper Cutter), then
     the shared `CheckIfAbilityBlocksStatChange` tail (Clear Body/White
     Smoke). Dispatches both `EFFECT_ACCURACY_DOWN` and the vestigial
     `EFFECT_ACCURACY_DOWN_2` (confirmed zero real moves in the generated
     move table, source-faithful dispatch anyway). `accStage` added to
     `FactoryAiCheckBadMoveTarget` as **optional** (default
     `DEFAULT_STAT_STAGE`), same precedent as `lastUsedMoveId` — no
     existing test literal needed touching.
  2. **CV port** — `AI_CV_AccuracyDown` (`:1198-1234`), the largest handler
     in this doc (7 draw sites): Gates A/B feed DRAW SITE 1 (either
     battler's own HP band, two independent routes); Gate C (opponent's own
     ACC stage `>4` skips) feeds DRAW SITE 2; Gates D/E/F/G (target
     toxic-poison/leech-seed/**opponent's own** rooted/target cursed) each
     independently gate their own draw site in a straight-line body — a
     genuine live finding beyond the doc's own gate-map prose: NONE of the
     six `score` statements after DRAW SITEs 1-6 is followed by a `goto`, so
     all six sites are evaluated regardless of any earlier gate's/draw's
     outcome (verified directly from the raw assembly, not assumed from the
     doc's summary). Then Gate H (opponent HP>70%) and Gate I (target's own
     ACC stage back at neutral) offer the tail's two clean stops before
     Gates J/K gate DRAW SITE 7 — whose roll polarity is the OPPOSITE of
     every other site in this handler (fallthrough applies the `-2`, the
     jump is the no-op). Widened `FactoryAiCheckViabilityBattler`/
     `FactoryAiScoredBattlerView` with four new **optional** status flags
     (`isToxicPoisoned`/`isLeechSeeded`/`isRooted`/`isCursed`, each
     defaulting `false`), cited to their exact `Cmd_if_not_status`/`2`/`3`
     source bits (`STATUS1_TOXIC_POISON` bit 7, `STATUS3_LEECHSEED` bit 2,
     `STATUS3_ROOTED` bit 10, `STATUS2_CURSED` bit 28) per the brief's own
     ask to reconcile against the C source.
  3. **Unit tests** — every gate × outcome × exact draw count for both
     handlers (CBM: MIN_STAT_STAGE short-circuit, Keen Eye single/known/
     ambiguous-two-ability shapes, Clear Body/White Smoke shared-tail
     shapes; CV: both real dispatch moves, Gates A/B's two routes, Gate C,
     Gates D-G proven NOT mutually exclusive — all four, then all five with
     Gate F, firing together in one pass — Gate H/I's two clean stops incl.
     Gate I's live doc §19.1/§19.2 finding that a target ACC stage already
     lowered by this SAME dispatch move this turn does NOT stop the tail,
     Gates J/K's deterministic `-2` with its documented real overlap
     against Gate A/B's own thresholds, and DRAW SITE 7's opposite
     polarity). The 5 structurally-unstageable sites (2-6, doc §19.5) get
     their coverage from the assembly's own semantics, exactly as the brief
     asked, since no single-turn HP/PP recipe can reach them live.
  4. **Engine reproduction** — doc §19.3/§19.4's twin fixture (Machamp,
     single-ability Guts, 4× Sand Attack vs. Anorith, single-ability Battle
     Armor) through the real `chooseFactoryAiScoredDecision` dispatcher,
     both seeds: reach (Machamp 69.7% HP, Anorith's own ACC stage already 5
     from this same dispatch move's own prior hit) draws exactly **8**
     check-viability draws (DRAW SITE 1 + DRAW SITE 7, 4 identical slots
     each) with zero CBM/TryToFaint draws, matching the doc's own
     `Cmd_if_random_less_than` **+8** attribution exactly; control (Machamp
     100% HP) draws deterministic **zero**. Reconciled against the doc's own
     17/7 full-window `Random()` totals: this policy's own scope (setup 4 +
     tie 1 + check-viability N) is 13/5, a documented SUBSET — `BattleTurnPassed`'s
     turn-order draw and both real moves' own `Cmd_accuracycheck`/
     `Cmd_seteffectwithchance` rolls happen outside the AI's own
     move-scoring function, same reconciliation shape entry 476's own
     `AI_CV_DefenseUp` reproduction already established.
- **Next:** pick up the next `AI_CV_*`/`AI_CBM_*` handler pair (this doc's
  own remaining phased body of work, ~79 effects still table-only per the
  audit's §3), or stage one of doc §19.5's 5 documented recipes (sites 2-6,
  each needs a genuine mixed-moveset AI *pick*, not this doc's
  "identical-4-slots" trick — DRAW SITE 2 is the cheapest, needing only the
  **player's** own real accuracy-lowering hits on the opponent, no opponent
  moveset change at all).
- **Notes:** stayed in scope — no other handler pair, no ENDTURN/status-
  cluster/fixed-damage/Counter files, no seam/animation files, doc + verify
  script read/run only (2 runs, PASS both times), no ROADMAP/ISSUES edits.
  No PAPERCUT — the doc's §19 citations (exact line numbers, the
  non-mutual-exclusivity of Gates D-G, DRAW SITE 7's reversed polarity, the
  exact status-flag source bits) were precise enough that every gate ported
  cleanly on first read and every unit test passed on first run.

