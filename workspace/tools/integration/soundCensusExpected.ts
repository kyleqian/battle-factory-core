// aud243a: the resolved move-animation SE rows of the aud242 table for the (move, turn, attacker, target) keys of a census arm, for soundCensusDelta.py --t1.
//   node --experimental-strip-types --no-warnings tools/integration/soundCensusExpected.ts <keys.json: [[move, turn, attacker, target]...]> <out.json>
// Out: { "move,turn,attacker,target": { rows: [[offset from script frame 0, kind, id, pan, task 0|1]...], gated, ends } | null } using the table's own variant walk (moveAnimOpRows
// with the request's attacker / target sides), independently of the age clock emitMoveAnimSounds runs on. Frame of a row = (frame of body age 0) + 8 + offset (1 + 7, moveAnimSounds.ts).
import { readFileSync, writeFileSync } from "node:fs";
import timing from "../../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { moveAnimOpRows, type TimedOp } from "../../src/engine/moveAnimSounds.ts";
import { animSoundPan2 } from "../../src/audio/soundEvents.ts";

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
    for (const op of ops) for (const row of moveAnimOpRows(op, context, true)) rows.push([op.frame + row.offset, row.emission.kind, row.emission.id, row.emission.pan, row.task === true ? 1 : 0]);
    out[`${type},${battler},${animation}`] = { rows };
  }
  writeFileSync(process.argv[3]!, JSON.stringify(out));
  process.exit(0);
}
for (const [move, turn, attacker, target] of keys) {
  const entry = (timing as any).moves[move!];
  if (entry === undefined) { out[`${move},${turn},${attacker},${target}`] = null; continue; }
  const turnIndex = turn! < timing.turns ? turn! : timing.turns - 2 + (turn! & 1);
  const slot = turnIndex * timing.sides + (attacker === 0 ? 0 : 1);
  const context = { attackerSide: attacker === 0 ? "player" : "opponent", targetSide: target === 0 ? "player" : "opponent" } as const;
  const rows: unknown[] = [];
  for (const op of (timing as any).variants[entry.variants[slot]]) {
    for (const row of moveAnimOpRows(op, context)) rows.push([op.frame + row.offset, row.emission.kind, row.emission.id, row.emission.pan, row.task === true ? 1 : 0]);
  }
  out[`${move},${turn},${attacker},${target}`] = { rows, gated: entry.gated[slot], ends: entry.ends[slot] };
}
writeFileSync(process.argv[3]!, JSON.stringify(out));
