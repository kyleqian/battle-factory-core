# doll90 — Substitute-doll residual cells, batch 2

Integration lane, base master `d46cdfff1` (production src `8150be72`). Final production code `c89c27a0d` (src tree `d3e66c8b`).
Presentation only: no gameplay, RNG, damage, turn order or facility state changed.

## Results first

| cell (census cmds) | verdict | windows (fresh direct mGBA, lab seed 305419897, r1 == r2) | px | named input |
|---|---|---|---|---|
| Psych Up 244 player (9) + opponent | **PROVEN, landed** both sides | PERSIAN->SLOWBRO, GENGAR->GOLBAT (elevated doll) player; PERSIAN->SLOWBRO, GOLBAT (elevated) ->LAPRAS opponent: 4 test bodies x 179 rows | **0 / 0** every row (controls 0) | the renderer drew the doll box with the species sheet and the species OBJ bank. Fixed: `liveSubstituteDollArt` in its `artFor` + `composeLiveFieldPalettes` (Megahorn's fix). Reverts: species sheet 1,856 px/row, species bank 97,018 px |
| Double Team 104 opponent (15) + player (8) | **PROVEN, landed** both sides (self-target) | PERSIAN ply x2, GENGAR ply x3, PERSIAN opp x2, GOLBAT opp x2: 9 composites (swap-in, idle, body, swap-back, first inactive row), 240 / 244 rows | **0 / 0** every row | framing `{rows: 159, shift: -1}` (§1). The named clone-phase suspect is NOT it: RAM shows the swaps never touch the attacker sprite's `data[3]` |
| Sing 47 opponent (5) | **PROVEN, landed** (player unchanged) | opponent PERSIAN, GOLBAT, CROBAT->WAILORD, WAILORD->CROBAT; player PERSIAN x2, GENGAR x2 | **0 / 0** every row (8 / 8) | the ROM body follows the note geometry: `liveSingBodyRows` (§2), predicted for two new pairs before their probes |
| Recover 105 opponent (10) + player (3) | declines | doll-free controls (`doll90-ctl-recover-*`, no Substitute) | controls 179,771 / 186,901 px at every alignment 0..16 | the Recover adapter's own residual for these species (orbs from row 1, attacker blend), not a doll input. Instrument: an orb RAM probe (orb sprite x / y per row) vs production's orb anchors |
| GrassWhistle 320 opponent (11) | declines | doll-free controls `doll90-ctl-grass-whistle-*` | controls 228,007 / 181,050 px = the doll windows exactly (body rows 165..177, whole field) | the adapter's own BG-fade rows. Instrument: BG palette / blend RAM per row on the doll-free control |
| Focus Punch 264 opponent (9) | declines | doll-free control bodies in the doll81 labs (4631, 6298) | the same 16 whole-field rows (132..147) as the swap windows | the control's own residual |
| Focus Punch 264 player (1) | declines | 4 / 5 windows 0 px at `{155, 0}` | GENGAR's 2nd body is 153 rows (309,615 px) | history-dependent body length (CPU-phase class). It needs a D4 timing-policy entry with the alternative documented. Not landed |
| Dream Eater 138 player (3) | declines | not re-measured | doll81: PERSIAN body 266 vs GENGAR 265 | pair / history-dependent length (the opponent's later windows vary too) |
| Iron Tail 231 opponent (3) | declines | doll81 def labs, re-measured | doll-only rows 116..125 (274..476 px/row) | the doll-free controls themselves are 8..244 px (ages 9..12 / 41..44), so the cell cannot reach 0 px |
| Dig 91 player (7), Double-Edge 38 player (4) | declines | not attempted | — | two-turn def fixture missing / prep38's history pixel outside the doll (doll81) |

Struggle is out of scope.

**Census (seeds 0..999, base `d46cdfff1` vs final `c89c27a0d`; 10 `--index-from` shards each, `hist73Merge.py` + `land82CensusCheck.py`):**
- live **25,962 -> 25,999 commands (+37)**, live frames **3,880,093 -> 3,888,853 (+8,760)**;
- gained cells: 104 opponent 15 / 3,600 frames, 104 player 8 / 1,952, 244 player 9 / 1,611, 47 opponent 5 / 1,597;
- **0 live -> fallback**;
- command KEY sequence identical, **`battleDigestExcludingFrames` identical**, 27,516 commands in both;
- stalls 434 / 796 / 881 in both runs, no truncated tail this time;
- Substitute-doll declines 178 / 5,696 frames -> 141 / 4,512.

The census on `d3cc27427` (before the seam-only move of `liveSingBodyRows`) is byte-identical.

**Scene ON / OFF parity** (`land82Parity.ts`):
- **Seed 497, 40 turns** (Psych Up player + Double Team opponent requested): boundaries (scene hit-marker masked), RNG cursor, outcome, facility and prompt are all equal.
- **Seed 506, 30 turns** (Sing opponent): all of the above equal.
- Seed 506 at 36 / 40 turns: ON stalls while OFF reaches the action menu. This reproduces identically on the base tree, so it is a pre-existing replay-helper stall.

## 1. Double Team (self-target composite)

- **RAM** (`dt60Probe.py` on the four doll81 Double Team labs; `receipts/ram/*-dt.json`):
  - The attacker sprite's `data[3]` is constant through the whole trace, swaps included: PERSIAN player 3, GENGAR player 0, PERSIAN / GOLBAT opponent 0.
  - Production's `liveDoubleTeamAttackerStepCounter` gives the same values.
  - The clones' row-1 state is the accepted dt60 phase.
  - So the doll does not change the clone phase.
- **ROM script**:
  - Behind the doll, `MON_TO_SUBSTITUTE` starts at the body's first inactive row (158 script rows + 1).
  - There is no `General_StatsChange` at all: `TryHandleLaunchBattleTableAnimation` skips `B_ANIM_STATS_CHANGE` while `behindSubstitute`.
  - The composite therefore frames only the ROM body: 159 rows. The doll-free adapter's 230 rows end with the banner.
- **Shift -1**: every doll-free control body in the same labs is exact one row later than activation-aligned.
  - PERSIAN player after the fade: 0 px at -1.
  - PERSIAN opponent first body: 0 px at -1.
  - Elevated GOLBAT: 200 px on row 0 only, the documented elevated-attacker shadow of doll-free controls.
  - This is the prep38 calibrated-shift framing method, not a D4 phase.
- **Fixture gap fixed in the tool**: the attdoll fixtures carried no personality, so production's player config declined (`config null`).
  - `doll90Personality.py` reads `gPlayerParty` / `gEnemyParty` personalities (r1 == r2).
  - `attdollLiveCheck.ts --personalities=<dir>` passes them.
  - Absent flag = unchanged behaviour.
- **Tail**: the next command's first row (k+1, outside the composite) shows 200 px for GENGAR player attackers.
  - It is 800 px without production's latch.
  - Land82's accepted Sing player GENGAR cell has the same 200 px, so this is pre-existing.

## 2. Sing (geometry-derived body length)

- **Source**: `AnimWavyMusicNotes_Step` destroys a note once it leaves x -16..256 / y -16..128, and `Move_SING`'s first `waitforvisualfinish` waits for the last note. The remaining script (`clearmonbg`, `AnimTask_MusicNotesClearRainbowBlend`, `end`) is geometry-independent.
- **`liveSingBodyRows`**: the last on-screen note's body age + 97, using production's own `wavyMusicNotesGeometryAtAge` on the config's animation centres (note age = body age - 7).
- **It reproduces all four doll81 ROM bodies:**
  - player PERSIAN / GENGAR 246;
  - opponent PERSIAN 242;
  - opponent GOLBAT 244.
- **Prediction before probe** (`receipts/sing-predictions.txt`, written before the probes ran): opponent CROBAT -> WAILORD 230 and WAILORD -> CROBAT 248 script rows. The fresh probes measured **230 / 248**.
- **Doll-free opponent controls**: 0 px on both pairs, so the adapter is exact and only the swap-back row depended on the pair.

## Pins (Tier 1) and revert experiments

- **`tests/doll90DollCells.test.ts`**:
  - Psych Up: cell sides, durations, and the doll box at age 0 equal to the Scene OFF doll on all four committed def fixtures.
  - Double Team: cell, self set, framing, composite durations 244 / 240, the body-age mapping, Recover still declining, and four committed per-row ROM sha256 composites (`attdollLiveCheck.ts --emit`, re-rendered by `doll90AttFixture.ts`).
  - Sing: sides, six derived lengths + composite durations, three committed per-row ROM sha256 composites.
- **Moved pins** (intentional cell changes):
  - `substituteDollDefenderLive` allowlist + `244` both sides;
  - `land82DollCells`: self set `{241, 104}`, Sing sides both;
  - `substituteSwapAttdollCells`: + the `104` framing row; the framing-key check excludes the geometry-derived `47`.
- **Reverts** (each fails the pins):
  - Psych Up: species sheet; species bank.
  - Double Team: shift 0; rows 158; self set `{241}`.
  - Sing: tail 96; geometry off; sides player-only.

## Gates (final code `c89c27a0d`)

- Targeted, 19 files (every doll / swap test + `factoryAnimationInventory` + `playableAnimationIntegration` + dt60): 181 passed.
  - The boundary ratchet failed on `liveSubstituteSwap.ts -> ../animation/sing.ts`.
  - Fixed by moving `liveSingBodyRows` into the pinned seam consumer `liveMoveAnimation.ts`, then that file rerun green.
- `npm run typecheck` exit 0.
- `npm run test:smoke` 448 / 448.
- Full suite as two shards: 6,926 + 6,361 passed, 0 failed (119 + 104 skipped).
- `npm run build` exit 0.
- `compare:differential` vs `d46cdfff1`: PASS, 624 / 624 captures byte-identical.

## Reproduce

```sh
sh tools/integration/doll90Run.sh .integration/validation/<fresh>            # probes x2, RAM reads, windows, summary.tsv (cmp receipt)
sh tools/integration/doll90Run.sh .integration/validation/<fresh> --census   # + base / final censuses (10 shards each) + land82CensusCheck
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 497 40 244:player 104:opponent
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 506 30 47:opponent
```

Runner verified in a fresh dir on the final src tree `d3e66c8b` (commit `65f1de763`): 12 + 8 scenarios r1 == r2, `same summary.tsv`.

Receipts: `tools/integration/fixtures/doll90-live-receipt.json`, `tools/integration/fixtures/doll90/receipts/`. The doll-free control and
prediction scenarios are in `tools/integration/fixtures/doll90/scenarios/`.
