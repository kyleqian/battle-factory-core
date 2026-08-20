/** Verify the pure Rain Dance reducer and typed seam against retained Scene-ON state. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  rainDanceAtAge,
  type RainDanceProfile,
} from "../../src/animation/rainDance.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRainDanceView,
  type SceneOnRainDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/rain-dance-evidence.json", "utf8",
)) as Json;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const fail = (message: string): never => { throw new Error(message); };

function battler(side: "player" | "opponent") {
  return {
    species: "ONIX" as const,
    geometry: {
      side,
      spriteCorner: { x: 0, y: 0 },
      animationCenter: { x: 0, y: 0 },
      battlePositionCenter: { x: 0, y: 0 },
    },
  } as const;
}

function profileFor(rows: Json[]): RainDanceProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    occupiedSpriteSlots: rows[0]!.sprites.map((sprite: Json) => sprite.slot),
    unfadedPaletteBeforeLoad: rows[0]!.unfadedPalette,
    fadedPaletteBeforeLoad: rows[0]!.fadedPalette,
    hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    unfadedPaletteAfterLoad: rows[1]!.unfadedPalette,
    fadedPaletteAfterLoad: rows[1]!.fadedPalette,
  };
}

function assertRow(orientation: Orientation, row: Json, reduced: ReturnType<typeof rainDanceAtAge>): void {
  const age = reduced.age;
  const prefix = `${orientation} age ${age}`;
  if (!same(
    [row.scriptOwner, row.scriptOffset, row.scriptWait, row.animScriptActive],
    [reduced.source.owner, reduced.source.offset, reduced.source.wait, reduced.active],
  )) fail(`${prefix}: source cursor drift`);
  if (row.animationRng !== reduced.animationRng) fail(`${prefix}: animation RNG drift`);

  const actualTasks = row.tasks
    .filter((task: Json) => ["AnimTask_CreateRaindrops", "AnimTask_BlendSpriteColor_Step2"].includes(task.func?.symbol))
    .map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }));
  if (!same(actualTasks, reduced.tasks)) fail(`${prefix}: task lifecycle/data drift`);

  const actualDrops = row.rainDrops.map((drop: Json) => ({
    slot: drop.slot,
    template: drop.template.symbol,
    callback: drop.callback.symbol,
    x: drop.x,
    y: drop.y,
    x2: drop.x2,
    y2: drop.y2,
    animNum: drop.animNum,
    animCmdIndex: drop.animCmdIndex,
    animDelayCounter: drop.animDelayCounter,
    subpriority: drop.subpriority,
    invisible: drop.invisible,
    matrix: drop.matrix,
    data: drop.data,
    attr: drop.attr,
  }));
  const expectedDrops = reduced.drops.map((drop) => ({
    slot: drop.slot,
    template: drop.template,
    callback: drop.callback,
    x: drop.x,
    y: drop.y,
    x2: drop.x2,
    y2: drop.y2,
    animNum: drop.animNum,
    animCmdIndex: drop.animCmdIndex,
    animDelayCounter: drop.animDelayCounter,
    subpriority: drop.subpriority,
    invisible: drop.invisible,
    matrix: drop.matrix,
    data: drop.data,
    attr: drop.attr,
  }));
  if (!same(actualDrops, expectedDrops)) fail(`${prefix}: rain-drop state drift`);

  if (reduced.oam.transferLagRows !== 1) fail(`${prefix}: OAM transfer contract drift`);
  if (!same(row.softwareMatrices, reduced.matrices.software)
    || !same(row.hardwareMatrices, reduced.matrices.hardware)) fail(`${prefix}: affine matrix drift`);
  if (!same(row.unfadedPalette, reduced.palette.unfaded)
    || !same(row.fadedPalette, reduced.palette.faded)
    || !same(row.hardwarePalette, reduced.palette.hardware)) fail(`${prefix}: palette buffer drift`);

  const resourceLoaded = row.tileTags.includes(10115) && row.paletteTags.includes(10115);
  if (resourceLoaded !== reduced.resources.loaded
    || !same(reduced.resources.tileTags, resourceLoaded ? [10115] : [])
    || !same(reduced.resources.paletteTags, resourceLoaded ? [10115] : [])) fail(`${prefix}: resource lifetime drift`);
  const actualAudioActive = row.audio.SE1.songHeaderIdentity.symbol === "se_m_rain_dance"
    && (row.audio.SE1.status & 0x80000000) === 0;
  if (actualAudioActive !== reduced.audio.active) fail(`${prefix}: audio lifetime drift`);
  if (row.visualTaskCount !== reduced.visualTaskCount || row.soundTaskCount !== reduced.soundTaskCount) {
    fail(`${prefix}: visual/sound task count drift`);
  }
}

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const probe = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const profile = profileFor(rows);
  const playerAttacker = orientation === "player-back";
  const config: SceneOnRainDanceConfig = {
    move: "RAIN_DANCE",
    attacker: battler(playerAttacker ? "player" : "opponent"),
    target: battler(playerAttacker ? "opponent" : "player"),
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: profile,
  };
  const stage = createSceneOnMovePresentation(config);
  let reducerRows = 0;
  let seamRows = 0;
  let creates = 0;
  let destroys = 0;
  let prior = new Set<number>();
  let peak = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const reduced = rainDanceAtAge(age, profile);
    assertRow(orientation, rows[age]!, reduced);
    if (age > 0 && !same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) {
      fail(`${orientation} age ${age}: preceding software OAM transfer drift`);
    }
    reducerRows += 1;
    const view = sceneOnRainDanceView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = view;
    if (!same(reduced, seamState)) fail(`${orientation} age ${age}: typed seam drift`);
    seamRows += 1;
    const current = new Set(reduced.drops.map((drop) => drop.slot));
    creates += [...current].filter((slot) => !prior.has(slot)).length;
    destroys += [...prior].filter((slot) => !current.has(slot)).length;
    peak = Math.max(peak, current.size);
    prior = current;
  }
  result[orientation] = {
    reducerRows,
    seamRows,
    lifecycle: { creates, destroys, peak },
    paletteEdges: rows.map((row, age) => age > 0 && !same(row.fadedPalette, rows[age - 1]!.fadedPalette) ? age : -1).filter((age) => age >= 0),
    cleanup: { age: 186, active: false, visualTasks: 0, soundTasks: 0, drops: 0 },
  };
}

console.log(JSON.stringify(result, null, 2));
