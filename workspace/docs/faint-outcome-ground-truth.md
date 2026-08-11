# Faint-to-terminal-outcome ground truth (ROADMAP S10 step (iv) PREP)

Answers one question with receipts: what is the exact executable path from
`Cmd_tryfaintmon`'s faint branch to `gBattleOutcome` becoming `1`
(`B_OUTCOME_WON`, `include/constants/battle.h:100`) in a Factory singles
battle, and what is the smallest set of opcode registrations + new modeling
that lets this engine's `checkteamslost` decide a real terminal outcome
instead of reading a fixture? This is PREP for step (iv), not step (iv)
itself — no `src/` production code is touched by this doc's worker.

Builds directly on `docs/hit-chain-ground-truth.md`'s "Edge cases" section
(RUNG 4, ISSUES #42/#43): that probe already got the KO scenario past the
kill to the real `battleOutcome: 0 -> 1` boundary but explicitly left two
things undone — the per-opcode topology from the faint branch onward, and
whether the unattributed 10-`Random()`-call block between one kill and the
next belongs to the faint/outcome machinery at all. Both are answered below.

Rerunnable verify script: `tools/probe/verify-faint-outcome-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-faint-outcome-ground-truth.ts`).
It reruns the **already-committed** `tools/battle-lab/mechanic-hit-chain-ko-off.json`
(no new scenario needed — that scenario already runs past every KO to the
real battle-end boundary at frame 1650) and asserts every claim in this doc
against a fresh oracle run. All 16 checks **PASS** against the live
`battle-scene-off` oracle as of this writing (see "Verify script output"
below).

## 1. Source topology: the exact path, opcode by opcode

Starting point: `tryfaintmon BS_TARGET`'s faint branch (already registered,
S10 step (ii) RUNG 4) does a real `call`-style transition
(`BattleScriptPush(gBattlescriptCurrInstr + 7)`, `battle_script_commands.c:3005`)
into `BattleScript_FaintTarget` (`data/battle_scripts_1.s:2817-2823`). Its
`return` (`:2823`) pops back to the instruction right after `tryfaintmon` in
`BattleScript_EffectHit` — `moveendall` (`:264-266`), which shares
`B_SCR_OP_MOVEEND`'s dispatcher.

`Cmd_moveend` reaching `MOVEEND_COUNT` does not itself call anything further
— it just lets the script instruction pointer advance
(`gBattlescriptCurrInstr += 3`, `:4497`) and returns control to the **C main
loop's action-func cycle** (`gCurrentActionFuncId`, `src/battle_main.c`),
which is a wholly separate state machine from the Battle Script VM. That
cycle eventually reaches `HandleAction_TryFinish` (`battle_util.c:637-643`),
which calls `HandleFaintedMonActions()` (`battle_util.c:1894-1968`) — a
7-state loop (`FAINTED_ACTIONS_MAX_CASE 7`) that, for **every** battler with
`gBattleMons[i].hp == 0`, first `BattleScriptExecute(BattleScript_GiveExp)`
(states 1-2) and then, once every fainted battler has been given a chance at
EXP, `BattleScriptExecute(BattleScript_HandleFaintedMon)` (states 3-5) for
each fainted battler in turn. **This C-side loop, not any Battle Script
opcode, is what invokes `checkteamslost` at all** — it is not reachable by
adding opcodes to the VM alone; the engine needs an equivalent orchestration
loop (see §3).

`BattleScript_GiveExp` (`data/battle_scripts_1.s:2825-2828`):
```
setbyte sGIVEEXP_STATE, 0
getexp BS_TARGET
end2
```
`BattleScript_HandleFaintedMon` (`:2830-2897`), the part reachable before any
switch-in dance:
```
checkteamslost BattleScript_LinkHandleFaintedMonMultiple
jumpifbyte CMP_NOT_EQUAL, gBattleOutcome, 0, BattleScript_FaintedMonEnd
jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose
...
BattleScript_FaintedMonEnd::
end2
```

### 1a. Opcode enumeration (faint branch → terminal `gBattleOutcome`)

