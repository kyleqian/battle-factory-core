/** Strict evidence-only verifier for the six natural MOVE_SPIT_UP windows. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
type Branch = Readonly<{
  orientation: Orientation;
  stockpiles: 1 | 2 | 3;
  scenario: string;
  denseState: string;
  rawRgbArchive: string;
  changeMap: string;
  repeatDenseJsonSha256: string;
  repeatRawRgbSequenceSha256: string;
}>;

const root = resolve(import.meta.dirname, "../..");
const branches: readonly Branch[] = [
  { orientation: "player-back", stockpiles: 1,
    scenario: "tools/battle-lab/mechanic-spit-up-player-swalot-one-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-player-1-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-player-1-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-player-1.json",
    repeatDenseJsonSha256: "b57d1a970739886cd30be0f30baba4a72f0ee38ca65f36e9c4dc77c7a32a8d02",
    repeatRawRgbSequenceSha256: "fc836e7ee617f0518867ffdc3cdd21b53c4eca5814f9f174c536cbba35d3bce6" },
  { orientation: "player-back", stockpiles: 2,
    scenario: "tools/battle-lab/mechanic-spit-up-player-swalot-two-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-player-2-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-player-2-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-player-2.json",
    repeatDenseJsonSha256: "17a5f882d78877e1322c5e2c2646b7b324f0f8eb60b718a4b4504fedc3e1e6dc",
    repeatRawRgbSequenceSha256: "ba880b6547ca40e638a24630031711ff2dba5f243c4df47182c0789870d205a3" },
  { orientation: "player-back", stockpiles: 3,
    scenario: "tools/battle-lab/mechanic-spit-up-player-swalot-three-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-player-3-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-player-3-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-player-3.json",
    repeatDenseJsonSha256: "cd34f3227310b564ac2675f3cb9e5e5bd5157fbac5572ddce827884a577a9b7d",
    repeatRawRgbSequenceSha256: "74da95c2299b8257cc7baaa0cda670c948964ef3f2c6c18a3bd91d1fc96af568" },
  { orientation: "opponent-front", stockpiles: 1,
    scenario: "tools/battle-lab/mechanic-spit-up-opponent-swalot-one-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-opponent-1-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-opponent-1-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-opponent-1.json",
    repeatDenseJsonSha256: "1f91a9b4471430c33a08bcc10a2a274fe7a5bf251ed389146c7f455a43a6f4ec",
    repeatRawRgbSequenceSha256: "7c482a1af6b67a1fc015d44869eeac842544788cd1e5975bbfef97fb6cfdde3d" },
  { orientation: "opponent-front", stockpiles: 2,
    scenario: "tools/battle-lab/mechanic-spit-up-opponent-swalot-two-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-opponent-2-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-opponent-2-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-opponent-2.json",
    repeatDenseJsonSha256: "25b78d49ad34157befdfc580259a4c354082b05b9c8b257d9f7aaa48e689bd7b",
    repeatRawRgbSequenceSha256: "dc21849ba4d7a34f6f1e3954957454cdad8f524ab3229690b70bdd69542c3dd4" },
  { orientation: "opponent-front", stockpiles: 3,
    scenario: "tools/battle-lab/mechanic-spit-up-opponent-swalot-three-stockpile.json",
    denseState: "tools/compare/evidence/spit-up-opponent-3-dense.json.gz",
    rawRgbArchive: "tools/compare/evidence/spit-up-opponent-3-rgb.tar.gz",
    changeMap: "tools/compare/evidence/spit-up-changemap-opponent-3.json",
    repeatDenseJsonSha256: "634b5c1b69f534bb6cf3e0f9ad866a0b00b0c225bf6b5d3948678ff116064faf",
    repeatRawRgbSequenceSha256: "c1d00c0b1acb3885c6eddf936e3298bbdb1cf7770210778d6d682020e7afcf77" },
] as const;

const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const same = (left: unknown, right: unknown): boolean => stable(left) === stable(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rawFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const directory = mkdtempSync(join(tmpdir(), "pokebench-spit-up-rgb-"));
  execFileSync("tar", ["-xzf", archive, "-C", directory]);
  return rows.map((row) => readFileSync(resolve(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0;
  let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function bankChanges(rows: readonly Json[], key: string): Json {
  const values = rows.map((row) => row[key]);
  const hashes = values.map((value) => sha(stable(value)));
  const transitions = hashes.flatMap((hash, age) => age === 0 || hash !== hashes[age - 1] ? [age] : []);
  const changedEntries = values.map((value, age) => {
    if (age === 0) return [];
    const previous = values[age - 1];
    if (Array.isArray(value) && Array.isArray(previous)) {
      return value.flatMap((entry: unknown, index: number) => same(entry, previous[index]) ? [] : [index]);
    }
    return same(value, previous) ? [] : [0];
  });
  return { transitions, hashes, changedEntries };
}

function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => [
    "gSpitUpOrbSpriteTemplate", "gFlashingHitSplatSpriteTemplate",
  ].includes(sprite.template));
}

function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((task: Json) => [
    "AnimTask_SpitUpDeformMon", "AnimTask_ShakeMon2_Step",
    "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
  ].includes(task.function));
}

function starts(rows: readonly Json[], predicate: (value: Json) => boolean): number {
  let count = 0; let previous = false;
  for (const row of rows) {
    const current = predicate(row);
    if (current && !previous) count += 1;
    previous = current;
  }
  return count;
}

function spriteStarts(rows: readonly Json[], template: string): number {
  let count = 0;
  let previous = new Set<number>();
  for (const row of rows) {
    const current = new Set<number>(row.sprites
      .filter((sprite: Json) => sprite.template === template)
      .map((sprite: Json) => sprite.slot));
    for (const slot of current) if (!previous.has(slot)) count += 1;
    previous = current;
  }
  return count;
}

function spriteLives(rows: readonly Json[], template: string): Json[] {
  const open = new Map<number, Json>();
  const lives: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(row.sprites
      .filter((sprite: Json) => sprite.template === template)
      .map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      if (!open.has(slot)) {
        const life = { slot, start: age, end: age, first: sprite, last: sprite };
        open.set(slot, life); lives.push(life);
      }
      const life = open.get(slot)!;
      life.end = age; life.last = sprite;
    }
    for (const slot of open.keys()) if (!current.has(slot)) open.delete(slot);
  }
  return lives;
}

function taskAges(rows: readonly Json[], functionName: string): number[] {
  return rows.flatMap((row, age) => row.tasks.some((task: Json) => task.function === functionName) ? [age] : []);
}

function verifyBranch(branch: Branch): Json {
  const densePath = resolve(root, branch.denseState);
  const archivePath = resolve(root, branch.rawRgbArchive);
  invariant(existsSync(densePath) && existsSync(archivePath), `${branch.orientation}/${branch.stockpiles}: missing evidence archive`);
  const denseJson = gunzipSync(readFileSync(densePath));
  const probe = JSON.parse(denseJson.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const rgb = rawFrames(archivePath, rows);
  const attacker = branch.orientation === "player-back" ? 0 : 1;
  const target = 1 - attacker;
  const expectedOrbs = branch.stockpiles * 4 + 4;
  invariant(probe.schema === "spit-up-dense-evidence/v1" && probe.oracleProfile === "battle-scene-on",
    `${branch.orientation}/${branch.stockpiles}: probe identity drift`);
  invariant(probe.branch.stockpiles === branch.stockpiles && probe.branch.animTurn === branch.stockpiles
    && probe.branch.attackerBattler === attacker && probe.branch.targetBattler === target
    && rows.length === probe.sourceWindow.frameCount && rows.length === probe.sourceWindow.sourceFrameCount,
  `${branch.orientation}/${branch.stockpiles}: branch/source window drift`);
  invariant(rows.every((row, age) => row.frame === probe.sourceWindow.startFrame + age
    && row.currentMove === 255 && row.scriptOwner === "Move_SPIT_UP"
    && row.scriptPtr >= probe.sourcePointerContract.start && row.scriptPtr < probe.sourcePointerContract.endExclusive
    && row.scriptOffset !== null && row.scriptPtrParity === (row.scriptPtr & 1)
    && row.attackerBattler === attacker && row.targetBattler === target),
  `${branch.orientation}/${branch.stockpiles}: pointer/topology ownership drift`);
  invariant(rgb.length === rows.length && rgb.every((frame, age) => frame.length === 240 * 160 * 3
    && sha(frame) === rows[age].sha256), `${branch.orientation}/${branch.stockpiles}: raw RGB drift`);
  invariant(sha(Buffer.concat(rgb)) === probe.sourceWindow.rgbSequenceSha256
    && probe.sourceWindow.rgbSequenceSha256 === branch.repeatRawRgbSequenceSha256,
  `${branch.orientation}/${branch.stockpiles}: twice-fresh RGB identity drift`);

  const templates = [...new Set(rows.flatMap((row) => row.sprites.map((sprite: Json) => sprite.template)))].sort();
  const callbacks = [...new Set(rows.flatMap((row) => row.sprites.map((sprite: Json) => sprite.callback)))].sort();
  const tasks = [...new Set(rows.flatMap((row) => row.tasks.map((task: Json) => task.function)))].sort();
  invariant(templates.includes("gSpitUpOrbSpriteTemplate") && templates.includes("gFlashingHitSplatSpriteTemplate")
    && callbacks.includes("AnimSpitUpOrb_Step") && callbacks.includes("AnimFlashingHitSplat_Step")
    && tasks.includes("AnimTask_SpitUpDeformMon")
    && tasks.includes("AnimTask_ShakeMon2_Step")
    && tasks.includes("AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"),
  `${branch.orientation}/${branch.stockpiles}: source-owned topology drift`);
  const lifecycle = {
    redOrb: spriteStarts(rows, "gSpitUpOrbSpriteTemplate"),
    impact: spriteStarts(rows, "gFlashingHitSplatSpriteTemplate"),
    deform: starts(rows, (row) => row.tasks.some((task: Json) => task.function === "AnimTask_SpitUpDeformMon")),
    attackerShake: starts(rows, (row) => row.tasks.some((task: Json) => task.function === "AnimTask_ShakeMon2_Step")),
    targetPowerShake: starts(rows, (row) => row.tasks.some((task: Json) => task.function === "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step")),
  };
  invariant(same(lifecycle, { redOrb: expectedOrbs, impact: 2, deform: 1, attackerShake: 1, targetPowerShake: 1 }),
    `${branch.orientation}/${branch.stockpiles}: lifecycle drift`);
  const orbLives = spriteLives(rows, "gSpitUpOrbSpriteTemplate");
  const impactLives = spriteLives(rows, "gFlashingHitSplatSpriteTemplate");
  invariant(orbLives.length === expectedOrbs && impactLives.length === 2,
    `${branch.orientation}/${branch.stockpiles}: owned sprite lifetime drift`);
  const tagPresence = {
    redOrb: { paletteFrames: rows.filter((row) => row.paletteTags.includes(10237)).length,
      tileFrames: rows.filter((row) => row.tileTags.includes(10237)).length,
      absentAfterCleanup: !rows.at(-1).paletteTags.includes(10237) && !rows.at(-1).tileTags.includes(10237) },
    impact: { paletteFrames: rows.filter((row) => row.paletteTags.includes(10135)).length,
      tileFrames: rows.filter((row) => row.tileTags.includes(10135)).length,
      absentAfterCleanup: !rows.at(-1).paletteTags.includes(10135) && !rows.at(-1).tileTags.includes(10135) },
  };
  invariant(tagPresence.redOrb.paletteFrames > 0 && tagPresence.redOrb.tileFrames > 0
    && tagPresence.impact.paletteFrames > 0 && tagPresence.impact.tileFrames > 0
    && tagPresence.redOrb.absentAfterCleanup && tagPresence.impact.absentAfterCleanup,
  `${branch.orientation}/${branch.stockpiles}: resource lifecycle drift`);

  const stableState = {
    partiesStable: rows.every((row) => same(row.parties, rows[0].parties)),
    battlersStable: rows.every((row) => same(row.battlers, rows[0].battlers)),
    engineStable: rows.every((row) => same(row.engineState, rows[0].engineState)),
    immutableStable: rows.every((row) => same(row.immutableState, rows[0].immutableState)),
    gameplayRngStable: rows.every((row) => row.gameplayRng === rows[0].gameplayRng),
    animationRngTransitions: rows.slice(1).filter((row, age) => row.animationRng !== rows[age].animationRng).length,
  };
  invariant(stableState.partiesStable && stableState.battlersStable && stableState.engineStable
    && stableState.immutableStable && stableState.gameplayRngStable
    && stableState.animationRngTransitions > 0,
  `${branch.orientation}/${branch.stockpiles}: opaque/RNG state drift`);
  const cleanup = {
    age: rows.length - 1,
    active: rows.at(-1).active,
    visualTasks: rows.at(-1).visualTaskCount,
    soundTasks: rows.at(-1).soundTaskCount,
    ownedSprites: ownedSprites(rows.at(-1)).length,
    ownedTasks: ownedTasks(rows.at(-1)).length,
    redOrbTagged: rows.at(-1).paletteTags.includes(10237) || rows.at(-1).tileTags.includes(10237),
    impactTagged: rows.at(-1).paletteTags.includes(10135) || rows.at(-1).tileTags.includes(10135),
  };
  invariant(!cleanup.active && cleanup.visualTasks === 0 && cleanup.soundTasks === 0
    && cleanup.ownedSprites === 0 && cleanup.ownedTasks === 0 && !cleanup.redOrbTagged && !cleanup.impactTagged,
  `${branch.orientation}/${branch.stockpiles}: cleanup drift`);
  const bankKeys = [
    "softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices", "fadedPalette",
    "unfadedPalette", "hardwarePalette", "paletteTags", "tileTags", "allocators", "registers",
    "audio", "se1", "se2", "tasks", "sprites", "engineState", "immutableState",
  ];
  const map = {
    schema: "spit-up-normalized-change-map/v1",
    orientation: branch.orientation,
    stockpiles: branch.stockpiles,
    sourceWindow: probe.sourceWindow,
    sourcePointerContract: probe.sourcePointerContract,
    rows: rows.map((row, age) => ({ age, frame: row.frame, sha256: row.sha256, scriptPtr: row.scriptPtr,
      scriptOffset: row.scriptOffset, active: row.active, rgb: changedPixels(rgb[age - 1], rgb[age]) })),
    banks: Object.fromEntries(bankKeys.map((key) => [key, bankChanges(rows, key)])),
    resources: { tags: tagPresence, templates, callbacks, tasks },
    lifecycle,
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age].softwareOam)).length}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age].fadedPalette)).length}/${rows.length - 1}`,
      hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age].softwareMatrices)).length}/${rows.length - 1}`,
      affineMatrixSpecialCase: "measured per sprite/task; no generic affine lag assumed",
      redOrbLives: orbLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end,
        matrixNum: life.first.matrixNum, sourceMatrix: life.first.matrix,
        sourceOam: life.first.raw,
        hardwareOamAtBirthEqualsSource: same(rows[life.start].hardwareOam[life.slot], rows[life.start].softwareOam[life.slot]),
        hardwareOamAtBirthPlusOneEqualsSource: life.start + 1 < rows.length
          && same(rows[life.start + 1].hardwareOam[life.slot], rows[life.start].softwareOam[life.slot]),
      })),
      impactLives: impactLives.map((life) => ({ slot: life.slot, start: life.start, end: life.end })),
      taskAges: {
        deform: taskAges(rows, "AnimTask_SpitUpDeformMon"),
        attackerShake: taskAges(rows, "AnimTask_ShakeMon2_Step"),
        targetPowerShake: taskAges(rows, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"),
      },
    },
    state: stableState,
    cleanup,
  };
  const mapBytes = `${JSON.stringify(map, null, 2)}\n`;
  writeFileSync(resolve(root, branch.changeMap), mapBytes);
  return {
    orientation: branch.orientation,
    stockpiles: branch.stockpiles,
    scenario: branch.scenario,
    scenarioSha256: sha(readFileSync(resolve(root, branch.scenario))),
    denseState: branch.denseState,
    denseArchiveSha256: sha(readFileSync(densePath)),
    denseJsonSha256: sha(denseJson),
    rawRgbArchive: branch.rawRgbArchive,
    rawArchiveSha256: sha(readFileSync(archivePath)),
    rawRgbSequenceSha256: probe.sourceWindow.rgbSequenceSha256,
    repeatDenseJsonSha256: branch.repeatDenseJsonSha256 || sha(denseJson),
    repeatRawRgbSequenceSha256: branch.repeatRawRgbSequenceSha256,
    twiceFreshByteIdentity: true,
    changeMap: branch.changeMap,
    changeMapSha256: sha(mapBytes),
    sourceWindow: probe.sourceWindow,
    branch: probe.branch,
    lifecycleCounts: probe.lifecycleCounts,
    tagPresence,
    stableState,
    cleanup,
  };
}

export function verifySpitUpEvidence(): Json {
  const results = branches.map(verifyBranch);
  const matrix = {
    schema: "spit-up-natural-evidence-matrix/v1",
    oracleProfile: "battle-scene-on",
    status: "unsupported-evidence-checkpoint",
    coverageCredit: false,
    branches: results,
  };
  const matrixBytes = `${JSON.stringify(matrix, null, 2)}\n`;
  writeFileSync(resolve(root, "tools/compare/fixtures/spit-up-evidence-matrix.json"), matrixBytes);
  const fixture = {
    schema: "spit-up-evidence-checkpoint/v1",
    oracleProfile: "battle-scene-on",
    move: "MOVE_SPIT_UP",
    status: "unsupported",
    coverageCredit: false,
    sourceAudit: "tools/compare/spitUpSourceAudit.ts",
    graphComponents: 10,
    novelTrackComponents: ["asset:ANIM_TAG_RED_ORB_2", "sprite:gSpitUpOrbSpriteTemplate",
      "subroutine:SpitUpContinue", "subroutine:SpitUpStrong", "subroutine:SpitUpStrongest",
      "task:AnimTask_SpitUpDeformMon"],
    representatives: ["MOVE_SPIT_UP"],
    controlsOnly: ["MOVE_STOCKPILE", "MOVE_SWALLOW", "MOVE_FLAIL", "MOVE_RAPID_SPIN", "MOVE_ENDEAVOR", "MOVE_HORN_DRILL"],
    noProductionClaim: true,
    branches: results.map((result) => ({
      orientation: result.orientation, stockpiles: result.stockpiles, changeMap: result.changeMap,
      changeMapSha256: result.changeMapSha256, sourceWindow: result.sourceWindow,
      rawRgbSequenceSha256: result.rawRgbSequenceSha256,
      repeatRawRgbSequenceSha256: result.repeatRawRgbSequenceSha256,
      twiceFreshByteIdentity: result.twiceFreshByteIdentity,
    })),
  };
  writeFileSync(resolve(root, "tools/compare/fixtures/spit-up-evidence.json"), `${JSON.stringify(fixture, null, 2)}\n`);
  return matrix;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(verifySpitUpEvidence(), null, 2));
