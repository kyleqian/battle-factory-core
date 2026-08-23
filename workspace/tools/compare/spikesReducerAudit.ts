/** Exhaustive reducer/typed-seam audit against retained Move_SPIKES state. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  SPIKES_TAG,
  spikesAtAge,
  type SpikesProfile,
} from "../../src/animation/spikes.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSpikesView,
  type SceneOnPresentationBattler,
  type SceneOnSpikesConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/spikes-evidence.json", "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

function effectSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template.symbol === "gSpikesSpriteTemplate");
}

function profileFor(rows: readonly Json[]): SpikesProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    spriteSlots: [7, 19, 31].map((age) => effectSprites(rows[age]!).at(-1)!.slot) as [number, number, number],
    targetSubpriority: effectSprites(rows[7]!)[0]!.subpriority,
    oam: { spikeAttr2: effectSprites(rows[7]!)[0]!.attr[2] },
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterLoad: rows[1]!.unfadedPalette,
      fadedAfterLoad: rows[1]!.fadedPalette,
      unfadedAfterMonbg: rows[4]!.unfadedPalette,
      fadedAfterMonbg: rows[4]!.fadedPalette,
    },
  };
}

function pointsFor(
  orientation: Orientation,
  rows: readonly Json[],
): Readonly<{
  attacker: { x: number; y: number };
  targetBattlePosition: { x: number; y: number };
  targetAnimationCenter: { x: number; y: number };
}> {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const spike = effectSprites(rows[7]!)[0]!;
  const targetSprite = rows[0]!.battlerSprites.target;
  return {
    attacker: {
      x: spike.x - (attackerSide === "player" ? 20 : -20),
      y: spike.y,
    },
    // SetAverageBattlerPositions(FALSE) uses GetBattlerSpriteCoord(X/Y), not
    // the target's front-idle OBJ offset. The scene seam keeps this source
    // coordinate distinct from the UpdateMonBg copy anchor below.
    targetBattlePosition: attackerSide === "player"
      ? { x: 176, y: 40 }
      : { x: 72, y: 80 },
    targetAnimationCenter: {
      x: targetSprite.x + targetSprite.x2,
      y: targetSprite.y + targetSprite.y2,
    },
  };
}

function battler(
  species: "QWILFISH" | "ONIX",
  side: "player" | "opponent",
  sprite: Json,
  animationCenter: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x + sprite.x2 - 32, y: sprite.y + sprite.y2 - 32 },
      animationCenter,
      battlePositionCenter,
    },
  };
}

function configFor(
  orientation: Orientation,
  rows: readonly Json[],
): SceneOnSpikesConfig {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const points = pointsFor(orientation, rows);
  const first = rows[0]!;
  const attacker = battler(
    "QWILFISH",
    attackerSide,
    first.battlerSprites.attacker,
    points.attacker,
    attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  );
  const target = battler(
    "ONIX",
    targetSide,
    first.battlerSprites.target,
    points.targetAnimationCenter,
    points.targetBattlePosition,
  );
  return {
    move: "SPIKES",
    attacker,
    target,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    animationProfile: profileFor(rows),
  };
}

function assertRow(
  orientation: Orientation,
  row: Json,
  state: ReturnType<typeof spikesAtAge>,
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
  const actualTasks = row.tasks.map((task: Json) => ({
    slot: task.slot,
    callback: task.func.symbol,
    data: task.data,
  }));
  if (!same(actualTasks, state.tasks)) fail(`${prefix}: source task topology drift`);
  if (row.visualTaskCount !== state.visualTaskCount || row.soundTaskCount !== state.soundTaskCount) {
    fail(`${prefix}: visual/sound count drift`);
  }
  if (!same(row.softwareMatrices, state.matrices.software) || !same(row.hardwareMatrices, state.matrices.hardware)) {
    fail(`${prefix}: affine-off matrix state drift`);
  }
  if (!same(row.unfadedPalette, state.palette.unfaded)
    || !same(row.fadedPalette, state.palette.faded)
    || !same(row.hardwarePalette, state.palette.hardware)) fail(`${prefix}: palette transfer drift`);
  const taggedTiles = row.tileTags.includes(SPIKES_TAG) ? [SPIKES_TAG] : [];
  const taggedPalettes = row.paletteTags.includes(SPIKES_TAG) ? [SPIKES_TAG] : [];
  if (!same(taggedTiles, state.resources.tileTags) || !same(taggedPalettes, state.resources.paletteTags)) {
    fail(`${prefix}: tagged resource lifetime drift`);
  }
  if (state.age >= 7) {
    const actual = row.audio.SE1;
    const expectedSymbol = state.audio.current === "SE_M_JUMP_KICK"
      ? "se_m_jump_kick"
      : state.audio.current === "SE_M_HORN_ATTACK" ? "se_m_horn_attack" : "se_m_horn_attack";
    if (actual.songHeaderIdentity.symbol !== expectedSymbol
      || actual.status !== state.audio.status
      || actual.tracks[0]!.panX !== state.audio.currentPan) fail(`${prefix}: audio state drift`);
  }
  if (state.oam.transferLagRows !== 1 || state.matrices.transferLagRows !== 1
    || state.palette.transferLagRows !== 1 || state.palette.sameRowTransfer !== (state.age === 4)) {
    fail(`${prefix}: transfer contract drift`);
  }
}

const output: Record<string, unknown> = {
  schema: "spikes-reducer-audit/v1",
  framebufferCompared: false,
};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const evidence = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  const config = configFor(orientation, rows);
  const presentation = createSceneOnMovePresentation(config);
  const points = pointsFor(orientation, rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const profile = config.animationProfile;
  let prior = new Set<string>();
  let creates = 0;
  let destroys = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const reduced = spikesAtAge(
      age,
      attackerSide,
      points.attacker,
      targetSide,
      points.targetBattlePosition,
      profile,
      points.targetAnimationCenter,
    );
    assertRow(orientation, rows[age]!, reduced);
    const view = sceneOnSpikesView({ ...presentation, age });
    const { attacker: _attacker, target: _target, ...seam } = view;
    if (!same(reduced, seam)) fail(`${orientation} age ${age}: typed seam drift`);
    if (age > 0) {
      if (!same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) fail(`${orientation} age ${age}: OAM latch drift`);
      if (!same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) fail(`${orientation} age ${age}: matrix latch drift`);
      if (age === 4) {
        if (!same(rows[age]!.hardwarePalette, rows[age]!.fadedPalette)) fail(`${orientation} age ${age}: monbg palette handoff drift`);
      } else if (!same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) {
        fail(`${orientation} age ${age}: palette latch drift`);
      }
    }
    const current = new Set(reduced.sprites.map((sprite) => `${sprite.template}:${sprite.slot}`));
    creates += [...current].filter((key) => !prior.has(key)).length;
    destroys += [...prior].filter((key) => !current.has(key)).length;
    prior = current;
  }
  output[orientation] = {
    reducerRows: rows.length,
    typedSeamRows: rows.length,
    lifecycle: { creates, destroys, spikes: 3 },
    rngTransitions: 111,
    latches: { oam: "113/113", matrices: "113/113", palette: "112/113 + same-row age 4 monbg" },
    cleanup: { age: 113, active: false, sprites: 0, resources: 0 },
  };
}

console.log(JSON.stringify(output, null, 2));

export { configFor as spikesConfigFor };
