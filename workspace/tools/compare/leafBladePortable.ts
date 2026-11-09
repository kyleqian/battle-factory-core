import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { leafBladeAtAge } from "../../src/animation/leafBlade.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLeafBladeView,
  type SceneOnLeafBladeConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { compactSemanticReceiptSha256 } from "./semanticReceipt.ts";

interface Fixture extends SceneOnLeafBladeConfig {
  readonly schema: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly lifecycleCounts: { readonly leafBlade: number; readonly crossImpact: number };
  readonly topology: Record<string, readonly string[]>;
}
interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}
interface AudioPlayer {
  readonly songHeader: number;
  readonly tracks: readonly {
    readonly flags: number;
    readonly panX: number;
    readonly raw: string;
  }[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly { readonly func: { readonly symbol: string | null }; readonly data: readonly number[] }[];
  readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly battlers: unknown;
  readonly immutableState: unknown;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Record<string, number>;
  readonly se1: AudioPlayer;
  readonly se2: AudioPlayer;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly lifecycleCounts: Fixture["lifecycleCounts"];
  readonly topology: Fixture["topology"];
  readonly templates: Record<"gLeafBladeSpriteTemplate" | "gCrossImpactSpriteTemplate", number>;
  readonly songHeaders: Record<"se_m_cut" | "se_m_leer", number>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) throw new Error("usage: leafBladePortable.ts <player fixture> <opponent fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string; changeMap: string }>();
const u16 = (raw: string, offset: number): number => Number.parseInt(
  raw.slice(offset * 2 + 2, offset * 2 + 4) + raw.slice(offset * 2, offset * 2 + 2),
  16,
);
const i16 = (raw: string, offset: number): number => {
  const value = u16(raw, offset);
  return value >= 0x8000 ? value - 0x10000 : value;
};
const byte = (raw: string, offset: number): number => Number.parseInt(raw.slice(offset * 2, offset * 2 + 2), 16);

function normalizedChangeMap(fixture: Fixture, probe: Probe, rgbDir: string, scratch: string): string {
  const sourceRgb = join(scratch, "source-rgb");
  mkdirSync(sourceRgb);
  for (const frame of probe.frames) {
    const name = `${String(frame.frame).padStart(5, "0")}.rgb`;
    copyFileSync(join(rgbDir, name), join(sourceRgb, name));
  }
  const run = spawnSync(
    "python3",
    [join(root, "tools/compare/frame-changemap.py"), sourceRgb],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map regeneration failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator === -1) throw new Error("Leaf Blade change-map header changed");
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function verify(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-leaf-blade-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  // Historic Leaf Blade receipts used compact Python JSON before BattleLab
  // transported its asserted-empty capture member. Require and omit only that
  // member here; raw RGB and the normalized map remain byte-for-byte checks.
  const evidence = compactSemanticReceiptSha256(probe);
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawHash.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`);
    }
  }
  const raw = rawHash.digest("hex");
  const changeMap = normalizedChangeMap(fixture, probe, rgbDir, scratch);
  const changeMapHash = createHash("sha256").update(changeMap).digest("hex");
  const cleanup = probe.frames.at(-1);
  const firstInactiveCleanup = cleanup !== undefined
    && cleanup.gAnimScriptActive === 0
    && cleanup.visualTaskCount === 0
    && cleanup.soundTaskCount === 0
    && cleanup.tasks.length === 0
    && !cleanup.sprites.some((sprite) =>
      sprite.template.address === probe.templates.gLeafBladeSpriteTemplate
      || sprite.template.address === probe.templates.gCrossImpactSpriteTemplate
    )
    && !cleanup.paletteTags.includes(10063)
    && !cleanup.paletteTags.includes(10285)
    && cleanup.registers.bldcnt === 0
    && cleanup.registers.bldalpha === 0
    && cleanup.registers.bldy === 0;
  if (fixture.schema !== "leaf-blade-portable-evidence/v2"
    || probe.schema !== "leaf-blade-dense-evidence/v2"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256 || raw !== fixture.rawRgbSha256
    || changeMapHash !== fixture.changeMapSha256
    || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.frames[0]?.gAnimScriptActive !== 1
    || !firstInactiveCleanup) {
    throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  }
  const priorFresh = fresh.get(fixture.orientation);
  if (priorFresh && !same(priorFresh, {
    evidence,
    raw,
    changeMap: changeMapHash,
  })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw, changeMap: changeMapHash });

  const stage = createSceneOnMovePresentation<SceneOnLeafBladeConfig>({
    move: "LEAF_BLADE",
    attacker: fixture.attacker,
    target: fixture.target,
    targetProfile: fixture.targetProfile,
    fieldProfile: fixture.fieldProfile,
  });
  const immutableBattlers = probe.frames[0]!.battlers;
  const immutableState = probe.frames[0]!.immutableState;
  const failures: string[] = [];
  let components = 0;
  let framebuffers = 0;
  for (const [index, actual] of probe.frames.entries()) {
    const age = actual.frame - fixture.sourceWindow.startFrame;
    const expected = leafBladeAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.target.geometry.side,
      fixture.targetProfile,
    );
    const seam = sceneOnLeafBladeView({ ...stage, age });
    const actualLeaves = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gLeafBladeSpriteTemplate
    ).map((sprite) => ({
      kind: sprite.callback.symbol === "SpriteCallbackDummy" ? "blade" : "trail",
      oamSlot: sprite.slot,
      x: i16(sprite.raw, 0x20) + i16(sprite.raw, 0x24),
      y: i16(sprite.raw, 0x22) + i16(sprite.raw, 0x26),
      animation: byte(sprite.raw, 0x2a),
      tileCell: ((u16(sprite.raw, 4) & 0x03ff) - 305) / 4,
      hFlip: Boolean(u16(sprite.raw, 2) & 0x1000),
      subpriority: byte(sprite.raw, 0x43),
      invisible: Boolean(byte(sprite.raw, 0x3e) & 4),
      callback: sprite.callback.symbol,
      blinkCounter: sprite.callback.symbol === "SpriteCallbackDummy" ? 0 : sprite.data[0],
      blinkCycles: sprite.callback.symbol === "SpriteCallbackDummy" ? 0 : sprite.data[1],
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedLeaves = expected.sprites.map((sprite) => ({
      kind: sprite.kind,
      oamSlot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      animation: sprite.animation,
      tileCell: sprite.tileCell,
      hFlip: sprite.hFlip,
      subpriority: sprite.subpriority,
      invisible: sprite.invisible,
      callback: sprite.callback,
      blinkCounter: sprite.blinkCounter,
      blinkCycles: sprite.blinkCycles,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const impact = actual.sprites.find((sprite) =>
      sprite.template.address === probe.templates.gCrossImpactSpriteTemplate
    );
    const actualImpact = impact ? {
      oamSlot: impact.slot,
      x: i16(impact.raw, 0x20),
      y: i16(impact.raw, 0x22),
      remaining: impact.data[0],
      callback: impact.callback.symbol,
    } : null;
    const expectedImpact = expected.crossImpact ? { oamSlot: 3, ...expected.crossImpact } : null;
    const leafTask = actual.tasks.find((task) => task.func.symbol === "AnimTask_LeafBlade_Step");
    const targetSlot = fixture.target.geometry.side === "opponent" ? 8 : 6;
    const target = actual.sprites.find((sprite) =>
      sprite.slot === targetSlot && sprite.template.symbol === "gMultiuseSpriteTemplate"
    );
    const targetBaseline = fixture.target.geometry.side === "opponent" && age <= 10 ? 1 : 0;
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const software = same(actualLeaves, expectedLeaves)
      && same(actualImpact, expectedImpact)
      && (leafTask?.data[0] ?? null) === expected.taskState
      && (leafTask?.data[12] ?? 0) === expected.taskChildCount
      && taskNames.includes("AnimTask_ShakeMon2_Step") === expected.shakeTaskActive
      && taskNames.includes("Task_UpdateMonBg") === expected.updateMonBgTaskActive
      && taskNames.includes("Task_ClearMonBg") === expected.clearMonBgTaskActive
      && i16(target?.raw ?? "", 0x24) === expected.targetOffset.x2 + targetBaseline;
    const source = actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const registerShape = same(Object.keys(actual.registers).sort(), [
      "bg0cnt", "bg1cnt", "bg2cnt", "bg3cnt", "bldalpha", "bldcnt",
      "bldy", "dispcnt",
    ]);
    const registers = registerShape
      && actual.registers.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.registers.bldalpha === (expected.alpha ? 0x080c : 0)
      && actual.registers.bldy === 0;
    const tags = actual.paletteTags.includes(10063) === expected.assetsLoaded.leaf
      && actual.paletteTags.includes(10285) === expected.assetsLoaded.crossImpact;
    const event = expected.soundEvents[0];
    const song = event?.song === "SE_M_CUT"
      ? probe.songHeaders.se_m_cut : probe.songHeaders.se_m_leer;
    const audioPlayers = actual.se1.tracks.length === 3
      && actual.se2.tracks.length === 3
      && actual.se1.tracks.every((track) => typeof track.raw === "string")
      && actual.se2.tracks.every((track) => typeof track.raw === "string");
    const audio = audioPlayers
      && ![probe.songHeaders.se_m_cut, probe.songHeaders.se_m_leer]
        .includes(actual.se2.songHeader)
      && (!event || (actual.se1.songHeader === song
        && actual.se1.tracks[0]?.flags === 131
        && actual.se1.tracks[0]?.panX === event.pan));
    const prior = index === 0 ? null : probe.frames[index - 1]!;
    const oamTransfer = prior === null
      || same(actual.hardwareOam, prior.softwareOam);
    const matrixTransfer = prior === null || prior.sprites.every((sprite) =>
      same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    // The target-monbg setup at age 144 is Leaf Blade's one measured
    // same-row palette handoff; every other comparable row is predecessor DMA.
    const currentPaletteSetup = age === 144
      && expected.updateMonBgTaskActive
      && taskNames.includes("Task_UpdateMonBg")
      && same(actual.hardwarePalette, actual.fadedPalette)
      && (prior === null || !same(actual.hardwarePalette, prior.fadedPalette));
    const paletteTransfer = prior === null
      || same(actual.hardwarePalette, prior.fadedPalette)
      || currentPaletteSetup;
    const battlers = same(actual.battlers, immutableBattlers);
    const gameplay = same(actual.immutableState, immutableState);
    const receiptShape = actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.hardwareMatrices.every((matrix) => matrix.length === 4)
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && same(actual.playerSprite, actual.sprites.find((sprite) => sprite.slot === actual.playerSprite.slot))
      && same(actual.opponentSprite, actual.sprites.find((sprite) => sprite.slot === actual.opponentSprite.slot))
      && actual.sprites.every((sprite) =>
        sprite.matrixNum >= 0 && sprite.matrixNum < 32
        && sprite.matrix.length === 4
      );
    const seamShape = seam.active === expected.active
      && same(seam.assetsLoaded, expected.assetsLoaded)
      && seam.scriptOffset === expected.scriptOffset
      && seam.taskState === expected.taskState
      && seam.taskChildCount === expected.taskChildCount
      && same(seam.sprites, expected.sprites)
      && same(seam.targetOffset, expected.targetOffset)
      && same(seam.crossImpact, expected.crossImpact)
      && seam.targetMonbg === expected.targetMonbg
      && same(seam.alpha, expected.alpha)
      && seam.updateMonBgTaskActive === expected.updateMonBgTaskActive
      && seam.clearMonBgTaskActive === expected.clearMonBgTaskActive
      && seam.visualTaskCount === expected.visualTaskCount
      && seam.soundTaskCount === expected.soundTaskCount
      && same(seam.soundEvents, expected.soundEvents);
    if (software && source && registers && tags && audio && oamTransfer
      && matrixTransfer && paletteTransfer && battlers && gameplay
      && receiptShape && seamShape) {
      components += 1;
    } else if (failures.length < 30) {
      failures.push(`${fixture.orientation} age ${age}: component software=${software} source=${source} registers=${registers} tags=${tags} audio=${audio} oam=${oamTransfer} matrices=${matrixTransfer} palette=${paletteTransfer} battlers=${battlers} gameplay=${gameplay} receipt=${receiptShape} seam=${seamShape}`);
    }

    const rgb = readFileSync(join(rgbDir, `${String(actual.frame).padStart(5, "0")}.rgb`));
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    const samples: string[] = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) {
        diff += 1;
        if (samples.length < 4) samples.push(
          `${pixel % 240},${Math.floor(pixel / 240)} `
          + `${rgb[pixel * 3]},${rgb[pixel * 3 + 1]},${rgb[pixel * 3 + 2]}`
          + `!=${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`,
        );
      }
    }
    if (diff === 0) framebuffers += 1;
    else if (failures.length < 30) failures.push(
      `${fixture.orientation} age ${age}: framebuffer ${diff}px (${samples.join("; ")})`,
    );
  }
  console.log(`${fixture.orientation}: components ${components}/224; framebuffer ${framebuffers}/224; evidence ${evidence}; raw ${raw}`);
  if (components !== 224 || framebuffers !== 224) {
    console.error(failures.join("\n"));
    throw new Error(`${fixture.orientation}: Leaf Blade is not exact`);
  }
}

for (let repeat = 0; repeat < 2; repeat += 1) for (const fixture of fixtures) verify(fixture);
