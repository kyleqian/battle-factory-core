# Battle bring-up notes (S6 scouting)

Implementation dossier for ROADMAP S6: the choreography from the A-press on
"Right this way, please!" (the S5→S6 handoff, `docs/rent-flow-notes.md`
section 2/4) through the battle transition, battle-scene init, and the first
action menu becoming interactive. **Scouting only — no engine code, no
extraction.** Sources: `reference/pokeemerald/data/maps/
BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc` and
`.../BattleFrontier_BattleFactoryBattleRoom/scripts.inc` (field scripts),
`src/battle_tower.c` (`DoSpecialTrainerBattle`, factory party generation),
`src/battle_setup.c`/`src/battle_transition.c`/`src/battle_transition_frontier.c`
(transition selection + effects), `src/battle_main.c` (CB2/intro state
machine), `src/battle_interface.c`/`src/battle_controller_opponent.c`/
`src/battle_message.c` (scene assets + intro text), `src/pokemon.c`
(mon generation). All line numbers refer to those files unless stated
otherwise. Oracle probes: scratch traces under `/tmp/s6-scout/` (not
committed) built on top of the S5 session's `/tmp/s5-scout/rent3-dense-exit.json`
(reused verbatim as a common prefix, so frame numbers below share that
session's absolute-frame convention — 3rd RENT confirm at 202, YES at 264,
"Right this way" fully printed at 361, per `rent-flow-notes.md` §4).

## 0. Correction to the roadmap's premise (read this first)

ROADMAP.md's S6 entry and Domain notes say opponent generation is "a
one-shot burst, already resolved... before frame 0" and that "frontier
battles do NOT advance RNG per frame." Both are **only partly true** —
confirmed by tracing `DoSpecialTrainerBattle` (not by assumption):

- **Only the opponent's identity (trainer id) and team *species/moveset*
  are pre-anchor-fixed.** `GenerateOpponentMons` (`src/battle_factory.c:303-377`,
  called pre-anchor from `EventScript_EnterRoom`, `rent-flow-notes.md` §2)
  writes only `gTrainerBattleOpponent_A` and `gFrontierTempParty[0..2]`
  (species-table indices) — confirmed by RAM dump, §5 below.
