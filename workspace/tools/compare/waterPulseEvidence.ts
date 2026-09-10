/** Strict hermetic verifier and normalized-map generator for MOVE_WATER_PULSE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const fixturePath = "tools/compare/fixtures/water-pulse-evidence.json";
const fixedPaths: Record<Side, Json> = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-water-pulse-player-lombre-opponent-onix.json",
    denseState: "tools/compare/evidence/water-pulse-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/water-pulse-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/water-pulse-changemap-player.json",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-water-pulse-opponent-lombre-player-onix.json",
    denseState: "tools/compare/evidence/water-pulse-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/water-pulse-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/water-pulse-changemap-opponent.json",
  },
};
const MOVE = "Move_WATER_PULSE";
const SOURCE_START = 0x082d6c7a;
const SOURCE_END = 0x082d6d6f;
const SMALL_TAG = 10155;
const BLUE_RING_TAG = 10288;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function file(path: string): Buffer { return readFileSync(resolve(root, path)); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function paletteBanks(palette: number[]): string[] {
  return Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
}
function lives(rows: Json[], key: "sprites" | "tasks", predicate: (entry: Json) => boolean): Json[] {
  const open = new Map<string, Json>();
  const result: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Set<string>();
    for (const entry of row[key]) if (predicate(entry)) {
      const symbol = key === "sprites" ? `${entry.template.symbol}/${entry.callback.symbol}` : entry.func.symbol;
      const identity = `${entry.slot}/${symbol}`;
      current.add(identity);
      if (!open.has(identity)) {
        const life = { slot: entry.slot, symbol, start: age, end: age };
        open.set(identity, life); result.push(life);
      }
      open.get(identity)!.end = age;
    }
    for (const identity of open.keys()) if (!current.has(identity)) open.delete(identity);
  }
  return result;
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const archive = resolve(root, path);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  const frameBytes = 240 * 160 * 3;
  invariant(names.length === rows.length && bytes.length === rows.length * frameBytes, `${path}: RGB archive shape`);
  return rows.map((row, age) => {
    invariant(basename(names[age]!) === `${String(row.frame).padStart(5, "0")}.rgb`, `${path}: RGB member ${age}`);
    const frame = bytes.subarray(age * frameBytes, (age + 1) * frameBytes);
    invariant(sha(frame) === row.sha256, `${path}: RGB row ${age}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: 0, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel++) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count++;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => [
    "gWaterPulseBubbleSpriteTemplate", "gWaterPulseRingSpriteTemplate", "gWaterPulseRingBubbleSpriteTemplate",
    "gSimplePaletteBlendSpriteTemplate",
  ].includes(sprite.template?.symbol)).map((sprite: Json) => ({
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback?.symbol, attr: sprite.attr,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible,
    subpriority: sprite.subpriority, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
  })).sort((a: Json, b: Json) => a.slot - b.slot);
}
function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((task: Json) => ["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step"].includes(task.func?.symbol))
    .map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data }));
}
function tagLife(rows: Json[], tag: number): Json {
  const ages = rows.flatMap((row, age) => row.tileTags.includes(tag) && row.paletteTags.includes(tag) ? [age] : []);
  return { tag, first: ages[0], last: ages.at(-1), count: ages.length };
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
    changedPixels: changedPixels(rgb[age - 1], rgb[age]),
    sprites: ownedSprites(row), tasks: ownedTasks(row), spriteOrder: row.spriteOrder,
    oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
    matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)) },
    palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
    tags: { tile: row.tileTags, palette: row.paletteTags },
    resources: row.resourceAllocators,
    registers: row.registers,
    battleBg: row.battleBg, bgVram: row.bgVram,
    audio: row.audio,
    battlerAxes: { attacker: [row.battlerSprites.attacker.x, row.battlerSprites.attacker.y, row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x, row.battlerSprites.target.y, row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    immutableState: row.immutableState,
    animationRng: row.animationRng, gameplayRng: row.rawBattleState.gameplayRng,
  }));
  return `${JSON.stringify({ schema: "water-pulse-normalized-banked-change-map/v1", side, sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length }, rows: mapped }, null, 2)}\n`;
}
function expectedBubbleLives(): Json[] {
  return [
    [4, 22, 60], [5, 22, 55], [7, 22, 40], [9, 22, 70], [10, 22, 50],
  ].map(([slot, start, end]) => ({ slot, symbol: "gWaterPulseBubbleSpriteTemplate/AnimWaterPulseBubble_Step", start, end }));
}
function expectedOwnedLives(): Json[] {
  return [
    { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate/AnimSimplePaletteBlend_Step", start: 10, end: 23 },
    ...expectedBubbleLives(),
    { slot: 3, symbol: "gWaterPulseRingSpriteTemplate/AnimWaterPulseRing_Step", start: 72, end: 111 },
    { slot: 4, symbol: "gWaterPulseRingSpriteTemplate/AnimWaterPulseRing_Step", start: 79, end: 118 },
    { slot: 5, symbol: "gWaterPulseRingSpriteTemplate/AnimWaterPulseRing_Step", start: 86, end: 125 },
    { slot: 7, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 86, end: 104 },
    { slot: 9, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 86, end: 104 },
    { slot: 10, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 93, end: 111 },
    { slot: 11, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 93, end: 111 },
    { slot: 12, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 100, end: 118 },
    { slot: 13, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 100, end: 118 },
    { slot: 14, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 101, end: 119 },
    { slot: 15, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 101, end: 119 },
    { slot: 7, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 108, end: 126 },
    { slot: 9, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 108, end: 126 },
    { slot: 3, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 115, end: 134 },
    { slot: 10, symbol: "gWaterPulseRingBubbleSpriteTemplate/AnimWaterPulseRingBubble", start: 115, end: 133 },
    { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate/AnimSimplePaletteBlend_Step", start: 136, end: 153 },
  ];
}
function expectedShakeAges(): number[] { return Array.from({ length: 16 }, (_, index) => 103 + index * 2); }
function verifySide(side: Side, config: Json): Json {
  const denseArchive = file(config.denseState);
  const json = gunzipSync(denseArchive);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(denseArchive) === config.denseStateSha256, `${side}: dense archive digest`);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "water-pulse-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 352, `${side}: dense identity`);
  invariant(rows.length === 160 && same(probe.sourceWindow, config.sourceWindow) && rows.every((row, age) => row.frame === config.sourceWindow.startFrame + age), `${side}: complete source window`);
  invariant(probe.sourcePointerContract.start === SOURCE_START && probe.sourcePointerContract.endExclusive === SOURCE_END
    && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.every((row) => row.scriptOwner === MOVE && row.scriptPtr >= SOURCE_START && row.scriptPtr < SOURCE_END), `${side}: source ownership`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === SOURCE_END - SOURCE_START - 1 && !rows.at(-1)!.animScriptActive, `${side}: first inactive boundary`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.tileTags.length === 128 && row.paletteTags.length === 16 && row.resourceAllocators && row.rawBattleState
    && Object.keys(row.registers).length === 21 && row.audio.SE1 && row.audio.SE2), `${side}: dense row shape`);
  invariant(same(lives(rows, "sprites", (entry) => ["gWaterPulseBubbleSpriteTemplate", "gWaterPulseRingSpriteTemplate", "gWaterPulseRingBubbleSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"].includes(entry.template?.symbol)), expectedOwnedLives()), `${side}: owned sprite lifecycles`);
  const rings = rows.flatMap((row) => row.sprites.filter((entry: Json) => entry.template?.symbol === "gWaterPulseRingSpriteTemplate"));
  const ringBubbles = rows.flatMap((row) => row.sprites.filter((entry: Json) => entry.template?.symbol === "gWaterPulseRingBubbleSpriteTemplate"));
  invariant(rings.length > 0 && ringBubbles.length > 0 && ringBubbles.every((entry: Json) => entry.matrix.length === 4)
    && ringBubbles.some((entry: Json) => entry.matrix[0] !== 256 || entry.matrix[3] !== 256), `${side}: affine/resource sprite state`);
  invariant(same(lives(rows, "tasks", (entry) => ["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step"].includes(entry.func?.symbol)), [
    { slot: 1, symbol: "Task_UpdateMonBg", start: 7, end: 157 },
    { slot: 0, symbol: "AnimTask_ShakeMon_Step", start: 101, end: 134 },
    { slot: 0, symbol: "Task_ClearMonBg", start: 155, end: 157 },
  ]), `${side}: monbg/shake task lifecycles`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: whole OAM predecessor transfer`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: whole matrix predecessor transfer`);
  const paletteExceptions = rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]);
  invariant(same(paletteExceptions, [7]), `${side}: palette predecessor exception`);
  invariant(same(transitions(rows, (row) => row.fadedPalette), [1, 4, 7, 11, 13, 15, 17, 138, 141, 144, 147])
    && same(transitions(rows, (row) => row.hardwarePalette), [2, 5, 7, 12, 14, 16, 18, 139, 142, 145, 148])
    && same(transitions(rows, (row) => row.unfadedPalette), [1, 4, 7]), `${side}: palette ramps and transfers`);
  const fadedBankEdges = (bank: number): number[] => transitions(rows, (row) => paletteBanks(row.fadedPalette)[bank]);
  const hardwareBankEdges = (bank: number): number[] => transitions(rows, (row) => paletteBanks(row.hardwarePalette)[bank]);
  const assetBankEdges = (bank: number): number[] => transitions(rows, (row) => paletteBanks(row.unfadedPalette)[bank]);
  const paletteRamp = [11, 13, 15, 17, 138, 141, 144, 147];
  invariant(same([1, 2, 3].map((bank) => fadedBankEdges(bank)), [paletteRamp, paletteRamp, paletteRamp]), `${side}: BG palette source ramp`);
  invariant(same([1, 2, 3].map(hardwareBankEdges), [[12, 14, 16, 18, 139, 142, 145, 148], [12, 14, 16, 18, 139, 142, 145, 148], [12, 14, 16, 18, 139, 142, 145, 148]]), `${side}: BG palette hardware ramp`);
  invariant(same(assetBankEdges(23), [1]) && same(assetBankEdges(24), [4]), `${side}: asset palette load`);
  const selectedBank = side === "player-back" ? 8 : 9;
  invariant(same(assetBankEdges(selectedBank), [7]) && same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[selectedBank]), [7]), `${side}: selected BG palette`);
  invariant(same(transitions(rows, (row) => row.bgVram), [8, 157, 159]), `${side}: monbg VRAM lifecycle`);
  const bgPrefix = side === "player-back" ? "gBattle_BG1" : "gBattle_BG2";
  invariant(same(transitions(rows, (row) => row.battleBg[`${bgPrefix}_X`]), side === "player-back" ? [7, 101, 158] : [7, 158])
    && same(transitions(rows, (row) => row.battleBg[`${bgPrefix}_Y`]), [7, ...expectedShakeAges(), 158]), `${side}: target shake BG axes`);
  const scrollAges = Array.from({ length: 16 }, (_, index) => 104 + index * 2);
  const selectedReg = side === "player-back" ? "bg1" : "bg2";
  invariant(same(transitions(rows, (row) => row.registers[`${selectedReg}cnt`]), [8])
    && same(transitions(rows, (row) => row.registers[`${selectedReg}hofs`]), side === "player-back" ? [8, 102, 159] : [8, 159])
    && same(transitions(rows, (row) => row.registers[`${selectedReg}vofs`]), [8, ...scrollAges, 159]), `${side}: selected BG register transfer`);
  invariant(rows.every((row) => row.registers.bldcnt === 0 && row.registers.bldalpha === 0 && row.registers.bldy === 0), `${side}: simple palette blend uses no BLD registers`);
  invariant(same(transitions(rows, (row) => row.tileTags), [1, 4, 159]) && same(transitions(rows, (row) => row.paletteTags), [1, 4, 159])
    && same(tagLife(rows, SMALL_TAG), { tag: SMALL_TAG, first: 1, last: 158, count: 158 })
    && same(tagLife(rows, BLUE_RING_TAG), { tag: BLUE_RING_TAG, first: 4, last: 158, count: 155 }), `${side}: asset tag lifecycles`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1, 4, 72, 79, 86, 93, 100, 101, 105, 108, 112, 115, 119, 120, 126, 127, 134, 135, 159]), `${side}: allocator transitions`);
  invariant(same(transitions(rows, (row) => row.spriteOrder), [10, 22, 24, 41, 51, 56, 61, 71, 72, 79, 86, 93, 100, 101, 105, 108, 112, 115, 119, 120, 126, 127, 134, 135, 136, 154]), `${side}: sprite order transitions`);
  invariant(same(transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]), [10, 72])
    && rows[10]!.audio.SE1.songHeaderIdentity.symbol === "se_m_bubble3" && rows[72]!.audio.SE1.songHeaderIdentity.symbol === "se_m_giga_drain"
    && rows[10]!.audio.SE1.tracks[0]!.panX === (side === "player-back" ? -64 : 63)
    && rows[72]!.audio.SE1.tracks[0]!.panX === (side === "player-back" ? -64 : 63)
    && rows.every((row) => row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4), `${side}: SE1/SE2 audio`);
  const expectedAnimationEdges = [...Array.from({ length: 156 }, (_, age) => age + 1), 159];
  invariant(same(transitions(rows, (row) => row.animationRng), expectedAnimationEdges)
    && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: animation/gameplay RNG ownership`);
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable raw ${key}`);
  for (const key of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: immutable ${key}`);
  const shakeRows = rows.filter((row) => row.tasks.some((task: Json) => task.func?.symbol === "AnimTask_ShakeMon_Step"));
  invariant(shakeRows[0]!.tasks.find((task: Json) => task.func.symbol === "AnimTask_ShakeMon_Step")!.data[0] === shakeRows[0]!.animationBattlers.spriteIds[shakeRows[0]!.animationBattlers.target]
    && same(transitions(rows, (row) => row.battlerSprites.target.y2), expectedShakeAges())
    && same(transitions(rows, (row) => row.battlerSprites.target.x2), side === "player-back" ? [101] : []), `${side}: target ShakeMon axes`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0
    && ownedSprites(rows.at(-1)!).length === 0 && !rows.at(-1)!.tileTags.includes(SMALL_TAG) && !rows.at(-1)!.tileTags.includes(BLUE_RING_TAG)
    && rows.at(-1)!.resourceAllocators.matrixBitmap === rows[0]!.resourceAllocators.matrixBitmap, `${side}: first inactive cleanup`);
  const map = normalizedMap(side, rows, rgb);
  invariant(sha(file(config.changeMap)) === config.changeMapSha256 && file(config.changeMap).toString("utf8") === map, `${side}: normalized map drift`);
  const changedRows = transitions(rows, (row) => row.sha256).length;
  const expectedChangedRows = side === "player-back" ? 119 : 121;
  invariant(changedRows === expectedChangedRows, `${side}: raw RGB changed-row count`);
  return { rows: rows.length, changedRows, dense: config.probeJsonSha256, rawRgb: config.rawRgbSequenceSha256, map: config.changeMapSha256, sourceWindow: config.sourceWindow, ownedSprites: ownedSprites(rows[rows.length - 1]!).length };
}

function verifySource(fixture: Json): void {
  for (const key of ["audit", "probe", "sharedProbe", "stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key} digest`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit output drift");
}
export function verifyWaterPulseEvidence(): Json {
  const fixture = JSON.parse(file(fixturePath).toString("utf8")) as Json;
  invariant(fixture.schema === "water-pulse-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_WATER_PULSE" && fixture.moveId === 352
    && fixture.status === "unsupported-dense-evidence-checkpoint" && fixture.coverageCredit === false, "Water Pulse evidence boundary drift");
  invariant(fixture.scope.completePointerBody && fixture.scope.fullDenseRowsRetained && fixture.scope.rawRgbRetained && fixture.scope.twiceFreshByteIdentical
    && fixture.scope.normalizedBankedMapsRetained && !fixture.scope.productionChanged && !fixture.scope.reducerAdded && !fixture.scope.typedSceneOnSeam
    && !fixture.scope.compositorAdded && !fixture.scope.coveragePromotion && !fixture.scope.componentTrackFulfilled && !fixture.scope.siblingCredit, "evidence-only scope drift");
  verifySource(fixture);
  const orientations: Json = {};
  for (const side of ["player-back", "opponent-front"] as const) {
    const config = fixture.orientations[side];
    for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) invariant(sha(file(config[key])) === config[`${key}Sha256`], `${side}: ${key} digest`);
    orientations[side] = verifySide(side, config);
  }
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back", "opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixedPaths[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, fixedPaths[side].changeMap), normalizedMap(side, probe.frames, rawFrames(fixedPaths[side].rawRgbArchive, probe.frames)));
    console.log(`wrote ${basename(fixedPaths[side].changeMap)}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyWaterPulseEvidence(), null, 2));
}
