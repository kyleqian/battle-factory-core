/** Deterministic replay and compact change-map gate for evidence-only Yawn. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const paths: Record<Side, { dense: string; rgb: string; map: string }> = {
  "player-back": { dense: "tools/compare/evidence/yawn-player-dense-state.json.gz", rgb: "tools/compare/evidence/yawn-player-raw-rgb.tar.gz", map: "tools/compare/evidence/yawn-changemap-player.json" },
  "opponent-front": { dense: "tools/compare/evidence/yawn-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/yawn-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/yawn-changemap-opponent.json" },
};
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const range = (ages: number[]) => ({ first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length });

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 32 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (members.length !== rows.length || bytes.length !== rows.length * size) throw new Error(`${archive}: RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`)!);
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[]; const tag = 10242;
  const clouds = (row: Json): Json[] => row.sprites.filter((entry: Json) => entry.template.symbol === "gYawnCloudSpriteTemplate");
  const cloudCounts = rows.map((row) => clouds(row).length);
  const cloudCreates = cloudCounts.flatMap((count, age) => age && count > cloudCounts[age - 1]! ? [age] : []);
  const cloudDestroys = cloudCounts.flatMap((count, age) => age && count < cloudCounts[age - 1]! ? [age] : []);
  const taskLive = (row: Json): boolean => row.tasks.some((entry: Json) => entry.func.symbol === "AnimTask_DeepInhale_Step");
  const taskStarts = rows.flatMap((row, age) => taskLive(row) && (!age || !taskLive(rows[age - 1]!)) ? [age] : []);
  const attacker = rows[0]!.animationBattlers.attacker as number, target = rows[0]!.animationBattlers.target as number;
  const attackerSlot = rows[0]!.animationBattlers.spriteIds[attacker] as number, targetSlot = rows[0]!.animationBattlers.spriteIds[target] as number;
  const sprite = (row: Json, slot: number): Json => row.sprites.find((entry: Json) => entry.slot === slot)!;
  let oamPrior = 0, matricesPrior = 0, palettePrior = 0, cloudMatrixPrior = 0, cloudMatrixComparable = 0;
  for (let age = 1; age < rows.length; age += 1) {
    if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) oamPrior += 1;
    if (same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) matricesPrior += 1;
    if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) palettePrior += 1;
    for (const cloud of clouds(rows[age]!)) {
      const prior = clouds(rows[age - 1]!).find((entry) => entry.slot === cloud.slot); if (!prior) continue;
      cloudMatrixComparable += 1;
      if (same(rows[age]!.hardwareMatrices[cloud.matrixNum], prior.matrix)) cloudMatrixPrior += 1;
    }
  }
  const audio = rows.flatMap((row, age) => {
    const current = [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol];
    const prior = age ? [rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol, rows[age - 1]!.audio.SE2.songHeaderIdentity.symbol] : [];
    return current.flatMap((symbol, player) => ["se_m_yawn", "se_m_spit_up"].includes(symbol) && symbol !== prior[player] ? [{ age, player: player ? "SE2" : "SE1", symbol, panX: row.audio[player ? "SE2" : "SE1"].tracks.map((track: Json) => track.panX) }] : []);
  });
  const changes = rows.map((row, age) => {
    let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const project = (entry: Json) => ({ slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, invisible: entry.invisible, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
    return { age, frame: row.frame, scriptOffset: row.scriptOffset, active: row.animScriptActive, sha256: row.sha256, changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null, clouds: clouds(row).map(project), deepInhaleTasks: row.tasks.filter((entry: Json) => entry.func.symbol === "AnimTask_DeepInhale_Step").map((entry: Json) => ({ slot: entry.slot, data: entry.data })), attacker: project(sprite(row, attackerSlot)), target: project(sprite(row, targetSlot)) };
  });
  const tagPaletteAges = rows.flatMap((row, age) => row.paletteTags.includes(tag) ? [age] : []), tagTileAges = rows.flatMap((row, age) => row.tileTags.includes(tag) ? [age] : []);
  const animationRngAges = transitions(rows, (row) => row.animationRng);
  return { schema: "yawn-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    lifecycle: { deepInhaleStarts: taskStarts, cloudCreates, cloudDestroys, cloudPeak: Math.max(...cloudCounts), cloudCountTransitions: transitions(rows, (row) => clouds(row).length) }, audio,
    latches: { hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`, hardwareMatricesEqualPrecedingSoftware: `${matricesPrior}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`, cloudHardwareMatrixEqualsPrecedingSource: `${cloudMatrixPrior}/${cloudMatrixComparable}`, attackerSourceX2Changes: transitions(rows, (row) => sprite(row, attackerSlot).x2), attackerHardwareMatrixChanges: transitions(rows, (row) => row.hardwareMatrices[sprite(row, attackerSlot).matrixNum]), targetSourceX2Changes: transitions(rows, (row) => sprite(row, targetSlot).x2), targetHardwareMatrixChanges: transitions(rows, (row) => row.hardwareMatrices[sprite(row, targetSlot).matrixNum]) },
    changedRegisters: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)),
    state: { attacker, target, yawnPpSlots: { player: rows[0]!.battlers.player.pp.flatMap((pp: number, slot: number) => pp === 9 ? [slot] : []), opponent: rows[0]!.battlers.opponent.pp.flatMap((pp: number, slot: number) => pp === 9 ? [slot] : []) }, status3: { player: rows[0]!.battlers.player.status3, opponent: rows[0]!.battlers.opponent.status3 }, gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: { ...range(animationRngAges), everyComparableRow: animationRngAges.length === rows.length - 1 }, partyRowsComplete: rows.every((row) => row.parties.player.length === 3 && row.parties.opponent.length === 3) },
    resourceTags: { tag, palettePresent: range(tagPaletteAges), tilePresent: range(tagTileAges) }, cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, cloudCount: cloudCounts.at(-1), paletteTagPresent: rows.at(-1)!.paletteTags.includes(tag), tileTagPresent: rows.at(-1)!.tileTags.includes(tag) }, rows: changes };
}

const write = process.argv.includes("--write-maps"); const summary: Record<string, Json> = {};
for (const side of Object.keys(paths) as Side[]) {
  const config = paths[side], decoded = gunzipSync(readFileSync(config.dense)), probe = JSON.parse(decoded.toString("utf8")), rgb = rgbFrames(config.rgb, probe.frames);
  probe.frames.forEach((row: Json, age: number) => { if (sha(rgb[age]!) !== row.sha256) throw new Error(`${side} age ${age}: RGB`); });
  const map = derive(side, probe, rgb), bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (write) writeFileSync(config.map, bytes); else if (!readFileSync(config.map).equals(bytes)) throw new Error(`${side}: map drift`);
  summary[side] = { sourceWindow: probe.sourceWindow, probeJsonSha256: sha(decoded), stateGzipSha256: sha(readFileSync(config.dense)), rawRgbArchiveSha256: sha(readFileSync(config.rgb)), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMapSha256: sha(bytes), lifecycle: map.lifecycle, audio: map.audio, latches: map.latches, state: map.state, resourceTags: map.resourceTags, cleanup: map.cleanup };
}
console.log(JSON.stringify(summary, null, 2));
