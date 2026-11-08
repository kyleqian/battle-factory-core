import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { icyWindAtAge, icyWindEffectOamOrderAtAge, icyWindSnowballStep2State } from "../../src/animation/icyWind.ts";
import { createSceneOnMovePresentation, sceneOnIcyWindView, type SceneOnPresentationBattler } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";

const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

interface TarMember { readonly name: string; readonly data: Buffer }
function readTarGzip(path: string): readonly TarMember[] {
  const tar = gunzipSync(readFileSync(path)); const members: TarMember[] = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512); if (header.every((value) => value === 0)) break;
    const zero = header.indexOf(0); const name = header.subarray(0, zero < 0 ? 100 : zero).toString("utf8");
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/u, "").trim() || "0", 8);
    const data = tar.subarray(offset + 512, offset + 512 + size); invariant(data.length === size, `${path}: truncated ${name}`);
    members.push({ name, data }); offset += 512 + Math.ceil(size / 512) * 512;
  }
  return members;
}

function changeMap(label: string, frames: readonly any[], rgb: readonly Buffer[]): string {
  const lines = [`# icy-wind-${label} raw RGB888 — ${frames.length} frames, 240x160`, "# frames absent from this table are byte-identical to the previous frame", "frame  changedPx  bbox(minx,miny-maxx,maxy)", `${frames[0].frame}  (first frame)`];
  let staticStart: number | null = null;
  const flush = (end: number): void => { if (staticStart !== null) { lines.push(`  static ${staticStart === end ? staticStart : `${staticStart}-${end}`}`); staticStart = null; } };
  for (let index = 1; index < frames.length; index += 1) {
    let changed = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 38400; pixel += 1) {
      const at = pixel * 3; const before = rgb[index - 1]!; const after = rgb[index]!;
      if (before[at] === after[at] && before[at + 1] === after[at + 1] && before[at + 2] === after[at + 2]) continue;
      changed += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (!changed) { staticStart ??= frames[index]!.frame; continue; }
    flush(frames[index - 1]!.frame); lines.push(`${frames[index]!.frame}  ${changed}  ${minX},${minY}-${maxX},${maxY}`);
  }
  flush(frames.at(-1)!.frame); return `${lines.join("\n")}\n`;
}

function legalScenario(path: string, side: "player" | "opponent"): void {
  const scenario = JSON.parse(readFileSync(path, "utf8")); invariant(scenario.profile === "battle-scene-on", `${side}: profile`);
  const parties = scenario.overrides?.parties; invariant(parties?.player?.length === 3 && parties?.opponent?.length === 3, `${side}: bilateral parties`);
  const fields = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const mon of [...parties.player, ...parties.opponent]) invariant(fields.every((field) => Object.hasOwn(mon, field)) && Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6 && mon.moves.length === 4 && mon.ppUps.length === 4, `${side}: incomplete legal mon`);
  const swinub = parties[side][0]; invariant(swinub.species === 220 && swinub.nature === 21 && same(swinub.moves, [196, 196, 196, 196]), `${side}: Swinub carrier`);
}

export interface IcyWindEvidenceResult { readonly orientation: string; readonly frames: number; readonly snowballs: number; readonly step2Rows: number; readonly spikes: number; readonly oamTopologyRows: number; readonly oamRows: number; readonly matrixRows: number; readonly paletteRows: number; readonly rgbRows: number; readonly seamRows: number; readonly framebufferRows: number; readonly residuals: readonly string[] }

