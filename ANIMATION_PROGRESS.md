# Animation coverage

## Front `ANIM_SWING_CONVEX` Factory family accepted (2026-08-01)

**Verdict / counts:** rung 2w is exact for the normal lifecycle and all **4
Factory-reachable acceptance siblings**: WEEPINBELL, GOLDEEN, MANTINE,
BANETTE. The complete generated census is **6 selector mappings**; MEW and
JIRACHI are source-derived outside-Factory mappings only, with no fresh
outside-Factory acceptance claim. WEEPINBELL is the representative and BANETTE
the terminal Factory sibling. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1038-1059,
2552-2589,3855-3871` proves task-zeroed data, `InitAnimData` defaults, normal
front `sDontFlip=TRUE`, and the duration-100/single-run initializer. All **101
active callbacks** (data2=0..100) pin C-truncated indices, GBA sine x2 writes,
negative affine rotation, both no-op `TryFlipX` calls, and tick-0 affine start.
Tick 101 restores identity/x2=0, calls `ResetSpriteAfterAnim`, installs
`WaitAnimEnd`, and increments data2 to 102. The shared reducer regression-pins
the accepted concave lifecycle; `ANIM_SWING_CONVEX_FAST` (50 x 2) and unused
`ANIM_SWING_CONVEX_FAST_SHORT` (50 x 1) remain explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both selected species at x2=0/y2=0,
animNum=1/`SpriteCallbackDummy`; paired raw outputs are byte-identical with no
EOF newline: WEEPINBELL SHA-256
`a7ae6c5bf088e3a523a0da3cf178eac2024e3e7a1ed02d336a4df831ee44b12e`,
BANETTE `95b70a54be18eaa93e3cb8a2a4d4a2ce19e1b261f03ff82a1628fcae87c25dfb`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party and paired raw `cmp`; focused
family plus both ratchets **204/204**; `npx tsc --noEmit` and diff checks green;
exactly one complete `npm test` is green at **572 files, 5,926 passed + 1
skipped**; production build is green (**534 modules transformed**). The next
source-ranked generated census family is **`ANIM_BOUNCE_ROTATE_TO_SIDES`**
(5 mappings / 5 Factory / 0 outside): MAROWAK, MAGIKARP, SEEDOT, MEDITITE,
ILLUMISE.

## Front `ANIM_SHRINK_GROW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2v is exact for all **6 selector mappings / 6
Factory-reachable species**, with **zero outside-Factory mappings**: WARTORTLE,
NIDORINO, KOFFING, RHYDON, SLOWKING, GLIGAR. WARTORTLE is the representative
and GLIGAR the terminal sibling; all six selectors are batch-pinned and every
prior accepted front family remains regression-pinned. Move coverage stays
**107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
Follow-up verification repair: the dynamic selector census now crosses an
explicit read-only `Record<string, string>` boundary; assertions and production
animation code are unchanged.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1878-1912`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
and the normal `(data6,data7)=(8,3)` initializer. All **49 active callbacks**
(data2=0..48) pin u8-masked phase advance, GBA sine x/y scales, C-truncated
positive-sine y compensation, and y2=0..4. Tick 49 restores identity/y2=0,
calls `ResetSpriteAfterAnim`, and installs `WaitAnimEnd` without incrementing
data2/data4 (49/136). Distinct `ANIM_SHRINK_GROW_FAST` `(8,5)` and
`ANIM_SHRINK_GROW_SLOW` `(4,3)` selectors remain explicitly unaccepted.
Fresh complete legal Scene-ON parties settle both selected species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`; paired raw outputs are byte-identical
with no EOF newline: WARTORTLE SHA-256
`e4c09e7b1c413acc21745c649e7bb493ea87ff51d648181ae77bf7d6f2466005`,
GLIGAR `5dbf9079a53eb71470f474107391fc9f05ad9cf6604d1d807b561729b6d820d6`.

**Commands / next:** the preceding acceptance evidence remains the unchanged
`dump-onix-front-idle-anim.py` via `tools/run-mgba-probe.py` twice per legal
party and paired raw outputs cited above. This repair independently verified
the focused family plus both ratchets at **195/195**, `npx tsc --noEmit` green,
exactly one complete `npm test` at **572 files, 5,917 passed + 1 skipped**, and
one `npm run build` green (**534 modules transformed**). The next source-ranked
generated census family is **`ANIM_SWING_CONVEX`** (6 selector mappings / 4
Factory / 2 outside): WEEPINBELL, GOLDEEN, MEW, MANTINE, BANETTE, JIRACHI.

