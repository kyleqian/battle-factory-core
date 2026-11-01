// Dev-time extractor: the S11 audio "sound-source table" (docs/s11-audio-design.md
// section 7 item 2, step aud238). A ROM-source rule table that the later sound
// census (aud243) applies to executed kernel commands. Data extraction only; no
// runtime module imports the output.
//
// Sections written to src/data/gen/audio-sound-sources.json:
//   (a) animScripts   - data/battle_anim_scripts.s sound ops + label flow + entry tables
//   (b) cAnimSites    - PlaySE / PlaySE*WithPanning / PlayCry* call sites in src/battle_anim*.c
//   (c) sites         - screen / controller / battle-script / pokeball / interface call sites,
//                       plus battle-script (.s) uses of playse / effectivenesssound / ...
//   (d) battleBgm     - GetBattleBGM branch table, Factory trainer-class cross-reference, start sites
//   (e) mapMusic      - Factory map "music" ids and map-script sound ops
//   (f) songLoops     - sound/songs/midi/<song>.s GOTO / PEND / FINE structure as tick offsets
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-audio-sound-sources.ts [--out-dir DIR]
// (or `npm run extract:audio-sound-sources`). Never imported at runtime.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDirArg = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDirArg) throw new Error("--out-dir requires a directory");
const OUT_DIR = outDirArg === undefined ? join(RUN_ROOT, "src", "data", "gen") : isAbsolute(outDirArg) ? outDirArg : join(RUN_ROOT, outDirArg);
const OUT_FILE = join(OUT_DIR, "audio-sound-sources.json");

// ---------------------------------------------------------------------------
// file access with hashing (the hashes go into generatedFrom)

const fileHashes = new Map<string, string>();
const textCache = new Map<string, string>();

function sha(text: string | Buffer): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function readRef(rel: string): string {
  let text = textCache.get(rel);
  if (text === undefined) {
    text = readFileSync(join(REF, rel), "utf8");
    textCache.set(rel, text);
    fileHashes.set(`reference/pokeemerald/${rel}`, sha(text));
  }
  return text;
}

function readRepo(rel: string): string {
  const text = readFileSync(join(RUN_ROOT, rel), "utf8");
  fileHashes.set(rel, sha(text));
  return text;
}

// ---------------------------------------------------------------------------
// constants

function numericDefines(text: string, prefixRe: string): Map<string, number> {
  const out = new Map<string, number>();
  const re = new RegExp(`^#define\\s+((?:${prefixRe})[A-Za-z0-9_]*)\\s+(-?0x[0-9a-fA-F]+|-?\\d+)\\b`, "gm");
  for (const m of text.matchAll(re)) {
    const raw = m[2]!;
    const neg = raw.startsWith("-");
    const body = neg ? raw.slice(1) : raw;
    const n = Number.parseInt(body, body.startsWith("0x") ? 16 : 10);
    out.set(m[1]!, neg ? -n : n);
  }
  return out;
}

const songs = numericDefines(readRef("include/constants/songs.h"), "SE_|MUS_|PH_");
const fanfares = numericDefines(readRef("include/constants/sound.h"), "FANFARE_");
const cryModes = numericDefines(readRef("include/constants/sound.h"), "CRY_MODE_");
const soundPan = numericDefines(readRef("include/constants/battle_anim.h"), "SOUND_PAN_");
const moveIds = numericDefines(readRef("include/constants/moves.h"), "MOVE_");
const trainerClasses = numericDefines(readRef("include/constants/trainers.h"), "TRAINER_CLASS_");

const constantValues = new Map<string, number>([...soundPan, ["TRUE", 1], ["FALSE", 0]]);

function evalInt(raw: string, extra?: Map<string, number>): number | null {
  const replaced = raw.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
    const v = extra?.get(name) ?? constantValues.get(name);
    return v === undefined ? "NaN" : `(${v})`;
  });
  if (!/^[0-9a-fA-FxX+\-*/()%<>&| .NaN]*$/.test(replaced)) return null;
  if (replaced.includes("NaN")) return null;
  try {
    const v = Function(`"use strict"; return (${replaced});`)() as unknown;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// text helpers

function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== "" || out.length > 0) out.push(cur.trim());
  return out.map((s) => s.replace(/\s+/g, " "));
}

function lineNo(index: number): number {
  return index + 1;
}

// ---------------------------------------------------------------------------
// (a) battle animation scripts

type Row = Record<string, unknown>;

const ANIM_REL = "data/battle_anim_scripts.s";
const SOUND_OPS = ["playsewithpan", "loopsewithpan", "waitplaysewithpan", "setpan", "panse", "panse_adjustnone", "panse_adjustall"] as const;
const OP_PARAMS: Record<string, string[]> = {
  playsewithpan: ["se", "pan"],
  loopsewithpan: ["se", "pan", "wait", "times"],
  waitplaysewithpan: ["se", "pan", "wait"],
  setpan: ["pan"],
  panse: ["se", "currentPan", "targetPan", "incrementPan", "delay"],
  panse_adjustnone: ["se", "currentPan", "targetPan", "incrementPan", "delay"],
  panse_adjustall: ["se", "currentPan", "targetPan", "incrementPan", "delay"],
};
// commands whose label operand(s) continue or branch the script
const JUMP_OPS: Record<string, { kind: string; labelArgs: number[] }> = {
  call: { kind: "call", labelArgs: [0] },
  goto: { kind: "goto", labelArgs: [0] },
  jumpifcontest: { kind: "jump", labelArgs: [0] },
  jumpargeq: { kind: "jump", labelArgs: [2] },
  jumpifmoveturn: { kind: "jump", labelArgs: [1] },
  choosetwoturnanim: { kind: "jump", labelArgs: [0, 1] },
  jumpreteq: { kind: "jump", labelArgs: [1] },
  jumprettrue: { kind: "jump", labelArgs: [0] },
  jumpretfalse: { kind: "jump", labelArgs: [0] },
};

interface AnimOp extends Row {
  n: number;
  op: string;
  label: string;
  k: number;
  line: number;
}

