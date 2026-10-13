# rcp143 — stock-ROM receipts for the next engine fixes (ISSUES #141, #140 remainder, #139)

Evidence only, banked **before** the fixes. Every receipt was captured on the stock ROM with
`mechanicLab` `overrides.parties`: three complete, legal mons per side, with legality checked against
`level_up_learnsets.h` / `tmhm_learnsets.h` / `species_info.h`, and all four opponent slots given the
same move. Captures are Battle Scene OFF unless noted. Each card was run **twice fresh** and the probe
output is byte-identical (`byteIdenticalAcrossRuns`). Every frame's `Random()` count is checked
against `sRandCount` **and** an independent `gRngValue` LCG replay. A second fresh emulator
single-steps only the frames that drew, and names each `Random()` caller by LR. Pass-2 hits equal
the pass-1 totals (`attributionReconciled`).

The port side reruns each scenario through the full-turn kernel at HEAD (`reduceFactoryFullTurnDecision`,
the issue140 seam). It is seeded with the ROM's own `gRngValue` before the first turn-execution
draw, and it injects the ROM's measured AI-selection draws between turns, because the kernel takes
the trainer decision as input and never runs the Factory AI. The verify scripts **FAIL today by
design**. After the fix they must PASS, and the **predicted post-fix port sequence is the ROM's own
sequence** (`predictedPostFix` in each receipt).

## Results

### R1 — #141a THRASH lock-in re-runs `seteffectwithchance` (receipt `tools/probe/receipts/rcp143-r1-thrash-lockin-off.json`)

**Scenario.** TAUROS (Thrash / Tackle / Horn Attack / Tail Whip, Intimidate) vs bulky STEELIX (Tackle ×4).
Thrash is picked on turn 1. A-pulses re-pick it on turn 3, which is a second lock-in. Attribution: 46 / 46 draws.

| | turn 1 (lock-in) | turn 2 (locked) | turn 3 (re-lock) |
|---|---|---|---|
| **ROM** | acc, crit, dmg, **SEWC, THRASH dur `(Random()&1)+2`, SEWC (wasted, next frame, same opcode)**, Steelix acc[40499] → **miss**, BTP — 8 | acc, crit, **dmg[20000]**, SEWC, Steelix acc/crit/dmg/SEWC, confusion dur, BTP — 10 | confusion roll, acc, crit, dmg, **SEWC, THRASH dur, SEWC**, Steelix ×4, BTP — 12 |
| **Port today** | identical through THRASH dur, then Steelix acc **[52148] = the ROM's wasted roll** → **hit**, crit, dmg, SEWC, BTP — 10 | every draw one value late (Thrash **dmg[7952]**) — 10 | self-hit in confusion (offset) → no Thrash — 7 |
| **Predicted post-fix** | = ROM (8) | = ROM (10) | = ROM (12) |

The lock duration is 2 on the ROM (`27560 & 1 = 0`), and "TAUROS became confused due to fatigue!"
appears at the end of turn 2. Active HP after turns 1–3: ROM `[150,168] [141,153] [132,140]`, port
`[140,168] [131,153] [101,153]`. The first divergence is turn 1, index 5.

**Fix shape.** `src/engine/battleScriptHitChainOpcode.ts:3909-3946` `applyThrashMoveEffect`: in the
not-yet-locked arm, which draws the duration and then returns `{ kind: "advance" }` at **:3945**,
return a directive that **re-executes the current `seteffectwithchance` instruction**: a jump to that
instruction's own program counter. The re-run sees `moveEffectByte` 0, draws once (`:4060`) and
advances. The already-locked arm's advance at :3919 is correct.

### R2 — #141b Covet into Sticky Hold returns onto `seteffectwithchance` (receipt `rcp143-r2-covet-stickyhold-off.json`)

**Scenario.** LINOONE (Covet / Headbutt / Sand-Attack / Tackle, no item) vs GULPIN (`abilitySlot` 1 = STICKY_HOLD,
holding SOOTHE_BELL, Pound ×4). Covet is used every turn, and every turn the ROM prints "Foe GULPIN's
STICKY HOLD made COVET ineffective!". Attribution: 45 / 45 draws.

