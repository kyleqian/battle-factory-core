import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { astonishAtAge } from "../../src/animation/astonish.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAstonishView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture { readonly scenario: string; readonly probe: string; readonly orientation: string; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly evidenceSha256: string; readonly rawRgbSha256: string; }
interface Sprite {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
  readonly data: readonly number[];
}
interface Frame { readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: number; readonly scriptOffset: number | null; readonly visualTaskCount: number; readonly soundTaskCount: number; readonly tasks: readonly { readonly func: { readonly symbol: string | null } }[]; readonly sprites: readonly Sprite[]; readonly playerSprite: Sprite; readonly opponentSprite: Sprite; readonly hardwareOam: readonly string[]; readonly hardwareMatrices: readonly (readonly number[])[]; readonly hardwarePalette: readonly number[]; readonly fadedPalette: readonly number[]; readonly paletteTags: readonly number[]; readonly registers: Readonly<Record<string, number>>; readonly se1: { readonly rawInfo: string; readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] }; readonly se2: { readonly rawInfo: string; readonly tracks: readonly unknown[] }; }
interface Probe { readonly schema: string; readonly captureWindow: Fixture["sourceWindow"]; readonly sourceWindow: Fixture["sourceWindow"]; readonly sourceSymbols: Readonly<Record<string, number>>; readonly songHeaders: Readonly<Record<"SE_M_ENCORE" | "SE_M_SKETCH", number>>; readonly templates: Readonly<Record<string, number>>; readonly frames: readonly Frame[]; }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) throw new Error("usage: astonishEvidence.ts <player-fixture> <opponent-fixture>");
const outputs = new Map<string, string>(); const rgbs = new Map<string, string>();
const digestRgb = (directory: string, frames: readonly Frame[]) => { const hash = createHash("sha256"); for (const frame of frames) hash.update(readFileSync(join(directory, `${String(frame.frame).padStart(5, "0")}.rgb`))); return hash.digest("hex"); };
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const hex16 = (value: number) =>
  `${(value & 0xff).toString(16).padStart(2, "0")}`
  + `${(value >>> 8).toString(16).padStart(2, "0")}`;

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-astonish-evidence-")); const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const probeRun = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--", join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (probeRun.stdout) globalThis.process.stdout.write(probeRun.stdout); if (probeRun.stderr) globalThis.process.stderr.write(probeRun.stderr);
  if (probeRun.status !== 0) globalThis.process.exit(probeRun.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "astonish-dense-evidence/v1") throw new Error(`${fixture.orientation}: unexpected schema`);
  const source = probe.frames.filter((frame) => frame.frame >= probe.sourceWindow.startFrame && frame.frame <= probe.sourceWindow.endFrame);
  if (source.length !== probe.sourceWindow.frameCount || source.some((frame, index) => frame.frame !== probe.sourceWindow.startFrame + index) || probe.sourceWindow.startFrame !== fixture.sourceWindow.startFrame || probe.sourceWindow.endFrame !== fixture.sourceWindow.endFrame || probe.sourceWindow.frameCount !== fixture.sourceWindow.frameCount) throw new Error(`${fixture.orientation}: source window changed or is not dense`);
  const hasTask = (name: string) => source.some((frame) => frame.tasks.some((task) => task.func.symbol === name));
  const hasSprite = (name: string) => source.some((frame) => frame.sprites.some((sprite) => sprite.template.symbol === name));
  if (source[0]!.scriptOffset !== 0 || source.at(-1)!.gAnimScriptActive !== 0 || hasTask("AnimTask_StretchTargetUp") === false || hasTask("AnimTask_ShakeMon2_Step") === false || hasSprite("gHorizontalLungeSpriteTemplate") === false || hasSprite("gSprayWaterDropletSpriteTemplate") === false) throw new Error(`${fixture.orientation}: source component topology changed`);
  for (const frame of source) {
    if (createHash("sha256").update(readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`))).digest("hex") !== frame.sha256 || frame.hardwareOam.length !== 128 || frame.hardwareMatrices.length !== 32 || frame.hardwarePalette.length !== 512 || frame.fadedPalette.length !== 512 || frame.paletteTags.length !== 16 || frame.se1.tracks.length !== 3 || frame.se2.tracks.length !== 3 || !frame.se1.rawInfo || !frame.se2.rawInfo || frame.registers.dispcnt === undefined || frame.registers.bldcnt === undefined) throw new Error(`${fixture.orientation}: incomplete task/sprite/OAM/palette/register/audio/rawRGB receipt`);
  }
  const evidence = createHash("sha256").update(bytes).digest("hex"); const raw = digestRgb(rgb, source);
  if (fixture.evidenceSha256 && evidence !== fixture.evidenceSha256 || fixture.rawRgbSha256 && raw !== fixture.rawRgbSha256) throw new Error(`${fixture.orientation}: committed digest changed`);
  for (const [map, value, label] of [[outputs, evidence, "evidence"], [rgbs, raw, "raw RGB"]] as const) { const prior = map.get(fixture.orientation); if (prior !== undefined && prior !== value) throw new Error(`${fixture.orientation}: fresh ${label} changed`); map.set(fixture.orientation, value); }
  const playerToOpponent = fixture.orientation === "player-to-opponent";
  const dropletRandom = playerToOpponent
    ? [{ v1: 299, v2: 127 }, { v1: 291, v2: 74 }] as const
    : [{ v1: 432, v2: 50 }, { v1: 395, v2: 52 }] as const;
  const stage = createSceneOnMovePresentation({
    move: "ASTONISH",
    attacker: {
      species: "LOUDRED",
      geometry: playerToOpponent
        ? {
            side: "player" as const,
            spriteCorner: { x: 40, y: 57 },
            animationCenter: { x: 72, y: 89 },
            battlePositionCenter: { x: 72, y: 80 },
          }
        : {
            side: "opponent" as const,
            spriteCorner: { x: 144, y: 11 },
            animationCenter: { x: 176, y: 43 },
            battlePositionCenter: { x: 176, y: 40 },
          },
    },
    target: {
      species: "ONIX",
      geometry: playerToOpponent
        ? {
            side: "opponent" as const,
            spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          }
        : {
            side: "player" as const,
            spriteCorner: { x: 40, y: 48 },
            animationCenter: { x: 72, y: 80 },
            battlePositionCenter: { x: 72, y: 80 },
          },
    },
    fieldProfile: {
      // Loudred has already taken the constrained Onix turn before its
      // player-side Astonish body begins in this legal turn-order fixture.
      playerHp: playerToOpponent ? 176 : 110,
      playerMaxHp: playerToOpponent ? 191 : 110,
      opponentHp: playerToOpponent ? 110 : 176,
      opponentMaxHp: playerToOpponent ? 110 : 191,
      playerGender: "male" as const,
      opponentGender: "male" as const,
    },
    targetPictureYOffset: playerToOpponent ? 2 : 0,
    dropletRandom,
  });
  const frameMap = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const mismatches: string[] = [];
  let componentMatched = 0;
  let seamMatched = 0;
  let hardwareMatched = 0;
  let framebufferMatched = 0;
  for (const actual of source) {
    const age = actual.frame - probe.sourceWindow.startFrame;
    const expected = astonishAtAge(
      age,
      stage.config.attacker.geometry.side,
      stage.config.target.geometry.animationCenter,
      stage.config.targetPictureYOffset,
      stage.config.dropletRandom,
    );
    const seam = sceneOnAstonishView({ ...stage, age });
    const attacker = playerToOpponent
      ? actual.playerSprite : actual.opponentSprite;
    const target = playerToOpponent
      ? actual.opponentSprite : actual.playerSprite;
    const targetBaselineX2 = playerToOpponent && age < 31 ? 1 : 0;
    const droplets = actual.sprites.filter(
      (sprite) => sprite.template.symbol === "gSprayWaterDropletSpriteTemplate",
    );
    const component = attacker.x2 === expected.attackerX2
      && target.x2 === targetBaselineX2 + expected.target.x2
      && target.y2 === expected.target.y2
      && same(target.matrix, [
        expected.target.matrix.a, 0, 0, expected.target.matrix.d,
      ])
      && droplets.length === expected.droplets.length
      && droplets.every((sprite, index) => {
        const item = expected.droplets[index]!;
        return sprite.slot === item.slot
          && sprite.x === item.x && sprite.y === item.y
          && sprite.x2 === item.x2 && sprite.y2 === item.y2
          && sprite.data[0] === item.velocityX
          && sprite.data[1] === item.velocityY - item.callbackCount * 32
          && sprite.data[2] === item.index
          && sprite.data[3] === item.callbackCount;
      })
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.tasks.filter((task) =>
        task.func.symbol === "AnimTask_ShakeMon2_Step"
      ).length === (age >= 31 && age <= 38 ? 1 : 0)
      && actual.tasks.filter((task) =>
        task.func.symbol === "AnimTask_StretchTargetUp"
      ).length === (age >= 31 && age <= 50 ? 1 : 0);
    if (component) componentMatched += 1;

    const seamExact = same(seam.target, expected.target)
      && same(seam.droplets, expected.droplets)
      && seam.attackerX2 === expected.attackerX2
      && seam.sound?.id === expected.sound?.id
      && seam.sound?.pan === expected.sound?.pan
      && seam.active === expected.active;
    if (seamExact) seamMatched += 1;

    const prior = frameMap.get(actual.frame - 1);
    const matrixPrior = frameMap.get(actual.frame - 2);
    const displayedSprites = prior
      ? [
          prior.playerSprite,
          prior.opponentSprite,
          ...prior.sprites.filter((sprite) =>
            sprite.template.symbol === "gSprayWaterDropletSpriteTemplate"
          ),
        ]
      : [];
    const hardware = displayedSprites.every((sprite) => {
      // FreeOamMatrix restores software AFFINE_NORMAL first; the preceding
      // AFFINE_DOUBLE mode remains in the already-built hardware OAM for the
      // cleanup scanout.
      const hardwareAttr0 = age === 52
          && (sprite.attr0 & 0x300) === 0x100
        ? sprite.attr0 | 0x200
        : sprite.attr0;
      const prefix = hex16(hardwareAttr0) + hex16(sprite.attr1)
        + hex16(sprite.attr2);
      const paletteStart = 256 + (sprite.attr2 >>> 12) * 16;
      const affine = (sprite.attr0 & 0x300) !== 0;
      const matrixSource = affine && matrixPrior
          && sprite.slot === prior!.playerSprite.slot
        ? matrixPrior.playerSprite
        : affine && matrixPrior
            && sprite.slot === prior!.opponentSprite.slot
          ? matrixPrior.opponentSprite
          : sprite;
      return actual.hardwareOam.some((item) => item.startsWith(prefix))
        && same(actual.hardwareMatrices[sprite.matrixNum], matrixSource.matrix)
        && actual.hardwarePalette.slice(paletteStart, paletteStart + 16)
          .every((color, index) =>
            color === prior!.fadedPalette[paletteStart + index]
          );
    });
    if (hardware) hardwareMatched += 1;

    const sound = expected.sound === null || (
      actual.se1.songHeader === probe.songHeaders[expected.sound.id]
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === expected.sound.pan
    );
    const registers = actual.registers.dispcnt === 0xBF40
      && actual.registers.bldcnt === 0
      && actual.registers.bldalpha === 0
      && actual.registers.bldy === 0;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const oracleRgb = readFileSync(
      join(rgb, `${String(actual.frame).padStart(5, "0")}.rgb`),
    );
    let diff = 0;
    const samples: string[] = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] === oracleRgb[pixel * 3]
        && app[pixel * 4 + 1] === oracleRgb[pixel * 3 + 1]
        && app[pixel * 4 + 2] === oracleRgb[pixel * 3 + 2]
      ) continue;
      diff += 1;
      if (samples.length < 4) {
        samples.push(
          `${pixel % 240},${Math.floor(pixel / 240)}:`
          + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
          + `!=${oracleRgb[pixel * 3]},${oracleRgb[pixel * 3 + 1]},`
          + `${oracleRgb[pixel * 3 + 2]}`,
        );
      }
    }
    if (diff === 0) framebufferMatched += 1;
    if (!component || !seamExact || !hardware || !sound || !registers
      || diff !== 0) {
      mismatches.push(
        `frame ${actual.frame}/age ${age}: component=${component} `
        + `seam=${seamExact} hardware=${hardware} sound=${sound} `
        + `registers=${registers} framebuffer=${diff === 0} `
        + `diff=${diff} samples=${samples.join(",")}`,
      );
    }
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: source ${componentMatched}/`
    + `${source.length}; seam ${seamMatched}/${source.length}; hardware `
    + `${hardwareMatched}/${source.length}; framebuffer ${framebufferMatched}/`
    + `${source.length}; evidence ${evidence}; raw ${raw}`,
  );
  if (mismatches.length) {
    console.error(mismatches.slice(0, 50).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}
for (let run = 1; run <= 2; run += 1) for (const fixture of fixturePaths) verify(fixture, run);
