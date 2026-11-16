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

const constants = new Map<string, number>([["SOUND_PAN_ATTACKER", -64], ["SOUND_PAN_TARGET", 63], ["TRUE", 1], ["FALSE", 0]]);
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
  op: "playsewithpan" | "playse" | "waitplaysewithpan" | "loopsewithpan" | "panse" | "panse_adjustnone" | "panse_adjustall" | "setpan" | "soundtask_loopse" | "soundtask_fireblast" | "soundtask_se1" | "soundtask_se2" | "sprite_confuseray_ball" | "task_rollout";
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
  /** sprite_confuseray_ball: `times` is the Step1 translate count D (data[0]), `gap` the sprite's last call n; pan / target / inc / wait are the creating SoundTask_AdjustPanningVar's arguments as written. */
  line: number;
}
type Reason = "bg-fade" | "unmodelled-lifetime" | "waitsound" | "unresolved-branch" | "after-unresolved-branch";
interface Walk { events: SoundOp[]; end: string; frame: number | null; gated: number; reasons: Record<string, number>; usedPic: boolean; usedCounter: boolean }

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
  // gPaletteFade.deltaY is a 4-bit field (palette.h:52): delay -31 gives (2 + 31) & 15 = 1, not 33 (aud242n: the Spark ROM window steps y by 1 per 2 frames).
  const deltaY = delay < 0 ? (2 - delay) & 15 : 2;
  const wait = delay < 0 ? 0 : delay;
  let [y, calls, waits] = [startY, 0, 0];
  for (;;) {
    calls += 2;
    if (y === targetY) break;
    y = startY < targetY ? Math.min(y + deltaY, targetY) : Math.max(y - deltaY, targetY);
    calls += wait;
    waits += wait;
  }
  // aud242e: BeginNormalPaletteFade runs inside the sprite's init (the script step, update call 1) and the same iteration's UpdatePaletteFade is call 2, so call n
  // is iteration F + n - 2; the fifth finishing call (n) clears `active`, the sprite's step destroys it in iteration F + n - 1 and the script's poll passes at F + n:
  // gone n - 1 ticks after the creation tick (Overheat's BlendPalette log: first call 73, SE171 89 + 6 = 95 for n = 16; Double-Edge: 129 -> SE141 136 for n = 7).
  return calls + 4;
}
// AnimComplexPaletteBlend (battle_anim_normal.c:344-398): the sprite's callback runs once in the script step (init: BlendPalettes y1) and Step1 runs from the
// same iteration's AnimateSprites. Step1 counts `delay` calls down (iterations F .. F+d-1), blends at F+d (y2 first, then y1, ...) and reloads the timer to
// `delay` (so every blend is d + 1 iterations apart: F+d, F+2d+1, ...), after `numBlends` blends one more countdown, a call that moves to Step2, and
// Step2 (gPaletteFade.active clear) destroys the sprite: iteration F + (n + 1)(d + 1). ROM-checked on Double-Edge (BlendPalette calls at 70, 74, 79, 85 for
// d = 4, n = 2: 15 ticks; the next SE lands exactly 28 frames after the sprite's SE).
function complexPaletteBlendLength(delay: number, numBlends: number): number {
  return (numBlends + 1) * (delay + 1);
}
// ---- aud242h: AnimTask_BlendColorCycle / ...Exclude / ...ByTag (battle_anim_normal.c:447-560): a chain of BeginNormalPaletteFade fades. The entry runs fade 1 (0 -> targetY)
// inside the script step (palette.c:156-206: Begin runs UpdatePaletteFade once, update call 1, iteration F); every later call is UpdatePaletteFade in CB2 before RunTasks
// (battle_main.c:1863-1869), so fade-1 call c >= 2 is iteration F + c - 2 (the aud242e rule). The loop (RunTasks) starts the next fade in the iteration the previous one
// cleared `active`: its call 1 is in that RunTasks, call c >= 2 is iteration G + c - 1. Fade i >= 2 goes start = (i even ? targetY : initialY), target = (i even ? initialY : targetY),
// except the last fade (tNumBlends == 1 in the loop) targets 0. One fade over y steps of deltaY (2, or 2 - delay for a negative delay) costs 2 calls per y value plus `delay` waiting
// calls between y values (palette.c:406-455) and 5 finishing calls (IsSoftwarePaletteFadeFinishing, palette.c:807-828). The task destroys itself in the RunTasks of the iteration the
// last fade clears (AnimTask_BlendColorCycleLoop, `!active` and tNumBlends 0): gone (that iteration - F) ticks after the creation tick.
function paletteFadeCalls(delay: number, startY: number, targetY: number): number {
  // gPaletteFade.deltaY is a 4-bit field (palette.h:52): delay -31 gives (2 + 31) & 15 = 1, not 33 (aud242n: the Spark ROM window steps y by 1 per 2 frames).
  const deltaY = delay < 0 ? (2 - delay) & 15 : 2;
  const wait = delay < 0 ? 0 : delay;
  let [y, calls] = [startY, 0];
  for (;;) {
    calls += 2;
    if (y === targetY) break;
    y = startY < targetY ? Math.min(y + deltaY, targetY) : Math.max(y - deltaY, targetY);
    calls += wait;
  }
  return calls + 5;
}
function cycleNumBlends(cmd: { op: string; args: string[] }): number | null {
  const named = cmd.args.find((a) => a.startsWith("num_blends="));
  return intArg(cmd.op === "createvisualtask" ? cmd.args[4] : named);
}
function blendColorCycleLength(delay: number, numBlends: number, initialY: number, targetY: number): number {
  if (numBlends < 1) return -1;
  let exact = 0;
  for (let fade = 1; fade <= numBlends; fade += 1) {
    const last = fade === numBlends;
    const [start, end] = fade === 1 ? [0, targetY] : fade % 2 === 0 ? [targetY, last ? 0 : initialY] : [initialY, last ? 0 : targetY];
    exact += fade === 1 ? paletteFadeCalls(delay, start, end) - 2 : paletteFadeCalls(delay, start, end) - 1;
  }
  return exact;
}
const METALLIC_SHINE_LENGTH = 95;
// Measured on two moves, both agreeing (docs section 8): 4 wall-clock frames between the shine's creation and the first op after its wait. The first 2 are
// localised (Metal Claw's SE_M_HARDEN loop task, counted in iterations, plays its second SE exactly 2 wall frames late: 28 -> 30); the other 2 are not
// (somewhere in the 96-call shine or its destroy, which clears the BG tilemap). The shift is applied to every later op; the loop's own second play is the named residual.
const METALLIC_SHINE_LOAD_LAG = 4;
// AnimTask_ScaryFace loads its BG tilemap, image and palette in the creating step like AnimTask_MetallicShine: the ROM window (aud242k Scary Face) puts the first op after its wait 6 wall frames later than the 77-call count.
const SCARY_FACE_LOAD_LAG = 6;
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
// AnimTask_BlendSpriteColor_Step2 (battle_anim_utility_funcs.c:169-198), shared by AnimTask_BlendBattleAnimPal / ...Exclude / AnimTask_BlendParticle through
// StartBlendAnimSpriteColor (:156-167, which runs Step2 once inside the creating script step). data[9] starts at 0: calls 0..d-1 only count it up, call d blends
// at y = start and resets it, then every d + 1 calls the y moves one toward the target; the call that blends AT the target destroys the task (:190-192).
// Call 0 is the script step (iteration F), call k >= 1 is RunTasks of iteration F + k - 1 (the script's CB1 runs first), so the destroy call is
// K = d + |target - start| * (d + 1) and a waitforvisualfinish polling in CB1 passes at iteration F + K: exact = K - 1 (-1 = already gone in the creating step).
function blendAnimPalLength(delay: number, startY: number, targetY: number): number {
  return delay + Math.abs(targetY - startY) * (delay + 1) - 1;
}
// ---- aud242l: the Blizzard snowball / ice crystal lifetimes (docs/aud242-move-anim-sounds.md section 16). Both sprites are fast linear translations that run until they
// leave the screen, so the lifetime is a function of the attacker's and the target's BATTLER_COORD_Y_PIC_OFFSET (= GetBattlerSpriteFinal_Y(..., TRUE), a per-species value:
// battle_anim_mons.c:112-170, 172-292) and the fixed singles battler X (sBattlerCoords, :20-26). The walk is repeated for every (attackerY, targetY) class; picClasses below.
const sineTable: number[] = [];
for (const m of readFileSync(join(REF, "src", "trig.c"), "utf8").slice(readFileSync(join(REF, "src", "trig.c"), "utf8").indexOf("gSineTable[]")).split("};")[0]!.matchAll(/Q_8_8\(([-0-9.]+)\)/g)) sineTable.push(Math.trunc(Number(m[1]) * 256));
const gbaSin = (index: number, amplitude: number): number => (amplitude * sineTable[((index % 256) + 256) % 256]!) >> 8;
const gbaCos = (index: number, amplitude: number): number => (amplitude * sineTable[(((index + 64) % 256) + 256) % 256]!) >> 8;
/** Singles sBattlerCoords x (player, opponent). */
const BATTLER_X = [72, 176] as const;
interface PicContext { readonly attackerY: number; readonly targetY: number }
let picUsed = false;
let counterUsed = false;
interface FastSprite { x: number; y: number; x2: number; y2: number; d: number[]; callback: string; destroyed: boolean }
// InitAnimFastLinearTranslationWithSpeed + InitAnimFastLinearTranslation (battle_anim_mons.c:1171-1197, 1244-1249); a zero duration is a division by zero (declined).
function fastInit(s: FastSprite): boolean {
  const xDiff = s.d[2]! - s.d[1]!;
  const yDiff = s.d[4]! - s.d[3]!;
  const duration = Math.trunc((Math.abs(xDiff) << 4) / s.d[0]!);
  if (!Number.isFinite(duration) || duration === 0) return false;
  let dx = Math.trunc(((Math.abs(xDiff) << 4) & 0xffff) / duration);
  let dy = Math.trunc(((Math.abs(yDiff) << 4) & 0xffff) / duration);
  dx = xDiff < 0 ? dx | 1 : dx & ~1;
  dy = yDiff < 0 ? dy | 1 : dy & ~1;
  s.d[0] = duration; s.d[1] = dx; s.d[2] = dy; s.d[3] = 0; s.d[4] = 0;
  return true;
}
// AnimFastTranslateLinear (:1208-1236); true = the data[0] == 0 early return.
function fastTranslate(s: FastSprite): boolean {
  if (s.d[0] === 0) return true;
  s.d[3] = (s.d[3]! + s.d[1]!) & 0xffff;
  s.d[4] = (s.d[4]! + s.d[2]!) & 0xffff;
  s.x2 = (s.d[1]! & 1) !== 0 ? -(s.d[3]! >>> 4) : s.d[3]! >>> 4;
  s.y2 = (s.d[2]! & 1) !== 0 ? -(s.d[4]! >>> 4) : s.d[4]! >>> 4;
  s.d[0] = s.d[0]! - 1;
  return false;
}
const offScreen = (s: FastSprite, bottom: number): boolean => s.x + s.x2 > 256 || s.x + s.x2 < -16 || s.y + s.y2 > bottom || s.y + s.y2 < -16;
// The shared start of AnimSwirlingSnowball (battle_anim_ice.c:666-721) and AnimMoveParticleBeyondTarget (:788-844): the sprite is placed on the far side of the attacker along
// the attacker -> target line (InitSpritePosToAnimAttacker + the reversed fast translation run until off screen, battle_anim_mons.c:833-847). The snowball keeps its data row from
// before InitAnimFastLinearTranslationWithSpeed, the crystal the initialised one (`saveAfterInit`; only the crystal adds arg 3 to the target y when it averages positions).
function fastParticleStart(attackerSide: number, pic: PicContext, [a0, a1, a2, a3]: number[], speed: number, multi: boolean, saveAfterInit: boolean): { sprite: FastSprite; saved: number[] } | null {
  const [ax, tx] = [BATTLER_X[attackerSide === 0 ? 0 : 1], BATTLER_X[attackerSide === 0 ? 1 : 0]];
  const sprite: FastSprite = { x: ax + (ax > tx ? -a0 : ax < tx ? a0 : 0), y: pic.attackerY + a1, x2: 0, y2: 0, d: [], callback: "", destroyed: false };
  // multi: SetAverageBattlerPositions in singles = the target's own X_2 / Y_PIC_OFFSET (no partner).
  sprite.d = [speed, sprite.x, tx + (attackerSide === 0 ? a2 : -a2), sprite.y, multi && !saveAfterInit ? pic.targetY : pic.targetY + a3, 0, 0, 0];
  let saved = [...sprite.d];
  if (!fastInit(sprite)) return null;
  if (saveAfterInit) saved = [...sprite.d];
  sprite.d[1] = sprite.d[1]! ^ 1; sprite.d[2] = sprite.d[2]! ^ 1;
  for (let guard = 0; ; guard += 1) {
    sprite.d[0] = 1;
    fastTranslate(sprite);
    if (offScreen(sprite, 160)) break;
    if (guard === 4095) return null;
  }
  sprite.x += sprite.x2; sprite.y += sprite.y2; sprite.x2 = 0; sprite.y2 = 0;
  return { sprite, saved };
}
// gSwirlingSnowballSpriteTemplate (args a0..a5; battle_anim_ice.c:666-776): call 1 is InitAnimFastLinearTranslationWithSpeedAndPos (inside the creating iteration), then the
// translation to the target, Step1 (which runs Step2 at once), 32 Step2 swirl calls, one call of the End switch, then End translating by one fast step per call until off screen.
// Returns the number of calls after call 1 that run before the destroying one (the lifetime in ticks after F, section 8 numbering).
function swirlingSnowballLifetime(attackerSide: number, pic: PicContext, a: number[]): number | null {
  const [speed, multi] = [a[4]!, a[5]! !== 0];
  const start = fastParticleStart(attackerSide, pic, a, speed, multi, false);
  if (start === null) return null;
  const { sprite, saved } = start;
  sprite.d = [...saved];
  sprite.d[1] = sprite.x; sprite.d[3] = sprite.y;
  if (!fastInit(sprite)) return null;
  sprite.callback = "wait-end";
  fastTranslate(sprite);
  const amplitude = attackerSide === 0 ? -20 : 20;
  for (let calls = 1; calls < 4096; calls += 1) {
    switch (sprite.callback) {
      case "wait-end": if (fastTranslate(sprite)) sprite.callback = "step1"; break;
      case "step1":
      case "step2": {
        if (sprite.callback === "step1") {
          sprite.x += sprite.x2; sprite.y += sprite.y2; sprite.x2 = 0; sprite.y2 = 0;
          sprite.d[0] = 128; sprite.d[3] = gbaSin(128, amplitude); sprite.d[4] = gbaCos(128, 15); sprite.d[5] = 0;
          sprite.callback = "step2";
        }
        if (sprite.d[5]! <= 31) {
          sprite.x2 = gbaSin(sprite.d[0]!, amplitude) - sprite.d[3]!;
          sprite.y2 = gbaCos(sprite.d[0]!, 15) - sprite.d[4]!;
          sprite.d[0] = (sprite.d[0]! + 16) & 0xff;
          sprite.d[5] = sprite.d[5]! + 1;
        } else {
          sprite.x += sprite.x2; sprite.y += sprite.y2; sprite.x2 = 0; sprite.y2 = 0; sprite.d[3] = 0; sprite.d[4] = 0;
          sprite.callback = "end";
        }
        break;
      }
      case "end":
        sprite.d[0] = 1;
        fastTranslate(sprite);
        if (offScreen(sprite, 256)) return calls;
        break;
      default: return null;
    }
  }
  return null;
}
// gBlizzardIceCrystalSpriteTemplate = AnimMoveParticleBeyondTarget (a0..a7, :788-863): the same placement, then AnimWiggleParticleTowardsTarget (amplitude a5, frequency a6) from call 1
// (run inside the creating iteration by the init's own AnimateSprite pass) until data[0] == 1 and the sprite is off screen.
function moveParticleBeyondTargetLifetime(attackerSide: number, pic: PicContext, a: number[]): number | null {
  const start = fastParticleStart(attackerSide, pic, a, a[4]!, a[7]! !== 0, true);
  if (start === null) return null;
  const { sprite, saved } = start;
  sprite.d = [...saved];
  sprite.d[5] = a[5]!; sprite.d[6] = a[6]!;
  for (let calls = 1; calls < 4096; calls += 1) {
    fastTranslate(sprite);
    if (sprite.d[0] === 0) sprite.d[0] = 1;
    sprite.y2 += gbaSin(sprite.d[7]!, sprite.d[5]!);
    sprite.d[7] = (sprite.d[7]! + sprite.d[6]!) & 0xff;
    if (sprite.d[0] === 1 && offScreen(sprite, 160)) return calls - 1;
  }
  return null;
}
function flailMovementLength(): number {
  let [state, count, angle, shrinks, amplitude] = [0, 0, 0, 0x20, 0x800];
  const s16 = (v: number): number => ((v + 0x8000) & 0xffff) - 0x8000;
  for (let call = 1; call < 100000; call += 1) {
    if (state === 2) return call - 1;
    angle = s16(angle + (state === 0 ? 0x200 : -0x200));
    if (state === 0 ? angle >= amplitude : angle <= -amplitude) {
      const diff = s16(amplitude - angle);
      const [div, mod] = [Math.trunc(diff / (amplitude * 2)), diff % (amplitude * 2)];
      if ((div & 1) === 0) { angle = state === 0 ? amplitude - mod : mod - amplitude; state = 1 - state; }
      else angle = state === 0 ? mod - amplitude : amplitude - mod;
    }
    count += 1;
    if (count > 8) {
      if (shrinks > 0) { shrinks -= 1; amplitude = Math.max(amplitude - 0x40, 16); } else state = 2;
    }
  }
  throw new Error("AnimTask_FlailMovement does not end");
}
// ---- aud242n: Confuse Ray / Will-O-Wisp. BattleAnimAdjustPanning (battle_anim.c:1263-1303), singles, no status animation: the player attacker keeps the pan, the opponent attacker
// negates it (-64 -> 64 -> clamped 63); KeepPanInRange / CalculatePanIncrement (:1322-1346).
function adjustPanning(pan: number, attackerSide: number): number {
  const p = attackerSide === 0 ? pan : -pan;
  return Math.min(Math.max(p, -64), 63);
}
function adjustPanningVarLength(attackerSide: number, sourceArg: number, targetArg: number, incArg: number, wait: number): number | null {
  const s16 = (v: number): number => ((v + 0x8000) & 0xffff) - 0x8000;
  const [source, target] = [adjustPanning(sourceArg, attackerSide), adjustPanning(targetArg, attackerSide)];
  const step = source < target ? Math.abs(incArg) : source > target ? -Math.abs(incArg) : 0;
  let [pan, counter] = [source, 0];
  for (let call = 0; call < 4096; call += 1) {
    if (counter === wait) { counter = 0; pan = Math.min(Math.max(s16(pan + step), -64), 63); } else counter += 1;
    if (pan === target) return call - 1;
  }
  return null;
}
// ---- aud242o: AnimTask_Rollout (battle_anim_rock.c:584-715, :738-749). GetRolloutCounter = 1..5 (else 1). The entry only sets data and `func` (RunTasks calls 1..): case 0 is 10 calls that
// each play SE_M_HEADBUTT (calls 1..10), case 1 is 20 calls (11..30), case 2 is 10 calls (31..40), case 3 is D = data[8] calls (41..40 + D; 32 for counter 1, 48 - 8 c otherwise) and
// every p = max(D / 8 - 1, 1) of them plays SE_M_DIG (pan data[13] += (pan2 - pan1) / D first) and creates a dirt sprite (AnimRolloutParticle: 18 arc calls, destroyed on the 19th, i.e. the
// iteration 19 after its creation, before that iteration's RunTasks, and it then decrements data[11]). Case 4 destroys at the first call at or after 41 + D whose data[11] is 0.
function rolloutShape(counter: number): { length: number; period: number; lastDirtCall: number; destroyCall: number } {
  const c = counter >= 1 && counter <= 5 ? counter : 1;
  const length = c === 1 ? 32 : 48 - c * 8;
  const period = Math.max(Math.trunc(length / 8) - 1, 1);
  const lastDirtCall = 40 + period * Math.floor(length / period);
  return { length, period, lastDirtCall, destroyCall: Math.max(41 + length, lastDirtCall + 19) };
}
// AnimConfuseRayBallBounce (battle_anim_ghost.c:220-311). Call 0 is the init: the sprite starts at the attacker's x plus the side-signed offset (SetAnimSpriteInitialXOffset,
// battle_anim_mons.c:763-776), data[0] = |dx| << 8 / speed is the duration (InitAnimLinearTranslationWithSpeed, :1155-1160) and data[6] = 16. Step1 (calls 1..) runs
// UpdateConfuseRayBallBlend and then AnimTranslateLinear (data[0]-- while > 0); the call that finds data[0] == 0 installs Step2. Step2 sets data[0] = 1, translates, and when
// data[6] == 0 installs DestroyAnimSpriteAndDisableBlend (which runs one call later), else UpdateConfuseRayBallBlend. The blend counter (:288-311) steps data[6] on every call
// (data[7] is reset to its high byte on each step): 16 -> 0 (call 16, set to 0x100), 0x101 .. 0x10d (13 calls, 0x10d -> 0), 0 -> 16 up, 16 -> 0 down, ...
function confuseRayBallBounceLength(attackerSide: number, offset: number, speed: number): { n: number; duration: number } | null {
  const [attackerX, targetX] = [BATTLER_X[attackerSide === 0 ? 0 : 1], BATTLER_X[attackerSide === 0 ? 1 : 0]];
  const x = attackerX > targetX ? attackerX - offset : attackerX < targetX ? attackerX + offset : attackerX;
  const duration = Math.trunc((Math.abs(targetX - x) << 8) / speed);
  if (duration < 1) return null;
  let [d0, d6, d7, step2] = [duration, 16, 0, false];
  const update = (): void => {
    if (d6 > 0xff) { d6 += 1; if (d6 === 0x10d) d6 = 0; return; }
    const old = d7;
    d7 += 1;
    if ((old & 0xff) !== 0) return;
    d7 &= 0xff00;
    if ((d7 & 0x100) !== 0) d6 += 1; else d6 -= 1;
    if (d6 === 0 || d6 === 16) d7 ^= 0x100;
    if (d6 === 0) d6 = 0x100;
  };
  for (let call = 1; call < 100000; call += 1) {
    if (!step2) {
      update();
      if (d0 === 0) step2 = true; else d0 -= 1;
    } else {
      d0 = 0;
      if (d6 === 0) return { n: call, duration };
      update();
    }
  }
  return null;
}
function lifetimeOf(cmd: Command, attackerSide: number, pic: PicContext, rolloutCounter: number): Lifetime {
  const { op, args } = cmd;
  if (op === "createvisualtask" && (args[0] === "AnimTask_BlendBattleAnimPal" || args[0] === "AnimTask_BlendBattleAnimPalExclude" || args[0] === "AnimTask_BlendParticle")) {
    const [delay, startY, targetY] = [intArg(args[3]), intArg(args[4]), intArg(args[5])];
    if (delay === null || startY === null || targetY === null || delay < 0) return null;
    return { exact: blendAnimPalLength(delay, startY, targetY) };
  }
  if (op === "complex_palette_blend" || (op === "createsprite" && args[0] === "gComplexPaletteBlendSpriteTemplate")) {
    const named = (key: string): string | undefined => args.find((a) => a.startsWith(`${key}=`));
    const [delay, numBlends] = op === "complex_palette_blend" ? [intArg(named("delay")), intArg(named("num_blends"))] : [intArg(args[4]), intArg(args[5])];
    if (delay === null || numBlends === null || delay < 0 || numBlends < 0) return null;
    return { exact: complexPaletteBlendLength(delay, numBlends) };
  }
  if (op === "blend_color_cycle" || op === "blend_color_cycleexclude" || op === "blend_color_cyclebytag" || (op === "createvisualtask" && /^AnimTask_BlendColorCycle(Exclude|ByTag)?$/.test(args[0] ?? ""))) {
    const key = (k: string, positional: number): number | null => intArg(op === "createvisualtask" ? args[positional] : args.find((a) => a.startsWith(`${k}=`)));
    const [delay, numBlends, initialY, targetY] = [key("delay", 3), key("num_blends", 4), key("initial_blend_y", 5), key("target_blend_y", 6)];
    if (delay === null || numBlends === null || initialY === null || targetY === null) return null;
    return { exact: blendColorCycleLength(delay, numBlends, initialY, targetY) };
  }
  // AnimTask_MetallicShine (battle_anim_dark.c:822-882, step :896-935): the step adds 4 to data[10] per call; every 128 (32 calls) data[11]++, and the third
  // wrap (96 calls) runs DestroyAnimVisualTask. Call 0 is the script step, call k >= 1 is RunTasks of iteration F + k - 1: gone 95 ticks after the creation tick.
  if (op === "metallic_shine" || (op === "createvisualtask" && args[0] === "AnimTask_MetallicShine")) return { exact: METALLIC_SHINE_LENGTH };
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
  // ---- aud242e: fixed-length sprite and mon-task lifetimes (docs/aud242-move-anim-sounds.md section 9 cites every C line). A script createsprite runs
  // CreateSpriteAndAnimate (sprite.c:591-616): callback call 0 (init) and the first AnimateSprite in the script step; call k >= 1 is the AnimateSprites of
  // iteration F + k - 1, so a sprite whose callback destroys at call K is gone K - 1 ticks after the creation tick (animEnded callbacks: the anim's frame
  // durations sum T, animEnded at call T, destroy at call T + 1: exact T). A task entry that runs its step once itself (call 0) and destroys at step call
  // N - 1 is gone N - 2 ticks after; one that only sets `func` (ElectricBolt) destroys at call K = the first RunTasks, exact K - 1.
  const intNamed = (key: string): number | null => intArg(args.find((a) => a.startsWith(`${key}=`)));
  const sprite = (template: string): boolean => op === "createsprite" && args[0] === template;
  const arc = (index: number): Lifetime => { const d = intArg(args[index]); return d === null ? null : { exact: d }; };
  // aud242l: Blizzard's sprites run until they leave the screen along a line fixed by the two battlers' pic Y (battle_anim_ice.c:666-863); `picUsed` marks a walk whose result depends on it.
  if (sprite("gSwirlingSnowballSpriteTemplate") || sprite("gBlizzardIceCrystalSpriteTemplate")) {
    const snowball = args[0] === "gSwirlingSnowballSpriteTemplate";
    const a = args.slice(3, snowball ? 9 : 11).map(intArg);
    if (a.some((v) => v === null) || a.length !== (snowball ? 6 : 8)) return null;
    picUsed = true;
    const n = snowball ? swirlingSnowballLifetime(attackerSide, pic, a as number[]) : moveParticleBeyondTargetLifetime(attackerSide, pic, a as number[]);
    return n === null ? null : { exact: n };
  }
  // AnimSpriteOnMonPos (battle_anim_mons.c:1515-1536): init call, then animEnded of sAnim_ToxicBubble (battle_anim_poison.c:16-23: 4 x 5 = 20).
  if (sprite("gToxicBubbleSpriteTemplate")) return { exact: 20 };
  // AnimSpriteOnMonPos again, gHealingBlueStarAnimCmds (battle_anim_effects_1.c:1825-1836): 2 + 2 + 2 + 3 + 5 + 3 + 2 + 2 = 21 frames.
  if (sprite("gHealingBlueStarSpriteTemplate")) return { exact: 21 };
  // AnimPowerAbsorptionOrb (battle_anim_effects_1.c:2230-2240): data[0] = duration, the init installs StartAnimLinearTranslation with DestroySpriteAndMatrix in data[6]: the
  // AnimRaiseSprite shape below, D + 1 (D = 0 divides by zero: declined).
  if (op === "create_power_absorption_orb_sprite" || sprite("gPowerAbsorptionOrbSpriteTemplate")) { const d = op === "create_power_absorption_orb_sprite" ? intNamed("duration") : intArg(args[5]); return d === null || d < 1 ? null : { exact: d + 1 }; }
  // AnimShadowBall (battle_anim_ghost.c:400-458): call 0 is the init; AnimShadowBall_Step case 0 / 1 / 2 each take max(arg, 1) calls (data[n] -= 1 until <= 0),
  // case 3 destroys at call a0 + a1 + a2 + 1 (a0 or a2 of 0 divide by zero: declined).
  if (sprite("gShadowBallSpriteTemplate")) {
    const a = [0, 1, 2].map((i) => intArg(args[3 + i]));
    return a.some((d) => d === null) || a[0]! < 1 || a[2]! < 1 ? null : { exact: Math.max(a[0]!, 1) + Math.max(a[1]!, 1) + Math.max(a[2]!, 1) };
  }
  // DoVerticalDip (battle_anim_mon_movement.c:451-471): call 0 is the init (callback TranslateSpriteLinearById, battle_anim_mons.c:651-663); D translating calls,
  // the call after sets the stored callback, ReverseVerticalDipDirection runs one call and re-arms, D more calls, one to set DestroyAnimSprite, then it destroys:
  // call 2D + 4, exact 2D + 3.
  if (sprite("gVerticalDipSpriteTemplate")) { const d = intArg(args[3]); return d === null || d < 0 ? null : { exact: 2 * d + 3 }; }
  // AnimFang (battle_anim_effects_3.c:1515-1519): gFangAnimCmds (:321-328) 8 + 16 + 4 + 4 = 32.
  if (sprite("gFangSpriteTemplate")) return { exact: 32 };
  // Arc sprites (InitAnimArcTranslation + TranslateAnimHorizontalArc, battle_anim_mons.c:785-801, AnimTranslateLinear :1111): data[0] = duration D; D calls
  // translate, call D + 1 destroys.
  if (sprite("gSludgeProjectileSpriteTemplate")) return arc(5);
  if (sprite("gWaterGunProjectileSpriteTemplate")) return arc(7);
  if (op === "create_absorption_orb_sprite") { const d = intNamed("wave_period"); return d === null ? null : { exact: d }; }
  // AnimOverheatFlame_Step (battle_anim_dragon.c:443-452): ++data[0] > duration at call duration + 1.
  if (op === "create_overheat_flame_sprite") { const d = intNamed("duration"); return d === null ? null : { exact: d }; }
  // AnimWaterPulseBubble_Step (battle_anim_water.c:1508-1516): --data[3] == 0 at call A5; AnimWaterPulseRing_Step (:1541-1556): data[0] counts 0.. from call 1,
  // destroys when it equals data[3] = A2 (call A2 + 1).
  if (sprite("gWaterPulseBubbleSpriteTemplate")) { const d = intArg(args[8]); return d === null || d < 1 ? null : { exact: d - 1 }; }
  if (sprite("gWaterPulseRingSpriteTemplate")) return arc(5);
  // DoHorizontalLunge / ReverseHorizontalLungeDirection (battle_anim_mon_movement.c:427-445, battle_anim_mons.c:651-663): A0 translating calls, a call that only
  // swaps the callback, the reverse call, A0 translating calls, a swap call, the destroy call 2 * A0 + 4.
  if (sprite("gHorizontalLungeSpriteTemplate")) { const d = intArg(args[3]); return d === null ? null : { exact: 2 * d + 3 }; }
  // AnimTask_ShakeBattlePlatforms (battle_anim_normal.c:957-993): the entry runs the step once; a shake takes delay + 1 calls, `shakes` shakes, the last
  // call (index shakes * (delay + 1) - 1) destroys.
  if (op === "shake_battle_platforms" || (op === "createvisualtask" && args[0] === "AnimTask_ShakeBattlePlatforms")) {
    const [shakes, delay] = op === "shake_battle_platforms" ? [intNamed("shakes"), intNamed("delay")] : [intArg(args[4]), intArg(args[5])];
    if (shakes === null || delay === null || shakes < 1 || delay < 0) return null;
    return { exact: shakes * (delay + 1) - 2 };
  }
  // AnimTask_TranslateMonElliptical(RespectSide) (battle_anim_mon_movement.c:358-402): the entry runs the step once, data[5] += wavePeriod (1 << min(speed, 5))
  // per call, loops decrement on every wrap to 0; the call that reaches 0 loops destroys.
  if (op === "createvisualtask" && (args[0] === "AnimTask_TranslateMonElliptical" || args[0] === "AnimTask_TranslateMonEllipticalRespectSide")) {
    const [loops, speed] = [intArg(args[5]), intArg(args[6])];
    if (loops === null || speed === null || loops < 1 || speed < 0) return null;
    const period = 1 << Math.min(speed, 5);
    let [phase, remaining, calls] = [0, loops, 0];
    do { calls += 1; phase = (phase + period) & 0xff; if (phase === 0) remaining -= 1; } while (remaining > 0);
    return { exact: calls - 2 };
  }
  // AnimTask_ElectricBolt (battle_anim_electric.c:685-724): the entry only sets func; the step's data[10] counts calls 1.. and call 11 (data[10] == 10) destroys.
  // The five segment sprites are CreateSprite'd by the task, which gAnimVisualTaskCount does not count.
  if (op === "createvisualtask" && args[0] === "AnimTask_ElectricBolt") return { exact: 10 };
  // ---- aud242m (docs section 17). AnimAngerMark (battle_anim_effects_2.c:2281-2299) installs RunStoredCallbackWhenAffineAnimEnds (battle_anim_mons.c:729-733) with
  // DestroySpriteAndMatrix stored; gAngerMarkAffineAnimCmds (:586-591) are two 8-tick frames, so the affine END is reached at call 16 (sprite.c:1055-1178: one delta per
  // call from the begin call on), the callback sees it in call 17, installs the destroy, which runs in call 18: gone 17 ticks after F (the ROM-validated visual port
  // src/animation/swagger.ts draws the mark for exactly 17 ticks, ages 0..16).
  if (sprite("gAngerMarkSpriteTemplate")) return { exact: 17 };
  // AnimTask_FlailMovement (battle_anim_effects_3.c:2845-2931): the entry only sets func; the step (call 1..) integrates data[2] by 0x200 per call and every call past the ninth
  // shrinks the amplitude data[14] by 0x40 (down to 16) for 0x20 calls, then sets data[0] = 2; the next call destroys the task (call K, gone K - 1 ticks after F).
  if (op === "createvisualtask" && args[0] === "AnimTask_FlailMovement") return { exact: flailMovementLength() };
  // ---- aud242f (docs section 10). Call numbering as above: sprite callback call 0 = init (script step), call k >= 1 = AnimateSprites of iteration F + k - 1; a
  // sprite destroyed at call K is gone K - 1 ticks after F. SetCallbackToStoredInData6 / `sprite->callback = x` only install: x first runs in the NEXT call.
  // AnimBowMon (battle_anim_effects_1.c:4400-4496, arg 0 = step kind): kind 0 = Step1 (call 1 sets data[0] = 6 and TranslateSpriteLinearById; calls 2..7 translate,
  // call 8 installs Step1_Callback, calls 9..12 (++data[0] > 3 at call 12), Step4 destroys at call 13) = 12; kind 1 = Step2 (call 1 data[0] = 4, calls 2..5, call 6
  // installs Step4, call 7 destroys) = 6; kind 2 = Step3 (++data[0] > 8 at call 9, Step3_Callback calls 10..12 (++data[0] > 2 at call 12), Step4 at 13) = 12;
  // any other kind: Step4 at call 1 = 0.
  if (sprite("gBowMonSpriteTemplate")) { const kind = intArg(args[3]); return kind === null ? null : { exact: kind === 0 || kind === 2 ? 12 : kind === 1 ? 6 : 0 }; }
  // AnimHornHit (battle_anim_effects_1.c:5108-5163): duration D = clamp(arg 2, 2, 127), `--data[1] == 0` at call D.
  if (sprite("gHornHitSpriteTemplate")) { const d = intArg(args[5]); return d === null ? null : { exact: Math.min(Math.max(d, 2), 0x7f) - 1 }; }
  // AnimIceBeamParticle (battle_anim_ice.c:610-624) -> StartAnimLinearTranslation / AnimTranslateLinear_WithFollowup (battle_anim_mons.c:1093-1100, 1111-1145): call 1
  // initialises and translates once (calls 1..D translate, data[0] = D -> 0), call D + 1 returns TRUE and installs DestroyAnimSprite, call D + 2 destroys = D + 1.
  if (sprite("gIceBeamOuterCrystalSpriteTemplate") || sprite("gIceBeamInnerCrystalSpriteTemplate")) { const d = intArg(args[7]); return d === null || d < 1 ? null : { exact: d + 1 }; }
  // AnimIcePunchSwirlingParticle (battle_anim_ice.c:592-602): sDuration = 30, the init call runs TranslateSpriteInGrowingCircle once (30 -> 29), calls 1..29 finish the
  // count, call 30 installs DestroyAnimSprite (battle_anim_mons.c:468-486), call 31 destroys = 30.
  if (sprite("gIceCrystalSpiralInwardSmall") || sprite("gIceCrystalSpiralInwardLarge")) return { exact: 30 };
  // AnimBasicFistOrFoot (battle_anim_fight.c:452-464, create_fist_sprite): data[0] = duration, WaitAnimForDuration (battle_anim_mons.c:551-557) counts it down in calls
  // 1..D, call D + 1 installs DestroyAnimSprite, call D + 2 destroys = D + 1.
  if (op === "create_fist_sprite" || sprite("gFistFootSpriteTemplate")) { const d = op === "create_fist_sprite" ? intNamed("duration") : intArg(args[5]); return d === null || d < 0 ? null : { exact: d + 1 }; }
  // AnimTask_ScaleMonAndRestore (battle_anim_mon_movement.c:823-865): the entry only sets func; the step (call 1..) counts data[2] = gBattleAnimArgs[2] down to 0, then repeats
  // once for data[3] = gBattleAnimArgs[2] (> 0) with the deltas negated, then destroys on that second 0: call 2 * duration, gone 2 * duration - 1 ticks after F (duration = script args[4]: args[1] is the priority).
  if (op === "createvisualtask" && args[0] === "AnimTask_ScaleMonAndRestore") { const d = intArg(args[4]); return d === null || d < 1 ? null : { exact: 2 * d - 1 }; }
  // AnimTask_GrowAndShrink (battle_anim_effects_2.c:2235-2248 with gGrowAndShrinkAffineAnimCmds :543-549, RunAffineAnimFromTaskData battle_anim_mons.c:1800-1862): the entry
  // only sets func; frames of duration 12, 24, 12 take calls 1..48 and the END command on call 49 returns FALSE and destroys: gone 48 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_GrowAndShrink") return { exact: 48 };
  // AnimBreathPuff (battle_anim_effects_2.c:2250-2272): call 0 sets data[0] = 52 and installs TranslateSpriteLinearFixedPoint; calls 1..52 decrement (battle_anim_mons.c:607-621),
  // call 53 stores DestroyAnimSprite (SetCallbackToStoredInData6), call 54 destroys: gone 53 ticks after F.
  if (sprite("gBreathPuffSpriteTemplate")) return { exact: 53 };
  // ---- aud242g (docs section 11). AnimTask_SetPsychicBackground (battle_anim_effects_3.c:1372-1376): the entry installs SetPsychicBackground_Step and does
  // gAnimVisualTaskCount--; Cmd_createvisualtask runs the entry before its own gAnimVisualTaskCount++ (battle_anim.c:439-441), so the net count is 0 and a following
  // waitforvisualfinish never waits for it (the step only rotates palette entries until the script sets arg 7 = 0xFFFF).
  if (op === "createvisualtask" && args[0] === "AnimTask_SetPsychicBackground") return { exact: -1 };
  // AnimTriAttackTriangle (battle_anim_effects_3.c:2015-2046): call 0 (script step) inits and counts data[0] 0 -> 1, call k has data[0] = k + 1, so call 60 reaches 61:
  // it stores DestroyAnimSprite in data[6], sets data[0] = 20 and installs StartAnimLinearTranslation (battle_anim_mons.c:1093-1101), which first runs in call 61
  // and translates at once (AnimTranslateLinear, :1111-1139: 20 -> 0 over calls 61..80); call 81 sees data[0] == 0, SetCallbackToStoredInData6 (:1141-1146) installs
  // DestroyAnimSprite and call 82 destroys: gone 81 ticks after F. Args only move the start position.
  if (sprite("gTriAttackTriangleSpriteTemplate")) return { exact: 81 };
  // AnimWaterBubbleProjectile (battle_anim_water.c:529-607; D = gBattleAnimArgs[6] = script args[9], the timer): call 0 (script step) is the init plus Step1's first run
  // (timer D -> D - 1; the sprite is animPaused with its anim at frame 0, delay counter 0); Step1 runs in calls 0..D - 1 and the call D - 1 that reaches --timer == 0 installs Step2;
  // Step2 (call D) un-pauses and installs RunStoredCallbackWhenAnimEnds (+ Step3); sAnim_WaterBubbleProjectile (:101-107, frames 1 / 5 / 5) then moves to frame 1 in call D
  // (AnimateSprite follows the callback, sprite.c:308-323, ContinueAnim :942-960), counts its 4 delay calls D + 1..D + 4, frame 2 at call D + 5 (4 more calls), END (animEnded) at call D + 10;
  // call D + 11 runs the stored Step3, call D + 12 runs Step3 (data[0] = 10, WaitAnimForDuration), calls D + 13..D + 22 count it down, call D + 23 installs DestroySpriteAndMatrix,
  // call D + 24 destroys: gone D + 23 ticks after F (73 for the Bubblebeam bubbles). The invisible helper sprite is DestroySprite'd without the visual-task decrement.
  if (sprite("gWaterBubbleProjectileSpriteTemplate")) { const d = intArg(args[9]); return d === null || d < 1 || d > 255 ? null : { exact: d + 23 }; }
  // AnimThunderboltOrb (battle_anim_electric.c:605-627): the init only stores data[3] = args[3] and installs _Step; call k >= 1 destroys when data[3]-- <= 0, i.e. at call max(d, 0) + 1:
  // gone max(d, 0) ticks after F. AnimSparkElectricityFlashing (:629-666): the init runs the step itself in call 0 (data[0] = args[6] is checked, then decremented), call k checks d - k;
  // destroyed at call max(d, 0), gone max(d, 0) - 1 ticks after F (the data[4] = args[10] & 0x7FFF modulus never affects the lifetime).
  if (sprite("gThunderboltOrbSpriteTemplate")) { const d = intArg(args[3]); return d === null ? null : { exact: Math.max(d, 0) }; }
  // aud242n: AnimSparkElectricity (:515-569) sets data[0] = gBattleAnimArgs[3] (script args[6]) and installs DestroyAnimSpriteAfterTimer (battle_anim_flying.c:539-551), which
  // runs from the next call: call k >= 1 destroys when data[0]-- <= 0, i.e. at call max(d, 0) + 1, gone max(d, 0) ticks after F. Args 0..2 and 4..6 only place and rotate it.
  if (sprite("gSparkElectricitySpriteTemplate")) { const d = intArg(args[6]); return d === null ? null : { exact: Math.max(d, 0) }; }
  if (sprite("gSparkElectricityFlashingSpriteTemplate")) { const d = intArg(args[6]); return d === null ? null : { exact: Math.max(d, 0) - 1 }; }
  // AnimTask_SwayMon (battle_anim_mon_movement.c:751-815): the entry only sets func (data[11] = 0, data[12] = 1); the step's call k adds `period` (script args[4], as a u16) to the
  // sine index, waveIndex = index >> 8, and a half-wave crossing (waveIndex >= 0x80 while data[12] == 1, or < 0x7f while data[12] == 0) flips the state and decrements the
  // sway count (args[5]); the call that reaches 0 destroys the task: call K, gone K - 1 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_SwayMon") {
    const [period, sways] = [intArg(args[4]), intArg(args[5])];
    if (period === null || sways === null || sways < 1) return null;
    let [index, remaining, high] = [0, sways, false];
    for (let call = 1; call <= 100000; call += 1) {
      index = (index + period) & 0xffff;
      const wave = index >> 8;
      if ((!high && wave >= 0x80) || (high && wave < 0x7f)) {
        high = !high;
        remaining -= 1;
        if (remaining === 0) return { exact: call - 1 };
      }
    }
    return null;
  }
  // ---- aud242i (docs section 13). AnimSludgeBombHitParticle (battle_anim_poison.c:231-258; d = gBattleAnimArgs[2] = script args[5]): call 0 is the init (data[0] = d, then
  // InitSpriteDataForLinearTranslation divides by d: 0 crashes the ROM, declined); the step's call k >= 1 runs TranslateSpriteLinearFixedPoint (battle_anim_mons.c:607-621,
  // data[0]-- while > 0) and destroys on the same call once data[0] is 0, i.e. at call d: gone d - 1 ticks after F.
  if (sprite("gSludgeBombHitParticleSpriteTemplate")) { const d = intArg(args[5]); return d === null || d < 1 ? null : { exact: d - 1 }; }
  // AnimTask_AttackerFadeToInvisible / ...FromInvisible (battle_anim_dark.c:191-263; macros attacker_fade_to_invisible / _from_invisible step_delay=d): the entry only sets
  // func and BLDALPHA; the step's data[2] counts 0 -> d over calls 1..d and call d + 1 steps the blend (blendA 0 -> 16 resp. 16 -> 0, 16 steps) resetting data[2], so the
  // 16th step is call 16 * (d + 1), which destroys the task: gone 16 * (d + 1) - 1 ticks after F.
  const fadeMacro = op === "attacker_fade_to_invisible" || op === "attacker_fade_from_invisible";
  if (fadeMacro || (op === "createvisualtask" && (args[0] === "AnimTask_AttackerFadeToInvisible" || args[0] === "AnimTask_AttackerFadeFromInvisible"))) {
    const d = intArg(fadeMacro ? (args.find((a) => a.startsWith("step_delay=")) ?? args[args.length - 1]) : args[2]);
    return d === null || d < 0 || d > 255 ? null : { exact: 16 * (d + 1) - 1 };
  }
  // AnimTask_SetAttackerInvisibleWaitForSignal (battle_anim_utility_funcs.c:1079-1092): outside contests the entry does gAnimVisualTaskCount-- (net 0 after Cmd_createvisualtask's
  // own ++, battle_anim.c:439-441), so a following waitforvisualfinish never waits for it (it lives until the script sets arg 7 = 0x1000).
  if (op === "createvisualtask" && args[0] === "AnimTask_SetAttackerInvisibleWaitForSignal") return { exact: -1 };
  // ---- aud242j (docs section 14). AnimTask_ShakeMonInPlace (battle_anim_mon_movement.c:251-299; script args[5] = numShakes, args[6] = delay): the entry runs the step once
  // (call 0); the step acts on every call where data[3] == 0 (call 0, then every delay + 1 calls) and the numShakes-th action destroys: call (numShakes - 1) * (delay + 1)
  // (0 when numShakes <= 1), gone one tick less after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_ShakeMonInPlace") {
    const [shakes, delay] = [intArg(args[5]), intArg(args[6])];
    return shakes === null || delay === null || delay < 0 ? null : { exact: Math.max(shakes - 1, 0) * (delay + 1) - 1 };
  }
  // AnimMovementWaves (battle_anim_effects_2.c:3624-3666; loops = gBattleAnimArgs[2] = script args[5]): arg 2 == 0 destroys in the init; else the init starts the 4 x 8 = 32 tick
  // anim (gMovementWavesAnimCmds1 / 2 :1130-1150; the same two anims) in call 0, animEnded is seen at call 33, which restarts it (--data[0]) with its first AnimateSprite in
  // that call, so a loop is 33 calls and the sprite destroys at call loops * 33: gone loops * 33 - 1 ticks after F.
  if (sprite("gMovementWavesSpriteTemplate")) { const n = intArg(args[5]); return n === null || n < 0 ? null : { exact: n === 0 ? -1 : n * 33 - 1 }; }
  // AnimRedHeartProjectile (battle_anim_effects_2.c:3173-3196): data[0] = 95, InitAnimLinearTranslation, calls 1..95 translate (AnimTranslateLinear, battle_anim_mons.c:1111-1139),
  // call 96 sees it finished and destroys: gone 95 ticks after F. AnimParticleBurst (:3198-3216): call 0 stores the args (data[0] 0 -> 1), call k adds 3 to data[3]
  // (starting at 0) and destroys on the first value above 120: k = 41, gone 40 ticks after F (the args only move it).
  if (sprite("gRedHeartProjectileSpriteTemplate")) return { exact: 95 };
  if (sprite("gRedHeartBurstSpriteTemplate")) return { exact: 40 };
  // AnimTask_DigUpMovement (battle_anim_ground.c:386-418): arg 0 FALSE runs AnimTask_DigSetVisibleUnderground in the entry (case 0), the first RunTasks (call 1, iteration F)
  // destroys it: gone 0 ticks after F. (arg 0 TRUE, the rise from the hole, is not modelled: nothing waits for it.)
  if (op === "createvisualtask" && args[0] === "AnimTask_DigUpMovement") return args[2] === "FALSE" ? { exact: 0 } : null;
  // AnimFlyingParticle (battle_anim_effects_1.c:3517-3590; script args[6] = x step s = gBattleAnimArgs[3], args[9] = unk6: 0 = attacker's side, else the target's): call 0 places
  // the sprite at x = -16 (opponent side, moving right) or 256 (player side, moving left); call k >= 1 has a = k - 1 and destroys once x + x2 leaves the screen:
  // opponent side s * a >= 264, player side s * a >= 272 (AnimFlyingParticle_Step :3580-3590). Gone ceil(threshold / s) ticks after F.
  if (sprite("gSilverWindBigSparkSpriteTemplate") || sprite("gSilverWindMediumSparkSpriteTemplate") || sprite("gSilverWindSmallSparkSpriteTemplate")) {
    const [speed, anchor] = [intArg(args[6]), intArg(args[9])];
    if (speed === null || anchor === null || speed < 1) return null;
    const side = anchor === 0 ? attackerSide : 1 - attackerSide;
    return { exact: Math.ceil((side === 0 ? 272 : 264) / speed) };
  }
  // ---- aud242k (docs section 15). Same call numbering as above (sprite call 0 = init in the script step, gone K - 1 ticks after F for a destroy at call K).
  // AnimFireSpiralInward (battle_anim_fire.c:466-478): sDuration = 30, the init runs TranslateSpriteInGrowingCircle once (battle_anim_mons.c:468-486), calls 1..29 finish the
  // count, call 30 installs DestroyAnimSprite, call 31 destroys = 30 (the same shape as the Ice Punch swirl). AnimFireSpread (:481-492; D = gBattleAnimArgs[4] = script args[7]) and
  // AnimGrantingStars (battle_anim_effects_1.c:4099-4113; D = gBattleAnimArgs[5] = args[8]): the init installs TranslateSpriteLinearFixedPoint (:607-621), calls 1..D translate,
  // call D + 1 installs DestroyAnimSprite, call D + 2 destroys = D + 1.
  if (sprite("gFireSpiralInwardSpriteTemplate")) return { exact: 30 };
  if (sprite("gFireSpreadSpriteTemplate")) { const d = intArg(args[7]); return d === null || d < 0 ? null : { exact: d + 1 }; }
  if (sprite("gGrantingStarsSpriteTemplate")) { const d = intArg(args[8]); return d === null || d < 0 ? null : { exact: d + 1 }; }
  // AnimTask_DeepInhale (battle_anim_effects_3.c:3474-3510): the entry only sets func; the step's RunAffineAnimFromTaskData (battle_anim_mons.c:1800-1862) runs the frames of
  // gDeepInhaleAffineAnimCmds (:780-788: 4 + 16 + 4 + 24 + 16 = 64) over calls 1..64 and the END command on call 65 returns FALSE and destroys: gone 64 ticks after F.
  // AnimYawnCloud (:3532-3563): data[0] counts calls from 1; from call 59 on every 2nd call advances data[2] and the call that makes it 4 destroys: call 66, gone 65 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_DeepInhale") return { exact: 64 };
  if (sprite("gYawnCloudSpriteTemplate")) return { exact: 65 };
  // AnimThrowProjectile (battle_anim_mons.c:1572-1589; D = gBattleAnimArgs[4] = script args[7]): the arc of InitAnimArcTranslation / TranslateAnimHorizontalArc, D translating calls,
  // call D + 1 destroys (the Sludge / Water Gun arc) = D. AnimBlackSmoke (battle_anim_effects_3.c:1182-1209; T = gBattleAnimArgs[4] = args[7]): the init installs the step, calls 1..T
  // decrement data[1], call T + 1 destroys = T.
  if (sprite("gBlackBallSpriteTemplate")) return arc(7);
  if (sprite("gBlackSmokeSpriteTemplate")) { const d = intArg(args[7]); return d === null || d < 0 ? null : { exact: d }; }
  // AnimGuardRing (battle_anim_effects_2.c:3799-3820) and AnimRaiseSprite (battle_anim_rock.c:571-582; D = gBattleAnimArgs[3] = args[6]): data[0] = D, the init installs
  // StartAnimLinearTranslation (battle_anim_mons.c:1093-1100), which translates at once from call 1 (calls 1..D), call D + 1 installs DestroyAnimSprite, call D + 2 destroys = D + 1
  // (the Ice Beam crystal shape).
  if (sprite("gGuardRingSpriteTemplate")) return { exact: 14 };
  if (sprite("gAncientPowerRockSpriteTemplate")) { const d = intArg(args[6]); return d === null || d < 1 ? null : { exact: d + 1 }; }
  // AnimShakeMonOrBattlePlatforms (battle_anim_normal.c:853-915; T = shake_duration): sTimer = T, the init installs the step, calls 1..T decrement it, call T + 1 restores the
  // coordinate and destroys = T.
  if (op === "shake_mon_or_platform" || sprite("gShakeMonOrPlatformSpriteTemplate")) { const d = op === "shake_mon_or_platform" ? intNamed("shake_duration") : intArg(args[5]); return d === null || d < 0 ? null : { exact: d }; }
  // AnimDevil (battle_anim_effects_2.c:3580-3610): one callback; call c has data[3] = c + 1 and destroys when it exceeds 90: call 90, gone 89 ticks after F.
  if (sprite("gDevilSpriteTemplate")) return { exact: 89 };
  // AnimEyeSparkle (:3504-3514): the init installs the step, gEyeSparkleAnimCmds (:1011-1019) is 5 x 4 = 20 frames, animEnded at call 20, destroy at call 21 = 20.
  if (sprite("gEyeSparkleSpriteTemplate")) return { exact: 20 };
  // AnimTask_ScaryFace (battle_anim_effects_2.c:3324-3410): the entry loads the BG and sets func; the step's case 0 ends on its 14th blend (every 2nd call: call 28), case 1 takes 21
  // calls (29..49), case 2 ends on its 14th decrement (calls 51, 53, ..., 77), and case 3 / 4 clear the BG and destroy in the next call: call 78, gone 77 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_ScaryFace") return { exact: 77 };
  // AnimTask_ShakeTargetInPattern (battle_anim_fire.c:1344-1375; maxShakes = gBattleAnimArgs[0] = script args[2] (aud242o: was read from args[3], the shake offset)): the entry is the step (call 0 stores the args); every call counts tShakeNum and the
  // call where it equals maxShakes (call maxShakes - 1) destroys: gone maxShakes - 2 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_ShakeTargetInPattern") { const n = intArg(args[2]); return n === null || n < 1 ? null : { exact: n - 2 }; }
  // AnimBite (battle_anim_dark.c:320-352, create_sharp_teeth_sprite; H = half_duration): the init installs Step1; calls 1..H count data[3] up (call H installs Step2), Step2 counts it
  // down over calls H + 1..2H and the call that reaches 0 destroys: call 2H, gone 2H - 1 ticks after F.
  if (op === "create_sharp_teeth_sprite" || sprite("gSharpTeethSpriteTemplate") || sprite("gClampJawSpriteTemplate")) { const h = op === "create_sharp_teeth_sprite" ? intNamed("half_duration") : intArg(args[8]); return h === null || h < 1 ? null : { exact: 2 * h - 1 }; }
  // AnimWishStar (battle_anim_effects_3.c:2104-2140): x = 256 (player) / -16, x2 = -/+ (72 * call >> 4); newX = x + x2 + 32 is a u32, so the player's star is destroyed when it
  // goes negative: 288 - (72c >> 4) < 0 at call 65 (the opponent's: 16 + (72c >> 4) > 304 at call 65 too): gone 64 ticks after F, both sides.
  if (sprite("gWishStarSpriteTemplate")) return { exact: 64 };
  // ---- aud242n (docs section 18). SoundTask_AdjustPanningVar (battle_anim_sound_tasks.c:370-407): the entry runs the step once itself (call 0), then RunTasks calls; the pan (data[11])
  // moves by the increment on every (r9 + 1)-th call, KeepPanInRange clamps it, and the call on which it equals the target pan destroys the task: call K, gone K - 1 ticks after F
  // (K = 0: destroyed inside the creating step, net 0 in gAnimVisualTaskCount, exact -1). Used by Confuse Ray (pan -64 -> 63 step 2) and Will-O-Wisp.
  if (op === "createvisualtask" && args[0] === "SoundTask_AdjustPanningVar") {
    const a = [2, 3, 4, 5].map((i) => intArg(args[i]));
    if (a.some((v) => v === null)) return null;
    const n = adjustPanningVarLength(attackerSide, a[0]!, a[1]!, a[2]!, a[3]!);
    return n === null ? null : { exact: n };
  }
  // gConfuseRayBallBounceSpriteTemplate (battle_anim_ghost.c:220-311, args 28 / 0 / 288 in Move_CONFUSE_RAY): a Step1 / Step2 sprite whose lifetime comes only from the x distance and the
  // blend counter (no pic Y, no RNG, no damage).
  if (sprite("gConfuseRayBallBounceSpriteTemplate")) {
    const [offset, speed] = [intArg(args[3]), intArg(args[5])];
    if (offset === null || speed === null || speed < 1) return null;
    const ball = confuseRayBallBounceLength(attackerSide, offset, speed);
    return ball === null ? null : { exact: ball.n };
  }
  // gConfuseRayBallSpiralSpriteTemplate (:313-341): the init installs the step and runs it at once (call 0: data[7] 0 -> 1), so call k has data[7] = k + 1 and call 60 (61) destroys: gone 59 ticks after F.
  if (sprite("gConfuseRayBallSpiralSpriteTemplate")) return { exact: 59 };
  // AnimHitSplatBasic (battle_anim_normal.c:1006-1018): affine anim `animation` (sAffineAnim_HitSplat_0..3, :134-163), RunStoredCallbackWhenAffineAnimEnds (sprite.c:729-733) with
  // DestroyAnimSprite stored. Anims 1..3 are one shape (a 0 frame, then the 8 frame): exact 10, ROM-measured on anim 2 (aud242p Poison Sting window: the wait ends 10 ticks after the
  // hit splat, the Shake task there is 8; Spark / Poison Tail agree). Anim 0 (the 8 frame alone) and a non-literal animation stay the bound.
  if (op === "create_basic_hitsplat_sprite" || sprite("gBasicHitSplatSpriteTemplate")) {
    const a = op === "create_basic_hitsplat_sprite" ? intNamed("animation") : intArg(args[6]);
    return a !== null && a >= 1 && a <= 3 ? { exact: 10 } : { bound: 10 };
  }
  // ---- aud242o (docs section 19). AnimPetalDanceBigFlower / SmallFlower (battle_anim_effects_1.c:2482-2548; D = duration): the init sets data[0] = D, runs InitAnimLinearTranslation
  // (battle_anim_mons.c:1065-1091, data[0] unchanged) and calls the step at once. The step is AnimTranslateLinear (:1111-1139, data[0]-- per call while non-zero): calls 0..D - 1 translate,
  // call D finds data[0] == 0 and DestroyAnimSprite: gone D - 1 ticks after F (the sway only moves x2 / y2 / the oam flip bit).
  if (op === "create_petal_dance_big_flower_sprite" || op === "create_petal_dance_small_flower_sprite" || sprite("gPetalDanceBigFlowerSpriteTemplate") || sprite("gPetalDanceSmallFlowerSpriteTemplate")) {
    const d = op.startsWith("create_") ? intNamed("duration") : intArg(args[6]);
    return d === null || d < 1 ? null : { exact: d - 1 };
  }
  // ---- aud242p: AnimTask_LeafBlade (battle_anim_effects_1.c:3255-3466, Step2 :3476-3496, trail callback :3498-3512). The entry runs the first arc init and installs Step (RunTasks calls 1..): seven arc states
  // (0, 2, .., 12; InitAnimArcTranslation with data[0] = 10, AnimTranslateLinear :1111: 10 translating calls and the 11th returns TRUE) of 11 calls each, six 0xFF holds (++data[1] > 5: 6 calls) and six one-call
  // setups (1, 3, .., 11): the main sprite dies in call 119, state 13 starts in call 120. Every arc call (77) first creates a trail sprite (Step2) that dies on its 9th flip: data[0] = (#trails before) & 1,
  // flips on callback calls 2, 4, .. (data[0] 0) or 1, 3, .. (data[0] 1). The last trail (76 before, even) is created in call 119 and dies on its 18th callback call = iteration F + 137, before RunTasks; state 13 sees
  // data[12] == 0 there and destroys: gone 136 ticks after F.
  if (op === "create_leaf_blade_task" || (op === "createvisualtask" && args[0] === "AnimTask_LeafBlade")) return { exact: 136 };
  // AnimTask_Rollout: gone destroyCall - 1 ticks after F (the dirt sprites are CreateSprite'd, not counted by waitforvisualfinish).
  if (op === "createvisualtask" && args[0] === "AnimTask_Rollout") { counterUsed = true; return { exact: rolloutShape(rolloutCounter).destroyCall - 1 }; }
  // ---- AnimDiveBall (battle_anim_flying.c:1010-1047; args a2 = wait, a3 = acceleration): the sprite starts at the attacker's pic Y (+ a1) and the init installs Step1 without running it. Calls
  // 1..a2 count data[0] down; then every call adds a3 to data[2] and moves y2 up by data[2] >> 8 until y + y2 <= -32; the next 22 calls (data[3]++ > 20) hide it and the 22nd installs Step2,
  // which adds the final data[2] >> 8 to y2 every call and destroys on the call y2 > 0: destroyed at call K, gone K - 1 ticks after F. Pic Y dependent.
  if (sprite("gDiveBallSpriteTemplate")) {
    const [a1, wait, accel] = [intArg(args[4]), intArg(args[5]), intArg(args[6])];
    if (a1 === null || wait === null || accel === null || accel < 1) return null;
    picUsed = true;
    const y = pic.attackerY + a1;
    let [d0, d2, d3, y2, step2] = [wait, 0, 0, 0, false];
    for (let call = 1; call < 100000; call += 1) {
      if (step2) {
        y2 += d2 >> 8;
        if (y2 > 0) return { exact: call - 1 };
      } else if (d0 > 0) d0 -= 1;
      else if (y + y2 > -32) { d2 += accel; y2 -= d2 >> 8; }
      else { if (d3++ > 20) step2 = true; }
    }
    return null;
  }
  // AnimLargeFlame (battle_anim_fire.c:518-550; gLargeFlameSpriteTemplate / gLargeFlameScatterSpriteTemplate, S = arg 2): the init only installs the step, which counts data[0] up
  // from call 1 and destroys at call S (data[1] = S): gone S - 1 ticks after F.
  if (sprite("gLargeFlameSpriteTemplate") || sprite("gLargeFlameScatterSpriteTemplate")) { const n = intArg(args[5]); return n === null || n < 1 || n > 0x7fff ? null : { exact: n - 1 }; }
  // AnimLightning (battle_anim_electric.c:459-474): the init installs the step, which destroys once sAnim_Lightning (:40-48: 5 + 5 + 8 + 5 + 5 = 28 ticks) ends: exact 28.
  if (sprite("gLightningSpriteTemplate")) return { exact: 28 };
  // ---- aud242p (docs section 20). AnimTask_HardwarePaletteFade (battle_anim_utility_funcs.c:199-216; args blendCnt, delay, y, targetY, reset = script args[2..6]): the entry runs
  // BeginHardwarePaletteFade (palette.c:728-744: delayCounter = delay, so the first update is immediate) in the script step and installs a step that destroys once `active` clears. CB2's
  // UpdateHardwarePaletteFade (:746-785) then steps y every delay + 1 iterations from iteration F; the step past targetY (|targetY - y| steps later) sets hardwareFadeFinishing, the VBlank
  // of that iteration (UpdateBlendRegisters) clears `active`, and the task's RunTasks of the next iteration destroys it: gone (delay + 1) * |targetY - y| + 1 ticks after F.
  if (op === "createvisualtask" && args[0] === "AnimTask_HardwarePaletteFade") {
    const [delay, y, target] = [intArg(args[3]), intArg(args[4]), intArg(args[5])];
    return delay === null || y === null || target === null || delay < 0 || y < 0 || target < 0 ? null : { exact: (delay + 1) * Math.abs(target - y) + 1 };
  }
  // AnimSpotlight (battle_anim_effects_3.c:1545-1604; affine anims :330-376): the init installs Step1 (call 0). The affine anim 0 (0 + 20 ticks) ends at call 20 (sprite.c:1055-1178: the END
  // is reached at call begin + sum of the frame durations, the aud242m anger-mark rule), so state 0 passes in call 21; states 1 / 2 / 3 take 21 / 41 / 21 calls (22..104); state 4 (call 105)
  // ChangeSpriteAffineAnim(1) (0 + 19 ticks, begin call 105, END at call 124); state 5 sees it in call 125 and installs Step2, which destroys in call 126: gone 125 ticks after F.
  if (sprite("gSpotlightSpriteTemplate")) return { exact: 125 };
  // AnimClappingHand / AnimClappingHand2 (:1606-1675; script args[3..7] = x, y, side, anchored, N): data[0] = N cycles of 12 calls (x2 -+12 -> 0 -> -+12 in steps of 2); the call that completes
  // the Nth cycle (call 12N, abs(x2) == 12 on the way back) decrements data[0] to 0 and the same call destroys it: gone 12N - 1 ticks after F (N <= 0: the first step call destroys, 0).
  if (sprite("gClappingHandSpriteTemplate") || sprite("gClappingHand2SpriteTemplate")) { const n = intArg(args[7]); return n === null ? null : { exact: n < 1 ? 0 : 12 * n - 1 }; }
  // AnimReversalOrb (battle_anim_effects_3.c:3140-3180; d = script args[3]): the init installs the step and runs it once itself (call 0 = step 1); the outward phase ends after d steps
  // (data[4] == d at step d, calls 0..d-1), the inward phase after d more (the destroying step is step 2d = call 2d - 1): gone 2d - 2 ticks after F.
  if (sprite("gReversalOrbSpriteTemplate")) { const d = intArg(args[3]); return d === null || d < 1 || d > 0x7fff ? null : { exact: 2 * d - 2 }; }
  // AnimSpinningSparkle (battle_anim_mons.c:2380-2390) installs RunStoredCallbackWhenAnimEnds with DestroyAnimSprite stored; sAnim_SpinningSparkle (battle_anim_status_effects.c:100-107) is
  // 5 x 3 = 15 ticks: BeginAnim in call 0, END (animEnded) at call 15 (sprite.c:909-960), call 16 only installs the stored callback (SetCallbackToStoredInData6 does not run it, :423-427),
  // call 17 destroys: gone 16 ticks after F (the aud242j water bubble shape: RunStored END + 1, stored callback END + 2).
  if (sprite("gSpinningSparkleSpriteTemplate")) return { exact: 16 };
  // AnimFallingRock (battle_anim_rock.c:297-333; TranslateSpriteInEllipse battle_anim_mons.c:516-533): the init runs the ellipse once itself (sDuration 16: steps in call 0..15), call 16 hands over
  // to AnimFallingRock_Step, which in call 17 restarts the ellipse (sDuration 32: steps in calls 17..48), call 49 hands over to DestroySpriteAndMatrix and call 50 destroys: gone 49 ticks
  // after F, whatever the script args.
  if (sprite("gFallingRockSpriteTemplate")) return { exact: 49 };
  // AnimThoughtBubble (battle_anim_effects_1.c:5490-5517; d = script args[4]): all four gMetronomeThroughtBubbleAnimCmds (:2026-2058) are 4 x 2 = 8 ticks. The init starts the anim (BeginAnim call 0,
  // END call 8) and installs RunStored (call 9 installs AnimThoughtBubble_Step), Step runs from call 10 and the call whose --data[0] reaches 0 (call d + 9) starts the closing anim (BeginAnim
  // in that call, END d + 17) with DestroyAnimSprite stored: call d + 18 installs it, call d + 19 destroys: gone d + 18 ticks after F.
  if (sprite("gThoughtBubbleSpriteTemplate")) { const d = intArg(args[4]); return d === null || d < 1 || d > 0x7fff ? null : { exact: d + 18 }; }
  // AnimTauntFinger (:5606-5651): the init starts a 1-frame anim and installs Step1; ++data[1] > 10 first holds in call 11, which starts the 7 x 4 = 28 tick gTauntFingerAnimCmds3 / 4 (:2144-2172,
  // BeginAnim call 11, END call 39) with Step2 stored (RunStored: call 40 installs it, call 41 runs it); Step2 destroys once ++data[1] > 5, the 6th run: call 46 = gone 45 ticks after F.
  if (sprite("gTauntFingerSpriteTemplate")) return { exact: 45 };
  // ---- aud242p slice 4. AnimSlideHandOrFootToTarget / AnimJumpKick (battle_anim_fight.c:421-443) -> AnimTravelDiagonally (battle_anim_mons.c:1591-1624; D = gBattleAnimArgs[4] = script
  // args[7]): data[0] = D and StartAnimLinearTranslation with DestroyAnimSprite stored in the init (the AnimPowerAbsorptionOrb shape): D + 1. AnimRockBlastRock (battle_anim_rock.c:800-806) ->
  // TranslateAnimSpriteToTargetMonLocation (battle_anim_mons.c:1546-1570, D = args[7]) in the init: D + 1; AnimThrowMistBall (battle_anim_ice.c:1090-1095) only installs that function, which
  // runs in call 1: D + 2. D = 0 divides by zero (declined).
  if (sprite("gKarateChopSpriteTemplate") || sprite("gJumpKickSpriteTemplate") || sprite("gRockBlastRockSpriteTemplate") || sprite("gMistBallSpriteTemplate")) {
    const d = intArg(args[7]);
    return d === null || d < 1 ? null : { exact: d + (sprite("gMistBallSpriteTemplate") ? 2 : 1) };
  }
  // AnimRevengeScratch (battle_anim_fight.c:964-982): the init installs RunStoredCallbackWhenAnimEnds (battle_anim_mons.c:735) with DestroyAnimSprite stored; sAnim_RevengeSmallScratch is
  // 3 x 4 = 12 frames (:308-314), sAnim_RevengeBigScratch 2 x 6 = 12 (:350-355): the anim ends at call 12, the stored callback is installed at 13 and destroys at 14 = 13.
  if (sprite("gRevengeSmallScratchSpriteTemplate") || sprite("gRevengeBigScratchSpriteTemplate")) return { exact: 13 };
  // ---- aud242p slice 3. AnimLeechLifeNeedle (battle_anim_bug.c:229-251) and AnimTranslateStinger (:366-398; duration D = script args[5] / args[7]): data[0] = D, the init installs
  // StartAnimLinearTranslation with DestroyAnimSprite in data[6]: the AnimPowerAbsorptionOrb shape (calls 1..D translate, D + 1 installs the stored callback, D + 2 destroys) = D + 1.
  if (op === "create_leech_life_needle_sprite" || op === "create_linear_stinger_sprite" || sprite("gLeechLifeNeedleSpriteTemplate") || sprite("gLinearStingerSpriteTemplate")) {
    const d = op.startsWith("create_") ? intNamed("duration") : intArg(args[op === "createsprite" && args[0] === "gLeechLifeNeedleSpriteTemplate" ? 5 : 7]);
    return d === null || d < 1 ? null : { exact: d + 1 };
  }
  // AnimTask_InvertScreenColor (battle_anim_normal.c:759-778) inverts the palette buffer and destroys itself in the creating step: net 0 in gAnimVisualTaskCount (exact -1).
  if (op === "invert_screen_color" || (op === "createvisualtask" && args[0] === "AnimTask_InvertScreenColor")) return { exact: -1 };

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
    case "AnimTask_IsContest": case "AnimTask_GetTargetIsAttackerPartner": case "AnimTask_IsMonInvisible": return 0;
    // aud242m: every Factory mon has friendship 0 (battle_factory.c:459, 820; the controllers leave gAnimFriendship 0, battle_anim.c:181): GetFrustrationPowerLevel
    // (battle_anim_mons.c:1993-2006, `<= 30`) and GetReturnPowerLevel (battle_anim_effects_3.c:5060-5073, `< 60`) both write 0 (the strongest Frustration / weakest Return branch).
    case "AnimTask_GetFrustrationPowerLevel": case "AnimTask_GetReturnPowerLevel": return 0;
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

