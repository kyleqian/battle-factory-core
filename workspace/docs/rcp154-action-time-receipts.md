# rcp154 — stock-ROM receipts for two action-time move choices exposed by rng146 (follow-ups to ISSUES #140)

Evidence only; no engine file is touched. These receipts use rcp143's method
(`docs/rcp143-engine-fix-receipts.md`):

- Stock ROM, Battle Scene OFF profile, `mechanicLab` `overrides.parties` with legal sets. Every move was checked
  against `level_up_learnsets.h` / `tmhm_learnsets.h`, and abilities and speeds against `species_info.h`.
- Two process-isolated, fresh direct mGBA runs per card. The probe output is byte-identical between them.
- `sRandCount` per-frame deltas are cross-checked against an independent `gRngValue` LCG replay.
- A fresh emulator single-steps every frame that drew and names each `Random()` caller by LR. The attribution
  reconciles 100 %.
- One PNG is saved 24 frames after every displayed-string change. The key ones were read.
- The port side reruns each scenario through the TS full-turn kernel at HEAD. It is seeded from the ROM's own
  `gRngValue`, with the ROM's AI draws injected between turns.

Beyond rcp143, `verify-rcp154.ts` also compares the number of moves each side **announces** per turn
(`STRINGID_USEDMOVE`) with the ROM's per-turn `HandleAction_UseMove` dispatch count. One case (C1f) diverges
only there.

## Results

| receipt | ROM (2 runs byte-identical, draws attributed) | port at HEAD | first divergence |
|---|---|---|---|
| **C1** player dragged (`rcp154-c1-dragged-in-before-acting-off.json`) | RHYHORN banks ROAR. The faster PIDGEOT's WHIRLWIND drags in ZIGZAGOON, which **takes no action at all**: no move, no `GetMoveTarget`. Turn 1 draws: acc, forcerandomswitch pick, BTP (3). Same on turn 5 (POOCHYENA). 97/97 attributed | runs the dragged-in mon's own slot-0 TACKLE: `GetMoveTarget`, then acc / crit / dmg / SEWC (8 draws, 2 `USEDMOVE`) | **FAIL**, turn 1 index 2 |
| **C1f** census-811 side (`rcp154-c1f-census811-shape-foe-dragged-off.json`) | BEAUTIFLY's faster WHIRLWIND drags out the foe's RHYHORN, which had banked ROAR. Dragged-in VOLBEAT (turns 1/3/5) and **GLOOM** (turn 7) never act. 76/76 attributed | announces the dragged-in mon's MOONLIGHT ("HP is full") every time. Draws and HP match, because MOONLIGHT draws nothing | **FAIL** by dispatch count (ROM `[1,2,1,2,1,2,1]`, port `[2,2,2,2,2,2,2]`) |
| **C2** Encored into a selected-target move (`rcp154-c2-encored-mid-turn-selected-off.json`) | SNORLAX selects DEFENSE CURL (banked `gChosenMoveByBattler` 111). The faster PLUSLE's Encore lands first (TACKLE, pos 0). SNORLAX then **uses TACKLE** via `battle_util.c:111-117`, with **one `GetMoveTarget` draw** (`GetMoveTarget+0x18e`). 86/86 attributed | runs the turn-start DEFENSE CURL (`STRINGID_DEFENDERSSTATROSE`): no `GetMoveTarget`, no TACKLE chain | **FAIL**, turn 2 index 2 |
| **C2u** Encored into a user-target move (`rcp154-c2u-encored-mid-turn-user-target-off.json`) | Same card with the opposite slot plan: SNORLAX banks TACKLE, is Encored into DEFENSE CURL (pos 1) and **uses DEFENSE CURL**. `GetMoveTarget(MOVE_TARGET_USER)` draws nothing, so the turn is acc, Encore timer, BTP. 57/57 attributed | runs the turn-start TACKLE: acc / crit / dmg / SEWC | **FAIL**, turn 2 index 2 |

Every verifier FAILs today. In each case the predicted post-fix port sequence (`predictedPostFix` in the receipt) is
the ROM's own sequence: the same (reason, `rngBefore`) draws, HP and per-turn dispatch counts. Neither fix adds a
draw site.

## C1 — a battler dragged in before it acts

**Answers.**

- **Does the dragged-in battler take the replaced battler's turn?** No. It runs neither the banked move
  (`gChosenMoveByBattler`, ROAR 46) nor its own slot move at `gCurrMovePos` (TACKLE 33 / MOONLIGHT 236).
- **Draws.** Its action draws nothing. `HandleAction_UseMove` is never entered for it that turn, so the `:85`
  absent check, the Encore arms and the `:130-134` arm are never reached.
- **The next turn.** It selects and acts normally. Turn 2 of C1: ZIGZAGOON TACKLE,
  `chosenMoveByBattler == slot move`.

**The source lines that decide it** (the RAM watch shows each step):

1. `BattleScript_SuccessForceOut` → `BattleScript_TrainerBattleForceOut` (`data/battle_scripts_1.s:3324-3341`) ends
   in `switchineffects BS_TARGET` (`:3340`).
