/** Strict hermetic verifier and normalized banked map generator for MOVE_SHOCK_WAVE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SHOCK_WAVE evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<string, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const symbol = entry.func?.symbol ?? entry.template?.symbol ?? "";
    const id = `${entry.slot}:${symbol}`, ages = slots.get(id) ?? []; ages.push(age); slots.set(id, ages);
  }
  return [...slots].flatMap(([id, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    const [slot, symbol] = id.split(":");
    return groups.map((group) => ({ slot: Number(slot), symbol, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function bank(palette: number[], index: number): number[] { return palette.slice(index * 16, index * 16 + 16); }
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 64 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: complete RGB archive shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB digest ${age}`);
    return frame;
  });
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const ownedTemplates = new Set(["gElectricChargingParticlesSpriteTemplate", "gGrowingShockWaveOrbSpriteTemplate", "gShockWaveProgressingBoltSpriteTemplate", "gLightningSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
  const compactSprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const paletteBanks = (palette: number[]) => Object.fromEntries([1,2,16,17,23].map((index) => [index, sha(JSON.stringify(bank(palette, index)))]));
    return {
      age, frame: row.frame, rgbSha256: row.sha256, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data, rawSha256: sha(entry.raw) })),
      sprites: row.sprites.filter((entry: Json) => ownedTemplates.has(entry.template.symbol)).map(compactSprite), battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) }, matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)) },
      palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
      resources: { tags: Object.fromEntries([10211,10212,10001,10037].map((tag) => [tag, [row.tileTags.indexOf(tag),row.paletteTags.indexOf(tag)]])), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, battleBg: row.battleBg, bgVram: sha(JSON.stringify(row.bgVram)),
      audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)) }, rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { immutable: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: Object.fromEntries(Object.entries(row.rawBattleState).map(([key, value]) => [key, sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "shock-wave-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const chargingLives = [48,48,43,43,38,38,33,33,28,28,23,23,18,18,18,18,18,18,18,18].map((rows, index) => ({ slot: [3,4,5,7,9,10,11,12,13,14,15,16,17,18,20,21,22,23,24,25][index], symbol: "gElectricChargingParticlesSpriteTemplate", start: 31 + index, end: 30 + index + rows, rows }));
const sideFacts = {
  "player-back": {
    rows: 267, startFrame: 75, cleanupAge: 266, progressingTask: { slot: 2, symbol: "AnimTask_ShockWaveProgressingBolt", start: 77, end: 157, rows: 81 }, lightningTask: { slot: 0, symbol: "AnimTask_ShockWaveLightning", start: 159, end: 193, rows: 35 },
    boltCount: 49, boltBirthDigest: "401591358add9ae4789cee96ac9d7e388de42600d42bdeeef87f88dd85930bc8", lightning: [[3,160,189],[4,162,191],[5,164,193]], shakeStart: 195, blendEnd: 260, clearStart: 262, targetBank: 17, bgKey: "gBattle_BG2_Y", bgReg: "bg2vofs", bgSetup: -57,
    probeJsonSha256: "3b88bc1b5a2e08a1f38b5e3eacb3af330db86db97d058139e248759a6fe977f2", rgbSha256: "58f1a3c9a4b31d7dccbfedf59be35ea79b34b559607629658861299d7e252b93", changedRows: 170,
  },
  "opponent-front": {
    rows: 263, startFrame: 79, cleanupAge: 262, progressingTask: { slot: 2, symbol: "AnimTask_ShockWaveProgressingBolt", start: 77, end: 151, rows: 75 }, lightningTask: { slot: 0, symbol: "AnimTask_ShockWaveLightning", start: 153, end: 189, rows: 37 },
    boltCount: 43, boltBirthDigest: "15e76b8a9c00fd945b930d60e3b9c88299ce7b470a712a1c11d30edd143a6a2c", lightning: [[3,154,183],[4,156,185],[5,158,187],[7,160,189]], shakeStart: 191, blendEnd: 256, clearStart: 258, targetBank: 16, bgKey: "gBattle_BG1_Y", bgReg: "bg1vofs", bgSetup: -18,
    probeJsonSha256: "cfa46daf1b872036de7a1335a7f03a057b6fa484f15bc68223da0beebcbe055b", rgbSha256: "9970ce05a7e3840b235fd7d85e4da29fb76aa70a66c497005be52494898b70ea", changedRows: 167,
  },
} as const;

function verifySide(side: Side, config: Json): Json {
  const facts = sideFacts[side], json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[], rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(json) === facts.probeJsonSha256 && config.probeJsonSha256 === facts.probeJsonSha256 && config.repeatProbeJsonSha256 === facts.probeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === facts.rgbSha256 && config.rawRgbSequenceSha256 === facts.rgbSha256 && config.repeatRawRgbSequenceSha256 === facts.rgbSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "shock-wave-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 351, `${side}: identity`);
  invariant(rows.length === facts.rows && probe.sourceWindow.startFrame === facts.startFrame && probe.sourceWindow.endFrame === 341 && probe.sourceWindow.frameCount === facts.rows && probe.sourceWindow.sourceFrameCount === facts.rows, `${side}: unthinned complete root window`);
  invariant(probe.sourcePointerContract.start === 0x082cf422 && probe.sourcePointerContract.endExclusive === 0x082cf4c4 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: root pointer/parities`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 161, `${side}: age zero through first inactive cleanup`);
  invariant(rows.every((row, age) => row.frame === facts.startFrame + age), `${side}: chronological gapless rows`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.unfadedPalette.length === 512 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: complete transfer banks`);
  invariant(same(transitions(rows, (row) => [row.scriptOffset,row.scriptWait]), [1,2,4,5,7,8,10,11,13,14,16,31,32,33,34,35,36,37,38,39,40,41,42,43,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,77,78,79,80,81,82,83,84,85,86,87,88,89,91,facts.lightningTask.start,facts.shakeStart,facts.shakeStart+1,facts.shakeStart+2,facts.shakeStart+3,facts.shakeStart+4,facts.shakeStart+6,facts.clearStart]), `${side}: exact cursor/wait schedule`);
  invariant(same(transitions(rows, (row) => row.animArgs), [16,31,facts.shakeStart,facts.shakeStart+6]), `${side}: exact argument schedule`);

  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gElectricChargingParticlesSpriteTemplate"), chargingLives), `${side}: every charging particle`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gGrowingShockWaveOrbSpriteTemplate"), [{ slot: 19, symbol: "gGrowingShockWaveOrbSpriteTemplate", start: 45, end: 105, rows: 61 }]), `${side}: growing orb`);
  const life = (symbol: string, values: readonly (readonly number[])[]) => values.map(([slot,start,end]) => ({ slot, symbol, start, end, rows: end! - start! + 1 }));
  const boltBirths = rows.flatMap((row, age) => row.sprites.filter((entry: Json) => entry.template.symbol === "gShockWaveProgressingBoltSpriteTemplate" && entry.data[0] === 0).map((entry: Json) => [age,entry.slot,entry.x,entry.y,entry.attr[2] & 1023,entry.data]));
  invariant(boltBirths.length === facts.boltCount && sha(JSON.stringify(boltBirths)) === facts.boltBirthDigest, `${side}: every progressing bolt birth/body seed`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gLightningSpriteTemplate"), life("gLightningSpriteTemplate", facts.lightning)), `${side}: every lightning sprite`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gSimplePaletteBlendSpriteTemplate"), [{ slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 16, end: 29, rows: 14 }]), `${side}: simple palette blend`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ElectricChargingParticles_Step"), [{ slot: 0, symbol: "AnimTask_ElectricChargingParticles_Step", start: 31, end: 79, rows: 49 }]), `${side}: charging task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShockWaveProgressingBolt"), [facts.progressingTask]), `${side}: progressing task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShockWaveLightning"), [facts.lightningTask]), `${side}: lightning task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShakeMon_Step"), [{ slot: 0, symbol: "AnimTask_ShakeMon_Step", start: facts.shakeStart, end: facts.shakeStart + 33, rows: 34 }]), `${side}: target ShakeMon task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2"), [{ slot: 2, symbol: "AnimTask_BlendSpriteColor_Step2", start: facts.shakeStart, end: facts.blendEnd, rows: 66 }]), `${side}: persistent BG palette task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_UpdateMonBg"), [{ slot: 1, symbol: "Task_UpdateMonBg", start: 13, end: facts.cleanupAge - 2, rows: facts.cleanupAge - 14 }]), `${side}: monbg update task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, symbol: "Task_ClearMonBg", start: facts.clearStart, end: facts.clearStart + 2, rows: 3 }]), `${side}: monbg clear task`);
  invariant(rows[facts.shakeStart]!.tasks.some((entry: Json) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2" && same(entry.data.slice(0,12), [14,0,3,16,0,32767,0,0,0,2,16,0])), `${side}: palette task args/body`);

  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: whole matrices RAM+1`);
  invariant(rows.every((row) => row.spriteOrder.length === 64 && new Set(row.spriteOrder).size === 64), `${side}: complete painter-order permutations`);
  invariant(rows.slice(1).flatMap((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette) ? [] : [index + 1]).every((age) => age === 13) && same(rows[13]!.hardwarePalette, rows[13]!.fadedPalette), `${side}: palette RAM+1 except same-row monbg setup`);
  const shakeEdges: Array<[number, [number, number]]> = [];
  for (let index = 0; index < 8; index++) {
    const age = facts.shakeStart + 2 + index * 4;
    shakeEdges.push([age, [0, 6]], [age + 2, [0, 0]]);
  }
  invariant(same(transitions(rows, (row) => [row.battlerSprites.target.x2,row.battlerSprites.target.y2]), shakeEdges.map(([age]) => age)), `${side}: ShakeMon source axis edges`);
  const targetRank = side === "player-back" ? 11 : 10;
  invariant(shakeEdges.every(([age, [, y]]) => rows[age]!.battlerSprites.target.y2 === y && rows[age + 1]!.hardwareOam[targetRank] === rows[age]!.softwareOam[targetRank]), `${side}: target ShakeMon values and RAM+1 OAM retained`);

  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1,4,7,10,45,106,facts.cleanupAge]), `${side}: four tags, orb matrix, and cleanup allocations`);
  const tags = [10211,10212,10001,10037];
  invariant(rows.slice(10,facts.cleanupAge).every((row) => tags.every((tag) => row.tileTags.includes(tag) && row.paletteTags.includes(tag))) && tags.every((tag) => !rows[0]!.tileTags.includes(tag) && !rows.at(-1)!.tileTags.includes(tag) && !rows.at(-1)!.paletteTags.includes(tag)), `${side}: ELECTRIC_ORBS/CIRCLE/SPARK/LIGHTNING resource lifetime`);
  invariant(rows.slice(45,106).every((row) => row.resourceAllocators.matrixBitmap === 7) && rows[44]!.resourceAllocators.matrixBitmap === 6 && rows[106]!.resourceAllocators.matrixBitmap === 6, `${side}: growing-orb matrix allocation`);
  invariant(same(transitions(rows, (row) => bank(row.fadedPalette, 23)), [1]) && same(transitions(rows, (row) => bank(row.hardwarePalette, 23)), [2]), `${side}: first loaded OBJ palette RAM+1`);
  invariant(same(transitions(rows, (row) => bank(row.fadedPalette, facts.targetBank)), [facts.shakeStart,facts.shakeStart+6]) && same(transitions(rows, (row) => bank(row.hardwarePalette, facts.targetBank)), [facts.shakeStart+1,facts.shakeStart+7]), `${side}: target black palette writes RAM+1`);
  const bgFaded = [19,23,...Array.from({ length: 17 }, (_, index) => facts.shakeStart + 2 + index * 4)];
  invariant(same(transitions(rows, (row) => bank(row.fadedPalette, 1)), bgFaded) && same(transitions(rows, (row) => bank(row.fadedPalette, 2)), bgFaded), `${side}: simple and BG blend source palette schedule`);
  invariant(same(transitions(rows, (row) => bank(row.hardwarePalette, 1)), bgFaded.map((age) => age + 1)) && same(transitions(rows, (row) => bank(row.hardwarePalette, 2)), bgFaded.map((age) => age + 1)), `${side}: simple and BG blend palette RAM+1`);

  invariant(rows[13]!.battleBg[facts.bgKey] === facts.bgSetup && rows[facts.cleanupAge - 1]!.battleBg[facts.bgKey] === 0, `${side}: attacker monbg source scroll setup/clear`);
  invariant(rows[14]!.registers[facts.bgReg] === (facts.bgSetup + 512) % 512 && rows.at(-1)!.registers[facts.bgReg] === 0, `${side}: selected monbg register setup/restore`);
  invariant(transitions(rows, (row) => row.bgVram).join() === [14,facts.cleanupAge-2,facts.cleanupAge].join(), `${side}: monbg VRAM setup/clear`);
  invariant(rows[16]!.registers.bldcnt === 16192 && rows[16]!.registers.bldalpha === 2060 && rows[facts.clearStart]!.registers.bldcnt === 0 && rows[facts.clearStart]!.registers.bldalpha === 0, `${side}: setalpha/blendoff direct registers`);
  invariant(rows[31]!.audio.SE1.songHeaderIdentity.symbol === "se_m_charge" && rows[31]!.audio.SE1.tracks[0].panX === (side === "player-back" ? -64 : 63), `${side}: CHARGE attacker pan`);
  invariant(rows[facts.lightningTask.start]!.audio.SE1.songHeaderIdentity.symbol === "se_m_tri_attack2" && rows[facts.lightningTask.start]!.audio.SE1.tracks[0].panX === (side === "player-back" ? 63 : -63), `${side}: TRI_ATTACK2 target pan`);
  invariant(rows.some((row) => row.audio.SE2.songHeaderIdentity.symbol === "se_m_thunderbolt"), `${side}: progressing-bolt callback audio`);

  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable raw ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable semantic gameplay state`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 180 && attacker.moves.every((move: number) => move === 351) && attacker.pp.reduce((sum: number, pp: number) => sum + pp, 0) === 79, `${side}: legal Flaaffy and one PP spent`);
  invariant(transitions(rows, (row) => row.animationRng).length === facts.rows - 3 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: presentation/gameplay RNG split`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => ["gElectricChargingParticlesSpriteTemplate","gGrowingShockWaveOrbSpriteTemplate","gShockWaveProgressingBoltSpriteTemplate","gLightningSpriteTemplate","gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol)) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0, `${side}: exact first inactive cleanup`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  invariant(transitions(rows, (row) => row.sha256).length === facts.changedRows, `${side}: RGB change count`);
  return { rows: facts.rows, changedRows: facts.changedRows, probeJsonSha256: facts.probeJsonSha256, rawRgbSequenceSha256: facts.rgbSha256, cleanupAge: facts.cleanupAge, oamRamPlusOneRows: facts.rows - 1, matrixRamPlusOneRows: facts.rows - 1, paletteRamPlusOneRows: facts.rows - 2, paletteSameRowExceptions: [13] };
}

export function verifyShockWaveEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/shock-wave-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "shock-wave-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit output repeatability");
  const staging = JSON.parse(file(fixture.source.stagingReceipt).toString("utf8")) as Json;
  for (const side of ["player-back","opponent-front"] as const) invariant(staging.runs[side].pp.spent === 1 && staging.runs[side].benchesSha256 && staging.runs[side].target.finalHp < staging.runs[side].target.initialHp, `${side}: linked legal PP/damage/bench receipt`);
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/shock-wave-evidence.json").toString("utf8")) as Json;
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixture.orientations[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, fixture.orientations[side].changeMap), normalizedMap(side, probe.frames, rawFrames(fixture.orientations[side].rawRgbArchive, probe.frames)));
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyShockWaveEvidence(), null, 2));
