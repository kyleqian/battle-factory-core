# Torment selection-rejection ground truth (ISSUES #81)

Ground-truth receipt for ISSUES #81: in live play, reselecting a Tormented
move shows no indication until you press A — then the ROM prints
`STRINGID_PKMNCANTUSEMOVETORMENT` and holds it **indefinitely** (no
auto-advance) until a button press, then reopens the move menu ~9-10 frames
later, byte-identical to the pre-rejection menu. This doc banks the real
game's schedule frame-by-frame under **Battle Scene OFF** (mechanicLab,
`overrides.parties`), attributes every boundary to its source mechanism, and
names the exact seams a MAIN bind step can consume without re-deriving
anything.

This is the missing half of ISSUES #72: the pure rejection subsystem is
already landed and oracle-verified (see
`docs/probes/selection-rejection-oracle-verification/README.md` for the
NOPPLEFT + ITEMALLOWSONLYYMOVE siblings), but the **live message flow** — the
button-gated hold and the byte-identical reopen — was only ever recorded as a
note in ISSUES #72 ("holds indefinitely, tested 100+ frames, reopens ~10-14
frames later"). That first Torment probe's trace/PNGs were never banked to
disk. This step reproduces that staging, measures the timing precisely, and
banks the trace + receipts + this doc.

Measurement receipt: the banked fixture was run **twice fresh** and the two
runs are **byte-identical**: **152/152 PNG `sha256`s equal** and all semantic
state equal. The schedule below is deterministic for this staged trace.

**Fixture:** `tools/battle-lab/mechanic-selection-reject-torment-off.json`
(committed, `profile: "battle-scene-off"`, seed 1).
**B-press variant:** `tools/battle-lab/scratch-selection-reject-torment-bpress-off.json`
— identical staging, B instead of A at the dismiss point.
**Text verifier:** `tools/probe/verify-torment-rejection-message.ts`
(renders the expected two lines with the app's FONT_NORMAL glyphs and diffs
against an oracle capture; the message box matches to 14/38400 px on a
fully-typed frame and 51/38400 px on a hold frame — the residual is the
blinking ▼ PAUSE_UNTIL_PRESS cursor plus one 14 px shadow-glyph nuance).

---

## 1. Staged scenario

`mechanicLab` OFF trace, `overrides.parties`, seed 1. Player leads
**BUTTERFREE (species 12)** with `[TACKLE(33), GUST(16), 0, 0]`; opponent
leads **MURKROW (species 198)** with `[TORMENT(259) ×4]` — the
constrain-to-one-legal-choice idiom (`tests/murkrowTormentSubjectedPresentationRepro.test.ts`
uses the same MURKROW/four-slot-TORMENT shape). The frontier-mons record for
MURKROW is **`FRONTIER_MON_MURKROW_1` (index 184)** in
`src/data/gen/battle-frontier-mons.json` (`FAINT_ATTACK/FLY/TORMENT/TAUNT`,
LAX_INCENSE) — the same legal TORMENT carrier the scout §1.4 lists as
**REACHABLE** at Factory L50.

MURKROW's 91 base speed outruns BUTTERFREE's 70, so on turn 1 the opponent
uses TORMENT first (`status2` player = `0x80000000` = `STATUS2_TORMENT` at
frame 100, manifest-confirmed), then the player uses TACKLE — which becomes
the banned "last move" (`gLastMoves[0] = TACKLE`). Turn 2, the player opens
FIGHT and presses A on slot 0 (TACKLE): `TrySetCantSelectMoveBattleScript`
(`battle_util.c:999`) flags `move == gLastMoves[0] && STATUS2_TORMENT` →
`BattleScript_SelectingTormentedMove` (`battle_scripts_1.s:3563-3565`) →
`printselectionstring STRINGID_PKMNCANTUSEMOVETORMENT`.

Input recipe (frames 0-733 turn 1, 734+ turn 2):
`A(2f), idle 30f, A(2f)` (fight menu → move 1), idle 700f (turn 1 resolves:
TORMENT lands, TACKLE used), then `A(2f), idle 30f, A(2f)` (open FIGHT →
press A on the banned TACKLE slot 0 → rejection message), idle 200f (hold),
`A(2f)` (dismiss), idle 40f (menu reopens), then `RIGHT(2f), idle 30f, A(2f)`
(select the legal GUST) + idle 300f (turn 2 resolves).

