import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { stompAtAge } from "../../src/animation/stomp.ts";
import {
  createSceneOnMovePresentation,
  sceneOnStompView,
  type SceneOnStompConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Fixture = SceneOnStompConfig & {
  readonly schema: "stomp-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/stompProbe.py";
  readonly attackerSide: Side;
  readonly targetSide: Side;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: 67 };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: "exact"; readonly componentMatching: 67; readonly framebufferMatching: 67 };
};
type Sprite = { readonly slot: number; readonly template: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly invisible: boolean; readonly attr0: number; readonly attr1: number; readonly attr2: number; readonly subpriority: number; readonly matrixNum: number; readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number } };
type Frame = { readonly frame: number; readonly sha256: string; readonly scriptPtr: number; readonly animScriptActive: boolean; readonly player: Record<string, unknown>; readonly opponent: Record<string, unknown>; readonly playerSprite: Sprite; readonly opponentSprite: Sprite; readonly moveSprites: Record<string, readonly Sprite[]>; readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[]; readonly paletteTags: readonly number[]; readonly tileTags: readonly number[]; readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[]; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly (readonly number[])[]; readonly hardwareMatrices: readonly (readonly number[])[]; readonly registers: { readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number }; readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] } };
type Probe = { readonly schema: "stomp-dense-evidence/v1"; readonly scriptBounds: { readonly Move_STOMP: number; readonly Move_TAIL_WHIP: number }; readonly templates: Record<string, number>; readonly taskFuncs: Record<string, number>; readonly songHeaders: Record<string, number>; readonly sourceWindow: Fixture["sourceWindow"]; readonly frames: readonly Frame[] };
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: stompPortable.ts <player fixture> <opponent fixture>");
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const receipts = new Map<string, string>();
const rawReceipts = new Map<string, string>();

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync(
    "python3",
    [join(root, "tools/compare/frame-changemap.py"), rgbDir],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function u16le(value: number): string {
  const word = value & 0xffff;
  return `${(word & 0xff).toString(16).padStart(2, "0")}${(word >>> 8).toString(16).padStart(2, "0")}`;
}

function priorHardwareMatches(
  oracle: Frame,
  prior: Frame | undefined,
  sprite: Sprite | undefined,
): boolean {
  if (!prior || !sprite) return true;
  const raw = `${u16le(sprite.attr0)}${u16le(sprite.attr1)}${u16le(sprite.attr2)}`;
  const oamIndex = prior.softwareOam.findIndex((candidate) => candidate.startsWith(raw));
  return oamIndex >= 0
    && same(oracle.hardwareOam[oamIndex], [sprite.attr0, sprite.attr1, sprite.attr2])
    && same(oracle.hardwareMatrices[sprite.matrixNum], [
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
    ]);
}

function fresh(fixture: Fixture): { probe: Probe; rgbDir: string; scratch: string } {
  const scratch = createScratchDir(`pokebench-stomp-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed (${run.status})`);
  return { probe: JSON.parse(readFileSync(output, "utf8")) as Probe, rgbDir, scratch };
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== rgb[pixel * 3] || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1] || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff += 1;
  return diff;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const { probe, rgbDir, scratch } = fresh(fixture);
  const source = probe.frames;
  if (fixture.schema !== "stomp-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on" || probe.schema !== "stomp-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow) || source.length !== 67) throw new Error(`${fixture.orientation}: incomplete pointer window`);
  const stage = createSceneOnMovePresentation({ ...fixture, move: "STOMP" as const });
  const first = source[0]!;
  const evidence = createHash("sha256"); const rawWindow = createHash("sha256");
  const failures: string[] = []; let components = 0; let framebuffers = 0;
  for (const [age, oracle] of source.entries()) {
    const before = failures.length;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    evidence.update(JSON.stringify(oracle)); evidence.update(rgb); rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) failures.push(`age ${age}: raw RGB`);
    const predicted = stompAtAge(age, fixture.targetSide, fixture.target.geometry.animationCenter);
    const seam = sceneOnStompView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (predicted.active !== oracle.animScriptActive) failures.push(`age ${age}: cleanup`);
    if (age === 0 && !(oracle.scriptPtr >= probe.scriptBounds.Move_STOMP && oracle.scriptPtr < probe.scriptBounds.Move_TAIL_WHIP)) failures.push("age 0: pointer entry");
    const foot = oracle.moveSprites.gStompFootSpriteTemplate ?? [];
    const effectSubpriority = fixture.targetSide === "player" ? 37 : 27;
    if ((predicted.foot === null) !== (foot.length === 0) || predicted.foot && (foot.length !== 1 || foot[0]!.template !== probe.templates.gStompFootSpriteTemplate || foot[0]!.x !== predicted.foot.x || foot[0]!.y !== predicted.foot.y || foot[0]!.y2 !== predicted.foot.y2 || foot[0]!.subpriority !== effectSubpriority)) failures.push(`age ${age}: StompFoot callback`);
    const hits = oracle.moveSprites.gBasicHitSplatSpriteTemplate ?? [];
    if ((predicted.hitsplat === null) !== (hits.length === 0) || predicted.hitsplat && (hits.length !== 1 || hits[0]!.template !== probe.templates.gBasicHitSplatSpriteTemplate || hits[0]!.x !== predicted.hitsplat.x || hits[0]!.y !== predicted.hitsplat.y || hits[0]!.subpriority !== effectSubpriority + 1 || hits[0]!.matrix.a !== 303 || hits[0]!.matrix.d !== 303)) failures.push(`age ${age}: animation-1 hitsplat`);
    const target = fixture.targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
    // The live front ONIX retains its idle x2 through source age 30, then
    // `monbg`'s native-position copy sees the cleared callback x2.  Shake's
    // y2 is RAM state here (the renderer intentionally consumes it one OAM
    // latch later, just like the transient sprites below).
    const targetX2 = fixture.targetSide === "opponent" && age <= 30 ? 1 : 0;
    if (target.invisible !== predicted.targetOnMonBg || target.x2 !== targetX2 || target.y2 !== predicted.targetOffset.y2) failures.push(`age ${age}: monbg/ShakeMon display`);
    const alpha = predicted.alpha !== null;
    if (alpha ? oracle.registers.bldcnt !== 0x3f40 || oracle.registers.bldalpha !== 0x080c || oracle.registers.bldy !== 0 : oracle.registers.bldcnt !== 0 || oracle.registers.bldalpha !== 0 || oracle.registers.bldy !== 0) failures.push(`age ${age}: alpha registers`);
    for (const [tag, active] of [[10143, predicted.handsAndFeetLoaded], [10135, predicted.impactLoaded]] as const) if (oracle.paletteTags.includes(tag) !== active || oracle.tileTags.includes(tag) !== active) failures.push(`age ${age}: tag ${tag}`);
    const shaking = oracle.tasks.some((task) => (task.func & ~1) === probe.taskFuncs.AnimTask_ShakeMon_Step);
    if (shaking !== (age >= 31 && age <= 46)) failures.push(`age ${age}: AnimTask_ShakeMon`);
    if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512 || oracle.softwareOam.length !== 128 || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32) failures.push(`age ${age}: hardware shape`);
    const paletteSource = age < 1 ? source[0]! : age < 4 ? source[1]! : age < 7 ? source[4]! : source[7]!;
    const paletteHardware = age < 2 ? source[0]! : age < 5 ? source[2]! : age < 7 ? source[5]! : source[7]!;
    if (!same(oracle.fadedPalette, paletteSource.fadedPalette) || !same(oracle.unfadedPalette, paletteSource.unfadedPalette) || !same(oracle.hardwarePalette, paletteHardware.hardwarePalette)) failures.push(`age ${age}: palette-load/OAM latch`);
    const previous = source[age - 1];
    if (!priorHardwareMatches(oracle, previous, previous?.moveSprites.gStompFootSpriteTemplate?.[0]) || !priorHardwareMatches(oracle, previous, previous?.moveSprites.gBasicHitSplatSpriteTemplate?.[0])) failures.push(`age ${age}: hardware OAM/matrix latch`);
    if (predicted.sound) { const pan = fixture.targetSide === "player" ? -63 : 63; if (oracle.se1.songHeader !== probe.songHeaders[predicted.sound] || !oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === pan)) failures.push(`age ${age}: ${predicted.sound} target pan`); }
    for (const side of ["player", "opponent"] as const) for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) if (oracle[side][key] !== first[side][key]) failures.push(`age ${age}: immutable ${side}.${key}`);
    if (failures.length === before) components += 1;
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebuffers += 1; else failures.push(`age ${age}: framebuffer ${diff}`);
  }
  const evidenceSha = evidence.digest("hex"); const rawSha = rawWindow.digest("hex");
  if (evidenceSha !== fixture.evidenceSha256) failures.push(`evidence ${evidenceSha}`);
  if (rawSha !== fixture.rawRgbSha256) failures.push(`raw ${rawSha}`);
  const changeMap = normalizedChangeMap(fixture, rgbDir);
  if (sha256(changeMap) !== fixture.changeMapSha256
    || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")) failures.push("change-map receipt");
  if (runNumber === 1) {
    receipts.set(fixture.orientation, evidenceSha);
    rawReceipts.set(fixture.orientation, rawSha);
  } else if (receipts.get(fixture.orientation) !== evidenceSha || rawReceipts.get(fixture.orientation) !== rawSha) failures.push("fresh receipt");
  console.log(`${fixture.orientation} run ${runNumber}: ${components}/67 component; ${framebuffers}/67 framebuffer; evidence/raw ${evidenceSha}/${rawSha}`);
  if (failures.length) { console.error(failures.slice(0, 50).join("\n")); console.error(`scratch: ${scratch}`); process.exit(1); }
}
for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
