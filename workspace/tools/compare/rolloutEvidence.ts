/** Deterministic replay and normalized change-map gate for Rollout evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const paths: Record<Side, { dense: string; rgb: string; map: string }> = {
  "player-back": { dense: "tools/compare/evidence/rollout-player-dense-state.json.gz", rgb: "tools/compare/evidence/rollout-player-raw-rgb.tar.gz", map: "tools/compare/evidence/rollout-changemap-player.json" },
  "opponent-front": { dense: "tools/compare/evidence/rollout-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/rollout-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/rollout-changemap-opponent.json" },
};
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const range = (ages: number[]) => ({ first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length });

function rgbFrames(archive: string, bodies: Json[][]): Buffer[][] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 160 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (bytes.length !== members.length * size) throw new Error(`${archive}: RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return bodies.map((body) => body.map((row) => {
    const rgb = byName.get(`body-${row.body}-${String(row.frame).padStart(5, "0")}.rgb`);
    if (!rgb) throw new Error(`${archive}: missing body ${row.body} frame ${row.frame}`);
    return rgb;
  }));
}

function deriveBody(rows: Json[], rgb: Buffer[]): Json {
  const particles = (row: Json): Json[] => row.sprites.filter((entry: Json) => ["gRolloutMudSpriteTemplate", "gRolloutRockSpriteTemplate"].includes(entry.template.symbol));
  const rolloutTasks = (row: Json): Json[] => row.tasks.filter((entry: Json) => entry.func.symbol === "AnimTask_Rollout_Step");
  const shakeTasks = (row: Json): Json[] => row.tasks.filter((entry: Json) => entry.func.symbol === "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step");
  const attacker = rows[0]!.animationBattlers.attacker as number, target = rows[0]!.animationBattlers.target as number;
  const attackerSlot = rows[0]!.animationBattlers.spriteIds[attacker] as number, targetSlot = rows[0]!.animationBattlers.spriteIds[target] as number;
  const sprite = (row: Json, slot: number): Json => row.sprites.find((entry: Json) => entry.slot === slot)!;
  const oamAxis = (raw: string): number[] => { const bytes = Buffer.from(raw, "hex"); return [bytes.readUInt16LE(2) & 0x1ff, bytes.readUInt16LE(0) & 0xff]; };
  const createAges: number[] = [], destroyAges: number[] = [];
  rows.forEach((row, age) => {
    if (!age) return;
    const prior = new Set(particles(rows[age - 1]!).map((entry) => entry.slot));
    const current = new Set(particles(row).map((entry) => entry.slot));
    for (const entry of current) if (!prior.has(entry)) createAges.push(age);
    for (const entry of prior) if (!current.has(entry)) destroyAges.push(age);
  });
  let oamPrior = 0, matricesPrior = 0, palettePrior = 0;
  for (let age = 1; age < rows.length; age += 1) {
    if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) oamPrior += 1;
    if (same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) matricesPrior += 1;
    if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) palettePrior += 1;
  }
  const audio = rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((player) => {
    const symbol = row.audio[player].songHeaderIdentity.symbol;
    const prior = age ? rows[age - 1]!.audio[player].songHeaderIdentity.symbol : null;
    return symbol !== prior ? [{ age, player, symbol, panX: row.audio[player].tracks.map((track: Json) => track.panX) }] : [];
  }));
  const summaryRows = rows.map((row, age) => {
    let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { age, frame: row.frame, scriptOffset: row.scriptOffset, active: row.animScriptActive, sha256: row.sha256, changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null, particles: particles(row).map((entry) => ({ slot: entry.slot, template: entry.template.symbol, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, attr: entry.attr, subpriority: entry.subpriority, data: entry.data })), rolloutTask: rolloutTasks(row).map((entry) => ({ slot: entry.slot, data: entry.data })), shakeTask: shakeTasks(row).map((entry) => ({ slot: entry.slot, data: entry.data })), attacker: { x2: sprite(row, attackerSlot).x2, y2: sprite(row, attackerSlot).y2 }, target: { x2: sprite(row, targetSlot).x2, y2: sprite(row, targetSlot).y2 } };
  });
  const first = rows[0]!, last = rows.at(-1)!;
  const relevantTasks = ["AnimTask_Rollout_Step", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"];
  const attackerSourceChanges = transitions(rows, (row) => [sprite(row, attackerSlot).x2, sprite(row, attackerSlot).y2]);
  const rolloutStart = rows.findIndex((row) => rolloutTasks(row).length > 0);
  const shakeStart = rows.findIndex((row) => shakeTasks(row).length > 0), shakeEnd = rows.findLastIndex((row) => shakeTasks(row).length > 0);
  const inRange = (ages: number[], start: number, end: number): number[] => ages.filter((age) => age >= start && age <= end);
  const targetBgRegister = target === 1 ? "bg1hofs" : "bg2hofs";
  return {
    body: first.body, sourceWindow: { startFrame: first.frame, endFrame: last.frame, frameCount: rows.length },
    counter: { animationCopy: first.animDisableStruct, live: first.disableStructs[attacker], taskValues: [...new Set(rows.flatMap((row) => rolloutTasks(row).map((entry) => entry.data[1])))] },
    power: { dynamicBasePower: [...new Set(rows.map((row) => row.dynamicBasePower))], animMovePower: [...new Set(rows.map((row) => row.animMovePower))], animMoveDmg: [...new Set(rows.map((row) => row.animMoveDmg))], shakeAmplitude: [...new Set(rows.flatMap((row) => shakeTasks(row).map((entry) => entry.data[15])))] },
    particles: { templates: [...new Set(rows.flatMap((row) => particles(row).map((entry) => entry.template.symbol)))], createAges, destroyAges, creations: createAges.length, peak: Math.max(...rows.map((row) => particles(row).length)), affineModes: [...new Set(rows.flatMap((row) => particles(row).map((entry) => (entry.attr[0] >> 8) & 3)))] },
    tasks: Object.fromEntries(relevantTasks.map((name) => [name, range(rows.flatMap((row, age) => row.tasks.some((entry: Json) => entry.func.symbol === name) ? [age] : []))])),
    latches: { hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`, hardwareMatricesEqualPrecedingSoftware: `${matricesPrior}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`, attackerSourceAxisChanges: attackerSourceChanges, rolloutAttackerSourceAxisChanges: attackerSourceChanges, rolloutAttackerSoftwareOamAxisChanges: inRange(transitions(rows, (row) => oamAxis(row.softwareOam[9])), rolloutStart, attackerSourceChanges.at(-1)! + 1), rolloutAttackerHardwareOamAxisChanges: inRange(transitions(rows, (row) => oamAxis(row.hardwareOam[9])), rolloutStart, attackerSourceChanges.at(-1)! + 2), targetSourceAxisChanges: transitions(rows, (row) => [sprite(row, targetSlot).x2, sprite(row, targetSlot).y2]), shakeTargetBgRegister: targetBgRegister, shakeTargetBgRegisterChanges: inRange(transitions(rows, (row) => row.registers[targetBgRegister]), shakeStart, shakeEnd + 2) },
    changedRegisters: Object.fromEntries(Object.keys(first.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)),
    audio,
    state: { attacker, target, lockedMoves: first.lockedMoves, attackerStatus2: first.battlers[attacker === 0 ? "player" : "opponent"].status2, gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: transitions(rows, (row) => row.animationRng), partyRowsComplete: rows.every((row) => row.parties.player.length === 3 && row.parties.opponent.length === 3) },
    cleanup: { age: rows.length - 1, active: last.animScriptActive, visualTasks: last.visualTaskCount, soundTasks: last.soundTaskCount, particles: particles(last).length, registers: last.registers }, rows: summaryRows,
  };
}

function derive(side: Side, probe: Json, rgb: Buffer[][]): Json {
  return { schema: "rollout-normalized-change-map/v1", side, completeFiveBodyLifecycle: probe.completeFiveBodyLifecycle, sourceWindows: probe.sourceWindows, bodies: (probe.bodies as Json[][]).map((body, index) => deriveBody(body, rgb[index]!)) };
}

const write = process.argv.includes("--write-maps"); const summary: Record<string, Json> = {};
for (const side of Object.keys(paths) as Side[]) {
  const config = paths[side], decoded = gunzipSync(readFileSync(config.dense)), probe = JSON.parse(decoded.toString("utf8")), bodies = probe.bodies as Json[][], rgb = rgbFrames(config.rgb, bodies);
  bodies.forEach((body, bodyIndex) => body.forEach((row, age) => { if (sha(rgb[bodyIndex]![age]!) !== row.sha256) throw new Error(`${side} body ${bodyIndex + 1} age ${age}: RGB`); }));
  const map = derive(side, probe, rgb), bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (write) writeFileSync(config.map, bytes); else if (!readFileSync(config.map).equals(bytes)) throw new Error(`${side}: map drift`);
  summary[side] = { sourceWindows: probe.sourceWindows, probeJsonSha256: sha(decoded), stateGzipSha256: sha(readFileSync(config.dense)), rawRgbArchiveSha256: sha(readFileSync(config.rgb)), rawRgbSequenceSha256: sha(Buffer.concat(rgb.flat())), changeMapSha256: sha(bytes), bodies: map.bodies.map((body: Json) => ({ counter: body.counter, power: body.power, particles: body.particles, tasks: body.tasks, latches: body.latches, state: body.state, cleanup: body.cleanup })) };
}
console.log(JSON.stringify(summary, null, 2));
