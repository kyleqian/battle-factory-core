# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1090 — [MAIN worker, 2026-08-10] **#55 `ModifyStatByNature` direct-callee timing reduced**

- **State:** standalone source reducer and docs are landed locally; focused
  stats/clock **15/15**, smoke **375/375**, and typecheck pass. Final full
  `npm test` and production build remain before handoff; #55 stays open.
- **Did:** reduced all **60/60** receipt calls from nature/u16-stat/stat-index
  ABI inputs: **52×98**, raise **3×416 + 1×418**, lower **3×408 + 1×410** =
  **8,396** cycles. It resolves **60/480** direct calls (**12.5%**) but only
  **0.475%** of direct-callee time; fresh Scene-OFF anchor hash is `cde88e8f…`.
- **Next:** run final full suite/build, commit green, then leave the complete
  stats operation and live construction clock unwired pending Get/Set, level,
  `%25` nature-fetch, signed-divide, and VBlank/audio timing.
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

## 1088 — [MAIN worker, 2026-08-10] **#55 `CalculateMonStats` parent timing reduced**

- **State:** exact parent-only reducer landed; focused stats/clock **13/13**,
  smoke **375/375**, typecheck, full `npm test` **880 files / 8,422 passed /
  1 skipped**, and production build are green. #55 remains open.
- **Did:** all **12/12** receipts reduce exactly after excluding **480** direct
  callees: **10×1,083 + 2×1,081**. The split is the u8 `levelUpHP==0` branch:
  two extra halfwords minus one refill = **−2**. Source tests cover u8 wrap,
  normal HP initialize/adjust/return, and Shedinja branches.
- **Next:** port the nested Get/SetMonData, level/growth, divide, nature, and
  nature-modification ROM/EWRAM timing; do not wire the complete stats cost or
  live clock before those callees and VBlank/audio arbitration are exact.
- **Notes:** commit `639f0a81`; no identity/duration lookup, fixture mutation,
  live wiring, canonical Battle-2, animation, or unsupported-barrier change.
