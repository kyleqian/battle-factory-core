# WIN terminal seam window: antecedent-boundary RAM probe

SIDE-LANE evidence step (ISSUES #73 rung B, WIN half). Adapts
`docs/terminal-seam-antecedent-boundary-probe.md`'s method (held-cursor
freeze + swap-edge cascade, both RAM-probed on the LOSS fixture) onto the
committed WIN fixture
`tools/battle-lab/win-terminal-explosion-dusclops-off.json` and
`docs/terminal-seam-win-window-ground-truth.md`'s own coarse table, to
supply the two numbers `tools/compare/appTrace.ts`'s `winTerminalWindowStage`
needs: the `STRINGID_PLAYERDEFEATEDTRAINER1` antecedent's `readyTick`/
`dismissTick` (held-cursor helper) and confirmation the swap-edge +3 shape
transplants unchanged. No `src/`/`tests/`/`tools/compare/` edits — docs +
one new reusable probe script only.

## 0. Method

`tools/probe/dump-win-terminal-swap-textprinter.py` (new, adapted from
`tools/probe/dump-loss-terminal-swap-textprinter.py` — identical struct
offsets/addresses, only `SCENARIO_PATH` changed to the WIN fixture): stages
`tools/battle-lab/win-terminal-explosion-dusclops-off.json` via
`BattleLab.prepare()`, then replays that fixture's own `trace.segments`
verbatim (the same recipe the committed captures already reproduce
byte-identically — no new input invented) while reading, every tick,
`gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, `gBattleOutcome`,
the opponent controller command byte, `gBattlerControllerFuncs[1]`, and
window 0's (`B_WIN_MSG`) file-static `sTextPrinters[0]` struct — the exact
same addresses the LOSS probe doc derived and cross-checked two independent
ways (`0x020201b0`, `STP_STRIDE=0x24`); reused unchanged here since the
struct is a profile-shared engine location, not fixture-specific.

Run: `python3 tools/run-mgba-probe.py <out.json> -- python3
tools/probe/dump-win-terminal-swap-textprinter.py <out.json> 4200 4670`
(own mGBA session, no shared-service dependency). Produced one row per tick,
4200–4670 inclusive (471 rows) — every value cited below is a direct field
read from that output.

## 1. Class 1 — held-cursor freeze: the `STRINGID_PLAYERDEFEATEDTRAINER1` antecedent

Unlike the LOSS window (whose antecedent — "MURKROW fainted!" — is a plain
`STRINGID_ATTACKERFAINTED` box), the WIN window's antecedent is
`STRINGID_PLAYERDEFEATEDTRAINER1` ("Player defeated\nBUG CATCHER DESTIN!"),
the real message directly preceding `trainerslidein BS_ATTACKER` in
`BattleScript_FrontierTrainerBattleWon` (no recall step exists on this path
— `docs/terminal-seam-win-window-ground-truth.md` §4(1) — so the message
immediately before the slide is this one, not a recall-cleared box). Per
`docs/terminal-seam-loss-path-ground-truth.md` §6, this id ends its static
template in a literal `\p` (`battle_message.c:371`), so it **keeps** its
down-arrow cursor exactly like `STRINGID_ATTACKERFAINTED` did for LOSS — the
held-cursor mechanism transplants onto it unchanged.

| tick | `state` | `downArrowDelay` | `downArrowYPosIdx` | `currentX`/`currentY` | event |
|---:|---:|---:|---:|---|---|
| 4228 | 0 (`HANDLE_CHAR`) | – | – | 6,1 | printstring dispatches (RAM); first glyph of "Player defeated" begins (pixel-visible 4229, matching the ground-truth doc's own dismiss+23 citation exactly, +1 RAM→pixel lag) |
| 4261 | 0 | – | – | 106,17 | last glyph of "BUG CATCHER DESTIN!" drawn |
| **4262** | **2 (`CLEAR`)** | 0 | 0 | 106,17 | `\p` reached — `TextPrinterInitDownArrowCounters` runs; this is **`readyTick`** |
| 4263 | 2 | 8 | 1 | 106,17 | 1st arrow draw (pre-increment idx 0 → `sDownArrowYCoords[0]=0`), `readyTick+1` |
| 4272 | 2 | 8 | 2 | 106,17 | 2nd draw, `readyTick+10` |
| 4281 | 2 | 8 | 3 | 106,17 | 3rd draw, `readyTick+19` — same 9-tick cadence the LOSS probe doc already established |
| **4608** | 2 (unchanged) | 5 | 3 | 106,17 | real dismiss `A` registers (fixture's own committed segment starting at frame 4608 — confirmed directly against `tools/battle-lab/win-terminal-explosion-dusclops-off.json`'s `trace.segments`) — this is **`dismissTick`** |
| 4609 | 0 | 4 (stale) | 3 (stale) | 0,1 | printer instance exits `CLEAR`, begins reset |
| 4610 | 0 | 4 (stale) | 3 (stale) | 0,1 | `active→0` |
| 4611–4662 | — | — | — | — | printer inactive; interpreter runs `checkteamslost`-adjacent/slide opcodes (§2) |

**`readyTick = 4262`, `dismissTick = 4608`** — both taken directly from this
probe's own RAM trace and the fixture's own committed input schedule (not
fitted). `frozenAge = dismissTick - readyTick = 346`. Feeding this through
the same unmodified `floor(age/9)%4` formula the LOSS window's render
already uses: `floor(346/9)%4 = 38%4 = 2` → `CURSOR_Y_OFFSETS[2]`, i.e. the
same row index the LOSS window's frozen cursor happens to land on too (a
coincidence of these two fixtures' own input timing, not a general
invariant — each window derives its own age independently). Cross-checked
against the raw RAM `downArrowYPosIdx` at the dismiss tick (3, "pre-
increment" per the LOSS doc's own convention — the *drawn* row is
`sDownArrowYCoords[idx-1]`): `sDownArrowYCoords[3-1] = sDownArrowYCoords[2]
= 2`, matching the formula exactly.

## 2. Class 2 — swap-edge typing cascade: same 3-tick chain, confirmed on the WIN script

`data/battle_scripts_1.s`'s `BattleScript_FrontierTrainerBattleWon_LoseTexts`
has the identical `trainerslidein BS_ATTACKER` / `waitstate` / `printstring
STRINGID_TRAINER1LOSETEXT` shape `BattleScript_LocalBattleLostPrintTrainersWinText`
used for LOSS — same opcode family, same "printstring immediately after a
waitstate" pattern the swap-edge mechanism depends on. RAM confirms the
identical 3-tick cascade:

| tick | `battlescriptCurrInstr` | `execFlags` | opponent cmd | `textPrinter0` | event |
|---:|---|---:|---:|---|---|
| 4613 | `0x82daab0` | 2 | 8 | inactive | `trainerslidein BS_ATTACKER` dispatches (`opponentCmd` 16→8) — dismiss+5 from 4608, matching the ground-truth doc's own citation exactly |
| **4661** | `0x82daab0` (unchanged) | **2→0** | 8 | inactive | sprite-slide completion ack (`OpponentBufferRunCommand`) — interpreter's own call this tick already sampled the pre-clear flag value, same interpreter-visibility lag §3(1) of the LOSS probe doc |
| **4662** | `0x82daab0→0x82daab1` | 0 | 8 | inactive | the parked `waitstate` runs, advancing `gBattlescriptCurrInstr` to `printstring`'s own address; one-opcode-per-tick budget defers `printstring` itself to the next tick, same §3(2) |
| **4663** | `0x82daab1→0x82daab4` | **0→2** | **8→16** | **active=1, state=0, X=6,Y=1** | `printstring STRINGID_TRAINER1LOSETEXT` runs: advances past itself (3-byte instruction, matching LOSS's `printstring`), dispatches to the player controller (`opponentCmd` reported here reverts to 16 = `CONTROLLER_PRINTSTRING`), and the same-tick RAM snapshot already shows the printer reinitialized for the new message (first-char position `X=6,Y=1`, same starting column the "Player defeated" message also used) — same §3(3) same-tick reinit |
| 4664 | — | — | — | — | pixel-visible tick (render lag, `+1` from 4663, not itself probed here — inferred from the identical mechanism the LOSS doc's §4 pixel cross-check already established for this exact "printstring-same-tick-reinit → next-tick-pixel" shape) |

**Total ack→pixel-visible span: 4661→4664 = 3 ticks**, identical in kind and
magnitude to the LOSS probe doc's §3 finding (3034→3037). None of the three
one-tick contributions differs between the two scripts — this is the same
governing `RunBattleScriptCommands`/one-opcode-per-tick mechanism (LOSS
probe doc §1), not a coincidence of values. The scaffold's existing 3-filler-
event technique (three `set-battler-sprite-visibility` no-op commands, each
pinned to `minimumFrames: 1`) transplants onto the WIN stage unchanged.

## 3. Window boundary

Per `docs/terminal-seam-win-window-ground-truth.md` §2's own dense table
(the same "coarse browsable table" convention the LOSS ground-truth doc used
to pick `appStage.frame: 2996`), the naive first choice for the WIN window's
start point was tick **4613** (`opponentControllerCommand` 16→8,
`trainerslidein BS_ATTACKER` dispatches — RAM-confirmed exactly by this
probe, §2 above). **This was wrong, corrected during compare-wiring** (see
`docs/terminal-seam-win-window-ground-truth.md`'s sibling implementation
notes / the compare-trace commit): `TRAINER_SLIDE_TIMING = 38`
(`battleResolutionPresentation.ts`) is calibrated, by its own source comment,
against the LOSS ground-truth doc's *coarse* (every-2-tick-sampled) dispatch
observation (2996), not the RAM-precise dispatch tick this probe doc's own
LOSS-sibling later found (2986, `terminal-seam-antecedent-boundary-probe.md`
§2) — i.e. `38 = 3034(RAM ack) − 2996(coarse reference)`, not
`3034 − 2986`. WIN's own coarse-vs-precise gap is different (this probe's
own §2 table shows the coarse ground-truth doc's cited dispatch tick, 4613,
*is* the RAM-precise one this time — the WIN ground-truth doc used
edge-precision probes for this specific transition, not 2-tick sampling), so
reusing 4613 as `appStage.frame` under-shoots the same shared 38-tick model
by exactly the LOSS fixture's own 10-tick coarse/precise gap: the trainer
sprite visibly settles far too early (pixel-confirmed: the app already shows
the full sprite at dispatch+27 where the oracle shows only a sliver).
**Correct window start: `ack(4661) − 38 = 4623`** — the tick that makes the
shared 38-tick model's own settle point land on the RAM-confirmed ack tick
(4661), the same relationship the LOSS window's 2996 already has to its own
ack (3034 − 38 = 2996). Pixel-verified: with `appStage.frame: 4623` the
trainer-slide region matches the oracle exactly at every sampled tick (see
the compare-trace commit's own two-run 65/65 result).

**Window end is bounded by a genuine `src/`-side bug, not a choice** (§4
below): the window runs **4623–4687 inclusive (65 frames)**, covering the
full trainer-slide + swap-edge + most of the quote's typing animation, but
stops well short of the quote's own settled/held state and its real dismiss
— unlike the LOSS window, which covers its full antecedent-to-dismiss span.
This is NOT a deliberate scope choice mirroring LOSS's convention; it is the
last frame this session could safely capture before hitting the bug in §4.
**Superseded by §5 below**, once §4's bug was fixed in `src` (`e88fb4a5`):
the window now runs through frame 5011 (389 frames).

## 4. Genuine `src/`-side bug found while wiring the compare: button-message ready/complete race

**Stop-and-report for the supervisor — not fixed here (out of this lane's
scope this step).** `battleResolutionPresentationRender.ts` has two
independent gates on a button-advance message:

- `isBattleResolutionButtonMessageReady`: ready at
  `phaseElapsed >= battleStringPrintableLength(command.lines) + 1`.
- `isBattleResolutionCommandComplete`: complete at
  `phaseElapsed + 1 >= Math.max(command.timing.minimumFrames, battleStringPrintableLength(command.lines))`
  (`battleResolutionCommandDuration`'s `"message"` case).

`factoryRoundBattleOrchestrator.ts`'s `advanceFactoryRoundBattleResolution`
checks `command.advance === "button" && isBattleResolutionButtonMessageReady(...)`
**first**; only when that's false does it fall through to the generic
`isBattleResolutionCommandComplete` branch, which — if true — silently
advances `commandIndex` past the message with **no button-dismiss wait at
all**. For `MESSAGE_TIMING = { minimumFrames: 24, holdFrames: 0 }`, the two
thresholds normally agree (ready fires at `printableLength+1`, at or before
`minimumFrames`'s own complete tick, whenever `printableLength < minimumFrames`
by more than 1). But whenever a button message's own printable length is
**≥ `minimumFrames − 1`** (23, for the shipped `minimumFrames: 24`), duration
becomes `Math.max(24, printableLength) = printableLength`, so "complete"
fires at `printableLength − 1` — **before** "ready" fires at
`printableLength + 1` — and the message silently skips its own dismiss-wait.

**Concrete trigger, this session's own numbers**: DESTIN's `speechLose`
(`STRINGID_TRAINER1LOSETEXT`, this window's own terminal quote) is
`["PLEASE I NEED", "SOME WATER"]`, `battleStringPrintableLength` = **23**
— one below the 24-frame floor, exactly inside the buggy range. DESTIN's
`speechWin` (LOSS window's own quote, `["I AM ABOUT TO", "OVERHEAT"]`) is
**21** — outside the buggy range, which is why the already-closed LOSS
window (236/236) never observed this. Reproduced directly, no oracle
needed: replaying this window's own scaffold past local tick 65
(`resolution.commandIndex`/`lifecycle.phase` logged) shows `commandIndex`
silently jump from 8 (the quote, `phaseElapsed: 23`, still `"presenting"`)
straight to 9/`"terminal-handoff"` with **zero button input**, which then
crashes `finishBattle`'s `assertSamePartyIdentity` (an unrelated downstream
symptom of the same root cause: the synthetic scaffold's `terminalBattle`
rules never matched `state.round.rules.playerKernelParty`'s real identity,
which the shared code has no reason to expect a *scaffold* to reach at all,
since a real playthrough would still be correctly gated at the message).

**Blast radius**: this is real production code (`battleResolutionPresentation
.ts`/`factoryRoundBattleOrchestrator.ts`), not scaffold-only — any live
gameplay reaching `STRINGID_TRAINER1LOSETEXT` for a trainer whose
`speechLose` is 22–23 printable characters (DESTIN is a real, reachable
Factory trainer) would silently skip the player's own dismiss-wait on the
real terminal quote once WIN's live-gameplay presentation path is wired.
Likely also affects `STRINGID_PLAYERDEFEATEDTRAINER1`/other
`TERMINAL_SEAM_BUTTON_MESSAGE_IDS`/`STRINGID_TARGETFAINTED`/
`STRINGID_ATTACKERFAINTED` messages whenever a trainer/species name pushes
their resolved text into the same 22–23-character band — not audited further
this session (out of lane/scope).

**Not fixed here**: `src/`/`tests/` edits are out of this lane's scope this
step. The likely fix shape (for whoever picks this up): make
`isBattleResolutionCommandComplete` skip/defer for button-advance messages
until `isBattleResolutionButtonMessageReady` is also true (i.e. the "ready"
threshold should be a floor under "complete" for button messages, not an
independent race), or unify the two duration formulas so `minimumFrames`
can't out-race `printableLength+1`. A Tier-1 test with a `speechLose`/
`speechWin` (or any button-message text) of exactly 22–23 printable
characters would red-verify it directly, no oracle needed (this session's
own reproduction above needed none).

This session's own window (§3) works around it only by stopping short (frame
4687, `phaseElapsed: 23`, one tick before the race fires) — not a fix, a
truncation forced by the bug.

## 5. 2026-08-04/05 SIDE-lane session: extended 65/65 → 389/389 (settled hold + real dismiss); a second, distinct `src`-side identity mismatch now bounds the window short of the fade

**§4's bug is fixed in `src`** (`e88fb4a5`, ISSUES #75/#73): the button-message
ready/complete race no longer skips the quote's own dismiss-wait. This
unblocked the window past frame 4687. Extending it is purely a `tools/compare/
traces/win-terminal-window-off.json` **data** change (`winTerminalWindowStage`
itself needed zero code changes — it was already driving the resolution
lifecycle generically off the real per-tick `commandIndex`/`lifecycle.phase`
advancement; nothing about the extension is WIN-specific logic). The trace's
`segments` array is a literal prefix of `tools/battle-lab/
win-terminal-explosion-dusclops-off.json`'s own `trace.segments` (the real,
full recorded input schedule for this staged battle, confirmed identical
tick-for-tick through the point both files diverge) — extending the window is
just replaying more of that same real schedule and capturing every
intervening tick, the same "every tick, consecutively" convention
`loss-terminal-window-off.json` already uses for its own 236-frame span.

**Pinned ticks (prediction, then verified):**

- **Quote settled/held span**: 4688–5010 inclusive (323 frames), the
  fully-typed "PLEASE I NEED\nSOME WATER" quote held with no cursor (§2's
  `noCursor` gate, unaffected by this session) — matches
  `terminal-seam-win-window-ground-truth.md` §2's own citation of the same
  span (dismiss+78 through the next real dismiss press).
- **Real dismiss tick = 5010** (the last full hold frame before the press),
  matching `TERMINAL_SEAM_WIN_ANTECEDENT_DISMISS_TICK`'s own naming
  convention (the tick *before* the button-press ticks) and the
  ground-truth doc's own citation ("5010 (this trace's own dismiss press)").
  Cross-checked directly against `win-terminal-explosion-dusclops-off.json`'s
  own `trace.segments`: the idle span immediately preceding the fixture's
  final `A`-press segment sums to exactly 5010 ticks.
- **Predicted extended window, before wiring**: 4623–5011 inclusive (389
  frames) — the settled hold (323) + the trainer-slide/swap-edge span already
  covered (65) + the single tick the real dismiss press first registers on
  (1), i.e. `65 + 323 + 1 = 389`. **Verified exactly**: `npm run compare --
  win-terminal-window-off --summary` is **389/389**, twice-run byte-identical
  (`manifest.json` identical end to end except the `generatedAt` timestamp).
  `loss-terminal-window-off` unaffected, reran **236/236**. Full `npm test`
  (721 files, 6927 passed/1 skipped) and `npm run build` green.

**Why the window stops at 5011, one tick into the real dismiss press, and
cannot extend further this session: a second, distinct `src`-side party/HP
mismatch, not the same bug as §4.** Extending the trace's own `segments` past
5011 (even by one more tick of the same real `A` press, i.e. to 5012 — the
fixture's own real press is two ticks, 5011-5012) makes the app **throw**,
every time, deterministically:

```
Error: resolution.opponentParty[0].hp must be an integer in [0, maxHp]
    at assertBattleMon (src/engine/battleScenario.ts:115)
    at assertBattleParty (src/engine/battleScenario.ts:122)
    at assertSamePartyIdentity (src/engine/roundController.ts:431)
    at resolveRoundBattle (src/engine/roundController.ts:455)
    at finishBattle (src/engine/factoryRoundBattleOrchestrator.ts:786)
    at advanceFactoryRoundBattleResolution (src/engine/factoryRoundBattleOrchestrator.ts:1607)
