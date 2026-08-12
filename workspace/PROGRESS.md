# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1169 — [MAIN worker, 2026-08-11] **#55 `ply_vol` callback family source-closed**

- **State:** `ply_vol` is source-exact for **16/16** callbacks and **108/108**
  one-pass rows. Complete MPlay stays **5 exact / 108 null**; the construction
  clock stays null/unwired, S8/#56 are untouched, and LUKAS remains **8/50**.
- **Did:** twice-fresh address-free OFF packets join all **113/113** rows.
  Anchor/LILIANA/varied contribute **2/13/1** callbacks across **1/11/1**
  rows; all select the pinned GamePak command-byte fast-accept route at
  **79 cycles**.
- **Next:** source-close the MPlayMain command decode/jump-table dispatcher or
  one bounded note family. Keep every complete one-pass total null and do not
  wire `runFactoryConstructionClock`.
- **Notes:** focused reducer **4/4** is green; full verification is in progress.
  Known one-pass components span **456–1413** cycles (73 totals). No engine,
  pixel identity, or unsupported barrier changed; pixels were not rerun.

## 1168 — [supervisor, 2026-08-11] **PAN closure verified**

- **State:** `master` is green with PAN source-exact for **13/13** callbacks
  and **108/108** one-pass rows. Complete MPlay remains **5 exact / 108 null**;
  #55 stays unwired and LUKAS remains **8/50**.
- **Did:** reviewed the nine callback rows and 81-cycle fast-accept reducer,
  then independently regenerated the address-free PAN receipt **4/4**. Both
  lane branches are fully contained in `master`.
- **Next:** source-close `ply_vol` at 16 census callbacks. Preserve nulls for
  note families, dispatch, and all complete one-pass MPlay totals.
- **Notes:** worker full gate **969 files / 9,410 passed / 1 skipped**, smoke
  **375/375**, typecheck, build **651 modules**. No unsupported barrier or main
  presentation/gameplay/pixel change.

## 1167 — [MAIN worker, 2026-08-11] **#55 `ply_pan` callback family source-closed**

- **State:** `ply_pan` is source-exact for **13/13** callbacks and **108/108**
  one-pass rows. Complete MPlay stays **5 exact / 108 null**; the construction
  clock stays null/unwired, S8/#56 are untouched, and LUKAS remains **8/50**.
- **Did:** twice-fresh address-free OFF packets join all **113/113** rows.
  Anchor/LILIANA/varied contribute **5/4/4** callbacks across **4/3/2** rows;
  all select the pinned GamePak command-byte fast-accept route at **81 cycles**.
- **Next:** source-close `ply_vol`, the next-smallest live callback family at
  16 census entries, or the command dispatcher. Keep note families and all
  complete one-pass totals null; do not wire `runFactoryConstructionClock`.
- **Notes:** focused predecessor controls **20/20**, smoke **375/375**,
  typecheck, full **969 files / 9,410 passed / 1 skipped**, and build **651
  modules** are green. No engine/pixel identity or unsupported barrier changed;
  pixels were not rerun.
