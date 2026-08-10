import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { flameWheelAtAge } from "../../src/animation/flameWheel.ts";
import {
  createSceneOnMovePresentation, sceneOnFlameWheelView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "flame-wheel-portable-evidence/v2";
  readonly oracleProfile: "battle-scene-on";
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler; readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number; readonly playerGender?: "male" | "female"; readonly opponentGender?: "male" | "female" };
  readonly evidenceSchema: "flame-wheel-dense-evidence/v2";
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: "exact"; readonly componentMatching: number; readonly framebufferMatching: number };
}
interface Sprite { readonly slot: number; readonly attr: readonly number[]; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly invisible: boolean; readonly animCmdIndex: number; readonly matrixNum: number; readonly matrix: readonly number[]; readonly template: { readonly symbol: string | null }; }
interface Frame { readonly frame: number; readonly sprites: readonly Sprite[]; readonly playerSprite: Sprite; readonly opponentSprite: Sprite; readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[]; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[]; readonly spriteOrder: readonly number[]; readonly hardwareMatrices: readonly (readonly number[])[]; readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[]; readonly paletteTags: readonly number[]; readonly tileTags: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly backgroundPositions: Readonly<Record<string, number>>; readonly se1: { readonly status: number; readonly tracks: readonly { readonly panX: number }[] }; readonly se2: unknown; readonly immutableState: unknown; readonly battlers: unknown; readonly parties: unknown; }
interface Probe { readonly schema: string; readonly sourceWindow: Fixture["denseWindow"]; readonly frames: readonly Frame[]; }

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-flame-wheel-portable-");
const output = join(scratch, "probe.json"); const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);
const receipt = readFileSync(output);
const probe = JSON.parse(receipt.toString("utf8")) as Probe;
const raw = Buffer.concat(readdirSync(rgbDir).sort().map((file) => readFileSync(join(rgbDir, file))));
const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
if (mapRun.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
const separator = mapRun.stdout.indexOf(" — ");
if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
const changeMap = `# ${basename(fixture.changeMap)} raw RGB888 — ${mapRun.stdout.slice(separator + 3)}`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
if (fixture.schema !== "flame-wheel-portable-evidence/v2"
  || fixture.oracleProfile !== "battle-scene-on"
  || probe.schema !== fixture.evidenceSchema
  || JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)
  || probe.frames.length !== fixture.denseWindow.frameCount
  || sha(receipt) !== fixture.evidenceSha256
  || sha(receipt) !== fixture.secondFreshEvidenceSha256
  || sha(raw) !== fixture.rawRgbSha256
  || sha(changeMap) !== fixture.changeMapSha256
  || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")
  || fixture.acceptance.componentMatching !== fixture.denseWindow.frameCount
  || fixture.acceptance.framebufferMatching !== fixture.denseWindow.frameCount) {
  throw new Error(`${fixture.orientation}: stable source receipt/window drift`);
}
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({ move: "FLAME_WHEEL", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile });
const first = probe.frames[0]!; let components = 0; let framebuffers = 0;
const componentMismatches: string[] = []; const framebufferMismatches: string[] = [];
const blend15 = (color: number, target: number, coefficient: number) => {
  const c = (shift: number) => ((color >>> shift) & 31) + (((((target >>> shift) & 31) - ((color >>> shift) & 31)) * coefficient) >> 4);
  return c(0) | (c(5) << 5) | (c(10) << 10);
};
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const oracle = frames.get(frame); if (!oracle) throw new Error(`probe omitted ${frame}`);
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const expected = flameWheelAtAge(age, fixture.attacker.geometry.side, fixture.attacker.geometry.animationCenter, fixture.target.geometry.animationCenter);
  const seam = sceneOnFlameWheelView({ ...stage, age });
  const attacker = fixture.attacker.geometry.side === "player" ? oracle.playerSprite : oracle.opponentSprite;
  const target = fixture.target.geometry.side === "player" ? oracle.playerSprite : oracle.opponentSprite;
  const moveSprites = oracle.sprites.filter((sprite) => sprite.template.symbol === "gFireSpiralOutwardSpriteTemplate" || sprite.template.symbol === "gFireSpreadSpriteTemplate");
  const actualVisible = moveSprites.filter((sprite) => !sprite.invisible).map((sprite) => ({
    kind: sprite.template.symbol === "gFireSpreadSpriteTemplate" ? "fireSpread" : "spiral",
    centerX: sprite.x + sprite.x2, centerY: sprite.y + sprite.y2,
    sheetFrame: sprite.animCmdIndex + (sprite.template.symbol === "gFireSpreadSpriteTemplate" ? 1 : 0), slot: sprite.slot,
  })).sort((a, b) => a.slot - b.slot);
  const predictedVisible = expected.sprites.map(({ kind, centerX, centerY, sheetFrame, slot }) => ({ kind, centerX, centerY, sheetFrame, slot })).sort((a, b) => a.slot - b.slot);
  const visibleSlots = new Set(actualVisible.map((sprite) => sprite.slot));
  const spriteOrderOk = JSON.stringify(oracle.spriteOrder.filter((slot) => visibleSlots.has(slot)).reverse())
    === JSON.stringify(expected.sprites.map((sprite) => sprite.slot));
  const paletteStart = 256 + ((target.attr[2]! >>> 12) & 15) * 16 + 1;
  const paletteOk = Array.from({ length: 15 }, (_, i) => i).every((i) => oracle.fadedPalette[paletteStart + i] === blend15(oracle.unfadedPalette[paletteStart + i]!, 31, expected.targetRedCoefficient));
  const transferOk = age === 0 || JSON.stringify(oracle.hardwareOam) === JSON.stringify(probe.frames[age - 1]!.softwareOam);
  const matrixOk = age === 0 || probe.frames[age - 1]!.sprites.every((sprite) => JSON.stringify(oracle.hardwareMatrices[sprite.matrixNum]) === JSON.stringify(sprite.matrix));
  // The monbg/split-BG setup at age 4 performs its own palette transfer in
  // the same callback pass; every other settled frame follows the VBlank lag.
  const paletteTransferOk = age < 2 || age === 4 || JSON.stringify(oracle.hardwarePalette) === JSON.stringify(probe.frames[age - 1]!.fadedPalette);
  const tagsOk = oracle.tileTags.includes(10029) === expected.smallEmberTagLoaded && oracle.paletteTags.includes(10029) === expected.smallEmberTagLoaded;
  const tasksOk = oracle.tasks.some((task) => task.func.symbol === "AnimTask_ShakeMon_Step") === (age >= 119 && age <= 132)
    && oracle.tasks.some((task) => task.func.symbol === "AnimTask_BlendMonInAndOut_Step") === (age >= 119 && age <= 141);
  const stateOk = JSON.stringify(oracle.immutableState) === JSON.stringify(first.immutableState) && JSON.stringify(oracle.battlers) === JSON.stringify(first.battlers) && JSON.stringify(oracle.parties) === JSON.stringify(first.parties);
  const audioAge = [7, 11, 15, 19, 23, 27, 31, 119].includes(age);
  const audioOk = !audioAge || (oracle.se1.status !== 0x80000000 && oracle.se1.tracks.some((track) => Math.abs(track.panX) >= 63));
  const registerOk = oracle.registers.bldalpha === 0 && Object.values(oracle.registers).every(Number.isInteger) && Object.values(oracle.backgroundPositions).every(Number.isInteger);
  const componentOk = attacker.x2 === expected.attackerOffset.x2 && attacker.y2 === expected.attackerOffset.y2
    && target.x2 === expected.targetOffset.x2 + (fixture.attacker.geometry.side === "player" && age < 119 ? 1 : 0)
    && target.y2 === expected.targetOffset.y2
    && target.invisible === expected.targetOnMonBg && JSON.stringify(actualVisible) === JSON.stringify(predictedVisible)
    && spriteOrderOk && paletteOk && transferOk && matrixOk && paletteTransferOk && tagsOk && tasksOk && stateOk && audioOk && registerOk
    && JSON.stringify(seam) === JSON.stringify({ attacker: fixture.attacker, target: fixture.target, ...expected });
  if (componentOk) components += 1; else if (componentMismatches.length < 20) componentMismatches.push(`${frame}/age${age}: battlers=${attacker.x2},${target.x2}/${expected.attackerOffset.x2},${expected.targetOffset.x2} sprites=${JSON.stringify(actualVisible)}/${JSON.stringify(predictedVisible)} order/pal/oam/matrix/hpal/tags/tasks/state/audio/reg=${spriteOrderOk}/${paletteOk}/${transferOk}/${matrixOk}/${paletteTransferOk}/${tagsOk}/${tasksOk}/${stateOk}/${audioOk}/${registerOk}`);
  const rgba = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as EngineState);
  const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`)); let diff = 0; let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (rgba[pixel * 4] !== rgb[pixel * 3] || rgba[pixel * 4 + 1] !== rgb[pixel * 3 + 1] || rgba[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) { diff += 1; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (diff === 0) framebuffers += 1; else if (framebufferMismatches.length < 24) framebufferMismatches.push(`${frame}/age${age}:${diff}px@${minX},${minY}-${maxX},${maxY}`);
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`FLAME_WHEEL component/seam/hardware/state/raw-RGB ${components}/${total}; framebuffer ${framebuffers}/${total}`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
process.exit(components === total && framebuffers === total ? 0 : 1);