Frame numbers below are battle-lab trace frames (frame 0 = post-checkpoint,
the action menu is already open).

## 2. Dense schedule (Battle Scene OFF, deterministic)

| Frame | Event | Mechanism (file:line) |
| ---: | --- | --- |
| 0-733 | Turn 1: player commits TACKLE; opponent TORMENT lands on player. | `CONTROLLER_CHOOSEACTION`/`CHOOSEMOVE`; player `status2` becomes `0x80000000` at frame 100 (manifest). |
| 734 | Fight menu open (input-ready), turn 2. | `PlayerHandleActionSelection`, `battle_controller_player.c:198-306`. |
| 734-765 | `A` (734-735) opens the move menu; cursor sits on slot 0 (TACKLE). Menu idle frames 760-765 byte-identical to each other. | `PlayerHandleChooseMove`, `battle_controller_player.c:2665-2688`. |
| **766-767** | **`A` presses slot 0 (TACKLE) → rejection path begins.** | `PlayerHandleChooseMove` select → `TrySetCantSelectMoveBattleScript` (`battle_util.c:999`), `battle_main.c:4382`. |
| 769 | Player controller → `CONTROLLER_PRINTSTRINGPLAYERONLY` (id 17); box not yet drawn (pixels unchanged 766-768). | `printselectionstring` (`battle_script_commands.c:2148-2157`) → `PlayerHandlePrintSelectionString` (`:2557-2563`). |
| **770** | **First glyph (`B` of "BUTTERFREE…") + message box drawn (23716 px change).** | `PlayerHandlePrintString` (`:2543-2555`) draws into `B_WIN_MSG`; typing at Options FAST = **1 glyph/frame** (`sTextSpeedFrameDelays`, `menu.c:77-82`). |
| 770-798 | Line 1 **"BUTTERFREE can't use the same"** types, 29 glyphs @ 1/frame. | — |
| 799-831 | Line 2 **"move in a row due to the TORMENT!"** types, 33 glyphs @ 1/frame. | — |
| **831** | **Last glyph (`!`) lands.** Full text on screen. | — |
| 832 | Stable (text region unchanged). | — |
| **833** | **▼ down-arrow first appears** (PAUSE_UNTIL_PRESS cursor, 42 px in the arrow cell 189-195×143-148). | `\p` control code in `sText_PkmnCantUseMoveTorment` (`battle_message.c:260`) → `TextPrinterWaitWithDownArrow` (`text.c:865-882`) → `JOY_NEW(A_BUTTON | B_BUTTON)` gate. |
| **833-977** | **HOLD — no auto-advance.** Last glyph at 831; box content byte-stable until the dismissal redraw at 978 (147 frames), changing only in the blinking ▼ (~10-15f cycle, 31 px cells). `playerControllerCommand` stays 17 the whole window. | `CompleteOnInactiveTextPrinter2` (`battle_controller_player.c:1339-1343`) waits for `!IsTextPrinterActive(B_WIN_MSG)`; the `\p` keeps the printer active until a button. |
| **968-969** | **`A` press dismisses.** | `JOY_NEW(A_BUTTON | B_BUTTON)` (`text.c:875`) → printer completes → `PlayerBufferExecCompleted`. |
| 970-973 | Message box still on screen, pixels unchanged from 968. `plyCmd` still 17. | Controller completing. |
| **974** | Player controller → `CONTROLLER_CHOOSEMOVE` (id 20) again; pixels still unchanged (box still shown). | `endselectionscript` (`:3999-4002`) → `stateIdAfterSelScript = STATE_WAIT_ACTION_CHOSEN` → **re-emits `BtlController_EmitChooseMove`** (scout §1.1). |
| **978** | **Move menu fully redrawn — byte-identical to the pre-rejection menu** (frame 978 sha == frame 765 sha; 978-986 all `6fe39552…`, the same sha as 760-765). | `PlayerHandleChooseMove` re-draws the same 4-slot menu. |
| 978-986 | Reopened menu stable, byte-identical to pre-rejection (whole-screen sha equal). | — |
| 987-995 | Menu shows the A-press highlight state (sha `302b6c1a…`, same as frames 766-768 pre-press) — i.e. the reopened menu is the ordinary live move menu. | — |
| 1010-1011 | `RIGHT` → cursor to slot 1 (GUST). | — |
| 1042-1043 | `A` selects GUST → turn 2 resolves; GUST used (player PP 35→34 at frame 1300, `currentMove` 16), MURKROW HP 119→92. **Menu is live, not a frozen frame.** | normal turn execution. |

