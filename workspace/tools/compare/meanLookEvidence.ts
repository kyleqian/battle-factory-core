import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { meanLookAtAge } from "../../src/animation/meanLook.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/mean-look-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function sourceBlock(path: string, start: string, end: string): string { const source = readFileSync(resolve(root, path), "utf8"); const from = source.indexOf(start); const to = source.indexOf(end, from + start.length); invariant(from >= 0 && to > from, `${start}: source bounds`); return source.slice(from, to); }

function verifySource(): void {
  invariant(sha(sourceBlock("reference/pokeemerald/data/battle_anim_scripts.s", "Move_MEAN_LOOK:", "Move_ROCK_THROW:")) === receipt.source.scriptTextSha256, "Mean Look script drift");
  invariant(sha(sourceBlock("reference/pokeemerald/src/battle_anim_effects_3.c", "const union AffineAnimCmd gMeanLookEyeAffineAnimCmds1[]", "const struct SpriteTemplate gSpikesSpriteTemplate")) === receipt.source.effectDefinitionsSha256, "Mean Look affine/template drift");
  invariant(sha(sourceBlock("reference/pokeemerald/src/battle_anim_effects_3.c", "static void AnimMeanLookEye(struct Sprite *sprite)", "\nvoid AnimTask_SetPsychicBackground")) === receipt.source.callbackDefinitionsSha256, "Mean Look callback drift");
  invariant(sha(readFileSync(resolve(root, "src/animation/assets/mean-look.json"))) === receipt.source.assetSha256, "Mean Look EYE asset drift");
}

function readRows(side: Side): Json[] {
  const item = receipt.orientations[side];
  invariant(sha(readFileSync(resolve(root, item.scenario))) === item.scenarioSha256, `${side}: scenario drift`);
  const dense = readFileSync(resolve(root, item.denseState)); invariant(sha(dense) === item.denseStateSha256, `${side}: dense receipt`);
  const json = gunzipSync(dense); invariant(sha(json) === item.probeJsonSha256, `${side}: probe receipt`);
  const rows = (JSON.parse(json.toString("utf8")) as Json).frames as Json[];
  const archive = readFileSync(resolve(root, item.rawRgbArchive)); invariant(sha(archive) === item.rawRgbArchiveSha256, `${side}: RGB archive receipt`);
  const rgb = execFileSync("tar", ["-xOzf", resolve(root, item.rawRgbArchive)], { maxBuffer: 32 * 1024 * 1024 });
  invariant(rgb.length === rows.length * 240 * 160 * 3 && sha(rgb) === item.rawRgbSequenceSha256, `${side}: RGB sequence receipt`);
  invariant(sha(readFileSync(resolve(root, item.changeMap))) === item.changeMapSha256, `${side}: change-map receipt`);
  return rows;
}

function verifySide(side: Side): Json {
  const rows = readRows(side); const item = receipt.orientations[side];
  invariant(rows.length === 171 && rows[0]!.frame === item.window.startFrame && rows.at(-1)!.frame === item.window.endFrame, `${side}: complete window`);
  invariant(rows.every((row, age) => row.frame === item.window.startFrame + age), `${side}: consecutive rows`);
  invariant(rows.slice(0, -1).every(row => row.animScriptActive) && !rows.at(-1)!.animScriptActive, `${side}: inactive cleanup`);
  invariant(rows[0]!.scriptPtr === 0x082cbf1a && rows[169]!.scriptPtr < 0x082cbf5f && same([...new Set(rows.map(row => row.scriptPtrParity))], [0, 1]), `${side}: pointer interval/parities`);
  const eye = (row: Json) => row.sprites.find((sprite: Json) => sprite.template?.symbol === "gMeanLookEyeSpriteTemplate");
  invariant(rows.findIndex(eye) === 7 && rows.reduce((last, row, age) => eye(row) ? age : last, -1) === 165, `${side}: eye lifecycle`);
  const center = { x: eye(rows[7]!).x, y: eye(rows[7]!).y }; const priority = eye(rows[7]!).subpriority + 2;
  for (let age = 0; age < rows.length; age++) {
    const reduced = meanLookAtAge(age, center, priority); const sprite = eye(rows[age]);
    invariant(Boolean(reduced.eye) === Boolean(sprite), `${side}: reducer membership age ${age}`);
    if (!reduced.eye || !sprite) continue;
    invariant(reduced.eye.invisible === sprite.invisible && reduced.eye.x2 === sprite.x2 && reduced.eye.y2 === sprite.y2, `${side}: reducer pose age ${age}`);
    if (age <= 94) invariant(Math.trunc(0x10000 / reduced.eye.xScale) === sprite.matrix[0] && Math.trunc(0x10000 / reduced.eye.yScale) === sprite.matrix[3], `${side}: affine age ${age}`);
  }
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age].softwareOam)), `${side}: OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age].softwareMatrices)), `${side}: matrix RAM+1`);
  const paletteMatches = rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age].fadedPalette)).length;
  invariant(paletteMatches === 169 && !same(rows[4].hardwarePalette, rows[3].fadedPalette), `${side}: palette latch`);
  invariant(rows.every(row => row.immutableState.rngValue === rows[0].immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows.slice(1).filter((row, age) => row.animationRng !== rows[age].animationRng).length === 168, `${side}: animation RNG cadence`);
  return { pointerRows: 171, eyeRows: 159, hiddenRows: 11, wobbleRows: 16, oamPredecessor: 170, matrixPredecessor: 170, palettePredecessor: 169, gameplayRngTransitions: 0, animationRngTransitions: 168 };
}

function verifyControls(): void {
  const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
  const status = (move: string) => coverage.entries.find((entry: Json) => entry.move === move)?.status;
  invariant(status("MOVE_MEAN_LOOK") === "exact" && status("MOVE_PERISH_SONG") === "exact" && status("MOVE_CONFUSE_RAY") === "exact", "Mean Look/control statuses changed");
}

export function verifyMeanLookEvidence(): Record<Side, Json> { invariant(receipt.status === "exact" && receipt.coverageCredit, "Mean Look exact receipt missing"); verifySource(); verifyControls(); return { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") }; }
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyMeanLookEvidence(), null, 2));
