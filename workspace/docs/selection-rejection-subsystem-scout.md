# Selection-rejection subsystem scout: the interactive half of Torment

Answers ISSUES #72's "Also found, tracked separately" note (its own text quoted
below, in full, so this scout does not re-litigate the premise):

> `STRINGID_PKMNCANTUSEMOVETORMENT` is DEAD *today*, but the prior note here
> (and `docs/issue72-reachability-triage.md`'s row for it) mis-cited *why* —
> **corrected 2026-08-03, see PROGRESS.md #903.** Read
> `reference/pokeemerald/src/battle_util.c:1983-2268` in full:
> `AtkCanceler_UnableToUseMove`'s `CANCELER_*` enum and switch have exactly 14
> cases (`CANCELER_FLAGS` … `CANCELER_THAW`, terminated by `CANCELER_END`) and
> **no Torment case at all** — not a missing phase between `DISABLED` and
> `TAUNTED`, a real absence in the ground-truth source itself. Torment's
> move-reuse block is enforced only at move-*selection* time, by
> `TrySetCantSelectMoveBattleScript` (`battle_util.c:999-1012`, called from
> `HandleTurnActionSelectionState` in `battle_main.c:4382` for both player and
> AI battlers), which dispatches to `BattleScript_SelectingTormentedMove`
> (`printselectionstring`, `battle_scripts_1.s:3563-3565`) — a different label
> than `BattleScript_MoveUsedIsTormented` (`printstring`, same STRINGID) that
> the old note pointed at, which has **zero callers anywhere in `src/*.c`** and
> is dead in the real game too. This engine already ports the *silent* half
> correctly (`CheckMoveLimitations`'s Torment bit,
> `battleScriptActionAdmission.ts:2485-2491`, mirrors `battle_util.c:1107`
> exactly) — the missing half is the interactive "rejected selection, forced
> reselect + flavor text" loop, which this decision-boundary-driven engine has
> no representation for at all (no other selection-time
> `printselectionstring` rejection path is wired either). That is a new
> subsystem, not a same-shape-as-Taunt/Imprison AtkCanceler phase addition —
> out of bounds for a bounded step; needs supervisor re-scoping.

**Premise check: holds, no contradiction found.** Every claim in the note
above is re-verified independently below (line numbers, callers, dead-code
status) and confirmed exact. This is a docs-only scout; no `src/`/`tests/`
edits were made.

## Part 1 — Ground truth

### 1.1 `TrySetCantSelectMoveBattleScript` in full (`battle_util.c:976-1080`)

Six causes, evaluated **unconditionally in this fixed order** (every `if` is
independent — the function does not early-return), each incrementing a
`limitations` counter and, on its own condition, **overwriting**
`gSelectionBattleScripts[gActiveBattler]` with no "already set" guard:

| # | Cause | Trigger condition (`battle_util.c`) | Non-Palace script label (`battle_scripts_1.s`) | STRINGID | Opcode |
| --- | --- | --- | --- | --- | --- |
| 1 | Disabled | `:983` `gDisableStructs[battler].disabledMove == move && move != MOVE_NONE` | `BattleScript_SelectingDisabledMove` (`:3359-3361`) | `STRINGID_PKMNMOVEISDISABLED` | `printselectionstring` |
| 2 | Torment | `:999` `move == gLastMoves[battler] && move != MOVE_STRUGGLE && status2 & STATUS2_TORMENT` | `BattleScript_SelectingTormentedMove` (`:3563-3565`) | `STRINGID_PKMNCANTUSEMOVETORMENT` | `printselectionstring` |
| 3 | Taunt | `:1014` `tauntTimer != 0 && gBattleMoves[move].power == 0` | `BattleScript_SelectingNotAllowedMoveTaunt` (`:3576-3578`) | `STRINGID_PKMNCANTUSEMOVETAUNT` | `printselectionstring` |
| 4 | Imprison | `:1029` `GetImprisonedMovesCount(battler, move)` | `BattleScript_SelectingImprisonedMove` (`:3654-3656`) | `STRINGID_PKMNCANTUSEMOVESEALED` | `printselectionstring` |
| 5 | Choice Band lock | `:1051` `holdEffect == HOLD_EFFECT_CHOICE_BAND && *choicedMove not NONE/UNAVAILABLE && *choicedMove != move` | `BattleScript_SelectingNotAllowedMoveChoiceItem` (`:4386-4388`) | `STRINGID_ITEMALLOWSONLYYMOVE` | `printselectionstring` |
| 6 | No PP | `:1066` `pp[chosenSlot] == 0` | `BattleScript_SelectingMoveWithNoPP` (`:3552-3554`) | `STRINGID_NOPPLEFT` | `printselectionstring` |

Every one of the 6 scripts is exactly `printselectionstring <ID>` immediately
followed by `endselectionscript` — **none call `waitmessage`** (contrast with
their `printstring`-based siblings like `BattleScript_MoveUsedIsDisabled`,
which does `printstring` + `waitmessage B_WAIT_TIME_LONG`). This is
significant for §1.2's rendering timing.

Two additional real-source facts worth flagging as findings, not assumptions:

- **Overwrite order means "last true condition wins" the displayed message**,
  not "first cause found." If a move were simultaneously Tormented and
  Taunted (e.g. Torment locks a move to 0 PP-power... not applicable, but
  Choice-locked *and* Disabled is possible), the flavor text shown is
  whichever cause is *later* in source order (1→6 above), because each
  `if` unconditionally reassigns the script pointer. `limitations` itself is
  only ever tested as `!= 0` at the call site (`battle_main.c:4382`), never
  compared for magnitude.
- Torment's branch alone has a side effect beyond scripting:
  `CancelMultiTurnMoves(gActiveBattler)` (`:1001`) runs before the script is
  set, even though this path is a rejection (the move was never actually
  used) — this is source's own behavior, not a bug to route around.
- Palace (`BATTLE_TYPE_PALACE`) siblings exist for all 6 causes, but Choice
  Band and No-PP's Palace branches only set
  `gProtectStructs[battler].palaceUnableToUseMove = TRUE` **without**
  assigning a script pointer at all — i.e. even in real Palace mode those two
  causes print nothing. Battle Palace is out of scope for this engine
  regardless (facility gate, per `docs/issue72-reachability-triage.md`'s
  settled rows), noted here only for completeness.

### 1.2 `HandleTurnActionSelectionState` — the reject/re-select loop (`battle_main.c:4129-4535`)

State machine trace for a PLAYER battler picking a move (state names are the
literal `gBattleCommunication[gActiveBattler]` enum values):

1. `STATE_BEFORE_ACTION_CHOSEN` (`:4143`): FIGHT chosen from the main action
   menu → advances.
2. `STATE_WAIT_ACTION_CHOSEN` (`:4175`), `case B_ACTION_USE_MOVE` (`:4183`):
   if `AreAllMovesUnusable()` (the sibling all-slots-masked case, §1.2b)
   is false and no Encore lock, emits `BtlController_EmitChooseMove` (`:4217`)
   — **this is where the 4-move menu is actually shown.**
3. Player picks a move → `STATE_WAIT_ACTION_CASE_CHOSEN` (`:4354`),
   `case B_ACTION_USE_MOVE` default arm (`:4375-4403`): calls
   `TrySetCantSelectMoveBattleScript()` at **`:4382`**.
4. If it returns nonzero: `RecordedBattle_ClearBattlerAction` clears the
   pending action, state becomes `STATE_SELECTION_SCRIPT`,
   `stateIdAfterSelScript[gActiveBattler] = STATE_WAIT_ACTION_CHOSEN`
   (`:4383-4389`) — **explicitly the same state that shows the move menu**,
   not `STATE_WAIT_ACTION_CASE_CHOSEN`.
5. `STATE_SELECTION_SCRIPT` (`:4486-4501`): each tick, if the controller for
   that battler isn't busy, runs the next opcode of
   `gSelectionBattleScripts[gActiveBattler]` via
   `gBattleScriptingCommandsTable[...]()`. First opcode
   `Cmd_printselectionstring` (`battle_script_commands.c:2148-2157`) emits
   `BtlController_EmitPrintSelectionString` and marks the controller busy;
   the *next* opcode, `endselectionscript`, only executes once the
   controller becomes free again (`Cmd_endselectionscript`,
   `:3999-4002`, just sets `selectionScriptFinished[battler] = TRUE`).
6. When `selectionScriptFinished` is true, `STATE_SELECTION_SCRIPT`
   transitions to `stateIdAfterSelScript` = `STATE_WAIT_ACTION_CHOSEN` —
   **which re-emits `BtlController_EmitChooseMove`, reopening the same
   4-move menu.**

**Rendering** (`battle_controller_player.c`): `PlayerHandlePrintSelectionString`
(`:2557-2563`) calls `PlayerHandlePrintString` (`:2543-2555`), which draws
into **`B_WIN_MSG`** — the ordinary battle-text window, not a special popup —
then sets the controller's tick function to `CompleteOnInactiveTextPrinter2`
(`:1339-1343`), which waits only for `!IsTextPrinterActive(B_WIN_MSG)` (the
letter-by-letter typewriter animation finishing) and immediately calls
`PlayerBufferExecCompleted()`. **There is no button-press dismissal and no
extra hold** — because the selection scripts never call `waitmessage`
(§1.1), the flavor text is on screen for exactly the typing duration, then
the engine moves straight to re-showing the move menu. This is a real,
citable distinction from every other `printstring`+`waitmessage
B_WAIT_TIME_LONG` flow already ported elsewhere in this codebase.

**1.2b — the sibling case, `AreAllMovesUnusable`/`BattleScript_NoMovesLeft`.**
A *different* function, `AreAllMovesUnusable` (`battle_util.c:1125-1140`),
runs earlier, at step 2 above (`battle_main.c:4184`), **before the move menu
is ever shown**: if `CheckMoveLimitations(battler, 0, MOVE_LIMITATIONS_ALL)`
masks all 4 slots, it sets `noValidMoves = TRUE`,
`gSelectionBattleScripts[battler] = BattleScript_NoMovesLeft`
(`printselectionstring STRINGID_PKMNHASNOMOVESLEFT`, `:3548-3550`) and routes
to `STATE_SELECTION_SCRIPT` with `stateIdAfterSelScript =
STATE_WAIT_ACTION_CONFIRMED_STANDBY` — **not** back to the move menu; the
battler is committed straight to (eventually) Struggle. This is a distinct,
adjacent cause from `TrySetCantSelectMoveBattleScript`'s 6 (§1.1); it shares
the same `printselectionstring` mechanics and STRINGID-blind-spot problem
(§1.5) but is not itself part of "Torment's missing half." Flagged here
because this engine's `usesForcedStruggle`
(`factoryBattleScriptFullTurnDecision.ts:1843-1851`) and the all-masked branch
of `legalMoveDecisions` (`:1745-1752`) already silently model the *outcome*
(forced Struggle) without ever printing `STRINGID_PKMNHASNOMOVESLEFT` — the
exact same silent-vs-interactive gap shape as Torment, one level up.

### 1.3 AI half

`BattleAI_SetupAIData` (`battle_ai_script_commands.c:312-333`) calls
`CheckMoveLimitations(gActiveBattler, 0, MOVE_LIMITATIONS_ALL)` at `:333` and
zeroes the score of every masked move slot (`:336-339`) **before** the AI's
scoring loop ever runs. The AI therefore never proposes a move that would
trip `TrySetCantSelectMoveBattleScript`'s rejection in the first place;
`TrySetCantSelectMoveBattleScript`'s own call site
(`battle_main.c:4382`, inside the shared per-`gActiveBattler` loop) still
executes for trainer/AI battlers, but it is a dead-in-practice safety net —
a real double-check with no attainable trigger, given `CheckMoveLimitations`
already steered the AI away.

**Port audit — no gaps.** `checkBattleScriptMoveLimitations`
(`battleScriptActionAdmission.ts:2446-2519`) is a complete, bit-for-bit port
of `CheckMoveLimitations` (`battle_util.c:1082-1123`): ZEROMOVE (`:2467-2472`),
PP (`:2473-2478`), Disabled (`:2479-2484`), Tormented (`:2485-2491`), Taunt
(`:2492-2498`), Imprison (`:2499-2505`), Encore — unconditional, matching
source's own unconditional Encore check outside the `check` mask
(`:2506-2508`), Choice Band — likewise unconditional, matching source
(`:2509-2516`). This contradicts the brief's own speculative example list
("gaps here are findings ... e.g. Imprison, Disable, Choice lock, no-PP") —
**there are no gaps to list.** All of it is exercised in
`tests/battleScriptSettormentOpcode.test.ts`. What's missing is not a bit in
this function; it's the *entire other function*
(`TrySetCantSelectMoveBattleScript`) and its interactive reject/re-prompt
loop, which is architecturally distinct from a legality bitmask.

### 1.4 Factory L50 singles reachability per cause

Method follows `docs/issue72-reachability-triage.md`'s header (trace each
cause to its move/item, check the L50 draft-range floor/ceiling
`FRONTIER_MON_GRIMER`=110 … `FRONTIER_MONS_HIGH_TIER`=849 from
`sInitialRentalMonRanges`, `battle_factory.c:169-186`, mirrored in
`factory-round-policy.json`). Carrier data queried directly from
`src/data/gen/battle-frontier-mons.json` (882-entry raw catalog) and
`src/data/gen/battle-script-topology.json`'s `level50FactoryReachableEffects`:

