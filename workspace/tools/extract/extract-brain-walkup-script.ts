// Dev-time, source-only extraction of the Frontier Brain (Noland) walk-up
// script ground truth for the Battle Factory: the shared "call from the
// boss" PreBattleRoom scene, the BattleRoom entrance, and the silver/gold
// divergent personality-speech boxes, front door to the DoSpecialTrainerBattle
// handoff. This is data-leg only - no engine wiring, no rendering. See
// docs/noland-walkup-dialogue-scoping.md for the ground-truth memo this
// extractor was built to pin (its §1 tables are the extraction spec; every
// `required()` contract below anchors a claim from that memo against the
// live decomp source). Run with:
//   node --experimental-strip-types tools/extract/extract-brain-walkup-script.ts
//   node --experimental-strip-types tools/extract/extract-brain-walkup-script.ts --out-dir /tmp/out
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");

const outIndex = process.argv.indexOf("--out-dir");
if (outIndex !== -1 && !process.argv[outIndex + 1]) throw new Error("--out-dir needs a directory");
const OUT_DIR = outIndex === -1 ? join(ROOT, "src", "data", "gen") : resolve(process.argv[outIndex + 1]!);

function source(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function required(text: string, fragment: string): void {
  if (!text.includes(fragment)) throw new Error(`source contract changed: ${JSON.stringify(fragment)}`);
}

// Matches the same convention as extract-factory-terminal-messages.ts's
// stringAt: concatenate consecutive `.string "..."` lines under a label,
// preserving \n / \p / \l / $ as the literal 2-char ROM text macros the
// source spells them as (never interpreted as real control characters here).
function stringAt(text: string, label: string): string {
  const match = new RegExp(`^${label}:\\n((?:\\s*\\.string .+\\n)+)`, "m").exec(text);
  if (!match) throw new Error(`missing string ${label}`);
  const parts = [...match[1]!.matchAll(/\.string\s+"([^"]*)"/g)].map((item) => item[1]!);
  if (parts.length === 0) throw new Error(`empty string ${label}`);
  return parts.join("");
}

// src/strings.c menu-option labels are plain C string literals, not ROM
// `.string` macros - no control-code macros to preserve here.
function cStringAt(text: string, label: string): string {
  const match = new RegExp(`const u8 ${label}\\[\\]\\s*=\\s*_\\("([^"]*)"\\);`).exec(text);
  if (!match) throw new Error(`missing C string ${label}`);
  return match[1]!;
}

// Splits a verbatim ROM string (still carrying its trailing literal "$" EOS
// marker) into \p-delimited pages. \n and \l remain literal in-page macros.
function pageSplit(label: string, raw: string): string[] {
  if (!raw.endsWith("$")) throw new Error(`text ${label} missing EOS $: ${raw}`);
  return raw.slice(0, -1).split("\\p");
}

// Extracts an `applymovement`-style step list: the tab-indented macro lines
// following a `Label:` header, in source order, with the terminal `step_end`
// dropped (it is an assembler terminator, not a game step).
function moveAt(text: string, label: string): string[] {
  const match = new RegExp(`^${label}:\\n((?:\\t\\S.*\\n)+)`, "m").exec(text);
  if (!match) throw new Error(`missing movement ${label}`);
  const steps = match[1]!
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (steps.at(-1) !== "step_end") throw new Error(`movement ${label} missing step_end terminator`);
  return steps.slice(0, -1);
}

const preBattleRoom = source("data", "maps", "BattleFrontier_BattleFactoryPreBattleRoom", "scripts.inc");
const battleRoom = source("data", "maps", "BattleFrontier_BattleFactoryBattleRoom", "scripts.inc");
const battleRoomEvents = source("data", "maps", "BattleFrontier_BattleFactoryBattleRoom", "map.json");
const preBattleRoomHeader = source("data", "maps", "BattleFrontier_BattleFactoryPreBattleRoom", "header.inc");
const battleRoomHeader = source("data", "maps", "BattleFrontier_BattleFactoryBattleRoom", "header.inc");
const frontierUtil = source("src", "frontier_util.c");
const scriptMenuData = source("src", "data", "script_menu.h");
const strings = source("src", "strings.c");
const frontierUtilConsts = source("include", "constants", "frontier_util.h");
const scriptMenuConsts = source("include", "constants", "script_menu.h");
const eventMacros = source("asm", "macros", "event.inc");

// --- Contracts: pin the exact source lines this memo/extraction depends on ---
required(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_ReturnToRoomFromBattle::");
required(preBattleRoom, "frontier_getbrainstatus");
required(preBattleRoom, "goto_if_eq VAR_RESULT, FRONTIER_BRAIN_NOT_READY, BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskReadyForRegularOpponent");
required(preBattleRoom, "playse SE_POKENAV_CALL");
required(preBattleRoom, "multichoice 19, 4, MULTI_GO_ON_RECORD_REST_RETIRE, TRUE");
required(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapBeforeHead::");
required(preBattleRoom, "msgbox BattleFrontier_BattleFactoryPreBattleRoom_Text_LikeToSwapMon, MSGBOX_YESNO");
required(preBattleRoom, "warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM, 6, 11");
required(battleRoom, "setobjectxyperm LOCALID_FACTORY_BATTLE_OPPONENT, 7, 9");
required(battleRoom, "setobjectxyperm LOCALID_FACTORY_BATTLE_OPPONENT, 7, 1");
required(battleRoom, "hideobjectat LOCALID_FACTORY_BATTLE_OPPONENT, MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM");
required(battleRoom, "BattleFrontier_BattleFactoryBattleRoom_EventScript_EnterRoomFactoryHeadBattle::");
required(battleRoom, "msgbox BattleFrontier_BattleFactoryBattleRoom_Text_GetAMoveOn, MSGBOX_DEFAULT");
required(battleRoom, "call BattleFrontier_BattleFactoryBattleRoom_EventScript_ScientistsFaceBattle");
required(battleRoom, "case FRONTIER_BRAIN_GOLD, BattleFrontier_BattleFactoryBattleRoom_EventScript_IntroNolandGold");
required(battleRoom, "case FRONTIER_BRAIN_STREAK, BattleFrontier_BattleFactoryBattleRoom_EventScript_BattleNolandSilver");
required(battleRoom, "case FRONTIER_BRAIN_STREAK_LONG, BattleFrontier_BattleFactoryBattleRoom_EventScript_BattleNolandGold");
required(battleRoom, "frontier_get FRONTIER_DATA_HEARD_BRAIN_SPEECH");
required(battleRoom, "setvar VAR_0x8004, SPECIAL_BATTLE_FACTORY");
required(battleRoom, "special DoSpecialTrainerBattle");
required(frontierUtil, "[FRONTIER_FACILITY_FACTORY] = {OBJ_EVENT_GFX_NOLAND,  FALSE},");
required(frontierUtil, "[FRONTIER_FACILITY_FACTORY] = {1 << 8, 1 << 9},");
required(frontierUtil, "gSpecialVar_Result = gSaveBlock2Ptr->frontier.battledBrainFlags & sBattledBrainBitFlags[facility][hasSymbol];");
required(frontierUtil, "gSaveBlock2Ptr->frontier.battledBrainFlags |= sBattledBrainBitFlags[facility][hasSymbol];");
required(frontierUtilConsts, "#define FRONTIER_BRAIN_NOT_READY   0");
required(frontierUtilConsts, "#define FRONTIER_BRAIN_SILVER      1");
required(frontierUtilConsts, "#define FRONTIER_BRAIN_GOLD        2");
required(frontierUtilConsts, "#define FRONTIER_BRAIN_STREAK      3");
required(frontierUtilConsts, "#define FRONTIER_BRAIN_STREAK_LONG 4");
required(scriptMenuConsts, "#define MULTI_GO_ON_RECORD_REST_RETIRE     103");
required(scriptMenuData, "static const struct MenuAction MultichoiceList_GoOnRecordRestRetire[] =");
required(strings, 'const u8 gText_GoOn[] = _("GO ON");');
required(strings, 'const u8 gText_Record2[] = _("RECORD");');
required(strings, 'const u8 gText_Rest[] = _("REST");');
required(strings, 'const u8 gText_Retire[] = _("RETIRE");');
required(strings, 'const u8 gText_Yes[] = _("YES");');
required(strings, 'const u8 gText_No4[] = _("NO");');
required(preBattleRoomHeader, ".2byte MUS_B_FACTORY");
required(battleRoomHeader, ".2byte MUS_B_FACTORY");
required(eventMacros, ".macro multichoice x:req, y:req, multichoiceId:req, ignoreBPress:req");
required(battleRoomEvents, '"local_id": "LOCALID_FACTORY_BATTLE_SCIENTIST_1"');

function messageEvent(
  text: string,
  label: string,
  boxType: "MSGBOX_DEFAULT" | "MSGBOX_YESNO" | "message",
  extra: Record<string, unknown> = {},
) {
  const raw = stringAt(text, label);
  const pages = pageSplit(label, raw);
  return { kind: "message" as const, label, boxType, raw, pages, pageCount: pages.length, ...extra };
}

function movementEvent(text: string, label: string, subject: string, extra: Record<string, unknown> = {}) {
  const steps = moveAt(text, label);
  return { kind: "movement" as const, label, subject, steps, stepCount: steps.length, ...extra };
}

// --- §1.1 PreBattleRoom: the shared "call from the boss" scene ---
const preBattleRoomCallScene = {
  label: "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_ReturnToRoomFromBattle",
  anchor: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:54-77",
  trigger: "fires on every warp back into PreBattleRoom with VAR_0x8006==1 (i.e. after every battle, brain or ordinary)",
  events: [
    {
      kind: "effect" as const,
      op: "factory_setopponentmons; factory_resethelditems",
      nonBrainSpecific: true,
    },
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_LetUsRestoreMons", "MSGBOX_DEFAULT", {
      nonBrainSpecific: true,
      note: "generic post-battle line, fires after every battle regardless of brain-ready status",
    }),
    { kind: "effect" as const, op: "playfanfare MUS_HEAL; waitfanfare; special HealPlayerParty", nonBrainSpecific: true },
    {
      kind: "branch" as const,
      op: "frontier_getbrainstatus",
      note: "if FRONTIER_BRAIN_NOT_READY, goes to AskReadyForRegularOpponent instead (ordinary walk-up, out of scope). Otherwise continues below - identically for battle 21 (first silver), every silver repeat, battle 42 (first gold), and every gold repeat.",
    },
    { kind: "effect" as const, op: "playse SE_POKENAV_CALL; waitse" },
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_WaitFewMoments", "MSGBOX_DEFAULT"),
    movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_AttendantMoveToReceiveCall", "attendant"),
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_UnderstoodSirWillDo", "MSGBOX_DEFAULT"),
    movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_AttendantReturnToPlayer", "attendant"),
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_MessageFromHeadComeRightNow", "MSGBOX_DEFAULT"),
    { kind: "delay" as const, frames: 16 },
  ],
};

const multichoiceOptions = {
  goOn: cStringAt(strings, "gText_GoOn"),
  record: cStringAt(strings, "gText_Record2"),
  rest: cStringAt(strings, "gText_Rest"),
  retire: cStringAt(strings, "gText_Retire"),
};
const yesNoOptions = { yes: cStringAt(strings, "gText_Yes"), no: cStringAt(strings, "gText_No4") };

const askReadyForHead = {
  label: "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskReadyForHead",
  anchor: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:349-361",
  events: [
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_PreparedToFaceHead", "message"),
    {
      kind: "multichoice" as const,
      id: "MULTI_GO_ON_RECORD_REST_RETIRE",
      x: 19,
      y: 4,
      ignoreBPress: true,
      options: [multichoiceOptions.goOn, multichoiceOptions.record, multichoiceOptions.rest, multichoiceOptions.retire],
      branches: { 0: "AskSwapBeforeHead", 1: "AskRecordBattle", 2: "AskPauseChallenge", 3: "AskRetireChallenge", MULTI_B_PRESSED: "AskReadyForHead (loop)" },
      note: "mandatory-path assumption below takes branch 0 (\"GO ON\"); RECORD/REST/RETIRE are the general pre-battle menu system shared with ordinary battles, out of scope for this brain-walk-up data leg per docs §2/§4.",
    },
  ],
};

const askSwapBeforeHead = {
  label: "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapBeforeHead",
  anchor: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:370-376",
  events: [
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_CantTellAnythingAboutHead", "MSGBOX_DEFAULT"),
    {
      ...messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_LikeToSwapMon", "MSGBOX_YESNO"),
      kind: "yesno" as const,
      options: [yesNoOptions.yes, yesNoOptions.no],
      branches: { NO: "EnterBattleRoom", YES: "SwapMons (out of scope: separate swap-screen feature)", MULTI_B_PRESSED: "EnterBattleRoom" },
    },
  ],
};

const enterBattleRoom = {
  label: "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterBattleRoom",
  anchor: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52",
  events: [
    messageEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Text_RightThisWay", "MSGBOX_DEFAULT"),
    { kind: "effect" as const, op: "closemessage; call BattleFrontier_EventScript_GetLvlMode" },
    {
      kind: "movementVariant" as const,
      variant: "FRONTIER_LVL_50",
      guide: movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_GuideWalkToBattleRoomLv50", "attendant-guide"),
      player: movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_PlayerWalkToBattleRoomLv50", "player"),
    },
    {
      kind: "movementVariant" as const,
      variant: "FRONTIER_LVL_OPEN",
      guide: movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_GuideWalkToBattleRoomLvOpen", "attendant-guide"),
      player: movementEvent(preBattleRoom, "BattleFrontier_BattleFactoryPreBattleRoom_Movement_PlayerWalkToBattleRoomLvOpen", "player"),
    },
    { kind: "warp" as const, map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM", x: 6, y: 11 },
  ],
};

// --- §1.2 BattleRoom entrance ---
const scientistFacing: Record<string, "right" | "left"> = {
  LOCALID_FACTORY_BATTLE_SCIENTIST_1: "right",
  LOCALID_FACTORY_BATTLE_SCIENTIST_2: "right",
  LOCALID_FACTORY_BATTLE_SCIENTIST_3: "right",
  LOCALID_FACTORY_BATTLE_SCIENTIST_4: "left",
  LOCALID_FACTORY_BATTLE_SCIENTIST_5: "left",
  LOCALID_FACTORY_BATTLE_SCIENTIST_6: "left",
};
const battleRoomEventsJson = JSON.parse(battleRoomEvents) as { object_events: { local_id: string; x: number; y: number }[] };
const scientists = battleRoomEventsJson.object_events
  .filter((event) => event.local_id.startsWith("LOCALID_FACTORY_BATTLE_SCIENTIST_"))
  .map((event) => ({
    localId: event.local_id,
    position: { x: event.x, y: event.y },
    facingTurn: scientistFacing[event.local_id]!,
    movement: event.local_id.endsWith("_1") || event.local_id.endsWith("_2") || event.local_id.endsWith("_3")
      ? "Common_Movement_WalkInPlaceFasterRight"
      : "Common_Movement_WalkInPlaceFasterLeft",
  }));
if (scientists.length !== 6) throw new Error(`expected 6 scientists, found ${scientists.length}`);

const battleRoomEntrance = {
  label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_EnterRoomFactoryHeadBattle",
  anchor: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:51-60",
  placement: {
    brainGfx: {
      source: "sFrontierBrainObjEventGfx[FRONTIER_FACILITY_FACTORY] (src/frontier_util.c:674)",
      gfx: "OBJ_EVENT_GFX_NOLAND",
      female: false,
    },
    position: { x: 7, y: 9 },
    visibleFromStart: true,
    setBy: "BattleFrontier_BattleFactoryBattleRoom_EventScript_SetUpFactoryHeadObj (scripts.inc:22-25), on MAP_SCRIPT_ON_TRANSITION, only when frontier_getbrainstatus != FRONTIER_BRAIN_NOT_READY",
    ordinaryOpponentContrast: {
      note: "ordinary (non-brain) opponents start hidden (OnWarp's HideObjects, scripts.inc:27-37, hides LOCALID_FACTORY_BATTLE_OPPONENT only when NOT brain-ready) and are placed at (7,1), then walked in via Movement_OpponentEnter only after the player is already inside the room (scripts.inc:68-73) - structurally different from Noland's visible-from-start (7,9) placement.",
      hiddenStartPosition: { x: 7, y: 1 },
    },
    decoyPlayerGfx: {
      note: "the on-screen player during entrance is a decoy object (LOCALID_FACTORY_BATTLE_PLAYER); its graphics are keyed off checkplayergender on MAP_SCRIPT_ON_TRANSITION, not brain-specific",
      male: "OBJ_EVENT_GFX_RIVAL_BRENDAN_NORMAL",
      female: "OBJ_EVENT_GFX_RIVAL_MAY_NORMAL",
    },
  },
  events: [
    messageEvent(battleRoom, "BattleFrontier_BattleFactoryBattleRoom_Text_GetAMoveOn", "MSGBOX_DEFAULT"),
    { kind: "effect" as const, op: "closemessage" },
    movementEvent(battleRoom, "BattleFrontier_BattleFactoryBattleRoom_Movement_NolandMoveToBattle", "noland"),
    movementEvent(battleRoom, "BattleFrontier_BattleFactoryBattleRoom_Movement_PlayerEnterRoom", "playerDecoy", {
      note: "applied simultaneously to both LOCALID_FACTORY_BATTLE_PLAYER (decoy) and LOCALID_PLAYER (real, camera-fixed) - same movement script, two subjects",
    }),
    movementEvent(battleRoom, "BattleFrontier_BattleFactoryBattleRoom_Movement_PlayerEnterRoom", "player"),
    { kind: "call" as const, label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_ScientistsFaceBattle", scientists },
    {
      kind: "dispatch" as const,
      op: "goto BattleOpponent -> BattleNoland (since VAR_TEMP_F != FRONTIER_BRAIN_NOT_READY)",
    },
  ],
};

// --- §1.3/§1.4/§1.5 silver/gold divergence ---
function brainSpeechScenes(prefix: "Noland" | "NolandGold", opts: {
  introLabel: string;
  challengeLabel: string;
  bit: string;
  hasSymbol: 0 | 1;
}) {
  const introMessage = messageEvent(battleRoom, opts.introLabel, "MSGBOX_DEFAULT");
  const challengeMessage = messageEvent(battleRoom, opts.challengeLabel, "MSGBOX_DEFAULT");
  const gate = {
    flag: "FRONTIER_DATA_HEARD_BRAIN_SPEECH",
    mechanism: "gSaveBlock2Ptr->frontier.battledBrainFlags & sBattledBrainBitFlags[FRONTIER_FACILITY_FACTORY][hasSymbol]",
    bit: opts.bit,
    hasSymbol: opts.hasSymbol,
    hasSymbolClamp: "GetPlayerSymbolCountForFacility() clamped to {0,1}; 2 symbols also reads as bucket 1",
  };
  return {
    firstEncounter: {
      gate: { ...gate, condition: "== FALSE (first time only)" },
      events: [
        introMessage,
        { kind: "effect" as const, op: `frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH (${opts.bit})` },
        challengeMessage,
        { kind: "call" as const, label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_DoNolandBattle" },
      ],
    },
    repeat: {
      gate: { ...gate, condition: "skipped entirely - BattleNoland's STREAK/STREAK_LONG case jumps straight past the gated intro line" },
      events: [challengeMessage, { kind: "call" as const, label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_DoNolandBattle" }],
    },
  };
}

const silver = brainSpeechScenes("Noland", {
  introLabel: "BattleFrontier_BattleFactoryBattleRoom_Text_NolandImFactoryHead",
  challengeLabel: "BattleFrontier_BattleFactoryBattleRoom_Text_ShakeOutKnowledgeBringItOn",
  bit: "1 << 8",
  hasSymbol: 0,
});
const gold = brainSpeechScenes("NolandGold", {
  introLabel: "BattleFrontier_BattleFactoryBattleRoom_Text_HarderLookThanLastTime",
  challengeLabel: "BattleFrontier_BattleFactoryBattleRoom_Text_AllRightBringItOn",
  bit: "1 << 9",
  hasSymbol: 1,
});

if (silver.firstEncounter.events[0]!.pageCount !== 8) throw new Error("silver first-encounter speech must be 8 pages");
if (gold.firstEncounter.events[0]!.pageCount !== 4) throw new Error("gold first-encounter speech must be 4 pages");

const doNolandBattle = {
  label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_DoNolandBattle",
  anchor: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:169-176",
  events: [
    { kind: "effect" as const, op: "closemessage; frontier_set FRONTIER_DATA_RECORD_DISABLED, FALSE; special HealPlayerParty" },
    { kind: "effect" as const, op: "setvar VAR_0x8004, SPECIAL_BATTLE_FACTORY; setvar VAR_0x8005, 0" },
    { kind: "special" as const, op: "special DoSpecialTrainerBattle" },
  ],
  handoff: "enters SPECIAL_BATTLE_FACTORY (src/battle_tower.c:2092-2100), sets BATTLE_TYPE_TRAINER|BATTLE_TYPE_FACTORY, calls FillFactoryTrainerParty, starts the transition, and hands off to CB2_InitBattle - already existing, already oracle-verified Factory machinery per docs §1.8, out of scope for this data leg.",
};

const artifact = {
  schema: "factory-brain-walkup-script/v1",
  source: {
    files: [
      "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc",
      "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/header.inc",
      "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc",
      "data/maps/BattleFrontier_BattleFactoryBattleRoom/header.inc",
      "data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json",
      "src/frontier_util.c",
      "src/data/script_menu.h",
      "src/strings.c",
      "include/constants/frontier_util.h",
      "include/constants/script_menu.h",
      "asm/macros/event.inc",
    ],
    anchors: {
      preBattleRoomCallScene: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:54-77",
      askReadyForHead: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:349-361",
      askSwapBeforeHead: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:370-376",
      enterBattleRoomShared: "data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52",
      battleRoomTransitionAndPlacement: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:1-25",
      battleRoomEntrance: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:51-60",
      battleNolandSwitch: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:113-152",
      doNolandBattle: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:169-176",
      heardBrainSpeechFlag: "src/frontier_util.c:596-605,846-848,881-883",
      brainObjEventGfx: "src/frontier_util.c:668-677",
      brainStatusConstants: "include/constants/frontier_util.h:9-13",
      multichoiceMacro: "asm/macros/event.inc:938-944",
    },
    memo: "docs/noland-walkup-dialogue-scoping.md §1 (extraction spec), §4 (FAITHFUL decision + scope notes)",
  },
  constants: {
    frontierBrainStatus: { NOT_READY: 0, SILVER: 1, GOLD: 2, STREAK: 3, STREAK_LONG: 4 },
    warpTarget: { map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM", x: 6, y: 11 },
  },
  music: {
    sharedTrack: "MUS_B_FACTORY",
    mapsSharingTrack: ["BattleFrontier_BattleFactoryLobby", "BattleFrontier_BattleFactoryPreBattleRoom", "BattleFrontier_BattleFactoryBattleRoom"],
    audioEvents: {
      phoneRing: "SE_POKENAV_CALL",
      postBattleHealFanfare: { track: "MUS_HEAL", nonBrainSpecific: true },
    },
    note: "no music change during the walk-up itself; the battle-BGM change happens after the walk-up, inside DoSpecialTrainerBattle's PlayMapChosenOrBattleBGM(0) call (src/battle_tower.c:2098) - existing battle-transition system's job, out of scope here.",
  },
  cameraDecoy: {
    note: "BattleRoom hides the real LOCALID_PLAYER and walks an on-screen decoy (LOCALID_FACTORY_BATTLE_PLAYER) while the camera stays fixed - identical mechanism for brain and ordinary entrances alike (scripts.inc:1-4). Already ground-truthed and partially ported for the ordinary case in src/engine/battleRoom.ts; this artifact only supplies the brain-branch script facts, not a re-port of the camera mechanism itself.",
  },
  heardBrainSpeechFlag: {
    dataKey: "FRONTIER_DATA_HEARD_BRAIN_SPEECH",
    mechanism: "gSaveBlock2Ptr->frontier.battledBrainFlags & sBattledBrainBitFlags[FRONTIER_FACILITY_FACTORY][hasSymbol]",
    hasSymbolClamp: "GetPlayerSymbolCountForFacility(FRONTIER_FACILITY_FACTORY) clamped to {0,1} (2 symbols also reads as bucket 1)",
    bits: { silver: "1 << 8 (hasSymbol bucket 0)", gold: "1 << 9 (hasSymbol bucket 1)" },
    independence: "silver's bit and gold's bit never collide: FRONTIER_BRAIN_GOLD can only occur once the silver symbol is already held, so silver's own bit is necessarily already set by the time gold's intro becomes eligible (src/frontier_util.c:1656-1693).",
    scopeNote: "FAITHFUL decision (docs §4): this flag is in-session only for this build; cross-session save persistence is out of scope.",
  },
  scenes: {
    preBattleRoomCallScene,
    askReadyForHead,
    askSwapBeforeHead,
    enterBattleRoom,
    battleRoomEntrance,
    silverFirstEncounter: silver.firstEncounter,
    silverRepeat: silver.repeat,
    goldFirstEncounter: gold.firstEncounter,
    goldRepeat: gold.repeat,
    doNolandBattle,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, "factory-brain-walkup-script.json");
writeFileSync(out, `${JSON.stringify(artifact)}\n`);
console.log(`wrote ${out}`);
