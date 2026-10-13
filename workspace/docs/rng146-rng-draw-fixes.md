# rng146 — source-exact RNG draws: ISSUES #141 (Sticky Hold) + #140 remainder (`battle_util.c:133`); #141a THRASH deferred

Main/ts gameplay step under `docs/factory-finish-scope.md`. Ground truth: `docs/rcp143-engine-fix-receipts.md` (R1/R2/R3 +
R3 control). Before any code change, each verifier failed exactly as that doc says: R1 at turn 1 index 5, R2 at turn 1
index 4, R3 at turn 4 index 2; the control PASSed.

## Fixes

| fix | site | change | receipt | state |
|---|---|---|---|---|
| F1 #141a | `battleScriptHitChainOpcode.ts` `applyThrashMoveEffect` | not-yet-locked arm jumps to its own pc (`:2851-2862` breaks without moving the cursor), so `seteffectwithchance` re-runs with the byte 0 and wastes one roll | R1 PASS (8/10/12 draws, HP `[150,168] [141,153] [132,140]`, turn-2 dmg[20000]) | `0f9b5301e`, **reverted** in `52340a10e` (re-pins did not fit the time split; see below) |
| F2 #141b | same file, STEAL_ITEM Sticky Hold arm | `"call"` -> `"call-current"` (`BattleScriptPushCursor`, `battle_util.c:966-969`) | R2 PASS (10/10/10, HP `[139,141] [126,104] [114,70]`) | `8726675ec` landed |
| F3 #140 | `battleScriptRulesContext.ts` + `factoryBattleScriptFullTurnDecision.ts` | new rules-context cell `chosenMoveByBattler` (u16[4], gChosenMoveByBattler), threaded beside `chosenActionByBattler` (so every snapshot, rules-context copy and the Scene ON/OFF parity compare carry it): banked in the turn's initial state from the selection-time context (slot move `:4399`, Encore move `:4194`, MOVE_NONE for status-locked / no-usable-move / switching battlers), reset at BattleTurnPassed (`:4001-4005`). `runMoveAction` resolves `:130-134` at the battler's OWN action, after the noValidMoves / locked / Encore arms: if `moves[chosenMovePos] !== chosenMoveByBattler` it runs that slot's move and pays `GetMoveTarget` | R3 PASS (t4 GetMoveTarget[35099], t8 ×2); R3 control (Ditto Transform) still PASS | `e8843465a` landed |

Tier-1 pins: `tests/battleScriptFamilyBCluster4Opcode.test.ts` (Covet vs Sticky Hold: two back-to-back chance rolls; it
fails without F2; plus a no-item control), `tests/rng146RngDrawFixes.test.ts` (replays R2 / R3 / R3 control through the live
kernel, which fails without F3, and pins R1 as the known FAIL), `tests/rcp143Receipts.test.ts` R2 / R3 pins flipped to PASS
(receipts refolded with `--write`; the control receipt is byte-identical), and the rules-context field list
(`tests/battleScriptRulesContext.test.ts`).

## Ripple accounting

Method: a scratch, uncommitted patch added env toggles (`RNG146_OFF=F1,F2,F3`) and stderr carrier traces at the three
sites (`.integration/validation/rng146/attribution-toggles.patch`). Moved artefacts were re-run under all-off / each fix
alone.

**Tests (full suite on the F1+F2+F3 tree, 2 shards):** 8 tests in 6 files moved. With all three toggled off, the 6 files
pass 159 / 159. With **F1 alone**, the same 8 fail with the same values. With **F2 alone** or **F3 alone**, all 159 pass.
Every moved test contains a Thrash-family lock-in (Petal Dance, move 80, both sides). They are all **F1**:

| test | moved value (F1) |
|---|---|
| `factoryRoundBattleOrchestrator` seed 16 / seed 24 round census | calls 1315 -> 1294 / 1623 -> 1479 |
| same, rentsCount "lost after swap" (seed 58, accept after battle 0) | `roundLost` -> `roundComplete` (needs a new losing seed) |
| `playableAnimationLifecycle` Scene ON/OFF parity | 470 -> 467 decisions (parity itself holds) |
| `sa125StatusAnimationCommand` production routes | `BRN\|inflicted\|player` no longer covered by the census seeds |
| `fix122AuditDefects` move 113 on census battle 32 | the BUTITFAILED route no longer occurs (0 rows) |
| `sgl138SeGateLive` seed 32 | committed receipt frames 19220 vs 11914 |
| `randomRoundSoak` (b) winning seed chains >= 2 rounds | carry 7 < 14 |

