import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/defense-curl-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function sourceBlock(path: string, start: string, end: string): string {
  const source = readFileSync(resolve(root, path), "utf8");
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  invariant(from >= 0 && to > from, `${start}: source bounds`);
  return source.slice(from, to);
}

function verifySource(): void {
  const script = sourceBlock("reference/pokeemerald/data/battle_anim_scripts.s", "Move_DEFENSE_CURL:", "Move_PROTECT:");
  invariant(script.length === 388 && sha(script) === receipt.source.scriptTextSha256, "Defense Curl script source drift");
  for (const token of ["ANIM_TAG_ECLIPSING_ORB", "SE_M_TRI_ATTACK", "set_grayscale_pal battler=ANIM_ATTACKER", "AnimTask_DefenseCurlDeformMon", "gEclipsingOrbSpriteTemplate", "set_original_pal battler=ANIM_ATTACKER"]) invariant(script.includes(token), `missing ${token}`);
  const effects = sourceBlock("reference/pokeemerald/src/battle_anim_effects_3.c", "const union AnimCmd gEclipsingOrbAnimCmds[]", "const struct SpriteTemplate gBatonPassPokeballSpriteTemplate");
  invariant(effects.length === 937 && sha(effects) === receipt.source.effectDefinitionsSha256, "orb definitions source drift");
  for (const token of ["ANIMCMD_FRAME(0, 3)", "ANIMCMD_FRAME(16, 3)", "ANIMCMD_FRAME(32, 3)", "ANIMCMD_FRAME(48, 3)", ".hFlip = TRUE", "ANIMCMD_LOOP(1)", "gOamData_AffineOff_ObjNormal_32x32", "AFFINEANIMCMD_FRAME(-12, 20, 0, 8)", "AFFINEANIMCMD_FRAME(12, -20, 0, 8)", "AFFINEANIMCMD_LOOP(2)"]) invariant(effects.includes(token), `missing ${token}`);
  const task = sourceBlock("reference/pokeemerald/src/battle_anim_effects_3.c", "void AnimTask_DefenseCurlDeformMon(u8 taskId)", "\nstatic void AnimBatonPassPokeball");
  invariant(task.length === 415 && sha(task) === receipt.source.taskDefinitionSha256, "deform task source drift");
  invariant(sha(readFileSync(resolve(root, "src/animation/assets/defense-curl.json"))) === receipt.source.assetSha256, "extracted orb asset drift");
}

