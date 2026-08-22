# Terminal record prompt, YES branch — ground truth (Battle Scene OFF)

MAIN-lane worker, closing ISSUES #104's stub-only remainder. Source:
`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:76-94`
(`EventScript_AskRecordBattle` -> `case 0` -> `EventScript_RecordBattle` ->
`EventScript_SaveBattle`, `data/maps/BattleFrontier_BattleTowerLobby/
scripts.inc:132-138`) — `frontier_savebattle` (stub: always succeeds per the
2026-08-05 standing decision), `playse SE_SAVE`, then
`msgbox BattleFrontier_BattleTowerLobby_Text_BattleRecordedOnPass,
MSGBOX_DEFAULT` ("{PLAYER}'s battle was recorded\non the FRONTIER PASS.$",
`scripts.inc:472-474`), before falling into the same
`EventScript_EndRecordBattle` farewell NO/cancel already reach.

## Method

Derived from the existing NO-path dense probe
(`tools/battle-lab/scratch-loss-beyond-boundary-probe.json`, ground-truthed
in `docs/post-terminal-beyond-boundary-ground-truth.md` §2 — the held
YES/▶NO multichoice at oracle frame 4938, decline press at 4988-4989). New
scratch fixture `tools/battle-lab/scratch-loss-record-yes-probe.json`: same
52-segment prefix through the held multichoice, one appended `UP` press
(frames 4538-4540, well inside the proven-held span) to move the cursor onto
YES before the SAME final confirm `A` press (now selecting YES instead of
the default NO), then two new `A` dismisses (message, farewell) with a dense
1-tick `captureFrames` sweep from 4970 through 5102. Run via
`bin/oracle lab tools/battle-lab/scratch-loss-record-yes-probe.json` (NOT
`bin/oracle run` — that replays the plain canonical `/v1/run` bootstrap, not
this mechanicLab scenario, and will silently show an unrelated rental-draft
screen).

## Findings (all ages relative to the confirm-YES edge E = oracle frame 4989,
the last held frame of the 4988-4990 confirm press — same edge tick
`declineFarewellReleaseAge` arms for every answer)

| age | event |
|---:|---|
| E+1 (4990) | multichoice cursor vanishes; old record-question text lingers (same `declineMenuClearDelay=1` every answer shares) |
| E+1..E+20 (4990-5009) | held, zero pixel change — `frontier_savebattle`'s own processing latency (20 ticks longer than NO's `declineTextClearDelay=3`) |
| E+21 (5010) | box wipes blank |
| E+22 (5011) | first glyph ("M") |
| E+22..E+70 (5011-5059) | types 1 char/tick, 49 chars total: `"MEMORY’s battle was recorded"` (28) + `"on the FRONTIER PASS."` (21) — `{PLAYER}` -> "MEMORY", the fixed save-name every other terminal message in this profile already bakes in literally (e.g. `getPoints`); apostrophe is U+2019 (`’`), the same charmap glyph `congratulations` already uses, not ASCII `'` |
| E+70+ | held (message fully typed) |
| dismiss A at oracle frame 5081 (edge2) | held content stays on screen through edge2+2 (5081-5083) |
| edge2+3 (5084) | box wipes blank (same `declineTextClearDelay=3` the farewell always uses) |
| edge2+4 (5085) | farewell ("We look forward to your next visit.") starts typing — unchanged mechanics/constants, just relative to this later, re-armed edge |

## Engine mapping

`declineFarewellReleaseAge` keeps arming on confirm for all three answers
(unchanged). For YES it doubles as the new "recorded" message's own edge
(`recordSavedTextClearDelay=21`, `recordSavedTextFirstDelay=22`,
`recordSavedInputDelay=70` — the last-glyph-tick input-accept rule this file
already uses elsewhere) until that message's own dismiss re-arms
`declineFarewellReleaseAge` to the dismiss tick, at which point every
existing farewell constant/renderer (`declineMenuClearDelay`,
`declineTextClearDelay`, `declineTextFirstDelay`, `declineInputDelay`,
`declineReleaseClearDelay`) drives the real `EndRecordBattle` text
unmodified — NO/cancel never touch the new fields.

## Compare result

`tools/compare/traces/loss-terminal-record-yes-off.json` (appRoute
`canonical-recorded` — the `generated-orchestrator` route's own 2026-08-14
continuous-play re-chain fires the instant `recordChoice` becomes non-null,
for ALL three answers, and so cannot render this span at all; that is a
pre-existing, documented product decision unrelated to #104, not a residual
of this fix). `npm run compare -- tools/compare/traces/loss-terminal-record-yes-off.json --summary`:
**133/133** over the dense window (oracle frames 4970-5102 inclusive — the
confirm press through the recorded message, its dismissal, and ~18 frames
into the farewell).

A one-frame, out-of-scope residual was found and deliberately excluded from
the committed capture window: at oracle frame 4539 (the cursor-move `UP`
press itself, not part of the required capture range) the app updates the
YES/▶NO cursor one tick earlier than the oracle. That is pre-existing
`drawRecordPrompt` cursor-draw timing, untouched by this fix, and out of
this step's scope — not filed as a new ISSUES entry given the time budget,
but worth a future PAPERCUT-class look.
