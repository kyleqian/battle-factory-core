# Live adapter species audit 2 (S10A side lane, 2026-10-05): GOLBAT-class residual attribution

Follow-up to `docs/live-species-audit.md` (§3.1 tail fade, §3.3 GOLBAT-only residuals). Same method: swapped scenario, window and
healthbox HP derived from the swapped scenario's own ROM state, production live view vs fresh direct-mGBA frames, **2 fresh runs with
identical digests for every row** (`identical true`). Retained evidence (compact, no RGB / mGBA logs): `tools/integration/fixtures/species-audit-2/`.

## 1. Results first

### Defect table (3 new SPECIES-DEFECTs, all proven 0 px by a reverted in-place patch, 2 identical fresh runs; patches in `fixtures/species-audit-2/patches/`)

| Move (id) | Side / species | px (before -> after patch) | Mechanism | File:line (production) | Residual colours (ROM<-live) | Fix shape | Test to add |
|---|---|---|---|---|---|---|---|
| **Smelling Salt (265)** | player attacker, opponent GOLBAT (any target whose `pic.y - height/2 < 8`) | 3,358 -> **0** (98/121 -> **121/121**) | The `!!` exclamation OBJ is placed by `AnimSmellingSaltExclamation` (`battle_anim_effects_3.c:4355-4376`): `sprite->y = ATTR_TOP; if (sprite->y < 8) sprite->y = 8;`. The live draw uses the unclamped `targetTop`. GOLBAT: pic y 35, height 64 -> top 3 -> ROM sprite y = **8** (ROM RAM: slot 3 `AnimSmellingSaltExclamation_Step` x176 y8, OAM `f800`), live draws it 5 px higher | `src/engine/battleScene.ts:42107` (`profile.targetTop - 16`) | bbox x160-191,y0-23, 146 px/age, ages 74-112: `ff6b94<-ffffff`, `ff6b94<-f7f7ff`, `e7efef<-ff6b94` ... (sparkle pixels, 5 px vertical offset) | Clamp: `Math.max(8, profile.targetTop) - 16` (or clamp `targetTop` where the profile is built, `liveMoveAnimation.ts:1145-1155`; the attacker branch of the ROM clamps the same way) | unit: target top 3 -> y 8, top 40 -> 40 (ONIX unchanged); live fixture `species-audit/derived-golbat/prep4-smelling-salt-player.json` 98/121 -> 121/121 |
| **Light Screen (113)**, **Future Sight (248)** | player attacker, elevated opponent (GOLBAT) | 400 -> **0** each (86/88 -> 88/88, 112/114 -> 114/114) | `SpriteCB_EnemyShadow` (`battle_gfx_sfx_util.c:1203`) hides the 32x8 shadow while `gAnimScriptActive`; when the script ends the shadow is shown again (one frame of display lag later). The accepted windows of these two moves extend **2 frames past the script end**, so the ROM shows the shadow on the last 2 rows; the #142 hook only draws it on the activation row (`LIVE_MOVE_OPPONENT_SHADOW_ROW`, `liveMoveAnimation.ts:176-222`, armed at `battleScene.ts:54916-54919`). ROM RAM: player controller command changes 15->16 at the frame after the last row (Future Sight frame 191), opponent sprite stays visible | `src/engine/liveMoveAnimation.ts:176-236` (no end-of-body shadow row), `src/engine/battleScene.ts:54917` | bbox x160-191,y65-72 (32x8, 200 px/age; 400 = 2 ages): `526b63<-bdbd9c` (shadow vs background) | Add a second table `LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS` (move id -> rows before the end, 2 for 113 and 248) next to `LIVE_MOVE_OPPONENT_SHADOW_ROW`, arm `liveOpponentShadow.species` when `effect.age >= duration - n`. Proven with `age >= liveMoveAnimationDuration(request) - 2` for ids {113,248}. Other moves are unaffected only because their accepted windows end at/before the script end: **any adapter whose window ends after the script end needs its own entry** (audit each against the elevated target) | unit pin in `tests/liveShadowRows.test.ts` style: shadow drawn at last two ages for {113,248} with an elevated opponent, not for ONIX; live fixtures `species-audit/derived-golbat/{light-screen-live-slowpoke-player,prep2-future-sight-player}.json` |
| **Rock Throw (88)** | player attacker, opponent GOLBAT/GOLEM/SHUCKLE (any non-ONIX opponent) | 17,405 -> **0** (66/87 -> **87/87**) | `rockThrowTargetX2` returns the ONIX front-idle residual **+1** for ages < `targetX2OffAge` (21) for every opponent target; the ROM holds the species' own x2 (0 for GOLBAT). Live draws the target 1 px right (shift fit: live moved (-1,0) matches ROM, 837 -> 85 px, remainder is the falling rocks) | `src/animation/rockThrow.ts:88` (`targetX2OffAge: 21`) and `:346-351` (`rockThrowTargetX2`) | bbox x147-205,y6-63, 837 px/age ages 0-20: `000000<-7b73ce`, `7b73ce<-31318c`, `ad4a94<-6b0852` (target outline moved 1 px) | same input as Aerial Ace (D2) / Leaf Blade (D3): pass `liveBattlerAnchors("opponent",art).frontIdleRest.x2` into the profile and return `age < targetX2OffAge ? idleX2 : 0`. Proven with `targetX2OffAge: 0` | unit: `rockThrowTargetX2(age, profile{idleX2:0})` = 0 at age 0; live fixture `species-audit/derived-golbat2/order-consumer-rock-throw-player.json` 66/87 -> 87/87; the ONIX accepted fixture stays exact |

