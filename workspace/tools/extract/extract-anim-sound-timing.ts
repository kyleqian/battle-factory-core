// Dev-time extractor (S11 audio step aud242a): the script-frame timing of the sound ops in the battle-animation scripts.
// docs/aud242-move-anim-sounds.md. For every move body (gBattleAnims_Moves), per move turn 0..5, it walks data/battle_anim_scripts.s
// with the battle_anim.c VM clock and records the sound ops reached BEFORE the first data-dependent wait (waitforvisualfinish /
// waitbgfade* / waitsound) or unresolvable jump (jumpret*, jumpargeq on an unset arg). Output: src/data/gen/anim-sound-timing.json.
//
// VM clock (battle_anim.c RunAnimScriptCommand / WaitAnimFrameCount): commands run back to back inside one frame until one sets
// sAnimFramesToWait; a wait of w (delay 0 is -1) resumes the script max(w, 0) + 2 frames later; loadspritegfx and monbg wait 1.
// A command reached at script frame f runs at body age f + 1.
//
// Run with: node --experimental-strip-types tools/extract/extract-anim-sound-timing.ts [--out-dir DIR]
// (or `npm run extract:anim-sound-timing`). Never imported at runtime.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? join(RUN_ROOT, "src", "data", "gen") : process.argv[outDirIndex + 1]!;

const SCRIPT_PATH = join(REF, "data", "battle_anim_scripts.s");
const SONGS_PATH = join(REF, "include", "constants", "songs.h");
const scriptText = readFileSync(SCRIPT_PATH, "utf8");
const songsText = readFileSync(SONGS_PATH, "utf8");