| | each Covet turn (1, 2, 3) |
|---|---|
| **ROM** | acc, crit, dmg, **SEWC (→ `BattleScript_NoItemSteal`), SEWC (wasted re-run after its `return`)**, Gulpin acc/crit/dmg/SEWC, BTP — **10 / 10 / 10** |
| **Port today** | one SEWC per Covet — **9 / 9 / 9**. The offset grows 1 → 2 → 3, so on turn 2 the port's Covet crits (crit roll [20000]): Gulpin HP **68 vs ROM 104** |
| **Predicted post-fix** | = ROM (10 / 10 / 10; HP `[139,141] [126,104] [114,70]`) |

**Fix shape.** In `battleScriptHitChainOpcode.ts:3148-3162` (Sticky Hold arm of STEAL_ITEM), change
`{ kind: "call", programCounter }` at **:3160** to `{ kind: "call-current", programCounter }`.
`battleScriptMachine.ts:998-1009` (`"call"` pushes pc+1) vs `:1010-1021` (`"call-current"` pushes pc).

### R3 — #140 remainder, `battle_util.c:133` (receipts `rcp143-r3-getmovetarget-133-off.json`, `rcp143-r3-control-transform-off.json`)

**Outcome: reachable in singles, but not by the ISSUES route.**

- **Mimic / Transform cannot reach `:133` in singles.** `Cmd_transformdataexecution`
  (`battle_script_commands.c:7764`) and `Cmd_mimicattackcopy` (`:7844`) write only
  `gBattleMons[gBattlerAttacker]`, during the user's **own** action. So nothing can overwrite the
  user's slot between its selection and its own execution in the same turn. On every **later** turn,
  selection re-banks `gChosenMoveByBattler = moves[chosenMovePos]` (`battle_main.c:4399`), so the
  compare is equal.
  - **Control receipt:** DITTO (Transform only) vs a slower SNORLAX (Tackle ×4). Ditto reuses its
    overwritten slot 0 on turns 2–4: **0 `GetMoveTarget` callers** in 2 byte-identical runs.
    **The port already matches draw for draw (PASS)**, so this is a guard that the fix must not fire.
- **The real singles route: a lock cancelled mid-turn by a faster foe.**
  1. `BattleTurnPassed` resets `gChosenMoveByBattler[i] = MOVE_NONE` every turn
     (`battle_main.c:4001-4005`), and a battler that is locked at selection time skips selection.
  2. If a faster foe then cancels the lock with `SetMoveEffect`'s sleep arm `CancelMultiTurnMoves`
     (`battle_script_commands.c:2296`; also freeze `:2392` and Spite-to-0-PP `:8357`),
     `HandleAction_UseMove` misses the locked arm (`battle_util.c:106-109`) and both Encore arms.
  3. It then takes `:131-135`, because `moves[gCurrMovePos] != MOVE_NONE`, and runs `GetMoveTarget`
     (`battle_util.c:3828`; `MOVE_TARGET_SELECTED` do/while at `:3850-3853`).
  - **Receipt:** SNORLAX (Solar Beam [TM22] / Body Slam / Rest / Snore, Speed 31) vs PARASECT
    (Spore ×4, Speed 90). Snorlax wakes on turn 3 and charges Solar Beam. On turn 4 Spore re-sleeps
    it first, then Snorlax's prologue draws.

| | turn 4 | turn 8 (second occurrence) |
|---|---|---|
| **ROM** | Spore acc, sleep dur, **GetMoveTarget[35099]** (caller `GetMoveTarget+0x18e`, attacker 0, `MOVE_SOLAR_BEAM`), BTP — 4 | Spore acc, sleep dur, **GetMoveTarget ×2** (geometric), BTP — 5 |
| **Port today** | acc, sleep dur, **BTP[35099]** (no loop) — 3 | offset by 1, no loop — 3 |
| **Predicted post-fix** | = ROM | = ROM |

Turns 1–3 match exactly. The first divergence is turn 4, index 2. Attribution: 149 / 149 draws.

**Fix shape.**
1. Bank `chosenMoveByBattler` per battler at selection: the selected slot's move, or the Encore move
   (`battle_main.c:4194`).
2. Reset it to `MOVE_NONE` at `BattleTurnPassed`, and leave it `MOVE_NONE` for battlers that skip
   selection (locked or recharging).
