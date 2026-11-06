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

const MACROS_PATH = join(REF, "asm", "macros", "battle_anim_script.inc");
const SCRIPT_PATH = join(REF, "data", "battle_anim_scripts.s");
const SONGS_PATH = join(REF, "include", "constants", "songs.h");
const scriptText = readFileSync(SCRIPT_PATH, "utf8");
const songsText = readFileSync(SONGS_PATH, "utf8");

const constants = new Map<string, number>([["SOUND_PAN_ATTACKER", -64], ["SOUND_PAN_TARGET", 63]]);
for (const m of songsText.matchAll(/^#define\s+((?:SE|MUS)_\w+)\s+(\d+)/gm)) constants.set(m[1]!, Number(m[2]));

function value(token: string): number {
  const t = token.trim();
  if (constants.has(t)) return constants.get(t)!;
  if (/^[-+]?(0x[0-9a-f]+|\d+)$/i.test(t)) return Number(t);
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
type Reason = "bg-fade" | "unmodelled-lifetime" | "waitsound" | "unresolved-branch" | "after-unresolved-branch";
interface Walk { events: SoundOp[]; end: string; frame: number | null; gated: number; reasons: Record<string, number> }

// ---- Lifetimes of the creation ops (ticks after the creation tick at which the visual task / sprite is gone). Exact entries are the
// source-derived or RAM-probed lifetimes src/animation already uses (shakeMon.ts, slideMon.ts, dragonRage.ts); a bound is an upper
// bound that only resolves a wait when an exact lifetime in the same wait dominates it.
type Lifetime = { exact: number } | { bound: number } | null;
const named = (arg: string): string => (arg.includes("=") ? arg.split("=")[1]!.trim() : arg);
function intArg(arg: string | undefined): number | null {
  if (arg === undefined) return null;
  try { return value(named(arg)); } catch { return null; }
}
function shakeMonLength(x: number, y: number, numTimes: number, delay: number): number {
  let [x2, y2, remaining, counter, length] = [x, y, numTimes, delay, 0];
  for (;;) {
    if (counter === 0) {
      x2 = x2 === 0 ? x : 0; y2 = y2 === 0 ? y : 0; counter = delay; remaining -= 1;
      if (remaining === 0) return length + 1;
    } else counter -= 1;
    length += 1;
  }
}
function lifetimeOf(cmd: Command): Lifetime {
  const { op, args } = cmd;
  if (op === "createvisualtask" && (args[0] === "AnimTask_ShakeMon" || args[0] === "AnimTask_ShakeMon2")) {
    const [x, y, numTimes, delay] = [intArg(args[3]), intArg(args[4]), intArg(args[5]), intArg(args[6])];
    if (x === null || y === null || numTimes === null || delay === null || numTimes < 1) return null;
    return { exact: shakeMonLength(x, y, numTimes, delay) - 2 };
  }
  if (op === "createsprite" && args[0] === "gSlideMonToOffsetSpriteTemplate") { const d = intArg(args[7]); return d === null ? null : { exact: d + 1 }; }
  if (op === "createsprite" && args[0] === "gSlideMonToOriginalPosSpriteTemplate") { const d = intArg(args[5]); return d === null ? null : { exact: d }; }
  if (op === "create_dragon_rage_fire_spit_sprite") { const d = intArg(args.find((a) => a.startsWith("duration="))); return d === null ? null : { exact: d + 1 }; }
  if (op === "create_dragon_rage_fire_plume_sprite") return { exact: 26 };
  if (op === "create_basic_hitsplat_sprite") return { bound: 10 };
  return null;
}
// Macros whose body (transitively) is a createsprite / createvisualtask create a visual task or sprite the wait must account for.
const creationMacros = new Set<string>(["createsprite", "createvisualtask"]);
{
  const bodies = new Map<string, string>();
  for (const m of readFileSync(MACROS_PATH, "utf8").matchAll(/^\s*\.macro\s+(\w+)[^\n]*\n([\s\S]*?)^\s*\.endm/gm)) bodies.set(m[1]!, m[2]!);
  for (let changed = true; changed;) {
    changed = false;
    for (const [name, body] of bodies) {
      if (creationMacros.has(name)) continue;
      if ([...creationMacros].some((c) => new RegExp(`^\\s*${c}\\b`, "m").test(body))) { creationMacros.add(name); changed = true; }
    }
  }
}
const isCreation = (op: string): boolean => creationMacros.has(op);

// Return values (gBattleAnimArgs[ARG_RET_ID]) the preceding visual task writes, resolved from the request (singles; the Factory is never a contest).
function returnValue(task: string, attackerSide: number): number | null {
  switch (task) {
    case "AnimTask_IsContest": case "AnimTask_GetTargetIsAttackerPartner": return 0;
    case "AnimTask_GetAttackerSide": return attackerSide;
    case "AnimTask_GetTargetSide": return 1 - attackerSide;
    case "AnimTask_IsTargetPlayerSide": return 1 - attackerSide === 0 ? 1 : 0;
    default: return null;
  }
}

const blockers: Record<string, number> = {};
function walk(bodyLabel: string, turn: number, attackerSide: number): Walk {
  const events: SoundOp[] = [];
  const reasons: Record<string, number> = {};
  const stack: Array<[string, number]> = [];
  let frame: number | null = 0;
  let why: Reason | null = null;
  let gated = 0;
  let pending: Array<{ at: number; life: Lifetime; name: string }> = [];
  let ret: number | null = null;
  const finish = (end: string): Walk => ({ events, end, frame, gated, reasons });
  const unresolved = (reason: Reason): void => { frame = null; why ??= reason; };
  const gate = (): void => { gated += 1; const reason = why ?? "unresolved-branch"; reasons[reason] = (reasons[reason] ?? 0) + 1; };
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
    const cmd = program[index]!;
    const { op, args, line } = cmd;
    pc = [label, index + 1];
    if (isCreation(op)) {
      if (frame !== null) pending.push({ at: frame, life: lifetimeOf(cmd), name: args[0] ?? op });
      const known = returnValue(args[0] ?? "", attackerSide);
      ret = op === "createvisualtask" ? known : ret;
      if (op === "createvisualtask" && known === null && /^AnimTask_(Is|Get)\w*(Side|Contest|Environment|Partner|Power|Count|Hit|Right)/.test(args[0] ?? "")) ret = null;
    }
    switch (op) {
      case "end": return finish("end");
      case "return": { const back = stack.pop(); if (back === undefined) return finish("limit"); pc = back; break; }
      case "call": stack.push(pc); pc = [args[0]!, 0]; break;
      case "goto": pc = [args[0]!, 0]; break;
      case "delay": if (frame !== null) frame += Math.max(value(args[0]!), 0) + 2; break;
      case "loadspritegfx": case "monbg": if (frame !== null) frame += 3; break;
      case "waitforvisualfinish": {
        if (frame === null) break;
        if (pending.length === 0) break;
        const exact = pending.filter((p) => p.life !== null && "exact" in p.life).map((p) => p.at + (p.life as { exact: number }).exact);
        const bounds = pending.filter((p) => p.life !== null && "bound" in p.life).map((p) => p.at + (p.life as { bound: number }).bound);
        if (pending.some((p) => p.life === null)) { if (turn === 0 && attackerSide === 0 && why === null) for (const p of pending) if (p.life === null) blockers[p.name] = (blockers[p.name] ?? 0) + 1; unresolved("unmodelled-lifetime"); pending = []; break; }
        const gone = exact.length === 0 ? -1 : Math.max(...exact);
        if (bounds.some((b) => b > gone)) { unresolved("unmodelled-lifetime"); pending = []; break; }
        if (frame <= gone) frame = gone + 1;
        pending = [];
        break;
      }
      case "waitbgfadein": case "waitbgfadeout": unresolved("bg-fade"); pending = []; break;
      case "waitsound": unresolved("waitsound"); pending = []; break;
      case "jumpifmoveturn": if (value(args[0]!) === turn) pc = [args[1]!, 0]; break;
      case "choosetwoturnanim": pc = [args[(turn & 1) === 1 ? 1 : 0]!, 0]; break;
      case "jumpifcontest": break;
      case "jumpargeq": case "jumpreteq": case "jumprettrue": case "jumpretfalse": {
        const [expected, target] = op === "jumpargeq" ? [args[0] === "ARG_RET_ID" || args[0] === "7" ? args[1]! : null, args[2]!]
          : op === "jumpreteq" ? [args[0]!, args[1]!] : [op === "jumprettrue" ? "1" : "0", args[0]!];
        if (ret === null || expected === null) { gate(); return finish("unresolved-branch"); }
        if (value(expected) === ret) pc = [target, 0];
        break;
      }
      case "playsewithpan": case "playse": case "waitplaysewithpan": case "loopsewithpan": {
        if (frame === null) { gate(); break; }
        const at = op === "waitplaysewithpan" ? frame + value(args[2]!) : frame;
        const base = { op, frame: at, id: value(args[0]!), pan: op === "playse" ? null : value(args[1]!), line };
        if (op === "waitplaysewithpan") events.push({ ...base, wait: value(args[2]!) });
        else if (op === "loopsewithpan") events.push({ ...base, wait: value(args[2]!), times: value(args[3]!) });
        else events.push(base);
        break;
      }
      default: break;
    }
  }
  return finish("limit");
}

const TURNS = 6;
const SIDES = 2;
const moves: Array<{ move: number; label: string; variants: number[]; ends: string[]; gated: number[]; reasons: Array<Record<string, number>> }> = [];
const variantPool: SoundOp[][] = [];
const poolIndex = new Map<string, number>();
moveTable.forEach((label, move) => {
  const entry = { move, label, variants: [] as number[], ends: [] as string[], gated: [] as number[], reasons: [] as Array<Record<string, number>> };
  for (let turn = 0; turn < TURNS; turn += 1) {
    for (let side = 0; side < SIDES; side += 1) {
      const result = walk(label, turn, side);
      const key = JSON.stringify(result.events.map(({ line: _line, ...rest }) => rest));
      if (!poolIndex.has(key)) { poolIndex.set(key, variantPool.length); variantPool.push(result.events.map(({ line: _line, ...rest }) => rest) as SoundOp[]); }
      entry.variants.push(poolIndex.get(key)!);
      entry.ends.push(result.end);
      entry.gated.push(result.gated);
      entry.reasons.push(result.reasons);
    }
  }
  moves.push(entry);
});

const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
const out = {
  schema: "anim-sound-timing/v2",
  description: "Script-frame timing of the resolvable sound ops of every move body, per (turn, attacker side) (aud242a/b). Variant index = turn * sides + attackerSide. See docs/aud242-move-anim-sounds.md.",
  generatedFrom: {
    extractor: "tools/extract/extract-anim-sound-timing.ts",
    files: { "reference/pokeemerald/data/battle_anim_scripts.s": sha(SCRIPT_PATH), "reference/pokeemerald/include/constants/songs.h": sha(SONGS_PATH) },
  },
  turns: TURNS,
  sides: SIDES,
  variants: variantPool,
  moves: moves.map((m) => ({ move: m.move, label: m.label, variants: m.variants, ends: m.ends, gated: m.gated })),
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "anim-sound-timing.json"), `${JSON.stringify(out)}\n`);
{
  const tally: Record<string, number> = {};
  let emitted = 0;
  let gatedTotal = 0;
  for (const m of moves) {
    emitted += variantPool[m.variants[0]]!.length;
    gatedTotal += m.gated[0]!;
    for (const [reason, n] of Object.entries(m.reasons[0]!)) tally[reason] = (tally[reason] ?? 0) + n;
  }
  if (process.env.ANIM_SOUND_BLOCKERS) console.log(Object.entries(blockers).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}:${v}`).join(" "));
  console.log(`turn 0 / player attacker: ${emitted} resolved ops, ${gatedTotal} unresolved ops by reason ${JSON.stringify(tally)}`);
}
console.log(`anim-sound-timing: ${moves.length} moves, ${variantPool.length} distinct variants, ${variantPool.reduce((n, v) => n + v.length, 0)} ops`);
