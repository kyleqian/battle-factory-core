// Dev-time, source-only extraction of the ordinary field-message chrome used
// by Battle Factory's regular loss and seventh-win endings. This deliberately
// does not implement flow or render anything: the output gives a later field
// renderer source-native templates, message/menu operations, and the exact
// record-prompt menu construction. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-terminal-messages.ts
//   node --experimental-strip-types tools/extract/extract-factory-terminal-messages.ts --out-dir /tmp/out

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const HARNESS_ROOT = resolve(ROOT, "..", "..", "..", "..");
const outIndex = process.argv.indexOf("--out-dir");
if (outIndex !== -1 && !process.argv[outIndex + 1]) throw new Error("--out-dir needs a directory");
const OUT_DIR = outIndex === -1 ? join(ROOT, "src", "data", "gen") : resolve(process.argv[outIndex + 1]!);

function source(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function stringAt(text: string, label: string): string {
  const match = new RegExp(`^${label}:\\n((?:\\s*\\.string .+\\n)+)`, "m").exec(text);
  if (!match) throw new Error(`missing string ${label}`);
  const parts = [...match[1]!.matchAll(/\.string\s+"([^"]*)"/g)].map((item) => item[1]!);
  if (parts.length === 0) throw new Error(`empty string ${label}`);
  return parts.join("");
}

function cStringAt(text: string, label: string): string {
  const match = new RegExp(`const u8 ${label}\\[\\]\\s*=\\s*_\\(\\"([^\\"]*)\\"\\);`).exec(text);
  if (!match) throw new Error(`missing C string ${label}`);
  return match[1]!;
}

function required(text: string, fragment: string): void {
  if (!text.includes(fragment)) throw new Error(`source contract changed: ${fragment}`);
}

type CharmapEntry = [string, number];

function canonicalAnchorPlayer(): { text: string; encodedBytes: number[]; storageBytes: number[] } {
  // The bootstrap save is the source-owned canonical state that the OFF
  // profile extends. Read its newest SaveBlock2 sector, never a live emulator
  // or production asset. SaveSector layout is pinned by include/save.h.
  const save = readFileSync(join(HARNESS_ROOT, "oracle", "bootstrap", "factory.sav"));
  const sectors = [] as { counter: number; storageBytes: number[] }[];
  for (let offset = 0; offset + 0x1000 <= save.length; offset += 0x1000) {
    const id = save.readUInt16LE(offset + 0xff4);
    const signature = save.readUInt32LE(offset + 0xff8);
    if (id === 0 && signature === 0x08012025) {
      sectors.push({ counter: save.readUInt32LE(offset + 0xffc), storageBytes: [...save.subarray(offset, offset + 8)] });
    }
  }
  if (sectors.length === 0) throw new Error("canonical bootstrap has no valid SaveBlock2 sector");
  sectors.sort((a, b) => b.counter - a.counter);
  const storageBytes = sectors[0]!.storageBytes;
  const eos = storageBytes.indexOf(0xff);
  if (eos < 1) throw new Error("canonical player name lacks EOS");

  const charmap = JSON.parse(readFileSync(join(ROOT, "src", "data", "gen", "charmap.json"), "utf8")) as { entries: CharmapEntry[] };
  const decode = new Map<number, string>();
  for (const [char, code] of charmap.entries) if (!decode.has(code)) decode.set(code, char);
  const text = storageBytes.slice(0, eos).map((code) => decode.get(code)).join("");
  if (!text || text.includes("undefined")) throw new Error("canonical player name has unknown charmap byte");
  return { text, encodedBytes: storageBytes.slice(0, eos), storageBytes };
}

const CONTROL_BYTES = {
  "\\l": { byte: 0xfa, name: "promptScroll" },
  "\\p": { byte: 0xfb, name: "promptClear" },
  "\\n": { byte: 0xfe, name: "newline" },
  "$": { byte: 0xff, name: "eos" },
} as const;

function expand(template: string, substitutions: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => substitutions[name] ?? `{${name}}`);
}