function readRows(side: Side): { probe: Json; rows: Json[]; rgb: Buffer[] } {
  const item = receipt.orientations[side];
  invariant(sha(readFileSync(resolve(root, item.scenario))) === item.scenarioSha256, `${side}: scenario SHA`);
  const gzip = readFileSync(resolve(root, item.denseState));
  invariant(sha(gzip) === item.denseStateSha256, `${side}: dense archive SHA`);
  const json = gunzipSync(gzip);
  invariant(sha(json) === item.probeJsonSha256, `${side}: probe JSON SHA`);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const archive = resolve(root, item.rawRgbArchive);
  invariant(sha(readFileSync(archive)) === item.rawRgbArchiveSha256, `${side}: raw archive SHA`);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 32 * 1024 * 1024 });
  const frameBytes = 240 * 160 * 3;
  invariant(names.length === 100 && bytes.length === names.length * frameBytes, `${side}: raw archive shape`);
  const byName = new Map(names.map((name, index) => [basename(name), bytes.subarray(index * frameBytes, (index + 1) * frameBytes)]));
  const rgb = rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`));
  invariant(rgb.every(Boolean), `${side}: raw frame names`);
  const frames = rgb as Buffer[];
  invariant(sha(Buffer.concat(frames)) === item.rawRgbSequenceSha256, `${side}: raw sequence SHA`);
  invariant(frames.every((frame, index) => sha(frame) === rows[index]!.sha256), `${side}: per-row raw SHA`);
  invariant(sha(readFileSync(resolve(root, item.changeMap))) === item.changeMapSha256, `${side}: change-map SHA`);
  return { probe, rows, rgb: frames };
}

function verifyOrientation(side: Side): Json {
  const item = receipt.orientations[side];
  const { probe, rows } = readRows(side);
  invariant(probe.schema === "defense-curl-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 111, `${side}: schema/profile`);
  invariant(rows.length === 100 && rows[0]!.frame === item.window.startFrame && rows.at(-1)!.frame === item.window.endFrame, `${side}: full window`);
  invariant(rows.every((row, age) => row.frame === item.window.startFrame + age), `${side}: non-consecutive rows`);
  invariant(rows.slice(0, -1).every((row) => row.animScriptActive) && !rows.at(-1)!.animScriptActive, `${side}: inactive cleanup`);
  invariant(probe.sourcePointerContract.start === 0x082cb37c && probe.sourcePointerContract.endExclusive === 0x082cb3b5 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer interval/parities`);
  invariant(probe.topology.tasks.includes("AnimTask_DefenseCurlDeformMon") && probe.topology.tasks.includes("Task_LoopAndPlaySE") && probe.topology.templates.includes("gEclipsingOrbSpriteTemplate") && probe.topology.callbacks.includes("AnimSpriteOnMonPos"), `${side}: topology`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128), `${side}: dense inventory`);
  for (const key of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: mutable ${key}`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM is not RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: palette is not RAM+1`);
  invariant(rows.slice(2).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: matrices are not RAM+2`);
  const task = (row: Json) => row.tasks.find((value: Json) => value.func?.symbol === "AnimTask_DefenseCurlDeformMon");
  const orb = (row: Json) => row.sprites.filter((value: Json) => value.template?.symbol === "gEclipsingOrbSpriteTemplate");
  invariant(rows.findIndex((row) => task(row)) === 4 && rows.reduce((last, row, age) => task(row) ? age : last, -1) === 54, `${side}: deform lifecycle`);
  invariant(rows.findIndex((row) => orb(row).length) === 56 && rows.reduce((last, row, age) => orb(row).length ? age : last, -1) === 97, `${side}: orb lifecycle`);
  invariant(orb(rows[56]!).length === 1 && orb(rows[56]!)[0]!.data[0] === 1 && orb(rows[97]!)[0]!.animCmdIndex === 7, `${side}: orb loop edges`);
  invariant(rows.slice(1).filter((row, age) => row.animationRng !== rows[age]!.animationRng).length === 99, `${side}: animation RNG cadence`);
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows[4]!.audio.SE1.songHeaderIdentity.symbol === "se_m_tri_attack" && rows[41]!.soundTaskCount === 0, `${side}: audio lifecycle`);
  return { pointerRows: rows.length, taskRows: 51, orbRows: 42, oamPredecessor: 99, palettePredecessor: 99, matrixAgeMinusTwo: 98, gameplayRngTransitions: 0, animationRngTransitions: 99 };
}

function verifyControls(): void {
  const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
  const status = (move: string) => coverage.entries.find((entry: Json) => entry.move === move)?.status;
  invariant(status("MOVE_PERISH_SONG") === "exact" && status("MOVE_IRON_TAIL") === "exact" && status("MOVE_POISON_TAIL") === "exact", "palette control status changed");
  invariant(status("MOVE_DEFENSE_CURL") === undefined, "Defense Curl must remain unsupported");
  const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
  const move = (name: string, next: string) => scripts.slice(scripts.indexOf(`${name}:`), scripts.indexOf(`${next}:`));
  const perish = move("Move_PERISH_SONG", "Move_SLEEP_TALK");
  invariant(perish.includes("set_grayscale_pal") && perish.includes("set_original_pal"), "Perish Song palette control drift");
  invariant(move("Move_IRON_TAIL", "Move_POISON_TAIL").includes("set_original_pal") && move("Move_POISON_TAIL", "Move_METAL_CLAW").includes("set_original_pal"), "tail palette control drift");
}

export function verifyDefenseCurlEvidence(): Record<Side, Json> {
  invariant(receipt.status === "unsupported-evidence-checkpoint" && receipt.coverageCredit === false, "unsupported checkpoint overclaim");
  verifySource(); verifyControls();
  return { "player-back": verifyOrientation("player-back"), "opponent-front": verifyOrientation("opponent-front") };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyDefenseCurlEvidence(), null, 2));
