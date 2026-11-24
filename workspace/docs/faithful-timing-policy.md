# Faithful-timing policy module (D4a)

Implements the accounting and policy of `docs/faithful-timing.md` (D4, approved 2026-10-07). Module:
`src/engine/liveMoveTimingPolicy.ts`, version `live-move-timing.v1.dominant-measured-phase.tie-no-optional-event`.

## Rule

- Each permitted CPU-phase parameter (kind `optional-lag-age`, `bg-write-row`, `palette-transfer-row`, ...) has its measured
  alternatives, the number of banked measurements per alternative, the chosen phase and the evidence cite.
- **Dominant** = the most frequent phase across ALL banked measurements of that parameter (every source together).
- **Tie rule**: a tie selects the phase WITHOUT the optional event (the source main-loop iteration count + the fixed lags).
- Phase per kind: `optional-lag-age` "event" = the optional lag frame at `age` is present; `bg-write-row` "event" = the LATER of the
  two write rows (`age`, the slower-CPU phase), "no-event" = the earlier row (`age - 1`), so a tie selects the earlier row;
  `palette-transfer-row` "event" = the later transfer row.
- The table is fixed and global: no gameplay state, no RNG, no capture/corpus row, no species. Rendering is pure and replay/reset
  cannot select a different phase, so the version lives in evidence and docs; the session export is unchanged (purely global
  constant, nothing per battle/session to persist; adding a field would only change export bytes).

## Table

