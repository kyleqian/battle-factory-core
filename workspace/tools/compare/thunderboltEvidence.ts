/** Hermetic bilateral dense evidence verifier for MOVE_THUNDERBOLT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Life = { slot: number; label: string; start: number; end: number; ages: number[]; first: Json; last: Json };

const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const ROOT_START = 0x082ca40a;
const ROOT_END = 0x082ca5c0;
const EFFECT_START = 0x082d7bea;
const EFFECT_END = 0x082d7c75;
const ROOT_POINTERS = [0x082ca40a, 0x082ca40d, 0x082ca410, 0x082ca413, 0x082ca424, 0x082ca427, 0x082ca43a, 0x082ca44d, 0x082ca460, 0x082ca471, 0x082ca483, 0x082ca486, 0x082ca54d, 0x082ca553, 0x082ca566, 0x082ca579, 0x082ca58c, 0x082ca59d, 0x082ca5a0, 0x082ca5aa, 0x082ca5ad, 0x082ca5be, 0x082ca5bf];
const EFFECT_POINTERS = [0x082d7bff, 0x082d7c10, 0x082d7c21, 0x082d7c32, 0x082d7c43, 0x082d7c54, 0x082d7c65];
const POINTERS = [...ROOT_POINTERS, ...EFFECT_POINTERS];
const BOLT_EVENTS = [28, 30, 32, 34, 36, 37, 39, 41, 43, 45, 46, 48, 50, 52, 54];
const ARC_EVENTS = [173, 177, 181, 185, 189, 193, 197, 201];
const ownedTemplates = new Set(["gElectricBoltSegmentSpriteTemplate", "gThunderboltOrbSpriteTemplate", "gSparkElectricityFlashingSpriteTemplate", "gElectricitySpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_ElectricBolt_Step", "AnimTask_BlendSpriteColor_Step2", "Task_WaitAndPlaySE"]);
const paths = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-thunderbolt-player-delcatty-opponent-shuckle.json",
    denseState: "tools/compare/evidence/thunderbolt-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/thunderbolt-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/thunderbolt-changemap-player.json",
    changeMapText: "tools/compare/evidence/thunderbolt-changemap-player.txt",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-thunderbolt-opponent-delcatty-player-shuckle.json",
    denseState: "tools/compare/evidence/thunderbolt-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/thunderbolt-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/thunderbolt-changemap-opponent.json",
    changeMapText: "tools/compare/evidence/thunderbolt-changemap-opponent.txt",
  },
} satisfies Record<Side, Record<string, string>>;

function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  let previous: unknown;
  return rows.flatMap((row, age) => {
    const value = select(row);
    if (age === 0 || !same(value, previous)) { previous = value; return [[age, value]]; }
    previous = value;
    return [];
  });
}
function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === members.length * size, `${archive}: complete RGB archive`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}
function pixelChange(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let changed = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    changed += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: changed, bounds: changed ? [minX, minY, maxX, maxY] : null };
}
function collectLives(rows: readonly Json[], kind: "sprite" | "task", labels: Set<string>): Life[] {
  const active = new Map<string, Life>();
  const result: Life[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>();
    const values = kind === "sprite" ? row.sprites : row.tasks;
    for (const item of values) {
      const label = kind === "sprite" ? item.template.symbol : item.func.symbol;
      if (labels.has(label)) current.set(`${item.slot}:${label}`, item);
    }
    for (const [id, item] of current) {
      const life = active.get(id);
      if (!life) active.set(id, { slot: item.slot, label: id.slice(id.indexOf(":") + 1), start: age, end: age, ages: [age], first: item, last: item });
      else { life.end = age; life.ages.push(age); life.last = item; }
    }
    for (const [id, life] of active) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); active.delete(id); }
  });
  result.push(...active.values());
  return result.sort((left, right) => left.start - right.start || left.slot - right.slot);
}
function compactSprite(sprite: Json): Json {
  return { slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, raw: sprite.raw, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority, flags: sprite.flags, invisible: sprite.invisible, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data };
}
function digestRow(row: Json): Json {
  const fields = ["tasks", "sprites", "softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices", "fadedPalette", "unfadedPalette", "hardwarePalette", "parties", "battlers", "engine", "immutableState"];
  return Object.fromEntries(fields.map((field) => [field, sha(JSON.stringify(row[field]))]));
}
function sourcePointerEdges(rows: readonly Json[]): unknown[][] {
  return edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait]);
}

function derive(side: Side, probe: Json, rows: Json[], rgb: readonly Buffer[]): Json {
  const taskLives = collectLives(rows, "task", ownedTasks);
  const orbLives = collectLives(rows, "sprite", new Set(["gThunderboltOrbSpriteTemplate"]));
  const flashLives = collectLives(rows, "sprite", new Set(["gSparkElectricityFlashingSpriteTemplate"]));
  const arcLives = collectLives(rows, "sprite", new Set(["gElectricitySpriteTemplate"]));
  const targetBank = side === "player-back" ? 2 : 1;
  const taskShape = taskLives.map((life) => [life.slot, life.label, life.start, life.end]);
  const engineEdges = edges(rows, (row) => row.engine.activeBattler);
  const cross = (left: string, right: string): number => rows.slice(1).filter((row, age) => same(row[left], rows[age]![right])).length;
  const changeRows = rows.map((row, age) => ({
    age, frame: row.frame, rawRgbSha256: row.sha256, ...pixelChange(rgb[age - 1], rgb[age]),
    source: { active: row.animScriptActive, ptr: row.scriptPtr, parity: row.scriptPtrParity, age, offset: row.scriptOffset, wait: row.scriptWait, owner: row.scriptOwner, args: row.animArgs },
    counts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount, tasks: row.tasks.length, sprites: row.sprites.length },
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, raw: task.raw, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map(compactSprite),
    spriteFlags: row.spriteFlags, spriteOrder: row.spriteOrder,
    animationBattlers: row.animationBattlers, battlerSprites: row.battlerSprites,
    registers: row.registers, battleBg: row.battleBg, bgVram: row.bgVram,
    tags: { tile: row.tileTags, palette: row.paletteTags },
    audio: { SE1: { header: row.audio.SE1.songHeaderIdentity.symbol, status: row.audio.SE1.status, tracks: row.audio.SE1.tracks }, SE2: { header: row.audio.SE2.songHeaderIdentity.symbol, status: row.audio.SE2.status, tracks: row.audio.SE2.tracks } },
    animationRng: row.animationRng, immutableState: row.immutableState, digests: digestRow(row),
  }));
  const pointerEdges = sourcePointerEdges(rows);
  const argEdges = edges(rows, (row) => row.animArgs);
  const fadedChanges = transitions(rows, (row) => row.fadedPalette);
  const hardwareChanges = transitions(rows, (row) => row.hardwarePalette);
  const targetRange = side === "player-back" ? [272, 287] : [256, 271];
  const bgChanges = rows.flatMap((row, age) => age && row.fadedPalette.slice(16, 64).some((value: number, i: number) => value !== rows[age - 1]!.fadedPalette[16 + i]) ? [age] : []);
  const targetChanges = rows.flatMap((row, age) => age && row.fadedPalette.slice(targetRange[0], targetRange[1] + 1).some((value: number, i: number) => value !== rows[age - 1]!.fadedPalette[targetRange[0] + i]) ? [age] : []);
  const softwareOamChanges = transitions(rows, (row) => row.softwareOam);
  const hardwareOamChanges = transitions(rows, (row) => row.hardwareOam);
  const softwareMatrixChanges = transitions(rows, (row) => row.softwareMatrices);
  const hardwareMatrixChanges = transitions(rows, (row) => row.hardwareMatrices);
  const tags = { loaded: { spark: 10001, shock3: 10282, spark2: 10011 }, edges: { tile: edges(rows, (row) => [row.tileTags.includes(10001), row.tileTags.includes(10282), row.tileTags.includes(10011)]), palette: edges(rows, (row) => [row.paletteTags.includes(10001), row.paletteTags.includes(10282), row.paletteTags.includes(10011)]) } };
  const latches = {
    hardwareOamEqualsPrecedingSoftware: `${cross("hardwareOam", "softwareOam")}/${rows.length - 1}`,
    hardwareMatricesEqualsPrecedingSoftware: `${cross("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`,
    hardwarePaletteEqualsPrecedingFaded: `${cross("hardwarePalette", "fadedPalette")}/${rows.length - 1}`,
    ordinaryOam: { bufferToHardware: "RAM+1", comparableRows: `${cross("hardwareOam", "softwareOam")}/${rows.length - 1}`, creationExceptions: [] },
    taskAxes: { taskStarts: [28, 37, 46], segmentCreationRows: BOLT_EVENTS, sourceToBuffer: "RAM+1", bufferToHardware: "RAM+1", sourceTaskToDisplay: "RAM+2", segmentCount: 15 },
    electricityArcs: { creationRows: ARC_EVENTS, sourceToBuffer: "same-row", bufferToHardware: "RAM+1", sourceToDisplay: "RAM+1", count: 8 },
    freshAffineMatrices: { allocations: [{ age: 105, indices: [0, 3, 4, 5, 6, 7, 8, 9] }, { age: 106, indices: [10] }], firstEightDisplay: "source+2", lateMatrixDisplay: "source+1", hardwareChangeAge: 107, count: 9 },
    paletteTransfer: { fadedToHardware: "RAM+1", comparableRows: `${cross("hardwarePalette", "fadedPalette")}/${rows.length - 1}`, exceptions: [] },
    softwareOamChanges, hardwareOamChanges, softwareMatrixChanges, hardwareMatrixChanges,
  };
  return {
    schema: "thunderbolt-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    source: { pointerEdges, argEdges, observedAddresses: probe.sourcePointerContract.observedAddresses, observedParities: probe.sourcePointerContract.observedParities, sourceSymbols: probe.sourceSymbols },
    lifecycle: {
      electricBolt: { taskStarts: [28, 37, 46], taskRows: taskLives.filter((life) => life.label === "AnimTask_ElectricBolt_Step").map((life) => ({ slot: life.slot, start: life.start, end: life.end, initialData: life.first.data, terminalData: life.last.data, steps: life.ages.map((age) => rows[age]!.tasks.find((task: Json) => task.slot === life.slot && task.func.symbol === life.label)!.data[10]) })), creationRows: BOLT_EVENTS, segmentCount: 15 },
      orb: orbLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end, first: compactSprite(life.first), last: compactSprite(life.last) })),
      flashing: flashLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end, first: compactSprite(life.first), last: compactSprite(life.last) })),
      electricity: arcLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end, first: compactSprite(life.first), last: compactSprite(life.last) })),
      tasks: taskLives.map((life) => ({ slot: life.slot, func: life.label, start: life.start, end: life.end, initialData: life.first.data, terminalData: life.last.data })),
    },
    transfers: { latches, palette: { fadedChanges, hardwareChanges, targetChanges, bgChanges, unfadedChanges: transitions(rows, (row) => row.unfadedPalette) }, tags },
    audio: { SE1: edges(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE1.status]), SE2: edges(rows, (row) => [row.audio.SE2.songHeaderIdentity.symbol, row.audio.SE2.status]) },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), partyPresentationEdges: edges(rows, (row) => sha(JSON.stringify(row.parties))), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRng: { distinct: new Set(rows.map((row) => row.animationRng)).size, edges: edges(rows, (row) => row.animationRng) }, enginePresentationEdges: engineEdges },
    changeMap: { tool: "tools/compare/frame-changemap.py", text: paths[side].changeMapText, rows: changeRows },
    rows: changeRows,
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length },
    orientation: { targetBank, sourceTaskArgs: rows[28]!.animArgs },
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side];
  const compressed = readFileSync(resolve(root, config.denseState));
  const json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "thunderbolt-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 85, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === ROOT_START && probe.sourcePointerContract.endExclusive === ROOT_END && same(probe.sourcePointerContract.observedAddresses, POINTERS) && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: complete pointer contract`);
  invariant(probe.sourceSymbols.ElectricityEffect === EFFECT_START, `${side}: shared source symbol`);
  invariant(rows.length === 237 && probe.sourceWindow.frameCount === 237 && probe.sourceWindow.sourceFrameCount === 209, `${side}: dense window`);
  const expectedStart = side === "player-back" ? 79 : 83;
  invariant(rows[0]!.frame === expectedStart && rows.at(-1)!.frame === expectedStart + 236, `${side}: frame bounds`);
  const rootRows = rows.flatMap((row, age) => row.scriptOwner === "Move_THUNDERBOLT" ? [age] : []);
  invariant(same(rootRows, [...Array.from({ length: 173 }, (_, age) => age), ...Array.from({ length: 36 }, (_, age) => age + 201)]), `${side}: root ownership rows`);
  invariant(rows.slice(173, 201).every((row) => EFFECT_POINTERS.includes(row.scriptPtr) && row.scriptOwner === null && row.scriptOffset === null), `${side}: ElectricityEffect rows`);
  invariant(rows.every((row) => POINTERS.includes(row.scriptPtr) && row.scriptPtrParity === (row.scriptPtr & 1) && (row.scriptOwner === null || (row.scriptPtr >= ROOT_START && row.scriptPtr < ROOT_END && row.scriptOffset === row.scriptPtr - ROOT_START))), `${side}: pointer/age rows`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: complete retained row ${age}`));
  invariant(rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  const map = derive(side, probe, rows, rgb);
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const changemapText = readFileSync(resolve(root, config.changeMapText), "utf8");
  invariant(changemapText.includes(`${rows[0]!.frame}  (first frame)`) && changemapText.includes(`${rows.at(-1)!.frame}  `), `${side}: frame-changemap receipt`);
  const listed = new Map([...changemapText.matchAll(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/gmu)].map((match) => [Number(match[1]), [Number(match[2]), [Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])]]]));
  for (const row of map.changeMap.rows.slice(1)) if (row.changedPixels !== 0) invariant(same(listed.get(row.frame), [row.changedPixels, row.bounds]), `${side}: normalized/displayed change map ${row.age}`);
  const taskShape = map.lifecycle.tasks.map((life: Json) => [life.slot, life.func, life.start, life.end]);
  invariant(same(taskShape, [[0, "AnimTask_BlendSpriteColor_Step2", 10, 14], [0, "AnimTask_ElectricBolt_Step", 28, 37], [1, "AnimTask_ElectricBolt_Step", 37, 46], [0, "AnimTask_ElectricBolt_Step", 46, 55], [0, "AnimTask_BlendSpriteColor_Step2", 57, 68], [0, "AnimTask_BlendSpriteColor_Step2", 70, 81], [0, "Task_WaitAndPlaySE", 173, 191], [0, "AnimTask_BlendSpriteColor_Step2", 230, 234]]), `${side}: task lifecycles`);
  const bolts = map.lifecycle.electricBolt.taskRows;
  invariant(bolts.length === 3 && bolts.every((task: Json) => task.end - task.start === 9 && same(task.steps, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) && same(map.lifecycle.electricBolt.creationRows, BOLT_EVENTS), `${side}: 3 bolt tasks/15 segments`);
  const expectedBoltData = side === "player-back" ? [[200, -12, 0], [152, -12, 0], [176, -20, 1]] : [[96, 28, 0], [48, 28, 0], [72, 20, 1]];
  invariant(same(bolts.map((task: Json) => task.initialData.slice(0, 3)), expectedBoltData), `${side}: bolt task axes`);
  invariant(map.lifecycle.orb.length === 1 && map.lifecycle.orb[0].start === 105 && map.lifecycle.orb[0].end === 149 && map.lifecycle.orb[0].first.callback === "AnimThunderboltOrb_Step" && map.lifecycle.orb[0].first.matrixNum === 0 && map.lifecycle.orb[0].last.data[3] === 0, `${side}: one SHOCK_3 affine orb`);
  invariant(map.lifecycle.flashing.length === 8 && map.lifecycle.flashing.every((life: Json) => life.start >= 105 && life.start <= 106 && life.end === 148 && life.first.callback === "AnimSparkElectricityFlashing_Step"), `${side}: eight flashing sparks`);
  invariant(same(map.lifecycle.flashing.map((life: Json) => life.first.data[7]), [40, 104, 168, 232, 72, 136, 200, 48]), `${side}: flashing phases`);
  invariant(same(map.lifecycle.electricity.map((life: Json) => [life.slot, life.start, life.end]), [[3, 173, 178], [4, 177, 182], [3, 181, 186], [4, 185, 190], [3, 189, 194], [4, 193, 198], [3, 197, 202], [4, 201, 206]]), `${side}: eight ElectricityEffect arcs`);
  invariant(same([...new Set(map.rows.flatMap((row: Json) => row.sprites.filter((sprite: Json) => sprite.template === "gElectricBoltSegmentSpriteTemplate").map((sprite: Json) => sprite.callback)))], ["AnimElectricBoltSegment"]), `${side}: bolt callback`);
  invariant(same(map.transfers.latches.hardwareOamEqualsPrecedingSoftware, "236/236") && same(map.transfers.latches.hardwarePaletteEqualsPrecedingFaded, "236/236") && same(map.transfers.latches.hardwareMatricesEqualsPrecedingSoftware, "235/236"), `${side}: whole transfer latches`);
  invariant(map.transfers.latches.taskAxes.sourceTaskToDisplay === "RAM+2" && map.transfers.latches.electricityArcs.sourceToDisplay === "RAM+1" && map.transfers.latches.freshAffineMatrices.count === 9 && map.transfers.latches.freshAffineMatrices.hardwareChangeAge === 107, `${side}: mechanism latches`);
  invariant(same(map.transfers.palette.targetChanges, Array.from({ length: 26 }, (_, age) => age + 57)) && same(map.transfers.palette.bgChanges, [10, 11, 12, 13, 14, 15, 108, 116, 124, 132, 230, 231, 232, 233, 234, 235]), `${side}: palette phases`);
  invariant(same(map.audio.SE1, [[0, ["se_ball_open", 2147483648]], [106, ["se_m_hyper_beam", 0]], [107, ["se_m_hyper_beam", 3]], [132, ["se_m_hyper_beam", 2147483648]], [173, ["se_m_thunderbolt2", 0]], [174, ["se_m_thunderbolt2", 3]], [192, ["se_m_thunderbolt2", 0]], [193, ["se_m_thunderbolt2", 3]], [227, ["se_m_thunderbolt2", 2147483648]]]) && same(map.audio.SE2, [[0, ["se_select", 2147483648]], [28, ["se_m_thunderbolt", 0]], [29, ["se_m_thunderbolt", 3]], [37, ["se_m_thunderbolt", 0]], [38, ["se_m_thunderbolt", 3]], [46, ["se_m_thunderbolt", 0]], [47, ["se_m_thunderbolt", 3]], [81, ["se_m_thunderbolt", 2147483648]]]), `${side}: audio`);
  invariant(map.state.battlersStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRng.distinct === 236 && same(map.state.enginePresentationEdges, [[0, 2], [105, side === "player-back" ? 0 : 1], [106, 2]]) && same(map.state.partyPresentationEdges.map((edge: Json) => edge[0]), side === "player-back" ? [0] : [0, 105, 106]), `${side}: immutable/gameplay state and animation RNG`);
  invariant(same(map.transfers.tags.edges.tile, [[0, [false, false, false]], [1, [true, false, false]], [4, [true, true, false]], [7, [true, true, true]], [236, [false, false, false]]]) && same(map.transfers.tags.edges.palette, map.transfers.tags.edges.tile) && map.transfers.tags.loaded.spark === 10001 && map.transfers.tags.loaded.shock3 === 10282 && map.transfers.tags.loaded.spark2 === 10011, `${side}: tags`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0, `${side}: owned cleanup`);
  const current = {
    scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), changeMapText: config.changeMapText, changeMapTextSha256: sha(changemapText), sourceWindow: probe.sourceWindow, lifecycle: map.lifecycle, latches: map.transfers.latches, palette: map.transfers.palette, tags: map.transfers.tags, audio: map.audio, state: map.state, cleanup: map.cleanup,
  };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: receipt/map drift`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/thunderbolt-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true);
  const opponent = verifySide("opponent-front", undefined, true);
  const repeats = { "player-back": process.env.THUNDERBOLT_PLAYER_REPEAT, "opponent-front": process.env.THUNDERBOLT_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.THUNDERBOLT_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.THUNDERBOLT_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) {
    const path = repeats[side]; invariant(path, `${side}: repeat probe required`);
    const digest = sha(readFileSync(path)); const first = side === "player-back" ? player : opponent;
    invariant(digest === first.probeJsonSha256 && repeatRgb[side] === first.rawRgbSequenceSha256, `${side}: fresh repeat differs`);
    first.repeatProbeJsonSha256 = digest; first.repeatRawRgbSequenceSha256 = repeatRgb[side];
  }
  const fixture = {
    schema: "thunderbolt-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_THUNDERBOLT", moveId: 85, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, frameChangeMaps: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    source: { root: { start: "0x082ca40a", endExclusive: "0x082ca5c0", byteLength: 438, romSha256: "ca15d4b50d2497386adf8bc20d9c5d18b7cac1548c9e22c598af7f662904016f", sourceByteLength: 2344, sourceSha256: "7968c51a5ede726a575865fb70a529998721ef534807c2bd0dde454273cf705a" }, subroutine: { symbol: "ElectricityEffect", start: "0x082d7bea", endExclusive: "0x082d7c75", byteLength: 139, romSha256: "f26be8a47153d4d67aff5a54063a070dbdf84b497c94f80531519c9eef614245", sourceByteLength: 708, sourceSha256: "0b2bb54bb5f380502bda828532a7a36b44443d36f26aa681bebe156f4157630a" }, audit: "tools/compare/thunderboltSourceAudit.ts", probe: "tools/compare/thunderboltProbe.py", verifier: "tools/compare/thunderboltEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 237, "opponent-front": 237 }, rawRgbRows: { "player-back": 237, "opponent-front": 237 }, latchVerdict: "MOVE_THUNDERBOLT independently measures RAM+1 buffer transfers, RAM+2 task-created bolt display, RAM+1 ElectricityEffect display, and the nine fresh affine matrix allocations with the age-105 two-frame creation exception; no sibling latch is inherited.", verdict: "Evidence only: MOVE_THUNDERBOLT remains unsupported and conveys no sibling or move acceptance." },
    orientations: { "player-back": player, "opponent-front": opponent }, controls: { inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSiblingCredit: false, siblingStatuses: { MOVE_SPARK: "exact", MOVE_THUNDER_WAVE: "exact", MOVE_ZAP_CANNON: "unsupported", MOVE_SHOCK_WAVE: "unsupported" } },
    acceptanceVerdict: "Unsupported evidence checkpoint: MOVE_THUNDERBOLT remains unsupported; no sibling or move acceptance is conveyed.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const result: Json = {};
for (const side of ["player-back", "opponent-front"] as const) result[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, lifecycle: item.lifecycle, latches: item.latches, palette: item.palette, audio: item.audio, state: item.state, cleanup: item.cleanup }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
