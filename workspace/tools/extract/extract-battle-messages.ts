// Dev-time extractor: the battle-message TEMPLATE system
// (docs/battle-turn-notes.md S7 groundwork item 4; battle-bringup-notes.md
// §3 flagged this as "all built via BattleStringExpandPlaceholders from
// templates with B_TXT_* placeholders, not literal gStringVarN copies").
//
// Pulls, machine-usably (placeholder/control-code structure preserved, not
// flattened to prose):
//   - `stringTable`: the full gBattleStringsTable (src/battle_message.c) -
//     STRINGID_x (x >= BATTLESTRINGS_TABLE_START=12) -> template, covering
//     every fixed battle message (stat-change family, super/not-very-
//     effective, critical hit, flinch, faint, miss/avoid family, etc).
//   - `usedMoveTemplate`: STRINGID_USEDMOVE (id 4, below BATTLESTRINGS_
//     TABLE_START - dispatched by a switch in BufferStringBattle, not the
//     table) - backs "<ATTACKER> used <MOVE>!", the only sub-
//     BATTLESTRINGS_TABLE_START id turn 1 actually needs (STRINGID_INTROMSG/
//     RETURNMON/SWITCHINMON/BATTLEEND are flag-dependent multi-branch
//     dispatches out of this extractor's scope - not needed by turn 1 or by
//     the standard-variant families this session was scoped to cover, and
//     STRINGID_INTROMSG's own branch is already covered prose-wise by
//     battle-bringup-notes.md §3).
//   - `placeholders`: every B_TXT_* placeholder token (charmap.txt's
//     "battle string placeholders" section, the {TOKEN} -> FD <id> encoding
//     BattleStringExpandPlaceholders' caller-facing token spelling).
//   - `statNames`: gStatNamesTable (STAT_x -> display name, e.g. "evasiveness").
//   - `statChangeStringIds` / `missStringIds`: the small MULTISTRING_CHOOSER
//     sub-tables (gStatUpStringIds/gStatDownStringIds/gMissStringIds) that
//     select which stringTable entry a printfromtable-driven script command
//     uses.
// Every template's `segments` field splits the raw source text into
// {type:"text"} / {type:"placeholder", token} / {type:"control", name, args}
// (curly-brace macros that aren't a B_TXT_* placeholder, e.g. {WAIT_SE},
// {PAUSE 32}) / {type:"linebreak", code} (\n \p \l) runs, so a renderer
// never has to re-parse curly braces itself.
//
// Sources: src/battle_message.c (gBattleStringsTable, sText_*/gText_*
// definitions, gStatUpStringIds/gStatDownStringIds/gMissStringIds,
// gStatNamesTable), include/constants/battle_string_ids.h (STRINGID_x/
// B_MSG_x numeric ids), charmap.txt (B_TXT_* placeholder token spellings).
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-messages.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

const battleMessageC = readFileSync(join(REF, "src", "battle_message.c"), "utf8");
const battleStringIdsH = readFileSync(join(REF, "include", "constants", "battle_string_ids.h"), "utf8");
const charmapTxt = readFileSync(join(REF, "charmap.txt"), "utf8");

// --- STRINGID_x / B_MSG_x numeric ids -------------------------------------

