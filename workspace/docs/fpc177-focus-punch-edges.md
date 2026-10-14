# fpc177 -- Focus Punch pre-pass edge routes (ISSUES #139), evidence only

No production change (`src/` and the existing tests are untouched). Twelve ROM cards (6 routes x Scene OFF / ON), each probed twice
fresh with direct mGBA: r1 == r2 byte for byte (`receipts/probe-sha256.json`). Production values come from
`tools/integration/fpc177Compare.ts` (the real kernel + `projectBattleResolutionCommands` / `createBattleResolutionPresentation`).

## Results

Rows are battle-frame rows; "glyph" = a print's first glyph. delta = production - ROM (so a positive delta means production is late).

| route | ROM (OFF / ON) | production now (OFF / ON) | delta | production change |
|-------|----------------|---------------------------|-------|-------------------|
| (a) player switch vs opp Focus Punch: order | pre-pass empty box 312 -> "tightening" 349 / 437 -> recall 455 / 543 -> Go 537 / 625 -> used 685 / 788 | recall 314 first, empty box 389, tightening 426 / 516 -> Go 543 / 633 -> used 659 / 749 | the recall comes BEFORE the pre-pass in production, AFTER it in the ROM | reorder (below) |
| (a) after only the reorder (recall events placed after the last `FocusPunchSetUp` event) | -- | empty 314, tightening 351 / 441, recall 461 / 551, Go 543 / 633 | +2, +2 / +4, +6 / +8, +6 / +8 | + two timing constants (below) |
| (b1) two Focus Punch users: next-pre-pass lead | 2nd empty box 209 / 299 | 211 / 301 | +2 | `NEXT_PRE_PASS_LEAD` 7 -> 5 |
| (b1) action lead after the 2nd pre-pass (action 1 = Focus Punch, u = 4) | tightening 246 -> used 356 (110) / 424 -> 534 (110) | 248 -> 360 (112) / 428 -> 540 (112) | +2 | action lead = 5 + u (11 -> 9) |
| (b2) action lead, StatDown (R4, Sand-Attack, u = 6) | 106 / 106 | 106 / 106 | 0 | none (this is the pinned class) |
| (b2) action lead, hit (Scratch, u = 4) | 104 / 104 | 106 / 106 | +2 | action lead = 5 + u |
| (b2) action lead, stat-up (Agility, u = 4) | 104 / 104 | 106 / 106 | +2 | action lead = 5 + u |
| (b2) action lead, status (Thunder Wave, u = 2) | 102 / 102 | 106 / 106 | +4 | action lead = 5 + u |

Lead = (the used print's first glyph) - (the pre-pass focus print's first glyph) - the print's own length; the table shows the whole
tightening-glyph -> used-glyph span for (b2) (Sand-Attack 215 - 109 = 106, Scratch 213 - 109 = 104, Thunder Wave 211 - 109 = 102 OFF;
ON the same: 305 - 199, 303 - 199, 301 - 199). The span is identical in Scene OFF and ON for every card.

### (a) Switch against a Focus Punch pre-pass

ROM order (both scenes, 2 x 2 fresh runs): `CheckFocusPunch_ClearVarsBeforeTurnStarts` runs the pre-pass first (empty box at turn order + 4,
the focus print after the setup pause / animation), THEN `BattleScript_ActionSwitch` ("JOLTEON, that's enough!" recall) and the send-in
("Go! MAGIKARP!"), THEN the used print. The control card (opponent Giga Drain, no pre-pass) puts the recall glyph at turn order + 6 and
production matches it exactly (314 / 314, Go 396 / 396), so the voluntary-switch seam itself is right; only its order against the
pre-pass is wrong.

Production presents `withSynthesizedSwitchRecallEvents`' two recall receipts (sequences -2 / -1) in front of the whole event list
(`battleResolutionPresentation.ts` ~4682-4730), i.e. before the pre-pass events.

Exact changes the evidence needs:

1. **Order**: when the events open with `BattleScript_FocusPunchSetUp` messages, insert the two synthesized recall receipts after the last
   `FocusPunchSetUp` event instead of before event 0 (the prediction in `compare.txt`, "[recall moved after the pre-pass]" rows, models
   exactly this). Focus glyph -> recall glyph is 106 in the ROM (OFF and ON) and 110 in production after the reorder (the constant 11 lead), so the
   lead into a switch recall is **7** (11 - 4), not the `5 + u` used-print rule below.
