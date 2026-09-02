/** Hermetic bilateral dense evidence verifier for MOVE_ZAP_CANNON. */
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
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const ROOT_START = 137179800;
const ROOT_END = 137180029;
const ROOT_POINTERS = [137179800, 137179803, 137179806, 137179976, 137179997, 137180017, 137180027, 137180028];
const EFFECT_POINTERS = [137198591, 137198608, 137198625, 137198642, 137198659, 137198676, 137198693];
const POINTERS = [...ROOT_POINTERS, ...EFFECT_POINTERS];
const ownedTemplates = new Set(["gZapCannonBallSpriteTemplate", "gZapCannonSparkSpriteTemplate", "gElectricitySpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_ShakeMon2_Step", "Task_WaitAndPlaySE"]);
const paths = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-zap-cannon-player-forretress-opponent-shuckle.json",
    denseState: "tools/compare/evidence/zap-cannon-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/zap-cannon-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/zap-cannon-changemap-player.json",
    changeMapText: "tools/compare/evidence/zap-cannon-changemap-player.txt",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-zap-cannon-opponent-forretress-player-shuckle.json",
    denseState: "tools/compare/evidence/zap-cannon-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/zap-cannon-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/zap-cannon-changemap-opponent.json",
    changeMapText: "tools/compare/evidence/zap-cannon-changemap-opponent.txt",
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
    changed += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: changed, bounds: changed ? [minX, minY, maxX, maxY] : null };
}
function collectLives(rows: readonly Json[], kind: "sprite" | "task", labels: Set<string>): Life[] {
  const active = new Map<string, Life>(); const result: Life[] = [];
  rows.forEach((row, age) => {
    const current = new Map<string, Json>(); const values = kind === "sprite" ? row.sprites : row.tasks;
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
  return result.sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function compactSprite(sprite: Json): Json {
  return { slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, raw: sprite.raw, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, subpriority: sprite.subpriority, flags: sprite.flags, invisible: sprite.invisible, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data };
}
function digestRow(row: Json): Json {
  const fields = ["tasks", "sprites", "softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices", "fadedPalette", "unfadedPalette", "hardwarePalette", "parties", "battlers", "engine", "immutableState", "animationRng", "battleBg", "bgVram", "registers", "audio", "tileTags", "paletteTags", "spriteFlags", "spriteOrder"];
  return Object.fromEntries(fields.map((field) => [field, sha(JSON.stringify(row[field]))]));
}
function audioEdges(rows: readonly Json[], channel: string): unknown[][] {
  return edges(rows, (row) => [row.audio[channel].songHeaderIdentity.symbol, row.audio[channel].status]);
}

function derive(side: Side, probe: Json, rows: Json[], rgb: readonly Buffer[]): Json {
  const sprites = collectLives(rows, "sprite", ownedTemplates);
  const sparks = sprites.filter((life) => life.label === "gZapCannonSparkSpriteTemplate");
  const ball = sprites.filter((life) => life.label === "gZapCannonBallSpriteTemplate");
  const electricity = sprites.filter((life) => life.label === "gElectricitySpriteTemplate");
  const tasks = collectLives(rows, "task", ownedTasks);
  const cross = (hardware: string, software: string): number => rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length;
  const exceptions = (hardware: string, software: string): number[] => rows.slice(1).flatMap((row, age) => same(row[hardware], rows[age]![software]) ? [] : [age + 1]);
  const matrixAllocations: Json[] = [];
  const seenMatrices = new Set<number>();
  rows.forEach((row, age) => {
    const fresh = row.sprites.filter((sprite: Json) => sprite.template.symbol === "gZapCannonSparkSpriteTemplate" && !seenMatrices.has(sprite.matrixNum));
    if (fresh.length) { matrixAllocations.push({ age, indices: fresh.map((sprite: Json) => sprite.matrixNum) }); fresh.forEach((sprite: Json) => seenMatrices.add(sprite.matrixNum)); }
  });
  const changeRows = rows.map((row, age) => ({
    age, frame: row.frame, rawRgbSha256: row.sha256, ...pixelChange(rgb[age - 1], rgb[age]),
    source: { active: row.animScriptActive, ptr: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait, owner: row.scriptOwner, args: row.animArgs },
    counts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount, tasks: row.tasks.length, sprites: row.sprites.length },
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, raw: task.raw, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).map(compactSprite),
    spriteFlags: row.spriteFlags, spriteOrder: row.spriteOrder, animationBattlers: row.animationBattlers, battlerSprites: row.battlerSprites,
    engine: row.engine, registers: row.registers, battleBg: row.battleBg, bgVram: row.bgVram,
    tags: { tile: row.tileTags, palette: row.paletteTags },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { header: row.audio[channel].songHeaderIdentity.symbol, status: row.audio[channel].status, tracks: row.audio[channel].tracks }])),
    animationRng: row.animationRng, immutableState: row.immutableState,
    surfaces: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam, softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices, fadedPalette: row.fadedPalette, unfadedPalette: row.unfadedPalette, hardwarePalette: row.hardwarePalette },
    digests: digestRow(row),
  }));
  const loadedTags = { blackBall2: 10171, spark2: 10011 };
  const tags = { loaded: loadedTags, edges: { tile: edges(rows, (row) => [row.tileTags.includes(10171), row.tileTags.includes(10011)]), palette: edges(rows, (row) => [row.paletteTags.includes(10171), row.paletteTags.includes(10011)]) } };
  const latches = {
    hardwareOamEqualsPrecedingSoftware: `${cross("hardwareOam", "softwareOam")}/${rows.length - 1}`,
    hardwareMatricesEqualsPrecedingSoftware: `${cross("hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`,
    hardwarePaletteEqualsPrecedingFaded: `${cross("hardwarePalette", "fadedPalette")}/${rows.length - 1}`,
    hardwareOamMatrixExceptions: exceptions("hardwareOam", "softwareOam"),
    hardwareMatrixExceptions: exceptions("hardwareMatrices", "softwareMatrices"),
    hardwarePaletteExceptions: exceptions("hardwarePalette", "fadedPalette"),
    affineMatrices: { allocations: matrixAllocations, softwareChanges: transitions(rows, (row) => row.softwareMatrices), hardwareChanges: transitions(rows, (row) => row.hardwareMatrices), count: seenMatrices.size },
    paletteTransfer: { fadedChanges: transitions(rows, (row) => row.fadedPalette), unfadedChanges: transitions(rows, (row) => row.unfadedPalette), hardwareChanges: transitions(rows, (row) => row.hardwarePalette), fadedToHardware: "RAM+1" },
    sourceToBuffer: "same-row", bufferToHardware: "RAM+1",
  };
  const life = (items: Life[]) => items.map((item) => ({ slot: item.slot, start: item.start, end: item.end, first: compactSprite(item.first), last: compactSprite(item.last), ages: item.ages }));
  return {
    schema: "zap-cannon-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow,
    source: { pointerEdges: edges(rows, (row) => [row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.scriptOwner]), observedAddresses: probe.sourcePointerContract.observedAddresses, observedParities: probe.sourcePointerContract.observedParities, sourceSymbols: probe.sourceSymbols },
    lifecycle: { ball: life(ball), sparks: life(sparks), electricity: life(electricity), tasks: tasks.map((item) => ({ slot: item.slot, func: item.label, start: item.start, end: item.end, ages: item.ages, initialData: item.first.data, terminalData: item.last.data })) },
    transfers: { latches, tags, activeBattlerEdges: edges(rows, (row) => row.engine.activeBattler), targetX2Edges: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]), audio: { SE1: audioEdges(rows, "SE1"), SE2: audioEdges(rows, "SE2") } },
    state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRng: { distinct: new Set(rows.map((row) => row.animationRng)).size, edges: edges(rows, (row) => row.animationRng) }, partyEdges: edges(rows, (row) => sha(JSON.stringify(row.parties))) },
    changeMap: { tool: "tools/compare/frame-changemap.py", text: paths[side].changeMapText, rows: changeRows }, rows: changeRows,
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length },
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side]; const compressed = readFileSync(resolve(root, config.denseState)); const json = gunzipSync(compressed); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(probe.schema === "zap-cannon-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 192, `${side}: identity`);
  invariant(probe.setup.schemaVersion === 1 && probe.setup.mode === "mechanicLab" && probe.setup.profile === "battle-scene-on" && probe.setup.level === 50 && probe.setup.challengeNum === 2 && probe.setup.battleNum === 2 && probe.setup.trainerId === 110 && probe.setup.sourceInitialized && probe.setup.customPartiesBuiltBeforeBattle, `${side}: legal staged setup`);
  invariant(probe.sourcePointerContract.start === ROOT_START && probe.sourcePointerContract.endExclusive === ROOT_END && same(probe.sourcePointerContract.observedAddresses, POINTERS) && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: complete pointer contract`);
  invariant(rows.length === 112 && probe.sourceWindow.frameCount === 112 && probe.sourceWindow.sourceFrameCount === 84, `${side}: dense window`);
  const expectedStart = side === "player-back" ? 80 : 84;
  invariant(rows[0]!.frame === expectedStart && rows.at(-1)!.frame === expectedStart + 111, `${side}: frame bounds`);
  const rootRows = rows.flatMap((row, age) => row.scriptOwner === "Move_ZAP_CANNON" ? [age] : []);
  invariant(same(rootRows, [...Array.from({ length: 57 }, (_, age) => age), ...Array.from({ length: 27 }, (_, age) => age + 85)]), `${side}: root ownership rows`);
  invariant(rows.slice(57, 85).every((row) => EFFECT_POINTERS.includes(row.scriptPtr) && row.scriptOwner === null && row.scriptOffset === null), `${side}: ElectricityEffect rows`);
  invariant(rows.every((row) => POINTERS.includes(row.scriptPtr) && row.scriptPtrParity === (row.scriptPtr & 1) && (row.scriptOwner === null || (row.scriptPtr >= ROOT_START && row.scriptPtr < ROOT_END && row.scriptOffset === row.scriptPtr - ROOT_START))), `${side}: pointer rows`);
  rows.forEach((row, age) => invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: complete retained row ${age}`));
  invariant(rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows); const map = derive(side, probe, rows, rgb); const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const changemapText = readFileSync(resolve(root, config.changeMapText), "utf8"); const finalFrame = rows.at(-1)!.frame;
  invariant(changemapText.includes(`${rows[0]!.frame}  (first frame)`) && new RegExp(`(?:^|[ -])${finalFrame}(?:\\s|$)`, "m").test(changemapText), `${side}: frame change map`);
  const listed = new Map([...changemapText.matchAll(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/gmu)].map((match) => [Number(match[1]), [Number(match[2]), [Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])]]]));
  for (const row of map.changeMap.rows.slice(1)) if (row.changedPixels !== 0) invariant(same(listed.get(row.frame), [row.changedPixels, row.bounds]), `${side}: displayed change map ${row.age}`);
  const expectedSparkStarts = side === "player-back" ? [[4, 7, 36], [5, 7, 36], [7, 7, 36], [9, 7, 36], [10, 7, 36], [11, 7, 36], [12, 8, 36], [13, 8, 36]] : [[4, 7, 36], [5, 7, 36], [7, 7, 36], [9, 7, 36], [10, 7, 36], [11, 7, 36], [12, 7, 36], [13, 8, 36]];
  invariant(map.lifecycle.sparks.map((life: Json) => [life.slot, life.start, life.end]).toString() === expectedSparkStarts.toString(), `${side}: eight orbiting spark lifecycles`);
  invariant(same(map.lifecycle.ball.map((life: Json) => [life.slot, life.start, life.end]), [[3, 7, 38]]), `${side}: BLACK_BALL_2 lifecycle`);
  invariant(same(map.lifecycle.electricity.map((life: Json) => [life.slot, life.start, life.end]), [[3, 57, 62], [4, 61, 66], [3, 65, 70], [4, 69, 74], [3, 73, 78], [4, 77, 82], [3, 81, 86], [4, 85, 90]]), `${side}: ElectricityEffect lifecycle`);
  invariant(same(map.lifecycle.tasks.map((life: Json) => [life.slot, life.func, life.start, life.end]), [[0, "AnimTask_ShakeMon2_Step", 40, 47], [0, "Task_WaitAndPlaySE", 57, 75]]), `${side}: task lifecycle`);
  invariant(same(map.transfers.activeBattlerEdges, [[0, 2], [7, side === "player-back" ? 0 : 1], [8, 2]]) && same(map.transfers.targetX2Edges, [[0, [0, 0]], [40, [-4, 0]], [42, [4, 0]], [44, [-4, 0]], [46, [4, 0]], [48, [0, 0]]]), `${side}: target presentation`);
  invariant(map.transfers.latches.hardwareOamEqualsPrecedingSoftware === "111/111" && map.transfers.latches.hardwareMatricesEqualsPrecedingSoftware === "110/111" && map.transfers.latches.hardwarePaletteEqualsPrecedingFaded === "111/111" && same(map.transfers.latches.hardwareMatrixExceptions, [8]), `${side}: independent transfer latches`);
  invariant(same(map.transfers.latches.paletteTransfer.fadedChanges, [1, 4]) && same(map.transfers.latches.paletteTransfer.unfadedChanges, [1, 4]) && same(map.transfers.latches.paletteTransfer.hardwareChanges, [2, 5]), `${side}: palette phases`);
  invariant(same(map.transfers.tags.edges.tile, [[0, [false, false]], [1, [true, false]], [4, [true, true]], [111, [false, false]]]) && same(map.transfers.tags.edges.palette, map.transfers.tags.edges.tile), `${side}: resource tags`);
  invariant(same(map.transfers.audio.SE1, [[0, ["se_ball_open", 2147483648]], [7, ["se_m_thunder_wave", 0]], [8, ["se_m_thunder_wave", 3]], [57, ["se_m_thunderbolt2", 0]], [58, ["se_m_thunderbolt2", 3]], [76, ["se_m_thunderbolt2", 0]], [77, ["se_m_thunderbolt2", 3]], [111, ["se_m_thunderbolt2", 2147483648]]]) && same(map.transfers.audio.SE2, [[0, ["se_select", 2147483648]]]), `${side}: audio`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.immutableStable && map.state.gameplayRngTransitions.length === 0 && map.state.animationRng.distinct === 111, `${side}: gameplay/animation state`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0, `${side}: owned cleanup`);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), changeMapText: config.changeMapText, changeMapTextSha256: sha(changemapText), sourceWindow: probe.sourceWindow, lifecycle: map.lifecycle, latches: map.transfers.latches, palette: map.transfers.latches.paletteTransfer, tags: map.transfers.tags, audio: map.transfers.audio, state: map.state, cleanup: map.cleanup };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: receipt/map drift`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/zap-cannon-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", undefined, true); const opponent = verifySide("opponent-front", undefined, true);
  const repeats = { "player-back": process.env.ZAP_CANNON_PLAYER_REPEAT, "opponent-front": process.env.ZAP_CANNON_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.ZAP_CANNON_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.ZAP_CANNON_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const repeat = repeats[side]; invariant(repeat && repeatRgb[side], `${side}: repeat receipt required`); const first = side === "player-back" ? player : opponent; const repeatHash = sha(readFileSync(repeat)); const probeEqual = repeatHash === first.probeJsonSha256; const rgbEqual = repeatRgb[side] === first.rawRgbSequenceSha256; invariant(probeEqual && rgbEqual, `${side}: repeat differs probe=${probeEqual} rgb=${rgbEqual}`); first.repeatProbeJsonSha256 = repeatHash; first.repeatRawRgbSequenceSha256 = repeatRgb[side]; }
  const fixture = {
    schema: "zap-cannon-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_ZAP_CANNON", moveId: 192, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, frameChangeMaps: true, legalBilateralParties: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 112, "opponent-front": 112 }, rawRgbRows: { "player-back": 112, "opponent-front": 112 }, latchVerdict: "Both orientations independently measure whole hardware OAM and faded palette at RAM+1 (111/111), with affine hardware matrices at 110/111 and the sole age-8 creation exception; no sibling latch is inherited.", verdict: "Evidence only: MOVE_ZAP_CANNON remains unsupported and conveys no sibling or move acceptance." },
    source: { root: { start: "0x82d3298", endExclusive: "0x82d337d", byteLength: 229, romSha256: "ff30a37584554d149a66d53722ce184adf1d29d07807e474dd9e34e0bde652de", sourceByteLength: 1111, sourceSha256: "418959fa65972b2bb4d1b5bedfa222bf8096973219b9ef5fd5ebd39558deb587" }, subroutine: { symbol: "ElectricityEffect", start: "0x82d7bea", endExclusive: "0x82d7c75", byteLength: 139, romSha256: "f26be8a47153d4d67aff5a54063a070dbdf84b497c94f80531519c9eef614245", sourceByteLength: 708, sourceSha256: "0b2bb54bb5f380502bda828532a7a36b44443d36f26aa681bebe156f4157630a" }, combined: { byteLength: 368, romSha256: "72db8ae9ab53ee0144c4d863f3ae43d4645d2d3ff99a314a7a3519e26015f9c6", sourceByteLength: 1819, sourceSha256: "28e889b712da5e1b393b1694031b40278b941737e8386370b5b33253bf7e6bce" }, audit: "tools/compare/zapCannonSourceAudit.ts", probe: "tools/compare/zapCannonProbe.py", verifier: "tools/compare/zapCannonEvidence.ts" },
    controls: { inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSiblingCredit: false, siblingStatuses: { MOVE_SPARK: "exact", MOVE_THUNDERBOLT: "exact", MOVE_THUNDER_WAVE: "exact", MOVE_SHOCK_WAVE: "unsupported", MOVE_ZAP_CANNON: "unsupported" } },
    orientations: { "player-back": player, "opponent-front": opponent },
    acceptanceVerdict: "Unsupported evidence checkpoint: MOVE_ZAP_CANNON remains unsupported; spark-2-electricity remains unfulfilled; no reducer, seam, compositor, framebuffer acceptance, promotion, or sibling credit.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json; const result: Json = {};
for (const side of ["player-back", "opponent-front"] as const) result[side] = verifySide(side, fixture.orientations[side]);
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, lifecycle: item.lifecycle, latches: item.latches, palette: item.palette, tags: item.tags, audio: item.audio, state: item.state, cleanup: item.cleanup }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
