# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1128 — [supervisor, 2026-08-11] **#55 audio read closure folded; final union green**

- **State:** master is green through `60d95120`; the actual mixer-entry target,
  mutable-route provenance, and command/pattern read-safety classes are closed.
  #55 remains open only for exact timing composition, and its construction
  clock stays null/unwired.
- **Did:** folded the 13-target `ply_note` classification (**6 inline / 0
  keysplit / 7 rhythm**) and the source-general MPlay command contract
  (**100/100** candidate tracks complete, max **5 commands / 11 reads**).
  Independently regenerated the combined evidence union at **9/9**.
- **Next:** capture a versioned player scalar selector that preserves
  `tempoI`/`tempoC` before attempting exact per-call MPlay cost reduction.
  Do not alter frozen v3, infer the erased selector, fit a duration, or wire
  `runFactoryConstructionClock`.
- **Notes:** orient folded animation-main through `77e3d325`; subsequent
  animation commits remain owned by the active animation supervisor. Final
  union `npm test` **921 files / 8,617 passed / 1 skipped** (**146.46s**),
  build **631 modules** (Vite **6.29s**), vanilla soak **20/20** (**32.2s**),
  and full-policy soak **60/60** (**278.9s**) are green with **0 crash / 0
  hang**. OFF oracle is healthy; no material decision was deferred.

## 1127 — [bounded MAIN worker, 2026-08-11] **#55 MPlay read bounds closed; selector isolated**

- **State:** the remaining v3 MPlayMain command/pattern dereferences are fully
  bounded for all committed states; exact zero/one-pass selection remains
  unavailable, #55 stays open, and the construction clock remains unwired.
- **Did:** source-replayed **1,130** track snapshots: **1,017 active**, **917
  wait>0**, and all **100/100** wait-zero candidates complete with **0**
  incomplete, **90** read sets, max **5 commands / 11 byte reads**. All
  pointers normalize to 9 symbol-relative song roles and fail closed.
- **Next:** repair/capture a versioned player scalar selector only if exact
  per-call MPlay execution is needed for a duration reducer; do not alter v3
  or infer the erased `tempoI/tempoC` values.
- **Notes:** evidence hash `a158fff7…`; all three prior v3 fixture hashes are
  preserved. No oracle run, duration, cost, clock/controller, presentation,
  animation, barrier, or canonical recording change. Focused **4/4**, smoke,
  forced typecheck, full `npm test` **921 files / 8,617 passed / 1 skipped**
  (**84.06s**), and build (**631 modules**, Vite **6.36s**) are green.

## 1126 — [bounded MAIN worker, 2026-08-11] **#55 mixer-entry provenance closed**

- **State:** actual mixer-entry target safety and provenance are complete for
  all **565** selected slots; #55 stays open and the construction clock remains
  null/unwired.
- **Did:** exact `ply_note` selector/store hooks classify all **13/13** MPlay
  replacements with **0** ambiguity: **6 inline / 0 keysplit / 7 rhythm**.
  Inline ancestry is explicit: **0 true / 6 false** for same-pass `ply_xwave`.
- **Next:** continue #55 only with a separately source-proven construction or
  VBlank component. Do not aggregate a duration or wire the clock from this
  provenance packet.
- **Notes:** anchor/LILIANA two-fresh compact hashes are `afcb8034…` /
  `b5cda911…` in **16.4–16.8s / 11.5–13.2s**; legal-varied reused its frozen
  **0-replacement** receipt. Focused prior/v2 audit **6/6**, smoke **375/375**,
  forced typecheck, full `npm test` **920 files / 8,613 passed / 1 skipped**
  (**90.92s**), and build (**631 modules**, Vite **7.89s**) are green.
