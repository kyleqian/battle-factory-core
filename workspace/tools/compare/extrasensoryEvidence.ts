/** Hermetic verifier and normalized change-map builder for MOVE_EXTRASENSORY. */
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
  "player-back": {
    scenario: "tools/battle-lab/mechanic-extrasensory-player-nuzleaf-opponent-shuckle.json",
    denseState: "tools/compare/evidence/extrasensory-player-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/extrasensory-player-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/extrasensory-changemap-player.json",
    startFrame: 80, attackerBank: 16, monbgBank: 8, selectedBg: "bg1", dmaDest: 0x04000014,
    attackerRegion: [40, 50, 104, 154], targetRegion: [140, 8, 212, 88], attackerSpecies: 299, targetSpecies: 213,
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-extrasensory-opponent-nuzleaf-player-shuckle.json",
    denseState: "tools/compare/evidence/extrasensory-opponent-dense-state.json.gz",
    rawRgbArchive: "tools/compare/evidence/extrasensory-opponent-raw-rgb.tar.gz",
    changeMap: "tools/compare/evidence/extrasensory-changemap-opponent.json",
    startFrame: 84, attackerBank: 17, monbgBank: 9, selectedBg: "bg2", dmaDest: 0x04000018,
    attackerRegion: [144, 8, 208, 96], targetRegion: [36, 52, 108, 128], attackerSpecies: 299, targetSpecies: 213,
  },
} satisfies Record<Side, Json>;

