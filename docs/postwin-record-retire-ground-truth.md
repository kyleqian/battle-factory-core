# Post-WIN menu RECORD and RETIRE branches — dense oracle ground truth (Battle Scene OFF)

SIDE-LANE ground-truth packet for the held 4-choice
`GO ON / RECORD / REST / RETIRE` menu's RECORD and RETIRE branches
(`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:92-141`). RECORD is
stub-only in the app per the ISSUES #73 user decision (dialogue exact,
nothing really recorded); RETIRE is fully implemented via the loss-lobby
flow; REST is never pressed. Docs + committed battle-lab fixtures only — no
`src/`/`tests/` edits.

**Headline, ahead of the sections below**: both branches are captured
byte-identical twice-run, and the re-asked menu after each question is
**byte-identical to the original held menu** (sha `e83628935be10792…`, the
same value the committed `scratch-win-go-on-scout-probe.json` holds through
its pre-press window). The single most engine-load-bearing finding: **the
RECORD/RETIRE question's dismiss-A returns directly to the re-asked menu —
the `multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE` YES/NO window never
visibly appears in this canonical prebattle-room staging.** The dismiss-A on
the `message`+`waitmessage` question IS the A that resolves the default NO
(`multichoicedefault` default = `1`), and `AskReadyForOpponent` immediately
re-runs (`ReadyFor2ndOpponent` re-prints "The 2nd match is next!\nAre you
ready?" and the 4-choice menu redraws). The YES answer is **unreachable** via
the dismiss-A input path (UP+A immediately after the dismiss is ignored), so
the RETIRE warp handoff (YES → `WarpToLobbyLost`) cannot be captured from the
postwin menu in this staging; it is instead sourced to the shared LOSS
ending script, which the app already renders exactly
(`docs/factory-loss-ending-off-probe.md`, `docs/terminal-seam-loss-path-ground-truth.md`).

## 0. Staging method

Both fixtures are `mechanicLab` scenarios built from the committed
`tools/battle-lab/scratch-win-go-on-scout-probe.json` with **its first 25
segments (6634 frames) preserved byte-for-byte** (raw segment-list equality
checked programmatically). That prefix replays a full WIN battle and lands on
the held GO ON/RECORD/REST/RETIRE menu — the same held menu the scout packet
proved byte-identical at frames 6133-6635 (sha `e83628935be1…`). The new
tails author the cursor path, the RECORD/RETIRE selection, the question, the
dismiss, and the re-ask:

- `tools/battle-lab/scratch-postwin-record-probe.json` — prefix + `DOWN`
  (6634-6635, cursor→RECORD) + `A` (6639-6640, select RECORD) + question
  hold + `A` (6721-6722, dismiss = default NO) + re-ask settle. 31 segments
  / 7043 frames / 204 captures.
- `tools/battle-lab/scratch-postwin-retire-probe.json` — prefix + `DOWN`×3
  (cursor→RECORD→REST→RETIRE) + `A` (6649-6650, select RETIRE) + question
  hold + `A` (6733-6734, dismiss = default NO) + re-ask settle. 30 segments
  / 7055 frames / 211 captures.

Party staging is unchanged from the scout lineage (player GLALIE×3 with
SPLASH 150, opponent ONIX/SHUCKLE/MURKROW with EXPLOSION 153) — ordinary
`overrides.parties` catalog values, ROM-computed, no injected state. The
battle outcome is a WIN; `state.battleOutcome` stays `1` and
`engine.mainCallback2` stays `134766173` (the settled prebattle-room
overworld callback) for the entire extension in both fixtures.

**Twice-run byte-identical** via `bin/oracle lab`: the record fixture's
committed run reproduces the session's dense discovery run manifest for all
204 captures (0 sha mismatches); the retire fixture was run twice fresh and
both the manifest sha256s and the raw PNG file hashes match 211/211.

## 1. RECORD branch — boundary ledger

Source: `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskRecordBattle`
(`scripts.inc:108-115`) → `message Text_RecordLatestBattle` + `waitmessage`
+ `multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE` (default NO) →
`case 1` → `EventScript_AskReadyForOpponent` (re-ask).

| canonical tick | span | sha256 (prefix) | what's on screen / mechanism |
|---:|---|---|---|
| 6133-6633 | held | `e83628935b` | held GO ON/RECORD/REST/RETIRE menu, cursor GO ON — the scout's proven held boundary |
| 6634-6635 | 2 | `e83628935b` | `DOWN` press; no visual change during the press |
| 6636-6638 | 3 | `92e6a424ae` | cursor now on RECORD, menu held |
| 6639-6640 | 2 | `92e6a424ae` | `A` press selects RECORD (`scripts.inc:95` case 1) |
| 6641-6642 | 2 | `cf0ef6761e` | 4-choice window present/transitioning (menu-close visual) |
| 6643 | 1 | `4bf39eb6ea` | box cleared to blank field message box; record question's `message` re-draws the box |
| 6644-6711 | 68 | one sha per glyph | **"Would you like to record your latest / battle on your FRONTIER PASS?"** types (64 glyphs, auto-wrapped; 4 glyphs take a 2-frame repeat), first glyph 6644, **final glyph 6711** (`c4a646b52a`) |
| 6711-6720 | 10 | `c4a646b52a` | held question + 3×3 wait-cursor (down arrow) — input-ready |
| 6721-6722 | 2 | `c4a646b52a` | `A` press — **this is the default-NO answer** (`multichoicedefault` default `1`; no visible YES/NO window, see §3) |
| 6723-6724 | 2 | `646ff38681` | question still displayed (dismiss transition) |
| 6725 | 1 | `4bf39eb6ea` | box cleared |
| 6726-6760 | 35 | `e724d159b1`→`dce1b51073` | `AskReadyForOpponent` re-run: "The 2nd match is next!\nAre you ready?" re-types in the bottom box (`ReadyFor2ndOpponent`, `scripts.inc:84`) while the 4-choice menu window redraws and settles |
| 6761-6764 | 4 | `cf0ef6761e` | settled re-ask state (menu + 2nd-match message) — pixel-identical to 6641 |
| 6765-7043 | held | `e83628935b` | **re-asked GO ON/RECORD/REST/RETIRE menu, byte-identical to the original held menu** |

Exact text (`scripts.inc:619-621`): "Would you like to record your latest\nbattle on your FRONTIER PASS?" — 36 + 28 glyphs, auto-wrapped by the 28-glyph box.

## 2. RETIRE branch — boundary ledger

Source: `EventScript_AskRetireChallenge` (`scripts.inc:128-135`) →
`message Text_RetireFromChallenge` + `waitmessage` +
`multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE` → `case 1` →
`EventScript_AskReadyForOpponent` (re-ask); `case 0` → `goto
BattleFactoryBattleRoom_EventScript_WarpToLobbyLost` (the LOSS ending, §4).

| canonical tick | span | sha256 (prefix) | what's on screen / mechanism |
|---:|---|---|---|
| 6133-6633 | held | `e83628935b` | held menu, cursor GO ON |
| 6634-6635 | 2 | — | `DOWN` → cursor RECORD (visible 6636, `92e6a424ae`) |
| 6639-6640 | 2 | — | `DOWN` → cursor REST (visible 6641, `fafe4c69cf`) |
| 6644-6645 | 2 | — | `DOWN` → cursor RETIRE (visible 6646, `e89adc4494`) — cursor order GO ON→RECORD→REST→RETIRE visually confirmed |
| 6649-6650 | 2 | — | `A` selects RETIRE (`scripts.inc:97` case 3) |
| 6651-6652 | 2 | `cf0ef6761e` | 4-choice window close visual |
| 6653 | 1 | `4bf39eb6ea` | blank box; retire question's `message` re-draws |
| 6654-6712 | 59 | one sha per glyph | **"Would you like to retire from your / Battle Swap challenge?"** types (56 glyphs, auto-wrapped), first glyph 6654, **final glyph 6712** (`49f0426b65`) |
| 6712-6734 | 23 | `49f0426b65` | held question + wait-cursor — input-ready |
| 6733-6734 | 2 | — | `A` press — default-NO answer (no visible YES/NO window) |
| 6735-6736 | 2 | `7521be5016` | question still displayed (dismiss transition) |
| 6737 | 1 | `4bf39eb6ea` | box cleared |
| 6738-6772 | 35 | `e724d159b1`→`dce1b51073` | "The 2nd match is next!\nAre you ready?" re-types + 4-choice menu redraws and settles (same 35-tick span as RECORD) |
| 6773-6776 | 4 | `cf0ef6761e` | settled re-ask state |
| 6777-7055 | held | `e83628935b` | **re-asked menu, byte-identical to the original held menu** |

Exact text (`scripts.inc:488-490`): "Would you like to retire from your\nBattle Swap challenge?" — 34 + 22 glyphs.

## 3. The YES/NO window: not visible; the dismiss-A IS the default answer

The step brief assumed "then press A on the DEFAULT (NO per
multichoicedefault)"; the oracle confirms that press — but it is the **same
A that dismisses the question message**. `message` + `waitmessage`
(`scrcmd.c:1297-1315`, `waitmessage` blocks on `IsFieldMessageBoxHidden`)
holds the question until the player presses A/B; the box then clears
(RECORD: 6723-6725; RETIRE: 6735-6737) and the very next frame the flow is
already inside `AskReadyForOpponent` — "The 2nd match is next!" re-types and
the 4-choice menu redraws (RECORD: 6726-6760; RETIRE: 6738-6772). There is
**no frame with a YES/NO window** at (20,8) in either dense per-tick capture
run; every capture in the 6726-6760 / 6738-6772 spans is pixel-identical to
the corresponding 4-choice-menu + 2nd-match-message frame, and the window
region (rows 96-118, x 150-240) is byte-identical to the menu window shown
at prefix frame 5733.

