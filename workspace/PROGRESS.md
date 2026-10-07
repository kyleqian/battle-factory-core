# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-07 (day) — S10A finish run IN PROGRESS (checkpoint 15:00)

- **State:** local master `3ff2d2e54`, production src tree `0fa8e76b`: 248 scoped-exact + 12 faithful-random +
  8 faithful-timing, 8 accepted bodies remaining (census `248+12+8+0+8=276`). Opus 5.5 supervisor and workers.
- **Did:** D4 accounting + `src/engine/liveMoveTimingPolicy.ts`; faithful timing Mach Punch, Megahorn, Revenge,
  Meteor Mash (D3), Psywave, Extrasensory, Superpower, Nightmare; exact Spit Up, Shock Wave; species audit 9 (Mach
  Punch idle-rest defect fixed, Revenge gate narrowed; ISSUES #152 remainder). Evidence prep30-34 merged. Every fold
  re-proved by the supervisor (all timing windows rerun twice fresh, own differential, union typecheck/smoke/targeted).
- **Next:** in flight — Ice Ball first body + Dive setup turn + #151 Sheer Cold / Hyper Voice accounting; side prep35
  (Skill Swap + Flatter sprite providers). Queue: Extreme Speed + Memento (ready, prep34), Skill Swap + Flatter,
  Pursuit / Hidden Power / Ghost Curse widening; Ice Ball later bodies + Dive attack need a deferred post-body order
  lend (`docs/s10a-random2-order-lend-blocker.md`); Eruption and Substitute need prep.
- **Notes:** no open DEFERRED entries. Briefs `/tmp/s10a-1007/`; validation logs `.integration/validation/*-20261007/`.

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

---

## 2026-10-06 (day) — S10A wind-down: D3 implemented; 218 -> 226 exact + 10 faithful-random live adapters

- **State:** S10A, local master; production `7e7816b98` (src tree `c41c4949`): 226 scoped-exact + 10
  faithful-random live adapters, 40 accepted bodies remain (6.1% of Factory move uses; census
  `226+10+0+40=276`). Supervisor final gates on that code: typecheck, 1,536 files / 12,472 tests, build
  857 (`final-supervisor-gates-20261006.json`). Preview <http://127.0.0.1:5191/> serves `10ad8606c`
  (same src; 4 samples hash-equal, export + mode restart pass, no errors). Opus 5.5 supervisor;
  Opus/Sonnet 5.5 workers; 8 integration folds + 12 evidence merges, all re-proved by the supervisor.
- **Did (production):** D3 option (a): presentation-only Random2 host (`docs/presentation-rng.md`; seed +
  policy in session exports; legacy default) and a separate faithful-random bucket. Faithful-random:
  Double Kick, Astonish, Thrash, Flail, Wish, Hyper Beam, Rain Dance, Water Pulse, Mud-Slap, Sand-Attack.
  Exact: Ice Beam, Water Spout, Hidden Power (Unown forms), Hail, Overheat (first body), Silver Wind,
  Psych Up (player), Dig. Battler x2 history tracker (#148: ONIX/RATTATA later bodies), assets-only palette
  composite, first-body gate, Rollout Defense Curl bodies, #149 audit fixes, Endeavor stale-register
  plumbing (no adapter yet). Gameplay/RNG unchanged (route ON/OFF + seed parity per batch; 20 soak seeds
  identical master vs the register branch).
- **Did (evidence):** census regen; prep12-20 (Random2 plans — most "C" labels were stale; Meteor Mash tail
  = ROM lag frame -> fallback; BG-register history; OAM assemblers for Will-O-Wisp / Pursuit / Fury Cutter /
  Megahorn); species audits 3 (3 defects, fixed) and 4 (clean).
- **Next:** ROADMAP S10A "Next (2026-10-06 evening)": OAM-buffer reducer ports first (prep20), then widen
  Overheat + add Psych Up opponent (evidence banked at the end: 17 later-body fixtures 0 px with the gate
  bypassed, `docs/later-bodies-overheat-psychup.md`), Endeavor adapter, remaining stale-labelled moves.
- **Notes:** no DEFERRED entries. Optional user question (not blocking, not filed): Meteor Mash's last-row
  timing depends on a ROM lag frame; it stays on fallback unless a D3-like timing claim is approved. A
  worker's `pkill -f mgba` killed both oracles mid-session; restarted 11:29 (PAPERCUTS). Soak gates are
  superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged, worktrees removed;
  validation summaries copied to `.integration/validation/`.

---