function parseDefines(re: RegExp, text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of text.matchAll(re)) out.set(m[1]!, Number.parseInt(m[2]!, 10));
  return out;
}
const stringIds = parseDefines(/^#define STRINGID_(\w+)\s+(\d+)/gm, battleStringIdsH);
const msgIds = parseDefines(/^#define B_MSG_(\w+)\s+(\d+)/gm, battleStringIdsH);

const BATTLESTRINGS_TABLE_START = stringIds.get("TRAINER1LOSETEXT");
if (BATTLESTRINGS_TABLE_START !== 12) throw new Error(`expected BATTLESTRINGS_TABLE_START=12, got ${BATTLESTRINGS_TABLE_START}`);

// --- B_TXT_* placeholder tokens (charmap.txt) -----------------------------

const placeholderSectionStart = charmapTxt.indexOf("@ battle string placeholders");
const placeholderSectionEnd = charmapTxt.indexOf("@ indicates the end of a town/city name", placeholderSectionStart);
if (placeholderSectionStart < 0 || placeholderSectionEnd < 0) throw new Error("battle string placeholder section not found in charmap.txt");
const placeholderSection = charmapTxt.slice(placeholderSectionStart, placeholderSectionEnd);

const placeholders = [...placeholderSection.matchAll(/^(B_\w+)\s*=\s*FD\s+([0-9A-Fa-f]{2})$/gm)].map((m) => ({
  token: m[1]!,
  id: Number.parseInt(m[2]!, 16),
}));
if (placeholders.length < 50) throw new Error(`expected 50+ placeholder tokens, parsed ${placeholders.length}`);
const placeholderTokens = new Set(placeholders.map((p) => p.token));

// --- charmap glyph aliasing (straight-vs-curly apostrophe) ------------------
// battle_message.c's `_("...")` string literals are typed with a plain ASCII
// apostrophe ('), but charmap.txt aliases that source character to the SAME
// byte (0xB4) as the curly apostrophe ('’' = B4 vs '\'' = B4) - an
// ASCII-typing convenience for the source, not a distinct in-game glyph, so
// every straight apostrophe the extractor pulls out of a template must be
// decoded to the curly glyph the font actually renders. Confirmed to be the
// ONLY such English-glyph alias in the charmap (every other duplicate-byte
// entry pairs a Latin char with an unrelated Japanese kana char, irrelevant
// to this English extraction) by checking every `'<char>' = HH` entry for
// byte collisions.
const charmapEntries = [...charmapTxt.matchAll(/^'((?:\\.|[^'])+)'\s*=\s*([0-9A-Fa-f]{2})\s*$/gm)].map((m) => ({
  char: m[1] === "\\'" ? "'" : m[1]!,
  byte: m[2]!.toUpperCase(),
}));
const charmapCharsByByte = new Map<string, string[]>();
for (const { char, byte } of charmapEntries) {
  const chars = charmapCharsByByte.get(byte) ?? [];
  chars.push(char);
  charmapCharsByByte.set(byte, chars);
}
const straightApostropheByte = charmapEntries.find((e) => e.char === "'")?.byte;
const curlyApostrophe = charmapCharsByByte.get(straightApostropheByte ?? "")?.find((c) => c !== "'");
if (straightApostropheByte !== "B4" || curlyApostrophe !== "’") {
  throw new Error(
    `charmap apostrophe aliasing changed: byte=${straightApostropheByte} alias=${JSON.stringify(curlyApostrophe)} - update the decode below`,
  );
}

// --- sText_*/gText_* template string definitions ---------------------------

function parseTemplateDefs(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/const u8 (?:s|g)(Text_\w+)\[\]\s*=\s*_\(\s*"([^"]*)"\s*\);/g)) {
    const decoded = m[2]!.replaceAll("'", curlyApostrophe);
    out.set(`${m[0]!.includes(" gText_") ? "g" : "s"}${m[1]!}`, decoded);
  }
  return out;
}
const templateDefs = parseTemplateDefs(battleMessageC);
if (templateDefs.size < 500) throw new Error(`expected 500+ sText_/gText_ definitions, parsed ${templateDefs.size}`);

// Sweep for any OTHER charmap byte whose multiple char aliases both actually
// appear across the extracted English text - i.e. a live version of the same
// straight-vs-decoded ambiguity apostrophe had. (Byte-collision entries that
// never co-occur in real template text, e.g. Latin/Japanese dual-use slots,
// aren't a decode bug here and are skipped.)
const allTemplateText = [...templateDefs.values()].join("\n");
for (const [byte, chars] of charmapCharsByByte) {
  if (byte === straightApostropheByte || chars.length < 2) continue;
  const present = chars.filter((c) => allTemplateText.includes(c));
  if (present.length > 1) {
    throw new Error(`charmap byte ${byte} has multiple aliases actually used in template text: ${JSON.stringify(present)}`);
  }
}

// --- gBattleStringsTable[] --------------------------------------------------

const stringsTableStart = battleMessageC.indexOf("const u8 *const gBattleStringsTable[");
const stringsTableEnd = battleMessageC.indexOf("\n};", stringsTableStart);
if (stringsTableStart < 0 || stringsTableEnd < 0) throw new Error("gBattleStringsTable not found");
const stringsTableBody = battleMessageC.slice(stringsTableStart, stringsTableEnd);

