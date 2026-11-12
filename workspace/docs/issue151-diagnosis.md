# ISSUES #151 diagnosis (S10A side lane, 2026-10-07): Sheer Cold tail ages 173-189, Hyper Voice age 59

Rows and fixtures: `docs/live-species-audit-7.md`, `tools/integration/fixtures/species-audit-7/{derived,residuals.tsv}`.
Evidence: `tools/integration/fixtures/issue151/` (counters, shift/tear tables, two env-driven patches, `patch-receipts/`).
Every run below is an independent direct-mGBA process (no shared oracle), each relied-on result **twice fresh with identical digests**;
src patches were applied by `issue151Patch.sh` and reverted (git status clean at every commit).

## 1. Results first

| Class | Verdict | Evidence | Fix shape / decline rule |
|---|---|---|---|
| **Sheer Cold 329 tail, ages 172/173-188/189** (tyranitar target, tyranitarA / pichuA / flygonA / golbatA opponent attacker, pichuA player attacker; **also onixA opponent attacker**, hidden under its idle-x2 baseline) | **LAG FRAME** (emulated CPU timing; not species data) | Counters: lag frames at ages 151, 152 in every row; the **age-171 lag** is present / absent per pair, and the residual rows are exactly the rows whose age-171 lag differs from their orientation's accepted pair (opponent attacker: accepted DEWGONG/CHANSEY has no lag, residual rows have it; player attacker: accepted has it, residual rows lack it). Shift: live(age) == ROM(start+age+1) (lag rows) / ROM(start+age-1) (no-lag rows) at **0 px on every tail age**, offset 0 = 16,605-18,610 px. Patch: restore-fade end from the measured lag (189 lag / 188 none) -> **every tail row 0 px**, accepted fixtures 0 px | The adapter already encodes the accepted pairs' lag schedule as a target-side default: `restoreEndAge` = `input.restoreFadeEndAge ?? (targetSide === "opponent" ? 189 : 188)` (`src/animation/sheerCold.ts:195-197`, the optional input at `:74` is never set). No species property predicts the lag (table 2), so production cannot derive it. **Decline rule** (if exactness is required): claim the tail exact only for the measured pairs in table 2 whose lag matches the side default; otherwise the DEFERRED D4 choice (fallback vs a faithful-timing claim: the tail is then a one-BLDY-step brightness offset for 16-17 frames) |
| **Hyper Voice 304, age 59** (FLYGON / GOLBAT player-side attacker 229 px; PICHU / RATTATA attacker either side 3,818 / 3,840 px) | **Not a lag frame** (0 lag frames in all 32 rows). **CPU-timing scanline phase (mid-frame palette upload); not derivable** -> UNRESOLVED as a production rule, mechanism patch-proven | The ROM uploads the second effect call's yellow BG blend partway into the age-59 frame; the scanlines above that point keep the age-58 (white) hardware palette. The adapter hard-codes that band as **16 scanlines** (`src/animation/hyperVoice.ts:491-496`, `scanout.upperRows ... ? 16 : 0`), measured on EXPLOUD/LOUDRED. ROM band depth: **16** for EXPLOUD, LOUDRED, STEELIX, WAILORD attackers (both sides), FLYGON / GOLBAT opponent-side attackers and every target swap; **15** for FLYGON / GOLBAT player-side attackers (residual = scanline 15 only, `f7f77b<-eff7f7`); **0** for PICHU / RATTATA attackers (residual = scanlines 0-15, ROM yellow `ffff7b` vs live white `ffffff`; ROM(59) band = live(60) colour). Shift test: offsets +-1 are worse (6-15k px), so it is not a whole-frame shift. Patch: band depth = measured ROM depth -> **6/6 rows 0 px**, 8 accepted fixtures 0 px | Depth is set by how far the main loop has run when the blend lands (cycle cost of the frame), so presentation inputs do not give it. Hypothesis (not tested): the attacker's cry (PICHU / RATTATA cries are short; side changes pan) changes the m4a mixing cost of that frame. **Decline rule:** the age-59 row is exact only when the ROM depth is 16 (measured set above); PICHU / RATTATA (depth 0) and player-side FLYGON / GOLBAT (15) differ in that one row only. Fix shape if a timing claim is accepted: an input `hyperVoiceUpperRows` (default 16) fed per pair, not a species rule |

Ruled out for both classes: geometry, palette content and BG art (every other row of these fixtures is 0 px; the patched rows are 0 px with only a timing value changed).

## 2. Sheer Cold: per-row state

