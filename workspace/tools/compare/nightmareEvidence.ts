/** Strict hermetic verifier and normalized bilateral map generator for MOVE_NIGHTMARE. */
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
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_NIGHTMARE evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function paletteBank(palette: number[], bank: number): number[] { return palette.slice(bank * 16, bank * 16 + 16); }
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
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === 169 && raw.length === 169 * bytes, `${path}: complete RGB archive shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB digest ${age}`);
    return frame;
  });
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const compactSprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const clone = row.sprites.find((entry: Json) => entry.callback.symbol === "TranslateSpriteLinearFixedPoint");
    const banks = (palette: number[]) => Object.fromEntries([1,2,16,17].map((bank) => [bank, sha(JSON.stringify(paletteBank(palette, bank)))]));
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })), clone: clone ? compactSprite(clone) : null,
      battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) }, matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: banks(row.unfadedPalette), faded: banks(row.fadedPalette), hardware: banks(row.hardwarePalette) }, resources: sha(JSON.stringify(row.resourceAllocators)),
      registers: row.registers, battleBg: row.battleBg, bgVram: row.bgVram,
      audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)) }, rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: sha(JSON.stringify(row.rawBattleState)) },
    };
  });
  return `${JSON.stringify({ schema: "nightmare-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const taskLives = [
  { slot: 0, symbol: "Task_FadeToBg", start: 1, end: 38, rows: 38 },
  { slot: 1, symbol: "Task_UpdateMonBg", start: 40, end: 129, rows: 90 },
  { slot: 0, symbol: "AnimTask_NightmareClone_Step", start: 43, end: 125, rows: 83 },
  { slot: 2, symbol: "AnimTask_ShakeMon_Step", start: 43, end: 120, rows: 78 },
  { slot: 0, symbol: "Task_ClearMonBg", start: 127, end: 129, rows: 3 },
  { slot: 2, symbol: "Task_FadeToBg", start: 127, end: 166, rows: 40 },
];
const rootStates = [[0,0,0],[1,2,1],[40,10,1],[41,10,0],[43,38,1],[127,42,1],[168,43,0]];
const alphaEdges = [43,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,126];
const shakeEdges = Array.from({ length: 38 }, (_, index) => 45 + index * 2);
const selectedBgEdges = [40, ...shakeEdges, 130];
const selectedHardwareEdges = [41, ...shakeEdges.map((age) => age + 1), 131];

function verifySide(side: Side, config: Json, compareMap = true): Json {
  const json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), startFrame = side === "player-back" ? 987 : 1157;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB sequence`);
  invariant(probe.schema === "nightmare-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 171, `${side}: identity`);
  invariant(rows.length === 169 && probe.sourceWindow.startFrame === startFrame && probe.sourceWindow.endFrame === startFrame + 168 && probe.sourceWindow.sourceFrameCount === 169, `${side}: unthinned complete window`);
  invariant(probe.sourcePointerContract.start === 0x082cd4a3 && probe.sourcePointerContract.endExclusive === 0x082cd4f9 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: source pointer contract`);
  invariant(rows.every((row, age) => row.frame === startFrame + age), `${side}: chronological gapless ages`);
  invariant(rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && same(rows.flatMap((row, age) => !age || row.scriptOffset !== rows[age - 1]!.scriptOffset || row.scriptWait !== rows[age - 1]!.scriptWait ? [[age,row.scriptOffset,row.scriptWait]] : []), rootStates), `${side}: root cursor/waits`);
  invariant(same(rows[43]!.animArgs, [1,3,0,40,1,0,0,0]), `${side}: Nightmare task args`);
  invariant(same(ranges(rows, "tasks", () => true), taskLives), `${side}: complete task lifecycles`);
  invariant(!rows.some((row) => row.tasks.some((task: Json) => task.func.symbol?.startsWith("AnimTask_BlendMonInAndOut"))), `${side}: contest-only BlendMonInAndOut absent from legal battle body`);
  invariant(rows.every((row) => row.tasks.every((task: Json) => task.data.length === 16)), `${side}: complete 16-word task state`);

  invariant(same(ranges(rows, "sprites", (entry) => entry.callback.symbol === "TranslateSpriteLinearFixedPoint"), [{ slot: 3, symbol: "gMultiuseSpriteTemplate", start: 43, end: 122, rows: 80 }]), `${side}: clone sprite lifecycle`);
  const cloneStart = rows[43]!.sprites.find((entry: Json) => entry.callback.symbol === "TranslateSpriteLinearFixedPoint")!;
  invariant(same([cloneStart.x,cloneStart.y,cloneStart.x2,cloneStart.y2,cloneStart.subpriority,cloneStart.data.slice(0,6)], side === "player-back" ? [176,49,0,-1,40,[79,144,-112,144,-112,0]] : [72,85,-1,0,30,[79,-144,112,-144,112,4]]), `${side}: clone bilateral geometry/program`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1 including clone creation/teardown`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: whole matrices RAM+1/no clone affine allocation`);

  invariant(same(transitions(rows, (row) => row.battlerSprites.target.x2), shakeEdges), `${side}: ShakeMon source axis`);
  const bgKey = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", regKey = side === "player-back" ? "bg1hofs" : "bg2hofs";
  invariant(same(transitions(rows, (row) => row.battleBg[bgKey]), selectedBgEdges), `${side}: monbg/ShakeMon source transfer`);
  invariant(same(transitions(rows, (row) => row.registers[regKey]), selectedHardwareEdges), `${side}: selected monbg scanout RAM+1`);
  invariant(rows[120]!.tasks.some((task: Json) => task.func.symbol === "AnimTask_ShakeMon_Step" && same(task.data.slice(0,6), [side === "player-back" ? 8 : 6,1,1,0,3,0])), `${side}: ShakeMon teardown state`);

  invariant(same(transitions(rows, (row) => row.bgVram.allSha256), [20,41,129,131,148]), `${side}: Ghost BG/restore VRAM edges`);
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, 2)), [21,149]) && same(transitions(rows, (row) => paletteBank(row.hardwarePalette, 2)), [22,150]), `${side}: Ghost BG palette RAM+1`);
  invariant(same(transitions(rows, (row) => row.registers.bldalpha), alphaEdges), `${side}: clone-owned direct BLDALPHA schedule`);
  invariant(same(transitions(rows, (row) => row.registers.bldcnt), [2,39,43,126,128,167]), `${side}: fade/clone BLDCNT lifecycle`);
  invariant(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 40), `${side}: whole palette RAM+1 except monbg setup`);
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, 16)), []) && same(transitions(rows, (row) => paletteBank(row.fadedPalette, 17)), []), `${side}: no contest BlendMonInAndOut palette writes`);

  invariant(rows[43]!.audio.SE1.songHeaderIdentity.symbol === "se_m_nightmare" && same(transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE2.songHeaderIdentity.symbol]), [43]), `${side}: Nightmare audio order`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators), []), `${side}: no move-owned allocator churn`);
  invariant(same(transitions(rows, (row) => row.animationRng).length, 164) && same(rows.flatMap((row, age) => age && row.animationRng === rows[age - 1]!.animationRng ? [age] : []), [21,129,130,149]), `${side}: presentation RNG schedule`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable semantic gameplay state`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  const target = side === "player-back" ? rows[0]!.parties.opponent[0] : rows[0]!.parties.player[0];
  invariant(attacker.species === 93 && attacker.moves.includes(171) && target.status.kind === "sleep", `${side}: legal Haunter/sleeping target`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => entry.callback.symbol === "TranslateSpriteLinearFixedPoint") && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0 && rows.at(-1)!.registers.bldy === 0, `${side}: first inactive cleanup`);
  if (compareMap) invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  return { rows: 169, changedRows: transitions(rows, (row) => row.sha256).length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 168, cloneRows: 80, cloneTaskRows: 83, shakeTaskRows: 78, oamRamPlusOneRows: 168, matrixRamPlusOneRows: 168, paletteRamPlusOneRows: 167 };
}

export function verifyNightmareEvidence(compareMaps = true): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/nightmare-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "nightmare-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive",...(compareMaps ? ["changeMap"] : [])]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const auditText = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8" });
  const audit = JSON.parse(auditText) as Json;
  invariant(sha(auditText) === fixture.source.auditRunSha256 && audit.graph.track.fulfilled === false && same(audit.behavior.contestBlend.args, ["ANIM_ATTACKER","RGB_WHITE",10,2,1]), "source audit repeatability/contest coefficients/no credit");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side], compareMaps)])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/nightmare-evidence.json").toString("utf8")) as Json;
  verifyNightmareEvidence(false);
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixture.orientations[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, fixture.orientations[side].changeMap), normalizedMap(side, probe.frames, rawFrames(fixture.orientations[side].rawRgbArchive, probe.frames)));
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyNightmareEvidence(), null, 2));