These join the three of audit 1 (Dragon Rage, Aerial Ace, Leaf Blade). **Aerial Ace D2, Leaf Blade D3 and Rock Throw share one missing input**
(`frontIdleRest.x2` of the opponent target): one plumbing change fixes all three. Check Quick Attack, Mud Slap / Sand Attack order consumers etc. for
the same `+1` literal (`grep -n "idle residual\|x2 = 1" src/animation`) before closing.

### Non-defects / unresolved / limits

| Row | px | Verdict |
|---|---|---|
| Psybeam GOLBAT/SHUCKLE, Amnesia & Cosmic Power GOLEM, Cosmic Power GOLBAT, Amnesia/Horn Drill player-GOLEM (+ new: Aurora Beam GOLBAT 292,240, Sky Uppercut/Hitmonchan GOLBAT 293,616) | ~17.8k px x 16 rows at the tail | **LAG FRAME (emulator main-loop overrun), species-keyed; not reproducible from game state, not a defect.** Counter evidence §3 |
| Aromatherapy GOLBAT age 364 | 1,676 | **ARTIFACT (same cause, intra-frame palette write at scanline 7).** §2.5 |
| Foresight GOLBAT (new, 2 rows: 22,875 px, 66/167) | 190-310 px/age ages 12-112 | **UNRESOLVED** (glass OBJ position/shape; not a rigid shift; §2.7) |
| Aerial Ace player-GOLEM / opponent attacker | 51 (ages 10-11) | **UNRESOLVED** (attacker tail edge 1 px; the 24-px/age residual of the old receipt was the stale gender override, §2.8) |
| Spider Web alt-Ariados GOLBAT | 14 (1 px every 3rd age) | **UNRESOLVED** (single pixel at (92,97)), harmless |
| Razor Wind b1 x2, Dream Eater x2 | - | harness `Sprite order unknown` (reordered turn), not production |
| Magnitude (BODY-MISSING), 34 of 62 candidates | - | not staged (no explicit ONIX party[0] / `precedingTurns` / probe window), see §4 |

## 2. Per-row verdicts

All numbers from `fixtures/species-audit-2/dense/**` (per-fixture receipts with both digests), `pixels/*.txt` (bbox + colour pairs per age),
`patches/*.diff`. Commands in §5.

