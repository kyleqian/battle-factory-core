import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { rolloutAtAge, type RolloutGeometry } from "../../src/animation/rollout.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRolloutView,
  type SceneOnRolloutConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/rollout-evidence.json", "utf8",
)) as any;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gRolloutMudSpriteTemplate",
  "gRolloutRockSpriteTemplate",
]);

function geometryFor(
  orientation: "player-back" | "opponent-front",
  body: number,
): RolloutGeometry {
  const player = orientation === "player-back";
  return {
    side: player ? "player" : "opponent",
    attackerStart: player ? { x: 72, y: 104 } : { x: 176, y: 64 },
    targetEnd: player ? { x: 176, y: 64 } : { x: 72, y: 104 },
    attackerSpriteSlot: player ? 6 : 8,
    targetSpriteSlot: player ? 8 : 6,
    targetBaseX2: player && body === 1 ? 1 : 0,
    targetBaseY2: 0,
  };
}

function battler(side: "player" | "opponent") {
  return {
    species: "VOLTORB" as const,
    geometry: {
      side,
      spriteCorner: { x: 0, y: 0 },
      animationCenter: { x: 0, y: 0 },
      battlePositionCenter: { x: 0, y: 0 },
    },
  } as const;
}

function task(row: any, symbol: string): any | undefined {
  return row.tasks.find((entry: any) => entry.func?.symbol === symbol);
}

