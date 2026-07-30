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

## 732 — [BOUNDED MAIN WORKER 2026-07-30 ~01:48] Intro Slice 3 landed; opponent release 93/94

- **State:** implementation `42c559dd`; focused acceptance **2 files / 4
  tests**. Fresh private Scene-OFF pre-reset probe preserves **373/373**
  pre-send-out frames and matches **93/94** opponent-release frames
  B+373..+466; the only residual is **10px at B+444**, where the
  source-summary bar slot is reused during the particle burst. Full gate
  green at **531 files / 5427 tests + 1 deliberate animation-lane skip /
  513 modules**.
- **Did:** the typed start lifecycle now continues after acknowledgement
  through generic sent-out text, trainer exit, ball/open particles, typed
  species materialization, and typed opponent healthbox. It reuses the
  Slice-5 field-art/healthbox view; visible species names now resolve from
  the source name table instead of leaking `SPECIES_*`.
- **Next:** close the bounded B+444 summary-slot compositor residual without
  a tick patch, then Slice 4 (player release-to-command). The #53 interactive
  routing flip remains a separately designed later step.
- **Notes:** all **25/25** immutable rows plus generated command **128/128**
  remain exact. Probe regenerated through `tools/run-mgba-probe.py` in fresh
  temp dirs; no public trace committed. No import/barrier/ratchet pin,
  core routing, battle/turn/absolute-tick branch, fitted coordinate/RGB,
  capture thinning, or Gate-6 file. PAPERCUT: none.

---
## 731 — [SUPERVISOR 2026-07-30 ~01:10] #54 fixed+merged, Gate-6 at 8 rows (R3/R9 in), intro slices 1-2 verified; round 7 dispatched

- **State:** master green after merge `c3a9742f` (union suite re-run by
  supervisor), DEFERRED.md empty, no orphan worktrees/branches. Session:
  14 workers, 0 failed steps, 2 honest scout corrections.
- **Did:** (1) merged the #54 Natural Cure party-sync fix — generic
  mirror in the source-mapped `Cmd_switchoutabilities` handler
  (`battleScriptForceSwitchOpcode.ts:166`), round-trip Tier-1 pins, ROM
  re-verified; **#54 deleted**. (2) Gate-6 R3 (Cloud Nine
  suppress/reactivate) and R9 (Swagger×Lum; White Herb correctly inert —
  dossier corrected) pinned at parity, two seeds each: **8 rows proven,
  1 kernel bug found and fixed same-session**. (3) Verified intro
  slices 1-2 (entry 730): 373/373 probe-exact pre-send-out, all 26
  regression rows exact.
- **Did (cont., ~02:05):** intro slice 3 landed as an honest **93/94**
  opponent-release checkpoint (`42c559dd`) — sole residual B+444, 10px,
  summary-bar sprite-slot reuse during the particle burst (#18's
  persistent-`sSpriteOrder` family; next session decides
  fix-vs-attribute). Merged Gate-6 R13/R14-boundary/R5/R1 (`a2442f73`):
  Keen Eye specificity, K7 absorb-item boundary, Chesto/Lum timing, and
  sun-blocks-freeze with an exact RNG draw-ledger probe — **the dossier's
  entire top-10 shortlist is now addressed**, no divergences.
- **Next:** round 8 (final): main = intro slice 4 (player release →
  command handoff, probe-evidence only — trace stays blocked on the
  harness pre-reset-capture decision); side = Gate-6 R2 + R10 (R7/R8
  stretch). Then wind-down before 05:32 with the animation-fold
  re-check.
- **Notes:** intro slice 4's committed-trace acceptance and the
  commentary checkpoint both remain blocked on the harness-side Battle
  Lab pre-reset-capture decision (entries 690/724) — user-level item for
  the next session. The #53 interactive-routing flip design is the other
  next-session headline.

---
## 730 — [BOUNDED MAIN WORKER 2026-07-30 ~00:53] Intro Slices 1-2 complete — generated pre-send-out is 373/373

- **State:** implementation commits `01320712` + `a19690e0`; focused
  acceptance **2 files / 4 tests**, fresh private OFF probe **373/373**
  exact across B+0..+372 (route 1171..1543), all **25/25** immutable §3.2
  rows plus generated command **128/128** exact. Full suite/build green at
  **531 files / 5425 tests + 1 deliberate animation-lane skip / 513 modules**.
- **Did:** the generated round owner now projects its pending `battleStart`
  into a frozen typed command: source trainer/facility-class/trainer-class/
  pic identities, both complete three-row kernel parties, active indexes,
  six-slot summary states, and all three intro string substitutions. A real
  challenge-2 seed pins SHIZUKA → `FACILITY_CLASS_BLACK_BELT` →
  `TRAINER_PIC_BLACK_BELT` (id 11 in the 50-pic catalog). Slice 2 adds one
  BeginBattleIntro-relative lifecycle through the shared slide, typed
  summaries, printer, cursor, and first accepted A; the existing one-VBlank
  display lag supplies the probe rebase.
- **Next:** intro Slice 3 (typed opponent sent-out text, trainer exit,
  ball/release/materialization/healthbox) remains the next main-lane step;
  Slice 4 and the separately designed interactive routing flip follow.
- **Notes:** regenerated via `tools/run-mgba-probe.py` in a fresh temp dir;
  no public route exists, so no trace committed. No core routing, capture
  thinning, recording import, barrier/ratchet pin, battle/turn/absolute-tick
  branch, fitted coordinate/RGB, or fixture icon. PAPERCUT: none.
