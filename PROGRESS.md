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
## 534 — [BOUNDED WORKER 2026-07-27 ~20:28] EFFECT_CURSE registered end to end; +1 effect / +1 move / +18 weighted

- **State:** tree committed and green at **288 files / 3761 tests**;
  `npm run build` clean. Census regenerated to **127/214 effects, 250/355
  moves, 202/276 Factory-L50 distinct, 2566/2957 weighted (86.8%)**.
  The actual delta is the assigned **+1 effect / +1 move / +1 distinct /
  +18 weighted**, with all **42/42** census self-checks passing.
- **Did:** implemented source-complete generic handlers for
  `B_SCR_OP_JUMPIFTYPE2` (both type slots) and `B_SCR_OP_CURSETARGET`
  (already-cursed failure plus half-max-HP damage), then composed the committed
  `BattleScript_EffectCurse` through its existing selectors, stat reducers,
  damage path, and move-end events. Tier-1 walks reach genuine
  `B_SCR_OP_END` terminals for Ghost and non-Ghost users and pin exact
  HP/status2/stat-stage/event/PP/RNG behavior, including stat-limit failure,
  already-cursed, substitute, and random-target fallback boundaries.
- **Next:** supervisor verify/merge this completed step, then resume the ranked
  frontier at `B_SCR_OP_REMAININGHPTOPOWER` / `EFFECT_FLAIL`; RETURN and
  FRUSTRATION follow. End-turn Curse damage remains explicitly out of scope.
- **Notes:** `tests/executableFrontierRatchet.test.ts` is unchanged; no new
  unsupported barriers or canonical-recording imports. Battle Scene OFF oracle
  freshness was checked at baseline only; no oracle lifecycle action or
  recording-derived behavior. No PAPERCUT.


---
## 533 — [SUPERVISOR ORIENT 2026-07-27 ~20:12] animation fold + fresh green OFF-profile baseline

- **State:** union committed except for this ledger/test-fix step and green at
  **287 files / 3753 tests**; `npm run build` clean. Battle Scene OFF oracle
  is fresh at canonical SHA `9c89c741…f297`; census remains
  **126/214 effects, 249/355 moves, 201/276 Factory-L50, 2548/2957 weighted
  (86.2%)**. No deferred questions.
- **Did:** folded all 10 `animation-main` commits absent from `master`
  (`d0c04f8`: Spark framebuffer closure, CHARM exact, Scary Face partial +
  evidence). The union exposed one supervisor-only launcher-test leak:
  `POKEBENCH_ROLE=supervisor` was not scrubbed by
  `codexLauncherProfiles.test.ts`; its five subprocess checks are hermetic
  again. Restarted the stale port-8014 service and re-ran freshness, full
  Tier-1, and build on the union.
- **Next:** resume the ranked executable census with the `EFFECT_CURSE` pair
  while a file-disjoint side worker prepares the next staged OFF-profile
  presentation-seam evidence; verify/merge both, then continue with FLAIL and
  the banked §15 seam wiring.
- **Notes:** no executable-frontier ratchet or barrier change. No PAPERCUT.

---
## 532 — [USER-DIRECTED TOOLING 2026-07-27 ~20:10] Codex max mode added: Sol/ultra supervisor, all-Sol workers up to xhigh

- **State:** tree green at **285 files / 3740 tests** (+1 file / +5
  launcher-profile tests), `npm run build` clean; oracle Battle Scene OFF
  profile healthy. Gameplay/census state is unchanged from entry 531.
- **Did:** `run-supervisor.sh` now accepts `-M` / `--max-mode`, selects Codex
  automatically, and fixes the supervisor at `gpt-5.6-sol` / `ultra`. The
  profile propagates into `tools/run-subagent.sh`: every worker is locked to
  `gpt-5.6-sol`, defaults to `xhigh`, may be explicitly lowered, and rejects
  Claude/Terra or effort above xhigh. `-m` remains the existing model flag;
  uppercase `-M` is the non-breaking max-mode shorthand. The ordinary Codex
  Sol/high supervisor + tiered-worker profile remains unchanged.
- **Next:** resume entry 531's ordered gameplay work: ranked census descent
  (CURSE pair, FLAIL, RETURN/FRUSTRATION), then banked §15
  turn13-sandattack wiring and §16 prep-scout.
- **Notes:** hermetic launcher tests pin the long/short flags, resolved
  supervisor/worker profiles, inherited mode, lower worker effort, and
  Claude/Terra rejection. No executable-frontier ratchet or barrier changes.
  No PAPERCUT.

---
