# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1018 — [bounded MAIN worker, 2026-08-08] **#39: two staged semantic owners replace their last bare canonical fact sources**

- **State:** implementation `5de9c142`; focused Tier-1 **254/254**, smoke
  **375/375**, typecheck/build, and the committed OFF differential are green.
  The post-change full suite was still healthy but was killed at the worker's
  60-minute cap after shared-host contention; supervisor union full remains.
- **Did:** turn 5's ENDEAVOR squish now reads `TURN4_ROCKSLIDE_HP.to`; turn
  11's ATK-floor renderer and reveal total share the resolver-derived staged
  lines. Deleted all three old scalar/string exports and compatibility
  imports/re-exports. Exact old-symbol executable refs **12→0**; broad #39
  inventory **1,950→1,949** lines / `battleScene.ts` **36,344→36,343 LOC**.
- **Next:** supervisor review; continue #39 only with another bounded semantic
  owner retirement. Do not resume the stopped file split or Battle-2 march.
- **Notes:** parent differential is **2,529/2,529 byte-identical** across 14
  OFF traces (turn3 insurance; turn4 double-team/rock-slide; all turn5
  menu/ENDEAVOR/KO/switch/Sitrus readers; turn11 FEATHER_DANCE/ROCK_SLIDE).