### 2.1 Light Screen / Future Sight GOLBAT (SPECIES-DEFECT, 400 px each)
Dense twice fresh: `86/88 px 400 identical true`, `112/114 px 400 identical true`. Residual = ages 86-87 / 112-113 only, bbox x160-191 y65-72, 200 px per age,
all `526b63(ROM shadow) <- bdbd9c(live background)`: exactly one 32x8 elevated-enemy shadow. Mechanism: end-of-body shadow return (table row 2).
Patch proof (reverted): 88/88 and 114/114, 2 identical digests each (`dense/patch/light-screen-live-slowpoke-player.json`, `dense/patch2/prep2-future-sight-player.json`). ROM context: Future Sight frame 189-190
(= ages 112-113): opponent sprite visible, `playerControllerCommand` 15 -> 16 at frame 191.

### 2.2 Smelling Salt GOLBAT (SPECIES-DEFECT, 3,358 px)
23 ages (74-112), 146 px each, bbox x160-191 y0-23, pink sparkle pixels. Pixel-matching the OBJ: ROM sprite 5 px lower than live. ROM RAM (dense probe
frame 297-310): slot 3 `AnimSmellingSaltExclamation_Step` x=176 **y=8**, battler slot 8 y=35, matching `if (sprite->y < 8) sprite->y = 8`. Patch proof:
`Math.max(8, profile.targetTop) - 16` -> **121/121, 0 px**, 2 identical digests (`dense/patch/prep4-smelling-salt-player.json`; diff `patches/smelling-salt-exclamation-clamp.diff`).

### 2.3 Rock Throw GOLBAT (SPECIES-DEFECT, new in the widened set)
See table. Patch proof: `87/87 px 0`, 2 identical digests (`dense/patch3/`).

### 2.4 Tail fade (task 2): LAG, not logic — see §3.

### 2.5 Aromatherapy GOLBAT age 364 (ARTIFACT, 1,676 px)
Pixels (`pixels/aromatherapy-golbat.txt`): age 364 only, bbox x0-239 y0-6 (7 scanlines): ROM `dee7e7/ffffff/e7e7ef` (old palette) vs live `94ef94/9cff9c/94ef94`
(new green). ROM frame 587 rows 0-6 still show the pre-fade BG; green begins at row 7. Instrumenting the CPU through that emulated frame
(`speciesAudit2LineProbe.py`, 16-instruction sampling, palette hash + REG_VCOUNT + ROM-function ring): the palette is changed by
`UpdateNormalPaletteFade -> BlendPalette -> UpdateNormalPaletteFade -> UpdatePaletteFade -> BeginNormalPaletteFade -> CpuSet` in the **main loop**, reached at
instruction **44,160 / REG_VCOUNT 7** for GOLBAT, versus instruction **39,296 / VCOUNT 227 (inside VBlank)** in the accepted ONIX scenario (frame 439). The same pass
runs ~4.9k instructions longer with GOLBAT (66,328 vs 61,327 instructions in the whole frame), which pushes the palette write past the end of VBlank into the
visible frame. A full-frame live renderer cannot place a mid-frame write. Two identical runs (`lineprobe/line-golbat-587*.json`; `counters/lag-summary.json`).
**Limit:** exact reproduction needs the cycle-accurate CPU time of the main-loop pass (species-dependent sprite work), not game state.

### 2.7 Foresight GOLBAT (UNRESOLVED, new)
`66/167 px 22875`, ages 12-112, 190-310 px/age, bbox around the magnifying glass (e.g. age 60 x134-162 y48-73, age 112 x162-194 y21-49); colours: glass OBJ body
`bdbd9c(bg)<-849cb5(glass)`, handle `a53108<-bd6321`. Not a rigid shift (shift fit best 192 -> 101 px at (+1,0) for age 60, nothing at age 12/112). Live target bounds
are `pic=(176,35)`, `64x64` (printed); bottom `-1` / `rightTop +1` ONIX-fit corrections (`liveMoveAnimation.ts:1305-1307`) are irrelevant (bottom 0: 22,872 px); shifting both bounds by +1 in x improves
66 -> 93/167 (19,985 px) so the glass x anchor is part of it. **Next instrument:** `prep11Probe.py` (sprites per frame) on the swapped scenario to read the glass
OBJ (`AnimForesightMagnifyingGlass_Step`) x/y/OAM per frame and diff against `foresightAtAge`; the dense probe used here carries no sprite dump.

