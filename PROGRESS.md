# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1108 — [solo session, 2026-08-10 ~23:30] **#55 instruction-queue observable UNBLOCKED: +18 identity = due `GBA Timer 0` event crossing**

- **State:** probe edit + docs only; no engine, reducer, or fixture change.
  #55 remains open, `cycles` stay `null`, clock stays unwired. Frozen-
  evidence insurance passed: the standard v2 anchor packet regenerated with
  the edited probe still hashes to the committed `631bd214…`.
- **Did:** refuted the compiled-shim premise (the vendored ffi declares
  `mTiming`/`mTimingEvent` fully) and proved the exit-139 was the known
  teardown crash, not a queue-access fault (it reproduces with zero walks;
  20,500 guarded walks ran fault-free and savestate-inert). Landed
  `snapshot_timing_queue()` (NULL/link/name capped, no pointer tokens) and
  filled the packet's `eventQueue` field. Banked the instruction packet
  twice-fresh byte-identical (`2e3b089c…`, 162,353 B, wrapper exit 0): the
  single matched +18 edge (`0x082e7572→0x082e7574`, clean 2 vs member 20)
  crosses a due **`GBA Timer 0`** (m4a sample timer) at queue head; the
  clean control's matched edge crosses none.
- **Next:** measure the Timer 0 service-cost class across all 85 census
  joins with this packet mode; then model crossings from the
  source-derivable Timer 0 reload. No fit, no clock wiring until that
  closes honestly.
- **Notes:** receipt updated (schedule receipt "queue identity BANKED"
  section) + ISSUES #55 checkpoint paragraph. Validation scripts in session
  scratchpad only. Suite untouched by this change (Python probe only); full
  suite + both soak gates were verified green at entry 1107 tonight.

## 1107 — [solo session, 2026-08-10 ~21:40] **Independent audit of the evening #55 sessions: all green; skipped soak gates re-run and restated in SUPERVISOR.md**

- **State:** master verified first-hand at `76bb72a9`: full `npm test`
  **895 files / 8,491 passed / 1 skipped**; soak vanilla 0:20 = **20/20 OK**;
  soak full 0:60 = **60/60 OK / 0 CRASH / 0 HANG** (299 s). These match the
  workers' claimed numbers exactly.
- **Did:** audited entries 1097–1106. #55 discipline held throughout
  (accessor `cycles` stay `null`, clock unwired, +18 censused not fitted,
  refuted shortcuts recorded). Found one process defect: BOTH 2026-08-10
  sessions ended without the user-directed wind-down soak gates, because the
  policy lived only in ROADMAP's now-ticked S10 block. Fixed durably: the
  gates are restated in SUPERVISOR.md's wind-down section (`76bb72a9`).
- **Next:** for #55's exit-139 probe blocker, the clean brief is a small
  compiled queue-inspection helper added to the vendored libmgba binding
  (read the due event's name/when against matching headers — no
  hand-declared struct layouts). Fold `animation-main` (~10 ahead) at next
  orient.
- **Notes:** decision compliance clean: no S11 work, no #71 OFF-profile
  wiring, Noland untouched. No engine change in this session; docs-only
  commits `76bb72a9` (+ this entry).

- **State:** #55 remains open; no fresh instruction packet was admissible,
  dependency `cycles` stay `null`, and the construction clock stays unwired.
- **Did:** added a bounded opt-in trace for the matched 318-cycle anchor
  `__divsi3(9300,100)` clean / `__divsi3(11300,100)` +18 pair. Two fresh OFF
  wrapper runs proved libmgba-py's live `mTiming.root` event/name access exits
  139 before JSON, so the hook retains no pointer token and claims no event.
- **Next:** expose a safe libmgba API/shim for due callback name and queue
  position around one `core.step()`, then bank the small instruction packet.
- **Notes:** focused census **3/3**, full `npm test` **895 files / 8,491 passed
  / 1 skipped**, and supervisor production build are green. No reducer, clock
  wiring, barrier, production/controller/presentation change, recording
  import, cycle fit, or canonical Battle-2 work.

## 1105 — [supervisor, 2026-08-10] **#55 residual census verified; no speculative clock fit**

- **State:** #55 remains open; dependency `cycles` stay `null` and the live
  construction clock stays unwired. Supervisor verification passed focused
  **3/3**, full `npm test` **895 files / 8,491 passed / 1 skipped**, and the
  production build after replacing a test-only unsupported `Map.groupBy` use.
- **Did:** verified the three compact OFF packets reproduce all **85** known
  +18 joins against **488** clean controls across six source components. The
  boundary-visible DMA/IRQ/prefetch state is identical, so the evidence does
  not justify an async-service reducer or constant. Orient folded **31**
  animation commits through `11245f83`; that union passed full test/build.
- **Next:** instrument the exact instruction-to-instruction increment and
  timing-event queue identity for #55. Do not fit +18, wire the clock, or
  resume the retired canonical Battle-2 march.
- **Notes:** `animation-main` is now **10 commits** ahead under its separate
  supervisor and is intentionally left for the next orient fold. No
  controller, presentation, barrier, recording import, or production reducer
  changed; `DEFERRED.md` has no open entry.

## 1104 — [MAIN worker, 2026-08-10] **#55 recurring +18 class censused; reducer not proven**

- **State:** evidence commit `87553c2a`; #55 remains open, accessor/dependency
  `cycles` stay `null`, and the construction clock stays unwired. Focused
  **38/38**, smoke **375/375**, typecheck, explicit 10-minute-timeout full
  `npm test` **895 files / 8,491 passed / 1 skipped**, and build are green.
- **Did:** three wrapper-validated OFF packets census all **85** known +18
  joins by exact source PCs and scalar scheduler/IRQ/DMA/prefetch state:
  nature **11**, Factory tail **1**, accessor **67**, level **3**, divide **1**,
  and `GetNature` **2**, against **488** clean controls. A fixed compiled
  segment is refuted; endpoint hardware/prefetch state does not discriminate.
- **Next:** if #55 continues, instrument the exact instruction-to-instruction
  increment and timing-event queue identity; do not fit +18 or wire the clock.
- **Notes:** accessor histogram remains **0×77/+18×67/+117×5/+245×6/+263×1**;
  EXP/IV u32 tails and the isolated level-loop composition are preserved. No
  production reducer, barrier, controller, presentation, or recording import.
