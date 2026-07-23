// Dev-time extractor for Battle Factory's two terminal paths: a lost match
// and the seventh completed win. It intentionally records script/data facts,
// not oracle frames or a tick schedule. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-ending-policy.ts
// or pass --out <path> to reproduce the committed artifact byte-for-byte.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const outputIndex = process.argv.indexOf("--out");
if (outputIndex !== -1 && !process.argv[outputIndex + 1]) throw new Error("--out needs a path");
const OUTPUT = outputIndex === -1
  ? join(ROOT, "src", "data", "gen", "factory-ending-policy.json")
  : resolve(process.argv[outputIndex + 1]!);

function read(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function numberDefine(source: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(\\d+)`, "m").exec(source);
  if (!match) throw new Error(`missing numeric #define ${name}`);
  return Number(match[1]);
}

function sourceString(source: string, label: string): string {
  const match = new RegExp(`^${label}:\\n((?:\\s*\\.string .+\\n)+)`, "m").exec(source);
  if (!match) throw new Error(`missing string ${label}`);
  const fragments = [...match[1]!.matchAll(/\.string\s+"([^"]*)"/g)].map((item) => item[1]!);
  if (fragments.length === 0) throw new Error(`no fragments for ${label}`);
  return fragments.join("");
}

function factorySinglesAwards(source: string): number[] {
  const table = /static const u8 sBattlePointAwards\[\]\[NUM_FRONTIER_FACILITIES\]\[FRONTIER_MODE_COUNT\]\s*=\s*\{([\s\S]*?)\n\};/.exec(source);
  if (!table) throw new Error("missing sBattlePointAwards");
  const rows = table[1]!.split("\n").filter((line) => line.includes("}, {"));
  const awards = rows.map((row) => {
    const facilities = [...row.matchAll(/\{([^}]*)\}/g)];
    const factory = facilities[4]?.[1]?.split(",").map((value) => Number(value.trim()));
    if (!factory || factory.length !== 2 || factory.some(Number.isNaN)) throw new Error(`bad Factory BP row: ${row.trim()}`);
    return factory[0]!;
  });
  if (awards.length !== 30) throw new Error(`expected 30 BP rows, got ${awards.length}`);
  return awards;
}

const battleFrontier = read("include", "constants", "battle_frontier.h");
const battleRoom = read("data", "maps", "BattleFrontier_BattleFactoryBattleRoom", "scripts.inc");
const lobby = read("data", "maps", "BattleFrontier_BattleFactoryLobby", "scripts.inc");
const factory = read("src", "battle_factory.c");
const frontierUtil = read("src", "frontier_util.c");
const stdMsgbox = read("data", "scripts", "std_msgbox.inc");

function requiredSource(source: string, fragment: string): void {
  if (!source.includes(fragment)) throw new Error(`source contract changed: ${fragment}`);
}

// These are controller/presentation boundaries, not guessed frame counts.
// Terminal routes cannot be reached from the canonical anchor within a bounded
// replay without staging six extra battles, so keep the source's blocking
// commands explicit for the eventual OFF-profile probe.
requiredSource(battleRoom, "warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY, 4, 8");
requiredSource(battleRoom, "waitstate");
requiredSource(lobby, "multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE");
requiredSource(stdMsgbox, "Std_MsgboxDefault:");
requiredSource(stdMsgbox, "Std_MsgboxGetPoints:");