2. `Cmd_switchineffects` (`battle_script_commands.c:5219`) has a no-Spikes arm. When neither
   `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN)` nor `ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN)` fires
   (`:5265-5266`), `:5270-5274` write `gActionsByTurnOrder[i] = B_ACTION_CANCEL_PARTNER` for the switched-in
   battler's turn-order slot.
3. `include/battle.h:39-40`: `B_ACTION_CANCEL_PARTNER` is **12, the same value as `B_ACTION_FINISHED`**.
4. `HandleAction_ActionFinished` (`battle_util.c:658-663`) loads `gCurrentActionFuncId = gActionsByTurnOrder[1]`,
   which is 12. On the next frame `RunTurnActionsFunctions` (`battle_main.c:4937`) dispatches
   `HandleAction_ActionFinished` again, and the turn ends.
   - RAM: frame 256 has `turnActionNumber 1, actionFuncId 12`; frame 257 has `turnActionNumber 2` and goes to
     `HandleEndTurn_ContinueBattle`.
   - PNGs: frame 241 shows "ZIGZAGOON was dragged out", and frame 287 goes straight to "What will ZIGZAGOON do?".
5. `Cmd_forcerandomswitch` (`:7185`) only does the pick. Its loop is `do { i = Random() % monsCount; } while (...)`
   at `:7346`, with `monsCount = PARTY_SIZE`, so empty slots 3-5 are rejected draws (up to 10 picks on one turn).
   It leaves the action in place. `gBattleStruct->monToSwitchIntoId` is reset by `HandleAction_ActionFinished`.

**Not exercised: a switch-in ability.** The `:5296` advance is inside the cancel arm, so when an ability fires
`switchineffects` re-runs after the ability script, and the cancel should land on that second pass. Intimidate and
Trace return 0 from `AbilityBattleEffects` and take the cancel arm directly; see the port note at
`battleScriptSwitchinOpcode.ts:1284-1290`.

**Port at HEAD is wrong. Fix shape:**

1. `src/engine/battleScriptSwitchinOpcode.ts:1325-1338`. This ports the `if (!Ability && !Item)` body: it clears
   `SIDE_STATUS_SPIKES_DAMAGED` and advances. It must also write `actionsByTurnOrder[i] = 12` for every `i` with
   `battlerByTurnOrder[i] === battler` (source `:5270-5274`). Both fields already exist in the rules context
   (`battleScriptRulesContext.ts:887-897`).
2. `src/engine/factoryBattleScriptFullTurnDecision.ts:2986`. Action 2 is skipped only when
   `actionsByTurnOrder[1] === B_ACTION_TRY_FINISH`, the Pursuit arm. It must also skip on `12`.

**Population.** Roar and Whirlwind are the only priority -6 moves and the only `forcerandomswitch` users. The
dragged mon has not acted yet only when **both** sides chose a -6 move and the faster one drags the other. Census
0..999 has one such battle, 811. rng146's note on 811 ("Now GLOOM's action runs its own slot-3 move (MOONLIGHT
236)") describes the port, not the ROM. The ROM runs **no** action. Both the pre-F3 behaviour (ROAR as GLOOM)
and the post-F3 behaviour (MOONLIGHT) are wrong; C1f stages exactly that shape.

## C2 — Encored mid-turn before acting

**Answers.**

- **Which move this turn?** The **encored** move. In C2, SNORLAX's turn-2 dispatch shows
  `gChosenMoveByBattler[0] = 111` (DEFENSE CURL, banked at selection, `battle_main.c:4399`),
  `encore = [TACKLE, pos 0, timer 4]`, then `gCurrentMove 33`, `gCurrMovePos 0`. The PNG at frame 598 shows
  "SNORLAX used TACKLE!".
- **Which arm decides it?** `HandleAction_UseMove`'s first Encore arm (`battle_util.c:111-117`). It runs at the
  battler's own action, so an Encore written earlier in the same turn by `Cmd_trysetencore`
  (`battle_script_commands.c:8017`, timer `(Random() & 3) + 3` at `:8039`) applies.
- **Draws.** It pays `GetMoveTarget(gCurrentMove)` (`:117`). For a `MOVE_TARGET_SELECTED` move that is
  `do { Random() % gBattlersCount } while (target == attacker ...)` (`:3850-3853`). On turn 2 that is 1 draw
  (61455 is odd). On the following encored turns it is geometric: 7 draws on turn 3. For a user-targeted move
  (C2u) it draws nothing.
- **Encored slot overwritten.** That arm (`:119-128`) is unreachable here.

**Port at HEAD is wrong.** rng146's guess was right: the port decides from the turn-start state.

- `factoryBattleScriptFullTurnDecision.ts:3151-3155` computes `playerRetargets` / `trainerRetargets` with
  `actionRetargetsAtExecution(rules.rulesContext, ...)` (`:1628-1636`) on the turn-start context.
- The move id and slot come from `actionMoveId` (`:2416-2442`) on the same context.
- `runMoveAction` (`:1677-1690`) re-checks only the `:130-134` arm at action time
  (`actionTakesChosenMoveChangedArm`, `:1666-1675`). For action 2 (call site `:3012-3022`), an Encore set by
  action 1 is never seen.

