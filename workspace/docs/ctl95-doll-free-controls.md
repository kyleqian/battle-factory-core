# ctl95 — the doll labs' doll-free control residuals, classified

Integration lane, base master `fed91f2de` (production src `081a0570`). Final production code `375660655` (src tree `26b82677`).
Presentation only: no gameplay, RNG, damage, turn order or facility state changed.

## Results first

| move (census live cmds, base) | verdict | mechanism | evidence (fresh direct mGBA, r1 == r2, every row of every window) | px before -> after |
|---|---|---|---|---|
| **Recover 105** (opp 92 + ply 75) | **ARTIFACT** (window alignment). Production is correct. Doll cell added both sides | Production's accepted age 0 is the **first orb** = activation + 10, as in the accepted KADABRA fixture (window 615 = its first orb). doll81 / doll90 framed age 0 at the activation, and their shift scans went -16..0, never +10 | `recoverProbe.py` RAM: first orb 1747 vs activation 1737 (GOLBAT 1746 / 1736). The orb anchor (139, 37) vs the accepted (139, 35) is the attacker's own y (47 vs 45). BLDCNT `3f40` / BLDALPHA `080c` and the attacker palette steps start on the first-orb row in both labs | doll90 controls PERSIAN / GOLBAT opp (6 bodies): 178,714 / 185,849 px per 169 rows at shift 0 -> **0 / 0** at shift 10. ctl95 player PERSIAN (3 bodies) / GOLBAT (4): 231,855 / 223,407 -> **0 / 0**. Personality irrelevant (0 / 0 with and without) |
| **GrassWhistle 320** (opp 20 + ply 9) | **DEFECT, fixed**, source-derived. Doll cell widened to the opponent | The BG restore `simple_palette_blend` follows `waitforvisualfinish` on the **last wavy note**, so it is created at the last on-screen note body age + 2, not at a per-side constant (163 / 166). The elevated-opponent shadow returns one row after the 220-row script, inside the 225-row window | BG(5,5) colour steps at restore + 6 / + 12: accepted ROSELIA->ONIX opp 172 / 178 (L 164), ply 169 / 175 (L 161); controls PERSIAN opp 165 / 171 (L 157), GOLBAT opp 167 / 173 (L 159), on first and later bodies. **Predicted before probing** (`receipts/gw-predictions.txt`, committed `207f4bdd1`): GENGAR opp 163 / 169, CROBAT opp 154 / 160, PERSIAN / GENGAR ply 169 / 175. All four measured exactly so | doll90 controls PERSIAN / GOLBAT opp: 228,007 / 181,850 px (rows 165..177 whole field; GOLBAT also 221..224 shadow 200 px/row) -> **0 / 0** (4 bodies x 225 rows). The 4 predicted pairs: 8 bodies **0 / 0** |
| **Focus Punch 264** (opp 19 + ply 8) | **DEFECT, CPU-phase class. Not changed: the remedy is a policy decision outside this grant** (below) | The restore fade-in after `restorebg` starts at age 132 or 133 depending on an **optional lag frame at age 131** in `Task_FadeToBg` (`LoadDefaultBg` decompression). Production keys it on the target side (opponent attacker 132 / 153 rows, player attacker 133 / 154). In the ROM it varies **with lab history on both sides, for the same pair** | RAM: `gRng2Value` repeats between rows 130 and 131 (62398, 62398) in every 154-row body, and never in a 153-row body. Clean ctl95 labs, same pair different bodies: opp PERSIAN 154, 154, 154, 153; GOLBAT 154, 154, 153; the **accepted pair** BRELOOM->STARMIE 154, 154, 154 (its accepted lab: 153); ply PERSIAN / GENGAR 154, 154, 153, 153 | Opponent: production exact on 3 / 13 measured bodies (16 whole-field rows 132..147, 17,539..18,272 px/row otherwise). Player: exact on 5 / 9 |
| **Iron Tail 231** (opp 21 + ply 40) | **DEFECT, fixed**, source-derived | The metallic-shine strip shows through the attacker's OBJ-window copy, so the attacker's own opaque pixels decide where it appears. Production gated the band to `data10 >= 28`, which is AZUMARILL's extent. Wider sprites show it from `data10` 16..24 | Clean ctl95 labs + doll81 def controls, constant over first and later bodies (species-dependent, not history) | PERSIAN opp 38, GOLBAT opp 162, PERSIAN ply 244, GENGAR ply 8 px (ages 9..12 / 41..44) -> **0 / 0** on all 14 bodies |

Accepted comparators of the changed moves stay exact. `liveAdapterFramebuffer.ts`, two fresh runs each:
- `status-batch-grass-whistle-{opponent,player}`: 225 / 225 rows.
- `physical-batch-iron-tail-{opponent,player}`: 135 / 135 rows, digests unchanged.
- Recover and Focus Punch production are unchanged.

