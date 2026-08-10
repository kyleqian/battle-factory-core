# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1091 — [MAIN worker, 2026-08-10] **#55 direct `GetNature` timing reduced**

- **State:** implementation commit `59b13350`; focused stats/clock **25/25**,
  smoke **375/375**, typecheck, full `npm test` **881 files / 8,428 passed /
  1 skipped**, and production build are green. #55 remains open and the
  construction clock remains unwired.
- **Did:** reduced all **60/60** direct calls from accepted personality alone:
  anchor/LILIANA/varied **29,875/14,830/15,195 = 59,900** source cycles. Raw
  spans decompose as **57×exact + 2×(+18) + 1×(+245 VCount/audio IRQ)**.
- **Next:** continue only with source-general encrypted Get/Set, level/growth,
  signed-divide, and VBlank/audio timing; do not wire or claim complete stats.
- **Notes:** fixed shell is **180** nested field-zero accessor + **42** wrapper;
  `%25` remains personality-dependent. Fresh Scene-OFF anchor is byte-identical
  (`cde88e8f…`); no identity/duration lookup, receipt mutation, excluded lane,
  canonical Battle-2, animation, or unsupported-barrier change.

## 1090 — [MAIN worker, 2026-08-10] **#55 `ModifyStatByNature` direct-callee timing reduced**

- **State:** committed as `76027187`; focused stats/clock **15/15**, smoke
  **375/375**, typecheck, full `npm test`, and production build are green.
  #55 remains open and the construction clock remains unwired.
- **Did:** reduced all **60/60** receipt calls from nature/u16-stat/stat-index
  ABI inputs: **52×98**, raise **3×416 + 1×418**, lower **3×408 + 1×410** =
  **8,396** cycles. It resolves **60/480** direct calls (**12.5%**) but only
  **0.475%** of direct-callee time; fresh Scene-OFF anchor hash is `cde88e8f…`.
- **Next:** continue only with source-general Get/Set, level, `%25`
  nature-fetch, signed-divide, and VBlank/audio timing; do not claim or wire
  the complete stats operation before those nested budgets are exact.
- **Notes:** source/ELF reduction includes the stat-index guard, ROM table,
  u16 product, ARM7 multiply width, and nested `__udivsi3`; no identity or
  duration lookup, fixture mutation, canonical Battle-2, animation, or
  unsupported-barrier change.

## 1089 — [supervisor, 2026-08-10] **#55 m4a source-state boundary extended and reproduced**

- **State:** squashed side fold `28f7a5c8`; focused union **15/15** and smoke
  **375/375** pass. Final union typecheck/full suite/build follow after the next
  bounded main increment.
- **Did:** two fresh Scene-OFF runs per case reproduce all **113** audio
  observations byte-for-byte: **113** equal captured-state keys and **0**
  differing m4a costs. The v3 packet removes frame/tick/cursor/address identity
  and adds full fixed structs, normalized graph links, blob digests, dispatch
  targets, and audio I/O state.
- **Next:** instruction-trace the remaining indirect MPlayMain callbacks and
  malformed/dynamic sample targets before any cross-state audio reducer; keep
  VBlank arbitration and the live construction clock unwired.
- **Notes:** coverage remains explicitly incomplete with four residual
  dereference classes; no production reducer, canonical Battle-2, animation,
  or unsupported-barrier change. Side commits were squashed so transient mGBA
  log blobs did not enter master history.