// A handful of gBattleStringsTable entries (PC-transfer/box-full messages)
// point at gText_* symbols defined outside battle_message.c, in a .inc file
// compiled through a different (non-`_("...")`) text-assembly pathway
// (data/text/pc_transfer.inc's `.string` directives) - out of scope for this
// extractor (not combat/turn text); skipped with a console note rather than
// failing the whole extraction.
const skippedExternalSymbols: string[] = [];
const stringTableRaw = [...stringsTableBody.matchAll(/\[STRINGID_(\w+) - BATTLESTRINGS_TABLE_START\] = (\w+),/g)]
  .map((m) => {
    const symbol = `STRINGID_${m[1]!}`;
    const id = stringIds.get(m[1]!);
    if (id === undefined) throw new Error(`${symbol} not found in battle_string_ids.h`);
    const templateSymbol = m[2]!;
    const template = templateDefs.get(templateSymbol);
    if (template === undefined) {
      skippedExternalSymbols.push(`${symbol} (${templateSymbol})`);
      return null;
    }
    return { id, symbol, template };
  })
  .filter((e) => e !== null);
if (stringTableRaw.length < 360) throw new Error(`expected 360+ gBattleStringsTable entries, parsed ${stringTableRaw.length}`);
if (skippedExternalSymbols.length > 0) {
  console.log(`skipped ${skippedExternalSymbols.length} externally-defined template(s): ${skippedExternalSymbols.join(", ")}`);
}

// --- segment splitter (placeholder-aware, machine-usable) ------------------

type Segment =
  | { type: "text"; value: string }
  | { type: "placeholder"; token: string }
  | { type: "control"; name: string; args: string[] }
  | { type: "linebreak"; code: string };

function splitSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const parts = raw.split(/(\{[^}]*\}|\\.)/g);
  for (const part of parts) {
    if (part === "") continue;
    if (part.startsWith("{") && part.endsWith("}")) {
      const inner = part.slice(1, -1);
      if (placeholderTokens.has(inner)) {
        segments.push({ type: "placeholder", token: inner });
      } else {
        const [name, ...args] = inner.split(/\s+/);
        segments.push({ type: "control", name: name!, args });
      }
    } else if (/^\\.$/.test(part)) {
      segments.push({ type: "linebreak", code: part });
    } else {
      segments.push({ type: "text", value: part });
    }
  }
  return segments;
}

const stringTable = stringTableRaw.map((e) => ({ ...e, segments: splitSegments(e.template) }));

// --- STRINGID_USEDMOVE ("<ATTACKER> used <MOVE>!") --------------------------
// Cmd_attackstring's dispatch (BufferStringBattle's STRINGID_USEDMOVE case)
// always resolves to sText_AttackerUsedX; gBattleTextBuff2 is filled with the
// move name (gMoveNames[move], already in moves.json) plus "!"
// (ChooseTypeOfMoveUsedString appends one of sText_ExclamationMark[2-5], all
// of which are the plain "!" glyph in this English build - the distinct
// variants only mattered for Japanese grammar particles, see
// battle_message.c:2907-2921's own comment).
const usedMoveTemplateSymbol = "sText_AttackerUsedX";
const usedMoveTemplate = templateDefs.get(usedMoveTemplateSymbol);
if (usedMoveTemplate === undefined) throw new Error(`${usedMoveTemplateSymbol} not found`);
const usedMove = {
  id: stringIds.get("USEDMOVE"),
  symbol: "STRINGID_USEDMOVE",
  template: usedMoveTemplate,
  segments: splitSegments(usedMoveTemplate),
  note:
    "gBattleTextBuff2 (the {B_BUFF2} placeholder here) is populated at runtime with the move's display name + '!' before expansion, not itself part of this template.",
};
if (usedMove.id !== 4) throw new Error(`expected STRINGID_USEDMOVE=4, got ${usedMove.id}`);

// --- gStatNamesTable[] -------------------------------------------------------

