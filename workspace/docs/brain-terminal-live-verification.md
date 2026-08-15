# Brain seventh-win terminal window — live verification (2026-08-14)

Side-lane step: verify the brain-analog seventh-win terminal window (BP
award 0→14, congrats text, silver symbol) against the real ROM. Brain analog
of the committed ordinary fixture (`tools/probe/stage-factory-seventh-win-timeline-off.py`
-> `src/data/gen/factory-seventh-win-timeline-off.json`,
`tests/factorySeventhWinFixture.test.ts`).

## What was built

`tools/probe/stage-factory-brain-silver-terminal-off.py` (run via
`python3 tools/run-mgba-probe.py <out.json> -- python3
tools/probe/stage-factory-brain-silver-terminal-off.py <out.json>`) mirrors
the ordinary fixture's technique exactly — replay the real
`battle1-postwin-dense.json` win prefix to tick 29601 (a genuine ROM win, not
an injected one), then write only the SaveBlock/map-loader bookkeeping a real
Noland-silver seventh win's Battle Room branch has already produced before
its Lobby warp — extended with the two writes an ordinary seventh win never
needs:

- `gTrainerBattleOpponent_A = TRAINER_FRONTIER_BRAIN` (1022) at
  `0x02038bca` (`bin/oracle symbols gTrainerBattleOpponent_A`). This is what
  `frontier_isbrain`/`GiveBattlePoints` read directly
  (`frontier_util.c:1839-1845`, `:1892,1902`) — the same category of write as
  the ordinary fixture's `curChallengeBattleNum`/`factoryWinStreaks` patches
  (facility identity/bookkeeping a real win already fixed, not a battle
  outcome).
- The Factory silver symbol flag: `FLAG_SYS_TOWER_SILVER +
  FRONTIER_FACILITY_FACTORY*2` = `SYSTEM_FLAGS(0x860) + 0x64 + 4*2` =
  flag id **2252**, i.e. `SaveBlock1.flags` byte **281** bit **4**
  (`GetFlagPointer`/`FlagSet`, `event_data.c:196-212`: byte = id/8, bit =
  id&7; flags array at SaveBlock1 offset `0x1270`, `global.h:1020`).
  `GiveFacilitySymbol` (`frontier_util.c:1918-1925`) is called from the
  **Battle Room's** `DefeatedNolandSilver` branch
  (`data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:128-141`),
  strictly *before* the warp to Lobby — i.e. before this fixture's checkpoint
  — so it is pre-existing state at this checkpoint, not something the Lobby
  script mutates. The Lobby's `WonChallenge` only branches on
  `frontier_isbrain` for which congrats text to show
  (`scripts.inc:40-46`); it never calls `frontier_givesymbol` itself.

Streak/battle-number bookkeeping represents battle 21 overall = Noland's
silver encounter (challengeNum 2, 0-indexed battleNum 6 = 7th battle of that
challenge): `frontier.curChallengeBattleNum = 7`,
`frontier.factoryWinStreaks[SINGLES][LEVEL_50] = 21` (entering streak 20 +
this win), `frontier.battlePoints = 0` baseline so the mutation is
observable.

## Live RAM pins (real mGBA ROM, three independent runs — ready/rejected/accepted-A — byte-identical staged frame zero)

- **BP mutation: 0 → 14**, first observed at relative tick **2701** past the
  `CB2_LoadMap` handoff. Matches source exactly:
  `factory-ending-policy.json`'s `factorySinglesByAwardRow[2] = 4`
  (challenge-index 2, i.e. `floor(21/7)` then decrement-unless-zero) **+**
  `brainBonus = 10` = **14**, confirming
  `applyFactoryBrainRoundOutcome`'s computed award for this exact case.
- **Silver symbol flag stays set** through the entire terminal window
  (`silverSymbolFlagStaysSet: true` — every one of 4924 sampled ticks).
- **`gTrainerBattleOpponent_A` stays `TRAINER_FRONTIER_BRAIN`** through the
  entire window (`trainerBattleOpponentAStaysBrain: true`).
- Party/status restore and challenge-status clear: tick **4049**.
- Record menu: drawn at **4922**, an `A` there is rejected (menu stays
  alive, `gSpecialVar_Result = 0xFF`); the first accepted `A` (tick 4924)
  commits the default **NO** (`gSpecialVar_Result = 1`, menu closes) — same
  shape as the ordinary fixture.