### 2.8 Aerial Ace player-GOLEM (opponent DRAGONAIR attacker), 51 px (UNRESOLVED)
The audit-1 receipt number (1,251 px, 0/50) came from a derived fixture without the `overrides.json` gender override (24 px per age at x64-68,y21-28:
`ff9c94` female glyph). With `opponentGender: female` (`derived-pgolem2/`): **48/50, 51 px**, ages 10-11 only, 26/25 px, bbox x127-138 y74-79: the in-flight
DRAGONAIR's lower tail edge is 1 px different (`ffffff/dedee7 <- d6d6c6`). Hypothesis: the attacker's translation toward the target pic point
(`aerialAce.ts:32-37`, `(+40,-32)` + target y, GOLEM back pic) differs by one pixel of rounding. **Next instrument:** battler x2/y2 series at ages 8-12 from
`prep11Probe.py` (`battlerSeries`) for this scenario vs the reducer.

### 2.9 Spider Web alt-Ariados GOLBAT: 14 px, one pixel (92,97) `cecec6<-6b6b6b` at ages 40,43,...,79 (UNRESOLVED, 1 px).

## 3. Tail fade (task 2): lag frame, evidence

Instrument: `speciesAudit2Counters.py` (direct mGBA, Scene ON): per emulated frame `gMain.vblankCounter1/2`, REG_VCOUNT (always 160 at frame end), `gAnimScriptActive`,
BLDY, and a **main-loop pass counter**: `sPlayTimeCounterState` is set to RUNNING at frame 0 so `PlayTimeCounter_Update()` (called once per `AgbMain` pass, `main.c:165`)
increments `playTimeVBlanks` once per completed pass (no game logic reads it; it only counts). `vblankCounter1 == vblankCounter2` and +1 every frame in all runs.
A **lag frame** is a frame with pass delta 0 (the main loop did not finish before the next VBlank; script/task state does not advance).

Psybeam (original TS reference scenario = ONIX; fade-out ramp BLDY 13..16, hold, back):

| Scenario | BLDY hold-16 frames | Lag frames in the fade | two fresh runs |
|---|---|---|---|
| ONIX (original) | 351-354 (4) | none (lags only at 2,3,99,100 and 467-473) | identical |
| GOLBAT | 358-362 (5) | **360** (pass delta 0) | identical |
| SHUCKLE | (fade at body start 76 + 140) | **216** | identical |
| GOLEM | (reorders, different body) | none in the fade window | identical |

Frame 360 (GOLBAT) executes **136,863** emulated instructions, the equivalent ONIX frame 353 **131,269**: the fade-start/hold frame is a heavy frame (> 130k instructions
of a ~280k-cycle budget with memory waits) and the GOLBAT swap adds ~5.6k instructions (aromatherapy frame: +4.9k, same order), tipping it over the VBlank. So the extra frame is a
**lag frame keyed to the species (CPU load of the swapped pass), deterministic per scenario but not derivable from game state.** The same flips in the other direction: the
**ONIX original has the lag** and the swapped scenario does not for Amnesia (ONIX lag at frame 400 = age 195; GOLEM none: tail residual at ages 197+), Cosmic Power (ONIX 514 = age 220; GOLBAT/GOLEM none: residual at 222+) and Aurora Beam
(ONIX 410 = age 195; GOLBAT none: residual at 197+); the swapped scenario has it for Horn Drill (pGOLEM lag 397 = age ~176 of its 174+ residual) and Sky Uppercut (GOLBAT 397 = age 168, residual 170+).
All 9 tail-fade rows therefore match "a lag frame at the heavy fade frame is present in exactly one of {accepted ONIX, swapped}". Raw per-frame counters: `counters/psy-*-r1.json`,
`counters/aro-*-r1.json`, all lag lists `counters/lag-summary.json`.

