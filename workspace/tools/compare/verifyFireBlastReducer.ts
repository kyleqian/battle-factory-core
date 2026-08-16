import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  FIRE_BLAST_CROSS_STARTS,
  FIRE_BLAST_FRAME_COUNT,
  FIRE_BLAST_RING_STARTS,
  fireBlastAtAge,
} from "../../src/animation/fireBlast.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFireBlastView,
  type SceneOnFireBlastConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fire-blast-evidence.json", "utf8",
));
const sha = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gFireBlastRingSpriteTemplate", "gFireBlastCrossSpriteTemplate",
]);

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation];
  const compressed = readFileSync(receipt.denseState);
  if (sha(compressed) !== receipt.denseStateSha256) {
    throw new Error(`${orientation} dense receipt drifted`);
  }
  const probe = JSON.parse(gunzipSync(compressed).toString("utf8"));
  const first = probe.frames[0];
  const playerAttacker = orientation === "player-back";
  const battler = (
    species: "OCTILLERY" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: { x: sprite.x, y: sprite.y },
    },
  });
  const attackerSprite = probe.frames[4].battlerSprites.attacker;
  const targetSprite = probe.frames[4].battlerSprites.target;
  const attackerPictureCenter = playerAttacker
    ? { x: 72, y: 98 } : { x: 176, y: 50 };
  const targetPictureCenter = playerAttacker
    ? { x: 176, y: 42 } : { x: 72, y: 88 };
  const config: SceneOnFireBlastConfig = {
    move: "FIRE_BLAST",
    attacker: battler("OCTILLERY", playerAttacker ? "player" : "opponent", attackerSprite),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", targetSprite),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: {
      attackerPictureCenter,
      targetPictureCenter,
      targetSpriteSlot: targetSprite.slot,
    },
  };
  const stage = createSceneOnMovePresentation(config);
  let reducerRows = 0;
  let seamRows = 0;
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  const lifecycle = new Map<string, number>();
  let priorOwned = new Set<string>();
  for (let age = 0; age < probe.frames.length; age += 1) {
    const row = probe.frames[age];
    const reduced = fireBlastAtAge(age, config.attacker.geometry.side,
      config.animationProfile);
    const view = sceneOnFireBlastView({ ...stage, age });
    if (!same(reduced, {
      ...view, attacker: undefined, target: undefined,
    })) {
      const { attacker: _attacker, target: _target, ...seamState } = view;
      if (!same(reduced, seamState)) {
        throw new Error(`${orientation} typed seam drift at age ${age}`);
      }
    }
    seamRows += 1;
    if (!same([row.scriptOwner, row.scriptOffset, row.scriptWait,
      row.animScriptActive], [reduced.source.owner, reduced.source.offset,
      reduced.source.wait, reduced.active])) {
      throw new Error(`${orientation} source cursor drift at age ${age}`);
    }
    const sprites = row.sprites.filter((sprite: any) =>
      ownedTemplates.has(sprite.template.symbol));
    const actualBySlot = new Map(sprites.map((sprite: any) => [sprite.slot, sprite]));
    const expectedSprites = [...reduced.rings, ...reduced.crosses];
    if (!same([...actualBySlot.keys()].sort((a: any, b: any) => a - b),
      expectedSprites.map((sprite) => sprite.slot).sort((a, b) => a - b))) {
      throw new Error(`${orientation} sprite topology drift at age ${age}`);
    }
    for (const expected of expectedSprites) {
      const actual: any = actualBySlot.get(expected.slot);
      const template = expected.kind === "ring"
        ? "gFireBlastRingSpriteTemplate" : "gFireBlastCrossSpriteTemplate";
      if (!actual || actual.template.symbol !== template
        || actual.callback.symbol !== expected.callback
        || !same([actual.x, actual.y, actual.x2, actual.y2],
          [expected.x, expected.y, expected.x2, expected.y2])
        || !same(actual.data, expected.data)
        || actual.animCmdIndex !== expected.animationFrame
        || actual.animDelayCounter !== expected.animationDelayCounter
        || (actual.attr[2] & 0x3ff) !== expected.tileIndex
        || ((actual.attr[2] >> 12) & 15) !== expected.paletteSlot
        || !same(actual.matrix, expected.matrix)) {
        throw new Error(`${orientation} ${expected.kind} ${expected.group}/${expected.index} drift at age ${age}`);
      }
    }
    const paletteTasks = row.tasks.filter((task: any) =>
      task.func.symbol === "AnimTask_BlendSpriteColor_Step2");
    if (!same(paletteTasks.map((task: any) => task.data),
      reduced.paletteTasks.map((task) => task.data))) {
      throw new Error(`${orientation} palette task drift at age ${age}`);
    }
    const activePaletteCoefficient = paletteTasks.at(-1)?.data[10];
    if (activePaletteCoefficient !== undefined
      && activePaletteCoefficient !== reduced.palette.backgroundCoefficient) {
      throw new Error(`${orientation} faded palette coefficient drift at age ${age}`);
    }
    const shake = row.tasks.find((task: any) =>
      task.func.symbol === "AnimTask_ShakeMon_Step");
    if (!same(shake?.data ?? null, reduced.shakeTask?.data ?? null)) {
      throw new Error(`${orientation} shake task drift at age ${age}`);
    }
    const sound = row.tasks.find((task: any) =>
      String(task.func.symbol).startsWith("SoundTask_FireBlast"));
    if (!same(sound ? { callback: sound.func.symbol, data: sound.data } : null,
      reduced.soundTask)) {
      throw new Error(`${orientation} sound task drift at age ${age}`);
    }
    if (!same(row.registers.bldcnt, reduced.registers.bldcnt)
      || !same(row.registers.bldalpha, reduced.registers.bldalpha)
      || !same(row.registers.bldy, reduced.registers.bldy)
      || !same(row.registers.mosaic, reduced.registers.mosaic)
      || row.tileTags.includes(10029) !== reduced.resources.smallEmber
      || row.paletteTags.includes(10029) !== reduced.resources.smallEmber
      || row.visualTaskCount !== reduced.visualTaskCount
      || row.soundTaskCount !== reduced.soundTaskCount) {
      throw new Error(`${orientation} register/resource/count drift at age ${age}`);
    }
    const owned = new Set(sprites.map((sprite: any) =>
      `${sprite.slot}:${sprite.template.symbol}`));
    for (const identity of owned) {
      if (!priorOwned.has(identity)) {
        const template = identity.slice(identity.indexOf(":") + 1);
        lifecycle.set(template, (lifecycle.get(template) ?? 0) + 1);
      }
    }
    priorOwned = owned;
    reducerRows += 1;
    if (age > 0) {
      const prior = probe.frames[age - 1];
      if (same(row.hardwareOam, prior.softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, prior.softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, prior.fadedPalette)) paletteLatch += 1;
    }
  }
  if (probe.frames.length !== FIRE_BLAST_FRAME_COUNT
    || FIRE_BLAST_RING_STARTS.length !== 3
    || FIRE_BLAST_CROSS_STARTS.length !== 9) {
    throw new Error(`${orientation} lifecycle bounds drifted`);
  }
  result[orientation] = {
    reducerRows,
    seamRows,
    lifecycle: Object.fromEntries([...lifecycle].sort()),
    latches: { oam: `${oamLatch}/196`, matrices: `${matrixLatch}/196`,
      palette: `${paletteLatch}/196` },
    cleanup: { age: 196, active: false,
      visualTasks: probe.frames[196].visualTaskCount,
      soundTasks: probe.frames[196].soundTaskCount },
  };
}

console.log(JSON.stringify(result, null, 2));
