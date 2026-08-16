# Silver walk-up call-scene + ask-ready menu — dense ground truth

Side-lane evidence deliverable, banked via the harness's new `factoryBrain` +
`walkup: true` battle-lab staging (top-layer commit `3e29880b`; see
`../oracle/BATTLE_LAB.md` "Frontier-Brain walk-up staging"). That staging
closes the gap `docs/noland-silver-walkup-presentation-map.md` §0 found: the
call-scene and `AskReadyForHead`/`AskSwapBeforeHead` prompts are now
reachable. This doc covers **only** those newly-reachable windows — the
BattleRoom entrance/speech windows are already banked in
`docs/noland-silver-walkup-presentation-map.md` and are **not** duplicated
here.

Verified live against `http://127.0.0.1:8014` (Battle Scene OFF,
`capabilities.battleLab.factoryBrainWalkup == true` confirmed at session
start) on 2026-08-16. Staged path for every fixture in this doc: silver
(challenge 2, streak 20→21), `playerSetIds: [267, 268, 269]`,
`rentalSwapCount: 0`, `seed: 305419896`, `level: 50` — the same staged path
`docs/noland-silver-walkup-presentation-map.md` and the harness's own
`oracle/battle-lab-walkup-smoke-test.py` already use.

**Readback proof the ROM's own post-win fragment ran** (every fixture below
echoes these in `battleLab`): `walkup: true`, `factoryWinStreak: 20`,
`curChallengeBattleNum: 6`, `factorySymbols: 0`, `askReadyMenuVariant:
"record"` (the real four-option menu — `disableRecordBattle` is clear,
matching genuine post-battle-20 state). These match
`battle-lab-walkup-smoke-test.py`'s own `silver` case exactly.

## Frame-numbering contract

Two separate coordinate spaces, per `BATTLE_LAB.md`:

- **Pre-checkpoint** (`preCheckpointCaptureFrames`): frame 0 is immediately
  after `new_session()`, before the rental draft. Used for window 1
  (call-scene) below.
- **Post-checkpoint** (`trace.captureFrames`): frame 0 is the checkpoint
  itself — the open ask-ready menu, cursor on GO ON. Used for windows 2 and
  3 below. **Confirmed live:** pre-checkpoint frame 1570 and post-checkpoint
  frame 0 are the same frame, byte-identical sha
  `86ec0c2e0ad0d237…` — i.e. the checkpoint is the literal continuation of
  the pre-checkpoint route, not a separate re-entry.

## Capture-list methodology (why these fixtures aren't blind stride-1)

Unlike the twelve pre-existing `factory-brain-silver-walkup-NN-*` fixtures
(full contiguous stride-1, because that staging path had no known event
boundaries), this session first ran an exhaustive scout
(`preCheckpointCaptureAllFrames: true` for window 1; three chained
256-frame stride-1 chunks for windows 2–3) to get every single frame's
sha256, then built each **committed** fixture's capture list to include
**every frame of every visually-changing stretch** (typewriter reveals,
movement, fades — never compressed) plus **the first/last few frames of
every long static hold** (a message held waiting for input repeats the same
sha for hundreds of frames with zero new information — the prior doc's own
§4 caveat already flags this same-cadence artifact). This keeps each
fixture's capture count far under the 256-per-request cap while losing no
distinguishable visual state. The scouting runs themselves are not
committed (not reproducible-fixture material — they're coarse or
all-frames dumps used only to find boundaries); the frame ranges and shas
below come from the **committed** fixtures' own manifests.

## Window 1 — call-scene (pre-checkpoint frames 418–1570, split at 1036)

Goal: warp-in through heal line, phone SE, attendant walk-away/return,
3-page boss message, up to the menu opening.

**Boundary honesty (per the harness doc's own note that pre-warp frames are
staging artifacts):** dense capture shows **two** black transitions before
the genuine call-scene begins, not one — frames 418–431 (14f hold, sha
`d8b44303…`) then a brief bright *no-message* PreBattleRoom frame
(447–455, 9f hold), then a **second** black hold (471–489, 19f, same
`d8b44303…` sha) before the scene fades in again (490–513) and the genuine
`ReturnToRoomFromBattle` heal line begins typing. The first fade is the
draft's own confirm-exit (game-genuine, but landing at an intermediate
no-message PreBattleRoom state that doesn't occur in real 21st-battle
re-entry); the second is the harness's own synthetic
PreBattleRoom-to-PreBattleRoom warp described in `BATTLE_LAB.md`'s
boundary note. **Only frame 490 onward is treated as genuine** below; 418–489
is captured sparsely (13 frames) in fixture 01 purely to document the
artifact, not as acceptance-grade content.

