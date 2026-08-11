# Rent-flow notes (S5 scouting)

Implementation dossier for completing the Battle Factory draft: RENT picks
1-3, deselection, the final confirmation, and the exit sequence into
`BattleFrontier_BattleFactoryPreBattleRoom`. Scouting only — no engine code.
Sources: `reference/pokeemerald/src/battle_factory_screen.c` (draft UI/task
state machine), `reference/pokeemerald/src/battle_factory.c` (RNG-bearing
generation), `reference/pokeemerald/src/strings.c` (text data),
`reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`
and `reference/pokeemerald/asm/macros/battle_frontier/battle_factory.inc`
(the field script that drives everything around the draft). All line numbers
below refer to those files unless stated otherwise.

## Correction to the brief's premises (read this first)

Two things the brief's phrasing implied do **not** exist in the actual code —
confirmed by grepping the full string table, not assumed:

- **There is no per-pick "Do you want to rent this POKéMON?" yes/no
  confirmation.** Selecting RENT is immediate:
  `Select_OptionRentDeselect` (:1949-1970) marks the mon selected and returns
  straight to the ball-picking state (or to the final confirm on the 3rd
  pick) with no intermediate dialog. The **only** yes/no prompt anywhere in
  this flow is the final "Are these three POKéMON OK?" one
  (`gText_TheseThreePkmnOkay`, `strings.c:1620`), driven by
  `Select_Task_HandleYesNo` (:1525-1583). (`grep -rn "want to rent"` across
  `reference/pokeemerald/{src,include}` returns nothing — that string does
  not exist in this game.)
- **OTHERS is not a submenu and has no DESELECT option.** `Select_OptionOthers`
  (:1989-1994) just closes the mon-pic and erases the popup, returning
  `SELECT_CONTINUE_CHOOSING` — **behaviorally identical to pressing B** from
  the popup menu (:1631-1639: same `CloseMonPic` +
  `Select_ErasePopupMenu(SELECT_WIN_OPTIONS)` + back to ball-picking). It is
  simply a third way to back out of the current ball's popup without acting
  on it. The **DESELECT** option is a completely different, context-sensitive
  label the popup's *2nd row* takes when the currently-cursored ball is
  already rented (`Select_PrintMenuOptions`, :1918-1932: prints "RENT" if
  `selectedId == 0`, "DESELECT" otherwise) — RENT and DESELECT are the *same*
  menu slot and the *same* handler function
  (`Select_OptionRentDeselect`/`sSelect_MenuOptionFuncs[1]`, array at
  :302-307), not two different options under an OTHERS submenu.

## 1. The RENT/DESELECT/OTHERS flow

