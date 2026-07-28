// Fresh dense component comparator for legal Battle Scene ON MOVE_CHARM.
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  CHARM_BODY_FRAME_COUNT,
  charmAtAge,
} from "../../src/animation/charm.ts";

type Fixture = {
  schema: "charm-portable-fixture/v1";
  scenario: string;
  probe: string;
  attackerSide: "player" | "opponent";
  attackerCenter: { x: number; y: number };
};
type ProbeSprite = {
  slot: number; template: number;
  x: number; y: number; x2: number; y2: number;
  attr0: number; attr1: number; attr2: number;
  matrix: { a: number; b: number; c: number; d: number };
  data: number[];
};
type ProbeRow = {
  frame: number;
  attacker: number;
  visualTaskCount: number;
  active: ProbeSprite[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2];
if (!fixturePath) {
  throw new Error("usage: charmPortable.ts <fixture.json>");
}
const fixture = JSON.parse(
  readFileSync(resolve(fixturePath), "utf8"),
) as Fixture;
if (fixture.schema !== "charm-portable-fixture/v1") {
  throw new Error(`unexpected fixture schema ${fixture.schema}`);
}
const scratch = mkdtempSync(join(tmpdir(), "pokebench-charm-compare-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  schema: string;
  magentaHeartTemplate: number;
  rows: ProbeRow[];
};
if (probe.schema !== "charm-window-probe/v1") {
  throw new Error(`unexpected probe schema ${probe.schema}`);
}
const startIndex = probe.rows.findIndex((row) => row.visualTaskCount > 0);
if (startIndex < 0) throw new Error("CHARM visual body did not start");
let endIndex = startIndex;
while (
  endIndex + 1 < probe.rows.length
  && probe.rows[endIndex + 1]!.visualTaskCount > 0
) endIndex++;
// Include the first fully-cleared move-owned display frame.
endIndex++;
const body = probe.rows.slice(startIndex, endIndex + 1);
if (body.length !== CHARM_BODY_FRAME_COUNT) {
  throw new Error(`expected ${CHARM_BODY_FRAME_COUNT} body frames, got ${body.length}`);
}
const nextVisualIndex = probe.rows.findIndex(
  (row, index) => index > endIndex && row.visualTaskCount > 0,
);
if (nextVisualIndex - endIndex - 1 !== 4) {
  throw new Error("CHARM body is not separated from the stat task by four clear frames");
}

let matched = 0;
for (let age = 0; age < body.length; age++) {
  const row = body[age]!;
  const expected = charmAtAge(
    age,
    fixture.attackerSide,
    fixture.attackerCenter,
  );
  const hearts = row.active
    .filter((sprite) => sprite.template === probe.magentaHeartTemplate)
    .sort((a, b) => a.slot - b.slot);
  const heartActual = hearts.map((sprite) => ({
    slot: sprite.slot,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data0: sprite.data[0], data1: sprite.data[1], data2: sprite.data[2],
  }));
  const heartExpected = expected.hearts.map((heart) => ({
    slot: heart.slot,
    x: heart.x, y: heart.y, x2: heart.x2, y2: heart.y2,
    data0: heart.data0, data1: heart.data1, data2: heart.data2,
  }));
  if (JSON.stringify(heartActual) !== JSON.stringify(heartExpected)) {
    throw new Error(`heart mismatch at relative age ${age}: ${
      JSON.stringify({ heartActual, heartExpected })}`);
  }
  const battlerSlot = row.attacker === 0 ? 6 : 8;
  const battler = row.active.find((sprite) => sprite.slot === battlerSlot);
  if (!battler) throw new Error(`missing attacker sprite at age ${age}`);
  const rockActual = {
    x2: battler.x2,
    y2: battler.y2,
    matrix: battler.matrix,
  };
  const rockExpected = {
    x2: expected.rock.x2,
    y2: expected.rock.y2,
    matrix: expected.rock.matrix,
  };
  if (JSON.stringify(rockActual) !== JSON.stringify(rockExpected)) {
    throw new Error(`rock mismatch at relative age ${age}: ${
      JSON.stringify({ rockActual, rockExpected })}`);
  }
  const expectedTasks = Number(expected.rock.active) + expected.hearts.length;
  if (row.visualTaskCount !== expectedTasks) {
    throw new Error(
      `visual count mismatch at age ${age}: ${row.visualTaskCount} != ${expectedTasks}`,
    );
  }
  matched++;
}
console.log(
  `CHARM ${fixture.attackerSide}: ${matched}/${CHARM_BODY_FRAME_COUNT} `
  + `complete component frames; stat task excluded after four clear frames`,
);
