// fsn1 (docs/fsn1-first-use-sounds.md): derives src/assets/gen/battle-sounds.json, the SEs a battle can start, for the audio player's battle
// prefetch (src/audio/battleSoundNeeds.ts names the parties, the player turns the table into files). Source of truth: the table the engine
// plays move-animation sounds from (src/data/gen/anim-sound-timing.json, extracted from data/battle_anim_scripts.s), resolved to start pans by
// the engine's own moveAnimOpRows / BattleAnimAdjustPanning, plus the emitters' constants for the sounds every battle can play.
//   - moves: per move id and attacker side, every SE start of every variant the entry can select (all turn / side slots and every grid:
//     Rollout counter, Seismic Toss damage, healing flag, elevation, top Y, pic Y x HP quarter), against a target on either side; plus the
//     General_* bodies the move leads to (MOVE_GENERALS: trap turns, weather turns, Leech Seed drain, ...), both sides.
//   - cryTasks: Roar / Howl / Hyper Voice play the attacker's cry in these modes (moveAnimSounds.ts cryTaskRows).
//   - abilities: the General_* bodies an ability leads to (weather each turn, Castform's change).
//   - common / commonSceneOn: hits, faint, low HP, ball, stat change (both scenes); status conditions, held item, Focus Band (Scene ON).
// tests/fsn1FirstUseSounds.test.ts fails when the committed table is stale or a Factory move's engine sounds are not listed.
//   node --experimental-strip-types --no-warnings tools/bundle/battleSoundTable.ts [--write | --check]
import { readFileSync, writeFileSync } from "node:fs";
import { moveAnimOpRows, timing, type TimedOp } from "../../src/engine/animSoundOps.ts";
import { animSoundPan2, type AnimBattleSide, type AnimPanContext } from "../../src/audio/soundEvents.ts";
import { HELD_ITEM_EFFECT_LATER_SE_OPS, SE_M_STAT_DECREASE, SE_M_STAT_INCREASE } from "../../src/engine/moveAnimSounds.ts";
import { SE_BALL_OPEN, SE_EFFECTIVE, SE_FAINT, SE_LOW_HEALTH, SE_NOT_EFFECTIVE, SE_PAN_OPPONENT, SE_PAN_PLAYER, SE_SUPER_EFFECTIVE, SE_BALL_TRAY_BALL, SE_BALL_TRAY_ENTER, SE_BALL_TRAY_EXIT } from "../../src/engine/screenSounds.ts";
import { TURN_TRAP_SCRIPT_LABEL, turnTrapBranchOf } from "../../src/engine/turnTrapBranch.ts";
import type { BattleSe, BattleSesBySide, BattleSoundTable } from "../../src/audio/battleSoundNeeds.ts";

export const BATTLE_SOUND_TABLE_PATH = "src/assets/gen/battle-sounds.json";

const SIDES: readonly AnimBattleSide[] = ["player", "opponent"];
const other = (side: AnimBattleSide): AnimBattleSide => (side === "player" ? "opponent" : "player");

/** moveAnimSounds.ts cryTaskRows: MOVE_ROAR (SoundTask_PlayDoubleCry), MOVE_HOWL (SoundTask_PlayCryHighPitch), MOVE_HYPER_VOICE (SoundTask_PlayCryWithEcho). */
const CRY_TASKS: Readonly<Record<number, readonly string[]>> = { 46: ["ROAR_1", "ROAR_2"], 336: ["HIGH_PITCH"], 304: ["ECHO_START", "ECHO_END"] };
/** moveAnimSounds.ts SCRIPT_START_CLOCK_MOVE_IDS / emitMoveAnimSounds: Transform and Substitute animate under HITMARKER_NO_ANIMATIONS (battle_script_commands.c:1748). */
const BOTH_SCENES_MOVES: readonly number[] = [144, 164];

