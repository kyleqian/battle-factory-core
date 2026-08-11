# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1111 — [MAIN worker, 2026-08-10] **#55 Timer 0 phase receipt and pure cadence registration**

- **State:** #55 remains open; the live construction clock and every currently
  null operation/accessor `cycles` field remain untouched. Timer 0 service cost
  is explicitly `null`.
- **Did:** committed the bounded OFF-profile receipt/probe and pure API in
  `1f81c164`, `eec4ed0b`, `c8df1178`, and `c397c27b`; docs/ledger are in
  `c8a638c2`. Fresh anchor/LILIANA/varied packets are byte-identical
  (407/191/326 source-boundary rows): `TM0CNT_L=0xFB1A`, `TM0CNT_H=0x0080`,
  queue name `GBA Timer 0`, priority 32, and due-time deltas recur by exact
  1,254 master-cycle multiples. Entry due distances are 276/403/1,145, so
  phase is not source-general and remains an explicit seed/unknown.
- **Next:** the step is complete. Future #55 work must close the remaining
  source-general audio/IRQ/service evidence before any live wiring; do not wire
  `runFactoryConstructionClock` or populate any `cycles` accessor from this
  checkpoint.
- **Notes:** focused receipt+cadence **17/17**, smoke **375/375**, typecheck,
  full `npm test` **902 files / 8,520 passed / 1 skipped**, and `npm run build`
  (**631 modules**) are green. Cadence accepts only source-derived m4a reload
  rates, requires an explicit due seed on enable, preserves late phase and
  multiple crossings, and rejects unmodeled rates. No +18 cost, co-due
  collapse, RNG, presentation, controller, recording import, barrier, or
  canonical Battle-2 work.

## 1110 — [supervisor, 2026-08-10] **#55 Timer 0 identity and recurrence evidence united**

- **State:** #55 remains open. Production clock wiring and unresolved
  `cycles` contracts remain untouched; `DEFERRED.md` has no open entry.
- **Did:** orient folded **10** presentation-only `animation-main` commits
  through `77e3d325`; the union passed full `npm test` (**898 files / 8,503
  passed / 1 skipped**) and build (**631 modules**). Main then classified all
  **85/85** +18 joins as `GBA Timer 0` crossings against **488** clean
  controls. Side source/ELF evidence derives reload **`0xFB1A`**, period
  **1,254 master cycles**, priority **32**, and no Timer-0 IRQ. The merged
  evidence passes focused **11/11** and smoke **375/375**; both workers passed
  their full suites and builds.
- **Next:** snapshot Timer 0 phase at construction entry, prove the 1,254-cycle
  recurrence, and register a pure cadence state with explicit unknown service
  cost. Do not wire the live construction clock or fit the two unmatched path
  controls.
- **Notes:** stale dual oracles were restarted before evidence work. The side
  worktree/branch is removed. No controller, presentation, barrier,
  recording-import, canonical Battle-2, or gameplay-outcome change landed.

## 1109 — [MAIN worker, 2026-08-10] **#55 all-85 instruction/event classifier banked**

- **State:** evidence and Tier-1 receipt committed at `6884b7e7`; #55 remains
  open, production clock wiring and all `cycles` contracts stay untouched.
- **Did:** fresh wrapper-mediated Battle Scene OFF runs for anchor/LILIANA/
  varied, each repeated from a fresh path, produced byte-identical compact
  packets. The classifier joins exactly **85** members and **488** explicit
  residual-zero controls. Every member crosses **`GBA Timer 0`**; cost classes
  are **66** plain, **16** +Video, **2** +Audio, **1** +Video+Audio. Cross-epoch
  clean-edge matching is +18 for **83/85**; two same-return-class path gaps
  retain exact PCs and relative queues with null controls rather than a fit.
  Frozen v2 hashes remain pinned. Focused receipt+census **8/8**, smoke
  **375/375**, typecheck, full `npm test` **899 files / 8,508 passed / 1
  skipped**, and `npm run build` all pass.
- **Next:** source-derive Timer 0 reload/service registration and decide the
  scheduler contract from this evidence. Keep production wiring, cost fitting,
  and co-due assumptions out until that source audit is complete.
- **Notes:** updated construction schedule receipt and ISSUES #55. No
  production, controller, presentation, animation, canonical-recording, or
  unsupported-branch changes.