## Front `ANIM_CIRCULAR_STRETCH_TWICE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2u is exact for all **6 selector mappings / 6
Factory-reachable species**, with **zero outside-Factory mappings**: DITTO,
MUDKIP, SWELLOW, WAILMER, MINUN, REGIROCK. DITTO is the representative and
REGIROCK the terminal sibling; every prior accepted front family remains
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1087-1109`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
and all **41 active callbacks** (data2=0..40) with C-truncated
`(data2*512/40)%256` indices and amplitude-32 GBA sine/cosine scales in
data4/data5. Tick 41 writes identity affine, calls `ResetSpriteAfterAnim`,
installs `WaitAnimEnd`, and increments data2 to 42. Fresh complete legal
Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired raw outputs are byte-identical with no EOF
newline: DITTO SHA-256
`26cae4ff0244a36a7cb6dbea0e7cfbe94b506ec4a86bea200f5032c433dc595e`,
REGIROCK `5d2e0fb67df2033d4868db97e13f5bf473d34c9b5a498a4da42d90847cb7c7d3`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **186/186**; TypeScript no-emit and diff checks green; exactly one
full `npm test` and one `npm run build` green. The next source-ranked generated
census family is **`ANIM_SHRINK_GROW`** (6/6 Factory species, zero outside):
WARTORTLE, NIDORINO, KOFFING, RHYDON, SLOWKING, GLIGAR.

## Front `ANIM_H_SLIDE_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2t is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: WEEDLE,
PARAS, GRIMER, EXEGGCUTE, MR_MIME, SUDOWOODO, NINJASK. WEEDLE is the
representative and NINJASK the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1131-1153,
3665-3669,4118-4122` proves task-zeroed data, slow initializer data0=80,
normal-front `sDontFlip=TRUE`, both `TryFlipX` no-ops, and all **81 active
callbacks** (data2=0..80) with C-truncated `(data2*384/80)%256` indices and
amplitude-6 GBA sine x2 writes. Tick 81 clears x2, installs `WaitAnimEnd`, and
increments data2 to 82. The distinct normal data0=40 and fast data0=20
initializers remain explicitly unaccepted. Fresh complete legal Scene-ON
parties settle both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`.
Paired raw outputs are byte-identical with no EOF newline: WEEDLE SHA-256
`ddf75e4d3e1dad7197ca10ddae1cb595c732d84c4abb5af3e60bd24906d120dd`,
NINJASK `830d8fbd9726a2c15d951a66350390d444737c5872723bb17ab7c847f39bab45`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **177/177**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5869 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_CIRCULAR_STRETCH_TWICE`** (6 Factory species).

## Front `ANIM_FLASH_YELLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2s is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: PIKACHU,
MAGNETON, ELECTABUZZ, ZAPDOS, AMPHAROS, ELEKID, RAIKOU. PIKACHU is the
representative and RAIKOU the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:603-620,911-939,
2473-2509` plus `palette.h:20-24` proves the exact 13-row
`sYellowFlashData`, task-zeroed data, palette capture through
`OBJ_PLTT_ID(oam.paletteNum)`, and all **56 active callbacks**. The reducer
pins every duration transition, the one-callback-delayed 12 palette writes,
full-strength coefficient 16 `RGB_YELLOW` flashes, coefficient 0 restores,
and tick 56's `(u8)-1` sentinel/`WaitAnimEnd` cleanup after the final restore.
Fresh complete legal Scene-ON parties settle both species at x2=0/y2=0,
animNum=1, and `SpriteCallbackDummy`. Paired raw outputs are byte-identical
with no EOF newline: PIKACHU SHA-256
`2e83c09bdb040ef1ff8637a260f94ac6dcfe33c6f967b56b984348a848884968`,
RAIKOU `b72527919f77b4f34bb43feba56c36876de8adafc321b481f0142d09de3e109f`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **168/168**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5855 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_SLIDE_SLOW`** (7 Factory species).

## Front `ANIM_H_STRETCH` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2r is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: EKANS,
HITMONLEE, QUAGSIRE, SNEASEL, TYROGUE, TORCHIC, ALTARIA. EKANS is the
representative and ALTARIA the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1562-1595`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
all **41 active callbacks** (data2=0..40), exact GBA sine and C truncation,
the data2=10..29-only data7/index1 modulation, s16 wrapping/u8 masking, signed
affine scales, and tick 41 identity/reset/`WaitAnimEnd` cleanup with data2=42.
The distinct `ANIM_H_STRETCH_FAR`, `_FAR_TWICE`, and `_FAR_SLOW` back selectors
remain unaccepted. Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired raw outputs are byte-identical
with no EOF newline: EKANS SHA-256
`910a3f50de504e27097b7eb7a4b445229888540513362c16912bee88addadb44`,
ALTARIA `24dddba203497ba399c2944bbf7a636edb3ced114e5bc4d44ddc7dee826176e9`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **159/159**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5851 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_FLASH_YELLOW`** (7 Factory species).

## Front `ANIM_H_VIBRATE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2q is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: BEEDRILL,
ARCANINE, SCYTHER, SCIZOR, HITMONTOP, SHIFTRY, DUSCLOPS. BEEDRILL is the
representative and DUSCLOPS the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1110-1129`
proves Task-zeroed data0/data2..data7 and the exact source-ordered normal
callback with no affine setup or `TryFlipX`. All **41 active callbacks**
(data2=0..40) are pinned for alternating +1/-1 signs, C-truncated indices,
and amplitude-6 GBA sine x2 writes. Tick 41 clears x2, installs `WaitAnimEnd`,
and increments data2 to 42. The distinct amplitude-9 `ANIM_H_VIBRATE_FAST`
and amplitude-12 `ANIM_H_VIBRATE_FASTEST` remain explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no
EOF newline: BEEDRILL SHA-256
`4657eaa59c66c769b56a4f1db250b3ba24ee7b1789e7a7d0c01db99fe0cd98ca`,
DUSCLOPS `b13802454ef9b92cf94aa210d4027f2ce67a12ae96dc7ca252c044782561f3f3`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **148/148**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5840 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_STRETCH`** (7 Factory species).

