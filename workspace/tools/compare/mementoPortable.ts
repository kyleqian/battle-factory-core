import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  reduceMemento,
  type MementoBattlerConfig,
  type MementoConfig,
  type MementoState,
} from "../../src/animation/memento.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
type ReceiptRow = {
  scenario: string; sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  probeJsonSha256: string; stateGzip: string; stateGzipSha256: string;
  rawRgbSha256: string; changeMap: string; changeMapSha256: string;
  latches: { precedingOamRows: number; precedingMatrixRows: number; precedingPaletteRows: number; comparableRows: number; sameRowPaletteAges: number[]; monbgPaletteExceptionAges: number[] };
};
type Receipt = { schema: string; status: string; orientations: Record<Orientation, ReceiptRow>; topology: { tasks: string[]; moveSprites: string[] }; acceptance: { reducerRows: number } };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receiptPath = process.argv[2] ?? "tools/compare/fixtures/memento-dense-evidence.json";
const selected = process.argv.includes("--orientation")
  ? process.argv[process.argv.indexOf("--orientation") + 1] as Orientation
  : undefined;
const receipt = JSON.parse(readFileSync(resolve(root, receiptPath), "utf8")) as Receipt;
const sha256 = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const stable = (value: any): any => Array.isArray(value) ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

function battlerConfig(row: Row, which: "attacker" | "target"): MementoBattlerConfig {
  const battler = row.animationBattlers[which] as 0 | 1;
  const opponent = (battler & 1) !== 0;
  const sprite = row.battlerSprites[which];
  const isWeezing = sprite.data[2] === 110;
  return {
    battlerId: battler,
    side: opponent ? "opponent" : "player",
    bg: opponent ? "BG1" : "BG2",
    bgPriorityRank: opponent ? 1 : 2,
    x: sprite.x,
    shadowTop: isWeezing ? (opponent ? -3 : 59) : (opponent ? 3 : 49),
    shadowBottom: isWeezing ? (opponent ? 71 : 111) : (opponent ? 71 : 111),
    bgX: opponent ? (isWeezing ? -144 : -145) : -40,
    bgY: isWeezing ? (opponent ? -4 : -54) : (opponent ? -10 : -48),
    bgPaletteId: opponent ? 8 : 9,
  };
}

function reducerConfig(first: Row): MementoConfig {
  return {
    attacker: battlerConfig(first, "attacker"),
    target: battlerConfig(first, "target"),
    initialScanlineSourceBuffer: first.scanline.srcBuffer,
    initialScanlineBuffers: first.scanlineBuffers,
    initialWindow: { win0h: first.registers.win0h, win0v: first.registers.win0v },
  };
}

function sourceProjection(row: Row, config: MementoConfig): unknown {
  const task = row.tasks[0] ? { name: row.tasks[0].func.symbol, data: row.tasks[0].data } : null;
  return {
    active: row.gAnimScriptActive, scriptOffset: row.scriptOffset,
    visualTaskCount: row.visualTaskCount, task,
    scanline: {
      srcBuffer: row.scanline.srcBuffer, state: row.scanline.state,
      dmaDest: row.scanline.dmaDest, dmaControl: row.scanline.dmaControl,
      setFirstScanlineReg: row.scanline.setFirstScanlineReg, buffers: row.scanlineBuffers,
    },
    battleBg: {
      bg1X: row.battleBg.gBattle_BG1_X, bg1Y: row.battleBg.gBattle_BG1_Y,
      bg2X: row.battleBg.gBattle_BG2_X, bg2Y: row.battleBg.gBattle_BG2_Y,
      win0h: row.battleBg.gBattle_WIN0H, win0v: row.battleBg.gBattle_WIN0V,
    },
    monbg: {
      attacker: config.attacker.bg === "BG1"
        ? row.battleBg.gBattle_BG1_X === config.attacker.bgX && row.battleBg.gBattle_BG1_Y === config.attacker.bgY
        : row.battleBg.gBattle_BG2_X === config.attacker.bgX && row.battleBg.gBattle_BG2_Y === config.attacker.bgY,
      target: config.target.bg === "BG1"
        ? row.battleBg.gBattle_BG1_X === config.target.bgX && row.battleBg.gBattle_BG1_Y === config.target.bgY
        : row.battleBg.gBattle_BG2_X === config.target.bgX && row.battleBg.gBattle_BG2_Y === config.target.bgY,
    },
    registers: {
      win0h: row.registers.win0h, win0v: row.registers.win0v,
      winin: row.registers.winin, winout: row.registers.winout,
      bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha,
    },
    battlerPriority: {
      attacker: (row.battlerSprites.attacker.attr[2] >>> 10) & 3,
      target: (row.battlerSprites.target.attr[2] >>> 10) & 3,
    },
    blackBgPaletteIds: [8, 9].filter((id) =>
      row.unfadedPalette.slice(id * 16, id * 16 + 16).every((value: number) => value === 0)),
  };
}

function reducerProjection(state: MementoState): unknown {
  const { age: _age, phase: _phase, ...projection } = state;
  return projection;
}

function validate(orientation: Orientation, config: ReceiptRow, probe: Row, rgbDir: string): void {
  const frames = probe.frames as Row[];
  if (probe.schema !== "memento-dense-evidence/v1" || receipt.status !== "unsupported"
    || !same(probe.sourceWindow, config.sourceWindow) || frames.length !== config.sourceWindow.frameCount
    || frames[0]?.scriptOffset !== 0 || frames.at(-1)?.gAnimScriptActive !== false) throw new Error(`${orientation}: pointer window`);
  if (!same(probe.topology.tasks, receipt.topology.tasks) || probe.topology.templates.some((name: string) => name.includes("Memento"))) throw new Error(`${orientation}: topology`);
  const first = frames[0]!; const rawHash = createHash("sha256");
  let priorOam = 0, priorMatrices = 0, priorPalette = 0;
  let reducerRows = 0;
  const sourceConfig = reducerConfig(first);
  const reduced = reduceMemento(sourceConfig);
  if (reduced.length !== frames.length) throw new Error(`${orientation}: reducer window ${reduced.length}/${frames.length}`);
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
    if (!sameValue(reducerProjection(reduced[age]!), sourceProjection(row, sourceConfig))) throw new Error(`${orientation} age ${age}: reducer/source mismatch`);
    reducerRows++;
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
  if (reducerRows !== config.sourceWindow.frameCount || rawHash.digest("hex") !== config.rawRgbSha256
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
  console.log(`${orientation}: ${config.sourceWindow.frameCount}/${config.sourceWindow.frameCount} source/hardware/raw-RGB rows; ${hash}; reducer ${config.sourceWindow.frameCount}/${config.sourceWindow.frameCount}; seam 0; framebuffer 0 (unsupported)`);
}

if (receipt.schema !== "memento-dense-evidence/v1" || receipt.acceptance.reducerRows !== 353) throw new Error("receipt schema/reducer count");
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
