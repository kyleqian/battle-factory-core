# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1087 — [MAIN worker, 2026-08-10] **#55 `CalculateMonStats` direct-call boundary narrowed**

- **State:** bounded evidence checkpoint committed; all **12/12** complete
  stats spans and **480** direct calls are pinned. Construction focus **19/19**,
  smoke **375/375**, typecheck, full `npm test` **880 files / 8,420 passed /
  1 skipped**, and production build are green.
- **Did:** added a byte-stable Scene-OFF sibling receipt for anchor/LILIANA/
  varied and audited `pokemon.c:2823` / the pinned ELF. Direct callees explain
  **139,916–153,077** of **140,999–154,160** source cycles after **7** complete
  VBlank pauses; parent interstitial is **1,081/1,083**, not a fitted reducer.
- **Next:** port source-general nested box-mon/level/nature/HP branch and
  ROM/EWRAM timing, then collect branch-case evidence; keep #55 open and the
  live clock unwired.
- **Notes:** existing `calculate-mon-stats` emission and accepted-personality
  propagation are tested; no identity/duration table, receipt mutation, live
  wiring, canonical Battle-2, animation, or unsupported-barrier change.

## 1086 — [MAIN worker, 2026-08-10] **#55 non-final Factory outer-loop timing reduced**

- **State:** source reducer and all **9/9** v2 outer-loop spans are green;
  focused construction **16/16**, smoke **375/375**, typecheck, full `npm test`
  **879 files / 8,417 passed / 1 skipped**, and production build pass.
- **Did:** reduced the selectable sibling to **261** cycles (**5** spans) and
  trainer-party sibling to **130** (**4** spans) from compiled Thumb/bus classes.
  Eight match directly; anchor mon 3 is **261 + 18** async service. All nine
  contain zero complete VBlank pauses. Added the non-final clock operation and
  source-only selectable rental-rank/challenge branches.
- **Next:** resume exact CreateMon/EV/stat/Factory-post and VBlank/audio
  arbitration. Keep #55 open and the live clock unwired.
- **Notes:** no identity/duration table, evidence mutation, live wiring,
  canonical Battle-2, animation, or unsupported-barrier change.