function parseAnimScripts() {
  const text = readRef(ANIM_REL);
  const lines = text.split("\n");
  const ops: AnimOp[] = [];
  const otherOps: Row[] = [];
  const labels = new Map<string, { line: number; aliasOf?: string; flow: unknown[]; opCount: number; nextLabel?: string; falls: boolean }>();
  const labelOrder: string[] = [];
  let current: string | null = null;
  let pendingAliases: string[] = [];
  let ended = true;
  let prevBlockLabel: string | null = null;
  const sectionStart = lines.findIndex((l) => /^Move_NONE:/.test(l));
  if (sectionStart < 0) throw new Error("Move_NONE not found");

  const startBlock = (name: string, line: number) => {
    labels.set(name, { line, flow: [], opCount: 0, falls: false });
    labelOrder.push(name);
  };

  for (let i = sectionStart; i < lines.length; i++) {
    const raw = lines[i]!;
    const code = raw.replace(/@.*$/, "").replace(/\s+$/, "");
    if (code.trim() === "") continue;
    const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*)::?$/.exec(code);
    if (labelMatch) {
      const name = labelMatch[1]!;
      if (current !== null && labels.get(current)!.flow.length === 0 && !ended && pendingAliases.length > 0) {
        // consecutive labels with no code between them
      }
      startBlock(name, lineNo(i));
      if (current !== null && !ended && labels.get(current)!.flow.length === 0) {
        // `current` was a label immediately followed by this label: alias run
        labels.get(current)!.aliasOf = name;
      } else if (current !== null && !ended) {
        labels.get(current)!.falls = true;
        labels.get(current)!.nextLabel = name;
      }
      prevBlockLabel = current;
      current = name;
      ended = false;
      pendingAliases = [];
      continue;
    }
    if (/^\s*\./.test(code) || /^\s*#/.test(code)) continue; // assembler directives
    const insn = /^\s+([a-z_][a-z_0-9]*)\s*(.*)$/.exec(code);
    if (!insn) continue;
    if (current === null) continue;
    const op = insn[1]!;
    const args = splitArgs(insn[2]!);
    const block = labels.get(current)!;
    if ((SOUND_OPS as readonly string[]).includes(op)) {
      const params = OP_PARAMS[op]!;
      if (args.length !== params.length) throw new Error(`${ANIM_REL}:${lineNo(i)} ${op} arity ${args.length}`);
      const row: AnimOp = { n: ops.length, op, label: current, k: block.opCount, line: lineNo(i) };
      const argObj: Record<string, string> = {};
      const values: Record<string, number> = {};
      params.forEach((p, idx) => {
        argObj[p] = args[idx]!;
        if (p === "se") {
          const id = songs.get(args[idx]!);
          if (id === undefined) throw new Error(`${ANIM_REL}:${lineNo(i)} unknown song ${args[idx]}`);
          row.song = args[idx]!;
          row.songId = id;
        } else {
          const v = evalInt(args[idx]!);
          if (v !== null) values[p] = v;
        }
      });
      const { se: _se, ...rest } = argObj;
      row.args = rest;
      row.values = values;
      ops.push(row);
      block.flow.push(["s", row.n]);
      block.opCount++;
    } else if (op === "playse" || op === "createsoundtask") {
      const row: Row = { op, label: current, line: lineNo(i), args };
      if (op === "playse") {
        row.song = args[0];
        row.songId = songs.get(args[0]!) ?? null;
      } else {
        row.task = args[0];
        row.songs = args.filter((a) => songs.has(a)).map((a) => ({ song: a, songId: songs.get(a)! }));
      }
      otherOps.push(row);
      block.flow.push(["x", otherOps.length - 1]);
    } else if (JUMP_OPS[op]) {
      const spec = JUMP_OPS[op]!;
      const targets = spec.labelArgs.map((idx) => args[idx]!);
      const item: unknown[] = [spec.kind, op, ...targets, lineNo(i)];
      if (spec.kind === "jump" && op !== "choosetwoturnanim") item.push(args.filter((_, idx) => !spec.labelArgs.includes(idx)).join(", "));
      block.flow.push(item);
      if (op === "goto") ended = true;
    } else if (op === "end" || op === "return") {
      block.flow.push([op, lineNo(i)]);
      ended = true;
    }
  }
  void prevBlockLabel;
  void pendingAliases;

  // resolve alias runs to the label that owns the code
  const ownerOf = (name: string): string => {
    let cur = name;
    for (let guard = 0; guard < 16; guard++) {
      const a = labels.get(cur)?.aliasOf;
      if (!a) return cur;
      cur = a;
    }
    throw new Error(`alias loop at ${name}`);
  };
  return { ops, otherOps, labels, labelOrder, ownerOf, lines };
}

function parseAnimTables(
  lines: string[],
  ownerOf: (n: string) => string,
  labels: Map<string, { line: number }>,
) {
  const tables: Array<{ table: string; symbol: string; first: number }> = [
    { table: "Moves", symbol: "gBattleAnims_Moves", first: 0 },
    { table: "StatusConditions", symbol: "gBattleAnims_StatusConditions", first: 0 },
    { table: "General", symbol: "gBattleAnims_General", first: 0 },
    { table: "Special", symbol: "gBattleAnims_Special", first: 0 },
  ];
  const moveByValue = new Map<number, string>();
  for (const [name, v] of moveIds) if (!moveByValue.has(v)) moveByValue.set(v, name);
  const entries: Row[] = [];
  for (const t of tables) {
    const at = lines.findIndex((l) => l.startsWith(`${t.symbol}::`));
    if (at < 0) throw new Error(`missing ${t.symbol}`);
    let index = 0;
    for (let i = at + 1; i < lines.length; i++) {
      const l = lines[i]!;
      if (l.trim() === "" || /^\s*\.align/.test(l)) break;
      const m = /^\s*\.4byte\s+([A-Za-z0-9_]+)\s*(?:@\s*(\S+))?/.exec(l);
      if (!m) throw new Error(`${t.symbol}: unexpected line ${lineNo(i)}`);
      const label = m[1]!;
      if (!labels.has(label)) throw new Error(`${t.symbol}: unknown label ${label}`);
      const row: Row = { table: t.table, index, label, body: ownerOf(label), line: lineNo(i) };
      if (t.table === "Moves") {
        const sym = moveByValue.get(index);
        row.id = sym ?? null;
        if (sym === undefined) row.unreachable = true;
      } else if (m[2]) {
        row.id = m[2];
      }
      entries.push(row);
      index++;
    }
  }
  return entries;
}