On screen (tail rows): full-width field (bbox x0-239 y0-111, chrome 0 px), the battle background under the hardware brightness fade-in after
`restorebg`; the ROM is one BLDY step darker (lag rows: `1f1e1f<-2f2e2f`, `201f1f<-302f2f`, `181713<-24231d`, `1c1c1c<-2a2b2b`) or one step
brighter (no-lag rows: the same pairs reversed). Battlers, cube and monbg are not in the residual; the px count per row is the BG area not
covered by the two battlers (PICHU 18,610 > GOLBAT 17,786 > FLYGON 17,212 > TYRANITAR 16,605), which is why the magnitude looks species-sized.

Table 2: age-171 lag (main-loop pass counter did not advance) per measured pair (`sheer-cold-counters.txt`, 31 rows, all identical twice):

| Orientation | No age-171 lag | Age-171 lag |
|---|---|---|
| Opponent attacker (adapter default: no lag) | DEWGONG / CHANSEY (accepted), CLOYSTER / GOLEM, DEWGONG / SNORLAX, STEELIX, WAILORD, RATTATA, shiny STEELIX attackers; RATTATA, STEELIX, WAILORD, shiny STEELIX targets | **TYRANITAR, PICHU, FLYGON, GOLBAT, ONIX attackers (residual)** |
| Player attacker (adapter default: lag) | **PICHU attacker, TYRANITAR target (residual)** | DEWGONG / CHANSEY (accepted), CLOYSTER / GOLEM, DEWGONG / SNORLAX, GOLBAT, TYRANITAR attackers; FLYGON, GOLBAT, ONIX, PICHU, RATTATA, STEELIX, WAILORD, shiny STEELIX targets |

No species property fits: the same species flips with role / side (PICHU attacker adds the lag on the opponent side and removes it on the
player side; TYRANITAR adds it as an opponent attacker, keeps it as a player attacker, removes it as an opponent target), elevation does not
fit (ONIX / PICHU / TYRANITAR are not elevated), size does not fit (STEELIX / WAILORD vs TYRANITAR; RATTATA vs PICHU).
In the adapter's model the age-171 frame falls in the `restorebg` reload (`Task_FadeToBg` data[10] = 2, `sheerCold.ts:284`; not probed at
instruction level here); whether that frame overruns depends on its cycle cost, not on a presentation input.

Correction to audit 7: `onixA-sheer-cold-opponent-*` (481,962 px) = 1,091 px/row idle x2 (207,290) **plus** this lag tail; with the lag
schedule patched it is 207,290 = 190 x 1,091. `flygonA` / `golbatA` keep 200 px (the age-0 shadow, sibling's class).

## 3. Reproduce (workspace root; direct mGBA only; ~1.5 min each step at 12 parallel)
```sh
export PYTHONPATH=../../vendor/libmgba-py; D=tools/integration/fixtures/species-audit-7/derived; F=tools/integration/fixtures/issue151
tools/integration/issue151Counters.sh /tmp/i151/sc 12 tools/integration/fixtures/sheer-cold-live/sheer-cold-*.json $D/*sheer-cold*.json      # lag ages, 2 fresh runs
tools/integration/issue151Counters.sh /tmp/i151/hv 12 tools/integration/fixtures/q2-live/hyper-voice-*.json $D/*hyper-voice*.json
tools/integration/issue151Shift.sh /tmp/i151/sh "170 171 172 173 174 180 188 189 190" $D/pichuA-sheer-cold-player-dewgong-opponent-chansey.json
DIFFAGE=59 TEAR="58 59 60" tools/integration/issue151Shift.sh /tmp/i151/tear "57 58 59 60 61" $D/pichuA-hyper-voice-player-exploud-opponent-slowking.json
tools/integration/issue151Patch.sh $F/sheer-cold-restore-end-env.diff /tmp/i151/p1 I151_SC_RESTORE_END=189:$D/pichuA-sheer-cold-opponent-dewgong-player-chansey.json \
  I151_SC_RESTORE_END=188:$D/tyranitar-sheer-cold-player-dewgong-opponent-chansey.json -:tools/integration/fixtures/sheer-cold-live/sheer-cold-opponent-dewgong-player-chansey.json
tools/integration/issue151Patch.sh $F/hyper-voice-upper-rows-env.diff /tmp/i151/p2 I151_HV_UPPER=0:$D/rattataA-hyper-voice-opponent-exploud-player-slowking.json \
  I151_HV_UPPER=15:$D/golbatA-hyper-voice-player-exploud-opponent-slowking.json -:tools/integration/fixtures/q2-live/hyper-voice-player-exploud-opponent-slowking.json
```
`issue151Patch.sh` always reverts its patch (trap). The full job lists are in the receipt headers / `patch-receipts/`.
