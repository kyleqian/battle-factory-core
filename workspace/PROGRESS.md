# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-07 (day) — S10A finish run: D4 implemented; census COMPLETE 250 + 13 + 13 + 0 = 276

- **State:** local master, production src tree `e1a47502` (`46319b2d9`): 250 scoped-exact + 13 faithful-random +
  13 faithful-timing live adapters; 0 accepted Factory bodies without a live adapter (census `250+13+13+0+0=276`).
  Final independent gates on that code: typecheck, 1,562 files / 12,816 tests, build 872, differential 624/624
  (`final-supervisor-gates-20261007-evening.json`). Preview <http://127.0.0.1:5191/> serves `2a3f8398c` (4 samples
  hash-equal, session export + ON->OFF restart passed, no errors; `playable-preview-2a3f8398c-receipt.json`).
- **Did:** D4 faithful timing (`src/engine/liveMoveTimingPolicy.ts`, disjoint accounting, checker that fails on
  undocumented residuals / missing phase labels). New adapters: timing — Mach Punch, Megahorn, Revenge, Meteor Mash
  (D3), Psywave, Extrasensory, Superpower, Nightmare, Ice Ball counter 0 (D3), Dive setup (D3), Skill Swap; exact —
  Spit Up, Shock Wave, Extreme Speed, Memento, Eruption, Substitute body; random — Flatter. #151 closed by
  reclassifying Sheer Cold / Hyper Voice to faithful timing. Presentation-only Substitute doll field state + shared
  declines. Species audits 9-12: Mach Punch / Extrasensory idle rest, Revenge / Spit Up gates, Dive setup length,
  Substitute shiny gate — all fixed (NIDORAN healthbox symbol + two over-strict gates open in #152). Evidence prep30-37. 12 integration folds + 13 evidence merges, each re-proved by the supervisor (every
  claimed window rerun twice fresh, own differential, union checks); zero reverted folds.
- **Next:** ROADMAP S10A "Next (2026-10-07 evening)": Substitute swaps / fade; deferred post-body order lend (Ice Ball
  counters 1..4, Dive attack); ISSUES #152 remainder (NIDORAN healthbox symbol, Flatter / Skill Swap gates) + new D4 lag cases (Extreme Speed, Dive
  CLAMPERL); D4 widening (Pursuit later bodies, Hidden Power, Ghost Curse).
- **Notes:** no DEFERRED entries. S10A stage box left open on purpose: every accepted body now has a live adapter,
  but many are scoped (first body / known lend / declines) and the resume list is real continuation work. Decision
  recorded: the engine/animation boundary ratchet now lets `battleCommandFieldArt.ts` import the static doll asset
  (presentation only). New ISSUES #153 (Scene OFF skips the Substitute body; kernel-owned). Soak gates superseded for
  S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged, worktrees removed; logs
  `.integration/validation/*-20261007*/`.

---

## 2026-10-07 — D4 approved; unblock and finish S10A

- **State:** local master; D4 option (b) approved. Production unchanged at src
  tree `1efb1872`: 246 scoped-exact + 12 faithful-random, 18 accepted bodies
  remaining. Implementation/accounting of faithful timing is next-run work.
- **Did:** recorded the user's direction to unblock and finish; removed D4's
  open launch heading and aligned roadmap, worker/supervisor instructions,
  verification and #151's resume condition. `docs/faithful-timing.md` authorizes
  deterministic dominant measured CPU phases with separate, disjoint claims;
  further evidenced cases of this same class do not need another decision.
- **Next:** launch the normal Opus 5.5 / Sonnet 5.5 supervisor, implement timing
  accounting and banked adapters, finish remaining providers/continuations,
  and verify the final census and playable preview. Batch shared mechanisms,
  reuse valid receipts, and avoid re-probing settled CPU-phase limitations.
- **Checks:** docs-only diff/ledger checks, no open deferred headings, resolved
  Opus/Sonnet headless launch profile. Reuse the unchanged production receipt
  `final-supervisor-gates-20261007.json`: typecheck, 12,665 tests, build 862.
- **Notes:** gameplay/RNG and Factory acceptance stay unchanged. Exact fixture
  scopes remain distinct from faithful timing; D3+D4 consumers count once.
  This checkpoint records approval; the actual supervisor launch follows it.

---

## 2026-10-06 (night) — S10A wind-down: 226 -> 246 scoped-exact, 10 -> 12 faithful-random; D4 OPEN

- **State:** S10A, local master; production src tree `1efb1872` (prep29 R1 merge): 246 scoped-exact + 12
  faithful-random live adapters, 18 accepted bodies remain (census `246+12+0+18=276`). Supervisor final gates on
  that code: typecheck, 1,548 files / 12,665 tests, build 862 (`final-supervisor-gates-20261007.json`). Preview <http://127.0.0.1:5191/> refreshed on this src at wind-down (receipt
  `playable-preview-d01f11d1e-receipt.json`; serves `d01f11d1e`: 4 samples hash-equal, export + mode restart, no errors).
  Opus 5.5 supervisor; Opus / Sonnet 5.5 workers; 11 integration folds + 14 evidence merges, all re-proved by the
  supervisor (dense reruns twice fresh, differential on 2-3 traces, reruns of every evidence script).
- **Did (production):** hardware-OAM provider + Will-O-Wisp / Pursuit / Fury Cutter / Return; source models for
  Curse (non-Ghost) and Endeavor; Fire Punch body; Baton Pass body; profile builders (Spikes, Octazooka, Signal Beam,
  Sheer Cold, Lovely Kiss faithful-random) and Q2 builders (Hyper Voice, Smog, Sand Tomb, Sky Attack both turns,
  Snore); Bonemerang, Rapid Spin, Outrage, Luster Purge (faithful-random); Overheat any known lend; Psych Up opponent; Will-O-Wisp later bodies; 14 sprite-order plan rows
  (corpus replay known 1210 -> 1285, 0 mismatches). ISSUES #150 fixed; #151 idle-x2 class fixed. Gameplay / RNG
  unchanged (route ON/OFF parity per batch; differential byte-identical at every fold).
- **Did (evidence):** prep22-29 (Fire Punch split, Curse / Megahorn / Return / Ice Ball / Revenge / Endeavor models,
  Baton Pass flow, 26 moves triaged — most "C" labels stale), lb26 later bodies, order-plan gaps (prep28), species
  audits 5-8 (4 defect classes found and fixed), #151 diagnosis.
- **Next:** ROADMAP S10A "Next (2026-10-07 morning)": answer D4 first; then Dive, Eruption, Baton Pass flow,
  remaining providers.
- **Notes:** **DEFERRED D4 (OPEN):** about 1.3% of Factory move uses animate with timing that depends on emulator CPU
  load (lag frames / VBlank phase) and cannot meet the scoped-exact bar; fallback vs a separate "faithful timing"
  bucket (recommended). The next `run-supervisor.sh` refuses to start until D4 is answered. Soak gates are
  superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged, worktrees removed;
  supervisor validation logs in `.integration/validation/*-2026100{6,7}/`.
