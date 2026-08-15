/** Deterministic reducer/replay gate for evidence-only MOVE_PAIN_SPLIT banks. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const paths: Record<Side, { dense: string; rgb: string; map: string }> = {
  "player-back": { dense: "tools/compare/evidence/pain-split-player-dense-state.json.gz", rgb: "tools/compare/evidence/pain-split-player-raw-rgb.tar.gz", map: "tools/compare/evidence/pain-split-changemap-player.json" },
  "opponent-front": { dense: "tools/compare/evidence/pain-split-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/pain-split-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/pain-split-changemap-opponent.json" },
};
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const starts = (rows: Json[], select: (row: Json) => boolean): number[] => rows.flatMap((row, age) => select(row) && (!age || !select(rows[age - 1]!)) ? [age] : []);

function rgbFrames(archive: string, rows: Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 16 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (members.length !== rows.length || bytes.length !== rows.length * size) throw new Error(`${archive}: RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`)!);
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Json[];
  const attacker = rows[0]!.animationBattlers.attacker as number;
  const target = rows[0]!.animationBattlers.target as number;
  const attackerSlot = rows[0]!.animationBattlers.spriteIds[attacker] as number;
  const targetSlot = rows[0]!.animationBattlers.spriteIds[target] as number;
  const sprite = (row: Json, slot: number): Json => row.sprites.find((entry: Json) => entry.slot === slot)!;
  const projectileCreates = starts(rows, (row) => row.sprites.some((entry: Json) => entry.template.symbol === "gPainSplitProjectileSpriteTemplate"));
  const projectileCounts = rows.map((row) => row.sprites.filter((entry: Json) => entry.template.symbol === "gPainSplitProjectileSpriteTemplate").length);
  const taskStarts = starts(rows, (row) => row.tasks.some((entry: Json) => entry.func.symbol === "AnimTask_PainSplitMovement"));
  const audio = rows.flatMap((row, age) => age && row.audio.SE1.songHeaderIdentity.symbol === "se_m_swagger2"
    && row.audio.SE1.status === 0 && rows[age - 1]!.audio.SE1.status !== 0
    ? [{ age, panX: row.audio.SE1.tracks.map((track: Json) => track.panX), status: row.audio.SE1.status }] : []);
  let oamPrior = 0, matrixPrior = 0, palettePrior = 0, attackerMatrixPrior = 0, attackerMatrixTwoBack = 0, targetMatrixPrior = 0, targetMatrixTwoBack = 0;
  for (let age = 1; age < rows.length; age += 1) {
    if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) oamPrior += 1;
    if (same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) matrixPrior += 1;
    if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) palettePrior += 1;
    const attackerHardware = rows[age]!.hardwareMatrices[sprite(rows[age]!, attackerSlot).matrixNum];
    const targetHardware = rows[age]!.hardwareMatrices[sprite(rows[age]!, targetSlot).matrixNum];
    if (same(attackerHardware, sprite(rows[age - 1]!, attackerSlot).matrix)) attackerMatrixPrior += 1;
    if (same(targetHardware, sprite(rows[age - 1]!, targetSlot).matrix)) targetMatrixPrior += 1;
    if (age > 1 && same(attackerHardware, sprite(rows[age - 2]!, attackerSlot).matrix)) attackerMatrixTwoBack += 1;
    if (age > 1 && same(targetHardware, sprite(rows[age - 2]!, targetSlot).matrix)) targetMatrixTwoBack += 1;
  }
  const changes = rows.map((row, age) => {
    let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { age, frame: row.frame, scriptOffset: row.scriptOffset, active: row.animScriptActive, sha256: row.sha256, changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null, projectiles: projectileCounts[age] };
  });
  const changedRegisters = Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const animationRngAges = transitions(rows, (row) => row.animationRng);
  const paletteTagAges = rows.flatMap((row, age) => row.paletteTags.includes(10239) ? [age] : []);
  const tileTagAges = rows.flatMap((row, age) => row.tileTags.includes(10239) ? [age] : []);
  const range = (ages: number[]) => ({ first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length });
  return {
    schema: "pain-split-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    creation: { projectilePairStarts: projectileCreates, movementPairStarts: taskStarts, projectilePeak: Math.max(...projectileCounts) },
    audio, changedRegisters,
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`,
      hardwareMatricesEqualPrecedingSoftware: `${matrixPrior}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`,
      attackerMatrixEqualsPriorSource: `${attackerMatrixPrior}/${rows.length - 1}`,
      attackerMatrixEqualsTwoBackSource: `${attackerMatrixTwoBack}/${rows.length - 2}`,
      targetMatrixEqualsPriorSource: `${targetMatrixPrior}/${rows.length - 1}`,
      targetMatrixEqualsTwoBackSource: `${targetMatrixTwoBack}/${rows.length - 2}`,
      attackerSourceMatrixChanges: transitions(rows, (row) => sprite(row, attackerSlot).matrix),
      attackerHardwareMatrixChanges: transitions(rows, (row) => row.hardwareMatrices[sprite(row, attackerSlot).matrixNum]),
      targetSourceMatrixChanges: transitions(rows, (row) => sprite(row, targetSlot).matrix),
      targetHardwareMatrixChanges: transitions(rows, (row) => row.hardwareMatrices[sprite(row, targetSlot).matrixNum]),
    },
    state: {
      attacker, target,
      startHp: { player: rows[0]!.battlers.player.hp, opponent: rows[0]!.battlers.opponent.hp },
      painSplitPp: attacker === 0 ? rows[0]!.battlers.player.pp[0] : rows[0]!.battlers.opponent.pp[0],
      gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue),
      animationRngTransitions: { ...range(animationRngAges), everyComparableRow: animationRngAges.length === rows.length - 1 },
      partyRowsComplete: rows.every((row) => row.parties.player.length === 3 && row.parties.opponent.length === 3),
    },
    resourceTags: { tag: 10239, palettePresent: range(paletteTagAges), tilePresent: range(tileTagAges) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, projectileCount: projectileCounts.at(-1), painSplitPaletteTagPresent: rows.at(-1)!.paletteTags.includes(10239), painSplitTileTagPresent: rows.at(-1)!.tileTags.includes(10239) },
    rows: changes,
  };
}

const write = process.argv.includes("--write-maps");
const summary: Record<string, Json> = {};
for (const side of Object.keys(paths) as Side[]) {
  const config = paths[side]; const decoded = gunzipSync(readFileSync(config.dense)); const probe = JSON.parse(decoded.toString("utf8")); const rgb = rgbFrames(config.rgb, probe.frames);
  probe.frames.forEach((row: Json, age: number) => { if (sha(rgb[age]!) !== row.sha256) throw new Error(`${side} age ${age}: RGB`); });
  const map = derive(side, probe, rgb); const bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (write) writeFileSync(config.map, bytes); else if (!readFileSync(config.map).equals(bytes)) throw new Error(`${side}: change-map drift`);
  summary[side] = { sourceWindow: probe.sourceWindow, probeJsonSha256: sha(decoded), stateGzipSha256: sha(readFileSync(config.dense)), rawRgbArchiveSha256: sha(readFileSync(config.rgb)), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMapSha256: sha(bytes), creation: map.creation, audio: map.audio, latches: map.latches, state: map.state, resourceTags: map.resourceTags, cleanup: map.cleanup };
}
console.log(JSON.stringify(summary, null, 2));
