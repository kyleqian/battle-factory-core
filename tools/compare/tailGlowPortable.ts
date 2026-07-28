// Fresh complete software/hardware/audio proof for legal Scene-ON TAIL_GLOW.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  TAIL_GLOW_BODY_FRAME_COUNT,
  tailGlowAtAge,
} from "../../src/animation/tailGlow.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTailGlowView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

type Fixture = {
  scenario: string; probe: string;
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  attackerPictureOffset: { x: number; y: number };
  fieldProfile: { playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number };
};
type Matrix = { a: number; b: number; c: number; d: number };
type Sprite = {
  slot: number; template: number; x: number; y: number;
  attr0: number; attr1: number; attr2: number; matrixNum: number;
  subpriority: number; matrix: Matrix; data: number[];
};
type Row = {
  frame: number; sha256: string; visualTaskCount: number; soundTaskCount: number;
  active: Sprite[]; hardwareOam: number[][]; hardwareMatrices: Matrix[];
  fadedPalette: number[]; hardwarePalette: number[]; paletteTags: number[];
  bldcnt: number; bldalpha: number; bldy: number;
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
};
type Probe = { schema: string; orbTemplate: number; rows: Row[] };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtures = process.argv.slice(2);
if (fixtures.length !== 2) {
  throw new Error("usage: tailGlowPortable.ts <player-fixture> <opponent-fixture>");
}

function run(fixturePath: string, runNumber: number): string {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-tail-glow-evidence-"));
  const output = join(scratch, "probe.json");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "tail-glow-dense-evidence/v1") {
    throw new Error(`${fixturePath}: unexpected probe schema`);
  }
  const start = probe.rows.findIndex((row) => row.paletteTags[7] === 10212);
  const rows = probe.rows.slice(start, start + TAIL_GLOW_BODY_FRAME_COUNT);
  if (start < 0 || rows.length !== TAIL_GLOW_BODY_FRAME_COUNT
    || rows.at(-1)?.paletteTags[7] !== 0xffff) {
    throw new Error(`${fixturePath}: expected complete 203-frame asset envelope`);
  }
  const stage = createSceneOnMovePresentation({
    move: "TAIL_GLOW", attacker: fixture.attacker, target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const expected = tailGlowAtAge(
      age, fixture.attacker.geometry.side, fixture.attackerPictureOffset,
    );
    const seam = sceneOnTailGlowView({ ...stage, age });
    const seamMatch = JSON.stringify({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }) === JSON.stringify(expected);
    const actual = row.active.find((sprite) => sprite.template === probe.orbTemplate);
    const expectedAttr0 = expected.orb
      ? ((expected.orb.y - 32) & 0xff) | 0x500
      : 0;
    const expectedAttr1 = expected.orb
      ? ((expected.orb.x - 32) & 0x1ff) | 0xc000
      : 0;
    const expectedSubpriority =
      fixture.attacker.geometry.side === "player" ? 32 : 42;
    const software = expected.orb
      ? actual?.slot === expected.orb.slot
        && actual.x === expected.orb.x && actual.y === expected.orb.y
        && actual.matrix.a === expected.orb.matrixScale
        && actual.matrix.b === 0 && actual.matrix.c === 0
        && actual.matrix.d === expected.orb.matrixScale
        && actual.attr0 === expectedAttr0 && actual.attr1 === expectedAttr1
        && actual.attr2 === 0x7931 && actual.subpriority === expectedSubpriority
      : actual === undefined;
    const expectedTasks = Number(age >= 6 && age < 20)
      + Number(expected.orb !== null) + Number(age >= 138 && age < 158);
    const tasks = row.visualTaskCount === expectedTasks;
    const prior = tailGlowAtAge(
      age - 1, fixture.attacker.geometry.side, fixture.attackerPictureOffset,
    ).orb;
    const hardwareOrb = row.hardwareOam.filter((item) => item[2] === 0x7931);
    const hardware = prior
      ? hardwareOrb.some((item) =>
          item[0] === (((prior.y - 32) & 0xff) | 0x500)
          && item[1] === (((prior.x - 32) & 0x1ff) | 0xc000)
          && item[2] === 0x7931)
        && JSON.stringify(row.hardwareMatrices[0])
          === JSON.stringify({ a: prior.matrixScale, b: 0, c: 0, d: prior.matrixScale })
      : hardwareOrb.length === 0;
    const registers = row.bldy === 0
      && row.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && row.bldalpha === (expected.alpha ? 0x080c : 0);
    const transfer = age === 0
      || row.hardwarePalette.every((color, index) =>
        color === row.fadedPalette[index]
        || color === rows[age - 1]!.fadedPalette[index]);
    const sound = expected.soundRestart
      ? row.soundTaskCount === 1
        && row.se1.tracks.slice(0, 2).every((track) =>
          track.flags !== 0 && track.panX === expected.soundPan)
      : true;
    if (!(seamMatch && software && tasks && hardware && registers && transfer && sound)) {
      failures.push(`frame ${row.frame}/age ${age}: seam=${seamMatch} sw=${software}`
        + ` tasks=${tasks} hw=${hardware} regs=${registers}`
        + ` transfer=${transfer} sound=${sound}`);
    }
  }
  if (failures.length) throw new Error(failures.slice(0, 30).join("\n"));
  const digest = createHash("sha256").update(bytes).digest("hex");
  console.log(`${fixture.attacker.geometry.side} run ${runNumber}: `
    + `${rows.length}/${TAIL_GLOW_BODY_FRAME_COUNT} software/hardware/audio rows exact; ${digest}`);
  return digest;
}

for (const fixture of fixtures) {
  const first = run(fixture, 1);
  const second = run(fixture, 2);
  if (first !== second) throw new Error(`${fixture}: fresh evidence did not reproduce`);
}
