# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1021 — [bounded MAIN worker, 2026-08-08] **#39: faint-sink geometry now has an identity-honest API name**

- **State:** implementation `d2390d33`; focused **237/237**, smoke **375/375**,
  typecheck, full suite (**799 files / 8,033 passed / 1 skipped**), build, and
  the committed OFF differential are green.
- **Did:** renamed only the pure geometry helper to `faintSinkRowsAndY2` in its
  existing canonical owner and public re-export; signature, formula, Grovyle
  defaults, and explicit Pidgeotto parameters are unchanged. Exact old-symbol
  refs (`src`/`tests`/`tools`) **22→0**, production **10→0**; focused Tier-1
  now pins mid-curve geometry for both distinct parameterizations.
- **Next:** supervisor review; continue #39 only with another freshly bounded
  presentation-seam retirement.
- **Notes:** broad #39 census **1,949→1,949** / `battleScene.ts`
  **36,361→36,361 LOC**. Clean-parent differential **620/620 byte-identical**
  (`turn5-faint` 110, `turn5-switchin` 241,
  `turn13-dragonbreath-faint` 141, generated-OFF insurance 128). No canonical
  Battle-2 trace/window, oracle trace, or Scene-ON query ran; no hidden/dynamic
  consumer, new unsupported barrier, or production recording import found.

## 1020 — [bounded MAIN worker, 2026-08-08] **#39 brief stopped: one requested rename already landed**

- **State:** clean evidence checkpoint; focused **237/237**, smoke **375/375**,
  typecheck, full suite (**798 files / 8,028 passed / 1 skipped**), build, and
  Scene-OFF profile check are green.
- **Did:** stopped before implementation because `dragonBreathGrovyleHp` was
  already renamed to generic `dragonBreathHp` by `bb5289b2`. Exact old-name
  code refs remain `{dragon: 0, faint-sink: 22}`; production refs `{0, 10}`;
  broad #39 inventory **1,949→1,949** / `battleScene.ts` **36,361→36,361 LOC**.
- **Next:** supervisor should re-scope a fresh bounded #39 seam; a faint-sink-only
  rename was not inferred from this two-symbol brief.
- **Notes:** `grovyleFaintSinkRowsAndY2` is declared in
  `battleSceneCanonical.ts` and publicly re-exported by `battleScene.ts`; no
  hidden dynamic consumer was found. No trace/window or Scene-ON query ran.

## 1019 — [bounded MAIN worker, 2026-08-08] **#39: six Family-C healthbox caches now own every rendering input**

- **State:** implementation `660c769f`; focused **12/12**, smoke **375/375**,
  typecheck, full suite (**798 files / 8,028 passed / 1 skipped**), build, and
  the committed OFF differential are green.
- **Did:** all six slice-2 memoization keys now cover HP, identity, level,
  max HP, gender, and status wherever variable; all three canonical preseeds
  use the same complete keys. Added six red-verified, order-independent
  identity/max-HP collision pins against the direct compositors. Incomplete
  cache owners **6→0**; broad #39 inventory **1,949→1,949** lines /
  `battleScene.ts` **36,343→36,361 LOC**.
- **Next:** supervisor review; continue #39 only with another bounded generic
  presentation-seam retirement.
- **Notes:** clean-parent differential is **3,055/3,055 byte-identical** across
  all 16 Family-C slice-2 OFF windows plus generated-round insurance; no
  Battle-2 trace/window was run.