/** The General_* bodies a move leads to after its own animation (emitGeneralAnimSounds; data/battle_scripts_1.s). */
const MOVE_GENERALS: Readonly<Record<number, readonly string[]>> = {
  // General_TurnTrap's branch per wrapped move (turnTrapBranch.ts): Bind, Wrap, Fire Spin, Clamp, Whirlpool, Sand Tomb.
  ...Object.fromEntries([20, 35, 83, 128, 250, 328].map((move) => [move, [TURN_TRAP_SCRIPT_LABEL[turnTrapBranchOf(move)]]])),
  240: ["General_Rain"], 241: ["General_Sun"], 201: ["General_Sandstorm"], 258: ["General_Hail"],
  73: ["General_LeechSeedDrain"], 264: ["General_FocusPunchSetUp"], 275: ["General_IngrainHeal"], 273: ["General_WishHeal"],
  248: ["General_FutureSightHit"], 353: ["General_DoomDesireHit"], 174: ["Status_Curse"], 171: ["Status_Nightmare"],
  164: ["General_SubstituteFade", "General_SubstituteAppear"], 282: ["General_ItemKnockoff"], 168: ["General_ItemSteal"], 343: ["General_ItemSteal"],
  289: ["General_SnatchMove"],
};
/** include/constants/abilities.h: ABILITY_DRIZZLE 2, ABILITY_SAND_STREAM 45, ABILITY_DROUGHT 70 (the weather each turn), ABILITY_FORECAST 59. */
const ABILITY_GENERALS: Readonly<Record<number, readonly string[]>> = { 2: ["General_Rain"], 45: ["General_Sandstorm"], 70: ["General_Sun"], 59: ["General_CastformChange"] };
/** Scene ON bodies any battle can show: the status conditions (Cmd_statusanimation), a held item's activation (berries, Leftovers, herbs) and Focus Band. */
const COMMON_SCENE_ON_GENERALS: readonly string[] = [
  "Status_Poison", "Status_Confusion", "Status_Burn", "Status_Infatuation", "Status_Sleep", "Status_Paralysis", "Status_Freeze", "General_HeldItemEffect", "General_FocusBand",
];

const seKey = (se: BattleSe): string => `${se[0]}:${se[1] ?? "none"}`;
function sorted(set: Map<string, BattleSe>): BattleSe[] {
  return [...set.values()].sort((a, b) => a[0] - b[0] || (a[1] ?? -999) - (b[1] ?? -999));
}

/** The SE starts `ops` make under `context` (pan events and the stop rows are not starts). */
function opSes(ops: readonly TimedOp[], context: AnimPanContext, uniformLoop: boolean, out: Map<string, BattleSe>): void {
  for (const op of ops) {
    for (const row of moveAnimOpRows(op, context, uniformLoop)) {
      const { kind, id, pan } = row.emission;
      if (kind !== "se" || id === null || id === undefined) continue;
      const se: BattleSe = [id, pan ?? null];
      out.set(seKey(se), se);
    }
  }
}

/** Every variant index a move entry's (turn, side) slot can select: the default and every cell of each grid the slot points at. */
function slotVariants(move: number, slot: number): Set<number> {
  const entry = timing.moves[move]!;
  const found = new Set<number>([entry.variants[slot]!]);
  const grids: readonly [readonly number[] | undefined, readonly (readonly number[])[]][] = [
    [entry.counter, timing.counterGrids], [entry.damage, timing.damageGrids], [entry.flag, timing.flagGrids],
    [entry.elevation, timing.elevationGrids], [entry.top, timing.topGrids], [entry.pic, timing.picGrids],
  ];
  for (const [index, list] of grids) if (index !== undefined && index[slot]! >= 0) for (const variant of list[index[slot]!]!) found.add(variant);
  return found;
}

function generalOps(label: string, side: 0 | 1): readonly TimedOp[] {
  const entry = timing.general.find((general) => general.label === label);
  if (entry === undefined) throw new Error(`anim-sound-timing.json has no general entry ${label}`);
  const ops = timing.variants[entry.variants[side]!]!;
  return label === "General_HeldItemEffect" ? [...ops, ...HELD_ITEM_EFFECT_LATER_SE_OPS] : ops;
}