// ---- aud242i: SE length bounds for `waitsound` (Cmd_waitsound, battle_anim.c:1635-1658: SE1 / SE2 still has a track -> sAnimFramesToWait = 1, no WaitAnimFrameCount, so the
// script re-polls every iteration and resumes in the first iteration after the last track's FINE). IsSEPlaying (sound.c:606-613) tests the MPlayer track bits only
// (voices in release do not count). A song's tracks end after the sum of their W waits; the m4a player advances BPM / 150 ticks per VBlank (`TEMPO, n` is n * 2 BPM). The
// bound is an UPPER bound on the frames from the play to the resume: the longest track in ticks + 1 at the slowest tempo of the song, + 3 frames (start-up tempoC phase,
// FINE tick). Songs with PATT / PEND / REPT / GOTO (patterns, loops) are unknown. The audited consumer only needs `bound <= the visual finish` (the wait is then exact).
const songPlayers = new Map<string, string>();
for (const m of readFileSync(join(REF, "sound", "song_table.inc"), "utf8").matchAll(/^\s*song\s+(\w+)\s*,\s*(MUSIC_PLAYER_\w+)/gm)) songPlayers.set(m[1]!, m[2]!);
const seBoundCache = new Map<string, { frames: number; player: string } | null>();
function seBound(token: string): { frames: number; player: string } | null {
  const name = token.trim().toLowerCase();
  if (!/^se_\w+$/.test(name)) return null;
  if (seBoundCache.has(name)) return seBoundCache.get(name)!;
  let result: { frames: number; player: string } | null = null;
  try {
    const src = readFileSync(join(REF, "sound", "songs", "midi", `${name}.s`), "utf8");
    const tbs = Number(new RegExp(`\\.equ\\s+${name}_tbs,\\s*(\\d+)`).exec(src)?.[1] ?? NaN);
    let ticks = 0;
    let minBpm = Infinity;
    let ok = Number.isFinite(tbs) && songPlayers.has(name);
    for (const track of src.split(/^@\*+ Track \d+[^\n]*\n/m).slice(1)) {
      const body = track.split("@****")[0]!;
      let t = 0;
      for (const raw of body.split("\n")) {
        const line = raw.split("@")[0]!;
        if (/\b(PATT|PEND|REPT|GOTO)\b/.test(line)) ok = false;
        if (/\.byte\s+TEMPO/.test(line)) {
          const base = new RegExp(`TEMPO\\s*,\\s*(\\d+)\\*${name}_tbs/2`).exec(line);
          if (base === null) ok = false; else minBpm = Math.min(minBpm, Number(base[1]) * tbs);
        }
        const w = /\.byte\s+W(\d+)\b/.exec(line);
        if (w !== null) t += Number(w[1]);
      }
      ticks = Math.max(ticks, t);
    }
    // A tempo command is `N * tbs / 2` (value N * tbs / 2, BPM N * tbs); the slowest one bounds the song.
    if (ok && Number.isFinite(minBpm)) result = { frames: Math.ceil(((ticks + 1) * 150) / minBpm) + 3, player: songPlayers.get(name)! };
  } catch { result = null; }
  seBoundCache.set(name, result);
  return result;
}
// A script sprite / task whose callback chain contains a PlaySE (battle_anim*.c, audio-sound-sources.json cAnimSites) can start an SE the script does not list: a waitsound
// after such a creation is left unresolved (the callback is matched by name prefix against the site functions).
const cSoundSiteFunctions: string[] = (JSON.parse(readFileSync(join(RUN_ROOT, "tests", "fixtures", "data", "audio-sound-sources.json"), "utf8")) as { cAnimSites: { rows: Array<{ fn: string }> } }).cAnimSites.rows
  .map((r) => r.fn).filter((fn) => !fn.startsWith("Cmd_"));