**Doll cells** (in this grant; doll90's method):
- **GrassWhistle 320 opponent**: attacker-doll swap, framing `{221, 0}` unchanged. Composites of 302 rows, 0 / 0, with tail k+1 / k+2 at 0:
  - `doll81-att-grass-whistle-opponent` (PERSIAN);
  - `-golbat`;
  - `ctl95-att-gw-opponent-crobat-wailord` (elevated CROBAT, restore 148).
- **Recover 105 both sides**: self-target swap, framing `{rows 184, shift -10}` (183 script rows + the first inactive row; body row r = adapter age r - 10).
  - `doll81-self-recover-*`: opp PERSIAN / GOLBAT 265 rows, ply PERSIAN / GENGAR 269 rows, all 0 / 0.
  - Tail k+1 is 0, except GENGAR player at 200 px. That is doll90's pre-existing GENGAR-player tail, outside the composite.
  - doll81's "never 0 at shifts -16..0" was not reproduced at -10 on this code.

**Census** (seeds 0..999, base `fed91f2de` vs final `375660655`; 10 `--index-from` shards each, `hist73Merge.py`, `land82CensusCheck.py`, `prep43CensusDelta.py`):
- live **26,181 -> 26,205 commands (+24)**, live frames **3,905,536 -> 3,912,315 (+6,779)**;
- gained cells:
  - 320 opponent: 11 commands / 3,322 frames;
  - 105 opponent: 10 / 2,650;
  - 105 player: 3 / 807;
- **0 live -> fallback**;
- Substitute-doll declines 141 / 4,512 frames -> 117 / 3,744;
- GrassWhistle (29 live commands) and Iron Tail (61) change pixels only. The census on `207f4bdd1` (both fixes, before the doll cells) was identical to base in every count, `battleDigest` `f6d738925c8a` both.
- **Command KEY sequence identical outside stalled tails** (`land82CensusCheck.py`). `ctl95CensusPair.py` + `prep43CensusDelta.py` pair 27,515 commands with 0 key mismatches. The 25 frame mismatches are:
  - the 24 newly live commands (32-frame fallback -> 265 / 269 / 302-frame composites);
  - stalled seed 881's last command (32 -> 25, cut by the frame budget).
- **`battleDigestExcludingFrames`** is identical on 9 / 10 shards. Shard 7 differs only in **stalled seed 796**:
  - liveShareCensus's deterministic `FRAME_BUDGET` 200,000 is reached 2 turns earlier (367 -> 365 turns, 215 -> 214 commands);
  - the cause: 4 of its GrassWhistle-opponent doll bodies are now 302-frame live composites instead of 32-frame fallbacks;
  - the dropped command is base's last one past the budget.
  - It is not a logical change: the parity checks below are equal, and the stall is pre-existing.
- Stalls 434 / 796 / 881 in both runs.

**Scene ON / OFF parity** (`land82Parity.ts`, final code; byte-identical output on the base tree):
- **Seed 587, 40 turns** (Recover opponent requested; 10 Recover-opponent doll bodies in the census): boundaries (scene hit-marker masked), RNG cursor, outcome, facility and prompt are all equal.
- **Seed 497, 40 turns** (GrassWhistle opponent): all of the above equal.
- Both stall ON and OFF at the same point (the pre-existing replay-helper stall, identical on base).

## 1. Recover: the checker's window, not the adapter

- The adapter's age 0 is "the first orb's creation tick" (`recover.ts`). The accepted fixture `recover-opponent-kadabra-player-onix` starts its window at frame 615, its first orb.
- `attdollLiveCheck.ts` (and `ctl95ControlCheck.ts --shift=0`) start at the script activation. The first orb is created 10 rows later: `loadspritegfx` x2, `monbg`, `setalpha`, `loopsewithpan` and the BlendColorCycle task come first.
- **Ablation, one cause at a time**:
  - aligned window: 179,771 -> 0;
  - RAM personality: no effect, 0 with and without;
  - lab history: first and later bodies are the same, in doll90's labs and in clean ctl95 labs.
- With the controls exact, the doll cell framed at the same alignment is exact on both sides (above).

## 2. GrassWhistle: restore blend after the last note

- Source (`battle_anim_scripts.s:4236`): the twelve notes, then `waitforvisualfinish`, then `AnimTask_MusicNotesClearRainbowBlend` + `simple_palette_blend F_PAL_BG 4 -> 0`.
- `AnimWavyMusicNotes_Step` destroys a note on the callback after it leaves x -16..256 / y -16..128. doll90 used the same fact for Sing's body length.
- `grassWhistleRestoreBlendStartAge(origin, target)` = the last on-screen note age (`wavyMusicNotesGeometryAtAge`, production's own) + 19 + 2.
  - It reproduces both accepted constants and every measured pair.
  - It predicted 4 new pairs before their probes.
- **Range over all species centres** (scan, `liveMoveAnimationPresentation` configs): player 160..161 (so the player side practically never changes); opponent 143..164.
- The script's end (220 rows) is geometry-independent on every probe. So the body length and the 225-row window are unchanged.
- `LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS[320] = 4`: the file's own rule ("any adapter whose window ends after the script end needs its own entry").

## 3. Focus Punch: an optional lag the battle state does not determine

- `Move_FOCUS_PUNCH` ends `waitforvisualfinish; restorebg; waitbgfadein`.
  - `Task_FadeToBg` fades to black (ages 113..128).
  - It then calls `LoadDefaultBg()` (LZ decompression of the battle terrain) and starts the hardware fade back.
  - When that frame overruns, the main loop loses one iteration: `gRng2Value` is unchanged between rows 130 and 131. The fade-back and the body end one row later (133 / 154).
- **Ablation**:
  - clean labs, no Substitute anywhere: still both phases;
  - the same pair across turns: both phases;
  - the accepted pair in another lab: the other phase;
  - personality: not an input (no species art changes).
- No production input determines it (not side, species, body index or doll history). By the project's D4 definition (`liveMoveTimingPolicy.ts`) this is a CPU-phase parameter.
- **Not landed, and why**:
  - **D4 entry** (`optional-lag-age` 131): the dominant measured phase is "event" on both sides (opp 10 / 3, ply 5 / 4). This moves the move into the faithful-timing bucket, and the accepted opponent fixture (153) becomes the alternative phase.
  - **Fail closed, whole move**: all 27 live Focus Punch commands (opp 19 / 2,926 frames, ply 8 / 1,240) go to fallback.
  - Both edit `docs/animation-integration-live-status.json` (`faithfulTimingAdapters` / `implementedAdapters`), outside this grant. A source-derived fix is not possible: the lag is CPU timing.
  - Recommendation to the supervisor: the D4 entry, mirroring Light Screen 113's reclassification.
- The instrument is `ctl95ControlCheck.ts` + the `gRng2Value` repeat in the probe rows. A `lag-frames.json`-style counter would bank further measurements.

## 4. Iron Tail: the band is the attacker's shape

- The `data10 >= 28` gate was documented as "the first seven callbacks of each sweep produce no pixels". That is true for AZUMARILL only.
- The strip is BG1 seen through the attacker's OBJ-window copy. Drawing it masked from the shine's first step (age 6) through sweep 2 is exact for:
  - every measured attacker: AZUMARILL, PERSIAN, GOLBAT, GENGAR;
  - both sides, first and later bodies.

## Pins (Tier 1) and revert experiments

- **`tests/ctl95DollFreeControls.test.ts`** (20 tests):
  - the restore table (8 pairs);
  - shadow return rows;
  - the Iron Tail band;
  - the Recover alignment;
  - 7 committed doll-free ROM windows (`fixtures/ctl95/windows`, per-row sha256, re-rendered by `ctl95ControlFixture.ts`);
  - 7 committed doll composites (`fixtures/ctl95/att`, doll90 `--emit` format; Recover re-rendered with the production self-target request);
  - the cell sets.
- **Moved pins** (intentional):
  - `tests/animation/ironTail.test.ts` band ages;
  - `land82DollCells`: 320 both sides, self-target set `{241, 104, 105}` + Recover swaps;
  - `doll90DollCells`: Recover swaps;
  - `substituteSwapAttdollCells`: 320 sides, framed row `[105, 169, 184, -10]`.
- **Reverts** (each fails pins):
  - GrassWhistle per-side constants: 3;
  - drop shadow `320`: 3;
  - Iron Tail `data10 >= 28`: 3;
  - cell `[320, player]`: 6;
  - Recover framing shift 0: 5;
  - self-target set without 105: 5 + 2.

## Gates (final code)

Tested code `e52054bd4` (production `375660655`, src tree `26b82677`); the docs / receipt commit changes no code.

- **Targeted**: 235 files, 4,070 tests passed. The brief's grep (Recover / GrassWhistle / Focus Punch / Iron Tail / substitute / doll) plus `factoryAnimationInventory`, `playableAnimationIntegration`, `liveShadowRows`, `elevatedRendererPostBody`, `ctl95DollFreeControls`.
- `npm run typecheck`: exit 0.
- `npm run test:smoke`: 448 / 448.
- **Full suite**, two foreground shards (no census running): 811 files, 6,955 passed / 119 skipped; and 811 files, 6,373 passed / 104 skipped. 0 failed.
- `npm run build`: exit 0.
- `compare:differential fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base fed91f2de`: **PASS, 624 / 624 captures byte-identical**.
- `git diff --check`: clean.
- **Runner** `ctl95Run.sh`, run twice into fresh dirs on src `26b82677`, each time: same scenarios, 30 scenarios r1 == r2.
  - Run 1 (`e52054bd4`) produced `receipts/summary.tsv`.
  - Run 2 (`5bdeba375`, after the receipts were committed) printed **same summary.tsv**.

## Reproduce

```sh
sh tools/integration/ctl95Run.sh .integration/validation/<fresh>            # probes x2, RAM personalities, checks, summary.tsv (cmp receipt)
sh tools/integration/ctl95Run.sh .integration/validation/<fresh> --census   # + base / final censuses + land82CensusCheck + prep43CensusDelta
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 587 40 105:opponent
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 497 40 320:opponent
```

Receipts:
- `tools/integration/fixtures/ctl95-live-receipt.json`;
- `tools/integration/fixtures/ctl95/receipts/`: summary, census, parity, predictions.

Scenarios: `tools/integration/fixtures/ctl95/scenarios/` (`ctl95Scenarios.py`, the doll90 lab format, lab seed 305419897).
