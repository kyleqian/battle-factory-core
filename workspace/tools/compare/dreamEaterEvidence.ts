/** Fail-closed reducer for the evidence-only MOVE_DREAM_EATER Scene-ON maps. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Row = Record<string, any>;
type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = process.cwd();
const fixturePath = "tools/compare/fixtures/dream-eater-evidence.json";
const paths: Record<Side, { dense: string; rgb: string; map: string }> = {
  "player-back": {
    dense: "tools/compare/evidence/dream-eater-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/dream-eater-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dream-eater-changemap-player.json",
  },
  "opponent-front": {
    dense: "tools/compare/evidence/dream-eater-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/dream-eater-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dream-eater-changemap-opponent.json",
  },
};
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const transitionAges = (rows: Row[], select: (row: Row) => unknown): number[] =>
  rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
const starts = (rows: Row[], select: (row: Row) => boolean): number[] =>
  rows.flatMap((row, age) => select(row) && (!age || !select(rows[age - 1]!)) ? [age] : []);

function runs(rows: Row[], select: (row: Row) => unknown): Array<[number, number, unknown]> {
  const result: Array<[number, number, unknown]> = [];
  for (let start = 0; start < rows.length;) {
    let end = start;
    while (end + 1 < rows.length && same(select(rows[end + 1]!), select(rows[start]!))) end += 1;
    result.push([start, end, select(rows[start]!)]);
    start = end + 1;
  }
  return result;
}

function rawRgb(archive: string, rows: Row[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((member) => member.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  if (members.length !== rows.length || bytes.length !== rows.length * size) throw new Error(`${archive}: RGB member count/size`);
  const byName = new Map(members.map((member, index) => [member,
    bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => byName.get(`./${String(row.frame).padStart(5, "0")}.rgb`)!);
}

function changeRows(rows: Row[], rgb: Buffer[]): Row[] {
  return rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset]
        && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1]
        && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      age, scriptOwner: row.scriptOwner, scriptOwnerOffset: row.scriptOwnerOffset,
      animScriptActive: row.animScriptActive, sha256: row.sha256, changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
    };
  });
}

function derive(side: Side, probe: Json, rgb: Buffer[]): Json {
  const rows = probe.frames as Row[];
  const target = rows[0]!.animationBattlers.target as number;
  const targetSlot = rows[0]!.animationBattlers.spriteIds[target] as number;
  const targetSprite = (row: Row): Row => row.sprites.find((sprite: Row) => sprite.slot === targetSlot)!;
  let oamPrior = 0, palettePrior = 0, targetMatrixPrior = 0, targetMatrixTwoBack = 0, backgroundPrior = 0;
  const bank = side === "player-back" ? 1 : 2;
  const signed9 = (value: number): number => value >= 0x100 ? value - 0x200 : value;
  for (let age = 1; age < rows.length; age += 1) {
    if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) oamPrior += 1;
    if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) palettePrior += 1;
    if (same(targetSprite(rows[age]!).hardwareMatrix, targetSprite(rows[age - 1]!).matrix)) targetMatrixPrior += 1;
    if (age > 1 && same(targetSprite(rows[age]!).hardwareMatrix, targetSprite(rows[age - 2]!).matrix)) targetMatrixTwoBack += 1;
    if (signed9(rows[age]!.registers[`bg${bank}hofs`]) === rows[age - 1]!.backgroundPositions[`gBattle_BG${bank}_X`]
      && signed9(rows[age]!.registers[`bg${bank}vofs`]) === rows[age - 1]!.backgroundPositions[`gBattle_BG${bank}_Y`]) backgroundPrior += 1;
  }
  const taskNames = ["Task_UpdateMonBg", "Task_FadeToBg", "SetPsychicBackground_Step",
    "AnimTask_ShakeMon_Step", "AnimTask_ScaleMonAndRestore_Step", "Task_ClearMonBg"];
  const spriteCreates = (template: string): number[] => rows.flatMap((row, age) => {
    const previous = age ? rows[age - 1]!.sprites : [];
    return row.sprites.flatMap((sprite: Row) => sprite.template.symbol === template
      && !previous.some((prior: Row) => prior.slot === sprite.slot && prior.template.symbol === template) ? [age] : []);
  });
  const sourceSortAge = 99;
  const sourceOrbs = rows[sourceSortAge]!.sprites.filter((sprite: Row) => sprite.template.symbol === "gAbsorptionOrbSpriteTemplate");
  const orbSlots = new Set(sourceOrbs.map((sprite: Row) => sprite.slot));
  const sortedOrbSlots = rows[sourceSortAge]!.spriteOrder.filter((slot: number) => orbSlots.has(slot));
  const bySlot = new Map(sourceOrbs.map((sprite: Row) => [sprite.slot, sprite]));
  const audio = rows.flatMap((row, age) => age && row.se1.status === 0 && rows[age - 1]!.se1.status !== 0
    ? [{ age, identity: row.se1.songHeaderIdentity.symbol, panX: row.se1.tracks.map((track: Row) => track.panX) }]
    : []);
  return {
    schema: "dream-eater-normalized-change-map/v1", side,
    sourceWindow: probe.sourceWindow,
    pointerOwners: runs(rows, (row) => row.scriptOwner),
    pointerOffsets: runs(rows, (row) => [row.scriptOwner, row.scriptOwnerOffset]),
    taskRuns: Object.fromEntries(taskNames.map((name) => [name,
      runs(rows, (row) => row.tasks.some((task: Row) => task.func.symbol === name)).filter((run) => run[2]),
    ])),
    spriteCreates: {
      absorptionOrbs: spriteCreates("gAbsorptionOrbSpriteTemplate"),
      healingBlueStars: spriteCreates("gHealingBlueStarSpriteTemplate"),
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${oamPrior}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${palettePrior}/${rows.length - 1}`,
      targetMatrixEqualsPrecedingSource: `${targetMatrixPrior}/${rows.length - 1}`,
      targetMatrixEqualsTwoBackSource: `${targetMatrixTwoBack}/${rows.length - 2}`,
      activeBackgroundOffsetsEqualPrecedingSource: `${backgroundPrior}/${rows.length - 1}`,
      targetX2SourceChanges: transitionAges(rows, (row) => targetSprite(row).x2),
      targetY2SourceChanges: transitionAges(rows, (row) => targetSprite(row).y2),
      targetMatrixSourceChanges: transitionAges(rows, (row) => targetSprite(row).matrix),
      targetMatrixHardwareChanges: transitionAges(rows, (row) => targetSprite(row).hardwareMatrix),
      fadedPaletteChanges: transitionAges(rows, (row) => row.fadedPalette),
      hardwarePaletteChanges: transitionAges(rows, (row) => row.hardwarePalette),
      initialShadow: (() => {
        const shadow = rows[0]!.sprites.find((sprite: Row) => sprite.template.symbol === "gSpriteTemplate_EnemyShadow")!;
        return { slot: shadow.slot, callback: shadow.callback.symbol, invisible: shadow.invisible,
          firstComparableWholeOamAge: 1, row1EqualsRow0Software: same(rows[1]!.hardwareOam, rows[0]!.softwareOam) };
      })(),
      sortWitness: {
        sourceAge: sourceSortAge, hardwareDisplayAge: sourceSortAge + 1,
        slots: sortedOrbSlots,
        y: sortedOrbSlots.map((slot: number) => bySlot.get(slot)!.y + bySlot.get(slot)!.y2),
        allEqualSubpriority: new Set(sourceOrbs.map((sprite: Row) => sprite.subpriority)).size === 1,
        allSemiTransparent: sourceOrbs.every((sprite: Row) => (sprite.attr[0] & 0xC00) === 0x400),
        hardwareEqualsSourceSoftware: same(rows[sourceSortAge + 1]!.hardwareOam, rows[sourceSortAge]!.softwareOam),
      },
    },
    gpuTransitions: Object.fromEntries(["bldcnt", "bldalpha", "bldy", `bg${bank}hofs`, `bg${bank}vofs`]
      .map((name) => [name, transitionAges(rows, (row) => row.registers[name])])),
    audio,
    cleanup: {
      age: rows.length - 1, pointer: rows.at(-1)!.scriptPtr,
      owner: rows.at(-1)!.scriptOwner, ownerOffset: rows.at(-1)!.scriptOwnerOffset,
      active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount,
      soundTasks: rows.at(-1)!.soundTaskCount,
      absorptionOrbs: rows.at(-1)!.sprites.filter((sprite: Row) => sprite.template.symbol === "gAbsorptionOrbSpriteTemplate").length,
      healingBlueStars: rows.at(-1)!.sprites.filter((sprite: Row) => sprite.template.symbol === "gHealingBlueStarSpriteTemplate").length,
    },
    rows: changeRows(rows, rgb),
  };
}

const write = process.argv.includes("--write-maps");
const summaries: Record<string, Json> = {};
for (const side of Object.keys(paths) as Side[]) {
  const path = paths[side];
  const decoded = gunzipSync(readFileSync(path.dense));
  const probe = JSON.parse(decoded.toString("utf8")) as Json;
  const rgb = rawRgb(path.rgb, probe.frames);
  probe.frames.forEach((row: Row, age: number) => {
    if (sha(rgb[age]!) !== row.sha256) throw new Error(`${side} age ${age}: raw RGB hash`);
  });
  const map = derive(side, probe, rgb);
  const serialized = JSON.stringify(map, null, 2) + "\n";
  if (write) writeFileSync(path.map, serialized);
  else if (serialized !== readFileSync(path.map, "utf8")) throw new Error(`${side}: change-map drift`);
  summaries[side] = {
    probeJsonSha256: sha(decoded), rawRgbSequenceSha256: sha(Buffer.concat(rgb)),
    changeMapSha256: sha(Buffer.from(serialized)), frameCount: probe.frames.length,
  };
}
if (!write) {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
  for (const side of Object.keys(paths) as Side[]) {
    const expected = fixture.orientations[side];
    if (!same(summaries[side], {
      probeJsonSha256: expected.probeJsonSha256, rawRgbSequenceSha256: expected.rawRgbSequenceSha256,
      changeMapSha256: expected.changeMapSha256, frameCount: expected.sourceWindow.frameCount,
    })) throw new Error(`${side}: receipt summary drift`);
    for (const [path, digest] of [[paths[side].dense, expected.denseStateSha256],
      [paths[side].rgb, expected.rawRgbArchiveSha256], [paths[side].map, expected.changeMapSha256]]) {
      if (sha(readFileSync(path)) !== digest) throw new Error(`${side}: pinned ${path}`);
    }
  }
}
console.log(JSON.stringify(summaries));
