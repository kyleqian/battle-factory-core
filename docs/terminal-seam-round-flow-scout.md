# The terminal-decision → round-flow seam: win/loss text is skipped, not just unresolved (docs-only scout)

SIDE-LANE step. Answers where the kernel's coarse `{kind:"terminal",outcome}`
boundary sits relative to the real ROM's win/loss-text sequence and the
engine's already-built post-battle presentation (`postwin.ts`,
`factoryRoundBattleOrchestrator.ts`, `roundController.ts`). Builds on
`docs/issue72-reachability-triage.md` (the 3 STRINGIDs' MANUAL verdict),
`docs/round-controller-outcome-seam.md` (§4's now-landed adapter design),
`docs/turn17-notes.md` + `docs/postwin-notes.md` (the real-ROM oracle/RAM
trace this doc leans on instead of re-tracing), and
`docs/battle-resolution-adapter-ground-truth.md`. No `src/`/`tests/` edits.

**Headline finding, ahead of the four questions below**: this is not merely
"3 STRINGIDs are unmapped." The generic round-flow path
(`factoryRoundBattleOrchestrator.ts` → `roundController.ts` → `postwin.ts`)
**silently fabricates a dismissed win-quote the instant `checkteamslost`
decides the outcome** — `postwin.ts`'s own state doc comment says its
`elapsed` clock starts at "the accepted loss-quote dismiss," but nothing
upstream of it ever rendered or dismissed that quote
(`factoryRoundBattleOrchestrator.ts:965-966`'s `installDriveReceiptImmediately`
calls `finishBattle` the instant `boundary.kind === "terminal"`, which calls
`resolveRoundBattle` with `battleResolutionPresentation: null` explicitly
set — no message step at all — and `core.ts:583-587`'s
`createPostwinStateFromRound(generatedRound)` fires the moment
`generatedRound.presentation?.command.type === "battleWon"`, initializing
`dialoguePage: 0`, i.e. straight to the counter-room heal message). For any
battle run through the real kernel today (battle 2 onward, or battle 1 if
routed through the orchestrator instead of the hardcoded canonical fixture),
the player would never see "Player defeated X!", the trainer slide-in, or
the trainer's spoken win/lose line — the screen jumps straight from the
last hit's animation to "Thank you for competing!"

## 1. Real ROM: the win-path and loss-path label sequence, faint to swap prompt

Static source trace (`reference/pokeemerald/`) cross-checked against the
already-committed oracle/RAM trace in `docs/turn17-notes.md` §13 and
`docs/postwin-notes.md` (both dense, byte-exact, RAM-pinned — this doc adds
no new oracle probing, per the brief's "optional if cheap" and the 40-minute
cap).

### 1a. C-side handoff that starts the sequence (not script-internal)

`checkteamslost`'s own script only decides `gBattleOutcome` and jumps to
`BattleScript_FaintedMonEnd::` (`data/battle_scripts_1.s:2896-2897`), which is
just `end2` — **not** a jump to the win/loss labels. `end2` (`Cmd_end2`,
`battle_script_commands.c:3960-3964`) sets `gCurrentActionFuncId =
B_ACTION_TRY_FINISH`; that unwinds through `RunTurnActionsFunctions`
(`battle_main.c:4935-4952`) into
`gBattleMainFunc = sEndTurnFuncsTable[gBattleOutcome & 0x7F]`
(`:4948`), which for `B_OUTCOME_WON`/`LOST`/`DREW` is
`HandleEndTurn_BattleWon`/`HandleEndTurn_BattleLost` (`:557-558`). **These C
functions overwrite `gBattlescriptCurrInstr` to a fresh label** — they do not
continue executing `BattleScript_FaintedMonEnd`'s own script. This is the
same "C dispatch hands the interpreter a new entry point" shape this engine's
`battleScriptFaintedActionsOrchestration.ts` already uses for
`BattleScript_HandleFaintedMon` — not a new architectural pattern (see §3).

### 1b. WIN path (ordinary Factory L50 singles, `BATTLE_TYPE_TRAINER|FRONTIER`, not `TWO_OPPONENTS`)

`HandleEndTurn_BattleWon` (`battle_main.c:4960-5012`) sets
`gBattlescriptCurrInstr = BattleScript_FrontierTrainerBattleWon`, plays
`MUS_VICTORY_TRAINER` (or `_GYM_LEADER` for the Frontier Brain), and hands to
`HandleEndTurn_FinishBattle` (`:5099-5148`), which dispatches the script one
command per tick via `gBattleScriptingCommandsTable[gBattlescriptCurrInstr[0]]()`
until the script's own `end2` flips `gCurrentActionFuncId` back to
`B_ACTION_TRY_FINISH`. Label sequence taken (`data/battle_scripts_1.s:3027-3048`):

```
BattleScript_FrontierTrainerBattleWon:
  jumpifnotbattletype BATTLE_TYPE_TRAINER, ...        (not taken, Factory is trainer)
  jumpifbattletype BATTLE_TYPE_TWO_OPPONENTS, ...      (not taken, singles = one opponent)
  printstring STRINGID_PLAYERDEFEATEDTRAINER1          -- "{B_TRAINER1_CLASS} {B_TRAINER1_NAME}"
  goto BattleScript_FrontierTrainerBattleWon_LoseTexts
BattleScript_FrontierTrainerBattleWon_LoseTexts:
  trainerslidein BS_ATTACKER
  waitstate
  printstring STRINGID_TRAINER1LOSETEXT                -- "{B_TRAINER1_LOSE_TEXT}"
  jumpifnotbattletype BATTLE_TYPE_TWO_OPPONENTS, BattleScript_TryPickUpItems   (taken)
BattleScript_TryPickUpItems:
  jumpifnotbattletype BATTLE_TYPE_PYRAMID, BattleScript_FrontierTrainerBattleWon_End  (taken, Factory != Pyramid)
BattleScript_FrontierTrainerBattleWon_End:
  end2
```

Resolved placeholders for the DESTIN/Battle-1 fixture (already extracted,
§3 below): `{B_TRAINER1_CLASS} {B_TRAINER1_NAME}` = "BUG CATCHER DESTIN",
`{B_TRAINER1_LOSE_TEXT}` = "PLEASE I NEED SOME WATER" — matching
`battleScene.ts`'s hardcoded `TURN17_OUTCOME_LINE2`/`TURN17_LOSS_LINE1/2`
literals exactly (confirmed by cross-reading
`src/data/gen/battle-frontier-trainers.json`'s `FRONTIER_TRAINER_DESTIN`
entry, `facilityClass.source: "FACILITY_CLASS_BUG_CATCHER"`, `speechLose:
["PLEASE","I","NEED","SOME","WATER"]`).

After `end2`, `HandleEndTurn_FinishBattle`'s next tick takes the
`B_ACTION_TRY_FINISH` branch: species/`gBattleResults` bookkeeping (skipped
here — `BATTLE_TYPE_FRONTIER` is in the exclusion mask, `:5108`),
`RecordedBattle_SetPlaybackFinished`, `BeginFastPaletteFade(3)`,
`FadeOutMapMusic(5)`, `gBattleMainFunc = FreeResetData_ReturnToOvOrDoEvolutions`
→ (no level-up for a Frontier win against a Factory trainer in the general
case) → `ReturnFromBattleToOverworld`, which clears `gMain.inBattle` and
hands back to the field callback that started the battle. From here the
sequence is **already fully oracle/RAM-pinned, byte-exact, and does not need
re-tracing**: `docs/postwin-notes.md` §3/§7 documents the fade-to-black →
brief `BattleFrontier_BattleFactoryBattleRoom` flash → second black hold →
`BattleFrontier_BattleFactoryPreBattleRoom` fade-in → "Thank you for
competing! Let us restore your POKéMON." → heal (RAM write 163 ticks after
dismiss, `postwin-notes.md` §4/§8) → "The 2nd match is next! Are you ready?"
→ `GO ON/RECORD/REST/RETIRE` → scouting pages → swap-offer YES/NO prompt.

### 1c. LOSS path

`HandleEndTurn_BattleLost` (`battle_main.c:5018-5045`) for a non-link Factory
loss sets `gBattlescriptCurrInstr = BattleScript_LocalBattleLost`
(`:5040`, the `else` arm — Factory is not `BATTLE_TYPE_LINK`). Label sequence
(`data/battle_scripts_1.s:2945-2978`):

```
BattleScript_LocalBattleLost:
  jumpifbattletype BATTLE_TYPE_DOME, ...                        (not taken)
  jumpifbattletype BATTLE_TYPE_FRONTIER, BattleScript_LocalBattleLostPrintTrainersWinText  (taken)
BattleScript_LocalBattleLostPrintTrainersWinText:
  jumpifnotbattletype BATTLE_TYPE_TRAINER, ...                  (not taken)
  returnopponentmon1toball BS_ATTACKER
  waitstate
  returnopponentmon2toball BS_ATTACKER
  waitstate
  trainerslidein BS_ATTACKER
  waitstate
  printstring STRINGID_TRAINER1WINTEXT                          -- "{B_TRAINER1_WIN_TEXT}"
  jumpifbattletype BATTLE_TYPE_TOWER_LINK_MULTI, ...             (not taken)
  jumpifnotbattletype BATTLE_TYPE_TWO_OPPONENTS, BattleScript_LocalBattleLostEnd_  (taken, singles)
BattleScript_LocalBattleLostEnd_:
  end2
```

`{B_TRAINER1_WIN_TEXT}` resolves to `CopyFrontierTrainerText(FRONTIER_PLAYER_LOST_TEXT,
gTrainerBattleOpponent_A)` → `gFacilityTrainers[trainerId].speechWin`
(`frontier_util.c:1711-1723` for the LOSE-text branch is the mirror of the
WIN-text branch at `:1711`+; `battle_message.c:2616-2621`), i.e. the same
per-trainer Easy-Chat-word data already in `battle-frontier-trainers.json`
under `speeches.speechWin`. After `end2`, the same
`FinishBattle`→fade→teardown path runs, landing on the **challenge-over**
path (not the swap prompt) — not itself traced dense/RAM-pinned in this
repo's docs today; flagged as an open item in §4.

## 2. This engine today: exactly where it stops, and what's already downstream

**Stop point**: `finalizeOrchestration` (`src/engine/factoryBattleScriptTerminalDecision.ts:546-621`).
The fallthrough case (neither `"non-terminal-barrier"` nor `"resumed"`,
`:611-621`) reads `orchestration.state.rulesContext.battleOutcome` and emits
`boundary: { kind: "terminal", outcome }` directly — **zero script
instructions execute between `checkteamslost`'s jump and this return.**
`orchestration.kind === "terminal"` is itself decided one level down in
`battleScriptFaintedActionsOrchestration.ts:286-287`/`:486-488`: the VM's own
halt reason is `"terminal"` or `"end3"` (i.e. it already ran
`BattleScript_FaintedMonEnd`'s `end2` and stopped there, matching §1a's real
`Cmd_end2` — the VM-local `end2` halt is being (correctly) treated as *a*
terminal condition, but the C-side redispatch to a **new** label that real
`HandleEndTurn_BattleWon`/`_BattleLost` perform never happens).

**State in hand at that exact moment** (all real, not fabricated):
- `orchestration.state.rulesContext` — full `BattleScriptRulesContext`:
  per-battler `status1`/HP, the `party.player`/`party.opponent`
  `{species,isEgg,hp}` slices (`battleScriptRulesContext.ts`), and
  `battleOutcome` itself (`B_OUTCOME_WON`/`LOST`/`DREW`, matching
  `include/constants/battle.h:100-102`).
- `orchestration.state.events` — whatever `BattleKernelSemanticEvent`s the
  *last hit's* own script emitted (faint animation, hide-party-status-summary,
  etc.) — no event for any win/loss-text label, because none has run.