const templateCallbacks = new Map<string, string>();
for (const file of readdirSync(join(REF, "src"))) {
  if (!/^battle_anim.*\.c$/.test(file)) continue;
  for (const m of readFileSync(join(REF, "src", file), "utf8").matchAll(/const struct SpriteTemplate (\w+)\s*=\s*\{[^}]*?\.callback = (\w+)/g)) templateCallbacks.set(m[1]!, m[2]!);
}
function creationMayPlaySound(cmd: Command): boolean {
  const { op, args } = cmd;
  const name = op === "createsprite" ? templateCallbacks.get(args[0] ?? "") : op === "createvisualtask" ? args[0] : op;
  if (name === undefined) return true;
  return cSoundSiteFunctions.some((fn) => fn.startsWith(name) || name.startsWith(fn));
}

const blockers: Record<string, number> = {};
const blockersByLabel = new Map<string, Set<string>>();
// ANIM_SOUND_WHATIF=file: continue past every unmodelled lifetime as if it were gone at once and write every distinct blocker per body (ranking aid, no table effect).
const whatIf = process.env.ANIM_SOUND_WHATIF !== undefined;
const allBlockers = new Map<string, Set<string>>();
const noteAll = (label: string, what: string): void => { const set = allBlockers.get(label) ?? new Set<string>(); set.add(what); allBlockers.set(label, set); };
// Per-species GetBattlerSpriteFinal_Y(..., TRUE) for the two sides (battle_anim_mons.c:112-170 player: back yOffset + 80 + 8, 172-292 opponent: front yOffset - elevation + 40; both clamped
// to 104); data/gen/mon-pic-coords.json + enemy-mon-elevations.json. picYs[side] = the sorted distinct values a battler on that side can have.
const picCoords = JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "mon-pic-coords.json"), "utf8")) as { back: Record<string, { yOffset: number }>; front: Record<string, { yOffset: number }> };
const elevations = JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "enemy-mon-elevations.json"), "utf8")) as Record<string, number>;
const picYs: number[][] = [
  [...new Set(Object.values(picCoords.back).map((c) => Math.min(c.yOffset + 80 + 8, 104)))].sort((a, b) => a - b),
  [...new Set(Object.entries(picCoords.front).map(([name, c]) => Math.min(c.yOffset - (elevations[name] ?? 0) + 40, 104)))].sort((a, b) => a - b),
];
const middle = (values: number[]): number => values[Math.floor(values.length / 2)]!;
/** The walk's default class (and the runtime fallback): the middle value of each side's pic Y. */
const referencePic = (attackerSide: number): PicContext => ({ attackerY: middle(picYs[attackerSide]!), targetY: middle(picYs[1 - attackerSide]!) });
function walk(bodyLabel: string, turn: number, attackerSide: number, pic: PicContext = referencePic(attackerSide), rolloutCounter = 1): Walk {
  const events: SoundOp[] = [];
  const reasons: Record<string, number> = {};
  const stack: Array<[string, number]> = [];
  let frame: number | null = 0;
  let why: Reason | null = null;
  let gated = 0;
  let pending: Array<{ at: number; life: Lifetime; name: string }> = [];
  let ret: number | null = null;
  let fade: number | null = null;
  // gPaletteFade is one shared object: a BeginNormalPaletteFade while another normal / hardware fade is active returns FALSE (palette.c:156-163), so a color cycle that
  // overlaps another fade is left unmodelled. `fadeBusy` = the last iteration a normal fade (simple_palette_blend / color cycle) of this walk may be active.
  let fadeBusy = -1;
  let fadeChain = false;
  // aud242i: `waitsound` keeps the script frame unknown within [frame, soundWait] (soundWait = the upper bound of the last SE's end, seBound); only a following
  // waitforvisualfinish whose exact finish is at or after it makes the frame exact again. seUnknown: an SE the table cannot bound (panse / sound task / unknown song) or a
  // creation whose callback can play one; no waitsound resolves after it.
  let soundWait: number | null = null;
  let monBgActive = false;
  let seEnd = -1;
  let seUnknown = false;
  // aud242o: the last SoundTask_AdjustPanningVar of this walk (its creation iteration and arguments as written): the Confuse Ray ball reads its gAnimCustomPanning.
  let panVarTask: { at: number; args: number[] } | null = null;
  const TIMED = new Set(["delay", "loadspritegfx", "monbg", "fadetobg", "fadetobgfromset", "restorebg", "changebg", "waitbgfadeout", "waitbgfadein", "waitsound", "playsewithpan", "playse", "waitplaysewithpan", "loopsewithpan", "panse", "panse_adjustnone", "panse_adjustall", "setpan", "createsoundtask"]);
  // Wall-clock frames the ROM spends in a VBlank-overrun lag (no main-loop iteration): ops at iteration > `after` play `frames` later.
  const lags: Array<{ after: number; frames: number }> = [];  // `after`: first affected iteration - 1 (fractional .5 = from the same iteration)
  const shiftAt = (iteration: number): number => lags.reduce((n, l) => (iteration > l.after ? n + l.frames : n), 0);
  picUsed = false;
  counterUsed = false;
  const finish = (end: string): Walk => ({ events, end, frame, gated, reasons, usedPic: picUsed, usedCounter: counterUsed });
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
    if (soundWait !== null && (TIMED.has(op) || isCreation(op))) { soundWait = null; unresolved("waitsound"); pending = []; }
    if (isCreation(op)) {
      if (creationMayPlaySound(cmd)) seUnknown = true;
      // AnimTask_MetallicShine decompresses its tilemap and image and loads a palette in the creating step (battle_anim_dark.c:866-870): a measured
      // VBlank overrun (METALLIC_SHINE_LOAD_LAG; Metal Claw and Steel Wing, aud242d), like BG_LOAD_LAG.
      if ((op === "metallic_shine" || (op === "createvisualtask" && args[0] === "AnimTask_MetallicShine")) && frame !== null) lags.push({ after: frame, frames: METALLIC_SHINE_LOAD_LAG });
      if (op === "createvisualtask" && args[0] === "AnimTask_ScaryFace" && frame !== null) lags.push({ after: frame, frames: SCARY_FACE_LOAD_LAG });
      let life = lifetimeOf(cmd, attackerSide, pic, rolloutCounter);
      const colorCycle = op === "blend_color_cycle" || op === "blend_color_cycleexclude" || op === "blend_color_cyclebytag" || (op === "createvisualtask" && /^AnimTask_BlendColorCycle/.test(args[0] ?? ""));
      if (frame !== null && life !== null && "exact" in life && (colorCycle || op === "simple_palette_blend" || (op === "createsprite" && args[0] === "gSimplePaletteBlendSpriteTemplate"))) {
        const cycleBlends = colorCycle ? cycleNumBlends(cmd) : null;
        if (colorCycle && fade !== null && frame < fade + FADE_IN_DONE) life = null;
        else if (colorCycle && frame <= fadeBusy) {
          // aud242n: a one-blend cycle created while a one-fade chain is active is refused (palette.c:156-163): tNumBlends goes to 0 without a fade (battle_anim_normal.c:464-466),
          // and AnimTask_BlendColorCycleLoop destroys it in the RunTasks of the iteration the running fade clears `active` (fadeBusy), starting nothing. A refused cycle
          // does not extend the busy window. A multi-blend cycle in the window can start the next fade in that same RunTasks, so those stay unmodelled.
          life = cycleBlends === 1 && !fadeChain ? { exact: fadeBusy - frame } : null;
        } else {
          fadeBusy = Math.max(fadeBusy, frame + life.exact);
          fadeChain = cycleBlends !== null && cycleBlends > 1;
        }
      }
      if (frame !== null) pending.push({ at: frame, life, name: op === "createsprite" || op === "createvisualtask" ? args[0] ?? op : op });
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
      case "loadspritegfx": if (frame !== null) frame += 3; break;
      case "monbg": if (frame !== null) frame += 3; monBgActive = true; break;
      // Cmd_clearmonbg (battle_anim.c:852-883) creates Task_ClearMonBg (priority 5): its first run only counts, the second (the iteration after the script step) calls
      // ResetBattleAnimBg / ClearBattleAnimBg and overruns VBlank: the stepped ROM shows ResetBattleAnimBg in iteration C + 1 and the task's DestroyTask 2 frames later, and the
      // script's following `delay` ticks resume 2 frames late (Faint Attack, both clearmonbg, tools/audio/fixtures/aud242i-faint-*.json). Only while a monbg is active.
      case "clearmonbg": if (frame !== null && monBgActive) lags.push({ after: frame + 1, frames: 2 }); monBgActive = false; break;
      case "waitforvisualfinish": {
        if (frame === null) break;
        if (pending.length === 0) {
          if (soundWait !== null) { if (frame >= soundWait) soundWait = null; else unresolved("waitsound"); }
          break;
        }
        const exact = pending.filter((p) => p.life !== null && "exact" in p.life).map((p) => p.at + (p.life as { exact: number }).exact);
        const bounds = pending.filter((p) => p.life !== null && "bound" in p.life).map((p) => p.at + (p.life as { bound: number }).bound);
        if (whatIf && pending.some((p) => p.life === null)) {
          for (const p of pending) if (p.life === null) noteAll(bodyLabel, p.name);
          pending = pending.map((p) => (p.life === null ? { ...p, life: { exact: 0 } } : p));
        }
        if (pending.some((p) => p.life === null)) {
          if (why === null) for (const p of pending) if (p.life === null) {
            if (turn === 0 && attackerSide === 0) blockers[p.name] = (blockers[p.name] ?? 0) + 1;
            const set = blockersByLabel.get(bodyLabel) ?? new Set<string>(); set.add(`${p.name}@${p.at}`); blockersByLabel.set(bodyLabel, set);
          }
          unresolved("unmodelled-lifetime"); pending = []; break;
        }
        const gone = exact.length === 0 ? -1 : Math.max(...exact);
        if (bounds.some((b) => b > gone)) { unresolved("unmodelled-lifetime"); pending = []; break; }
        if (soundWait !== null) {
          // The script resumes at max(S, gone + 1) with S in [frame, soundWait]: exact only when the frame it is known to reach is already past the SE bound.
          if (Math.max(frame, gone + 1) < soundWait) { unresolved("waitsound"); pending = []; soundWait = null; break; }
          soundWait = null;
        }
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
      case "waitsound":
        if (whatIf) { noteAll(bodyLabel, "!waitsound"); pending = []; break; }
        if (frame === null) break;
        if (seUnknown) { unresolved("waitsound"); pending = []; break; }
        soundWait = seEnd;
        break;
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
        {
          const bound = seBound(args[0]!);
          const last = op === "loopsewithpan" ? at + Math.max(value(args[3]!) - 1, 0) * (value(args[2]!) + 1) : at;
          if (bound === null) seUnknown = true; else seEnd = Math.max(seEnd, last + bound.frames);
        }
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
        seUnknown = true;
        events.push({ op, frame: frame + shiftAt(frame), id: value(args[0]!), pan: value(args[1]!), target: value(args[2]!), inc: value(args[3]!), wait: value(args[4]!), line });
        break;
      // Cmd_createsoundtask: CreateTask(func, 1), func(taskId) at once, gAnimSoundTaskCount++ (it gates only Cmd_end / Cmd_waitsound). Only the two
      // script-referenced tasks of battle_anim_sound_tasks.c are createsoundtask sites; the PlaySE1/2WithPanning / cry tasks are createvisualtask.
      case "createsoundtask": {
        const task = args[0];
        if (task !== "SoundTask_LoopSEAdjustPanning" && task !== "SoundTask_FireBlast") break;
        if (frame === null) { gate(); break; }
        seUnknown = true;
        const at = frame + shiftAt(frame);
        if (task === "SoundTask_FireBlast") events.push({ op: "soundtask_fireblast", frame: at, id: value(args[1]!), id2: value(args[2]!), pan: null, line });
        else events.push({ op: "soundtask_loopse", frame: at, id: value(args[1]!), pan: value(args[2]!), target: value(args[3]!), inc: value(args[4]!), times: value(args[5]!), step: value(args[6]!), gap: value(args[7]!), line });
        break;
      }
      // Cmd_createvisualtask runs the task function at once; the PlaySE1/2WithPanning tasks play with BattleAnimAdjustPanning(arg 1) in that step.
      case "createvisualtask": {
        if (args[0] === "SoundTask_AdjustPanningVar") {
          const a = [2, 3, 4, 5].map((i) => intArg(args[i]));
          panVarTask = frame === null || a.some((v) => v === null) ? null : { at: frame, args: a as number[] };
          break;
        }
        if (args[0] === "AnimTask_Rollout") {
          if (frame === null) { gate(); break; }
          events.push({ op: "task_rollout", frame: frame + shiftAt(frame), id: value("SE_M_HEADBUTT"), id2: value("SE_M_DIG"), pan: -64, target: 63, times: rolloutShape(rolloutCounter).length, line });
          break;
        }
        if (args[0] !== "SoundTask_PlaySE1WithPanning" && args[0] !== "SoundTask_PlaySE2WithPanning") break;
        if (frame === null) { gate(); break; }
        seUnknown = true;
        events.push({ op: args[0] === "SoundTask_PlaySE1WithPanning" ? "soundtask_se1" : "soundtask_se2", frame: frame + shiftAt(frame), id: value(args[2]!), pan: value(args[3]!), line });
        break;
      }
      // aud242o: AnimConfuseRayBallBounce plays SE_M_CONFUSE_RAY itself (battle_anim_ghost.c:220-311): Step1 with PlaySE12WithPanning(gAnimCustomPanning), Step2 with PlaySE. The
      // runtime needs the creating pan task to share the sprite's iteration (the pan is read call by call), else the rows stay unmodelled.
      case "createsprite": {
        // aud242p: gClappingHandSpriteTemplate with side arg 0 plays SE_M_ENCORE (PlaySE1WithPanning, BattleAnimAdjustPanning(SOUND_PAN_ATTACKER), :1638-1650) each time x2 crosses 0:
        // calls 6, 18, ... 12N - 6 of its step (offsets call - 1). gClappingHand2 (data[3] = 255) and the side-1 hand are silent.
        if (args[0] === "gClappingHandSpriteTemplate" && frame !== null && intArg(args[5]) === 0) {
          const n = intArg(args[7]);
          if (n !== null) for (let k = 0; k < n; k += 1) events.push({ op: "soundtask_se1", frame: frame + shiftAt(frame) + 5 + 12 * k, id: value("SE_M_ENCORE"), pan: value("SOUND_PAN_ATTACKER"), line });
          break;
        }
        if (args[0] !== "gConfuseRayBallBounceSpriteTemplate" || frame === null) break;
        const [offset, speed] = [intArg(args[3]), intArg(args[5])];
        const ball = offset === null || speed === null || speed < 1 ? null : confuseRayBallBounceLength(attackerSide, offset, speed);
        if (ball === null || panVarTask === null || panVarTask.at !== frame) break;
        const [pan, target, inc, wait] = panVarTask.args as [number, number, number, number];
        events.push({ op: "sprite_confuseray_ball", frame: frame + shiftAt(frame), id: value("SE_M_CONFUSE_RAY"), pan, target, inc, wait, times: ball.duration, gap: ball.n, line });
        break;
      }
      case "setpan":
        if (frame === null) { gate(); break; }
        seUnknown = true;
        events.push({ op, frame: frame + shiftAt(frame), id: null, pan: value(args[0]!), line });
        break;
      default: break;
    }
  }
  return finish("limit");
}