```

Repro (no oracle needed, pure engine call): extend `win-terminal-window-off
.json`'s trailing segment from `{frames: 1, buttons: ["A"]}` back to `{frames:
2, buttons: ["A"]}` (restoring the fixture's real 2-tick press) with
`captureFrames: [5012]`, then `npm run compare -- win-terminal-window-off
--summary` (or any single-frame trace requesting frame 5012) throws the
error above every time. Frame 5011 (the press's first tick) renders fine;
frame 5012 (the press's second tick, where the "next-command-handoff"
lifecycle phase completes and the orchestrator hands off to `finishBattle`)
does not.

**Mechanism, confirmed by direct instrumentation (a temporary `console.error`
in `assertBattleMon`, reverted before commit — not left in the tree):**

```
DEBUG resolution.opponentParty[0] {"id":"rental-122-3717558781","species":"SPECIES_ARON","maxHp":143,"hp":200,"status":"none"}
```

`finishBattle` (`factoryRoundBattleOrchestrator.ts:763-777`) builds its
`BattleResolution` via `deriveBattleResolutionFromTerminalBoundary`, which
carries `id`/`maxHp` from `state.round.rules.currentOpponent.party` (the
**real orchestrator's own** party — here, whatever
`createFactoryRoundBattleOrchestrator({rngValue: 4, factoryWinStreak: 0, ...})`
actually generates for battle 1, which is **not** DESTIN's ONIX/SHUCKLE/
MURKROW roster; it happens to start with an ARON, `maxHp: 143`) but overlays
`hp` from `battle.rules.rulesContext.party.opponent` (the **scaffold's own
synthetic** `terminalBattle`, built from `TERMINAL_SEAM_SCAFFOLD_TRAINER` for
the `initial = createFactoryFullTurnBattleState(config)` call — an unrelated,
disjoint 1-mon battle constructed purely to get the right `STRINGID_*`
message content and species names, whose own full HP is `200`). These two
parties were never meant to be reconciled — `winTerminalWindowStage` (like
`lossTerminalWindowStage`) deliberately keeps the orchestrator (real party
identity, needed for `activeBattleCallStart`/`aiHistory` plumbing) and the
`terminalBattle` (synthetic party, needed for exact message/species text)
as two independent constructions, hand-joined at `commandIndex: 4` — a
combination that has always been able to drive the *presentation* phase
(rendering commands 4-9), but was never exercised past the point where the
resolution lifecycle actually calls `finishBattle`, because neither window
had reached a real dismiss of the terminal message before this session.

**Not a repeat of §4**: this is a different mechanism (party/HP identity,
not a message-duration race), first reachable only because this session's
extension is the first time either window's scaffold has ever driven a real
dismiss of the terminal-most message through to lifecycle completion. LOSS's
own window (236/236, closed) never reaches this either — it stops at its own
dismiss-press tick (3231) by the same "last safe frame" logic, one tick short
of its own `terminal-handoff`.

**Blast radius**: scaffold-only, as far as this session traced it — real
gameplay's `finishBattle` always derives both parties from the *same* live
`battle`/`round` state (there is no second, disjoint synthetic battle in a
real playthrough), so this specific crash shape is very likely unreachable
outside these two compare-trace scaffolds. Not fully audited against every
other terminal-window scaffold in this file this session (out of scope/time).

**Not fixed here**: reconciling the two constructions (e.g. building
`winTerminalWindowStage`'s `initial`/`terminalBattle` from the *same* real
generated party the orchestrator already produced, instead of the disjoint
`TERMINAL_SEAM_WIN_SCAFFOLD_PLAYER`/`TERMINAL_SEAM_SCAFFOLD_TRAINER` pair) is
a materially bigger rework of this window's own staging strategy than a data
extension — it would need the real orchestrator's generated opponent species/
stats threaded into the `createFactoryFullTurnBattleState` config while still
reproducing DESTIN's exact terminal-message text (`opponentTrainer:
getFactoryTrainerPresentation(50)`, independent of `config.trainer`'s
species, so this is plausible but unverified), and was out of this session's
remaining budget. Flagged for whoever next picks up the fade/post-dismiss
span. The `noCursor`/held-quote/dismiss-injection wiring landed this session
is unaffected either way — it is a strict superset extension of the
previously-closed 65-frame span, not a rewrite.

**Verification**: `git diff --stat` for this session's changes:
`tools/compare/traces/win-terminal-window-off.json` (segments extended,
captureFrames extended to 389 entries) + this doc. Zero `src/`/`tests/`
edits survive (the diagnostic `console.error` in `battleScenario.ts` used to
confirm the mechanism above was reverted immediately after capturing its
output, verified via `git diff --stat src/engine/battleScenario.ts` showing
no changes). `npm run compare -- win-terminal-window-off --summary`: 389/389,
twice-run byte-identical. `npm run compare -- loss-terminal-window-off
--summary`: 236/236, unaffected. Full `npm test`: 721 files, 6927 passed/1
skipped. `npm run build`: green.

## 6. 2026-08-05 SIDE-lane session: the §5 party-identity mismatch is fixed
scaffold-side (generic, both windows); a second, much larger, unrelated gap
now blocks any further extension

**§5's crash is fixed, scaffold-side, `tools/compare/appTrace.ts` only.**
Both `TERMINAL_SEAM_SCAFFOLD_TRAINER` and `TERMINAL_SEAM_SCAFFOLD_PLAYER`
(the two synthetic placeholder configs `winTerminalWindowStage`/
`lossTerminalWindowStage` feed into `createFactoryFullTurnBattleState` to
build each window's `terminalBattle`) had `hp: 200` — a full-health value
with no relationship to either window's own real orchestrator-generated
party. `finishBattle`'s `deriveBattleResolutionFromTerminalBoundary`
(`battleResolutionAdapter.ts`'s `deriveBattleParty`) carries `id`/`maxHp`
from the real party (`state.round.rules.currentOpponent.party`/
`playerParty` — confirmed by direct construction this session: for this
scaffold's fixed inputs, `rngValue: 4` generates player
GRANBULL(165)/HARIYAMA(251)/MACHAMP(186) and opponent
ARON(143)/DELIBIRD(138)/GRIMER(162), maxHp in parens — species neither
window's own text ever depends on, since both configs' battlers are
recalled/invisible for their entire respective capture windows) but overlays
`hp` from the synthetic party. `200 > 143` (WIN's opponent) is exactly §5's
crash; the same shared `TERMINAL_SEAM_SCAFFOLD_TRAINER`/`_PLAYER` `hp: 200`
would equally throw for LOSS once extended (`200 > 143` opponent, `200 >
165` player) — the "same structural reason" this doc's own summary already
named.

Fix: `hp: 0` on both configs (`maxHp` left at 200 — discarded by
`deriveBattleParty` regardless, since the derived party's `maxHp` always
comes from the real preBattle party, never from this synthetic one). `0` is
the one value that satisfies `assertBattleMon`'s `[0, maxHp]` bound for
*any* positive real `maxHp`, so it needs no knowledge of what the real
orchestrator generates — and it is independently the narratively correct
terminal value: both configs play the battler that each window's own event
chain (commands 0-3, replayed before frame 0) narrates fainting (WIN:
battler 1, the opponent's antecedent self-KO; LOSS: battler 0, this
MURKROW's own Explosion self-KO). One mechanism, no WIN/LOSS branch, exactly
per the step brief. `TERMINAL_SEAM_WIN_SCAFFOLD_PLAYER` (WIN's visible,
pixel-verified 115/115 DUSCLOPS) is untouched — it already satisfies the
bound today (115 ≤ the real GRANBULL's 165) and is the one placeholder that
*is* actually rendered, so its value stays pinned to the oracle's own
healthbox, not the real (disjoint, invisible) party.

**Verified directly** (repro: `tools/compare/traces/win-terminal-window-off
.json`'s last segment `{frames: 1, buttons: ["A"]}` → `{frames: 2, buttons:
["A"]}` plus `captureFrames` extended by one to 5012; same edit to
`loss-terminal-window-off.json`'s own last segment, `captureFrames`
extended to 3232): with the `hp: 0` fix, **neither window throws anymore**
at its own dismiss-press-completion tick (WIN 5012, LOSS 3232) — §5's crash
is gone, confirmed by direct reproduction, not inference.

**But a second, unrelated, much larger gap replaces it: the post-`finishBattle`
presentation this scaffold hands off to does not model this fixture's real
timing at all.** Neither window can actually render past its handoff tick
today, for a completely different reason than party identity:

- **WIN** (`round.rules.phase` → `"presentingBattleWin"`, not a terminal
  round outcome — battle index 0 of 7, not battle 6): `render()`
  (`core.ts`) only special-cases `factoryRoundBattleOrchestrator` state via
  `battleStartIntro`/`battleResolutionPresentation`/`battleCommandPresentation`/
  `factorySwap`/`postwin`; none of those fire for `"presentingBattleWin"`
  with no `postwin` populated, so it falls through to whatever the generic
  map/overworld path draws for this synthetic scenario's placeholder
  location — a **solid black frame** at tick 5012, where the oracle is still
  pixel-identical to the held quote (RAM-ahead-of-pixel per §3's own ground
  truth — the real fade doesn't even *start* until tick 5018, doesn't reach
  the battle-room flash until 5079). 38247/38400px differ (99.60%),
  `ssimMean≈0.0001` — not a near-miss, a completely different screen.
- **LOSS** (`round.rules.phase` → `"roundLost"`, which *is* one of
  `terminalCommandForRound`'s two recognized terminal phases): `render()`'s
  `factoryTerminal` branch **does** fire here — `createFactoryTerminalPresentation`
  is a real, already-implemented feature. But its modeled timing has no
  relationship to this fixture's actual recorded schedule: captured ticks
  3232-3259 (the 28 ticks immediately after the dismiss's 2nd press) show our
  app's `factoryTerminal` presentation racing all the way through its own
  fade to a **fully-rendered Battle Factory lobby/counter-room scene** by
  tick 3259, while the oracle at the same tick is still mid-fade on the held
  quote text ("I AM ABOUT TO / OVERHEAT", fading) — the *committed fixture's
  own recorded schedule* (`tools/battle-lab/loss-terminal-explosion-dusclops-off.json`,
  `trace.segments`) doesn't even reach its own final capture until +800 idle
  ticks past this same dismiss press. Diff % drifts from 99.6% down to ~86%
  over those 28 ticks (both screens are trending darker as they fade, which
  mechanically narrows SSIM even though the actual content is unrelated) —
  not a calibration nudge, a different animation on a different clock
  entirely.

**This is not a repeat of either §4 or the party-identity bug above**: no
crash, no party/HP shape involved. It's a timing/feature mismatch in a
substantial, separate presentation subsystem (`factoryTerminalPresentation.ts`/
`postwin.ts`/`core.ts`'s render dispatch for the between-battle "return to
the counter room" sequence) that has never been calibrated against either of
these two fixtures' own multi-hundred-tick real schedules. Diagnosing it
properly needs dense oracle re-probing of the post-dismiss span on both
fixtures (WIN: ticks 5012-5079+ per this doc's own §2 citations already on
file; LOSS: ticks 3232-4938 per the committed fixture's own recorded
schedule, §0 above) to characterize the real per-tick sequence before it can
be compared against what `factoryTerminalPresentation.ts`/`postwin.ts`
currently model — multi-probe, likely multi-session work, not a data-file
extension. Out of this session's remaining budget; flagged for whoever picks
up the fade/post-dismiss span next.

**Not fixed here**: extending either trace past its current bound
(WIN 389/389 at frame 5011, LOSS 236/236 at frame 3231) requires closing the
gap above, which is a `src/` presentation-timing task, not a scaffold data
edit — out of this lane's authority this step. Both trace files are
byte-identical to their pre-session committed state (`git diff --stat
tools/compare/traces/` shows no changes this session); only
`tools/compare/appTrace.ts`'s two placeholder `hp` fields changed.

**Verification**: `git diff --stat` for this session's changes:
`tools/compare/appTrace.ts` (`TERMINAL_SEAM_SCAFFOLD_TRAINER`/`_PLAYER`
`hp: 200` → `hp: 0`, plus the comment explaining why) + this doc's §6. Zero
`src/`/`tests/`/`tools/compare/traces/` edits. `npm run compare --
win-terminal-window-off --summary`: 389/389, twice-run byte-identical
manifests (modulo `generatedAt`). `npm run compare -- loss-terminal-window-off
--summary`: 236/236, twice-run byte-identical manifests (modulo
`generatedAt`). Full `npm test`: 721 files, 6927 passed/1 skipped. `npm run
build`: green. The two mid-investigation trace extensions used to reproduce
and characterize the post-handoff gap above were reverted before commit —
confirmed via `diff` against the pre-session committed files showing no
differences.

## Verification

- `git diff --stat` for this session's changes: `docs/` (this file, new) +
  `tools/probe/dump-win-terminal-swap-textprinter.py` (new, reusable probe,
  adapted from the LOSS probe with only `SCENARIO_PATH` changed). Zero
  `src/`/`tests/`/`tools/compare/` edits.
- Probe run once (`tools/run-mgba-probe.py`, its own isolated mGBA session,
  no shared oracle service touched); every RAM transition cited above reads
  directly from that run's own output — the same fixture's twice-run
  byte-identical `bin/oracle lab` captures (this session's own fresh
  reproduction, see the compare-trace commit) independently confirm the
  pixel-visible ticks this probe's RAM predicts (4229 first "Player
  defeated" glyph, 4613 slide dispatch) at the exact ticks the ground-truth
  doc already cited.
- Struct addresses/offsets are unchanged from
  `docs/terminal-seam-antecedent-boundary-probe.md` (this probe reuses that
  doc's already-cross-checked `0x020201b0` derivation verbatim — no new
  address derivation needed since the struct is a fixed engine location, not
  fixture-specific).
