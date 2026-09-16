/** Strict hermetic verifier and normalized bilateral map generator for MOVE_OVERHEAT. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_OVERHEAT evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function paletteBank(palette: number[], bank: number): number[] { return palette.slice(bank * 16, bank * 16 + 16); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<string, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const symbol = entry.func?.symbol ?? entry.template?.symbol ?? "", id = `${entry.slot}:${symbol}`;
    slots.set(id, [...(slots.get(id) ?? []), age]);
  }
  return [...slots].flatMap(([id, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    const [slot, symbol] = id.split(":");
    return groups.map((group) => ({ slot: Number(slot), symbol, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === 230 && raw.length === 230 * bytes, `${path}: complete RGB888 archive shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB digest ${age}`);
    return frame;
  });
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const compactSprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
  const owned = (entry: Json) => ["gOverheatFlameSpriteTemplate","gBasicHitSplatSpriteTemplate","gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol);
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const banks = (palette: number[]) => Object.fromEntries([1,2,16,17,23,24].map((bank) => [bank, sha(JSON.stringify(paletteBank(palette, bank)))]));
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })), sprites: row.sprites.filter(owned).map(compactSprite),
      battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: banks(row.unfadedPalette), faded: banks(row.fadedPalette), hardware: banks(row.hardwarePalette) },
      resources: { smallEmber: [row.tileTags.indexOf(10029),row.paletteTags.indexOf(10029)], impact: [row.tileTags.indexOf(10135),row.paletteTags.indexOf(10135)], allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, battleBg: row.battleBg, audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)) },
      rng: { presentation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: sha(JSON.stringify(row.rawBattleState)) },
    };
  });
  return `${JSON.stringify({ schema: "overheat-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const taskLives = [
  { slot: 1, symbol: "Task_UpdateMonBg", start: 7, end: 188, rows: 182 },
  { slot: 0, symbol: "AnimTask_ShakeMon_Step", start: 35, end: 62, rows: 28 },
  { slot: 0, symbol: "AnimTask_ShakeMon_Step", start: 107, end: 154, rows: 48 },
  { slot: 2, symbol: "AnimTask_ShakeMon_Step", start: 138, end: 165, rows: 28 },
  { slot: 0, symbol: "Task_ClearMonBg", start: 186, end: 188, rows: 3 },
];
const hitLives = [
  { slot: 3, symbol: "gBasicHitSplatSpriteTemplate", start: 107, end: 115, rows: 9 },
  { slot: 4, symbol: "gBasicHitSplatSpriteTemplate", start: 115, end: 123, rows: 9 },
  { slot: 3, symbol: "gBasicHitSplatSpriteTemplate", start: 125, end: 133, rows: 9 },
  { slot: 3, symbol: "gBasicHitSplatSpriteTemplate", start: 135, end: 143, rows: 9 },
];
const blendLives = [
  { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 10, end: 24, rows: 15 },
  { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 35, end: 61, rows: 27 },
  { slot: 4, symbol: "gSimplePaletteBlendSpriteTemplate", start: 138, end: 153, rows: 16 },
  { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 170, end: 184, rows: 15 },
  { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 208, end: 227, rows: 20 },
];
const bgFaded = [12,15,18,172,175,178], bgHardware = bgFaded.map((age) => age + 1);
const attackerFaded = [38,41,44,47,50,53,56,140,142,144,146,148,208,210,212,214,216,218,220,222];
const attackerHardware = attackerFaded.map((age) => age + 1);

function verifySide(side: Side, config: Json, compareMap = true): Json {
  const json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), startFrame = side === "player-back" ? 75 : 80;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB sequence`);
  invariant(probe.schema === "overheat-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 315, `${side}: identity`);
  invariant(rows.length === 230 && probe.sourceWindow.startFrame === startFrame && probe.sourceWindow.endFrame === startFrame + 229 && probe.sourceWindow.frameCount === 230 && probe.sourceWindow.sourceFrameCount === 230, `${side}: complete unthinned root window`);
  invariant(probe.sourcePointerContract.start === 0x082d6694 && probe.sourcePointerContract.endExclusive === 0x082d6986 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: pointer-owned root`);
  invariant(rows.every((row, age) => row.frame === startFrame + age) && rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 753, `${side}: chronological root through first inactive cleanup`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: complete transfer banks`);

  invariant(same(ranges(rows,"tasks",() => true), taskLives), `${side}: monbg and all three ShakeMon task lives`);
  const flames = ranges(rows,"sprites",(entry) => entry.template.symbol === "gOverheatFlameSpriteTemplate");
  invariant(flames.length === 24 && same(flames.map(({start,end,rows}) => [start,end,rows]), [...Array(8).fill([64,91,28]),...Array(8).fill([72,98,27]),...Array(8).fill([80,105,26])]), `${side}: complete 8x3 flame lattice lives`);
  invariant(rows.flatMap((row) => row.sprites.filter((entry: Json) => entry.template.symbol === "gOverheatFlameSpriteTemplate")).every((entry: Json) => entry.callback.symbol === "AnimOverheatFlame_Step" && entry.matrixNum === 0), `${side}: non-affine flame callbacks`);
  invariant(same(ranges(rows,"sprites",(entry) => entry.template.symbol === "gBasicHitSplatSpriteTemplate"), hitLives), `${side}: four independent hitsplats`);
  invariant(same(ranges(rows,"sprites",(entry) => entry.template.symbol === "gSimplePaletteBlendSpriteTemplate"), blendLives), `${side}: five simple palette blend lives`);

  invariant(rows.slice(1).every((row,index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1 including flame/hit/battler creation and teardown`);
  invariant(rows.slice(1).every((row,index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: whole matrix transfer RAM+1`);
  invariant(same(transitions(rows,(row) => row.resourceAllocators.matrixBitmap), [107,115,116,124,125,134,135,144]), `${side}: hitsplat affine allocation/free order`);
  invariant(rows.slice(1).flatMap((row,age) => same(row.hardwarePalette,rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 7), `${side}: whole palette RAM+1 except monbg setup`);

  for (const bank of [1,2]) { invariant(same(transitions(rows,(row) => paletteBank(row.fadedPalette,bank)), bgFaded), `${side}: BG simple blend bank ${bank}`); invariant(same(transitions(rows,(row) => paletteBank(row.hardwarePalette,bank)), bgHardware), `${side}: BG blend RAM+1 bank ${bank}`); }
  const attackerBank = side === "player-back" ? 16 : 17;
  invariant(same(transitions(rows,(row) => paletteBank(row.fadedPalette,attackerBank)), attackerFaded) && same(transitions(rows,(row) => paletteBank(row.hardwarePalette,attackerBank)), attackerHardware), `${side}: attacker simple blends RAM+1`);
  invariant(same(transitions(rows,(row) => paletteBank(row.unfadedPalette,1)), [29,167]) && same(transitions(rows,(row) => paletteBank(row.unfadedPalette,attackerBank)), [135,205]), `${side}: backup-palette faded-copy/restore boundaries`);
  invariant(rows[26]!.scriptOffset === 50 && rows[29]!.scriptOffset === 61 && rows[167]!.scriptOffset === 690 && rows[205]!.scriptOffset === 727 && rows[229]!.scriptOffset === 753, `${side}: alloc/copy/restore/free command chronology`);

  const selectedBg = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", selectedReg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  const targetEdges = [109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139,141,143,145,147,149,151,153,155];
  invariant(same(transitions(rows,(row) => row.battlerSprites.target.x2), targetEdges), `${side}: target ShakeMon source axis`);
  invariant(same(transitions(rows,(row) => row.battleBg[selectedBg]), [7,...targetEdges,189]), `${side}: hidden target monbg source transfer`);
  invariant(same(transitions(rows,(row) => row.registers[selectedReg]), [8,...targetEdges.map((age) => age + 1),190]), `${side}: selected monbg scanout RAM+1`);
  invariant(same(transitions(rows,(row) => row.registers.bldcnt), [10,186]) && same(transitions(rows,(row) => row.registers.bldalpha), [10,186]), `${side}: direct alpha/register lifecycle`);

  invariant(same(transitions(rows,(row) => [row.tileTags.indexOf(10029),row.paletteTags.indexOf(10029)]), [1,229]), `${side}: Small Ember resource load/free`);
  invariant(same(transitions(rows,(row) => [row.tileTags.indexOf(10135),row.paletteTags.indexOf(10135)]), [4,229]), `${side}: Impact resource load/free`);
  invariant(rows[32]!.audio.SE1.songHeaderIdentity.symbol === "se_m_dragon_rage" && rows[64]!.audio.SE1.songHeaderIdentity.symbol === "se_m_flame_wheel2" && [107,115,125,135].every((age) => rows[age]!.audio.SE1.songHeaderIdentity.symbol === "se_m_fire_punch"), `${side}: six-command audio identity/order`);
  invariant(same(transitions(rows,(row) => [row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE2.songHeaderIdentity.symbol]), [32,64,107]), `${side}: audio identity edges`);
  invariant(same(rows.flatMap((row,age) => age && row.animationRng === rows[age - 1]!.animationRng ? [age] : []), [65,73,81,188,189]), `${side}: presentation RNG schedule`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key],rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState,rows[0]!.immutableState)), `${side}: immutable semantic gameplay state`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === (side === "player-back" ? 349 : 219) && attacker.moves.every((move: number) => move === 315), `${side}: legal source carrier`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => ["gOverheatFlameSpriteTemplate","gBasicHitSplatSpriteTemplate","gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol)) && !rows.at(-1)!.tileTags.includes(10029) && !rows.at(-1)!.tileTags.includes(10135) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0, `${side}: first inactive cleanup`);
  if (compareMap) invariant(normalizedMap(side,rows,rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  return { rows: 230, changedRows: transitions(rows,(row) => row.sha256).length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 229, flameSprites: 24, hitSplats: 4, paletteBlendSprites: 5, shakeTasks: 3, oamRamPlusOneRows: 229, matrixRamPlusOneRows: 229, paletteRamPlusOneRows: 228 };
}

export function verifyOverheatEvidence(compareMaps = true): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/overheat-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "overheat-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive",...(compareMaps ? ["changeMap"] : [])]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const auditText = execFileSync(process.execPath,["--experimental-strip-types",fixture.source.audit],{cwd:root,encoding:"utf8",maxBuffer:16 << 20});
  const audit = JSON.parse(auditText) as Json;
  invariant(sha(auditText) === fixture.source.auditRunSha256 && audit.graph.coverage.entryPresent === false && audit.graph.coverage.queueContainsMove === false && audit.graph.coverage.componentTrackPresent === false, "source repeatability/no credit");
  const data = coverage as Json;
  invariant(!data.entries.some((entry: Json) => entry.move === "MOVE_OVERHEAT") && !data.queue.includes("MOVE_OVERHEAT") && !data.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OVERHEAT")), "coverage/queue/track absence");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side,verifySide(side,fixture.orientations[side],compareMaps)])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/overheat-evidence.json").toString("utf8")) as Json;
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixture.orientations[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root,fixture.orientations[side].changeMap),normalizedMap(side,probe.frames,rawFrames(fixture.orientations[side].rawRgbArchive,probe.frames)));
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyOverheatEvidence(),null,2));
