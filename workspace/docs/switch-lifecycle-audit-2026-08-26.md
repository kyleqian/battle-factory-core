# Mid-battle switch lifecycle audit — source vs port (2026-08-26)

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit time) | `299c48ebb558630a5774b7a825f45e2fecc0e183` (commit `12d32d2f`) |
| Date | 2026-08-26, started 00:32:31 PDT |
| Lane / oracle | side worktree `worker/side-20260826-003223`, Battle Scene OFF (`http://127.0.0.1:8014`). Static audit — the oracle was **not** run. |
| Scope | A **mid-battle switch**, both sides, from the moment the action is dispatched to the moment the incoming battler is fully set up and the turn continues. Covers: where a switch action sits in turn order (`SetActionsAndBattlersTurnOrder` / `GetWhoStrikesFirst`); `BattleScript_ActionSwitch` opcode by opcode; `SwitchInClearSetData` (`battle_main.c`) field by field; `Cmd_switchineffects` ordering for a voluntary switch-in; the forced-switch entries (`EFFECT_ROAR` / `EFFECT_BATON_PASS`); and multi-turn move state on the leaver and on the stayer. Level-50 Factory singles. Docs-only step — no engine/test/tool/data edits. |
| Out of scope | Fixing anything. The AI's voluntary-switch **decision** internals (`ShouldSwitch` / `GetMostSuitableMonToSwitchInto` — ISSUES #102/#109/#110/#121; #121's dormant coupled pair and its two `PARTY_SIZE`-sentinel premise throws are **not** re-litigated here). The faint-replacement path (`HandleFaintedMonActions` / `BattleScript_FaintedMonChooseAnother`) — a sibling audit covers it this session. Battle-start switch-in (`TryDoEventsBeforeFirstTurn`). Doubles. Battle Scene ON. Anything under `src/animation`. |
| NOT read (declared) | `Cmd_moveend`'s full `MOVEEND_*` body — only the two cases `BattleScript_ActionSwitch` actually re-enters (`MOVEEND_IMMUNITY_ABILITIES`, `MOVEEND_MIRROR_MOVE`) were traced, at their dispatch seam, not case-by-case. `battle_ai_switch_items.c`'s `ShouldSwitch`/`GetMostSuitableMonToSwitchInto` (declared out of scope above) — `Cmd_forcerandomswitch`'s own candidate loop **was** read. `Cmd_returnatktoball` / `drawpartystatussummary` / `hidepartystatussummary` controller payload shapes (presentation-only under Battle Scene OFF; their *ordering* rows are still verdicted). `BattleScript_PursuitDmgOnSwitchOut`'s damage-pipeline opcodes past `tryfaintmon` (the shared hit chain, audited elsewhere) — only its entry/exit seam is a row here. `battleScriptRulesContext.ts`'s ~3.3k-line context constructor except the ~25 fields cited. |

**Verdict counts** — see §7.

---

## §0. The three distinct switch machines this audit must not conflate

Reading the port, three code paths converge on the *same* switch-in chain, and each enters it from a different place:

1. **Voluntary switch (the action).** `HandleAction_Switch` (`battle_util.c:294-311`) → `BattleScript_ActionSwitch` (`data/battle_scripts_1.s:3088-3121`). Runs as a whole turn *action*, `gCurrentMove` is `MOVE_NONE`. This is the §1/§2/§4 spine. Port: `factoryBattleScriptFullTurnDecision.ts:1710` `runVoluntarySwitchAction`.
2. **Forced switch (Roar/Whirlwind, and Baton Pass).** `Cmd_forcerandomswitch` (`battle_script_commands.c:7185`) and `EFFECT_BATON_PASS`'s `openpartyscreen` both run *inside* a move's script, so `gCurrentMove` is a real move — which is exactly the discriminator `SwitchInClearSetData` reads at `battle_main.c:3158`/`:3173`/`:3210`. §5.
3. **Faint replacement.** `HandleFaintedMonActions` → `BattleScript_FaintedMonChooseAnother`. **Out of scope** (sibling audit), but it matters here because it is the *only* one of the three that calls `FaintClearSetData` (`battle_main.c:3264`) instead of `SwitchInClearSetData` — `FaintClearSetData` additionally clears the whole of `gProtectStructs[battler]` (`:3292-3310`), which `SwitchInClearSetData` never touches. That asymmetry produces one of §3's findings.