| Cause | Carrier gate | In-range (110–849) carriers | Verdict |
| --- | --- | --- | --- |
| Disabled | `MOVE_DISABLE` known by the opponent | 5: `DROWZEE`(114), `KADABRA_1`(169), `WIGGLYTUFF_1`(207), `DEWGONG_2`(488), `ALAKAZAM_3`(596) | **REACHABLE** |
| Torment | `MOVE_TORMENT` known by the opponent | 4: `KOFFING`(127), `MURKROW_1`(184), `PERSIAN_1`(218), `MR_MIME_3`(572) | **REACHABLE** — `MURKROW_1` (184) is the same rental as the original Taunt crash report; it independently carries Torment too |
| Taunt | `MOVE_TAUNT` known by the opponent | 2: `MURKROW_1`(184), `MIGHTYENA_1`(202) | **REACHABLE** (casting side already fixed for #72; this scout is about the separate selection-rejection side, still unfixed) |
| Imprison | `MOVE_IMPRISON` known by the *battler itself* | 0 in range — sole raw-catalog carrier is `FRONTIER_MON_RALTS` (index 5), below the L50 floor of 110 | **DEAD** — identical gate already established for the AtkCanceler-side `STRINGID_PKMNCANTUSEMOVESEALED` row in the triage doc; Imprison can never be cast at Factory L50 singles at all, so this selection-time sibling is equally unreachable |
| Choice Band lock | holder's own item is `BATTLE_FRONTIER_ITEM_CHOICE_BAND` | 11: `FURRET_2`(304), `LINOONE_2`(308), `KECLEON_2`(325), `ABSOL_2`(352), `AERODACTYL_2`(531), `MR_MIME_3`(572), `ALAKAZAM_3`(596), `SLAKING_3`(659), `GRANBULL_4`(664), `ARMALDO_4`(705), `URSARING_5`(804) | **REACHABLE** |
| No PP | none — universal | any move, any rental | **REACHABLE**, trivially (ordinary repeated use over a 7-battle set) |
| (sibling) all-masked / `NoMovesLeft` | compound: all 4 slots simultaneously masked | same carriers as above, compounded | **REACHABLE** but rare; not itself one of the 6 |

### 1.5 The census blind spot is structural, not incidental

`tools/report/printstring-literal-census.ts:91` reads:
`if (statement.mnemonic !== "printstring") continue;` — it **never matches
`printselectionstring` or `printselectionstringfromtable`.** Grepping the
full corpus confirms this is not a Torment-only miss: every
`printselectionstring` call site in `reference/pokeemerald/data/battle_scripts_1.s`
(9 unique STRINGIDs total) is invisible to the #70/#72 sweep methodology by
construction:

`STRINGID_BOXISFULL` (`:3085`, Safari-only, no Safari Zone in Factory),
`STRINGID_PKMNMOVEISDISABLED` (`:3360`), `STRINGID_PKMNHASNOMOVESLEFT`
(`:3549`), `STRINGID_NOPPLEFT` (`:3553`), `STRINGID_PKMNCANTUSEMOVETORMENT`
(`:3564`), `STRINGID_PKMNCANTUSEMOVETAUNT` (`:3577`),
`STRINGID_PKMNCANTUSEMOVESEALED` (`:3655`), `STRINGID_ITEMALLOWSONLYYMOVE`
(`:4387`), `STRINGID_ITEMSCANTBEUSEDNOW` (`:4427`, the link/no-item-use
selection gate — a separate command-selection surface, not move-selection),
`STRINGID_QUESTIONFORFEITMATCH` (`:4548`, the run/forfeit Yes/No prompt,
already established dead — no run/forfeit decision kind exists in this
engine's `BattleCommandDecision` surface at all, per the existing
`STRINGID_FORFEITEDMATCH` triage row).

Presentation-resolver status of the 6 causes' STRINGIDs, checked directly
against `battleResolutionPresentation.ts` (grep for each literal): only
`STRINGID_PKMNMOVEISDISABLED` and `STRINGID_PKMNCANTUSEMOVETAUNT` currently
have any resolver branch at all (inherited from their `printstring`-emitting
siblings `BattleScript_MoveUsedIsDisabled`/`BattleScript_MoveUsedIsTaunted` —
same STRINGID, different label, already fixed for other reasons). The other
four — `STRINGID_NOPPLEFT`, `STRINGID_PKMNCANTUSEMOVESEALED` (moot: DEAD
carrier), `STRINGID_PKMNCANTUSEMOVETORMENT`, `STRINGID_ITEMALLOWSONLYYMOVE`,
plus `STRINGID_PKMNHASNOMOVESLEFT` — have zero resolver coverage anywhere.
Whichever integration option below is picked, it needs new `messageLines`
branches for those; reusing the existing Disabled/Taunt branches for the
selection-time context needs its own check that the role-buffer shape
selection-time context populates (attacker viewing its *own* unexecuted move)
matches what the existing printstring-side branches assume.

**Distinguish from an unrelated, already-landed fix:** `STRINGID_PKMNSUBJECTEDTOTORMENT`
(`BattleScript_EffectTorment`'s own `printstring`, when Torment *lands on* a
target) is a completely different STRINGID, already resolved and pinned
(`tests/murkrowTormentSubjectedPresentationRepro.test.ts`, ISSUES #68). Do
not conflate the two Torment strings — this scout is only about
`STRINGID_PKMNCANTUSEMOVETORMENT` (the reselect-rejection message).

## Part 2 — Engine integration map

### 2.1 Current contract (tested against actual code, not assumed)

`legalMoveDecisions`/`legalCommandDecisions`
(`factoryBattleScriptFullTurnDecision.ts:1731-1841`) already compute the full
`checkBattleScriptMoveLimitations` mask for **both** battlers (called at
`:708`, `:2132`, `:2148`, `:2329`) and publish only the surviving moves in
`BattleCommandRequest.legalDecisions` (`battleDecisionBoundary.ts:44-50`).
`submitBattleDecision` (`:776`) validates every incoming submission via
`submissionAt` (`:653-691`): if the submitted decision's key isn't literally
present in `request.legalDecisions`, it throws
(`:678-680`, `"Battle decision ... is not legal for current command
request"`) — a hard JS exception, not a domain event.

**Concretely, today:** a Tormented player's tormented-move slot is never
offered in `legalDecisions` to begin with — the menu (built by
`battleCommandPresentation.ts:272-290`'s `legalMoveBySlot` projection, which
already treats an absent slot as `null`/greyed-out) simply never shows it, no
error, no explanation. There is no in-band way for a normal caller to even
construct the "illegal submission" the source's interactive loop is built
around; if some caller bypassed the published `legalDecisions` and submitted
it anyway, the boundary throws a generic contract-violation `Error` — a
program crash, not `STRINGID_PKMNCANTUSEMOVETORMENT`, not a re-opened menu,
not a new `requestId`.

**Net assessment:** this engine's legality gate is *stronger* than source's
(illegal moves are structurally unselectable, rather than selectable-then-
rejected) — but it has **zero representation** of the interactive
experience source has: the flavor text, the brief flash before the menu
reopens, and — because the illegal slot is simply never present — the
player never even learns *why* a move vanished from the menu. Nothing here
was assumed; every line cited above was read directly.

### 2.2 Integration options

**(a) Reject-at-submit: loosen `submitBattleDecision`, add a rejection event.**
Allow submitting any raw move slot (not just pre-filtered-legal ones); the
reducer runs a *new* selection-cause resolver that mirrors
`TrySetCantSelectMoveBattleScript`'s exact 6-cause, last-true-wins evaluation
order (§1.1 — this is **not** the same thing as reusing
`checkBattleScriptMoveLimitations`'s bitmask, since the bitmask has no
notion of "which single cause wins the displayed message" when several bits
are set on one slot). On rejection, emit a `selection-rejected` semantic
event carrying the resolved STRINGID and move slot, and re-issue a
`BattleCommandRequest` with a fresh (incremented) `requestId` and the same
`legalDecisions`. Files: `battleDecisionBoundary.ts` (either loosen
`submissionAt`'s membership check for command requests, or add a sibling
submission path), `factoryBattleScriptFullTurnDecision.ts` (new resolver +
reducer wiring), `battleResolutionPresentation.ts`/`battleCommandPresentation.ts`
(render the new event + the 4 still-unresolved STRINGIDs from §1.5).
Tier-1-testable: yes — a pure reducer test submitting the tormented slot and
asserting the rejection event + reprompt. Oracle staging: two-turn
`mechanicLab overrides.parties` trace — turn 1, four opponent slots
`MOVE_TORMENT` (same constrain-to-one-legal-choice idiom
`murkrowTormentSubjectedPresentationRepro.test.ts` already uses) landing on
the player; turn 2, player attempts to resubmit the same move the player just
used, capturing the `B_WIN_MSG` flavor-text frame before the menu reopens.
Size: **one bounded step** (the resolver + event + reprompt plumbing is
small; the STRINGID resolvers are the bulk of the work and are shared with
every option here).

**(b) Pre-filter + separate advisory rejection query (no boundary contract change).**
Keep `submitBattleDecision`/`legalDecisions` exactly as they are today (the
existing strict legality gate is not weakened at all). Add a pure,
side-effect-free function, e.g.
`describeIllegalMoveSelection(rulesContext, battler, moveSlot): {stringId,
...} | null`, built from the same six-cause resolver as option (a), callable
by the presentation layer when a UI wants to explain why a slot is
greyed-out (`battleCommandPresentation.ts:272-290`'s `legalMoveBySlot[slot]
=== null` is exactly the existing seam — add a parallel
`rejectionReasonBySlot[slot]` alongside it). No new event kind, no
`requestId` churn, no risk to the already-hard-won `submitBattleDecision`
contract. Files: `battleScriptActionAdmission.ts` (extract the shared
per-cause predicates so both the bitmask and the resolver share logic
instead of duplicating it), `factoryBattleScriptFullTurnDecision.ts` (wire
the resolver alongside `legalMoveDecisions`), `battleCommandPresentation.ts`
(surface `rejectionReasonBySlot`), `battleResolutionPresentation.ts` (the
same 4 STRINGID resolvers as (a)). Tier-1-testable: trivial per-cause pure
function tests. Oracle staging: same two-turn Torment trace as (a), but
comparing only the advisory-query output/flavor-text content, no
request/event-transition shape to match. Size: **smallest — one bounded
step**, and the smallest possible one since it touches no existing contract.

**(c) Full selection battle-script mini-VM.** Model
`gSelectionBattleScripts`/`STATE_SELECTION_SCRIPT` literally: a tiny
interpreter (reusing the existing Battle Script VM machinery already built
for main-turn resolution) so `printselectionstring`/`endselectionscript`
become real opcodes with their own machine-barrier semantics, matching
source 1:1 — including the Palace variants and, for free, the 3 non-Torment-
family STRINGIDs from §1.5 (`BOXISFULL`, `ITEMSCANTBEUSEDNOW`,
`QUESTIONFORFEITMATCH`) if those are ever wanted. This needs its own new
`BattleDecisionBoundary` kind (a sibling to today's `"machine-barrier"`) and
re-threads every existing controller/presentation surface that currently
assumes a request's `legalDecisions` is the only surface a caller ever sees.
Most faithful and most future-proof, but the largest by a wide margin: it
changes shared boundary types every other decision path depends on. Size:
**two-plus bounded steps**, and touches file-shared surfaces beyond this
brief's file-disjoint mandate.

### 2.3 Slice ladder and recommendation

1. **(b) first.** Smallest, zero risk to `submitBattleDecision`'s contract,
   immediately unblocks presentation for the 4 still-unresolved STRINGIDs
   (shared prerequisite for any option), independently landable and
   Tier-1-green with no oracle dependency for the pure-function part.
2. Land the 4 STRINGID resolvers (`NOPPLEFT`, `PKMNCANTUSEMOVETORMENT`,
   `ITEMALLOWSONLYYMOVE`, `PKMNHASNOMOVESLEFT` — `PKMNCANTUSEMOVESEALED` is
   moot, DEAD carrier) in `battleResolutionPresentation.ts`, verified against
   a real two-turn oracle trace per cause (Torment's trace already has a
   template in `murkrowTormentSubjectedPresentationRepro.test.ts`).
3. If the supervisor wants exact source event/requestId fidelity later,
   layer **(a)** on top of (b)'s already-shared resolver — this is additive,
   not a rewrite of (b).
4. **(c) is not recommended for a bounded step.** Flag it only if a future
   need for the full `printselectionstring` family (Palace, item-lock,
   forfeit prompt) outgrows (a)+(b).

**Recommendation: (b), then the STRINGID resolver batch, with (a) as a
clearly-scoped follow-up** — not (c). (b) is genuinely one worker step: it
adds one pure function plus its wiring, touches no shared boundary type, and
every other in-flight lane's file surface (`battleDecisionBoundary.ts`'s
public contract, `submitBattleDecision`'s throw-on-illegal invariant) stays
exactly as tested today.

## Out of scope (confirmed, not touched)

No `src/`/`tests/` edits were made. No oracle traces were run (the ground
truth above was fully derivable from `reference/pokeemerald/` source plus
already-generated `src/data/gen/*.json`; no sanity probe was needed). WIN/LOSS
terminal seam, Magnitude, and animation files were not touched or read.
