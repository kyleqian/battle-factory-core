// Fresh dense source/component/hardware/framebuffer comparator for Metronome.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  METRONOME_FRAME_COUNT,
  metronomeAtAge,
} from "../../src/animation/metronome.ts";
import {
  FOLLOW_ME_FRAME_COUNT,
  followMeAtAge,
} from "../../src/animation/followMe.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFollowMeView,
  sceneOnMetronomeView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Fixture = {
  schema: "metronome-portable-evidence/v1" | "follow-me-portable-evidence/v1";
  orientation: string; scenario: string; probe: string;
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  attackerHead?: { x: number; y: number };
  attackerTop?: { x: number; y: number };
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
    playerGender?: "male" | "female"; opponentGender?: "male" | "female";
  };
  sourceWindow: Window; evidenceSha256: string; rawRgbSha256: string;
  lifecycleCounts: Record<string, number>; topology: unknown;
};
type Frame = {
  frame: number; sha256: string; scriptOffset: number | null;
  softwareOam: string[]; hardwareOam: string[]; hardwareMatrices: number[][];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[]; registers: Record<string, number>;
  tasks: unknown[]; sprites: unknown[]; se1: unknown; se2: unknown;
  gAnimScriptActive: number; visualTaskCount: number;
};
type Probe = {
  schema: "metronome-dense-evidence/v1" | "follow-me-dense-evidence/v1";
  sourceWindow: Window;
  lifecycleCounts: Record<string, number>; topology: unknown; frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: metronomePortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const isFollowMe = fixture.schema === "follow-me-portable-evidence/v1";
  const expectedProbeSchema = isFollowMe
    ? "follow-me-dense-evidence/v1" : "metronome-dense-evidence/v1";
  const expectedFrameCount = isFollowMe
    ? FOLLOW_ME_FRAME_COUNT : METRONOME_FRAME_COUNT;
  const scratch = createScratchDir("pokebench-metronome-portable-");
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

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const raw = createHash("sha256");
  const fields = probe.frames.every((frame) =>
    (frame.scriptOffset === null || typeof frame.scriptOffset === "number")
    && frame.softwareOam.length === 128 && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32
    && frame.hardwareMatrices.every((matrix) => matrix.length === 4)
    && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
    && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16
    && frame.tileTags.length === 128 && Object.keys(frame.registers).length === 8
    && Array.isArray(frame.tasks) && Array.isArray(frame.sprites)
    && frame.se1 !== null && frame.se2 !== null);
  if (
    !["metronome-portable-evidence/v1", "follow-me-portable-evidence/v1"]
      .includes(fixture.schema)
    || probe.schema !== expectedProbeSchema
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== expectedFrameCount || !fields
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = isFollowMe
    ? createSceneOnMovePresentation({
      move: "FOLLOW_ME",
      attacker: fixture.attacker,
      target: fixture.target,
      attackerTop: fixture.attackerTop!,
      fieldProfile: fixture.fieldProfile,
    })
    : createSceneOnMovePresentation({
      move: "METRONOME",
      attacker: fixture.attacker,
      target: fixture.target,
      attackerHead: fixture.attackerHead!,
      fieldProfile: fixture.fieldProfile,
    });
  const failures: string[] = [];
  for (const [index, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    raw.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`frame ${oracle.frame}: raw RGB digest changed`);
      continue;
    }
    const age = fixture.appStage.presentationAge + index;
    const component = isFollowMe
      ? followMeAtAge(
        age, fixture.attacker.geometry.side, fixture.attackerTop!,
      )
      : metronomeAtAge(
        age, fixture.attacker.geometry.side, fixture.attackerHead!,
      );
    const seam = isFollowMe
      ? sceneOnFollowMeView({
        ...stage,
        config: {
          ...stage.config,
          move: "FOLLOW_ME",
          attackerTop: fixture.attackerTop!,
        },
        age,
      })
      : sceneOnMetronomeView({
        ...stage,
        config: {
          ...stage.config,
          move: "METRONOME",
          attackerHead: fixture.attackerHead!,
        },
        age,
      });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel++) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff++;
    }
    const cleanup = index !== expectedFrameCount - 1
      || (!component.active && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (!seamMatch || diff !== 0 || !cleanup) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${seamMatch} `
        + `framebuffer=${diff === 0} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB window digest ${rawDigest} changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 80).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${expectedFrameCount} component/seam/framebuffer exact`,
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
