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
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
  op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan" | "soundtask_loopse" | "soundtask_fireblast" | "soundtask_se1" | "soundtask_se2";
  frame: number;
  id: number | null;
  /** The pan argument as written (the starting pan of a panse*; the only one of a setpan). */
  pan: number | null;
  /** panse*: the target pan argument and the increment argument as written; `wait` is framesToWait. */
  target?: number;
  inc?: number;
  wait?: number;
  times?: number;
  /** soundtask_loopse: pan step interval (r7) and play interval (r9) as written; `times` is r10 (the play count). soundtask_fireblast: `id2` is the ending SE. */
  step?: number;
  gap?: number;
  id2?: number;
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
// AnimSimplePaletteBlend (battle_anim_normal.c): BeginNormalPaletteFade in the sprite's first callback (AnimateSprites, which precedes UpdatePaletteFade in
// BattleMainCB2) runs UpdateNormalPaletteFade once (update call 1, iteration F); every later iteration's UpdatePaletteFade is one more call (call n = iteration
// F + n - 1). A y step is two calls (BG half, OBJ half; palette.c:430-464) plus `delay` waiting calls before the next pair (a negative delay raises deltaY
// to 2 - delay instead); the pair whose y equals the target sets softwareFadeFinishing, then five calls count 0..4 and the fifth clears `active`
// (IsSoftwarePaletteFadeFinishing). The sprite's Step sees !active in the next AnimateSprites and destroys itself; the script's waitforvisualfinish
// passes one iteration after that: n calls = the sprite is gone `n` ticks after the creation tick.
function simplePaletteBlendLength(delay: number, startY: number, targetY: number): number {
  const deltaY = delay < 0 ? 2 - delay : 2;
  const wait = delay < 0 ? 0 : delay;
  let [y, calls, waits] = [startY, 0, 0];
  for (;;) {
    calls += 2;
    if (y === targetY) break;
    y = startY < targetY ? Math.min(y + deltaY, targetY) : Math.max(y - deltaY, targetY);
    calls += wait;
    waits += wait;
  }
  return calls + 5;
}
// ---- Instant visual tasks (aud242d). Cmd_createvisualtask runs `taskFunc(taskId)` BEFORE `gAnimVisualTaskCount++` (battle_anim.c:437-439), and an
// entry function whose every path is straight-line code ending in `DestroyAnimVisualTask(taskId)` (-> `gAnimVisualTaskCount--`, battle_anim.c:274-277)
// nets to 0 in the creating step: a following waitforvisualfinish never waits for it (lifetime -1, like the PlaySE1/2WithPanning tasks). Sprites a task
// makes with CreateSprite / CreateTask (not the script's createsprite) are not counted by gAnimVisualTaskCount either. The list is audited against the
// C source (docs/aud242-move-anim-sounds.md section 8.1) and re-checked mechanically at extraction time (`auditInstantTasks`): INSTANT_STRAIGHT_LINE
// entries must be one `{ ... DestroyAnimVisualTask(taskId); }` body with no return / loop / func assignment / gTasks state / Random / CreateTask;
// INSTANT_HAND_AUDITED entries (fixed-count loops over tables, a non-counted CreateTask, AnimTask_SporeDoubleBattle's two destroying branches) were read line by line; the check there is only no return / func and a trailing Destroy (or an if / else).
const INSTANT_STRAIGHT_LINE: readonly string[] = [
  "AnimTask_AllocBackupPalBuffer", "AnimTask_BlendBackground", "AnimTask_CastformGfxDataChange", "AnimTask_CreateSpotlight",
  "AnimTask_FreeBackupPalBuffer", "AnimTask_FreeBallGfx", "AnimTask_FreeHealthboxPalsForLevelUp", "AnimTask_FreePokeblockGfx",
  "AnimTask_GetAttackerSide", "AnimTask_GetBattleEnvironment", "AnimTask_GetBattlersFromArg", "AnimTask_GetFrustrationPowerLevel",
  "AnimTask_GetFuryCutterHitCount", "AnimTask_GetIceBallCounter", "AnimTask_GetReturnPowerLevel", "AnimTask_GetSeismicTossDamageLevel",
  "AnimTask_GetTargetIsAttackerPartner", "AnimTask_GetTargetSide", "AnimTask_GetTrappedMoveAnimId", "AnimTask_GetWeather",
  "AnimTask_InitAttackerFadeFromInvisible", "AnimTask_InitMementoShadow", "AnimTask_IsAttackerBehindSubstitute", "AnimTask_IsBallBlockedByTrainer",
  "AnimTask_IsContest", "AnimTask_IsFuryCutterHitRight", "AnimTask_IsHealingMove", "AnimTask_IsMonInvisible", "AnimTask_IsPowerOver99",
  "AnimTask_IsTargetPlayerSide", "AnimTask_IsTargetSameSide", "AnimTask_LoadBallGfx", "AnimTask_LoadHealthboxPalsForLevelUp",
  "AnimTask_LoadPokeblockGfx", "AnimTask_MementoHandleBg", "AnimTask_RemoveSpotlight", "AnimTask_SetAnimAttackerAndTargetForEffectAtk",
  "AnimTask_SetAnimAttackerAndTargetForEffectTgt", "AnimTask_SetAnimTargetToBattlerTarget", "AnimTask_SetAttackerTargetLeftPos",
  "AnimTask_SetTargetToEffectBattler", "AnimTask_SmokescreenImpact",
];
const INSTANT_HAND_AUDITED: readonly string[] = [
  "AnimTask_CopyPalFadedToUnfaded", "AnimTask_CopyPalUnfadedFromBackup", "AnimTask_CopyPalUnfadedToBackup", "AnimTask_FreeMusicNotesPals",
  "AnimTask_LoadMusicNotesPals", "AnimTask_MusicNotesClearRainbowBlend", "AnimTask_MusicNotesRainbowBlend", "AnimTask_SetAllNonAttackersInvisiblity",
  "AnimTask_SporeDoubleBattle", "AnimTask_StartSlidingBg", "AnimTask_PositionFissureBgOnBattler",
];
const INSTANT_TASKS = new Set<string>([...INSTANT_STRAIGHT_LINE, ...INSTANT_HAND_AUDITED]);
function auditInstantTasks(): void {
  const sources = new Map<string, string>();
  for (const file of readdirSync(join(REF, "src"))) if (/^battle_anim.*\.c$/.test(file)) sources.set(file, readFileSync(join(REF, "src", file), "utf8"));
  for (const [list, strict] of [[INSTANT_STRAIGHT_LINE, true], [INSTANT_HAND_AUDITED, false]] as const) {
    for (const name of list) {
      let body: string | null = null;
      for (const text of sources.values()) {
        const start = new RegExp(`^void ${name}\\(u8 taskId\\)\\n\\{`, "m").exec(text);
        if (start !== null) { body = text.slice(start.index, text.indexOf("\n}\n", start.index) + 3); break; }
      }
      if (body === null) throw new Error(`instant task ${name}: entry function not found`);
      const statements = body.split("\n").map((l) => l.trim()).filter((l) => l !== "");
      const destroys = (body.match(/DestroyAnimVisualTask/g) ?? []).length;
      const tail = statements[statements.length - 2] === "DestroyAnimVisualTask(taskId);";
      const ok = !/\breturn\b|\bfunc\s*=/.test(body) && (strict ? destroys === 1 && tail && !/\bwhile\b|\bfor\b|gTasks|Random|CreateTask/.test(body) : (destroys === 1 && tail) || body.includes("else"));
      if (!ok) throw new Error(`instant task ${name}: body is not a straight-line task ending in one DestroyAnimVisualTask`);
    }
  }
}
auditInstantTasks();
function lifetimeOf(cmd: Command): Lifetime {
  const { op, args } = cmd;
  if (op === "createvisualtask" && INSTANT_TASKS.has(args[0] ?? "")) return { exact: -1 };
  if (op === "simple_palette_blend" || (op === "createsprite" && args[0] === "gSimplePaletteBlendSpriteTemplate")) {
    const parts = op === "simple_palette_blend" ? [args.find((a) => a.startsWith("delay=")), args.find((a) => a.startsWith("initial_blend_y=")), args.find((a) => a.startsWith("target_blend_y="))] : [args[4], args[5], args[6]];
    const [delay, startY, targetY] = parts.map(intArg);
    if (delay === null || startY === null || targetY === null || delay === undefined) return null;
    return { exact: simplePaletteBlendLength(delay!, startY!, targetY!) };
  }
  if (op === "createvisualtask" && (args[0] === "AnimTask_ShakeMon" || args[0] === "AnimTask_ShakeMon2")) {
    const [x, y, numTimes, delay] = [intArg(args[3]), intArg(args[4]), intArg(args[5]), intArg(args[6])];
    if (x === null || y === null || numTimes === null || delay === null || numTimes < 1) return null;
    return { exact: shakeMonLength(x, y, numTimes, delay) - 2 };
  }
  // SoundTask_PlaySE1/2WithPanning plays and DestroyAnimVisualTask(taskId)s inside the creating script step: gone before any wait.
  if (op === "createvisualtask" && (args[0] === "SoundTask_PlaySE1WithPanning" || args[0] === "SoundTask_PlaySE2WithPanning")) return { exact: -1 };
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

/** Iterations after the fadetobg / restorebg step at which waitbgfadeout / waitbgfadein pass (Task_FadeToBg + UpdateHardwarePaletteFade, derived above). */
const FADE_OUT_DONE = 19;
const FADE_IN_DONE = 38;

/**
 * Wall-clock lag frames after LoadMoveBg (LZDecompressVram of the tilemap and the image + LoadCompressedPalette) overruns VBlank: the iteration after
 * the load never runs UpdatePaletteFade / the script. The decompress cost is data dependent, so this is a measured table, not derived: the missing
 * UpdatePaletteFade frame in the stepped ROM probe windows (tools/audio/fixtures/aud242c-*.json, docs/aud242-move-anim-sounds.md section 7):
 * BG_IMPACT_* 1 (Hyper Fang fadetobg, Mega Punch changebg, both sides), BG_HIGHSPEED_OPPONENT 0 (Mach Punch), BG_DARK 0 (Crunch).
 * Unmeasured backgrounds count 0 (a named residual); restorebg's LoadDefaultBg (a 1 or 2 frame, phase dependent overrun) is not modelled.
 */
const BG_LOAD_LAG: Readonly<Record<string, number>> = { BG_IMPACT_OPPONENT: 1, BG_IMPACT_PLAYER: 1, BG_IMPACT_CONTESTS: 1, BG_HIGHSPEED_OPPONENT: 0, BG_HIGHSPEED_PLAYER: 0, BG_DARK: 0 };
const bgLoadLag = (bg: string | undefined): number => BG_LOAD_LAG[bg ?? ""] ?? 0;

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
  let fade: number | null = null;
  // Wall-clock frames the ROM spends in a VBlank-overrun lag (no main-loop iteration): ops at iteration > `after` play `frames` later.
  const lags: Array<{ after: number; frames: number }> = [];  // `after`: first affected iteration - 1 (fractional .5 = from the same iteration)
  const shiftAt = (iteration: number): number => lags.reduce((n, l) => (iteration > l.after ? n + l.frames : n), 0);
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
      // battle_anim.c Cmd_fadetobg / Cmd_restorebg create Task_FadeToBg (priority 5) in the script step of frame F and set sAnimBackgroundFadeState = 1.
      // Per main-loop iteration the order is CB1 (script), then CB2 (UpdatePaletteFade, RunTasks), then VBlank (TransferPlttBuffer -> UpdateBlendRegisters):
      //   F      task state 0: BeginHardwarePaletteFade(0xE8, 0, 0, 16, 0), VBlank writes BLDY 0
      //   F+1..16  UpdateHardwarePaletteFade y 1..16 (one step per iteration, delay 0)
      //   F+17   y++ = 17 > 16: hardwareFadeFinishing; VBlank clears `active` (UpdateBlendRegisters)
      //   F+18   task state 1 (active clear): state 2, sAnimBackgroundFadeState = 2
      //   F+19   CB1: waitbgfadeout passes (state == 2); task state 2: LoadMoveBg / LoadDefaultBg, BeginHardwarePaletteFade(0xE8, 0, 16, 0, 1)
      //   F+20..35 y 15..0;  F+36 y-1 < 0: finishing, VBlank clears `active`;  F+37 task state 3: DestroyTask, sAnimBackgroundFadeState = 0
      //   F+38   CB1: waitbgfadein passes (state == 0)
      // The waits do not install WaitAnimFrameCount: they re-poll every iteration (a failed poll sets sAnimFramesToWait = 1, the callback stays
      // RunAnimScriptCommand), so a wait resumes at max(poll frame, threshold) with no 3-frame quantisation. waitbgfadeout needs state == 2, which holds
      // for F+19..F+37 (a later poll would never pass); waitbgfadein needs 0 (also true when no fade ran).
      case "fadetobg": case "fadetobgfromset": case "restorebg":
        if (frame === null) break;
        if (fade !== null && frame < fade + FADE_IN_DONE) { unresolved("bg-fade"); break; }
        fade = frame;
        if (op === "fadetobg") lags.push({ after: frame + FADE_OUT_DONE, frames: bgLoadLag(args[0]) });
        else if (op === "fadetobgfromset") lags.push({ after: frame + FADE_OUT_DONE, frames: bgLoadLag(args[1 + (attackerSide === 0 ? 0 : 1)]) });
        break;
      // changebg: LoadMoveBg runs inside the script step itself, so the commands that follow in the same iteration already sit after the overrun.
      case "changebg": if (frame !== null) lags.push({ after: frame - 0.5, frames: bgLoadLag(args[0]) }); break;
      case "waitbgfadeout":
        if (frame === null) break;
        if (fade === null || frame >= fade + FADE_IN_DONE) { unresolved("bg-fade"); break; }
        if (frame < fade + FADE_OUT_DONE) frame = fade + FADE_OUT_DONE;
        break;
      case "waitbgfadein":
        if (frame === null) break;
        if (fade !== null && frame < fade + FADE_IN_DONE) frame = fade + FADE_IN_DONE;
        break;
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
        const base = { op, frame: at + shiftAt(at), id: value(args[0]!), pan: op === "playse" ? null : value(args[1]!), line };
        if (op === "waitplaysewithpan") events.push({ ...base, wait: value(args[2]!) });
        else if (op === "loopsewithpan") events.push({ ...base, wait: value(args[2]!), times: value(args[3]!) });
        else events.push(base);
        break;
      }
      // Cmd_panse / _adjustnone / _adjustall: PlaySE12WithPanning now + a priority 1 Task_PanFromInitialToTarget created in the same step (its first
      // row runs in this iteration's RunTasks, then every framesToWait + 1); Cmd_setpan: one SE12PanpotControl. Neither blocks the script, and
      // waitforvisualfinish counts only gAnimVisualTaskCount (the sound task count gates Cmd_end), so no lifetime is pushed.
      case "panse": case "panse_adjustnone": case "panse_adjustall":
        if (frame === null) { gate(); break; }
        events.push({ op, frame: frame + shiftAt(frame), id: value(args[0]!), pan: value(args[1]!), target: value(args[2]!), inc: value(args[3]!), wait: value(args[4]!), line });
        break;
      // Cmd_createsoundtask: CreateTask(func, 1), func(taskId) at once, gAnimSoundTaskCount++ (it gates only Cmd_end / Cmd_waitsound). Only the two
      // script-referenced tasks of battle_anim_sound_tasks.c are createsoundtask sites; the PlaySE1/2WithPanning / cry tasks are createvisualtask.
      case "createsoundtask": {
        const task = args[0];
        if (task !== "SoundTask_LoopSEAdjustPanning" && task !== "SoundTask_FireBlast") break;
        if (frame === null) { gate(); break; }
        const at = frame + shiftAt(frame);
        if (task === "SoundTask_FireBlast") events.push({ op: "soundtask_fireblast", frame: at, id: value(args[1]!), id2: value(args[2]!), pan: null, line });
        else events.push({ op: "soundtask_loopse", frame: at, id: value(args[1]!), pan: value(args[2]!), target: value(args[3]!), inc: value(args[4]!), times: value(args[5]!), step: value(args[6]!), gap: value(args[7]!), line });
        break;
      }
      // Cmd_createvisualtask runs the task function at once; the PlaySE1/2WithPanning tasks play with BattleAnimAdjustPanning(arg 1) in that step.
      case "createvisualtask": {
        if (args[0] !== "SoundTask_PlaySE1WithPanning" && args[0] !== "SoundTask_PlaySE2WithPanning") break;
        if (frame === null) { gate(); break; }
        events.push({ op: args[0] === "SoundTask_PlaySE1WithPanning" ? "soundtask_se1" : "soundtask_se2", frame: frame + shiftAt(frame), id: value(args[2]!), pan: value(args[3]!), line });
        break;
      }
      case "setpan":
        if (frame === null) { gate(); break; }
        events.push({ op, frame: frame + shiftAt(frame), id: null, pan: value(args[0]!), line });
        break;
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
