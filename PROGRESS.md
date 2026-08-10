# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1092 — [MAIN worker, 2026-08-10] **#55 direct signed-division timing reduced**

- **State:** implementation/test commit `602227bd`; focused stats evidence
  **11/11** is green after red-first verification. #55 remains open and the
  construction clock remains unwired; smoke/typecheck/full suite/build are
  the next verification gate.
- **Did:** reduced all **72/72** direct `__divsi3` calls from source signed-i32
  dividend/divisor ABI values and the compiled `0x082E7542` wrapper plus exact
  inline unsigned core. Source totals anchor/LILIANA/varied are
  **11,252/5,630/5,700 = 22,582** cycles; raw spans decompose **71×exact +
  1×(+18 async service)**. Tests pin zero/sign/`INT_MIN/-1` branches.
- **Next:** run `npm run test:smoke`, `npm run typecheck`, full `npm test`, and
  `npm run build`; then record final counts in this entry. Do not wire the
  aggregate stats operation or construction clock.
- **Notes:** factor is limited to the exact Loop1/2/3 body shared with
  `__udivsi3`; setup/return boundaries remain separate. No identity/duration
  lookup, fixture mutation, excluded lane, canonical Battle-2, animation, or
  unsupported-barrier change.

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