Fixture: `src/data/gen/factory-brain-silver-terminal-off.json`. Tier-1 pin:
`tests/factoryBrainSeventhWinFixture.test.ts` (file-disjoint from main-lane
files).

## What was NOT verified this session

**The formula-derived congrats scroll-gate ages** (`factoryTerminalPresentation.ts`'s
`frontierBrainCongratsScrollGateReadyAge` = 41 + 30 + 29 − 1 = **99**, and
`frontierBrainCongratsFinalGateReadyAge` = scroll-release + 7 + 24 − 1 =
scroll-release **+ 30**) remain formula-derived, **not** live-confirmed.

The probe above uses deliberately roomy scheduled inputs (ticks 300/700/…,
matching the ordinary fixture's own methodology, which also never reaches
tighter than "comfortably past the real gate" — e.g. its congrats DEFAULT
wait is scheduled at 300 while the real gate is 102). The sampled
`(printer.active, printer.state)` tuple distinguishes idle/printing/waiting
states but a single value stays constant across the *entire* "still typing a
glyph" through "done, waiting for the player" span, so it cannot pin the
exact edge — the printer's `(1,3)` state span for the congrats box in this
run is `[97, 299]`, i.e. the real ready edge is somewhere inside that
202-tick window, not resolved to a single tick. Reproducing the zero-slack
methodology the ordinary fixture's other gates used (e.g. the LOSS window's
page-0 first-glyph age, corrected 143→142 via "a dense oracle re-probe over
the previously-unverified page-0 span", per `factoryTerminalPresentation.ts`'s
doc comment) needs a dedicated dense/bisected probe — out of this session's
remaining time budget.

**`npm run compare -- <trace>` could not be run at all** — this is a harness/
tooling gap, not a skipped step:

1. The standing `/v1/run` trace schema (`tools/compare/run.ts`,
   `runOracleTrace`) only replays a flat `segments` button-input list; it has
   no field for the RAM writes this technique needs (challenge status,
   streak, `gTrainerBattleOpponent_A`, the symbol flag).
2. The `factoryBrain` battle-lab mode (`/v1/battle-lab/run`,
   `runOracleBattleLab`) **cannot reach the Lobby terminal at all** — this is
   not new information found this session, it is `docs/noland-brain-staging-design.md`
   §2.5's own explicit conclusion, restated here because it directly
   resolves this step's "harness mode cannot stage a battle-21 terminal
   entry" contingency: `GiveBattlePoints`/`GiveFacilitySymbol` fire from the
   facility's post-battle round-loop script, "not from anything a
   `mechanicLab` pre-battle-to-in-battle capture window reaches ... which the
   lab does not drive" (§2.5, restated §4's exhaustive semantic-site census).
   The lab's own smoke test (`oracle/battle-lab-brain-smoke-test.py`) only
   ever asserts against `captures[0]` at the pre-battle checkpoint, never a
   post-battle Lobby state, consistent with this.
3. The tooling that once produced pixel-exact `npm run compare`-style
   verification for the *ordinary* seventh-win window
   (`tools/compare/factoryTerminalLoss.ts` +
   `tools/compare/fixtures/factory-terminal-round-won-off.json`, added in
   commit `333b2214` "Implement exact seventh-win terminal fanfare window",
   producing the ROADMAP's "2513/2513" / "1911/1911" numbers) has since been
   removed from the tree (`git ls-files` finds neither file today) — it is
   not available to reuse or extend for the brain case.

**Net:** the RAM-mutation half of this step's goal is live-verified against
the real ROM (BP 0→14, symbol flag, brain identity, all with zero
discrepancy from source formulas). The pixel/byte-rendering half
(`npm run compare` against the app's brain-terminal window, and pinning the
two scroll-gate ages to an exact live tick) is blocked on tooling this
worktree may not build within a side-lane step: either a new `/v1/run`
RAM-write-capable trace field (harness-side, `oracle/`, out of workspace
bounds per `CLAUDE.md`) or a from-scratch dense-probe rig replacing the
deleted `factoryTerminalLoss.ts` machinery (a bigger, separate task). Neither
`frontierBrainCongratsScrollGateReadyAge`/`frontierBrainCongratsFinalGateReadyAge`
nor the app's byte-exact congrats rendering should be treated as live-proven
by this session; `src/engine/factoryTerminalPresentation.ts`'s existing doc
comment flagging them as formula-derived pending a live trace remains
accurate and should not be removed.

## Congrats scroll-gate ages, live-measured (2026-08-14, follow-up session)

Closes the one remaining formula-derived piece flagged above: both of the
brain congrats box's input-gate ages (the mid-message `\l` scroll accept and
the post-third-line dismiss accept) are now live-measured against the real
ROM, via a new probe built on the same staging technique as
`stage-factory-brain-silver-terminal-off.py`.

