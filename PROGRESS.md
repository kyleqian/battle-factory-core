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
## 513 — [BOUNDED WORKER 2026-07-27 ~12:35] B_SCR_OP_NEGATIVEDAMAGE + B_SCR_OP_TRYSETREST registered; EFFECT_ABSORB/EFFECT_DREAM_EATER/EFFECT_REST executable end to end

- **State:** tree green at **252 files / 3443 tests** (+2 files / +21 tests
  over session start 250/3422: new `battleScriptNegativedamageOpcode.test.ts`
  11 tests, new `battleScriptTrysetrestOpcode.test.ts` 10 tests; plus one
  `alreadyStatusedMoveAttempt` field-list assertion updated in
  `battleScriptRulesContext.test.ts`), `npm run build` clean.
  `executableFrontierRatchet.test.ts` unmoved (0 new barriers —
  `battleScriptSwitchinOpcode.ts`'s existing `various`-dispatch barrier stays
  pinned at 8; widening its modeled id set with a new case is not a new
  barrier).
- **Did:** per entry 509's handoff, in ranked order: (1) registered
  `B_SCR_OP_NEGATIVEDAMAGE` (`Cmd_negativedamage`,
  `battleScriptNegativedamageOpcode.ts`) — `gBattleMoveDamage =
  -(gHpDealt/2)`, min-1 clamp; verified (not assumed) that
  `Cmd_datahpupdate`'s negative-damage HP-gain branch
  (`battleScriptHitChainOpcode.ts:1985-2010`) was already source-exact and
  already correctly omits `hpDealt` on that branch — nothing to fix there,
  the new opcode is a clean 15-line read-halve-write. (2) registered
  `B_SCR_OP_TRYSETREST` (`Cmd_trysetrest`, `battleScriptTrysetrestOpcode.ts`)
  — reassigns `selectorRoles.target = attacker` (source's `gBattlerTarget =
  gBattlerAttacker`, so the shared `BattleScript_PresentHealTarget` tail's
  `BS_TARGET` heal lands on the right battler), full-HP fail jump,
  status1 unconditionally REPLACED (not OR'd) with `STATUS1_SLEEP_TURN(3)` —
  Rest cures any other status in the same write — synced to the party mirror
  + `set-battler-status-data` event exactly like `SetMoveEffect`'s own sleep
  write. Investigating the "already-asleep-under-Rest" fail nuance the brief
  flagged surfaced a real finding: choosing Rest directly while already
  asleep never reaches `BattleScript_RestIsAlreadyAsleep` — the script's own
  leading `attackcanceler` (`AtkCanceler_UnableToUseMove`'s `CANCELER_ASLEEP`
  case, `battle_util.c:2015-2058`) redirects to `BattleScript_MoveUsedIsAsleep`
  first, since Rest is neither Snore nor Sleep Talk — proven live in an
  isolated-dispatch test rather than assumed. `BattleScript_RestIsAlreadyAsleep`
  itself is real (only reachable via `Cmd_jumptocalledmove`, e.g. Sleep Talk
  picking Rest — unregistered, out of scope) and is exercised directly:
  widened the already-registered `various`-dispatch barrier
  (`battleScriptSwitchinOpcode.ts`) with `VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT`
  (23), backed by a new `alreadyStatusedMoveAttempt` rules-context field, so
  `setalreadystatusedmoveattempt` no longer halts.
- **Tests:** both new files pin exact rounding via isolated dispatch (even
  halving, odd truncation, the 0/1→-1 min-clamp, full-HP fail still writing
  `battleMoveDamage`/reassigning `target` per source's unconditional writes,
  the Poison→cured-by-Rest status1 replacement) AND full committed-script
  walks to genuine terminal ends: EFFECT_ABSORB/EFFECT_DREAM_EATER drain
  (target HP clipped to a small value so `gHpDealt` is deterministic
  regardless of the raw damage roll, pinning `floor(5/2)`/`floor(7/2)`
  end-to-end), EFFECT_DREAM_EATER-vs-awake-target (no negativedamage reached
  at all), EFFECT_REST success/cures-status/full-HP-fail, the
  attackcanceler-intercepts-first finding, and `BattleScript_RestIsAlreadyAsleep`
  itself. All real RNG ledgers (Rest draws none; Absorb/Dream Eater draw
  whatever damagecalc's own pipeline needs).
- **Census (before → after):** 97/214 → **100/214** effects, 195/355 →
  **201/355** moves, 157/276 → **162/276** Factory-L50 unweighted, 2108/2957
  → **2206/2957** weighted (+98, exactly NEGATIVEDAMAGE's 49 + TRYSETREST's
  49). Doc regenerated (`npx tsx tools/report/executable-frontier-census.ts`)
  and committed with the code. New top blocker:
  `B_SCR_OP_JUMPIFSTAT`/`B_SCR_OP_PLAYSTATCHANGEANIMATION` (5 effects —
  EFFECT_TICKLE/COSMIC_POWER/BULK_UP/CALM_MIND/DRAGON_DANCE, 45 weighted).
- **Next:** continue kernel census breadth: `B_SCR_OP_JUMPIFSTAT` +
  `B_SCR_OP_PLAYSTATCHANGEANIMATION` (45 weighted, 5 effects) is the
  regenerated doc's new top-ranked set. Stopped here deliberately (bounded
  worker, time budget) rather than start a 5-effect set without room to land
  it with the same full-committed-script-per-effect rigor.
- **Notes:** no PAPERCUT.

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

