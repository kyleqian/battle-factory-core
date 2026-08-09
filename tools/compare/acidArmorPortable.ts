import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { acidArmorAtAge } from "../../src/animation/acidArmor.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAcidArmorView,
  type SceneOnAcidArmorConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnAcidArmorConfig & {
  readonly schema: "acid-armor-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/acidArmorProbe.py";
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: 119 };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
};
type Frame = {
  readonly frame: number; readonly sha256: string; readonly animScriptActive: boolean; readonly scriptPtr: number;
  readonly engine: Record<string, unknown>; readonly player: Record<string, unknown>; readonly opponent: Record<string, unknown>;
  readonly playerSprite: { readonly slot: number; readonly invisible: boolean; readonly attr: readonly number[]; readonly matrixNum: number; readonly matrix: readonly number[]; readonly hardwareMatrix: readonly number[] };
  readonly opponentSprite: { readonly slot: number; readonly invisible: boolean; readonly attr: readonly number[]; readonly matrixNum: number; readonly matrix: readonly number[]; readonly hardwareMatrix: readonly number[] };
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly scanline: { readonly dmaDest: number; readonly dmaControl: number; readonly srcBuffer: number; readonly state: number };
  readonly scanlineBuffers: readonly (readonly number[])[];
  readonly registers: Record<string, number>; readonly battleBg: Record<string, number>;
  readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly softwareOam: readonly string[]; readonly hardwareOam: readonly (readonly number[])[]; readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
};
type Probe = { readonly schema: "acid-armor-dense-evidence/v1"; readonly scriptBounds: { readonly Move_ACID_ARMOR: number; readonly Move_SHARPEN: number }; readonly songHeaders: { readonly SE_M_ACID_ARMOR: number }; readonly frames: readonly Frame[] };
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: acidArmorPortable.ts <player fixture> <opponent fixture>");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const receipts = new Map<string, string>();

function fresh(fixture: Fixture): { probe: Probe; bytes: Buffer; rgbDir: string; scratch: string } {
  const scratch = createScratchDir(`pokebench-acid-armor-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed`);
  const bytes = readFileSync(output);
  return { probe: JSON.parse(bytes.toString()) as Probe, bytes, rgbDir, scratch };
}

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  const separator = run.stdout.indexOf(" — ");
  if (run.status !== 0 || separator < 0) throw new Error("change-map generation failed");
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let count = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== rgb[p * 3] || app[p * 4 + 1] !== rgb[p * 3 + 1] || app[p * 4 + 2] !== rgb[p * 3 + 2]) count += 1;
  return count;
}

function flatten(rows: readonly Readonly<{ hofs: number; vofs: number }>[]): number[] {
  return rows.flatMap(({ hofs, vofs }) => [hofs, vofs]);
}

function decodeSoftwareOam(raw: string): readonly number[] {
  return [0, 4, 8].map((offset) => (
    Number.parseInt(raw.slice(offset + 2, offset + 4) + raw.slice(offset, offset + 2), 16)
  ));
}