/** A General_* body's SE starts for the battler on `side`, with the context emitGeneralAnimSounds gives it. */
function generalSes(label: string, side: AnimBattleSide, out: Map<string, BattleSe>): void {
  const index = side === "player" ? 0 : 1;
  if (label.startsWith("Status_") && !(label in TURN_TRAP_LABELS)) {
    // Cmd_statusanimation: statusAnimActive, the battler is attacker and target (BattleAnimAdjustPanning :1265-1271).
    opSes(generalOps(label, index), { attackerSide: side, targetSide: side, statusAnimActive: true }, true, out);
  } else if (label in TURN_TRAP_LABELS || label === "General_IngrainHeal") {
    opSes(generalOps(label, index), { attackerSide: side, targetSide: side }, true, out);
  } else if (label === "General_LeechSeedDrain") {
    // The seeder is the attacker, the seeded battler (`side`) the target.
    opSes(generalOps(label, index === 0 ? 1 : 0), { attackerSide: other(side), targetSide: side }, true, out);
  } else {
    opSes(generalOps(label, index), { attackerSide: side, targetSide: other(side) }, true, out);
  }
}
const TURN_TRAP_LABELS: Readonly<Record<string, true>> = Object.fromEntries(Object.values(TURN_TRAP_SCRIPT_LABEL).map((label) => [label, true]));

/** Both sides' starts of `labels`, for a move or ability whose follow-up body can play on either battler. */
function generalsBothSides(labels: readonly string[], out: Map<string, BattleSe>): void {
  for (const label of labels) for (const side of SIDES) generalSes(label, side, out);
}

/**
 * The animation target sides a move can have in singles (the kernel's gBattlerTarget at attackanimation, battle_main.c GetMoveTarget): the
 * user for MOVE_TARGET_USER, the foe for every other target class. (A Magic Coat bounce or a Snatch swaps the attacker: such a move then plays
 * the other side's pans, which the late-start rule covers.)
 */
export function moveTargetSides(move: number, attacker: AnimBattleSide): readonly AnimBattleSide[] {
  return MOVE_TARGETS.get(move)?.includes("MOVE_TARGET_USER") === true ? [other(attacker), attacker] : [other(attacker)];
}
const MOVE_TARGETS = new Map(
  (JSON.parse(readFileSync(new URL("../../src/data/gen/moves.json", import.meta.url), "utf8")) as { moves: { id: number; target: string[] }[] }).moves.map((move) => [move.id, move.target]),
);

