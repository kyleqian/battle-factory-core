import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  ancientPowerAtAge,
  ANCIENT_POWER_COMPONENTS,
} from "../../src/animation/ancientPower.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAncientPowerView,
  type SceneOnAncientPowerConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Receipt {
  readonly status: string;
  readonly source: { readonly sourceWindow: { readonly frameCount: number } };
  readonly orientations: Record<"player-back" | "opponent-front", {
    readonly scenario: string;
    readonly scenarioSha256: string;
    readonly freshStateSha256: string;
    readonly freshRawRgbSha256: string;
    readonly changeMap: string;
    readonly changeMapSha256: string;
  }>;
  readonly topology: { readonly tasks: readonly string[]; readonly moveSprites: readonly string[] };
}

interface SpriteRow {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly invisible: number;
}
interface FrameRow {
  readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: boolean;
  readonly scriptOffset: number | null;
  readonly tasks: readonly { readonly func: { readonly symbol: string | null }; readonly data: readonly number[] }[];
  readonly sprites: readonly SpriteRow[];
  readonly battlers: Readonly<Record<"player" | "opponent", Readonly<Record<string, unknown>>>>;
  readonly parties: unknown; readonly immutableState: unknown;
  readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[];
  readonly softwareMatrices: readonly (readonly number[])[]; readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly tileTags: readonly number[]; readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly se2: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly topology: { readonly tasks: readonly string[]; readonly templates: readonly string[] };
  readonly frames: readonly FrameRow[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receipt = JSON.parse(readFileSync(join(root, "tools/compare/fixtures/ancient-power-dense-evidence.json"), "utf8")) as Receipt;
const args = new Set(process.argv.slice(2));
const requireExact = args.has("--require-exact");
const once = args.has("--once");
const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const first = new Map<string, readonly [string, string, string]>();

function normalizedChangeMap(path: string, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root, encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`change-map generation failed (${run.status})`);
  const separator = run.stdout.indexOf(" — ");
  const header = readFileSync(resolve(root, path), "utf8").split("\n", 1)[0]!;
  if (separator < 0) throw new Error("change-map header changed");
  return `${header.split(" — ", 1)[0]} — ${run.stdout.slice(separator + 3)}`;
}

function configFor(orientation: "player-back" | "opponent-front"): SceneOnAncientPowerConfig {
  const player = orientation === "player-back";
  return {
    move: "ANCIENT_POWER",
    attacker: { species: "BALTOY", geometry: player
      ? { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent", spriteCorner: { x: 144, y: 20 }, animationCenter: { x: 176, y: 52 }, battlePositionCenter: { x: 176, y: 40 } } },
    target: { species: "ONIX", geometry: player
      ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
    fieldProfile: player
      ? { playerHp: 98, playerMaxHp: 116, opponentHp: 142, opponentMaxHp: 142, playerGender: "none", opponentGender: "male" }
      : { playerHp: 142, playerMaxHp: 142, opponentHp: 98, opponentMaxHp: 116, playerGender: "male", opponentGender: "none" },
  };
}

function runFresh(orientation: "player-back" | "opponent-front"): { probe: Probe; bytes: Buffer; rgbDir: string; scratch: string } {
  const row = receipt.orientations[orientation];
  const scenarioBytes = readFileSync(resolve(root, row.scenario));
  if (sha256(scenarioBytes) !== row.scenarioSha256) throw new Error(`${orientation}: stale/mutated scenario`);
  const scratch = createScratchDir(`pokebench-ancient-power-${orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/ancientPowerProbe.py"),
    resolve(root, row.scenario), output, rgbDir], {
    cwd: root, encoding: "utf8", env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation}: fresh probe failed (${run.status})`);
  const bytes = readFileSync(output);
  return { probe: JSON.parse(bytes.toString("utf8")) as Probe, bytes, rgbDir, scratch };
}

function framebufferDiff(app: Uint8Array, raw: Buffer): { count: number; bbox: string } {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let p = 0; p < 38400; p += 1) {
    const a = p * 4, r = p * 3;
    if (app[a] === raw[r] && app[a + 1] === raw[r + 1] && app[a + 2] === raw[r + 2]) continue;
    count += 1; const x = p % 240, y = Math.floor(p / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bbox: count === 0 ? "none" : `${minX},${minY}-${maxX},${maxY}` };
}

function verify(orientation: "player-back" | "opponent-front", runNumber: number): void {
  const { probe, bytes, rgbDir, scratch } = runFresh(orientation);
  const failures: string[] = [];
  const total = receipt.source.sourceWindow.frameCount;
  if (probe.schema !== "ancient-power-dense-evidence/v1" || probe.frames.length !== total
    || probe.frames[0]?.scriptOffset !== 0 || probe.frames.at(-1)?.gAnimScriptActive !== false)
    failures.push("complete pointer-bounded window");
  for (const task of receipt.topology.tasks) if (!probe.topology.tasks.includes(task)) failures.push(`topology task ${task}`);
  for (const sprite of receipt.topology.moveSprites) if (!probe.topology.templates.includes(sprite)) failures.push(`topology sprite ${sprite}`);
  if (ANCIENT_POWER_COMPONENTS.length !== 12) failures.push("generated 12-component graph");
  const config = configFor(orientation);
  const stage = createSceneOnMovePresentation(config);
  const base = probe.frames[0]!;
  let reducerRows = 0, seamRows = 0, componentRows = 0, latchRows = 0, framebufferRows = 0;
  const residuals: Array<{ age: number; count: number; bbox: string }> = [];
  const rawDigest = createHash("sha256");
  for (const [age, frame] of probe.frames.entries()) {
    const before = failures.length;
    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawDigest.update(raw);
    if (sha256(raw) !== frame.sha256) failures.push(`age ${age}: raw RGB hash`);
    const expected = ancientPowerAtAge(age, {
      attackerCenter: config.attacker.geometry.animationCenter,
      attackerBattlePositionCenter: config.attacker.geometry.battlePositionCenter,
      attackerSide: config.attacker.geometry.side,
    });
    reducerRows += 1;
    const seam = sceneOnAncientPowerView({ ...stage, age });
    const { attacker: _a, target: _t, ...seamBody } = seam;
    if (same(expected, seamBody)) seamRows += 1; else failures.push(`age ${age}: seam`);
    if (expected.active !== frame.gAnimScriptActive) failures.push(`age ${age}: active cleanup`);
    const rocks = frame.sprites.filter((s) => s.template.symbol === "gAncientPowerRockSpriteTemplate");
    if (rocks.length !== expected.rocks.length) failures.push(`age ${age}: rock topology`);
    const sourceRocks = rocks.map((rock) => [rock.x, rock.y, rock.y2,
      ((rock.attr[2]! & 0x3ff) - 537) / 16]).sort();
    const reducedRocks = expected.rocks.map((rock) => [rock.centerX, rock.centerY, rock.y2, rock.animNum]).sort();
    if (!same(sourceRocks, reducedRocks)) failures.push(`age ${age}: rock state`);
    const tileLoaded = frame.tileTags.includes(10058), paletteLoaded = frame.paletteTags.includes(10058);
    if (tileLoaded !== expected.resources.rocks || paletteLoaded !== expected.resources.rocks) failures.push(`age ${age}: ROCKS tags`);
    const impactLoaded = frame.tileTags.includes(10135) && frame.paletteTags.includes(10135);
    if (impactLoaded !== expected.resources.impact) failures.push(`age ${age}: IMPACT tags`);
    if (frame.sprites.some((s) => s.template.symbol === "gBasicHitSplatSpriteTemplate") !== expected.hitsplatVisible)
      failures.push(`age ${age}: hitsplat lifetime`);
    for (const side of ["player", "opponent"] as const)
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3", "statStages"])
        if (!same(frame.battlers[side][key], base.battlers[side][key])) failures.push(`age ${age}: immutable ${side}.${key}`);
    if (!same(frame.parties, base.parties) || !same(frame.immutableState, base.immutableState)) failures.push(`age ${age}: immutable state`);
    if (frame.softwareOam.length !== 128 || frame.hardwareOam.length !== 128
      || frame.softwareMatrices.length !== 32 || frame.hardwareMatrices.length !== 32
      || frame.fadedPalette.length !== 512 || frame.hardwarePalette.length !== 512) failures.push(`age ${age}: full state shapes`);
    if (age > 0) {
      const prior = probe.frames[age - 1]!;
      if (same(frame.hardwareOam, prior.softwareOam) && same(frame.hardwareMatrices, prior.softwareMatrices)
        && same(frame.hardwarePalette, prior.fadedPalette)) latchRows += 1;
      else if (age === 7 && same(frame.hardwareOam, frame.softwareOam)
        && same(frame.hardwareMatrices, frame.softwareMatrices)
        && same(frame.hardwarePalette, frame.fadedPalette)) latchRows += 1;
      else failures.push(`age ${age}: OAM/matrix/palette transfer`);
    }
    if (failures.length === before) componentRows += 1;
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), raw);
    if (diff.count === 0) framebufferRows += 1; else residuals.push({ age, ...diff });
  }
  const changeMap = normalizedChangeMap(receipt.orientations[orientation].changeMap, rgbDir);
  const receipts = [sha256(bytes), rawDigest.digest("hex"), sha256(changeMap)] as const;
  const row = receipt.orientations[orientation];
  if (receipts[0] !== row.freshStateSha256 || receipts[1] !== row.freshRawRgbSha256
    || receipts[2] !== row.changeMapSha256
    || changeMap !== readFileSync(resolve(root, row.changeMap), "utf8")) failures.push("fresh receipt/change-map rejects stale archive/scenario");
  if (runNumber === 1) first.set(orientation, receipts); else if (!same(first.get(orientation), receipts)) failures.push("twice-fresh stability");
  const exact = reducerRows === total && seamRows === total && componentRows === total
    && latchRows === total - 1 && framebufferRows === total;
  if (requireExact && !exact) failures.push("--require-exact complete acceptance");
  console.log(`${orientation} run ${runNumber}: reducer/seam/component/latch/framebuffer ${reducerRows}/${seamRows}/${componentRows}/${latchRows}/${framebufferRows}/${total}; receipts ${receipts.join("/")}`);
  if (residuals.length) {
    const worst = residuals.slice().sort((a, b) => b.count - a.count)[0]!;
    console.log(`residual ages ${residuals.map((r) => r.age).join(",")}; peak ${worst.count}px age ${worst.age} bbox ${worst.bbox}`);
    console.log(`first ${JSON.stringify(residuals.slice(0, 16))}; tail ${JSON.stringify(residuals.slice(-12))}`);
  }
  if (failures.length) {
    console.error([...new Set(failures)].slice(0, 100).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exitCode = 1;
  }
}

const orientations = args.has("--player-only")
  ? (["player-back"] as const)
  : args.has("--opponent-only")
    ? (["opponent-front"] as const)
    : (["player-back", "opponent-front"] as const);
for (let run = 1; run <= (once ? 1 : 2); run += 1)
  for (const orientation of orientations) verify(orientation, run);
