# Noland silver walk-up — dense presentation map (PreBattleRoom call-scene through BattleRoom entrance)

Side-lane evidence deliverable per this session's step brief ("walk-up
program, step 2"). Live-verified against `http://127.0.0.1:8014` (Battle
Scene OFF) this session (2026-08-14), reconciled against
`src/data/gen/factory-brain-walkup-script.json` (the source-extraction
ground truth banked by the walk-up program's step 1). Ground truth for the
staged path is the twelve `tools/battle-lab/factory-brain-silver-walkup-
NN-*-dense-off.json` fixtures committed alongside this doc — every fixture
is a full **stride-1** (every single internal frame) `preCheckpointCaptureFrames`
list, frames 384 through 3231, split at the 256-entries-per-request cap. All
fixtures use the same staged path as `tools/battle-lab/factory-brain-silver-
intro-dense-off.json` (`mode: factoryBrain`, `challengeNum: 2`,
`playerSetIds: [267, 268, 269]`, `rentalSwapCount: 0`, `seed: 305419896`) —
the same staged path the `factory-round-battle7-noland-reveal-off` 648/701
live compare (PROGRESS 1261/1266) exercises for its post-checkpoint segment.
Frame numbers below are pre-checkpoint numbers (`bin/oracle lab` writes them
as `pre-checkpoint-frame-NNNNN.png`) unless stated otherwise.

**Repro:**
```sh
bin/oracle lab tools/battle-lab/factory-brain-silver-walkup-01-entry-and-guided-walk-dense-off.json -o /tmp/seg01
# ...same for 02 through 12; each is independently re-runnable and deterministic
# (verified live this session: re-running segment 12 alone reproduces the exact
# sha256 values cited below, byte-identical to the original run).
```

## 0. Headline finding — §1.1's call-scene does not fire on this staged path (silver or gold)

**This is the single most important result of this step and supersedes part
of the step brief's premise.** The brief asked for dense capture of "the
ReturnToRoomFromBattle re-entry (heal line), the §1.1 call-scene, the ready
menu (answer GO ON), the swap YESNO (answer No)" as part of the silver
walk-up, on the theory (stated in the brief's WHY SILVER) that silver
"exercises every shared surface (call-scene, menu, entrance)." **Dense
evidence shows this is not true for the currently available `factoryBrain`
staging mode — for silver or gold.** None of §1.1's events #1–6
(`ReturnToRoomFromBattle`'s heal line, phone-ring SE, attendant
walk-away/return, 3-page boss message, `AskReadyForHead`'s GO ON/RECORD/
REST/RETIRE menu, `AskSwapBeforeHead`'s YES/NO prompt) appear anywhere in
the staged trace. Only event #7 (`EnterBattleRoom`'s "Right this way,
please!" box, the guided walk, and the warp) fires — because that part of
§1.1 is shared with the genuine *first-battle-of-a-fresh-draft* path, which
is the path this staging shortcut actually takes.

**Evidence (dense PNG, frames 384–521,** `tools/battle-lab/factory-brain-
silver-walkup-01-entry-and-guided-walk-dense-off.json`**):** frame 410 still
shows the rental-draft confirm screen ("Are these three POKéMON OK?" YES
selected); a fade-to-black warp (sha `d8b44303…`, frames 418–431) is
immediately followed by frame 435 already showing the PreBattleRoom
corridor with **no attendant NPC on screen and no phone-call box** — the
first message box that appears (typewriter visible by frame 456, fully
held frames 479–522, sha `5e853338…`) is directly `Text_RightThisWay`
("Right this way, please!"), i.e. `EnterBattleRoom`'s own line
(`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:44`) —
not `ReturnToRoomFromBattle`'s heal line (`:57`), not the phone-call text
(`:65`/`:69`), not `AskReadyForHead`'s multichoice (`:350`), not
`AskSwapBeforeHead`'s YES/NO (`:372`). There is no frame gap large enough
between the confirm screen (410) and this box's typewriter start (456) for
any of §1.1's skipped content to fit — 46 frames total, versus the ≥400
frames that content needs (compare to how long the *actually-observed*
"Get a move on!" and "Shake out…" boxes each hold, §2 below).

**Root cause (RAM tiebreaker, same methodology as
`docs/noland-walkup-dialogue-scoping.md` §1.6's gold-discrepancy
resolution):** `tools/probe/probe-factory-brain-silver-callscene-ram.py`
reads `gSpecialVar_0x8006` (the decomp's `VAR_0x8006`, a *special var*
stored as its own EWRAM global — `src/event_data.c:16` — not part of the
`SaveBlock1.vars[]` table the existing gold-entrance probe reads) at every
frame 380–635 of this same staged run. Source
(`BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterRoom`,
`scripts.inc:23–42`, the `MAP_SCRIPT_ON_FRAME_TABLE` handler) branches
three ways on this var: `== 1` → `ReturnToRoomFromBattle` (the call-scene);
`== 2` → `ResumeChallenge`; otherwise falls through to the **fresh-draft
entry path** (attendant+player enter-room movement, generate rental/
opponent mons, "Hold your mons, choose from selection", fade to black,
`factory_rentmons` opens the draft UI) which itself **falls straight into
`EnterBattleRoom` with no ask-ready gate at all** — this is the ROM's
genuine, correct first-battle-of-challenge behavior, not a decomp bug.
The probe finds `varSpecial8006 == 5` continuously across frames 380–635
(never 1, never 2):

```
{'frames': '380-521', 'mapName': 'PreBattleRoom', 'varSpecial8006': 5, 'varSpecial8005': 2}
{'frames': '522-626', 'mapName': 'PreBattleRoom', 'varSpecial8006': 5, 'varSpecial8005': 1}
{'frames': '627-635', 'mapName': 'BattleRoom',    'varSpecial8006': 5, 'varSpecial8005': 1}
```

`BattleLab.prepare()` (`oracle/battle_lab.py:565–735`) restores the
canonical rental checkpoint and re-enters `DoBattleFactorySelectScreen`
directly via a raw `gMain+4` callback write (bypassing the `EnterRoom`
wrapper script entirely, including its var-setting preamble), then forces
`battleNum = 6` in SaveBlock2 so the generated opponent is Noland — but it
never writes `VAR_0x8006` at all. Whatever the canonical checkpoint's save
data happens to hold (5, apparently a leftover from however that
checkpoint was itself staged) is neither 1 nor 2, so the map's own
`OnFrame` dispatch — which *does* still run, unaffected by the raw callback
write, since it's driven by the field script system polling every frame —
takes the fresh-entry fallthrough. This is the same *class* of finding as
§1.6's gold discrepancy (a lab-staging gap in overworld-side bookkeeping
the harness's `prepare()` doesn't reproduce), but a different specific
mechanism (`VAR_0x8006` never set to 1, vs. §1.6's symbol-count equality
never satisfied) and, unlike §1.6, **it affects silver too, not just
gold** — the "SILVER exercises every shared surface" premise in this
step's own brief does not hold. Root-cause fix is harness-side
(`BattleLab.prepare()` would need to write `VAR_0x8006 = 1` and populate
the transient state `ReturnToRoomFromBattle` expects before re-entering),
out of scope for this docs-only step per the same reasoning
`docs/noland-walkup-dialogue-scoping.md` §1.6 used for the gold artifact —
**flagged, not fought.**

**What this means for goal item 1:** §1.1 events #1–6 could not be densely
captured because they are not reachable via any currently staged
`factoryBrain` fixture. Everything from event #7 onward (`EnterBattleRoom`'s
"Right this way, please!", the guided walk, the warp, all of §1.2's
BattleRoom entrance, and all of §1.3's silver speech through the
`DoSpecialTrainerBattle` handoff) **was** captured, densely and stride-1,
and is reconciled against the JSON below.

## 1. Reconciliation against `factory-brain-walkup-script.json`

| JSON event (path in the generated script) | Reachable on this staged path? | Evidence |
| --- | --- | --- |
| `preBattleRoomCallScene` (op: factory_setopponentmons/resethelditems) | **No** | §0 |
| `preBattleRoomCallScene` events 0–7 (heal msgbox, `playfanfare MUS_HEAL`, phone SE, attendant movement ×2, boss-message msgbox, `delay 16`) | **No** | §0 |
| `askReadyForHead` (menu msgbox + multichoice) | **No** | §0 |
| `askSwapBeforeHead` (msgbox + yesno) | **No** | §0 |
| `enterBattleRoom` events 0–1 (`Text_RightThisWay` msgbox, `closemessage`+`GetLvlMode` call) | **Yes** | §2 row 1 |
| `enterBattleRoom` `movementVariant FRONTIER_LVL_50` (guide+player walk) | **Yes** (level 50 requested; `FRONTIER_LVL_OPEN` variant not exercised) | §2 row 2 |
| `enterBattleRoom` warp to `MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM` (6,11) | **Yes** | §2 row 3, RAM-probe-confirmed map flip at frame 627 |
| `battleRoomEntrance` placement (Noland visible from start at (7,9)) | **Yes** (Noland/scientists/decoy already on screen at first BattleRoom frame, before any msgbox) | §2 row 4 |
| `battleRoomEntrance` `Text_GetAMoveOn` msgbox | **Yes** | §2 row 5 |
| `battleRoomEntrance` Noland movement + `PlayerEnterRoom` movement (simultaneous) | **Yes** | §2 row 6 |
| `battleRoomEntrance` `ScientistsFaceBattle` call | **Yes** (scientists visible flanking throughout; individual turn-in-place frames not separately isolated from the simultaneous player/Noland movement — see caveat in §2 row 6) | §2 row 6 |
| `silverFirstEncounter` 8-page `Text_NolandImFactoryHead` | **Yes**, all 8 `\p`-pages verbatim | §3 |
| `silverFirstEncounter` `frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH` | Not independently observable in PNG (no visible effect) | — |
| `silverFirstEncounter` `Text_ShakeOutKnowledgeBringItOn` | **Yes** | §2 row 15 |
| `silverFirstEncounter` `DoNolandBattle` call (`closemessage`, `HealPlayerParty`, `DoSpecialTrainerBattle`) | **Yes**, box-close + pre-transition flash onset observed; the transition/pic-reveal/send-out portion itself is out of this step's scope and already covered by `docs/noland-brain-intro-ground-truth.md` §2 | §2 row 16 |

No event the capture shows is *absent* from the JSON (the reverse
direction the task also asks to check) — everything reachable on this path
maps onto a JSON event 1:1. The only mismatch is JSON events present with
**no** corresponding capture (the §0 finding), not spurious capture content
outside the JSON's sequence.

## 2. Frame-exact timing map — entry through BattleRoom entrance (frames 384–1150)

All frames are pre-checkpoint, staged path above. Fixture column names the
committed `tools/battle-lab/factory-brain-silver-walkup-*.json` file.

| # | Frames | Len | Fixture | Content | Text (verbatim, PNG-confirmed where noted) |
| - | --- | --- | --- | --- | --- |
| — | 384–417 | 34f, 2f cursor-blink cycle | 01 | Tail of the rental-draft confirm screen (not walk-up; pre-existing feature, out of scope) | "Are these three POKéMON OK?" YES/NO — **PNG-verified** at 410 |
| — | 418–431 | 14f hold (`d8b44303`) | 01 | Fade-to-black warp (draft screen → PreBattleRoom); same sha as the later pre-transition black flash (§4 caveat) | — |
| — | 432–455 | 24f, unique-then-9f-hold | 01 | Fade-in to PreBattleRoom corridor; no attendant NPC, no phone-call box | — |
| 1 | 456–478 | 23f, unique every frame | 01 | Typewriter: `Text_RightThisWay` | "Right this way, please!" (typing) |
| — | 479–522 | 44f hold (`5e853338`) | 01 | `Text_RightThisWay` held | "Right this way, please!" — **PNG-verified** at 480, 500 |
| — | 523–620 | ~98f, unique every frame | 01 | `closemessage`; guided walk (`Movement_GuideWalkToBattleRoomLv50` + `Movement_PlayerWalkToBattleRoomLv50`, both 5-step) | (movement only) |
| — | 621–626 | 6f (part of `d8b44303` hold, extends past segment boundary) | 01/02 | Warp fade begins (PreBattleRoom side) | — |
| — | **627** | boundary | RAM probe | **Warp completes** — `gSaveBlock1Ptr->location.mapNum` flips PreBattleRoom→BattleRoom exactly here (RAM-probe-confirmed, §0) | `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM, 6, 11` |
| — | 627–654 | (continues `d8b44303` hold through frame 639, then a further hold `245febff`/`5bdb8218` to 663) | 01/02 | Warp fade continues, BattleRoom side (screen still visually black/settling) | — |
| — | 664–686 | 23f, unique every frame | 02 | Fade-in reveals BattleRoom: hex arena, 6 scientists flanking, Noland already placed and visible (per JSON `placement.visibleFromStart: true`) | — |
| 5 | 687 onward, typing tail visible from ~655 | — | 02 | Typewriter: `Text_GetAMoveOn` | "Hey, hey! Get a move on!" (typing, tail) |
| — | 687–960 | 274f hold (`7d806624`) | 02/03 | `Text_GetAMoveOn` held | "Hey, hey!\nGet a move on!" — **PNG-verified** at 700, 920 |
| 6 | 961–1112 | 152f, unique every frame (camera zooms/pans throughout) | 03 | `closemessage`; simultaneous `Movement_NolandMoveToBattle` (walk_up×3, face_left) + `Movement_PlayerEnterRoom` (walk_up×5, face_right, applied to both the decoy and the real camera-fixed player) + `ScientistsFaceBattle` call | (movement only) — **PNG-verified** at 970 (box closed, camera tightening, no Noland in frame — mid-walk), 1000 (camera zoomed tight, Noland visible top), 1050 (near end of movement) |
| — | 1100 | — | 03 | Typewriter: first speech page opening | "Hey, my name's NOLAND! I'm basically in charge of" (typing) — **PNG-verified** |
| 9a | 1113–1535 | 423f, cycling 9f-period idle-bob hold (`9f28b9d6…` family) | 03/04/05 | `Text_NolandImFactoryHead`, page 1, first `\l`-segment held | "Hey, my name's NOLAND!\nI'm basically in charge of this place," — **PNG-verified** at 1120 |

Caveat on row 6: the individual scientists' turn-in-place frames are not
separately isolated from the simultaneous Noland/player camera-pan
movement in this pass — all three movements (`Movement_NolandMoveToBattle`,
`Movement_PlayerEnterRoom`, `ScientistsFaceBattle`) run concurrently per the
JSON's own `applymovement`/`call` ordering, and the camera zoom during this
same window makes the scientists' small in-place turn hard to distinguish
frame-by-frame from mGBA PNGs at this resolution; their presence (flanking
the arena, unmoved position) is confirmed, their turn animation's exact
sub-frame timing is not separately broken out.

## 3. Frame-exact timing map — the 8-page silver speech + battle cry (frames 1113–3231)

Page numbers match `silverFirstEncounter.events[0].pages[]` (0-indexed) in
`factory-brain-walkup-script.json`. Page 1 (index 0) contains an internal
`\l` scroll (two on-screen segments, same page — not a `\p` page break).

| Page | Frames held | Fixture | Text (verbatim, PNG-confirmed) |
| --- | --- | --- | --- |
| 1 (seg. a) | 1113–1535 | 03/04/05 | "Hey, my name's NOLAND!\nI'm basically in charge of this place," |
| 1 (`\l` scroll) | 1536–1582 | 05 | (scroll transition, unique every frame) |
| 1 (seg. b) | 1583–2128 | 05/06/07 | "I'm basically in charge of this place,\nwhich is why I'm the FACTORY HEAD!♥" — **PNG-verified** at 1650 |
| — (`\p` transition) | 2129–2168 | 07 | (unique every frame) |
| 2 | 2169–2257 | 07/08 | "I had a look at your Battle Swap data.♥" — **PNG-verified** at 2200 |
| — (`\p` transition) | 2258–2331 | 08 | (unique every frame) |
| 3 | 2333–2395 | 08 | "You seem to have the right idea,\nbut you're still square in your head!♥" |
| — (`\p` transition) | 2396–2473 | 08/09 | (unique every frame) |
| 4 | 2474–2527 | 09 | "Listen up, okay? Knowledge isn't only\nabout reading books or doing desk work." |
| — (`\p` transition) | 2528–2587 | 09 | (unique every frame) |
| 5 | 2588–2659 | 09 | "Just doing that sort of thing…\nIt may as well be useless!♥" |
| — (`\p` transition) | 2660–2736 | 09/10 | (unique every frame) |
| 6 | 2737–2798 | 10 | "You have to experience things with\nyour heart and your body, understand?♥" — **PNG-verified** at 2760 |
| — (`\p` transition) | 2799–2848 | 10 | (unique every frame) |
| 7 | 2849–2929 | 10 | "I'll take you on under the same\nconditions as you." |
| — (`\p` transition) | 2930–2965 | 10/11 | (unique every frame) |
| 8 | 2966–3067 | 11 | "I'll be using rental POKéMON, too!" |
| — (`\p` transition, box close + reopen for the battle-cry line) | 3068–3125 | 11 | (unique every frame) |
| battle cry | 3126–3200 | 11/12 | "Shake out every last bit of your\nknowledge and bring it on!" — **PNG-verified** at 3150, 3199, 3200 |
| — (box closes; empty arena pause) | 3201–3228 | 12 | sha `31aec4d6…` — **byte-identical** to `docs/noland-brain-intro-ground-truth.md`'s independently-derived §2 row for the same span (cross-session corroboration that both docs replay the identical deterministic route) |
| — (pre-transition flash onset — `DoSpecialTrainerBattle` handoff; out of this step's scope from here on) | 3229–3231+ | 12 | sha `ce3e94fa…` at 3229, matching the flicker-cycle family `docs/noland-brain-intro-ground-truth.md` §2 already documents for frames 3229–3279 |

All eight page texts and the battle-cry line match
`factory-brain-walkup-script.json`'s `pages[]` strings **verbatim**,
control codes rendered correctly (`\n` → line break, `\l`→ scroll-in-place,
`♥` → the end-of-text-box prompt glyph, not a JSON-carried character).
**No text mismatches found** in the reachable portion.

## 4. Caveats

- **The "holds" above are an artifact of the harness's auto-acknowledgement
  cadence, not real player pacing.** `BattleLab._finish_intro_to_action_menu`
  (`oracle/battle_lab.py:1684–1713`) polls in fixed 134-frame chunks (120
  idle + 2-frame A-press + 12 idle), advancing exactly one page/prompt per
  chunk regardless of how long ago the text finished typing. A real player
  advancing text as soon as it finishes typing would see each page held for
  only as long as its own typewriter reveal takes (tens of frames), not the
  ~130–550-frame holds recorded here. The **relative order and content** of
  every box is faithful; the **absolute hold durations** are a probe-harness
  artifact and should not be read as the real game's pacing. This is the
  same caveat `docs/noland-brain-intro-ground-truth.md` §2 already raises
  for the post-1180 portion of this same route; this doc extends it
  explicitly to the newly-captured 384–1150 window too.
- **Two sha256 coincidences, confirmed genuine (not evidence of a state
  re-entry):** (1) the warp-fade black frame (`d8b44303…`, frames
  418–431/621–639) is byte-identical to the later pre-transition black flash
  `docs/noland-brain-intro-ground-truth.md` §2 documents at frames
  3379–3422 — expected, both are solid black framebuffers. (2) Frame 1050
  (mid-`Movement_NolandMoveToBattle`/`PlayerEnterRoom`, camera still
  panning) is **byte-identical** (`31aec4d68fe629cb…`, full 64-hex-char
  match verified) to frame 3201 (the settled, post-battle-cry empty-arena
  pause) — a genuine coincidence: the camera framing and character
  positions transiently match between an in-progress movement frame and the
  fully-settled final resting frame. Neither collision changes any
  event-sequence conclusion above; both are noted per this codebase's
  standing sha-collision-vs-state-reentry discipline (see
  `docs/noland-walkup-dialogue-scoping.md` §1.6's own precedent).
- **"Which input drives each transition"** is answered at the *mechanism*
  level (§0's `_finish_intro_to_action_menu` polling, and the `_advance()`
  segment lists inside `rental_selection_route`/`SELECT_CONFIRM_TO_ACTION_
  MENU` for the pre-384 portion) rather than as an exhaustive per-keypress
  frame list — the harness's own internal button schedule drives this
  route, not a hand-authored trace this session controls, and reconstructing
  the exact absolute frame of every individual internal A-press was out of
  scope for the time budget here. The **box open/close and movement start/
  end frames** themselves (what actually matters for a presentation port)
  are frame-exact per §2/§3 above.
- **`FRONTIER_LVL_OPEN`'s movement variant** (`Movement_GuideWalkToBattleRoomLvOpen`
  / `Movement_PlayerWalkToBattleRoomLvOpen`) was not exercised — this
  staged path always requests `level: 50`, which resolves to
  `FRONTIER_LVL_50`. Both variants are already fully enumerated (with
  identical step *counts*, mirrored left/right) in
  `factory-brain-walkup-script.json`, so no further oracle evidence is
  needed to port the Open variant — only the already-captured Lv50 timing
  needed live confirmation, which this doc provides.
- **No music/audio events were separately probed this session** (Battle
  Scene OFF captures don't carry audio) — `factory-brain-walkup-script.json`
  already documents the shared `MUS_B_FACTORY` track and note that no music
  change happens during the walk-up itself; nothing in this session's dense
  capture contradicts that.

## 5. Fixture manifest

All twelve fixtures share the staged path (`factoryBrain`, `challengeNum: 2`,
`playerSetIds: [267, 268, 269]`, `rentalSwapCount: 0`, `seed: 305419896`,
`level: 50`) and differ only in their `preCheckpointCaptureFrames` list
(each a full contiguous stride-1 range, ≤256 entries per the harness's
per-request cap):

| Fixture | Frames | Dominant content |
| --- | --- | --- |
| `factory-brain-silver-walkup-01-entry-and-guided-walk-dense-off.json` | 384–639 | Draft-confirm tail, warp fade, "Right this way, please!", guided walk start |
| `factory-brain-silver-walkup-02-battleroom-entrance-dense-off.json` | 640–895 | Guided walk end, warp to BattleRoom, fade-in, "Get a move on!" opens+holds |
| `factory-brain-silver-walkup-03-movement-and-speech-open-dense-off.json` | 896–1151 | "Get a move on!" closes, Noland/player/decoy/scientist movement, speech page 1 opens |
| `factory-brain-silver-walkup-04-speech-p1a-dense-off.json` | 1152–1407 | Speech page 1, first `\l` segment (held) |
| `factory-brain-silver-walkup-05-speech-p1b-dense-off.json` | 1408–1663 | Speech page 1 `\l` scroll + second segment begins |
| `factory-brain-silver-walkup-06-speech-p1c-dense-off.json` | 1664–1919 | Speech page 1, second segment held |
| `factory-brain-silver-walkup-07-speech-p1-p2-dense-off.json` | 1920–2175 | Page 1→2 transition, page 2 opens |
| `factory-brain-silver-walkup-08-speech-p2-p3-dense-off.json` | 2176–2431 | Page 2 held, page 2→3 transition, page 3 |
| `factory-brain-silver-walkup-09-speech-p3-p5-dense-off.json` | 2432–2687 | Page 3→4→5 transitions |
| `factory-brain-silver-walkup-10-speech-p5-p7-dense-off.json` | 2688–2943 | Page 5→6→7 transitions |
| `factory-brain-silver-walkup-11-speech-p7-battlecry-dense-off.json` | 2944–3199 | Page 7 held, page 8, battle-cry line opens+holds |
| `factory-brain-silver-walkup-12-battlecry-close-handoff-dense-off.json` | 3200–3231 | Battle-cry close, empty pause, pre-transition flash onset (handoff boundary) |

RAM-probe evidence: `tools/probe/probe-factory-brain-silver-callscene-ram.py`
(run via `python3 tools/run-mgba-probe.py <out.json> -- tools/probe/probe-
factory-brain-silver-callscene-ram.py <out.json>`), frames 380–635.