**Before measuring, a correction to this doc's own citation above.** The
"formula-derived" values quoted in this doc's earlier section (99, and
"scroll-release + 30") do not match what
`factoryTerminalPresentation.ts` actually computes today — they hand-counted
the `frontierBrainCongratulations` line lengths as 30/29/24 instead of the
real 29/28/23. Running the real code
(`node_modules/.bin/vite-node` against `FACTORY_ROUND_WON_TERMINAL_PROFILE`)
gives:

- `frontierBrainCongratsScrollGateReadyAge` = `congratulationsTextDelay(41)
  + line0.length(29) + line1.length(28) - 1` = **97** (not 99).
- `frontierBrainCongratsFinalGateReadyAge(congratsScrollReleaseAge)` =
  `congratsScrollReleaseAge + thirdLineTextDelay(7) + line2.length(23) - 1`
  = `congratsScrollReleaseAge` **+ 29** (not +30).

This is a citation bug in this doc / the app's own doc comment, not a
`src/` change — flagged here as instructed (EVIDENCE ONLY, no `src/` edits)
so a future step can correct the comment. The rest of this section compares
the live measurement against these *actually-computed* 97 / +29 values, not
the doc's earlier (miscounted) 99 / +30.

### Method

New probe: `tools/probe/bisect-factory-brain-congrats-gates-off.py`. It
duplicates `stage-factory-brain-silver-terminal-off.py`'s staging exactly
(replay the real `battle1-postwin-dense.json` win prefix to tick 29601, then
patch the same brain seventh-win bookkeeping — that script cannot be
imported as a library because it calls `main()` unconditionally at module
scope), then bisects both gates by issuing a single `A` press at a candidate
relative tick across independent fresh replays (each restages from the
canonical prefix, so runs never interfere) and reading the real ROM's text
printer FSM directly from `reference/pokeemerald/src/text.c`:

- **Gate (a)**, the `\l` scroll accept: `RENDER_STATE_SCROLL_START` (printer
  struct `state` field == 3) calls `TextPrinterWaitWithDownArrow` every
  tick; on an accepted press it sets `state = RENDER_STATE_SCROLL` (4) in
  the *same* tick (`text.c:1180-1188`). So "accepted at tick T" ⟺
  `printer.state` reads 4 immediately after a press scheduled at T;
  "rejected" ⟺ `state` stays 3 (matches the un-pressed natural baseline at
  that tick).
- **Gate (b)**, the post-third-line dismiss: once line 2's `EOS` is read,
  `field_message_box.c`'s `Task_DrawFieldMessage` self-destructs the *same*
  tick (`case 2: if (RunTextPrintersAndIsPrinter0Active() != TRUE) { ...;
  DestroyTask(taskId); }`) — there is no task/printer field left to poll.
  The actual "wait for A/B, then advance the script" lives entirely in the
  overworld script engine's `waitbuttonpress` command, which this probe has
  no RAM struct for. So gate (b) is measured by its earliest observable
  *consequence* instead: for each candidate tick, press `A` only there, run
  12 more (un-pressed) ticks, and check whether the printer ever comes back
  **active** (a new `AddTextPrinter` for the award text) within that span —
  vs. the un-pressed natural baseline, which never does over the same span.
  `AddTextPrinterForMessage()` runs synchronously before
  `CreateTask_DrawFieldMessage()` in the same script-command dispatch that
  `waitbuttonpress`'s acceptance unblocks, so this reactivation should land
  on the same tick as the real accept, not merely nearby.

Every candidate is proven both ways round: the pressed run vs. an
un-pressed natural baseline read at the identical tick (never a single
endpoint screenshot), and a same-length window checked on both sides of the
measured boundary.

