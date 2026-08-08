# ISSUES #83 diagnosis — the unmodeled pre-decision draw is `gRandomTurnNumber`; the reach tie-slot divergence has a second, alignment-dependent cause

**Located 2026-08-08 by a bounded MAIN worker** using the committed
`attribute-factory-ai-random-callers.py` sRandCount + targeted-single-step
instrument, run on seed-modified copies of the committed MirrorCoat fixtures
(`tools/battle-lab/mechanic-factory-ai-cv-mirrorcoat-{control,reach}-off.json`,
seed overridden to 99 / 1), plus a new score-array + AI-script-pointer probe
(committed as `tools/probe/attribute-factory-ai-mirrorcoat-scores.py`,
`tools/probe/trace-ai-script-pointer.py`, `tools/probe/trace-if-has-move-counter3.py`).
Raw evidence: `tools/compare/evidence/issue83/`.

## 1. The seed-99 control extra draw: `gRandomTurnNumber = Random()` in `BattleTurnPassed`

Every turn's decision window opens with **one pre-decision draw** attributed at
`BattleTurnPassed+0x157` (LR `0x803bb13`; `bl Random` at `0x803bb0e`), which is
`src/battle_main.c:4013`:

```c
    BattlePutTextOnWindow(gText_EmptyString3, B_WIN_MSG);
    gBattleMainFunc = HandleTurnActionSelectionState;
    gRandomTurnNumber = Random();          // <-- 4013
```

`BattleTurnPassed` runs at the turn boundary, *after* the previous turn's moves
and *before* `HandleTurnActionSelectionState` → `BattleAI_ChooseMoveOrAction`.
So the AI decision's scoring draws all land **one LCG step after** this draw.
The engine's standalone `chooseFactoryAiScoredDecision` does not model it, and
the verifier seeds the policy with the RNG value *before* it — so the engine's
setup/CV/tie draws start one step early. (The engine's battle kernel already
models `gRandomTurnNumber` at its turn boundary —
`factoryBattleScriptFullTurnDecision.ts:2254`; the gap is in the standalone
scored policy / verifier seam.)

Seed-99 control turn-2 (window frames 352/359/360, sRandCount 8):

| # | frame | caller | meaning |
| --- | ---: | --- | --- |
| 1 | 352 | `BattleTurnPassed+0x157` | `gRandomTurnNumber = Random()` |
| 2-5 | 359 | `BattleAI_SetupAIData+0x83` ×4 | per-slot `simulatedRNG` |
| 6 | 360 | `Cmd_if_random_less_than` | MirrorCoat `roll-6` (`<50`, not jumped) |
| 7 | 360 | `Cmd_if_random_less_than` | MirrorCoat `roll-7` (`<100`, jumped, no +4) |
| 8 | 360 | `ChooseMoveOrAction_Singles+0xf7` | `Random() % numOfBestMoves` tie |

The engine models only draws 2-8 (7 draws: setup 4 + roll-6 + roll-7 + tie)
starting from the pre-draw RNG — hence **+1 short**, endpoint `2270394938` vs
ROM `1352996645`. Control seed 1 "matches" only *coincidentally*: its `roll-6`
lands at the ROM's step-6 value (45, `<50` → jumped → no roll-7), and the
engine's `roll-6`@5 (137, `>=50`) + `roll-7`@6 (45, `<100` → jumped) produce the
same final scores `[100,100,100,100]` and the same tie value — so both choose
slot 0 despite drawing the two rolls at different LCG steps.

## 2. The reach tie-slot divergence: same misalignment + a second, distinct cause

Reach turn-2 draws the SAME 7-draw shape as control seed-1 — `gRandomTurnNumber`
@1, setup @2-5, ONE `Cmd_if_random_less_than` @6 (the MirrorCoat `ScoreUp4`
`<100` roll, scriptPtr `0x82dd9f6`, moveConsidered 243), tie @7 — and the ROM's
live `AI_THINKING_STRUCT->score[]` ends `[100,100,100,100]` (the ScoreUp4 roll
jumped: step-6 value 6445, `%256 = 45 < 100`). The tie value (step 7,
`u16 = 56855`, `% 4 = 3`) → slot 3. **The engine's reach model is
`[setup@1-4, roll-7@5, counter-bonus@6, tie@7]`**: its `roll-7`@5 (value 59785,
`%256 = 137 >= 100`) falls through → MirrorCoat 104, and it fires a
`counter-bonus-roll` the ROM never draws. Same 7-draw total and same endpoint
(so the tie value is identical) but different scores → different tie set → slot 0.

