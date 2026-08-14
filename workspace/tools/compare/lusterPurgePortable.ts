import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  lusterPurgeAtAge,
  type LusterPurgeConfig,
  type LusterPurgeSprite,
  type LusterPurgeTask,
} from "../../src/animation/lusterPurge.ts";

type Row = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
type Evidence = Record<string, any>;

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/luster-purge-evidence.json", "utf8",
)) as Record<string, any>;
const sha256 = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function configFrom(rows: Row[], orientation: Orientation): LusterPurgeConfig {
  const first = rows[0]!;
  const playerBack = orientation === "player-back";
  const attackerId = first.animationBattlers.attacker as 0 | 1;
  const targetId = first.animationBattlers.target as 0 | 1;
  const monbg = rows[45]!.tasks.find((task: Row) => task.func.symbol === "Task_UpdateMonBg");
  const firstHit = rows[170]!.sprites.find((sprite: Row) =>
    sprite.template.symbol === "gRandomPosHitSplatSpriteTemplate");
  const hitsplats = ([170, 175, 180, 185, 190, 195] as const).map((age) => {
    const hit = rows[age]!.sprites.find((sprite: Row) =>
      sprite.template.symbol === "gRandomPosHitSplatSpriteTemplate"
      && sprite.callback.symbol === "RunStoredCallbackWhenAffineAnimEnds"
      && sprite.slot === 3 + ((age - 170) / 5 % 3));
    if (!hit) throw new Error(`${orientation} age ${age}: missing RNG hitsplat`);
    return { x: hit.x2 + 24, y: hit.y2 + 12 };
  }) as unknown as LusterPurgeConfig["visualRandom"]["hitsplats"];
  const targetSlot = first.animationBattlers.spriteIds[targetId];
  const target = first.sprites.find((sprite: Row) => sprite.slot === targetSlot);
  return {
    attackerSide: playerBack ? "player" : "opponent",
    attackerBattlerId: attackerId,
    attackerSpriteSlot: first.animationBattlers.spriteIds[attackerId],
    targetSpriteSlot: targetSlot,
    targetInitialX2: target.x2,
    circleCenter: { x: rows[48]!.sprites.find((sprite: Row) =>
      sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate").x,
    y: rows[48]!.sprites.find((sprite: Row) =>
      sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate").y },
    monbgCenter: { x: monbg.data[1], y: monbg.data[2] },
    targetCenter: { x: firstHit.x, y: firstHit.y },
    monbgPosition: { x: monbg.data[3], y: monbg.data[4] },
    visualRandom: { hitsplats },
  };
}

function sourceTasks(row: Row): LusterPurgeTask[] {
  return row.tasks.map((task: Row) => ({
    slot: task.slot, name: task.func.symbol, data: task.data,
  }));
}

function sourceSprites(row: Row): LusterPurgeSprite[] {
  return row.sprites.filter((sprite: Row) =>
    sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate"
    || sprite.template.symbol === "gRandomPosHitSplatSpriteTemplate")
    .map((sprite: Row) => ({
      kind: sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate" ? "circle" : "hitsplat",
      slot: sprite.slot,
      callback: sprite.callback.symbol,
      center: { x: sprite.x, y: sprite.y },
      offset: { x2: sprite.x2, y2: sprite.y2 },
      matrixNum: sprite.matrixNum,
      matrix: sprite.matrix,
      animation: sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate" ? 0 : 2,
    }));
}

function verifyOrientation(orientation: Orientation, evidence: Evidence): number {
  const compressed = readFileSync(evidence.denseState);
  if (sha256(compressed) !== evidence.denseStateSha256) throw new Error(`${orientation}: dense archive drift`);
  const probe = JSON.parse(gunzipSync(compressed).toString("utf8")) as Record<string, any>;
  const rows = probe.frames as Row[];
  if (probe.schema !== "luster-purge-dense-evidence/v1"
    || rows.length !== evidence.sourceWindow.frameCount
    || !same(probe.sourceWindow, evidence.sourceWindow)) throw new Error(`${orientation}: source window`);
  const config = configFrom(rows, orientation);
  const failures: string[] = [];
  const first = rows[0]!;
  const hyperStarts: number[] = [];
  for (const [age, row] of rows.entries()) {
    const state = lusterPurgeAtAge(age, config);
    const expectedActive = row.animScriptActive;
    const expectedMonbg = {
      active: age >= 45 && age <= 293,
      bg: orientation === "player-back" ? "BG2" : "BG1",
      x: age >= 45 && age <= 293 ? config.monbgPosition.x : 0,
      y: age >= 45 && age <= 293 ? config.monbgPosition.y : 0,
    };
    const expectedGpu = {
      bldcnt: row.registers.bldcnt,
      bldalpha: row.registers.bldalpha,
      bldy: row.registers.bldy,
    };
    const expectedResources = {
      circle: row.paletteTags.includes(10267), impact: row.paletteTags.includes(10135),
    };
    const targetId = row.animationBattlers.target;
    const targetSlot = row.animationBattlers.spriteIds[targetId];
    const target = row.sprites.find((sprite: Row) => sprite.slot === targetSlot);
    const checks: Array<[string, unknown, unknown]> = [
      ["active", state.active, expectedActive],
      ["script", state.scriptOffset, row.scriptOffset],
      ["visual count", state.visualTaskCount, row.visualTaskCount],
      ["tasks", state.tasks, sourceTasks(row)],
      ["sprites", state.sprites, sourceSprites(row)],
      ["resources", state.resources, expectedResources],
      ["monbg", state.monbg, expectedMonbg],
      ["GPU", state.gpu, expectedGpu],
      ["target shake", state.targetX2, target.x2],
    ];
    for (const [label, actual, expected] of checks) {
      if (!same(actual, expected)) failures.push(`age ${age} ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    }
    if (!same(row.immutableState, first.immutableState)
      || !same(row.battlers, first.battlers)
      || !same(row.parties, first.parties)
      || !same(row.engine, first.engine)) failures.push(`age ${age} gameplay state changed`);
    if (age > 0 && row.se1.status === 0 && rows[age - 1]!.se1.status !== 0) hyperStarts.push(age);
  }
  if (!same(hyperStarts, evidence.visualEvents.soundTaskStartRows)) {
    failures.push(`audio starts ${JSON.stringify(hyperStarts)}`);
  }
  const modeledHyper = rows.flatMap((_row, age) =>
    lusterPurgeAtAge(age, config).audio.some((event) => event.song === "SE_M_HYPER_BEAM") ? [age] : []);
  if (!same(modeledHyper, evidence.visualEvents.soundTaskStartRows)) failures.push("modeled audio topology");
  if (new Set(rows.map((row) => row.immutableState.rngValue)).size !== 1) failures.push("gameplay RNG moved");
  if (failures.length) throw new Error(`${orientation}: reducer mismatch\n${failures.slice(0, 30).join("\n")}`);
  console.log(`${orientation}: ${rows.length}/${rows.length} reducer topology rows; gameplay RNG stable`);
  return rows.length;
}

if (fixture.schema !== "luster-purge-bilateral-evidence/v1"
  || fixture.status !== "unsupported" || fixture.coverageCredit !== false) {
  throw new Error("Luster Purge checkpoint must remain unsupported");
}
let total = 0;
for (const [orientation, evidence] of Object.entries(fixture.orientations) as Array<[Orientation, Evidence]>) {
  total += verifyOrientation(orientation, evidence);
}
if (total !== 665) throw new Error(`incomplete bilateral rows ${total}/665`);
console.log(`MOVE_LUSTER_PURGE reducer checkpoint: ${total}/665 retained rows exact; no framebuffer claim`);

