import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  ATTRACT_FRAME_COUNT,
  attractAtAge,
} from "../../src/animation/attract.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAttractView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: attractPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function s16(raw: string, offset: number): number {
  const bytes = Buffer.from(raw, "hex");
  const value = bytes[offset]! | (bytes[offset + 1]! << 8);
  return value >= 0x8000 ? value - 0x10000 : value;
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8"));
  const scratch = createScratchDir("pokebench-attract-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString());
  const evidence = createHash("sha256").update(bytes).digest("hex");
  if (
    probe.schema !== "attract-dense-evidence/v1"
    || evidence !== fixture.evidenceSha256
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== ATTRACT_FRAME_COUNT
    || probe.lifecycleCounts.gRedHeartProjectileSpriteTemplate !== 1
    || probe.lifecycleCounts.gRedHeartBurstSpriteTemplate !== 6
    || probe.lifecycleCounts.gRedHeartRisingSpriteTemplate !== 8
    || !probe.topology.tasks.includes("AnimTask_SwayMonStep")
    || !probe.topology.tasks.includes("AnimTask_HeartsBackground_Step")
    || !probe.topology.tasks.includes("AnimTask_BlendColorCycleLoop")
  ) throw new Error(`${fixture.orientation}: dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "ATTRACT",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  const raw = createHash("sha256");
  for (const [age, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    raw.update(rgb);
    const component = attractAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnAttractView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamComponent
    } = seam;
    const sourceHearts = oracle.sprites.filter((sprite: any) =>
      sprite.template.symbol?.startsWith("gRedHeart")
    );
    const modeledHearts = [
      ...(component.projectile ? [component.projectile] : []),
      ...component.bursts,
      ...component.rising,
    ];
    const heartsMatch = modeledHearts.length === sourceHearts.length
      && modeledHearts.every((heart) => {
        const source = sourceHearts.find((sprite: any) =>
          sprite.slot === heart.slot
          && sprite.template.symbol === (
            heart.kind === "projectile"
              ? "gRedHeartProjectileSpriteTemplate"
              : heart.kind === "burst"
                ? "gRedHeartBurstSpriteTemplate"
                : "gRedHeartRisingSpriteTemplate"
          )
        );
        return source
          && source.callback.symbol === heart.callback
          && s16(source.raw, 0x20) === heart.x
          && s16(source.raw, 0x22) === heart.y
          && s16(source.raw, 0x24) === heart.x2
          && s16(source.raw, 0x26) === heart.y2
          && ((Number.parseInt(source.raw.slice(124, 126), 16) & 4) !== 0)
            === heart.invisible;
      });
    const attacker = oracle.battlers[fixture.battleState.attackerSide];
    const target = oracle.battlers[fixture.battleState.targetSide];
    const battleMatch = attacker.species === 133
      && attacker.item === fixture.battleState.attackerItem
      && target.species === 95
      && target.status2 === fixture.battleState.targetStatus2;
    const expectedBldalpha = component.heartsBackground.loaded
      ? component.heartsBackground.eva
        | (component.heartsBackground.evb << 8)
      : 0;
    const registersMatch = oracle.registers.bldalpha === expectedBldalpha
      && (oracle.tileTags.includes(305) === component.redHeartLoaded);
    const app = render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff += 1;
    }
    const cleanup = age !== ATTRACT_FRAME_COUNT - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      !same(seamComponent, component)
      || oracle.scriptOffset !== component.scriptOffset
      || !heartsMatch
      || !battleMatch
      || !registersMatch
      || diff !== 0
      || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: seam=${same(seamComponent, component)} `
        + `script=${oracle.scriptOffset === component.scriptOffset} `
        + `hearts=${heartsMatch} battle=${battleMatch} `
        + `registers=${registersMatch} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB digest ${rawDigest} changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 170).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${ATTRACT_FRAME_COUNT} exact`,
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
