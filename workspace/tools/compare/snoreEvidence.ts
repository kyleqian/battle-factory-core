/** Hermetic dense bilateral evidence/latch verifier for MOVE_SNORE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SNORE evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function lives(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<string, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const symbol = entry.func?.symbol ?? entry.template?.symbol ?? "", id = `${entry.slot}:${symbol}`, ages = slots.get(id) ?? [];
    ages.push(age); slots.set(id, ages);
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
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 16 * 1024 * 1024 }), bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: complete raw archive`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB ${age}`);
    return frame;
  });
}
function compactSprite(entry: Json): Json { return { slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data }; }
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const bank = (palette: number[], index: number) => sha(JSON.stringify(palette.slice(index * 16, index * 16 + 16)));
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: [row.visualTaskCount,row.soundTaskCount],
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      sprites: row.sprites.filter((entry: Json) => ["gSnoreZSpriteTemplate","gShakeMonOrPlatformSpriteTemplate"].includes(entry.template.symbol)).map(compactSprite),
      battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) }, matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: Object.fromEntries([1,2,16,17,23].map((index) => [index, { unfaded: bank(row.unfadedPalette,index), faded: bank(row.fadedPalette,index), hardware: bank(row.hardwarePalette,index) }])),
      bg: { state: row.battleBg, vram: row.bgVram }, registers: row.registers,
      resources: { tag: 10197, tileBank: row.tileTags.indexOf(10197), paletteBank: row.paletteTags.indexOf(10197), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)), se1Song: row.audio.SE1.songHeaderIdentity },
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { immutable: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: sha(JSON.stringify(row.rawBattleState)) },
    };
  });
  return `${JSON.stringify({ schema: "snore-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const expectedTasks = [
  { slot: 1, symbol: "Task_UpdateMonBg", start: 4, end: 67, rows: 64 },
  { slot: 0, symbol: "AnimTask_ScaleMonAndRestore_Step", start: 7, end: 19, rows: 13 },
  { slot: 2, symbol: "AnimTask_ShakeMon2_Step", start: 7, end: 18, rows: 12 },
  { slot: 0, symbol: "AnimTask_ScaleMonAndRestore_Step", start: 39, end: 51, rows: 13 },
  { slot: 2, symbol: "AnimTask_ShakeMon2_Step", start: 39, end: 50, rows: 12 },
  { slot: 0, symbol: "Task_ClearMonBg", start: 65, end: 67, rows: 3 },
];
const expectedZ = [7,39].flatMap((start) => [4,5,7].map((slot) => ({ slot, symbol: "gSnoreZSpriteTemplate", start, end: start + 24, rows: 25 })));
const expectedPlatform = [7,39].map((start) => ({ slot: 3, symbol: "gShakeMonOrPlatformSpriteTemplate", start, end: start + 13, rows: 14 }));

const config: Record<Side, Json> = {
  "player-back": { stem: "player", start: 692, probeSha: "e3767ec89638ef79a6443b158b9960e2440fb6e2c4d2724119693a9ebfcbd0d6", rawSha: "5b0ce66294865c6587320dfeb4a7142e758f30153fb5cc90fcf5df01a974bd6b", attacker: "player", targetRank: 13, targetBaseX: 144, matrix: 1 },
  "opponent-front": { stem: "opponent", start: 700, probeSha: "6bee2b368d7ea678d2b4dd175298f2959d3f5dad62e4a0c2d35928b0eaa0fd3c", rawSha: "e9487046e68778aed5a4f4b26e644c315047f3003d30d91d45c2356836d5c0b2", attacker: "opponent", targetRank: 9, targetBaseX: 40, matrix: 2 },
};
function oamX(raw: string): number { return Buffer.from(raw, "hex").readUInt16LE(2) & 0x1ff; }
function signed9(value: number): number { const word = value & 0x1ff; return word >= 256 ? word - 512 : word; }

function verifySide(side: Side): Json {
  const want = config[side]!, densePath = `tools/compare/evidence/snore-${want.stem}-dense-state.json.gz`, rawPath = `tools/compare/evidence/snore-${want.stem}-raw-rgb.tar.gz`, mapPath = `tools/compare/evidence/snore-changemap-${want.stem}.json`;
  const json = gunzipSync(readFileSync(resolve(root, densePath))), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[], rgb = rawFrames(rawPath, rows);
  invariant(sha(json) === want.probeSha, `${side}: twice-fresh semantic digest`);
  invariant(sha(Buffer.concat(rgb)) === want.rawSha, `${side}: twice-fresh raw RGB digest`);
  invariant(probe.schema === "snore-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 173, `${side}: identity`);
  invariant(rows.length === 70 && probe.sourceWindow.startFrame === want.start && probe.sourceWindow.endFrame === want.start + 69 && probe.sourceWindow.sourceFrameCount === 70, `${side}: complete unthinned window`);
  invariant(probe.sourcePointerContract.start === 0x082cff5d && probe.sourcePointerContract.endExclusive === 0x082cffed && same(probe.sourcePointerContract.observedParities,[0,1]), `${side}: pointer contract`);
  invariant(rows.every((row, age) => row.frame === want.start + age) && rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive, `${side}: chronological root through first inactive`);
  invariant(same(lives(rows,"tasks",()=>true), expectedTasks) && same(lives(rows,"sprites",(entry)=>entry.template.symbol === "gSnoreZSpriteTemplate"), expectedZ) && same(lives(rows,"sprites",(entry)=>entry.template.symbol === "gShakeMonOrPlatformSpriteTemplate"), expectedPlatform), `${side}: task/sprite lifecycles`);
  invariant(rows.slice(1).every((row,index)=>same(row.hardwareOam,rows[index]!.softwareOam)), `${side}: whole OAM RAM+1`);
  for (const start of [7,39]) {
    invariant(rows.slice(start + 2,start + 16).every((row,index)=>same(row.hardwareMatrices[want.matrix],rows[start + index]!.softwareMatrices[want.matrix])), `${side}: ScaleMonAndRestore RAM+2 ${start}`);
    invariant(!rows.slice(start + 1,start + 15).every((row,index)=>same(row.hardwareMatrices[want.matrix],rows[start + index]!.softwareMatrices[want.matrix])), `${side}: reject scale RAM+1 ${start}`);
    const sourceShake = rows.slice(start,start + 13).map((row)=>row.battlerSprites.target.x2);
    invariant(same(sourceShake,[-4,-4,4,4,-4,-4,4,4,-4,-4,4,4,0]), `${side}: target ShakeMon2 source ${start}`);
    invariant(same(rows.slice(start + 2,start + 15).map((row)=>signed9(oamX(row.hardwareOam[want.targetRank])-want.targetBaseX)),sourceShake), `${side}: target ShakeMon2 RAM+2 ${start}`);
  }
  invariant(same(transitions(rows,(row)=>row.battleBg.gBattle_BG3_X),[8,10,12,14,16,18,20,21,40,42,44,46,48,50,52,53]), `${side}: platform source schedule`);
  invariant(same(transitions(rows,(row)=>row.registers.bg3hofs),[9,11,13,15,17,19,21,22,41,43,45,47,49,51,53,54]), `${side}: platform RAM+1`);
  invariant(same(transitions(rows,(row)=>[row.registers.bldcnt,row.registers.bldalpha]),[7,65]) && rows[7]!.registers.bldalpha === 0x0808, `${side}: direct alpha lifecycle`);
  invariant(same(transitions(rows,(row)=>row.bgVram.allSha256),[5,67,69]), `${side}: attacker monbg VRAM lifecycle`);
  invariant(same(transitions(rows,(row)=>row.resourceAllocators),[1,69]) && rows.slice(1,69).every((row)=>row.tileTags.includes(10197)&&row.paletteTags.includes(10197)) && !rows[0]!.tileTags.includes(10197) && !rows.at(-1)!.tileTags.includes(10197), `${side}: Snore Z resource lifecycle`);
  invariant(same(transitions(rows,(row)=>row.fadedPalette.slice(23*16,24*16)),[1]) && same(transitions(rows,(row)=>row.hardwarePalette.slice(23*16,24*16)),[2]), `${side}: Snore Z palette RAM+1`);
  invariant(rows[7]!.audio.SE1.songHeaderIdentity.symbol === "se_m_snore" && rows[39]!.audio.SE1.songHeaderIdentity.symbol === "se_m_snore" && rows[7]!.audio.SE1.status === 0 && rows[39]!.audio.SE1.status === 0, `${side}: two Snore audio restarts`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row)=>row.rawBattleState[key]===rows[0]!.rawBattleState[key]), `${side}: immutable ${key}`);
  invariant(rows.every((row)=>same(row.immutableState,rows[0]!.immutableState)) && rows[0]!.battlers[want.attacker].status.kind === "sleep" && rows[0]!.parties[want.attacker][0].species === 342 && rows[0]!.parties[want.attacker][0].moves.every((move: number)=>move===173), `${side}: legal sleeping Sealeo state`);
  invariant(rows.at(-1)!.visualTaskCount===0 && rows.at(-1)!.soundTaskCount===0 && !rows.at(-1)!.sprites.some((entry: Json)=>["gSnoreZSpriteTemplate","gShakeMonOrPlatformSpriteTemplate"].includes(entry.template.symbol)) && !rows.at(-1)!.tileTags.includes(10197), `${side}: first inactive cleanup`);
  const map = normalizedMap(side,rows,rgb);
  if (process.argv.includes("--write-maps")) writeFileSync(resolve(root,mapPath),map); else invariant(map===readFileSync(resolve(root,mapPath),"utf8"), `${side}: normalized map regeneration`);
  return { rows:70, startFrame:want.start, endFrame:want.start+69, probeJsonSha256:want.probeSha, rawRgbSequenceSha256:want.rawSha, zSpriteLives:6, oamRamPlusOneRows:69, scaleRamPlusTwoRows:28, targetShakeRamPlusTwoRows:26, platformRamPlusOneEdges:16, cleanupAge:69 };
}

export function verifySnoreEvidence(): Json {
  const audit = execFileSync(process.execPath,["--experimental-strip-types","tools/compare/snoreSourceAudit.ts"],{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024});
  invariant(sha(audit)==="21a7ba061f701bab8d4d950d0f2ee54192ffdde99c8f0260db777e0b6607e944", "source audit repeatability");
  const player=verifySide("player-back"),opponent=verifySide("opponent-front");
  return { schema:"snore-bilateral-evidence/v1", status:"unsupported-evidence-checkpoint", coverageCredit:false, sourceAuditSha256:sha(audit), orientations:{"player-back":player,"opponent-front":opponent}, totals:{rows:140,zSpriteLives:12,residualPixelsCompared:false} };
}
if (process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySnoreEvidence(),null,2));