Dense negative tests confirm the YES answer is unreachable through this
input path:
- A single-frame dismiss-A (6721 only, instead of 6721-6722) reproduces the
  exact same sequence (same shas from 6723 on) — no window, direct re-ask.
- An `UP` (cursor→YES) at 6736 and `A` at 6739-6740 immediately after the
  RETIRE dismiss-A produced **zero** visible change: the run's shas are
  identical to the no-input tail from 6738 onward and the re-asked menu
  still appears at 6777. The re-ask is unconditional.

**Mechanism (hypothesis, not fully attributed):** `ScriptMenu_MultichoiceWithDefault`
(`script_menu.c:53-64`) returns `FALSE` without drawing when
`FuncIsActiveTask(Task_HandleMultichoiceInput)` is TRUE. In this canonical
prebattle-room staging the record/retire `multichoicedefault` is preceded by
the 4-choice menu's own `Task_HandleMultichoiceInput` (just destroyed at the
RECORD/RETIRE selection), and `gSpecialVar_Result` still holds the 4-choice
selection value (1 for RECORD) when the skipped multichoicedefault's
`switch VAR_RESULT` runs — so `case 1` (NO) → re-ask. The 84-frame gap
between the 4-choice destruction (6641) and the multichoicedefault (6725)
does not cleanly fit a simple stale-task read, so this is flagged rather
than asserted. The load-bearing fact for the app is the observed behavior:
**dismiss-A on the record/retire question ⇒ immediate re-ask, byte-identical
menu, no YES/NO window, YES unreachable.**