The single most load-bearing fact for §3: **`SwitchInClearSetData` lives in `battle_main.c:3152-3262`, not `battle_util.c`.** A one-file grep of `battle_util.c` returns nothing and silently invites a false DIVERGENT.

Second load-bearing fact: `rg` over `reference/` returns **zero hits** (symlink). Every source cite in this doc was taken from `$(cd reference/pokeemerald && pwd -P)` = `/Users/kyle/Developer/pokebench/vendor/pokeemerald`.

## §1. Where a switch action sits in turn order

`SetActionsAndBattlersTurnOrder` (`battle_main.c:4756-4850`) builds `gBattlerByTurnOrder` / `gActionsByTurnOrder` in **three passes**:

```
pass A  :4817-4825   every battler whose action is B_ACTION_USE_ITEM or B_ACTION_SWITCH,
                     in ASCENDING BATTLER INDEX order
pass B  :4826-4834   every other battler, ascending battler index
pass C  :4835-4850   bubble sort with GetWhoStrikesFirst(b1, b2, FALSE),
                     SKIPPED for any pair where either slot is USE_ITEM or SWITCH  (:4841-4844)
```

So a switch is not "priority +6": it is *removed from the speed comparison entirely* and parked at the front in index order. Two consequences that a naive port gets wrong:

* **Both sides switching the same turn** → battler 0 (player) resolves first, battler 1 (opponent) second, **regardless of speed**, deterministically.
* **`GetWhoStrikesFirst` is never called for a pair involving a switch**, so the speed-tie `Random() & 1` at `battle_main.c:4728` / `:4745` is **not drawn**. One switch action in a turn removes one potential RNG draw from that turn's stream.

| step | source | port site | verdict |
| --- | --- | --- | --- |
| T1 | Switch/item actions inserted first, ascending battler index (`battle_main.c:4817-4825`) | `factoryBattleScriptFullTurnDecision.ts:2959-2964` — `if (playerSwitch \|\| trainerSwitch) playerFirst = playerSwitch;` (player is battler 0, so `playerSwitch` true ⇒ index 0 first) | SAME-ORDER |
| T2 | Both battlers switch ⇒ index order 0 then 1, no speed comparison (`:4817-4825` + skip at `:4841-4844`) | same line `:2964`: `playerSwitch && trainerSwitch ⇒ playerFirst = true` ⇒ mover1 = 0 | SAME-ORDER |
| T3 | Only the opponent switches ⇒ opponent (index 1) resolves **before** the player's move (`:4819` puts it in pass A) | `:2964` `playerFirst = playerSwitch = false` ⇒ `mover1 = 1` (`:2983`) | SAME-ORDER |
| T4 | Only the player switches ⇒ player resolves before the opponent's move | `:2964` ⇒ `playerFirst = true` | SAME-ORDER |
| T5 | Speed-tie `Random() & 1` **not drawn** when either action is a switch (`:4841-4844` gates the only `GetWhoStrikesFirst` call in pass C) | `:2965-2972` — the `ctx.rng.draw("turn order speed tie (Random() & 1)")` sits in the `else` branch, unreachable when either side switches; the comment at `:2960-2963` names the source lines | SAME-ORDER (draw-for-draw) |
| T6 | `B_ACTION_RUN` short-circuit puts the runner at slot 0 and jumps straight to `CheckFocusPunch_ClearVarsBeforeTurnStarts` (`:4785-4814`) | no port site | UNREACHABLE-IN-SINGLES — Factory forbids running (`BATTLE_TYPE_FRONTIER`; `Cmd_various` `VARIOUS_IS_RUNNING_IMPOSSIBLE` is the gate, ported at `battleScriptSwitchinOpcode.ts:235`) |
| T7 | `gChosenActionByBattler[battler] = B_ACTION_SWITCH` (`= 2`, `include/constants/battle.h`) is what pass A reads | `factoryBattleScriptFullTurnDecision.ts:217-218` (`B_ACTION_SWITCH = 2`) written into the banked action array at `:3012-3015` | SAME |
| T8 | `gActionsByTurnOrder` is later read by `ENDTURN_ORDER`'s re-sort (`battle_util.c:1209`) and by `Cmd_switchineffects`' `B_ACTION_CANCEL_PARTNER` write (`battle_script_commands.c:5270-5274`) | banked at `:3008-3016` for the end-turn re-sort; the `B_ACTION_CANCEL_PARTNER` write is **not** ported (see §4, row E7) | SAME for the bank; see §4 E7 |
| T9 | `SetActionsAndBattlersTurnOrder` runs **once**, before any action, and the resulting order is *not* recomputed after a switch resolves | port resolves `mover1`/`mover2` once at `:2983-2990` before `runVoluntarySwitchAction`, never re-derived | SAME-ORDER |

