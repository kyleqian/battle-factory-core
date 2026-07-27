# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

---
## 491 — [BOUNDED WORKER 2026-07-26 ~23:50] Landed the DefenseUp/SpDefUp DRAW SITE 4/5 chain fix (entry 490's own finding) + whole-surface audit found and fixed a second instance in EvasionUp

- **State:** tree committed and green at **231 test files / 3195 tests**
  (+4 over entry 490's 3191), `npm run build` clean. Census re-run
  byte-identical (92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 checks pass, `git status --porcelain docs/
  executable-frontier-census.md` empty). `executableFrontierRatchet.test.ts`
  barrier counts unmoved (6/6 green, no new barrier). Three commits: the
  DefenseUp/SpDefUp fix, the EvasionUp fix, and the audit-doc update.
- **Did (RUNG 1):** fixed `runCvDefenseUp`/`runCvSpDefUp`
  (`factoryAiCheckViability.ts`) per entry 490's own sized recommendation:
  DRAW SITE 4's own failure (roll >= 60) no longer applies `-2` on the spot
  — it now chains into a second draw at DRAW SITE 5 (same `<60`-stops
  semantics), and `-2` fires only when BOTH rolls fail (`(196/256)^2 ≈
  58.65%`, not the old single-roll ~76.6%). Corrected both functions' own
  doc comments, which had claimed DRAW SITE 4/5 were "mutually exclusive"
  (the exact claim entry 490's probe disproved). Added three-outcome
  Tier-1 tests for both handlers (pass@4, fail@4+pass@5, fail@4+fail@5).
  **Mask-7 reconciliation (brief's own requested numbers):** the
  `AI_CV_DefenseUp`/`AI_CV_SpDefUp` mask-7 fixture-reproduction tests in
  `factoryAiScoredDecision.test.ts` previously hard-coded **4**
  check-viability draws (the "always 4" derivation entry 490 showed was
  wrong); re-run against the fixed handler at the same seed, all three
  physical-list fixtures now reproduce **7** draws (2+2+1+2 across the 4
  slots: fail+fail, fail+fail, pass, fail+pass) — inside the fixed model's
  own valid `[4,8]` range. This test's own RNG-stream offset is a
  construction convenience, not a replay of the live ROM's frame, so its 7
  does not need to equal the live probe's own 6 number-for-number, and the
  two don't need to reconcile against each other — what reconciles to
  **zero unexplained** is the mechanism itself: every draw count anywhere
  (live probe's 6, this test's 7, the `[4,8]` theoretical range) is now
  fully explained by "each of the 4 slots draws once (passes) or twice
  (fails and chains)," with no residual unattributed component, superseding
  the old comments' "EXACTLY 4" claim.
- **Did (RUNG 2 — whole-surface audit):** mechanically cross-checked all 46
  `if_random_less_than` sites across the 18 dispatched `AI_CV_*` handlers
  (of the file's 144 total) against their literal assembly fall-through,
  full table in `docs/factory-ai-draw-discrepancy-probe.md` §7.2. Found a
  SECOND, independent instance of the identical defect class in
  `AI_CV_EvasionUp`'s Gates C/D (DRAW SITE 3/4, `:1048-1050`) — ported
  (entry 489) as two mutually-exclusive single-draw sites keyed on the
  opponent's own HP band, but the real assembly chains DRAW SITE 3's own
  failure (roll >= 80, reached only when target is toxic-poisoned AND own
  HP <= 50%) straight into DRAW SITE 4's own roll, byte-for-byte the same
  shape as DefenseUp's bug. This is exactly the brief's own predicted
  highest-risk shape: `AI_CV_EvasionUp`'s one banked live fixture (§24.3)
  never sets target toxic-poison status, so it could never have exercised
  this branch at all — a fixture gap, not a probe gap, only findable by
  reading the assembly. Fixed the same way (chain + three-outcome tests:
  pass@3, fail@3+pass@4, fail@3+fail@4); the direct `own HP > 50%` entry to
  DRAW SITE 4 alone (unaffected, not part of the chain) stays as-is. Every
  OTHER site across all 18 handlers confirmed OK: either a self-contained
  deterministic `score`/`goto` action, or an already-correctly-modeled
  chain (`AI_CV_HighCrit`, `AI_CV_VitalThrow`, both already used the
  `jumpedToEnd`/fallthrough-roll pattern this step's fixes now also use).
  Confirmed the CBM side is genuinely if_random-free (`grep -c
  if_random_less_than` over `AI_CheckBadMove`'s own `:51-651` range = 0) —
  trivially clean of this defect class as the brief predicted, verified not
  assumed.
- **Next:** entry 490's own carried Next list stands, minus the item this
  step closed: weather trio (RainDance/SunnyDay/Hail, §25, last 3 of 22 CV
  handlers, explicitly out of THIS step's scope); §19.5's unstaged
  AccuracyDown sites 2-6 (now confirmed structurally safe by this step's
  audit — no chain risk there, just never independently live-verified);
  §24's own newly-surfaced follow-up from §7.4: a live oracle fixture for
  `AI_CV_EvasionUp`'s toxic-poisoned + own-HP<=50% branch does not exist
  yet in `tools/battle-lab/` — building one and rerunning §2's own
  `attribute-factory-ai-cv-drawsite-callers.py` probe (parameterized by
  `DRAW_SITE_TABLE`) against it would give this fix the same live
  corroboration `DefenseUp`/`SpDefUp` already have, but wasn't in this
  step's scope or time budget; ENDTURN_ITEMS2 after Yawn/Thrash.
- **Notes:** no PAPERCUT. Time split roughly matched the brief's guidance —
  rung 1 (fix + tests + reconciliation) landed at ~30min elapsed, leaving
  enough room to run the full rung-2 audit (not just a partial table with a
  named remainder) and land its own fix + tests green, with the doc/
  PROGRESS writeup absorbing the reserved tail.

---
## 490 — [BOUNDED WORKER 2026-07-26 ~23:45] §18/§22 "5-6 draws not 4" anomaly SOLVED by instrument — real engine gap found, not fixed (probe-only step)

- **State:** tree committed and green at **231 files / 3191 tests** (unchanged
  from entry 489 — this was an INSTRUMENT/PROBE step, no `src/` edits per
  scope), `npm run build` clean. Two new files only: `tools/probe/attribute-
  factory-ai-cv-drawsite-callers.py` and `docs/factory-ai-draw-discrepancy-
  probe.md` (does NOT edit `docs/factory-ai-checkviability-ground-truth.md`,
  side-owned this round, per brief).
- **Did:** attributed, by exact caller, the recurring "5-6 draws where the
  branch derivation predicts 4" anomaly first flagged at §18.4
  (`AI_CV_DefenseUp`) and recurring at §22.3-22.4 (`AI_CV_SpDefUp`).
  **Verdict: real engine port gap, not noise, not outside the AI-decision
  subsystem.** Extended the precedent probe
  (`attribute-factory-ai-random-callers.py`) with a second disambiguator:
  `gAIScriptPtr` (`battle_ai_script_commands.c:154`, EWRAM `0x0203ab38`)
  still points at the *start* of the firing `if_random_less_than`
  instruction at the moment `Random()` is entered (`Cmd_if_random_less_than`
  only advances it after the call returns) — reading it alongside the
  existing `cpu.lr` read resolves *which* of the AI script's 144
  `if_random_less_than` sites fired, closing the gap the old probe couldn't
  (its own caller resolution bottoms out at the one shared C function every
  site returns through). Root cause, confirmed BOTH by a raw ROM byte
  disassembly (`arm-none-eabi-nm` label addresses + manual opcode decode
  against `sBattleAICmdTable`) AND live single-step instrument evidence (5
  fixture runs, all `PASS`, all fully reconciled): `AI_CV_DefenseUp`'s DRAW
  SITE 4 (`if_random_less_than 60, ...End`, `:936`) does not cleanly
  terminate on failure — its fall-through target (`+6` bytes) is DRAW SITE
  5's *own* instruction (`:938`), byte-for-byte identical for `AI_CV_SpDefUp`
  (`:1011`/`:1013`). Reaching this branch means 1 draw (23.4%, site4
  succeeds) or 2 draws (76.6%, site4 fails and chains into site5) **per
  move-slot invocation** — 4 identical slots × 1-or-2 draws explains the
  5-8 realized range exactly (doc's observed 5-6/13-14 are ordinary draws
  from this distribution, not a second anomaly). Confirmed the ported
  `runCvDefenseUp`/`runCvSpDefUp` (`factoryAiCheckViability.ts:1528-1534`,
  `:1664-1670`) both draw once at DRAW SITE 4 and return unconditionally —
  missing the chain into DRAW SITE 5. This is a real behavioral gap, not
  cosmetic: under-draws `Random()` by 1 whenever site4 fails (~76.6% of the
  time reached), AND over-applies the -2 score penalty (port's ~76.6% vs
  the real ROM's ~58.65%, since BOTH rolls must fail for the penalty, not
  just the first) — a close-score tie could flip which move Factory AI
  picks. Sized the exact fix shape in the new doc §5 (shared-helper chain,
  matching both handlers' near-identical bodies) but did NOT implement it
  or touch the Tier-1 tests that currently pin the wrong "always 4" derived
  count — out of scope this step, flagged as next-step work. 5 live probe
  runs this session (all seed 1, window `0 732`, oracle `127.0.0.1:8014`):
  `defenseup-physicallastmove` (14 total, 6 handler draws, 4×site4+2×site5),
  `defenseup-lowhp-control` (14 total, same split, second independent
  fixture), `defenseup-nonphysicallastmove` (8 total, **0** handler draws —
  negative control, Gate F routes away entirely, confirms the probe doesn't
  fabricate a draw), `spdefup-cosmicpower-reach` (14 total, same 4×site4+2×
  site5 split, confirms the SAME shape on the second handler, not just
  derived by analogy), `spdefup-cosmicpower-control` (8 total, 0 handler
  draws, negative control mirrors DefenseUp's). All `known-outside`/
  `hit-chain-proc` caller composition matches §18.4's/§22.4's own prior
  (coarser) tables exactly — this doesn't contradict the old probe, it
  resolves what its shared-LR bucket actually was.
- **Next:** the sized fix from doc §5 — replace both handlers' single-draw
  DRAW SITE 4 block with the real draw4→(if fail)draw5→(if both fail)-2
  chain, likely as one shared helper given the two handlers' near-identical
  bodies (matching entry 489's own `runCvStatDown`-style precedent), then
  update the Tier-1 tests currently pinning the wrong "always 4" count.
  Otherwise entry 489's own carried Next list stands: weather trio
  (RainDance/SunnyDay/Hail, §25, last 3 of 22 CV handlers); §19.5's unstaged
  AccuracyDown sites 2-6; §24.5's unexercised `AI_CV_EvasionUp` draw sites;
  ENDTURN_ITEMS2 after Yawn/Thrash.
- **Notes:** no PAPERCUT. Time went almost entirely into the instrument
  design + root-cause derivation (byte-level ROM disassembly to compute
  exact DRAW SITE addresses ahead of the live run, so the single-step pass
  could positively classify every hit on the first try) rather than
  breadth — per the brief's own time-split guidance, this fully closes
  DefenseUp §18.4 AND, with budget left over, independently reproduces the
  identical finding on SpDefUp §22.3-22.4 live (not just derived by
  analogy), settling the "2-handler-wide, not a one-off" question the brief
  posed.

---
## 489 — [BOUNDED WORKER 2026-07-26 ~23:10] EvasionUp/EvasionDown CBM+CV pair ported (§24, eleventh pair — largest CV handler in the doc)

- **State:** tree committed and green at **231 files / 3191 tests** (+60 over
  entry 488's 3131), `npm run build` clean (`tsc -b && vite build`). Census
  **unchanged at 92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 self-checks pass** (reran
  `tools/report/executable-frontier-census.ts` live: byte-identical, `git
  status --porcelain docs/executable-frontier-census.md` empty — this
  AI-decision port touches `battle_ai_scripts.s`, not the effect-execution
  subsystem the census measures). `executableFrontierRatchet.test.ts`'s
  per-module barrier counts **unmoved** (6/6 green, no new barrier).
- **Did:** landed §24's full four-handler pair per its ground truth
  (`docs/factory-ai-checkviability-ground-truth.md` §24, merged prior round,
  supervisor-verified live). (1) `factoryAiCheckBadMove.ts`: added
  `runCbmEvasionUp` (bare 2-instruction MAX_STAT_STAGE-on-AI_USER's-own-stage
  gate, same shape as AttackUp/DefenseUp/etc — `EFFECT_MINIMIZE` shares this
  handler despite being blocked-on-opcodes for move execution, doc §24.7) and
  `runCbmEvasionDown` (reuses the existing shared `runCbmStatDownViaSharedTail`
  body verbatim, same shape as DefenseDown/SpDefDown — no dedicated
  evasion-immunity ability exists in Gen 3). Added optional `evasionStage?`
  to both `FactoryAiCheckBadMoveTarget` and `FactoryAiCheckBadMoveAttacker`
  (same `?? DEFAULT_STAT_STAGE` convention as `accStage`/`spDefStage`). (2)
  `factoryAiCheckViability.ts`: added `runCvEvasionUp` — the largest CV
  handler ported in this doc, 8 `if_random_less_than` sites, re-derived
  independently from the raw assembly per the brief (NOT copied from
  `AI_CV_AccuracyDown` despite the structural similarity) — three real
  divergences confirmed: DRAW SITE 1 has no Gate B companion (single 90%-HP
  gate, not AccuracyDown's own two-gate 70% shape); Gate A's own threshold is
  90 not 70; Gate I reads `AI_USER`'s own evasion stage, not `AI_TARGET`'s
  (operand flips because this is an UP handler on the opponent's own stat).
  Zero new `FactoryAiCheckViabilityBattler` fields needed — `evasionStage`,
  `isRooted`, `isToxicPoisoned`, `isLeechSeeded`, `isCursed` were all already
  present from §19's AccuracyDown port. Added `runCvEvasionDown`, confirmed
  byte-for-byte identical to DefenseDown/SpDefDown, reusing the shared
  `runCvStatDown` body with a new `"evasion-down-roll"` kind parameter. (3)
  `factoryAiDecisionPolicy.ts`: wired the two new optional CBM fields
  (`evasionStage` on both `targetForCbm`/`attackerForCbm`) — the CV
  construction sites needed **zero** changes, every field the new handlers
  read was already threaded through from §19's own wiring. **Construction-site
  grep performed** (`grep -rn "FactoryAiCheckBadMove(Target|Attacker)"` /
  `"runCheckViability("` across `src/`): confirms `factoryAiDecisionPolicy.ts`
  is the ONLY production construction site for each input type, and both are
  now fully wired — no repeat of entry 483's `spDefStage` gap. (4) Tests: 15
  CBM tests (both handlers' gate true/false/omitted/vestigial-effect cases),
  37 CV handler-level tests (all 8 EvasionUp gates/sites individually plus a
  6-draw non-mutually-exclusive composite, all 3 named §24.1 divergences
  explicitly proven, EvasionDown's DefenseDown-identical shape), 8 mask-7/
  mask-1 `chooseFactoryAiScoredDecision` end-to-end tests reproducing ALL
  FIVE §24 fixtures (policy-own draws: EvasionUp fullhp-reach/lowhp-reach =
  4 setup + 4 CV + 1 tie = 9 each, midhp-control = 4 setup + 0 CV + 1 tie = 5;
  EvasionDown lowhp-reach = 9, fullhp-control = 5 — the doc's own live window
  totals of 10/8/12/13/7 are a documented superset, same subset relationship
  every prior pair already established) plus a mask-1 CBM-wiring isolation
  test (entry-485 precedent: `AI_CV_EvasionUp` reads the same `evasionStage`
  under mask 7, so mask 1 was required to isolate the CBM-only -10 delta).
  60 tests total, following the §23 port pattern (entry 484) exactly.
- **Next:** only the weather trio remains (RainDance/SunnyDay/Hail, §25 —
  the last 3 of 22 CV handlers, out of this step's scope per the brief).
  Otherwise entry 485's own carried Next list stands: §19.5's unstaged
  AccuracyDown sites 2-6 (mixed movesets); §24.5's own 6 unexercised
  `AI_CV_EvasionUp` draw sites (same mixed-moveset/multi-turn-build obstacle
  class); §18 5-6-draw window discrepancy (`DefenseUp`/`SpDefUp`, probe
  candidate, sRandCount attribution); ENDTURN_ITEMS2 after Yawn/Thrash;
  presentation-seam program is fully closed (entry 488).
- **Notes:** no PAPERCUT. Time split held: CBM pair + CV EvasionDown + full
  CV EvasionUp (8-site handler) + all fixtures landed as one green rung
  inside the ~40-minute budget, so no partial-rung split was needed this
  session.

---
