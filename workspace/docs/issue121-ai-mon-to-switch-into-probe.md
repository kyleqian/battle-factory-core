# ISSUES #121 probe — can `Cmd_openpartyscreen`'s opponent branch ever see a banked `AI_monToSwitchIntoId`?

**Verdict: UNREACHABLE in Factory singles.** The banked id is consumed and
reset to `PARTY_SIZE` inside the *action-selection* state machine, strictly
before any battle script runs; every `openpartyscreen` emit happens during
turn *execution*. `battleScriptOpenPartyScreenOpcode.ts`'s unconditional
`getMostSuitableMonToSwitchInto` call (#110) is therefore source-exact for
the whole reachable domain, not just "the sentinel case".

Side lane, 2026-08-22. Source-only probe; no `src/` or `tests/` edits.
Paths below are `reference/pokeemerald/`.

## 1. Every writer and reader of `AI_monToSwitchIntoId`

`rg -n AI_monToSwitchIntoId src include` → 14 sites, all of them below.

| file:line | role | value written / condition read | when |
| --- | --- | --- | --- |
| `include/battle.h:440` | decl | `u8 [MAX_BATTLERS_COUNT]` in `gBattleStruct` | — |
| `battle_main.c:3134` | **reset** | `= PARTY_SIZE` for all 4 battlers, in `BattleStartClearSetData` | once per battle |
| `battle_ai_switch_items.c:25` | write | `= PARTY_SIZE` — `ShouldSwitchIfPerishSong`, then emits `B_ACTION_SWITCH` | AI action selection |
| `…:109` | write | `= i` — `ShouldSwitchIfWonderGuard` found a super-effective bench mon | " |
| `…:209` | write | `= i` — `FindMonThatAbsorbsOpponentsMove` picked a specific absorber | " |
| `…:231/238/250` | write | `= PARTY_SIZE` — `ShouldSwitchIfNaturalCure`'s three coin-flip exits | " |
| `…:418` | write | `= i` — `FindMonWithFlagsAndSuperEffective` | " |
| `…:545` | **read** | `AI_TrySwitchOrUseItem`: `== PARTY_SIZE` ⇒ run `GetMostSuitableMonToSwitchInto` + the manual fallback loop (`:547-587`) | " |
| `…:590` | write | `= monToSwitchId` — resolves the sentinel to a concrete id | " |
| `…:593` | read | copies the banked id into `monToSwitchIntoId[gActiveBattler]` — **does not clear the bank** | " |
| `battle_controller_opponent.c:1625` | **read** | `OpponentHandleChoosePokemon`: `== PARTY_SIZE` ⇒ scorer + fallback loop | any `ChoosePokemon` emit |
| `…:1668` | **consume** | `chosenMonId = AI_monToSwitchIntoId[b]` | " |
| `…:1669` | **reset** | `= PARTY_SIZE` immediately after consuming | " |

Note the two negatives: **nothing clears the bank at turn start**
(`BattleTurnPassed`, `SwitchInClearSetData`, `HandleAction_ActionFinished`
all leave it alone), and `AI_TrySwitchOrUseItem` does not clear it either.
The *only* clears are `BattleStartClearSetData` and the `:1669` consumption.

## 2. Why the window still closes: the bank is consumed during action selection

`AI_TrySwitchOrUseItem` (`battle_ai_switch_items.c:528`) is called from
`OpponentHandleChooseAction` (`battle_controller_opponent.c:1542`). Every
non-sentinel write above is followed, in the same helper, by
`BtlController_EmitTwoReturnValues(…, B_ACTION_SWITCH, 0)` + `return TRUE`;
no path leaks a banked id on a `ShouldSwitch() == FALSE` return.

`HandleTurnActionSelectionState` then reads that action
(`battle_main.c:4179` `gChosenActionByBattler[b] = gBattleBufferB[b][1]`) and
its `case B_ACTION_SWITCH:` (`battle_main.c:4240-4266`) emits
`ChoosePokemon` on **all three** sub-branches — `PARTY_ACTION_CANT_SWITCH`
(`:4246`), `PARTY_ACTION_ABILITY_PREVENTS` (`:4255`), and the normal
`PARTY_ACTION_CHOOSE_MON` (`:4260/4262/4264`). `OpponentHandleChoosePokemon`
ignores the `caseId` entirely, so **any** `B_ACTION_SWITCH` selection reaches
`:1668-1669` and resets the bank.

> **Invariant.** Outside one battler's `STATE_WAIT_ACTION_CHOSEN` step,
> `AI_monToSwitchIntoId[opponent] == PARTY_SIZE` in singles.

All four `BtlController_EmitChoosePokemon` call sites in the ROM:

| call site | phase | bank state when it runs |
| --- | --- | --- |
| `battle_main.c:4246/4255/4260-4264` | action selection | non-sentinel — this *is* the consumer |
| `battle_script_commands.c:4861` (`ChooseMonToSendOut`, Baton Pass / multi replacement) | turn execution | `PARTY_SIZE` |
| `battle_script_commands.c:5120` (`Cmd_openpartyscreen`) | turn execution | `PARTY_SIZE` |

Action selection finishes for every battler (`AllAtActionConfirmed`,
`battle_main.c:4554`) and the handoff at `:4541` before
`SetActionsAndBattlersTurnOrder` (`:4756`) and any battle script runs, so the two execution-phase rows can
never observe a live bank.

## 3. The two same-turn orderings the issue asked about

| ordering | what actually happens | bank at `openpartyscreen` | retail result | engine result |
| --- | --- | --- | --- | --- |
| AI switches voluntarily, its switch-in then faints to Spikes the same turn (`HandleAction_Switch` → `BattleScript_SpikesOnFaintedBattler…` → `openpartyscreen BS_FAINTED`) | bank was already consumed at `:1669` during selection | `PARTY_SIZE` | scorer runs | scorer runs — **match** |
| forced switch *before* the AI's own switch action | impossible: `SetActionsAndBattlersTurnOrder` (`battle_main.c:4756`) queues every `B_ACTION_SWITCH` ahead of all moves at `:4817-4828` and excludes them from the speed sort (`:4843-4844`), so the AI's switch always resolves first | n/a | n/a | n/a |

## 4. The second banked channel, and why it also can't leak

`GetMostSuitableMonToSwitchInto` opens with an early return
(`battle_ai_switch_items.c:646-647`): if `monToSwitchIntoId[gActiveBattler]
!= PARTY_SIZE` it hands that value straight back without scoring. That is a
*second* way a pre-decided target could survive into a forced switch —
`:593` writes it during voluntary-switch selection and it is not cleared by
`HandleAction_ActionFinished` until the switch action completes.

It is closed by `Cmd_openpartyscreen` itself: `battle_script_commands.c:5117`
sets `monToSwitchIntoId[battler] = PARTY_SIZE` two lines before the emit
(`ChooseMonToSendOut` does the same at `:4858`). So at both execution-phase
call sites the early return is dead and the real scorer runs.

## 5. Engine correspondence

| retail step | engine | verdict |
| --- | --- | --- |
| `AI_TrySwitchOrUseItem` banks then resolves an id | `factoryAiSwitchPolicy.ts:658-694` — helper `chosen` id used directly, `sentinel` → `getMostSuitableMonToSwitchInto`, then the first-legal fallback; all in one pure call | equivalent; the "bank" is a local, never persisted |
| `OpponentHandleChoosePokemon` consumes the bank for the voluntary switch | `factoryAiLiveDriver.ts:490-516` submits a `switch` decision directly — never routes through the opcode | equivalent value, different seam |
| `Cmd_openpartyscreen` → scorer for forced switches | `battleScriptOpenPartyScreenOpcode.ts:263` always calls `getMostSuitableMonToSwitchInto` | **match** |

**Latent coupling worth a comment, not a fix.** The engine's opponent branch
never writes `monToSwitchIntoId[battler] = PARTY_SIZE` before scoring
(source `:5117`), *and* `battleAiSwitchInto.ts` omits the `:646-647` early
return. The two omissions cancel exactly. Porting either one alone would
introduce the divergence this probe just ruled out.

## 6. Test sketch / oracle receipt

No Tier-1 red pin is warranted: there is no reachable divergence to pin, and
the invariant is about a variable the engine deliberately does not model.
The closest useful pin would be a *positive control* over the reachable
path — stage the AI on Spikes via `overrides.parties`, let it switch
voluntarily, KO the switch-in, and assert the forced replacement equals
`getMostSuitableMonToSwitchInto`'s pick. That is already the shape of
`tests/openPartyScreenFaintedSelectorIssue113.test.ts` and
`tests/forcedSwitchSecondChoiceIssue119.test.ts`; adding a third copy pins
nothing new.

**No oracle receipt captured, and here is precisely why:** the claim is
about RAM (`gBattleStruct->AI_monToSwitchIntoId`), not pixels. Every ROM
outcome on both sides of the question is the *same* replacement mon (§2
invariant ⇒ the scorer always runs), so no trace can distinguish them from
the framebuffer. Falsifying §2 needs an mGBA memory probe: `bin/oracle
symbols gBattleStruct` → `0x202449c` (the pointer cell; deref, then add the
`AI_monToSwitchIntoId` offset from `include/battle.h:440`) sampled at the
`Cmd_openpartyscreen` breakpoint, via `tools/run-mgba-probe.py`. That is a
new probe harness, not a ≤15-minute battle-lab trace.

## 7. Recommended disposition

Close #121 as **not a divergence**. If the entry is kept at all, keep only
the §4 latent-coupling note (`:5117` ↔ `:646-647` must be ported together or
not at all), which is real but dormant.
