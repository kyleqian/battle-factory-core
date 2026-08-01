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

## 809 — [bounded worker, 2026-07-31 ~night] ISSUES #56 item 2 raw-clock/discriminator checkpoint; no unsafe presentation fit landed

- **State:** evidence commit `822522c7`; production `src/` is intentionally
  unchanged. Focused factoryBattleStartIntro/issue56ActionMenuHandoffFrame/
  battleScene/ratchet is **241/241**; full `npm test` is green (**567 files,
  5709 passed + 1 skipped**) and build is green.
- **Did:** RAM-valid OAM/task receipt pins interactive-generated-intro-off's
  real abs-1492 summary destroy to semantic handoff source `t=1459`, so
  `rawElapsed=31` exactly. Extended the reusable probe with source task and
  pending-OAM reads; at YOSHI's and interactive's terminal frames those
  source-owned lifecycle facts are identical even though their bar pixels
  require opposite tail clocks. MAGNETON remains genuinely bar/icon split.
  Added a hermetic route-replay Tier-1 pin for the handoff arithmetic and
  updated #56/docs with the non-landable verdict.
- **Next:** do not add a route/species/absolute-tick selector. A future
  #56 item-2 attempt needs a validated *hardware OAM/display-transfer latch*
  receipt that distinguishes the two synced cases before a typed per-widget
  bar/icon lifecycle can be populated; frame-444's separate materialize
  column shift remains out of this branch.
- **Notes:** fresh dense holds: interactive **715/715**, command **128/128**,
  YOSHI **700/751** (444 neighborhood **10/11**, 536 **16/16**), MAGNETON
  **703/751** (437 **11/11**). Removing the special case makes interactive
  1492 **9/9 → 8/9** (3px at 165,42–167,43), while improving YOSHI's bar
  subregion; no behavior change is honest. No ratchet pin moved and no
  unsupported branch was added.
- **PAPERCUT:** none.

## 808 — [bounded worker, 2026-07-31 ~night] ISSUES #61 DMA reveal boundary characterized; no unsafe global fix landed

- **State:** evidence commit `bc988ef9`; production code/tests unchanged,
  focused battle-menu/fight-submenu/command-presentation/battle-scene/ratchet
  suites green (**442/442**) and `npm run build` green. The worker process
  stalled after completing its turn and was terminated by the supervisor;
  committed evidence and the main tree remained clean.
- **Did:** committed two reproducible Battle Scene OFF RAM-watch specs and
  `docs/issue61-fight-submenu-reveal-boundary.md`. Source + RAM prove the
  reveal is the generic `HandleChooseMoveAfterDma3`/BG-copy-ready transition:
  initial, turn-2, and turn-4 openings need one busy poll, while turn 3 needs
  two. A global `<`/`<=` or delay change would repair frame 3852 but regress
  already-exact windows, so no turn/tick exception or speculative constant
  was added.
- **Next:** implement one command-presentation-owned DMA-ready reveal event
  (or faithful bounded BG-copy queue model), route legacy Scene-OFF renderers
  and input gating through it, then require turn 3 **255/255** with turns
  1/2/4 unchanged. If not taken immediately, continue #56 item 2; #62 stays
  separate retired-trace pixel debt.
- **Notes:** insurance remained exact for every committed turn-1/2/4 OFF
  trace; turn 3 remains the same single mismatch. No ratchet pin moved and no
  unsupported branch was added. No `animation-main` fold existed at orient;
  new animation commits arrived later and remain intentionally unfolded.
- **PAPERCUT:** Codex `exec` waited on already-closed stdin after the final
  tool event; ~10 minutes lost before the supervisor terminated the child.

## 807 — [bounded worker, 2026-07-31 ~night] ISSUES #60 typed Scene-OFF stat adapter crash fixed

- **State:** implementation commit `f1bc60a2`; focused vitest is green
  (**25/25**, including executable-frontier ratchet **6/6**), full `npm test`
  is green (**567 files, 5708 passed + 1 skipped**), and `npm run build` is
  green. This lean ledger/issue commit follows; no ratchet pin moved and no
  unsupported branch was added.
- **Did:** widened the generated-route typed Scene-OFF stat banner from only
  battler-0 drops to the reusable 2×2 matrix: battler 0/1 × rise/drop. The
  adapter consumes the typed source direction, all seven extracted palettes,
  and the affected battler's live sprite/origin; no battle/turn/tick routing
  was added. Tier 1 proves all four cases, the exact battler-1 EVASION 7→8
  reproducer, deterministic command completion, target-footprint ownership,
  and malformed/directionless guards.
- **Next:** ISSUES #61, then #56 item 2 per entry 806's ordered backlog. #62
  records the retired reproducers' separate pixel debt; do not revive them as
  canonical fixtures or extend the retired Battle-2 march.
- **Notes:** recovered both deleted traces from `01eac159` into a fresh `/tmp`
  directory and added explicit `oracleProfile: battle-scene-off` only to the
  scratch acceptance copies. Both now execute without throwing; compare is
  **0/77** (Endeavor) and **0/237** (Dragon Breath). The crash family is
  closed; the red pixels pre-existed it and remain out of this step's scope.
- **PAPERCUT:** concurrent worktree CPU contention stretched the full suite to
  431s, ~5 minutes slower than an uncontended run.
