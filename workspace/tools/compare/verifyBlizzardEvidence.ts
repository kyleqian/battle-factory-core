import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { blizzardSnowballSwirlState, type BlizzardAttackerSide } from "../../src/animation/blizzard.ts";

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
  readonly oamLatchMatchedRows: number;
  readonly rgbFrames: number;
}

function verifyOrientation(root: string, orientation: string, row: any): BlizzardEvidenceVerification {
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

  let oamLatchMatchedRows = 0;
  for (let index = 1; index < frames.length; index += 1) {
    invariant(jsonEqual(frames[index].hardwareOam, frames[index - 1].softwareOam), `${orientation}: OAM latch mismatch at ${frames[index].frame}`);
    invariant(jsonEqual(frames[index].hardwareMatrices, frames[index - 1].softwareMatrices), `${orientation}: matrix latch mismatch at ${frames[index].frame}`);
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
    oamLatchMatchedRows,
    rgbFrames: rgbMembers.length,
  };
}

export function verifyBlizzardEvidence(root = resolve(".")): readonly BlizzardEvidenceVerification[] {
  const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/blizzard-dense-evidence.json"), "utf8"));
  invariant(receipt.status === "unsupported-evidence-checkpoint", "receipt status must remain unsupported");
  invariant(receipt.acceptance.seamRows === "0/372 + 0/361" && receipt.acceptance.framebufferRows === "0/372 + 0/361", "receipt must preserve zero seam/framebuffer acceptance");
  return Object.entries(receipt.orientations).map(([orientation, row]) => verifyOrientation(root, orientation, row));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyBlizzardEvidence(), null, 2));
}