Five of these need new-seed scans, so F1 was reverted and #141 trimmed to this remainder (ISSUES #141 lists the
re-land recipe). F2 and F3 moved **no** test.

**Census 0..999** (`ret88Census.sh shards`; baseline = ret165's after-census on `98f4f8a05`: 27,256 commands, 27,075 live):

| tree | commands | live | by count | frames (live) | by frames | changed battles |
|---|---:|---:|---:|---:|---:|---|
| ret165 baseline | 27,256 | 27,075 | 99.34 % | 4,155,309 (4,138,675) | 99.60 % | — |
| F1+F2+F3 (`e8843465a`) | 27,196 | 27,016 | 99.34 % | 4,151,788 (4,135,135) | 99.60 % | 47: 45 F1 + 2 F3 |
| **landed F2+F3 (`52340a10e`)** | **27,271** | **27,090** | **99.34 %** | **4,158,655 (4,142,021)** | **99.60 %** | **2: both F3** |

Per-battle attribution of the 47: each changed seed was re-run alone under each fix alone. 45 are reproduced exactly by F1
alone and unchanged by F2 or F3 alone. Each first diverges at or right after a Petal Dance / Thrash / Outrage lock-in.
Two are F3 alone:

- **269**: player GLOOM charges SOLARBEAM (cmd 46), then the faster foe ROSELIA's GRASSWHISTLE puts it to sleep. The
  cancelled lock takes `:133` (one GetMoveTarget draw) and the battle diverges at cmd 49. This is the R3 shape.
- **811 (a route the brief did not anticipate):** both sides chose a -6 phazing move. Player BEAUTIFLY's faster WHIRLWIND
  drags in GLOOM before RHYHORN's banked ROAR acts. Before this fix the port ran **ROAR as GLOOM**, a move GLOOM doesn't
  have, because the move id was taken from the pre-turn context. Now GLOOM's action runs its own slot-3 move (MOONLIGHT 236,
  `banked 46 != slot 236`). That is source `HandleAction_UseMove`: `gBattleMons[b]` holds the new mon after
  `switchindataupdate`, `Cmd_forcerandomswitch` leaves the action in place, and `:130-134` re-derives the move and target.
  It follows from the source but has **no ROM receipt**. A `mechanicLab` card (two Whirlwind/Roar users, the faster
  phazing first) should confirm that the dragged-in mon acts with its own slot move.

0 unattributed. F2 changed no census battle (no Covet / Thief into Sticky Hold occurs in 0..999). Render throws 0.

**Soak vanilla 0:20 `--parallel 5`:** on the landed tree it is 20 / 20 OK, and every per-seed line is identical to ret165's
(`b2 t16`, budget, carry <= 7, depth <= 10). On the F1+F2+F3 tree every seed moved to `b4 t0` (depth <= 9). Seed 0 under
F1 alone reproduces `b4 t0` (11 Petal Dance lock-ins by battler 0), and under F2+F3 alone it keeps `b2 t16`.

## Not done / notes

- core-rs is not edited. A name search of `core-rs/crates` found no Rust port of the THRASH / STEAL_ITEM `SetMoveEffect`
  arms, the full-turn action prologue or a `gChosenMoveByBattler` bank. It found only opcode vector tests, e.g.
  `battle_script_confuseifrepeatingattackends_vectors.rs`. Any future Rust port must carry all three behaviours.
- #139 (Focus Punch pre-pass) is the next step. It can read the same `chosenMoveByBattler` bank (`battle_main.c:4914`).
- Possible adjacent gap, not examined: a mid-turn Encore by the faster battler on a slower one that has not acted
  (source then takes the `:112` Encore arm at the slower battler's action). The port evaluates the Encore arms from the
  turn-start context.
- Scratch: `.integration/validation/rng146/` (suite shard logs, toggle runs, both censuses, census diffs, soak logs).
