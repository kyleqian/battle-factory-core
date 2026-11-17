// aud243a: the resolved move-animation SE rows of the aud242 table for the (move, turn, attacker, target) keys of a census arm, for soundCensusDelta.py --t1.
//   node --experimental-strip-types --no-warnings tools/integration/soundCensusExpected.ts <keys.json: [[move, turn, attacker, target, pic, rolloutCounter]...]> <out.json>
// Out: { "move,turn,attacker,target": { rows: [[offset from script frame 0, kind, id, pan, task 0|1]...], gated, ends } | null } using the table's own variant walk (moveAnimOpRows
// with the request's attacker / target sides), independently of the age clock emitMoveAnimSounds runs on. Frame of a row = (frame of body age 0) + 8 + offset (1 + 7, moveAnimSounds.ts).
import { readFileSync, writeFileSync } from "node:fs";
import timing from "../../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { moveAnimOpRows, STATUS_ANIMATION_SCRIPT_AGE, type TimedOp } from "../../src/engine/moveAnimSounds.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { animSoundPan2 } from "../../src/audio/soundEvents.ts";

// t1dt: battleHitSounds.ts keeps Double Team's stat-SE constants module-private (src/ is out of scope for tooling steps), so they are read from its source text, not copied; a rename fails loudly.
const hitSoundsSource = readFileSync(new URL("../../src/engine/battleHitSounds.ts", import.meta.url), "utf8");
const hitSoundsConst = (name: string): number => {
  const match = new RegExp(`^const ${name} = (\\d+);`, "m").exec(hitSoundsSource);
  if (match === null) throw new Error(`soundCensusExpected: battleHitSounds.ts no longer declares const ${name}`);
  return Number(match[1]);
};
const MOVE_DOUBLE_TEAM = hitSoundsConst("MOVE_DOUBLE_TEAM"), DOUBLE_TEAM_STAT_SE_SCRIPT_ROW = hitSoundsConst("DOUBLE_TEAM_STAT_SE_SCRIPT_ROW"), SE_M_STAT_INCREASE = hitSoundsConst("SE_M_STAT_INCREASE");
// Row flags (element 5 of a row, absent = none): ROW_OPTIONAL = emitted only when the segment presents the rise, so its absence is not `missing`; ROW_TAIL = scheduled past the status window (psn2), emitted outside the command's presenting window.
const ROW_OPTIONAL = 1, ROW_TAIL = 2;

const nonMove = process.argv[4] === "--nonmove";
const keys: any[][] = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const out: Record<string, unknown> = {};