function walkEntries(
  entries: Row[],
  labels: Map<string, { line: number; flow: unknown[]; aliasOf?: string; nextLabel?: string; falls: boolean }>,
  ownerOf: (n: string) => string,
  ops: AnimOp[],
) {
  const reachCache = new Map<string, { reach: string[]; ops: number[]; branchy: boolean }>();
  const walk = (start: string) => {
    const owner = ownerOf(start);
    const cached = reachCache.get(owner);
    if (cached) return cached;
    const reach: string[] = [];
    const opIds: number[] = [];
    let branchy = false;
    const seen = new Set<string>();
    const visit = (name: string) => {
      const label = ownerOf(name);
      if (seen.has(label)) return;
      seen.add(label);
      reach.push(label);
      const block = labels.get(label);
      if (!block) throw new Error(`unknown label ${label}`);
      const deferred: string[] = [];
      for (const item of block.flow) {
        const it = item as unknown[];
        if (it[0] === "s") opIds.push(it[1] as number);
        else if (it[0] === "call") visit(it[2] as string);
        else if (it[0] === "goto") deferred.unshift(it[2] as string);
        else if (it[0] === "jump") {
          branchy = true;
          for (const t of it.slice(2, it.length - 1)) {
            if (typeof t === "string" && labels.has(t)) deferred.push(t);
          }
        }
      }
      // a block that neither ends nor jumps unconditionally falls into the next label
      const last = block.flow[block.flow.length - 1] as unknown[] | undefined;
      const terminal = last !== undefined && (last[0] === "end" || last[0] === "return" || last[0] === "goto");
      if (!terminal && block.nextLabel) deferred.push(block.nextLabel);
      for (const d of deferred) visit(d);
    };
    visit(owner);
    const result = { reach, ops: opIds, branchy };
    reachCache.set(owner, result);
    return result;
  };
  void ops;
  return entries.map((e) => {
    const w = walk(e.body as string);
    return { ...e, reach: w.reach, ops: w.ops, branchy: w.branchy };
  });
}

// ---------------------------------------------------------------------------
// C call-site scanner shared by (b), (c), (d)

const SOUND_CALL_RE =
  /\b(PlaySE12WithPanning|PlaySE1WithPanning|PlaySE2WithPanning|PlaySE|PlayCry[A-Za-z0-9_]*|PlayBGM|PlayFanfareByFanfareNum|PlayFanfare|PlayFanfareOrBGM|PlayNewMapMusic|PlayMapChosenOrBattleBGM|CreateTask_PlayMapChosenOrBattleBGM|PlayBattleBGM|FadeOutBGM|FadeInBGM|FadeOutMapMusic|FadeOutAndPlayNewMapMusic|FadeOutAndFadeInNewMapMusic|FadeInNewMapMusic|StopMapMusic|StopCry|StopCryAndClearCrySongs|SE12PanpotControl|BtlController_EmitPlaySE|BtlController_EmitPlayFanfareOrBGM|BtlController_EmitFaintingCry|m4a[A-Za-z0-9_]+)\s*\(/g;

function callKind(name: string): string {
  if (/^PlaySE/.test(name)) return name === "PlaySE" ? "se" : "se-pan";
  if (/^PlayCry/.test(name)) return "cry";
  if (name === "PlayBGM" || name === "PlayBattleBGM" || /MapChosenOrBattleBGM/.test(name) || name === "PlayNewMapMusic") return "bgm";
  if (/^PlayFanfare/.test(name)) return "fanfare";
  if (/^Fade/.test(name) || /Fade/.test(name)) return "fade";
  if (/^Stop|Stop/.test(name)) return "stop";
  if (name === "SE12PanpotControl") return "pan";
  if (/^BtlController_Emit/.test(name)) return "controller-emit";
  if (name === "m4aSongNumStart") return "se";
  if (/^m4aMPlay/.test(name)) return "m4a-control";
  return "other";
}

interface CSite extends Row {
  file: string;
  line: number;
  fn: string | null;
  call: string;
  kind: string;
  args: string[];
}

function stripComments(lines: string[]): string[] {
  let inBlock = false;
  return lines.map((l) => {
    let out = "";
    let i = 0;
    while (i < l.length) {
      if (inBlock) {
        const end = l.indexOf("*/", i);
        if (end < 0) {
          i = l.length;
        } else {
          inBlock = false;
          i = end + 2;
        }
      } else if (l.startsWith("/*", i)) {
        inBlock = true;
        i += 2;
      } else if (l.startsWith("//", i)) {
        break;
      } else {
        out += l[i];
        i++;
      }
    }
    return out;
  });
}

function enclosingFunctions(lines: string[]): Array<string | null> {
  const result: Array<string | null> = new Array(lines.length).fill(null);
  let fn: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (fn === null && l === "{") {
      let j = i - 1;
      const sig: string[] = [];
      while (j >= 0 && lines[j]!.trim() !== "" && !/[;}]\s*$/.test(lines[j]!) && !lines[j]!.startsWith("#")) {
        sig.unshift(lines[j]!);
        j--;
        if (sig.length > 8) break;
      }
      const m = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(sig.join(" "));
      fn = m ? m[1]! : "?";
    }
    result[i] = fn;
    if (fn !== null && l === "}") fn = null;
  }
  return result;
}

function indentOf(line: string): number {
  const m = /^(\s*)/.exec(line)!;
  return m[1]!.replace(/\t/g, "    ").length;
}

function contextOf(lines: string[], i: number, fnLine: number): string[] {
  const out: string[] = [];
  let indent = indentOf(lines[i]!);
  for (let j = i - 1; j >= fnLine && indent > 4; j--) {
    const t = lines[j]!;
    if (t.trim() === "" || t.trim() === "{" || t.trim() === "}") continue;
    const ind = indentOf(t);
    if (ind < indent && /^\s*(if|else|case|default|switch|for|while|do)\b/.test(t)) {
      out.unshift(t.trim().replace(/\s+/g, " "));
      indent = ind;
    }
  }
  return out;
}

interface ScanOpts {
  includeContext?: boolean;
  filter?: (name: string) => boolean;
}

