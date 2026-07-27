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
## 488 — [BOUNDED WORKER 2026-07-26 ~22:30] turn-4 ROCK_SLIDE settle staged + wired — presentation-seam §9's last residual gap CLOSED

- **State:** tree committed and green at **231 files / 3131 tests** (+1
  file/+7 tests over entry 487), `npm run build` clean. Census unchanged
  (reran `tools/report/executable-frontier-census.ts` live: byte-identical,
  no diff — **92/214 effects, 187/355 moves, 150/276 Factory-L50, 1884/2957
  weighted, all 32 checks pass**); `executableFrontierRatchet.test.ts`'s
  per-module barrier counts unmoved (6/6 green, no new barrier — this step
  touches no unsupported-branch code). Two commits: `65f2f4d` (rung 1,
  staging module + tests) and the rung-2 wiring commit (`battleScene.ts`).
- **Did:** closed the ONE real remaining item of the presentation-seam §9
  program (entries 465/468/487's own named residual: `anchorOpponentAfterTurn4Hp`'s
  `from`-endpoint had no staged proof).
  - **Rung 1:** `src/engine/turn4RockSlidePresentationStaging.ts` (new),
    mirrors `turn1RockSlidePresentationStaging.ts` verbatim — stages a real
    Onix ROCK_SLIDE → Grovyle hit chain (41 → 1, 40 damage, non-crit,
    non-faint) through the unmodified `resolveRockSlidePresentationWindowContent`
    bridge. **The RNG seed (3051035979) is turn 4's own real recorded value**,
    not fabricated: derived from `battle1-grovyle-faint-ram-dump.json`'s own
    `rngLedger` (already committed/already imported for
    `anchorPlayerAfterTurn3Hp`/`anchorOpponentAfterTurn3Hp`) — specifically
    its four single-step entries at ticks 5316/5340/5343/5569 — independently
    corroborated by `battleScene.ts`'s own already-committed
    `drawTurn4KickoffText` doc comment, which separately cites the identical
    three ticks for accuracy/crit/damage-lock rolls. Staging it reproduces
    41 → 1 byte-identical, ending exactly at the ledger's own next recorded
    value. 7 new Tier-1 tests (event sequence, message content, hp-change
    endpoints, health-bar delta, bridge resolution, no faint-family event).
  - **Rung 2:** wired every mandatory consumer named in the brief —
    `drawTurn4RockSlideAttack`/`drawTurn4RockSlideTurnEndSettledMenu`'s
    `rockSlideOpponentHp`/`opponentHealthboxContentForHp` calls,
    `drawTurn4RockSlideWindow`'s attack text (now
    `TURN1_ROCKSLIDE_ATTACK_LINE1/2`, byte-identical content per §9.3 — it
    was still raw `ROCK_SLIDE_LINE1/2` literals), and **the residual gap
    itself**: `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp` `from`
    endpoint now reads the staged settle instead of the bare literal — not
    circular (the turn-4 module stages Grovyle's PRE-turn-4 hp and computes
    ITS OWN settle independently). Also did the OPTIONAL item:
    `drawMenuIdleBaseWithOpponentHp`'s `turn4Resolved` arm (turn2/turn3 arms
    untouched, per scope). `anchorOpponentAfterTurn3Hp`/`anchorOpponentAfterTurn4Hp`
    both kept (still read by turn 3's own window and `drawEndeavorSquish`'s
    steady-state read respectively — only the re-driven reads were retired).
  - Updated `docs/presentation-seam-scout.md` §9's own top status block with
    a second STATUS UPDATE note recording closure (matching entry 487's own
    precedent of correcting stale carried-forward summaries at the source).
- **Acceptance (all live this session, oracle `127.0.0.1:8014`):**
  `npm run compare -- turn4-rockslide.json --summary` **250/250** (recorded,
  `docs/battle-turn-notes.md`); regression sweep, **zero drops**:
  `turn5-rockslide.json` **256/256**, `turn1-rockslide.json` **256/256**,
  `turn5-faint.json` **110/110**, `turn4-doubleteam.json` **250/250**
  (confirmed pre-existing/unaffected by diffing against the rung-1 commit
  before any rung-2 edit — `docs/battle-turn-notes.md`'s own `249/249`
  mentions are stale copy-paste from an older trace revision, not a
  regression target), `turn4-menu.json` **44/44**, `turn3-rockslide.json`
  **256/256**.
- **Next:** presentation-seam §9 is now FULLY CLOSED — no more items in that
  program. Resume entry 485/487's own carried Next list: EvasionUp/
  EvasionDown/weather-trio pairs (last 6 of 22 CV handlers); §19.5's unstaged
  AccuracyDown sites 2-6; §18 5-6-draw window discrepancy (recurring for
  `SpDefUp` too, §22.3-22.4 — probe candidate, sRandCount attribution);
  ENDTURN_ITEMS2 after Yawn/Thrash; `SpDefUp`/§23 DRAW SITE recipe-only
  leftovers.
- **Notes:** no PAPERCUT. Sourcing the RNG seed from an already-committed
  asset (rather than a fresh/uncommitted probe, the pattern §9.1 flagged as
  a debt for the OTHER three turn-4/5 HP constants) is worth naming as a
  reusable technique for `anchorPlayerAfterTurn5Hp` if that one is ever
  tackled — it too may have a real ledger hiding in an already-imported
  fixture rather than needing a fresh probe.

---
