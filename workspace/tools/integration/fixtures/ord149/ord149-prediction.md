# ord149 PREDICTION (committed before any ROM check): Astonish 310 body order plan from source

Sources (vendor pokeemerald): `Move_ASTONISH` (data/battle_anim_scripts.s:9411), `AnimSprayWaterDroplet` /
`AnimSprayWaterDroplet_Step` (src/battle_anim_flying.c:1103-1158), `SortSprites` (src/sprite.c).

1. Units: the lunge controller (`Cf;D0`), then two `gSprayWaterDropletSpriteTemplate` droplets created in ONE frame (`Cff`, units 1 and 2,
   droplet 1 created first = the lower slot), same template / subpriority, both at the TARGET's (X, Y + 32): they differ only in x2 / y2.
2. Words: droplet k draws `v1 = Random2() & 0x1ff`, `v2 = Random2() & 0x7f` (words 2k-2, 2k-1). `data[1] = 896 + v2` (v2 odd) or
   `896 - v2` (even). Each step: `y2 -= data[1] >> 8; data[1] -= 32`; the 31st step destroys both droplets in the same frame.
3. The last `SortSprites` before the destroy sees y2 after 30 steps: `rise = sum_{j<30} ((data1 - 32 j) >> 8)`, one of 8 classes
   {22, 26, 30, 34, 38, 42, 45, 48} (data1 >> 5 bands). x / v1 never enter the sort key.
4. `SortSprites` with equal priority words puts the LARGER oam.y first and never swaps equal keys. The rise difference is monotone
   (every term of the sum has the same sign), so the order at the destroy is: the droplet with the SMALLER rise (lower on screen) first;
   equal rises keep the creation order (the lend: F index at creation).
5. Plan law (both sides, every lend): `Cf;D0;Cff;D1,2/P<rise1>,<rise2>` - the production cursor sorts the pair by the P words ascending,
   ties by F index at creation, which is exactly 4. Equivalently plans69's two texts `D1,2` (rise1 < rise2) / `D2,1` (rise1 > rise2) plus a
   tied lend-ordered class (rise1 == rise2, ~1/8 of word pairs).
6. ROM check (A1): per 310 body, rise_k = oam.y at the creation frame - oam.y on the frame before the destroy, must lie in the 8 classes;
   the law's plan text built from the ROM rises must be EXACT per allocation window (ord124Check method), both sides.
7. Consequence: the production row `310:opponent` = `Cf;D0;Cff;D1,2/P537,537` (prep45, tied) is right only when the lend order and the y
   order agree; a static row cannot be exact for `310:player` either. Production needs the words: a words unit (Dive / Flatter pattern:
   WORDS_ORDER_UNIT_MOVE_IDS + a render-seam carry `liveAstonishWordsPostFree` from the body's 4 presentation words).
