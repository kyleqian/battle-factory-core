# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1095 — [MAIN worker, 2026-08-10] **#55 direct level route bounded; complete callee not reducible yet**

- **State:** evidence commit `b8bb8306`; focused stats **17/17**, smoke
  **375/375**, and typecheck are green. Final full suite/build verification is
  pending. #55 remains open and the construction clock remains unwired.
- **Did:** audited all **12/12** `GetLevelFromMonExp` calls. Twice-fresh OFF
  packets pin personality/species/growth/EXP and exact post-accessor timing:
  **43 + 21 + 2,200 + 18 = 2,282** source cycles; **8 exact + 3×(+18
  service) + 1×(+308 VCount/audio IRQ)**.
- **Next:** continue #55 only with the source-general encrypted `GetBoxMonData2`
  body needed by the 156 direct reads and both level accessors; do not wire
  aggregate stats or the construction clock.
- **Notes:** complete level calls total **246,922** pause-subtracted cycles;
  their two encrypted accessors contribute **219,176** observed cycles and
  remain unreduced. No fitted duration, keyed/identity branch, residual
  absorption, canonical Battle-2, animation, fixture production import, or
  barrier change.

## 1094 — [MAIN worker, 2026-08-10] **#55 direct `GetMonData2` party reads reduced**

- **State:** implementation `9a90f094`, shell correction `bf107b02`, and
  evidence/docs `3b95eb30`; focused
  stats **16/16**, smoke **375/375**, typecheck, full `npm test` **881 files /
  8,435 passed / 1 skipped**, and production build are green. #55 remains open
  and the construction clock remains unwired.
- **Did:** censused all **180** stats reads by field/compiled route: **24**
  direct HP/max-HP reads and **156** encrypted EV/IV/species reads. The direct
  source-general jump-table arms reduce exactly at **80** cycles each:
  anchor/LILIANA/varied **960/480/480 = 1,920**, zero residual.
- **Next:** continue #55 only with a bounded source-derived encrypted
  `GetBoxMonData2` body or level/growth component; do not wire the aggregate
  stats operation or construction clock.
- **Notes:** encrypted/default and Deoxys routes retain only exact compiled
  entry/return shells with `cycles: null`; the correction includes the opening
  `push` represented by mGBA's pipelined entry PC. All three Scene-OFF packets
  match committed hashes. Completed direct-call coverage is **312/480** and
  **100,214/1,768,691 = 5.666%** of source callee cycles. No duration/identity
  fit, fixture mutation, canonical Battle-2, animation, or barrier change.

## 1093 — [MAIN worker, 2026-08-10] **#55 direct `SetMonData` party writes reduced**

- **State:** implementation `d877ab2b` plus audit correction `8789ce5b`;
  focused stats/clock **21/21**, smoke **375/375**, typecheck, full `npm
  test` **881 files / 8,432 passed / 1 skipped**, and production build are
  green. #55 remains open and the construction clock remains unwired.
- **Did:** source-reduced all **96/96** direct stats writes from only signed
  source field ID: per mon level **72** + seven HP/stat writes **7×78 = 618**;
  anchor/LILIANA/varied **3,708/1,854/1,854 = 7,416** cycles, all raw spans
  exact with zero residual. Tests pin u32/u8/u16/no-op/default switch arms.
- **Next:** continue only with a bounded #55 source-general encrypted
  `GetMonData2` or level/growth component (or VBlank/audio); do not wire the
  aggregate stats operation or construction clock.
- **Notes:** compiled `0x0806ACAC` dispatcher is instruction/fetch reduced,
  not a 72/78 duration table; the general u32 status arm is independently
  instruction-counted at 25 halfwords/86 cycles. Default `SetBoxMonData`
  exposes only its exact 30-cycle entry and 10-cycle return shell. No
  identity/duration lookup, fixture mutation, excluded lane, canonical
  Battle-2, animation, or unsupported-barrier change.
