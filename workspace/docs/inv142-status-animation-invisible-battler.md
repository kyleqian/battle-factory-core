# inv142 (S10A, ISSUES #168 follow-up): a Scene ON status animation whose battler's sprite is INVISIBLE

Base: FIXED `6d4417811` (production src `81aae6038`). **New files only**: no tracked file is modified; the production change is banked as
`tools/integration/fixtures/inv142/inv142-invisible.diff` and proved on git-archive copies only. **Pixels only**: no command, frame, kernel,
RNG, damage, turn-order or facility change (census identical, below).

The open case (sae135 §6): sar131's guard in `battleScene.ts statusAnimationRenderView` returns null — draws nothing — while the battler's
sprite is invisible. The kernel already skips the receipt while the battler is semi-invulnerable (`Cmd_statusanimation` /
`Cmd_status2animation`, battle_script_commands.c:5753+), so the open case is a receipt whose battler has STATUS3 cleared but whose sprite is
still hidden by the charge turn.

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| **Exposure** (census 0..999, Scene ON, base; `inv142Exposure.ts` = sa125LiveShareCensus.ts's battles and driver, `--index-from` shards) | **5 / 8,063** status-animation commands have an invisible battler sprite. INFATUATION opponent 2, INFATUATION player 1 (path CANCELER_IN_LOVE immobilized: `BattleScript_MoveUsedIsInLove`), SLP player 2 (ENDTURN_YAWN: `BattleScript_YawnMakesAsleep`). The cause in all 5: production's semi-invulnerable live-body hide (`applyLiveSemiInvulnerableCommand`) from the battler's own **Dig** charge body. 0 hidden by a `sprite-visibility` receipt, 0 dolls. With visibility forced on, all 5 would draw (a renderer case exists). Battles 18, 208 (x2), 357, 760 | `fixtures/inv142/exposure.json` |
| **Source rule** (why only these paths) | `CancelMultiTurnMoves` clears STATUS3_SEMI_INVULNERABLE (battle_util.c:877). It runs **before** the status animation only on CANCELER_IN_LOVE's *immobilized* branch (battle_util.c:2205-2215) and in ENDTURN_YAWN (:1761). CANCELER_PARALYZED's call is commented out ("removed in FRLG and Emerald", :2190), and `BattleScript_MoveUsedIsConfused` plays `status2animation` *before* `cancelmultiturnmoves`. So PRZ / CONFUSION receipts on a charging battler are skipped by the ROM itself, which matches the census (0 PRZ / CONFUSION). A love check that *passes* on the Dig strike turn also skips its receipt (seen in the seed search) | reference/pokeemerald |
| **ROM truth** (direct mGBA, `gaf140Probe.py` dense dumps, Scene ON, 4 lab scenarios with explicit seeds: Dig charge, then the in-love check immobilizes / Yawn sleeps the digger, **both sides**) | **r1 == r2 4 / 4** (probe sha256 committed); 5 invisible windows (love-opp has two). In every window **the script runs**: gAnimScriptActive for **96 rows** (gate 0), the script's sprites are created (gSprites in use 9 -> 12 for the 3 hearts, 9 -> 11 for the 2 letter Zs), and the screen changes by up to 698 / 498 px (hearts) and 293 / 259 px (Z). The battler's gSprites `invisible` bit is **1 on every active row (96 / 96)**, with x2 0. No ShakeMon2 is involved: INFATUATION and SLP have none, and PRZ / CONFUSION never get here (row above). The battler becomes **visible again** at `moveend` (MOVEEND_ATTACKER_VISIBLE after "is immobilized by love!", +103 / +107 rows after the script ends) or at `makevisible` (Yawn's script end, +92 / +96) | `fixtures/inv142/rom-r1.json`, `probe-sha256.json` |
| **ROM rule** | Over an invisible battler the status animation is **drawn**: the script's sprites at the battler's coordinates, while **the battler itself stays hidden** | the row above |
| **Production today** (`inv142Compare.ts`: gaf140's transplant comparator through `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`; the battler hidden by a `sprite-visibility` command before; full screen, rows statusanimation − 1 .. release + 2) | **0 / 5 windows clean**: love-opp 28,627 + 28,627 px, love-ply 47,807 px, yawn-opp 13,098 px, yawn-ply 13,614 px. Production draws nothing on any command row | `fixtures/inv142/production-today.json` |
| **Banked patch** `inv142-invisible.diff` (battleScene.ts: drop `!view.visibility[side].sprite` from the null guard, plus a doc comment; `view.visibility` unchanged, so the battler stays undrawn) | **5 / 5 windows 0 px on every row** (500 rows). The battler is hidden on 97 / 97 command rows in every window, and the sprites are drawn on 92 – 96 command rows | `fixtures/inv142/production-patched.json` |
| **Controls (must fail; patched copy)** | `age+1`: **0 / 5** (11,472 – 13,407 px). `wrong-side`: **0 / 5** (26,578 – 57,234 px). A "battler drawn visible" control cannot fail under the transplant, because the reference draws the battler too. The keep-hidden evidence is the ROM's invisible bit on every active row plus `battlerHiddenRows` | `fixtures/inv142/controls.json` |
| **App route** (`sar131RouteRender.ts` 18:0:on, base vs patched copy, `inv142RouteDelta.py`) | **OK**: same timeline (6,660 frames, per-frame key / type / age). 92 differing frames, all inside the one INFATUATION command over the Dig-hidden PUPITAR (ages 5..96 = the hearts). The route's other 8 status animations are unchanged | `fixtures/inv142/routes-delta.json` |
| **Census 0..999 on the patched copy** (sa125LiveShareCensus.ts, 10 + 10 shards, `sar131CensusDelta.py`) | **Identical**: 27,402 move records; **0 key / frame / liveFrames / decline / battle / segment / status changes**; all four shard digests are the same on 10 / 10 shards; 15,926,929 battle frames and 8,063 status-animation commands in both | `fixtures/inv142/census-delta.json` |

## 2. Landing recipe (for a production-lane step)

1. `git apply tools/integration/fixtures/inv142/inv142-invisible.diff` (one guard line + the doc comment in `src/engine/battleScene.ts`).
2. `tests/inv142StatusAnimationInvisible.test.ts`: flip the two "today" tests. `statusAnimationRenderView` over the hidden battler must
   return sprites while `view.visibility[side].sprite` stays false. The per-row frame sha256 must equal `production-patched.json`'s
   `productionFrameSha` (no longer `production-today.json`). Drop the "diff still applies" test. **Revert experiment** (run here in a
   patched copy): 3 / 6 fail (the two today tests + diff-applies), and the 3 receipt-only tests pass.
3. No pin should move: the census is identical (pixels only). `compare:differential` is expected byte-identical because no canonical
   capture has a Dig-hidden status animation. Run it anyway, together with the production gates (smoke, full suite, build).
4. Re-run `sh tools/integration/inv142Run.sh <fresh-out> --census` after landing. Expected: `production-today.json` becomes DIFF (it is
   the pre-fix receipt), and the patched copy's `patch -p1` fails because the change is already applied. Retarget the runner's "today"
   leg to `production-patched.json` and drop the patch step in the landing commit.

**Landed (inl144, branch worker/integration-20261013-094050):** the diff is applied in `src/engine/battleScene.ts` (the diff paths are workspace-relative: `git apply --directory=workspace`). `tests/inv142StatusAnimationInvisible.test.ts` now has 5 tests (the two "today" tests flipped to the patched truth; the diff-applies test dropped; revert experiment: the 2 flipped tests fail, the 3 receipt tests pass). `inv142Run.sh` now compares this tree to `production-patched.json` and reverse-applies the diff into a pre-fix `base` copy (for `production-today.json`, the route delta and the census base). `sh tools/integration/inv142Run.sh <out> --census`: ALL SAME, including census-delta (pixels only).

## 3. Files (all new)

- `tools/integration/inv142Exposure.ts`, `inv142ExposureSummary.py`: the exposure census and its table.
- `tools/integration/inv142Stage.py`, `fixtures/inv142/scenarios/` (4 scenarios + index). Digger: male SANDSLASH, 4 x Dig. Love: a female
  PIDGEOT (Attract x4, faster; Dig cannot hit it, so nobody faints); seeds love-ply 305419899, love-opp 305419898 (the first seeds giving
  "pass, then immobilized"). Yawn: SLOWBRO (Yawn x4, slower); seed 305419897. Parties of three, EV totals <= 510.
- `tools/integration/inv142Probes.sh` (gaf140Probe.py x {r1 dump, r2}), `inv142Rom.py` (windows, invisible bit, sprites, visibility
  return), `inv142NpzToRaw.py`, `inv142Compare.ts` (+ `--neg=age+1|wrong-side`), `inv142RouteDelta.py`, `inv142Receipt.py`,
  `inv142Run.sh`.
- `fixtures/inv142/`: `exposure.json`, `probe-sha256.json`, `rom-r1.json`, `production-today.json`, `production-patched.json`,
  `controls.json`, `routes-delta.json`, `census-delta.json`, `receipt.json`, `inv142-invisible.diff`.
- `tests/inv142StatusAnimationInvisible.test.ts` (6 tests).

## 4. Gates (code commit `4dbc67b8e`; production src unchanged `81aae6038`)

- `npm test -- tests/inv142StatusAnimationInvisible.test.ts`: **6 / 6**. `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
  `git diff --check 6d4417811 HEAD`: clean. `git status`: no modified tracked file.
- `sh tools/integration/inv142Run.sh <out>` from a **fresh git-archive copy of `4dbc67b8e`** (4 m 09 s): **ALL SAME**. That covers
  scenarios 5 / 5, exposure, probes r1 == r2 4 / 4, probe-sha256, rom-r1, rom r2 == r1, production-today, production-patched, controls,
  routes-delta and the receipt. The census leg (`--census`) was run directly with the runner's same commands (section 1). The fresh-copy
  run used the default mode without `--census`.

## 5. Open (not in scope)

- Fly / Bounce / Dive charge turns: the census has none (only Dig). The source rule is the same (`CancelMultiTurnMoves` clears every
  STATUS3_SEMI_INVULNERABLE bit), and the patch is not move-specific. No ROM window was taken for them.
- The ROM's return to visible (moveend / makevisible) follows production's existing `sprite-visibility` handling. inv142 did not
  re-verify its exact row.

## 6. Rerun

    sh tools/integration/inv142Run.sh <fresh-out-dir> [--census]       # from workspace/ (or a fresh git-archive copy inside the repo)
    node --experimental-strip-types --no-warnings tools/integration/inv142Exposure.ts --seeds=0..99 --index-from=0 --out=e0.json
    node --experimental-strip-types --no-warnings tools/integration/inv142Compare.ts <rom-r1.json> <raw-dir> <out.json> [--neg=age+1|wrong-side]
    npm test -- tests/inv142StatusAnimationInvisible.test.ts