**Contrast — the Lobby record prompt DOES show the YES/NO window.**
`docs/post-terminal-beyond-boundary-ground-truth.md` §2 documents the same
`multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE` in the Lobby's
`LostChallenge` chain (`BattleFrontier_BattleFactoryLobby/scripts.inc:76-85`)
holding pixel-identical from ~4198 and resolving `VAR_RESULT = 1` on the
decline-A. That context is not preceded by a multichoice menu. Any MAIN bind
must therefore reproduce the postwin behavior exactly as staged here
(dismiss ⇒ re-ask) and must NOT assume the Lobby prompt's visible window
applies to the postwin prebattle-room question.

## 4. RETIRE convergence with the LOSS ending (source-cited)

`case 0` of `AskRetireChallenge` jumps to
`BattleFactoryBattleRoom_EventScript_WarpToLobbyLost`
(`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:88-90`), which is the
**same script the real in-battle loss runs**: `frontier_set
FRONTIER_DATA_CHALLENGE_STATUS, CHALLENGE_STATUS_LOST` then `goto
EventScript_WarpToLobby` (`scripts.inc:222-227`) → `warp
MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY, 4, 8` + `waitstate`. That Lobby
arrival and its `LostChallenge` text chain are already byte-exact in the app
(`docs/factory-loss-ending-off-probe.md`; `tools/compare/fixtures/
factory-terminal-loss-off.json` pins the +1..+210 window). Because §3 proves
the postwin RETIRE YES is unreachable via the postwin menu input path, the
retire handoff's convergence evidence is **source identity** (same label,
same `CHALLENGE_STATUS_LOST` write, same single-mode lobby warp), not a fresh
pixel capture: the app's existing LOSS lobby flow already renders the RETIRE
tail.

