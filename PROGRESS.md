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

## 716 — [SUPERVISOR 2026-07-29 ~20:05] Slice 3 + Confuse pair folded; union green; round 9 (final) dispatched

- **State:** master green at **521 files / 5348 tests + 1 deliberate
  animation-lane skip**, production build, `git diff --check` clean, no
  orphan worktrees/branches, DEFERRED.md empty.
- **Did:** (1) verified + accepted resolution Slice 3 (`eae69a47`:
  targeted 122/122; staged 16/16, turn5/11 menus 42/56 re-run exact;
  generated turns now flow orchestrator→resolution→next command with §2.3
  boundary state). (2) verified + merged `worker/side-20260729-182316`
  (Confuse pair, doc §32): 64 L50 carriers, supervisor re-ran live verify
  4/4 PASS (control+reach, seeds 1/99, exact scores/PP-slots/RNG
  endpoints incl. the 70/50/30 HP gates). Census delta Own Tempo 7→9
  honest; executable census byte-identical.
- **Next:** round 9 (final full round) dispatched — main: design §4
  Slice 4 (faint + forced-party midpoint); side: Counter-vs-Swagger
  re-ranked CBM/CV pair. Then wind-down: fold re-check on
  animation-main, final union, session report. Slices 5-7 (send-out,
  terminal handoff + #39 retirement proof, 128-capture breadth) are the
  next session's ordered queue.
- **Notes:** 14 workers, 0 failed steps. CBM/CV program: SpDefUp, Sleep,
  Roar, Paralyze, Confuse done with two-seed live receipts each;
  remainder Counter/Swagger.

---

## 715 — [BOUNDED MAIN WORKER 2026-07-29 ~20:00] Battle-resolution Slice 3 landed

- **State:** implementation `eae69a47`; tree green at **521 files / 5332
  tests + 1 deliberate animation-lane skip**, production build, targeted
  Slice-3 acceptance **122/122**, and `git diff --check`.
- **Did:** trainer driving now returns one strictly ordered player+trainer
  transition receipt. A generated non-KO move replaces its submitting command
  UI with typed resolution, retains the genuine pending battle/request, and
  constructs the next command only after resolution plus the six-frame blank
  handoff. Persistent singles battler boundaries now own displayed HP/status,
  sprite visibility, idle epoch, PP, party identity, and move cursor; PP
  commits immediately, HP/status commit with their visible command, same-mon
  cursor/epoch survive, and only a switched battler resets. `core.ts` advances
  and renders this route.
- **Next:** dispatch `docs/battle-resolution-seam-design.md` **Slice 4 —
  faint and forced-party midpoint** verbatim; retain all Slice-3 regressions.
- **Notes:** pixels remain exact: staged OFF **16/16**, SAND_ATTACK **190/190**,
  menus 3-13 **254/254, 44/44, 42/42, 44/44, 93/93, 88/88, 111/111,
  83/83, 56/56, 46/46, 57/57**. Voluntary-switch rendering remains on its
  pre-Slice-5 compatibility path; no faint/forced selector/send-out/terminal
  rendering, trace/capture change, canonical-recording import, unsupported
  barrier, or battle/turn/absolute-tick branch was added. PAPERCUT: none.

