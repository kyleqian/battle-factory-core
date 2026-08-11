# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
  animation, barrier, or canonical recording change. Focused **4/4** and
  forced typecheck are green; final smoke/full/build gates follow.

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

## 1125 — [bounded MAIN worker, 2026-08-11] **#55 mixer-entry target safety closed**

- **State:** actual post-six-MPlayMain SoundMainRAM target safety is complete;
  #55 stays open and the construction clock remains null/unwired.
- **Did:** captured twice-fresh address-free entry descriptors for
  anchor/LILIANA/legal-varied: **113/113** v3 digest/cost joins, **0** unequal,
  **565/565** complete aligned physical target/read extents, joined to the
  frozen **13-branch / 4-rule** audit. Hashes: `6b29d708…` / `780e3326…` /
  `202f18b6…`.
- **Next:** classify the exact `ply_note` inline/keysplit/rhythm writer (and
  inline `ply_xwave` ancestry) for the **13** MPlay-replaced targets; **552**
  targets already prove pre-MPlay persistence. Do not infer duration or wire.
- **Notes:** six wrapper-mediated probes finished in **14.5–18.1s** each;
  focused prior/v3/entry audit **8/8**, smoke **375/375**, forced typecheck,
  full `npm test` **919 files / 8,610 passed / 1 skipped** (**72.37s**), and
  build (**631 modules**, Vite **6.34s**) are green. OFF oracle is healthy.