function encodeExpandedText(text: string): { encodedBytes: number[]; controlTokens: { source: string; byte: string; name: string }[] } {
  const charmap = JSON.parse(readFileSync(join(ROOT, "src", "data", "gen", "charmap.json"), "utf8")) as { entries: CharmapEntry[] };
  const encode = new Map<string, number>();
  for (const [char, code] of charmap.entries) if (!encode.has(char)) encode.set(char, code);
  const encodedBytes: number[] = [];
  const controlTokens: { source: string; byte: string; name: string }[] = [];
  for (let index = 0; index < text.length; index++) {
    const source = text[index] === "\\" ? text.slice(index, index + 2) : text[index]!;
    const control = CONTROL_BYTES[source as keyof typeof CONTROL_BYTES];
    if (control) {
      encodedBytes.push(control.byte);
      controlTokens.push({ source, byte: `0x${control.byte.toString(16).toUpperCase()}`, name: control.name });
      if (source.length === 2) index++;
      continue;
    }
    // charmap.txt spells ASCII apostrophe as an escaped literal (`'\\'' = B4`),
    // which the existing generated JSON charmap intentionally normalizes to
    // the typographic apostrophe. The assembler still emits B4 for source '.
    const encoded = source === "'" ? 0xb4 : encode.get(source);
    if (encoded === undefined) throw new Error(`unencodable terminal character ${JSON.stringify(source)}`);
    encodedBytes.push(encoded);
  }
  if (encodedBytes.at(-1) !== 0xff) throw new Error(`terminal text lacks EOS: ${text}`);
  return { encodedBytes, controlTokens };
}

const lobby = source("data", "maps", "BattleFrontier_BattleFactoryLobby", "scripts.inc");
const towerLobby = source("data", "maps", "BattleFrontier_BattleTowerLobby", "scripts.inc");
const stdMsgbox = source("data", "scripts", "std_msgbox.inc");
const scriptMenu = source("src", "script_menu.c");
const menu = source("src", "menu.c");
const fieldMessageBox = source("src", "field_message_box.c");
const scriptMenuData = source("src", "data", "script_menu.h");
const strings = source("src", "strings.c");
const frontierUtil = source("src", "frontier_util.c");
const characters = source("include", "constants", "characters.h");
const saveHeader = source("include", "save.h");

// Contracts intentionally point at source mechanisms, not observed frames.
required(lobby, "msgbox BattleFrontier_BattleFactoryLobby_Text_CongratsSevenWins, MSGBOX_DEFAULT");
required(lobby, "msgbox BattleFrontier_BattleFactoryLobby_Text_AwardBattlePoints, MSGBOX_DEFAULT");
required(lobby, "msgbox BattleFrontier_Text_ObtainedXBattlePoints, MSGBOX_GETPOINTS");
required(lobby, "multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE");
required(stdMsgbox, "Std_MsgboxDefault:");
required(stdMsgbox, "Std_MsgboxGetPoints:");
required(fieldMessageBox, "LoadMessageBoxAndBorderGfx();");
required(fieldMessageBox, "DrawDialogueFrame(0, TRUE);");
required(scriptMenu, "CreateWindowFromRect(left, top, newWidth, count * 2)");
required(scriptMenu, "InitMenuInUpperLeftCornerNormal(windowId, count, cursorPos);");
required(scriptMenuData, "static const struct MenuAction MultichoiceList_YesNo[]");
required(scriptMenuData, "{gText_Yes}");
required(scriptMenuData, "{gText_No4}");
required(menu, "#define STD_WINDOW_PALETTE_NUM 14");
required(menu, "#define STD_WINDOW_BASE_TILE_NUM 0x214");
required(frontierUtil, "{1, 2, 3, 3}, {1, 1}, {4, 5}, {1}, {3, 4}, {1}, {5}");
required(frontierUtil, "points = sBattlePointAwards[challengeNum][facility][battleMode];");
required(characters, "#define CHAR_PROMPT_SCROLL     0xFA");
required(characters, "#define CHAR_PROMPT_CLEAR      0xFB");
required(characters, "#define CHAR_NEWLINE           0xFE");
required(characters, "#define EOS                    0xFF");
required(saveHeader, "#define SECTOR_ID_SAVEBLOCK2          0");
required(saveHeader, "#define SECTOR_SIGNATURE 0x8012025");

