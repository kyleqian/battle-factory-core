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
