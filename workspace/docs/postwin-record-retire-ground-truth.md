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
  hold + `A` (6733-6734, dismiss = default NO) + re-ask settle. 35 segments
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

### 3a. CORRECTION (2026-08-06, MAIN bind) — the YES/NO window IS visible during the hold

This section's headline claim — "the RECORD/RETIRE question's YES/NO window
never visibly appears" — is an **over-generalization**. Its negative tests
only sampled AFTER the dismiss-A, and the supervisor's 2026-08-06 dense
verification (run `tools/compare/out/run-2026-08-07-02-56-49Z-58767`) found
the window **is present throughout the input-ready hold**, drawn fully-formed
in a single frame:

- **RECORD**: window first visible at canonical tick **6711** (the same frame
  the question text reaches its final glyph), present through the dismiss-A
  press frames **6722**, gone at 6723 (the box-clear transition). Window span
  = 6711-6722, 12 frames.
- **RETIRE**: window first visible at **6712**, present through **6734**, gone
  at 6735. Window span = 6712-6734, 23 frames.

Measured geometry (both branches, byte-identical): bbox **(161,65)-(206,110)**
= the same 4×4-tile std-window at tile (20,8) the Lobby record prompt uses —
`drawStandardWindowFrame(fb, 160, 64, 4, 4)` with **YES** at (176,73),
**NO** at (176,89), and the cursor **▶ at (168,89) = on NO** (the
`multichoicedefault` default 1), **1828 px/frame stable** across the whole
hold, appearing fully-formed in one frame (no 2-frame draw-in). The
during-hold diff is exactly the window region; nothing else changes.
**Teardown**: the window clears with the message box on the dismiss-A —
RECORD gone at 6723 (= box-clear transition), RETIRE gone at 6735 — so the
post-dismiss box-clear frames in §1/§2 stay byte-identical as originally
captured. §3's "no window" claim therefore holds only **post-dismiss**, and
the §5 bind plan's "No YES/NO window to draw" line is **superseded**: the
MAIN bind (commit `2f579d21`) draws the window during the hold via the shared
Lobby-record-prompt machinery, and the specs now capture it —
`postwin-record-off` **204/204**, `postwin-retire-off` **211/211** full-window
dense.

**During-hold YES reachability (2026-08-06 probe, ground truth only, no
binding):** §3's "YES unreachable" claim was also only tested post-dismiss.
Two scratch probes (`tools/battle-lab/scratch-postwin-{record,retire}-up-a-probe.json`,
verbatim prefixes + UP ~4 frames into the hold + A two frames later, dense
captures over the following ~125 frames, each twice-run byte-identical:
record 125/125, retire 125/125 manifest shas) prove:
- **UP during the hold DOES move the cursor to YES** (record: visible at
  canonical 6717; retire: at 6718).
- **A-on-YES takes a genuinely new path** per source
  (`scripts.inc:111-134`): RECORD case 0 → `EventScript_RecordBattle` →
  `call BattleFrontier_EventScript_SaveBattle` — the question box holds
  without the window through the save-SE span (6721-6741), box clears at
  6742, then **"{PLAYER}'s battle was recorded / on the FRONTIER PASS."**
  types and holds (MSGBOX_DEFAULT). RETIRE case 0 →
  `BattleFactoryBattleRoom_EventScript_WarpToLobbyLost` — fade-to-black
  (6724-6738), black hold, fade-in from 6758, Lobby arrival typing the
  **LostChallenge "Thank you for participating!"** chain (the same LOSS-ending
  flow the app already renders, `docs/factory-loss-ending-off-probe.md`).
  These are ground-truth receipts only; nothing is bound from them this slice.


## 4. RETIRE convergence with the LOSS ending (source-cited)