**A confound found and worked around:** a naive "does anything differ from
the un-pressed baseline" predicate over-fires, because pokeemerald's held-A
print-speed-up mechanic (`text.c:944-955`: `JOY_NEW(A|B)` zeroes
`delayCounter`, advancing that tick's glyph/control-code processing early)
makes an *earlier*, unrelated tick's press also show a diff from natural
without being the transition under test. Concretely: pressing `A` on tick
96 (one tick before the line-0/1 text naturally finishes) sped up the
in-progress glyph and made `printer.state` read 3 a tick early — a real RAM
difference, but not "the scroll being accepted." The probe's `bisect_gate`
takes a caller-supplied predicate for exactly this reason (see the
docstring); gate (a)'s predicate checks specifically for `state ==
RENDER_STATE_SCROLL`, not "any diff."

### Rerun

```sh
python3 tools/run-mgba-probe.py /tmp/brain-congrats-gates.json -- \
  python3 tools/probe/bisect-factory-brain-congrats-gates-off.py /tmp/brain-congrats-gates.json
```

### Results

**Gate (a) — `\l` scroll accept.** Natural (never-pressed) baseline:
`printer.state` reads 0 (`HANDLE_CHAR`, typing) for ticks 1–96, then 3
(`SCROLL_START`, waiting) from tick 97 onward, unboundedly (an un-pressed
run never advances past a wait state). T‑1/T bisection pair:

- Tick **97** (reject): pressed row `{active:1, state:3, scrollDistance:0}`
  — *identical* to the natural baseline at tick 97. The press had no
  effect: `TextPrinterWaitWithDownArrow`'s `JOY_NEW` check only fires on a
  tick where `state` was *already* 3 at entry, and state only just became 3
  this same tick, one call too late for the same-tick check to have run.
- Tick **98** (accept): pressed row `{active:1, state:4, scrollDistance:12}`
  — diverges from natural (still `state:3`). The scroll genuinely starts.

**Measured `congratsScrollReleaseAge` boundary = 98.** App-computed formula
value = 97. **Verdict: off-by-1 (real gate opens 1 tick later than the
formula).**

**Gate (b) — post-third-line dismiss**, measured relative to the real
accept tick (98) from gate (a) (not the formula's 97, so the two errors
don't compound). Natural baseline (accept scroll at 98, then never press
again): printer stays active typing line 2 through tick 126, goes
**inactive at tick 127** (`EOS` reached), and never reactivates — sits
frozen forever, as expected for an un-pressed run. T‑1/T bisection pair
(both ticks are *after* the natural inactivation point, so the print-speed-up
confound above cannot apply — there is no in-progress glyph left to speed
up):

- Tick **129** (reject): pressing `A` here produces no reactivation within
  the following 12 ticks (through tick 141) — identical to the natural
  baseline's own 12-tick lookahead from the same tick (also no
  reactivation).
- Tick **130** (accept): pressing `A` here produces a reactivation
  (`printerActive` flips back to 1, a new `AddTextPrinter` for the award
  text) within the following 12 ticks — the natural baseline over the same
  span never reactivates.

**Measured dismiss boundary = 130**, i.e. `congratsScrollReleaseAge + 32`.
App-computed formula: `congratsScrollReleaseAge + 29`. **Verdict: off-by-3
(real gate opens 3 ticks later than the formula).**

### Summary vs. the app

| Gate | Real ROM (measured) | App formula (as coded today) | Verdict |
| --- | --- | --- | --- |
| (a) `\l` scroll accept | age 98 | age 97 | off-by-1 (formula 1 tick early) |
| (b) post-line-2 dismiss | `congratsScrollReleaseAge + 32` | `congratsScrollReleaseAge + 29` | off-by-3 (formula 3 ticks early) |

Both clocks are the same "Terminal-local age; zero is the staged
`CB2_LoadMap` handoff" the app's `FactoryTerminalRoundWonPresentationState`
already documents, and the same clock the probe's `relative` tick uses (both
start at the identical staged frame and increment once per `oracle.advance`
/ engine tick), so this is a same-origin, same-units comparison. Per this
step's EVIDENCE ONLY contract, `frontierBrainCongratsScrollGateReadyAge`/
`frontierBrainCongratsFinalGateReadyAge` in
`src/engine/factoryTerminalPresentation.ts` are **not** changed — the app
still uses 97 / `release + 29`, now known to each be off by a small,
specific amount (+1 and +3 respectively) rather than merely "unverified."
A future `src/` step can fix both formula constants (to 98 and `release +
32`) and this doc's own miscounted 99/+30 citation together, pinned by a
Tier‑1 test.

Probe: `tools/probe/bisect-factory-brain-congrats-gates-off.py`. No output
JSON is committed (matches this repo's existing probe convention — outputs
are regenerated on demand via the rerun command above).
