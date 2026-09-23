/** Deterministic dense evidence verifier and compact change-map generator. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const paths: Record<Side, { dense: string; rgb: string; map: string }> = {
  "player-back": { dense: "tools/compare/fixtures/ice-ball/player-dense.json.gz", rgb: "tools/compare/fixtures/ice-ball/player-rgb.tar.gz", map: "tools/compare/fixtures/ice-ball/player-map.json" },
  "opponent-front": { dense: "tools/compare/fixtures/ice-ball/opponent-dense.json.gz", rgb: "tools/compare/fixtures/ice-ball/opponent-rgb.tar.gz", map: "tools/compare/fixtures/ice-ball/opponent-map.json" },
};
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const unique = <T>(values: T[]): T[] => [...new Map(values.map((value) => [stable(value), value])).values()];

function rawFrames(archive: string, bodies: Json[][]): Buffer[][] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 160 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (bytes.length !== members.length * size) throw new Error(`${archive}: expected ${members.length * size} RGB bytes, got ${bytes.length}`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return bodies.map((body) => body.map((row) => {
    const rgb = byName.get(row.rgbFile);
    if (!rgb) throw new Error(`${archive}: missing ${row.rgbFile}`);
    if (sha(rgb) !== row.sha256) throw new Error(`${archive}: RGB digest drift at ${row.rgbFile}`);
    return rgb;
  }));
}

const owned = (row: Json): Json[] => row.sprites.filter((sprite: Json) => ["gIceBallChunkSpriteTemplate", "gIceBallImpactShardSpriteTemplate"].includes(sprite.template.symbol));
const shake = (row: Json): Json[] => row.tasks.filter((task: Json) => task.function === "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step");
const fade = (row: Json): Json[] => row.tasks.filter((task: Json) => task.function === "Task_FadeToBg");


function lifeMap(rows: Json[]): Json[] {
  const sprite = (row: Json, slot: number): Json | undefined => owned(row).find((entry) => entry.slot === slot && entry.template.symbol === "gIceBallImpactShardSpriteTemplate");
  const slots = unique(rows.flatMap((row) => owned(row).filter((sprite) => sprite.template.symbol === "gIceBallImpactShardSpriteTemplate").map((sprite) => sprite.slot)));
  return slots.map((slot) => {
    const entries = rows.flatMap((row, age) => sprite(row, slot) ? [{ age, counter: sprite(row, slot)!.data[0] as number }] : []);
    const counters = entries.map((entry) => entry.counter);
    return { slot, startAge: entries[0]?.age, endAge: entries.at(-1)?.age, observedActiveFrames: entries.length, sourceCounterRange: [counters[0], counters.at(-1)], logicalLifetimeTicks: counters[0] === 1 && counters.at(-1) === 20 ? 21 : null, exact21: counters[0] === 1 && counters.at(-1) === 20 };
  });
}

function deriveBody(rows: Json[]): Json {
  const first = rows[0]!, last = rows.at(-1)!;
  const counter = Math.max(...rows.map((row) => row.animArgs[0]).filter((value: number) => value >= 0 && value <= 4));
  const chunkRows = rows.filter((row) => owned(row).some((sprite) => sprite.template.symbol === "gIceBallChunkSpriteTemplate"));
  const chunk = (row: Json): Json => owned(row).find((sprite) => sprite.template.symbol === "gIceBallChunkSpriteTemplate")!;
  const starts = lifeMap(rows);
  const taskRows = rows.flatMap((row, age) => shake(row).map((task) => ({ age, data: task.data })));
  const fadeRows = rows.flatMap((row, age) => fade(row).map((task) => ({ age, data: task.data })));
  const bgTransitions = transitions(rows, (row) => row.bgVramSha256);
  const registerChanges = Object.fromEntries(Object.keys(first.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const audio = rows.flatMap((row, age) => ["SE1", "SE2"].flatMap((player) => {
    const symbol = row.audio[player].songHeaderIdentity.symbol;
    const previous = age ? rows[age - 1]!.audio[player].songHeaderIdentity.symbol : null;
    return symbol !== previous ? [{ age, player, symbol, panX: row.audio[player].tracks.map((track: Json) => track.panX) }] : [];
  }));
  const oamPrior = rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length;
  const matrixPrior = rows.slice(1).filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length;
 const palettePrior = rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length;
  return {
    body: first.body, sourceWindow: { startFrame: first.frame, endFrame: last.frame, frameCount: rows.length },
    counter: { observed: counter, args: unique(rows.map((row) => row.animArgs[0])), expected: [0, 1, 2, 3, 4][first.body - 1] },
    shardPattern: { expected: [5, 7, 9, 10, 10][first.body - 1], created: starts.length, lives: starts, allExact21: starts.every((entry) => entry.exact21) },
    shake: { expectedDuration: [8, 10, 14, 18, 30][first.body - 1], startAge: taskRows[0]?.age ?? null, endAge: taskRows.at(-1)?.age ?? null, durations: unique(taskRows.map((entry) => entry.data[2])), targetAxes: unique(taskRows.map((entry) => entry.data.slice(0, 2))), amplitudeFields: unique(taskRows.map((entry) => entry.data[7])), },
    chunk: { rows: chunkRows.map((row) => ({ age: row.age, x2: chunk(row).x2, y2: chunk(row).y2, data0: chunk(row).data[0], matrix: chunk(row).matrix })), arcTicks: unique(chunkRows.map((row) => chunk(row).data[0])).sort((a: number, b: number) => b - a), affineMatrices: unique(chunkRows.map((row) => chunk(row).matrix)), callback: unique(chunkRows.map((row) => chunk(row).callback.symbol)), },
    topology: { sprites: unique(rows.flatMap((row) => owned(row)).map((sprite) => sprite.template.symbol)), callbacks: unique(rows.flatMap((row) => owned(row)).map((sprite) => sprite.callback.symbol)), tasks: unique(rows.flatMap((row) => row.tasks.map((task: Json) => task.function))) },
    latches: { hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`, hardwareMatricesEqualsPrecedingSoftware: `${matrixPrior}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`, paletteTags: unique(rows.flatMap((row) => row.paletteTags).filter((tag: number) => tag !== 0xffff)), tileTags: unique(rows.flatMap((row) => row.tileTags).filter((tag: number) => tag !== 0xffff)), },
    background: { bgVramTransitions: bgTransitions, registerChanges, fadeTaskAges: fadeRows.map((entry) => entry.age), strongestCleanup: first.body === 5 ? { fadeTask: fadeRows.length > 0, delay45Observed: rows.some((row) => row.scriptOffset === 129 && row.scriptWait === 45), restoredAt: bgTransitions.at(-1) ?? null, finalEqualsInitial: last.bgVramSha256 === first.bgVramSha256 } : false, },
    audio, state: { attacker: first.animationBattlers.attacker, target: first.animationBattlers.target, lockedMoves: first.lockedMoves, gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: transitions(rows, (row) => row.animationRng), partiesComplete: rows.every((row) => row.parties.player.length === 3 && row.parties.opponent.length === 3), },
    cleanup: { age: last.age, active: last.animScriptActive, visualTasks: last.visualTaskCount, soundTasks: last.soundTaskCount, ownedSprites: owned(last).length, finalBgVram: last.bgVramSha256 },
  };
}

function derive(side: Side, probe: Json): Json {
  return { schema: "ice-ball-normalized-change-map/v1", side, move: "MOVE_ICE_BALL", profile: "battle-scene-on", completeFiveBodyLifecycle: probe.completeFiveBodyLifecycle, sourceWindows: probe.sourceWindows, bodies: (probe.bodies as Json[][]).map((body) => deriveBody(body)), topology: probe.topology, sourcePointerContract: probe.sourcePointerContract };
}

const write = process.argv.includes("--write-maps");
const summary: Record<string, Json> = {};
for (const side of Object.keys(paths) as Side[]) {
  const config = paths[side], denseBytes = gunzipSync(readFileSync(config.dense)), probe = JSON.parse(denseBytes.toString("utf8")) as Json;
  if (probe.schema !== "ice-ball-dense-evidence/v1" || probe.oracleProfile !== "battle-scene-on" || probe.bodies.length !== 5) throw new Error(`${side}: incomplete dense evidence`);
  const rgb = rawFrames(config.rgb, probe.bodies as Json[][]), map = derive(side, probe), bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (write) writeFileSync(config.map, bytes); else if (!readFileSync(config.map).equals(bytes)) throw new Error(`${side}: map drift`);
  summary[side] = { denseJsonSha256: sha(denseBytes), denseGzipSha256: sha(readFileSync(config.dense)), rawRgbArchiveSha256: sha(readFileSync(config.rgb)), rawRgbSequenceSha256: sha(Buffer.concat(rgb.flat())), changeMapSha256: sha(bytes), rows: probe.bodies.map((body: Json[]) => body.length), windows: probe.sourceWindows, observedCounters: map.bodies.map((body: Json) => body.counter.observed), shardCounts: map.bodies.map((body: Json) => body.shardPattern.created), shakeDurations: map.bodies.map((body: Json) => body.shake.expectedDuration), cleanup: map.bodies.map((body: Json) => body.cleanup), };
}
console.log(JSON.stringify(summary, null, 2));
