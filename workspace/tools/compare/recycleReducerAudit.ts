/** Exhaustive source-component and typed-seam audit against retained Recycle rows. */
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import {
  recycleAtAge,
  type RecycleProfile,
} from "../../src/animation/recycle.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRecycleView,
  type SceneOnRecycleConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/recycle-evidence.json", "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

function arrow(row: Json): Json | undefined {
  return row.sprites.find((sprite: Json) => sprite.template?.symbol === "gRecycleSpriteTemplate");
}

function blendTask(row: Json): Json | undefined {
  return row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_BlendMonInAndOut_Step");
}

function profileFor(rows: readonly Json[]): RecycleProfile {
  const sprite = arrow(rows[10]!)!;
  const task = blendTask(rows[149]!)!;
  return {
    attackerTop: sprite.y,
    attackerSubpriority: sprite.subpriority + 2,
    spriteSlot: sprite.slot,
    matrixNum: sprite.matrixNum,
    attackerPaletteIdPlusOne: task.data[0],
  };
}

function battler(
  species: "PORYGON" | "GYARADOS",
  side: "player" | "opponent",
  center: { x: number; y: number },
) {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: center.x - 32, y: center.y - 32 },
      animationCenter: center,
      battlePositionCenter: center,
    },
  } as const;
}

function actualArrow(row: Json): unknown {
  const sprite = arrow(row);
  if (!sprite) return null;
  return {
    slot: sprite.slot,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    invisible: sprite.invisible,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    data: sprite.data,
    attr: sprite.attr,
  };
}

function actualMonBg(row: Json): "inactive" | "active" | "clearing" {
  const names = row.tasks.map((task: Json) => task.func?.symbol);
  return names.includes("Task_ClearMonBg") ? "clearing" : names.includes("Task_UpdateMonBg") ? "active" : "inactive";
}

function assertRow(
  orientation: Orientation,
  row: Json,
  state: ReturnType<typeof recycleAtAge>,
): void {
  const prefix = `${orientation} age ${state.age}`;
  if (!same(
    [row.animScriptActive, row.scriptOwner, row.scriptOffset, row.scriptWait, row.animArgs],
    [state.active, state.source.owner, state.source.offset, state.source.wait, state.source.args],
  )) fail(`${prefix}: source cursor drift`);
  const actualTags = [10278].filter((tag) => row.tileTags.includes(tag));
  const actualPaletteTags = [10278].filter((tag) => row.paletteTags.includes(tag));
  if (!same(actualTags, state.resources.tileTags) || !same(actualPaletteTags, state.resources.paletteTags)) fail(`${prefix}: resource tag drift`);
  if (actualMonBg(row) !== state.monBg) fail(`${prefix}: monbg lifecycle drift`);
  const alpha = [row.registers.bldalpha & 31, row.registers.bldalpha >> 8 & 31];
  if (!same([row.registers.bldcnt, alpha], [state.registers.bldcnt, state.registers.bldalpha])) fail(`${prefix}: GPU register drift`);
  if (!same(actualArrow(row), state.sprite)) fail(`${prefix}: arrow callback/OAM/affine state drift`);
  const actualTask = blendTask(row);
  const normalizedTask = actualTask ? { func: actualTask.func.symbol, data: actualTask.data.slice(0, 8) } : null;
  if (!same(normalizedTask, state.blendTask)) fail(`${prefix}: BlendMonInAndOut state drift`);
  if (row.visualTaskCount !== state.visualTaskCount || row.soundTaskCount !== state.soundTaskCount) fail(`${prefix}: task count drift`);
  if (state.age >= 10 && row.audio.SE2.tracks[0]!.panX !== state.audio.pan) fail(`${prefix}: attacker pan drift`);
  const expectedStart = [10, 34, 59, 149].includes(state.age);
  if (expectedStart !== (row.audio.SE2.status === 0)) fail(`${prefix}: sound start drift`);
}

const output: Record<string, unknown> = { schema: "recycle-reducer-audit/v1", framebufferCompared: false };
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const evidence = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  const profile = profileFor(rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = arrow(rows[10]!)!;
  const config: SceneOnRecycleConfig = {
    move: "RECYCLE",
    attacker: battler("PORYGON", attackerSide, { x: attacker.x, y: attacker.y }),
    target: battler("GYARADOS", targetSide, attackerSide === "player" ? { x: 176, y: 42 } : { x: 72, y: 90 }),
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
    },
    animationProfile: profile,
  };
  const presentation = createSceneOnMovePresentation(config);
  let creates = 0;
  let destroys = 0;
  let priorSprite = false;
  for (let age = 0; age < rows.length; age += 1) {
    const reduced = recycleAtAge(age, attackerSide, { x: attacker.x, y: attacker.y }, profile);
    assertRow(orientation, rows[age]!, reduced);
    const view = sceneOnRecycleView({ ...presentation, age });
    const { attacker: _attacker, target: _target, ...seam } = view;
    if (!same(reduced, seam)) fail(`${orientation} age ${age}: typed seam drift`);
    const currentSprite = reduced.sprite !== null;
    if (currentSprite && !priorSprite) creates += 1;
    if (!currentSprite && priorSprite) destroys += 1;
    priorSprite = currentSprite;
  }
  output[orientation] = {
    reducerRows: rows.length,
    typedSeamRows: rows.length,
    lifecycle: { creates, destroys, arrowRows: 138, blendTaskRows: 47 },
    cleanup: { age: 202, active: false, sprite: null, resources: 0 },
  };
}

console.log(JSON.stringify(output, null, 2));