2. **Start**: the pre-pass empty box begins at turn order + 4 in the ROM, but a voluntary switch's null confirm handoff puts command 0 at
   turn order + 6 (`PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES = 9`). For a pre-pass-opening switch turn the hold is 7 (+2 residual
   removed in every row). Control turns (no pre-pass) keep 9.

After 1 + 2 (and the lead of 7) the recall / Go rows land on the ROM in OFF; ON keeps +2 .. +4 (the ON pre-pass animation row is 2 shorter than in the (b)
cards, see Remainder); all later rows keep the pre-existing switch-tail residual (below).

Pre-existing and NOT Focus Punch: Go -> used print is 147 rows in the ROM and 116 in production in the control card too (-31; a-switch
-26 after the reorder because u = 4 rather than 3). This is the switch/send-in tail and should be its own step.

### (b1) Two Focus Punch users in one turn

`FOCUS_PUNCH_PRE_PASS_NEXT_PRE_PASS_LEAD_FRAMES = 7` is two frames too long: the second pre-pass's empty box is at 209 (OFF) / 299 (ON) in
the ROM and 211 / 301 in production; the true lead is **5**. The action lead after the last pre-pass is 110 in the ROM and 112 in production
(same +2; it is the `5 + u` rule with u = 4 for Focus Punch, see (b2)). So (b1) needs `NEXT_PRE_PASS_LEAD` 7 -> 5 plus the action-lead rule.
Total drift at the used print: +4 (OFF 356 vs 360); ON +6 (534 vs 540), of which +2 is an ON-only difference in the pre-pass animation row that this step did not isolate.

### (b2) The 11-frame end2 -> action lead depends on the action-1 prologue

The pinned constant 11 is exactly right for R4's StatDown class (Sand-Attack) and wrong for other classes:

    lead = 5 + u        u = kernel instructionExecution of the next USEDMOVE print (the same u as trn176)

| class | u | lead = 5 + u | ROM span | production span (11) |
|-------|---|--------------|----------|----------------------|
| Sand-Attack (R4) | 6 | 11 | 106 | 106 |
| Scratch | 4 | 9 | 104 | 106 |
| Agility | 4 | 9 | 104 | 106 |
| Thunder Wave | 2 | 7 | 102 | 106 |

The formula fits 4 of 4 sampled classes in both scenes (8 of 8 cards). It is the same u that trn176's action-transition rule
(`E + 1 + d + n + 6 + u`) uses, which is the expected source reason: the used print is reached after the same fixed `end2` ->
`HandleAction_UseMove` sequence plus the used print's own `attackstring` execution count. Production change: in
`focusPunchPrePassMessageTiming` (`battleResolutionPresentation.ts:158-185`) replace the constant `FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES`
by `5 + u`, with u from the first following `STRINGID_USEDMOVE` message's `provenance.instructionExecution` (fall back to 11 when there is
none, e.g. the next action is a switch or a faint). The value for the next pre-pass stays 5.

## Cards

Scenarios (`tools/integration/fixtures/fpc177/scenarios`): `a-switch` (JOLTEON lead + 2 Magikarp vs BRELOOM Focus Punch; player switches
to slot 1), `a-switch-control` (same, opponent Giga Drain), `b1-two-users` (player BRELOOM vs HITMONLEE, both Focus Punch),
`b2-hit-scratch`, `b2-status-thunder-wave`, `b2-statup-agility` (R4's BRELOOM vs JOLTEON with the Jolteon move swapped). Each in
`-off` / `-on`. ROM receipts: `receipts/rom-r1.json` (`fpc177-rom/v1`). Compare output: `receipts/compare.{txt,json}`.

## Remainder

- One sample per prologue class; no substitute, weather, Protect, or multi-stage prologue classes. `5 + u` is a 4 / 4 fit, not a proof.
- Scene ON switch card: the first pre-pass print is 125 rows after the empty box in the ROM but 127 in the (b) cards and production; not
  understood (the (a) route has the null handoff). Only the ordering and the +2 start are claimed for ON.
- No drawn-pixel checks in Scene ON, only text and animation rows.
- The -31 switch -> used residual (above) is out of scope.
- Move-slot / PP: all cards keep four copies of one move; the PP-dependent paths are not covered.

Reproduce: `sh tools/integration/fpc177Run.sh <fresh-dir-inside-the-repo>` (needs about 3.5 min; stage, probe x2, fold, compare to the
committed receipt); `node --experimental-strip-types --no-warnings tools/integration/fpc177Compare.ts [--json] [--rows]`.
