# Animation coverage

## `MOVE_STEEL_WING` source/evidence partial (2026-08-04)

- **State:** **107/276 exact, 1 partial, 0 staged, 168 unsupported**.
  Steel Wing is deliberately not promoted: complete production framebuffer
  identity is **168/197 player-back** and **140/197 opponent-front**.
- **Did:** ported the source-relative GUST/IMPACT, elliptical, palette-cycle,
  two-gust affine/linear, mirrored slide, hitsplat, monbg/alpha and cleanup
  body behind the typed Scene-ON seam. Extracted GUST from pinned source.
  Source-audited Wing Attack and Razor Wind with explicit no-credit results.
- **Next:** reconcile the remaining live compositor differences (player ages
  9, 126, 144-164 and cleanup edge; opponent initial/front-idle and contact
  ranges), then rerun both complete windows twice before changing status to
  exact. GUST/TranslateMonElliptical still lack an exact representative.
- **Notes:** legal Hardy Factory Wingull record 45 vs legal Onix, complete
  197-frame windows through first inactive cleanup. Twice-fresh byte-identical
  evidence/raw RGB: player frames **77-273** `e321040c...f52` /
  `2f44c811...b69`; opponent frames **81-277** `7af04b35...659` /
  `25c8e06b...e1`. Receipts retain script state, tasks, software/hardware OAM,
  matrices, palettes/tags, registers/blend, audio/pan, and stable battlers.

## Back `BACK_ANIM_SHAKE_GLOW_BLUE` triple accepted (2026-08-04)

- **State:** player-back selector program complete: **25/25 sets, 75/75
  selector variants, 376/376 Factory mappings**. Generated row: **13
  mappings / 11 Factory species / 2 outside (LUGIA, KYOGRE) / 54 Factory
  records**. Move coverage remains **107/276 exact, 0 partial, 0 staged,
  169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **148/149/150** through the accepted shared
  `ShakeGlow_Blend` / `ShakeGlow_Move` lifecycle: `SHAKEGLOW_BLUE == 2`,
  even-tick `Sin(data[2], 12)` RGB_BLUE blending, fast/normal/slow **10/2,
  20/1, 80/1**, thresholds **54/54/24**, both `TryFlipX` calls no-op through
  the truthy `data[1]`/`sDontFlip` alias, and terminal coefficient-zero
  RGB_RED restoration. Real Factory representatives: SWAMPERT record **458**
  Adamant/mod-0, WAILMER **170** Docile/mod-1, STARMIE **439** Modest/mod-2;
  all 13 mappings route under all three nature mods.
- **Next:** player-back selector work is closed; await the supervisor's next
  bounded animation step. No move was promoted by this component acceptance.
- **Notes:** paired fresh, byte-identical dense Scene-ON initializer→
  WaitAnimEnd→dummy receipts retain every framebuffer hash plus player
  RAM/OAM/task and unfaded/faded/hardware OBJ palettes: Swampert **1840..1970
  / 131 / 134,294 B / `4f5ff4465b1a6ec30a1d61e9467ce47d29307a5aca14eb5a4139e56fa98b615e`**;
  Wailmer **1839..1969 / 131 / 133,489 B /
  `cf50bd129485c7973a8ed2899c47a031ab8151d04a3952b7fabf2f423563c6a1`**;
  Starmie **1839..1969 / 131 / 133,425 B /
  `34dbd9c657faaf5417ec6eb1849b84e1e41b920e17d1220448c668319e36dfe4`**.
  No Lugia/Kyogre oracle variants were invented. **Accounting correction:**
  accepted sets 1–24 sum to **365**, not the previously carried 366 (+1
  arithmetic error); corrected cumulative figures are set20 **310**, set21
  **343**, set22 **351**, set23 **364**, set24 **365**. Per-row censuses were
  already correct and are unchanged. Focused red/green/blue plus both
  ratchets: **8 files / 45 tests**; typecheck, smoke **7/347**, full **710
  files / 6,847 passed / 1 skipped**, build, and coverage are green. No
  boundary/unsupported widening or coverage-ledger mutation.

## Back `BACK_ANIM_SHAKE_GLOW_GREEN` triple accepted (2026-08-04)

- **State:** exact for the twenty-fourth bounded player-back set: **24/25 back
  sets, 72/75 selector variants, 365/376 Factory mappings**. Generated row:
  **2 mappings / 1 Factory species (ROSELIA) / 1 outside (CELEBI) / 2
  Factory records**. Move coverage remains **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at
  SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **145/146/147** through the accepted shared
  `ShakeGlow_Blend` / `ShakeGlow_Move` lifecycle: `SHAKEGLOW_GREEN == 1`,
  green blend, fast/normal/slow **10/2, 20/1, 80/1**, thresholds
  **54/54/24**, and terminal RGB_RED coefficient-zero restoration.
  `data[1]` aliases `sDontFlip`, so both `TryFlipX` calls are no-ops for
  green, unlike red. Batch routing covers both mappings under all three
  nature mods and both real ROSELIA records **171/276** (Docile/mod-1).