## Front `ANIM_H_JUMPS` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2p is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: WIGGLYTUFF,
ABRA, MACHAMP, TOTODILE, NATU, SMEARGLE, SPINDA, VIGOROTH. WIGGLYTUFF is the
representative and VIGOROTH the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,2720-2753`
proves Task-zeroed data0/data2..data7, normal-front `sDontFlip=TRUE`, both
`TryFlipX` calls as no-ops, and the exact C-truncated counter/128 switch,
remainder arithmetic, and GBA sine y2 writes. All **43 active callbacks** are
pinned at counters 0..504 in steps of 12 across all four x2 legs. The next
callback observes counter=516, clears x2/y2, installs `WaitAnimEnd`, increments
data2 to 528, and performs the second no-op flip. Fresh complete legal Scene-ON
parties settle both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`.
Paired direct raw outputs are byte-identical with no EOF newline: WIGGLYTUFF
SHA-256 `ace0d70d460715a093f9830d074e6e3d6cea3e2741b3fb80054ea2a4ecda558f`,
VIGOROTH `9e7ad2953ca1a23d4864d476c6da558a6ac0af556404785f63cc47fa26fbaa2f`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **139/139**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5831 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_VIBRATE`** (7 Factory species).

## Front `ANIM_H_SLIDE_WOBBLE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2o is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: BUTTERFREE,
GOLBAT, CLOYSTER, KABUTO, BALTOY, LUVDISC, CASTFORM, CHIMECHO. BUTTERFREE is
the representative and CHIMECHO the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1803-1833`
proves Task-zeroed data0/data2..data7, normal-front `sDontFlip=TRUE`, both
`TryFlipX` no-ops, tick-0 affine start, C-truncated index/var arithmetic, var's
u8 mask, every GBA sine x2 and signed-s16-to-u16 affine-rotation write, data2
increment order, and tick-101 identity/x2/reset/`WaitAnimEnd` cleanup after
**101 active callbacks (ticks 0..100)**. The shared slide-wobble reducer is
also pinned callback-for-callback against the existing source-faithful KABUTO
presentation reducer. Fresh complete legal Scene-ON parties settle both species
at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: BUTTERFREE SHA-256
`6e578f80ba3c04fe2048ff3ecc0ae2788dce350239907594d7bd01c30ea4961d`,
CHIMECHO `a6bda637cc6e6993afce75b7f934113a1ffd5db5d5cd44f77072114c6929a2be`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **130/130**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5822 passed + 1 skipped** and one `npm run build`
green. The next source-ranked generated census family is **`ANIM_H_JUMPS`**
(8 Factory species).

## Front `ANIM_V_SLIDE_WOBBLE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2n is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: SEAKING,
HOPPIP, MISDREAVUS, SHEDINJA, PELIPPER, WAILORD, GOREBYSS, SHUPPET. SEAKING
is the representative and SHUPPET the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,984-1028,
1735-1766,3761-3765` proves Task zeroed data defaults, normal data0=10,
tick-0 affine start, C-truncated index/var arithmetic, var's u8 mask, every GBA
sine y2 and signed-s16 to u16 affine-rotation write on the normal-front
`sDontFlip=TRUE` path, data2 increment order, and tick-101 identity/y2/reset/
`WaitAnimEnd` cleanup after **101 active callbacks (ticks 0..100)**. The
distinct Small initializer data0=5 remains explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no EOF
newline: SEAKING SHA-256
`06751f507c7530342cd859a0b16d8830b55a2ce2f52d82e6857ea13b25c1381b`,
SHUPPET `3f180c13952503be637c5aaa329a8121ef3eaf0d1098c664e15fe381d11502ef`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **120/120**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5812 passed + 1 skipped** and one `npm run build`
green. The next source-ranked generated census family is
**`ANIM_H_SLIDE_WOBBLE`** (8 Factory species).

## Front `ANIM_V_SHAKE_TWICE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2m is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: BLASTOISE,
POLIWRATH, TAUROS, DONPHAN, EXPLOUD, AGGRON, CRADILY, BAGON. BLASTOISE is the
representative and BAGON the sibling; every prior accepted front family remains
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:622-628,911-939,
1638-1678,3754-3759` proves Task data0/data2..data7 zeroing, normal data0=48,
the complete u8 table, every cast/amplitude/sine/state write, and the distinct
unused Slow data0=24 initializer. The ROM's `__divsi3` at `0x082e7540` returns
zero for the terminal sentinel's source-order 0/0 before y2=0/`WaitAnimEnd`.
The expected lifecycle is independently confirmed: **78 active callbacks** in
**31/16/31** phases, with every boundary/reset pinned and sentinel cleanup at
tick 78. Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: BLASTOISE SHA-256
`333c436ec56ad12d0d8d3586f86af7f4feb076a5234a646c194f6705ab826a87`,
BAGON `9accac67bde9270bfe8898e45ea5160783fc08dc47fcfbd0d8fea1ca995fdf16`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **111/111**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5803 passed + 1 skipped** and one `npm run build`
green. The next generated-census tie is 8 Factory species; source order ranks
the adjacent **`ANIM_V_SLIDE_WOBBLE`** family next.

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2l is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**. JIGGLYPUFF
is the representative and GYARADOS the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial /
0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1003-1077,
1915-2001,3679-3699` proves the normal-front `sDontFlip=TRUE` path,
`AddNewAnim` defaults, Small rotation=2048/data6/data=0, the normal-speed table,
affine start, both `TryFlipX` calls, and all 87 active writes across the 8-tick
first leg plus six 12-tick legs. The generalized source-order reducer pins C
signed truncation, u16 rotation, every x2/y2/affine write and leg/reset
transition, then tick 87's identity/x2/y2/`ResetSpriteAfterAnim`/`WaitAnimEnd`
cleanup. Slow remains rotation=4096/data=1 and SmallSlow remains
rotation=2048/data=1. Fresh complete legal Scene-ON parties settle both species
at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: JIGGLYPUFF SHA-256
`bb3d61bffa2354eac237e0bbdf6ed46ae03a14420ce80da7477ec40d5c0a1ba2`,
GYARADOS `2642520d74a64f6b47f6cd472e2e9d5e20d75a32e6416c44e218bfd79cdcee74`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family/
boundary-ratchet tests **102/102**; TypeScript no-emit and diff checks green;
exactly one full `npm test` **567 files, 5794 passed + 1 skipped** and one
`npm run build` green. The next generated-census/source-ranked front family is
**`ANIM_V_SHAKE_TWICE`** (8 Factory species).

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2k is exact for all **9 selector mappings / 9
Factory-reachable species**, with **zero outside-Factory mappings**. VILEPLUME
is the representative and LOUDRED the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial /
0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1003-1077,
1915-2001,3679-3699` proves the normal-front `sDontFlip=TRUE` path, full fast
and slow tables, `AddNewAnim` defaults, slow `data6/data=1`, affine start, both
`TryFlipX` calls, and all 167 active writes across the 16-tick first leg plus
six 24-tick legs. The source-order reducer pins C signed truncation, u16
rotation, x2/y2/affine writes, every leg/reset transition, and tick 167's
identity/x2/y2/`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup. Source correction:
normal `Slow -> Anim_BounceRotateToSides` uses rotation **4096**; **2048** is
exclusive to the distinct `Small`/`SmallSlow` initializer. Fresh complete legal
Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no EOF
newline: VILEPLUME SHA-256
`891884d74ae18521c3e4963b01d290653f988cdbe5045e87c3860bd847cfd2f2`,
LOUDRED `f0dadc0c0711f44386e832a5f2ea862e967096fe27b56686bdc53ff210e9c3bc`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family/
boundary-ratchet tests **85/85**; TypeScript no-emit and diff checks green;
exactly one full `npm test` **567 files, 5783 passed + 1 skipped** and one
`npm run build` green. The next generated-census/source-adjacent front family
is **`ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL`** (8 Factory species).

