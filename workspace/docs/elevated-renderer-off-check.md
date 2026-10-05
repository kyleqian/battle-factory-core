# Elevated-opponent resolution renderer: is Scene OFF also wrong? (S10A side lane, 2026-10-05; evidence only, no production change)

## 1. Results first

**Verdict: FIX-BOTH.** The Scene OFF ROM draws an elevated opponent (GOLBAT, BUTTERFREE) elevated **with its 32×8 shadow in every
ordinary resolution frame**; production's `renderBattleResolutionSceneOffView` (`src/engine/battleScene.ts:54320`) draws it at ground level with no
shadow in **every one of those frames**. The renderer is shared (it is the Scene OFF renderer), so the 2-line patch (`origin.y - enemyMonElevation(...)`
+ `drawGeneratedOpponentShadow`) is correct for OFF as well as ON. **No committed compare trace and no Tier-1 test changes under the patch**, so the fix
cannot regress an accepted OFF artefact (it improves none either: no accepted trace renders an elevated opponent through this function).

The "Existing Scene OFF renderers already subtract this elevation at scanout" comment is true only of the *other* OFF paths: command menu
(`battleScene.ts:8107-8121`, `battleCommandFieldSpriteOrigin`), battle-start/send-in (`:5260`, `:5651-5665`) and the mid-battle-switch materialise (`:54178`, `:54216`).
The ordinary resolution field (`:54427-54433`) is the one OFF path that applies neither elevation nor shadow.

### 1a. ROM vs production, Scene OFF, opponent-sprite window (x136-215 y0-72), 935 consecutive direct-mGBA frames per scenario

Scenarios: `tools/integration/elevatedOffStage.py` (base `mechanic-air-cutter-opponent-golbat-player-chansey`, profile forced to `battle-scene-off`, opponent
lead species swapped; frames 0-934 of the replay cover entry, command menu, both attacks' message rows, HP drain, hit blinks). Production = the same displayed field
with no live effect through `renderBattleResolutionSceneOffView`. Two fresh runs per scenario, identical RGB sha256 (`fixtures/elevated-off/rom-digests.txt`).

| Opponent (elevation) | ROM frames with elevated shadow | Production exact | Production residual (every frame) | Patched exact | Patched misses |
|---|---|---|---|---|---|
| GOLBAT (8) | 919 / 935 | **0 / 935** | **1,845 px** | 919 / 935 | 16 = the 4×4-frame hit blink (frames 400-403, 408-411, 416-419, 424-427: sprite+shadow invisible) |
| BUTTERFREE (8) | 919 / 935 | **0 / 935** | **1,578 px** | 919 / 935 | 16 = hit blink (107-110, 115-118, 123-126, 131-134) |
| ONIX control (0) | 0 / 935 | 919 / 935 | 0 | 919 / 935 | same 16 blink frames (both renderers) |

Same numbers as the Scene ON audit (`docs/elevated-postbody-audit.md`: GOLBAT 1,845, BUTTERFREE 1,578): the defect is species-keyed and profile-independent. The
non-blink frames include the intro-to-command idle, the "Foe X used …" / damage message rows and the HP-bar drain frames; the ROM keeps the sprite 8 px up and the shadow
drawn throughout. Receipts: `fixtures/elevated-off/{golbat,butterfree,onix-control}-rows.json` (per-frame residuals).

### 1b. Committed Scene OFF traces and tests

* **App-frame sweep** (`elevatedOffSweep.sh`): all 203 `tools/compare/traces/*.json` (31 BattleLab + generated/canonical routes; includes every `-off` trace) rendered on the
  app route clean and with the patch applied in place (per-frame sha1). **0 traces, 0 frames change** (`fixtures/elevated-off/app-frames-changed-by-patch.json` = `{}`).
* **Compare before/after** (OFF oracle, `npm run compare -- <trace> --summary`): the only committed OFF trace with an elevated opponent lead is
  `factory-arbitrary-intro-magneton-off` (MAGNETON, 8) — **703/751 before, 703/751 after the patch** (its 48 misses are text-box rows y74-110, battle-start path, unrelated).
  Others have non-elevated leads (battle-command-generated ARON, Noland TANGELA/SKARMORY, win-terminal ONIX, loss-terminal DUSCLOPS) or are walk-up/speech traces with no resolution field; since app
  frames are byte-identical for all 203 traces, every trace's match count is unchanged by construction.
* **Tier-1**: `npm test` with the patch applied in place: **1521 files / 12,293 tests passed, 44 files / 223 skipped — identical to baseline** (`fixtures/elevated-off/npm-test-with-patch.txt`). No test pins the buggy ground-level draw.
* The patch exports a `patchProof` helper only for the harness; the real fix does not need it.

### 1c. Consequence for the fix
Apply to the shared renderer (both profiles): sprite `origin.y - enemyMonElevation(speciesSymbol)` and `drawGeneratedOpponentShadow` before the sprite while the opponent sprite is visible
(`:54427-54433`; the faint-sink branch `:54418-54426` also needs elevation — unmeasured). Hide the shadow on hit-blink invisible frames (the 16 patched misses above), per ROM
`SpriteCB_EnemyShadow`. Add a Tier-1 test (opponent GOLBAT, `effect: null` → sprite y = origin − 8, shadow mask present; ONIX 0-diff) and gate with the OFF scenarios here.

## 2. Reproduction (workspace root)
```
sh tools/integration/elevatedPostbodyPatch.sh             # untracked patched copy (needed for the "patched" columns); rm src/engine/battleScene.patched.ts afterwards
sh tools/integration/elevatedOffRun.sh                    # stage + 2 fresh mGBA runs x3 scenarios + compare -> /tmp/eo/*-cmp.json
sh tools/integration/elevatedOffSweep.sh /tmp/eo/base     # clean tree; then apply the patch in place, sweep to /tmp/eo/patched, git checkout src/engine/battleScene.ts
node tools/integration/elevatedOffDiff.mjs /tmp/eo/base /tmp/eo/patched
npm run compare -- tools/compare/traces/factory-arbitrary-intro-magneton-off.json --summary
```
Oracle: direct mGBA (`tools/run-mgba-probe.py`, `tools/probe/run-battle-lab-rgb.py`) for the ROM frames; the shared OFF service only for the one `npm run compare`.

## 3. Limits
* Production side is the ordinary displayed field (no live effect), as in the Scene ON audit; the real OFF queue's per-frame hand-off was not traced, but any ordinary frame uses this drawing.
* The window excludes healthboxes/text/player; BUTTERFREE scenario's player is CHANSEY while its fixture view uses ONIX (outside the window).
* Species list for the traces comes from BattleLab scenario `overrides.parties.opponent[0]` plus trace names; generated/canonical traces' opponents were not enumerated individually — the frame-hash sweep is the authoritative check.