export function buildBattleSoundTable(): BattleSoundTable {
  const moves: Record<string, BattleSesBySide> = {};
  // The real moves (src/data/gen/moves.json; the timing table's last row is the Move_COUNT sentinel).
  for (const move of [...MOVE_TARGETS.keys()].filter((id) => id > 0).sort((a, b) => a - b)) {
    const entry = timing.moves[move];
    if (entry === undefined || entry === null) continue;
    const bySide: Map<string, BattleSe>[] = [new Map(), new Map()];
    for (let slot = 0; slot < entry.variants.length; slot += 1) {
      const side = SIDES[slot % timing.sides]!;
      for (const variant of slotVariants(move, slot)) {
        for (const target of moveTargetSides(move, side)) opSes(timing.variants[variant]!, { attackerSide: side, targetSide: target }, false, bySide[slot % timing.sides]!);
      }
    }
    const follow = MOVE_GENERALS[move];
    if (follow !== undefined) for (const set of bySide) generalsBothSides(follow, set);
    const pair: BattleSesBySide = [sorted(bySide[0]!), sorted(bySide[1]!)];
    if (pair[0].length > 0 || pair[1].length > 0) moves[String(move)] = pair;
  }
  for (const move of Object.keys(MOVE_GENERALS)) if (moves[move] === undefined) throw new Error(`MOVE_GENERALS names move ${move} with no table entry`);
  const abilities: Record<string, BattleSesBySide> = {};
  for (const [ability, labels] of Object.entries(ABILITY_GENERALS)) {
    const set = new Map<string, BattleSe>();
    generalsBothSides(labels, set);
    abilities[ability] = [sorted(set), sorted(set)];
  }
  const common = new Map<string, BattleSe>();
  const add = (se: BattleSe): void => void common.set(seKey(se), se);
  // Cmd_effectivenesssound / dofaintanimation: PlaySE12WithPanning(se, player side ? -64 : +63) (screenSounds.ts).
  for (const id of [SE_NOT_EFFECTIVE, SE_EFFECTIVE, SE_SUPER_EFFECTIVE, SE_FAINT]) for (const pan of [SE_PAN_PLAYER, SE_PAN_OPPONENT]) add([id, pan]);
  add([SE_LOW_HEALTH, null]);
  // The send-out ball and the battle-start / mid-battle ball tray (battleStartSounds.ts, midBattleOpponentPartySummary.ts).
  add([SE_BALL_OPEN, null]);
  add([SE_BALL_TRAY_ENTER, 0]);
  for (const id of [SE_BALL_TRAY_BALL, SE_BALL_TRAY_EXIT]) for (const pan of [-64, 63]) add([id, pan]);
  // General_StatsChange (both scenes): BattleAnimAdjustPanning2(SOUND_PAN_ATTACKER) for the animated battler (moveAnimSounds.ts emitStatsChangeSounds).
  for (const id of [SE_M_STAT_INCREASE, SE_M_STAT_DECREASE]) for (const side of SIDES) add([id, animSoundPan2(-64, { attackerSide: side, targetSide: other(side) })]);
  const sceneOn = new Map<string, BattleSe>();
  for (const label of COMMON_SCENE_ON_GENERALS) for (const side of SIDES) generalSes(label, side, sceneOn);
  for (const key of common.keys()) sceneOn.delete(key);
  return {
    schema: "fsn1-battle-sounds-v1",
    moves,
    bothScenes: BOTH_SCENES_MOVES,
    cryTasks: Object.fromEntries(Object.entries(CRY_TASKS).map(([move, modes]) => [move, modes])),
    abilities,
    common: sorted(common),
    commonSceneOn: sorted(sceneOn),
  };
}

/** The committed file's text for `table` (one move per line, so a diff reads per move). */
export function battleSoundTableText(table: BattleSoundTable): string {
  const lines = Object.entries(table.moves).map(([move, pair]) => `    ${JSON.stringify(move)}: ${JSON.stringify(pair)}`);
  return [
    "{",
    `  "schema": ${JSON.stringify(table.schema)},`,
    `  "generatedBy": "tools/bundle/battleSoundTable.ts (from src/data/gen/anim-sound-timing.json and the sound emitters' constants)",`,
    `  "moves": {\n${lines.join(",\n")}\n  },`,
    `  "bothScenes": ${JSON.stringify(table.bothScenes)},`,
    `  "cryTasks": ${JSON.stringify(table.cryTasks)},`,
    `  "abilities": ${JSON.stringify(table.abilities)},`,
    `  "common": ${JSON.stringify(table.common)},`,
    `  "commonSceneOn": ${JSON.stringify(table.commonSceneOn)}`,
    "}",
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = battleSoundTableText(buildBattleSoundTable());
  if (process.argv.includes("--write")) {
    writeFileSync(BATTLE_SOUND_TABLE_PATH, text);
    console.log(`wrote ${BATTLE_SOUND_TABLE_PATH} (${text.length} B)`);
  } else if (process.argv.includes("--check")) {
    const stale = readFileSync(BATTLE_SOUND_TABLE_PATH, "utf8") !== text;
    console.log(stale ? `${BATTLE_SOUND_TABLE_PATH} is stale: run with --write` : `${BATTLE_SOUND_TABLE_PATH} is current`);
    process.exitCode = stale ? 1 : 0;
  } else {
    const table = JSON.parse(text) as BattleSoundTable;
    const count = (pair: BattleSesBySide): number => pair[0].length + pair[1].length;
    console.log(`${Object.keys(table.moves).length} moves, ${Object.values(table.moves).reduce((n, pair) => n + count(pair), 0)} side SEs; common ${table.common.length}, scene ON ${table.commonSceneOn.length}; ${text.length} B`);
  }
}