## Front `ANIM_H_JUMPS_V_STRETCH` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2j is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. MANKEY is
the representative and WYNAUT the sibling; all prior front families remain
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1031-1064,
2755-2868,3805-3815` proves the normal-front `sDontFlip=TRUE` path,
`AddNewAnim` defaults, and the single-run data=-1/runs=1 distinction from
`_Twice`'s data=1/runs=2. The source-order reducer pins affine start; `_0`
active ticks 0-10 and strict transition 11; `_1` active ticks 12-60 and
transition 61; `_2` active ticks 62-72; then tick 73's x2/y2/identity-affine/
`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup and final data2 increment to 144.
Every C-truncated jump, sine, scale, counter, phase reset, and normal-front
`TryFlipX` boundary is pinned. Fresh complete legal Scene-ON parties settle
both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw
outputs are byte-identical with no EOF newline: MANKEY SHA-256
`dd828c5122f1693d1a947794c315648eb3fd1edbb15b0d988667d9de8ffb5161`,
WYNAUT `0998becc3884e86138b282f1a17b153827575583adeac15283618a98b2bc9d61`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **81/81**; exactly one full `npm test` **567 files, 5773 passed +
1 skipped** and `npm run build` green. The next generated-census/source-ranked
front family is **`ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW`** (9 Factory species).

