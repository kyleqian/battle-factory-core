import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { buildHiddenPowerChangeMap } from "./hiddenPowerChangeMap.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/hidden-power-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

function rgbSequence(path: string, rows: readonly Json[]): string {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  invariant(members.length === rows.length, `${path}: RGB member count`);
  for (const [age, name] of members.entries()) {
    invariant(name.endsWith(`${String(rows[age]!.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
  }
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 96 * 1024 * 1024 });
  const frameSize = 240 * 160 * 3;
  invariant(bytes.length === rows.length * frameSize, `${path}: RGB byte count`);
  for (const [age, row] of rows.entries()) {
    invariant(sha(bytes.subarray(age * frameSize, (age + 1) * frameSize)) === row.sha256, `${path}: RGB row ${age}`);
  }
  return sha(bytes);
}

const effects = (row: Json, template: string): Json[] => row.sprites.filter((sprite: Json) => sprite.template?.symbol === template);
const task = (row: Json, symbol: string): Json | undefined => row.tasks.find((candidate: Json) => candidate.func.symbol === symbol);

function verifySide(side: Side): Json {
  const entry = fixture.orientations[side];
  for (const [path, digest] of [
    [entry.scenario, entry.scenarioSha256], [entry.denseState, entry.denseStateSha256],
    [entry.rawRgbArchive, entry.rawRgbArchiveSha256], [entry.changeMap, entry.changeMapSha256],
  ]) invariant(sha(readFileSync(resolve(root, path))) === digest, `${side}: digest drift ${path}`);

  const unpacked = gunzipSync(readFileSync(resolve(root, entry.denseState)));
  invariant(sha(unpacked) === entry.probeJsonSha256, `${side}: dense probe JSON digest`);
  invariant(entry.probeJsonSha256 === entry.repeatProbeJsonSha256, `${side}: twice-fresh dense state mismatch`);
  invariant(entry.rawRgbSequenceSha256 === entry.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB mismatch`);
  const evidence = JSON.parse(unpacked.toString()) as Json;
  const rows = evidence.frames as Json[];
  invariant(same(evidence.sourceWindow, entry.window), `${side}: complete source window`);
  invariant(rows.length === 180 && rows.at(-1)?.animScriptActive === false, `${side}: first inactive cleanup`);
  invariant(evidence.sourcePointerContract.observedParities.join(",") === "0,1", `${side}: pointer parities`);
  invariant(evidence.sourcePointerContract.start === 0x082ca7bc
    && evidence.sourcePointerContract.endExclusive === 0x082ca8a5, `${side}: pointer interval`);
  invariant(evidence.topology.tasks.includes("AnimTask_BlendMonInAndOut_Step")
    && evidence.topology.tasks.includes("AnimTask_ScaleMonAndRestore_Step"), `${side}: live tasks`);
  for (const symbol of ["gHiddenPowerOrbSpriteTemplate", "gHiddenPowerOrbScatterSpriteTemplate"])
    invariant(evidence.topology.templates.includes(symbol), `${side}: live template ${symbol}`);
  for (const symbol of ["AnimOrbitFast_Step", "AnimOrbitScatter", "AnimOrbitScatter_Step"])
    invariant(evidence.topology.callbacks.includes(symbol), `${side}: live callback ${symbol}`);

  for (const [age, row] of rows.entries()) {
    invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128, `${side}: OAM shape ${age}`);
    invariant(row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32, `${side}: matrix shape ${age}`);
    invariant(row.fadedPalette.length === 512 && row.hardwarePalette.length === 512, `${side}: palette shape ${age}`);
    invariant(Array.isArray(row.tasks) && Array.isArray(row.sprites) && Array.isArray(row.spriteOrder), `${side}: scheduler shape ${age}`);
    invariant(row.registers && row.audio && row.immutableState && row.engine && row.parties, `${side}: dense domains ${age}`);
  }
  invariant(rgbSequence(resolve(root, entry.rawRgbArchive), rows) === entry.rawRgbSequenceSha256, `${side}: RGB sequence`);
  const rebuiltMap = buildHiddenPowerChangeMap(resolve(root, entry.denseState), resolve(root, entry.rawRgbArchive));
  const retainedMap = JSON.parse(readFileSync(resolve(root, entry.changeMap), "utf8")) as Json;
  invariant(same(rebuiltMap, retainedMap.rows), `${side}: normalized change map`);

  const comparable = rows.slice(1);
  const oam = comparable.filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length;
  const palette = comparable.filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length;
  invariant(oam === 179 && palette === 179, `${side}: ordinary RAM+1 display transfers`);
  const scaleAges = [
    ...Array.from({ length: 23 }, (_, index) => index + 4),
    ...Array.from({ length: 23 }, (_, index) => index + 64),
    ...Array.from({ length: 24 }, (_, index) => index + 118),
  ];
  for (const age of scaleAges) {
    const matrixNum = rows[age]!.battlerSprites.attacker.matrixNum;
    invariant(same(rows[age]!.hardwareMatrices[matrixNum], rows[age - 2]!.battlerSprites.attacker.matrix), `${side}: ScaleMon RAM+2 age ${age}`);
  }

  invariant(effects(rows[63]!, "gHiddenPowerOrbSpriteTemplate").length === 0, `${side}: orbit pre-birth`);
  invariant(effects(rows[64]!, "gHiddenPowerOrbSpriteTemplate").map((sprite) => sprite.slot).join(",") === "3,4,5,7,9,10", `${side}: orbit birth`);
  invariant(effects(rows[118]!, "gHiddenPowerOrbSpriteTemplate").length === 6
    && effects(rows[119]!, "gHiddenPowerOrbSpriteTemplate").length === 0, `${side}: orbit removal`);
  invariant(effects(rows[117]!, "gHiddenPowerOrbScatterSpriteTemplate").length === 0
    && effects(rows[118]!, "gHiddenPowerOrbScatterSpriteTemplate").map((sprite) => sprite.slot).join(",") === "11,12,13,14,15,16,17,18", `${side}: scatter birth`);
  const scatterChanges: [number, string][] = [];
  let prior = "";
  for (const [age, row] of rows.entries()) {
    const slots = effects(row, "gHiddenPowerOrbScatterSpriteTemplate").map((sprite) => sprite.slot).join(",");
    if (slots !== prior) { if (age >= 118) scatterChanges.push([age, slots]); prior = slots; }
  }
  const expectedScatter = side === "player-back"
    ? [[118, "11,12,13,14,15,16,17,18"], [127, "11,12,13,14,15,16,18"], [128, "12,13,14,15,16,18"], [130, "12,13,14,15"], [135, "13,14"], [137, "14"], [141, ""]]
    : [[118, "11,12,13,14,15,16,17,18"], [127, "11,12,14,15,16,17,18"], [128, "11,12,14,16,17,18"], [130, "11,16,17,18"], [132, "11,17,18"], [134, "17,18"], [138, "18"], [143, ""]];
  invariant(same(scatterChanges, expectedScatter), `${side}: independent scatter lifecycle`);

  const blendEdges: [number, number][] = [];
  let previousCoefficient: number | undefined;
  for (const [age, row] of rows.entries()) {
    const live = task(row, "AnimTask_BlendMonInAndOut_Step");
    if (live && live.data[2] !== previousCoefficient) { blendEdges.push([age, live.data[2]]); previousCoefficient = live.data[2]; }
  }
  invariant(same(blendEdges, [[58,0],[62,1],[67,2],[72,3],[77,4],[82,5],[87,6],[92,7],[97,8],[102,9],[107,10],[112,11],[117,12],[123,11],[128,10],[133,9],[138,8],[143,7],[148,6],[153,5],[158,4],[163,3],[168,2],[173,1]]), `${side}: BlendMon ramp`);
  invariant(task(rows[57]!, "AnimTask_BlendMonInAndOut_Step") === undefined
    && task(rows[58]!, "AnimTask_BlendMonInAndOut_Step") && task(rows[177]!, "AnimTask_BlendMonInAndOut_Step")
    && task(rows[178]!, "AnimTask_BlendMonInAndOut_Step") === undefined, `${side}: BlendMon lifetime`);

  invariant(rows[0]!.animArgs[7] === 0 && rows[117]!.animArgs[7] === 0 && rows[118]!.animArgs[7] === -1, `${side}: setarg edge`);
  invariant(!rows[0]!.tileTags.includes(10217) && rows[1]!.tileTags.includes(10217)
    && rows[178]!.tileTags.includes(10217) && !rows[179]!.tileTags.includes(10217), `${side}: RED_ORB tile lifetime`);
  invariant(!rows[0]!.paletteTags.includes(10217) && rows[1]!.paletteTags.includes(10217)
    && rows[178]!.paletteTags.includes(10217) && !rows[179]!.paletteTags.includes(10217), `${side}: RED_ORB palette lifetime`);
  const audioAt = (age: number, symbol: string): boolean => Object.values(rows[age]!.audio)
    .some((channel: any) => channel?.songHeaderIdentity?.symbol === symbol);
  invariant(audioAt(4, "se_m_take_down") && audioAt(64, "se_m_reversal") && audioAt(118, "se_m_reflect"), `${side}: audio anchors`);
  const gameplayRng = comparable.filter((row, index) => row.immutableState.rngValue !== rows[index]!.immutableState.rngValue).length;
  const animationRng = comparable.filter((row, index) => row.animationRng !== rows[index]!.animationRng).length;
  invariant(gameplayRng === 0 && animationRng === 178, `${side}: RNG domains`);

  return {
    sourceWindow: evidence.sourceWindow,
    sourceRows: rows.length,
    rawRgbRows: rows.length,
    latches: { oam: `${oam}/179 RAM+1`, palette: `${palette}/179 RAM+1`, scaleMon: "70/70 RAM+2" },
    orbit: "6 slots 3,4,5,7,9,10 ages 64..118; removal displayed RAM+1",
    scatter: `8 born age 118; all removed age ${side === "player-back" ? 141 : 143}; ordinary RAM+1 OAM`,
    blend: "ages 58..177; coefficient 0..12..1; palette displayed RAM+1",
    resources: "ANIM_TAG_RED_ORB ages 1..178; clear at inactive age 179",
    audio: "TAKE_DOWN@4, REVERSAL@64, REFLECT@118",
    gameplayRngTransitions: gameplayRng,
    animationRngTransitions: animationRng,
  };
}

export function verifyHiddenPowerEvidence(): Record<Side, Json> {
  for (const [path, digest] of [
    [fixture.source.audit, fixture.source.auditSha256], [fixture.source.probe, fixture.source.probeSha256],
    [fixture.source.changeMapBuilder, fixture.source.changeMapBuilderSha256],
    [fixture.source.assetExtractor, fixture.source.assetExtractorSha256], [fixture.source.asset, fixture.source.assetSha256],
  ]) invariant(sha(readFileSync(resolve(root, path))) === digest, `source digest drift ${path}`);
  invariant(fixture.status === "unsupported" && fixture.coverageCredit === false
    && fixture.acceptance.productionFramebufferRows === "0/360", "unsupported acceptance boundary");
  return { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") };
}