**Reopen delay pinned:** from the dismissal A press (968-969) to the fully
redrawn menu (978) is **9-10 frames** — 10 frames after the press *starts*
(968→978), 9 after it *ends* (969→978). The ISSUES #72 note's "~10-14
frames" is refined to its real value: **10 frames (press-start-relative)**.
The message-box visual hold is **833→977 = 145 frames** from the ▼ first
appearing (831→978 = 147 frames from the last glyph to the redraw), with no
auto-advance anywhere in that window.

## 3. The text (resolver match)

**Resolver output** (already Tier-1 pinned in
`tests/battleScriptSelectionRejection.test.ts:432-442`):
```
BUTTERFREE can't use the same
move in a row due to the TORMENT!
```
**Source string** `sText_PkmnCantUseMoveTorment`
(`reference/pokeemerald/src/battle_message.c:260`):
```
{B_ACTIVE_NAME_WITH_PREFIX} can't use the same\nmove in a row due to the TORMENT!\p
```
(`{B_ACTIVE_NAME_WITH_PREFIX}` → `BUTTERFREE` for the player's own mon; the
rejected move name never appears in the text — only Torment's siblings do.)

**Oracle match:** rendered with the app's extracted FONT_NORMAL glyphs and
diffed against oracle frames (via `tools/probe/verify-torment-rejection-message.ts`):
- frame 831 (fully typed, pre-arrow): **14/38400 px differ** — a single
  14 px shadow-glyph nuance at the `a` of "can't" (x 97-99, y 122-126); every
  white glyph pixel is byte-identical.
- frames 833-967 (hold): **51/38400 px differ** = the same 14 px nuance +
  the 37 px blinking ▼ cursor. No other pixel differs.

So the live message is byte-for-byte the resolver text. **Verdict: MATCH, no
src change needed** — the pure resolution is already correct; only the live
message phase (below) is missing in the app.

## 4. The hold mechanism (why the scout's "no hold" reading was wrong)

`docs/selection-rejection-subsystem-scout.md` §1.2 read
`CompleteOnInactiveTextPrinter2` (`battle_controller_player.c:1339-1343`) as
"waits only for `!IsTextPrinterActive` → no button-press dismissal, no extra
hold". That is **wrong for the live ROM**: all four selection-rejection
message templates end in **`\p`** (`EXT_CTRL_CODE_PAUSE_UNTIL_PRESS`):

- `sText_PkmnCantUseMoveTorment` (`battle_message.c:260`) — `…TORMENT!\p`
- `sText_NoPPLeft` (`:360`) — `…move!\p`
- `sText_ItemAllowsOnlyYMove` (`:496`) — `…{B_CURRENT_MOVE}!\p`
- `sText_PkmnMoveIsDisabled` (`:259`) / `sText_PkmnCantUseMoveTaunt` (`:261`) — `…\p`

The `\p` keeps the `B_WIN_MSG` text printer **active** (paused at the
down-arrow, `text.c:865-882`) until `JOY_NEW(A_BUTTON | B_BUTTON)`, so
`IsTextPrinterActive(B_WIN_MSG)` stays TRUE and `CompleteOnInactiveTextPrinter2`
never fires early. The engine then moves to re-showing the move menu only
after the press. That is exactly the ISSUES #81 live-play symptom: **no
indication until you press A**, and the app's current fight-menu flow (which
never enters a message phase for a rejected slot) has nothing to compare.

## 5. B-press dismissal

`text.c:875` gates the `\p` release on `JOY_NEW(A_BUTTON | B_BUTTON)` — **B
dismisses identically**. Verified with
`tools/battle-lab/scratch-selection-reject-torment-bpress-off.json` (same
staging, `B(2f)` at the 968-969 point): the reopened menu at 978 is the same
sha `6fe39552…` as the A-press run and the pre-rejection menu. The dismissal
edge (box holds 968-977, controller flips to CHOOSEMOVE at 974, menu redrawn
at 978) is identical. A single fixture is therefore enough for the bind; the
B variant is a free consequence of the shared `\p` gate.

