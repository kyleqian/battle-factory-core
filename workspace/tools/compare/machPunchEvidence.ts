/** Strict hermetic verifier and normalized-map generator for MOVE_MACH_PUNCH. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Mach Punch evidence: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const found = new Map<string, number[]>();
  rows.forEach((row, age) => row[key].filter(predicate).forEach((entry: Json) => { const name = entry.func?.symbol ?? entry.template?.symbol; const id = `${name}:${entry.slot}`; found.set(id, [...(found.get(id) ?? []), age]); }));
  return [...found].flatMap(([id, ages]) => { const groups: number[][] = []; for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); } const cut = id.lastIndexOf(":"); return groups.map((group) => ({ name: id.slice(0, cut), slot: Number(id.slice(cut + 1)), start: group[0], end: group.at(-1), rows: group.length })); });
}
function paletteBanks(palette: number[]): string[] { return Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16)))); }
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 }); const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path} RGB shape`);
  return rows.map((row, age) => { const frame = raw.subarray(age * bytes, (age + 1) * bytes); invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`) && sha(frame) === row.sha256, `${path} chronological row ${age}`); return frame; });
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => { let changedPixels = 0; if (age) for (let i = 0; i < rgb[age]!.length; i += 3) if (rgb[age]![i] !== rgb[age - 1]![i] || rgb[age]![i + 1] !== rgb[age - 1]![i + 1] || rgb[age]![i + 2] !== rgb[age - 1]![i + 2]) changedPixels++;
    return { age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, changedPixels,
      counts: [row.visualTaskCount, row.soundTaskCount], tasks: row.tasks.map((entry: Json) => [entry.slot, entry.func.symbol, entry.data]),
      trace: row.sprites.filter((entry: Json) => entry.template.symbol === "gMultiuseSpriteTemplate" && entry.callback.symbol === "AnimBattlerTrace").map((entry: Json) => [entry.slot,entry.x,entry.y,entry.x2,entry.y2,entry.attr,entry.data]),
      punch: row.sprites.filter((entry: Json) => ["gBasicHitSplatSpriteTemplate","gFistFootSpriteTemplate"].includes(entry.template.symbol)).map((entry: Json) => [entry.slot,entry.template.symbol,entry.callback.symbol,entry.x,entry.y,entry.x2,entry.y2,entry.attr,entry.matrixNum,entry.matrix,entry.data]),
      battlers: { attacker: [row.battlerSprites.attacker.x2,row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2,row.battlerSprites.target.y2,row.battlerSprites.target.invisible] },
      oam: [sha(JSON.stringify(row.softwareOam)),sha(JSON.stringify(row.hardwareOam))], matrices: [sha(JSON.stringify(row.softwareMatrices)),sha(JSON.stringify(row.hardwareMatrices))],
      palettes: [paletteBanks(row.unfadedPalette),paletteBanks(row.fadedPalette),paletteBanks(row.hardwarePalette)], bg: [row.battleBg,sha(JSON.stringify(row.bgVram))], registers: row.registers,
      resources: [row.tileTags,row.paletteTags,row.resourceAllocators], audio: [row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE1.tracks.map((track: Json) => [track.flags,track.pan,track.panX]),row.audio.SE2.songHeaderIdentity.symbol],
      rng: [row.animationRng,row.rawBattleState.gameplayRng], state: [sha(JSON.stringify(row.immutableState)),sha(JSON.stringify(row.rawBattleState))] };
  }); return `${JSON.stringify({ schema: "mach-punch-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const taskLives = [
  {name:"Task_UpdateMonBg",slot:1,start:7,end:71,rows:65},{name:"Task_FadeToBg",slot:0,start:10,end:46,rows:37},{name:"AnimTask_UpdateSlidingBg",slot:3,start:29,end:89,rows:61},
  {name:"AnimTask_AttackerPunchWithTrace_Step",slot:0,start:50,end:65,rows:16},{name:"AnimTask_ShakeMon_Step",slot:2,start:58,end:67,rows:10},{name:"Task_ClearMonBg",slot:0,start:69,end:71,rows:3},
];
function verifySide(side: Side, config: Json): Json {
  const payload = gunzipSync(file(config.denseState)), probe = JSON.parse(payload.toString("utf8")) as Json, rows = probe.frames as Json[], rgb = rawFrames(config.rawRgbArchive, rows);
  const count = side === "player-back" ? 111 : 110, start = side === "player-back" ? 78 : 82;
  invariant(sha(payload) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side} twice-fresh semantic`); invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side} twice-fresh RGB`);
  invariant(probe.schema === "mach-punch-dense-evidence/v1" && probe.move === 183 && rows.length === count && probe.sourceWindow.startFrame === start && probe.sourceWindow.endFrame === start + count - 1, `${side} complete root window`);
  invariant(probe.sourcePointerContract.start === 0x082cd565 && probe.sourcePointerContract.endExclusive === 0x082cd5ed && same(probe.sourcePointerContract.observedParities,[0,1]), `${side} pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 128, `${side} root-to-inactive cleanup`);
  const tasks = ranges(rows,"tasks",()=>true); for (const life of taskLives) invariant(tasks.some((got) => same(got,life)), `${side} task ${life.name}`); invariant(tasks.some((got) => got.name === "Task_FadeToBg" && got.slot === 2 && got.start === 69 && got.end === count - 3), `${side} restore fade`);
  const punch = ranges(rows,"sprites",(entry) => ["gBasicHitSplatSpriteTemplate","gFistFootSpriteTemplate"].includes(entry.template.symbol)); invariant(same(punch,[{name:"gBasicHitSplatSpriteTemplate",slot:13,start:58,end:67,rows:10},{name:"gFistFootSpriteTemplate",slot:14,start:58,end:66,rows:9}]), `${side} hitsplat/fist lives`);
  invariant(ranges(rows,"sprites",(entry) => entry.template.symbol === "gMultiuseSpriteTemplate" && entry.callback.symbol === "AnimBattlerTrace").length === 8, `${side} eight attacker traces`);
  invariant(rows.slice(1).every((row,index) => same(row.hardwareOam,rows[index]!.softwareOam) && same(row.hardwareMatrices,rows[index]!.softwareMatrices)), `${side} OAM/matrix RAM+1`);
  invariant(same(rows.slice(1).flatMap((row,index) => same(row.hardwarePalette,rows[index]!.fadedPalette)?[]:[index+1]),[7]) && same(rows[7]!.hardwarePalette,rows[7]!.fadedPalette), `${side} palette predecessor except same-row monbg`);
  invariant(same(transitions(rows,(row)=>row.fadedPalette),side === "player-back"?[1,4,7,29,50,91]:[1,4,7,29,50,90]) && same(transitions(rows,(row)=>row.hardwarePalette),side === "player-back"?[2,5,7,30,51,92]:[2,5,7,30,51,91]), `${side} software/faded/hardware palette boundaries`);
  invariant(same(transitions(rows,(row)=>row.battleBg.gBattle_BG3_X),[...Array.from({length:42},(_,i)=>29+i),...Array.from({length:18},(_,i)=>73+i)]) && same(transitions(rows,(row)=>row.registers.bg3hofs),[...Array.from({length:42},(_,i)=>30+i),...Array.from({length:18},(_,i)=>74+i)]), `${side} sliding BG RAM+1`);
  invariant(same(transitions(rows,(row)=>[row.battlerSprites.attacker.x2,row.battlerSprites.target.x2]),[50,51,52,53,54,55,56,57,58,60,62,64,66]), `${side} trace punch and ShakeMon axes`);
  invariant(same(transitions(rows,(row)=>[row.audio.SE1.songHeaderIdentity.symbol,row.audio.SE1.tracks[0].panX]),[50,58]), `${side} audio order`); invariant(rows[50]!.audio.SE1.songHeaderIdentity.symbol === "se_m_jump_kick" && rows[58]!.audio.SE1.songHeaderIdentity.symbol === "se_m_comet_punch", `${side} audio identities`);
  invariant(same(transitions(rows,(row)=>row.resourceAllocators),[1,4,50,58,66,68,count-1]) && !rows.at(-1)!.tileTags.includes(10135) && !rows.at(-1)!.tileTags.includes(10143), `${side} resource lifetimes/cleanup`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row)=>same(row.rawBattleState[key],rows[0]!.rawBattleState[key])), `${side} immutable ${key}`); invariant(rows.every((row)=>same(row.immutableState,rows[0]!.immutableState)), `${side} immutable semantic state`);
  invariant(transitions(rows,(row)=>row.animationRng).length === 107 && transitions(rows,(row)=>row.rawBattleState.gameplayRng).length === 0, `${side} RNG separation`); const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0]; invariant(attacker.species === 107 && attacker.moves.every((move:number)=>move===183) && attacker.pp.reduce((a:number,b:number)=>a+b,0)===119, `${side} legal carrier/one PP`);
  invariant(rows.at(-1)!.visualTaskCount===0 && rows.at(-1)!.soundTaskCount===0 && rows.at(-1)!.tasks.length===0 && rows.at(-1)!.registers.bldcnt===0 && rows.at(-1)!.registers.bldalpha===0 && rows.at(-1)!.registers.bldy===0, `${side} exact cleanup`);
  invariant(normalizedMap(side,rows,rgb)===file(config.changeMap).toString("utf8"), `${side} normalized map`); return { rows: count, changedRows: transitions(rows,(row)=>row.sha256).length, cleanupAge: count-1, probeJsonSha256: sha(payload), rawRgbSequenceSha256: sha(Buffer.concat(rgb)) };
}
export function verifyMachPunchEvidence(): Json { const fixture=JSON.parse(file("tools/compare/fixtures/mach-punch-evidence.json").toString("utf8")) as Json; invariant(fixture.status==="unsupported-evidence-checkpoint"&&!fixture.coverageCredit,"unsupported boundary"); for(const side of ["player-back","opponent-front"] as const) for(const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key]))===fixture.orientations[side][`${key}Sha256`],`${side} ${key} digest`); return {schema:fixture.schema,status:fixture.status,coverageCredit:fixture.coverageCredit,orientations:Object.fromEntries((["player-back","opponent-front"] as const).map((side)=>[side,verifySide(side,fixture.orientations[side])]))}; }
if(process.argv.includes("--write-maps")){const fixture=JSON.parse(file("tools/compare/fixtures/mach-punch-evidence.json").toString("utf8")) as Json;for(const side of ["player-back","opponent-front"] as const){const config=fixture.orientations[side],probe=JSON.parse(gunzipSync(file(config.denseState)).toString("utf8"));writeFileSync(resolve(root,config.changeMap),normalizedMap(side,probe.frames,rawFrames(config.rawRgbArchive,probe.frames)));}}else if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))console.log(JSON.stringify(verifyMachPunchEvidence(),null,2));
