import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  lusterPurgeAtAge,
  type LusterPurgeConfig,
  type LusterPurgeSprite,
  type LusterPurgeState,
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

function phaseFromSourceRow(row: Row): LusterPurgeState["phase"] {
  if (!row.animScriptActive) return "inactive";
  switch (row.scriptOffset) {
    case 0:
    case 4:
    case 6:
      return "load";
    case 8:
    case 16:
    case 20:
      return "fade-in";
    case 44:
    case 78:
      return "circle";
    case 120:
    case 144:
    case 168:
    case 192:
    case 216:
    case 238:
      return "hits";
    case 270:
      return row.tasks.some((task: Row) => task.func.symbol === "AnimTask_BlendSpriteColor_Step2")
        ? "restore-palette" : "shake";
    case null:
      return "background-restore";
    default:
      throw new Error(`unmapped source script offset ${row.scriptOffset}`);
  }
}

function paletteFromSourceRow(row: Row): LusterPurgeState["palette"] {
  const task = (selector: (task: Row) => boolean): Row | undefined => row.tasks.find(selector);
  const psychic = task((entry) => entry.func.symbol === "FadeScreenToWhite_Step");
  const excluded = task((entry) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2"
    && entry.data[0] === 14 && entry.data[1] === 3);
  const circle = task((entry) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2"
    && entry.data[0] === 0 && entry.data[1] === 128);
  return {
    psychicCycleCounter: psychic?.data[5] ?? null,
    excludedBlend: excluded?.data[10] ?? null,
    circleBlend: circle?.data[10] ?? null,
  };
}

function startRows(rows: Row[], channel: "se1" | "se2"): number[] {
  return rows.flatMap((row, age) => age > 0 && row[channel].status === 0
    && rows[age - 1]![channel].status !== 0 ? [age] : []);
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
  const solarStarts = startRows(rows, "se2");
  const hyperStarts = startRows(rows, "se1");
  const expectedSolarPan = orientation === "player-back" ? -64 : 63;
  const expectedTargetPan = orientation === "player-back" ? 63 : -63;
  if (!same(solarStarts, [48])) failures.push(`Solar Beam SE2 start ${JSON.stringify(solarStarts)}`);
  for (const age of solarStarts) {
    if (rows[age]!.se2.tracks[0]?.panX !== expectedSolarPan) {
      failures.push(`age ${age} Solar Beam attacker pan`);
    }
  }
  for (const [age, row] of rows.entries()) {
    const state = lusterPurgeAtAge(age, config);
    const expectedActive = row.animScriptActive;
    const monbgTask = row.tasks.find((task: Row) => task.func.symbol === "Task_UpdateMonBg");
    const expectedMonbg = {
      active: Boolean(monbgTask),
      bg: monbgTask ? monbgTask.data[5] ? "BG2" : "BG1"
        : orientation === "player-back" ? "BG2" : "BG1",
      x: monbgTask?.data[3] ?? 0,
      y: monbgTask?.data[4] ?? 0,
    };
    const expectedGpu = {
      bldcnt: row.registers.bldcnt,
      bldalpha: row.registers.bldalpha,
      bldy: row.registers.bldy,
    };
    const expectedResources: LusterPurgeState["resources"] = {
      circle: row.paletteTags.includes(10267), impact: row.paletteTags.includes(10135),
    };
    const targetId = row.animationBattlers.target;
    const targetSlot = row.animationBattlers.spriteIds[targetId];
    const target = row.sprites.find((sprite: Row) => sprite.slot === targetSlot);
    const checks: Array<[string, unknown, unknown]> = [
      ["age", state.age, row.frame - evidence.sourceWindow.startFrame],
      ["active", state.active, expectedActive],
      ["script", state.scriptOffset, row.scriptOffset],
      ["phase", state.phase, phaseFromSourceRow(row)],
      ["visual count", state.visualTaskCount, row.visualTaskCount],
      ["tasks", state.tasks, sourceTasks(row)],
      ["sprites", state.sprites, sourceSprites(row)],
      ["resources", state.resources, expectedResources],
      ["monbg", state.monbg, expectedMonbg],
      ["GPU", state.gpu, expectedGpu],
      ["palette", state.palette, paletteFromSourceRow(row)],
      ["target shake", state.targetX2, target.x2],
    ];
    for (const [label, actual, expected] of checks) {
      if (!same(actual, expected)) failures.push(`age ${age} ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    }
    if (!same(row.immutableState, first.immutableState)
      || !same(row.battlers, first.battlers)
      || !same(row.parties, first.parties)
      || !same(row.engine, first.engine)) failures.push(`age ${age} gameplay state changed`);
  }
  if (!same(hyperStarts, evidence.visualEvents.soundTaskStartRows)) {
    failures.push(`audio starts ${JSON.stringify(hyperStarts)}`);
  }
  for (const age of hyperStarts) {
    if (rows[age]!.se1.tracks[0]?.panX !== expectedTargetPan) {
      failures.push(`age ${age} Hyper Beam target pan`);
    }
  }
  const modeledAudio = rows.flatMap((_row, age) => lusterPurgeAtAge(age, config).audio.map((event) => ({ age, ...event })));
  const expectedAudio = [
    ...solarStarts.map((age) => ({ age, song: "SE_M_SOLAR_BEAM" as const, pan: "attacker" as const })),
    ...hyperStarts.map((age) => ({ age, song: "SE_M_HYPER_BEAM" as const, pan: "target" as const })),
  ];
  if (!same(modeledAudio, expectedAudio)) failures.push("modeled audio topology");
  if (new Set(rows.map((row) => row.immutableState.rngValue)).size !== 1) failures.push("gameplay RNG moved");
  if (failures.length) throw new Error(`${orientation}: reducer mismatch\n${failures.slice(0, 30).join("\n")}`);
  console.log(`${orientation}: ${rows.length}/${rows.length} reducer topology rows; phase/palette/audio starts exact; gameplay RNG stable`);
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
console.log(`MOVE_LUSTER_PURGE reducer checkpoint: ${total}/665 retained rows exact; no framebuffer or audio-sample claim`);