// t1cls --nonmove: keys [type, battler, animation]; out key `type,battler,animation` -> { rows: [[script offset, kind, id, pan, task 0|1]...] } from the table's own general / status variants
// with the attacker / target sides the emitter's contexts name (moveAnimSounds.ts emitGeneralAnimSounds / emitStatsChangeSounds; the held-item later SEs are mirrored from HELD_ITEM_EFFECT_LATER_SE_OPS).
const STATUS: Record<string, string> = { PSN: "Status_Poison", CONFUSION: "Status_Confusion", BRN: "Status_Burn", INFATUATION: "Status_Infatuation", SLP: "Status_Sleep", PRZ: "Status_Paralysis", FRZ: "Status_Freeze", CURSED: "Status_Curse", NIGHTMARE: "Status_Nightmare" };
const WEATHER: Record<string, string> = { RAIN_CONTINUES: "General_Rain", SUN_CONTINUES: "General_Sun", SANDSTORM_CONTINUES: "General_Sandstorm", HAIL_CONTINUES: "General_Hail" };
const HELD_LATER: TimedOp[] = [{ op: "playsewithpan", frame: 40, id: 152, pan: -64 }, { op: "playsewithpan", frame: 72, id: 152, pan: -64 }, { op: "playsewithpan", frame: 104, id: 228, pan: -64 }, { op: "playsewithpan", frame: 176, id: 102, pan: -64 }];
const variant = (label: string, attacker: number): TimedOp[] => { const g = (timing as any).general.find((e: any) => e.label === label); return g === undefined ? [] : (timing as any).variants[g.variants[attacker]]; };
const sideOf = (b: number) => (b === 0 ? "player" : "opponent") as "player" | "opponent";
if (nonMove) {
  for (const [type, battler, animation] of keys) {
    const side = sideOf(battler), other = sideOf(battler === 0 ? 1 : 0);
    let ops: TimedOp[] = []; let context: any = { attackerSide: side, targetSide: other };
    if (type === "status-animation") { ops = variant(STATUS[animation], battler); context = { attackerSide: side, targetSide: side, statusAnimActive: true }; }
    else if (type === "general-animation" && WEATHER[animation]) ops = variant(WEATHER[animation], battler);
    else if (type === "general-animation" && animation === "LEECH_SEED_DRAIN") { ops = variant("General_LeechSeedDrain", battler === 0 ? 1 : 0); context = { attackerSide: other, targetSide: side }; }
    else if (type === "general-animation" && animation === "FOCUS_PUNCH_SETUP") ops = variant("General_FocusPunchSetUp", battler);
    else if (type === "general-animation" && animation === "CASTFORM_CHANGE") ops = variant("General_CastformChange", battler);
    else if (type === "general-animation" && animation === "HELD_ITEM_EFFECT") ops = [...variant("General_HeldItemEffect", battler), ...HELD_LATER];
    const rows: unknown[] = [];
    if (type === "stats-change") for (const id of [239, 245]) rows.push([0, "se", id, animSoundPan2(-64, context), 0]);
    // psn2 scheduleStatusAnimationTail: a row whose command age (script row + STATUS_ANIMATION_SCRIPT_AGE) is at or after the window end (STATUS_ANIMATION_ADDED_ROWS) plays after the window.
    const windowRows = type === "status-animation" ? (STATUS_ANIMATION_ADDED_ROWS as Record<string, number>)[animation] : undefined;
    for (const op of ops) for (const row of moveAnimOpRows(op, context, true)) {
      const scriptRow = op.frame + row.offset;
      rows.push([scriptRow, row.emission.kind, row.emission.id, row.emission.pan, row.task === true ? 1 : 0, ...(windowRows !== undefined && scriptRow + STATUS_ANIMATION_SCRIPT_AGE >= windowRows ? [ROW_TAIL] : [])]);
    }
    out[`${type},${battler},${animation}`] = { rows };
  }
  writeFileSync(process.argv[3]!, JSON.stringify(out));
  process.exit(0);
}
for (const [move, turn, attacker, target, pic, counter] of keys) {
  const outKey = `${move},${turn},${attacker},${target},${pic ?? ""}` + (counter ? `,${counter}` : "");
  const entry = (timing as any).moves[move!];
  if (entry === undefined) { out[outKey] = null; continue; }
  const turnIndex = turn! < timing.turns ? turn! : timing.turns - 2 + (turn! & 1);
  const slot = turnIndex * timing.sides + (attacker === 0 ? 0 : 1);
  const context = { attackerSide: attacker === 0 ? "player" : "opponent", targetSide: target === 0 ? "player" : "opponent" } as const;
  const rows: unknown[] = [];
  // aud242l: a pic-dependent slot picks its grid cell from the battlers' pic Y ("player,opponent"); an unknown / absent class keeps the reference walk.
  let variant = entry.variants[slot];
  const grid = entry.pic === undefined ? undefined : (timing as any).picGrids[entry.pic[slot]];
  if (grid !== undefined && pic) {
    const [playerY, opponentY] = String(pic).split(",").map(Number);
    const side = attacker === 0 ? 0 : 1;
    const row = (timing as any).picYs[side].indexOf(side === 0 ? playerY : opponentY);
    const column = (timing as any).picYs[1 - side].indexOf(side === 0 ? opponentY : playerY);
    if (row >= 0 && column >= 0) variant = grid[row * (timing as any).picYs[1 - side].length + column];
  }
  const counterGrid = entry.counter === undefined ? undefined : (timing as any).counterGrids[entry.counter[slot]];
  if (counterGrid !== undefined) variant = counterGrid[Number(counter) >= 1 && Number(counter) <= 5 ? Number(counter) - 1 : 0];
  for (const op of (timing as any).variants[variant]) {
    for (const row of moveAnimOpRows(op, context)) rows.push([op.frame + row.offset, row.emission.kind, row.emission.id, row.emission.pan, row.task === true ? 1 : 0]);
  }
  // t1dt (aud252): Scene ON Double Team's STATS_CHANGE SE is outside the table; emitDoubleTeamStatsChangeSound plays it at script row DOUBLE_TEAM_STAT_SE_SCRIPT_ROW with the attacker's pan.
  if (move === MOVE_DOUBLE_TEAM) rows.push([DOUBLE_TEAM_STAT_SE_SCRIPT_ROW, "se", SE_M_STAT_INCREASE, animSoundPan2(-64, context), 0, ROW_OPTIONAL]);
  out[outKey] = { rows, gated: entry.gated[slot], ends: entry.ends[slot] };
}
writeFileSync(process.argv[3]!, JSON.stringify(out));
