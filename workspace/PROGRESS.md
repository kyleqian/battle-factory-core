# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1133 — [supervisor, 2026-08-11] **Generic Battle-2+ start seam proven; wind-down green**

- **State:** master is green through `e55fe305`. A nonzero-index `battleStart`
  now has staged OFF proof from LILIANA's room quote through the real next
  command request, without a battle/turn/tick production branch. S8 stays
  closed and the canonical Battle-2 march remains stopped at tick 33331.
- **Did:** folded `animation-main` through `77201333`; then banked exact generic
  Battle-2 room-dismiss **30/30**, black handoff **43/43**, generated intro
  **238/238**, and action-ready **3/3** windows (each twice fresh; independent
  intro **238/238** and prior LILIANA **115/115** reruns). The #55 audit joins
  **113/113** MPlay rows: **5/5** zero-pass calls close at 864 cycles; **108**
  one-pass rows fail closed on missing post-command `Track.flags`/`chan` state.
- **Next:** for #55, capture/reduce that post-command MPlay state; keep costs
  null and the construction clock unwired until all 108 rows compose. For the
  presentation seam, retire the generic RNG-selected transition residual from
  frame 11338; do not extend into a Battle-2 action window.
- **Notes:** final `npm test` **946 files / 8,680 passed / 1 skipped**
  (**117.75s**), build **642 modules** (Vite **6.47s**), vanilla soak **20/20**
  (**33.9s**), and full-policy soak **60/60** (**284.4s**) are green with **0
  crash / 0 hang**. OFF oracle is fresh. `animation-main` has newer Metal
  Sound evidence commits not folded at wind-down. No material decision is
  deferred.

## 1132 — [bounded MAIN worker, 2026-08-11] **LILIANA battleStart reaches a real command boundary**

- **State:** the staged generic `battleStart` seam now carries the adopted
  LILIANA matchup at battle index 1 from her held Battle Room quote through the
  Scene-OFF intro to the next real player decision request. Production required
  no battle-, trainer-, or tick-specific change.
- **Did:** aligned the staged lead's source identity, added four short derived
  OFF traces, and proved quote dismissal **30/30**, transition black **43/43**,
  generated sendout **238/238**, and action-ready **3/3** exact twice fresh.
  Tier 1 pins index 1, trainer 9/adopted-party ownership, one-shot command
  acknowledgement, and the resulting kernel decision request.
- **Next:** generalize the RNG-selected Frontier transition owner to close the
  first remaining dynamic residual at frame 11338 and the legacy scene-assembly
  spans; keep this independent of #55 and do not resume canonical Battle 2.
- **Notes:** prior far-side trace remains **115/115** exact twice. Focused
  **48/48**, smoke **375/375**, typecheck, full `npm test` (**945 files / 8,678
  passed / 1 skipped**, **95.91s**), and build (**642 modules**, Vite **6.90s**)
  are green. No production, barrier, RNG, damage, AI, or animation change.
