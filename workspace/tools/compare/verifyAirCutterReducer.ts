/**
 * Development-only semantic replay for Air Cutter's retained Scene-ON rows.
 *
 * Production imports neither this verifier nor the recorded evidence. This
 * checks reducer and typed-seam semantics only; it deliberately performs no
 * compositor or framebuffer comparison.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  AIR_CUTTER_FIRST_INACTIVE_AGE,
  airCutterAtAge,
  type AirCutterLiveInputs,
} from "../../src/animation/airCutter.ts";
import {
  sceneOnAirCutterView,
  type SceneOnAirCutterPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const orientations: readonly Orientation[] = ["player-back", "opponent-front"];
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/air-cutter-evidence.json"), "utf8")) as Json;

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function owned(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) =>
    sprite.template?.symbol === "gAirWaveProjectileSpriteTemplate"
      || sprite.template?.symbol === "gAirCutterSliceSpriteTemplate",
  );
}

function namedTask(row: Json, name: string): Json | undefined {
  return row.tasks.find((task: Json) => task.func?.symbol === name);
}

function allocation(row: Json, tag: number) {
  const paletteBank = row.paletteTags.indexOf(tag);
  const tileSlot = row.tileTags.indexOf(tag);
  invariant(paletteBank >= 0 && tileSlot >= 0, `missing live allocation for tag ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot] as readonly number[] | undefined;
  invariant(range?.length === 2, `missing tile range for tag ${tag}`);
  return { paletteBank, tileSlot, tileRange: [range[0]!, range[1]!] as const };
}

function liveInputs(orientation: Orientation, rows: readonly Json[]): AirCutterLiveInputs {
  const row0 = rows[0]!;
  const projectile = namedTask(rows[17]!, "AirCutterProjectileStep1");
  invariant(projectile, `${orientation}: missing first projectile task`);
  const targetSide = orientation === "player-back" ? "opponent" : "player";
  const directionX = targetSide === "player" ? -32 : 32;
  const directionY = targetSide === "player" ? 24 : -24;
  const seenWaveSlots = new Set<number>();
  const waveSlots = [17, 20, 23].map((age) => {
    const wave = owned(rows[age]!).find((sprite: Json) =>
      sprite.template.symbol === "gAirWaveProjectileSpriteTemplate" && !seenWaveSlots.has(sprite.slot),
    );
    if (wave) seenWaveSlots.add(wave.slot);
    return wave?.slot;
  });
  invariant(waveSlots.every((slot): slot is number => typeof slot === "number"), `${orientation}: wave slots`);
  const slice = owned(rows[76]!).find((sprite: Json) => sprite.template.symbol === "gAirCutterSliceSpriteTemplate");
  const shake = namedTask(rows[83]!, "AnimTask_ShakeMon2_Step");
  const update = namedTask(rows[17]!, "Task_UpdateMonBg");
  const clear = namedTask(rows[101]!, "Task_ClearMonBg");
  invariant(slice && shake && update && clear, `${orientation}: retained task/slice topology`);
  const attacker = row0.battlerSprites.attacker;
  const target = row0.battlerSprites.target;
  return {
    attackerSide: orientation === "player-back" ? "player" : "opponent",
    targetSide,
    attackerSpecies: "GOLBAT",
    targetSpecies: "CHANSEY",
    attackerCenter: { x: projectile.data[9], y: projectile.data[10] },
    targetCenter: { x: projectile.data[11] - directionX, y: projectile.data[12] - directionY },
    attackerSprite: { slot: attacker.slot, subpriority: attacker.subpriority, matrixNum: attacker.matrixNum, matrix: attacker.matrix },
    targetSprite: { slot: target.slot, subpriority: target.subpriority, matrixNum: target.matrixNum, matrix: target.matrix },
    waveSpriteSlots: waveSlots as [number, number, number],
    sliceSpriteSlot: slice.slot,
    taskSlots: { projectile: projectile.slot, targetShake: shake.slot, partnerShake: 2, updateMonBg: update.slot, clearMonBg: clear.slot },
    resources: { airWave: allocation(rows[1]!, 10003), cut: allocation(rows[4]!, 10138), impact: allocation(rows[7]!, 10135) },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    spriteOrder: row0.spriteOrder,
    monbg: {
      layer: targetSide === "player" ? "bg2" : "bg1",
      center: { x: update.data[1], y: update.data[2] },
      bgX: update.data[3], bgY: update.data[4],
    },
  };
}

function config(input: AirCutterLiveInputs): SceneOnAirCutterPresentationState {
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter, ...animationInputs } = input;
  return {
    age: 0,
    config: {
      move: "AIR_CUTTER",
      attacker: { species: attackerSpecies, geometry: { side: attackerSide, spriteCorner: attackerCenter, animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
      target: { species: targetSpecies, geometry: { side: targetSide, spriteCorner: targetCenter, animationCenter: targetCenter, battlePositionCenter: targetCenter } },
      fieldProfile: { kind: "default" },
      animationInputs,
    },
  } as unknown as SceneOnAirCutterPresentationState;
}

function compareRow(orientation: Orientation, age: number, row: Json, state: ReturnType<typeof airCutterAtAge>): void {
  invariant(state.active === row.animScriptActive, `${orientation}/${age}: source active`);
  invariant(state.source.pointerOffset === row.scriptOffset, `${orientation}/${age}: source pointer offset`);
  invariant(state.source.wait === row.scriptWait, `${orientation}/${age}: source wait`);
  const expected = owned(row);
  invariant(state.sprites.length === expected.length, `${orientation}/${age}: owned sprite count`);
  for (const sprite of expected) {
    const actual = state.sprites.find((candidate) => candidate.slot === sprite.slot);
    invariant(actual, `${orientation}/${age}: missing owned slot ${sprite.slot}`);
    invariant(actual.template === sprite.template.symbol, `${orientation}/${age}: template slot ${sprite.slot}`);
    invariant(actual.callback === sprite.callback.symbol, `${orientation}/${age}: callback slot ${sprite.slot}`);
    invariant(JSON.stringify(actual.data) === JSON.stringify(sprite.data), `${orientation}/${age}: data slot ${sprite.slot}`);
    invariant(actual.x === sprite.x && actual.y === sprite.y && actual.x2 === sprite.x2 && actual.y2 === sprite.y2,
      `${orientation}/${age}: source callback coordinates slot ${sprite.slot}`);
    invariant(actual.subpriority === sprite.subpriority, `${orientation}/${age}: source subpriority slot ${sprite.slot}`);
  }
  invariant(JSON.stringify(state.painterOrder) === JSON.stringify(
    row.spriteOrder.filter((slot: number) => expected.some((sprite) => sprite.slot === slot)),
  ), `${orientation}/${age}: owned painter order`);

  const expectedTasks = row.tasks.filter((task: Json) => [
    "AirCutterProjectileStep1", "AirCutterProjectileStep2", "AnimTask_ShakeMon2_Step",
    "Task_UpdateMonBg", "Task_ClearMonBg",
  ].includes(task.func?.symbol));
  invariant(state.tasks.length === expectedTasks.length, `${orientation}/${age}: owned task count`);
  for (const task of state.tasks) {
    const expectedTask = expectedTasks.find((candidate: Json) =>
      candidate.slot === task.slot && candidate.func?.symbol === task.callback);
    invariant(expectedTask, `${orientation}/${age}: missing ${task.callback} task ${task.slot}`);
    invariant(JSON.stringify(task.data) === JSON.stringify(expectedTask.data.slice(0, task.data.length)),
      `${orientation}/${age}: ${task.callback} task data ${task.slot}`);
  }
  const tags = [
    ["airWave", 10003], ["cut", 10138], ["impact", 10135],
  ] as const;
  for (const [resource, tag] of tags) {
    invariant(state.resources[resource].loaded === row.paletteTags.includes(tag)
      && state.resources[resource].loaded === row.tileTags.includes(tag),
    `${orientation}/${age}: ${resource} bank lifetime`);
  }
  invariant(state.battlers.target.offset.x === row.battlerSprites.target.x2
    && state.battlers.target.offset.y === row.battlerSprites.target.y2,
  `${orientation}/${age}: target ShakeMon2 axis`);
  invariant(state.background.monbg === Boolean(namedTask(row, "Task_UpdateMonBg")),
    `${orientation}/${age}: monbg lifetime`);
  invariant(state.registers.bldcnt === row.registers.bldcnt
    && state.registers.bldalpha === row.registers.bldalpha,
  `${orientation}/${age}: blend registers`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount,
    `${orientation}/${age}: visual task count`);
  invariant(state.cleanup.ownedSprites === expected.length,
    `${orientation}/${age}: owned cleanup sprite count`);
}

function replay(orientation: Orientation): Json {
  const receipt = fixture.orientations[orientation];
  const probe = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(rows.length === 112, `${orientation}: retained row count`);
  const input = liveInputs(orientation, rows);
  const state = config(input);
  let reducerRows = 0;
  let seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let age = 0; age < rows.length; age += 1) {
      const reduced = airCutterAtAge(age, input);
      const view = sceneOnAirCutterView({ ...state, age });
      compareRow(orientation, age, rows[age]!, reduced);
      invariant(JSON.stringify(view.sprites) === JSON.stringify(reduced.sprites)
        && JSON.stringify(view.resources) === JSON.stringify(reduced.resources)
        && JSON.stringify(view.painterOrder) === JSON.stringify(reduced.painterOrder),
      `${orientation}/${age}: typed seam drift`);
      reducerRows += 1;
      seamRows += 1;
    }
  }
  invariant(airCutterAtAge(AIR_CUTTER_FIRST_INACTIVE_AGE, input).cleanup.firstInactive,
    `${orientation}: first inactive cleanup`);
  return {
    reducerRows, seamRows,
    retainedRows: rows.length,
    lifecycle: { firstWave: 17, firstSlice: 76, targetShake: "83..96", firstInactive: 111 },
    latches: JSON.parse(readFileSync(resolve(root, receipt.changeMap), "utf8")).latches,
    framebufferCompared: false,
    coverageCredit: false,
  };
}

export interface AirCutterReducerVerification {
  readonly "player-back": Json;
  readonly "opponent-front": Json;
  readonly bilateral: Readonly<{
    readonly retainedRows: 224;
    readonly passes: 2;
    readonly reducerRows: 448;
    readonly seamRows: 448;
    readonly framebufferCompared: false;
    readonly coverageCredit: false;
  }>;
}

export function verifyAirCutterReducer(): AirCutterReducerVerification {
  const result = Object.fromEntries(orientations.map((orientation) => [orientation, replay(orientation)])) as Record<Orientation, Json>;
  return {
    ...result,
    bilateral: {
      retainedRows: 224,
      passes: 2,
      reducerRows: 448,
      seamRows: 448,
      framebufferCompared: false,
      coverageCredit: false,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyAirCutterReducer(), null, 2));
}