function verifyOrientation(root: string, orientation: string, receipt: any): IcyWindEvidenceResult {
  const side = orientation === "player-back" ? "player" : "opponent";
  const scenarioPath = resolve(root, receipt.scenario); const statePath = resolve(root, receipt.stateGzip); const archivePath = resolve(root, receipt.rawRgbArchive); const mapPath = resolve(root, receipt.changeMap);
  invariant(sha256(readFileSync(scenarioPath)) === receipt.scenarioSha256, `${orientation}: scenario SHA`); legalScenario(scenarioPath, side);
  const stateGzip = readFileSync(statePath); invariant(sha256(stateGzip) === receipt.stateGzipSha256, `${orientation}: state gzip SHA`);
  const stateBytes = gunzipSync(stateGzip); invariant(sha256(stateBytes) === receipt.uncompressedStateSha256, `${orientation}: state SHA`);
  const evidence = JSON.parse(stateBytes.toString("utf8")); const frames: any[] = evidence.frames;
  invariant(evidence.schema === "icy-wind-dense-evidence/v1" && same(evidence.sourceWindow, { startFrame: 220, endFrame: 506, frameCount: 287 }), `${orientation}: dense window`);
  invariant(frames.length === 287 && frames.every((frame, age) => frame.frame === 220 + age), `${orientation}: dense ages`);
  invariant(frames[0].gAnimScriptActive && !frames.at(-1).gAnimScriptActive && frames.slice(0, -1).every((frame) => frame.gAnimScriptActive), `${orientation}: active boundary`);
  invariant(frames.every((frame) => frame.ownedScript?.block === "Move_ICY_WIND" || frame.ownedScript?.block === "IceSpikesEffectLong"), `${orientation}: pointer escaped owned blocks`);
  invariant(frames.filter((frame) => frame.ownedScript.block === "Move_ICY_WIND").length === 251 && frames.filter((frame) => frame.ownedScript.block === "IceSpikesEffectLong").length === 36, `${orientation}: owned pointer rows`);
  const pointers = frames.map((frame) => [frame.frame, frame.gAnimScriptActive, frame.script.address, frame.ownedScript]);
  invariant(sha256(JSON.stringify(pointers)) === receipt.sourcePointerSequenceSha256 && sha256(JSON.stringify(evidence.topology)) === receipt.observedTopologySha256, `${orientation}: pointer/topology SHA`);
  for (const name of ["AnimFastTranslateLinearWaitEnd", "AnimSwirlingSnowball_Step1", "AnimSwirlingSnowball_Step2", "AnimSwirlingSnowball_End", "AnimWaveFromCenterOfTarget"]) invariant(evidence.topology.callbacks.includes(name), `${orientation}: callback ${name}`);
  invariant(evidence.topology.templates.includes("gSwirlingSnowballSpriteTemplate") && evidence.topology.templates.includes("gIceGroundSpikeSpriteTemplate"), `${orientation}: templates`);
  for (const field of ["battlers", "parties", "engine", "immutableState"]) invariant(frames.every((frame) => same(frame[field], frames[0][field])), `${orientation}: mutated ${field}`);
  invariant(frames[0].engine.currentMove === 196 && frames[0].animationBattlers.attacker === (side === "player" ? 0 : 1), `${orientation}: move/battler binding`);

  const generations = (template: string): any[][] => {
    const found: any[][] = [];
    for (let age = 0; age < frames.length; age += 1) for (const sprite of frames[age].sprites.filter((item: any) => item.template.symbol === template)) {
      const previous = age ? frames[age - 1].sprites.find((item: any) => item.slot === sprite.slot) : undefined;
      if (previous?.template.address === sprite.template.address) continue;
      const rows = []; for (let scan = age; scan < frames.length; scan += 1) { const current = frames[scan].sprites.find((item: any) => item.slot === sprite.slot); if (current?.template.address !== sprite.template.address) break; rows.push({ age: scan, ...current }); }
      found.push(rows);
    }
    return found;
  };
  const snowballs = generations("gSwirlingSnowballSpriteTemplate"); invariant(snowballs.length === 10, `${orientation}: ten snowballs`);
  const callbackRows: Record<string, number> = {}; let step2Rows = 0;
  for (const rows of snowballs) {
    const callbacks = rows.map((row) => row.callback.symbol); for (const callback of callbacks) callbackRows[callback] = (callbackRows[callback] ?? 0) + 1;
    const compact = callbacks.filter((value, index) => index === 0 || value !== callbacks[index - 1]);
    invariant(same(compact, ["AnimFastTranslateLinearWaitEnd", "AnimSwirlingSnowball_Step1", "AnimSwirlingSnowball_Step2", "AnimSwirlingSnowball_End"]), `${orientation}: linear/Step1/Step2/End order`);
    const initial = rows.find((row) => row.callback.symbol === "AnimSwirlingSnowball_Step1"); invariant(initial, `${orientation}: Step1 row`);
    for (let step = 0; step < 32; step += 1) {
      const actual = frames[initial.age + step + 1].sprites.find((item: any) => item.slot === initial.slot); const expected = icyWindSnowballStep2State(initial, step, side);
      invariant(actual?.callback.symbol === expected.callback && actual.x === expected.x && actual.y === expected.y && actual.x2 === expected.x2 && actual.y2 === expected.y2 && same(actual.data, expected.data), `${orientation}: Step2 ${step}/slot ${initial.slot}`); step2Rows += 1;
    }
  }
  invariant(same(callbackRows, receipt.snowballCallbackRows) && step2Rows === 320, `${orientation}: snowball rows`);
  const spikes = generations("gIceGroundSpikeSpriteTemplate"); invariant(spikes.length === 13 && spikes.flat().length === 455 && spikes.every((rows) => rows.every((row) => row.callback.symbol === "AnimWaveFromCenterOfTarget")), `${orientation}: thirteen spike waves`);

  const geometry = side === "player"
    ? { attackerCenter: { x: 72, y: 104 }, targetCenter: { x: 176, y: 42 }, spikeTargetCenter: { x: 176, y: 40 } }
    : { attackerCenter: { x: 176, y: 60 }, targetCenter: { x: 72, y: 88 }, spikeTargetCenter: { x: 72, y: 80 } };
  let oamTopologyRows = 0;
  for (let age = 0; age < frames.length; age += 1) {
    const expected = icyWindAtAge(age, side, geometry);
    const actualSnowballs = frames[age].sprites.filter((sprite: any) => sprite.template.symbol === "gSwirlingSnowballSpriteTemplate");
    invariant(actualSnowballs.length === expected.snowballs.length, `${orientation}: reducer snowball count age ${age}`);
    for (const [index, sprite] of expected.snowballs.entries()) {
      const actual = actualSnowballs[index];
      invariant(actual?.callback.symbol === sprite.callback && actual.x === sprite.x && actual.y === sprite.y && actual.x2 === sprite.x2 && actual.y2 === sprite.y2 && same(actual.data.slice(0, 6), sprite.data.slice(0, 6)), `${orientation}: reducer snowball ${index} age ${age}: ${JSON.stringify({ actual: actual && { callback: actual.callback.symbol, x: actual.x, y: actual.y, x2: actual.x2, y2: actual.y2, data: actual.data.slice(0, 6) }, expected: sprite })}`);
    }
    const actualSpikes = frames[age].sprites.filter((sprite: any) => sprite.template.symbol === "gIceGroundSpikeSpriteTemplate");
    invariant(actualSpikes.length === expected.spikes.length, `${orientation}: reducer spike count age ${age}`);
    for (const [index, spike] of expected.spikes.entries()) {
      const actual = actualSpikes.find((candidate: any) => candidate.slot === spike.oamSlot && candidate.x === spike.x && candidate.y === spike.y);
      invariant(actual, `${orientation}: reducer spike ${index} age ${age}: ${JSON.stringify({ expected:spike})}`);
    }
    const expectedEffectOrder = icyWindEffectOamOrderAtAge(age, side, geometry).map(({ oamSlot }) => oamSlot);
    const liveEffectSlots = new Set([...actualSnowballs, ...actualSpikes].map((sprite: any) => sprite.slot));
    const actualEffectOrder = frames[age].spriteOrder.filter((slot: number) => liveEffectSlots.has(slot));
    invariant(same(actualEffectOrder, expectedEffectOrder), `${orientation}: persistent effect OAM order age ${age}`);
    oamTopologyRows += 1;
  }

  let oamRows = 0; let matrixRows = 0; let paletteRows = 0;
  for (let age = 1; age < frames.length; age += 1) {
    invariant(same(frames[age].hardwareOam, frames[age - 1].softwareOam), `${orientation}: OAM latch ${age}`); oamRows += 1;
    invariant(same(frames[age].hardwareMatrices, frames[age - 1].softwareMatrices), `${orientation}: matrix latch ${age}`); matrixRows += 1;
    if (age === 7) invariant(same(frames[age].hardwarePalette, frames[age].fadedPalette), `${orientation}: age-7 monbg palette transfer`);
    else { invariant(same(frames[age].hardwarePalette, frames[age - 1].fadedPalette), `${orientation}: palette latch ${age}`); paletteRows += 1; }
  }
  invariant(oamRows === 286 && matrixRows === 286 && paletteRows === 285, `${orientation}: latch counts`);
  if (side === "player") invariant(frames[0].registers.bg1cnt === 39936 && frames[7].registers.bg1cnt === 23554 && frames[7].registers.bg1hofs === 367 && frames[7].registers.bg1vofs === 502 && frames[244].registers.bg1hofs === 0 && frames[244].registers.bg1vofs === 0, `${orientation}: target monbg registers`);
  else invariant(frames.every((frame) => frame.registers.bg1cnt === 23554 && frame.registers.bg1hofs === 0 && frame.registers.bg1vofs === 0), `${orientation}: target monbg registers`);
  invariant(new Set(frames.map((frame) => frame.bg1Vram.allBgSha256)).size >= 5 && frames[11].registers.bldcnt === 232 && frames[12].registers.bldy === 1 && frames[27].registers.bldy === 16 && frames[46].registers.bldy === 0 && frames[241].registers.bldcnt === 232 && frames[259].registers.bldy === 16 && frames[279].registers.bldy === 0, `${orientation}: BG/palette register schedule`);
  invariant(frames.some((frame) => frame.se1.songHeaderIdentity.symbol === "se_m_icy_wind") && frames.some((frame) => frame.se2.songHeaderIdentity.symbol === "se_m_gust") && frames.some((frame) => frame.se2.songHeaderIdentity.symbol === "se_m_gust2"), `${orientation}: audio identities`);
  invariant(frames[1].paletteTags.includes(10141) && frames[1].tileTags.includes(10141) && frames[4].tileTags.includes(10142) && !frames.at(-1).paletteTags.includes(10141) && !frames.at(-1).tileTags.includes(10142), `${orientation}: tag lifecycle`);
  const last = frames.at(-1); invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0 && last.registers.bldcnt === 0 && last.registers.bldalpha === 0 && last.registers.bldy === 0 && !last.sprites.some((sprite: any) => /SwirlingSnowball|IceGroundSpike/u.test(sprite.template.symbol ?? "")), `${orientation}: cleanup`);

  const archive = readFileSync(archivePath); invariant(sha256(archive) === receipt.rawRgbArchiveSha256, `${orientation}: RGB archive SHA`);
  const members = readTarGzip(archivePath); invariant(members.length === 287 && members.every((member) => /^\.\/\d{5}\.rgb$/u.test(member.name) && member.data.length === 115200), `${orientation}: RGB members`);
  const rgb = members.map((member) => member.data); invariant(sha256(Buffer.concat(rgb)) === receipt.rawRgbSequenceSha256 && rgb.every((bytes, age) => sha256(bytes) === frames[age].sha256), `${orientation}: raw RGB`);
  const committedMap = readFileSync(mapPath, "utf8"); invariant(sha256(committedMap) === receipt.changeMapSha256 && changeMap(side, frames, rgb) === committedMap, `${orientation}: normalized change map`);
  const attacker: SceneOnPresentationBattler = side === "player"
    ? { species: "SWINUB", geometry: { side: "player", spriteCorner: { x: 40, y: 69 }, animationCenter: { x: 72, y: 104 }, battlePositionCenter: { x: 72, y: 80 } } }
    : { species: "SWINUB", geometry: { side: "opponent", spriteCorner: { x: 144, y: 28 }, animationCenter: { x: 176, y: 60 }, battlePositionCenter: { x: 176, y: 40 } } };
  const target: SceneOnPresentationBattler = side === "player"
    ? { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 145, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } }
    : { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } };
  const fieldProfile = side === "player"
    ? { playerHp: 108, playerMaxHp: 125, opponentHp: 110, opponentMaxHp: 110, playerGender: "male" as const, opponentGender: "male" as const }
    : { playerHp: 110, playerMaxHp: 110, opponentHp: 108, opponentMaxHp: 125, playerGender: "male" as const, opponentGender: "male" as const };
  const stage = createSceneOnMovePresentation({ move: "ICY_WIND", attacker, target, fieldProfile, effectGeometry: geometry });
  let seamRows = 0; let framebufferRows = 0; const residuals: string[] = [];
  for (let age = 0; age < 287; age += 1) {
    const expected = icyWindAtAge(age, side, geometry);
    const seam = sceneOnIcyWindView({ ...stage, age });
    if (same({ ...seam, attacker: undefined, target: undefined }, expected)) seamRows += 1;
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine); let changed = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 38400; pixel += 1) {
      const at = pixel * 4; const ref = pixel * 3;
      if (app[at] === rgb[age]![ref] && app[at + 1] === rgb[age]![ref + 1] && app[at + 2] === rgb[age]![ref + 2]) continue;
      changed += 1; const x = pixel % 240; const y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (changed === 0) framebufferRows += 1;
    else {
      const samplePixel = minY * 240 + minX; const aa = samplePixel * 4; const rr = samplePixel * 3;
      residuals.push(`age ${age}: ${changed}px bbox ${minX},${minY}-${maxX},${maxY} sample app=${app[aa]},${app[aa + 1]},${app[aa + 2]} ref=${rgb[age]![rr]},${rgb[age]![rr + 1]},${rgb[age]![rr + 2]}`);
    }
  }
  return { orientation, frames: 287, snowballs: 10, step2Rows, spikes: 13, oamTopologyRows, oamRows, matrixRows, paletteRows, rgbRows: rgb.length, seamRows, framebufferRows, residuals };
}

export function verifyIcyWindEvidence(root = resolve(".")): readonly IcyWindEvidenceResult[] {
  const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/icy-wind-dense-evidence.json"), "utf8"));
  invariant(receipt.status === "exact" && receipt.acceptance.seamRows === "287/287 + 287/287" && receipt.acceptance.framebufferRows === "287/287 + 287/287", "Icy Wind exact acceptance drift");
  return Object.entries(receipt.orientations).map(([orientation, row]) => verifyOrientation(root, orientation, row));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyIcyWindEvidence(), null, 2));
