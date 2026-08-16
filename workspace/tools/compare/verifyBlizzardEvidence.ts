import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  blizzardAtAge,
  blizzardEffectOamOrderAtAge,
  blizzardSnowballSwirlState,
  type BlizzardAttackerSide,
  type BlizzardGeometry,
} from "../../src/animation/blizzard.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBlizzardView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifyBlizzardFramebuffer } from "./blizzardFramebuffer.ts";

interface TarMember { readonly name: string; readonly size: number; readonly data: Buffer }

const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const jsonEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function readTarGzip(path: string): readonly TarMember[] {
  const tar = gunzipSync(readFileSync(path));
  const members: TarMember[] = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const nameEnd = header.indexOf(0);
    const name = header.subarray(0, nameEnd < 0 ? 100 : nameEnd).toString("utf8");
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/u, "").trim() || "0", 8);
    invariant(Number.isSafeInteger(size) && size >= 0, `${path}: invalid tar size for ${name}`);
    const data = tar.subarray(offset + 512, offset + 512 + size);
    invariant(data.length === size, `${path}: truncated tar member ${name}`);
    members.push({ name, size, data });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return members;
}

function verifyLegalScenario(path: string, side: BlizzardAttackerSide): void {
  const scenario = JSON.parse(readFileSync(path, "utf8"));
  invariant(scenario.profile === "battle-scene-on", `${path}: wrong oracle profile`);
  const parties = scenario.overrides?.parties;
  invariant(parties && parties.player?.length === 3 && parties.opponent?.length === 3, `${path}: incomplete parties`);
  const required = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const mon of [...parties.player, ...parties.opponent]) {
    invariant(required.every((field) => Object.hasOwn(mon, field)), `${path}: incomplete legal mon`);
    invariant(mon.moves.length === 4 && mon.ppUps.length === 4, `${path}: incomplete moves/PP Ups`);
    invariant(Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6, `${path}: incomplete IVs/EVs`);
  }
  const carrierParty = side === "player" ? parties.player : parties.opponent;
  invariant(carrierParty[0].species === 310 && carrierParty[0].moves.every((move: number) => move === 59), `${path}: Pelipper/Blizzard carrier drift`);
}

function buildChangeMap(label: string, frames: readonly any[], rgb: readonly Buffer[]): string {
  const lines = [
    `# blizzard-${label} RGB — ${frames.length} frames, 240x160`,
    "# frames absent from this table are byte-identical to the previous frame",
    "frame  changedPx  bbox(minx,miny-maxx,maxy)",
    `${frames[0].frame}  (first frame)`,
  ];
  let staticStart: number | null = null;
  const flushStatic = (end: number): void => {
    if (staticStart === null) return;
    lines.push(`  static ${staticStart === end ? staticStart : `${staticStart}-${end}`}`);
    staticStart = null;
  };
  for (let index = 1; index < frames.length; index += 1) {
    const before = rgb[index - 1];
    const after = rgb[index];
    let changed = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (before[offset] === after[offset] && before[offset + 1] === after[offset + 1] && before[offset + 2] === after[offset + 2]) continue;
      changed += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    if (changed === 0) {
      staticStart ??= frames[index].frame;
      continue;
    }
    flushStatic(frames[index - 1].frame);
    lines.push(`${frames[index].frame}  ${changed}  ${minX},${minY}-${maxX},${maxY}`);
  }
  flushStatic(frames.at(-1).frame);
  return `${lines.join("\n")}\n`;
}

export interface BlizzardEvidenceVerification {
  readonly orientation: string;
  readonly windowFrames: number;
  readonly sourceIntervalObservedFrames: number;
  readonly reducerInitialRows: number;
  readonly reducerMatchedSpriteRows: number;
  readonly snowballRows: number;
  readonly largeCrystalRows: number;
  readonly impactCrystalRows: number;
  readonly reducerRows: number;
  readonly oamTopologyRows: number;
  readonly oamLatchMatchedRows: number;
  readonly matrixLatchMatchedRows: number;
  readonly paletteLatchMatchedRows: number;
  readonly rgbFrames: number;
  readonly seamRows: number;
  readonly framebufferRows: number;
}

