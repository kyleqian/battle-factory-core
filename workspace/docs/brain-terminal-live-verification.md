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
