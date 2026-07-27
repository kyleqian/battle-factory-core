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
## 512 — [SUPERVISOR 2026-07-27 ~12:10] round 5 verified + merged; round 6 dispatched

- **State:** master green at **250 files / 3422 tests**, build clean. Round
  5 landed: #47's per-slot funcResult value propagation (entry 511;
  supervisor reran suite/build + CV verify script ALL PASS on main tree;
  both §27 index-1 fixtures reproduce — deterministic Hail +1 in the carry
  case, genuine 4-way tie in the clean case; ISSUES #47 trimmed to only
  the 7 writes-conditionally predecessors' live-verification residual) ∥
  side §12 prep-scout banked (merged from `worker/side-20260727-113020`,
  cleaned): next window = `turn6-featherdance.json`, 90/90 re-pinned live
  (supervisor reran compare in-worktree), full input inventory + staged
  kernel-event proof + ordered wiring plan at doc §12.1-12.4.
- **Round 6 (dispatched):** main → `B_SCR_OP_NEGATIVEDAMAGE`
  (EFFECT_ABSORB/DREAM_EATER, 49 weighted, current top census blocker)
  then `B_SCR_OP_TRYSETREST` (EFFECT_REST, 49) per entry 509's handoff ∥
  side → live fixtures for #47's 7 writes-conditionally predecessors
  (§27.1 handlers 11, 15-17, 20-22; validate the shipped derived
  conditions as predecessor shapes; contradictions are findings, not
  fixes).
- **Next:** verify round 6; round 7 candidates = §12 wiring
  (turn6-featherdance, main) ∥ §24.5 sites 5/6/7 (side); then wind-down
  (deadline 15:28).

---
## 511 — [BOUNDED WORKER 2026-07-27 ~13:10] ISSUES #47 closed for its full write-audit scope: per-slot funcResult value propagation across the whole CV pass, driven by doc §27.1

- **State:** tree green at **249 files / 3414 tests** (+5 over session
  start 249/3409 — the 2 new §27 fixture reproductions x2 seeds each + 1
  banked tie-break-ledger test; zero existing-test churn, confirmed by a
  full pre-edit/post-edit `npm test` diff), `npm run build` clean.
  `executableFrontierRatchet.test.ts` unmoved (no new barriers — this was a
  pure value-derivation change, no new unsupported branches). Census
  re-run **byte-identical** (97/214 effects, 195/355 moves, 157/276
  Factory-L50, 2108/2957 weighted, `git status --porcelain docs/
  executable-frontier-census.md` empty).
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts` reran
  **ALL PASS** (49/49 checks, 0 failures) — every pre-existing check
  (§9-§26.4) plus the 2 new §27 movesetIndex-1 fixtures, all as ORACLE
  observations.
- **Did:** replaced `factoryAiDecisionPolicy.ts`'s first-scripted-slot-only
  `staleFuncResultFallback` with a full per-slot `AI_THINKING_STRUCT->
  funcResult` value simulation threaded across all 4 `AI_CheckViability`
  slots, driven directly by doc §27.1's exhaustive per-handler write audit
  (side lane's evidence pack from entry 510's round 4). `runCheckViability`
  (`factoryAiCheckViability.ts`) now returns `funcResultAfter` on every
  dispatch branch: the 13 writes-never handlers pass the running value
  through unchanged (added at the dispatch-shell call sites, no handler
  body touched); the 2 writes-always handlers (`AI_CV_Pursuit`,
  `AI_CV_AttackDown`) replace it with their own derived written value —
  re-read straight from the assembly (`Cmd_is_first_turn_for`/`Cmd_get_type`
  bodies), not assumed from the audit's prose — collision-mapped against
  `AI_WEATHER_*` 0-3 via a new `TYPE_ID_IN_WEATHER_RANGE` map (Channel 1's
  `ABILITY_ID_IN_WEATHER_RANGE`, now exported, is the exact same mechanism
  for ability writes); the 7 writes-conditionally handlers (`DefenseUp`/
  `SpDefUp`/`LightScreen`/`Reflect`/`SunnyDay`/`Hail`/`RainDance`) each
  derive their own written-or-passthrough value from the SAME branch state
  the handler's own score computation already reads (HP%, last-move
  power/type via `MOVES_BY_ID`, ability, weather) — including
  `AI_CV_RainDance`'s own Gate S ability-write feeding its own weather
  chain when reached, correctly modeled for the exit-value computation
  without perturbing its existing (deliberately simplified) score formula,
  so zero ledger churn. Every derivation traced against
  `reference/pokeemerald/data/battle_ai_scripts.s` and
  `src/battle_ai_script_commands.c`'s own `Cmd_*` bodies directly, not
  guessed — no sub-case was left unmodeled.
- **Tests:** new describe block in `tests/factoryAiScoredDecision.test.ts`
  reproducing doc §27's 2 live fixtures exactly —
  `mechanic-factory-ai-cv-hail-movesetindex1-writesnever-carry-off` (net
  -3/+1/0/0, Hail wins turn 1 deterministically, NO tie — the exact
  divergence entry 510/doc §27.4 confirmed live is now closed) and
  `...writesalways-clean-off` (net 0/0/0/0, genuine 4-way tie, unchanged);
  plus a banked tie-break-ledger test for the second fixture's own
  deterministic RNG outcome (seed 1 → slot 3, seed 99 → slot 1 — Hail
  winning THIS synthetic unit test's own fair tie is not evidence against
  the model, since it's a different RNG stream than the oracle's; the
  oracle's own 2 seeds separately landed on 2 different non-Hail slots,
  matching the same "genuine tie" conclusion). 13 existing direct-handler
  unit tests in `tests/factoryAiCheckViability.test.ts` needed their
  `toEqual` assertions extended with the new (correctly-derived)
  `funcResultAfter` field — pure additive assertions, no existing
  score/draw/rng expectation changed.
- **ISSUES #47 trimmed, not deleted:** the original symptom (per-slot
  funcResult unmodeled) is closed — all 22 ported `AI_CV_*` handlers now
  have a derived, implemented `funcResultAfter`. What remains: the 7
  writes-conditionally handlers' own derived conditions have not been
  live-oracle-verified with a fixture that places the weather move behind
  ONE OF THOSE SEVEN specifically (only a writes-never and a writes-always
  predecessor were staged this round; new fixture staging was out of scope
  for this step). Trimmed entry states this precisely as a named residual,
  not guessed, with a lead for the next fixture design.
- **Next:** round 6 candidates per entry 510 — main:
  NEGATIVEDAMAGE/TRYSETREST census sets ∥ side: §24.5 sites 5/6/7 or a
  #47-residual live fixture (weather move behind one of the 7
  writes-conditionally handlers) if prioritized.
- **Notes:** no PAPERCUT.

