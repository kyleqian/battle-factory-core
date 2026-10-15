# fpc180 -- Focus Punch pre-pass presentation, live in both scenes (ISSUES #139 edge routes)

Presentation timing / order only. Kernel events, damage, RNG, AI, turn order and facility state are unchanged (census kernel-event
digests identical for all 1,000 battles in both scenes). Evidence and the exact rules: `docs/fpc177-focus-punch-edges.md` (twelve
twice-fresh ROM cards, Scene OFF / ON). Base `a641cc285` (src tree `b53d46f547fdba03d08b989c9389283d60abe047`); production commit
`b96c086f2`, fixed up in `9f9be3f4a` (src tree `a126ced00b95a9ecd7a55c16c968ce6b199a9dd9`; every later commit is tests, tools,
fixtures or this doc only).

## What changed (`src/engine/battleResolutionPresentation.ts`)

1. **Order.** `withSynthesizedSwitchRecallEvents` places the two recall receipts (sequences -2 / -1) after the last
   `BattleScript_FocusPunchSetUp` event instead of before event 0 (no pre-pass: unchanged, recall first). The strictly-increasing
   sequence check in `projectBattleResolutionCommands` skips the synthesized receipts (dispatcher `synthesized-voluntary-switch`);
   consumers that compare sequences (`command.eventSequence >= sequence`, `event.sequence > through`) only ever see the receipts as
   "earlier than everything", which is what they were before.
2. **Start.** `advanceBattleResolutionConfirmHandoff`'s null-handoff hold is `FOCUS_PUNCH_PRE_PASS_SWITCH_CLOSE_FIELD_HOLD_FRAMES = 7`
   for a voluntary switch whose first segment opens with the pre-pass; every other switch turn keeps `PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES = 9`.
3. `FOCUS_PUNCH_PRE_PASS_NEXT_PRE_PASS_LEAD_FRAMES` 7 -> 5.
4. **Leads after the focus print** (`focusPunchPrePassMessageTiming`), by the next print (silent events such as a PP update are skipped):
   another pre-pass 5; the synthesized recall 7 (`FOCUS_PUNCH_PRE_PASS_SWITCH_RECALL_LEAD_FRAMES`); a `STRINGID_USEDMOVE` `5 + u`
   (`u` = its `provenance.instructionExecution`, the same `u` as trn178's transition rule); anything else (a paralysis / confusion
   print, a switch, a faint, nothing) the old 11 (`FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES`, now the fallback).

