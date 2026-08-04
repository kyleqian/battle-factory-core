# Animation coverage

## Back `BACK_ANIM_CONCAVE_ARC_LARGE` triple accepted (2026-08-03)

- **State:** exact for the sixteenth bounded player-back set: **16/25 back
  sets, 48/75 selector variants, 198/376 Factory mappings**. Generated set
  census: **18 mappings / 18 Factory species / 0 outside / 33 Factory
  records**. Move coverage is unchanged at **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **123/122/121**
  `ANIM_CONCAVE_ARC_LARGE_TWICE` / normal / slow, their guarded
  initializer-first `Anim_ConcaveArcLarge_Twice` / normal / slow callbacks,
  and shared `ConcaveArc`. The reducer preserves steps **8/6/4**, 12/12
  x/y amplitudes, runs **2/1/1**, signed GBA `Sin`, C modulo-256 restart,
  y reflection plus 12 offset, strict `data[7] > 255`, repeat decrement,
  terminal x2/y2 cleanup (with source-faithful terminal `data[6] == 1`),
  `WaitAnimEnd`→dummy timing, visible non-affine OAM, and task
  zero/preserve/restore. Legal representatives are MAGIKARP index **6**
  Hardy/mod-0, AZURILL index **1** Rash/mod-1, and TREECKO index **94**
  Lonely/mod-2; all eighteen siblings route through the selector triple.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONVEX_DOUBLE_ARC` (set 17): 27 mappings / 26 Factory / 1
  outside / 43 Factory records**.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/affine state: Magikarp
  twice **1840..1907 / 68 / 33,049 B /
  `8680c46aef9d76a7c4c231d42d7b2b56656f1108b21976a03beccbf919b1c581`**;
  Azurill normal **1839..1884 / 46 / 22,308 B /
  `8daceedff0517e495dc51daf6a1e2a6b6fa5f2564bcea4922ce88bf3bf13be35`**;
  Treecko slow **1839..1905 / 67 / 32,513 B /
  `6d1868ffe99209bbf097f56a9a1c37b38aa6e27e71e3f6f10df1ed7893b635b7`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke **7/346**, full `npm test` **687
  files / 6,711 passed / 1 skipped**, build (**553 modules**), and coverage
  are green. No boundary/unsupported-branch widening or move promotion.
  Main-program finding: Emerald's internal IDs for Azurill/Treecko are
  **350/277**, not their National Dex IDs; this affects probe staging only.

## Back `BACK_ANIM_TRIANGLE_DOWN` triple accepted (2026-08-03)

- **State:** exact for the fifteenth bounded player-back set: **15/25 back
  sets, 45/75 selector variants, 180/376 Factory mappings**. Generated census
  is **26 mappings / 26 Factory species / 0 outside / 45 Factory records**;
  move coverage is unchanged at **107/276 exact, 0 partial, 0 staged, 169
  unsupported** and `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported IDs **106/105/104** `ANIM_TRIANGLE_DOWN_TWICE` / normal /
  slow, `Anim_TriangleDown_Fast` / normal / slow, and the complete signed
  `{1,1,12}`, `{-2,0,12}`, `{1,-1,12}`, `{0,0,0}` reducer. It preserves
  source s16/C division, terminal/repeat (`data[6]`), active vs terminal
  `TryFlipX` timing under `sDontFlip`, visible non-affine OAM, and task
  zero/preserve/restore. Legal representatives are SNORUNT index **76**
  Brave/mod-0, TYROGUE index **15** Docile/mod-1, PIDGEY index **33**
  Lonely/mod-2; all 26 siblings route through every nature selector.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONCAVE_ARC_LARGE` (set 16): 18 mappings / 18 Factory / 0
  outside / 33 Factory records**.
- **Notes:** paired dense Scene-ON initializer→dummy receipts (framebuffers +
  player RAM/OAM/affine state): Snorunt **1839..1878 / 40 / 19,048 B /
  `b25d3fc6025f394cd908152bb7ea5e7533148ef7b765c74fe11179518b767361`**;
  Tyrogue **1839..1859 / 21 / 10,324 B /
  `2913a35d25f8cb9006290d5aeaa48911b98dedf8ae7ce1798a3cec69857e057c`**;
  Pidgey **1838..1876 / 39 / 18,597 B /
  `0d05595383b582de9272e7032c98cd8f35fd547b8aa5f351a1711dd40ecd53b1`**.
  Focused source/census/routing/reducer/evidence + both ratchets: **4 files /
  18 tests**; typecheck, smoke **7/346**, full `npm test` **685 files /
  6,702 passed / 1 skipped**, build **553 modules**, and coverage green. No
  unsupported-branch/boundary widening and no main-program finding.

## Back `BACK_ANIM_V_SHAKE_LOW` triple accepted (2026-08-03)

**State:** exact for the fourteenth bounded player-back set: **14/25 back
sets, 42/75 selector variants, 154/376 Factory mappings**. The generated set
is exactly **15 mappings / 15 Factory / 0 outside** — POLIWRATH, GEODUDE,
RHYHORN, RHYDON, PINSIR, TAUROS, DONPHAN, LARVITAR, TYRANITAR, NOSEPASS,
MAKUHITA, HARIYAMA, NUMEL, TROPIUS, and AGGRON. Move coverage remains
**107/276 exact, 0 partial, 0 staged, 169 unsupported**; the generated
`ANIMATION_COVERAGE.json` is unchanged.

**Did:** ported the source-selected `Anim_VerticalShakeLowTwice_Fast` / normal
/ slow initializers (IDs **99/92/98**) and shared `VerticalShakeLowTwice`:
56/9, 40/6, and 24/6 step/amplitude pairs; the complete source
`sVerticalShakeData` pulse/gap/pulse/terminal rows `{6,30}`, `{-2,15}`,
`{6,30}`, `{-1,0}`; u8-derived signed GBA sine phase; C integer damping;
boundary no-increment behavior; terminal `WaitAnimEnd` then dummy/task
restoration; non-affine OAM timing; and the task's back-side `sDontFlip`
contract (no source `TryFlipX` calls). The selector remains species plus
party nature only. Factory GEODUDE index **70** Brave/mod-0, MAKUHITA index
**22** Docile/mod-1, and HARIYAMA_2 index **486** Quiet/mod-2 cover every
variant, while the routing test batch-checks all fifteen siblings.

**Evidence:** three fresh paired byte-identical Scene-ON dense receipts retain
every framebuffer hash plus player sprite RAM/OAM/affine state from selected
initializer through `SpriteCallbackDummy`: Geodude fast **1839..1919 / 81
frames, 37,607 B, `c23772a75a41eeb0c9981675bd0223f876cfd091fdf2972f8a7e42189bb82ff1`**;
Makuhita normal **1840..1920 / 81, 37,578 B,
`9575423aff3eefc9058624a03ead8f61c7bc01d87ad67bad9d4efd134c666976`**;
Hariyama slow **1840..1920 / 81, 37,582 B,
`bf349b8ecfcbf42f1f77a363c86bbc504dbd1fc55dbe12e69ff511e6285fac22`**.

**Verification / next:** focused source/census/routing/reducer/evidence plus
both animation/executable ratchets **4 files / 18 tests**, heap-sized typecheck,
smoke **7 files / 346 tests**, full `npm test` **678 files / 6,652 passed /
1 skipped**, heap-sized `npm run build` (**553 modules transformed**), and
`npm run animation:coverage` are green. Next source-ranked unsupported
player-back set is `BACK_ANIM_TRIANGLE_DOWN` (set 15). No move status,
gameplay, RNG, damage, turn, facility, or live dispatcher state changed.
