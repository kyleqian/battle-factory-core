import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
type ReceiptRow = {
  scenario: string; sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  probeJsonSha256: string; stateGzip: string; stateGzipSha256: string;
  rawRgbSha256: string; changeMap: string; changeMapSha256: string;
  latches: { precedingOamRows: number; precedingMatrixRows: number; precedingPaletteRows: number; comparableRows: number; sameRowPaletteAges: number[]; monbgPaletteExceptionAges: number[] };
};
type Receipt = { schema: string; status: string; orientations: Record<Orientation, ReceiptRow>; topology: { tasks: string[]; moveSprites: string[] } };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receiptPath = process.argv[2] ?? "tools/compare/fixtures/memento-dense-evidence.json";
const selected = process.argv.includes("--orientation")
  ? process.argv[process.argv.indexOf("--orientation") + 1] as Orientation
  : undefined;
const receipt = JSON.parse(readFileSync(resolve(root, receiptPath), "utf8")) as Receipt;
const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function validate(orientation: Orientation, config: ReceiptRow, probe: Row, rgbDir: string): void {
  const frames = probe.frames as Row[];
  if (probe.schema !== "memento-dense-evidence/v1" || receipt.status !== "unsupported"
    || !same(probe.sourceWindow, config.sourceWindow) || frames.length !== config.sourceWindow.frameCount
    || frames[0]?.scriptOffset !== 0 || frames.at(-1)?.gAnimScriptActive !== false) throw new Error(`${orientation}: pointer window`);
  if (!same(probe.topology.tasks, receipt.topology.tasks) || probe.topology.templates.some((name: string) => name.includes("Memento"))) throw new Error(`${orientation}: topology`);
  const first = frames[0]!; const rawHash = createHash("sha256");
  let priorOam = 0, priorMatrices = 0, priorPalette = 0;
  const sameRowPaletteAges: number[] = [], monbgPaletteExceptionAges: number[] = [];
  for (const [age, row] of frames.entries()) {
    if (age === 0 && !row.scriptEven) throw new Error(`${orientation}: source-label pointer is not even`);
    if (row.tasks.some((task: Row) => task.raw.length !== 0x50 || task.data.length !== 16)) throw new Error(`${orientation} age ${age}: task surface`);
    if (row.scanlineBuffers.length !== 2 || row.scanlineBuffers.some((buffer: unknown[]) => buffer.length !== 320)
      || row.softwareOam.length !== 128 || row.hardwareOam.length !== 128
      || row.softwareMatrices.length !== 32 || row.hardwareMatrices.length !== 32
      || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512
      || row.paletteTags.length !== 16 || row.tileTags.length !== 128
      || !row.registers || !row.battleBg || !row.audio?.SE1 || !row.audio?.SE2) throw new Error(`${orientation} age ${age}: retained surface`);
    if (!same(row.battlers, first.battlers) || !same(row.parties, first.parties)
      || !same(row.immutableState, first.immutableState)) throw new Error(`${orientation} age ${age}: gameplay state mutated`);
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`)); rawHash.update(raw);
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw RGB`);
    if (age === 0) continue;
    const prior = frames[age - 1]!;
    if (same(row.hardwareOam, prior.softwareOam)) priorOam++;
    if (same(row.hardwareMatrices, prior.softwareMatrices)) priorMatrices++;
    if (same(row.hardwarePalette, prior.fadedPalette)) priorPalette++;
    else if (same(row.hardwarePalette, row.fadedPalette)) sameRowPaletteAges.push(age);
    else monbgPaletteExceptionAges.push(age);
  }
  if (rawHash.digest("hex") !== config.rawRgbSha256
    || priorOam !== config.latches.precedingOamRows || priorMatrices !== config.latches.precedingMatrixRows
    || priorPalette !== config.latches.precedingPaletteRows
    || !same(sameRowPaletteAges, config.latches.sameRowPaletteAges)
    || !same(monbgPaletteExceptionAges, config.latches.monbgPaletteExceptionAges)) throw new Error(`${orientation}: receipt/latch drift`);
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  const map = mapRun.stdout.replace(/^# .* —/, `# memento ${orientation} — raw RGB888 —`);
  if (mapRun.status !== 0 || sha256(map) !== config.changeMapSha256 || map !== readFileSync(resolve(root, config.changeMap), "utf8")) throw new Error(`${orientation}: normalized map`);
}

function verifyFresh(orientation: Orientation): void {
  const config = receipt.orientations[orientation];
  const retainedGzip = readFileSync(resolve(root, config.stateGzip));
  if (sha256(retainedGzip) !== config.stateGzipSha256) throw new Error(`${orientation}: retained state archive`);
  const retained = JSON.parse(gunzipSync(retainedGzip).toString());
  const scratch = createScratchDir(`pokebench-memento-${orientation}-`); const output = join(scratch, "probe.json"); const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/mementoProbe.py"), resolve(root, config.scenario), output, rgbDir], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation}: probe failed`);
  const bytes = readFileSync(output); const hash = sha256(bytes);
  if (hash !== config.probeJsonSha256 || !same(JSON.parse(bytes.toString()), retained)) throw new Error(`${orientation}: fresh state drift ${hash}`);
  validate(orientation, config, retained, rgbDir);
  console.log(`${orientation}: ${config.sourceWindow.frameCount}/${config.sourceWindow.frameCount} source/hardware/raw-RGB rows; ${hash}; reducer 0; seam 0; framebuffer 0 (unsupported)`);
}

if (receipt.schema !== "memento-dense-evidence/v1") throw new Error("receipt schema");
if (selected) {
  if (selected !== "player-back" && selected !== "opponent-front") throw new Error("invalid orientation");
  verifyFresh(selected);
} else {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const run = spawnSync(process.execPath, ["--experimental-strip-types", import.meta.filename, receiptPath, "--orientation", orientation], { cwd: root, encoding: "utf8" });
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);
    if (run.status !== 0) throw new Error(`${orientation} failed`);
  }
}
