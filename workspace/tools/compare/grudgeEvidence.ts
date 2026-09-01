import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/grudge-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

function rgbSequence(path: string, rows: readonly Json[]): string {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 64 * 1024 * 1024 });
  const frameSize = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * frameSize, `${path}: RGB shape`);
  for (const [age, row] of rows.entries()) {
    const frame = bytes.subarray(age * frameSize, (age + 1) * frameSize);
    invariant(sha(frame) === row.sha256, `${path}: RGB row ${age}`);
  }
  return sha(bytes);
}

function verifySide(side: Side): Json {
  const entry = fixture.orientations[side];
  for (const [path, digest] of [
    [entry.scenario, entry.scenarioSha256], [entry.denseState, entry.denseStateSha256],
    [entry.rawRgbArchive, entry.rawRgbArchiveSha256], [entry.changeMap, entry.changeMapSha256],
  ]) invariant(sha(readFileSync(resolve(root, path))) === digest, `${side}: digest drift ${path}`);
  const unpacked = gunzipSync(readFileSync(resolve(root, entry.denseState)));
  invariant(sha(unpacked) === entry.probeJsonSha256, `${side}: probe JSON digest`);
  invariant(entry.probeJsonSha256 === entry.repeatProbeJsonSha256, `${side}: twice-fresh state mismatch`);
  const evidence = JSON.parse(unpacked.toString()) as Json;
  const rows = evidence.frames as Json[];
  invariant(same(evidence.sourceWindow, entry.sourceWindow), `${side}: source window`);
  invariant(rows.length === 209 && rows.at(-1)?.animScriptActive === false, `${side}: cleanup row`);
  invariant(evidence.observedPointerParities.join(",") === "0,1", `${side}: pointer parity`);
  invariant(evidence.lifecycleCounts.gGrudgeFlameSpriteTemplate === 6, `${side}: lifecycle count`);
  invariant(rgbSequence(resolve(root, entry.rawRgbArchive), rows) === entry.rawRgbSequenceSha256, `${side}: RGB sequence`);

  const effects = (row: Json): Json[] => row.sprites.filter((sprite: Json) => sprite.template.symbol === "gGrudgeFlameSpriteTemplate");
  invariant(effects(rows[45]!).length === 0 && effects(rows[46]!).length === 6, `${side}: create age`);
  invariant(effects(rows[131]!).length === 6 && effects(rows[132]!).length === 0, `${side}: destroy age`);
  const taskStages = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) {
    const task = row.tasks.find((candidate: Json) => candidate.func.symbol === "AnimTask_GrudgeFlames_Step");
    if (!task) continue;
    const ages = taskStages.get(task.data[0]) ?? []; ages.push(age); taskStages.set(task.data[0], ages);
  }
  invariant(JSON.stringify([...taskStages].map(([stage, ages]) => [stage, ages[0], ages.at(-1)]))
    === JSON.stringify([[1, 46, 72], [2, 73, 103], [3, 104, 130], [4, 131, 131], [5, 132, 132]]), `${side}: task stages`);
  const comparable = rows.slice(1);
  const oam = comparable.filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length;
  const matrices = comparable.filter((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)).length;
  const palette = comparable.filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length;
  const paletteMismatches = comparable.flatMap((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette) ? [] : [index + 1]);
  invariant(oam === 208 && matrices === 208 && palette === 207 && paletteMismatches.join(",") === "4", `${side}: display latches`);
  const gameplayRng = comparable.filter((row, index) => row.immutableState.rngValue !== rows[index]!.immutableState.rngValue).length;
  const animationRng = comparable.filter((row, index) => row.animationRng !== rows[index]!.animationRng).length;
  invariant(gameplayRng === 0 && animationRng === 205, `${side}: RNG domains`);
  invariant(rows[1]!.paletteTags.includes(10253) && rows[207]!.paletteTags.includes(10253)
    && !rows[208]!.paletteTags.includes(10253), `${side}: palette resource`);
  invariant(rows[1]!.tileTags.includes(10253) && rows[207]!.tileTags.includes(10253)
    && !rows[208]!.tileTags.includes(10253), `${side}: tile resource`);
  invariant(rows[7]!.audio.SE1.songHeaderIdentity.symbol === "se_m_psybeam"
    && rows[46]!.audio.SE1.songHeaderIdentity.symbol === "se_m_ember"
    && rows[140]!.audio.SE1.songHeaderIdentity.symbol === "se_m_nightmare", `${side}: audio anchors`);
  return {
    sourceWindow: evidence.sourceWindow, sourceRows: rows.length, rawRgbRows: rows.length,
    lifecycle: { creates: 6, createAge: 46, destroyAge: 132 },
    taskStages: "1:46-72,2:73-103,3:104-130,4:131,5:132",
    latches: { oam: `${oam}/208`, matrices: `${matrices}/208`, palette: `${palette}/208 + same-row age 4 monbg` },
    resources: "ANIM_TAG_PURPLE_FLAME ages 1..207; clear at 208",
    audio: "PSYBEAM@7, EMBER loop@46, NIGHTMARE@140",
    gameplayRngTransitions: gameplayRng, animationRngTransitions: animationRng,
  };
}

export function verifyGrudgeEvidence(): Record<Side, Json> {
  for (const [path, digest] of [
    [fixture.source.audit, fixture.source.auditSha256], [fixture.source.probe, fixture.source.probeSha256],
    [fixture.source.assetExtractor, fixture.source.assetExtractorSha256],
  ]) invariant(sha(readFileSync(resolve(root, path))) === digest, `source digest drift ${path}`);
  return { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") };
}
