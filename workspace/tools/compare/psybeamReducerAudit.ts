import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { psybeamAtAge } from "../../src/animation/psybeam.ts";

type Orientation = "player-back" | "opponent-front";

const GOLD_RING_TAG = 10163;

const GEOMETRY = {
  "player-back": {
    side: "player" as const,
    attacker: { x: 72, y: 93 },
    target: { x: 176, y: 42 },
    targetIdleX2: 1,
    dense: "tools/compare/evidence/psybeam-player-dense-state.json.gz",
  },
  "opponent-front": {
    side: "opponent" as const,
    attacker: { x: 176, y: 41 },
    target: { x: 72, y: 88 },
    targetIdleX2: 0,
    dense: "tools/compare/evidence/psybeam-opponent-dense-state.json.gz",
  },
} as const;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fail(
  failures: string[],
  orientation: Orientation,
  age: number,
  field: string,
  expected: unknown,
  actual: unknown,
): void {
  if (failures.length >= 20) return;
  failures.push(
    orientation + " age " + age + " " + field
      + ": expected " + JSON.stringify(expected)
      + ", got " + JSON.stringify(actual),
  );
}

function auditOrientation(orientation: Orientation) {
  const config = GEOMETRY[orientation];
  const probe = JSON.parse(
    gunzipSync(readFileSync(config.dense)).toString(),
  ) as { frames: readonly any[] };
  const failures: string[] = [];
  if (probe.frames.length !== 160) {
    failures.push(
      orientation + ": retained row count is " + probe.frames.length
        + ", expected 160",
    );
  }

  for (let age = 0; age < 160; age++) {
    const row = probe.frames[age]!;
    const state = psybeamAtAge(
      age,
      config.side,
      config.attacker,
      config.target,
      config.targetIdleX2,
    );
    const expectedSource = [
      row.animScriptActive,
      row.scriptOwner,
      row.scriptOffset,
      row.scriptWait,
      row.animArgs,
    ];
    const actualSource = [
      state.source.active,
      state.source.owner,
      state.source.offset,
      state.source.wait,
      state.source.args,
    ];
    if (!same(expectedSource, actualSource)) {
      fail(failures, orientation, age, "source", expectedSource, actualSource);
    }

    const expectedTasks = row.tasks.map((task: any) => ({
      slot: task.slot,
      callback: task.func?.symbol,
      data: task.data,
    }));
    if (!same(expectedTasks, state.tasks)) {
      fail(failures, orientation, age, "tasks", expectedTasks, state.tasks);
    }

    const expectedRings = row.sprites
      .filter((sprite: any) => sprite.template?.symbol === "gGoldRingSpriteTemplate")
      .map((sprite: any) => ({
        slot: sprite.slot,
        x: sprite.x,
        y: sprite.y,
        x2: sprite.x2,
        y2: sprite.y2,
        data: sprite.data,
        callback: sprite.callback?.symbol,
        matrix: sprite.matrix,
        subpriority: sprite.subpriority,
      }));
    const actualRings = state.rings.map((ring) => ({
      slot: ring.slot,
      x: ring.x,
      y: ring.y,
      x2: ring.x2,
      y2: ring.y2,
      data: ring.data,
      callback: ring.callback,
      matrix: ring.matrix,
      subpriority: ring.subpriority,
    }));
    if (!same(expectedRings, actualRings)) {
      fail(failures, orientation, age, "GoldRing sprites", expectedRings, actualRings);
    }

    const expectedCounts = [row.visualTaskCount, row.soundTaskCount];
    const actualCounts = [state.visualTaskCount, state.soundTaskCount];
    if (!same(expectedCounts, actualCounts)) {
      fail(failures, orientation, age, "task counts", expectedCounts, actualCounts);
    }
    const expectedRegisters = [
      row.registers.bldcnt,
      row.registers.bldalpha,
      row.registers.bldy,
    ];
    const actualRegisters = [
      state.registers.bldcnt,
      state.registers.bldalpha,
      state.registers.bldy,
    ];
    if (!same(expectedRegisters, actualRegisters)) {
      fail(failures, orientation, age, "BG registers", expectedRegisters, actualRegisters);
    }

    // The species idle hold is a draw input before SwayMon. Its source task
    // resets x2 to zero when the final half-wave destroys, so the post-sway
    // tail is not another species-specific idle assertion.
    const expectedTargetX2 = state.swayMon
      ? state.targetSwayX2
      : age < 54
        ? config.targetIdleX2
        : 0;
    if (row.battlerSprites.target.x2 !== expectedTargetX2) {
      fail(
        failures,
        orientation,
        age,
        "target x2",
        row.battlerSprites.target.x2,
        expectedTargetX2,
      );
    }
    const loaded = row.tileTags.includes(GOLD_RING_TAG)
      && row.paletteTags.includes(GOLD_RING_TAG);
    if (loaded !== state.resources.loaded) {
      fail(failures, orientation, age, "GoldRing resource latch", loaded, state.resources.loaded);
    }
  }

  return {
    orientation,
    sourceRows: probe.frames.length,
    reducerRows: probe.frames.length - (failures.length ? failures.length : 0),
    failures,
  };
}

const result = {
  schema: "psybeam-reducer-audit/v1",
  framebufferCompared: false,
  orientations: [
    auditOrientation("player-back"),
    auditOrientation("opponent-front"),
  ],
};
const failures = result.orientations.flatMap((entry) => entry.failures);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
console.log(JSON.stringify(result));