const ROOT_START = 0x082cefec;
const ROOT_END = 0x082cf054;
const BG_START = 0x082d7cd1;
const BG_END = 0x082d7ce5;
const ownedTasks = new Set([
  "AnimTask_BlendMonInAndOut_Step", "AnimTask_ExtrasensoryDistortion_Step",
  "AnimTask_TransparentCloneGrowAndShrink_Step", "SetPsychicBackground_Step",
  "Task_ClearMonBg", "Task_FadeToBg", "Task_UpdateMonBg",
]);

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
}
function ranges(rows: readonly Json[], select: (row: Json) => readonly Json[]): Json[] {
  const live = new Map<string, Json>(); const result: Json[] = [];
  rows.forEach((row, age) => {
    const current = new Map(select(row).map((item) => [`${item.slot}:${item.func?.symbol ?? item.template?.symbol}`, item]));
    for (const [id, item] of current) {
      const prior = live.get(id);
      if (!prior) live.set(id, { id, start: age, first: item, last: item }); else prior.last = item;
    }
    for (const [id, life] of live) if (!current.has(id)) { result.push({ ...life, end: age - 1 }); live.delete(id); }
  });
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result;
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 128 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${archive}: RGB archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${archive}: RGB row ${row.frame}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer, region: readonly number[] = [0, 0, 239, 159]): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let y = region[1]!; y <= region[3]!; y += 1) for (let x = region[0]!; x <= region[2]!; x += 1) {
    const offset = (y * 240 + x) * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function bankTransitions(rows: readonly Json[], key: "unfadedPalette" | "fadedPalette" | "hardwarePalette", bank: number): number[] {
  return transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
}

function normalizedMap(side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const config = paths[side], rows = probe.frames as Json[];
  const taskLives = ranges(rows, (row) => row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol))).map((life) => ({ id: life.id, start: life.start, end: life.end, initialData: life.first.data, finalData: life.last.data }));
  const battlerSlots = new Set(rows[0]!.animationBattlers.spriteIds as number[]);
  const cloneLives = ranges(rows, (row) => row.sprites.filter((sprite: Json) => sprite.template.symbol === "gMultiuseSpriteTemplate" && !battlerSlots.has(sprite.slot))).map((life) => ({
    id: life.id, start: life.start, end: life.end, slot: life.first.slot, callback: life.first.callback.symbol,
    matrixNum: life.first.matrixNum, subpriority: life.first.subpriority,
    first: { attr: life.first.attr, x: life.first.x, y: life.first.y, x2: life.first.x2, y2: life.first.y2, matrix: life.first.matrix },
    last: { attr: life.last.attr, x: life.last.x, y: life.last.y, x2: life.last.x2, y2: life.last.y2, matrix: life.last.matrix },
  }));
  const rowMap = rows.map((row, age) => {
    const distortion = row.tasks.find((task: Json) => task.func.symbol === "AnimTask_ExtrasensoryDistortion_Step");
    const clone = row.sprites.find((sprite: Json) => sprite.template.symbol === "gMultiuseSpriteTemplate" && !battlerSlots.has(sprite.slot));
    const sliceStart = distortion?.data[14] ?? 0, sliceEnd = distortion?.data[15] ?? -1;
    return {
      age, frame: row.frame, active: row.animScriptActive, pointer: row.scriptPtr, parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
      visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
      clone: clone ? { slot: clone.slot, callback: clone.callback.symbol, attr: clone.attr, x: clone.x, y: clone.y, x2: clone.x2, y2: clone.y2, matrixNum: clone.matrixNum, matrix: clone.matrix, subpriority: clone.subpriority, order: row.spriteOrder.indexOf(clone.slot) } : null,
      scanline: { state: row.scanline.state, srcBuffer: row.scanline.srcBuffer, dmaDest: row.scanline.dmaDest, dmaControl: row.scanline.dmaControl, slice: [sliceStart, sliceEnd], bankSliceSha256: row.scanlineBuffers.map((bank: number[]) => sha(JSON.stringify(bank.slice(sliceStart, sliceEnd + 1)))) },
      battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
      battleBg: row.battleBg, registers: row.registers,
      audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, status: row.audio[channel].status, panX: row.audio[channel].tracks.map((track: Json) => track.panX), digest: sha(JSON.stringify(row.audio[channel])) }])),
      allocation: { matrixBitmap: row.resourceAllocators.matrixBitmap, spriteOrderSha256: sha(JSON.stringify(row.spriteOrder)), paletteTagsSha256: sha(JSON.stringify(row.paletteTags)), tileTagsSha256: sha(JSON.stringify(row.tileTags)) },
      digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), unfadedPalette: sha(JSON.stringify(row.unfadedPalette)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), bgVram: sha(JSON.stringify(row.bgVram)), gameplay: sha(JSON.stringify([row.parties, row.battlers, row.engine, row.immutableState, row.rawBattleState])) },
      rgbSha256: row.sha256, frameChange: changedPixels(rgb[age - 1], rgb[age]!), attackerRegionChange: changedPixels(rgb[age - 1], rgb[age]!, config.attackerRegion), targetRegionChange: changedPixels(rgb[age - 1], rgb[age]!, config.targetRegion),
    };
  });
  const predecessor = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  const stable = (key: string): boolean => rows.every((row) => same(row[key], rows[0]![key]));
  return {
    schema: "extrasensory-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, sourcePointerContracts: probe.sourcePointerContracts, topology: probe.topology,
    lifecycle: { tasks: taskLives, clones: cloneLives },
    latches: {
      hardwareOamEqualsPrecedingSoftware: predecessor("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: predecessor("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: predecessor("hardwarePalette", "fadedPalette"),
      oamExceptions: rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []), matrixExceptions: rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []), paletteExceptions: rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []),
      scanlineStageSourceLives: [[42, 66], [68, 92], [94, 118]], scanlineStageDisplayedLives: [[43, 67], [69, 93], [95, 119]], cloneSourceLife: [94, 117], cloneOamDisplayedLife: [95, 118], cloneAffineDisplayedChanges: [96, 118],
    },
    transitions: {
      scanlineState: transitions(rows, (row) => row.scanline.state), scanlineSrcBuffer: transitions(rows, (row) => row.scanline.srcBuffer), scanlineBuffers: transitions(rows, (row) => row.scanlineBuffers),
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)),
      battleBg: transitions(rows, (row) => row.battleBg), bgVram: transitions(rows, (row) => row.bgVram), matrixBitmap: transitions(rows, (row) => row.resourceAllocators.matrixBitmap), spriteOrder: transitions(rows, (row) => row.spriteOrder),
      palettes: { backgroundUnfaded: bankTransitions(rows, "unfadedPalette", 2), backgroundFaded: bankTransitions(rows, "fadedPalette", 2), backgroundHardware: bankTransitions(rows, "hardwarePalette", 2), attackerFaded: bankTransitions(rows, "fadedPalette", config.attackerBank), attackerHardware: bankTransitions(rows, "hardwarePalette", config.attackerBank), monbgUnfaded: bankTransitions(rows, "unfadedPalette", config.monbgBank), monbgFaded: bankTransitions(rows, "fadedPalette", config.monbgBank), monbgHardware: bankTransitions(rows, "hardwarePalette", config.monbgBank) },
      audio: transitions(rows, (row) => row.audio), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), animationRng: transitions(rows, (row) => row.animationRng),
    },
    state: { partiesStable: stable("parties"), battlersStable: stable("battlers"), engineStable: stable("engine"), immutableStable: stable("immutableState"), rawBattleStateStable: stable("rawBattleState"), gameplayRngStable: transitions(rows, (row) => row.immutableState.rngValue).length === 0 },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, cloneSprites: rows.at(-1)!.sprites.filter((sprite: Json) => sprite.template.symbol === "gMultiuseSpriteTemplate" && !battlerSlots.has(sprite.slot)).length, scanlineState: rows.at(-1)!.scanline.state },
    rows: rowMap,
  };
}

