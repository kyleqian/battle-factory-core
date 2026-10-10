# Live audit 19 (S10A side lane, 2026-10-10): the live claims of today's later folds (fold71, ice72, dive70) and ISSUES #160

Method = live audits 16 / 17 / 18 (`audit18Check.ts` header), on master `dc173666b` (src tree `e6f98bf9`), unpatched:
- battle-lab scenarios with an explicit lab seed (ISSUES #154);
- one probe derives the consumer fixtures;
- a check replays the history through the production hosts as the orchestrator does: the order host with the geometry-plan callback
  (displayed field + lent order) and the words lends; turns from the ROM's `battleTurnCounter` with `promptShown = !playerLocked`; the
  allocator; production's semi-invulnerable hide in `view.visibility`;
- it renders the production live view (CHAIN lend and ENTRY lend) against two more fresh direct-mGBA probe processes (r1 == r2 per-row
  digests).

audit 19 extends the method (`audit19Check.ts` / `audit19Fixtures.py` headers):
- every history body with a production Random2 plan records its words at the RAM `gRng2Value` of its own activation (Ice Ball, Mud-Slap,
  Rain Dance, Dive, Water Pulse);
- `RAIN_CONTINUES` records `GENERAL_RAIN_RANDOM2_PLAN` under its general key;
- Ice Ball carries its ROM rollout counter (`gDisableStructs`) and Magnitude the RAM `gAnimMovePower` (fold71's `20222` key);
- `STATS_CHANGE` carries the ROM's `gBattleScripting.animArg1` (Speed Boost = 17 in all 45 events, the fold71 kernel value);
- the player lock comes from the ROM `status2` at each turn-counter change (`STATUS2_MULTIPLETURNS | STATUS2_RECHARGE`);
- `lends.txt` compares every window's production lend (a deferred lend resolved as the render seam resolves it) with the ROM free order
  at activation.

No shared oracle was touched. No tracked file outside the audit19 set was edited. Evidence: `tools/integration/fixtures/audit-19/`.

## 1. Results first

**599 consumer windows, 130 scenarios, both sides.** Of these, 404 are live: **356 are 0 px**, and 48 have a residual. The 48 are 44
Castform form-art windows (ISSUES #143) and 4 player-CLAMPERL Dive *setup* windows (OPEN, outside today's folds). The other 195 windows
fall back, all through production's own decline. **r1 == r2 on 599 / 599.** Production's hide equals the ROM's on **599 / 599**,
including 9 windows where the other battler is hidden by Dive.

**Today's folds hold:**
- fold71's order plans give **0 px** for every live consumer behind them:
  - Magnitude ≤ 99: 31 windows; > 99: 6 windows, both sides, including explicit lab seeds;
  - Conversion 2: 43 windows;
  - Needle Arm: 38 windows, 22 of them with the opponent as the user;
  - the Speed Boost `STATS_CHANGE(17)`: 23 windows.
- ice72: 76 / 76 live windows are 0 px, after Ice Ball counters 1..4 on the opponent side and in the following turns. Every live lend
  equals the ROM's.
- dive70: every live consumer after a Dive **attack** is 0 px (22 windows).

**#160 is a fixture artifact, not a production defect** (section 3).

### Defect table

| Unit -> consumer | Verdict | px (before -> after) | Evidence |
|---|---|---|---|
| **CASTFORM_CHANGE (Forecast, sun / rain) -> any consumer while Castform is transformed** (44 live windows, both sides, both weathers; 4 more fall back) | **DEFECT, known: ISSUES #143's open remainder**, now exercised live because fold71 made these consumers live. The **order is EXACT**: 44 / 44 lends == ROM (`lends.txt`). The residual is Castform's own sprite box only: the ROM draws the sun / rain form (palette 945a42 / 738cd6), production the normal form (f7f7ff). The production field art has no form input (`src/engine/battleCommandFieldArt.ts`, which builds the battler pic from `species` only). Every static frame has the same gap, so it is not specific to the live path. | 1,583 / 1,281 px **per row** (player / opponent Castform) on every row. **Masked to Castform's boxes: -> 0 px** (`receipts/ablation/check-cast-*-mask-castform.json`). | No temp patch. The fix is #143 itself: `gBattleMonForms` in the field view, with per-form palette, front coords and elevation. That is art and data, outside an evidence step. Declining the live path would not change the pixels, because the fallback draws the same field art. |
| **Dive 291 SETUP by the PLAYER's CLAMPERL** (first body, no history) | **OPEN** (not a fold of today's; the setup body landed in land68). Not order: chain == entry, units 0. | ~11,000 px over 30 rows: ages 70..99, box x 64..79 / y 105..111, two water blues swapped (ROM 399cff vs 216bff); 4 / 4 windows. The player CHINCHOU's setup is 0 px (8 windows). | Not diagnosed in the time box. Likely the setup splash geometry for CLAMPERL's back pic. Flagged for a species audit; the census exposure was not measured. |

### Non-defect verdicts

| Windows | Verdict | Evidence |
|---|---|---|
| **ISSUES #160**: production lend after the Whirlpool at the hidden diver | **ARTIFACT** (dive70 fixture turn split) | Section 3. `dive70Check.ts` `lendEqualsRom` **false -> true** under `patches/issue160-dive70-var-whirlpool-opp-rom-turns.diff`, which changes a fixture only. |
| Dive SETUP windows (all species): the box drawn with the move banner | **ARTIFACT** (fixture text) | `BattleScriptFirstChargingTurn` prints `STRINGID_EMPTYSTRING3` before `attackanimation`, as in the flybounce-live / a13fix charge fixtures (`messageLines ["", ""]`). Ablation `check-dive-clamperl-swift-ply-banner.json`: 84,870 px -> 0 px with the empty box. |
| audit 18's missed-strike rule applied to the consumer's own turn (`wp160-opp-s1-c1`, Whirlpool before the Dive attack in one turn) | **ARTIFACT** (checker) | The fixture truncates the turn at the consumer, so the later strike is absent and the rule un-hid a diver the ROM still hides. Ablation `check-wp160-opp-s1-miss-rule-all-turns.json`: 100,452 px and the hide disagrees -> 0 px with the hide == ROM when the rule is limited to completed turns. |
| 174 windows after a **player-locked turn** (Ice Ball counters 2..5 by the player; Dive attack turn by the player) | **FALLBACK** (fail-closed, by design) | `beginLiveSpriteOrderTurn(promptShown = false)` invalidates ("command resolution without an action prompt"), as audit 18 found for the player Dive. **ice72 method note:** `fixtureIceBallChain` always passes `promptShown = true`, so ice72's player-side counter 2..5 lends describe a lend the orchestrator does not make. The census gain (+76) is measured with the real orchestrator and stands. |
| 21 windows without a locked turn: Shock Wave after a words unit (Ice Ball / Rain Dance / Dive attack; 11), and the later bodies of those chains (10) | **FALLBACK** (fail-closed) | Shock Wave's geometry plan needs the lent order resolved at plan time. A deferred words lend is not resolved there, so the plan declines ("no EXACT plan: body 351") and the host stays invalid. |
| TURN_TRAP_WHIRLPOOL while the trapped diver is underwater | **EXACT** (no event) | The ROM plays no `General_TurnTrap` at the end of turn 0 with the diver underwater (`Cmd_playanimation`'s `STATUS3_SEMI_INVULNERABLE` skip, `battle_script_commands.c:4033`). The kernel ports the skip (`battleScriptStatbuffchangeOpcode.ts:381`). When the diver is visible, its TURN_TRAP units (12 events) are in the 0 px wp160b chains. |

### Coverage (run A `receipts/verdicts.txt`, `receipts/coverage.txt`; ZERO = live 0 px)

| Family (scenarios) | windows | live 0 px | live residual | fallback | lends == ROM (live windows) |
|---|---|---|---|---|---|
| mag: Magnitude 222, GOLEM / SWAMPERT, 4 consumers × 2 sides (16) | 18 | 18 (≤ 99: 16, > 99: 2) | 0 | 0 | 18 / 18 |
| magx: Magnitude > 99 by lab seed (k10 / k4 player CHANSEY, k5 / k2 opponent CHANSEY) (8) | 19 | 19 (> 99: 4) | 0 | 0 | 19 / 19 |
| cast: CASTFORM sun / rain, 4 consumers × 2 sides (16) | 48 | 0 | 44 (#143 form art; masked 0) | 4 (Shock Wave after Rain Dance) | 44 / 44 |
| conv: Conversion 2, PORYGON2 / SNORLAX (16) | 59 | 59 | 0 | 0 | 59 / 59 |
| needle: Needle Arm, CACTURNE / CACNEA, both sides (16) | 44 | 44 | 0 | 0 | 44 / 44 |
| sb: NINJASK Speed Boost (STATS_CHANGE 17), 4 consumers × 2 sides (8) | 31 | 31 | 0 | 0 | 31 / 31 |
| ice: Ice Ball, SEALEO / WALREIN, Mud-Slap / Water Pulse / Shock Wave / Swift (16) | 190 | 76 | 0 | 114 | 76 / 76 |
| dive: Dive, CHINCHOU / CLAMPERL, every body a window (16) | 126 | 45 | 4 (CLAMPERL setup, OPEN) | 77 | 49 / 49 |
| ctl: no-unit controls (SNORLAX Snore), 5 consumers × 2 sides (10) | 40 | 40 | 0 | 0 | 40 / 40 |
| wp160: dive70's `whirlpool-opp-s1` + a variant (2) | 5 | 5 (1 hidden) | 0 | 0 | 5 / 5 |
| wp160b: #160 as described, 3 seeds × 2 sides (6) | 19 | 19 (8 hidden) | 0 | 0 | 19 / 19 (live lends; 11 opponent-side lends resolve only in the render seam) |
| **total (130)** | **599** | **356** | **48** | **195** | |

By the unit immediately before the consumer (`receipts/coverage.txt`):

| Unit | Result |
|---|---|
| Magnitude ≤ 99 / > 99 | 31 / 6 ZERO |
| Conversion 2 | 43 ZERO |
| Needle Arm, opponent / player | 22 / 16 ZERO |
| "prompt after STATS_CHANGE(17)" | 23 ZERO |
| Ice Ball by the opponent, counters 1 / 2 / 3 / 4 | 10 / 6 / 6 / 4 ZERO; the 6 fallbacks are Shock Wave |
| Ice Ball by the player, counter 1 | 8 ZERO |
| Dive attack by the opponent | 17 ZERO, 1 Shock Wave fallback |
| Dive attack by the player, consumer Whirlpool | 5 ZERO; the other 22 are locked-turn fallbacks |
| "prompt after STATS_CHANGE(27)" (Mud-Slap's -1 accuracy) | 16 ZERO |
| CASTFORM_CHANGE | 16 #143 |

**Consumers two or more units later:** every ice-* / conv-* / needle-* / sb-* chain runs 3 to 6 turns, and windows c2+ sit after
2 to 44 history units. All of them are 0 px or a named fallback.

### Not reached

- Consumers after a KO + send-in: the Magnitude and Ice Ball KOs end the derivation at the switch-in (`Move_RETURN`; UNMODELLED, 10
  scenarios).
- A KO by the Dive attack.
- Petal Dance as a consumer.
- Electric consumers against the Dive users: CHINCHOU's Volt Absorb plays no body, and GOLEM is immune to Electric in magx.

## 2. Reproducibility

Run A produced the committed receipts. Run B used fresh dirs and was started while A was still running. It was compared by
`audit19Compare.py`; see the run-B note in section 4.

## 3. ISSUES #160 diagnosis

- **The ROM's turns** (`receipts/wp160/rom-turns.txt`, fresh probe of `wp160-opp-s1` = dive70's `whirlpool-opp-s1.json`):
  - the turn counter changes at **frame 434**, between the Dive setup (210..324) and the player's Whirlpool (611..742);
  - so the turn-1 action prompt comes **before** the Whirlpool;
  - ONIX outspeeds CHINCHOU (its turn-0 Whirlpool missed the visible CHINCHOU: no body), so in turn 1 it hits the hidden diver before the
    Dive attack (1087..1179).
- **dive70's fixture** (`var-whirlpool-opp.json` `wordsChain.turns`) groups `[Dive setup, Whirlpool, hit] | [Dive attack]`. That puts the
  prompt *after* the Whirlpool. The production host then applies `[250, hit, action-prompt, actions-committed]` after the setup.
- **Before / after:**
  - `receipts/wp160/dive70-check-before.jsonl`: `lendEqualsRom: false`;
  - with the ROM's split (the `.diff`, applied to a scratch copy only) the units are `[action-prompt, actions-committed, 250, hit]`, and
    `dive70-check-after.jsonl` gives `lendEqualsRom: true`.
- **audit 19's replay with the ROM turns** (`wp160-opp-s1-c2`): lend `[17,10,3,9,5,7,16,4,…]` == ROM, 0 px.
- **The ablation with dive70's split** (`lends-ablation.txt`) reproduces the issue's exact misorder: `[3,4,17,10,9,5,7,16,…]`.
- **#160 as described** (`wp160b`): the Whirlpool hits the hidden diver at the **end** of turn 0, right before the prompt, then an
  order-dependent consumer runs after the Dive attack.
  - Player side: CHANSEY Whirlpool, then **Swift**. Seeds s1 / s2 hit; s0 missed.
  - Opponent side: CHANSEY Whirlpool, then Whirlpool at the visible diver.
  - Result: 19 / 19 windows 0 px, the 8 player-side lends == ROM, and hide == ROM in the 8 hidden windows.
- **No unit misorders the free list.** Whirlpool's body plan at a hidden target is right, TURN_TRAP_WHIRLPOOL is right (absent while the
  diver is underwater, in the ROM and in the kernel), and so is the prompt's re-allocation.
- **Fix:** the dive70 fixture's turn split (`patches/issue160-dive70-var-whirlpool-opp-rom-turns.diff`). Production needs no change, and
  #160 can be closed as a fixture artifact.

## 4. Reproduction (from workspace/; direct mGBA only; production src is never patched)

```
sh tools/integration/audit19Run.sh <fresh-receipt-dir> <fresh-scratch-dir>   # ~20 min: stage == committed -> probe -> derive == committed
    # -> check (2 fresh runs / scenario) -> summary / verdicts / coverage -> lends (all windows) -> wp160 (#160) -> ablations
    # -> audit19Compare.py vs tools/integration/fixtures/audit-19/receipts
sh tools/integration/audit19Wp160.sh <fresh-receipt-dir> <fresh-scratch-dir>  # #160 alone (~30 s)
AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts tools/integration/fixtures/audit-19/fixtures wp160b-ply-s1 /dev/null
node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts tools/integration/fixtures/audit-19/fixtures magx-golem-swift-ply-k10 <out.json>
AUDIT19_MASK=47:94:67:111,157:194:11:58 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts tools/integration/fixtures/audit-19/fixtures cast-sun-swift-ply <out.json>
```

Tools:
- `audit19Stage.py` (scenarios);
- `audit19Probe.py` (audit18Probe + `power` / `rollout` / `labelOffset` / `animArg1` / `endOrder` / `turns`) and `audit19Probes.py`;
- `audit19Fixtures.py`, `audit19Check.ts`;
- `audit19Summary.py`, `audit19Verdicts.py`, `audit19Coverage.py`, `audit19Compare.py`;
- `audit19Wp160.sh`, `audit19Run.sh`.

Fixtures and receipts:
- `scenarios/` (130), `fixtures/` (599), `patches/` (the #160 fixture `.diff`, with `.gitattributes` `*.diff -whitespace`);
- `receipts/`: `check/`, `summary.txt`, `verdicts.txt`, `coverage.txt`, `lends.txt`, `wp160/`, `ablation/`, `derive.txt`.
- No RGB dumps.
