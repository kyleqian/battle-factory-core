# prep40 — live adapters whose ATTACKER is shown as the Substitute doll (swap-framed bodies; evidence only)

Side lane, new files only. Master 6903b5209 (production src tree ab030259). Probes were direct mGBA only (no shared oracle):
- 75 staged scenarios, each run twice from fresh processes, in two complete passes.
- Every probe JSON is byte-identical: r1 == r2 within each pass, and pass 1 == pass 2.
- Every check receipt (4 modes x 75 scenarios = 300) and both summaries are byte-identical across the two passes
  (`receipts/manifest.json`).

The temporary production patch is `tools/integration/fixtures/prep40/swap-ids-framing-env.diff`. `prep40Run.sh` applies it and always
reverts it (trap), and `git status src` was clean at every commit.

**Hypothesis: confirmed for the composite itself.** No swap row and no doll-related row failed anywhere:
- **28 (move, side) cells are 0 px on every row** of the dense composite (swap-in .. swap-back first inactive row), every window,
  both runs. That is 39 windows and 9,547 rows, combined weight **17.04**.
- **30 more cells are 0 px once production supplies an input it already has elsewhere.** Two inputs:
  - the ROM body length + the adapter's activation shift (12.25);
  - the sprite-order lend after the Substitute body (6.82).
- Every remaining residual is one of:
  - present in the same move's doll-free control (in the same probe or prep38's);
  - a named source behaviour (Roar's displaced target, Dig's hidden attacker, the multi-hit split).

## 1. Results first

Weight = Factory Level-50 use weight of (move, attacker side), in % of all (move, side) uses. It comes from
`spriteOrderPlanCoverageRank.py` `weights()`, the same model as prep38's table, and is the same for both sides.

Pair: the attacker is PERSIAN with its own Substitute up. The target is SLOWBRO, or a female VAPOREON for Attract.

The columns, read left to right:
- **rows**: the composite window. ROM: swap-in 42 (player) / 40 (opponent) rows + idle row + body + swap-back + first inactive row.
- **body**: the ROM body rows, from activation up to the first `Special_MonToSubstitute` row.
- **D**: the adapter duration.
- **prod px r1/r2**: production with the move id added to `LIVE_SUBSTITUTE_SWAP_BODY_IDS`, first window, run 1 / run 2.
- **framed**: the body framed as (body + 1) rows, shown at adapter age `row + shift`; written rows:shift → px.
- **order lend**: `drop-164` / `first-body`, first window.
- **ctrl**: the doll-free control of the same move in the same probe, after the Substitute fade.
- **fallback**: what production draws today (the decline to the static field), first window.