## §2. `BattleScript_ActionSwitch` opcode by opcode

Source: `data/battle_scripts_1.s:3088-3121`. Port entry: `factoryBattleScriptFullTurnDecision.ts:1710-1759` (`runVoluntarySwitchAction`), which **starts execution at the label `BattleScript_PursuitSwitchDmgLoop`** (`:1726`) rather than at `BattleScript_ActionSwitch`, deliberately skipping the four prelude opcodes.

| # | opcode (source line) | what it does | port site | verdict |
| --- | --- | --- | --- | --- |
| S1 | `hpthresholds2 BS_ATTACKER` (`:3089`) | writes only `gBattleStruct->hpScale` (`Cmd_hpthresholds2`) | skipped by the `:1726` entry-label choice; the sibling `Cmd_hpthresholds` is a documented pure no-op advance at `battleScriptSwitchinOpcode.ts:723` | SAME (no modeled state) |
| S2 | `printstring STRINGID_RETURNMON` (`:3090`) | "Come back, X!" | skipped (`:1723-1725` names it presentation bookkeeping); text is re-emitted by `battleResolutionPresentation.ts:3787` | SAME under Battle Scene OFF |
| S3 | `setbyte sDMG_MULTIPLIER, 2` (`:3091`) | Pursuit's ×2 | `stageVoluntarySwitchRules` `:1793` sets `dmgMultiplier: 1`, **not 2** | **DIVERGENT — finding D1** (see §7) |
| S4 | `jumpifbattletype BATTLE_TYPE_DOUBLE, …SetMultihit` (`:3092`) | doubles-only fork | not represented; the port hard-enters the singles path | SAME (singles) |
| S5 | `setmultihit 1` (`:3093`) | singles multi-hit counter = 1 | `stageVoluntarySwitchRules(…, multiHitCounter = 1)` (`:1771`, `:1799`) | SAME |
| S6 | `goto BattleScript_PursuitSwitchDmgLoop` (`:3094`) | — | the port's start label (`:1726`) | SAME-ORDER |
| S7 | `jumpifnopursuitswitchdmg BattleScript_DoSwitchOut` (`:3098`) | the Pursuit interception test | `voluntarySwitchHandlers(baseHandlers, switchingBattler, opposingMoveId, opposingMoveTarget)` (`:1732`) installs the handler; the staged Tier-1 seam steps exactly this one opcode at `:1867-1871` | SAME |
| S8 | `swapattackerwithtarget` (`:3099`) | Pursuit user becomes attacker | executed by the shared program (the port runs the real script from `:1726`) | SAME |
| S9 | `trysetdestinybondtohappen` (`:3100`) | — | shared program | SAME |
| S10 | `call BattleScript_PursuitDmgOnSwitchOut` (`:3101`) | the whole damage chain `:3124-3149` | shared program; its damage opcodes are the ordinary hit chain (declared NOT read past `tryfaintmon`) | UNVERIFIED — the Pursuit damage chain's opcodes were not diffed here; only the call/return seam and the `sDMG_MULTIPLIER` input (S3) were checked. What is missing: an opcode-by-opcode diff of `:3124-3149` against `battleScriptHitChainOpcode.ts` |
| S11 | `swapattackerwithtarget` (`:3102`) | restore | shared program | SAME |
| S12 | `decrementmultihit BattleScript_PursuitSwitchDmgLoop` (`:3104`) | singles: 1→0, falls through | shared program, counter seeded by S5 | SAME |
| S13 | `switchoutabilities BS_ATTACKER` (`:3105`) | Natural Cure / Regenerator-shaped switch-out abilities | shared program — `Cmd_switchoutabilities` is **not** in `battleScriptSwitchinOpcode.ts`'s handler table (`:1324`) | UNVERIFIED — handler owner not located in the 42-minute budget. What is missing: `rg -n "switchoutabilities" src/engine` and a Natural Cure round-trip row |
| S14 | `waitstate` (`:3106`) | controller drain | scheduler-modeled (`markBattleScriptControllerPending`, e.g. `:397`) | SAME-ORDER |
| S15 | `returnatktoball` (`:3107`) | `Cmd_returnatktoball` (`battle_script_commands.c:4595-4604`); no modeled state, gated on `HITMARKER_FAINTED` | `runVoluntarySwitchAction` installs a dedicated `returnToBallHandler` (`factoryBattleScriptFullTurnDecision.ts:1698`) | SAME |
| S16 | `waitstate` (`:3108`) | — | scheduler | SAME-ORDER |
| S17 | `drawpartystatussummary BS_ATTACKER` (`:3109`) | party status bar | presentation-only under Battle Scene OFF | SAME |
| S18 | `switchhandleorder BS_ATTACKER, 1` (`:3110`) | **case 1**: `if (!MULTI) SwitchPartyOrder(gActiveBattler)` (`battle_script_commands.c:5176-5179`) — reorders the *party array*, writes no battle state | `battleScriptSwitchinOpcode.ts:315-365`; case 1 takes the early `advance` at `:353-358` after asserting `monToSwitchIntoId[battler] !== PARTY_SIZE` (`:346-352`) | SAME — case 1 writes nothing the engine models (the `PARTY_SIZE` throw is a port-added precondition, not a behaviour change) |
| S19 | `getswitchedmondata BS_ATTACKER` (`:3111`) | `gBattlerPartyIndexes[b] = monToSwitchIntoId[b]`, then `EmitGetMonData(REQUEST_ALL_BATTLE)` (`battle_script_commands.c:4606-4619`) | `battleScriptSwitchinOpcode.ts:373-418` — commits `battlers[b].partyIndex = decided` (`:394-396`), marks the controller pending (`:397`), emits one `switch` event | SAME-ORDER |
| S20 | `switchindataupdate BS_ATTACKER` (`:3112`) | rebuild `gBattleMons[b]` from the controller buffer, re-derive types/ability, Knock Off item suppression, Baton Pass stage+status2 carry, **then `SwitchInClearSetData()`** (`battle_script_commands.c:4621-4671`) | `battleScriptSwitchinOpcode.ts:441-667` | see §3 (the whole of `SwitchInClearSetData` is folded into this handler) |
| S21 | `hpthresholds BS_ATTACKER` (`:3113`) | `gBattleStruct->hpScale` only | `battleScriptSwitchinOpcode.ts:723` — explicit pure no-op advance | SAME |
| S22 | `printstring STRINGID_SWITCHINMON` (`:3114`) | "Go! X!" — its `gBattleTextBuff1` nick was staged by S20 (`battle_script_commands.c:4669`) and its species by S18 (`:5210-5211`) | presentation; `battleResolutionPresentation.ts:3804` | SAME under Battle Scene OFF |
| S23 | `hidepartystatussummary BS_ATTACKER` (`:3115`) | (the step brief calls this `hidepartystatusbox`; the actual opcode at `:3115` is `hidepartystatussummary`, `Cmd_hidepartystatussummary`) | presentation-only | SAME |
| S24 | `switchinanim BS_ATTACKER, FALSE` (`:3116`) | clears `gAbsentBattlerFlags` bit, emits the send-out anim; Pokédex-seen branch skipped for `BATTLE_TYPE_FRONTIER` (`battle_script_commands.c:4681-4687`); Arena point init at `:4696-4697` | `battleScriptSwitchinOpcode.ts:676-722`; Arena is a named barrier at `:698-700`, the Pokédex branch is documented-skipped at `:670-673` | SAME |
| S25 | `waitstate` (`:3117`) | — | scheduler | SAME-ORDER |
| S26 | `switchineffects BS_ATTACKER` (`:3118`) | Spikes → Truant hack → `ABILITYEFFECT_ON_SWITCHIN` → `ITEMEFFECT_ON_SWITCH_IN` → tail writes | `battleScriptSwitchinOpcode.ts:1125-1284` | see §4 |
| S27 | `moveendcase MOVEEND_IMMUNITY_ABILITIES` (`:3119`) | this is where the *actual* Intimidate stat drop and Trace copy fire — `ABILITYEFFECT_INTIMIDATE1`/`ABILITYEFFECT_TRACE` consume the `STATUS3_INTIMIDATE_POKES` / `STATUS3_TRACE` bits S26 merely *set* (`battle_util.c:3006-3009`, `:3020`, `:3064`, `:3077-3080`) | shared program (the port runs the real script) — the two-phase set-then-consume split is preserved because §4's E4/E5 set the same bits | SAME-ORDER (see §4 E4/E5 for the gate difference) |
| S28 | `moveendcase MOVEEND_MIRROR_MOVE` (`:3120`) | records the switch as a non-Mirror-Move-able action | shared program | UNVERIFIED — the `MOVEEND_MIRROR_MOVE` case body was not diffed (declared NOT read). What is missing: whether the port's `moveendcase` handler reaches the same `gBattleStruct->lastTakenMove` writes when `gCurrentMove == MOVE_NONE` |
| S29 | `end2` (`:3121`) | pops the callback stack, action over | `runScriptToOwnEnd` (`factoryBattleScriptFullTurnDecision.ts:1730`) | SAME-ORDER |
| S30 | Spikes KO mid-`switchineffects` abandons the pushed cursor and jumps to `BattleScript_HandleFaintedMon` → `openpartyscreen BS_FAINTED` (`data/battle_scripts_1.s:3396-3401`, `:2843-2844`) | `runVoluntarySwitchAction` `:1742-1757` forwards it as a real `player-choice` halt | SAME-ORDER |