function scanCFile(rel: string, opts: ScanOpts = {}): { sites: CSite[]; definitions: number } {
  const lines = readRef(rel).split("\n");
  const code = stripComments(lines);
  const fns = enclosingFunctions(code);
  const sites: CSite[] = [];
  let definitions = 0;
  for (let i = 0; i < code.length; i++) {
    const text = code[i]!;
    SOUND_CALL_RE.lastIndex = 0;
    for (const m of text.matchAll(SOUND_CALL_RE)) {
      const name = m[1]!;
      if (opts.filter && !opts.filter(name)) continue;
      if (/^[A-Za-z_#]/.test(text)) {
        // a definition or prototype starts in column 0
        definitions++;
        continue;
      }
      // collect balanced argument text, possibly across lines
      let argText = "";
      let depth = 0;
      let started = false;
      let j = i;
      let col = m.index! + m[0].length - 1;
      outer: for (; j < Math.min(code.length, i + 8); j++) {
        const src = code[j]!;
        for (; col < src.length; col++) {
          const ch = src[col]!;
          if (ch === "(") {
            depth++;
            if (!started) {
              started = true;
              continue;
            }
          } else if (ch === ")") {
            depth--;
            if (depth === 0) break outer;
          }
          argText += ch;
        }
        argText += " ";
        col = 0;
      }
      const args = splitArgs(argText.trim());
      const site: CSite = { file: rel, line: lineNo(i), fn: fns[i] ?? null, call: name, kind: callKind(name), args };
      annotateSite(site);
      if (opts.includeContext && fns[i]) {
        let fnLine = i;
        while (fnLine > 0 && fns[fnLine - 1] === fns[i]) fnLine--;
        const ctx = contextOf(lines, i, fnLine);
        if (ctx.length > 0) site.ctx = ctx;
      }
      sites.push(site);
    }
  }
  return { sites, definitions };
}

function annotateSite(site: CSite): void {
  const args = site.args;
  const songArg = args.find((a) => songs.has(a));
  if (songArg !== undefined && site.kind !== "m4a-control") {
    site.song = songArg;
    site.songId = songs.get(songArg)!;
  }
  if (site.call.startsWith("PlaySE") && site.call !== "PlaySE" && args.length >= 2) {
    site.pan = args[1]!;
    const v = evalInt(args[1]!);
    if (v !== null) site.panValue = v;
  }
  if (site.call.startsWith("PlayCry")) {
    site.species = args[0] ?? null;
    if (args.length >= 2) site.pan = args[1]!;
    const modeArg = args.find((a) => cryModes.has(a));
    if (modeArg !== undefined) {
      site.mode = modeArg;
      site.modeId = cryModes.get(modeArg)!;
    } else if (site.call === "PlayCry_Normal" || site.call === "PlayCry_NormalNoDucking") {
      site.mode = "CRY_MODE_NORMAL";
      site.modeId = 0;
    }
  }
  const fanfareArg = args.find((a) => fanfares.has(a));
  if (fanfareArg !== undefined) {
    site.fanfare = fanfareArg;
    site.fanfareId = fanfares.get(fanfareArg)!;
  }
}

// (b) -----------------------------------------------------------------------

const C_ANIM_FILES = [
  "src/battle_anim.c",
  "src/battle_anim_effects_1.c",
  "src/battle_anim_effects_2.c",
  "src/battle_anim_effects_3.c",
  "src/battle_anim_electric.c",
  "src/battle_anim_fire.c",
  "src/battle_anim_ghost.c",
  "src/battle_anim_psychic.c",
  "src/battle_anim_rock.c",
  "src/battle_anim_sound_tasks.c",
  "src/battle_anim_throw.c",
  "src/battle_anim_utility_funcs.c",
];
const C_ANIM_PLAY_RE = /^(PlaySE12WithPanning|PlaySE1WithPanning|PlaySE2WithPanning|PlaySE|PlayCry[A-Za-z0-9_]*)$/;

function extractCAnim() {
  const rows: CSite[] = [];
  const other: CSite[] = [];
  for (const rel of C_ANIM_FILES) {
    rows.push(...scanCFile(rel, { includeContext: true, filter: (n) => C_ANIM_PLAY_RE.test(n) }).sites);
    other.push(...scanCFile(rel, { filter: (n) => !C_ANIM_PLAY_RE.test(n) }).sites);
  }
  return { rows, other };
}

// (c) -----------------------------------------------------------------------

const SITE_FILES: Array<{ file: string; family: string }> = [
  { file: "src/battle_factory_screen.c", family: "factory-screen" },
  { file: "src/pokemon_summary_screen.c", family: "summary-screen" },
  { file: "src/party_menu.c", family: "party-menu" },
  { file: "src/menu.c", family: "menu" },
  { file: "src/menu_helpers.c", family: "menu" },
  { file: "src/list_menu.c", family: "menu" },
  { file: "src/text.c", family: "text" },
  { file: "src/battle_controller_player.c", family: "battle-controller" },
  { file: "src/battle_controller_opponent.c", family: "battle-controller" },
  { file: "src/battle_script_commands.c", family: "battle-script" },
  { file: "src/battle_main.c", family: "battle-main" },
  { file: "src/pokeball.c", family: "ball" },
  { file: "src/battle_interface.c", family: "battle-interface" },
  { file: "src/battle_gfx_sfx_util.c", family: "battle-gfx" },
  { file: "src/sound.c", family: "sound-core" },
  { file: "src/field_player_avatar.c", family: "field" },
  { file: "src/field_control_avatar.c", family: "field" },
  { file: "src/field_screen_effect.c", family: "field" },
  { file: "src/start_menu.c", family: "field" },
];

function extractSites() {
  const rows: CSite[] = [];
  const definitionsSkipped: Record<string, number> = {};
  for (const { file, family } of SITE_FILES) {
    const r = scanCFile(file, { includeContext: true });
    for (const s of r.sites) {
      s.family = family;
      rows.push(s);
    }
    definitionsSkipped[file] = r.definitions;
  }
  return { rows, definitionsSkipped };
}

const BATTLE_SCRIPT_REL = "data/battle_scripts_1.s";
const BATTLE_SCRIPT_OPS = ["effectivenesssound", "playse", "playfaintcry", "fanfare", "waitcry"];

function extractBattleScriptUses() {
  const lines = readRef(BATTLE_SCRIPT_REL).split("\n");
  const rows: Row[] = [];
  let label: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i]!.replace(/@.*$/, "").replace(/\s+$/, "");
    const lm = /^([A-Za-z_][A-Za-z0-9_]*)::?$/.exec(code);
    if (lm) {
      label = lm[1]!;
      continue;
    }
    const im = /^\s+([a-z_][a-z_0-9]*)\s*(.*)$/.exec(code);
    if (!im || !BATTLE_SCRIPT_OPS.includes(im[1]!)) continue;
    const args = splitArgs(im[2]!);
    const row: Row = { file: BATTLE_SCRIPT_REL, line: lineNo(i), label, op: im[1]!, args };
    const songArg = args.find((a) => songs.has(a));
    if (songArg !== undefined) {
      row.song = songArg;
      row.songId = songs.get(songArg)!;
    }
    rows.push(row);
  }
  return rows;
}

// (d) -----------------------------------------------------------------------