### Popup menu structure
Pressing A on a ball (`Select_Task_HandleChooseMons` → `STATE_MENU_INIT`,
:1671-1719, :1586-1602) opens a 3-row popup (`SELECT_WIN_OPTIONS`) built by
`Select_ShowMenuOptions`/`Select_PrintMenuOptions` (:1832-1846, :1918-1932):
row 0 **SUMMARY** (`gText_Summary`, handler `Select_OptionSummary` :1984-1987,
returns `SELECT_SUMMARY` unconditionally — routes to S4's summary-screen
entry), row 1 **RENT**/**DESELECT** (context-sensitive label, handler
`Select_OptionRentDeselect`), row 2 **OTHERS** (`gText_Others2`, handler
`Select_OptionOthers`). The dispatch table is
`sSelect_MenuOptionFuncs[] = {Select_OptionSummary, Select_OptionRentDeselect,
Select_OptionOthers}` (:302-307), indexed by `menuCursorPos`
(UP/DOWN in `STATE_MENU_HANDLE_INPUT`, :1640-1649).

### RENT (`selectedId == 0` on the cursored ball)
`Select_OptionRentDeselect` (:1949-1970): if the same species is already
rented elsewhere (`!Select_AreSpeciesValid(monId)`, :2255-2275 — scans all
currently-selected balls' species against `gFacilityTrainerMons[monId]
.species`), prints **"Can't select same {PKMN}."** (`gText_CantSelectSamePkmn`,
`strings.c:1623`) into the info window and returns `SELECT_INVALID_MON`
(→ `STATE_CHOOSE_MONS_INVALID`, :1708-1717 — next A closes the mon pic and
re-shows the normal select-string). Otherwise: `CloseMonPic`,
`Select_HandleMonSelectionChange()` (below), `Select_PrintSelectMonString()`
(next pick's message), `Select_ErasePopupMenu`, then returns
`SELECT_CONFIRM_MONS` if this was the 3rd successful pick
(`selectingMonsState > FRONTIER_PARTY_SIZE`, `FRONTIER_PARTY_SIZE = 3`,
`include/constants/global.h:35`) else `SELECT_CONTINUE_CHOOSING`.

**Ball palette change** (`Select_HandleMonSelectionChange`, :1411-1442): on
select, `gSprites[...ballSpriteId].oam.paletteNum =
IndexOfSpritePaletteTag(PALTAG_BALL_SELECTED)` — swapped **immediately**,
same tick as the RENT confirm, no animation/fade on the swap itself (the
sprite's own idle-animation callback, `SpriteCB_Pokeball` below, is what
produces the "hop" that follows). `Select_SetBallSpritePaletteNum` (:1444-1454)
does the equivalent one-shot lookup when balls are (re)created (draft entry).

**Selection numbering / message variants**: `selectingMonsState` (init `1`,
:1298) is both "which pick we're on" and the value stamped into
`mons[cursorPos].selectedId` on select, then incremented. `Select_PrintSelectMonString`
(:1893-1909) reads it: `1`→`gText_SelectFirstPkmn` ("Select the first
POKéMON."), `2`→`gText_SelectSecondPkmn`, `3`→`gText_SelectThirdPkmn`,
anything else (i.e. `4`, reached right after the 3rd pick)→
`gText_TheseThreePkmnOkay` — **this 4th string is only ever actually shown
via the popup path in the split-second before the task switches to
`Select_Task_HandleYesNo`**, since `Select_OptionRentDeselect` prints it via
this same call right before returning `SELECT_CONFIRM_MONS`.

### DESELECT (`selectedId != 0`)
Same function, same call, opposite branch of `Select_HandleMonSelectionChange`
(:1415-1433): palette → `PALTAG_BALL_GRAY`, `mons[cursorPos].selectedId = 0`,
`selectingMonsState--`. **Renumbering special case**: if you deselect the
*first*-picked mon (`selectedId == 1`) while exactly two are currently picked
(`selectingMonsState == FRONTIER_PARTY_SIZE`, i.e. `== 3`), the code finds
whichever mon currently holds `selectedId == FRONTIER_PARTY_SIZE - 1` (`== 2`,
the 2nd pick) and renumbers it to `1` (:1418-1430) — keeping the remaining
picks contiguously numbered from 1. Deselecting the *later* pick in a
2-selected state, or deselecting while only 1 is selected, needs no
renumbering (only one mon remains either way). This path cannot be reached
with all 3 already locked in through normal front-door navigation (see the
NO/B-decline behavior below, which is the only way to shed a 3rd pick, and it
always targets the specific mon that was just confirmed).

### A on an already-rented ball
Opens the identical popup, just with row 1 relabeled DESELECT
(`Select_PrintMenuOptions`, :1925-1928) — there is no special-cased "already
rented" branch or warning; it's the same `STATE_MENU_INIT` → popup flow as
any other ball.

## 2. Completion sequence: 3rd pick → exit → pre-battle room

### Final confirmation
3rd successful RENT returns `SELECT_CONFIRM_MONS` (:1965-1966), which drives
`Select_Task_HandleMenu` (:1615-1619) to switch to `Select_Task_HandleYesNo`
at `STATE_YESNO_SHOW_MONS` (:1525-1583):
- **`STATE_YESNO_SHOW_MONS`**: `Select_ShowChosenMons()` (:2219-2230) spawns 3
  ball-opening background sprites (positions x=44/120/196) with
  `SpriteCB_OpenChosenMonPics` driving the reveal animation on the middle one
  and sets `monPicAnimating = TRUE`. The whole task self-gates on this flag
  at the top of `Select_Task_HandleYesNo` (`if (monPicAnimating == TRUE)
  return;`, :1527-1528) — **so the popup literally cannot progress to
  showing YES/NO until the reveal animation finishes**; a premature button
  press during the reveal is silently dropped (states before
  `STATE_YESNO_HANDLE_INPUT` never read input at all). Oracle-confirmed this
  window is short (~15 frames, see §4) but real.
- **`STATE_YESNO_SHOW_OPTIONS`**: `Select_ShowYesNoOptions()` (:1848-1861)
  shows the YES/NO popup, cursor defaults to YES (index 0).
- **`STATE_YESNO_HANDLE_INPUT`** (:1540-1581): **A on YES** (`yesNoCursorPos
  == 0`) → `Select_HideChosenMons()`, switch to `Select_Task_Exit` at state 0.
  **A on NO, or B** → `Select_ErasePopupMenu(SELECT_WIN_YES_NO)`,
  `Select_DeclineChosenMons()` (:1972-1982), `fadeSpeciesNameActive = TRUE`,
  back to `Select_Task_HandleChooseMons` at `STATE_CHOOSE_MONS_HANDLE_INPUT`.
  **`Select_DeclineChosenMons` does not wipe all 3 picks** — it calls
  `Select_HandleMonSelectionChange()` on `sFactorySelectScreen->cursorPos`,
  which is still sitting on the *3rd-picked* ball (nothing moved the cursor
  since that pick), so it deselects **only that one**: ball palette back to
  gray, `selectedId = 0`, `selectingMonsState` `4 → 3`. `Select_PrintSelectMonString`
  then reads `selectingMonsState == 3` and reprints **"Select the third
  POKéMON."** — declining returns you to re-picking the 3rd slot with picks
  1-2 still locked in, not a full restart. UP/DOWN in this state move the
  YES/NO cursor (`Select_UpdateYesNoCursorPosition`, repeat-rate).

### Exit (`Select_Task_Exit`, :1495-1522)
Two-state task, gated the same way on `monPicAnimating`:
- **state 0**: `BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK)`
  (delay 0, fade to black over Y 0→16) — this is a *second*, independent
  fade from the draft screen's own entry fade; nothing here reuses S4's
  return-path blend-state mechanism.
- **state 1** (once `!gPaletteFade.active`): `Select_CopyMonsToPlayerParty()`
  (:1810-1830 — copies the 3 selected `monData` into `gPlayerParty[0..2]` in
  pick order via `selectedId`, writes `gSaveBlock2Ptr->frontier.rentalMons[i]`
  `.monId`/`.personality`/`.abilityNum`/`.ivs`, `CalculatePlayerPartyCount()`),
  destroys the species-name-fade task, destroys all draft sprites, frees the
  4 tileset/tilemap buffers, `FreeAllWindowBuffers()`, then
  **`SetMainCallback2(CB2_ReturnToFieldContinueScript)`** — hands control
  back to the field script engine, resuming exactly where it left off.

### What the field script does around this (the part the brief expected to
find "in" the pre-battle room actually happens **before** the draft opens)
`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`'s `EventScript_EnterRoom`
(:23-42) runs once, on first entry into the room (gated by `VAR_TEMP_0`):
attendant+player walk in, **`factory_generaterentalmons`** (→
`GenerateInitialRentalMons`, the 6 draft candidates) then
**`factory_generateopponentmons`** (→ `GenerateOpponentMons`, this
challenge-stage's opponent trainer + team) run back-to-back, then the
opponent-type/style scouting comments (`CommentOnOpponentType`/
`CommentOnOpponentStyle`, :207-347 — one `msgbox` per type/style, `call`ed so
each returns), then `msgbox HoldMonsChooseFromSelection` ("First, we will
hold your POKéMON for safekeeping.\pYou may then choose from our selection of
POKéMON.", :450-454), **`fadescreen FADE_TO_BLACK`**, `factory_setswapped`,
**`factory_rentmons`** (→ `DoBattleFactorySelectScreen`, the draft screen
itself), `waitstate`. **This whole preamble — including opponent generation —
is baked into every trace's frame 0 via the pinned anchor bootstrap**
(`bin/oracle info`'s `bootstrap.description` explicitly lists "the
attendant's opponent-scouting comments (2 pages) and rental briefing (2
pages), then the fade into the rental-mon draft screen" as pre-anchor); it is
**not** part of S5's on-screen scope, and per §3 below it's also where all
the RNG for opponent identity happens, entirely outside the S5 trace window.

Once `Select_Task_Exit` hands back via `CB2_ReturnToFieldContinueScript`, the
script resumes immediately after `factory_rentmons`/`waitstate`, at
**`EventScript_EnterBattleRoom`** (:43-52): `msgbox
BattleFrontier_BattleFactoryPreBattleRoom_Text_RightThisWay` ("Right this
way, please!$", single page, :612-613), `closemessage`, then a level-mode
`call_if_eq` to one of two movement pairs (`WalkToBattleRoomLv50`/
`WalkToBattleRoomLvOpen`, :378-386 — attendant leads, player follows, both
walk left-or-right then up then the attendant `set_invisible`s), then
**`warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM, 6, 11`**, `waitstate`,
`end`. **This warp is S6's boundary** — "Right this way, please!" fully
printed and sitting idle (waiting on player A to advance, confirmed
oracle-side, §4) is the last S5-owned state; the movement + warp + whatever
`BattleFrontier_BattleFactoryBattleRoom`'s own on-warp script does next is
S6 territory.

## 3. RNG relevance

Two, and only two, `Random()`-bearing code paths touch this flow at all
(exhaustive grep of `battle_factory_screen.c` and `battle_factory.c` for
`Random(`):

1. **`GetFactoryMonId`** (`battle_factory.c:829-866`, one `Random() %
   numMons` per call) — used by both `GenerateInitialRentalMons` (the 6 draft
   candidates, `battle_factory.c:509-601`, one `GetFactoryMonId` call per
   candidate plus retries on species/held-item collisions) and
   `GenerateOpponentMons` (`battle_factory.c:303-377`, ditto per opponent
   mon, retries on Unown/duplicate-vs-player-rentals/duplicate-species/
   duplicate-item). `GenerateOpponentMons` also rolls the opponent trainer ID
   itself via `GetRandomScaledFrontierTrainerId` (`battle_factory.c:319`,
   itself `Random() % range` in `battle_tower.c:1104-1129`, with a repeat-
   avoidance retry loop at `battle_factory.c:316-325`). **Both calls happen
   in the field script before `factory_rentmons`/`DoBattleFactorySelectScreen`
   ever runs** (§2) — i.e. **before the draft screen opens, and in this
   repo's traces, before frame 0 of the anchor**. Opponent identity/team is
   therefore fully determined pre-anchor; S5's own trace window does not
   touch this RNG path at all. This directly matches the roadmap's S6 note
   that "frontier battles do NOT advance RNG per frame" for the opponent-gen
   step specifically — it's a one-shot burst, already resolved by the time
   any player-visible S5 interaction starts.
2. **`SpriteCB_Pokeball`** (`battle_factory_screen.c:1059-1090`, one `Random()
   % 5 == 0` roll) — **this one is live and continuous during the draft
   itself.** It's the sprite callback for every ball (`sSpriteTemplate_Select_Pokeball`,
   :579-587), running every frame via `AnimateSprites()` in `CB2_SelectScreen`
   (:1092-1099) for as long as any ball sprite exists on screen. For a ball
   whose palette is currently `PALTAG_BALL_SELECTED` (i.e. **rented**): once
   its current anim finishes (`animEnded`) and its own 32-frame cooldown
   counter (`data[0]`, reset to 32 each time the roll succeeds) has ticked to
   0, it rolls `Random() % 5 == 0` to decide whether to replay the "rock"
   animation (on success) or a quieter idle anim (on failure) — **either way
   this consumes exactly one `Random()` call**. Unselected (gray) balls take
   the `else` branch (:1085-1088) and never call `Random()`. **Practical
   consequence: from the moment pick 1 is confirmed, the shared RNG stream
   advances by one extra call roughly every 32+ frames per currently-rented
   ball, independent of and interleaved with any per-frame VBlank advance**
   — this needs to be modeled exactly (including the multi-ball case, once 2
   or 3 balls are rented) for any RNG-sensitive divergence check downstream
   in the challenge to stay exact, since it's the *only* source of
   mid-screen nondeterminism-by-appearance in the entire S5 window.

No other `Random()` call sites exist in either file's relevant code (the
lone hit in `frontier_util.c:2524` is unrelated Battle Dome bracket logic).

## 4. Oracle-probed happy-path timings

Traces run against the shared anchor (Lv-50 singles draft open, cursor slot
1, rental pool ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA — `bin/oracle
info`). Scratch captures under `/tmp/s5-scout/` (not committed, per
instructions). All frame numbers are **absolute trace frames** from a single
consistent button script: rent slot 1 (`A` open, `DOWN` to RENT row, `A`
confirm), `RIGHT` to slot 2 + same rent sequence, `RIGHT` to slot 3 + same
rent sequence, then `A` on the final YES/NO confirm. "Press tick" = the first
of each 2-frame button pulse (this repo's existing trace convention).

**Picks 1-3** (dense/sparse hybrid, `/tmp/s5-scout/rent3-sparse-out/`):
- Pick 1: ball-popup opened at press-tick **2**; RENT confirmed (`DOWN`+`A`)
  at press-tick **42**. Pick 2: popup opened at press-tick **82** (after
  `RIGHT` at 74); RENT confirmed at press-tick **122**. Pick 3: popup opened
  at press-tick **162** (after `RIGHT` at 154); RENT confirmed at press-tick
  **202**. (These are the script's own scheduled press ticks, not
  independently re-derived from pixel changes — see Risk 1 below for why a
  clean "settle frame" per pick could not be isolated this session.)
- Ball palette swap to `PALTAG_BALL_SELECTED` and the info-window message
  swap (`"Select the Nth POKéMON."` → next N) both take effect on/immediately
  after each RENT confirm's press tick — no multi-frame delay observed
  before *some* visible change, but see Risk 1: continuous churn from the
  idle animations (species-name breathe, ball-rock, §3's `Random()` path)
  means the *specific* palette-swap frame could not be cleanly isolated from
  the surrounding noise with sparse (every-3rd-frame) sampling.

**Final confirm → exit → pre-battle room** (dense, every frame,
`/tmp/s5-scout/rent3-dense-exit-out/`, all frames relative to the same script
— 3rd RENT confirm press tick = **202**, YES press tick = **264**):
- 3rd RENT confirm (press-tick 202) immediately shows **"Are these three
  POKéMON OK?"** in the info window (ball grid still visible, no YES/NO box
  yet) — this is `Select_OptionRentDeselect`'s own `Select_PrintSelectMonString`
  call, printed before the task hands off to `Select_Task_HandleYesNo`.
- Mon-pic reveal animation (`STATE_YESNO_SHOW_MONS`) completes and the
  YES/NO box (cursor on YES) is fully up and interactive by press-tick
  **249** (~47 frames after the 3rd confirm) — confirmed via screenshot, not
  just sha-diffing (frame 249 shows the 3 chosen-mon sprites — Onix/Magby/
  Bayleef, matching the pinned rental pool's slots 1-3 — plus a static
  YES/NO box). **A press before this point is silently dropped** (§2); this
  session's first attempt pressed A at tick 234 and it did nothing,
  confirming the gate empirically.
- YES press tick: **264**. Fade-to-black: framebuffer changes every single
  frame from **264 through 299** (~36 frames, includes the ball-grid→chosen-
  mons cross-fade plus the palette fade itself — not cleanly separable at
  1-frame resolution without a second isolated trace); **fully black and
  stable from frame 300 through 313** (14-frame hold — `Select_CopyMonsToPlayerParty`
  + task/sprite/buffer teardown running behind black).
- Fade back in begins **frame 314**; PreBattleRoom overworld (attendant +
  player standing in the room, screenshot-confirmed) is fully drawn and
  **stable with no message box from frame 329 through 337** (9-frame hold —
  this is the field script resuming and the room's `waitmovement`/message
  setup catching up).
- **"Right this way, please!" begins printing at frame 338**, fully printed
  by **frame 361**, and holds **byte-identical from 361 through frame 963**
  (the full length of this session's capture tail, ~600 frames) — confirmed
  **not to auto-advance**: this `msgbox` is `MSGBOX_DEFAULT`, which blocks on
  player input (`A`) before `closemessage`/the walk-to-battle-room movement/
  the warp can run. This is the concrete S5→S6 handoff point.

## 5. Risk list — frame-exactness threats, ranked

1. **Continuous idle-animation churn makes single-pick settle frames hard to
   isolate**, same failure mode as S4's Risk 1/8. Three independent
   continuously-running sources are live simultaneously during ball-picking:
   the species-name-breathe task (`Select_Task_FadeSpeciesName`, ~104-frame
   cycle per `ROADMAP.md`/S4 notes), and — newly identified here — the
   ball-rock idle anim on every *currently rented* ball
   (`SpriteCB_Pokeball`, §3, `Random()`-gated ~32-frame-plus cooldown per
   ball) which starts as soon as pick 1 lands and layers an *additional*,
   *per-ball*, *RNG-dependent* animation on top once 2-3 balls are rented
   simultaneously. This session's every-3rd-frame sparse sampling could not
   cleanly separate "the palette/text swap from the RENT confirm" from this
   background churn — a dense (every-frame) single-purpose trace isolating
   just one RENT confirm (ball 1, no prior selections, so no ball-rock
   contribution yet) is needed before implementation to pin the exact
   palette-swap and message-swap frame offsets.
2. **The ball-rock `Random()` roll must be modeled exactly, including the
   N-simultaneous-balls case**, or any RNG-consumption accounting downstream
   in the challenge (battle RNG, further draft, swaps) will desync the
   instant a trace dwells more than a few dozen frames with ≥1 ball rented —
   which is unavoidable given the yes/no confirm's own ~47-frame mon-reveal
   gate (§4) and the fact every pick after the 1st necessarily has ≥1 ball
   already rented while the player navigates to the next slot. Needs a
   dedicated dense probe with 2-3 balls simultaneously rented, dwelling
   >100 frames, to confirm the per-ball `data[0]` cooldown counters are
   independent (they are, per the code — `sprite->data[0]` is per-sprite —
   but this needs oracle confirmation that no other shared counter throttles
   the roll frequency across balls).
3. **The final-confirm mon-pic reveal animation
   (`Select_ShowChosenMons`/`SpriteCB_OpenChosenMonPics`) is itself an
   unexamined multi-frame state machine.** This session only established its
   *outer* bound (input-gated, ≤~47 frames, §2/§4) via `monPicAnimating`;
   the per-frame sprite positions/anim-cmd during that window were not
   traced. Needs its own dense capture (ball-grid → 3-mon-reveal transition
   in isolation) before implementation.
4. **Fade-to-black-and-back-in timing (YES confirm → pre-battle-room) was
   only measured to single-frame resolution on one trace, not
   cross-validated against a second independent run** — unlike S4's
   cross-trace sha consistency check (entry-fade vs. exit-fade landing on
   identical hold-frame shas). The black hold (300-313) and the two
   continuous-change windows either side of it (264-299, 314-328) should be
   re-verified with a second trace before treating these exact frame numbers
   as load-bearing, since `BeginNormalPaletteFade`'s delay/speed parameters
   here (`0, 0, 16`) are shared with S4's fades and were independently
   pinned there — a mismatch would indicate a probing error this session,
   not new game behavior.
5. **Declining the final confirm (NO/B) was read from source but not
   oracle-probed this session** — §2's "returns you to re-picking the 3rd
   slot, picks 1-2 intact" conclusion follows directly from
   `Select_DeclineChosenMons` operating on the untouched `cursorPos`, but no
   trace exercised this path. Needs a dedicated probe (3 picks → NO → verify
   pick 1/2 balls stay `PALTAG_BALL_SELECTED`, pick 3's ball goes back to
   gray, message reverts to "Select the third POKéMON.") before
   implementation treats it as verified.
6. **`Select_AreSpeciesValid`'s "can't select same species" popup path
   (:1953-1958, `SELECT_INVALID_MON`) was read but not oracle-probed** —
   its own timing (how long "Can't select same {PKMN}." stays up, whether
   `A` alone dismisses it back to `STATE_CHOOSE_MONS_HANDLE_INPUT` cleanly)
   needs a dedicated trace (attempt to rent slot 4 after slot 1, when both
   happen to share a species in whatever rental pool a given trace pins).
7. **The attendant's pre-draft opponent-scouting dialogue (type + style
   comments, `CommentOnOpponentType`/`CommentOnOpponentStyle`,
   `scripts.inc:207-347`) is baked into the anchor bootstrap and was not
   independently re-verified this session** — it's asserted from reading the
   script plus `bin/oracle info`'s bootstrap description, not from a fresh
   trace starting further upstream (this run's anchor already starts past
   it). Low risk since it's out of S5's live scope entirely, but flagged in
   case a future stage needs to trace the lobby→pre-battle-room transition
   itself (e.g. for a from-scratch challenge-entry stage).
