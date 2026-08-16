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

## Out of scope (per step brief)

- RECORD/REST/RETIRE menu answers (goal item 4, optional — not attempted
  this session; time-boxed out).
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

All four set `"profile": "battle-scene-off"` explicitly (the battle-lab
request's actual profile field — matching every other committed
`tools/battle-lab/*.json` fixture; the harness's own trace-level
`"oracleProfile"` field belongs to the separate `/v1/run` contract, not
`/v1/battle-lab/run`) and share `"mode": "factoryBrain"`,
`"walkup": true`, `"challengeNum": 2`, `"playerSetIds": [267, 268, 269]`,
`"rentalSwapCount": 0`, `"seed": 305419896`, `"level": 50`.