function verifySide(side: Side, receipt?: Json, writeMap = false): Json {
  const config = paths[side], compressed = readFileSync(resolve(root, config.denseState)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(probe.schema === "extrasensory-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 326, `${side}: identity`);
  invariant(same(probe.sourcePointerContracts, [{ start: ROOT_START, endExclusive: ROOT_END }, { start: BG_START, endExclusive: BG_END }]) && probe.sourcePointerContract.start === ROOT_START && probe.sourcePointerContract.endExclusive === ROOT_END && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows.length === 161 && probe.sourceWindow.startFrame === config.startFrame && probe.sourceWindow.endFrame === config.startFrame + 160 && probe.sourceWindow.sourceFrameCount === 161 && rows.at(-1)!.animScriptActive === false, `${side}: complete dense window`);
  for (const [age, row] of rows.entries()) invariant(row.frame === config.startFrame + age && row.scriptOwner === "Move_EXTRASENSORY" && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.scanlineBuffers.length === 2 && row.scanlineBuffers.every((bank: number[]) => bank.length === 320) && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, `${side}: complete row ${age}`);
  const rgb = rgbFrames(resolve(root, config.rawRgbArchive), rows), map = normalizedMap(side, probe, rgb), mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, config.changeMap), mapBytes);
  const lives = (name: string): number[][] => map.lifecycle.tasks.filter((life: Json) => life.id.endsWith(`:${name}`)).map((life: Json) => [life.start, life.end]);
  invariant(same(lives("Task_FadeToBg"), [[1, 37], [120, 158]]) && same(lives("SetPsychicBackground_Step"), [[20, 140]]) && same(lives("Task_UpdateMonBg"), [[39, 122]]) && same(lives("Task_ClearMonBg"), [[120, 122]]), `${side}: Psychic BG and monbg lifecycles`);
  invariant(same(lives("AnimTask_BlendMonInAndOut_Step"), [[42, 64], [68, 90]]) && same(lives("AnimTask_ExtrasensoryDistortion_Step"), [[42, 66], [68, 92], [94, 118]]) && same(lives("AnimTask_TransparentCloneGrowAndShrink_Step"), [[94, 118]]), `${side}: owned task ordering`);
  const distortion = map.lifecycle.tasks.filter((life: Json) => life.id.endsWith(":AnimTask_ExtrasensoryDistortion_Step"));
  invariant(same(distortion.map((life: Json) => [life.initialData[11], life.initialData[12], life.initialData[13]]), [[2, 5, 64], [2, 5, 192], [4, 4, 0]]) && distortion.every((life: Json) => life.initialData[10] === (side === "player-back" ? -144 : -40) && life.initialData[14] === (side === "player-back" ? 8 : 48) && life.initialData[15] === (side === "player-back" ? 72 : 112)), `${side}: all three distortion programs`);
  for (const [start, end] of [[42, 66], [68, 92], [94, 118]]) for (let age = start; age <= end; age += 1) {
    const task = rows[age]!.tasks.find((item: Json) => item.func.symbol === "AnimTask_ExtrasensoryDistortion_Step")!;
    invariant(rows[age]!.scanline.dmaDest === config.dmaDest && same(rows[age]!.scanlineBuffers[0].slice(task.data[14], task.data[15] + 1), rows[age]!.scanlineBuffers[1].slice(task.data[14], task.data[15] + 1)), `${side}: stage bank equality ${age}`);
  }
  invariant(same(map.transitions.scanlineState, [42, 66, 67, 68, 92, 93, 94, 118, 119]), `${side}: scanline activation/cleanup`);
  for (const [sourceStart, visibleStart, , visibleEnd] of [[42, 43, 66, 67], [68, 69, 92, 93], [94, 95, 118, 119]])
    invariant(map.rows[visibleStart].targetRegionChange.changedPixels > 0 && map.rows[visibleEnd].targetRegionChange.changedPixels > 0, `${side}: distortion displayed body ${sourceStart}`);
  // The middle program starts/ends on global palette transitions, so only the
  // unconfounded first and third legs may use raw target pixels to prove RAM+1.
  invariant(map.rows[42].targetRegionChange.changedPixels === 0 && map.rows[66].targetRegionChange.changedPixels === 0 && map.rows[94].targetRegionChange.changedPixels === 0 && map.rows[118].targetRegionChange.changedPixels === 0, `${side}: unconfounded distortion RAM+1 edges`);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === "160/160" && map.latches.hardwareMatricesEqualPrecedingSoftware === "136/160" && map.latches.hardwarePaletteEqualsPrecedingFaded === "159/160" && !map.latches.oamExceptions.length && same(map.latches.matrixExceptions, Array.from({ length: 24 }, (_, index) => index + 95)) && same(map.latches.paletteExceptions, [39]), `${side}: whole-buffer latches`);
  invariant(map.lifecycle.clones.length === 1 && map.lifecycle.clones[0].start === 94 && map.lifecycle.clones[0].end === 117 && map.lifecycle.clones[0].slot === 3 && map.lifecycle.clones[0].callback === "SpriteCallbackDummy" && map.lifecycle.clones[0].matrixNum === 0, `${side}: clone lifecycle`);
  const scale = [244,232,219,208,196,185,175,166,158,150,144,138,144,150,158,166,175,185,196,208,219,232,244,256];
  invariant(same(rows.slice(94, 118).map((row) => row.softwareMatrices[0][0]), scale), `${side}: clone grow/shrink source scale`);
  for (let age = 95; age <= 118; age += 1) invariant(same(rows[age]!.hardwareMatrices[0], rows[age - 2]!.softwareMatrices[0]), `${side}: clone matrix RAM+2 ${age}`);
  invariant(map.rows[94].attackerRegionChange.changedPixels === 0 && map.rows[95].attackerRegionChange.changedPixels === 0 && map.rows[96].attackerRegionChange.changedPixels > 0 && same(map.transitions.matrixBitmap, [94, 119]) && same(map.transitions.spriteOrder, [94, 119]), `${side}: clone allocation/display/teardown`);
  const attackerFaded = [...Array.from({ length: 24 }, (_, index) => index + 42), ...Array.from({ length: 24 }, (_, index) => index + 68)];
  const attackerHardware = attackerFaded.map((age) => age + 1);
  invariant(same(map.transitions.palettes.attackerFaded, attackerFaded) && same(map.transitions.palettes.attackerHardware, attackerHardware), `${side}: both attacker blend palette programs RAM+1`);
  invariant(same(map.transitions.bgVram, [20, 40, 122, 124, 141]) && same(map.transitions.battleBg, [39, 123]) && same(map.transitions.palettes.backgroundUnfaded, [20, 141]) && map.transitions.palettes.backgroundFaded[0] === 20 && map.transitions.palettes.backgroundFaded.at(-1) === 141 && map.transitions.palettes.backgroundHardware[0] === 21 && map.transitions.palettes.backgroundHardware.at(-1) === 142, `${side}: Psychic BG VRAM/palette schedule`);
  invariant(same(map.transitions.palettes.monbgUnfaded, [39]) && same(map.transitions.palettes.monbgFaded, [39]) && same(map.transitions.palettes.monbgHardware, [39]), `${side}: defender-partner monbg same-row setup`);
  invariant(same(map.transitions.registers.bldcnt, [2, 38, 42, 120, 121, 159]) && same(map.transitions.registers.bldalpha, [42, 120]) && map.transitions.registers[`${config.selectedBg}hofs`][0] === 40 && map.transitions.registers[`${config.selectedBg}hofs`].at(-1) === 124, `${side}: blend/selected-BG registers`);
  invariant(rows[42]!.audio.SE2.songHeaderIdentity.symbol === "se_m_bind" && rows[42]!.audio.SE2.status === 0 && rows[42]!.audio.SE2.tracks[0].panX === (side === "player-back" ? 63 : -63) && rows[68]!.audio.SE2.songHeaderIdentity.symbol === "se_m_bind" && rows[68]!.audio.SE2.status === 0 && rows[94]!.audio.SE1.songHeaderIdentity.symbol === "se_m_leer" && rows[94]!.audio.SE1.status === 0 && rows[94]!.audio.SE1.tracks[0].panX === (side === "player-back" ? -64 : 63), `${side}: audio starts/pans`);
  invariant(rows[0]!.battlers[side === "player-back" ? "player" : "opponent"].species === config.attackerSpecies && rows[0]!.battlers[side === "player-back" ? "opponent" : "player"].species === config.targetSpecies, `${side}: legal orientation`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStateStable && map.state.gameplayRngStable && new Set(rows.map((row) => row.animationRng)).size === 159, `${side}: opaque gameplay state/RNG`);
  invariant(map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.cloneSprites === 0 && map.cleanup.scanlineState === 0, `${side}: first inactive cleanup`);
  const current = {
    scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.denseState, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rawRgbArchive, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rawRgbArchive))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.changeMap, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow,
    summary: { lifecycle: map.lifecycle, latches: map.latches, transitions: map.transitions, state: map.state, cleanup: map.cleanup },
  };
  if (receipt) invariant(receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256 && readFileSync(resolve(root, config.changeMap)).equals(mapBytes), `${side}: retained receipts`);
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/extrasensory-evidence.json");
if (process.argv.includes("--write")) {
  const result = { "player-back": verifySide("player-back", undefined, true), "opponent-front": verifySide("opponent-front", undefined, true) };
  const repeatPaths = { "player-back": process.env.EXTRASENSORY_PLAYER_REPEAT, "opponent-front": process.env.EXTRASENSORY_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.EXTRASENSORY_PLAYER_REPEAT_RGB, "opponent-front": process.env.EXTRASENSORY_OPPONENT_REPEAT_RGB };
  for (const side of ["player-back", "opponent-front"] as const) {
    invariant(repeatPaths[side] && repeatRgb[side], `${side}: repeat inputs required`);
    invariant(sha(readFileSync(repeatPaths[side]!)) === result[side].probeJsonSha256 && repeatRgb[side] === result[side].rawRgbSequenceSha256, `${side}: twice-fresh mismatch`);
    Object.assign(result[side], { repeatProbeJsonSha256: result[side].probeJsonSha256, repeatRawRgbSequenceSha256: repeatRgb[side] });
  }
  writeFileSync(fixturePath, `${JSON.stringify({
    schema: "extrasensory-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_EXTRASENSORY", moveId: 326, status: "unsupported-evidence-checkpoint", coverageCredit: false,
    track: { id: "extrasensory-distortion-clone", fulfilled: false, representatives: ["MOVE_EXTRASENSORY"], novelComponentSiblings: [] },
    controls: { named: { MOVE_SKILL_SWAP: "exact", MOVE_AMNESIA: "exact", MOVE_CONFUSION: "exact", MOVE_FUTURE_SIGHT: "exact", MOVE_PSYCHIC: "exact" }, transferCredit: false },
    evidenceScope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, allThreeDistortionStages: true, bothAttackerBlendPrograms: true, cloneGrowthShrinkTeardown: true, defenderPartnerMonbg: true, psychicBackground: true, paletteRegistersAudioAllocationOrder: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    source: { audit: "tools/compare/extrasensorySourceAudit.ts", probe: "tools/compare/extrasensoryProbe.py", verifier: "tools/compare/extrasensoryEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 161, "opponent-front": 161 }, totalRows: 322, firstInactiveCleanupRetained: true }, orientations: result,
    verdict: "Evidence only. MOVE_EXTRASENSORY is staged, not exact; no reducer, typed seam, compositor, actual-core framebuffer acceptance, sibling promotion, shared-component transfer, or fulfilled-track credit is claimed.",
  }, null, 2)}\n`);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false && coverage.entries.find((entry: Json) => entry.move === "MOVE_EXTRASENSORY")?.status === "staged", "staged no-credit coverage boundary");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "extrasensory-distortion-clone");
invariant(track && track.fulfilled === false && same(track.representatives, ["MOVE_EXTRASENSORY"]), "unfulfilled move-owned track boundary");
const result = { "player-back": verifySide("player-back", fixture.orientations["player-back"]), "opponent-front": verifySide("opponent-front", fixture.orientations["opponent-front"]) };
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, value]) => [side, { sourceWindow: value.sourceWindow, probeJsonSha256: value.probeJsonSha256, rawRgbSequenceSha256: value.rawRgbSequenceSha256, changeMapSha256: value.changeMapSha256, rows: value.sourceWindow.frameCount, latches: value.summary.latches, cleanup: value.summary.cleanup }])), boundary: fixture.evidenceScope }, null, 2));
