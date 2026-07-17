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