const constants = new Map<string, number>([["SOUND_PAN_ATTACKER", -64], ["SOUND_PAN_TARGET", 63]]);
for (const m of songsText.matchAll(/^#define\s+((?:SE|MUS)_\w+)\s+(\d+)/gm)) constants.set(m[1]!, Number(m[2]));

function value(token: string): number {
  const t = token.trim();
  if (constants.has(t)) return constants.get(t)!;
  if (/^-?(0x[0-9a-f]+|\d+)$/i.test(t)) return Number(t);
  throw new Error(`unresolved script constant ${t}`);
}

interface Command { op: string; args: string[]; line: number }
const labels = new Map<string, Command[]>();
const order: string[] = [];
const moveTable: string[] = [];
{
  const lines = scriptText.split("\n");
  let current: string | null = null;
  let table: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const code = lines[i]!.replace(/@.*$/, "").trimEnd();
    if (code.trim() === "") continue;
    const label = /^([A-Za-z_]\w*)::?$/.exec(code);
    if (label !== null) {
      current = label[1]!;
      table = current === "gBattleAnims_Moves" ? current : null;
      if (table === null) { labels.set(current, []); order.push(current); }
      continue;
    }
    const word = /^\s+\.4byte\s+(\w+)/.exec(code);
    if (table !== null && word !== null) { moveTable.push(word[1]!); continue; }
    if (/^\s*[.#]/.test(code)) continue;
    const cmd = /^\s+([a-z_]\w*)\s*(.*)$/.exec(code);
    if (cmd !== null && current !== null && table === null) {
      labels.get(current)!.push({
        op: cmd[1]!,
        args: cmd[2]!.trim() === "" ? [] : cmd[2]!.split(",").map((a) => a.trim()),
        line: i + 1,
      });
    }
  }
}

interface SoundOp {
  op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan";
  frame: number;
  id: number;
  pan: number | null;
  wait?: number;
  times?: number;
  line: number;
}
interface Walk { events: SoundOp[]; end: "end" | "wait" | "jumpret" | "jumpargeq" | "limit"; frame: number; gated: number }

function walk(bodyLabel: string, turn: number): Walk {
  const events: SoundOp[] = [];
  const stack: Array<[string, number]> = [];
  let frame = 0;
  let cut: Walk["end"] | null = null;
  let gated = 0;
  const finish = (end: Walk["end"]): Walk => ({ events, end: cut ?? end, frame, gated });
  let pc: [string, number] = [bodyLabel, 0];
  for (let steps = 0; steps < 20000; steps += 1) {
    let [label, index] = pc;
    let program = labels.get(label);
    if (program === undefined) throw new Error(`no label ${label}`);
    while (index >= program.length) {
      const next = order[order.indexOf(label) + 1];
      if (next === undefined) return finish("limit");
      label = next;
      index = 0;
      program = labels.get(label)!;
    }
    const { op, args, line } = program[index]!;
    pc = [label, index + 1];
    switch (op) {
      case "end": return finish("end");
      case "return": { const back = stack.pop(); if (back === undefined) return finish("limit"); pc = back; break; }
      case "call": stack.push(pc); pc = [args[0]!, 0]; break;
      case "goto": pc = [args[0]!, 0]; break;
      case "delay": frame += Math.max(value(args[0]!), 0) + 2; break;
      case "loadspritegfx": case "monbg": frame += 3; break;
      case "waitforvisualfinish": case "waitbgfadein": case "waitbgfadeout": case "waitsound": cut ??= "wait"; break;
      case "jumpifmoveturn": if (value(args[0]!) === turn) pc = [args[1]!, 0]; break;
      case "choosetwoturnanim": pc = [args[(turn & 1) === 1 ? 1 : 0]!, 0]; break;
      case "jumpifcontest": break;
      case "jumpargeq": cut ??= "jumpargeq"; return finish("jumpargeq");
      case "jumpreteq": case "jumprettrue": case "jumpretfalse": cut ??= "jumpret"; return finish("jumpret");
      case "playsewithpan": if (cut !== null) { gated += 1; break; } events.push({ op, frame, id: value(args[0]!), pan: value(args[1]!), line }); break;
      case "playse": if (cut !== null) { gated += 1; break; } events.push({ op, frame, id: value(args[0]!), pan: null, line }); break;
      case "waitplaysewithpan":
        if (cut !== null) { gated += 1; break; }
        events.push({ op, frame: frame + value(args[2]!), id: value(args[0]!), pan: value(args[1]!), wait: value(args[2]!), line });
        break;
      case "loopsewithpan":
        if (cut !== null) { gated += 1; break; }
        events.push({ op, frame, id: value(args[0]!), pan: value(args[1]!), wait: value(args[2]!), times: value(args[3]!), line });
        break;
      default: break;
    }
  }
  return finish("limit");
}

const TURNS = 6;
const moves: Array<{ move: number; label: string; variants: number[]; ends: string[]; gated: number[] }> = [];
const variantPool: SoundOp[][] = [];
const poolIndex = new Map<string, number>();
moveTable.forEach((label, move) => {
  const variants: number[] = [];
  const ends: string[] = [];
  const gated: number[] = [];
  for (let turn = 0; turn < TURNS; turn += 1) {
    const result = walk(label, turn);
    const key = JSON.stringify(result.events);
    if (!poolIndex.has(key)) { poolIndex.set(key, variantPool.length); variantPool.push(result.events); }
    variants.push(poolIndex.get(key)!);
    ends.push(result.end);
    gated.push(result.gated);
  }
  moves.push({ move, label, variants, ends, gated });
});

const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
const out = {
  schema: "anim-sound-timing/v1",
  description: "Script-frame timing of the pre-wait sound ops of every move body (aud242a). See docs/aud242-move-anim-sounds.md.",
  generatedFrom: {
    extractor: "tools/extract/extract-anim-sound-timing.ts",
    files: { "reference/pokeemerald/data/battle_anim_scripts.s": sha(SCRIPT_PATH), "reference/pokeemerald/include/constants/songs.h": sha(SONGS_PATH) },
  },
  turns: TURNS,
  variants: variantPool,
  moves: moves.map((m) => ({ move: m.move, label: m.label, variants: m.variants, ends: m.ends, gated: m.gated })),
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "anim-sound-timing.json"), `${JSON.stringify(out)}\n`);
console.log(`anim-sound-timing: ${moves.length} moves, ${variantPool.length} distinct variants, ${variantPool.reduce((n, v) => n + v.length, 0)} ops`);