Repro:
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-callscene-01-off.json -o /tmp/seg-callscene-01
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-callscene-02-off.json -o /tmp/seg-callscene-02
```

**Re-run twice fresh, byte-identical:** both fixtures' full capture sets
(144 frames for 01, 199 for 02) matched sha256-for-sha256 across two
independent fresh runs each — zero diffs.

| Frames | Fixture | Content | Text (verbatim) |
| --- | --- | --- | --- |
| 418–431 | 01 | Draft-confirm-exit fade to black (staging artifact) | — |
| 432–446 | 01 | Fade-in to a no-message PreBattleRoom (staging artifact — doesn't occur in real re-entry) | — |
| 447–455 | 01 | Held, no box (staging artifact) | — |
| 471–489 | 01 | Second (synthetic) warp fade to black — **staging artifact boundary; genuine content starts after this** | — |
| 490–513 | 01 | Fade-in to PreBattleRoom, attendant already present, no box yet — **warp-in, genuine from here** | — |
| 514–565 | 01 | Typewriter: `Text_LetUsRestoreMons` | "Thank you for competing!\nLet us restore your POKéMON!" |
| 566–828 | 01 | Held (263f) — **PNG-verified** at 700, 750, 800 | same, fully typed |
| 829–849 | 01 | `playfanfare MUS_HEAL`/`waitfanfare`/heal special settle, then `playse SE_POKENAV_CALL; waitse` (silent — no visible SE), box reopens, typewriter begins — **PNG-verified** frame 830 mid-type ("E…") | `Text_WaitFewMoments` typing |
| 850–893 | 01 | Held — **PNG-verified** at 850 | "Excuse me! Excuse me, please!\nMay I get you to wait a few moments?" |
| 894–949 | 01 | `Movement_AttendantMoveToReceiveCall` (walk_left ×3) — unique every frame | (movement only) |
| 950–1000 | 01 | Typewriter: `Text_UnderstoodSirWillDo` — **PNG-verified** fully typed at 1000 | "…Uh-huh? What?! …Whoa!\nUnderstood, sir! Will do!" |
| 1001–1036 | 01 | Held | same, fully typed |
| 1037–1084 | 02 | `Movement_AttendantReturnToPlayer` (walk_right ×3, face_down) — unique every frame | (movement only) |
| 1085–1088 | 02 | Held, no box (attendant back in position) | — |
| 1089–1123 | 02 | Typewriter: boss-message page 1 | "Oh, my…\nSorry to keep you waiting!" |
| 1124–1170 | 02 | Held, 9-frame blink-cursor cycle | same, fully typed |
| 1171–1229 | 02 | Page 1→2 transition, typewriter | "I have a message from this facility's\nboss, the FACTORY HEAD." |
| 1230–1303 | 02 | Held, 9-frame blink-cursor cycle | same, fully typed |
| 1304–1355 | 02 | Page 2→3 transition, typewriter | "He says, "We're going to do it!\nCome here right now!"" |
| 1356–1438 | 02 | Held (83f) — **PNG-verified** at 1356 | same, fully typed |
| 1439–1456 | 02 | Held, no box (`closemessage` + `delay 16`) | — |
| 1457–1519 | 02 | Menu prompt typewriter + multichoice box opening | "The FACTORY HEAD is demanding you.\nAre you prepared to face him?" |
| 1520–1570 | 02 | Held (51f) — **PNG-verified** at 1524: menu open, 4 options, cursor on GO ON | same, fully typed; menu = GO ON/RECORD/REST/RETIRE |

No text mismatches found against `src/data/gen/factory-brain-walkup-script.json`'s
`preBattleRoomCallScene`/`askReadyForHead` strings — every page above
matches verbatim, control codes rendered correctly.

## Window 2 — ask-ready menu held, then GO ON accepted (post-checkpoint frames 0–135)

Trace: 120 frames idle (menu held, cursor on GO ON) → 2-frame A press.

Repro:
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-askready-menu-off.json -o /tmp/seg-askready-menu
```