function extractBattleBgm() {
  const rel = "src/pokemon.c";
  const lines = readRef(rel).split("\n");
  const start = lines.findIndex((l) => l.startsWith("u16 GetBattleBGM(void)"));
  if (start < 0) throw new Error("GetBattleBGM not found");
  let end = start;
  while (lines[end] !== "}") end++;
  const body = lines.slice(start, end + 1);
  const flagBranches: Row[] = [];
  const caseGroups: Row[] = [];
  let pendingCond: string | null = null;
  let inSwitch = false;
  let cases: string[] = [];
  let group: { classes: string[]; returns: Row[]; line: number } | null = null;
  let defaultSong: Row | null = null;
  const pushSong = (sym: string, line: number, when: string | null) => {
    const id = songs.get(sym);
    if (id === undefined) throw new Error(`GetBattleBGM: unknown song ${sym}`);
    return { when, song: sym, songId: id, line } as Row;
  };
  for (let i = 0; i < body.length; i++) {
    const t = body[i]!.trim();
    const line = start + i + 1;
    if (/^switch \(trainerClass\)/.test(t)) {
      inSwitch = true;
      pendingCond = null;
      continue;
    }
    if (!inSwitch) {
      const ifm = /^(?:else )?if \((.*)\)$/.exec(t);
      if (ifm) {
        pendingCond = ifm[1]!;
        if (pendingCond === "gBattleTypeFlags & BATTLE_TYPE_TRAINER") {
          flagBranches.push({ order: flagBranches.length, when: pendingCond, song: null, songId: null, line, via: "trainerClassSwitch" });
        }
      } else if (/^else$/.test(t)) pendingCond = "otherwise (no earlier branch matched)";
      const rm = /^return (MUS_[A-Z0-9_]+);$/.exec(t);
      if (rm) {
        flagBranches.push({ order: flagBranches.length, ...pushSong(rm[1]!, line, pendingCond) });
        pendingCond = null;
      }
      continue;
    }
    const cm = /^case (TRAINER_CLASS_[A-Z0-9_]+):$/.exec(t);
    if (cm) {
      if (group && group.returns.length > 0) {
        caseGroups.push(group);
        group = null;
        cases = [];
      }
      cases.push(cm[1]!);
      group = group ?? { classes: cases, returns: [], line };
      group.classes = cases;
      continue;
    }
    if (/^default:$/.test(t)) {
      if (group && group.returns.length > 0) caseGroups.push(group);
      group = null;
      cases = [];
      continue;
    }
    const ifm = /^if \((.*)\)$/.exec(t);
    if (ifm) {
      pendingCond = ifm[1]!;
      continue;
    }
    const rm = /^return (MUS_[A-Z0-9_]+);$/.exec(t);
    if (rm) {
      if (group) {
        group.returns.push(pushSong(rm[1]!, line, pendingCond));
      } else {
        defaultSong = pushSong(rm[1]!, line, null);
      }
      pendingCond = null;
    }
    if (body[i] === "    else") {
      // left the trainer branch: the final `else` is the wild-battle song
      inSwitch = false;
      pendingCond = "otherwise (no earlier branch matched)";
    }
  }
  // the last `return MUS_VS_WILD` after the trainer branch is an else branch handled in flagBranches
  const classToBgm = new Map<string, Row>();
  const caseRows = caseGroups.map((g) => ({
    classes: (g.classes as string[]).map((c) => ({ class: c, classId: trainerClasses.get(c) ?? null })),
    returns: g.returns,
    line: g.line,
  }));
  for (const g of caseGroups) {
    for (const c of g.classes as string[]) classToBgm.set(c, { returns: g.returns });
  }
  if (!defaultSong) throw new Error("GetBattleBGM default missing");
  if (flagBranches.length !== 5) throw new Error(`GetBattleBGM flag branches changed: ${JSON.stringify(flagBranches)}`);

  // Factory trainer classes
  const lookups = JSON.parse(readRepo("src/data/gen/facility-class-lookups.json")) as {
    entries: Array<{ facilityClass: { symbol: string; id: number }; trainerClass: { symbol: string; id: number } }>;
  };
  const trainersJson = JSON.parse(readRepo("src/data/gen/battle-frontier-trainers.json")) as {
    entries: Array<{ id: number; sourceId: string; facilityClass: { source: string } }>;
  };
  const policy = JSON.parse(readRepo("src/data/gen/factory-round-policy.json")) as {
    trainerSelection: { normalRanges: Array<{ start: number; end: number }>; hardRanges: Array<{ start: number; end: number }> };
  };
  const facilityToClass = new Map(lookups.entries.map((e) => [e.facilityClass.symbol, e.trainerClass.symbol]));
  const reachable = new Set<number>();
  for (const r of [...policy.trainerSelection.normalRanges, ...policy.trainerSelection.hardRanges]) {
    for (let id = r.start; id <= r.end; id++) reachable.add(id);
  }
  const songForClass = (cls: string): { song: string; songId: number; when: string | null; branch: string } => {
    const g = classToBgm.get(cls);
    if (!g) {
      return { song: defaultSong!.song as string, songId: defaultSong!.songId as number, when: null, branch: "default" };
    }
    // Factory is a frontier battle: pick the return whose condition is absent or mentions BATTLE_TYPE_FRONTIER
    const returns = (g as { returns: Row[] }).returns;
    const frontier = returns.find((r) => typeof r.when === "string" && (r.when as string).includes("BATTLE_TYPE_FRONTIER"));
    const pick = frontier ?? returns.find((r) => r.when === null) ?? returns[0]!;
    return { song: pick.song as string, songId: pick.songId as number, when: (pick.when as string | null) ?? null, branch: `case ${cls}` };
  };
  const byFacility = new Map<string, { trainerClass: string; song: string; songId: number; branch: string; ids: number[] }>();
  const unknown: string[] = [];
  for (const t of trainersJson.entries) {
    const fc = t.facilityClass.source;
    const cls = facilityToClass.get(fc);
    if (!cls) {
      unknown.push(fc);
      continue;
    }
    const s = songForClass(cls);
    let row = byFacility.get(fc);
    if (!row) {
      row = { trainerClass: cls, song: s.song, songId: s.songId, branch: s.branch, ids: [] };
      byFacility.set(fc, row);
    }
    row.ids.push(t.id);
  }
  const bgmBySong = new Map<string, { songId: number; trainers: number; reachableTrainers: number; facilityClasses: string[] }>();
  for (const [fc, row] of [...byFacility.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const e = bgmBySong.get(row.song) ?? { songId: row.songId, trainers: 0, reachableTrainers: 0, facilityClasses: [] };
    e.trainers += row.ids.length;
    e.reachableTrainers += row.ids.filter((id) => reachable.has(id)).length;
    e.facilityClasses.push(fc);
    bgmBySong.set(row.song, e);
  }
  const trainersSrc = readRef("src/data/trainers.h");
  const brainBlock = /\[TRAINER_NOLAND\]\s*=\s*\{[\s\S]*?\.trainerClass = (TRAINER_CLASS_[A-Z_0-9]+)/.exec(trainersSrc);
  if (!brainBlock) throw new Error("TRAINER_NOLAND class not found");
  const brainClass = brainBlock[1]!;
  const brainSong = songForClass(brainClass);

  const startSites = ["src/pokemon.c", "src/battle_tower.c", "src/battle_setup.c", "src/battle_main.c", "src/frontier_util.c", "src/battle_factory.c"].flatMap((file) =>
    scanCFile(file, {
      filter: (n) => n === "PlayBattleBGM" || n === "PlayMapChosenOrBattleBGM" || n === "CreateTask_PlayMapChosenOrBattleBGM" || n === "PlayNewMapMusic",
      includeContext: true,
    }).sites,
  );
  const quiet = /gMovesWithQuietBGM::\s*\n\s*\.2byte\s+([^\n]+)/.exec(readRef(ANIM_REL));

  return {
    source: { file: rel, function: "GetBattleBGM", startLine: start + 1, endLine: end + 1 },
    flagBranches,
    trainerClassSwitch: caseRows,
    defaultTrainerSong: defaultSong,
    factory: {
      note: "Factory trainers are BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER (not link, not Regi/Kyogre): the class switch decides. Brain = TRAINER_NOLAND via GetFrontierBrainTrainerClass.",
      brain: { trainer: "TRAINER_NOLAND", trainerClass: brainClass, ...brainSong },
      songs: [...bgmBySong.entries()].map(([song, v]) => ({ song, ...v })),
      byFacilityClass: [...byFacility.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([facilityClass, v]) => ({
          facilityClass,
          trainerClass: v.trainerClass,
          song: v.song,
          songId: v.songId,
          branch: v.branch,
          trainers: v.ids.length,
          reachableTrainers: v.ids.filter((id) => reachable.has(id)).length,
        })),
      unknownFacilityClasses: unknown,
      crossReference: [
        "src/data/gen/facility-class-lookups.json (facility class -> trainer class)",
        "src/data/gen/battle-frontier-trainers.json (trainer id -> facility class)",
        "src/data/gen/factory-round-policy.json trainerSelection.normalRanges/hardRanges (reachable trainer ids)",
      ],
    },
    startSites,
    quietBgmMoves: quiet ? quiet[1]!.split(",").map((s) => s.trim()).filter((s) => s !== "0xFFFF") : [],
  };
}

// (e) -----------------------------------------------------------------------

const FACTORY_MAPS = ["BattleFrontier_BattleFactoryLobby", "BattleFrontier_BattleFactoryPreBattleRoom", "BattleFrontier_BattleFactoryBattleRoom"];
const MAP_SOUND_OPS = ["playse", "waitse", "playfanfare", "waitfanfare", "playbgm", "savebgm", "fadedefaultbgm", "fadeoutbgm", "fadeinbgm", "fadenewbgm", "playmoncry", "waitmoncry"];

function extractMapMusic() {
  const maps: Row[] = [];
  const scriptOps: Row[] = [];
  for (const name of FACTORY_MAPS) {
    const json = JSON.parse(readRef(`data/maps/${name}/map.json`)) as { id: string; music: string };
    const music = json.music;
    maps.push({ map: name, id: json.id, music, musicId: songs.get(music) ?? null, file: `data/maps/${name}/map.json` });
    const rel = `data/maps/${name}/scripts.inc`;
    const lines = readRef(rel).split("\n");
    let label: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const code = lines[i]!.replace(/@.*$/, "").replace(/\s+$/, "");
      const lm = /^([A-Za-z_][A-Za-z0-9_]*)::?$/.exec(code);
      if (lm) {
        label = lm[1]!;
        continue;
      }
      const im = /^\s+([a-z_][a-z_0-9]*)\s*(.*)$/.exec(code);
      if (!im || !MAP_SOUND_OPS.includes(im[1]!)) continue;
      const args = splitArgs(im[2]!);
      const row: Row = { map: name, file: rel, line: lineNo(i), label, op: im[1]!, args };
      const songArg = args.find((a) => songs.has(a));
      if (songArg !== undefined) {
        row.song = songArg;
        row.songId = songs.get(songArg)!;
      }
      scriptOps.push(row);
    }
  }
  return { maps, scriptOps };
}

// (f) -----------------------------------------------------------------------

const WAIT_TICKS = (() => {
  const text = readRef("sound/MPlayDef.s");
  const out = new Map<string, number>();
  for (const m of text.matchAll(/^\s*\.equ\s+(W\d\d),\s+W00\+(\d+)/gm)) {
    out.set(m[1]!, 0);
  }
  for (const name of out.keys()) out.set(name, Number(name.slice(1)));
  return out;
})();

function songTable(): Map<string, { index: number; player: string }> {
  const text = readRef("sound/song_table.inc");
  const out = new Map<string, { index: number; player: string }>();
  let index = 0;
  for (const m of text.matchAll(/^\s*song\s+([a-z0-9_]+),\s*(MUSIC_PLAYER_[A-Z0-9]+),\s*\d+/gm)) {
    out.set(m[1]!, { index, player: m[2]! });
    index++;
  }
  return out;
}

interface TrackItem {
  type: "label" | "wait" | "patt" | "pend" | "goto" | "fine" | "tempo";
  value?: number | string;
  line: number;
}

function parseSong(rel: string, name: string) {
  const lines = readRef(rel).split("\n");
  const equs = new Map<string, number>();
  for (const l of lines) {
    const m = /^\s*\.equ\s+([a-z0-9_]+),\s*(-?\d+)\s*(?:@.*)?$/.exec(l);
    if (m) equs.set(m[1]!, Number(m[2]));
  }
  const tracks: Array<{ name: string; startLine: number; items: TrackItem[] }> = [];
  let cur: { name: string; startLine: number; items: TrackItem[] } | null = null;
  let pendingWord: "patt" | "goto" | null = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const code = raw.replace(/@.*$/, "").replace(/\s+$/, "");
    if (code.trim() === "") continue;
    const lm = /^([A-Za-z0-9_]+):$/.exec(code);
    if (lm) {
      const label = lm[1]!;
      if (new RegExp(`^${name}_\\d+$`).test(label)) {
        cur = { name: label, startLine: lineNo(i), items: [] };
        tracks.push(cur);
      } else if (cur) {
        cur.items.push({ type: "label", value: label, line: lineNo(i) });
      }
      continue;
    }
    if (!cur) continue;
    const wm = /^\s+\.word\s+([A-Za-z0-9_]+)\s*$/.exec(code);
    if (wm && pendingWord) {
      cur.items.push({ type: pendingWord, value: wm[1]!, line: lineNo(i) });
      pendingWord = null;
      continue;
    }
    const bm = /^\s+\.byte\s+(.*)$/.exec(code);
    if (!bm) continue;
    const parts = bm[1]!.split(",").map((s) => s.trim());
    const head = parts[0]!;
    if (WAIT_TICKS.has(head)) cur.items.push({ type: "wait", value: WAIT_TICKS.get(head)!, line: lineNo(i) });
    else if (head === "PATT") pendingWord = "patt";
    else if (head === "GOTO") pendingWord = "goto";
    else if (head === "PEND") cur.items.push({ type: "pend", line: lineNo(i) });
    else if (head === "FINE") cur.items.push({ type: "fine", line: lineNo(i) });
    else if (head === "TEMPO") {
      const v = evalInt(parts[1] ?? "", equs);
      cur.items.push({ type: "tempo", value: v === null ? (parts[1] ?? "") : v, line: lineNo(i) });
    }
  }

  const trackRows = tracks.map((t) => {
    const labelIdx = new Map<string, number>();
    t.items.forEach((it, idx) => {
      if (it.type === "label") labelIdx.set(it.value as string, idx);
    });
    const labelLine = (n: string) => t.items[labelIdx.get(n)!]!.line;
    const tickAtLabel = new Map<string, number>();
    const stack: number[] = [];
    let pc = 0;
    let tick = 0;
    let steps = 0;
    let ends: "GOTO" | "FINE" | "EOF" = "EOF";
    let gotoLabel: string | null = null;
    let gotoLine: number | null = null;
    let loopStartTick: number | null = null;
    let loopEndTick: number | null = null;
    const tempo: Array<[number, number]> = [];
    const pendLines: number[] = [];
    while (pc < t.items.length && steps++ < 200000) {
      const it = t.items[pc]!;
      if (it.type === "label") {
        if (!tickAtLabel.has(it.value as string)) tickAtLabel.set(it.value as string, tick);
        pc++;
      } else if (it.type === "wait") {
        tick += it.value as number;
        pc++;
      } else if (it.type === "patt") {
        stack.push(pc + 1);
        pc = labelIdx.get(it.value as string)!;
      } else if (it.type === "pend") {
        const ret = stack.pop();
        if (ret === undefined) {
          pc++; // PEND outside a pattern call is the inline first occurrence: a no-op
        } else {
          pendLines.push(it.line);
          pc = ret;
        }
      } else if (it.type === "tempo") {
        if (typeof it.value === "number") tempo.push([tick, it.value * 2]);
        pc++;
      } else if (it.type === "goto") {
        ends = "GOTO";
        gotoLabel = it.value as string;
        gotoLine = it.line;
        loopEndTick = tick;
        loopStartTick = tickAtLabel.get(gotoLabel) ?? null;
        break;
      } else if (it.type === "fine") {
        ends = "FINE";
        loopEndTick = tick;
        break;
      }
    }
    const row: Row = {
      track: t.name,
      startLine: t.startLine,
      ends,
      endTick: tick,
    };
    if (ends === "GOTO" && gotoLabel) {
      row.gotoLine = gotoLine;
      row.loopLabel = gotoLabel;
      row.loopLabelLine = labelLine(gotoLabel);
      row.loopStartTick = loopStartTick;
      row.loopEndTick = loopEndTick;
    }
    if (tempo.length > 0) row.tempoBpm = tempo.filter((p, i, a) => i === 0 || p[1] !== a[i - 1]![1]);
    row.pattCalls = t.items.filter((x) => x.type === "patt").length;
    row.pendReturns = pendLines.length;
    return row;
  });
  const goto = trackRows.filter((r) => r.ends === "GOTO");
  const starts = new Set(goto.map((r) => r.loopStartTick));
  const endsSet = new Set(goto.map((r) => r.loopEndTick));
  const lengths = new Set(trackRows.map((r) => (r.ends === "GOTO" ? r.loopEndTick : r.endTick)));
  const tempoRow = trackRows.find((r) => r.tempoBpm);
  return {
    file: rel,
    trackCount: trackRows.length,
    loops: goto.length > 0,
    loopStartTick: goto.length > 0 ? goto[0]!.loopStartTick : null,
    loopEndTick: goto.length > 0 ? goto[0]!.loopEndTick : null,
    loopConsistentAcrossTracks: goto.length > 0 ? starts.size === 1 && endsSet.size === 1 && goto.length === trackRows.length : null,
    allTracksSameLength: lengths.size === 1,
    totalTicks: Math.max(...trackRows.map((r) => (r.endTick as number))),
    tempoBpm: tempoRow ? tempoRow.tempoBpm : null,
    tracks: trackRows,
  };
}