function verifyOrientation(
  root: string,
  orientation: string,
  row: any,
  framebufferRows: number,
): BlizzardEvidenceVerification {
  const scenarioPath = resolve(root, row.scenario);
  const statePath = resolve(root, row.stateGzip);
  const rgbPath = resolve(root, row.rawRgbArchive);
  const changeMapPath = resolve(root, row.changeMap);
  invariant(sha256(readFileSync(scenarioPath)) === row.scenarioSha256, `${orientation}: scenario SHA`);
  invariant(sha256(readFileSync(statePath)) === row.stateGzipSha256, `${orientation}: state gzip SHA`);
  invariant(sha256(readFileSync(rgbPath)) === row.rawRgbArchiveSha256, `${orientation}: RGB archive SHA`);
  invariant(sha256(readFileSync(changeMapPath)) === row.changeMapSha256, `${orientation}: change-map SHA`);

  const rawState = gunzipSync(readFileSync(statePath));
  invariant(sha256(rawState) === row.uncompressedStateSha256, `${orientation}: uncompressed state SHA`);
  const evidence = JSON.parse(rawState.toString("utf8"));
  const frames: any[] = evidence.frames;
  invariant(evidence.schema === "blizzard-dense-evidence/v1", `${orientation}: state schema`);
  invariant(jsonEqual(evidence.sourceWindow, row.denseWindow), `${orientation}: source window receipt`);
  invariant(frames.length === row.denseWindow.frameCount, `${orientation}: frame count`);
  invariant(frames.every((frame, index) => frame.frame === row.denseWindow.startFrame + index), `${orientation}: non-dense frame order`);
  invariant(frames[0].scriptOffset === 0 && frames[0].gAnimScriptActive === true, `${orientation}: pointer start boundary`);
  invariant(frames.at(-1).gAnimScriptActive === false, `${orientation}: pointer end boundary`);
  invariant(frames.slice(0, -1).every((frame) => frame.gAnimScriptActive === true), `${orientation}: premature inactive row`);
  const sourceIntervalObservedFrames = frames.filter((frame) => frame.scriptOffset !== null).length;
  invariant(sourceIntervalObservedFrames === row.sourceIntervalObservedFrames, `${orientation}: source interval row count`);
  const pointerSequence = frames.map((frame) => [frame.frame, frame.gAnimScriptActive, frame.script.address, frame.scriptOffset]);
  invariant(sha256(JSON.stringify(pointerSequence)) === row.sourcePointerSequenceSha256, `${orientation}: source pointer sequence`);
  invariant(sha256(JSON.stringify(evidence.topology)) === row.observedTopologySha256, `${orientation}: topology`);
  for (const task of ["AnimTask_UpdateSlidingBg", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg"]) {
    invariant(evidence.topology.tasks.includes(task), `${orientation}: missing task ${task}`);
  }
  for (const template of ["gSwirlingSnowballSpriteTemplate", "gBlizzardIceCrystalSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate"]) {
    invariant(evidence.topology.templates.includes(template), `${orientation}: missing template ${template}`);
  }

  const stableFields = ["battlers", "parties", "engine", "immutableState"];
  for (const field of stableFields) {
    invariant(frames.every((frame) => jsonEqual(frame[field], frames[0][field])), `${orientation}: mutated ${field}`);
  }
  invariant(frames[0].engine.currentMove === 59, `${orientation}: wrong current move`);
  const side: BlizzardAttackerSide = orientation === "player-back" ? "player" : "opponent";
  invariant(frames[0].animationBattlers.attacker === (side === "player" ? 0 : 1), `${orientation}: attacker side`);
  verifyLegalScenario(scenarioPath, side);

  const spriteRows = frames.flatMap((frame) => frame.sprites.map((sprite: any) => ({ frame: frame.frame, ...sprite })));
  const step1Rows = spriteRows.filter((sprite) => sprite.template.symbol === "gSwirlingSnowballSpriteTemplate"
    && sprite.callback.symbol === "AnimSwirlingSnowball_Step1");
  invariant(step1Rows.length === row.reducerInitialRows, `${orientation}: reducer initial rows`);
  let reducerMatchedSpriteRows = 0;
  for (const initial of step1Rows) {
    for (let step = 0; step <= 31; step += 1) {
      const frame = frames[initial.frame - frames[0].frame + step + 1];
      const actual = frame?.sprites.find((sprite: any) => sprite.slot === initial.slot);
      invariant(actual?.template.symbol === "gSwirlingSnowballSpriteTemplate", `${orientation}: snowball slot ${initial.slot} vanished`);
      const expected = blizzardSnowballSwirlState(initial, step, side);
      for (const field of ["callback", "x", "y", "x2", "y2"] as const) {
        const actualValue = field === "callback" ? actual.callback.symbol : actual[field];
        invariant(actualValue === expected[field], `${orientation}: reducer ${field} mismatch at frame ${frame.frame}/slot ${initial.slot}`);
      }
      invariant(jsonEqual(actual.data, expected.data), `${orientation}: reducer data mismatch at frame ${frame.frame}/slot ${initial.slot}`);
      reducerMatchedSpriteRows += 1;
    }
  }
  invariant(reducerMatchedSpriteRows === row.reducerMatchedSpriteRows, `${orientation}: reducer matched row count`);

  const geometry: BlizzardGeometry = side === "player"
    ? { attackerCenter: { x: 72, y: 94 }, targetCenter: { x: 176, y: 42 } }
    : { attackerCenter: { x: 176, y: 36 }, targetCenter: { x: 72, y: 88 } };
  const attacker: SceneOnPresentationBattler = side === "player"
    ? { species: "PELIPPER", geometry: { side, spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 }, battlePositionCenter: { x: 72, y: 80 } } }
    : { species: "PELIPPER", geometry: { side, spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 } } };
  const target: SceneOnPresentationBattler = side === "player"
    ? { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } }
    : { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } };
  const fieldProfile = side === "player"
    ? { playerHp: 158, playerMaxHp: 167, opponentHp: 110, opponentMaxHp: 110 }
    : { playerHp: 110, playerMaxHp: 110, opponentHp: 158, opponentMaxHp: 167 };
  const stage = createSceneOnMovePresentation({
    move: "BLIZZARD", attacker, target, fieldProfile, effectGeometry: geometry,
  });

  let snowballRows = 0;
  let largeCrystalRows = 0;
  let impactCrystalRows = 0;
  let reducerRows = 0;
  let seamRows = 0;
  let oamTopologyRows = 0;
  for (let age = 0; age < frames.length; age += 1) {
    const frame = frames[age];
    const expected = blizzardAtAge(age, side, geometry);
    invariant(expected.active === frame.gAnimScriptActive, `${orientation}: active mismatch age ${age}`);
    invariant(expected.scriptOffset === frame.scriptOffset, `${orientation}: script offset mismatch age ${age}`);
    invariant(expected.visualTaskCount === frame.visualTaskCount, `${orientation}: visual task count age ${age}`);
    invariant(expected.soundTaskActive === (frame.soundTaskCount === 1), `${orientation}: sound task age ${age}`);

    const tasks = new Set(frame.tasks.map((task: any) => task.func.symbol));
    invariant(expected.backgroundFadeTaskActive === tasks.has("Task_FadeToBg"), `${orientation}: fade task age ${age}`);
    invariant(expected.backgroundScrollTaskActive === tasks.has("AnimTask_UpdateSlidingBg"), `${orientation}: sliding task age ${age}`);
    invariant(expected.monBgTaskActive === tasks.has("Task_UpdateMonBg"), `${orientation}: monbg task age ${age}`);
    invariant(expected.monBgClearTaskActive === tasks.has("Task_ClearMonBg"), `${orientation}: clear monbg task age ${age}`);
    invariant(expected.resourcesLoaded === frame.paletteTags.includes(10141), `${orientation}: palette resource age ${age}`);
    invariant(expected.resourcesLoaded === frame.tileTags.includes(10141), `${orientation}: tile resource age ${age}`);
    invariant(frame.battleBg3.x === expected.backgroundScrollX, `${orientation}: BG scroll state age ${age}`);
    invariant(frame.registers.bg3hofs === (expected.displayedBackgroundScrollX & 0x1ff), `${orientation}: displayed BG scroll age ${age}`);
    invariant(frame.registers.bg3cnt === (expected.background === "field" ? 23051 : 14859), `${orientation}: BG identity age ${age}`);
    invariant(frame.registers.bldcnt === expected.blendCnt && frame.registers.bldy === expected.blendY, `${orientation}: blend registers age ${age}`);
    const displayedMonBg = side === "player"
      ? frame.registers.bg1hofs === 367 && frame.registers.bg1vofs === 502
      : frame.registers.bg2hofs === 472 && frame.registers.bg2vofs === 464;
    invariant(displayedMonBg === expected.monBgDisplayed, `${orientation}: displayed monbg age ${age}`);

    const audioIdentity = frame.se1.songHeaderIdentity.symbol;
    const expectedAudio = expected.currentAudio === "pre-move"
      ? "se_effective"
      : expected.currentAudio.toLowerCase();
    invariant(audioIdentity === expectedAudio, `${orientation}: audio identity age ${age}`);
    if (expected.audioStart !== null) {
      invariant(audioIdentity === expected.audioStart.toLowerCase(), `${orientation}: audio start age ${age}`);
    }

    const actualSnowballs = frame.sprites.filter((sprite: any) => sprite.template.symbol === "gSwirlingSnowballSpriteTemplate");
    invariant(actualSnowballs.length === expected.snowballs.length, `${orientation}: snowball count age ${age}`);
    for (const sprite of expected.snowballs) {
      const actual = actualSnowballs.find((candidate: any) => candidate.slot === sprite.oamSlot);
      invariant(actual?.callback.symbol === sprite.callback
        && actual.x === sprite.x && actual.y === sprite.y
        && actual.x2 === sprite.x2 && actual.y2 === sprite.y2
        && jsonEqual(actual.data, sprite.data), `${orientation}: snowball ${sprite.callIndex} age ${age}`);
      snowballRows += 1;
    }

    const actualLarge = frame.sprites.filter((sprite: any) => sprite.template.symbol === "gBlizzardIceCrystalSpriteTemplate");
    invariant(actualLarge.length === expected.largeCrystals.length, `${orientation}: large crystal count age ${age}`);
    for (const sprite of expected.largeCrystals) {
      const actual = actualLarge.find((candidate: any) => candidate.slot === sprite.oamSlot);
      invariant(actual?.callback.symbol === sprite.callback
        && actual.x === sprite.x && actual.y === sprite.y
        && actual.x2 === sprite.x2 && actual.y2 === sprite.y2
        && jsonEqual(actual.data, sprite.data), `${orientation}: large crystal ${sprite.callIndex} age ${age}`);
      largeCrystalRows += 1;
    }

    const actualImpacts = frame.sprites.filter((sprite: any) =>
      sprite.template.symbol === "gIceCrystalHitLargeSpriteTemplate"
      || sprite.template.symbol === "gIceCrystalHitSmallSpriteTemplate");
    invariant(actualImpacts.length === expected.impactCrystals.length, `${orientation}: impact count age ${age}`);
    for (const sprite of expected.impactCrystals) {
      const template = sprite.kind === "large"
        ? "gIceCrystalHitLargeSpriteTemplate" : "gIceCrystalHitSmallSpriteTemplate";
      const actual = actualImpacts.find((candidate: any) => candidate.slot === sprite.oamSlot
        && candidate.template.symbol === template);
      invariant(actual?.callback.symbol === sprite.callback
        && actual.x === sprite.x && actual.y === sprite.y
        && Boolean(actual.invisible) === sprite.invisible
        && actual.data[0] === sprite.timer
        && jsonEqual(actual.matrix, sprite.matrix), `${orientation}: impact ${sprite.callIndex} age ${age}`);
      impactCrystalRows += 1;
    }

    const effectSlots = new Set([
      ...actualSnowballs, ...actualLarge, ...actualImpacts,
    ].map((sprite: any) => sprite.slot));
    const actualEffectOrder = frame.spriteOrder.filter(
      (slot: number) => effectSlots.has(slot),
    );
    const expectedEffectOrder = blizzardEffectOamOrderAtAge(
      age,
      side,
      geometry,
    ).map(({ oamSlot }) => oamSlot);
    invariant(jsonEqual(actualEffectOrder, expectedEffectOrder),
      `${orientation}: effect OAM order age ${age}`);
    oamTopologyRows += 1;

    const seam = sceneOnBlizzardView({ ...stage, age });
    const { attacker: seamAttacker, target: seamTarget, ...seamState } = seam;
    invariant(seamAttacker === attacker && seamTarget === target && jsonEqual(seamState, expected), `${orientation}: seam age ${age}`);
    seamRows += 1;
    reducerRows += 1;
  }

  let oamLatchMatchedRows = 0;
  let matrixLatchMatchedRows = 0;
  let paletteLatchMatchedRows = 0;
  for (let index = 1; index < frames.length; index += 1) {
    invariant(jsonEqual(frames[index].hardwareOam, frames[index - 1].softwareOam), `${orientation}: OAM latch mismatch at ${frames[index].frame}`);
    invariant(jsonEqual(frames[index].hardwareMatrices, frames[index - 1].softwareMatrices), `${orientation}: matrix latch mismatch at ${frames[index].frame}`);
    matrixLatchMatchedRows += 1;
    const expectedPalette = index === 4 ? frames[index].fadedPalette : frames[index - 1].fadedPalette;
    invariant(jsonEqual(frames[index].hardwarePalette, expectedPalette), `${orientation}: palette latch mismatch at ${frames[index].frame}`);
    paletteLatchMatchedRows += 1;
    oamLatchMatchedRows += 1;
  }
  invariant(row.oamLatch.allowanceFrames === 1 && row.oamLatch.transfer === "hardware[n] == software[n-1]", `${orientation}: unexplained OAM allowance`);
  invariant(oamLatchMatchedRows === row.oamLatch.matchedRows && row.oamLatch.comparisonRows === frames.length - 1, `${orientation}: OAM receipt count`);

  const first = frames[0];
  const loaded = frames[1];
  const last = frames.at(-1);
  invariant(first.paletteTags.indexOf(10141) === -1 && first.tileTags.indexOf(10141) === -1, `${orientation}: ice tag preloaded`);
  invariant(loaded.paletteTags.indexOf(10141) === 7 && loaded.tileTags.indexOf(10141) === 6, `${orientation}: ice tag load`);
  invariant(last.paletteTags.indexOf(10141) === -1 && last.tileTags.indexOf(10141) === -1, `${orientation}: ice tag cleanup`);
  invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0, `${orientation}: task cleanup`);
  invariant(!last.sprites.some((sprite: any) => /Blizzard|IceCrystal|Swirling/u.test(sprite.template.symbol ?? "")), `${orientation}: sprite cleanup`);
  invariant(last.registers.bldcnt === 0 && last.registers.bldalpha === 0 && last.registers.bldy === 0, `${orientation}: blend cleanup`);
  invariant(last.registers.bg1hofs === 0 && last.registers.bg1vofs === 0 && last.registers.bg3hofs === 0 && last.registers.bg3vofs === 0, `${orientation}: scroll cleanup`);

  const members = readTarGzip(rgbPath);
  invariant(members.length === row.rgbArchiveMemberCount, `${orientation}: RGB archive member count`);
  const rgbMembers = members.filter((member) => /^\.\/\d{5}\.rgb$/u.test(member.name));
  invariant(rgbMembers.length === row.rawRgbMemberCount, `${orientation}: raw RGB member count`);
  invariant(sha256(`${rgbMembers.map((member) => member.name).join("\n")}\n`) === row.rawRgbMemberOrderSha256, `${orientation}: raw RGB archive order`);
  const byFrame = new Map(rgbMembers.map((member) => [Number.parseInt(member.name.slice(2, 7), 10), member]));
  invariant(byFrame.size === frames.length && rgbMembers.every((member) => member.size === 240 * 160 * 3), `${orientation}: RGB members/size`);
  const sequence = createHash("sha256");
  const orderedRgb: Buffer[] = [];
  for (const frame of frames) {
    const member = byFrame.get(frame.frame);
    invariant(member, `${orientation}: missing RGB frame ${frame.frame}`);
    invariant(sha256(member.data) === frame.sha256, `${orientation}: RGB SHA at frame ${frame.frame}`);
    sequence.update(member.data);
    orderedRgb.push(member.data);
  }
  invariant(sequence.digest("hex") === row.rawRgbSequenceSha256, `${orientation}: RGB sequence SHA`);
  const changeMapLabel = orientation === "player-back" ? "player" : "opponent";
  invariant(buildChangeMap(changeMapLabel, frames, orderedRgb) === readFileSync(changeMapPath, "utf8"), `${orientation}: change-map replay`);

  return {
    orientation,
    windowFrames: frames.length,
    sourceIntervalObservedFrames,
    reducerInitialRows: step1Rows.length,
    reducerMatchedSpriteRows,
    snowballRows,
    largeCrystalRows,
    impactCrystalRows,
    reducerRows,
    oamTopologyRows,
    oamLatchMatchedRows,
    matrixLatchMatchedRows,
    paletteLatchMatchedRows,
    rgbFrames: rgbMembers.length,
    seamRows,
    framebufferRows,
  };
}

export function verifyBlizzardEvidence(root = resolve(".")): readonly BlizzardEvidenceVerification[] {
  const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/blizzard-dense-evidence.json"), "utf8"));
  invariant(receipt.status === "exact", "receipt status must remain exact");
  invariant(receipt.acceptance.seamRows === "372/372 + 361/361", "receipt must pin the complete bilateral seam");
  invariant(receipt.acceptance.framebufferRows === "372/372 + 361/361", "receipt must pin the complete bilateral framebuffer");
  const framebuffer = new Map(
    verifyBlizzardFramebuffer().map(({ orientation, rows }) => [orientation, rows]),
  );
  return (Object.entries(receipt.orientations) as Array<[
    "player-back" | "opponent-front",
    any,
  ]>).map(([orientation, row]) =>
    verifyOrientation(root, orientation, row, framebuffer.get(orientation) ?? 0));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyBlizzardEvidence(), null, 2));
}