- **Next:** await the supervisor's next bounded player-back selector step;
  blue ShakeGlow set 25 remains an independent acceptance unit.
- **Notes:** paired fresh, byte-identical Scene-ON initializer→WaitAnimEnd→
  dummy receipts retain every framebuffer hash plus player RAM/OAM/task and
  unfaded/faded/hardware OBJ palettes: real record-171 normal **1839..1969 /
  131 / 130,940 B / `38dcc94a15e253c112e84b0b844d5f41bd9ba9ef9e968c797638b458f3d21938`**;
  transparently staged record-171 Hardy fast **131,618 B /
  `6a1395b23696509bdd09a9e49bc58e80e3219b16de26cb1742d77ef552cb1b2e`**;
  Quiet slow **131,677 B /
  `76013269c7bb6c31429b41a7ef69dd0cdfd1dfb386043b3edfa391d94b9013fc`**.
  No Celebi oracle variant was invented. Focused green/red regression plus
  both ratchets: **6 files / 33 tests**; typecheck, smoke **7/347**, full
  **708 files / 6,835 passed / 1 skipped**, build (**554 modules**), and
  coverage are green. No boundary/unsupported widening, coverage-ledger
  mutation, or move promotion.

## Back `BACK_ANIM_SHAKE_GLOW_RED` triple accepted (2026-08-04)

- **State:** exact for the twenty-third bounded player-back set: **23/25 back
  sets, 69/75 selector variants, 364/376 Factory mappings**. Generated row:
  **15 mappings / 13 Factory species / 2 outside (HO_OH, GROUDON) / 42
  Factory records**. Move coverage remains **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at
  SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **142/143/144**, `ShakeGlow_Blend`,
  `ShakeGlow_Move`, `SHAKEGLOW_RED`, even-callback signed `Sin(data[2],12)`
  palette blend/restore, selector parameters **10/2, 20/1, 80/1**,
  thresholds **54/54/24**, C division/mod-256 movement, data[3]/[5]
  sequencing, trailing data[2] increment, WaitAnimEnd→dummy, and task
  restoration. PONYTA record **191** Hardy/mod-0; SLUGMA **30**
  Sassy/mod-1; MAGCARGO **194** Gentle/mod-2; all 15 mappings batch-route
  under every nature mod.
- **Next:** await the supervisor's next bounded player-back selector step;
  green/blue ShakeGlow sets 24-25 remain independent acceptance units.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/task and unfaded/faded/
  hardware OBJ palette state: Ponyta **1838..1968 / 131 / 129,634 B /
  `5cec6564e1dccb9cda0a539647abbeb7b26e9d9138e3aa5d9e35fe365635dafa`**;
  Slugma **1838..1968 / 131 / 129,882 B /
  `cdcca3b12bd03086ee6ddd104cef245d62e6d3e645fb217adbbd42d812bcd295`**;
  Magcargo **1840..1970 / 131 / 130,055 B /
  `0fbfc262f9ccbec3e9736d26e2e768a609c2e5519a88cad84aedf310b2d5e9b4`**.
  Palette hardware is one-frame-lagged throughout; after the generic
  materialization task releases the palette at callback 24, every sine-rise,
  peak, fall, and red restore is exact. **Brief correction:** data[1] is the
  `sDontFlip` alias; writing `SHAKEGLOW_RED == 0` makes both TryFlipX calls
  active, so the ROM negates movement x2 (fast callback 55 is −4), proved in
  all receipts. Focused evidence + both ratchets: **4 files / 21 tests**;
  typecheck, smoke **7/347**, full **706 files / 6,823 passed / 1 skipped**,
  build, and coverage are green. No boundary/unsupported widening, outside-
  species oracle invention, coverage-ledger mutation, or move promotion.

## Back `BACK_ANIM_SHAKE_FLASH_YELLOW` triple accepted (2026-08-04)

- **State:** exact for the twenty-second bounded player-back set: **22/25 back
  sets, 66/75 selector variants, 351/376 Factory mappings**. Generated set
  census: **8 mappings / 8 Factory species / 0 outside / 33 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **139/140/141**, initializer pre-increment,
  `SetShakeFlashYellowPos`, all three `sShakeYellowFlashData` u8 tables and
  selector, and shared `ShakeFlashYellow`: cadence/sign flip, signed `-1`
  sentinel observed as 255, data[4]/[5]/[6] order, `OBJ_PLTT_ID`, yellow/zero
  `BlendPalette`, terminal x2/palette restoration, `WaitAnimEnd`→dummy, and
  task restoration. RAICHU record **487** Adamant/mod-0; PIKACHU **66**
  Docile/mod-1; LANTURN **381** Quiet/mod-2; all 8 mappings route under every
  real nature mod.
