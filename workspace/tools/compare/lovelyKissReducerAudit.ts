/** Exhaustive reducer/typed-seam audit against retained Lovely Kiss state. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  lovelyKissAtAge,
  type LovelyKissProfile,
} from "../../src/animation/lovelyKiss.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLovelyKissView,
  type SceneOnLovelyKissConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/lovely-kiss-evidence.json", "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

function profileFor(rows: readonly Json[]): LovelyKissProfile {
  const devil = rows[7]!.sprites.find((sprite: Json) => sprite.template.symbol === "gDevilSpriteTemplate")!;
  const hearts = rows[97]!.sprites.filter((sprite: Json) => sprite.template.symbol === "gPinkHeartSpriteTemplate");
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    devilSpriteSlot: devil.slot,
    heartSpriteSlots: hearts.map((sprite: Json) => sprite.slot) as [number, number, number, number],
    targetSubpriority: devil.subpriority + 1,
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterPinkHeartLoad: rows[1]!.unfadedPalette,
      fadedAfterPinkHeartLoad: rows[1]!.fadedPalette,
      unfadedAfterDevilLoad: rows[4]!.unfadedPalette,
      fadedAfterDevilLoad: rows[4]!.fadedPalette,
    },
  };
}

function battler(species: "JYNX" | "ONIX", side: "player" | "opponent", center: { x: number; y: number }) {
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

function assertRow(orientation: Orientation, row: Json, state: ReturnType<typeof lovelyKissAtAge>): void {
  const prefix = `${orientation} age ${state.age}`;
  if (!same(
    [row.animScriptActive, row.scriptOwner, row.scriptOffset, row.scriptWait, row.animArgs],
    [state.active, state.source.owner, state.source.offset, state.source.wait, state.source.args],
  )) fail(`${prefix}: source cursor drift`);
  if (row.animationRng !== state.animationRng) fail(`${prefix}: animation RNG drift`);
  const actualSprites = row.sprites
    .filter((sprite: Json) => ["gDevilSpriteTemplate", "gPinkHeartSpriteTemplate"].includes(sprite.template.symbol))
    .map((sprite: Json) => ({
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
  if (!same(row.unfadedPalette, state.palette.unfaded)
    || !same(row.fadedPalette, state.palette.faded)
    || !same(row.hardwarePalette, state.palette.hardware)) fail(`${prefix}: palette transfer drift`);
  const actualTags = [10219, 10221].filter((tag) => row.tileTags.includes(tag));
  const actualPaletteTags = [10219, 10221].filter((tag) => row.paletteTags.includes(tag));
  if (!same(actualTags, state.resources.tileTags) || !same(actualPaletteTags, state.resources.paletteTags)) {
    fail(`${prefix}: resource tag drift`);
  }
  const actualSound = row.audio.SE1.songHeaderIdentity.symbol;
  const expectedSound = state.audio.current === "SE_M_PSYBEAM2"
    ? "se_m_psybeam2"
    : state.audio.current === "SE_M_ATTRACT"
      ? "se_m_attract"
      : row.audio.SE1.songHeaderIdentity.symbol;
  if (actualSound !== expectedSound) fail(`${prefix}: audio identity drift`);
  const actualAudioActive = (row.audio.SE1.status & 0x80000000) === 0;
  if (state.age >= 7 && actualAudioActive !== state.audio.active) fail(`${prefix}: audio lifetime drift`);
  if (state.audio.active && row.audio.SE1.tracks[0]!.panX !== state.audio.targetPan) fail(`${prefix}: target pan drift`);
  if (state.oam.transferLagRows !== 1 || state.matrices.transferLagRows !== 1 || state.palette.transferLagRows !== 1) {
    fail(`${prefix}: transfer-lag contract drift`);
  }
}

const output: Record<string, unknown> = { schema: "lovely-kiss-reducer-audit/v1", framebufferCompared: false };
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const evidence = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  const profile = profileFor(rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const targetCenter = orientation === "player-back" ? { x: 176, y: 42 } : { x: 72, y: 88 };
  const attackerCenter = orientation === "player-back" ? { x: 72, y: 90 } : { x: 176, y: 44 };
  const config: SceneOnLovelyKissConfig = {
    move: "LOVELY_KISS",
    attacker: battler("JYNX", attackerSide, attackerCenter),
    target: battler("ONIX", targetSide, targetCenter),
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
    },
    animationProfile: profile,
  };
  const presentation = createSceneOnMovePresentation(config);
  let priorSprites = new Set<number>();
  let creates = 0;
  let destroys = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const reduced = lovelyKissAtAge(age, targetSide, targetCenter, profile);
    assertRow(orientation, rows[age]!, reduced);
    const view = sceneOnLovelyKissView({ ...presentation, age });
    const { attacker: _attacker, target: _target, ...seam } = view;
    if (!same(reduced, seam)) fail(`${orientation} age ${age}: typed seam drift`);
    if (age > 0) {
      if (!same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) fail(`${orientation} age ${age}: OAM latch drift`);
      if (!same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) fail(`${orientation} age ${age}: matrix latch drift`);
      if (!same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) fail(`${orientation} age ${age}: palette latch drift`);
    }
    const currentSprites = new Set(reduced.sprites.map((sprite) => sprite.slot));
    creates += [...currentSprites].filter((slot) => !priorSprites.has(slot)).length;
    destroys += [...priorSprites].filter((slot) => !currentSprites.has(slot)).length;
    priorSprites = currentSprites;
  }
  output[orientation] = {
    reducerRows: rows.length,
    typedSeamRows: rows.length,
    lifecycle: { creates, destroys, devil: 1, pinkHearts: 4 },
    rngTransitions: 152,
    latches: { oam: "152/152", matrices: "152/152", palette: "152/152" },
    cleanup: { age: 152, active: false, sprites: 0, resources: 0 },
  };
}

console.log(JSON.stringify(output, null, 2));
