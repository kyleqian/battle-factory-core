# `END3` / `BattleScriptPushCursorAndCallback` design scout

Side-lane design scout for the named architectural gap blocking
`ENDTURN_ABILITIES` slices 1-2 (Speed Boost, Rain Dish, Shed Skin) --
`docs/endturn-abilities-items-ground-truth.md` §1b/§5. That doc names the
gap correctly but glosses the exact mechanism; this doc pins it precisely
from source, proposes the engine shape, maps every consumer that changes,
and ships an **UNWIRED** prototype (`src/engine/battleScriptCallbackStack.ts`
+ `tests/battleScriptCallbackStack.test.ts`) proving the control-flow model.
No production module is touched -- `battleEndTurnOrchestration.ts` and
`battleScriptMachine.ts` are unchanged; §4's checklist is the follow-up
main-lane step.

## 1. Source semantics, pinned exactly

### 1.1 The two stacks, and the one wrong symbol name to correct

`docs/endturn-abilities-items-ground-truth.md` §1b says `BattleScriptPushCursorAndCallback`
"pushes the current script cursor and callback function onto
`gBattlescriptCurrInstrStackPtr`". **That symbol does not exist anywhere in
`reference/pokeemerald`** (`grep -rn gBattlescriptCurrInstrStackPtr reference/pokeemerald/`
returns nothing). This doc's own correction, stated precisely: there are
**two separate stacks**, pushed together by one call but never referred to
by that name:

- `gBattleResources->battleScriptsStack` (`struct BattleScriptsStack`,
  `include/battle.h:226`) -- an array of script-cursor pointers. `BattleScriptPush`/
  `BattleScriptPushCursor`/`BattleScriptPop` (`battle_util.c:961-974`) push/pop
  this one. **This is the SAME stack `Cmd_call`/`Cmd_return` use**
  (`battle_script_commands.c:3975-3979`, `:3945-3948`) -- CALL/RETURN and
  PushCursorAndCallback/end3 are different call-sites onto one shared array,
  not two independent mechanisms.
