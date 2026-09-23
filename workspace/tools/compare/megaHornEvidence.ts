/** Strict verifier and normalized latch-map builder for MOVE_MEGAHORN evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-megahorn-player-seaking-opponent-onix.json", denseState: "tools/compare/evidence/mega-horn-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/mega-horn-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/mega-horn-changemap-player.json", rows: 177, frames: [211, 387], monbgBank: 8, selectedBg: "bg1", fadeEnd: 174 },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-megahorn-opponent-seaking-player-onix.json", denseState: "tools/compare/evidence/mega-horn-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/mega-horn-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/mega-horn-changemap-opponent.json", rows: 176, frames: [212, 387], monbgBank: 9, selectedBg: "bg2", fadeEnd: 173 },
} satisfies Record<Side, Json>;
const ownedTemplates = new Set(["gMegahornHornSpriteTemplate", "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"]);
const ownedTasks = new Set(["AnimTask_ShakeMon_Step", "AnimTask_ShakeMonInPlace_Step", "AnimTask_UpdateSlidingBg", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const sourceStart = 0x082d1924;
const sourceEnd = 0x082d1a11;

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function edges(rows: readonly Json[], select: (row: Json) => unknown): Json[] { return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []); }
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = byFrame.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`); return frame; });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function lifecycles(rows: readonly Json[], kind: "sprites" | "tasks"): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const selected = row[kind].filter((item: Json) => kind === "sprites" ? ownedTemplates.has(item.template?.symbol) : ownedTasks.has(item.func?.symbol));
    const current = new Map(selected.map((item: Json) => [`${item.slot}:${kind === "sprites" ? item.template.symbol : item.func.symbol}`, item]));
    for (const [id, item] of current) { const prior = live.get(id); if (!prior) live.set(id, { id, start: age, first: item, last: item }); else prior.last = item; }
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => ({
    id: life.id, start: life.start, end: life.end,
    first: kind === "sprites" ? { slot: life.first.slot, template: life.first.template.symbol, callback: life.first.callback.symbol, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, data: life.first.data, matrix: life.first.matrix, attr: life.first.attr, subpriority: life.first.subpriority, persistentOrder: rows[life.start]!.spriteOrder.indexOf(life.first.slot) } : { slot: life.first.slot, func: life.first.func.symbol, data: life.first.data },
    last: kind === "sprites" ? { callback: life.last.callback.symbol, x: life.last.x, y: life.last.y, x2: life.last.x2, y2: life.last.y2, data: life.last.data, matrix: life.last.matrix, attr: life.last.attr, invisible: life.last.invisible } : { data: life.last.data },
  }));
}
function tagLife(rows: readonly Json[], tag: number, key: "tileTags" | "paletteTags"): Json { const ages = rows.flatMap((row, age) => row[key].includes(tag) ? [age] : []); return { first: ages[0] ?? null, last: ages.at(-1) ?? null, count: ages.length }; }
function paletteBankTransitions(rows: readonly Json[], key: "fadedPalette" | "hardwarePalette", bank: number): number[] { return transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16)); }
function battlerSprite(row: Json, battler: number): Json { return row.sprites.find((sprite: Json) => sprite.slot === row.animationBattlers.spriteIds[battler]); }

function derive(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const rows = probe.frames as Json[];
  const spriteLives = lifecycles(rows, "sprites");
  const taskLives = lifecycles(rows, "tasks");
  const wholeLatch = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const oamExceptions = rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []);
  const matrixExceptions = rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []);
  const paletteExceptions = rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []);
  const changedPaletteBanks = Array.from({ length: 32 }, (_, bank) => bank).filter((bank) => paletteBankTransitions(rows, "fadedPalette", bank).length || paletteBankTransitions(rows, "hardwarePalette", bank).length);
  const registerTransitions = Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length));
  const softwareBgTransitions = Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length));
  const resourceAllocatorTransitions = Object.fromEntries(Object.keys(rows[0]!.resourceAllocators).map((key) => [key, transitions(rows, (row) => row.resourceAllocators[key])]).filter(([, ages]) => (ages as number[]).length));
  const audioTransitions = transitions(rows, (row) => row.audio);
  const battlerAttacker = rows[0]!.animationBattlers.attacker as number;
  const battlerTarget = rows[0]!.animationBattlers.target as number;
  const normalizedRows = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
    args: row.animArgs, movePower: row.animationMovePower, moveDamage: row.animationMoveDamage,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func?.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template?.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, anim: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter, data: sprite.data, matrixNum: sprite.matrixNum, matrix: sprite.matrix, invisible: sprite.invisible, subpriority: sprite.subpriority, persistentOrder: row.spriteOrder.indexOf(sprite.slot) })),
    battlerAxes: { attacker: [battlerSprite(row, battlerAttacker).x2, battlerSprite(row, battlerAttacker).y2], target: [battlerSprite(row, battlerTarget).x2, battlerSprite(row, battlerTarget).y2] },
    hardware: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), paletteBanks: Object.fromEntries(changedPaletteBanks.map((bank) => [bank, { faded: row.fadedPalette.slice(bank * 16, bank * 16 + 16), hardware: row.hardwarePalette.slice(bank * 16, bank * 16 + 16) }])) },
    bg: { software: row.battleBg, registers: row.registers, vram: row.bgVram },
    resources: { tags: { horn: row.tileTags.includes(10153), impact: row.tileTags.includes(10135) }, allocator: sha(JSON.stringify(row.resourceAllocators)) },
    audio: { SE1: sha(JSON.stringify(row.audio.SE1)), SE2: sha(JSON.stringify(row.audio.SE2)) },
    rng: { gameplay: row.immutableState.rngValue, animation: row.animationRng },
    rawBattleState: { playerParty: sha(row.rawBattleState.playerParty), opponentParty: sha(row.rawBattleState.opponentParty), battleMons: sha(row.rawBattleState.battleMons) },
    rgbSha256: row.sha256, pixelDelta: changedPixels(rgb[age - 1], rgb[age]!),
  }));
  return {
    schema: "mega-horn-normalized-banked-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    latches: { hardwareOamEqualsPrecedingSoftware: wholeLatch("hardwareOam", "softwareOam"), hardwareMatricesEqualsPrecedingSoftware: wholeLatch("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: wholeLatch("hardwarePalette", "fadedPalette"), oamExceptions, matrixExceptions, paletteExceptions, changedPaletteBanks, selectedMonbgBank: paths[side].monbgBank, selectedBg: paths[side].selectedBg, paletteBankTransitions: Object.fromEntries(changedPaletteBanks.map((bank) => [bank, { faded: paletteBankTransitions(rows, "fadedPalette", bank), hardware: paletteBankTransitions(rows, "hardwarePalette", bank) }])), },
    lifecycle: { sprites: spriteLives, tasks: taskLives },
    transitions: { registers: registerTransitions, softwareBg: softwareBgTransitions, bgVram: transitions(rows, (row) => row.bgVram), resourceAllocators: resourceAllocatorTransitions, audio: audioTransitions, animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), attackerAxes: edges(rows, (row) => [battlerSprite(row, battlerAttacker).x2, battlerSprite(row, battlerAttacker).y2]), targetAxes: edges(rows, (row) => [battlerSprite(row, battlerTarget).x2, battlerSprite(row, battlerTarget).y2]) },
    resources: { horn: { tag: 10153, tile: tagLife(rows, 10153, "tileTags"), palette: tagLife(rows, 10153, "paletteTags") }, impact: { tag: 10135, tile: tagLife(rows, 10135, "tileTags"), palette: tagLife(rows, 10135, "paletteTags") } },
    audio: { transitions: audioTransitions, first: rows[0]!.audio, last: rows.at(-1)!.audio },
    state: { attacker: battlerAttacker, target: battlerTarget, partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)), immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue) },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ownedTemplates.has(sprite.template?.symbol)).length, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func?.symbol)).length, hornTag: tagLife(rows, 10153, "tileTags"), impactTag: tagLife(rows, 10135, "tileTags") },
    rows: normalizedRows,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side];
  const compressed = readFileSync(resolve(root, config.denseState));
  const decoded = gunzipSync(compressed);
  const probe = JSON.parse(decoded.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "mega-horn-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 224, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === sourceStart && probe.sourcePointerContract.endExclusive === sourceEnd && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === config.rows && probe.sourceWindow.startFrame === config.frames[0] && probe.sourceWindow.endFrame === config.frames[1] && rows.every((row) => row.scriptOwner === "Move_MEGAHORN" && row.scriptPtr >= sourceStart && row.scriptPtr < sourceEnd), `${side}: complete pointer window`);
  for (const [age, row] of rows.entries()) invariant(row.tasks.length <= 16 && row.sprites.length <= 64 && row.spriteOrder.length === 64 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.resourceAllocators.tileBitmap.length === 256 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: dense row ${age}`);
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: inactive cleanup`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows);
  const map = derive(side, probe, rgb);
  const spriteLives = map.lifecycle.sprites as Json[];
  const taskLives = map.lifecycle.tasks as Json[];
  invariant(spriteLives.filter((life) => life.id.includes("gMegahornHornSpriteTemplate")).length === 1 && spriteLives.some((life) => life.id.includes("gMegahornHornSpriteTemplate") && life.start === 94 && life.end === 100), `${side}: horn lifecycle`);
  invariant(spriteLives.filter((life) => life.id.includes("gSlideMonToOffsetSpriteTemplate")).length === 2 && spriteLives.filter((life) => life.id.includes("gSlideMonToOriginalPosSpriteTemplate")).length === 2 && spriteLives.some((life) => life.id.includes("gBasicHitSplatSpriteTemplate") && life.start === 100 && life.end === 108) && spriteLives.some((life) => life.id.includes("gComplexPaletteBlendSpriteTemplate") && life.start === 110 && life.end === 121), `${side}: slide/hitsplat/blend lifecycles`);
  invariant(taskLives.filter((life) => life.id.includes("AnimTask_ShakeMon_Step")).some((life) => life.start === 48 && life.end === 75) && taskLives.some((life) => life.id.includes("AnimTask_ShakeMonInPlace_Step") && life.start === 110 && life.end === 130) && taskLives.some((life) => life.id.includes("AnimTask_UpdateSlidingBg") && life.start === 29 && life.end === 155) && taskLives.some((life) => life.id.includes("Task_UpdateMonBg") && life.start === 7 && life.end === 137) && taskLives.some((life) => life.id.includes("Task_ClearMonBg") && life.start === 135 && life.end === 137), `${side}: task lifecycles`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === `${rows.length - 1}/${rows.length - 1}` && map.latches.hardwareMatricesEqualsPrecedingSoftware === `${rows.length - 1}/${rows.length - 1}` && map.latches.hardwarePaletteEqualsPrecedingFaded === `${rows.length - 2}/${rows.length - 1}` && same(map.latches.oamExceptions, []) && same(map.latches.matrixExceptions, []) && same(map.latches.paletteExceptions, [7]), `${side}: independent latches`);
  invariant(same(map.transitions.bgVram, [8, 29, 137, 139, 156]) && map.transitions.registers.bg3cnt[0] === 29 && map.transitions.softwareBg[side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X"][0] === 7, `${side}: BG/register/VRAM transitions`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStateStable && map.state.gameplayRngTransitions.length === 0, `${side}: opaque gameplay state/RNG`);
  invariant(map.cleanup.ownedSprites === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.hornTag.last === rows.length - 2 && map.cleanup.impactTag.last === rows.length - 2, `${side}: resource cleanup`);
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const current = { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(decoded), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow, summary: { latches: map.latches, lifecycle: { sprites: spriteLives, tasks: taskLives }, transitions: map.transitions, resources: map.resources, audio: { transitions: map.audio.transitions }, state: map.state, cleanup: map.cleanup } };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained checksums/map`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/mega-horn-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeatPaths = { "player-back": process.env.MEGA_HORN_PLAYER_REPEAT, "opponent-front": process.env.MEGA_HORN_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.MEGA_HORN_PLAYER_REPEAT_RGB_SHA256, "opponent-front": process.env.MEGA_HORN_OPPONENT_REPEAT_RGB_SHA256 };
  for (const side of ["player-back", "opponent-front"] as const) { const repeat = repeatPaths[side]; invariant(repeat && repeatRgb[side], `${side}: repeat receipts required`); const repeatJson = readFileSync(repeat); invariant(sha(repeatJson) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: fresh repeat mismatch`); result[side].repeatProbeJsonSha256 = sha(repeatJson); result[side].repeatRawRgbSequenceSha256 = repeatRgb[side]; }
  writeFileSync(fixturePath, `${JSON.stringify({ schema: "mega-horn-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_MEGAHORN", moveId: 224, status: "unsupported-evidence", coverageCredit: false, evidenceScope: { sourceAudit: true, completePointerBody: true, completeBattleAndContestGraph: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, legalBilateralParties: true, hitLegallyConstrained: true, hornTemplateCallbackAffinePrograms: true, attackerShakeAndSlides: true, hitsplat: true, targetShakeMonInPlace: true, complexPaletteBlend: true, defenderPartnerMonbg: true, backgroundRestoreAndFade: true, audioAndResources: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, source: { rootStart: "0x082d1924", rootEndExclusive: "0x082d1a11", components: 21, novelComponents: ["asset:ANIM_TAG_HORN_HIT_2", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "visualCommand:create_megahorn_horn_sprite"], audit: "tools/compare/megaHornSourceAudit.ts", probe: "tools/compare/megaHornProbe.py", verifier: "tools/compare/megaHornEvidence.ts" }, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 177, "opponent-front": 176 }, totalRows: 353, firstInactiveCleanupRetained: true, productionFramebufferCompared: false }, orientations: result, controls: { named: { MOVE_HORN_DRILL: "exact", MOVE_SKY_UPPERCUT: "exact", MOVE_TAKE_DOWN: "exact", MOVE_MACH_PUNCH: "exact" }, transferCredit: false }, acceptanceVerdict: "Evidence only: MOVE_MEGAHORN remains staged/unsupported and megahorn-horn-control-flow remains unfulfilled; no reducer, typed seam, compositor, actual-core framebuffer acceptance, exact promotion, sibling, or shared-component credit is claimed." }, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && coverage.entries.find((entry: Json) => entry.move === "MOVE_MEGAHORN")?.status === "exact", "Megahorn exact boundary drifted");
invariant(coverage.componentTracks.find((entry: Json) => entry.id === "megahorn-horn-control-flow")?.fulfilled === true, "Megahorn novel track must be fulfilled");
const result: Json = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, repeatRawRgbSequenceSha256: fixture.orientations[side].repeatRawRgbSequenceSha256, changeMapSha256: item.changeMapSha256, rows: item.summary.cleanup.age + 1, latches: item.summary.latches, lifecycle: { sprites: item.summary.lifecycle.sprites.map((life: Json) => ({ id: life.id, start: life.start, end: life.end })), tasks: item.summary.lifecycle.tasks.map((life: Json) => ({ id: life.id, start: life.start, end: life.end })) }, state: item.summary.state, cleanup: item.summary.cleanup }])), boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } }, null, 2));