- **No message-queue/pending-print state at all.** `printstring` for
  `STRINGID_PLAYERDEFEATEDTRAINER1` et al. has not been reached, so there is
  nothing queued to resolve — this is a "stopped before," not a "stopped
  mid-print," gap.
- `rngValue`/call count on `orchestration.state.rng` — live and exact
  (`round-controller-outcome-seam.md` §3 already established this is the one
  field needing no new kernel modeling).

**What already exists downstream, confirmed by direct read** (not
assumption — the brief's "check ROADMAP S8's landed items and grep for
swap/round-flow modules"):

| Module | Owns | Entry point relative to terminal |
| --- | --- | --- |
| `battleResolutionAdapter.ts` | Pure `{kind:"terminal",outcome} → BattleResolution` mapper (the piece `round-controller-outcome-seam.md` §4 recommended is **already built**, contrary to that doc's "no reducer... can reach it yet" — it has since landed). `deriveBattleResolutionFromTerminalBoundary` (`:112`+) derives party HP/status per slot, `mapTerminalOutcomeToResolutionOutcome` (`:58-60`) collapses `LOST`/`DREW`→`"loss"`. | Called the instant `battle.boundary.kind === "terminal"` |
| `factoryRoundBattleOrchestrator.ts` | `finishBattle` (`:750-799`) calls the adapter then `resolveRoundBattle` in the same synchronous step; `installDriveReceiptImmediately` (`:960-966`) calls `finishBattle` **immediately** when `receipt.boundary.kind === "terminal"`, with `battleResolutionPresentation: null` — no presentation step is even attempted | Same tick as the terminal boundary |
| `roundController.ts` | `resolveRoundBattle` (`:309-311`+) sets `presentation.command.type` to `"battleWon"` (win, `battleIndex<6`) / `"roundCompleted"` (win, `battleIndex===6`) / `"roundLost"` (loss) — pure state, no text | Same call |
| `postwin.ts` | The **already fully-built and pixel-exact** (via `docs/postwin-notes.md` §7-11's committed traces) heal-message → GO ON → scouting → swap-offer flow. `createPostwinStateFromRound` (`:240-268`) fires the instant `round.presentation?.command.type === "battleWon"`, with `dialoguePage: 0` = the counter-room heal message. **Its own state comment says `elapsed` is "ticks since the accepted loss-quote dismiss" — it assumes the quote already happened.** | `core.ts:583-587`, same tick |
| `factoryTerminalPresentation.ts` | Symmetric handler for `roundLost`/`roundCompleted` (`:258-268`, `createFactoryTerminalPresentation`) — same "fires the instant the command exists" shape | `core.ts:571-574`, same tick |

**Net**: the round/swap/completion architecture the brief calls "the
seven-battle round loop" is **not the open remainder** — it is built,
pixel-exact where traced, and generic (drives off `RoundControllerState`,
not a battle-number branch, matching the ROADMAP's own anti-pattern rule).
The actual open remainder is narrower and sits entirely *before* that
architecture's entry point: the ~10-command win/loss-text script never runs,
so `postwin`/`factoryTerminal`'s first frame is reached by silent
fabrication, not by playing through what the real game shows.

## 3. The seam: concrete increments, most-local-change-first

Ground truth for each increment's cost was gathered directly (not assumed)
by resolving the WIN/LOSS scripts' own opcode list against this engine's
registered handlers (`src/data/gen/battle-script-program.json`'s per-label
`emittedStatements[].opcodeReferences[].opcode`, cross-checked with
`grep` over `src/engine/*.ts`):

| Script (real path taken by Factory singles) | Opcodes on the taken branch | Registered in this engine today? |
| --- | --- | --- |
| WIN: `FrontierTrainerBattleWon`→`_LoseTexts`→`TryPickUpItems`→`_End` | `JUMPIFWORD`×2, `PRINTSTRING`×2, `GOTO`, `TRAINERSLIDEIN`, `WAITSTATE`×2, `END2` | **All already registered** (`battleScriptJumpifwordOpcode.ts`, `battleScriptSourceCommands.ts`, `battleScriptMachine.ts`) |
| LOSS: `LocalBattleLost`→`_PrintTrainersWinText`→`_End_` | `JUMPIFWORD`×5, `VARIOUS` (`RETURN_OPPONENT_MON1`/`MON2`, ids 19/20), `WAITSTATE`×3, `TRAINERSLIDEIN`, `PRINTSTRING`, `END2` | Everything **except** `VARIOUS` cases 19/20 — this engine's `Cmd_various` dispatch (`battleScriptSwitchinOpcode.ts:677+`) only models case 0 (`VARIOUS_CANCEL_MULTI_TURN_MOVES`); 19/20 would hit the `"not modeled"` throw (`:716`) |

This means the WIN path's *opcode coverage* is not the blocker at all — the
blocker is purely architectural (§(i) below). The LOSS path needs one small,
bounded addition (2 new `VARIOUS` cases, both "return the opponent's active
mon(s) to their ball" — no new opcode family, same dispatch table three other
cases already use).

**(i) Resume through the win/loss-text labels to a new, later terminal point.**
Files: `factoryBattleScriptTerminalDecision.ts` (the `finalizeOrchestration`
fallthrough, `:611-621`) and/or `battleScriptFaintedActionsOrchestration.ts`
(where `orchestration.kind === "terminal"` is first decided, `:486-488`).
Shape: mirror the *existing* two-stage pattern this module already uses for
`BattleScript_HandleFaintedMon` (a C-driven redispatch to a fresh script
entry, not a continuation of the halted script) — when
`rulesContext.battleOutcome !== 0`, start a **second** VM run at
`BattleScript_FrontierTrainerBattleWon` (outcome `player-win`) or
`BattleScript_LocalBattleLost` (outcome `trainer-win`/`draw`, `battle.h:100-102`),
drive it to *its own* `end2` halt, and **then** produce the
`{kind:"terminal",outcome}` boundary. Executable-frontier framing: this
converts the WIN path's `end2`-triggered halt from *the* terminal condition
into *an intermediate* halt the new stage resumes past — no new opcode
registrations required for WIN (table above); LOSS additionally needs
`VARIOUS` 19/20. Depends on: nothing upstream (both scripts' entry points are
already `resolveBattleScriptLabel`-reachable); the LOSS side depends on the
2 new `VARIOUS` cases. Oracle verification surface: a new staged
`mechanicLab` trace forcing a Factory L50 singles kill-shot, comparing the
resulting `rulesContext`/emitted event list against
`docs/turn17-notes.md`'s already-RAM-pinned "Player defeated.../slide-in"
sequence timing is optional; the load-bearing check is a Tier-1 test on the
new boundary's `events`/`rulesContext` shape, since pixel timing for this
exact window is already banked in `postwin-notes.md`.

**(ii) Resolver-map the 3 STRINGIDs.** Files: `battleResolutionPresentation.ts`
(the `messageLines` STRINGID→text branches ISSUES #72 tracks) and
`factoryBattleScriptFullTurnDecision.ts` (the `prepareMessage` substitution
cases, same idiom entry 896 used for `{B_*_ABILITY}`). What each needs,
confirmed already-available (not net-new extraction):
  - `STRINGID_PLAYERDEFEATEDTRAINER1`: `{B_TRAINER1_CLASS} {B_TRAINER1_NAME}`
    — `battle-frontier-trainers.json`'s `facilityClass`/`name` per entry,
    keyed by the opponent's Frontier trainer id (already threaded through
    `currentOpponent` in `roundController`/`factoryRoundBattleOrchestrator`).
  - `STRINGID_TRAINER1LOSETEXT` (win case): `{B_TRAINER1_LOSE_TEXT}` —
    `battle-frontier-trainers.json`'s `speeches.speechLose` (Easy-Chat words,
    already text-decoded per entry, e.g. DESTIN's `["PLEASE","I","NEED",
    "SOME","WATER"]`).
  - `STRINGID_TRAINER1WINTEXT` (loss case): `{B_TRAINER1_WIN_TEXT}` —
    same file's `speeches.speechWin`.
  All three are **pure data lookups against an already-committed extraction
  file**, no new source parsing. Depends on: (i) having actually resumed the
  interpreter to the point these `printstring`s execute (otherwise there is
  no call site to resolve). Oracle verification surface: `messageLines`
  output string vs. `docs/turn17-notes.md`'s cited exact strings
  ("Player defeated / BUG CATCHER DESTIN!", "PLEASE I NEED / SOME WATER") —
  already transcribed, no new oracle trace needed for the DESTIN fixture
  specifically; a second trainer (different class/name/quote) would be the
  generalization proof.

**(iii) Hand off to the swap/round controller with a real presentation step
instead of a silent fabrication.** Files: `core.ts` (`createPostwinStateFromRound`
call site, `:583-587`) and `postwin.ts` (`createPostwinStateFromRound`,
`:240-268`, and the equivalent loss-side constructor if one doesn't already
exist — not confirmed either way this session, see trap below). Shape: insert
an actual presentation phase for the win/loss-text sequence (trainer-slide
render, two dismissible message boxes) **before** `postwin`'s `dialoguePage:
0` is created, sourcing its content from (ii)'s resolved strings and reusing
`battleResolutionPresentation.ts`'s existing message-box/dismiss machinery
(the same generic per-move message renderer already used mid-battle — not a
new renderer) plus a `trainerslidein` visual, for which **no generic
implementation exists yet outside the hardcoded `battleScene.ts` one-off**
(`grep` confirms `trainerSlideIn` only appears in `battleScene.ts` and the
opcode-name string table). Depends on: (i) and (ii). Oracle verification
surface: extend `docs/postwin-notes.md`'s trace family with a *new* prefix
covering the presently-undocumented span from the last hit's own resolution
through the quote dismiss (real-ROM ground truth for this span is itself
still only characterized via the DESTIN-specific `turn17-notes.md`/
`battle-turn-notes.md` fixture — see trap below on generalizing it).

## 4. Traps

1. **The 3 STRINGIDs already have pixel-exact text on screen for one fixture
   — via a mechanism totally disconnected from the resolver architecture.**
   `battleScene.ts` defines `TURN17_OUTCOME_LINE1/2` ("Player defeated" /
   "BUG CATCHER DESTIN!") and `TURN17_LOSS_LINE1/2` ("PLEASE I NEED" /
   "SOME WATER") as bare string literals (`battleScene.ts:17402-17403`,
   `:17418-17419`),
   proven byte-exact against the oracle for the one canonical Battle-1/DESTIN
   trace. This is real, verified work — but it is not `messageLines`-driven
   and does not generalize to any other trainer; it is part of the "retired
   canonical Battle-2 turn march" the 2026-07-23 user decision explicitly
   stopped extending. Anyone picking up increment (ii)/(iii) should **not**
   mistake "the pixels already look right in that one trace" for "the
   STRINGID plumbing exists" — it doesn't (confirmed: zero hits for
   `PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/`TRAINER1WINTEXT` anywhere
   under `src/engine/*.ts`).
2. **`postwin.ts`'s clock model has a load-bearing, undocumented assumption
   baked into its own field comment**: `elapsed`'s doc comment reads "Ticks
   since the accepted loss-quote dismiss (0 = the A edge)" — i.e. the module
   was designed and pixel-proven *assuming* increments (i)-(iii) already
   happened. It is not that `postwin.ts` needs to change shape to accept a
   win-text phase; it already implicitly starts right after one. The
   remaining gap is entirely "produce that dismiss for real," not
   "teach postwin.ts about a new phase."
3. **The LOSS-path oracle ground truth this repo has today is DESTIN's WIN
   quote only.** `docs/turn17-notes.md`/`postwin-notes.md` trace the single
   canonical Battle 1, which the player wins. The `STRINGID_TRAINER1WINTEXT`
   loss-path text (§1c) and the post-loss "challenge over" screen sequence
   have **no dense oracle trace or RAM pin anywhere in `docs/` today** —
   this scout's §1c is static-source-only. A future increment implementing
   the loss side should budget for a fresh oracle trace, not assume
   `postwin-notes.md`'s win-side timings transfer.
4. **RNG**: no RNG draws occur inside either script (`checkteamslost` itself
   is the last RNG-relevant point before these labels; `printstring`/
   `trainerslidein`/`waitstate`/`end2` are all non-consuming per
   `postwin-notes.md` §2's own dense per-tick ledger showing baseline
   1-step/tick ownership with no burst until well after the quote dismiss).
   This directly contradicts a plausible worry (a hidden roll on which
   quote/animation plays) — there is none; the only RNG-relevant question
   for increment (i) is whether *entering* a second VM run consumes the
   RNG state correctly, which is a mechanical continuation of the same
   `BattleState.rng` cursor `round-controller-outcome-seam.md` §3 already
   confirmed is exact.
5. **Message-timing interleaving is real but already fully characterized,
   not a new discovery risk**: the 43-tick RNG-frozen hold after the quote
   dismiss, the 163-tick "uninterruptible heal" dead zone, and the
   battle-room double-flash are all oracle/RAM-pinned in `postwin-notes.md`
   §2-§4 already. Nothing in this session's static trace contradicts them.

## Increment recommendation

Start with **(i)**: it is the only piece with zero data dependencies (both
script entry points already resolve; the WIN path's entire opcode list is
already registered), it's the one thing that makes (ii) and (iii) even
possible to attempt, and it is independently Tier-1-testable today by
asserting the new terminal boundary's `events`/`rulesContext` against a
staged kill-shot decision — no presentation work required to prove it lands.

## Verification

Docs-only; no `src/`/`tests/` changes. `npm test` and `npm run build` run
green as this session's finish requirement (no engine changes to regress).