trn178's Scene OFF action-transition pause (`sceneOffActionTransitionPauseFrames`) is keyed to an action's first MoveEnd receipt
followed by the next action's USEDMOVE; the pre-pass prints are before every action, so no pause is anchored to them and the
`5 + u` lead is not double-counted (census: every changed command is a focus print's hold; no transition pause moved).

## Results

### 1. ROM cards (`tools/integration/fpc180Compare.ts` = fpc177Compare.ts + the real confirm hold for switch cards; `fixtures/fpc180/compare-{before,after}.{txt,json}`)

Print first-glyph rows, delta = production - ROM, first five prints. "Before" is the unchanged base (identical to fpc177's committed `compare.txt`).

| card | ROM | before (delta) | after (delta) |
|---|---|---|---|
| a-switch OFF (empty, tightening, recall, Go) | 312 349 455 537 | 314 389 426 543 (+2 +40 -29 +6; recall printed FIRST) | 312 349 455 537 (**0 0 0 0**) |
| a-switch ON | 312 437 543 625 | 314 389 516 633 (+2 -48 -27 +8) | 312 439 545 627 (0 +2 +2 +2) |
| a-switch-control OFF / ON (recall, Go; hold 9) | 314 396 / 314 396 | 0 0 / 0 0 | 0 0 / 0 0 (unchanged) |
| b1 two users OFF (2nd empty, 2nd tightening, used) | 209 246 356 | +2 +2 +4 | **0 0 0** |
| b1 two users ON | 299 424 534 | +2 +4 +6 | 0 +2 +2 |
| b2 hit Scratch (u 4) OFF / ON used | 213 / 303 | +2 / +2 | **0 / 0** |
| b2 stat-up Agility (u 4) OFF / ON used | 213 / 303 | +2 / +2 | **0 / 0** |
| b2 status Thunder Wave (u 2) OFF / ON used | 211 / 301 | +4 / +4 | **0 / 0** |
| R4 StatDown Sand-Attack (u 6) OFF / ON used | 215 / 305 | 0 / 0 | 0 / 0 (the pinned class) |

All twelve fpc177 cards plus the two R4 arms: every OFF row is on the ROM except the pre-existing Go -> used tail; ON keeps +2 on
the rows after the pre-pass animation (the ON pre-pass animation print is 127 rows after the empty box in production and 125 in the
ROM; the mystery is out of scope and reported, not touched). The second-empty-box and the action lead (tightening glyph -> used
glyph: b1 110 / 110, Scratch 104, Agility 104, Thunder Wave 102, Sand-Attack 106, both scenes) are 0 in every class and scene; the
b1 ON +2 at the 2nd tightening / used is the same ON animation row (125 vs 127), not the lead.

Pre-existing and unchanged (out of scope): Go -> used is 116 rows in production, 147 (control) / 148 (a-switch) in the ROM (OFF; ON 162 /
163), i.e. -31 control; -32 a-switch (u 4 vs 3: the ROM tail also grows with u, production's does not).

### 2. Tier-1 (`tests/fpc180FocusPunchLive.test.ts`, 8)

Order (empty, tightening, recall, Go, used; ROM text order, both scenes); lead 7 (recall = focus + 106 rows, OFF on the ROM, ON +2); start
(hold 7: command 0 at turn order + 4; control hold 9); control (non-Focus-Punch switch: recall first, hold 9, recall and Go on the ROM);
next-pre-pass lead 5 (209 / 299) and b1 action lead; `5 + u` for u 6 / 4 / 4 / 2 on both scenes; fallback (no USEDMOVE next keeps 11,
i.e. +2 over the u = 4 lead); a PP update between the focus print and the used print does not hide the used print.

### 3. Census 0..999 (`fpc180Census.sh` / `fpc180Census.ts` / `fpc180CensusDelta.py`; `fixtures/fpc180/census-delta-{off,on}.json`, shard hashes `census-sha256.txt`)

`a641cc285` vs `9f9be3f4a` (same src as the final production), 7 jobs (16 GiB host). Per scene: 1,000 battles, **kernel-event digests identical**,
no error mismatch (the three budget-stalled battles 434 / 796 / 881 are stalled in both trees, no tail difference). OFF 316,756 commands
and ON 307,633 commands in both trees. 100 pre-pass focus prints per scene (u = 2: 35, 3: 15, 4: 3, 5: 7, 6: 20, 7: 2, 11: 3; 15 followed
by a non-USEDMOVE print); **65 changed commands in 24 battles per scene** (976 battles byte-identical), every one a focus print's
`holdFrames` only, by exactly `5 + u - 11` (-4 x35, -3 x15, -2 x3, -1 x7, +1 x2, +5 x3); u = 6 (20) and the fallback (15) unchanged;
**0 unattributed**. The census player never switches voluntarily and never meets two Focus Punch users, so the order / start / next-pre-pass
rules are covered by the ROM cards and Tier-1 only.

### 4. `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base a641cc285`

**PASS, 641 / 641 byte-identical** (235 + 216 + 190; `fixtures/fpc180/differential.txt`); none of the captured frames crosses a Focus Punch pre-pass.

### 5. Re-pins

None. No existing frame expectation moved (the full suite had no failure on the production change); the only test change is the new
`tests/fpc180FocusPunchLive.test.ts`.

### 6. Gates

Code commit with the production change `9f9be3f4a` (src tree `a126ced00b95a9ecd7a55c16c968ce6b199a9dd9`):

| Gate | Result |
|---|---|
| `npm run test:smoke` | 448 / 448 |
| full `npm test` (nohup, `POKEBENCH_VITEST_MAX_WORKERS=2`, `/tmp/fpc180-run/full.{log,exit}`), run on `7cd674eea` (same src tree as `9f9be3f4a`; the commits after it are census tooling, receipts and the compare tool) | **exit 0: 1,679 files passed / 44 skipped, 13,926 tests passed / 223 skipped, 0 failed** (2,861 s) = the base's 13,918 + the 8 new |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 on the final tool fix (the first build failed on type errors in `fpc180Compare.ts`, which `tsc -b` checks through the new test; fixed, output byte-identical, test 8 / 8 re-run) |

## Remainder

- ON pre-pass animation print 127 rows after the empty box vs 125 in the ROM (a-switch ON and b1 ON): the ON rows after the pre-pass keep +2; not understood.
- The Go -> used switch tail (116 vs 147 / 148 rows, OFF; 162 / 163 ON) is untouched.
- `5 + u` is a 4 / 4 class fit (StatDown, hit, stat-up, status) plus the census's attribution of the rule (65 changed prints); Substitute (PP update
  before the used print), weather, Protect and multi-stage prologue classes have no ROM card and take the same rule. A paralysis / confusion print
  after the focus print takes the old 11 (unmeasured). Two Focus Punch users in one census battle and a voluntary switch in the census never occur,
  so the next-pre-pass lead, order and start rules are checked by the ROM cards and Tier-1 only.
- The census-measured drift shows up only in focus prints' hold; the party-select hold (7) is a lifecycle frame count, not a command, so it is outside the census.

## Reproduce

```sh
node --experimental-strip-types --no-warnings tools/integration/fpc180Compare.ts [--json] [--rows]     # == fixtures/fpc180/compare-after.*
npx vitest run tests/fpc180FocusPunchLive.test.ts
FPC180_CENSUS_JOBS=6 FPC180_FINAL=1 sh tools/integration/fpc180Census.sh <fresh-dir> a641cc285:off 9f9be3f4a:off a641cc285:on 9f9be3f4a:on
#   FPC180_SHARDS="0 1 2" runs only those 100-seed shards; re-invoke with the same root to resume (FPC180_FINAL=1 on the last call)
python3 tools/integration/fpc180CensusDelta.py <dir>/off-a641cc285 <dir>/off-9f9be3f4a out.json     # == fixtures/fpc180/census-delta-off.json
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base a641cc285
```
