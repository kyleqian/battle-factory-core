import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/hail-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function ranges(ages: number[]): Array<[number, number]> { const result: Array<[number, number]> = []; for (const age of ages) { const last = result.at(-1); if (!last || age !== last[1] + 1) result.push([age, age]); else last[1] = age; } return result; }
const taskAges = (rows: Json[], name: string): Array<[number, number]> => ranges(rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === name) ? [age] : []));
const transitions = (rows: Json[], select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);

function rgbMembers(path: string, rows: Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 32 * 1024 * 1024 }); const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * size, `${path}: RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = byName.get(`${String(row.frame).padStart(5, "0")}.rgb`); invariant(frame, `${path}: missing ${row.frame}`); return frame; });
}

function changeMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const effects = new Set(["gHailParticleSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate"]);
  const mapped = rows.map((row, age) => {
    let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) { const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      count += 1; const x = pixel % 240; const y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { age, frame: row.frame, scriptOffset: row.scriptOffset, active: row.animScriptActive, changedPixels: count,
      bounds: count ? [minX, minY, maxX, maxY] : null,
      hailTasks: row.tasks.filter((task: Json) => ["AnimTask_Hail2", "AnimTask_BlendSpriteColor_Step2", "Task_LoopAndPlaySE"].includes(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
      effectSprites: row.sprites.filter((sprite: Json) => effects.has(sprite.template.symbol)).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible, attr: sprite.attr, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data })),
      paletteTags: row.paletteTags, tileTags: row.tileTags, audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
    };
  });
  return `${JSON.stringify({ schema: "hail-normalized-change-map/v1", side,
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    taskRanges: { hail: taskAges(rows, "AnimTask_Hail2"), blend: taskAges(rows, "AnimTask_BlendSpriteColor_Step2"), audio: taskAges(rows, "Task_LoopAndPlaySE") },
    transitions: { fadedPalette: transitions(rows, (row) => row.fadedPalette), paletteTags: transitions(rows, (row) => row.paletteTags), tileTags: transitions(rows, (row) => row.tileTags), registers: transitions(rows, (row) => row.registers), audio: transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]) },
    latches: { hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/157`, hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/157`, hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/157` },
    rows: mapped,
  }, null, 2)}\n`;
}

function verifyScenario(path: string, side: Side): void {
  const scenario = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
  invariant(scenario.schemaVersion === 1 && scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on" && scenario.level === 50 && scenario.challengeNum === 0, `${side}: scenario`);
  invariant(Object.keys(scenario.overrides).join(",") === "parties", `${side}: transient override`);
  const parties = scenario.overrides.parties; const carrier = side === "player-back" ? parties.player[0] : parties.opponent[0]; const target = side === "player-back" ? parties.opponent[0] : parties.player[0];
  invariant(carrier.species === 225 && carrier.nature === 6 && carrier.item === 212 && carrier.moves.every((move: number) => move === 258), `${side}: Delibird carrier`);
  invariant(target.species === 95 && target.nature === 23 && target.evs.hp === 255 && target.evs.spDefense === 255, `${side}: durable Onix`);
  const required = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const party of [parties.player, parties.opponent]) { invariant(party.length === 3 && new Set(party.map((mon: Json) => mon.species)).size === 3, `${side}: party shape`); const items = party.map((mon: Json) => mon.item).filter(Boolean); invariant(new Set(items).size === items.length, `${side}: held items`); for (const mon of party) invariant(required.every((field) => Object.hasOwn(mon, field)) && Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6 && mon.moves.length === 4 && mon.ppUps.length === 4, `${side}: complete legal mon`); }
}

function verifyOrientation(side: Side, contract: Json): Json {
  verifyScenario(contract.scenario, side); invariant(sha(readFileSync(resolve(root, contract.scenario))) === contract.scenarioSha256, `${side}: scenario SHA`);
  const zipped = readFileSync(resolve(root, contract.denseState)); const decoded = gunzipSync(zipped); invariant(sha(zipped) === contract.denseStateSha256 && sha(decoded) === contract.probeJsonSha256 && contract.repeatProbeJsonSha256 === contract.probeJsonSha256, `${side}: repeat receipt`);
  const evidence = JSON.parse(decoded.toString("utf8")) as Json; const rows = evidence.frames as Json[];
  invariant(evidence.schema === "hail-dense-evidence/v1" && evidence.move === 258 && evidence.profile === "battle-scene-on"
    && evidence.sourceWindow.startFrame === contract.sourceWindow.startFrame && evidence.sourceWindow.endFrame === contract.sourceWindow.endFrame
    && evidence.sourceWindow.frameCount === contract.sourceWindow.frameCount && evidence.sourceWindow.sourceFrameCount === 158, `${side}: evidence contract`);
  invariant(rows.length === 158 && rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && !rows.at(-1)!.animScriptActive && rows.every((row, age) => row.frame === contract.sourceWindow.startFrame + age), `${side}: complete pointer window`);
  invariant(evidence.sourcePointerContract.start === 0x082cdc76 && evidence.sourcePointerContract.endExclusive === 0x082cdcae && same(evidence.sourcePointerContract.observedParities, [0, 1]), `${side}: source bounds/parities`);
  invariant(same(taskAges(rows, "AnimTask_Hail2"), [[34, 128]]) && same(taskAges(rows, "AnimTask_BlendSpriteColor_Step2"), [[7, 32], [130, 155]]) && same(taskAges(rows, "Task_LoopAndPlaySE"), [[34, 113]]), `${side}: task lifecycles`);
  const hailCreates = rows.flatMap((row, age) => row.sprites.filter((sprite: Json) => sprite.template.symbol === "gHailParticleSpriteTemplate" && sprite.y === -8).map((sprite: Json) => ({ age, target: [sprite.data[3], sprite.data[4]], affine: sprite.data[5] })));
  invariant(hailCreates.length === 30 && same(hailCreates.map((entry) => entry.age), Array.from({ length: 30 }, (_, index) => 37 + Math.floor(index / 3) * 8 + index % 3 * 2)) && same(hailCreates.map((entry) => entry.affine), Array.from({ length: 10 }, () => [0, 1, 2]).flat()), `${side}: independent AnimTask_Hail spawn schedule`);
  const impacts = new Set(rows.flatMap((row) => row.sprites.filter((sprite: Json) => sprite.template.symbol === "gIceCrystalHitLargeSpriteTemplate" && sprite.callback.symbol === "AnimHailContinue").map((sprite: Json) => `${sprite.x},${sprite.y}`)));
  invariant(impacts.size === 4, `${side}: impact lifecycle`);
  invariant(Math.max(...rows.map((row) => row.sprites.filter((sprite: Json) => sprite.template.symbol === "gHailParticleSpriteTemplate").length)) === 6, `${side}: allocator peak`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128), `${side}: full buffers`);
  for (const field of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[field], rows[0]![field])), `${side}: immutable ${field}`);
  invariant(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1 && new Set(rows.map((row) => row.animationRng)).size === 158, `${side}: RNG domains`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam) && same(row.hardwareMatrices, rows[age]!.softwareMatrices) && same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: bilateral RAM+1 whole-buffer latches`);
  invariant(same(transitions(rows, (row) => row.fadedPalette), [1,4,13,17,21,25,29,33,136,140,144,148,152,156]), `${side}: palette schedule`);
  invariant(rows[1]!.paletteTags.includes(10263) && rows[4]!.paletteTags.includes(10141) && !rows.at(-1)!.paletteTags.includes(10263) && !rows.at(-1)!.paletteTags.includes(10141), `${side}: resource cleanup`);
  invariant(rows.some((row) => row.audio.SE1.songHeaderIdentity.symbol === "se_m_hail"), `${side}: Hail audio`);
  const last = rows.at(-1)!; invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0 && !last.sprites.some((sprite: Json) => ["gHailParticleSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate"].includes(sprite.template.symbol)), `${side}: inactive cleanup`);
  const archive = readFileSync(resolve(root, contract.rawRgbArchive)); invariant(sha(archive) === contract.rawRgbArchiveSha256, `${side}: RGB archive SHA`); const rgb = rgbMembers(resolve(root, contract.rawRgbArchive), rows); invariant(sha(Buffer.concat(rgb)) === contract.rawRgbSequenceSha256 && rgb.every((frame, age) => sha(frame) === rows[age]!.sha256), `${side}: raw RGB sequence`);
  const normalized = changeMap(side, rows, rgb); const mapPath = resolve(root, contract.changeMap); if (process.argv.includes("--write-maps")) writeFileSync(mapPath, normalized); else invariant(sha(readFileSync(mapPath)) === contract.changeMapSha256 && readFileSync(mapPath, "utf8") === normalized, `${side}: bilateral normalized change map`);
  return { sourceWindow: evidence.sourceWindow, taskRanges: { hail: [[34,128]], blend: [[7,32],[130,155]], audio: [[34,113]] }, lifecycle: { hailCreates: 30, impactCreates: 4, peakHail: 6 }, latches: { oam: "157/157", matrices: "157/157", palette: "157/157" }, gameplayRngTransitions: 0, animationRngTransitions: 157, framebufferCompared: true };
}

export function verifyHailEvidence(): Record<Side, Json> {
  invariant(fixture.schema === "hail-bilateral-evidence/v1" && fixture.move === "MOVE_HAIL" && fixture.status === "exact" && fixture.coverageCredit === true && fixture.oracleProfile === "battle-scene-on", "Hail fixture contract");
  invariant(fixture.evidenceScope.productionAnimationChanged === true && fixture.evidenceScope.reducerAdded === true && fixture.evidenceScope.typedSeamAdded === true && fixture.evidenceScope.compositorAdded === true && fixture.evidenceScope.framebufferCompared === true && fixture.evidenceScope.coveragePromotion === true, "exact production boundary");
  for (const [path, digest] of [
    [fixture.source.audit, fixture.source.auditSha256],
    [fixture.source.probe, fixture.source.probeSha256],
    [fixture.source.assetExtractor, fixture.source.assetExtractorSha256],
    [fixture.source.framebufferVerifier, fixture.source.framebufferVerifierSha256],
    [fixture.source.freshFramebufferVerifier, fixture.source.freshFramebufferVerifierSha256],
  ] as const) invariant(sha(readFileSync(resolve(root, path))) === digest, `${path}: source receipt`);
  return Object.fromEntries(((["player-back", "opponent-front"] as Side[]).map((side) => [side, verifyOrientation(side, fixture.orientations[side])]))) as Record<Side, Json>;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyHailEvidence(), null, 2));
