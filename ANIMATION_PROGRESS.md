# Animation coverage

## Back `BACK_ANIM_CONCAVE_ARC_SMALL` triple accepted (2026-08-04)

- **State:** exact for the eighteenth bounded player-back set: **18/25 back
  sets, 54/75 selector variants, 250/376 Factory mappings**. Generated set
  census: **27 mappings / 26 Factory species / 1 outside (MEW) / 36 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **129/128/127**
  `ANIM_CONCAVE_ARC_SMALL_TWICE` / normal / slow, guarded
  initializer-first callbacks, and the source `ConcaveArc` lifecycle with
  steps **8/6/4**, x/y amplitudes **4/6**, runs **2/1/1**, signed GBA `Sin`,
  strict `data[7] > 255`, C modulo-256 restart, decrement, reflected-y plus
  offset, terminal x2/y2 cleanup, `WaitAnimEnd`→dummy, non-affine OAM, and
  task restoration. WYNAUT/Jolly record **35** is twice/mod-0; PICHU/Rash
  **10** normal/mod-1; MARILL/Gentle **28** slow/mod-2; routing batch-checks
  all 27 source siblings.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_DIP_RIGHT_SIDE` (set 19): 38 mappings / 38 Factory / 0 outside
  / 68 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Wynaut **1838..1905 / 68 / 32,878 B /
  `b7e049dc55d79371ef383dd730fc777552969bda60017993cf133cae7a1ed4a6`**;
  Pichu **1837..1882 / 46 / 22,191 B /
  `ec53936c5fd61e982bd6427b259f423a067220ee97c151a385362c1fe84e3542`**;
  Marill **1838..1904 / 67 / 32,341 B /
  `f8e2fda9c1bd1cabad9da3eb53a2d1d90bbc1cf350cb6556bbcf99cbc09c9cea`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke **7/346**, full **691 files / 6,729
  passed / 1 skipped**, build (**553 modules**), and coverage are green. No
  boundary or unsupported-branch widening and no move promotion.

## Back `BACK_ANIM_CONVEX_DOUBLE_ARC` triple accepted (2026-08-03)

- **State:** exact for the seventeenth bounded player-back set: **17/25 back
  sets, 51/75 selector variants, 224/376 Factory mappings**. Generated set
  census: **27 mappings / 26 Factory species / 1 outside (JIRACHI) / 43
  Factory records**. Move coverage is unchanged at **107/276 exact, 0
  partial, 0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is
  unchanged.
- **Did:** ported source IDs **126/125/124**
  `ANIM_CONVEX_DOUBLE_ARC_TWICE` / normal / slow, their guarded
  initializer-first callbacks, and shared `ConvexDoubleArc`. The reducer
  preserves steps **8/6/4**, x amplitude **16**, current arc `data[4]=1`,
  terminal counts **3/2/2**, strict `data[7] > 256`, low/middle/high y
  regions, signed GBA `Sin`/C division, arc-parity x sign, restart,
  x2/y2 cleanup, `WaitAnimEnd`→dummy timing, and task restoration. Source
  correction: HOPPIP/LAX (record 29) is mod-1/normal and CASTFORM_1/HASTY
  (204) is mod-0/twice; valid receipts therefore use CASTFORM_1 twice,
  ZUBAT/SASSY (25) normal, and SWABLU/LONELY (93) slow.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONCAVE_ARC_SMALL` (set 18): 27 mappings / 26 Factory / 1
  outside (MEW) / 36 Factory records**.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/affine state: Castform
  twice **1840..1943 / 104 / 50,134 B /
  `435fe846a4b8243e09ca4e77e5d2f6478cab46f67cb75429118c6df8ad68fad6`**;
  Zubat normal **1837..1926 / 90 / 42,919 B /
  `75cf303c0cf744231e21f13f48b863ee021c3f70777c5f24606578958cb65fd1`**;
  Swablu slow **1838..1971 / 134 / 64,218 B /
  `f1ef314515109075460552612f482b5f0335715db3709a8f45c4cfcb761cd8f6`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; heap-sized typecheck is green. No boundary or
  unsupported-branch widening and no move promotion.

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