**Verdict:** not a defect. Adapters see only game state; reproducing the extra/missing frame needs a main-loop cycle model, which is beyond them. **Record the limit:** a 1-frame tail
shift of the whole-field brightness (BLDY/fade bodies whose heavy frame lands near the VBlank edge) is expected whenever the target species is swapped; accepted windows validated on ONIX are
exact only for ONIX's CPU load. If exactness there ever matters, the options are (a) accept the 16-row tail as known non-exact, (b) have the host re-sync the fade from the
actual ROM frame counter (live play has no ROM) - neither is worth doing for Factory play.

## 4. Widened GOLBAT swap (task 3)

Candidates: all `tools/integration/fixtures/**` fixtures with an ONIX **opponent** target (player attacker) not in the 58-fixture audit-1 set (62). Staged (28; one BODY-MISSING, 27 derived) with `speciesAuditStage.py`
(`--side opponent`, GOLBAT 42, HP 157, speed EV 0, tags `golbat2`/`golbat2b`): 28 staged and derived (the rest skipped by the stager: `precedingTurns`, no explicit ONIX party[0], no field profile or window).
One fresh run to triage, two for every verdict. Results (`dense/golbat2*/summary.txt`):

* **Exact (17):** Destiny Bond x2, Leech Seed x2, Heal Bell (order consumer), Razor Wind b0 x2, Petal Dance x2, Horn Drill, Absorb, Giga Drain x2 (+alt), Mega Drain alt, Sunny Day, Sky Uppercut alt, Spider Web (Spinarak).
* **New defects:** Rock Throw 17,405 (SPECIES-DEFECT above). **New unresolved:** Foresight x2 22,875 (2.7), Spider Web alt 14 px (2.9).
* **New lag-class tails:** Aurora Beam 292,240 (16 rows), Sky Uppercut (Hitmonchan) 293,616 (16 rows): §3.
* **Harness limits:** Razor Wind b1 x2 and Dream Eater x2 `Sprite order unknown`; Magnitude BODY-MISSING.

## 5. Reproduce (workspace root; direct mGBA only)

```sh
export PYTHONPATH=../../vendor/libmgba-py PY=../../vendor/mgba-venv/bin/python
# dense x2 fresh with retained evidence, several fixtures in parallel
tools/integration/speciesAudit2Dense.sh tools/integration/fixtures/species-audit/derived-golbat /tmp/s2/ev /tmp/s2/out light-screen-live-slowpoke-player prep2-future-sight-player prep4-smelling-salt-player prep5-aromatherapy-player
tools/integration/speciesAudit2Dense.sh tools/integration/fixtures/species-audit/derived-golbat2 /tmp/s2/ev2 /tmp/s2/out2 order-consumer-rock-throw-player foresight-player-foresight-player-machoke-opponent-onix
tools/integration/speciesAudit2Colors.sh /tmp/s2/pixels                     # bbox + colour pairs per age
# widened swap
SIDE=opponent tools/integration/speciesAuditRun.sh golbat2 GOLBAT 42 157 0 <list(stem\torig)> /tmp/s2/w && tools/integration/speciesAuditDenseAll.sh tools/integration/fixtures/species-audit/derived-golbat2 /tmp/s2/dense 8
# lag counters / intra-frame locator
$PY tools/integration/speciesAudit2Counters.py tools/battle-lab/species-audit-golbat-anchor4-psybeam-player.json /tmp/o.json
$PY tools/integration/speciesAudit2LineProbe.py tools/battle-lab/species-audit-golbat-prep5-aromatherapy-player.json /tmp/l.json 587
npx vite-node tools/integration/speciesAudit2ShiftFit.ts <fixture> <evidenceRunDir> <firstFrame> x0 y0 x1 y1 <age>...   # rigid-shift fit of the live render
# patch proofs: apply patches/*.diff to a scratch checkout (not committed), rerun the fixture with speciesAuditDense.ts, expect 0 px
```
PAPERCUTS: `cd` into the main checkout path instead of the worktree path is easy (both end in `/workspace`); `date` and an unquoted `xargs -I` with long paths (macOS limit) cost a few minutes.