- **The opponent's actual battle `Pokemon` instances (personality — and
  thus which of its 25 possible personality-linked traits, though none
  matter for a fixed-nature/fixed-IV factory rental — get created fresh,
  synchronously, inside `DoSpecialTrainerBattle` itself** (`src/battle_tower.c:2092-2100`,
  `SPECIAL_BATTLE_FACTORY` case), specifically inside
  `FillFactoryTrainerParty` → `FillFactoryFrontierTrainerParty` →
  `CreateMonWithEVSpreadNatureOTID` (`src/pokemon.c:2562-2591`) — see §4/§5.
  This is a genuine `Random32()` roll, not deterministic-from-anchor, and it
  happens **before** any transition pixel is drawn but well **after**
  frame 0 of any trace (it depends on the full RNG stream consumed by
  everything upstream: the S5 draft's per-frame + ball-rock RNG, then every
  idle overworld frame during S6's own walk/warp/dialogue — see next point).
- **`Random()` keeps advancing once per VBlank through the *entire* walk +
  warp + battle-room-entry + dialogue + transition sequence** — it does
  **not** freeze at the anchor or at `BATTLE_TYPE_FACTORY` being set. The
  freeze condition (`src/main.c:365-366`, `VBlankIntr`; identical guard in
  `VBlankCB_Battle`, `src/battle_main.c:2084-2087`) is
  `if (!gMain.inBattle || !(gBattleTypeFlags & (BATTLE_TYPE_LINK|BATTLE_TYPE_FRONTIER|BATTLE_TYPE_RECORDED))) Random();`
  — note the `!gMain.inBattle ||`. `gBattleTypeFlags` gets `BATTLE_TYPE_FACTORY`
  set at `battle_tower.c:2093`, **before** the transition even starts, but
  `gMain.inBattle` stays `FALSE` until `CB2_InitBattleInternal` sets it
  `TRUE` at `src/battle_main.c:703` — **after** the transition finishes.
  So every frame of S6's own walk/warp/room-entry/dialogue/transition
  (hundreds of frames, §6) is a normal 1-`Random()`-per-VBlank overworld
  window, same as the draft screen. The "no RNG per frame" property only
  starts the instant the transition ends.
- **Practical consequence for S8+ exactness:** the number of frames the
  player dwells before each of the 3 gated msgboxes in this window (see §6)
  is player-paced and therefore changes the RNG stream consumed before
  `FillFactoryTrainerParty`'s `Random32()` nature-rejection loop and before
  the transition-selection roll (§2/§4) — i.e. **the exact transition
  variant that plays, and the opponent mons' exact personality values, are
  session-input-dependent, not anchor-fixed constants**, even though
  species/moveset/IVs/trainer-id are. Any Tier-1 test pinning "the RNG
  state entering battle 1" must pin the exact button/idle-frame count used,
  not just replay from the anchor with no assumptions.

## 1. Choreography after the A-press

All in `data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`
unless noted.

- `EventScript_EnterBattleRoom` (:43-52, entered once `Select_Task_Exit`
  hands control back and the field script resumes past `factory_rentmons`):
  `msgbox ..._Text_RightThisWay` ("Right this way, please!$", :612-613,
  single page) → `closemessage` → `call BattleFrontier_EventScript_GetLvlMode`
  → `call_if_eq VAR_RESULT, FRONTIER_LVL_50, EventScript_WalkToBattleRoomLv50`
  (:47, the Lv-50-singles path this run's anchor is pinned to) →
  `waitmovement 0` → **`warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM, 6, 11`**
  (:50) → `waitstate` → `end`.
- `EventScript_WalkToBattleRoomLv50` (:378-381): `applymovement`
  `LOCALID_FACTORY_PRE_BATTLE_ATTENDANT` → `Movement_GuideWalkToBattleRoomLv50`
  (:421-427: `walk_left, walk_left, walk_up, walk_up, set_invisible, step_end`
  — the attendant vanishes at the end, matching the brief's "set_invisible"),
  `applymovement LOCALID_PLAYER` → `Movement_PlayerWalkToBattleRoomLv50`
  (:396-402: `walk_up, walk_left, walk_left, walk_up, walk_up, step_end`) —
  **both `applymovement`s are issued before the shared `waitmovement 0`**,
  so attendant and player walk simultaneously (attendant nominally "leads"
  by finishing 1 tile earlier: 4 steps + vanish vs. the player's 5 steps).
  The Lv-Open counterpart (`Movement_GuideWalkToBattleRoomLvOpen`/
  `Movement_PlayerWalkToBattleRoomLvOpen`, :383-386, :404-410) is the
  mirror-image (`walk_right` instead of `walk_left`) — irrelevant to this
  run's Lv-50 anchor but structurally identical.
- Warp lands in `data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc`
  at `(6,11)`. `OnWarp` (:27-37) hides the real player object
  (`LOCALID_PLAYER`) and — since this is not a Frontier-Brain battle
  (`VAR_TEMP_F == FRONTIER_BRAIN_NOT_READY`, confirmed by which script
  branch actually ran) — also hides the not-yet-visible opponent object.
  `OnFrame`'s `EventScript_EnterRoom` (:62-73, the non-brain branch actually
  taken — the brain branch at :51-60, gated `goto_if_ne VAR_TEMP_F,
  FRONTIER_BRAIN_NOT_READY`, is dead code for battle 1):
  `applymovement` the fake player object (`LOCALID_FACTORY_BATTLE_PLAYER`)
  and the real one, both → `Movement_PlayerEnterRoom` (:193-200: `walk_up
  ×5, face_right`) → `waitmovement 0` → `call EventScript_ScientistsFaceBattle`
  (:234-242: the 6 background NPCs turn to face the ring, 3 right-facing +
  3 left-facing, via `Common_Movement_WalkInPlaceFasterRight/Left`) →
  **`factory_setopponentgfx`** (macro → `SetBattleFacilityTrainerGfxId(gTrainerBattleOpponent_A, 0)`,
  `src/battle_factory.c:379-382` — resolves the opponent's *overworld*
  walk-in sprite from their `facilityClass`) → `removeobject`/
  `setobjectxyperm ..., 7, 1`/`addobject` the opponent object (re-created at
  its entry tile) → `applymovement LOCALID_FACTORY_BATTLE_OPPONENT` →
  `Movement_OpponentEnter` (:206-213: `walk_down ×5, face_left`) →
  `waitmovement 0`.
- `EventScript_BattleOpponent` (:74-85, reached directly — the
  `goto_if_ne VAR_TEMP_F, ..., BattleNoland` at :75 is not taken for battle 1):
  **`palace_getopponentintro`** (macro, `asm/macros/battle_frontier/battle_palace.inc:35-38`,
  comment "Also used by Battle Arena and Factory" — despite the `palace_`
  name it's the shared cross-facility opponent-speech buffer) → `special
  CallBattlePalaceFunction` → `BufferOpponentIntroSpeech` (`src/battle_palace.c:36`
  dispatch, body :160-163: `if (gTrainerBattleOpponent_A < FRONTIER_TRAINERS_COUNT)
  FrontierSpeechToString(gFacilityTrainers[gTrainerBattleOpponent_A].speechBefore);`
  → `gStringVar4`) → `lockall` → `msgbox gStringVar4, MSGBOX_DEFAULT` →
  `waitmessage` → `closemessage` → `frontier_set FRONTIER_DATA_RECORD_DISABLED, FALSE`
  → `special HealPlayerParty` (silent, no dialogue — but see §6, a visible
  heal-icon overlay plays) → `setvar VAR_0x8004, SPECIAL_BATTLE_FACTORY` →
  `setvar VAR_0x8005, 0` → **`special DoSpecialTrainerBattle`** — this is
  the exact field-script→battle-engine handoff (§2/§3 below).
- This trainer's `speechBefore` is genuinely oracle-confirmed:
  `gFacilityTrainers[50] = FRONTIER_TRAINER_DESTIN`
  (`src/data/battle_frontier/battle_frontier_trainers.h:403-410`:
  `facilityClass = FACILITY_CLASS_BUG_CATCHER, trainerName = "DESTIN",
  speechBefore = {EC_WORD_IT_S, EC_WORD_WAY, EC_WORD_TOO, EC_WORD_HOT,
  EC_WORD_HERE, EC_EMPTY_WORD}`) renders on-screen as **"It's way too hot
  here"** — screenshot-confirmed (§6) — i.e. do **not** assume Easy Chat
  word constant names read out literally in every context; extract the
  actual word-bank strings (`src/easy_chat.c`, `FrontierSpeechToString`,
  `src/battle_tower.c:1919`) rather than hand-transliterating constant
  names (a wrong guess against a *different* trainer's speech very nearly
  looked plausible this session — see §7 risk 1).

## 2. Battle transition

Selector: `GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY)`
(`src/battle_setup.c:864-909`, called `src/battle_tower.c:2099` with id
`B_TRANSITION_GROUP_B_FACTORY`, `include/battle_transition.h:74`). None of
the special-cased branches (Trainer Hill/Secret Base/E-Reader/Pyramid/Dome,
`battle_setup.c:874-882`,`891-899`) match this id, so (Singles, not
`FRONTIER_MODE_LINK_MULTIS`) it falls through to
`RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier)`
(`battle_setup.c:863,885` — `#define RANDOM_TRANSITION(table)
table[Random() % ARRAY_COUNT(table)]`, **one `Random()` call**), picking
uniformly among **12** effects (`battle_setup.c:131-145`):
`B_TRANSITION_FRONTIER_LOGO_WIGGLE/_WAVE`,
`_SQUARES`/`_SQUARES_SCROLL`,
`_CIRCLES_MEET`/`_CROSS`/`_ASYMMETRIC_SPIRAL`/`_SYMMETRIC_SPIRAL`, and the
`_IN_SEQ` variant of each of the last four. **Which of the 12 plays is
random per battle**, not a fixed Factory transition — implementation must
either support all 12 or accept whichever the RNG stream produces for a
given trace (see §0).

Visual mechanisms (`src/battle_transition.c`, `src/battle_transition_frontier.c`):
1. **Logo wiggle/wave** (`Task_FrontierLogoWiggle`/`Task_FrontierLogoWave`,
   `battle_transition.c:4264,4284`): the Battle Frontier logo bitmap is
   uploaded and rippled via a per-scanline HBlank sine distortion
   (`SetSinWave`/`Sin()`, :4258,4379).
2. **Squares/Squares-scroll** (`Task_FrontierSquares`/`_Scroll`,
   :4432-4719): small logo-bearing squares checkerboard-fill the screen
   (`FrontierSquares_Draw`, :4469) or scroll in from a direction chosen by
   **`Random() % 4`** (`FrontierSquaresScroll_Init`, :4679 — a *second*,
   conditional RNG draw, only when this variant is the one picked), then
   fade to black once full.
3. **Circles family** (`battle_transition_frontier.c`): three 64×64 sprites
   (the logo split into top/left/right pieces) slide/spiral from off-screen
   to fixed targets `(120,45)`, `(89,97)`, `(151,97)` (`SpriteCB_LogoCircleSlide`,
   :267, targets :240-262) to visually assemble the logo, then fade.

**This session's own trace** (§6) landed on a horizontal-banded wipe
(thin white line on black at frame ~1918, filling into pale horizontal
streaks by ~1946) consistent with the squares family rendering at low
resolution — **not independently confirmed against source which exact
variant this was**; flagged as §7 risk 3. Total wall-clock for the
transition in this run: black screen first seen ~1890, background/trainer
fully assembled by ~2044-2100 (~150-210 frames) — coarse, not
dense-verified (§7 risk 4).

**Partially superseded (S6 slice 1b, see "Slice-0 ground truth" §3.1
below)**: this section's own scratch trace was never re-probed this
slice (different script/RNG stream, §0 — its transition draw is not
necessarily the same variant), but the *method* here is now known to be
the wrong one to reach for first. The transition id doesn't need pixel
guessing at all — it's a plain field, `gTasks[taskId].data[1]`
(`tTransitionId`, set once in `LaunchBattleTransitionTask`,
`battle_transition.c:1059`) on whichever task slot runs
`Task_BattleTransition`, directly RAM-readable and stable for the whole
transition. Likewise, the "horizontal-banded wipe" this session attributed
to *the transition itself* deserves a second look: the slice-0 session
found that for its own trace, the transition subsystem (`Task_BattleTransition`
+ its dispatched main-effect task) is fully destroyed via `CB2_InitBattleInternal`'s
`ResetTasks()` well before any extended streak/band pattern appears on
screen — what looked like a transition visual may instead have been
`BeginBattleIntro`'s post-transition background/trainer-slide assembly, a
different code path entirely. Re-probing this section's own trace with
the `gTasks[].data[1]` technique (rather than re-deriving the guess from
scratch) is the recommended follow-up if this scratch trace still exists.

## 3. Battle init through the first action menu

**CB2 chain** (all `src/battle_main.c` unless noted):
`DoSpecialTrainerBattle`/`SPECIAL_BATTLE_FACTORY` (`src/battle_tower.c:2092-2100`)
→ `BattleTransition_StartOnField` sets `SetMainCallback2(CB2_OverworldBasic)`
(`src/battle_transition.c:1026-1030`) and spawns `Task_BattleTransition` +
`Task_StartBattleAfterTransition` (`src/battle_tower.c:1997-2005`, created
at `battle_tower.c:2097`) — this CB2 does **not** process player input. Once
`IsBattleTransitionDone()` (`battle_transition.c:1041`), `Task_StartBattleAfterTransition`
sets `gMain.savedCallback = HandleSpecialTrainerBattleEnd`
(`battle_tower.c:1956,2001`) and `SetMainCallback2(CB2_InitBattle)`
(`battle_tower.c:2002`) → `CB2_InitBattle` (:588) → `CB2_InitBattleInternal`
(:619-710: installs `VBlankCB_Battle` at :683, calls `CreateNPCTrainerParty`
at :697 — **no-op for Factory**, guarded out by the same
`BATTLE_TYPE_FRONTIER` check, :1971-1973 — sets `gMain.inBattle = TRUE` at
:703, `SetMainCallback2(CB2_HandleStartBattle)` at :693) →
`CB2_HandleStartBattle` (:953, states 0→1→15→18 for a non-link battle) →
once `BattleInitAllSprites()` completes (:1137), `gMain.callback1 =
BattleMainCB1` (:1140) and `SetMainCallback2(BattleMainCB2)` (:1141;
`BattleMainCB2` itself at :1863 just runs sprite/task/text-printer
housekeeping for the rest of the battle) → `BattleMainCB1` drives
`gBattleMainFunc()` per frame, starting at `BeginBattleIntro` (:3019) →
`BattleStartClearSetData` (:3034, **`gRandomTurnNumber = Random()`** at
:3140) → intro chain `BattleIntroGetMonsData` → `BattleIntroPrepareBackgroundSlide`
(:3372, emits the background-slide controller command) →
`BattleIntroDrawTrainersOrMonsSprites` (:3387, emits the trainer-pic draw
for both sides) → `BattleIntroDrawPartySummaryScreens` (:3488) →
`BattleIntroPrintTrainerWantsToBattle` (:3564) →
`BattleIntroPrintOpponentSendsOut` (:3583) →
`BattleIntroOpponent1SendsOutMonAnimation` (:3642, emits the ball-throw) →
`BattleIntroRecordMonsToDex` (:3685) → `BattleIntroPrintPlayerSendsOut`
(:3711) → `BattleIntroPlayer1SendsOutMonAnimation` (:3776) →
`TryDoEventsBeforeFirstTurn` (:3841, **`gRandomTurnNumber = Random()`** at
:3923 — the last RNG draw before the menu; switch-in ability/item hooks at
:3864-3887 checked and found to consume no RNG for this matchup, see §4) →
`HandleTurnActionSelectionState` (:3905/4129), case
`STATE_BEFORE_ACTION_CHOSEN` (:4143) emits `BtlController_EmitChooseAction`
(:4168) — **this is the exact instruction that puts up the first action
menu.**

**Asset + screen inventory** (everything needing eventual pixel-exact
extraction):
- **Background**: `DrawMainBattleBackground` (`src/battle_bg.c:760`) checks
  `gBattleTypeFlags & (BATTLE_TYPE_LINK|BATTLE_TYPE_FRONTIER|BATTLE_TYPE_EREADER_TRAINER|BATTLE_TYPE_RECORDED_LINK)`
  **before** any map-based lookup (:762-767) — since `BATTLE_TYPE_FACTORY ⊂
  BATTLE_TYPE_FRONTIER`, every Factory battle unconditionally uses: tileset
  `gBattleEnvironmentTiles_Building` (`graphics/battle_environment/building/tiles.png`,
  `src/data/graphics/battle_environment.h:35`), tilemap
  `gBattleEnvironmentTilemap_Building` (`.../building/map.bin`, :37),
  palette **`gBattleEnvironmentPalette_Frontier`** (`.../stadium/battle_frontier.pal`,
  :36, comment "also used for link battles" — note this is *not* the plain
  indoor palette a naive map-type lookup would give). Entry-slide variant:
  `DrawBattleEntryBackground` (`battle_bg.c:1124`, Frontier branch
  :1143-1149, `gBattleEnvironmentAnimTiles_Building`/`AnimTilemap_Building`
  → `anim_tiles.png`/`anim_map.bin`, :84-85).
- **Healthboxes**: `CreateBattlerHealthboxSprites` (`battle_interface.c:869`),
  singles templates `sHealthboxPlayerSpriteTemplates[0]`/
  `sHealthboxOpponentSpriteTemplates[0]` (:880-891, defined :209-251);
  healthbar sprite `SpriteCB_HealthBar` (:979-1002, slaved to healthbox
  ±16/±8px). Singles coords: opponent `x=44,y=30`, player `x=158,y=88`
  (`InitBattlerHealthboxCoords`, :1078-1081). Sheets:
  `gHealthboxSinglesPlayerGfx`/`_OpponentGfx` (`src/graphics.c:628-629` →
  `graphics/battle_interface/healthbox_singles_{player,opponent}.png`);
  shared HP-bar/EXP-bar/status-icon atlas `gHealthboxElementsGfxTable[][32]`
  (`graphics.c:358-372`, from `graphics/battle_interface/{hpbar,expbar,
  status,misc,...}.4bpp`); palette `gBattleInterface_BallStatusBarPal`
  (`graphics.c:354`). HP-bar color thresholds: green >50%, yellow >20%,
  else red (`GetHPBarLevel`, :2527-2543, `B_HEALTHBAR_PIXELS=48`, :2236).
  The "ball caught" indicator is skipped for any trainer battle
  (`TryAddPokeballIconToHealthbox`, :1976-1977).
- **Trainer intro**: opponent's overworld walk-in sprite comes from
  `SetBattleFacilityTrainerGfxId` (§1); their **battle front-pic** is
  separate: `OpponentHandleDrawTrainerPic`/`OpponentHandleTrainerSlide`
  (`src/battle_controller_opponent.c:1240,1325`, Frontier branch
  :1267-1280,1351-1364) → `GetFrontierTrainerFrontSpriteId(gTrainerBattleOpponent_A)`
  (`src/battle_tower.c:1404,1416-1418`) →
  `gFacilityClassToPicIndex[facilityClass]` (`src/data/pokemon/trainer_class_lookups.h`)
  → `gTrainerFrontPicTable[]` (`src/data/trainer_graphics/front_pic_tables.h:100`,
  e.g. `TRAINER_SPRITE(YOUNGSTER, gTrainerFrontPic_Youngster, ...)` at
  :155) → `graphics/trainers/front_pics/<class>.png`; decompressed via
  `DecompressTrainerFrontPic` (`src/battle_gfx_sfx_util.c:701`). Trainer
  sprite spawns at `xPos=176` for singles (`battle_controller_opponent.c:1294-1320`),
  slide-in via `SpriteCB_TrainerSlideIn` (`src/battle_gfx_sfx_util.c:396`).
  **Send-out order (oracle-confirmed, §6): opponent's mon sends out
  first**(`BattleIntroOpponent1SendsOutMonAnimation` → `OpponentHandleIntroTrainerBallThrow`,
  `battle_controller_opponent.c:1867` → `Task_StartSendOutAnim`,:1168 →
  `DoPokeballSendOutAnimation(0, POKEBALL_OPPONENT_SENDOUT)`, `src/pokeball.c:335`),
  **then** the player's lead (`DoPokeballSendOutAnimation(0,
  POKEBALL_PLAYER_SENDOUT)`, `src/battle_controller_player.c:2224`) — both
  trainer sprites had already slid on-screen together earlier.
- **Intro text**: all built via `BattleStringExpandPlaceholders`
  (`src/battle_message.c:2312`) from templates with `B_TXT_*` placeholders,
  **not** literal `gStringVarN` copies:
  - `sText_Trainer1WantsToBattle` = `"{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\nwould like to battle!\p"`
    (:385, dispatch :2018-2019) — oracle-confirmed on-screen as "BUG CATCHER
    DESTIN would like to battle!♥" (§6; the ♥ is the standard
    friendship/like glyph, unrelated to this dossier's scope).
  - `sText_Trainer1SentOutPkmn` = `"{B_TRAINER1_CLASS} {B_TRAINER1_NAME} sent\nout {B_OPPONENT_MON1_NAME}!"`
    (:388, dispatch :2070-2071) — confirmed "BUG CATCHER DESTIN sent out
    G[ROVYLE]!".
  - `sText_GoPkmn` = `"Go! {B_PLAYER_MON1_NAME}!"` (:396, dispatch
    :2048-2051) — confirmed "Go! ONIX!".
  - Placeholders resolve via `GetFrontierOpponentClass`/`GetFrontierTrainerName`
    (`battle_message.c:2532-2533,2559-2562` → `src/battle_tower.c:1436-1455,1514-1537`)
    — i.e. class/name come from `gFacilityTrainers`, **not** the normal
    overworld `gTrainers[]` table.
- **First action menu geometry**: windows in `sStandardBattleWindowTemplates[]`
  (`src/battle_bg.c:163`) — `B_WIN_ACTION_PROMPT` ("What will X do?"):
  `tilemapLeft=1,tilemapTop=35,width=14,height=4,baseBlock=0x01c0`
  (:174-182); `B_WIN_ACTION_MENU` (FIGHT/BAG/POKÉMON/RUN grid):
  `tilemapLeft=17,tilemapTop=35,width=12,height=4,paletteNum=5,baseBlock=0x0190`
  (:183-191) — both share bg0's larger tilemap with the message window
  (`B_WIN_MSG`, `tilemapTop=15`, :165-173), swapped into view by scrolling
  `gBattle_BG0_Y = DISPLAY_HEIGHT` (`HandleChooseActionAfterDma3`,
  `src/battle_controller_player.c:2565-2573`). Menu text is the fixed
  string `gText_BattleMenu = "FIGHT{CLEAR_TO 56}BAG\nPOKéMON{CLEAR_TO 56}RUN"`
  (`battle_message.c:1275`), printed via `BattlePutTextOnWindow(...,
  B_WIN_ACTION_MENU)` (`battle_controller_player.c:2575-2588`). Cursor:
  `ActionSelectionCreateCursorAt`/`DestroyCursorAt` (:1530,1540); input in
  `HandleInputChooseAction` (:233-330, case 0=FIGHT/`B_ACTION_USE_MOVE`,
  1=BAG/`B_ACTION_USE_ITEM`, 2=POKEMON/`B_ACTION_SWITCH`, 3=RUN/`B_ACTION_RUN`).
  Oracle-confirmed on-screen (§6, frame ~5208): "What will ONIX do?" +
  FIGHT/BAG/POKéMON/RUN, cursor defaulting to FIGHT.
- **BAG is present but non-functional in a Factory battle**: the menu
  renders identically (all 4 options shown, not source-verified via a
  dedicated BAG-press trace this session — §7 risk 8), but selecting it is
  intercepted in `src/battle_main.c`, case `B_ACTION_USE_ITEM` (:4221):
  `if (gBattleTypeFlags & (BATTLE_TYPE_LINK|BATTLE_TYPE_FRONTIER_NO_PYRAMID|BATTLE_TYPE_EREADER_TRAINER|BATTLE_TYPE_RECORDED_LINK))`
  (:4222-4225, `BATTLE_TYPE_FRONTIER_NO_PYRAMID ⊇ BATTLE_TYPE_FACTORY`,
  `include/constants/battle.h:92`) → `gSelectionBattleScripts[gActiveBattler]
  = BattleScript_ActionSelectionItemsCantBeUsed` (:4228) instead of opening
  the bag UI — prints `"Items can't be used now.{PAUSE 64}"`
  (`data/battle_scripts_1.s:4424-4426`, string `battle_message.c:251`,
  table entry 830) and returns to action-selection.

## 4. RNG consumption between the A-press and the first action menu

Confirmed by tracing `DoSpecialTrainerBattle` end-to-end (not by grepping
in isolation) — see §0 for the headline correction. In execution order:

1. **`Random()` fires once per VBlank throughout the *entire* walk/warp/
   room-entry/dialogue/transition window** (§0) — this is the dominant
   consumer by frame count (hundreds of frames, §6), and its exact count is
   **player-paced** (depends on when the player presses A at each of the 3
   gated msgboxes in §1/§6).
2. **`FillFactoryTrainerParty` → `FillFactoryFrontierTrainerParty`
   (`src/battle_tower.c:1815-1885`)**, called synchronously inside
   `DoSpecialTrainerBattle`, **before** the transition starts:
   - `fixedIV = GetFactoryMonFixedIV(challengeNum, isLastBattle)` — a
     deterministic table lookup (`sFixedIVTable[][2]`,
     `src/battle_factory.c:157-167`, no RNG); for challenge 0 (battle 1),
     not the last battle, `fixedIV = sFixedIVTable[0][0] = 3` (all 6 IVs).
     Note the `challengeNum` here is computed from
     `gSaveBlock2Ptr->frontier.towerWinStreaks[...]` — the **Tower's**
     streak, not the Factory's — a decomp-documented upstream bug
     (`battle_tower.c:731-738`), harmless for a fresh save (both are 0) but
     worth flagging if this run ever models streak state.
   - Per opponent mon (×3), `CreateMonWithEVSpreadNatureOTID` (`src/pokemon.c:2562-2591`):
     **`do { i = Random32(); } while (nature != GetNatureFromPersonality(i));`**
     (:2570-2573) — a rejection loop, **variable draw count** (not fixed;
     ~25 expected draws to hit 1-of-25 natures), consuming `Random32()`
     (i.e. 2×`Random()`-worth of state per the gen-3 LCG, needs confirming
     against this engine's `Random32` implementation once built) until the
     personality's nature matches `gFacilityTrainerMons[monId].nature`
     (already extracted, `src/data/gen/battle-frontier-mons.json`). Then
     `CreateMon(..., fixedIV, TRUE, i, OT_ID_PRESET, otId)` — fixed
     personality/IV/OT-id from here, no further RNG.
3. **Transition selection**: 1×`Random()` (`GetSpecialBattleTransition`,
   §2) — **immediately after** the 3 nature-rejection loops, same call
   frame, before any transition visual. Conditionally, 1 more `Random() % 4`
   if the `SQUARES_SCROLL` variant is chosen (§2).
4. **RNG auto-advance stops** the instant `gMain.inBattle = TRUE`
   (`battle_main.c:703`, inside `CB2_InitBattleInternal`, which runs on the
   single frame right after `IsBattleTransitionDone()` first returns true)
   — from here on, both the `main.c` ISR path and `VBlankCB_Battle`
   suppress the per-frame draw.
5. Two more **explicit** draws survive the freeze: `gRandomTurnNumber =
   Random()` at `BattleStartClearSetData` (`battle_main.c:3140`, start of
   the intro chain) and again at `TryDoEventsBeforeFirstTurn`
   (`battle_main.c:3923`, immediately before the action menu is emitted) —
   both seed/reseed `gRandomTurnNumber`, used later for Quick Claw
   speed-tie resolution (not relevant until S7's turn order).
6. **Ruled out** (checked, not assumed) for this exact matchup: `CreateNPCTrainerParty`
   (`battle_main.c:697`) is a no-op for `BATTLE_TYPE_FRONTIER` (:1971-1973);
   `battle_controller_player.c`/`battle_controller_opponent.c`/`pokeball.c`
   send-out code has no `Random()` calls; the switch-in ability/item hooks
   in `TryDoEventsBeforeFirstTurn` (:3864-3887) resolve to no-RNG paths for
   a Singles battle with no weather/Intimidate/Trace/on-switch-in-item
   interaction in play here (Trace's one `Random()&1` at `battle_util.c:3031`
   is gated `BATTLE_TYPE_DOUBLE`-only, unreachable in Singles).

## 5. Battle-1 opponent identity + starting player party (RAM-dumped)

Dev-time RAM inspection (recipe per `tools/extract/inspect-anchor.py`,
scratch script `/tmp/s6-scout/inspect_battle1.py`, not committed) against
the pinned anchor (`canonicalScreenSha256` re-verified `9c89c74113f2...`).

**Opponent** (read at frame 0 — pre-anchor-fixed, §0): `gTrainerBattleOpponent_A
= 50` (`src/data/battle_frontier/battle_frontier_trainers.h:403`,
`FRONTIER_TRAINER_DESTIN` — `facilityClass = FACILITY_CLASS_BUG_CATCHER`,
`trainerName = "DESTIN"`), `gFrontierTempParty = [188, 184, 135]`:

| slot | frontierMonIndex | species | moves | item | nature |
|---|---|---|---|---|---|
| 1 | 188 (`FRONTIER_MON_GROVYLE_1`) | GROVYLE | FURY_CUTTER, ENDEAVOR, BRICK_BREAK, DOUBLE_TEAM | BRIGHT_POWDER | RELAXED |
| 2 | 184 (`FRONTIER_MON_MURKROW_1`) | MURKROW | FAINT_ATTACK, FLY, TORMENT, TAUNT | LAX_INCENSE | QUIRKY |
| 3 | 135 (`FRONTIER_MON_PIDGEOTTO`) | PIDGEOTTO | AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK | WHITE_HERB | QUIRKY |

(Species/moves/item/nature per-slot are deterministic and anchor-fixed;
**personality is not** — see §0/§4 — so this table intentionally omits
personality/exact-IV-roll/stats for the opponent, unlike the player table
below.)

**Player party after a rent-1/2/3-in-order draft** (replayed
`/tmp/s5-scout/rent3-dense-exit.json` — the already-validated S5 happy-path
trace — frame-by-frame via the oracle's Python API, then read
`gPlayerParty[0..2]`; full `struct Pokemon` decode, same technique as
`tools/extract/inspect-anchor.py`):

| slot | species | nature | ability# | IVs (all stats) | moves | Lv | HP | Atk | Def | Spd | SpA | SpD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ONIX | HARDY | 1 | 3 | ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM | 50 | 117 | 51 | 187 | 76 | 36 | 72 |
| 2 | MAGBY | DOCILE | 0 | 3 | FIRE_PUNCH, SMOKESCREEN, CONFUSE_RAY, SMOG | 50 | 138 | 81 | 43 | 89 | 108 | 61 |
| 3 | BAYLEEF | DOCILE | 0 | 3 | RAZOR_LEAF, TOXIC, SAFEGUARD, LIGHT_SCREEN | 50 | 153 | 68 | 86 | 66 | 101 | 86 |

This matches S3's pinned rental pool (ONIX/MAGBY/BAYLEEF/BUTTERFREE/
HAUNTER/QUILAVA, slots 1-3 rented in order) and is oracle-confirmed on
screen: the "Go! ONIX!" send-out shows `117/117` HP (§6), matching this
table exactly.

**RAM-read gotcha worth recording**: `gTrainerBattleOpponent_A` is a `u16`
at `0x2038bca` — **not 4-byte-aligned**. Reading it via
`oracle.read_u32(addr) & 0xFFFF` (the pattern `inspect-anchor.py` uses for
other, 4-aligned, fields) silently returned **0** (garbage from
mGBA's debug `memory.u32[]` accessor, which appears to round the address
down to alignment rather than doing a true byte-position read) instead of
the correct **50** — caught only by cross-validating against the oracle's
own on-screen trainer-intro text ("BUG CATCHER DESTIN", not "BRADY"/id 0
the buggy read implied). **Always use the direct-width accessor
(`memory.u16[addr]`) for fields not independently known to be 4-aligned**,
and cross-validate any RAM dump against an oracle screenshot before
trusting it — sha-stability or "it returned a plausible-looking value" is
not enough (this session's first pass produced a perfectly
plausible-looking wrong trainer).

## 6. Oracle-probed happy-path timings

Built on `/tmp/s5-scout/rent3-dense-exit.json` (444 frames, ends inside the
"Right this way" stable window) + 3 rounds of extension
(`/tmp/s6-scout/round{1,2,3}.json` + `-out/` captures, not committed).
Absolute frame numbers below share that trace's numbering (3rd RENT
confirm 202, YES 264, "Right this way" fully printed 361, per
`rent-flow-notes.md` §4). **Coarse pass (6-14-frame sampling), not
dense/every-frame — treat as approximate windows, not load-bearing exact
frames (§7 risk 4).** All key frames screenshot-confirmed, not just
sha-diffed.

- **A-press #1** (this session's arbitrary choice, frame 464-465 — any
  tick in "Right this way"'s 361-963 stable window works, per
  `rent-flow-notes.md`): closes the message.
- **~468-564 (~96 frames)**: walk-to-battle-room movement (attendant +
  player, 5 tiles each, §1) — continuous per-frame pixel changes observed
  throughout (screenshots at 522/546 show the player mid-walk, approaching
  the exit).
- **~564-588**: warp fade — **frame 570 confirmed fully black**
  (screenshot); Battle Room ring-floor + 6 scientist NPCs + player fully
  visible by **frame 588**.
- **~588-750**: player/fake-player enter-room walk + `ScientistsFaceBattle`
  + opponent object removed/re-added/walked into position — opponent
  sprite confirmed in final position by **frame 750**.
- **~750-804**: brief pause, then the opponent's overworld pre-battle
  speech msgbox — fully printed and stable ("IT'S WAY TOO / HOT HERE") by
  **frame 804**, confirmed **not to auto-advance** (byte-identical 804
  through at least 1665, ~861 frames, this session's chosen idle tail).
- **A-press #2** (frame 1666-1667): closes the speech msgbox.
- **~1680-1876 (~196 frames)**: a heal-icon/overlay animation plays
  (`special HealPlayerParty`, silent in script but visibly animated on
  screen — icon visible top-left at frame 1750) — continuous per-frame
  changes throughout this window.
- **~1890**: screen fully black — transition start (`DoSpecialTrainerBattle`
  → `BattleTransition_StartOnField`, §2/§3; the 3× nature-reroll +
  transition-select RNG draws, §4, happen instantaneously on this same
  frame, no visible cost).
- **~1918-2044**: transition visuals — thin white line on black (1918),
  filling into pale horizontal streaked bands (1946) — see §2 caveat on
  variant identification; battle background + both trainer sprites fully
  assembled by **~2044-2100** (screenshot at 2044 shows the trainer mid
  slide-in overlapping the player's back-sprite; 2100 shows both fully in
  place with the "BUG CATCHER DESTIN" text beginning to print).
- **~2128-2142**: "BUG CATCHER DESTIN would like to battle!♥" fully
  printed and stable — confirmed **input-gated** (byte-identical from 2142
  through frame 4867, ~2700 frames, this session's idle tail, with no
  further input given).
- **A-press #3** (frame 4868-4869): advances past the "wants to battle"
  line.
- **~4868-5012**: opponent send-out — "BUG CATCHER DESTIN sent out G..."
  (Grovyle) message + send-out animation; opponent healthbox + Grovyle
  sprite (Lv50) fully shown by **frame 4900** (screenshot: message reads
  "BUG CATCHER DESTIN sent out G" at that point, still printing).
- **~5012-5144**: player send-out — "Go! ONIX!" message; player healthbox
  appears showing **117/117** HP (screenshot-confirmed at frame 5020,
  matching §5's player-party dump exactly) — message box holds static
  5144 through at least 5188 (~44 frames).
- **~5192**: "Go! ONIX!" message box clears (goes blank).
- **~5192-5208**: **first action menu appears** — "What will ONIX do?"
  + FIGHT/BAG/POKéMON/RUN, cursor on FIGHT — confirmed fully drawn by
  **frame 5208** (not yet present at 5192). From ~5216 onward the capture
  settles into a steady ~28-frame-period 4-value sha cycle (idle
  cursor/HP-bar animation) through the rest of this session's 5769-frame
  capture — i.e. **stable/interactive**, matching the acceptance
  criteria's "through the first action menu" endpoint.
- **Headline total**: "Right this way" fully printed (361) → first action
  menu settled (~5208) is **~4847 frames (~81s at 59.7275Hz)** for
  *this session's specific 3 arbitrary A-press timings* — not a fixed
  constant, since all 3 gates are player-paced (§0).

## 7. Risk list — frame-exactness threats, ranked

1. **This session read the wrong opponent trainer on the first attempt**
   (§5's RAM-read gotcha: a non-4-aligned `u16` read via `read_u32`+mask
   silently returned a *different, plausible-looking* trainer — "BRADY",
   Youngster — instead of the true "DESTIN", Bug Catcher). It was caught
   only because the on-screen intro text was independently cross-checked
   against source (the Easy-Chat-decoded speech line matched DESTIN's
   `speechBefore` exactly, char for char). **Any future RAM dump of a
   `u16`/`u8` field must use the matching-width accessor, and must be
   cross-validated against an oracle screenshot before being trusted** —
   this is a general hazard, not specific to this one field (worth a note
   in the RAM-inspection recipe in ROADMAP.md's Domain notes for future
   sessions).
2. **The opponent's personality is genuinely rolled fresh at battle-start
   time via a variable-length `Random32()` rejection loop** (§0/§4) — this
   is the single biggest correction this session made to the roadmap's
   stated RNG model. Any implementation/test that assumes "opponent state
   is fully anchor-fixed" will silently diverge from turn 1 onward once
   personality-dependent effects matter (unlikely to matter for damage in
   a fixed-nature/fixed-IV factory context, but it **does** consume RNG
   stream state that shifts everything downstream — the transition
   variant, and eventually battle 2-7's opponent generation, S8). Needs a
   Tier-1 test pinning the *exact* RNG-consumption trace (idle-frame counts
   included) once the engine's LCG/`Random32` split is implemented.
3. **This session confirmed only 1 of the 12 possible battle transitions**
   visually (a horizontal-banded wipe, presumed "squares" family) and did
   **not** cross-check it against `Task_FrontierSquares`/`_Scroll` source
   frame-by-frame, nor observe any of the other 11. All 12 need their own
   dense probe + asset extraction eventually; which one plays for a given
   trace is RNG-stream-dependent (§2/§4), so implementation coverage should
   target "support all 12 correctly," not "match whichever one this
   session happened to see."
4. **All §6 frame boundaries are coarse (6-14-frame sampling), not
   dense/every-frame** — same caveat class as S4/S5's Risk 1. Before
   implementation treats any of these numbers as load-bearing, each
   transition (movement→warp, warp→room-visible, dialogue→transition,
   transition→trainer-slide, slide→"wants to battle", send-out→send-out,
   "Go!"→action-menu) needs its own dense single-purpose probe, the same
   way S5 eventually resolved its own Risk 1.
5. **The exact number of "gated" msgboxes needing player A-presses (3,
   confirmed this session: "Right this way" already known from S5; the
   overworld opponent-speech box; "wants to battle") vs. auto-advancing
   ones (none observed doing so in this window) was empirically
   discovered, not read from source first** — worth double-checking
   against the `MSGBOX_DEFAULT`/battle-script `printstring` semantics in
   source before hardening, in case a *different* Factory trainer's
   speech length or a *different* transition variant changes this count
   (e.g., a 2-page opponent speech would need 2 A-presses, not 1 — this
   session's DESTIN line was short/single-page).
6. **Declining/edge paths not probed**: this dossier only traces the
   single happy path (Lv-50 Singles, non-brain trainer, first-ever
   battle). Not exercised: the Frontier-Brain battle branch
   (`EventScript_EnterRoomFactoryHeadBattle`/`BattleNoland`, dead code for
   battle 1 but live for battle 7+), the `FRONTIER_LVL_OPEN` movement
   mirror (structurally identical per source, unverified on-screen), and
   what happens if the player mashes A early at any of the 3 gates
   (untested whether any of them silently drop early input the way S4's
   summary screen did).
7. **`FillFactoryFrontierTrainerParty`'s `challengeNum` reads the Battle
   *Tower's* win-streak var, not the Factory's** (`src/battle_tower.c:731-738`
   comment, confirmed by the research agent) — a real upstream-game bug,
   harmless on a fresh save (both streaks are 0) but a landmine if this
   run ever models non-zero streak state (post-battle-1 continuation,
   S8) — reproducing the *bug* faithfully (not "fixing" it) is required
   for byte-exact parity.
8. **BAG-disabled-in-Factory was read from source
   (`BATTLE_TYPE_FRONTIER_NO_PYRAMID` gate, §3) but not oracle-probed** —
   no trace this session actually pressed BAG at the first action menu to
   confirm "Items can't be used now." appears; needs a one-A-press
   follow-up trace before implementation treats it as verified.
9. **Send-out order (opponent first, then player) and the specific 3
   intro strings were confirmed for exactly one matchup** (DESTIN/Grovyle
   vs. ONIX) — the *mechanism* (source-cited, §3) should generalize, but
   no second matchup was cross-checked this session the way S4 required
   "≥2 different slots."

## Scratch trace inventory (not committed, `/tmp/s6-scout/`)

- `inspect_battle1.py` — RAM-dump script (§5), fixed mid-session (see the
  code comment at the trainer-id read for the alignment gotcha).
- `track_opponent_id.py` — the cross-validation script that caught the
  alignment bug by re-reading `gTrainerBattleOpponent_A` at multiple
  replay checkpoints with the correct accessor.
- `battle1-state-fixed.json` — the corrected RAM-dump output (§5's tables).
- `round1.json`/`round1-out/`, `round2.json`/`round2-out/`,
  `round3.json`/`round3-out/` — the 3 chained oracle traces behind §6
  (each extends the previous with one more A-press + a long idle capture
  window). `round3` ends at frame 5769, past the first action menu.
- These are session-scratch per the run's contract (not committed); the
  next worker should re-probe rather than assume these files still exist.

## Slice-0 ground truth, 2026-07-18

S6 slice 0 (pure ground-truth pinning, no engine code): a committed dense
oracle trace, RNG/transition/personality checkpoints, and this section.
Committed: `tools/compare/traces-groundtruth/battle1-intro.json` (40
segments, **1886 frames**, 254 captures) + its README (ground truth, not
an `npm run compare` parity fixture). Script: `accept-prebattle.json`'s own
392-frame prefix (rent 1/2/3 + YES-accept, verified 137/137 byte-exact)
followed by idle-to-tick-400, then 3 more A-presses. **All frame numbers
below are this new trace's own absolute frame indices** (0-indexed) — they
do **not** share `rent-flow-notes.md`/this file's §6 numbering, which came
from an *unrelated, separately-hand-tuned* scratch script (§6's own
press-tick deltas do not reproduce against `accept-prebattle.json`'s
segments — checked by direct arithmetic on the committed file, not
assumed: e.g. §6 cites the 3rd-RENT-confirm press at tick 202, but
`accept-prebattle.json`'s own segments place it at tick 188). Treat §6's
frame numbers as approximate deltas only, never as absolute ticks to
target in a new trace.

### 1. Canonical script + why tick 400

**A-press #1 at tick 400** closes "Right this way, please!" (any tick in
`accept-prebattle.json`'s own confirmed 361-391 stable window, and
onward, works — chosen here, per the step brief's own suggestion, rather
than the earliest legal tick, for margin against the input-drop gate
pattern already seen on other screens, e.g. S4's summary-page `B`-drop).
Two more player-paced gates follow, each pressed only after its message
is confirmed pixel-stable for several ticks (not at the instant of
completion, same margin-for-safety rationale): **A-press #2 at tick 838**
(closes the opponent's overworld speech, "IT'S WAY TOO / HOT HERE") and
**A-press #3 at tick 1420** (advances past "BUG CATCHER DESTIN would like
to battle!♥"). Total trace: 1886 frames, ending well inside the settled
first-action-menu idle window (see §4).

### 2. Frame boundaries (dense-capture-verified, not sampled)

Every boundary below was pinned by **every-frame** capture density in
its local window (not the 6-14-frame sampling this file's §6 used), via
two chained oracle runs: a sparse (6-frame-stride) locator pass, then the
committed trace's own dense windows around each located boundary.
sha256 = first 8 hex chars unless spot-cited in full.

- **A-press #1 registration**: tick 400-402 still shows "Right this way,
  please!" byte-identical (`5e8a5333`, full:
  `5e8a53338048580102ec0a5ab86d5cfa85ac7413625b44544ceb2b51a9b8b16e`);
  first visibly-changed frame is **403** (`1ecfabf2`,
  `1ecfabf2b5e8b35f0cc4bfaf243de4860e1948daffe6cfa43d7300773ac25ebb`) —
  message-close + walk-start register 3 ticks after the press's first
  frame (2-frame pulse at 400-401, +1 more tick before the engine acts on
  it, consistent with the 1-tick input-registration lag pattern seen
  elsewhere in this codebase, e.g. `confirmReveal`'s own closing-tick
  lag).
- **Walk to battle room**: continuous per-frame pixel change 403-500 (own
  dense capture, every frame in this range distinct).
- **Warp fade (black) start/end**: solid black (`d8b44303`, full
  `d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a`)
  from tick **501 through 519** (19 frames), room-visible first frame
  **520** (`436c0643`).
- **Room-entry walk / scientists / opponent walk-in**: continuous change
  520-~740 (dense-sampled at stride 3 in this window; no repeated shas
  observed).
- **Opponent overworld speech settled**: "IT'S WAY TOO / HOT HERE"
  byte-identical (`e93719bf`) from tick **~740 through 838** (98+ frames
  confirmed stable, well past the A-press #2 gate) — screenshot-confirmed
  matching this file's §1 finding verbatim.
- **A-press #2 registration**: message-closing visual change confirmed by
  tick 843 (`a15c8dc2`) — the opponent-speech box is gone.
- **Transition start (screen goes solid black)**: tick **1031** through
  **1073** (43 frames), same sha as the warp-fade black
  (`d8b44303`/`d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a`
  — confirmed byte-identical to frame 501's capture, i.e. a genuinely flat
  black framebuffer both times, not merely similar).
- **First transition visual (post-black)**: tick **1077**
  (`b6f921fd19044324c787d408950956814e47400a6786b2a2650c27c7fd331b95`) — a
  horizontal streak/line-wipe pattern (screenshot-confirmed), continuous
  per-frame change through at least tick 1197 (stride-4 dense sample, no
  two consecutive samples equal).
- **Transition end / trainer assembly (RESOLVED, S6 slice 1b — dense
  every-frame pass, ticks 1190-1300)**: the background + trainer sprite
  slide-in settles at tick **1227** (`b2bcc9d0d32ed36944313c7c0605292e7cebc98b8048571072188e7618e856b5`),
  held through **1229** (2-tick plateau, same sha) before the message
  window's text starts printing at ~1231 — this is the "battle scene
  settled, modulo text" boundary the previous loose 1200-1290 bound was
  meant to capture. Text milestones from there (all screenshot-confirmed):
  "BUG CATCHER DESTI" mid-print at 1250; **"...would like to battle!" (no
  heart yet) fully printed, held ticks 1272-1273**
  (`fb70157c18d155dae81005925f81ba3ef5ac2afb6f949e08d1283663068d795a`);
  the **heart glyph "♥" appears at tick 1274**
  (`81f5fbbcfa5ff51c99be24a21fa35ef07fee2b8c9609ec91b29443573ace7e39`).
  **Correction**: the previously-cited "tick 1290, fully printed with
  heart, `17e1960c...`" was a **transient**, not the settled state — it
  only holds ticks 1285-1290 (6 frames) before changing again. The text
  box's true steady state is reached at tick **1292**
  (`19ccf0c6e493a42b4788f9e912d49d2ce4b288b2baae0d08468e2adaf824a262`),
  and even that isn't a single fixed sha: it's the *first* phase of a
  repeating **4-phase, ~36-tick-period idle cycle**
  (`19ccf0c6`→`446ea38f`→`cb0e9fd4`→`446ea38f`→repeat, confirmed by
  direct sha comparison at 2-tick stride through tick 1420, i.e. through
  the entire remainder of this trace's "would like to battle!" hold) —
  the **same 4-phase/36-tick signature** later documented for the
  settled action-menu idle animation below, strongly suggesting a single
  shared engine-wide UI blink/pulse timer (candidate: the small
  waiting-for-input prompt indicator or the party-ball-count icons; not
  pinned to a specific sprite/OAM entry this slice). Net effect: "fully
  printed with heart" is correctly described as **input-gated and
  pixel-stable only modulo this idle cycle**, not byte-identical — the
  old single-sha claim undercounted its own steady state.
- **Intro text milestone — opponent send-out**: "BUG CATCHER DESTIN sent
  out" mid-print at tick 1450 (screenshot); "...GROVYLE!" fully printed +
  opponent healthbox (Lv50, green HP bar) settled by tick **1522**
  (`6cb7ab1eb59438f1759e28779b0889c234bc9435edefcbe5ada43ed6e1e0b9f7`).
- **Intro text milestone — player send-out**: "Go! ONIX!" + player
  healthbox showing **117/117** HP (matching this file's §5 RAM-dumped
  player table exactly) settled by tick **1696**, byte-identical through
  at least 1741 (`6d2e0945440e9458d6fcab92a9f6019b7358a33c3ac2687a4ef0df9aa6a6db20`
  at both 1696 and 1741 — confirmed via direct sha comparison, not
  assumed).
- **First action menu fully settled (pixel-stable)**: message-box clears
  ticks 1742-1749 (several short-lived transitional frames, screenshot:
  tick 1742 shows a blank message box); **"What will ONIX do?" +
  FIGHT/BAG/POKéMON/RUN, cursor on FIGHT, is fully drawn by tick 1750**
  (`fd778a4bb67c314116e902d9d30abff50cc4526f0ba5776f20acf1b4312b960c`,
  screenshot-confirmed) and stays pixel-stable in a repeating **4-phase,
  36-frame-period idle cycle** from there through the trace's end at tick
  1885 (`d223d98a2da991439b96b110023841dbea049342e3d5a6c199a5fab74db28303`)
  — confirmed by direct sha comparison across the whole tail, not
  estimated; consistent with this file's own §6 "steady ~28-frame-period
  4-value sha cycle" observation (the period discrepancy, 36 vs ~28, is
  fully explained by that session's coarser 6-frame sampling grid
  aliasing the true period, not a real difference).

### 3. RNG checkpoints (RAM-probed, `tools/probe/ram-probe.py`)

Watched `gRngValue` (u32, `0x3005d80`) and `gBattleTypeFlags` (u32,
`0x2022fec`) every tick from 395 onward, plus `gEnemyParty[0..2]`'s
`personality` field (`gEnemyParty` = `0x2024744`, `sizeof(struct
Pokemon)` = 100 bytes/`0x64`, confirmed via `nm -S` on the pinned ELF —
`gEnemyParty` symbol size `0x258` / 6 slots = `0x64` — not assumed from
the struct literal alone, matching this file's own §5 gotcha about
verifying RAM layout independently).

- **1/VBlank cadence** (`gRngValue = 1103515245*gRngValue + 24691`,
  confirmed against `reference/pokeemerald/src/random.c` +
  `include/random.h`) holds from the A-press (tick 400) through tick
  **1044** — with legitimate multi-step bursts super-imposed on top of
  the baseline single-step-per-tick pattern at ticks 509→511 (3-4 extra
  steps, source not identified this session — likely an overworld
  sprite/NPC-movement RNG consumer, out of scope to chase further this
  slice) and the battle-setup bursts in §3.1 below.
  cadence at (a) A-press: `gRngValue`@400 = 3164754381 (recorded as of
  tick 395 onward; 400 itself sits inside the normal 1-step cadence). (b)
  message close (tick 403): mid-cadence, no special value. (c) transition
  start (tick 1031, first black frame): mid-cadence — the RNG-heavy work
  (§3.1) already **completed by tick 869**, well before the black screen;
  this is a **correction to this file's §4 point 3**, which assumed the
  nature-rerolls + transition-select "happen instantaneously on this same
  frame" as the black-screen transition start. RAM evidence: they instead
  run **during the heal-icon animation**, ~162-190 ticks *before* the
  screen goes black (see §3.1).
- **Cadence stops** (auto-advance ends) after tick **1044→1045**: `gRngValue`
  frozen at 870742024 for ticks 1045-1065 (21 ticks, still *before* any
  transition visual — the transition's own line-wipe effect doesn't start
  until tick 1077, §2). One explicit single `Random()` draw fires at tick
  **1065→1066** (1 LCG step) — matches this file's §4 point 5's first
  entry, `gRandomTurnNumber = Random()` at `BattleStartClearSetData`, by
  position (right as the battle-init state machine would be running).
  Then a **675-tick freeze** (1066-1740, `gRngValue` = 803466203
  throughout) — the genuine "no per-frame RNG in battle" window, spanning
  the entire transition visual + intro text + both send-outs.
- **In-battle first action menu** (tick 1750, settled): `gRngValue` =
  3485459011 (frozen since tick 1747, see next point).
- **Correction to this file's §4 point 5** (documented precisely per the
  step brief's instruction, not asserted from a guess): the dossier
  claims exactly **two** explicit draws survive the per-frame freeze
  (`BattleStartClearSetData` + `TryDoEventsBeforeFirstTurn`). RAM shows
  **four** distinct draw events after the main freeze: tick 1065→1066 (1
  step), tick 1740→1741 (1 step), tick 1744→1745 (2 steps), and tick
  1746→1747 (5 steps) — 9 total `Random()` calls, not 2.

  **RESOLVED (S6 slice 1b) — the 1740→1741 draw, not the 1747 one, is
  `TryDoEventsBeforeFirstTurn`'s**: watching `gBattleMainFunc`
  (`0x03005d04`) and `gBattleControllerExecFlags` (`0x02024068`)
  alongside `gRngValue` shows `gBattleMainFunc = TryDoEventsBeforeFirstTurn`
  (`nm`: `0803b628 t TryDoEventsBeforeFirstTurn`) continuously from at
  least tick 1690 through **1740**, with `gBattleControllerExecFlags == 1`
  the whole time (busy — this is the player-send-out ball-throw
  controller command from `BattleIntroPlayer1SendsOutMonAnimation`,
  `battle_main.c:3776-3813`, still finishing; matches this file's §2
  observation that "Go! ONIX!" holds byte-identical 1696 through at least
  1741). `gBattleControllerExecFlags` clears to `0` at tick 1740; on the
  very next sampled tick, **1741**, `gRngValue` has advanced 1 step *and*
  `gBattleMainFunc` already reads `HandleTurnActionSelectionState` — i.e.
  `TryDoEventsBeforeFirstTurn` ran its entire body (the `GetWhoStrikesFirst`
  turn-order sort at `battle_main.c:3858`, the no-op weather/switch-in-
  ability/item checks §4 point 6 already ruled out, and the final
  `gRandomTurnNumber = Random()` at `battle_main.c:3923`) to completion in
  the single tick it first became unblocked, and reassigned
  `gBattleMainFunc` as its last act — so **the 1740→1741 draw *is* the
  previously-cited `TryDoEventsBeforeFirstTurn` draw**, not the 1747 one
  as this file previously guessed by proximity to the menu.

  **NARROWED, not fully pinned — the 1745 and 1747 draws are inside
  `HandleTurnActionSelectionState`, not before it**: both occur while
  `gBattleMainFunc == HandleTurnActionSelectionState`
  (`nm`: `0803be74 t HandleTurnActionSelectionState`).
  `gBattleControllerExecFlags` goes to `3` (both battler-0/player and
  battler-1/opponent bits set, `MARK_BATTLE_CONTROLLER_ACTIVE_ON_LOCAL`
  via `MarkBattlerForControllerExec`, `battle_util.c:856-862`) at tick
  1743 — matching `STATE_BEFORE_ACTION_CHOSEN`'s `BtlController_EmitChooseAction`
  call for both battlers (`battle_main.c:4168`, dispatching the player's
  menu draw *and* the opponent AI's move/switch decision in the same
  pass). The **2-step draw at 1745** happens while both bits are still
  set; the opponent's bit (battler 1) clears between 1745 and 1746,
  bracketing it tightly around when `OpponentHandleChooseAction` →
  `AI_TrySwitchOrUseItem` → `ShouldSwitch()`
  (`src/battle_ai_switch_items.c:429-527`) would run and finish — that
  chain is genuinely dense with `Random()`-gated pre-battle switch
  heuristics (10 call sites across the file, e.g.
  `ShouldSwitchIfWonderGuard`'s `Random() % 3 < 2` at :106,
  `FindMonThatAbsorbsOpponentsMove`'s `Random() % 3 != 0` at :128, more at
  :206,229,236,248,282,305,416,660) gated behind type/status
  preconditions not hand-verified this slice (e.g. Grovyle's BRICK_BREAK
  is nominally super-effective on Onix's Rock/Ground typing, which could
  route into `HasSuperEffectiveMoveAgainstOpponents`-gated checks) — so
  "2 of these gates fired their `Random()` call, the rest short-circuited
  before reaching theirs" is a **plausible, source-grounded fit**, not a
  confirmed one (no single-step trace was taken to confirm which
  specific gate(s) actually ran). `PlayerHandleChooseAction`/
  `HandleChooseActionAfterDma3`/`HandleInputChooseAction`
  (`src/battle_controller_player.c`) contain **zero** `Random()` calls
  (full-file grep), ruling out the player-side controller as a source for
  either draw. The **5-step draw at 1747** is the more genuinely open
  question: it fires strictly *after* the opponent's controller-busy bit
  has already cleared (i.e. after `AI_TrySwitchOrUseItem` has already
  returned and called `OpponentBufferExecCompleted`), with only the
  player's bit (`exec == 1`) still set — so it cannot be the AI chain
  above (already finished), cannot be the player controller (no `Random()`
  calls anywhere in that file), and cannot be `TryDoEventsBeforeFirstTurn`
  re-entering (already reassigned `gBattleMainFunc` 6 ticks earlier, confirmed
  above). Not pinned to a call site this slice — would need a PC-level
  single-step trace across ticks 1746-1747, out of this slice's time
  budget. Any Tier-1 test pinning "exact post-freeze RNG draw count" should
  treat the 1741 draw as fully explained and the 1745/1747 pair as an
  open item, not guess a mechanism for either.

**3.1. Opponent personality rolls + transition pick** (all embedded in
the **heal-icon animation window**, ticks 840-1030 — NOT at the
transition's black-screen tick as §4 point 3 assumed; see correction
above):

| mon | tick (rejection loop completes) | total LCG steps this tick | rejection iterations | `personality` | `personality % 25` (nature) | expected nature (§5 table) |
|---|---|---|---|---|---|---|
| Grovyle (slot 1) | 842→**843** | 57 (=1 baseline + 28×2) | 28 | 1094072807 | 7 = RELAXED | RELAXED ✓ |
| Murkrow (slot 2) | 853→**854** | 33 (=1 baseline + 16×2) | 16 | 3475344024 | 24 = QUIRKY | QUIRKY ✓ |
| Pidgeotto (slot 3) | 860→**861**\* | 191 (=1 baseline + 95×2) | 95 | 3971699699 | 24 = QUIRKY | QUIRKY ✓ |

\*Pidgeotto's `gRngValue` jump lands on tick 861, but the RAM write of
`gEnemyParty[2].personality` is observed one tick later (862) — a 1-tick
write-lag not seen for the other two mons, unresolved this session (low
risk: the *value* is confirmed correct via the nature cross-check).

All three nature values are **exact cross-checks against this file's §5
table** (independently-sourced expected natures), giving high confidence
in both the offset math (`gEnemyParty[i]` stride 100 bytes, personality
at offset 0) and the RNG-consumption model (`Random32()` = 2×`Random()`
combined per `include/random.h`). Total: 28+16+95 = **139 rejection
iterations** (278 `Random()` calls) across the 3 mons for this specific
trace — a huge, real range (16 to 95) illustrating why this is
genuinely session-RNG-dependent, not a fixed constant, exactly as this
file's §0/§7 risk 2 already warned.

**Transition selection**: one explicit `Random()` at tick **868→869** (2
total LCG steps that tick = 1 baseline + 1 select), immediately after the
3rd mon's rejection loop finishes (tick 862) — confirms this file's §4
point 3's *ordering* claim (transition-select immediately follows the 3
nature loops) even though the *timing* (relative to the black screen) was
wrong.

**RESOLVED (S6 slice 1b), by direct RAM read instead of LCG-order
inference**: `GetSpecialBattleTransition`'s return value is passed
straight into `BattleTransition_StartOnField(transitionId)`
(`battle_setup.c:864-909` → `battle_tower.c:2099`), which stores it in
`LaunchBattleTransitionTask` as `gTasks[taskId].data[1]`
(`#define tTransitionId data[1]`, `battle_transition.c:1038,1059`) on the
task running `Task_BattleTransition` — no intermediate global, so this
field is the ground truth, not an inference. `struct Task`
(`include/task.h:13-21`: `func`(4)+`isActive`/`prev`/`next`/`priority`(4)+
`data[16]`(32) = 40 bytes/`0x28`) lives at `gTasks` (`0x03005e00`,
`nm`'d — no linker-map entry for a plain array symbol, cross-checked
against `include/task.h`'s `NUM_TASKS=16`/`NUM_TASK_DATA=16`). Scanning
all 16 slots' `func`+`data[1]` fields (`tools/probe/ram-probe.py`, watch
list of raw `0x03005e00+i*0x28` addresses — the tool's existing
label-or-hex-address resolver needed no changes) from tick 1010 onward
found slot 6 holding `func = 0x08145fa9` (thumb-bit-set
`Task_BattleTransition`, `nm`: `08145fa8 t Task_BattleTransition`) with
`data[1] = 34` continuously from the first sampled tick — a second pass
starting at tick 850 traced the value back further: slot 6 already shows
`func=Task_BattleTransition, data[1]=34` at tick **869** itself (the same
tick as the RNG draw above), stable through the transition's entire
lifetime. `34` decodes via `include/battle_transition.h`'s enum (`B_TRANSITION_BLUR=0`
… counting to `B_TRANSITION_FRONTIER_CIRCLES_MEET=34`) as
**`B_TRANSITION_FRONTIER_CIRCLES_MEET`** — i.e. the *first* candidate
computed previously (`Random() % 12` = 22624 % 12 = 4 →
`sBattleTransitionTable_BattleFrontier[4]`), confirming the tick's 2nd
LCG application (not the 1st) was the actual select call — but this is
now known from the game's own stored value, not inferred from call order.

**Independent confirmation via the dispatched function pointer** (stronger
than the numeric id alone, since it's the literal effect that ran, not a
table lookup that could itself be mis-transcribed): tracing all 16 task
slots' `func` fields from tick 850 shows the exact intended dispatch
chain from `battle_transition.c`'s `sTasks_Intro`/`sTasks_Main` tables
playing out load-bearing-for-load-bearing — slot 5 = `Task_StartBattleAfterTransition`
(created tick 869, matching `battle_tower.c:2097`'s sibling `CreateTask`
call the same frame as `BattleTransition_StartOnField`); slot 8 =
`Task_BattleTransition_Intro` (the shared gray-flicker intro every
transition runs, `CreateIntroTask(0,0,3,2,2)`, `battle_transition.c:1121`)
toggling `tState` 0↔1 every 8 ticks from 869 through 917 (3 fade-to-gray/
fade-from-gray cycles × 16 ticks = 48, matching `TransitionIntro_FadeToGray`/
`_FadeFromGray`'s math exactly); slot 7 becomes **`func =
0x081dabdd` = thumb-bit-set `Task_FrontierCirclesMeet`** (`nm`:
`081dabdc T Task_FrontierCirclesMeet`) at tick 918 (the tick after the
intro flicker's `IsIntroTaskDone()` finally returns true), its own
`tState` (`data[0]`) progressing exactly per `sFrontierCirclesMeet_Funcs[]`
(`battle_transition_frontier.c:122-129`): `Circles_Init` (918-919) →
`CirclesMeet_CreateSprites` (920, `tCircle1/2/3SpriteId` = sprites 10/11/12)
→ `WaitForLogoCirclesAnim` (920-970, the 3 sprites sliding to their fixed
targets) → `FadeInCenterLogoCircle` (970-1017, 16-tick blend ramp + 31-tick
hold) → `CirclesMeet_End` (1018 onward, triggers the final
`BeginNormalPaletteFade` to black).

**Pixel confirmation, screenshot-verified** (a dense oracle pass, ticks
869-1090, `captureFrames` at the state-machine milestones above): tick
**960** shows 3 large blue circle sprites converging from the top edge and
both bottom corners toward the screen center — an unambiguous match for
`CirclesMeet_CreateSprites`' 3 sliding sprites (`sTargetX/Y` = `(120,45)`,
`(89,97)`, `(151,97)`, `SpriteCB_LogoCircleSlide`, §2 above); tick **990**
shows them fully overlapped into the assembled center-logo blob shape
(matches `FadeInCenterLogoCircle` blending BG0's assembled-logo tilemap
in over the sprites); by tick **1025** the shape is fading toward black
(the final `BeginNormalPaletteFade`); tick **1031** is solid black
(`d8b44303`, already documented in §2 below) — this **is** the transition's
own black outro, not yet the trainer-slide.

**Corrects the earlier framing of the "doesn't match circles" concern**:
the captured frames 1077-1197 (horizontal streak/line-wipe, flagged as
inconsistent with the circles mechanism) are **not part of the transition
effect at all**. RAM shows `Task_FrontierCirclesMeet` (slot 7) and the
outer `Task_BattleTransition` (slot 6) both already gone by tick 1044 —
confirmed by a mass reset of task slots 0-8 to `TaskDummy`
(`0x080a9179`, `nm`: `080a9178 T TaskDummy`) at that exact tick, which is
`CB2_InitBattleInternal`'s `ResetTasks()` call (`battle_main.c:619-710`)
firing the **same tick** this file's own RNG-freeze tick (`gMain.inBattle`
becoming `TRUE`, `battle_main.c:703`) was already independently pinned at
(1044→1045, see below) — two unrelated RAM signals landing on the same
tick is strong cross-validation, not coincidence. So by the time the
1077+ streak frames are captured, the whole transition subsystem has
already been destroyed for over 30 ticks; those frames are
`BeginBattleIntro`'s own background/trainer-slide-in assembly (§2 below),
an entirely different code path with its own not-yet-identified visual
mechanism — **not** a mismatch in the transition identification, which is
now fully resolved.

`gBattleTypeFlags`: `0x80008` (`BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY`)
already set by tick 1015 (confirms §0's "set before the transition even
starts" claim), gains `BATTLE_TYPE_IS_MASTER` (`0x4`) at tick **1047** —
2 ticks after the per-frame RNG freeze begins (1045); noted as a
corroborating timestamp, not claimed as the freeze's direct cause (that's
`gMain.inBattle`, a different field, not probed this session).

### 4. Risk / follow-up notes for this slice

1. **RESOLVED (S6 slice 1b)**: transition-visual identification is no
   longer a 2-of-12 RNG-math guess — a direct RAM read of
   `gTasks[6].data[1]` (`tTransitionId`) pins it to `34 =
   B_TRANSITION_FRONTIER_CIRCLES_MEET`, independently corroborated by the
   dispatched function pointer (`gTasks[7].func` becomes
   `Task_FrontierCirclesMeet`) and by screenshot confirmation (3 blue
   circle sprites converging at ticks 960-990). See §3.1.
2. **RESOLVED (S6 slice 1b)**: transition-end (trainer/background fully
   assembled, modulo text) is pinned to tick **1227** (2-tick plateau
   through 1229) via a dense every-frame pass, replacing the old
   1200-1290 bound; the full text-print-through-heart-through-idle-cycle
   milestone chain is also pinned. See §2.
3. **NARROWED, not fully resolved (S6 slice 1b)**: of the 2 previously
   "unexplained" post-freeze draws, the 1740→1741 one is now fully
   explained (it's `TryDoEventsBeforeFirstTurn`'s own draw, RAM-confirmed
   via `gBattleMainFunc` — the dossier's earlier attribution of that role
   to the 1747 draw was wrong). The 1744→1745 (2-step) draw has a
   plausible, source-grounded but unconfirmed fit
   (`AI_TrySwitchOrUseItem`'s dense `Random()`-gated switch heuristics,
   bracketed by the opponent controller's busy-bit clearing). The
   1746→1747 (5-step) draw remains genuinely unpinned — the AI chain,
   the player controller, and `TryDoEventsBeforeFirstTurn` are all
   source-ruled-out as its origin; would need a PC-level single-step
   trace. See §3.
4. The ~509-511 and any other small pre-battle RNG bursts outside the
   documented heal-icon window were not individually chased (out of
   scope for this slice — flagged, not silently dropped).
5. This trace's specific transition/personality values are **this
   script's own**, not universal constants (§0's already-established
   point) — a differently-paced trace (different idle-frame counts before
   each of the 3 A-presses) will draw a different transition and
   different personalities, though the same *natures* (fixed by the
   rejection loop's exit condition) and the same *species/moveset/IVs*.

**Papercut retired**: `PAPERCUTS.md`'s "No committed oracle trace for the
battle-1 bring-up path" entry is superseded by
`tools/compare/traces-groundtruth/battle1-intro.json` — the supervisor
owns deleting that entry.
