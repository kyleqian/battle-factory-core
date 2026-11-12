# Live audit 19 (S10A side lane, 2026-10-10): the live claims of today's later folds (fold71, ice72, dive70) and ISSUES #160

Method = live audits 16 / 17 / 18 (`audit18Check.ts` header), on master `ce51c7444` (src tree `e6f98bf9`), unpatched:
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

**599 consumer windows from 122 of 130 scenarios, both sides.** The other 8 scenarios are mag-* with Electric consumers, which GOLEM /
SWAMPERT's Ground typing blocks (no body). 404 of the 599 windows are live: **360 are 0 px**, and the other 44 are Castform form-art windows (ISSUES #143). The other 195 windows fall
back, all through production's own decline. **r1 == r2 on 599 / 599.** Production's hide equals the ROM's on **599 / 599**,
including 9 windows where the other battler is hidden by Dive.

**Today's folds hold:**
- fold71's order plans give **0 px** for every live consumer behind them:
  - Magnitude ≤ 99: 31 windows; > 99: 6 windows, both sides, including explicit lab seeds;
  - Conversion 2: 43 windows;
  - Needle Arm: 38 windows, 22 of them with the opponent as the user. All are 0 px, but 6 Water Pulse windows lend != ROM (the latent DEFECT below);
  - the Speed Boost `STATS_CHANGE(17)`: 23 windows.
- ice72: 76 / 76 live windows are 0 px, and every live lend equals the ROM's. They include the opponent's Ice Ball bodies at counters
  1..5 (30 windows), the player's counter 1 (8), and consumers after each of them and in the following turns. The player's counters 2..5
  fall back (locked turn, below).
- dive70: every live consumer after a Dive **attack** is 0 px (22 windows).
- **One latent DEFECT in a plan fold71 extended**: Needle Arm 302 from a non-entry start order (6 lends != ROM, 0 px).

**#160 is a fixture artifact, not a production defect** (section 3).

### Defect table