3. In the action prologue, after the noValidMoves / locked / Encore arms, run
   `drawActionMoveTarget` (`src/engine/factoryBattleScriptFullTurnDecision.ts:1574-1603`, caller
   `:1654`) when `moves[chosenMovePosition] !== chosenMoveByBattler`. Today `actionMoveId` (`:2367`)
   reads only the live slot.

**Who is affected.** Every locked `MOVE_TARGET_SELECTED` user hit by a faster sleep / freeze / Spite:
two-turn charge moves, Rollout and Ice Ball. Thrash, Outrage, Petal Dance and Uproar
(`MOVE_TARGET_RANDOM`) and Bide (user-targeted) also take `:133`, but in singles
`GetMoveTarget` draws nothing for them. Fly, Dig and Dive users are semi-invulnerable on the locked
turn.

### R4 — #139 Focus Punch pre-pass (receipt `rcp143-r4-focuspunch-prepass.json`)

**Scenario.** BRELOOM (Giga Drain / Leech Seed / Focus Punch / Headbutt, Speed 90) vs a faster
JOLTEON (Sand-Attack ×4, Speed 150; `MOVE_TARGET_SELECTED`, no damage). The control arm picks Giga
Drain. All four arms (OFF/ON × Focus Punch/control) were run twice fresh with a dense PNG every frame
(1–766) and are byte-identical, including the per-frame RGB hashes. The OFF PNGs at frames 150 and 230
and the ON PNG at frame 140 were read to confirm the text and the animation.

| frame | Scene OFF (`:8014`) | Scene ON (`:8012` profile) |
|---|---|---|
| turn order fixed → `CheckFocusPunch_ClearVarsBeforeTurnStarts` | 68 → 69 | 68 → 69 |
| `BattleScript_FocusPunchSetUp` runs | 70 – 206 (136 f) | 70 – 296 (226 f) |
| empty box (`STRINGID_EMPTYSTRING3`) | 71 | 71 |
| `B_ANIM_FOCUS_PUNCH_SETUP` | none (`BattleScript_Pausex20` stands in) | `General_FocusPunchSetUp` active **76 – 195 (120 f)**, 3× EndureEffect |
| "BRELOOM is tightening its focus!" | **108** | **198** |
| `RunTurnActionsFunctions` (action 1) | 207 | 297 |
| "Foe JOLTEON used SAND-ATTACK!" | 214 | 304 |
| `Random()` in the pre-pass | **0** | **0** |
| control: turn order → actions → Jolteon's box | 36 → 38 → 45 | 36 → 38 → 45 |

- **Port today:** `STRINGID_USEDMOVE > STRINGID_DEFENDERSSTATFELL > STRINGID_USEDMOVE …`. The pre-pass
  is missing, while the draws already match the ROM (acc, acc, crit, dmg, SEWC). The control arm
  PASSes today.
- **Predicted post-fix:** `message STRINGID_EMPTYSTRING3`, `animation FOCUS_PUNCH_SETUP`,
  `message STRINGID_PKMNTIGHTENINGFOCUS`, then today's events unchanged. No RNG moves.
- **Fix shape.** In `src/engine/factoryBattleScriptFullTurnDecision.ts`, between turn-order fixing and
  action 1 (`initialState` built at `:3181-3197`, `action1` at **:3199**; the movers are fixed at
  `:3161-3168`), walk battlers 0..1 in index order. For each battler whose chosen move this turn is
  `MOVE_FOCUS_PUNCH` and that is not asleep, not Truant-loafing and not noValidMoves, run
  `BattleScript_FocusPunchSetUp` as its own end2 script, with the attacker set to that battler. This
  is the same `gChosenMoveByBattler` bank as R3 (source `battle_main.c:4914`).

## Reproduce