## 5. Bind plan (what a MAIN slice maps each boundary to)

User constraints (ISSUES #73 closing): RECORD = stub-only (exact dialogue,
no persistence); RETIRE = fully implemented via the loss-lobby flow; REST =
never pressed.

- **Menu cursor path** — `postwin.ts`'s continuation menu already tracks
  `continuationCursorPos` (0..3) and the one-VBlank cursor display handoff
  (`continuationCursorMoveElapsed`). The DOWN edges at 6634-6635 (RECORD) and
  6639-6640/6644-6645 (RETIRE) are ordinary cursor moves — reuse the existing
  mechanism, no new machinery.
- **RECORD stub** — on `acceptPostwinContinuation`-style RECORD selection,
  add a record-question phase keyed to the stored selection edge:
  `message`-family typing at 1 glyph/tick from edge+5 (first glyph 6644 =
  select-edge 6639 + 5), final glyph at edge+72 (6711), dismiss-A accepted at
  edge+82 (6721), box clear edge+84..86 (6723-6725), then reuse the existing
  `ReadyFor2ndOpponent` reprint (the "2nd match" message + 4-choice redraw)
  from edge+87 (6726). The existing postwin "2nd match"/continuation clocks
  (`POSTWIN_NEXT_*`) already reproduce that reprint span — the RECORD branch
  simply re-enters them after the question dismiss. **No YES/NO window to
  draw** (per §3) — the dismiss-A resolves the default NO.
- **RETIRE** — the menu→question→dismiss→re-ask (NO) path binds exactly as
  RECORD with the RETIRE string (`scripts.inc:488-490`) and its 56-glyph
  typing span (first glyph 6654 = select-edge 6649 + 5, final 6712). The
  YES/warp path is the existing `factoryTerminal` LOSS profile: no new
  postwin branch — the retire YES is unreachable in the canonical staging
  (§3), and the app already renders the shared `WarpToLobbyLost` Lobby
  arrival.
- **Acceptance commands** (once a MAIN slice wires `tools/compare/appTrace.ts`
  to these fixtures): `npm run compare -- postwin-record-off --summary` and
  `npm run compare -- postwin-retire-off --summary` (both full-window,
  dense per-tick), plus `npm run compare -- win-go-on-scout-off --summary`
  (regression) and `npm run compare:factory-terminal-loss` (RETIRE-tail
  regression). Tier-1 pins in `tests/` should cover: cursor-move edges,
  the dismiss-A ⇒ re-ask boundary (early dismiss-A swallowed, the re-ask's
  "2nd match" reprint + byte-identical menu), and the YES-unreachable
  negative (UP+A after dismiss has no effect).

## 6. Verification

Both fixtures twice-run byte-identical via `bin/oracle lab` (record:
committed run vs discovery run, 204/204 manifest shas; retire: two fresh
runs, 211/211 manifest shas AND 211/211 raw-PNG hashes). Prefix preservation
checked programmatically (`fixture.segments[:25] ==
scratch-win-go-on-scout-probe.segments[:25]`, raw segment-list equality).
Re-ask byte-identity checked by direct sha comparison against the original
held menu (`e83628935be10792…`). RNG/`mainCallback2`/`battleOutcome` stable
across both extensions (`battleOutcome` 1, `mainCallback2` 134766173, one
LCG-per-VBlank outside-battle ownership — no new burst). New files only:
the two `tools/battle-lab/` fixtures and this doc. No `src/`, `tests/`,
`PROGRESS.md`, or `ISSUES.md` edits.