- `gBattleResources->battleCallbackStack` (`struct BattleCallbacksStack`,
  `include/battle.h:227`) -- an array of `gBattleMainFunc` function pointers.
  Only `BattleScriptExecute` and `BattleScriptPushCursorAndCallback` push
  this one (`battle_util.c:3201-3215`); only `RunBattleScriptCommands_PopCallbacksStack`
  (self-pop on the script's own end/end2, `battle_main.c:5251-5258`) and
  `Cmd_end3` (`battle_script_commands.c:3966-3973`) pop it.

Both reset to `size = 0` exactly once, at battle init
(`battle_main.c:3099-3100`) -- **not** per-turn, per-action, or per end-turn
pass. They persist and grow/shrink across the whole battle.

### 1.2 `BattleScriptExecute` vs `BattleScriptPushCursorAndCallback`, side by side

```c
void BattleScriptExecute(const u8 *BS_ptr)
{
    gBattlescriptCurrInstr = BS_ptr;
    gBattleResources->battleCallbackStack->function[gBattleResources->battleCallbackStack->size++] = gBattleMainFunc;
    gBattleMainFunc = RunBattleScriptCommands_PopCallbacksStack;
    gCurrentActionFuncId = 0;
}

void BattleScriptPushCursorAndCallback(const u8 *BS_ptr)
{
    BattleScriptPushCursor();   // pushes gBattlescriptCurrInstr onto battleScriptsStack
    gBattlescriptCurrInstr = BS_ptr;
    gBattleResources->battleCallbackStack->function[gBattleResources->battleCallbackStack->size++] = gBattleMainFunc;
    gBattleMainFunc = RunBattleScriptCommands;   // NOT the _PopCallbacksStack variant
}
```
(`battle_util.c:3201-3215`.) The load-bearing difference: `BattleScriptExecute`
does **not** push a script cursor (nothing calls it mid-script expecting a
`return`-shaped resume) and installs the *self-popping* callback
(`RunBattleScriptCommands_PopCallbacksStack`, which pops `battleCallbackStack`
itself the instant the script's own `end`/`end2` sets
`gCurrentActionFuncId = B_ACTION_TRY_FINISH`, `battle_main.c:5251-5258`).
`BattleScriptPushCursorAndCallback` pushes a script cursor too, and installs
the **non**-self-popping `RunBattleScriptCommands` -- the callback stack only
unwinds when the new script itself explicitly hits `end3`. This is exactly
why the existing `runTickScript`/`startBattleScriptExecute` helper (models
only the `BattleScriptExecute` shape) cannot host these three scripts: it
resets `callStack` to `[]` and treats any `"terminal"` halt (end **or**
end2) as "done" -- there is no code path in it that pushes a caller
cursor+callback pair, and no code path that pops one.

### 1.3 `Cmd_end3`, and what it actually restores

```c
// Pops the main function stack
static void Cmd_end3(void)
{
    BattleScriptPop();
    if (gBattleResources->battleCallbackStack->size != 0)
        gBattleResources->battleCallbackStack->size--;
    gBattleMainFunc = gBattleResources->battleCallbackStack->function[gBattleResources->battleCallbackStack->size];
}
```
(`battle_script_commands.c:3966-3973`.) Two independent restores: (1)
`BattleScriptPop()` restores `gBattlescriptCurrInstr` to whatever
`BattleScriptPushCursor()` saved: (2) the callback-stack pop restores
`gBattleMainFunc`. **Note what `end3` does *not* do that `end`/`end2` both
do: set `gCurrentActionFuncId = B_ACTION_TRY_FINISH`**
(`battle_script_commands.c:3950-3964`). `end3` is not a "this action is
finished" signal -- it is purely "unwind one push-cursor-and-callback
frame." Whether anything downstream treats that as "the current action/turn
is over" depends entirely on what `gBattleMainFunc` gets restored to, which
is the crux of the next section.

### 1.4 The central question, answered from source: is the popped entry a script or a C callback?

**Both are possible -- source uses this ONE primitive for two structurally
different situations, distinguished only by what `gBattleMainFunc` held at
push time:**

**(a) End-turn abilities (Speed Boost / Rain Dish / Shed Skin): the
preempted caller is plain C, not a script.** The call chain, traced
function-by-function:

```
BattleTurnPassed()                              battle_main.c:3956  <- gBattleMainFunc == this, plain C
  DoBattlerEndTurnEffects()                      battle_util.c:1464 <- plain C call, not a script
    case ENDTURN_ABILITIES:
      AbilityBattleEffects(ABILITYEFFECT_ENDTURN, ...)  battle_util.c:1495, :2601
        case ABILITY_SPEED_BOOST:
          BattleScriptPushCursorAndCallback(BattleScript_SpeedBoostActivates)  battle_util.c:2648
```
Every frame above `BattleScriptPushCursorAndCallback` is a bare C function
call -- `gBattleMainFunc` at the moment of the push is **`BattleTurnPassed`
itself**, a plain function pointer, not `RunBattleScriptCommands`. So the
"caller cursor" `BattleScriptPushCursor()` saves is whatever stale value
`gBattlescriptCurrInstr` happened to hold (leftover from some unrelated,
already-finished script) -- **real C state, faithfully pushed and popped,
but never read again by anything in this call path.** When `end3` later
pops the callback stack, `gBattleMainFunc` becomes `BattleTurnPassed` again,
and on the *next* main-loop tick that function is invoked **from its own
top** (`TurnValuesCleanUp` -> `DoFieldEndTurnEffects` ->
`DoBattlerEndTurnEffects()` again). The actual "resume point" inside
`DoBattlerEndTurnEffects`'s switch comes entirely from
`gBattleStruct->turnEffectsTracker`/`turnEffectsBattlerId` -- two integers
that were already incremented *before* the script push happened
(`gBattleStruct->turnEffectsTracker++;` runs unconditionally right after the
`AbilityBattleEffects` call, `battle_util.c:1497`) and persist independently
of the callback/script-cursor stacks. **So for this call path, "resume the
original caller" means "re-invoke a plain C function from its top; the
actual continuation lives in separate tracker globals, not in anything
`end3` pops."** This directly corrects the predecessor doc's phrasing
("resumes the ORIGINAL caller... `DoBattlerEndTurnEffects`'s own re-entry
point") -- accurate about the eventual outcome, imprecise about mechanism:
nothing `end3` restores IS that re-entry point.

**(b) Mid-script ability activation (Intimidate, Trace): the preempted
caller genuinely is a running script.** `ABILITYEFFECT_ON_SWITCHIN` is
called from **two** places (`grep AbilityBattleEffects(ABILITYEFFECT` across
`src/*.c`): `battle_main.c:3872` (plain C, `TryDoEventsBeforeFirstTurn`-style
intro sequence -- same "(a)" shape as end-turn) **and**
`battle_script_commands.c:5265`, inside `Cmd_switchinabilities` -- itself an
opcode handler, reached only while `gBattleMainFunc == RunBattleScriptCommands`
(or `..._PopCallbacksStack`), i.e. while a script is genuinely running.
`BattleScriptPushCursorAndCallback(BattleScript_IntimidateActivatesEnd3)`
(`battle_util.c:3010`) fired from *this* call site really does preempt an
in-progress script: the popped script cursor on `end3` is the exact next
opcode of that real caller, and the popped `gBattleMainFunc` is
`RunBattleScriptCommands`, which will immediately read and execute at that
restored cursor. **This is a genuine mid-script continuation** -- the
"resume a real script" case the brief's question anticipated, just not the
one Speed Boost/Rain Dish/Shed Skin exercise.

**Conclusion or the whole design:** `end3` is one mechanical primitive
(pop-cursor, pop-callback, jump to whatever's restored) serving two
semantically different situations depending on the push-time caller. The
engine must model the primitive generically (§2), but the specific
registration this doc's brief targets (end-turn abilities) only ever
exercises flavor (a) -- resume is a bare "go back to running the end-turn
sweep," never a script cursor.

### 1.5 Can two abilities queue "at once"? No -- source structurally forbids nesting on this call path

`DoBattlerEndTurnEffects`'s own loop:
```c
while (gBattleStruct->turnEffectsBattlerId < gBattlersCount && gBattleStruct->turnEffectsTracker <= ENDTURN_BATTLER_COUNT)
{
    ...
    switch (gBattleStruct->turnEffectsTracker) { case ENDTURN_ABILITIES: ... break; ... }
    if (effect != 0)
        return effect;              // battle_util.c:1777-1778
}
```
Every case increments `turnEffectsTracker` unconditionally, but the instant
ANY case sets `effect != 0`, the function returns immediately -- `BattleTurnPassed`
returns too (its own `if (DoBattlerEndTurnEffects()) return;`,
`battle_main.c:3965-3966`), so **only one `BattleScriptPushCursorAndCallback`
can ever be outstanding at a time down this path.** The callback stack this
primitive uses for `ENDTURN_ABILITIES` never exceeds depth 1. Two different
battlers' Speed Boost absolutely **can and do** both fire within the same
overall end-of-turn resolution (confirmed by
`endturn-abilities-items-ground-truth.md` §3a's own live ledger: it fires
every tick, for every eligible battler, turn after turn) -- but strictly
**serialized**: battler A's entire push -> run -> `end3`-pop cycle completes
(across as many re-entrant `BattleTurnPassed` ticks as its OTHER end-turn
cases need), advancing `turnEffectsTracker` through the rest of battler A's
19 cases, before `ENDTURN_BATTLER_COUNT` resets the tracker and advances
`turnEffectsBattlerId` to battler B -- only then can battler B's own
`ENDTURN_ABILITIES` case even be reached. **Never nested, always sequential,
in turn order (`gBattlerByTurnOrder`).** The prototype's
"two battlers' Speed Boost" test proves exactly this shape.

### 1.6 The empty-stack `end3` case

`if (gBattleResources->battleCallbackStack->size != 0) size--;` guards the
decrement, but the very next line unconditionally reads
`function[gBattleResources->battleCallbackStack->size]` -- on an empty stack
this reads whatever stale function pointer was last left in slot 0 (never a
crash, never a null-deref guard beyond the size check). This path is
**unreachable in real play**: every script that terminates in `end3` is only
ever entered via a matching `BattleScriptPushCursorAndCallback`, so pushes
and pops always balance by construction. The prototype (§3) surfaces this
mismatch as an explicit `{kind: "underflow"}` result rather than fabricating
a "stale slot" return value -- a real registration bug (an `end3`-terminated
script wired without a matching push) should fail loudly in TypeScript, not
silently resume garbage the way the real console would.

## 2. Engine-side mapping

### 2.1 What `runTickScript` models today (`battleEndTurnOrchestration.ts:148-246`)

`startBattleScriptExecute` (`:149-166`) resets `callStack` to `[]` and jumps
to the entry label -- the `BattleScriptExecute` shape only (§1.2). `runScriptToOwnEnd`
(`:181-213`) loops `stepBattleScriptMachine` until a `"terminal"` halt
(end/end2, indistinguishable to this engine, per `battleScriptMachine.ts:560-568`'s
own comment) or an unsupported-opcode/branch barrier. `runTickScript`
(`:230-246`) composes these for one case's script. **Crucially**, the whole
module's own header comment (`:1-16`) already establishes the precedent this
design leans on: `runBattleEndTurnOrchestration` "drives the ENTIRE pass...
to completion in one call rather than literally modeling source's
frame-by-frame resumable tracker -- behaviorally identical for every
scenario this engine can construct today, since none of the modeled cases
ever block on a controller mid-tick." Speed Boost/Rain Dish/Shed Skin's
activation scripts (`PRINTSTRING`/`WAITMESSAGE`/`HEALTHBARUPDATE`/`ORWORD`/
`UPDATESTATUSICON`/`STATBUFFCHANGE`, all already-registered opcodes per the
ground-truth doc §5 slice 1) never block on player choice either -- so this
same "run synchronously to completion in one call" convention extends
cleanly to `END3`-hosting scripts. **The engine does not need genuine
cross-tick suspend/resume to register these three abilities** -- it needs
the push/pop bookkeeping modeled as a pure state transition *within* one
synchronous call, which is exactly what the prototype proves.

### 2.2 Chosen shape: an orchestration-level callback-stack cell, not a per-script rulesContext field

Two candidate homes considered:

- **A cell on `BattleScriptRulesContext`** (alongside `battlers`, `party`,
  etc.) -- rejected. `gBattleMainFunc` values (`BattleTurnPassed`,
  `RunTurnActionsFunctions`, `HandleTurnActionSelectionState`, ...) are
  **orchestration-level C callbacks**, not battle-rules state -- they have
  no read/write meaning to any opcode handler, and `rulesContext` is exactly
  the type every opcode handler in `battleScriptMachine.ts` sees and can
  mutate. Putting callback-stack frames there would let a stray opcode
  handler observe or corrupt continuation state it has no source analog for
  touching (no opcode ever reads/writes `gBattleMainFunc` or
  `battleCallbackStack` directly in source either).
- **An orchestration-level continuation stack, threaded alongside
  `MachineState` but outside `rulesContext`/`scheduler`/`rng`** -- chosen.
  This mirrors source exactly: `battleCallbackStack` is a field of
  `gBattleResources` (battle-global), not of any per-script state; only
  the small set of C functions that call `BattleScriptExecute`/
  `BattleScriptPushCursorAndCallback`/`end3` ever touch it. The prototype's
  `CallbackStackState` (a `readonly CallbackStackFrame[]`, each frame
  pairing the pushed script cursor with a `CallbackContinuation`) is exactly
  this cell, deliberately typed independent of any specific `RulesContext`
  so it composes with the existing generic `BattleScriptMachineState<RulesContext>`
  without becoming part of it.

The prototype's `CallbackContinuation` union (`{kind: "cCallback", name}` vs
`{kind: "script", programCounter, callStack}`) directly encodes §1.4's
finding: the end-turn registration only ever produces `"cCallback"`
continuations (naming `"BattleTurnPassed"`-equivalent, i.e. "resume the
end-turn sweep"); the `"script"` variant is modeled for fidelity to the
general primitive (Intimidate/Trace) but is **not exercised** by slice 1-2
and needs no real registration work until a future ON_SWITCHIN slice.

### 2.3 Registered-opcode-table shape (for the follow-up main-lane step, not implemented here)

`createBattleScriptControlHandlers` (`battleScriptMachine.ts:569-593`)
installs `END`/`END2` both as the shared `terminal()` halt reason
(`:523-535`, `:586-589`). A faithful `END3` handler must **not** reuse
`"terminal"` -- `end3` never sets `gCurrentActionFuncId = B_ACTION_TRY_FINISH`
(§1.3), and `"terminal"` today is exactly the "this action is finished"
signal every one of §2.4's consumers keys on. The natural extension is a new
`BattleScriptHaltReason` variant symmetric to the existing
`"return-stack-underflow"` (`battleScriptMachine.ts:100-103`, which already
exists for `Cmd_return`'s own stack-underflow case on the *same* shared
`battleScriptsStack`) -- e.g. `{kind: "callback-stack-pop"}` (or
`"callback-stack-underflow"` for §1.6's empty case) -- consumed **only** by
whatever orchestration helper hosts the push (§2.4), never by the generic
`runScriptToOwnEnd`-style "run to terminal" loops that have no notion of a
callback stack at all.

### 2.4 Consumer-change map

| Consumer | File:lines | Change needed |
| --- | --- | --- |
| Control-opcode table | `battleScriptMachine.ts:569-593`, comment `:560-568` | Add `END3` as its own halt-reason kind (§2.3), not `"terminal"`. Update the comment (currently says "END3 is omitted"). |
| Halt-reason union | `battleScriptMachine.ts:15-103` | Add the new variant(s) from §2.3. |
| End-turn ability dispatch | `battleEndTurnOrchestration.ts:439` (`ENDTURN_ABILITIES` no-op comment) | Replace the no-op with real gates for Speed Boost/Rain Dish (Shed Skin is slice 2) per `endturn-abilities-items-ground-truth.md` §1b, each firing a new `runPushCursorAndCallbackTickScript`-shaped helper (analogous to `runTickScript`, but push a callback-stack frame instead of resetting `callStack`, run to the new `END3` halt, then pop and assert/consume the resumed continuation) instead of `runTickScript`. |
| New helper | *(new, next to `runTickScript` at `:230`)* | `runPushCursorAndCallbackTickScript`: compose push (§2.2's cell) + `runScriptToOwnEnd`-equivalent that treats the new halt kind as its stopping condition + pop, mirroring `activateAbilityScript` in the prototype. |
| Other "run to terminal" consumers | `battleScriptFaintedActionsOrchestration.ts:270`, `factoryBattleScriptFullTurnDecision.ts:530/721/828/951/1008`, `factoryBattleScriptTerminalDecision.ts:716`, `factoryBattleScriptDecision.ts:629`, `turn1RockSlidePresentationStaging.ts:202`, `turn5EndeavorPresentationStaging.ts:230`, `turn5FaintPresentationStaging.ts:198` | **No change required** for slice 1-2: none of these currently run a script that can reach `END3` (they all run `BattleScriptExecute`-family top-level scripts triggered by moves/fainting, never `ABILITYEFFECT_ENDTURN`/`ON_SWITCHIN`). Named here because they're exactly the "adapter using end-of-script as its checkpoint" the brief asked to enumerate -- if a *future* slice ever routes an `ON_SWITCHIN` ability (Intimidate/Trace, §1.4(b)) through one of these, that consumer would need to learn the new halt kind too, since its "script" `CallbackContinuation` variant is a real mid-script resume, not a no-op. |

## 3. Prototype: what it proves

`src/engine/battleScriptCallbackStack.ts` (pure functions, frozen state,
zero imports from any production module) + `tests/battleScriptCallbackStack.test.ts`
(5 Tier-1 tests, all green):

1. **Push during a simulated end-turn pass, script runs opcodes, `end3` pops
   and resumes the preempted continuation.** Proves the basic push -> run ->
   pop round trip, including that the popped-but-dead script cursor
   round-trips byte-for-byte even though (per §1.4(a)) nothing would read it
   back in the real end-turn call path.
2. **`activateAbilityScript` composes push+run+pop as one call** -- the
   exact shape §2.4's proposed `runPushCursorAndCallbackTickScript` would
   take.
3. **Two battlers' Speed Boost fire sequentially within one end-of-turn
   resolution, never nested** -- directly proves §1.5's source finding:
   stack depth is asserted to never exceed 1, and both battlers' activations
   are asserted to happen (not skipped), strictly in turn order.
4. **The empty-stack `end3` case surfaces as an explicit mismatch**, not
   silent garbage -- proves §1.6's chosen (deliberately stricter-than-source)
   behavior.
5. **The OTHER source call shape (§1.4(b)):** a `"script"`-flavored
   continuation resumes at its own exact `programCounter`/`callStack`, proving
   the primitive is the general one source actually has -- not one
   hand-fitted to only these three abilities.

`npm test` (222 files / 2786 tests, including `executableFrontierRatchet.test.ts`'s
import/barrier-count pins) and `npm run build` both green with this
addition; nothing in `src/` outside the new file changed.

## 4. Registration checklist (follow-up main-lane step: slice 1, END3 + Speed Boost + Rain Dish)

Ledgers to verify against: `docs/endturn-abilities-items-ground-truth.md`
§3a (`mechanic-endturn-speedboost-off.json`) and §3b
(`mechanic-endturn-raindish-off.json`), both already live-verified.

1. Add the `END3` halt-reason variant(s) to `BattleScriptHaltReason`
   (§2.3) and install a real `END3` opcode handler in
   `createBattleScriptControlHandlers` (or a sibling installer, if control
   handlers stay pure/context-free and the callback-stack cell needs to
   live one layer up -- decide based on whether `RulesContext` ever needs
   to observe the pop; per §2.2 it should not).
2. Add the orchestration-level callback-stack cell (§2.2) to whatever state
   shape `runBattleEndTurnOrchestration` threads through its pass (likely
   alongside, not inside, `MachineState`).
3. Add `runPushCursorAndCallbackTickScript` next to `runTickScript`
   (`battleEndTurnOrchestration.ts:230`), composing push/run-to-`END3`/pop
   per §2.4's row.
4. Replace the `ENDTURN_ABILITIES` no-op (`battleEndTurnOrchestration.ts:439`)
   with real `ABILITY_SPEED_BOOST`/`ABILITY_RAIN_DISH` gates
   (`battle_util.c:2607-2652`), each calling the new helper with
   `BattleScript_SpeedBoostActivates`/`BattleScript_RainDishActivates`'s
   entry labels once those scripts are compiled into `battleScriptProgram.ts`'s
   committed program (not yet present -- `grep SpeedBoostActivates src/engine/*.ts`
   returns nothing today; extracting/compiling those two scripts is itself a
   prerequisite this checklist step must do first).
5. Verify opcode completeness against the ground-truth doc §5 slice 1's own
   claim (all of `PRINTSTRING`/`WAITMESSAGE`/`ORWORD`/`HEALTHBARUPDATE`/
   `DATAHPUPDATE`/`PLAYANIMATION`/`UPDATESTATUSICON` already registered) --
   re-grep `src/engine/*.ts` fresh, don't reuse the doc's count.
6. Re-run `tools/probe/verify-endturn-abilities-items-ground-truth.ts`'s
   two Speed-Boost/Rain-Dish battle-lab scenarios through the new engine
   path (`npm run compare` or the equivalent app-side trace) and diff
   against §3a/§3b's frame-exact ledgers.
7. Leave Shed Skin (slice 2, same `END3` dependency plus the `Random() % 3`
   roll and unconditional `status1 = 0` clear) for its own follow-up --
   land after slice 1 proves `END3` once, per the ground-truth doc's own
   ordering.

## 5. Corrections to `docs/endturn-abilities-items-ground-truth.md`

- **§1b's `gBattlescriptCurrInstrStackPtr` is not a real symbol** (§1.1) --
  the pushed script cursor and the pushed callback go to two separate
  structures (`battleScriptsStack` and `battleCallbackStack`), not one
  combined stack under that name.
- **§1b's "resumes the ORIGINAL caller (`DoBattlerEndTurnEffects`'s own
  re-entry point)" is accurate about the eventual outcome but imprecise
  about mechanism** (§1.4(a)): `end3` restores `gBattleMainFunc` to
  `BattleTurnPassed` (a bare C function, re-invoked from its own top on the
  next tick) and restores a script cursor that is **never read again** in
  this call path. The actual re-entry point inside `DoBattlerEndTurnEffects`
  comes from `gBattleStruct->turnEffectsTracker`/`turnEffectsBattlerId`,
  state completely outside anything `end3` touches. This is the single most
  load-bearing precision fix for the engine design: it means the engine's
  `END3` registration needs a "resume the end-turn sweep" signal, not a
  "resume this popped script cursor" signal, for every one of Speed
  Boost/Rain Dish/Shed Skin.
- No other claim in that doc's §0-§5 was falsified by this session's source
  read; §1b's own structural finding (all three scripted cases use
  `BattleScriptPushCursorAndCallback` + `end3`, not `BattleScriptExecute` +
  `end2`) is confirmed exactly as stated.

## Out of scope (per this step's brief)

No edits to `battleEndTurnOrchestration.ts` or `battleScriptMachine.ts`; no
`ENDTURN_ITEMS1`/`ENDTURN_ITEMS2` work; no factory-AI files; no
`PROGRESS.md`/`ISSUES.md`; no seam/animation files.