## Front `ANIM_V_JUMPS_SMALL` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2i is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. CHARMANDER
is the representative and DELIBIRD the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1181-1208,3768-3773`
proves and is ported in source order: data0=3; accumulator step 12; all 33
active callbacks (0..384); C signed-division branches; counter-256 adjustment;
GBA u8 sine indices; data0*2/data0*3 amplitudes; then tick 33's strict
counter>384 x2/y2/`WaitAnimEnd` cleanup and final increment to data2=408.
Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: CHARMANDER SHA-256
`11290c70ee4cef6463fa4878ad94c665f080c6ae2cd03fe4b41354add0227518`,
DELIBIRD `ab44bf5b7111e37d8f491e24a1f0aa0ce6a331d7220ae231f74d3c9741626661`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **71/71**; exactly one full `npm test` **567 files, 5763 passed +
1 skipped** and `npm run build` green. The next generated-census/source-ranked
front family is **`ANIM_H_JUMPS_V_STRETCH`** (10 Factory species).

## Front `ANIM_V_SLIDE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2h is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. SEADRA is
the representative and MARSHTOMP the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:910-939,1038-1042,
1156-1180` proves and is ported in source order: normal-front
`sDontFlip=TRUE`; data0=40; both `TryFlipX` calls; all 41 active C-index and
negated-sine y2 writes; then tick 41's strict `data2 > data0` guard,
y2/`WaitAnimEnd` cleanup, second flip and final data2 increment. Fresh complete
legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no
EOF newline: SEADRA SHA-256
`c70a070b61918ed2e3c0f1bbe3b1be778d63ee29865a13176f1683ab5e17963a`,
MARSHTOMP `f29ff01ed2a5fc6b732da0955e4029559063e0a2acc7db7b9fbbfaa84ca1ec68`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **63/63**; exactly one full `npm test` **567 files, 5755 passed +
1 skipped** and `npm run build` green. Among the remaining 10-species census
tie, the source-ranked next family is **`ANIM_V_JUMPS_SMALL`**.

## Front `ANIM_SWING_CONCAVE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2g is exact for all **11 selector mappings / 11
Factory-reachable species**, with **zero outside-Factory mappings**. SQUIRTLE
is the representative and SHUCKLE the sibling; all seven prior front families
remain regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:910-939,1038-1059,
2512-2542,3836-3843` proves and is ported in source order: the normal-front
`sDontFlip=TRUE` path; `AddNewAnim`'s explicit rotation/delay/runs/speed/data
defaults; data=100; tick-0 affine start; both `TryFlipX` calls; all 101 active
C-index/x2-sine/rotation-affine writes; and tick-101's strict guard,
identity/x2/reset/`WaitAnimEnd` cleanup, and final data2 increment. Fresh
complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired raw outputs are
byte-identical with no EOF newline: SQUIRTLE SHA-256
`e09a8302d4a11998a8b719017563adafff8e43c3be61f5f5c7996cab41e3a712`,
SHUCKLE `e68670c57fea068ff9e3b6871973dc83af89e171dce3a3cbe9ba6e019f1433a0`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **55/55**; exactly one full `npm test` **567 files, 5747 passed +
1 skipped** and `npm run build` green. The generated Factory selector census
ranks **`ANIM_V_SLIDE` (10 species)** next.

## Front `ANIM_GROW_VIBRATE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2f is exact for all **18 selector mappings**, the
derived **16 Factory-reachable species**, and the two outside-Factory mappings
**MEWTWO + HO_OH**. KADABRA is the representative and REGISTEEL the sibling;
all six prior front families remain regression-pinned. Move coverage stays
**107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1257-1286` is ported in
source order: tick 0 `HandleStartAffineAnim`, all 41 active callbacks with C
index truncation and even/odd 32/8 sine amplitudes, then strict `data2 > 40`
identity-affine/`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup and the final
data2 increment at tick 41. Fresh complete legal Scene-ON parties settle both
species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`; paired direct raw probe
outputs are byte-identical with no EOF newline: KADABRA SHA-256
`54e722be9865fa649ce1b4913ebd72c06ee23c4c092cd3c13ea7943e538d52bf`,
REGISTEEL `06dba32da33afb561f90b10e6a5551a41f3efe3735eedc522f46a65c0ca19471`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **48/48**; one full `npm test` **567 files, 5740 passed + 1
skipped** and `npm run build` green. The generated Factory selector census
ranks **`ANIM_SWING_CONCAVE` (11 species)** next.

## Front `ANIM_H_SHAKE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2e is exact for all **17 selector mappings**, the
derived **16 Factory-reachable species**, and the sole outside-Factory mapping
**RAYQUAZA**. KABUTOPS is the representative and BLAZIKEN the independently
probed sibling; all five prior accepted front families remain regression-pinned.
Move coverage remains **107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` stays byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1343-1366` proves
`Anim_HorizontalShake` sets data0=60/data7=3, invokes `HorizontalShake`, then
installs that callback. The source-order reducer pins every active callback at
ticks **0-38** (accumulators 0-2280), the strict **2340 > 2304** guard, and tick
**39** terminal x2=0/y2=0/`WaitAnimEnd` cleanup. Complete legal Scene-ON parties
settle both species at animNum=1/`SpriteCallbackDummy`; paired direct raw probe
outputs are byte-identical with no EOF newline: KABUTOPS SHA-256
`96894be4819931417816ecffecd9eb114441a08751d046bb2e8b38d0f12cae34`,
BLAZIKEN `44025025cca8950231cae7f7d494c519b61029503834956055f57af9ef0cfc86`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` through
`tools/run-mgba-probe.py` twice per party; `cmp` both raw pairs; focused
animation tests **36/36** plus executable ratchets **6/6**; one full `npm test`
and `npm run build` green. Next exact front family: **`ANIM_GROW_VIBRATE`**.

## Front `ANIM_V_SQUISH_AND_BOUNCE_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2d is exact for all **16 selector mappings / 16
Factory-reachable species**. LICKITUNG represents the family and MILTANK is
the independently probed sibling. The prior four accepted front families are
regression-pinned. Coverage remains **107 exact / 0 partial / 0 staged / 169
unsupported**; `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1834-1870,3658-3663`
proves the slow initializer reuses `VerticalSquishBounce` and changes only
`data[0]` from 16 to 32. The source-order reducer pins active ticks **0-96**
and tick **97** terminal x2=0/y2=0, identity affine, normal affine mode and
`WaitAnimEnd`; fresh settled Scene-ON receipts pin animNum=1 and
`SpriteCallbackDummy`. Paired direct probe outputs are byte-identical (no EOF
newline): LICKITUNG SHA-256
`b886194e2bdaf8a1c3f67dcd17afe727f70e3bcad8955374a1d50aff2291c360`,
MILTANK `65731784a67a75e0ecdc4e58ae8d4de8be01c1c6f27a2520b36e6e6c7ba3f3c1`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; `cmp` both pairs; focused
animation tests **30/30**; full `npm test` **567 files, 5728 passed + 1
skipped**; `npm run build` green. Next exact front family:
**`ANIM_H_SHAKE`** (16 Factory species), then continue the source-ranked head.