const yes = cStringAt(strings, "gText_Yes");
const no = cStringAt(strings, "gText_No4");
const selector = cStringAt(strings, "gText_SelectorArrow3");
if (yes !== "YES" || no !== "NO" || selector !== "▶") throw new Error("unexpected YES/NO menu strings");

const messages = {
  lossReturnAndSave: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_ReturnMonsSaveResults"),
  regularCongrats: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_CongratsSevenWins"),
  factoryHeadCongrats: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_CongratsForDefeatingHead"),
  award: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_AwardBattlePoints"),
  getPoints: stringAt(towerLobby, "BattleFrontier_Text_ObtainedXBattlePoints"),
  exchangeAndSave: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_ExchangeMonsAndSave"),
  recordPrompt: stringAt(lobby, "BattleFrontier_BattleFactoryLobby_Text_RecordLastMatch"),
};

const player = canonicalAnchorPlayer();
if (player.text !== "MEMORY" || JSON.stringify(player.storageBytes) !== JSON.stringify([199, 191, 199, 201, 204, 211, 255, 255])) {
  throw new Error(`unexpected canonical player name ${player.text} (${player.storageBytes.join(",")})`);
}
const regularSubstitutions = { PLAYER: player.text, STR_VAR_1: "3" };
const resolvedMessages = Object.fromEntries(
  Object.entries(messages)
    .filter(([key]) => key !== "factoryHeadCongrats")
    .map(([key, template]) => {
      const expanded = expand(template, regularSubstitutions);
      return [key, { expanded, ...encodeExpandedText(expanded) }];
    }),
);

