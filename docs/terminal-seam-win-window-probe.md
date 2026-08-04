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
to pick `appStage.frame: 2996`), the WIN window's analogous start point is
tick **4613** (`opponentControllerCommand` 16→8, `trainerslidein
BS_ATTACKER` dispatches — already RAM-confirmed exactly by this probe, §2
above), and its end point mirrors the LOSS window's own convention (`dismiss
Tick + 1`, one frame past the quote's own real dismiss registering, still
pixel-identical to the held quote per the ground-truth doc's own
"5010-5017 RAM-ahead-of-pixel" note): the quote's dismiss registers at tick
**5010** (`tools/battle-lab/win-terminal-explosion-dusclops-off.json`'s own
committed segment start, cross-confirmed against §2's cited ground-truth
tick), so the window runs **4613–5011 inclusive (399 frames)**.

This is a different frame count than the LOSS window's 236 — expected, not
itemized as a residual: the two windows are edge-relative to structurally
different antecedents (WIN's slide-to-quote span is longer, and the quote's
own idle-then-dismiss gap before its real `A` press is a different recorded
duration than LOSS's), not a discrepancy needing reconciliation.

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