**Fix shape.** In `runMoveAction`, before the `:130-134` check, evaluate both Encore arms on the action-time
battler (`priorState.rulesContext.battlers[mover]`):

- **`:111-117`.** If `encoredMove != 0` and `moves[encoredMovePos] == encoredMove`, the executed move is
  `encoredMove`, the move slot is `encoredMovePos` (this also covers the PP deduction and `chosenMovePositions`),
  and it retargets via `drawActionMoveTarget`.
- **`:119-128`.** Otherwise, if `encoredMove != 0`: clear Encore, run `moves[encoredMovePos]`, and retarget.

Only when neither arm fires does it fall through to `:130-134` / plain. For action 1 the action-time state is the
turn-start state, so this replaces the turn-start Encore read rather than adding to it. The post-fix turn 2 is:

- **C2:** acc, Encore timer, `GetMoveTarget`, acc, crit, dmg, SEWC, BTP.
- **C2u:** acc, Encore timer, BTP.

**Population.** A faster Encore user against a slower target that has not acted, already has a `gLastMoves` entry
from an earlier turn, selected a different move this turn, and is not already encored. Not censused here.

## Instruments (new files only)

- `tools/probe/probe-rcp154-action-time.py` is rcp143's probe plus:
  - `--slot-plan`, the player's move slot per move-menu entry. An A pulse inside `HandleInputChooseMove` becomes
    RIGHT/LEFT/DOWN/UP until `gMoveSelectionCursor[0]` matches the plan. The realized inputs are replayed in pass
    2, and every swap is listed in `inputSubstitutions`.
  - Action-time watches: `gChosenMoveByBattler`, `gCurrMovePos`, `gChosenMovePos`, `gChosenMove`, active species,
    moves and party index, `gLastMoves`, the `gDisableStructs` Encore fields (offsets 0x06 / 0x0C / 0x0E,
    size 0x1C), and the player controller function.
  - `--png-after-message N`.
- `tools/probe/build-rcp154-receipt.py` is rcp143's fold plus per-turn `actions` (each
  `HandleAction_UseMove` dispatch), `actionCursor` (each `gCurrentTurnActionNumber` change), per-turn `messages`
  and PNG hashes.
- `tools/probe/verify-rcp154.ts` stages both benches, takes the player's slot/target per turn from
  `portPlayerSlots` / `portPlayerTargets`, and adds the `USEDMOVE`-vs-dispatch check. It reuses rcp143's caller
  map and adds `Cmd_forcerandomswitch` and `Cmd_trysetencore`.
- `tools/probe/rcp154PortDriver.ts` is rcp143's driver copied with one change: each decision comes from the
  request's `legalDecisions`. A user-targeted trainer move such as MOONLIGHT needs its own target. When the
  trainer's planned slot is unusable, it falls back to the first legal use-move, because all four trainer slots
  are one move.
- `tests/rcp154Receipts.test.ts` has 20 hermetic tests that read only the committed JSON.
- Cards and specs live in `tools/probe/rcp154/`. C2 and C2u share one card (PLUSLE: Bold, 255 HP / 255 Def EVs,
  so it survives five turns).

## Reproduce

```sh
# ROM side: one card per process, twice; PNGs optional
python3 tools/run-mgba-probe.py /tmp/c1a.json -- python3 tools/probe/probe-rcp154-action-time.py \
  tools/probe/rcp154/c1-whirlwind-drags-roar-user-off.json /tmp/c1a.json --attribute 0:2404 --slot-plan 0 \
  --png-dir /tmp/png-c1 --png-after-message 24
#   C1f: c1f-census811-shape-foe-dragged-off.json --slot-plan 0
#   C2:  c2-encore-snorlax-plusle-off.json --slot-plan 0,1      C2u: same card --slot-plan 1,0
python3 tools/probe/build-rcp154-receipt.py tools/probe/rcp154/c1-spec.json /tmp/c1a.json /tmp/c1b.json \
  tools/probe/receipts/rcp154-c1-dragged-in-before-acting-off.json /tmp/png-c1
# Port side: exit 1 = FAIL; --write folds port / comparison / predictedPostFix; --events prints port events
node --experimental-strip-types tools/probe/verify-rcp154.ts tools/probe/receipts/rcp154-c1-dragged-in-before-acting-off.json
node --experimental-strip-types tools/probe/verify-rcp154.ts tools/probe/receipts/rcp154-c1f-census811-shape-foe-dragged-off.json
node --experimental-strip-types tools/probe/verify-rcp154.ts tools/probe/receipts/rcp154-c2-encored-mid-turn-selected-off.json
node --experimental-strip-types tools/probe/verify-rcp154.ts tools/probe/receipts/rcp154-c2u-encored-mid-turn-user-target-off.json
npx vitest run tests/rcp154Receipts.test.ts
```

**For the fixing worker.** `tests/rcp154Receipts.test.ts` pins `verdictToday: "FAIL"` and each first divergence.
After a fix, rerun the matching verifier with `--write` and flip those pins deliberately. The ROM-side pins stay.