## §3. `SwitchInClearSetData` field by field (`battle_main.c:3152-3262`)

Port: the whole function is inlined into `createSwitchindataupdateOpcodeHandler` (`src/engine/battleScriptSwitchinOpcode.ts:441-667`), which also carries `Cmd_switchindataupdate`'s own body. Rows below follow **source order**.

| # | source assignment / loop (line) | port site | verdict |
| --- | --- | --- | --- |
| C1 | `disableStructCopy = gDisableStructs[gActiveBattler]` snapshot before any clear (`:3154`) | no explicit copy — the port reads the *pre-update* `candidate` object inline at `:526`, `:542-543`, `:548-549`, which is the same pre-clear value | SAME |
| C2 | non-BP: `statStages[i] = DEFAULT_STAT_STAGE` for all 6 (`:3160-3161`) | `:523` `statStages: isBatonPass ? candidate.statStages : DEFAULT_STAT_STAGES`; `DEFAULT_STAT_STAGE = 6` re-derived at `:65-69` | SAME |
| C3 | non-BP: every battler with `STATUS2_ESCAPE_PREVENTION` whose `battlerPreventingEscape == leaver` loses the bit (`:3162-3165`) | `:558-561` `clearsEscapePrevention`, applied at `:566`, owner zeroed at `:591` | SAME |
| C4 | non-BP: every battler with `STATUS3_ALWAYS_HITS` whose `battlerWithSureHit == leaver` loses the bit **and** has `battlerWithSureHit = 0` (`:3166-3170`) | `:573-576` `clearsSureHit`, applied at `:582-583`, owner zeroed at `:592` | SAME |
| C5 | BP: `status2 &= (CONFUSION\|FOCUS_ENERGY\|SUBSTITUTE\|ESCAPE_PREVENTION\|CURSED)` (`:3175`) | `:524` with `BATON_PASS_STATUS2` at `:98-100`. Re-derived from `include/constants/battle.h:129,144,148,150,152` = bits 0,1,2,20,24,26,28 — **exact match** | SAME |
| C6 | BP: `gStatuses3 &= (LEECHSEED_BATTLER\|LEECHSEED\|ALWAYS_HITS\|PERISH_SONG\|ROOTED\|MUDSPORT\|WATERSPORT)` (`:3176`) | `:525` with `BATON_PASS_STATUS3` at `:101-103`. Re-derived from `include/constants/battle.h:158-162,167,173-174` = bits 0,1,2,3,4,5,10,16,17 — **exact match** | SAME |
| C7 | BP: an **opposing-side** battler whose sure-hit lock names the leaver has `ALWAYS_HITS` replaced by `ALWAYS_HITS_TURN(2)` (`:3178-3187`) | `:568-572` `refreshesSureHit` (same side check, same owner check), applied at `:577-581`; `STATUS3_ALWAYS_HITS_TURN_2` re-derived at `:105` as `(2 << 3) & STATUS3_ALWAYS_HITS` = source's `:161` macro | SAME |
| C8 | non-BP: `status2 = 0`, `gStatuses3 = 0` (`:3191-3192`) | `:524-525` (the `isBatonPass ? … : 0` else-arms) | SAME |
| C9 | **all** battlers: `status2 &= ~STATUS2_INFATUATED_WITH(leaver)` (`:3197-3198`) | `:494` `infatuationBit = statusInfatuatedWithBit(battler)`, applied at `:564` | SAME |
| C10 | **all** battlers: `status2 &= ~STATUS2_WRAPPED` where `wrappedBy[i] == leaver` (`:3199-3200`) | `:555-557` clears unconditionally when `battlersCount === 2`; the doubles case is a named barrier at `:461-471` naming `gBattleStruct->wrappedBy` | SAME (in singles the only possible wrapper of the other battler *is* the leaver, so the identity test is vacuous) |
| C11 | `gActionSelectionCursor[b] = 0`, `gMoveSelectionCursor[b] = 0` (`:3203-3204`) | no port site | SAME under Battle Scene OFF — both are player-menu cursor positions, read only by `battle_controller_player.c`'s menu drawing; no logical reader |
| C12 | **whole-`DisableStruct` memset** (`:3206-3208`) | `:526-552` enumerates the fields individually | **DIVERGENT — finding D2** (`protectUses` and `rolloutTimerStartValues[b]` are modeled by the port but absent from the enumeration) |
| C13 | BP retains `substituteHP` (`:3212`) | `:526` | SAME |
| C14 | BP retains `battlerWithSureHit` (`:3213`) | `:549` | SAME |
| C15 | BP retains `perishSongTimer` (`:3214`) | `:542` | SAME |
| C16 | BP retains `perishSongTimerStartValue` (`:3215`) | `:543` | SAME |
| C17 | BP retains `battlerPreventingEscape` (`:3216`) | `:548` | SAME |
| C18 | `gMoveResultFlags = 0` (`:3219`) | `:644` | SAME |
| C19 | `isFirstTurn = 2` (`:3220`) | `:550` | SAME |
| C20 | `truantSwitchInHack` retained across the memset (`:3221`) | not modeled as a field; the port substitutes a `truantCounter !== 1` test at `battleScriptSwitchinOpcode.ts:1182` | SAME-outcome — the only writers of `truantSwitchInHack = 1` are `battle_script_commands.c:6413/6420/6430/6431` (Battle Arena's `VARIOUS_ARENA_*`), unreachable in Factory, so the flag is permanently 0 and the source test always passes; C12's memset having just zeroed `truantCounter` makes the port's test always pass too |
| C21 | `gLastMoves[b] = MOVE_NONE` (`:3222`) | `:606` | SAME |
| C22 | `gLastLandedMoves[b] = MOVE_NONE` (`:3223`) | `:607` | SAME |
| C23 | `gLastHitByType[b] = 0` (`:3224`) | `:608` | SAME |
| C24 | `gLastResultingMoves[b] = MOVE_NONE` (`:3225`) | `:609` | SAME |
| C25 | `gLastPrintedMoves[b] = MOVE_NONE` (`:3226`) | `:610` | SAME |
| C26 | `gLastHitBy[b] = 0xFF` (**not 0**) (`:3227`) | `:611` (`0xff`) | SAME |
| C27 | `lastTakenMove[b][0..1] = MOVE_NONE` (`:3229-3230`) | `:613-615` | SAME |
| C28 | `lastTakenMoveFrom[b][0..3] = 0` — four unrolled pairs, **fixed 4, not `gBattlersCount`** (`:3231-3238`) | `:624-627` loops `sourceBattler < 4` (fixed 4) | SAME |
| C29 | `gBattleStruct->palaceFlags &= ~bit[b]` (`:3240`) | no port site | UNREACHABLE-IN-SINGLES — `BATTLE_TYPE_PALACE` only; also written by `Cmd_switchindataupdate` `:4659-4665`, same gate |
| C30 | loop: every **opposing-side** battler's `lastTakenMove` cleared (`:3242-3248`) | `:616-621` (same `side !== active.side` test, same `battlersCount` bound) | SAME |
| C31 | loop: `lastTakenMoveFrom[i][b] = 0` for **all** `i < gBattlersCount` (including the leaver's own side) (`:3249-3250`) | `:628-631` (bound `battlersCount`) | SAME |
| C32 | `choicedMove[b] = MOVE_NONE` (`:3253-3254`) | `:638-640` | SAME |
| C33 | `gBattleResources->flags->flags[b] = 0` (`:3256`) | `:552` `flashFireBoosted: 0`. Re-derived: `include/battle.h:68` defines exactly one bit, `RESOURCE_FLAG_FLASH_FIRE 1`, and a whole-tree grep finds only 4 readers/writers (`battle_ai_script_commands.c:2280`, `battle_util.c:2706/2714`, `pokemon.c:3367`) — so the byte *is* the Flash Fire flag | SAME |
| C34 | `gCurrentMove = MOVE_NONE` (`:3257`) | `:645` `currentMove: 0` | SAME |
| C35 | `gBattleStruct->arenaTurnCounter = 0xFF` (`:3258`) | no port site | UNREACHABLE-IN-SINGLES — Battle Arena only |
| C36 | `ClearBattlerMoveHistory(b)` → `BATTLE_HISTORY->usedMoves[b].moves[0..3] = MOVE_NONE` (`:3260`, body `battle_ai_script_commands.c:635-641`) | `factoryAiLiveDriver.ts:200-203` — clears `usedMoves[battler]` when `partyIndexes[battler]` changed since the last sync | SAME-outcome, different trigger (party-index delta vs. explicit call). Note the port's own comment at `:206-207` correctly records that neither `SwitchInClearSetData` nor `FaintClearSetData` calls `ClearBattlerItemEffectHistory`, so `knownItemEffects` is deliberately retained — matches source |
| C37 | `ClearBattlerAbilityHistory(b)` → `BATTLE_HISTORY->abilities[b] = ABILITY_NONE` (`:3261`, body `battle_ai_script_commands.c:648-651`) | `battleScriptSwitchinOpcode.ts:633-637` (`aiObservedAbilityIds[b] = 0`) **and** `factoryAiLiveDriver.ts:204-205` (`knownAbilities[b] = null`) | SAME |
| C38 | source does **not** touch `gProtectStructs[b]` — that is `FaintClearSetData`'s job (`:3292-3310`) | port `:544`, `:546-547`, `:551` additionally zero `usedDisabledMove`, `usedTauntedMove`, `usedImprisonedMove`, `notFirstStrike` — four `ProtectStruct` fields | DIVERGENT-BENIGN — see §7 note N1 |
