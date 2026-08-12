# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1170 — [supervisor, 2026-08-11] **VOL verified; Rust M5b-0 folded**

- **State:** `master` is green with VOL source-exact for **16/16** callbacks
  and **108/108** one-pass rows. Complete MPlay remains **5 exact / 108 null**;
  #55 stays unwired and LUKAS remains **8/50**.
- **Did:** independently regenerated the address-free VOL receipt **4/4**, then
  folded rust-main's native `CheckBadMove` preamble through merge `2529c1b4`.
  Native Rust is **175/175** with fmt/clippy clean; rebuilt WASM is **100,143
  bytes**, and all five adapter suites are **660/660** in default and
  forced-WASM modes.
- **Next:** census `ply_note` callbacks and source-close one bounded observed
  route. Preserve nulls for every other note route, command dispatch, and all
  complete one-pass MPlay totals.
- **Notes:** merged union full `npm test` **970 files / 9,414 passed / 1
  skipped**, build **651 modules**. Both lane branches are fully contained; no
  unsupported barrier or main presentation/gameplay/pixel change.

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
- **Notes:** focused predecessor controls **24/24**, smoke **375/375**,
  typecheck, full **970 files / 9,414 passed / 1 skipped**, and build **651
  modules** are green. Known one-pass components span **456–1413** cycles (73
  totals). No engine/pixel identity or unsupported barrier changed; pixels
  were not rerun.

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