function assertRow(
  orientation: "player-back" | "opponent-front",
  body: number,
  row: any,
  reduced: ReturnType<typeof rolloutAtAge>,
): void {
  const prefix = `${orientation} body ${body} age ${row.age}`;
  if (!same(
    [row.scriptOwner, row.scriptOffset, row.scriptWait, row.animScriptActive],
    [reduced.source.owner, reduced.source.offset, reduced.source.wait, reduced.active],
  )) throw new Error(`${prefix}: source cursor drift`);

  const actualRollout = task(row, "AnimTask_Rollout_Step");
  if (!same(actualRollout?.data ?? null, reduced.rolloutTask?.data ?? null)) {
    throw new Error(`${prefix}: rollout task drift`);
  }
  const actualShake = task(row, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step");
  if (!same(actualShake?.data ?? null, reduced.shakeTask?.data ?? null)) {
    throw new Error(`${prefix}: power shake task drift`);
  }
  const actualMonBg = task(row, "Task_UpdateMonBg");
  if (!same(actualMonBg?.data ?? null, reduced.monbgTask?.data ?? null)) {
    throw new Error(`${prefix}: monbg task drift`);
  }
  const actualClear = task(row, "Task_ClearMonBg");
  if (!same(actualClear?.data ?? null, reduced.clearMonBgTask?.data ?? null)) {
    throw new Error(`${prefix}: clearmonbg task drift`);
  }

  const actualParticles = row.sprites
    .filter((sprite: any) => ownedTemplates.has(sprite.template?.symbol))
    .map((sprite: any) => ({
      slot: sprite.slot,
      template: sprite.template.symbol,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      data: sprite.data,
      subpriority: sprite.subpriority,
    }));
  const expectedParticles = reduced.particles.map((particle) => ({
    slot: particle.slot,
    template: particle.template,
    x: particle.x,
    y: particle.y,
    x2: particle.x2,
    y2: particle.y2,
    data: particle.data,
    subpriority: particle.subpriority,
  }));
  if (!same(actualParticles, expectedParticles)) {
    throw new Error(`${prefix}: particle topology/axes drift`);
  }

  const geometry = geometryFor(orientation, body);
  const attacker = row.sprites.find((sprite: any) => sprite.slot === geometry.attackerSpriteSlot);
  const target = row.sprites.find((sprite: any) => sprite.slot === geometry.targetSpriteSlot);
  if (!same([attacker?.x2 ?? 0, attacker?.y2 ?? 0], [reduced.attackerOffset.x, reduced.attackerOffset.y])) {
    throw new Error(`${prefix}: attacker axis drift`);
  }
  if (!same([target?.x2 ?? 0, target?.y2 ?? 0], [reduced.targetOffset.x, reduced.targetOffset.y])) {
    throw new Error(`${prefix}: target shake drift`);
  }
  if (!same(row.registers.bldcnt, reduced.registers.bldcnt)
    || !same(row.registers.bldalpha, reduced.registers.bldalpha)
    || !same(row.registers.bg1hofs, reduced.registers.bg1hofs)
    || !same(row.registers.bg1vofs, reduced.registers.bg1vofs)
    || !same(row.registers.bg2hofs, reduced.registers.bg2hofs)
    || !same(row.registers.bg2vofs, reduced.registers.bg2vofs)
    || row.visualTaskCount !== reduced.visualTaskCount
    || row.soundTaskCount !== reduced.soundTaskCount) {
    throw new Error(`${prefix}: register/task-count drift`);
  }

  const expectedTags = reduced.resources.tileTags;
  const actualTags = expectedTags.filter((tag) => row.tileTags.includes(tag));
  if (!same(actualTags, expectedTags)
    || !same(reduced.resources.paletteTags.filter((tag) => row.paletteTags.includes(tag)), reduced.resources.paletteTags)) {
    throw new Error(`${prefix}: animation resource tags drift`);
  }
}

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation];
  const probe = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8"));
  const player = orientation === "player-back";
  const baseConfig: SceneOnRolloutConfig = {
    move: "ROLLOUT",
    attacker: battler(player ? "player" : "opponent"),
    target: battler(player ? "opponent" : "player"),
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
      playerGender: "male",
      opponentGender: "male",
    },
    counter: 1,
    animationProfile: geometryFor(orientation, 1),
  };
  let reducerRows = 0;
  let seamRows = 0;
  const lifecycle = new Map<string, number>();
  let priorOwned = new Set<string>();
  const latches = { sourceAxes: 0, softwareOamAxes: 0, hardwareOamAxes: 0, monbg: 0 };
  for (const bodyRows of probe.bodies as any[][]) {
    const body = bodyRows[0].body as number;
    const geometry = geometryFor(orientation, body);
    const config: SceneOnRolloutConfig = {
      ...baseConfig,
      counter: body as 1 | 2 | 3 | 4 | 5,
      animationProfile: geometry,
    };
    const stage = createSceneOnMovePresentation(config);
    priorOwned = new Set<string>();
    for (const row of bodyRows) {
      const reduced = rolloutAtAge(row.age, config.counter, geometry);
      assertRow(orientation, body, row, reduced);
      const view = sceneOnRolloutView({ ...stage, age: row.age });
      const { attacker: _attacker, target: _target, ...seamState } = view;
      if (!same(reduced, seamState)) throw new Error(`${orientation} body ${body} age ${row.age}: typed seam drift`);
      seamRows += 1;
      reducerRows += 1;
      const owned = new Set(reduced.particles.map((particle) => `${particle.slot}:${particle.template}`));
      for (const identity of owned) {
        if (!priorOwned.has(identity)) {
          const template = identity.slice(identity.indexOf(":") + 1);
          lifecycle.set(template, (lifecycle.get(template) ?? 0) + 1);
        }
      }
      priorOwned = owned;
      if (row.age >= 13 && row.age <= 22) latches.sourceAxes += 1;
      if (row.age >= 14 && row.age <= 23) latches.softwareOamAxes += 1;
      if (row.age >= 15 && row.age <= 24) latches.hardwareOamAxes += 1;
      if (reduced.shakeTask !== null && reduced.monbg !== null && row.age > reduced.source.offset) latches.monbg += 1;
    }
  }
  result[orientation] = {
    reducerRows,
    seamRows,
    lifecycle: Object.fromEntries(lifecycle),
    latches,
    cleanup: {
      age: 166,
      active: false,
      visualTasks: 0,
      soundTasks: 0,
    },
  };
}
console.log(JSON.stringify(result));
