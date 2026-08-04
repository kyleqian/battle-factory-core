# Animation coverage

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

## Back `BACK_ANIM_GROW_STUTTER` triple accepted (2026-08-03)

**State:** exact for the thirteenth bounded player-back set: **13/25 back
sets, 39/75 selector variants, 139/376 Factory mappings**. The generated set
is exactly **5 mappings / 3 Factory / 2 outside** — ALAKAZAM, MEWTWO, QWILFISH,
EXPLOUD, and RAYQUAZA. Move coverage remains **107/276 exact, 0 partial,
0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged. The
next source-ranked unsupported player-back set is
`BACK_ANIM_V_SHAKE_LOW` (set 14): 15 mappings / 15 Factory / 0 outside.

**Did:** ported source-relative `Anim_GrowStutter_Twice`/normal/slow (IDs
**119/120/101**) and shared `GrowStutter`: duration/amplitude/run triples
20/70/2, 30/60/1, and 40/40/1; initializer-first affine startup; signed GBA
Sin/C integer division; middle-window `data[7] += 51` phase; positive
back-side x/y scale formulas under `sDontFlip`; strict `data[5] > data[6]`
cycle boundary; twice-cycle reset; terminal identity + `ResetSpriteAfterAnim`;
initializer/`WaitAnimEnd`/dummy callback timing; and task zero/preserve/restore.
The complete generated census and all five species route through the party
nature selector; Factory records 316 QWILFISH/Adamant, 493 EXPLOUD/Quirky,
and 404 ALAKAZAM/Modest provide the three legal variant representatives.

**Evidence:** three fresh paired byte-identical Scene-ON dense receipts retain
every framebuffer hash plus sprite RAM/OAM/affine state from selected callback
through `SpriteCallbackDummy`: Qwilfish twice **1840..1885 / 46 frames,
21,589 B, `dd3fd7f20cddcd5f4d749a210d3f8730e8ccc18b3f7c595e74f8cda085f49bd1`**;
Exploud normal **1839..1872 / 34, 15,925 B,
`aeff45bc8e553c8d7fd21a3e0f85e5d6c82cd34f3b57c8e4d24f1ebcd2637fe3`**;
Alakazam slow **1840..1883 / 44, 20,657 B,
`c557496c8b3c0c9372468d307cd8ecea1073f9dab962061b82838916d1a81eb2`**.

**Verification / next:** focused source/census/routing/reducer/evidence
checks **4 files / 20 tests**, both animation/executable ratchets **9 tests**,
heap-sized `npx tsc --noEmit`, smoke **7 files / 346 tests**, full `npm test`
**676 files / 6,643 passed / 1 skipped**, heap-sized `npm run build` (**553
modules transformed**), and `npm run animation:coverage` are green. No move
status, gameplay, RNG, damage, turn, facility, or live dispatcher state
changed.