| Move | Parameter | Fixed lags | Iterations | Alternatives (rows: measured) | Chosen | Tie rule |
|---|---|---|---:|---|---|---|
| MACH_PUNCH 183 | optional lag at age 91 | 71, 72 | 107 | lag 110: 5, no lag 109: 3 | lag (110 rows) | no |
| NIGHTMARE 171 | optional lag at age 149 | 21, 129, 130 | 164 | lag 168: 5, no lag 167: 3 | lag (168 rows) | no |
| MEGAHORN 224 | optional lag before the LoadDefaultBg row 156 (final restorebg fade one row late) | - | 176 | late 177: 9, early 176: 1 | late (177 rows) | no |
| MEGAHORN 224 | bg-write-row: monbg BGnCNT write row 8 / 7 | - | 176 | row 8: 7, row 7: 3 | row 8 (pixel-neutral) | no (prep24 alone was 3:3) |
| REVENGE 279 | bg-write-row: monbg BGnCNT write row 5 / 4 | - | 145 | row 5: 5, row 4: 1 | row 5 (pixel-neutral) | no |
| METEOR_MASH 309 | optional lag at row 195 (restorebg LoadDefaultBg overrun) | - | 214 | lag 215: 5, no lag 214: 2 | lag (215 rows) | no |
| EXTRASENSORY 326 | optional lag at task row 142 (restorebg Fade 2: VRAM 141 / palette 142 split) | 122, 123 | 161 | lag 162: 2, no lag 161: 4 | no lag (161 rows) | no |
| EXTRASENSORY 326 | scanline-split-line: the distortion write lands below / above the top of the window during scanout | - | 161 | split 2, S = 0: 4 | S = 0 (the written buffer) | no |
| PSYWAVE 149 | optional lag at task row 185 (restorebg Fade 2: VRAM row 184 / palette 185 split) | - | 204 | lag 205: 4, no lag 204: 2 | lag (205 rows) | no |
| SKILL_SWAP 285 | optional lag at row 176 (UnsetPsychicBackground's Task_FadeToBg counts executed frames) | - | 195 | lag 196: 4, no lag 195: 2 | lag (196 rows) | no |
| SKILL_SWAP 285 | palette-transfer-row: the bank-2 restore on row 176 / 175 (display-neutral, BLDY 16) | - | 195 | row 176: 1, row 175: 5 | row 175 | no |
| CRUNCH 242 | optional lag at age 121 (closing fade; a13fix, species audit 13) | 98, 99 | 139 | lag 142: 17, no lag 141: 13 | lag (142 rows) | no |
| PSYCHIC 94 | optional lag at ROM body age 124 (closing fade; adapter window = ROM rows 5..144) | 101, 102 | 142 | lag 145: 26, no lag 144: 2 | lag (145 rows) | no |
| EXTREME_SPEED 245 | optional lag at age 292 (before the fixed pair 312 / 313, which then land on 313 / 314) | 312, 313 | 318 | lag 321: 38, no lag 320: 4 | lag (321 rows) | no |
| DIVE 291 (opponent setup) | optional lag at age 64 (absorbed: 115 rows either way; rows 66..95 one row late) | - | 115 | lag: 1, no lag: 6 | no lag | no |
| ICY_WIND 196 | optional lag at age 261 (restorebg LoadDefaultBg frame overruns VBlank) | 241, 242 | 284 | lag 287: 11, no lag 286: 4 | lag (287 rows) | no |
| BLIZZARD 59 (player) | optional lag at age 347 (before the fixed pair 368 / 369) | 367, 368 | 369 | lag 372: 7, no lag 371: 0 | lag (372 rows) | no |
| BLIZZARD 59 (opponent; impact 197 shown, every age / row count shifted by impact - 197) | optional lag at age 336 = impact + 139 (before the fixed pair 357 / 358; 356 / 357 without it) | 356, 357 | 358 | lag 361: 21, no lag 360: 9 | lag (impact + 164 rows) | no |
| LIGHT_SCREEN 113 (opponent) | bg-write-row: the row-59 BLDALPHA step (eva 9 -> 8) direct / buffered under the row-60 write (a hold) | 68, 69 | 86 | hold: 2, direct: 9 (88 rows either way) | direct, no hold (row 59) | no |
| CONFUSE_RAY 109 | optional lag at age 249 (250 in some histories; both precede the fade's first changed row 251) | 26, 229, 230 | 266 | lag 270: 11, no lag 269: 3 (production window lengths) | lag (270 rows) | no |

Measurements: `tools/integration/fixtures/prep25/lag-frames.json` (2 of 4 each, a tie) + the D4a tie-break
`tools/integration/fixtures/d4a/lag-frames-tiebreak.json` (4 more scenarios per move by the same method, 3 of 4 with the lag each).
Tie-break scenarios: `tools/integration/d4aScenarios.py` (HITMONCHAN/SNORLAX + BRELOOM/GOLBAT for Mach Punch, HAUNTER/SNORLAX +
GENGAR/GOLBAT for Nightmare, both orientations, chosen before probing).

```
python3 tools/integration/d4aScenarios.py
sh -c 'K=$(ls tools/battle-lab/d4a-*.json | xargs -n1 basename | sed s/.json//); JOBS=8 sh tools/integration/prep14Probes.sh /tmp/d4a/r2 $K; JOBS=8 sh tools/integration/prep22Probes.sh /tmp/d4a/state 2 $K'
python3 tools/integration/prep25LagFrames.py /tmp/d4a/state /tmp/d4a/r2 /tmp/d4a/lag-frames.json "d4a-{mv}-extra-"
```

## Accounting

`docs/animation-integration-live-status.json` `faithfulTimingAdapters` / `faithfulTimingCount` / `faithfulTimingClaim`: a third disjoint
bucket beside `implementedAdapters` (scoped exact) and `faithfulRandomAdapters` (D3). An adapter using both D3 and D4 is listed once, in
faithful timing, with `d3: true`. `tools/integration/remainingAdaptersCensus.mjs` asserts exact + faithful random + faithful timing +
in flight + remaining = 276; `tools/integration/start-local-preview.sh` stamps the three counts separately.

## Consumers (D4a)

| Move | Status | Proof |
|---|---|---|
| MACH_PUNCH 183 | **faithful timing** (first body; `liveQ2Moves.ts` `liveMachPunchInputs`, the reducer's `optionalLateLag` input set from the policy, duration `liveMoveTimingBodyRows(183)` = 110) | `tools/integration/fixtures/d4a-live-receipt.json`: 8 dense windows x 2 fresh runs; 5 policy-phase windows 0 px; 3 other-phase windows differ only on ages 92..107 (the restore fade one row later), max 18252 px/row; routes seed 48 streak 7 / 14 (HITMONCHAN) Scene ON/OFF parity |
| NIGHTMARE 171 | policy entry only (chosen 168 rows = the reducer's fixed `NIGHTMARE_FIRST_INACTIVE_AGE`); **no live consumer yet** | the accepted reducer reads caller-owned per-age state that the corpus verifier feeds row by row: hardware palettes (ghost BG palette in BG bank 2 at ages 22..149, the target's palette in BG banks 8/9 from age 40), BG1/BG2 HOFS/VOFS (monbg scroll at 41, the shake toggling every 2 rows 46..120, cleared at 131), the painter order (re-sorted at ages 43/45/124). A production builder needs that per-age host model plus a known lend after Hypnosis + the SLP status units |

| MEGAHORN 224 | **faithful timing** (D4b; any known lend, also after a Tackle; `liveOamMoves.ts` `liveMegahornInputs` = the prep24 source model ported 1:1 in `liveMegahornInputs.ts` + `liveMoveOamAssembler.ts` `liveMegahornHardwareOamRows`; duration `liveMoveTimingBodyRows(224)` = 177 both sides) | `tools/integration/fixtures/d4b-live-receipt.json`: 10 dense windows x 2 fresh; 6 policy-phase windows 0 px; 3 row-7 windows 0 px (the monbg BGnCNT row is not read by the renderer); the early-fade accepted opponent window differs only on ages 158..173, max 17211 px/row; route seed 5 streak 35 (RHYDON) Scene ON/OFF parity; #142 shadow row 0 (elevated GOLBAT target) |
| REVENGE 279 | **faithful timing** (D4b; any known lend: first bodies and after a Tackle; `liveOamMoves.ts` `liveRevengeInputs` = the prep26 source model ported 1:1 in `liveRevengeInputs.ts` + `liveMoveOamAssembler.ts` `liveRevengeHardwareOamRows`; 145 rows both sides) | `tools/integration/fixtures/d4b-live-receipt.json`: 6 dense windows x 2 fresh, all 0 px (5 policy-phase windows + the row-4 accepted opponent window: the target OBJ still covers row 4); ordinary route Scene ON/OFF parity; #142 shadow row 0 (elevated GOLBAT target) |
| METEOR_MASH 309 | **faithful timing, d3** (D4b; Random2 twinkles from the presentation host, plan `LIVE_MOVE_RANDOM2_PLANS[309]`, excluded from the faithful-random list; the reducer's side rule `terminalAge = player target ? 214 : 213` is now the explicit `restoreLagRows` input (absent = the accepted corpora's phases, so the accepted player METANG -> ONIX proof is the L = 0 pin); live config passes the policy L = 1; the renderer branch draws any species pair from the live battler art) | `tools/integration/fixtures/d4b-live-receipt.json`: 5 dense windows x 2 fresh (host pinned to each activation gRng2Value); 3 policy-phase windows 0 px; the 2 no-lag windows differ only on ages 196..211, max 18589 px/row; route seed 15 streak 21 (METAGROSS) with presentation seeds 0x1234abcd / 0xfeed0042: identical gameplay/RNG/facility, Scene OFF parity, same seed -> identical frames |
| PSYWAVE 149 | **faithful timing** (D4c; any known lend: the accepted player body is a first body, the accepted opponent follows a Tackle; `liveOamMoves.ts` `livePsywaveInputs` = the prep30 source model ported 1:1 in `livePsywaveInputs.ts` + `liveMoveOamAssembler.ts` `livePsywaveHardwareOamRows` with the carried painter order; duration `liveMoveTimingBodyRows(149)` = 205 both sides) | `tools/integration/fixtures/d4c-live-receipt.json`: 6 dense windows x 2 fresh; 4 lag windows 0 px (incl. ESPEON -> CROBAT player: the elevated opponent's row-0 shadow is drawn by the live #142 hook, row 0); the 2 no-lag windows differ only on ages 186..201 (the Fade 2 BLDY rows), max 18618 px/row; ordinary route Scene ON/OFF parity |
| SKILL_SWAP 285 | **faithful timing** (S10A; any known lend, every measured window a first body; `liveOamMoves.ts` `liveSkillSwapInputs` = the prep35 source model ported 1:1 in `liveSkillSwapInputs.ts` (palettes, bld) + `liveMoveOamAssembler.ts` `liveSkillSwapHardwareOamRows` (128-entry OAM, 32 matrices, carried order); declines shiny / non-zero idle rests; duration `liveMoveTimingBodyRows(285)` = 196 both sides) | `tools/integration/fixtures/sf-live-receipt.json`: 6 dense windows x 2 fresh; 4 lag windows 0 px (incl. both elevated-WEEZING row 0s via the live #142 hook and the restore-176 ALAKAZAM -> GOLEM player window); the 2 no-lag windows differ only on ages 177..192 (the restore fade), max 18649 px/row; route 8/7 VENOMOTH Scene ON/OFF parity |
| EXTRASENSORY 326 | **faithful timing** (D4c; FIRST body only: the activation scanline buffers are history, the battle intro's residue = the Dig / Rapid Spin S0 constant; `liveOamMoves.ts` `liveExtrasensoryInputs` = the prep30 source model ported 1:1 in `liveExtrasensoryInputs.ts` + `liveMoveOamAssembler.ts` `liveExtrasensoryHardwareOamRows`; reducer `targetYElevation` input = GetBattlerYCoordWithElevation (accepted default 8 / 48 unchanged); 161 rows both sides) | `tools/integration/fixtures/d4c-live-receipt.json`: 6 dense windows x 2 fresh; the 3 policy-phase windows 0 px (accepted both orientations, ESPEON -> CROBAT opponent); other-phase windows only on their documented rows (`alternatePhaseResidual.windows`): ALAKAZAM -> GOLEM opponent (lag) ages 143..158; ALAKAZAM -> GOLEM player (split) 22 rows, 1433 px; ESPEON -> CROBAT player (lag + split) 85 rows; ordinary route Scene ON/OFF parity |

Megahorn tie-break (D4b): prep24's six windows tie the monbg write row 3:3. Four more windows chosen before probing
(`d4aScenarios.py`: RHYDON -> GOLBAT, NIDOKING -> SNORLAX, both orientations) measured by the prep22 probe (`d4aFixtures.py` reads the
monbg BGnCNT write row from `regEvents`, cross-checked on the six prep24 windows) are all row 8 and late: row 8 in 7 of 10, late in 9 of 10.

Mach Punch trace palette: OBJ bank 9's unfaded contents at a first body are the known-entry healthbar palette
(`live-animation-palette-resources.json` `initial.healthbar`, tag 55044), equal in all 8 Mach Punch and 8 Nightmare D4a/prep25 state probes
(two trainers, any species); the attacker's battler palette is NOT what the trace shows.

## a13fix reclassification (species audits 11 / 13)

Crunch (242), Psychic (94) and Extreme Speed (245) moved from scoped exact to faithful timing (#151 precedent): their optional lags
(table above) are measured, the shipped phase is the dominant one (the durations the adapters already had: 142 / 140 + 5 / 321, now read
from `liveMoveTimingBodyRows`), and their exact fixtures stay valid in scope. Census: 247 scoped exact + 13 faithful random + 16 faithful
timing = 276. Dive's opponent-setup lag at 64 is a second Dive parameter (no count change). Proof: `tools/integration/fixtures/a13fix-live-receipt.json`
(Crunch / Psychic 58 fresh audit-13 windows, Extreme Speed 42 fresh audit-11 windows, the CLAMPERL Dive window; policy phase 0 px, other phase
only on the documented rows), `tests/animation/liveSpeciesAudit13Fixes.test.ts`.

## d4w reclassification (prep41 D4 widening)

Pursuit (228) and Hidden Power (237, Unown attacker) moved from scoped exact to faithful timing (docs/next-adapters-prep41.md s1 / s2):
Pursuit `optional-lag-age` 82 (fixed lags 60, 61; 24 lag : 9 no-lag of 33 measured bodies -> lag, 103 rows) with the first-body gate lifted
(any known lend; the turn-2 body after the attacker's own earlier Pursuit is proved too); Hidden Power `optional-lag-age` 64 (fixed lag 118;
1 lag : 9 no-lag -> no lag, 180 rows; no renderer change). Census: 245 scoped exact + 13 faithful random + 18 faithful timing = 276. Proof:
`tools/integration/fixtures/d4w-live-receipt.json` (fresh prep41 counters byte-identical to the banked receipts; 33 Pursuit windows incl. 12
lb26 second bodies (`d4wBody2Windows.py`, HP from the probe's stageFacts) and 10 Hidden Power windows, `d4wDense.sh` twice fresh: policy
phase 0 px, other phase only ages 84..99 / 65..179), `tests/animation/liveD4wWidening.test.ts`.

## d4tails reclassification (S10A, ISSUES #152 short bodies / audit-14 Confuse Ray)

Icy Wind (196), Blizzard (59) and Confuse Ray (109) moved from scoped exact to faithful timing (#151 precedent; no adapter / renderer
change: the shipped phase is the long body the adapters already rendered, 287 / 372 + 361 / 270 rows). Fresh counters
(`tools/integration/d4tailsCounters.sh`, 46 scenarios x 2 fresh direct-mGBA runs, r0 == r1, `fixtures/d4tails/counters.json`) show each
short body is the same CPU-phase class: the identical fixed lags plus one absent optional lag, every earlier row exact (no geometry or script
difference). Blizzard is per side (player 7 : 0; opponent impact-197 3 : 1; the impact-start != 197 controls ARBOK -> CATERPIE /
WEEZING -> BLASTOISE are geometry, declined and not counted). Confuse Ray's lag lands at 249 or 250 by history; both are display-neutral
(270-row @3410 bodies counted at 250 are 0 px), and the counter instrument itself can add this borderline lag (PICHU @1771: 270 rows
instrumented, 269 in the production probe), so its phase counts are uninstrumented window lengths. Census: 242 scoped exact + 13 faithful
random + 21 faithful timing = 276. Proof: `tools/integration/fixtures/d4tails-live-receipt.json` (28 d4aTimingCheck windows twice fresh:
23 policy phase 0 px; Icy Wind other phase only 18 of ages 263..285, Blizzard BLASTOISE -> BLASTOISE 338..353; Confuse Ray production
windows 11 long 0 px, 3 short only body ages 251..266), `tests/animation/liveD4tailsTiming.test.ts`.

Faint Attack (185) is the same class (fixed lags 80, 81, 108, 109, 182, 183; optional 205: 226 / 225 rows) but is NOT landed: its
player-side dominant phase is no lag (6 counted short bodies : the accepted prep6 body, long by pixels), while the live adapter renders the
long body on both sides; a faithful player-side policy needs the restore fade one row earlier there (a presentation change). Opponent 2 : 1.

## fa185: Faint Attack per-side restore lag (S10A, ISSUES #152 "Faint Attack (185) short bodies")

Faint Attack (185) moved from scoped exact to faithful timing with a side-keyed `optional-lag-age` 205 entry (fixed lags 80, 81, 108, 109,
182, 183; d4tails counters): player no lag (1 : 6, the accepted staged prep6 body counted long by pixels), opponent lag (2 : 1). The
optional lag is the restorebg `Task_FadeToBg` state-2 frame (battle_anim.c:1163-1175: `LoadDefaultBg` -> `DrawMainBattleBackground`'s VRAM
decompress and the fade-in `BeginHardwarePaletteFade(0xE8, 0, 16, 0, 1)` in the same task step) overrunning VBlank under the black screen;
without it the default-BG swap, the 16-step fade-in, the task destroy (:1178-1182), `waitbgfadein` and `end` all run one frame earlier. The
renderer derives the player phase from that (`faintAttackRestoreProfile(false)`: `defaultBgSwapAge` 204 -> 203, `doneAge` 219 -> 218; every
earlier age unchanged), and `liveMoveAnimationDuration(185)` = 220 player / 221 opponent. Census: 241 scoped exact + 13 faithful random + 22
faithful timing = 276. Proof: `tools/integration/fixtures/fa185-live-receipt.json` (10 windows `tools/integration/fixtures/fa185/windows`,
d4aTimingCheck twice fresh: 8 policy-phase 0 px (6 player at 220 rows, 2 opponent at 221); DELCATTY -> GOLEM opponent (no lag) and the
accepted prep6 player body (lag) only on ages 203..218), `tests/animation/liveFa185Timing.test.ts`.

## lsbz: Light Screen opponent row-59 BLDALPHA write phase (S10A, ISSUES #152 "Light Screen (113) opponent attacker, row 59")

Light Screen (113) moved from scoped exact to faithful timing with an opponent-side `bg-write-row` entry (age 60 = the late row; chosen
no-event = row 59). Audit 15 (`docs/live-audit-15-chains.md` s1, `receipts/vblank/table.txt`, two fresh runs each) showed the opponent's
row-59 BLDALPHA step (reducer age 52, wall anchor + 7; eva 9 -> 8) either reaching the I/O register at once (9 windows: SNORLAX / CHANSEY
after Double Team, Faint Attack, Hydro Pump, Ice Beam, Swift; EXEGGCUTE / ONIX first body and after Double Team, Faint Attack, Swift) or
buffered by `SetGpuReg` (VCOUNT outside VBlank, `sGpuRegWaitingList` [0x52]) and lost under the row-60 write (2: the SNORLAX / CHANSEY
first body, the accepted EXEGGCUTE / ONIX after-Tackle fixture); lag ages [68, 69] in both. `lightScreen.ts` `specialScreenAtAge`
`opponentBlendHold` (default true = the accepted corpus, so the Factory acceptance reducer is unchanged); `liveMoveAnimation.ts` case 113
passes the policy phase (no hold). Census: 240 scoped exact + 13 faithful random + 23 faithful timing = 276. Proof:
`tools/integration/fixtures/lsbz-live-receipt.json` (19 windows `tools/integration/fixtures/lsbz/windows/light-screen-*`, full 88 rows,
d4aTimingCheck twice fresh: 9 opponent policy-phase + 8 player windows 0 px; the 2 hold windows only on row 59, 2,658 px),
`tests/animation/liveLsbzTiming.test.ts`.

## lsbz (B): Blizzard opponent at any impact start (S10A, ISSUES #152 "Blizzard (59) opponent pairs whose impact-start age is not 197")

The live window is geometry-derived: `liveMoveAnimationDuration(59)` = `blizzardImpactStartAge(side, geometry) + 164` from the displayed
field (`liveMoveAnimation.ts` `liveBlizzardDuration`; geometry = the case-59 attacker / target `picOffsetPoint`; the case-59 gate now passes
the field). The impact start is the traveling-particle callback replay geoice uses (`waitforvisualfinish` releases when the last snowball /
large crystal has destroyed itself); every later step (impact crystals, the restorebg fade, the optional lag at impact + 139, the fixed
pair impact + 160 / + 161) is relative to it. Player geometries are all impact 208 (372 rows, unchanged); opponent 194..206 (358..370).
Proof: 25-pair grid with predictions committed before any probe (`tools/integration/lsbzBlizzardGrid.ts`,
`fixtures/lsbz/blizzard-grid-predictions.json`), 24 staged (`lsbzBlizzardStage.py`; BALTOY -> HUNTAIL's probe crashed); fresh counters
twice (`fixtures/lsbz/blizzard-counters.json`) match the predicted shape on every pair (lag 16, none 8 -> the opponent count 21 : 9);
d4aTimingCheck twice fresh over 25 windows (`fixtures/lsbz/windows/blizzard-*`, + WEEZING -> BLASTOISE): 17 lag windows 0 px at impact +
164 rows, the 8 no-lag windows only on impact + 141 .. + 156 (`alternatePhaseResidual.windows`). No count change. Receipt
`tools/integration/fixtures/lsbz-live-receipt.json` `blizzard`; `tests/animation/liveLsbzBlizzard.test.ts`.

## mhl1 / lpm1: Thunderbolt (85) orb-burst VBlank lag, sound table only (D4, no count change)

Thunderbolt's `createsprite gThunderboltOrbSpriteTemplate` burst (9 sprites in one script step) overruns one VBlank on hardware, so every later row of the
script is one wall-clock frame late: the third SE 118 at row 112 and blends are on the script rows, then `+0x143` at 171 and `+0x149` / SE 215 at 172 (the
script's own rows put SE 215 at 171), and the later SE 119 rows are +1 (ROM 239 / 258 player lab; 252 / 271 and 256 / 275 mechanic labs). Same class as
METALLIC_SHINE_LOAD_LAG / the Scary Face lags in the extractor's wall-clock `lags` list: CPU-load phase, not battle state (docs/aud251-s11-scoreboard-refresh.md "lpm1" item 2).

- Policy (dominant measured phase): lag present. Measured in all 3 Thunderbolt labs (`aud242b-thunderbolt-player-on`, `mechanic-thunderbolt-player-delcatty-opponent-shuckle`,
  `mechanic-thunderbolt-opponent-delcatty-player-shuckle`): SE 215 / SE 119 -1 in the engine in each; no lab without the lag was seen, so there is no alternate-phase tally.
- Constant: one line in `tools/extract/extract-anim-sound-timing.ts` (`lags.push({ after: frame - 0.5, frames: 1 })` on the `gThunderboltOrbSpriteTemplate` createsprite), regenerated
  into `src/data/gen/anim-sound-timing.json` (3 Thunderbolt SE ops +1; nothing else in the file changes; `extract-anim-sound-timing.ts` reproduces the committed JSON byte for byte).
- Accounting: sound-table timing only. No live adapter, renderer or visual body changes, so the 276-body buckets (scoped exact / faithful random / faithful timing) do not move and
  `docs/animation-integration-live-status.json` is untouched. Thunderbolt's presentation pictures are not claimed exact or reclassified by this entry; the claim is the engine's SE rows
  against the ROM's in the three labs above (SE 215 / 119 exact after: lab `aud242b-thunderbolt-player-on` mass 4 -> 1, the remaining row is not Thunderbolt's).
- Alternate-phase residual: a battle where the burst does not overrun would play SE 215 / 119 one row early (+-1, 3 SE rows per Thunderbolt); not observed.
