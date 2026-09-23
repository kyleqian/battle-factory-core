/** Hermetic dense state/RGB/map verifier and receipt generator for MOVE_REVENGE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const file = (path: string): Buffer => readFileSync(resolve(root, path));
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Revenge evidence: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function lives(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const found = new Map<string, number[]>();
  rows.forEach((row, age) => row[key].filter(predicate).forEach((entry: Json) => { const name = entry.func?.symbol ?? entry.template?.symbol; const id = `${name}:${entry.slot}`; found.set(id, [...(found.get(id) ?? []), age]); }));
  return [...found].map(([id, ages]) => { const cut = id.lastIndexOf(":"); return { name: id.slice(0, cut), slot: Number(id.slice(cut + 1)), start: ages[0], end: ages.at(-1), rows: ages.length }; });
}
function archiveFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 }); const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path} RGB shape`);
  return rows.map((row, age) => { const rgb = raw.subarray(age * bytes, (age + 1) * bytes); invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`) && sha(rgb) === row.sha256, `${path} chronological age ${age}`); return rgb; });
}
const rowHash = (value: unknown): string => sha(JSON.stringify(value));
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const owned = ["gRevengeSmallScratchSpriteTemplate", "gRevengeBigScratchSpriteTemplate", "gHorizontalLungeSpriteTemplate", "gPersistHitSplatSpriteTemplate"];
  return `${JSON.stringify({ schema: "revenge-normalized-banked-change-map/v1", side, rows: rows.map((row, age) => ({
    age, frame: row.frame, rgb: sha(rgb[age]!), active: row.animScriptActive, offset: row.scriptOffset, wait: row.scriptWait,
    counts: [row.visualTaskCount, row.soundTaskCount], tasks: row.tasks.map((entry: Json) => [entry.slot, entry.func.symbol, entry.data]),
    sprites: row.sprites.filter((entry: Json) => owned.includes(entry.template.symbol)).map((entry: Json) => [entry.slot, entry.template.symbol, entry.callback.symbol, entry.x, entry.y, entry.x2, entry.y2, entry.attr, entry.animNum, entry.animCmdIndex, entry.animDelayCounter, entry.matrixNum, entry.matrix, entry.data]),
    battlers: { attacker: [row.battlerSprites.attacker.x2,row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2,row.battlerSprites.target.y2] },
    buffers: [rowHash(row.softwareOam),rowHash(row.hardwareOam),rowHash(row.softwareMatrices),rowHash(row.hardwareMatrices),rowHash(row.unfadedPalette),rowHash(row.fadedPalette),rowHash(row.hardwarePalette)],
    tags: [row.tileTags,row.paletteTags], allocators: row.resourceAllocators, registers: row.registers,
    audio: [row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE2.songHeaderIdentity.symbol], rng: [row.animationRng,row.rawBattleState.gameplayRng], state: [rowHash(row.immutableState),rowHash(row.rawBattleState)],
  })) }, null, 2)}\n`;
}
const expectedTasks = [{name:"Task_UpdateMonBg",slot:1,start:4,end:130,rows:127},{name:"AnimTask_BlendColorCycleLoop",slot:0,start:21,end:71,rows:51},{name:"AnimTask_ShakeMon2_Step",slot:0,start:99,end:116,rows:18},{name:"Task_ClearMonBg",slot:0,start:128,end:130,rows:3}];
const expectedSprites = [{name:"gRevengeSmallScratchSpriteTemplate",slot:3,start:7,end:19,rows:13},{name:"gHorizontalLungeSpriteTemplate",slot:3,start:76,end:90,rows:15},{name:"gRevengeBigScratchSpriteTemplate",slot:4,start:82,end:94,rows:13},{name:"gPersistHitSplatSpriteTemplate",slot:3,start:99,end:116,rows:18},{name:"gPersistHitSplatSpriteTemplate",slot:4,start:109,end:126,rows:18}];
function verifySide(side: Side, config: Json): Json {
  const decoded = gunzipSync(file(config.denseState)); const probe = JSON.parse(decoded.toString("utf8")) as Json; const rows = probe.frames as Json[]; const rgb = archiveFrames(config.rawRgbArchive, rows);
  const start = side === "player-back" ? 238 : 235;
  invariant(sha(decoded) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side} twice-fresh state`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side} twice-fresh RGB`);
  invariant(probe.schema === "revenge-dense-evidence/v1" && probe.move === 279 && rows.length === 145 && probe.sourceWindow.startFrame === start && probe.sourceWindow.endFrame === start + 144, `${side} complete source window`);
  invariant(probe.sourcePointerContract.start === 0x082d5731 && probe.sourcePointerContract.endExclusive === 0x082d57c8 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side} pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 150, `${side} root through inactive cleanup`);
  invariant(rows.every((row) => row.scriptOwner === "Move_REVENGE" && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704), `${side} dense row shape`);
  invariant(same(lives(rows,"tasks",()=>true), expectedTasks), `${side} task lifetimes`); invariant(same(lives(rows,"sprites",(entry)=>expectedSprites.some((life)=>life.name===entry.template.symbol)), expectedSprites), `${side} sprite lifetimes`);
  invariant(rows.slice(1).every((row,index)=>same(row.hardwareOam,rows[index]!.softwareOam) && same(row.hardwareMatrices,rows[index]!.softwareMatrices)), `${side} OAM/matrix predecessor latch`);
  invariant(same(rows.slice(1).flatMap((row,index)=>same(row.hardwarePalette,rows[index]!.fadedPalette)?[]:[index+1]),[4]), `${side} palette predecessor with monbg exception`);
  invariant(same(transitions(rows,(row)=>row.fadedPalette),[1,4,23,25,27,29,37,39,41,49,51,53,61,63,65,67,96]) && same(transitions(rows,(row)=>row.hardwarePalette),[2,4,24,26,28,30,38,40,42,50,52,54,62,64,66,68,97]), `${side} palette map`);
  invariant(same(transitions(rows,(row)=>[row.tileTags,row.paletteTags]),[1,73,96,144]) && same(transitions(rows,(row)=>row.registers.bldalpha),[7,128]) && same(transitions(rows,(row)=>row.registers.bldcnt),[7,128]), `${side} resources/blend map`);
  invariant(same(transitions(rows,(row)=>[row.battlerSprites.attacker.x2,row.battlerSprites.attacker.y2,row.battlerSprites.target.x2,row.battlerSprites.target.y2]),[76,77,78,79,80,81,84,85,86,87,88,89,99,101,103,105,107,109,111,113,115,117]), `${side} lunge/shake map`);
  invariant(same(transitions(rows,(row)=>[row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE2.songHeaderIdentity.symbol]),[7,82,99,109]), `${side} audio map`);
  invariant(transitions(rows,(row)=>row.animationRng).length === 142 && transitions(rows,(row)=>row.rawBattleState.gameplayRng).length === 0, `${side} RNG separation`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row)=>same(row.rawBattleState[key],rows[0]!.rawBattleState[key])), `${side} stable ${key}`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0, `${side} cleanup`);
  const map = normalizedMap(side, rows, rgb); invariant(map === file(config.changeMap).toString("utf8") && sha(map) === config.changeMapSha256, `${side} normalized map`);
  return { rows: rows.length, startFrame: start, endFrame: start + 144, cleanupAge: 144, probeJsonSha256: sha(decoded), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMapSha256: sha(map) };
}

const fixturePath = resolve(root, "tools/compare/fixtures/revenge-evidence.json");
if (process.argv.includes("--write")) {
  const inputs = { "player-back": { first: process.env.REVENGE_PLAYER_FIRST, rgb: process.env.REVENGE_PLAYER_RGB, repeat: process.env.REVENGE_PLAYER_REPEAT, repeatRgb: process.env.REVENGE_PLAYER_REPEAT_RGB }, "opponent-front": { first: process.env.REVENGE_OPPONENT_FIRST, rgb: process.env.REVENGE_OPPONENT_RGB, repeat: process.env.REVENGE_OPPONENT_REPEAT, repeatRgb: process.env.REVENGE_OPPONENT_REPEAT_RGB } } as const;
  const orientations: Json = {};
  for (const side of ["player-back","opponent-front"] as const) {
    const input = inputs[side]; invariant(input.first && input.rgb && input.repeat && input.repeatRgb, `${side} write inputs`);
    const first = readFileSync(input.first); const repeat = readFileSync(input.repeat); invariant(first.equals(repeat), `${side} fresh semantic identity`);
    const names = readdirSync(input.rgb).filter((name)=>name.endsWith(".rgb")).sort(); const repeatNames = readdirSync(input.repeatRgb).filter((name)=>name.endsWith(".rgb")).sort();
    const firstRgb = Buffer.concat(names.map((name)=>readFileSync(resolve(input.rgb!,name)))); const secondRgb = Buffer.concat(repeatNames.map((name)=>readFileSync(resolve(input.repeatRgb!,name)))); invariant(firstRgb.equals(secondRgb), `${side} fresh RGB identity`);
    const stem = side === "player-back" ? "player" : "opponent"; const denseState = `tools/compare/evidence/revenge-${stem}-dense-state.json.gz`; const rawRgbArchive = `tools/compare/evidence/revenge-${stem}-raw-rgb.tar.gz`; const changeMap = `tools/compare/evidence/revenge-changemap-${stem}.json`;
    writeFileSync(resolve(root,denseState),gzipSync(first,{level:9})); execFileSync("tar",["-czf",resolve(root,rawRgbArchive),"-C",input.rgb,...names]);
    const probe = JSON.parse(first.toString("utf8")) as Json; const map = normalizedMap(side,probe.frames,names.map((name)=>readFileSync(resolve(input.rgb!,name)))); writeFileSync(resolve(root,changeMap),map);
    const scenario = side === "player-back" ? "tools/battle-lab/mechanic-revenge-player-machamp-opponent-shuckle.json" : "tools/battle-lab/mechanic-revenge-opponent-qwilfish-player-shuckle.json";
    orientations[side] = { scenario, scenarioSha256: sha(file(scenario)), denseState, denseStateSha256: sha(file(denseState)), probeJsonSha256: sha(first), repeatProbeJsonSha256: sha(repeat), rawRgbArchive, rawRgbArchiveSha256: sha(file(rawRgbArchive)), rawRgbSequenceSha256: sha(firstRgb), repeatRawRgbSequenceSha256: sha(secondRgb), changeMap, changeMapSha256: sha(map) };
  }
  writeFileSync(fixturePath, `${JSON.stringify({ schema:"revenge-bilateral-evidence/v1",oracleProfile:"battle-scene-on",move:"MOVE_REVENGE",moveId:279,status:"unsupported-evidence",coverageCredit:false,acceptance:{freshRunsPerOrientation:2,rows:{"player-back":145,"opponent-front":145},totalRows:290,firstInactiveCleanupRetained:true,productionFramebufferCompared:false},orientations,scope:{sourceAudit:true,completePointerBody:true,fullDenseRowsRetained:true,rawRgbRetained:true,normalizedBankedMaps:true,twiceFreshByteIdentical:true,legalBilateralParties:true,smallAndBigScratchVariants:true,attackerBlendCycle:true,horizontalLunge:true,targetShakeMon2:true,persistentHits:true,audioAndResources:true,firstInactiveCleanup:true,latchMeasured:true,productionChanged:false,reducerAdded:false,typedSeamAdded:false,compositorAdded:false,actualCoreFramebufferAcceptance:false,coveragePromotion:false,componentTrackFulfilled:false,siblingCredit:false,gameplayStateOwned:false,boundaryOrBarrierChanged:false} },null,2)}\n`);
}
export function verifyRevengeEvidence(): Json { const fixture=JSON.parse(readFileSync(fixturePath,"utf8")) as Json; invariant(fixture.status==="unsupported-evidence"&&!fixture.coverageCredit,"unsupported boundary"); for(const side of ["player-back","opponent-front"] as const) for(const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key]))===fixture.orientations[side][`${key}Sha256`],`${side} ${key} digest`); return {schema:fixture.schema,move:fixture.move,status:fixture.status,coverageCredit:fixture.coverageCredit,orientations:Object.fromEntries((["player-back","opponent-front"] as const).map((side)=>[side,verifySide(side,fixture.orientations[side])])),scope:fixture.scope}; }
if (!process.argv.includes("--write") && process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyRevengeEvidence(),null,2));