`case 0` of `AskRetireChallenge` jumps to
`BattleFactoryBattleRoom_EventScript_WarpToLobbyLost`
(`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:88-90`), which is the
**same script the real in-battle loss runs**: `frontier_set
FRONTIER_DATA_CHALLENGE_STATUS, CHALLENGE_STATUS_LOST` then `goto
EventScript_WarpToLobby` (`scripts.inc:222-227`) → `warp
MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY, 4, 8` + `waitstate`. That Lobby
arrival and its `LostChallenge` text chain are already byte-exact in the app
(`docs/factory-loss-ending-off-probe.md`; the modern committed specs
`loss-beyond-boundary-off` / `loss-terminal-decline-continuation-off` pin
that window — the legacy `factory-terminal-loss-off.json` fixture this
paragraph originally cited was retired with ISSUES #82 on 2026-08-06). Because §3 proves
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
  (regression) and `npm run compare -- loss-terminal-decline-continuation-off
  --summary` (RETIRE-tail regression; the legacy `compare:factory-terminal-loss`
  gate originally named here was retired with ISSUES #82 on 2026-08-06). Tier-1 pins in `tests/` should cover: cursor-move edges,
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

### §5 addendum (2026-08-06, MAIN worker): YES routes bound

The §5 "YES unreachable" premise (before §3a's correction) is superseded:
the up-a probes (banked commit 8286ba97, rerun byte-identical this session)
prove UP during the hold reaches YES and A-on-YES takes the branch routes.
A MAIN slice has bound both: `postwin-record-yes-off` **125/125** and
`postwin-retire-yes-off` **125/125** (full-window dense) via
`postwin.ts`/`core.ts`; RETIRE-YES reuses the shared WARP_FADE_OUT fade +
the existing `factoryTerminal` LOSS Lobby-arrival presentation (age = delay
+ 76). The §5 "No YES/NO window to draw" line is also superseded by §3a.

## 7. Second RECORD selection in the same postwin session (2026-08-07, SIDE scout)

**QUESTION:** what does the real game do when RECORD is selected a SECOND
time in the same postwin session? The app stubs recording behind a session
flag (user decision 2026-08-05: RECORD stub-only); a second selection showing
a menu/text variant was never probed.

**VERDICT — a measured variant, but not a text variant: after a successful
RECORD-YES, the re-asked continuation menu DROPS the RECORD entry entirely.**
The menu re-asks as the 3-option GO ON / REST / RETIRE variant
(`MULTI_GO_ON_REST_RETIRE`, at a different window position), so a second
RECORD selection is *impossible from the menu* — the option is gone. The
session flag the app stubs against is real in the ROM: it is the persistent
`FRONTIER_DATA_RECORD_DISABLED` flag that `SaveRecordBattle` sets on every
successful save.

### 7a. Source chain (every claim cited)

1. RECORD-YES route: `EventScript_AskRecordBattle`
   (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:108-115`) case 0 →
   `EventScript_RecordBattle` (`scripts.inc:117-119`) → `call
   BattleFrontier_EventScript_SaveBattle` → `goto AskReadyForOpponent`.
2. `BattleFrontier_EventScript_SaveBattle` (shared,
   `BattleFrontier_BattleTowerLobby/scripts.inc:132-137`): `frontier_savebattle`
   → on success `playse SE_SAVE` + `msgbox
   BattleFrontier_BattleTowerLobby_Text_BattleRecordedOnPass, MSGBOX_DEFAULT`
   ("{PLAYER}'s battle was recorded\non the FRONTIER PASS.",
   `BattleFrontier_BattleTowerBattleRoom/scripts.inc:472-474`) → `return`.
3. `frontier_savebattle` macro →
   `CallFrontierUtilFunc(FRONTIER_UTIL_FUNC_SAVE_BATTLE)`
   (`asm/macros/battle_frontier/frontier_util.inc:131-134`) → `SaveRecordBattle`
   (`src/frontier_util.c:2173-2177`), which runs `MoveRecordedBattleToSaveData()`
   **and unconditionally sets `gSaveBlock2Ptr->frontier.disableRecordBattle =
   TRUE`** (`frontier_util.c:2176`). This is the session flag.
4. Back in the prebattle room, `AskReadyForRegularOpponent`
   (`scripts.inc:82-98`) calls `BattleFrontier_EventScript_GetCantRecordBattle`
   (`scripts.inc:90`; reads `FRONTIER_DATA_RECORD_DISABLED` via
   `GetFrontierData`, `frontier_util.c:843-845`) and on TRUE routes to
   `EventScript_AskReadyForOpponentNoRecord` (`scripts.inc:100-106`), which
   shows `multichoice 20, 6, MULTI_GO_ON_REST_RETIRE, TRUE` — the **3-option
   menu without RECORD** (`src/data/script_menu.h:703-708`), at window
   position (20,6) instead of the 4-option (19,4).
5. The flag resets to FALSE only at the next battle start
   (`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:80` and
   `scripts.inc:171`, `frontier_set FRONTIER_DATA_RECORD_DISABLED, FALSE`), so
   within one postwin session the re-asked menu stays 3-option.
6. There is **no overwrite question, no alternate text, and no already-recorded
   branch** anywhere in the chain: `SaveBattle`/`SaveRecordBattle`/`MoveRecordedBattleToSaveData`
   (`recorded_battle.c:319-475`, single `RecordedBattleToSave` overwrite of
   `SECTOR_ID_RECORDED_BATTLE`) run the identical script every time. The
   "variant" is purely the menu-content gate at step 4.

### 7b. Staged receipts

Fixture `tools/battle-lab/scratch-postwin-record-second-selection-probe.json`
= the banked `scratch-postwin-record-up-a-probe.json` **verbatim (all 33
segments, raw segment-list equality checked)** — the §3 prefix + DOWN + A
(select RECORD) + UP + A (YES) landing on the recorded-message hold — plus a
3-segment tail: `A` (6846-6847, dismiss the recorded message), 2-frame settle,
160-frame hold. 36 segments / 7010 frames / 164 captures (6846-7009). Party
staging unchanged (GLALIE×3 / ONIX SHUCKLE MURKROW, `battleOutcome` 1,
`mainCallback2` 134766173 stable across the extension). **Twice-run
byte-identical** — the committed fixture reproduces the session's dense run
manifests for all 164 captures (run-1/run-2/committed-final: 0 sha
mismatches), the same twice-run bar §3a set for the up-a probes.

| canonical tick | span | sha256 (prefix) | what's on screen |
|---:|---|---|---|
| 6846-6849 | 4 | `4f7b83285aa7` | recorded-message hold ("…battle was recorded / on the FRONTIER PASS."), cursor waiting — the up-a probe's end state |
| 6850 | 1 | `4bf39eb6ea32` | message box cleared (the A at 6846-6847 dismisses the `msgbox` — MSGBOX_DEFAULT blocks on A) |
| 6851-6885 | 35 | `e724d159b158`→`dce1b51073` | "The 2nd match is next!\nAre you ready?" re-types (`ReadyFor2ndOpponent`) — **byte-identical glyph shas to §1's re-ask typing span (6726-6760), 35/35 frame-pairs** |
| 6886-6889 | 4 | `cf0ef6761ee7` | settled re-ask state — **byte-identical to §1's settle (6761-6764)** |
| 6890-7009 | held | `a542519b73a7` | **re-asked GO ON / REST / RETIRE menu — RECORD GONE. NOT the original `e83628935b`** |

Diff vs the original held menu (`e83628935b`, frame 6800 of the record-probe):
**exactly the menu window region** — bbox x153-222 × y33-110, 3335 differing
px confined there; every pixel outside that bbox is byte-identical (the
"2nd match" message box below is untouched). The 4-option menu has text
entries at rows 44-52 / 60-68 / 76-84 / 92-100 (GO ON / RECORD / REST /
RETIRE); the new menu has only rows 60-68 / 76-84 / 92-100 — the RECORD row
(44-52) is absent. Window geometry matches the source position shift
(4-option `multichoice 19, 4` → 3-option `multichoice 20, 6`).

### 7c. Conclusion for the app

The user-decision session flag is **load-bearing in the ROM** — it is
`frontier.disableRecordBattle`, set by every successful save and cleared only
at the next battle start. The app's RECORD stub must therefore:

- Keep the first RECORD-YES flow exactly as bound (§5/§3a): question +
  during-hold YES/NO window (§3a) + save-SE hold + "…battle was recorded on
  the FRONTIER PASS." msgbox.
- **On the re-ask after a successful RECORD-YES, switch the continuation menu
  to the 3-option GO ON / REST / RETIRE variant** (no RECORD entry), at the
  (20,6) window position — mirroring `MULTI_GO_ON_REST_RETIRE`. The re-ask's
  "2nd match is next!" reprint span and settle are byte-identical to §1, so
  the bind reuses the existing `ReadyFor2ndOpponent` machinery and only swaps
  the menu contents + position.
- RECORD stays absent for the rest of that postwin session; it returns when a
  next battle resets the flag (a fresh `battleNum`/battle start), matching the
  ROM's `scripts.inc:80` reset.
- There is **no overwrite question, no alternate "already recorded" text, and
  no second-selection branch** to build. A Tier-1 pin should assert the
  session flag disables the RECORD menu entry (and the app already has the
  input plumbing to make the option non-navigable).