- **Next:** await the supervisor's next bounded player-back selector step;
  red/green/blue ShakeGlow sets 23-25 remain separate acceptance units.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/task and unfaded/faded/
  hardware OBJ palette state: Raichu **1838..1921 / 84 / 87,343 B /
  `1cfae5f795ab25c9b9182229f08fb448fba6120bce404de4059eaa327d98e97a`**;
  Pikachu **1839..1897 / 59 / 61,508 B /
  `583fd84fa59aed49dacfdabd291c94774ec058d49d87c3c58d010b2adc39a4cb`**;
  Lanturn **1839..1916 / 78 / 82,728 B /
  `5518bbe2a4ad1817190863e43e2ce70b2e9f3e0ae6f5153cbb78ef204d9a314c`**.
  Palette transfer is one-frame-lagged except Raichu frame 1844's observed
  same-frame restoration transfer. Focused source/census/routing/reducer/
  palette evidence plus both ratchets: **4 files / 23 tests**; typecheck,
  smoke **7/347**, full **704 files / 6,811 passed / 1 skipped**, build
  (**554 modules**), and coverage are green. No boundary/unsupported widening
  or move promotion.

## Back `BACK_ANIM_JOLT_RIGHT` triple accepted (2026-08-04)

- **State:** exact for the twenty-first bounded player-back set: **21/25 back
  sets, 63/75 selector variants, 343/376 Factory mappings**. Generated set
  census: **33 mappings / 33 Factory species / 0 outside / 74 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **136/137/138** `Anim_JoltRight_Fast` / normal /
  slow, their unguarded `HandleStartAffineAnim` initializers, and shared
  `JoltRight` phases `_0`/`_1`/`_2`/`_3`: signed x2 travel/clamp,
  accelerating return `data[7]`, strict `>` clamp, alternating signed
  `data[4]`, oscillation count, reset, `WaitAnimEnd`→dummy, and task
  restoration. Each source phase's two `TryFlipX` calls are retained; the
  player-back task's `sDontFlip=TRUE` makes them no-ops. MACHOP record **82**
  Adamant/mod-0; ELECTRIKE **64** Docile/mod-1; ELECTRODE **396** Quiet/mod-2;
  all 33 mappings route through the generated nature table.
- **Next:** await the supervisor's next bounded player-back selector step;
  do not infer move acceptance from this shared back-sprite track.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine/task state:
  Machop **1838..1875 / 38 / 18,361 B /
  `97166605e5f413f011a2e2851b507f094a32eced476ed50a040da850a100e01a`**;
  Electrike **1841..1873 / 33 / 16,000 B /
  `74ba2bf876194fbba6803eee2f35c7e7650604898d239173f63f36a72f821377`**;
  Electrode **1841..1863 / 23 / 11,425 B /
  `af21667986fab28c40b7bfe7d9934bc93e37615772459584b18702abd88b7141`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 20 tests**; typecheck, smoke **7/347**, full `npm test`, build, and
  coverage are green. No boundary or unsupported-branch widening and no move
  promotion.

## Back `BACK_ANIM_SHRINK_GROW_VIBRATE` triple accepted (2026-08-04)

- **State:** exact for the twentieth bounded player-back set: **20/25 back
  sets, 60/75 selector variants, 310/376 Factory mappings**. Generated set
  census: **23 mappings / 22 Factory species / 1 outside (DEOXYS) / 70
  Factory records**. Move coverage stays **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **133/134/135**, guarded initializer-first
  affine callbacks, and `ShrinkGrowVibrate`: cycle/duration **40/80,
  40/40, 80/80**, alternating even/odd amplitudes **32/8**, exact u16
  phase construction and signed `sinY / 8`, strict `data[2] > data[7]`,
  trailing increment, affine/OAM reset, `WaitAnimEnd`→dummy, task
  restoration, and player-back no-flip. SHEDINJA record **21** Naive/mod-0;
  RALTS **5** Docile/mod-1; ABRA **90** Lonely/mod-2; all 23 mappings route.
- **Next:** source-ranked unsupported player-back set **`BACK_ANIM_JOLT_RIGHT`
  (set 21): 33 mappings / 33 Factory / 0 outside / 74 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Shedinja **1840..1923 / 84 / 40,911 B /
  `c2a45100d6439267f90292268772216844e2a2bb642c93a68dffe8570be85df4`**;
  Ralts **1837..1880 / 44 / 21,548 B /
  `a9b1f9c6c8d3ef0ee8dab0c39af346404c96e9781ebc7446152530023c42a1b9`**;
  Abra **1836..1919 / 84 / 40,902 B /
  `3cdc7412eeedcf3a52a48d355bbc8dd7754a5e1c981227ea21434ea211e0b8d6`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 21 tests**; typecheck, smoke **7/346**, full **695 files / 6,752
  passed / 1 skipped**, build (**553 modules**), and coverage are green. No
  boundary or unsupported-branch widening and no move promotion.

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
