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

## 719 — [BOUNDED MAIN WORKER 2026-07-29 ~20:00] Slice 5 semantic checkpoint landed

- **State:** implementation `4727bbf8` + `b297345b`; focused Slice-5
  acceptance **108/108**, full suite green at **525 files / 5378 tests + 1
  deliberate animation-lane skip**, production build and `git diff --check`
  green.
- **Did:** `Cmd_switchinanim` now emits the narrow provenance-bearing
  `switch-in-animation { battler, partyIndex }` event. Confirmed forced
  selection crosses the ordinary battle reducer; the driven continuation
  receipt (party summary, switch, frozen `Go! <species>!`, summary hide,
  switch-in marker, next boundary) appends as segment 2 under the original
  resolution ID. Invalid/missing markers and non-monotonic continuation
  sequences fail closed.
- **Next:** finish Slice 5 from this honest checkpoint: consume the appended
  segment in typed presentation; source-compose arbitrary forced-party
  rows/icons; render generic player/opponent summary, ball/species,
  healthbox, and six-frame next-menu handoff; only then remove the
  ONIX/MAGBY/BAYLEEF guard. Opponent switch text also needs a frozen trainer
  class/name substitution. Slices 6-7 remain untouched.
- **Notes:** all new rows exact: switch-in/send-out/delayed/Turn-16
  **242/242, 195/195, 195/195, 175/175**. Every earlier §3.2 row through
  delayed party selection remains exact: staged **16/16**; menus
  **254,44,42,44,93,88,111,83,56,46,57**; stat/faint/fly/party
  **190,141,256,200,200**. The visual guard remains intentionally in place;
  no trace/capture change, canonical-recording import, unsupported barrier,
  terminal handoff, or battle/turn/absolute-tick branch was added.
  PAPERCUT: none.

---

## 718 — [SUPERVISOR 2026-07-29 ~20:45] Slice 4 + Swagger folded + 18-commit animation fold; union green; round 10 dispatched

- **State:** master green at **525 files / 5378 tests + 1 deliberate
  animation-lane skip**, production build, `git diff --check` clean, no
  orphan worktrees/branches, DEFERRED.md empty, `animation-main` fully
  folded (0 commits unfolded).
- **Did:** (1) verified + accepted resolution Slice 4 (`3b62f97c`+
  `291d3cde`: targeted 84/84; faint 141/141, fly-strike 256/256,
  party-select 200/200, staged 16/16 re-run exact; honest
  `sendOutElapsed: 0` checkpoint — send-out is Slice 5's). (2) verified +
  merged `worker/side-20260729-190052` (Swagger CV pair, doc §33, ranked
  over Counter after Confuse completed the shared CBM): supervisor re-ran
  live verify 4/4 PASS (9-draw endpoints, seeds 1/99); censuses unchanged
  and idempotent. (3) folded `animation-main` (+18: Rolling Kick, Low
  Kick, Whirlpool promoted exact; Brick Break evidence checkpoint; no
  "For the main program" asks); union suite/build green on the fold.
- **Next:** round 10 (time-boxed final round) dispatched — main: design §4
  Slice 5 (semantic switch-in + generic send-out, honest-subset fallback
  written into the brief); side: Counter CBM/CV or documented negative
  closure of the remainder. Wind-down immediately after: fold re-check,
  final union, session report. Slices 6-7 remain the next session's queue.
- **Notes:** 16 workers, 0 failed steps, 1 integrity correction (705).
  The animation supervisor may still be live; any post-fold tail is for
  the next orient.

---

## 717 — [BOUNDED MAIN WORKER 2026-07-29 ~19:35] Battle-resolution Slice 4 landed

- **State:** implementation `3b62f97c` + first-eligible-edge fix `291d3cde`;
  tree green at **521 files / 5349 tests + 1 deliberate animation-lane
  skip**, production build, targeted Slice-4 acceptance **84/84**, and
  `git diff --check`.
- **Did:** zero-HP plus faint events now project into typed, source-relative
  opponent tile-row or player pixel-row sink programs. The live Scene-OFF
  compositor removes the fainted sprite/healthbox, prints frozen resolved
  faint text, owns the wait cursor, and accepts the first eligible A edge.
  A genuine player forced-switch boundary remains pending throughout; only
  that dismiss edge constructs the existing request-owned selector and its
  relative battle→party fade. SEND OUT confirmation stops honestly at
  `sendOutElapsed: 0`; no continuation or send-out was implemented.
- **Next:** dispatch `docs/battle-resolution-seam-design.md` **Slice 5 —
  semantic switch-in and generic send-out** verbatim; retain the complete
  Slice-4 regression table.
- **Notes:** pixels remain exact: faint/party rows **141/141, 256/256,
  200/200, 200/200**; staged OFF **16/16**; SAND_ATTACK **190/190**; menus
  3-13 **254/254, 44/44, 42/42, 44/44, 93/93, 88/88, 111/111, 83/83,
  56/56, 46/46, 57/57**. No trace/capture change, canonical-recording
  import, unsupported barrier, semantic switch-in marker, terminal handoff,
  or battle/turn/absolute-tick branch was added. PAPERCUT: the long serial
  compare loop detached from captured output and required explicit reruns,
  ~2 minutes lost.

---
