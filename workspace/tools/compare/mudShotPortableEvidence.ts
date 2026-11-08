import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { mudShotAtAge } from "../../src/animation/mudShot.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMudShotView,
  type SceneOnMudShotConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { compactSemanticReceiptSha256 } from "./semanticReceipt.ts";

interface Fixture extends SceneOnMudShotConfig {
  readonly schema: string;
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}
interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
}
interface Task {
  readonly slot: number;
  readonly func: { readonly symbol: string | null };
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly Task[];
  readonly sprites: readonly Sprite[];
  readonly battlers: unknown;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: AudioPlayer;
  readonly se2: AudioPlayer;
}
interface AudioPlayer {
  readonly rawInfo: string;
  readonly songHeader: number;
  readonly status: number;
  readonly tracks: readonly {
    readonly flags: number;
    readonly panX: number;
    readonly raw: string;
  }[];
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly songHeaders: { readonly SE_M_WHIRLPOOL: number };
  readonly lifecycleCounts: { readonly mudShotOrb: number };
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly templates: { readonly gMudShotOrbSpriteTemplate: number };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: mudShotPortableEvidence.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fresh = new Map<string, { evidence: string; raw: string }>();
const MUD_SHOT_TOPOLOGY = {
  tasks: [
    "AnimTask_RunSinAnimTimer",
    "AnimTask_ShakeMon_Step",
    "Task_ClearMonBg",
    "Task_PanFromInitialToTarget",
    "Task_UpdateMonBg",
  ],
  templates: [
    "gMudShotOrbSpriteTemplate",
    "gMultiuseSpriteTemplate",
    "gSpriteTemplate_EnemyShadow",
    "sHealthbarSpriteTemplates",
    "sHealthboxOpponentSpriteTemplates",
    "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimToTargetInSinWave_Step",
    "SpriteCB_HealthBar",
    "SpriteCB_HealthBoxOther",
    "SpriteCB_SetInvisible",
    "SpriteCallbackDummy",
  ],
} as const;
const REGISTER_NAMES = [
  "bg0cnt", "bg0hofs", "bg0vofs", "bg1cnt", "bg1hofs", "bg1vofs",
  "bg2cnt", "bg2hofs", "bg2vofs", "bg3cnt", "bg3hofs", "bg3vofs",
  "bldalpha", "bldcnt", "bldy", "dispcnt", "mosaic", "winin", "winout",
];
const i16 = (raw: string, offset: number): number => {
  const value = Number.parseInt(
    raw.slice(offset * 2 + 2, offset * 2 + 4)
      + raw.slice(offset * 2, offset * 2 + 2),
    16,
  );
  return value >= 0x8000 ? value - 0x10000 : value;
};

function expectedTaskLifecycle(
  age: number,
  side: "player" | "opponent",
  expected: ReturnType<typeof mudShotAtAge>,
): readonly { readonly slot: number; readonly symbol: string }[] {
  const specialTaskName = {
    "attacker-shake": "AnimTask_ShakeMon_Step",
    "sin-timer": "AnimTask_RunSinAnimTimer",
    "target-shake": "AnimTask_ShakeMon_Step",
  } as const;
  const tasks: { slot: number; symbol: string }[] = expected.tasks.map((task) => ({
    slot: task.slot,
    symbol: specialTaskName[task.kind],
  }));
  if (age >= 4 && age <= 131) {
    tasks.push({ slot: 1, symbol: "Task_UpdateMonBg" });
  }
  if (age >= 15 && age <= (side === "player" ? 142 : 141)) {
    tasks.push({ slot: 3, symbol: "Task_PanFromInitialToTarget" });
  }
  if (age >= 129 && age <= 131) {
    tasks.push({ slot: 0, symbol: "Task_ClearMonBg" });
  }
  return tasks.sort((left, right) => left.slot - right.slot);
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = createScratchDir("pokebench-mud-shot-portable-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  // The historic compact JSON receipt predates BattleLab's asserted-empty
  // transport-only capture list. Require it from fresh output and omit only
  // that field when preserving the established semantic digest.
  const evidence = compactSemanticReceiptSha256(probe);
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    const raw = readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`);
    }
  }
  const rawDigest = rawHash.digest("hex");
  const cleanup = probe.frames.at(-1);
  const previousToCleanup = probe.frames.at(-2);
  const firstInactiveCleanup = cleanup !== undefined
    && previousToCleanup?.gAnimScriptActive === 1
    && cleanup.gAnimScriptActive === 0
    && cleanup.visualTaskCount === 0
    && cleanup.soundTaskCount === 0
    && cleanup.tasks.length === 0
    && !cleanup.sprites.some((sprite) =>
      sprite.template.address === probe.templates.gMudShotOrbSpriteTemplate
    )
    && !cleanup.paletteTags.includes(10259)
    && cleanup.registers.bldcnt === 0
    && cleanup.registers.bldalpha === 0
    && cleanup.registers.bldy === 0;
  if (
    fixture.schema !== "mud-shot-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "mud-shot-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.topology, MUD_SHOT_TOPOLOGY)
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.lifecycleCounts.mudShotOrb !== 22
    || probe.frames[0]?.gAnimScriptActive !== 1
    || !firstInactiveCleanup
  ) throw new Error(`${fixture.orientation}: portable evidence contract changed`);
  const previous = fresh.get(fixture.orientation);
  if (previous && !same(previous, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const stage = createSceneOnMovePresentation({
    move: "MUD_SHOT",
    attacker: fixture.attacker,
    target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    targetPictureOffset: fixture.targetPictureOffset,
    fieldProfile: fixture.fieldProfile,
  });
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const immutableBattlers = probe.frames[0]!.battlers;
  const mismatches: string[] = [];
  let components = 0;
  let framebuffers = 0;
  let oamPredecessorTransfers = 0;
  let matrixPredecessorTransfers = 0;
  let palettePredecessorTransfers = 0;
  let paletteSameRowSetups = 0;
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = byFrame.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = mudShotAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attackerPictureOffset,
      fixture.targetPictureOffset,
    );
    const seam = sceneOnMudShotView({ ...stage, age });
    const actualOrbSprites = actual.sprites
      .filter((sprite) =>
        sprite.template.address === probe.templates.gMudShotOrbSpriteTemplate
      );
    const actualOrbs = actualOrbSprites.map((sprite) => ({
        oamSlot: sprite.slot,
        x: i16(sprite.raw, 0x20),
        y: i16(sprite.raw, 0x22),
        x2: i16(sprite.raw, 0x24),
        y2: i16(sprite.raw, 0x26),
        frame: ((sprite.attr[2]! & 0x3ff) - 305) / 4,
        callback: sprite.callback.symbol,
      }));
    const expectedOrbs = expected.orbs.map((orb) => ({
      oamSlot: orb.oamSlot,
      x: orb.x,
      y: orb.y,
      x2: orb.x2,
      y2: orb.y2,
      frame: orb.frame,
      callback: orb.callback,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const actualTasks = actual.tasks.map((task) => ({
      slot: task.slot,
      symbol: task.func.symbol,
    }));
    const expectedTasks = expectedTaskLifecycle(
      age,
      fixture.attacker.geometry.side,
      expected,
    );
    const previousOrbSlots = new Set((byFrame.get(frame - 1)?.sprites ?? [])
      .filter((sprite) =>
        sprite.template.address === probe.templates.gMudShotOrbSpriteTemplate
      )
      .map((sprite) => sprite.slot));
    const actualOrbSlots = actualOrbSprites.map((sprite) => sprite.slot);
    const expectedOrbSlots = expectedOrbs.map((orb) => orb.oamSlot);
    const actualBirths = actualOrbSlots.filter((slot) => !previousOrbSlots.has(slot));
    const expectedBirths = expected.orbs
      .filter((orb) => age === 15 + orb.spawnIndex * 4)
      .map((orb) => orb.oamSlot);
    const software = same(actualOrbs, expectedOrbs)
      && same(actualOrbSlots, expectedOrbSlots)
      && same(actualBirths, expectedBirths)
      && same(actualTasks, expectedTasks);
    const source =
      actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const registers = expected.alpha
      ? actual.registers.bldcnt === 16192
        && actual.registers.bldalpha === 2060
      : actual.registers.bldcnt === 0 && actual.registers.bldalpha === 0;
    const tags =
      actual.paletteTags.includes(10259) === expected.brownOrbLoaded;
    const sound = expected.whirlpoolAudio === null
      ? [actual.se1, actual.se2].every((player) =>
        typeof player.rawInfo === "string"
        && typeof player.status === "number"
        && player.tracks.length === 3
        && player.tracks.every((track) => typeof track.raw === "string")
      )
      : actual.se1.songHeader === probe.songHeaders.SE_M_WHIRLPOOL
        && actual.se1.tracks[0]?.flags === expected.whirlpoolAudio.flags
        && actual.se1.tracks[0]?.panX === expected.whirlpoolAudio.pan
        && actual.se2.songHeader !== probe.songHeaders.SE_M_WHIRLPOOL
        && [actual.se1, actual.se2].every((player) =>
          typeof player.rawInfo === "string"
          && typeof player.status === "number"
          && player.tracks.length === 3
          && player.tracks.every((track) => typeof track.raw === "string")
        );
    const prior = byFrame.get(frame - 1);
    const oamTransfer = !prior || same(actual.hardwareOam, prior.softwareOam);
    const matrixTransfer = !prior || prior.sprites.every((sprite) =>
      same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const palettePredecessor = prior !== undefined
      && same(actual.hardwarePalette, prior.fadedPalette);
    // Mud Shot's own target-monbg setup is the only measured same-row
    // palette handoff; all other comparable rows retain the prior faded bank.
    const paletteSameRowSetup = prior !== undefined
      && age === 4
      && same(actual.hardwarePalette, actual.fadedPalette)
      && !palettePredecessor;
    const paletteTransfer = !prior || palettePredecessor || paletteSameRowSetup;
    if (prior) {
      if (oamTransfer) oamPredecessorTransfers += 1;
      if (matrixTransfer) matrixPredecessorTransfers += 1;
      if (palettePredecessor) palettePredecessorTransfers += 1;
      if (paletteSameRowSetup) paletteSameRowSetups += 1;
    }
    const matrices = actualOrbs.every((orb) => {
      const sprite = actual.sprites.find((item) => item.slot === orb.oamSlot);
      return sprite !== undefined
        && same(sprite.matrix, [256, 0, 0, 256]);
    });
    const receiptShape = actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.hardwareMatrices.every((matrix) => matrix.length === 4)
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.paletteTags.length === 16
      && same(Object.keys(actual.registers).sort(), REGISTER_NAMES)
      && actual.sprites.every((sprite) =>
        sprite.matrixNum >= 0 && sprite.matrixNum < 32
        && sprite.matrix.length === 4
      );
    const battlers = same(actual.battlers, immutableBattlers);
    const seamShape =
      same(seam.orbs, expected.orbs)
      && same(seam.tasks, expected.tasks)
      && seam.active === expected.active
      && seam.brownOrbLoaded === expected.brownOrbLoaded
      && same(seam.alpha, expected.alpha)
      && seam.targetMonbg === expected.targetMonbg
      && same(seam.attackerOffset, expected.attackerOffset)
      && same(seam.targetOffset, expected.targetOffset)
      && seam.targetBaselineX2 === expected.targetBaselineX2
      && seam.scriptOffset === expected.scriptOffset
      && seam.visualTaskCount === expected.visualTaskCount
      && seam.soundTaskCount === expected.soundTaskCount
      && same(seam.whirlpoolAudio, expected.whirlpoolAudio)
      && seam.battlerDisplayAge === expected.battlerDisplayAge;
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebuffers += 1;
    if (
      software && source && registers && tags && sound && oamTransfer
      && matrixTransfer && paletteTransfer && matrices && receiptShape
      && battlers && seamShape
    ) components += 1;
    else mismatches.push(
      `frame ${frame}/age ${age}: software=${software} source=${source} `
      + `registers=${registers} tags=${tags} sound=${sound} `
      + `oam=${oamTransfer} matrices=${matrixTransfer}/${matrices} `
      + `palette=${paletteTransfer} receipt=${receiptShape} `
      + `battlers=${battlers} seam=${seamShape}`,
    );
    if (diff !== 0) {
      mismatches.push(`frame ${frame}/age ${age}: framebufferDiff=${diff}`);
    }
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: components ${components}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebuffers}/${fixture.sourceWindow.frameCount}; `
    + `hardware OAM ${oamPredecessorTransfers}/${fixture.sourceWindow.frameCount - 1}; `
    + `matrices ${matrixPredecessorTransfers}/${fixture.sourceWindow.frameCount - 1}; `
    + `palette ${palettePredecessorTransfers}/${fixture.sourceWindow.frameCount - 1} predecessor `
    + `+ ${paletteSameRowSetups} same-row setup; `
    + `evidence ${evidence}; raw ${rawDigest}`,
  );
  if (mismatches.length) throw new Error(mismatches.join("\n"));
}

for (let repeat = 1; repeat <= 2; repeat += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, repeat);
}