**Re-run twice fresh, byte-identical:** all 21 captured frames matched
sha256-for-sha256 across two independent fresh runs — zero diffs.

| Frames | Content |
| --- | --- |
| 0–121 | Menu held: "The FACTORY HEAD is demanding you.\nAre you prepared to face him?", GO ON/RECORD/REST/RETIRE, cursor on GO ON — sha `86ec0c2e0ad0…`, identical to pre-checkpoint frame 1570 above |
| 122–135 | GO ON accepted: menu box clears, unique every frame (transition into window 3's one-liner) |

## Window 3 — AskSwapBeforeHead one-liner → swap NO → "Right this way, please!" dismiss (post-checkpoint frames 122–722)

Trace (full, from frame 0): `[120f idle, 2f A, 260f idle, 2f A, 120f idle,
2f DOWN, 8f idle, 2f A, 200f idle, 2f A, 10f idle]` — GO ON, wait, dismiss
the one-liner, wait, move cursor to NO, wait, confirm NO, wait, dismiss
"Right this way, please!".

**Cursor-timing finding relevant to a faithful port:** the swap yesno's
default cursor is **YES**, and a DOWN press only registers once the yesno
box's own typewriter has fully settled — a DOWN sent while the *preceding*
one-liner box is still up (i.e. before the yesno box even exists) is
silently swallowed, not queued; an early attempt this session that pressed
DOWN too soon fell through to the accidental YES branch (opened the
swap-mon screen) instead of NO. The final trace above waits a full 120
idle frames after the one-liner dismiss before sending DOWN, which reliably
lands after the yesno typewriter finishes.

Repro:
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-swapask-no-off.json -o /tmp/seg-swapask-no
```

**Re-run twice fresh, byte-identical:** all 194 captured frames matched
sha256-for-sha256 across two independent fresh runs — zero diffs.

| Frames | Content | Text (verbatim) |
| --- | --- | --- |
| 122–195 | Typewriter: `Text_CantTellAnythingAboutHead` (no scouting pages — confirms the design memo's §2.1 "AskSwapBeforeHead skips straight from GO ON to the swap ask") | "I'm terribly sorry, but I can't tell you\nanything about the FACTORY HEAD." |
| 196–385 | Held (190f) | same, fully typed |
| 386–448 | Typewriter: `Text_LikeToSwapMon` | "Before starting the battle, would you\nlike to swap a POKéMON?" YES/NO |
| 449–505 | Held, cursor on YES (default) — **PNG-verified** at frame 510 (scouting run) showing cursor still YES just before the DOWN take effect | same, fully typed |
| 506–515 | Held, cursor on NO (DOWN registered) — **PNG-verified** | same |
| 516–540 | `closemessage`, typewriter: `Text_RightThisWay` begins | "Right this way, please!" |
| 541–718 | Held (178f) — **PNG-verified** at frame 600 (scouting run) | "Right this way, please!" |
| 719–722 | A-press dismiss registers; box begins closing (guided walk starts immediately after — out of scope, already covered by `docs/noland-silver-walkup-presentation-map.md`) | — |

No text mismatches found against the JSON's `askSwapBeforeHead`/`enterBattleRoom`
strings.

## Window 4 — RECORD answer NO, then the re-asked menu (post-checkpoint frames 0–885)

Goal: from the open ask-ready menu, navigate down to RECORD, confirm, answer
the record YES/NO prompt with NO (the RECORD-YES save path is staged-not-
genuine — see boundary note below), and capture whatever follows in-window.

Trace (full, from frame 0): `[120f idle, 2f DOWN, 60f idle, 2f A, 300f idle,
2f A, 400f idle]` — wait on the settled menu, move cursor to RECORD, wait,
confirm RECORD, wait out the record prompt's typewriter + hold, confirm NO
(cursor already defaults to NO), wait out whatever follows.

**RECORD's save flow is not genuine, per `../oracle/BATTLE_LAB.md`'s own
boundary note:** the menu and the record-prompt text are the real scripts,
but no battle was actually recorded on this staged route, so a RECORD-YES
answer would save staged recording-buffer state, not a genuine battle-20
recording. This window therefore only exercises the NO branch — the
acceptance-grade one for a route that never took a real battle 20.

Repro:
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-askready-menu-record-off.json -o /tmp/seg-askready-record
```

**Re-run twice fresh, byte-identical:** all 178 captured frames matched
sha256-for-sha256 across two independent fresh runs — zero diffs.

| Frames | Content | Text (verbatim) |
| --- | --- | --- |
| 0–119 | Menu held (checkpoint state): "The FACTORY HEAD is demanding you.\nAre you prepared to face him?", GO ON/RECORD/REST/RETIRE, cursor on GO ON — sha `86ec0c2e0ad0…`, identical to the checkpoint/Window 2 frame 0 | same |
| 120–121 | DOWN registers; cursor moves GO ON → RECORD | same |
| 122–181 | Held, cursor on RECORD — sha `b6fdb1e5a343…` | same |
| 182–183 | A confirms RECORD; menu closes, revealing the still-open "FACTORY HEAD is demanding you" box underneath for one frame (sha `6267d3d8715b…`, matches this same box's fully-typed state elsewhere in this window — see 552–554 below) | — |
| 184–253 | Typewriter: `Text_RecordLatestBattle` | "Would you like to record your latest\nbattle on your FRONTIER PASS?" YES/NO |
| 254–483 | Held (230f), cursor on NO (default — `multichoicedefault … MULTI_YESNO, 1, FALSE`, index 1 = NO) — sha `c4a646b52a88…` | same, fully typed |
| 484–485 | A confirms NO; `AskRecordBattle`'s NO branch falls through `AskReadyForOpponent` → (brain ready) → `AskReadyForHead`, which re-issues its own opening message | — |
| 486–551 | Typewriter: `Text_PreparedToFaceHead` (re-asked) | "The FACTORY HEAD is demanding you.\nAre you prepared to face him?" |
| 552–554 | Held briefly, message box only, multichoice not yet reopened — sha `6267d3d8715b…` | same, fully typed |
| 555–885 | Multichoice reopens, cursor back on GO ON — sha `86ec0c2e0ad0d23781097e6091eb27159b37fc8af91a812dccec284cb6a6019a`, **byte-identical to frame 0 / the checkpoint itself** (full round-trip confirmed, PNG-verified at 700 and 885) | same |

No text mismatches found against the reference source
(`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`)'s
`Text_RecordLatestBattle`/`Text_PreparedToFaceHead` strings.

## Window 5 — RETIRE answer NO, then the re-asked menu (post-checkpoint frames 0–449)

Goal: from the open ask-ready menu, navigate down to RETIRE (three DOWN
presses past GO ON, through RECORD and REST), confirm, answer the retire
YES/NO prompt with NO, and confirm return to the menu — a bounded prompt
window, not the full loss-lobby path a RETIRE-YES would take.

Trace (full, from frame 0): `[120f idle, 2f DOWN, 30f idle, 2f DOWN, 30f
idle, 2f DOWN, 40f idle, 2f A, 110f idle, 2f A, 110f idle]` — wait, cursor to
RECORD, wait, cursor to REST, wait, cursor to RETIRE, wait, confirm RETIRE,
wait out the retire prompt, confirm NO, wait out whatever follows.

Repro:
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-askready-menu-retire-off.json -o /tmp/seg-askready-retire
```

**Re-run twice fresh, byte-identical:** all 174 captured frames matched
sha256-for-sha256 across two independent fresh runs — zero diffs.

| Frames | Content | Text (verbatim) |
| --- | --- | --- |
| 0–119 | Menu held (checkpoint state), cursor on GO ON — sha `86ec0c2e0ad0…` | same |
| 120–121 | DOWN #1 registers; cursor GO ON → RECORD | — |
| 122–151 | Held, cursor on RECORD — sha `b6fdb1e5a343…`, **byte-identical to Window 4's own 122–181 cursor-on-RECORD hold** (same menu state reached the same way) | — |
| 152–153 | DOWN #2 registers; cursor RECORD → REST | — |
| 154–183 | Held, cursor on REST — sha `6dc3a34f6daa…` | — |
| 184–185 | DOWN #3 registers; cursor REST → RETIRE | — |
| 186–225 | Held, cursor on RETIRE — sha `358cd6a56d10…` — **PNG-verified** at 186 (menu) | — |
| 226–227 | A confirms RETIRE; menu closes, revealing the still-open "FACTORY HEAD is demanding you" box for one frame (sha `6267d3d8715b…`, same sha as Window 4's equivalent transition frame) | — |
| 228–289 | Typewriter: `Text_RetireFromChallenge` | "Would you like to retire from your\nBattle Swap challenge?" YES/NO |
| 290–337 | Held, cursor on NO (default) — sha `49f0426b65c1…` — **PNG-verified** at 294 | same, fully typed |
| 338–339 | A confirms NO; `AskRetireChallenge`'s NO branch falls through `AskReadyForOpponent` → (brain ready) → `AskReadyForHead`, same re-ask as Window 4 | — |
| 340–405 | Typewriter: `Text_PreparedToFaceHead` (re-asked) — frame-for-frame sha-identical to Window 4's 486–551 typewriter, just offset 146 frames earlier | "The FACTORY HEAD is demanding you.\nAre you prepared to face him?" |
| 406–408 | Held briefly, message box only — sha `6267d3d8715b…` | same, fully typed |
| 409–449 | Multichoice reopens, cursor back on GO ON — sha `86ec0c2e0ad0d23781097e6091eb27159b37fc8af91a812dccec284cb6a6019a`, **byte-identical to frame 0 / the checkpoint itself** — **PNG-verified** at 409 | same |

No text mismatches found against the reference source's
`Text_RetireFromChallenge`/`Text_PreparedToFaceHead` strings. RETIRE's own
YES branch (`WarpToLobbyLost`, the full loss-lobby sequence) was
deliberately not exercised — out of scope per the step brief's own bound
("do NOT take retire-YES through the whole loss lobby").

**Input-swallow trap avoided:** all three DOWN presses in this window land
on an already-fully-settled, static multichoice list (no typewriter running
on any of the three cursor moves), so the ~30–40-frame gaps between them are
comfortably generous, not minimal — consistent with this session's own
papercut note (`../PAPERCUTS.md`) that the trap specifically bites when a
button is sent before a *box's own typewriter* has settled, not plain cursor
navigation within an already-open list.

## Out of scope (per step brief)

- REST's own menu answer (`AskPauseChallenge`, the save-and-quit path) —
  not part of this step's goal item 2, which scoped only RECORD and RETIRE.
- The swap-YES path's swap-screen contents (staged-not-genuine per
  `BATTLE_LAB.md`'s boundary note — `ReturnToRoomFromBattle`'s own
  `factory_setopponentmons` never ran on this route, so the pool reflects
  checkpoint leftovers, not a genuine beaten-opponent party).
- Anything from the guided walk onward (already banked in
  `docs/noland-silver-walkup-presentation-map.md`).
- Gold walk-up (a later step per the brief).

## Fixture manifest

| Fixture | Coordinate space | Frames | Count |
| --- | --- | --- | --- |
| `factory-brain-silver-walkup-callscene-01-off.json` | pre-checkpoint | 418–1036 | 144 |
| `factory-brain-silver-walkup-callscene-02-off.json` | pre-checkpoint | 1037–1570 | 199 |
| `factory-brain-silver-walkup-askready-menu-off.json` | post-checkpoint | 0–135 | 21 |
| `factory-brain-silver-walkup-swapask-no-off.json` | post-checkpoint | 122–722 | 194 |
| `factory-brain-silver-walkup-askready-menu-record-off.json` | post-checkpoint | 0–885 | 178 |
| `factory-brain-silver-walkup-askready-menu-retire-off.json` | post-checkpoint | 0–449 | 174 |

All six set `"profile": "battle-scene-off"` explicitly (the battle-lab
request's actual profile field — matching every other committed
`tools/battle-lab/*.json` fixture; the harness's own trace-level
`"oracleProfile"` field belongs to the separate `/v1/run` contract, not
`/v1/battle-lab/run`) and share `"mode": "factoryBrain"`,
`"walkup": true`, `"challengeNum": 2`, `"playerSetIds": [267, 268, 269]`,
`"rentalSwapCount": 0`, `"seed": 305419896`, `"level": 50`.