## 6. Bind plan (for a MAIN worker)

The pure rejection subsystem is done and byte-verified against this trace;
what the app still lacks is the **live message phase** in the fight-menu flow.
`rejectionReasonBySlot` is already exposed for presentation
(`battleCommandPresentation.ts:132` advisory doc; the slot-grey path exists).
The bind adds the message-box phase:

1. **When the fight menu commits a slot whose `rejectionReasonBySlot[slot]`
   is non-null** (i.e. `describeIllegalMoveSelection` returned a `tormented`
   cause, `battleScriptActionAdmission.ts:2680-2684`), do **not** submit the
   decision — instead enter a message phase rendering
   `resolveMoveSelectionRejectionMessageLines`'s two lines
   (`battleResolutionPresentation.ts:656-690`, `STRINGID_PKMNCANTUSEMOVETORMENT`
   branch already resolves the exact text) with:
   - typing **1 glyph/frame** for 29 + 33 glyphs,
   - then a **button-gated hold** (the `\p`): the box persists until A/B
     (no auto-advance, no time-out) — implement as a wait-for-input state,
   - then reopen the move menu with the **same** menu state (cursor
     preserved on the rejected slot), matching the byte-identical reopen.
2. **Do NOT grey out or remove the Tormented slot from the live menu.** The
   real ROM keeps TACKLE selectable and shows the message only on commit.
   This is the ISSUES #81 defect: the app currently pre-filters illegal slots
   out of `legalDecisions` entirely (scout §2.1), so there is no in-band path
   that even produces this message. The bind must add an
   advisory/selection-time commit path for an illegal slot (the scout's
   option (a) `reject-at-submit` is the closest existing shape).
3. **Timing contract to match** (all frame-relative to the commit A press,
   which lands on the press frame): first glyph +3f, typing to +62f, ▼ at
   +65f, hold from +65f until dismiss, dismiss→reopened-menu = +10f
   (press-start-relative). See the schedule table §2 for the trace-absolute
   numbers.

### Acceptance bar

- **Tier-1:** a pure reducer/component test feeding a tormented-slot commit
  into the new message phase and asserting: two-line text
  (`["BUTTERFREE can't use the same", "move in a row due to the TORMENT!"]`),
  button-gated hold (no auto-advance before an A/B event), and a reopen that
  re-presents the identical menu state.
- **Oracle:** replay
  `tools/battle-lab/mechanic-selection-reject-torment-off.json` and require,
  per §2: first glyph at frame 770, line-1 end 798, line-2 end 831, ▼ at 833,
  no box change across the 833-967 hold, box clears and menu redraws to the
  pre-rejection byte-identical state by 978, and GUST selectable afterwards
  (turn resolves with `currentMove` 16, player PP 35→34). Run it **twice
  fresh** and require **152/152 sha-identical** (this step's own determinism
  receipt).
- **Full suite + build:** `npm test` and `npm run build` green at the commit.

## Out of scope / notes

- The other three rejection causes are already banked (NOPPLEFT +
  ITEMALLOWSONLYYMOVE, `docs/probes/selection-rejection-oracle-verification/`);
  `PKMNHASNOMOVESLEFT` remains deliberately unattempted (per ISSUES #72 — all
  four slots at 0 PP simultaneously; staging cost documented in the sibling
  probe README). This step does not attempt it either.
- Imprison (`STRINGID_PKMNCANTUSEMOVESEALED`) stays DEAD at Factory L50
  (sole carrier RALTS is below the draft floor; scout §1.4).
- The `\p` gate is shared by the whole selection-rejection family; the bind
  for Torment automatically covers the sibling causes' holds (same
  `CompleteOnInactiveTextPrinter2` + `\p` path), but their exact reopen
  timing should be re-confirmed per cause when bound.
- Determinism: two fresh runs of the committed fixture are byte-identical
  (152/152 sha + full semantic state). The B-press variant run is
  byte-identical at every shared capture frame (checked 765 and 978 sha
  against the A-press run).