| Unit -> consumer | Verdict | px (before -> after) | Evidence |
|---|---|---|---|
| **CASTFORM_CHANGE (Forecast, sun / rain) -> any consumer while Castform is transformed** (44 live windows, both sides, both weathers; 4 more fall back) | **DEFECT, known: ISSUES #143's open remainder**, now exercised live because fold71 made these consumers live. The **order is EXACT**: 44 / 44 lends == ROM (`lends.txt`). The residual is Castform's sprite, plus the target geometry of a consumer aimed at the transformed Castform: the ROM draws the sun / rain form (palette 945a42 / 738cd6), production the normal form (f7f7ff). The production field art has no form input (`src/engine/battleCommandFieldArt.ts`, which builds the battler pic from `species` only). Every static frame has the same gap, so it is not specific to the live path. | 998..2,312 px **per row** on every row, in Castform's sprite box: player x 47..94 / y 67..111, opponent x 157..194 / y 11..58. **With both boxes masked** (`receipts/ablation/check-cast-*-swift-*-mask-castform.json`): 0 px for Castform as the player in rain; 428 px in a 2-px column beside the player box (sun); 27,890 / 29,307 px of Swift's stars when Castform is the opponent target, at x 98..122 / y 82..98, where the ROM stars (ffad18) aim at the transformed form's coords. All of it is #143's per-form front coords / elevation. | No temp patch. The fix is #143 itself: `gBattleMonForms` in the field view, with per-form palette, front coords and elevation. That is art and data, outside an evidence step. Declining the live path would not change the pixels, because the fallback draws the same field art. Census exposure via fold71: CASTFORM_CHANGE cleared 1 command / 237 frames on 0..999 (`docs/fold71-plans69-speed-boost.md`). |
| **Needle Arm 302 (both sides) from a NON-entry start order -> Water Pulse** (`needle-{cacnea,cacturne}-water-pulse-{ply,opp}` c1 / c2: `[Needle Arm, Water Pulse]`, prompt, `[Needle Arm]`, then Water Pulse) | **DEFECT, latent** (lend != ROM, 0 px in every observed window). fold71 added the `302:opponent` row with the existing `302:player` text, plan 162 at `src/engine/spriteOrderProductionPlans.ts:169`. | 6 / 44 Needle Arm lends != ROM; 0 -> 0 px: Water Pulse's sprites do not reach the swapped slots. | `AUDIT19_TRACE=1`: the host's full 55-slot free list before the 2nd Needle Arm **equals** the ROM's (`[3,4,10,7,9,5,14,15,12,13,11,21,…]`, so the prompt model is right). After it, production has `[3,11,12,10,…]` and the ROM has `[3,11,10,12,…]`. From the entry-like start (`[4,3,21,20,5,…]`, the 1st Needle Arm) both give `[3,11,12,10,…]`. **Mechanism, measured per frame** (`audit19NeedleFrames.py`, two fresh runs r1 == r2, `receipts/needle/`): the burst's 9 + 1 creates are sorted at frame 148 / 1482. The sprites created into slots 10 and 12 tie in `SortSprites` (priority word 0x3ff, equal y), so its stable insertion sort keeps their relation from the START order: 12 before 10 at the entry-like start of the 1st Needle Arm, 10 before 12 at the post-Water-Pulse + prompt start of the 2nd. The plan encodes a fixed placement (`…;Cfffffffff;Cf;…`), so it is exact only from starts where 12 precedes 10 (every plans69 probe and 38 / 44 here). **Tested fix hypothesis, NEGATIVE:** `patches/needle-arm-302-merged-burst-NEGATIVE.diff` (plans69's merged 10-sprite burst `Cffffffffff`), applied to a git-archive copy, leaves 6 / 6 unchanged. **Fix shape (no verified patch in the time box):** model the tie in the 302 plan, i.e. the two tied creates keep their start-order relation. That needs a create mode beyond `f` / `e`, or the window's `P<priority words>` part (`decodeSpriteOrderPlan`, `spriteOrderEventTransform.ts:153`), if the tracker's sort can express a start-order tie. The fail-closed alternative is to invalidate after 302 when the two slots the tied creates receive (creation indices 17 and 19 here: slots 10 and 12) are in the opposite relation in the start free order. That keeps the 38 exact windows live. |

### Non-defect verdicts

| Windows | Verdict | Evidence |
|---|---|---|
| **ISSUES #160**: production lend after the Whirlpool at the hidden diver | **ARTIFACT** (dive70 fixture turn split) | Section 3. `dive70Check.ts` `lendEqualsRom` **false -> true** under `patches/issue160-dive70-var-whirlpool-opp-rom-turns.diff`, which changes a fixture only. |
| Dive SETUP windows (all species): the box drawn with the move banner | **ARTIFACT** (fixture text) | `BattleScriptFirstChargingTurn` prints `STRINGID_EMPTYSTRING3` before `attackanimation`, as in the flybounce-live / a13fix charge fixtures (`messageLines ["", ""]`). Ablation `check-dive-clamperl-swift-ply-banner.json`: 84,870 px -> 0 px with the empty box. |
| Dive SETUP of the PLAYER's CLAMPERL as the consumer (4 first-body windows) | **ARTIFACT** (checker) | audit 18's check never had a Dive consumer, so it activated the consumer's words without the production plan context (`liveDiveSetupSplashBirth` from the displayed species, which the history Dive bodies get). Before: ~11,000 px over 30 rows (ages 70..99, x 64..79 / y 105..111). With the context: **0 px** on 4 / 4. Ablation `check-dive-clamperl-swift-opp-no-splash-context.json`: 10,567 px. CHINCHOU's setup point happens to coincide (0 px either way). |
| audit 18's missed-strike rule applied to the consumer's own turn (`wp160-opp-s1-c1`, Whirlpool before the Dive attack in one turn) | **ARTIFACT** (checker) | The fixture truncates the turn at the consumer, so the later strike is absent and the rule un-hid a diver the ROM still hides. Ablation `check-wp160-opp-s1-miss-rule-all-turns.json`: 100,452 px and the hide disagrees -> 0 px with the hide == ROM when the rule is limited to completed turns. |
| 174 windows after a **player-locked turn** (Ice Ball counters 2..5 by the player; Dive attack turn by the player) | **FALLBACK** (fail-closed, by design) | `beginLiveSpriteOrderTurn(promptShown = false)` invalidates ("command resolution without an action prompt"), as audit 18 found for the player Dive. **ice72 method note:** `fixtureIceBallChain` always passes `promptShown = true`, so ice72's player-side counter 2..5 lends describe a lend the orchestrator does not make. The census gain (+76) is measured with the real orchestrator and stands. |
| 21 windows without a locked turn: Shock Wave after a words unit (Ice Ball / Rain Dance / Dive attack; 11), and the later bodies of those chains (10) | **FALLBACK** (fail-closed) | Shock Wave's geometry plan needs the lent order resolved at plan time. A deferred words lend is not resolved there, so the plan declines ("no EXACT plan: body 351") and the host stays invalid. |
| TURN_TRAP_WHIRLPOOL while the trapped diver is underwater | **EXACT** (no event) | The ROM plays no `General_TurnTrap` at the end of turn 0 with the diver underwater (`Cmd_playanimation`'s `STATUS3_SEMI_INVULNERABLE` skip, `battle_script_commands.c:4033`). The kernel ports the skip (`battleScriptStatbuffchangeOpcode.ts:381`). When the diver is visible, its TURN_TRAP units (12 events) are in the 0 px wp160b chains. |

### Coverage (run A `receipts/verdicts.txt`, `receipts/coverage.txt`; ZERO = live 0 px)

| Family (scenarios) | windows | live 0 px | live residual | fallback | lends == ROM (live windows) |
|---|---|---|---|---|---|
| mag: Magnitude 222, GOLEM / SWAMPERT, 4 consumers × 2 sides (16) | 18 | 18 (≤ 99: 16, > 99: 2) | 0 | 0 | 18 / 18 |
| magx: Magnitude > 99 by lab seed (k10 / k4 player CHANSEY, k5 / k2 opponent CHANSEY) (8) | 19 | 19 (> 99: 4) | 0 | 0 | 19 / 19 |
| cast: CASTFORM sun / rain, 4 consumers × 2 sides (16) | 48 | 0 | 44 (#143 form art) | 4 (Shock Wave after Rain Dance) | 44 / 44 |
| conv: Conversion 2, PORYGON2 / SNORLAX (16) | 59 | 59 | 0 | 0 | 59 / 59 |
| needle: Needle Arm, CACTURNE / CACNEA, both sides (16) | 44 | 44 | 0 | 0 | **38 / 44** (6 Water Pulse windows: the Needle Arm DEFECT row) |
| sb: NINJASK Speed Boost (STATS_CHANGE 17), 4 consumers × 2 sides (8) | 31 | 31 | 0 | 0 | 31 / 31 |
| ice: Ice Ball, SEALEO / WALREIN, Mud-Slap / Water Pulse / Shock Wave / Swift (16) | 190 | 76 | 0 | 114 | 76 / 76 |
| dive: Dive, CHINCHOU / CLAMPERL, every body a window (16) | 126 | 49 | 0 | 77 | 49 / 49 |
| ctl: no-unit controls (SNORLAX Snore), 5 consumers × 2 sides (10) | 40 | 40 | 0 | 0 | 40 / 40 |
| wp160: dive70's `whirlpool-opp-s1` + a variant (2) | 5 | 5 (1 hidden) | 0 | 0 | 5 / 5 |
| wp160b: #160 as described, 3 seeds × 2 sides (6) | 19 | 19 (8 hidden) | 0 | 0 | 10 / 10 resolved; 9 opponent-side Whirlpools after the player's locked attack turn have no resolvable lend and need none (live, 0 px) |
| **total (130 staged, 122 with windows)** | **599** | **360** | **44** | **195** | |

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
2 to 44 history units. All of them are 0 px, #143 (cast-*) or a named fallback; the 6 Needle Arm lends (0 px) are the latent DEFECT.

### Not reached

- Consumers after a KO + send-in: the Magnitude and Ice Ball KOs end the derivation at the switch-in (`Move_RETURN`; UNMODELLED, 10
  scenarios).
- A KO by the Dive attack.
- Petal Dance as a consumer.
- Electric consumers against the Dive users: CHINCHOU's Volt Absorb plays no body, and GOLEM is immune to Electric in magx.

## 2. Reproducibility

### Run A

`audit19Run.sh` at `b6832a9b7`, 13:44..14:02. It produced the receipts first committed in `b6832a9b7`.

### Run B: a second full run of the same runner and checker

Fresh receipt and scratch dirs, a separate batch started at 13:55 while A was in its check stage (ISSUES #154).
- It re-staged the scenarios (== committed) and re-probed every scenario. **Its derived fixtures == the committed ones** and `derive.txt`
  is byte-identical: frames, `gRng2Value`, powers, counters and turns all reproduce.
- `audit19Compare.py` against run A's receipts as committed in `b6832a9b7`: **identical = 599, ROM-drift = 0, DIFFERS = 0 windows. All
  122 check receipts and all 17 other receipt files are byte-identical** (summary, verdicts, coverage, lends, derive, derive-vs-committed,
  wp160 / ×4, ablation / ×7 including its summary).
- Unlike audit 18 (15 ROM-drift windows), no window drifted across these batches.

### The one later checker change: `58fe4b2fe`

A Dive setup consumer now gets its production splash-birth context.
- It changes exactly the receipts of the 4 `dive-clamperl-*-opp` scenarios: the 4 setup windows 11,282 / 10,567 / 11,282 / 11,123 px
  -> 0, plus the ENTRY-control px of their later fallback windows.
- All 18 affected scenarios (dive-*, wp160-*) were re-checked twice in separate batches with the new checker (C1 == C2 byte-identical),
  and the committed receipts were replaced with them.
- `lends.txt` is unchanged with the new checker (byte-identical).
- summary / verdicts / coverage were regenerated from the updated `check/`.

### Run C: a full run of the final runner

Run C used fresh dirs, the final runner and checker, and was started at 14:18 after the build. It is the third independent batch.
- It re-staged and re-probed; derived fixtures == committed.
- `audit19Compare.py` against the committed receipts: **identical = 599, ROM-drift = 0, DIFFERS = 0 windows. All 122 check receipts
  and all 19 other receipt files are byte-identical**, including `needle/`, the no-splash-context ablation and `coverage.txt`. It finished
  at 14:34.
- Every audit19 receipt therefore reproduced byte for byte across two batches of the final code (run C vs committed). The checks were
  also reproduced across three batches (A, B, C; the 18 re-checked scenarios also in C1 / C2).

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

Gates on the final tree:
- `npm test`: 1,607 files / 13,225 tests passed (44 files / 223 tests skipped), 0 failed, 835 s, run under load.
- `npm run build`: green.
- `git diff --check`: clean. The `.diff` fixtures carry `*.diff -whitespace`.
- No tracked file outside the audit19 set was modified.
- No TypeScript was added under `tests/`, so the typecheck gate does not apply. `tools/` is outside the `tsc` include.

```
sh tools/integration/audit19Run.sh <fresh-receipt-dir> <fresh-scratch-dir>   # ~15-20 min: stage == committed -> probe -> derive == committed
    # -> check (2 fresh runs / scenario) -> summary / verdicts / coverage -> lends (all windows) -> wp160 (#160) -> ablations
    # -> needle/ (Needle Arm per-frame order, 2 fresh runs, r1 == r2)
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
- `audit19Wp160.sh`, `audit19NeedleFrames.py` (the Needle Arm per-frame order probe + `--summary`), `audit19Run.sh`.

Fixtures and receipts:
- `scenarios/` (130), `fixtures/` (599);
- `patches/`: the #160 fixture `.diff` and the Needle Arm NEGATIVE `.diff`, with `.gitattributes` `*.diff -whitespace`;
- `receipts/`: `check/`, `summary.txt`, `verdicts.txt`, `coverage.txt`, `lends.txt`, `wp160/`, `ablation/`, `needle/`, `derive.txt`.
- No RGB dumps.