const artifact = {
  schema: "factory-terminal-messages/v1",
  source: {
    files: [
      "data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc",
      "data/maps/BattleFrontier_BattleTowerLobby/scripts.inc",
      "data/scripts/std_msgbox.inc",
      "src/field_message_box.c",
      "src/script_menu.c",
      "src/data/script_menu.h",
      "src/menu.c",
      "src/strings.c",
      "src/frontier_util.c",
      "include/constants/battle_frontier.h",
      "include/constants/characters.h",
      "include/save.h",
      "../../../../oracle/bootstrap/factory.sav",
    ],
    anchors: {
      terminalRoutes: "data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:40-94",
      terminalTexts: "data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:372-467",
      getPointsText: "data/maps/BattleFrontier_BattleTowerLobby/scripts.inc:1336-1337",
      msgboxMacros: "data/scripts/std_msgbox.inc:18-35",
      fieldMessage: "src/field_message_box.c:21-31,95-110",
      multichoice: "src/script_menu.c:92-123,726-770",
      yesNoList: "src/data/script_menu.h:608-611",
      menuPrintAndCursor: "src/menu.c:927-961,1581-1593",
      battlePointAward: "src/frontier_util.c:500-553,1853-1910; include/constants/battle_frontier.h:13,23",
      textControls: "charmap.txt:1087-1089; include/constants/characters.h:175-180",
      bootstrapPlayerName: "oracle/bootstrap/factory.sav newest valid SaveBlock2 sector, bytes 0x0-0x7; include/save.h:6-25,71-79",
    },
  },
  reuse: {
    // These were already source-extracted by extract-prebattle-room.ts. The
    // field APIs above load the same files, so no duplicate chrome is needed.
    messageBoxAsset: "src/assets/gen/prebattle-room-msgbox.json",
    standardWindowAsset: "src/assets/gen/prebattle-room-std-window.json",
    normalFont: "src/data/gen/font-normal.json",
    charmap: "src/data/gen/charmap.json",
    reason: "LoadMessageBoxAndBorderGfx loads graphics/text_window/message_box.png and options frame 0 (graphics/text_window/1.png); terminal text and MULTI_YESNO use FONT_NORMAL.",
  },
  fieldMessage: {
    window: { bg: 0, tilemapLeft: 2, tilemapTop: 15, widthTiles: 27, heightTiles: 4, palette: 15, baseTile: "0x194" },
    text: { font: "FONT_NORMAL", xPx: 0, yPx: 0, colors: { fg: 2, bg: 1, shadow: 3 } },
    frameOperation: ["LoadMessageBoxAndBorderGfx", "DrawDialogueFrame(window 0, copyToVram TRUE)"],
  },
  messages: {
    lossReturnAndSave: { template: messages.lossReturnAndSave, operations: ["message", "waitmessage", "frontier_checkairshow", "LoadPlayerParty", "set FACTORY_DATA_WIN_STREAK_ACTIVE FALSE", "factory_save 0", "playse SE_SAVE", "waitse", "AskRecordBattle"] },
    regularCongrats: { template: messages.regularCongrats, operations: ["msgbox MSGBOX_DEFAULT", "message", "waitmessage", "waitbuttonpress", "waitmessage"] },
    factoryHeadCongrats: { template: messages.factoryHeadCongrats, operations: ["msgbox MSGBOX_DEFAULT", "message", "waitmessage", "waitbuttonpress", "waitmessage"] },
    award: { template: messages.award, operations: ["msgbox MSGBOX_DEFAULT", "message", "waitmessage", "waitbuttonpress", "frontier_givepoints"] },
    getPoints: { template: messages.getPoints, operations: ["msgbox MSGBOX_GETPOINTS", "message", "playfanfare MUS_OBTAIN_B_POINTS", "waitfanfare", "waitmessage"] },
    exchangeAndSave: { template: messages.exchangeAndSave, operations: ["message", "waitmessage", "frontier_checkairshow", "LoadPlayerParty", "factory_save 0", "playse SE_SAVE", "waitse", "AskRecordBattle"] },
    recordPrompt: { template: messages.recordPrompt, operations: ["message", "waitmessage", "multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE"] },
  },
  regularLevel50: {
    // This is a fully expanded renderer input for the first regular (not
    // Factory Head), singles Level-50 seventh win and its loss sibling.
    // Strings retain the source's \n/\p/\l spelling and also provide the
    // exact encoded control bytes so a consumer need not infer page behavior.
    anchorPlayer: { text: player.text, encodedBytes: player.encodedBytes, storageBytes: player.storageBytes, eos: "0xFF", maxCharacters: 7 },
    firstRoundBattlePointAward: {
      substitution: "3",
      numericAward: 3,
      tableLookup: { postWinStreak: 7, stagesPerChallenge: 7, challengeIndex: 0, facility: "FRONTIER_FACILITY_FACTORY=4", battleMode: "FRONTIER_MODE_SINGLES=0", tableEntry: 3, factoryHeadBonus: 0 },
    },
    substitutions: regularSubstitutions,
    expandedMessages: resolvedMessages,
  },
  recordPromptMenu: {
    multichoiceId: 94,
    requestedOriginTiles: { x: 20, y: 8 },
    adjustedOriginTiles: { x: 20, y: 8 },
    choices: [yes, no],
    choiceResults: [0, 1],
    defaultChoice: 1,
    bResult: "MULTI_B_PRESSED",
    input: { delayFrames: 2, wraps: false, ignoreBPress: false },
    // DisplayTextAndGetWidth + ConvertPixelWidthToTileWidth uses the
    // existing FONT_NORMAL widths. YES is 18px, so (((18+9)/8)+1) = 4.
    content: { widthPx: 18, widthTiles: 4, heightTiles: 4, textOriginPx: { x: 8, y: 1 }, rowStridePx: 16 },
    frame: {
      asset: "src/assets/gen/prebattle-room-std-window.json",
      palette: 14,
      baseTile: "0x214",
      outerOriginTiles: { x: 19, y: 7 },
      outerSizeTiles: { width: 6, height: 6 },
    },
    text: { font: "FONT_NORMAL", colors: { fg: 2, bg: 1, shadow: 3 } },
    cursor: { glyph: selector, xPx: 0, yPxByChoice: [1, 17], widthPx: 8, heightPx: 15 },
  },
  standardDefaultNoMenu: { choices: [yes, no], defaultChoice: 1, selectedLabel: no, choiceResults: [0, 1], bResult: "MULTI_B_PRESSED" },
};

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, "factory-terminal-messages.json");
writeFileSync(out, `${JSON.stringify(artifact)}\n`);
console.log(`wrote ${out}`);