const stagesPerChallenge = numberDefine(battleFrontier, "FRONTIER_STAGES_PER_CHALLENGE");
const maxStreak = numberDefine(battleFrontier, "MAX_STREAK");
const maxBattlePoints = numberDefine(battleFrontier, "MAX_BATTLE_FRONTIER_POINTS");
const policy = {
  schema: "factory-ending-policy/v1",
  source: {
    files: [
      "include/constants/battle_frontier.h",
      "include/constants/battle_factory.h",
      "src/battle_factory.c",
      "src/frontier_util.c",
      "data/scripts/std_msgbox.inc",
      "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc",
      "data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc",
    ],
    anchors: {
      battleResult: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:74-111",
      factoryMutation: "src/battle_factory.c:243-266",
      winStreak: "src/frontier_util.c:2111-2157",
      battlePoints: "src/frontier_util.c:500-592,1853-1910",
      lobbyTerminal: "data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:15-94",
      terminalWarp: "data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:222-232",
      messageGates: "data/scripts/std_msgbox.inc:18-35",
    },
  },
  constants: {
    stagesPerChallenge,
    maxStreak,
    maxBattlePoints,
    statuses: {
      won: numberDefine(battleFrontier, "CHALLENGE_STATUS_WON"),
      lost: numberDefine(battleFrontier, "CHALLENGE_STATUS_LOST"),
    },
    factory: { facilityId: numberDefine(battleFrontier, "FRONTIER_FACILITY_FACTORY"), singlesMode: numberDefine(battleFrontier, "FRONTIER_MODE_SINGLES") },
  },
  loss: {
    battleResultRule: "DoSpecialTrainerBattle branches only result 1 to DefeatedOpponent; every other result falls through to loss.",
    mutations: ["challengeStatus = LOST", "battleNumber is not incremented", "factory win streak and rental-swap count are not mutated"],
    transition: { map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY", singlesWarp: { x: 4, y: 8 } },
    lobby: {
      lockAll: true,
      text: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_ReturnMonsSaveResults"),
      operations: ["message ReturnMonsSaveResults", "waitmessage", "frontier_checkairshow", "LoadPlayerParty", "set FACTORY_DATA_WIN_STREAK_ACTIVE FALSE", "factory_save 0", "playse SE_SAVE", "waitse", "AskRecordBattle"],
    },
  },
  seventhWin: {
    beforeLobby: [
      "if factory rents < MAX_STREAK, request rents + 1; SetBattleFactoryData persists it only when sPerformedRentalSwap is TRUE, then clears that flag",
      "increment factory win streak if below MAX_STREAK",
      "increment FRONTIER_DATA_BATTLE_NUM; value 7 selects the terminal branch",
      "challengeStatus = WON",
    ],
    transition: { map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY", singlesWarp: { x: 4, y: 8 } },
    lobby: {
      regularText: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_CongratsSevenWins"),
      brainText: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_CongratsForDefeatingHead"),
      awardText: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_AwardBattlePoints"),
      awardResultMessage: "BattleFrontier_Text_ObtainedXBattlePoints via MSGBOX_GETPOINTS",
      restoreAndSaveText: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_ExchangeMonsAndSave"),
      recordPrompt: sourceString(lobby, "BattleFrontier_BattleFactoryLobby_Text_RecordLastMatch"),
      operations: ["frontier_givepoints", "frontier_checkairshow", "LoadPlayerParty", "factory_save 0", "playse SE_SAVE", "AskRecordBattle"],
    },
    battlePoints: {
      completedChallengeIndex: "factoryWinStreak / 7, then subtract one unless zero; clamp to final award row",
      factorySinglesByAwardRow: factorySinglesAwards(frontierUtil),
      brainBonus: 10,
      cap: maxBattlePoints,
      firstSevenWinAward: 3,
    },
  },
  presentation: {
    commonHandoff: [
      "terminal room script writes challengeStatus before the singles warp to lobby (4,8)",
      "the battle-room script waits for map state; lobby OnWarp turns the player north",
      "the lobby OnFrame status reader copies only WON or LOST into VAR_TEMP_CHALLENGE_STATUS, which selects the terminal route on a later map-script dispatch",
    ],
    gates: {
      defaultMsgbox: ["message", "waitmessage", "waitbuttonpress"],
      getPointsMsgbox: ["message", "playfanfare MUS_OBTAIN_B_POINTS", "waitfanfare", "waitmessage"],
      scriptedMessage: ["message", "waitmessage"],
      recordPrompt: ["message RecordLastMatch", "waitmessage", "multichoicedefault (20,8), default choice 1", "A/B/choice dispatch"],
    },
    lossOrder: [
      "battle result != 1 -> status LOST -> lobby handoff",
      "ReturnMonsSaveResults scripted message completes",
      "air-show check -> LoadPlayerParty -> clear Factory active-streak bit -> factory_save -> save SE/wait",
      "optional record prompt (or final next-visit message when recording is disabled)",
    ],
    seventhWinOrder: [
      "battle result == 1 -> optional performed-swap rent persistence -> capped Factory streak increment -> battle number becomes 7 -> status WON -> lobby handoff",
      "regular seven-win DEFAULT msgbox (or Factory Head DEFAULT variant) is A/B-gated after text completion",
      "award DEFAULT msgbox is A/B-gated after text completion",
      "frontier_givepoints -> GETPOINTS fanfare/message completion -> ExchangeMonsAndSave scripted message completion",
      "air-show check -> LoadPlayerParty -> factory_save -> save SE/wait -> optional record prompt",
    ],
  },
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(policy)}\n`);
console.log(`wrote ${OUTPUT}`);