| move (weight) | side | rows | body | D | prod px r1/r2 | framed rows:shift → px | order lend → px | ctrl | fallback | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| EARTHQUAKE (2.261) | p / o | 293 / 289 | 207 | 198 | 80,689 / 60,370 (x2 runs) | 208:0 → **0 / 0** | n/a | 0 / – | 1,278,780 / 1,095,981 | **NEEDS-BODY-FRAMING** |
| AERIAL_ACE (1.108) | p | 135 | 49 | 50 | **0** | – | – | 0 | 285,329 | **EXACT-WITH-SWAPS** |
| AERIAL_ACE | o | 131 | 49 | 50 | 1 | 50:0 → 1 | 1 | – | 241,442 | DOLL-NEUTRAL: row 51 = body age 10, pixel (138,74), prep38's doll-free control pixel |
| SHADOW_BALL (1.106) | p | 240 | 154 | 148 | 1,466,412 | 155:-5 → 9,148 | same | 280,700 | 2,904,841 | PAIR-RESIDUAL: the same ages and px/row as the control's non-tail rows (body ages 69..99, attacker region) |
| SHADOW_BALL | o | 236 | 154 | 148 | 1,495,359 | 155:-5 → **0** (windows 1 and 3) | – | – | 2,879,343 | **NEEDS-BODY-FRAMING**. Window 2's ROM body is 155 rows: prep38's 156-row tail phase (280,624 px, also doll-free) |
| PSYCHIC (1.078) | p | 230 | 144 | 140 | 2,518,090 | 145:-5 → **0** | – | 0 | 2,737,793 | **NEEDS-BODY-FRAMING** |
| PSYCHIC | o | 226 | 144 | 140 | 2,553,025 | 145:-5 → 9 | 9 | 9 | 2,704,428 | NEEDS-BODY-FRAMING + PAIR-RESIDUAL (9 px = the control's, prep38 too) |
| ROCK_SLIDE (1.058) | o | 219 | 137 | 138 | **0** | – | – | 0 | 524,699 | **EXACT-WITH-SWAPS** (opponent-only adapter) |
| SURF (1.029) | p / o | 229 / 225 | 143 | 144 | **0 / 0** | – | – | 0 | 2,243,319 / 1,775,579 | **EXACT-WITH-SWAPS** |
| ICE_BEAM (0.990) | p / o | 288 / 284 | 202 | 203 | 3,354,472 / 3,448,882 | (declines) | **0 / 0** | 3,354,472 | 3,843,572 / 3,815,067 | **NEEDS-ORDER** |
| DOUBLE_EDGE (0.869) | p / o | 226 / 222 | 140 | 141 | **0 / 0** | – | – | 0 | 966,926 / 903,852 | **EXACT-WITH-SWAPS** |
| CONFUSE_RAY (0.828) | p / o | 355 / 351 | 269 | 270 | **0 / 0** | – | – | – | 5,004,083 / 4,997,538 | **EXACT-WITH-SWAPS** |
| THUNDERBOLT (0.809) | p / o | 322 / 318 | 236 | 237 | 3,885,044 / 4,010,925 | (declines) | **0 / 0** | 3,885,044 | 4,437,654 / 4,420,444 | **NEEDS-ORDER** |
| ATTRACT (0.746) | p / o | 520 / 516 | 434 | 435 | **0 / 0** | – | – | – | 5,854,212 / 5,786,107 | **EXACT-WITH-SWAPS** |
| BRICK_BREAK (0.730) | p / o | 236 / 232 | 150 | 151 | **0 / 0** | – | – | 0 | 1,413,106 / 1,360,192 | **EXACT-WITH-SWAPS** |
| SLUDGE_BOMB (0.728) | p / o | 254 / 250 | 168 | 160 | 199,754 / 176,825 | 169:-4 → **0 / 0** | – | 0 | 606,988 / 522,120 | **NEEDS-BODY-FRAMING** |
| THUNDER_WAVE (0.693) | p / o | 205 / 201 | 119 | 120 | **0 / 0** | – | – | – | 2,180,121 / 2,156,090 | **EXACT-WITH-SWAPS** |
| GIGA_DRAIN (0.688) | p / o | 315 / 311 | 229 | 230 | 3,457,368 / 3,569,195 | (declines) | **0 / 0** (window 1) | 3,457,368 | 3,986,674 / 3,963,023 | **NEEDS-ORDER**. Window 2 (history [164, 33, 202, 33]) has no lend even doll-free |
| ROAR (0.592) | p / o | 185 | 99 / 103 | 99 / 104 | 120,473 / 81,760 | 100:0 → 87,444; 104:0 → 81,760 | same | 0 | 551,252 / 508,531 | **NEEDS-TARGET-X2 (Roar)**: every residual row is a swap-back row (143..184) in the TARGET box. The probe has the target at x2 = +98 there (Roar's body leaves it off-field until the forced switch); production draws it at rest |
| CRUNCH (0.531) | p / o | 227 / 223 | 141 | 142 | **0 / 0** | – | – | 0 | 2,570,548 / 2,545,027 | **EXACT-WITH-SWAPS** |
| FAINT_ATTACK (0.476) | p | 310 | 224 | 221 | 1,481,978 | 225:-4 → 271,552 | same | 271,552 | 4,167,498 | PAIR-RESIDUAL: the 16 whole-field tail rows of this 224-row body, identical in the control (prep38's 225-row body was 0 px) |
| FLAMETHROWER (0.476) | p / o | 295 / 291 | 209 | 115 | 509,219 / 444,037 | 210:-15 → **0 / 0** | – | 0 | 648,684 / 540,914 | **NEEDS-BODY-FRAMING** |
| QUICK_ATTACK (0.474) | p / o | 118 / 114 | 32 | 33 | 18,092 / 1 | 33:0 → same | same | 18,092 / 1 | 200,487 / 163,397 | PAIR-RESIDUAL (= the control, = prep38's PERSIAN control) |
| TOXIC (0.464) | p / o | 316 / 312 | 230 | 219 | 128,729 / 105,873 | 231:-7 → **0 / 0** | – | – | 581,921 / 481,085 | **NEEDS-BODY-FRAMING** |
| BITE (0.455) | p / o | 126 / 122 | 40 | 26 | 145,077 / 109,375 | 41:-10 → **0 / 0** | – | 0 | 219,436 / 176,333 | **NEEDS-BODY-FRAMING** |
| MEGA_KICK (0.438) | p / o | 245 / 241 | 159 | 160 | **0 / 0** | – | – | 0 | 2,965,703 / 2,937,015 | **EXACT-WITH-SWAPS** |
| OVERHEAT (0.384) | p / o | 315 / 311 | 229 | 230 | 3,216,067 / 3,205,545 | (declines) | **0 / 0** | 3,216,067 | 3,415,775 / 3,370,717 | **NEEDS-ORDER** |
| ROCK_TOMB (0.364) | p / o | 259 / 255 | 173 | 174 | **0 / 0** | – | – | 0 | 826,844 / 693,775 | **EXACT-WITH-SWAPS** |
| ICE_PUNCH (0.349) | p / o | 269 / 265 | 183 | 184 | **0 / 0** | – | – | 0 | 3,404,039 / 3,372,818 | **EXACT-WITH-SWAPS** |
| SWAGGER (0.345) | p | 254 | 168 | 161 | 160,373 | 169:-7 → 42,900 | same | 42,900 | 477,519 | NEEDS-BODY-FRAMING + PAIR-RESIDUAL (= control) |
| SWAGGER | o | – | – | – | – | – | – | – | – | NOT REACHED: the AI never used Swagger while subbed (4 turns, 2 x 2 runs) |
| FIRE_PUNCH (0.334) | p / o | 187 / 183 | 101 | 101 | 30,947 / 27,928 | 102:0 → **0 / 0** | – | 0 | 483,001 / 415,713 | **NEEDS-BODY-FRAMING** (the adapter is 1 row short of activation .. first inactive) |
| HYDRO_PUMP (0.311) | p / o | 226 / 222 | 140 | 141 | **0 / 0** | – | – | 0 | 607,342 / 520,072 | **EXACT-WITH-SWAPS** |
| EXPLOSION (0.316) | p / o | 302 / 298 | 216 | 212 | 1,103,475 / 1,134,590 | 217:-4 → **0 / 0** | – | – | 3,190,397 / 3,138,921 | **NEEDS-BODY-FRAMING** (then the faint swap, §5) |
| FACADE (0.274) | p / o | 166 / 162 | 80 | 81 | **0 / 0** | – | – | 0 | 275,509 / 227,589 | **EXACT-WITH-SWAPS** |
| SOLAR_BEAM t0, charge (0.274) | p / o | 193 / 189 | 107 | 108 | **0 / 0** | – | – | 0 | 321,378 / 265,579 | **EXACT-WITH-SWAPS** (the charge turn prints `STRINGID_EMPTYSTRING3`, §4) |
| SOLAR_BEAM t1, fire | p | 323 | 237 | 160 | 2,460,637 | 238:-23 → 1,689,668 | same | 1,670,601 | 4,587,489 | PAIR-RESIDUAL class: the doll-free control is 1.67M too (D 160 vs 238 ROM rows, whole field). Not swap-related |
| SEISMIC_TOSS D-input (0.124) | p / o | 313 / 309 | 227 | 228 | 3,533,896 / 3,647,873 | (declines) | **0 / 0** | 3,533,896 | 4,070,190 / 4,047,576 | **NEEDS-ORDER** (+ the real damage, §3) |
| MUD_SLAP D3 (0.270) | p / o | 137 / 133 | 51 | 51 | 96,372 / 92,662 | 52:0 → 65,425 | first-body + 52:0 → **0 / 0** | 61,247 (first-body: 0) | 265,449 / 226,596 | **NEEDS-ORDER (first-body) + BODY-FRAMING**. The activation value is pinned per probe |
| MEGAHORN D4 (0.147) | p / o | 262 / 258 | 176 | 177 | 2,888,848 / 2,961,549 | (declines) | **0 / 0** | 2,888,848 | 3,251,036 / 3,223,702 | **NEEDS-ORDER** (no art lookup or palette class: the body runs on the MON, not the doll) |
| DOUBLE_KICK multi-hit, D3 (0.222) | p / o | 226 / 222 | 35 + 70 + 35 | 36 | declines (multihit) | – | – | 0 (hit 1) | – | **NEEDS-MULTIHIT-SPLIT** (§4) |
| DIG t0 / t1 (0.375) | p / o | 280 / 276; 153 / 149 | 194; 67 | 195; 68 | t0 398,113 / 357,073 | 195:0 same | first-body: t0 34,926 / 24,621 | t0 0 (first-body); t1 72,449 | 289,133 / 281,506 | **NEEDS-HIDDEN-ATTACKER** (§4). t1 also has the control's own pair residual |

Two cells were not staged:
- ROCK_SLIDE p and FAINT_ATTACK o: production has no adapter for that orientation.
- ROAR as the move that forces a subbed battler out (`prep40-roared-*`): no swap, by source (§5).

Every staged cell has px identical in the two runs, and identical per-row digests (`identical: true` in every receipt).

### The one-batch list for `LIVE_SUBSTITUTE_SWAP_BODY_IDS` (production's own inputs, 0 px on every row, every window, both runs)

Add 14 ids: **8 ICE_PUNCH, 25 MEGA_KICK, 38 DOUBLE_EDGE, 56 HYDRO_PUMP, 57 SURF, 86 THUNDER_WAVE, 109 CONFUSE_RAY,
157 ROCK_SLIDE, 213 ATTRACT, 242 CRUNCH, 263 FACADE, 280 BRICK_BREAK, 317 ROCK_TOMB, 332 AERIAL_ACE**.

That is 26 (move, side) cells, **combined weight 16.490**:
- 14.322 for the 12 two-sided moves;
- AERIAL_ACE p 1.108;
- ROCK_SLIDE o 1.058.

AERIAL_ACE o is the 1 px doll-free pair pixel. It is not swap-induced, so 332 can be in the set (17.598 counting that cell).

SOLAR_BEAM (76) is exact on its charge turn only (0.548 more). It needs a `request.turn === 0` gate, so it is not in the batch.

The current set {29, 34, 73} stays. Every other id keeps declining.

### NEEDS-X classes, ranked by weight

1. **NEEDS-BODY-FRAMING: 16 cells, 12.252.** Covers EARTHQUAKE p+o, SHADOW_BALL o, PSYCHIC p, SLUDGE_BOMB, FLAMETHROWER, TOXIC, BITE,
   FIRE_PUNCH and EXPLOSION p+o. Also needed by PSYCHIC o / SWAGGER p, which are exact up to their pair residual.
   - The cause: production frames the swap-back after `liveMoveAnimationDuration`, the adapter's VISUAL length. The ROM's swap-back
     starts at the body's first inactive row.
   - Where the two differ, the swap-back starts early and every later row is off. Examples:
     - Earthquake 198 vs 208;
     - Bite 26 vs 41;
     - Toxic 219 vs 231;
     - Flamethrower 115 vs 210;
     - Fire Punch 101 vs 102.
   - Adapters whose age 0 is after activation also need the shift:
     - Bite -10, Flamethrower -15, Toxic -7, Psychic -5, Shadow Ball -5, Sludge Bomb -4, Explosion -4, Swagger -7;
     - these are prep38's calibrated control shifts where measured.
   - With `PREP40_FRAMING=<body rows + 1>:<shift>` every first window is 0 px on every row.
   - The input already exists for the doll-free path. The plain EARTHQUAKE control is 0 px over all 208 rows: production holds the
     command for the ROM length and draws the static field after the adapter ends.
   - **Fix shape:** `substituteSwapCompositeDuration` and `substituteSwapFrameAt` take the command's ROM body length (activation ..
     first inactive), not the adapter duration. The body branch shows adapter age `bodyAge + activationShift`; rows outside the adapter
     draw the static mon field, as the plain path does.
   - This answers the swap step's Bite / Toxic exceptions: Bite (41 rows, shift -10) and Toxic (231 rows, shift -7) are 0 px framed
     this way.
2. **NEEDS-ORDER: 14 cells, 6.824.** Covers ICE_BEAM, THUNDERBOLT, GIGA_DRAIN, OVERHEAT, MEGAHORN (D4), SEISMIC_TOSS and MUD_SLAP (D3).
   - These are order-dependent adapters. After the attacker's own Substitute body, production lends no order
     (`spriteOrderEventTransform.ts` puts 164 in `OWNERSHIP_CHANGING_MOVES`). The body declines inside the composite, and the swap rows
     stay exact.
   - With a lend they are 0 px on every row of window 1:
     - `drop-164`: the Substitute body treated as order-neutral, as prep38 found for the defender's 164;
     - Mud-Slap needs `first-body`, plus framing 52:0.
   - Later windows (history `[164, 33, X, 33]`) have no lend even doll-free. That is the general order-tracker gap, not a swap gap.
   - Unlike prep38's defender doll, Ice Beam / Thunderbolt / Megahorn need **no** art-lookup or palette composite: the body runs on the
     mon.
3. **NEEDS-TARGET-X2 (Roar): 2 cells, 1.184.** Roar's body ends with the target at x2 = +98 (probe, `gSprites` x2, rows 140..182).
   - It stays there through MON_TO_SUBSTITUTE until the forced switch. Production's swap-back rows draw the target at its idle rest.
   - Needed: Roar's (46) post-body target x2 in `liveBattlerX2History` (the event `move-body` for 46), or a decline for Roar.
   - The attacker's doll rows are exact (the tail fix removes 600 / 679 px of 2,682 / 2,723).
4. **NEEDS-HIDDEN-ATTACKER (Dig, semi-invulnerable): 2 x 2 cells, 0.75.** After Dig's first-turn body the attacker sprite is invisible.
   - MON_TO_SUBSTITUTE slides and reloads an invisible sprite, so neither the doll nor the mon is shown between the turns.
   - Turn 2's SUBSTITUTE_TO_MON starts from that hidden sprite.
   - Production draws the doll: 619 / 604 px per row. After `first-body` the turn-0 residual is only those swap-back rows
     (34,926 / 24,621).
5. **NEEDS-MULTIHIT-SPLIT: 2 cells, 0.444** (§4).

## 2. The one-row tail: measured, and the fix

109 of 117 composite windows were measured this way. Row k+1, right after the swap-back window's first inactive row k, is in the ROM
the attacker's doll at the swap-back's last moving x2 (-5 player / +5 opponent):
- production today draws it settled: **600 px (player) / 679 px (opponent)**, every window, both runs;
- drawn with the existing frame model one row past the composite (`substituteSwapFrameAt(side, D, D + 2*scriptRows + 1)` → swap-back
  task row `scriptRows - 1`), row k+1 is **0 px**;
- row k+2 is 0 px against the settled doll (production today).

The 8 others are Roar's displaced target (§1.3; the doll part is fixed) and Dig turn 0 (hidden attacker).

**Do not lengthen the composite.** The ROM's frame-to-frame changes after k (`romChangesAfter` in the receipts):
- 111 of 117 swap windows are `[600|679, 600|679, 0, 0, X]`;
- all 75 plain doll-free windows are `[0, 0, 0, 0, X]` (`receipts/manifest.json` `plainWindowRomChangesAfter`);
- X is the next command's first visible change (the healthbox), at the **same** offset k+4 → k+5 in both: X > 0 in 96 swap and 65
  plain windows.

The 6 exceptions:
- Dig turn 0 (4 windows): `[0, 0, 0, 0, 0]`, because the hidden attacker does not move.
- Attract (2 windows): a change at k+3 → k+4. It is not the doll, and there is no doll-free Attract control in these probes.

So production's command boundary (the next command starts at k+1) is right. A one-row-longer composite (`PREP40_TAIL=1` in the patch)
would delay every later command by one row.

**The fix is a one-row OAM latch on the next command's first row.** When the previous command was a swap composite, that row draws the
attacker's doll at x2 = swap-back row `scriptRows - 1` (`substituteSwapRows(side, false)[scriptRows - 1].x2` = -5 / +5); from row 2
on, the settled doll.

The pixels of that row are exactly the composite frame at age = duration: measured 0 px in all 109 windows. The
`oneRowLonger` / `k2Today` fields are in `receipts/summary.json` `tail`.

## 3. Seismic Toss: the cause of the swap step's whole-field residual

The swap step saw rows from body age 15 differ over the whole field. That is the Seismic Toss adapter **declining** (returning null) while
the ROM's `fadetobg BG_IN_AIR` starts darkening at body age 15. Before that row the declined static field happens to equal the ROM.

The adapter (`liveMoveAnimation.ts` case 69) needs both:
- a lent sprite order (`spriteOrderInput.known`);
- `request.damage` in 33..65 (`AnimTask_GetSeismicTossDamageLevel`'s medium branch; level 50 damage = 50).

The swap-step checker passed damage 0, and production lends no order after 164. With the real damage (the target's HP drop, as
`gAnimMoveDmg` carries it in production's request) and a lend, both sides are **0 px on all 313 / 309 rows**. In the doll-free
control both missing inputs show as the same 3.53M px. Verdict: NEEDS-ORDER; the damage is already in production's request.

## 4. Multi-hit and two-turn bodies (what the source does)

**Multi-hit (Double Kick, both sides, both runs; `segments` in the receipts).** In order:
1. SUBSTITUTE_TO_MON once, 42 / 40 rows (x2 to -105 / +100, doll → mon at the load row).
2. The idle row.
3. Hit 1: 35 rows.
4. **70 inactive rows: HP drain and messages, with the MON shown at x2 0.**
5. Hit 2: 35 rows.
6. MON_TO_SUBSTITUTE once, 42 / 40 rows.
7. The first inactive row.

This matches `flag_x8` and `multihit < 2` in `*DoMoveAnimation`. Production declines every hit (`request.multihit < 2`).

To present it:
- hit 1's command = swap-in + idle + hit 1, with **no** swap-back;
- every command until the last hit shows the mon, not the doll;
- the last hit's command = hit + swap-back.

Pixel rows between the hits were not measured. The probe keeps RGB only around animation rows; the tile digests show the mon there.

**Two-turn (Dig, Solar Beam).** The source swaps around **each turn's** body separately:
- turn 1: SUBSTITUTE_TO_MON, charge body, MON_TO_SUBSTITUTE;
- the doll is shown between the turns;
- turn 2: again.

`BattleScriptFirstChargingTurn` prints `STRINGID_EMPTYSTRING3`, so the first-turn body runs under an empty text box. The checker
fixtures say so; the "used X!" lines cost 585 / 854 px per row otherwise. With that:
- Solar Beam's charge turn is EXACT-WITH-SWAPS.
- Dig's dig-down leaves the attacker invisible through MON_TO_SUBSTITUTE, the turn in between and turn 2's SUBSTITUTE_TO_MON
  (NEEDS-HIDDEN-ATTACKER). Fly / Dive / Bounce are expected to behave the same; not measured.

## 5. Faint and switch-out (battle_controller_player.c:2249 DoSwitchOutAnimation, :2412 PlayerHandleFaintAnimation)

Three swaps were measured: a subbed EXPLOSION user's faint (player / opponent), and a voluntary player switch-out (POKéMON → slot 2 →
SHIFT).

In each case the ROM runs SUBSTITUTE_TO_MON first:
- **42 / 40 script rows**, then the faint slide or `Special_SwitchOutPlayerMon`;
- x2 rows identical to `substituteSwapRows(side, true)`;
- the doll → mon tile switch visible at row 23 / 22, as prep37 found.

The production swap-in frames (`substituteSwapFrameAt` ages 0..scriptRows+2, drawn with a stand-in proven body under the patch) against
those ROM rows:

| case | rows | field px (y < 112), r1 / r2 | full-frame px (message text is the stand-in's) |
|---|---|---|---|
| faint, player | 45 | 1,322 / 1,322, only on row 44 (the faint slide's first row, after the swap) | 16,307 |
| faint, opponent | 43 | **0 / 0** | 14,319 |
| switch-out, player | 45 | **0 / 0** | 30,555 |

So the frames exist. What production lacks is time. `substituteDollAtCommandStart` clears the doll at the faint / switch-out command's
first row, with no slide. To present the swap, those commands must start with the swap-in rows:
- scriptRows + 1 rows (43 / 41) while the battler is behind a substitute;
- drawn by the existing frames;
- then the faint / return body, shifted by that much.

The clear itself cannot present the swap: it has no rows to draw it in.

Roar / Whirlwind on a subbed battler shows **no** swap. `Cmd_returntoball` emits `EmitReturnMonToBall(..., TRUE)`, which skips
`DoSwitchOutAnimation`; measured: no `Special_SubstituteToMon` in `prep40-roared-*`. The current immediate clear is right there.

## 6. Method

**Staging** (`prep40Stage.py` → `fixtures/prep40/scenarios/`, 75 scenarios; mechanicLab, Scene ON, Factory route). The attacker is
PERSIAN: fast, attack / sp. attack IVs 0, moves [SUBSTITUTE, X, X, X] (player) or [SUBSTITUTE x3, X] (opponent AI). The defender is
SLOWBRO: slow, attack IV 0, [TACKLE x4].
- Turn 1 subs.
- Turns 2+ are the swap-framed X bodies.
- After the doll fades, the plain X bodies are the doll-free controls in the same probe.

Variants:
- ATTRACT targets a female VAPOREON;
- `faint-explosion-*`;
- `roared-*`: the subbed battler is roared out on turn 1;
- `switch-player`.

**Probe** (`prep40Probe.py` = prep37Probe + gRng2Value / status1 per frame). RGB is kept only for animation rows and the 6 rows after
each.

**Checker** (`prep40Check.ts`): production `renderBattleResolutionLiveView` over `liveAdapterFramebuffer.ts` `liveView`, with the
attacker's doll set by the production setter `applySubstituteDollCommand`. Full 240x160 frames, compared against both runs. Fixture
inputs taken from the probe at the window:
- HP;
- displayed status (status1);
- genders;
- preceding move bodies;
- the D3 activation value: gRng2Value at activation + 1, stepped back once (as prep38);
- `request.damage` = the target's next HP drop;
- `turn` for two-turn moves;
- the empty first-turn message.

The order input is production's: unknown after 164 → `POKEBENCH_LIVE_ORDER_INPUT=none`. Four modes:
- `patched`: ids added;
- `fallback`: production today;
- `drop164`;
- `firstbody`.

`aligned` scans the shift in [-24, 24] on run 1 (smallest residual, ties smallest |shift|) and measures both runs. The shifts found
equal prep38's control calibrations for every move both measured.

## 7. Not reached / caveats

- **Not staged:** SWAGGER opponent (no subbed Swagger in 4 AI turns), Fly / Dive / Bounce, elevated or non-PERSIAN attacker pairs,
  doubles, Baton Pass.
- **No pixel proof of the latch row.** The one-row latch (§2) is proven on pixels via the composite frame model. Its placement on the
  next command (not a longer composite) rests on the ROM change-timing evidence; no production queue patch was measured.
- **Shadow Ball's ROM body length varies** (154 / 155 rows between windows of one probe). The framing input must come from the
  command's ROM length, not a per-move constant. Window 2 shows prep38's 156-row tail phase.

## Reproduce

```sh
OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/prep40Run.sh            # 75 scenarios x 2 fresh probes (cmp) + 4 check modes (~8 min, 16 cores)
OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/prep40Run.sh            # second fresh pass
diff -r -x '*.out' <REC1> <REC2>                                                # byte-identical
python3 tools/integration/prep40Compact.py <OUT1> <REC1> <OUT2> <REC2> tools/integration/fixtures/prep40/receipts
OUT=<OUT1> REC=$(mktemp -d) SKIP_PROBES=1 sh tools/integration/prep40Run.sh     # checks only (~3.5 min)
```

`prep40Run.sh` requires a clean `src/`. It applies `swap-ids-framing-env.diff` and always reverts it (trap).

Scenario JSON is regenerated by `python3 tools/integration/prep40Stage.py tools/integration/fixtures/prep40/scenarios`.