So the reach tie divergence is the **same one-step misalignment** (roll values
land one step earlier, flipping the ScoreUp4 outcome) **plus a second cause**:
**the ROM's `AI_CV_Counter8` counter-bonus-roll does not fire at all.**

### 2a. Why `AI_CV_Counter8` never fires: an unaligned `if_has_move` operand read

The reach's Counter slot (slot 1, moveConsidered 68) *does* enter `AI_CV_Counter`
(scriptPtr trajectory `0x82dd431 → … → 0x82dd46d = AI_CV_Counter3`), but
`AI_CV_Counter3`'s `if_has_move AI_USER, MOVE_MIRROR_COAT, AI_CV_Counter8`
**falls through** to the power-0 path (→ Counter5 → Counter6 → Ground in the
physical-type list → End, zero draws) instead of jumping to Counter8. The
register-level capture inside `Cmd_if_has_move` shows why:

- `Cmd_if_has_move`'s non-BUGFIX path reads its move operand through a pointer
  cast: `const u16 *movePtr = (u16 *)(gAIScriptPtr + 2);`
  (`battle_ai_script_commands.c:1811`, `#ifndef BUGFIX`).
- The compiler emits `ldrh r5, [r5, #2]`. At `AI_CV_Counter3`, the script
  pointer `0x082DD46D` is **odd**, so the operand load at `0x082DD46F` is an
  **unaligned halfword access**. On this emulator it yields `0x010000F3` (not
  zero-extended `0x000000F3`), so the 32-bit compare
  `gBattleMons[sBattler_AI].moves[i] == *movePtr` (243 vs 0x010000F3) never
  matches. Captured at both turns: `sBattler_AI=1`, `moves=[243,68,150,150]`,
  `operand=0x010000F3`, `r0=243` → beq not taken → fallthrough.
- `AI_CV_MirrorCoat3`'s sibling `if_has_move AI_USER, MOVE_COUNTER` works
  because `0x082DD996` is **even** (`+2 = 0x082DD998`, aligned) → operand 68
  read correctly → the Counter jump fires (ScoreUp4).

So the ROM's failure to fire `Counter8` is a **build-layout artifact**: it
depends on where the assembler placed `AI_CV_Counter3` (odd) vs
`AI_CV_MirrorCoat3` (even) in this pinned ROM. The engine's
`userMoves.includes(MOVE_MIRROR_COAT)` port (`factoryAiCheckViability.ts:7519`)
cannot reproduce it without knowing script-label addresses.

## 3. Verdict

- **Named cause:** `gRandomTurnNumber = Random()` at `src/battle_main.c:4013`
  (inside `BattleTurnPassed`), drawn once per turn before the AI decision —
  this is the extra draw in the seed-99 control row and the source of the
  one-step misalignment behind the reach tie divergence.
- **Tie divergence:** NOT the same cause alone. Reach needs BOTH (a) modeling
  the pre-decision `gRandomTurnNumber` draw at the decision seam, and (b) the
  `AI_CV_Counter8` counter-bonus-roll staying unfired, which is an unaligned-
  halfword-read artifact of the pinned build (odd `AI_CV_Counter3` address).
- **Fix not unambiguous:** (a) is a faithful named construct, but landing it
  changes the banked draw ordinals and would require the seam to seed the
  policy post-draw (and the control-seed-1 "match" is a coincidence that would
  need re-derivation). (b) is a layout-dependent artifact, not a portable
  source construct. Per the diagnosis-step rule, **no patch was attempted**;
  the finding is the deliverable.

## 4. Next step for a fix worker

1. Port the pre-decision `gRandomTurnNumber` draw into the decision seam that
   feeds `chooseFactoryAiScoredDecision` (battle kernel already has it at its
   turn boundary; the standalone policy + verifier do not), so the policy is
   seeded with the RNG *after* that draw.
2. Then re-run the mirrorcoat receipts: control seed 1 must be re-derived (its
   7-draw pin becomes gRandomTurnNumber + setup 4 + roll-6 + tie), control
   seed 99 should match 8 draws, and reach needs the `counter-bonus-roll`
   dropped (with a hard-coded, evidence-backed exception or a general "odd
   script address ⇒ if_has_move reads garbage" model — the latter is the only
   portable form). Confirm against the score-array evidence here before
   touching banked receipt numbers.