// ---------------------------------------------------------------------------
// output formatting (one row per line so diffs and sizes stay sane)

function fmt(value: unknown, depth: number, maxExpand: number): string {
  const pad = "  ".repeat(depth);
  const pad1 = "  ".repeat(depth + 1);
  if (depth >= maxExpand || value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((v) => v === null || typeof v !== "object")) return JSON.stringify(value);
    return `[\n${value.map((v) => pad1 + JSON.stringify(v)).join(",\n")}\n${pad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return `{\n${entries.map(([k, v]) => `${pad1}${JSON.stringify(k)}: ${fmt(v, depth + 1, maxExpand)}`).join(",\n")}\n${pad}}`;
}

// ---------------------------------------------------------------------------
// main

function distinct<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function countBy<T>(xs: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

function main() {
  // (a)
  const anim = parseAnimScripts();
  const tableEntries = parseAnimTables(anim.lines, anim.ownerOf, anim.labels);
  const walked = walkEntries(tableEntries, anim.labels, anim.ownerOf, anim.ops);
  const entries = walked.map((e, idx) => ({ e: idx, ...e }));
  // attach "which entries use this op" to each op
  const usedBy = new Map<number, number[]>();
  entries.forEach((e, idx) => {
    for (const n of e.ops) {
      const list = usedBy.get(n) ?? [];
      if (list[list.length - 1] !== idx) list.push(idx);
      usedBy.set(n, list);
    }
  });
  const opRows = anim.ops.map((o) => ({ ...o, entries: usedBy.get(o.n) ?? [] }));
  const labelRows: Record<string, unknown> = {};
  for (const name of anim.labelOrder) {
    const l = anim.labels.get(name)!;
    const row: Row = { line: l.line };
    if (l.aliasOf) row.aliasOf = l.aliasOf;
    if (l.falls && l.nextLabel) row.fallsInto = l.nextLabel;
    if (l.flow.length > 0) row.flow = l.flow;
    labelRows[name] = row;
  }

  // (b)
  const cAnim = extractCAnim();
  // (c)
  const sites = extractSites();
  const scriptUses = extractBattleScriptUses();
  // (d)
  const bgm = extractBattleBgm();
  // (e)
  const mapMusic = extractMapMusic();

  // (f) songs referenced as BGM / fanfare anywhere
  const musicSyms = new Set<string>();
  const noteMus = (s: unknown) => {
    if (typeof s === "string" && s.startsWith("MUS_")) musicSyms.add(s);
  };
  for (const r of [...cAnim.rows, ...sites.rows, ...bgm.startSites]) noteMus(r.song);
  for (const r of scriptUses) noteMus(r.song);
  for (const r of mapMusic.scriptOps) noteMus(r.song);
  for (const r of mapMusic.maps) noteMus(r.music);
  for (const r of bgm.flagBranches) noteMus(r.song);
  for (const g of bgm.trainerClassSwitch) for (const r of g.returns) noteMus(r.song);
  noteMus(bgm.defaultTrainerSong?.song);
  for (const r of anim.otherOps) noteMus(r.song);
  const table = songTable();
  const songByIndex = new Map<number, string>();
  for (const [n, v] of table) songByIndex.set(v.index, n);
  const songLoops: Row[] = [];
  for (const sym of [...musicSyms].sort((a, b) => (songs.get(a)! - songs.get(b)!))) {
    const id = songs.get(sym)!;
    const symbol = songByIndex.get(id);
    if (!symbol) throw new Error(`no song_table entry for ${sym} (${id})`);
    if (symbol !== sym.toLowerCase()) {
      // MUS_x may alias a differently named table entry (renamed songs); keep the table symbol authoritative
    }
    const rel = `sound/songs/midi/${symbol}.s`;
    const row: Row = { song: sym, songId: id, tableSymbol: symbol, player: table.get(symbol)!.player };
    if (existsSync(join(REF, rel))) Object.assign(row, parseSong(rel, symbol));
    else row.file = null;
    songLoops.push(row);
  }

  // counts
  const opCounts = countBy(anim.ops, (o) => o.op);
  const animSongIds = distinct(anim.ops.filter((o) => o.songId !== undefined).map((o) => o.songId as number));
  const siteCounts = countBy(sites.rows, (s) => s.file);
  const counts = {
    animScripts: {
      soundCommands: anim.ops.length,
      perOp: opCounts,
      distinctSongIds: animSongIds.length,
      distinctSongIdsPlayLoopWait: distinct(anim.ops.filter((o) => ["playsewithpan", "loopsewithpan", "waitplaysewithpan"].includes(o.op)).map((o) => o.songId as number)).length,
      distinctSongIdsInclPlayseAndSoundTasks: distinct([
        ...anim.ops.filter((o) => o.songId !== undefined).map((o) => o.songId as number),
        ...anim.otherOps.flatMap((o) => (o.op === "playse" ? [o.songId as number] : (o.songs as Array<{ songId: number }>).map((x) => x.songId))),
      ]).length,
      songBearingCommands: anim.ops.filter((o) => o.songId !== undefined).length,
      labels: anim.labelOrder.length,
      labelsWithSoundOps: distinct(anim.ops.map((o) => o.label)).length,
      entries: entries.length,
      entriesPerTable: countBy(entries, (e) => e.table as string),
      movesTableEntriesReachable: entries.filter((e) => e.table === "Moves" && !e.unreachable).length,
      entriesWithSound: entries.filter((e) => e.ops.length > 0).length,
      otherSoundOps: countBy(anim.otherOps, (o) => o.op as string),
    },
    cAnimSites: {
      total: cAnim.rows.length,
      perFile: countBy(cAnim.rows, (s) => s.file),
      perCall: countBy(cAnim.rows, (s) => s.call),
      otherSoundCalls: cAnim.other.length,
    },
    sites: {
      total: sites.rows.length,
      perFile: siteCounts,
      perFamily: countBy(sites.rows, (s) => s.family as string),
      perKind: countBy(sites.rows, (s) => s.kind),
      selectPerFile: countBy(
        sites.rows.filter((s) => s.song === "SE_SELECT"),
        (s) => s.file,
      ),
      failurePerFile: countBy(
        sites.rows.filter((s) => s.song === "SE_FAILURE"),
        (s) => s.file,
      ),
      definitionsSkippedPerFile: sites.definitionsSkipped,
      battleScriptUses: countBy(scriptUses, (r) => r.op as string),
    },
    battleBgm: {
      flagBranches: bgm.flagBranches.length,
      classSwitchGroups: bgm.trainerClassSwitch.length,
      classSwitchClasses: bgm.trainerClassSwitch.reduce((n, g) => n + g.classes.length, 0),
      startSites: bgm.startSites.length,
      factoryFacilityClasses: bgm.factory.byFacilityClass.length,
    },
    mapMusic: {
      maps: mapMusic.maps.length,
      scriptOps: mapMusic.scriptOps.length,
      scriptOpsPerOp: countBy(mapMusic.scriptOps, (r) => r.op as string),
    },
    songLoops: {
      songs: songLoops.length,
      withLoop: songLoops.filter((s) => s.loops === true).length,
      oneShot: songLoops.filter((s) => s.loops === false).length,
    },
  };

  let commit: string | null = null;
  try {
    commit = execFileSync("git", ["-C", REF, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    commit = null;
  }
  const hashes = Object.fromEntries([...fileHashes.entries()].sort((a, b) => a[0].localeCompare(b[0])));

  const output = {
    schema: "audio-sound-sources/v1",
    description: "ROM-source sound rule table for the S11 audio census (aud238). See docs/aud238-sound-sources.md.",
    generatedFrom: {
      extractor: "tools/extract/extract-audio-sound-sources.ts",
      referenceRepo: "reference/pokeemerald",
      referenceCommit: commit,
      fileCount: Object.keys(hashes).length,
      fileSha256_16: hashes,
    },
    counts,
    animScripts: {
      file: ANIM_REL,
      soundOps: opRows,
      otherSoundOps: anim.otherOps,
      labels: labelRows,
      entries: entries.map(({ e: _e, ...rest }) => rest),
    },
    cAnimSites: { files: C_ANIM_FILES, rows: cAnim.rows, otherSoundCalls: cAnim.other },
    sites: { rows: sites.rows, battleScriptUses: scriptUses },
    battleBgm: bgm,
    mapMusic,
    songLoops,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${fmt(output, 0, 3)}\n`);
  console.log(`wrote ${OUT_FILE}`);
  console.log(JSON.stringify(counts, null, 1));
}

main();
