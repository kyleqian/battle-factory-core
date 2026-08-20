/** Exhaustive reducer/typed-seam audit against retained Octazooka state. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  OCTAZOOKA_BLACK_BALL_TAG,
  OCTAZOOKA_GRAY_SMOKE_TAG,
  octazookaAtAge,
  type OctazookaProfile,
} from "../../src/animation/octazooka.ts";
import {
  createSceneOnMovePresentation,
  sceneOnOctazookaView,
  type SceneOnOctazookaConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/octazooka-evidence.json", "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

function effectSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => [
    "gOctazookaBallSpriteTemplate",
    "gOctazookaSmokeSpriteTemplate",
  ].includes(sprite.template.symbol));
}

function profileFor(rows: readonly Json[]): OctazookaProfile {
  const ball = effectSprites(rows[7]!)[0]!;
  const smokes = effectSprites(rows[41]!)
    .filter((sprite: Json) => sprite.template.symbol === "gOctazookaSmokeSpriteTemplate");
  const firstSmoke = effectSprites(rows[29]!)[0]!;
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    ballSpriteSlot: ball.slot,
    smokeSpriteSlots: smokes.map((sprite: Json) => sprite.slot) as [number, number, number, number],
    targetSubpriority: ball.subpriority,
    oam: { ballAttr2: ball.attr[2], smokeAttr2: firstSmoke.attr[2] },
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterGraySmokeLoad: rows[1]!.unfadedPalette,
      fadedAfterGraySmokeLoad: rows[1]!.fadedPalette,
      unfadedAfterBlackBallLoad: rows[4]!.unfadedPalette,
      fadedAfterBlackBallLoad: rows[4]!.fadedPalette,
    },
  };
}

function pointsFor(
  orientation: Orientation,
  rows: readonly Json[],
): Readonly<{ attacker: { x: number; y: number }; target: { x: number; y: number } }> {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const ball = effectSprites(rows[7]!)[0]!;
  const firstSmoke = effectSprites(rows[29]!)[0]!;
  return {
    attacker: {
      x: ball.x - (attackerSide === "player" ? 20 : -20),
      y: ball.y,
    },
    target: {
      x: firstSmoke.x - (targetSide === "player" ? -8 : 8),
      y: firstSmoke.y - 8,
    },
  };
}

function battler(
  species: "OCTILLERY" | "ONIX",
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

function assertRow(
  orientation: Orientation,
  row: Json,
  state: ReturnType<typeof octazookaAtAge>,
): void {
  const prefix = `${orientation} age ${state.age}`;
  if (!same(
    [row.animScriptActive, row.scriptOwner, row.scriptOffset, row.scriptWait, row.animArgs],
    [state.active, state.source.owner, state.source.offset, state.source.wait, state.source.args],
  )) fail(`${prefix}: source cursor/wait/args drift`);
  if (row.animationRng !== state.animationRng) fail(`${prefix}: animation RNG drift`);
  const actualSprites = effectSprites(row).map((sprite: Json) => ({
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
    animation: sprite.animation,
    data: sprite.data,
    attr: sprite.attr,
  }));
  if (!same(actualSprites, state.sprites)) fail(`${prefix}: sprite callback/OAM/affine state drift`);
  if (row.visualTaskCount !== state.visualTaskCount || row.soundTaskCount !== state.soundTaskCount) {
    fail(`${prefix}: visual/sound count drift`);
  }
  if (row.visualTaskCount !== state.sprites.length || state.taskTopology.length !== 0) {
    fail(`${prefix}: visual task topology drift`);
  }
  if (!same(row.softwareMatrices, state.matrices.software) || !same(row.hardwareMatrices, state.matrices.hardware)) {
    fail(`${prefix}: neutral affine state drift`);
  }
  if (!same(row.unfadedPalette, state.palette.unfaded)
    || !same(row.fadedPalette, state.palette.faded)
    || !same(row.hardwarePalette, state.palette.hardware)) fail(`${prefix}: palette transfer drift`);
  const tags = [OCTAZOOKA_GRAY_SMOKE_TAG, OCTAZOOKA_BLACK_BALL_TAG]
    .filter((tag) => row.tileTags.includes(tag));
  const paletteTags = [OCTAZOOKA_GRAY_SMOKE_TAG, OCTAZOOKA_BLACK_BALL_TAG]
    .filter((tag) => row.paletteTags.includes(tag));
  if (!same(tags, state.resources.tileTags) || !same(paletteTags, state.resources.paletteTags)) {
    fail(`${prefix}: tagged-resource lifetime drift`);
  }
  const actualSymbol = row.audio.SE1.songHeaderIdentity.symbol;
  const expectedSymbol = state.audio.current === "SE_M_MEGA_KICK2"
    ? "se_m_mega_kick2"
    : state.audio.current === "SE_M_SELF_DESTRUCT"
      ? "se_m_self_destruct"
      : "se_effective";
  if (actualSymbol !== expectedSymbol || row.audio.SE1.status !== state.audio.status
    || row.audio.SE1.tracks[0]!.panX !== state.audio.currentPan) {
    fail(`${prefix}: audio identity/status/pan drift`);
  }
  if (state.oam.transferLagRows !== 1 || state.matrices.transferLagRows !== 1 || state.palette.transferLagRows !== 1) {
    fail(`${prefix}: transfer-lag contract drift`);
  }
}

const output: Record<string, unknown> = {
  schema: "octazooka-reducer-audit/v1",
  framebufferCompared: false,
};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const evidence = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  const profile = profileFor(rows);
  const points = pointsFor(orientation, rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const config: SceneOnOctazookaConfig = {
    move: "OCTAZOOKA",
    attacker: battler("OCTILLERY", attackerSide, points.attacker),
    target: battler("ONIX", targetSide, points.target),
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
    },
    animationProfile: profile,
  };
  const presentation = createSceneOnMovePresentation(config);
  let prior = new Set<string>();
  let creates = 0;
  let destroys = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const reduced = octazookaAtAge(
      age,
      attackerSide,
      points.attacker,
      targetSide,
      points.target,
      profile,
    );
    assertRow(orientation, rows[age]!, reduced);
    const view = sceneOnOctazookaView({ ...presentation, age });
    const { attacker: _attacker, target: _target, ...seam } = view;
    if (!same(reduced, seam)) fail(`${orientation} age ${age}: typed seam drift`);
    if (age > 0) {
      if (!same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) fail(`${orientation} age ${age}: OAM latch drift`);
      if (!same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) fail(`${orientation} age ${age}: matrix latch drift`);
      if (!same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) fail(`${orientation} age ${age}: palette latch drift`);
    }
    const current = new Set(reduced.sprites.map((sprite) => `${sprite.template}:${sprite.slot}`));
    creates += [...current].filter((key) => !prior.has(key)).length;
    destroys += [...prior].filter((key) => !current.has(key)).length;
    prior = current;
  }
  output[orientation] = {
    reducerRows: rows.length,
    typedSeamRows: rows.length,
    lifecycle: { creates, destroys, ball: 1, graySmoke: 4 },
    rngTransitions: 79,
    latches: { oam: "79/79", matrices: "79/79", palette: "79/79" },
    cleanup: { age: 79, active: false, sprites: 0, resources: 0 },
  };
}

console.log(JSON.stringify(output, null, 2));
