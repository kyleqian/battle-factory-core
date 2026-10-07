# Later bodies: Curse (non-Ghost), Will-O-Wisp, Pursuit (normal body) — lb26

Evidence only. New files only; the temporary `firstBody` bypass used for Will-O-Wisp / Pursuit is kept as
`tools/integration/fixtures/later-bodies-lb26/lb26-temp-bypass.patch` (applied for the runs, reverted; `git status` clean).
Direct mGBA, fresh processes. Each fixture: 2 dense passes (separate processes) x 2 renders = 4 renders, all identical; each body
probe run twice from fresh processes (window + frame digest identical for all 36 scenarios). Receipts:
`tools/integration/fixtures/later-bodies-lb26-curse-receipt.json`, `...-oam-receipt.json`.

## Results

### CURSE 174 (non-Ghost stats body), UNPATCHED production — 12/12 fixtures, 0 residual px, 176/176 rows

| attacker | Tackle 33 | Splash 150 | Psychic 94 | Growl 45 + stat unit | Swords Dance 14 + stat unit | Surf 57 (BG scroll) |
|---|---|---|---|---|---|---|
| player | 0 px | 0 px | 0 px | 0 px | 0 px | 0 px |
| opponent | 0 px | 0 px | 0 px | 0 px | 0 px | 0 px |

Six distinct predecessors per orientation (the two stat-unit chains leave different register/sprite histories: unit class 21+idx / 15+idx,
0 px both). Attacker = JUMPLUFF, target = SABLEYE-class lead of the prep16 psychup scenarios. No residual, so no field-level diff was needed.
**Gate recommendation: keep as is** (`spriteOrderInput.known`, any known lend), both sides. Caveats of the measured set:
* Predecessor **Earthquake / Magnitude** could not be staged: the Jumpluff lead is Flying, so no animation body runs (the scenario's Curse then
  becomes the first body; discarded). **Hyper Beam 63**: production has no order plan for it ("Sprite order unknown for CURSE" from the
  fixture harness) so `known` already declines — no extra gate needed, no claim.
* One species pair per side (JUMPLUFF attacker); the breadth already in `curse-live/` (first-body-after-Splash alts) covers species.
  Own earlier Curse body not tested (no production plan expected).

### WILL_O_WISP 261 — `firstBody` bypassed, 12/12 fixtures, 0 residual px (213 rows opponent / 214 rows player)

| attacker | Tackle | Splash | Psychic | Growl + unit | Swords Dance + unit | Surf |
|---|---|---|---|---|---|---|
| player | 0 | 0 | 0 | 0 | 0 | 0 |
| opponent | 0 | 0 | 0 | 0 | 0 | 0 |

**Recommendation: drop `!spriteOrderInput.firstBody` from case 261** (keep `known`, non-shiny, zero idle rests), scoped exact, both sides.

### PURSUIT 228 (normal body) — `firstBody` bypassed, 8/12 exact, 4/12 with a one-frame body-length residual

| attacker | Tackle | Splash | Psychic | Growl + unit | Swords Dance + unit | Surf |
|---|---|---|---|---|---|---|
| player | 0 | **286,096 px** (86/102 rows) | 0 | **286,096** (86/102) | **286,096** (86/102) | 0 |
| opponent | 0 | 0 | 0 | 0 | **289,856** (86/102) | 0 |

The 8 exact rows are 103/103 with every compared pixel equal. The 4 failures are exact for ages 0..83, then **every age 84.. is a whole-field
mismatch (~17.9k px/age) because the source body is 102 frames, not 103** (production duration 103). Cause (field-level, from the retained
probe frames, ages 80..101): the second `Task_FadeToBg` (fade back) and the `bldy` ramp 16 -> 0 start one frame EARLIER in the 102-frame
bodies (bldy 16 until age 82 vs 83; palette changes at age 83 vs 84); script offsets/OAM/tasks are otherwise identical. No input of
production's (OAM, tasks, registers, palette) differs at ages 0..83. This is the **emulator main-loop lag-frame** class already recorded in
`docs/live-species-audit-5.md` (Pursuit player-TYRANITAR: 86/102, lag at age 82, body one frame shorter) — here it appears with a *history*
key instead of a species key: it is not determined by side or predecessor alone (player-Growl 102 but opponent-Growl 103; both Splash
sides differ), so it is a hidden CPU-load phase input. Not re-measured with a lag counter in this session (the probe frames carry none).
**Recommendation: KEEP the `firstBody` gate for 228** (a later Pursuit body is exact only by luck of the lag schedule: 8/12). Narrowing to named
predecessors is unsafe (Splash and Growl differ by side). Optionally later: a lag-schedule input.

## Method

1. `lb26Scenarios.py`: prep16 `psychup-{player,opp}-after-<pred>` scenarios with the Psych Up lead's moves replaced by the move under test
   (the foe's predecessor acts first in turn 1; the move runs once, no own earlier body). Surf = hyperbeam template with the foe's move swapped.
2. Windows: `tools/compare/{curse,willOWisp,pursuit}BodiesProbe.py` (REPEATED_BODIES wrappers; `lb26Probe.sh`), `bodyWindows[0]`
   (activation .. first inactive), never matched to live output; body lists from `bgHistoryProbe.py` -> `precedingBodies` (`lb26Fixtures.py`).
3. Dense: `lb26Dense.sh` (harness `liveAdapterFramebuffer.ts`, production renderer + production order-lend replay), 2 passes.
   Receipt: `lb26Receipt.py`.

## Reproduce

```
sh tools/integration/lb26Run.sh /tmp/lb26out    # writes receipts + this table's inputs to /tmp/lb26out (~15 min on 8 jobs)
```
