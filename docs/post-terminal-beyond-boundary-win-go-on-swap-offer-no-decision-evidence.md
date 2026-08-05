# WIN swap offer → NO decision → "Right this way, please!" guide (Battle Scene OFF)

MAIN-LANE evidence packet, continuing
`docs/post-terminal-beyond-boundary-win-go-on-swap-offer-evidence.md` (which
bound the swap offer's real YES/NO input-ready hold at frame 9111, exact
**115/115** through the fixture endpoint 9942, and stopped without authoring a
decision). This packet authors the **first bounded NO decision**: a new scratch
battle-lab fixture preserves that fixture's 33 segments byte-for-byte, appends
a safely-held `DOWN` cursor move (YES → NO), a bounded idle, one 2-tick `A`
accepting NO, and a bounded idle tail. Dense oracle captures bind the NO
decision, the YES/NO-window dismissal, and the generic `Right this way,
please!` guide (`EnterBattleRoom`'s `Text_RightThisWay`) through its next
genuine held boundary, and measure the current app over the whole new span
with the same `win-terminal-window-off` appStage.

**Headline**: the app reproduces the entire new span byte-for-byte —
**213/213 exact, twice fresh, 0 residual classes** — after one small generic
production fix (see §4): the win terminal scaffold's terminal battle carries a
placeholder player identity (DUSCLOPS, personality `0xff`, uniform IV 3) that
differs from the round's rental records, and `finishBattle`'s overlay had been
spreading the whole terminal party onto the records' identity; that made
`healFactoryKernelParty`'s source-derived identity guard throw the moment the
NO decision advanced the round. Restricting the overlay to the four
battle-mutable fields (HP, status1, held item, PP) is the entire fix — no
timing calibration was needed: the existing `movePostwinSwapCursor` /
`acceptPostwinSwapDecline` / `postwinRightThisWay*` machinery reproduced every
oracle boundary with its current constants.

## 1. New fixture and prefix proof

`tools/battle-lab/scratch-win-go-on-swap-offer-no-probe.json` is a copy of the
committed `tools/battle-lab/scratch-win-go-on-swap-offer-probe.json` with all
33 existing `trace.segments` preserved **byte-for-byte** (JSON-equality
verified; the top-level payload except `trace.segments`/`trace.captureFrames`
is identical). Four segments are appended — the 2-tick `DOWN` press, 60 idle
frames, the 2-tick `A`, and a 400-frame bounded idle tail — giving 37 segments
/ 10406 total frames.

The `DOWN` therefore lands at frames 9943-9944, **832 ticks after** the swap
offer's proven input-ready boundary (9111) and safely inside the byte-identical
held YES/NO hold that the prior packet measured constant through its fixture
endpoint 9942. The cursor display moves to NO at frame 9944 (the second press
tick), holds through 10005, and the `A` at 10005-10006 accepts NO.

## 2. Oracle boundary ledger

`bin/oracle lab` manifest (raw framebuffer sha256, dense 9930-10129 + sparse
anchors to 10406; two dense runs byte-identical), all frames relative to the
probe fixture's own cumulative schedule:

| tick | sha256 (prefix) | what's on screen | mechanism |
|---:|---|---|---|
| 9930-9942 | `59fbfaa02169` | held swap offer "Before starting the battle, would you / like to swap a POKéMON?" + YES/NO window, YES cursor | the prior packet's proven input-ready hold, still constant |
| **9943** | `59fbfaa02169` | same (no visual change during the first press tick) | this fixture's **`DOWN` press** (frames 9943-9944); `MSGBOX_YESNO` logical cursor move, display handoff on the next VBlank |
| **9944** | `487568ef5768` | same text + YES/NO window, **▶ now on NO** (80px cursor-shape change at x169-174, y76-101 — the YES-row arrow erases and the NO-row arrow appears) | one-VBlank cursor display handoff after the logical move |
| 9944-10005 | `487568ef5768` constant | held NO cursor | the 60-frame bounded idle before the decision |
| **10005** | `487568ef5768` | same held NO window (no visual change during the first `A` tick) | this fixture's **`A` press** (frames 10005-10006); `MSG_DISPLAY` stores NO → `switch VAR_RESULT case NO` → `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterBattleRoom` (`scripts.inc:147`) |
| **10006-10007** | `d47ce4eb6b73` | swap-offer text box retained, **YES/NO window gone** (2088px erase at x161-214, y65-110) | the `MSGBOX_YESNO` menu window closes; the reused `msgbox` box keeps its old lines through the `closemessage` handoff |
| **10008** | `4bf39eb6ea32` | message box interior wiped, blank box (1697px text erase at x16-211, y124-151) | `closemessage`-class box clear into the next `msgbox` |
| **10009-10031** | 23 change points, 3 2-frame runs | **"Right this way, please!"** types at 1 visible glyph/tick (the 3 2-frame runs are the invisible space glyphs; final glyph `!` at 10031) | `EnterBattleRoom`'s `msgbox Text_RightThisWay, MSGBOX_DEFAULT` (`scripts.inc:44`) |
| **10031-10406** | `5e8a53338048` constant | fully typed guide message, **no wait-cursor** (measured: the red-pixel count is identical from the last typing tick through the endpoint — zero down-arrow pixels appear) | the guide's genuine held/dismiss-ready boundary; this step stops here per contract (no press into the walk/warp) |

The guide's exact text (`reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:612-613`):

> `BattleFrontier_BattleFactoryPreBattleRoom_Text_RightThisWay:`
> `.string "Right this way, please!$"`

This is the generic `EnterBattleRoom` handoff used by every NO / completed-swap
/ post-walk entry into the Battle Room (`scripts.inc:43-52`), not a
WIN-route-specific message. The oracle never leaves the pre-battle room here —
`waitmovement`/`warp` (the walk/warp) is deliberately unpressed.

## 3. App reproduction of the boundary (frame math)

The app's existing generic postwin clocks line up with the ledger exactly, with
no calibration:

| boundary | oracle | app (edge-relative) | match |
|---|---|---|---|
| cursor logical move → display | 9943 → 9944 | `movePostwinSwapCursor` at the first `DOWN` tick, `swapCursorDisplayPos` flips one tick later (`postwin.ts:586-600`, `core.ts:953-956`) | ✅ |
| NO accept edge | 10005 (first `A` tick) | `acceptPostwinSwapDecline` stores `swapDeclineElapsed` at the first `A` tick (`postwin.ts:602-609`, `core.ts:975`) | ✅ |
| YES/NO window gone | 10006 (edge+1) | the swap window draws only while `age === swapDeclineElapsed` (`core.ts:2333-2351`) | ✅ |
| old text held | 10006-10007 (edge+1..+2) | `POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY = 2` (`core.ts:2269-2277`) | ✅ |
| box clear | 10008 (edge+3) | `POSTWIN_DIALOGUE_BLANK_DELAY = 3` blank (`core.ts:2278`) | ✅ |
| first glyph `R` | 10009 (edge+4) | `POSTWIN_RIGHT_THIS_WAY_TEXT_FIRST_DELAY = 4` | ✅ |
| typing cadence | 1 visible glyph/tick, invisible spaces merge | `postwinRightThisWayVisibleChars` 1-char/tick (`postwin.ts:622-630`) | ✅ |
| final glyph `!` | 10031 (edge+26) | `POSTWIN_RIGHT_THIS_WAY_TEXT_SETTLED_DELAY = 4 + 23 − 1 = 26` | ✅ |
| held, no wait-cursor | 10031+ | the guide branch draws text only (no cursor) | ✅ |

## 4. The one production fix (generic, source-relative)

The **only** src change in this step is `overlayTerminalKernelParty`
(`src/engine/factoryRoundBattleOrchestrator.ts`): it previously returned
`{ ...member, ...terminal[index] }`, spreading the whole terminal battle party
onto the round's rental identity. When the win-terminal scaffold's terminal
battle player party is a placeholder (DUSCLOPS, personality `0xff`, uniform IV
3 — pixel-matched to the real fixture's staged party, see
`tools/compare/appTrace.ts`'s `TERMINAL_SEAM_WIN_SCAFFOLD_PLAYER`), that spread
imported the placeholder's identity into the post-battle kernel party, and
`healFactoryKernelParty`'s source-derived identity guard
(`src/engine/battleScenario.ts:155-189`) threw on the swap-offer NO advance
(`advanceAfterSwapResult` → `healFactoryKernelParty(records, playerKernelParty)`).

The real game never mutates a party member's species/personality/IVs/ability
slot/moves/PP-bonus byte during a battle — the controller `REQUEST_*` writes
touch only HP, status1, held item, and PP (the same set
`docs/battle-resolution-adapter-ground-truth.md` §2's `deriveBattleParty`
overlays onto the BattleParty). The overlay now carries exactly those four
mutable fields and keeps the records' identity, so a scaffold terminal party
(any future one) can never corrupt the round's kernel identity. No absolute
frame / battle number / fixture branch was added.

Tier-1 pin (`tests/factoryRoundBattleOrchestrator.test.ts`,
"keeps rental identity when a scaffold terminal party is overlaid…"): builds
the win-terminal-window scaffold shape (records 664/678/527 + DUSCLOPS
placeholder terminal party), runs the terminal-handoff through
`advanceFactoryRoundBattleResolution`, asserts the kernel party preserves the
records' personality/setId/IV while carrying the battle's HP/status/item/PP,
then declines the swap and asserts the round advances to `presentingBattleStart`
(battleIndex 1). Red-verified: fails on the old full-spread overlay with the
personality-mismatch throw (`git stash -- src/engine/factoryRoundBattleOrchestrator.ts`).

## 5. App binding result

New compare spec `tools/compare/traces-groundtruth/win-go-on-swap-offer-no-off.json`
reuses the canonical `win-terminal-window-off` appStage at its canonical stage
frame 4623 and copies the new fixture's 37 segments + 213 captureFrames
verbatim:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-go-on-swap-offer-no-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-go-on-swap-offer-no-probe.json` | 37, sum 10406 | dense 9930-10129 + sparse to 10406 | **213/213 exact, 0 diff** (twice fresh) |

**No first mismatch exists** on the new span: held-YES anchors, both `DOWN`
press ticks and the 9944 cursor flip, the NO hold, both `A` ticks, the
YES/NO-window dismissal, the box clear, every guide typing frame (including the
invisible-space merges), and the held no-cursor tail are all byte-identical.
The generic seven-battle round owner advances only at the real presentation
handoff: the swap-offer command completes at the NO edge and the round reaches
`presentingBattleStart` (battleIndex 1) through `chooseFactoryRoundSwap`
decline → `swapResolved` → `advanceAfterSwapResult`, exactly as the Tier-1 pin
asserts.

## 6. Reproducing the numbers

```sh
npm run compare -- win-go-on-swap-offer-no-off --summary  # 213/213 (new)
npm run compare -- win-go-on-swap-offer-off --summary    # 115/115 (regression)
npm run compare -- win-go-on-style-commentary-off --summary  # 92/92 (regression)
npm run compare -- win-terminal-window-off --summary     # 3590/3590 (regression)
npm run compare -- loss-terminal-window-off --summary    # 1943/1943 (regression)
npm run compare -- loss-terminal-decline-continuation-off --summary  # 155/155 (regression)
npm run compare -- battle-command-generated-off --summary  # 128/128 (regression)
```

Oracle lab runs used: `bin/oracle lab tools/battle-lab/scratch-win-go-on-swap-offer-no-probe.json`
(two fresh 213-capture dense runs, byte-identical sha256). App compare runs:
`tools/compare/out/run-2026-08-05-09-44-47Z-5638` and
`run-2026-08-05-09-45-06Z-5703` (both 213/213).

## 7. Checks

`npm run test:smoke` 347/347, full `npm test` and `npm run build` green at the
final commit (see the committing PROGRESS entry). The unexercised WIN boundaries
past this guide remain the YES branch into the swap UI and the
RECORD/REST/RETIRE continuation choices (each needs its own new fixture press);
LOSS's record playback + free-roam movement remain separate. PAPERCUT: none new.