| # | Opcode (`B_SCR_OP_*`) | ID | Dispatcher | Registered? | State read/written |
| - | --- | -: | --- | --- | --- |
| 1 | `TRYFAINTMON` | 25 | `Cmd_tryfaintmon` | **yes** (RUNG 4) | reads `gBattleMons[t].hp`; writes `HITMARKER_FAINTED`/`HITMARKER_PLAYER_FAINTED` |
| 2 | `PLAYFAINTCRY` (`BS_TARGET`) | 86 | `Cmd_playfaintcry` | yes, but **blocked** by #43 (`BS_TARGET` selector) | controller cry command only, no battle state |
| 3 | `PAUSE` | 57 | `Cmd_pause` | yes | none (timer only) |
| 4 | `DOFAINTANIMATION` (`BS_TARGET`) | 26 | `Cmd_dofaintanimation` | **no** | controller `FaintAnimation` emit only (`battle_script_commands.c:3052-3060`); no `gBattleMons`/RNG touch |
| 5 | `CLEAREFFECTSONFAINT` (`BS_TARGET`) | 27 | `Cmd_cleareffectsonfaint` | **no** | writes `gBattleMons[t].status1=0` + `FaintClearSetData()` (`battle_main.c:3264-3345`: `statStages`→default, `status2=0`, `gStatuses3=0`, cross-battler infatuation/wrap/escape-prevention clear over ALL battlers, `DisableStruct`/`ProtectStruct` zeroed, `gLastMoves`/`gLastLandedMoves`/etc. cleared) — all **battler-scoped fields this engine already models** for its 4 active battlers; no party, no RNG |
| 6 | `PRINTSTRING` | 16 | `Cmd_printstring` | yes | message buffer only |
| 7 | `RETURN` | 60 | `Cmd_return` | yes (core control) | script call-stack pop |
| 8 | `MOVEEND` (`moveendall`) | 73 | `Cmd_moveend` | **no** (step (iii)'s own boundary) | 12-state machine (`MOVEEND_RAGE`…`MOVEEND_NEXT_TARGET`, `:4240-4485`); **for this matchup every state's guard is false** (no rage/freeze/synchronize/on-damage-ability/choice-item/king's-rock/substitute/second-target — items+abilities overridden to 0) so it is a no-op state walk to `MOVEEND_COUNT`; zero `Random(` call sites of its own (grepped) |
| — | *(C-side, not a script opcode)* `HandleFaintedMonActions` | — | `battle_util.c:1894` | **no engine equivalent exists** | drives GiveExp then HandleFaintedMon per fainted battler; see §3 |
| 9 | `SETBYTE` (`sGIVEEXP_STATE`) | — | `Cmd_setbyte` | yes (`battleScriptSetByte.ts`) | scratch byte only |
| 10 | `GETEXP` (`BS_TARGET`) | 35 | `Cmd_getexp` | **no** | **short-circuits immediately** for `BATTLE_TYPE_FRONTIER` (`:3270-3280`, `case 0`) regardless of which side fainted, jumping to `case 6`, which sets `gBattleMons[fainted].item/ability = 0` and advances — the general EXP/level-up/evolution machinery (`case 1-5`) is **dead code for Factory battles** |
| 11 | `END2` | 62 | `Cmd_end2` | yes (core control) | ends this `BattleScriptExecute` |
| 12 | `CHECKTEAMSLOST` | 36 | `Cmd_checkteamslost` | **no** | reads full `gPlayerParty`/`gEnemyParty` (`MON_DATA_HP` over all `PARTY_SIZE=6` slots, species-nonzero/non-egg gated, `:3554-3575`); writes `gBattleOutcome \|= B_OUTCOME_LOST`/`B_OUTCOME_WON` |
| 13 | `JUMPIFBYTE` (`CMP_NOT_EQUAL, gBattleOutcome, 0, …FaintedMonEnd`) | 41 | `Cmd_jumpifbyte` | **no** | reads `gBattleOutcome`; branches |
| 14 | `END2` | 62 | `Cmd_end2` | yes (core control) | terminal — battle-outcome-finished gate (`battleScriptActionAdmission.ts:3619`) already reads `battleOutcome` at the next action's entry |

Rows 4, 5, 8, 10, 12, 13 are the **six unregistered opcodes** on the minimal
path (`getexp` counted once — it always executes for the fainted battler,
win or not). Confirmed **not** on the minimal terminal path, because
`checkteamslost`'s own `jumpifbyte` short-circuits straight to
`BattleScript_FaintedMonEnd` the instant `gBattleOutcome != 0`:
`jumpifbattletype`, `openpartyscreen` (id 80), `switchhandleorder` (id 81),
and everything in `BattleScript_FaintedMonTryChoose`/`SendOutNew` — those
only run for the **non-terminal** next-mon path (see §1b), and remain
completely unregistered/unimplemented today (grepped: zero mentions in
`src/engine/*.ts`).

### 1b. Non-terminal vs terminal fork (confirmed both from source and oracle)

`Cmd_checkteamslost` (`battle_script_commands.c:3534-3619`) sums
`gPlayerParty`/`gEnemyParty` HP; if a sum hits 0 it ORs the matching outcome
bit into `gBattleOutcome`, then (non-link battle) always falls through
(`gBattlescriptCurrInstr += 5`, `:3617`) to the very next instruction — the
`jumpifbyte CMP_NOT_EQUAL, gBattleOutcome, 0, BattleScript_FaintedMonEnd` at
`data/battle_scripts_1.s:2832`. Non-last faint → `gBattleOutcome` stays 0 →
the jump is **not** taken → falls into
`jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose` →
(Factory is `BATTLE_TYPE_TRAINER`) → `openpartyscreen BS_FAINTED` →
`switchhandleorder BS_FAINTED, 2` → `jumpifbattletype BATTLE_TYPE_FRONTIER,
BattleScript_FaintedMonSendOutNew` (Factory always takes this — no Yes/No
dialog) → the send-out script. Last faint → `gBattleOutcome` is nonzero → the
jump **is** taken straight to `BattleScript_FaintedMonEnd:: end2`, skipping
the entire switch-in dance. This is exactly what the oracle shows (§2).

## 2. Oracle ground truth (verify script output, live run)

```
=== Faint-to-terminal-outcome ground truth: mechanic-hit-chain-ko-off.json ===
PASS: determinism: frame 0 identical across reruns
PASS: determinism: terminal frame identical across reruns
PASS: turn 1 kill: battleOutcome still 0 (non-terminal, 2 SUNKERN remain)
PASS: turn 2 kill: battleOutcome still 0 (non-terminal, 1 SUNKERN remains)
PASS: turn 3 kill (LAST opponent party member): battleOutcome flips to 1 == B_OUTCOME_WON (include/constants/battle.h:100)
PASS: switch-in dance after turn 1's kill draws ZERO Random() calls (rngValue unchanged 260 -> 510)
PASS: switch-in dance after turn 2's kill draws ZERO Random() calls (rngValue unchanged 860 -> 1110)
PASS: post-switch-1 -> turn 2 kill is exactly 10 Random() calls (6 AI re-score + 4 hit chain)
PASS: post-switch-2 -> turn 3 (terminal) kill is exactly 10 Random() calls (6 AI re-score + 4 hit chain)
PASS: turn 2's own 4-roll hit chain is positively the LAST 4 of the 10-call block (forward-derived from +6 lands exactly on turn2Ko.rngValue)
PASS: turn 2's independently-derived damage roll overkills SUNKERN #2's 90 HP (cross-check beyond LCG arithmetic alone)
PASS: turn 3's (terminal) own 4-roll hit chain is positively the LAST 4 of the 10-call block
PASS: turn 3's independently-derived damage roll overkills SUNKERN #3's 90 HP
PASS: turn 1: active opponent HP is 0 but battleOutcome has NOT flipped (rules out active-HP-only)
PASS: turn 2: active opponent HP is 0 but battleOutcome has NOT flipped (rules out active-HP-only)
PASS: turn 3: active opponent HP is 0 AND it is the last (partyIndex 2) roster slot AND battleOutcome flips

ALL CHECKS PASSED
```

### 2a. `gBattleOutcome`'s exact transition (tick-pinned)

| Event | Frame | `battleOutcome` | opponent HP | opponent partyIndex |
| --- | -: | -: | -: | -: |
| Turn 1 kill (SUNKERN #1) | 260 | 0 | 0/90 | 0 |
| Switch-in complete (SUNKERN #2) | 510 | 0 | 90/90 | 1 |
| Turn 2 kill (SUNKERN #2) | 860 | 0 | 0/90 | 1 |
| Switch-in complete (SUNKERN #3, **last**) | 1110 | 0 | 90/90 | 2 |
| **Turn 3 kill (SUNKERN #3, terminal)** | **1650** | **1 (WON)** | 0/90 | 2 |

### 2b. RNG ledger across the faint window (newly attributed)

The previous round left the 10-`Random()`-call block between one kill and
the next completely unattributed. This round splits it cleanly:

- **The entire switch-in send-out script draws zero `Random()` calls**, both
  times (`rngValue` identical at frame 260→510 and 860→1110). This matches
  source: none of the three battlers has a real ability (all overridden to
  `0`/none per the scenario), so `switchineffects`'s `AbilityBattleEffects`
  call is a no-op here — this is a scenario-scoped finding, not a universal
  claim that switch-in can never roll RNG.
- **The 10 calls between "switch-in complete" and "next kill" split as 6 + 4**:
  the last 4 are positively the next attack's own hit chain (forward-deriving
  the standard `accuracycheck`/`critcalc`/`adjustnormaldamage`/
  `seteffectwithchance` sequence from *6 steps after* the switch-in's
  `rngValue` lands **exactly** on the next kill's captured `rngValue`, and the
  resulting damage roll independently overkills the next SUNKERN's 90 HP —
  not just an LCG coincidence). The remaining 6 are the opponent Factory AI's
  move re-scoring pass for the newly active battler (unattributed at the
  individual-call level — same limitation flagged in
  `docs/hit-chain-ground-truth.md` for the AI's turn-order scoring elsewhere —
  but now bounded to a window that provably excludes the faint/outcome
  machinery).
- **`Cmd_moveend`, `Cmd_getexp`, and `Cmd_checkteamslost` each contain zero
  `Random(` call sites** (grepped directly over their full bodies:
  `battle_script_commands.c:4210-4498`, `:3255-3529`, `:3534-3619`). Combined
  with the empirical zero-RNG switch-in dance, **registering the six
  unregistered opcodes on the minimal path introduces no new RNG accounting
  burden** — every roll in the window is already accounted for by mechanisms
  this doc attributes, none of it by the newly-registerable opcodes
  themselves.

### 2c. What `checkteamslost` actually decides on (party HP, not active HP)

Source already answers this unambiguously (`battle_script_commands.c:3554-3575`:
loops `PARTY_SIZE` (6) slots of `gPlayerParty`/`gEnemyParty`, sums
`MON_DATA_HP`). The oracle is fully consistent and rules out the cheaper
misreading (active-battler HP only): turns 1 and 2 both show the **active**
opponent battler's HP at exactly 0 with `battleOutcome` still 0 — if
`checkteamslost` decided on active HP alone, the battle would have ended on
turn 1. It only flips once the battler at HP 0 is also the party's **last**
living slot (`partyIndex 2`, confirmed via the non-terminal-vs-terminal
`partyIndex` progression above). ISSUES #42's framing is confirmed correct:
this needs real party-wide HP data, not a `BattleScriptRulesContext` active-4-battler
shortcut.

## 3. Minimal registration set for step (iv)

**Six new opcode registrations** (`DOFAINTANIMATION`, `CLEAREFFECTSONFAINT`,
`MOVEEND`, `GETEXP`, `CHECKTEAMSLOST`, `JUMPIFBYTE`) are necessary but **not
sufficient**. Two structural gaps also block a real terminal outcome and are
not "just an opcode":

1. **No C-side action-func / fainted-actions orchestration exists.**
   `factoryBattleScriptDecision.ts` currently treats "the machine halts at
   `moveend`" as *the* boundary (`:625-628`, a test assertion). The real ROM
   only reaches `checkteamslost` via `HandleFaintedMonActions()`
   (`battle_util.c:1894-1968`), a **separate C-level state machine** driven
   from the main action-func cycle (`gCurrentActionFuncId`), not from
   anything the Battle Script VM's opcode dispatch touches. Step (iv) needs
   an engine-side equivalent of this loop — something that, once a hit
   chain's own `moveend` reaches its terminal state, iterates fainted
   battlers and drives `BattleScript_GiveExp` then
   `BattleScript_HandleFaintedMon` for each, in that order. This is new
   scheduling logic, not a 7th opcode.
2. **`checkteamslost` needs party-wide HP that does not exist in
   `BattleScriptRulesContext` today** (ISSUES #42). Recommended shape: the
   **smallest source-shaped slice**, not a general party manager —
   `BattleScriptRulesContext` only needs, per side, a `PARTY_SIZE`-length
   array of `{ species, isEgg, hp }` (exactly the three fields
   `GetMonData(..., MON_DATA_SPECIES/MON_DATA_IS_EGG/MON_DATA_HP)` reads at
   `:3556/:3570`) kept in sync with whichever slot is currently active
   (already-registered `datahpupdate` writes the active battler's HP; that
   write needs to also land in this party array at the active battler's
   `partyIndex`). This is deliberately narrower than a full bench/switch
   model — `switchindataupdate`/`getswitchedmondata`/etc. (the general
   switch-in party read) are **not** needed for the terminal WIN path (§1a),
   only for the non-terminal next-mon path, which is out of scope for "one
   battle reaches a terminal outcome."

Registration order that keeps each step provable in isolation, cheapest
first: `JUMPIFBYTE` (generic, reusable by many future opcodes, zero new
state) → `DOFAINTANIMATION` (controller-only, needs only the #43 `BS_TARGET`
fix) → `CLEAREFFECTSONFAINT` (battler-scoped fields this engine already
models, needs the same #43 fix) → the party-HP slice above → `CHECKTEAMSLOST`
(pure function of that slice + `jumpifbyte`, provable stand-alone with a
direct-construction Tier-1 test before any orchestration exists) →
`GETEXP` (Factory short-circuit only — the general EXP engine is out of
scope and should stay a named, narrow barrier) → `MOVEEND` (step (iii)'s own
scope, tracked separately) → the `HandleFaintedMonActions` orchestration loop
last, since it is the only piece that actually *calls* the others in
sequence.

## 4. ISSUES #43's fix needs — verified against source, not assumed

Two distinct selector gaps, **not one**:

- **`BS_TARGET` inside `BattleScript_FaintTarget`/`FaintAttacker`**
  (`playfaintcry`, `dofaintanimation`, `cleareffectsonfaint`) — this is the
  literal gap ISSUES #43 already names. `GetBattlerForBattleScript`
  (`battle_util.c:694-734`) confirms `BS_TARGET → gBattlerTarget`
  unconditionally, and at this point in execution `gBattlerTarget` is still
  whatever the *original hit chain* set it to (unchanged since
  `BattleScript_EffectHit` began) — so `resolveRulesBattlerForBattleScript`'s
  existing `selectorRoles.target` (already populated,
  `battleScriptRulesContext.ts:1543`) is the **correct** value here. The fix
  really is additive: one more `if (selector === BS_TARGET) return
  …selectorRoles.target` arm, as ISSUES #43 already says.
- **`BS_FAINTED` is a *different*, currently-nonexistent role — not just a
  missing `if` arm.** `GetBattlerForBattleScript` maps `BS_FAINTED →
  gBattlerFainted` (`:713`), and `gBattlerFainted` is reassigned by
  `HandleFaintedMonActions` itself (`gBattlerFainted = gBattlerTarget =
  gBattleStruct->faintedActionsBattlerId`, `battle_util.c:1914`) to
  **whichever battler that C-side loop is currently processing** — which can
  diverge from the original hit chain's target once more than one battler
  has fainted in the same action (not reachable in singles, but real for
  doubles/multi). **Subtlety worth flagging for whoever registers `getexp`:**
  `BattleScript_GiveExp`'s own operand is `getexp BS_TARGET`, not
  `BS_FAINTED` — but by the time it runs, `gBattlerTarget` has already been
  overwritten by that same reassignment, so reusing the hit chain's stale
  `selectorRoles.target` for `getexp`'s `BS_TARGET` would be **wrong** in
  general (it happens to coincide in this scenario, since there is exactly
  one fainted battler per action here, which is why the verify script's
  cross-checks all still pass). The source-faithful fix binds a real
  "currently-processing-fainted-battler" role once the orchestration loop
  (§3.1) exists, not a second alias onto the existing `target` role.
  `openpartyscreen BS_FAINTED`/`switchhandleorder BS_FAINTED` (the
  non-terminal next-mon path) also depend on this same new role, confirming
  it is not a one-off.