const TURNS = 6;
const SIDES = 2;
const moves: Array<{ move: number; label: string; variants: number[]; ends: string[]; gated: number[]; reasons: Array<Record<string, number>>; pic: number[] }> = [];
const variantPool: SoundOp[][] = [];
const poolIndex = new Map<string, number>();
const stripLines = (events: SoundOp[]): SoundOp[] => events.map(({ line: _line, ...rest }) => rest as SoundOp);
const poolOf = (events: SoundOp[]): number => {
  const ops = stripLines(events);
  const key = JSON.stringify(ops);
  if (!poolIndex.has(key)) { poolIndex.set(key, variantPool.length); variantPool.push(ops); }
  return poolIndex.get(key)!;
};
// aud242l: a (turn, side) walk whose lifetimes depend on the two battlers' pic Y is repeated for every (attackerY, targetY) class; the grid of pooled variant indices (row = attacker
// class, column = target class, both in picYs order) goes to picGrids and the move's `pic` slot points at it (-1 = pic-independent). An all-equal grid collapses to the plain variant.
const picGrids: number[][] = [];
// aud242o: a walk that reads the Rollout counter is repeated for counters 1..5; the move's `counter` slot points at the 5 variant indexes in counterGrids (-1 = counter-independent).
const counterGrids: number[][] = [];
const counterIndex = new Map<string, number>();
const gridIndex = new Map<string, number>();
moveTable.forEach((label, move) => {
  const entry = { move, label, variants: [] as number[], ends: [] as string[], gated: [] as number[], reasons: [] as Array<Record<string, number>>, pic: [] as number[], counter: [] as number[] };
  for (let turn = 0; turn < TURNS; turn += 1) {
    for (let side = 0; side < SIDES; side += 1) {
      const result = walk(label, turn, side);
      let grid = -1;
      if (result.usedPic) {
        const cells: number[] = [];
        for (const attackerY of picYs[side]!) for (const targetY of picYs[1 - side]!) cells.push(poolOf(walk(label, turn, side, { attackerY, targetY }).events));
        if (cells.some((c) => c !== cells[0])) {
          const key = JSON.stringify(cells);
          if (!gridIndex.has(key)) { gridIndex.set(key, picGrids.length); picGrids.push(cells); }
          grid = gridIndex.get(key)!;
        }
      }
      let counterGrid = -1;
      if (result.usedCounter) {
        const cells = [1, 2, 3, 4, 5].map((counter) => poolOf(walk(label, turn, side, referencePic(side), counter).events));
        if (cells.some((c) => c !== cells[0])) {
          const key = JSON.stringify(cells);
          if (!counterIndex.has(key)) { counterIndex.set(key, counterGrids.length); counterGrids.push(cells); }
          counterGrid = counterIndex.get(key)!;
        }
      }
      entry.counter.push(counterGrid);
      entry.variants.push(poolOf(result.events));
      entry.ends.push(result.end);
      entry.gated.push(result.gated);
      entry.reasons.push(result.reasons);
      entry.pic.push(grid);
    }
  }
  moves.push(entry);
});

