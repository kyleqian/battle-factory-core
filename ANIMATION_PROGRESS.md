# Animation coverage

## Back `BACK_ANIM_DIP_RIGHT_SIDE` triple accepted (2026-08-04)

- **State:** exact for the nineteenth bounded player-back set: **19/25 back
  sets, 57/75 selector variants, 288/376 Factory mappings**. Generated set
  census: **38 mappings / 38 Factory species / 0 outside / 68 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **132/130/131**
  `ANIM_H_DIP_TWICE` / normal / fast, guarded affine initializers, and
  `SetHorizontalDip`: duration **30/60/90**, runs **2/1/1**, amplitude **8**,
  offset **-32**, exact `Sin((data[2] * 128) / data[7], 8)` u16 rotation,
  `SetPosForRotation`, `HandleSetAffineData`, strict `data[2] > data[7]`,
  twice reset-to-zero plus trailing increment, per-run x2/y2 and matrix
  reset, terminal-only `ResetSpriteAfterAnim`, `WaitAnimEnd`→dummy, affine
  OAM lifecycle, task restoration, and no `TryFlipX`. BALTOY record **75**
  Naughty/mod-0; SUNKERN record **0** Relaxed/mod-1; METAPOD record **8**
  Bashful/mod-2; routing batch-checks all 38 source siblings.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_SHRINK_GROW_VIBRATE` (set 20): 23 mappings / 22 Factory / 1
  outside (DEOXYS) / 70 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Baltoy **1838..1902 / 65 / 31,781 B /
  `155506b388538c586cbd03823a197ce8facbec36903b88f08d3fecf32f48ce53`**;
  Sunkern **1839..1902 / 64 / 30,932 B /
  `a2efd7c9d1574df2e8be311be3db7bfb9d93083bf44304de002ca200017d8ae3`**;
  Metapod **1839..1932 / 94 / 45,591 B /
  `913b57d6118fda7e98056ccaaa78f003a061b9f0cae587a3ebcc90eab261b5bd`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke, full `npm test`, build, and coverage
  are green. No boundary or unsupported-branch widening and no move
  promotion.

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