## Front `ANIM_V_SHAKE` terminal family accepted (2026-07-31)

**Verdict:** rung 2c is complete for the **24 Factory-reachable species** in
this opponent-front family. The generated selector table has 25 mappings, but
`battle-frontier-mons.json` proves GROUDON is the sole outside-Factory member;
derived exports and Tier-1 tests pin both counts without mislabeling 25 as the
Factory total. The three prior accepted families remain unchanged.

**Model / evidence:** `speciesIdleAnim.ts` ports `Anim_VerticalShake` and
`VerticalShake` source-order arithmetic: data[0]=60, active accumulators
0..2280, the strict `counter > 2304` guard at 2340, and terminal y2=0 cleanup
before `WaitAnimEnd`. Complete legal Scene-ON parties settle representative
MACHOKE and sibling RHYHORN at **x2=0 / y2=0 / animNum=1 /
SpriteCallbackDummy**. Two fresh RAM-probe runs per species are byte-identical:
MACHOKE receipt SHA-256
`7b5914c4e81c08e73287c19593f791a0b44e48d213fdbd14e1308df9a946c0af`,
RHYHORN `1c7cd9974d4115327d40cb5dd602a9123c82b31211066ef33b59cf727243b313`.

**Gates / coverage:** focused animation tests are **24/24**; the full suite is
green at **567 files, 5722 passed + 1 skipped**, and the production build is
green. `ANIMATION_COVERAGE.json` remains byte-identical (SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`),
with coverage unchanged at **107 exact / 0 partial / 0 staged / 169
unsupported**. No probe, seam, boundary, barrier, gameplay, RNG, turn, damage,
facility, or move-coverage state changed.

## Front `ANIM_V_STRETCH` terminal family accepted (2026-07-31)

**Verdict:** rung 2b is complete for the generated 32-species Factory front
family. `speciesIdleAnim.ts` derives dispatch from
`send-out-anim-selector-tables.json` and ports `Anim_VerticalStretch`'s 41
active callbacks, both `sDontFlip` affine branches, C-truncated y2 arithmetic,
and tick-41 identity/y2/affine cleanup before `WaitAnimEnd`. The accepted
`ANIM_V_SQUISH_AND_BOUNCE` family and ONIX `ANIM_RAPID_H_HOPS` behavior remain
pinned without change.

**Evidence:** complete legal Scene-ON parties settle opponent-front QUILAVA
and HOUNDOUR at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: QUILAVA receipt SHA-256
`8a2293ce042d30d3c097a4f127f911ca8a2e3e60db426392a2c02262130add56`,
HOUNDOUR `613b110bfc757ef5fce03ca6a8098d03c80ce189aa45bafcae033b844e7b89f0`.
Tier-1 pins source arithmetic, generated dispatch/all 32 species, both paired
receipts, and both prior-family regressions. Full gates are green: **567 files,
5716 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track, probe change, gameplay, engine seam, boundary, barrier, RNG, turn,
damage, or facility state changed.

## Front `ANIM_V_SQUISH_AND_BOUNCE` terminal family accepted (2026-07-31)

**Verdict:** rung 2a is complete for the generated 50-species Factory front
family. `speciesIdleAnim.ts` now dispatches from
`send-out-anim-selector-tables.json`, not a hand-maintained species map, and
ports `VerticalSquishBounce`'s 49 active callbacks plus affine/y2 terminal
cleanup before `WaitAnimEnd`. Existing ONIX `ANIM_RAPID_H_HOPS` support is
unchanged.

**Evidence:** complete legal Scene-ON parties settle opponent-front BAYLEEF
and MAGBY at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: BAYLEEF receipt SHA-256
`e5bcb0354f65713fa5ef5713035209762ebf6e204a48e985b9d05ab58f38fc6a`,
MAGBY `58cb14b494d54e6e4950642d9cd57e841a0dc8529f784c24e4b3b46adc45f2ab`.
Tier-1 pins source arithmetic, generated dispatch/all 50 species, both paired
receipts, and ONIX regression. Full acceptance gates are green: **567 files,
5711 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track was fabricated and no gameplay, engine seam, boundary, barrier, RNG,
turn, damage, or facility state changed.

## PRIORITY DIRECTIVE — send-out intro animations run ahead of the move queue (2026-07-31)

**State:** User-set priority, recorded by the interactive main session at the
user's request. The per-species **send-out intro animation** family takes
priority over the remaining move acceptance queue (`MOVE_DRAGON_BREATH`,
`MOVE_BIND`) and over new component tracks. Coverage is unchanged at **107
exact / 0 partial / 0 staged / 169 unsupported**; no code, test, boundary,
barrier or gameplay change accompanies this entry.

**Why it outranks the moves:** every one of these functions freezes its
`x2`/`y2` at its last active accumulator and hands off to
`SpriteCallbackDummy` — a **permanent residual offset for the rest of the
battle**, leaking into windows that never show the send-out. Two windows have
already paid for the same missing residual by hand (DRAGON_RAGE's dense window
and `docs/aerial-ace-portable-staging-probe.md`, both the settled
opponent-front ONIX at `x2=+1`). It is a defect class under the move queue,
not a cosmetic backlog behind it.

**Did:** derived the full scope from pinned source and wrote
**`docs/send-out-intro-animation-program.md`** — mechanism, both selector
paths, the 5-rung ladder, the acceptance bar, and a re-runnable derivation
script for every figure. Headline numbers: 881 rental entries / 376 species;
front (opponent) collapses to **62** functions with a steep head (12 → 56%,
30 → 85%); back (player) is selected by species **and nature** and stays flat
at **68** reachable functions (top 8 → 34%); union closure is **194 of the
file's 234** static functions, with only ~20 shared between the two families.
Load-bearing invariant, grep-verified: **no `Anim_*` function reads species or
mon data** — species/nature enter at selection time only, so one ported
function is correct for every species that maps to it.

**Next:** rung 2 of the ladder — generalize `computeTerminalOffset` out of
`src/animation/speciesIdleAnim.ts` and bank tier-1 terminal constants for the
62 front functions, steep head first, each accepted against a RAM probe of a
settled front sprite (not pixels alone). Rung 1 (selector-table extraction) is
a prerequisite owned by another lane — see below. Rungs 4-5 stay
demand-driven; do not batch them speculatively.

**Notes:** this family has no home in `ANIMATION_COVERAGE.json` — its
acceptance unit is a move, and `componentTracks` validation
(`tools/animation/coverage.ts:150-168`) requires every representative to be a
Level 50 move sharing the track's components. The queue was deliberately left
untouched rather than faking a move representative; this entry is the
directive. Three hand-done one-offs exist today with no dispatcher: ONIX front
(`src/animation/speciesIdleAnim.ts:44`, terminal only), MAGBY back
(`src/engine/magbySendOut.ts:18`), ONIX back (`src/engine/battleMenu.ts:708`)
— the latter two sit outside animation-owned paths, so retiring them into a
dispatcher is a coordinated cross-lane change, not a drive-by.

**For the main program:** rung 1 is yours, not animation's. Five literal
source tables need extracting into `src/data/gen/` (side-lane ownership per
AGENTS.md): `sMonFrontAnimIdsTable`, `sSpeciesToBackAnimSet`,
`sBackAnimNatureModTable`, `sMonAnimationDelayTable` (nonzero for 52 of the
376 pool species), `sBackAnimationIds`. Identity-const census idiom applies.
Animation is blocked on these before rung 2 can be keyed by species.

## MOVE_ROAR promoted exact; noise-line-roar-effect complete (2026-07-30)

**Verdict:** `MOVE_ROAR` is exact. The pure source-relative reducer, narrow
typed Scene-ON seam and production compositor cover shared six-NOISE_LINE
RoarEffect sprites, attacker monbg/splitbgprio/8:8 alpha, double cry/wait,
ScaleMonAndRestore, target SlideOffScreen, waits, hardware latches, tags,
palettes, registers, audio, blend/monbg cleanup and first inactive frame. The
seam carries only resolved Houndour/Onix geometry and immutable field
presentation; all guards, accuracy, forced switching, controller, RNG, turn
and facility state remain external.

**Dense acceptance:** corrected legal set-119 Houndour parties pass every
source/reducer/seam/raw-RGB/production framebuffer frame twice fresh:
player-back **252-350 (99/99)** with evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** with `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. `MOVE_HOWL`
independently remains **102/102 twice fresh in both orientations**. Coverage
is **107 exact / 0 partial / 0 staged / 169 unsupported** and the
`noise-line-roar-effect` track is complete. No gameplay, boundary, barrier,
canonical-dependency or main-doc change.

## MOVE_ROAR corrected source/probe checkpoint; remains unsupported (2026-07-30)

**State:** `MOVE_ROAR` remains unsupported; coverage is unchanged at **106
exact / 0 partial / 0 staged / 170 unsupported**. The source audit pins
challenge-0 set **119 `FRONTIER_MON_HOUNDOUR`** (species 228, Docile,
Sp. Atk/HP, Charcoal) and its distinct ScaleMonAndRestore, SlideOffScreen,
double-cry/wait, monbg/splitbgprio/8:8-alpha, six-NOISE_LINE, and cleanup
body.

**Evidence:** both complete legal Scene-ON parties are mechanically
asymmetric: player Houndour retains exact **CRUNCH/EMBER/ROAR/PROTECT** and
the controller presses DOWN to choose slot three; only opponent Houndour uses
four Roars to constrain AI. Every first-active through first-inactive frame
reproduces twice fresh: player-back **252-350 (99/99)** evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. The shared
parameterized recorder also reran Howl's complete receipts unchanged.

**Next:** separately port a source-relative Roar reducer, narrow typed
presentation seam, and production compositor, then prove every dense frame
in both orientations; this checkpoint supplies no production support or exact
promotion.

## MOVE_PRESENT promoted exact; green-sparkle-moonlight complete (2026-07-30)

**Verdict:** `MOVE_PRESENT` is exact for all four committed branch/orientation
bodies. The pure source-relative reducer ports the common 60-frame moving
`ITEM_BAG`, five-`EXPLOSION` damage branch, and nine-`GREEN_SPARKLE` plus
four-target-`BLUE_STAR` healing branch. The typed Scene-ON seam takes damage
or heal as immutable controller input; animation code owns no branch choice,
outcome, damage, healing, or RNG.

**Dense acceptance:** player damage **1012–1212 (201/201)**, player heal
**1946–2197 (252/252)**, opponent damage **78–278 (201/201)**, and opponent
heal **1404–1655 (252/252)** each pass source/component/seam/raw-RGB and
production framebuffer equality twice fresh. Receipt/raw prefixes remain
`a2cc09d1/0507c412`, `bbb023fe/b2fe7f30`,
`9d752ec6/8e9f36a7`, and `9a76aeeb/2e5b78ad`. The compositor reuses honest
source-derived bag, explosion, Moonlight sparkle/star, Delibird/Onix, field,
healthbox, and text assets, preserving mirrored geometry, OAM/matrix latches,
tag/palette/audio/wait cleanup and side-relative subpriority ordering.
Coverage is **106 exact / 0 partial / 0 staged / 170 unsupported**; the
`green-sparkle-moonlight` track is complete. No boundary, barrier, canonical
recording, gameplay, controller, turn, round, or facility state changed.

## MOVE_SECRET_POWER promoted exact; slam-hit-slide-shake complete (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` is exact through its sole reachable Factory
body, indoor `BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`. Complete legal
challenge-0 set-117 Teddiursa/Onix parties pass the full first-active through
first-inactive cleanup interval at **222–323 (102/102)** twice fresh in both
orientations through the source reducer, typed seam, software/hardware OAM,
matrices, palette/tag/register/audio receipts, raw RGB, and production shared
framebuffer. Player-back evidence/raw hashes remain
`9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3` /
`af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903`;
opponent-front hashes remain
`8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172` /
`f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a`.

**Model / boundaries:** the compositor preserves IMPACT lifetime,
`ShakeAndSinkMon`'s distinct two-transfer position latch, four-tick return
slide, side-respecting two-loop ellipse, three animation-1 hitsplats including
source slot-reuse priority, final `ShakeMon2`, monbg/12:8 alpha, all four
sounds, legal Teddiursa/Onix art and geometry, waits, and cleanup. The later
**472–509** secondary-status animation remains controller-owned and outside
the move body. `MOVE_SLAM` independently reruns **54/54 twice fresh in both
orientations** with unchanged hashes. No battle semantics or boundary pins
changed. Coverage is **105 exact / 0 partial / 0 staged / 171 unsupported**;
the `slam-hit-slide-shake` component track is complete.

## MOVE_SECRET_POWER source/controller checkpoint; remains unsupported (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` remains unsupported. A complete source,
generated-inventory, battle-script, controller, and environment audit proves
challenge-0 set **117 `FRONTIER_MON_TEDDIURSA`** is the lowest legal Level-50
carrier, correcting the older set-162 Delcatty evidence. The Factory battle
room is indoor, so its only reachable visual dispatch is
`BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`; all nine explicit terrain
branches plus the plain fallback are now pinned.

**Controller/body boundary:** a successful hit emits
`CONTROLLER_MOVEANIMATION`, both player and opponent controllers call
`DoMoveAnim(290)`, and `AnimTask_GetBattleEnvironment` selects Strength.
Accuracy misses bypass `attackanimation`; `MOVE_RESULT_NO_EFFECT` and
`HITMARKER_NO_ANIMATIONS` select the pause route; the secondary effect is
chosen only after the animation/result message. The required Strength body is
independently enumerated: IMPACT, `ShakeAndSinkMon`, return slide, elliptical
target translation, three hitsplats, `ShakeMon2`, monbg/alpha, four sounds,
and cleanup.

**Evidence / next:** `secretPowerSourceAudit.ts` and its focused Tier-1 test
pin the full dispatch/controller contract while reusing the existing
source-complete `getsecretpowereffect` semantic tests without changing battle
logic. No reducer, compositor, dense oracle fixture, or exact status was
added. `MOVE_SLAM` remains independently exact at **54/54 twice fresh in both
orientations with unchanged hashes**. Coverage remains **104 exact / 0 partial
/ 0 staged / 172 unsupported**. Next work is a separate complete Strength
reducer/compositor and twice-fresh full dense Scene-ON acceptance in both
orientations using legal set-117 Teddiursa parties.

## MOVE_ATTRACT promoted exact; red-heart-sweet-kiss track complete (2026-07-29)

**Verdict:** `MOVE_ATTRACT` is exact. Source, generated inventory,
battle-script, and controller audit pin set **113 `FRONTIER_MON_EEVEE`** as
the lowest legal Level-50 carrier and one reachable animation body after
accuracy and `tryinfatuating`. Accuracy, same-gender, genderless,
already-infatuated, and `OBLIVIOUS` failures select no animation body.

**Evidence:** complete legal female-Eevee/male-Onix Scene-ON parties pass the
complete first-active frame through first-inactive cleanup twice fresh per
orientation. Player-back **66–500 (435/435)** evidence/raw
`a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8` /
`e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9`;
opponent-front **70–504 (435/435)**
`234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e` /
`daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329`.

**Model / sibling:** the reducer, typed seam, and production compositor port
the projectile, six burst, and eight rising RED_HEART sprites, including the
opponent-front pre-OAM allocation; SwayMon; HeartsBackground tiles, palette,
alpha ramp and cleanup; two target blend cycles; all audio/panning;
attacker/target geometry; legal art/idle offsets; OAM/hardware transfer and
cleanup. `MOVE_SWEET_KISS` independently reruns **159/159** twice fresh in
both orientations with unchanged evidence/raw hashes.

**Ownership / next:** presentation owns no accuracy, gender/ability or
infatuation result, RNG, controller, turn/facility state, boundary list,
unsupported barrier, or canonical allowlist. Coverage is **104 exact / 0
partial / 0 staged / 172 unsupported**. Next ranked incomplete component
track: `slam-hit-slide-shake` (`MOVE_SECRET_POWER` independently unsupported).
