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

---

## 714 — [SUPERVISOR 2026-07-29 ~19:25] Slice 2 + Paralyze pair folded; union green; round 8 dispatched

- **State:** master `18f31d25`+docs green at **521 files / 5332 tests + 1
  deliberate animation-lane skip**, production build, `git diff --check`
  clean, no orphan worktrees/branches, DEFERRED.md empty.
- **Did:** (1) verified + accepted resolution Slice 2 (`84374947`:
  targeted 322/322; staged 16/16, sandattack 190/190, turn3/8/13 menus
  254/88/57 re-run exact; renderer consumes typed commands only). (2)
  verified + merged `worker/side-20260729-175941` (Paralyze pair,
  `7c251fdc`+`c90631e4`, doc §31): 72 L50 carriers (ranked over Confuse
  64, Counter 42, Swagger 30), source-exact incl. the non-BUGFIX
  Ground/Flying quirk; supervisor re-ran the live verify — 4/4 PASS
  (control+reach on seeds 1/99, exact PP-slot choices and RNG endpoints).
  Census delta Limber 8→10 recorded honestly; executable census
  byte-identical.
- **Next:** round 8 dispatched — main: design §4 Slice 3 (orchestrator
  replacement + generated non-KO handoff, §2.3 boundary state); side:
  next CBM/CV pair (Confuse-led remainder). Then Slice 4+, Gate-6.
  Wind-down target ~21:30 with animation fold re-check.
- **Notes:** 12 workers, 0 failed steps. New papercut motif from two
  workers: executable census regen churns its embedded date/trailing
  blank — restore-if-date-only is now standing brief language; consider a
  harness-side dateless regen at some point.

---

## 713 — [BOUNDED MAIN WORKER 2026-07-29 ~19:15] Battle-resolution Slice 2 landed

- **State:** implementation `84374947`; tree green at **521 files / 5317
  tests + 1 deliberate animation-lane skip**, production build, targeted
  Slice-2 acceptance **322/322**, and `git diff --check`.
- **Did:** added the typed non-KO Scene-OFF renderer and source-composed scene
  adapter. Frozen commands now drive one-glyph-per-frame attack/result text,
  source `CalcNewBarValue` HP drain/heal clocks (including Q24.8 low-max-HP),
  stat/status effect views, persistent displayed-field HP/status, turn-end,
  and the six-frame blank next-command handoff. The canonical message helper
  was exported without changing its callers. Pixel acceptance is exact:
  staged OFF **16/16**, SAND_ATTACK **190/190**, and menus 3-13
  **254/254, 44/44, 42/42, 44/44, 93/93, 88/88, 111/111, 83/83, 56/56,
  46/46, 57/57**.
- **Next:** dispatch `docs/battle-resolution-seam-design.md` **Slice 3 —
  orchestrator replacement and generated non-KO handoff** verbatim; retain
  the complete Slice-2 regression table.
- **Notes:** no orchestrator/core, faint/party/send-out/terminal path,
  trace/capture list, canonical-recording import, unsupported barrier, or
  battle/turn/absolute-tick branch changed. The renderer consumes only its
  frozen display field, typed commands, and command-relative lifecycle; it
  imports no canonical duration vector. PAPERCUT: none.

---