const statNamesStart = battleMessageC.indexOf("const u8 *const gStatNamesTable[");
const statNamesEnd = battleMessageC.indexOf("\n};", statNamesStart);
if (statNamesStart < 0 || statNamesEnd < 0) throw new Error("gStatNamesTable not found");
const statNamesBody = battleMessageC.slice(statNamesStart, statNamesEnd);
const statNames = [...statNamesBody.matchAll(/\[STAT_(\w+)\]\s*=\s*(\w+),/g)].map((m) => {
  const templateSymbol = m[2]!;
  const name = templateDefs.get(templateSymbol);
  if (name === undefined) throw new Error(`stat name symbol ${templateSymbol} has no definition`);
  return { stat: `STAT_${m[1]!}`, name };
});
if (statNames.length !== 8) throw new Error(`expected 8 stat names (NUM_BATTLE_STATS), got ${statNames.length}`);

// --- small MULTISTRING_CHOOSER sub-tables -----------------------------------

function parseMsgIdTable(varName: string): { key: string; stringId: { id: number; symbol: string } }[] {
  const start = battleMessageC.indexOf(`const u16 ${varName}[]`);
  const end = battleMessageC.indexOf("\n};", start);
  if (start < 0 || end < 0) throw new Error(`${varName} not found`);
  const body = battleMessageC.slice(start, end);
  return [...body.matchAll(/\[B_MSG_(\w+)\]\s*=\s*STRINGID_(\w+),?/g)].map((m) => {
    const msgKey = m[1]!;
    if (!msgIds.has(msgKey)) throw new Error(`B_MSG_${msgKey} not found in battle_string_ids.h`);
    const stringIdKey = m[2]!;
    const id = stringIds.get(stringIdKey);
    if (id === undefined) throw new Error(`STRINGID_${stringIdKey} not found`);
    return { key: `B_MSG_${msgKey}`, stringId: { id, symbol: `STRINGID_${stringIdKey}` } };
  });
}

const statChangeStringIds = {
  up: parseMsgIdTable("gStatUpStringIds"),
  down: parseMsgIdTable("gStatDownStringIds"),
};
const missStringIds = parseMsgIdTable("gMissStringIds");

// --- spot-checks: cross-verify against docs/battle-turn-notes.md's own citations

const bySymbol = new Map(stringTable.map((e) => [e.symbol, e]));
const spotChecks: [string, string][] = [
  ["STRINGID_STATROSE", "rose!"],
  ["STRINGID_STATFELL", "fell!"],
  ["STRINGID_CRITICALHIT", "A critical hit!"],
  ["STRINGID_SUPEREFFECTIVE", "It’s super effective!"],
  ["STRINGID_NOTVERYEFFECTIVE", "It’s not very effective…"],
  ["STRINGID_PKMNFLINCHED", "{B_ATK_NAME_WITH_PREFIX} flinched!"],
  ["STRINGID_ATTACKERFAINTED", "{B_ATK_NAME_WITH_PREFIX}\\nfainted!\\p"],
  ["STRINGID_TARGETFAINTED", "{B_DEF_NAME_WITH_PREFIX}\\nfainted!\\p"],
  ["STRINGID_ATTACKMISSED", "{B_ATK_NAME_WITH_PREFIX}’s\\nattack missed!"],
  ["STRINGID_DEFENDERSSTATROSE", "{B_DEF_NAME_WITH_PREFIX}’s {B_BUFF1}\\n{B_BUFF2}"],
];
for (const [symbol, want] of spotChecks) {
  const got = bySymbol.get(symbol)?.template;
  if (got !== want) throw new Error(`${symbol}: expected template ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
}
if (usedMove.template !== "{B_ATK_NAME_WITH_PREFIX} used\\n{B_BUFF2}") {
  throw new Error(`STRINGID_USEDMOVE: unexpected template ${JSON.stringify(usedMove.template)}`);
}

const output = { placeholders, stringTable, usedMove, statNames, statChangeStringIds, missStringIds };
writeFileSync(join(DATA_GEN, "battle-message-templates.json"), `${JSON.stringify(output, null, 0)}\n`);
console.log(
  `wrote ${join(DATA_GEN, "battle-message-templates.json")} (${stringTable.length} table strings, ${placeholders.length} placeholders, ${statNames.length} stat names)`,
);