```sh
# ROM side (one card per process; add --png-dir/--png-range for dense PNGs)
python3 tools/run-mgba-probe.py /tmp/r1.json -- python3 tools/probe/probe-rcp143-random-callers.py \
  tools/probe/rcp143/r1-thrash-tauros-steelix-off.json /tmp/r1.json --attribute 0:1464
#   R2 card r2-covet-linoone-gulpin-stickyhold-off.json (0:1464); R3 r3-solarbeam-snorlax-parasect-spore-off.json (0:3664);
#   R3 control r3-control-transform-ditto-snorlax-off.json (0:1464); R4 r4-focuspunch-{breloom-jolteon,control-gigadrain}-{off,on}.json (0:766)
python3 tools/probe/build-rcp143-receipt.py tools/probe/rcp143/r1-spec.json /tmp/r1.json /tmp/r1b.json tools/probe/receipts/rcp143-r1-thrash-lockin-off.json
python3 tools/probe/build-rcp143-r4-receipt.py tools/probe/rcp143/r4-spec.json tools/probe/receipts/rcp143-r4-focuspunch-prepass.json \
  off-focus-punch=<a>,<b> off-control=<a>,<b> on-focus-punch=<a>,<b> on-control=<a>,<b>
# Port side + PASS/FAIL (exit 1 = FAIL; --write refolds port/comparison/predictedPostFix into the receipt)
node --experimental-strip-types tools/probe/verify-rcp143.ts tools/probe/receipts/rcp143-r1-thrash-lockin-off.json
node --experimental-strip-types tools/probe/verify-rcp143.ts tools/probe/receipts/rcp143-r2-covet-stickyhold-off.json
node --experimental-strip-types tools/probe/verify-rcp143.ts tools/probe/receipts/rcp143-r3-getmovetarget-133-off.json
node --experimental-strip-types tools/probe/verify-rcp143.ts tools/probe/receipts/rcp143-r3-control-transform-off.json   # PASS today
node --experimental-strip-types tools/probe/verify-rcp143-r4.ts
npx vitest run tests/rcp143Receipts.test.ts   # hermetic shape pins (17 tests)
```

**For the fixing worker.** `tests/rcp143Receipts.test.ts` pins `verdictToday: "FAIL"`, so after each
fix rerun the matching verifier with `--write` and flip that pin to `PASS` deliberately. The Scene
ON R4 timings are ROM facts and stay pinned as they are.

## Premises in the ISSUES entries that turned out false or drifted

- **#140:** "chosen slot overwritten by Mimic/Transform" cannot happen in singles (see R3 and its
  control). The reachable route is a lock cancelled mid-turn with `gChosenMoveByBattler == MOVE_NONE`.
  The "Carriers: Mimic 2, Transform 1" count is therefore the wrong population; see R3, "Who is
  affected".
- **#141 consequence "no message differs":** true of the mechanism itself, but the one-draw offset
  changes later outcomes within the same turn or the next. In R1, Steelix's turn-1 Tackle misses on the
  ROM and hits in the port; in R2, the port's turn-2 Covet crits. Messages therefore differ downstream.
- **#141 recipe (1) "turn-1 draws attributed to seteffectwithchance (ROM 2, port 1)":** that holds
  for the Thrash user's own action only. Counting the whole turn, the port also shows 2, because the
  offset makes Steelix hit and spend its own `seteffectwithchance`. The wasted roll also shows on turn
  1 in R2 (the recipe said "window turn 2+").
- **#141 port cites drifted:** `battleScriptHitChainOpcode.ts:3917-3921` now points at the
  **already-locked** arm, which is correct. The faulty advance is at `:3945` (function `:3909`). The
  Sticky Hold `"call"` moved from `:3122-3138` to `:3148-3162` (`:3160`). The `seteffectwithchance`
  handler is at `:4060`. The machine `:998-1009` / `:1010-1021` cites are unchanged.
- **#140 precedent cite:** `tools/probe/probe-issue140-getmovetarget-off.py` and
  `issue140-getmovetarget-off.json` give `battle_util.c:98-146` / `:119-122` as `GetMoveTarget`. Those
  lines are `HandleAction_UseMove`; `GetMoveTarget` is at `:3828` (loop `:3850-3853`). The branch
  citations (`:105/:117/:128/:133`) are right.
- **#139:** `factoryBattleScriptFullTurnDecision.ts:3013-3030` is now just the head of
  `reduceFactoryFullTurnDecision`; the turn-order → action-1 seam is `:3159-3213`. "Shifts by one box"
  is really two `printstring`s (an empty box, then the focus message), costing 137 frames on Scene OFF
  and 227 on Scene ON. The rest of the entry is confirmed, including that the pre-pass draws no RNG.