function initializedOtherBuffer(side: "player" | "opponent"): number[] {
  const base = flatten(acidArmorAtAge(4, side).scanlines);
  const top = side === "player" ? 46 : 6;
  const bgX = side === "player" ? -40 : -144;
  for (let y = 0; y <= top; y += 1) base[y * 2] = bgX + 240;
  return base;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const { probe, bytes, rgbDir, scratch } = fresh(fixture);
  const failures: string[] = [];
  const rawHash = createHash("sha256");
  let components = 0, framebuffers = 0;
  if (probe.schema !== "acid-armor-dense-evidence/v1" || probe.frames.length !== 119 || probe.frames[0]?.frame !== fixture.sourceWindow.startFrame || probe.frames.at(-1)?.frame !== fixture.sourceWindow.endFrame) failures.push("pointer-bounded window");
  const stage = createSceneOnMovePresentation(fixture);
  const first = probe.frames[0]!;
  for (const [age, row] of probe.frames.entries()) {
    const before = failures.length;
    const state = acidArmorAtAge(age, fixture.attacker.geometry.side);
    const seam = sceneOnAcidArmorView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(state, seamState)) failures.push(`age ${age}: typed seam`);
    if (!same(state.taskData, row.tasks[0]?.data ?? [])) failures.push(`age ${age}: task data`);
    if (row.tasks.length !== (state.taskActive ? 1 : 0)) failures.push(`age ${age}: task lifecycle`);
    if (row.scanline.state !== state.scanlineState) failures.push(`age ${age}: scanline state`);
    if (age >= 4 && age <= 79) {
      const side = fixture.attacker.geometry.side;
      let buffersExact: boolean;
      if (age === 4) {
        buffersExact = same(row.scanlineBuffers[row.scanline.srcBuffer], flatten(acidArmorAtAge(5, side).scanlines))
          && same(row.scanlineBuffers[row.scanline.srcBuffer ^ 1], initializedOtherBuffer(side));
      } else if (age >= 67) {
        buffersExact = same(row.scanlineBuffers[0], flatten(acidArmorAtAge(66, side).scanlines))
          && same(row.scanlineBuffers[1], flatten(acidArmorAtAge(67, side).scanlines));
      } else {
        buffersExact = same(row.scanlineBuffers[row.scanline.srcBuffer], flatten(acidArmorAtAge(age + 1, side).scanlines))
          && same(row.scanlineBuffers[row.scanline.srcBuffer ^ 1], flatten(state.scanlines));
      }
      if (!buffersExact) failures.push(`age ${age}: both scanline buffers`);
      const dmaDest = state.bg === "BG1" ? 0x04000014 : 0x04000018;
      if (row.scanline.dmaDest !== dmaDest || row.scanline.dmaControl !== 0xa6600001) failures.push(`age ${age}: scanline DMA/priority`);
    }
    const attacker = fixture.attacker.geometry.side === "player" ? row.playerSprite : row.opponentSprite;
    if (attacker.invisible !== state.monbgActive) failures.push(`age ${age}: monbg visibility`);
    if (row.registers.BLDCNT !== state.bldcnt || row.registers.BLDALPHA !== (state.bldcnt ? state.bldalpha : 0) || row.registers.BLDY !== 0) failures.push(`age ${age}: blend registers`);
    const paletteSource = fixture.orientation === "opponent-front" && age >= 1 ? probe.frames[1]! : first;
    if (row.fadedPalette.length !== 512 || !same(row.fadedPalette, paletteSource.fadedPalette) || !same(row.unfadedPalette, paletteSource.unfadedPalette) || !same(row.hardwarePalette, paletteSource.hardwarePalette)) failures.push(`age ${age}: palette immutability/transfer`);
    const previous = probe.frames[age - 1];
    const oamTransfer = !previous || row.hardwareOam.every((entry, index) => (
      same(entry, decodeSoftwareOam(previous.softwareOam[index]!))
    ));
    const previousAttacker = previous && (
      fixture.attacker.geometry.side === "player" ? previous.playerSprite : previous.opponentSprite
    );
    const matrixTransfer = !previousAttacker || same(
      row.hardwareMatrices[previousAttacker.matrixNum],
      previousAttacker.matrix,
    );
    if (row.softwareOam.length !== 128 || row.hardwareOam.length !== 128
      || row.hardwareMatrices.length !== 32 || !oamTransfer || !matrixTransfer) {
      failures.push(`age ${age}: prior software-to-hardware OAM/matrix transfer`);
    }
    if (!same(row.player, first.player) || !same(row.opponent, first.opponent)) failures.push(`age ${age}: immutable battle fields`);
    if (age >= 4 && age <= 76) {
      const pan = fixture.attacker.geometry.side === "player" ? -64 : 63;
      if (row.se1.songHeader !== probe.songHeaders.SE_M_ACID_ARMOR || !row.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === pan)) failures.push(`age ${age}: SE_M_ACID_ARMOR attacker pan`);
    } else if (age > 76 && row.se1.tracks.some((track) => (track.flags & 0x80) !== 0)) {
      failures.push(`age ${age}: SE_M_ACID_ARMOR cleanup`);
    }
    const rgb = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(rgb);
    if (sha256(rgb) !== row.sha256) failures.push(`age ${age}: raw RGB receipt`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebuffers += 1; else failures.push(`age ${age}: framebuffer ${diff}`);
    if (before === failures.length) components += 1;
  }
  const evidence = sha256(bytes), raw = rawHash.digest("hex");
  if (evidence !== fixture.evidenceSha256) failures.push(`evidence ${evidence}`);
  if (raw !== fixture.rawRgbSha256) failures.push(`raw ${raw}`);
  const changeMap = normalizedChangeMap(fixture, rgbDir);
  if (sha256(changeMap) !== fixture.changeMapSha256 || changeMap !== readFileSync(resolve(fixture.changeMap), "utf8")) failures.push("change map");
  const receipt = `${evidence}/${raw}/${sha256(changeMap)}`;
  if (runNumber === 1) receipts.set(fixture.orientation, receipt);
  else if (receipts.get(fixture.orientation) !== receipt) failures.push("second fresh receipt");
  console.log(`${fixture.orientation} run ${runNumber}: ${components}/119 component; ${framebuffers}/119 framebuffer; ${receipt}`);
  if (failures.length) { console.error(failures.slice(0, 80).join("\n")); console.error(`scratch: ${scratch}`); process.exit(1); }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
