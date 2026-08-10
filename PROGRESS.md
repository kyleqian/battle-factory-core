# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1093 — [MAIN worker, 2026-08-10] **#55 direct `SetMonData` party writes reduced**

- **State:** implementation `d877ab2b`; focused stats/clock **21/21**, smoke
  **375/375**, typecheck, full `npm test`, and production build are green.
  #55 remains open and the construction clock remains unwired.
- **Did:** source-reduced all **96/96** direct stats writes from only signed
  source field ID: per mon level **72** + seven HP/stat writes **7×78 = 618**;
  anchor/LILIANA/varied **3,708/1,854/1,854 = 7,416** cycles, all raw spans
  exact with zero residual. Tests pin u32/u8/u16/no-op/default switch arms.
- **Next:** continue only with a bounded #55 source-general encrypted
  `GetMonData2` or level/growth component (or VBlank/audio); do not wire the
  aggregate stats operation or construction clock.
- **Notes:** compiled `0x0806ACAC` dispatcher is instruction/fetch reduced,
  not a 72/78 duration table; default `SetBoxMonData` exposes only its exact
  30-cycle entry and 10-cycle return shell. No identity/duration lookup,
  fixture mutation, excluded lane, canonical Battle-2, animation, or
  unsupported-barrier change.

## 1092 — [MAIN worker, 2026-08-10] **#55 direct signed-division timing reduced**

- **State:** implementation `602227bd` plus docs `7c2de833`; focused stats
  evidence **11/11**, smoke **375/375**, typecheck, full `npm test` **881
  files / 8,430 passed / 1 skipped**, and production build are green. #55
  remains open and the construction clock remains unwired.
- **Did:** reduced all **72/72** direct `__divsi3` calls from source signed-i32
  dividend/divisor ABI values and the compiled `0x082E7542` wrapper plus exact
  inline unsigned core. Source totals anchor/LILIANA/varied are
  **11,252/5,630/5,700 = 22,582** cycles; raw spans decompose **71×exact +
  1×(+18 async service)**. Tests pin zero/sign/`INT_MIN/-1` branches.
- **Next:** continue only with another bounded #55 source-general component
  (encrypted Get/Set, level/growth, or VBlank/audio); do not wire the
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
