# rng146 — source-exact RNG draws: ISSUES #141 (Sticky Hold) + #140 remainder (`battle_util.c:133`); #141a THRASH re-landed by thr153

Main/ts gameplay step under `docs/factory-finish-scope.md`. Ground truth: `docs/rcp143-engine-fix-receipts.md` (R1/R2/R3 +
R3 control). Before any code change, each verifier failed exactly as that doc says: R1 at turn 1 index 5, R2 at turn 1
index 4, R3 at turn 4 index 2; the control PASSed.

## Fixes

| fix | site | change | receipt | state |
|---|---|---|---|---|
| F1 #141a | `battleScriptHitChainOpcode.ts` `applyThrashMoveEffect` | not-yet-locked arm jumps to its own pc (`:2851-2862` breaks without moving the cursor), so `seteffectwithchance` re-runs with the byte 0 and wastes one roll | R1 PASS (8/10/12 draws, HP `[150,168] [141,153] [132,140]`, turn-2 dmg[20000]) | `0f9b5301e`, reverted in `52340a10e`, **re-landed by thr153** (cherry-pick + 8 re-pins; § thr153 below) |
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

## thr153 — #141a re-landed (F1 cherry-picked onto master `877580fde` + the 8 re-pins)

The only engine diff against master is F1's `jump` to the current pc. The R1 / R2 / R3 / R3-control verifiers all PASS. The R1 pin
in `tests/rng146RngDrawFixes.test.ts` is flipped to PASS, and the wasted roll is pinned. Attribution uses a scratch
`THR153_OFF=F1` / `THR153_TRACE` toggle (`.integration/validation/thr153/attribution-toggle.patch`, never committed). On the F1
tree exactly the 8 rng146 tests fail. With F1 off, the old values come back.

| pin | lock-in on the old trajectory (trace) | re-pin |
|---|---|---|
| orchestrator seed 16 / 24 round census | 1 Petal Dance lock-in (battler 1) each | calls 1315 -> 1294 / 1623 -> 1479 (the stash's values, reused; stash dropped) |
| playableAnimationLifecycle scene parity | 4 Petal Dance lock-ins (battler 0) | 470 -> 467 decisions (parity holds) |
| rentsCount "lost after swap" | seed 58: 1 Petal Dance lock-in; F1 on `roundComplete`, off `roundLost b1` | seed **250**. It was re-scanned over seeds 1..260 accepting after battle 0 and 1..60 accepting after battles 1..5, and is the only round that loses with the swap pending. The shape is unchanged: accept after battle 0, lose battle 1 |
| sa125 production routes | census battles 18 / 76 diverge at cmds 36 / 5, right after a Petal Dance | seed **49** added (0..79 scan). It carries `BRN\|inflicted\|player` and `BRN\|STRINGID_PKMNHURTBYBURN\|player`, which **both** dropped out. The battle is unmoved by F1 |
| fix122 move 113 | census battle 32 diverges at cmd 24, right after a Petal Dance (the failed Light Screen is gone) | battle **41** (unmoved; already the example for 219 / 258). Start 40 = glyph 41 - 1 |
| sgl138 seed 32 | same battle 32 | Seed 32 still carries its `stats-change-attacker` battler-0 gate (8 = projection). Its new route, though, has a DIG whose charge and strike share a segment, and the later-hit anchor reads that as a multi-hit 2nd hit (span -127, not a gated class). The seed is now **808**, the next projected battler-0 `stats-change-attacker` seed (unmoved by F1). The receipt was regenerated with `sgl138Live.ts --out=`. Summary: anchors 90 -> 98, gate frames 416 -> 438, stats-change 79 -> 87; all 10 cells and every equality are unchanged |
| randomRoundSoak (b) | seed 34: 7 Petal Dance lock-ins (battler 0); F1 off carry 14, on 7 | seed **1**. Scan over 0..10 / 34..44: seeds 1, 3 and 40 chain two round wins |

The five re-scanned seeds (250, 49, 41, 808, 1) pass with F1 on and off.

**Census 0..999** (baseline re-run on master `877580fde`: 27,271 / 27,090, identical to the landed F2+F3 row above): F1 tree
**27,196 commands / 27,016 live (99.34 %), frames 4,151,788 (4,135,135) 99.60 %**. 46 battles changed, the 45 above + **811**.
Battle 811 was F3's phazing battle; F3 is now in the baseline, and 811 diverges at cmd 29, right after a Petal Dance at cmd 27.
Every changed battle has a Petal Dance / Thrash / Outrage lock-in at or right before its first divergence. 0 are unattributed.

**Soak vanilla 0:20** (`--parallel 10`; rng146's `--parallel 5` run took 500 s, too close to the tool's 600 s limit; per-seed results do
not depend on it): 20 / 20 OK, every seed `b4 t0` (was `b2 t16`), carry <= 7, depth <= 9.

**Gates:** typecheck 0, smoke 448, full `npm test` (2 shards) 1,660 files / 13,789 tests passed, 0 failed, build OK.

**Notes.** sgs134's `fixtures/sgs134/exposure.json` is a census projection taken before F1, so it is stale for the 46 moved
battles. No sgl138 seed is one of them any more; a future sgs134 census rerun would refresh it. core-rs: still no Rust port of
the THRASH arm (not edited).