// aud249: the general animations (gBattleAnims_StatusConditions + gBattleAnims_General) walk the same way; turn 0, one variant per attacker side.
const generalTables = ["gBattleAnims_StatusConditions", "gBattleAnims_General"];
const generalLabels: string[] = [];
{
  const lines = scriptText.split("\n");
  let table = false;
  for (const raw of lines) {
    const code = raw.replace(/@.*$/, "").trimEnd();
    const label = /^([A-Za-z_]\w*)::?$/.exec(code);
    if (label !== null) { table = generalTables.includes(label[1]!); continue; }
    const word = /^\s+\.4byte\s+(\w+)/.exec(code);
    if (table && word !== null) generalLabels.push(word[1]!);
  }
}
const general = generalLabels.map((label) => {
  const variants = [0, 1].map((side) => {
    const result = walk(label, 0, side);
    const ops = result.events.map(({ line: _line, ...rest }) => rest);
    const key = JSON.stringify(ops);
    if (!poolIndex.has(key)) { poolIndex.set(key, variantPool.length); variantPool.push(ops as SoundOp[]); }
    return { index: poolIndex.get(key)!, end: result.end, gated: result.gated };
  });
  return { label, variants: variants.map((v) => v.index), ends: variants.map((v) => v.end), gated: variants.map((v) => v.gated) };
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
  picYs,
  picGrids,
  counterGrids,
  moves: moves.map((m) => ({ move: m.move, label: m.label, variants: m.variants, ends: m.ends, gated: m.gated, ...(m.pic.some((g) => g >= 0) ? { pic: m.pic } : {}), ...(m.counter.some((g) => g >= 0) ? { counter: m.counter } : {}) })),
  general,
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
  if (whatIf) writeFileSync(process.env.ANIM_SOUND_WHATIF!, JSON.stringify(Object.fromEntries([...allBlockers].map(([k, v]) => [k, [...v]]))));
  if (process.env.ANIM_SOUND_BLOCKERS_BY_MOVE) writeFileSync(process.env.ANIM_SOUND_BLOCKERS_BY_MOVE, JSON.stringify(Object.fromEntries([...blockersByLabel].map(([k, v]) => [k, [...v]]))));
  console.log(`turn 0 / player attacker: ${emitted} resolved ops, ${gatedTotal} unresolved ops by reason ${JSON.stringify(tally)}`);
}
console.log(`general: ${general.map((g) => `${g.label}:${g.variants[0]}/${g.ends[0]}/${g.gated[0]}`).join(" ")}`);
console.log(`anim-sound-timing: ${moves.length} moves, ${variantPool.length} distinct variants, ${variantPool.reduce((n, v) => n + v.length, 0)} ops`);
