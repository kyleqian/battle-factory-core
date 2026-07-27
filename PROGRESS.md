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
## 481 — [USER-DIRECTED 2026-07-26 ~20:00] Separate animation supervisor stood up: `--lane animation` launcher, `animation-main` branch + persistent worktree, session-boundary merge protocol

- **State:** tree committed and green (226 files / 3035 tests, build green —
  unchanged from entry 480; this step is launcher + docs + branch plumbing,
  zero engine/test changes). New branch `animation-main` created at this
  commit with its persistent worktree at `.worktrees/animation-main`
  (npm deps installed, `reference` symlinked, suite green in the worktree).
- **Did:** `run-supervisor.sh` gained `--lane main|animation`: the animation
  lane bootstraps/reuses the persistent worktree, cds into it, gates on
  `ANIMATION_DEFERRED.md` (new, lane-scoped — DEFERRED.md no longer blocks
  animation sessions or vice versa), ensures only the Battle-Scene-ON
  oracle, defaults `POKEBENCH_ORACLE_URL` to ON, and launches with an
  animation-specific prompt pointing at `ANIMATION_SUPERVISOR.md` (new
  guide). Both supervisors may run concurrently, either provider
  (`--provider claude|codex` orthogonal to `--lane`). Merge protocol
  (recorded in both guides): inbound `master`→`animation-main` by the
  animation supervisor at its session start; outbound
  `animation-main`→`master` only by the main supervisor at orient (git
  itself blocks the animation worktree from writing `master` while the main
  tree has it checked out). Worker launching needed zero changes —
  `tools/run-subagent.sh` self-scopes to the tree it's invoked from (lane
  locks, worktrees, branches all base off `animation-main` there).
  SUPERVISOR.md's pause note replaced with the permanent split protocol +
  fold-at-orient instruction; main launcher prompt updated to match.
- **Next:** main program — unchanged (entry 479's list: Counter/Mirror Coat
  per `docs/counter-retaliation-design.md` + ISSUES #46 first). Animation
  program — entry 468's deferred items, now via
  `./run-supervisor.sh --lane animation`: window-2 splice defect class
  (CONFUSION/PSYCHIC each 138/140), PSYCHIC opposite orientation, next
  coverage track from `npm run animation:coverage`.
- **Notes:** the per-move draw cases inside `battleScene.ts` remain the one
  shared surface; carving them into a registry consumed via
  `sceneOnPresentation.ts` is the named follow-up if fold conflicts ever
  stop being boring. First animation session will hit the
  `ANIMATION_PROGRESS.md` layout note (entry 480) for the new paths.

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
