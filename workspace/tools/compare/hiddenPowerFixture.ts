/** Retained Hidden Power rows adapted to narrow typed live presentation facts. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type {
  SceneOnHiddenPowerConfig,
  SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

type Row = Record<string, any>;
export type HiddenPowerOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
export const hiddenPowerFixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/hidden-power-evidence.json"), "utf8"));
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export function hiddenPowerRowsFor(orientation: HiddenPowerOrientation): readonly Row[] {
  const item = hiddenPowerFixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation} dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation} probe hash`);
  return JSON.parse(json.toString()).frames;
}

function gender(value: string): "male" | "female" | "none" {
  return value === "male" || value === "female" ? value : "none";
}

function battler(
  species: "UNOWN" | "ONIX", side: "player" | "opponent", sprite: Row,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function hiddenPowerConfigFor(
  orientation: HiddenPowerOrientation, rows: readonly Row[],
): SceneOnHiddenPowerConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSprite = first.battlerSprites.attacker;
  const targetSprite = first.battlerSprites.target;
  const orbit = rows[64]!.sprites.filter((sprite: Row) => sprite.template?.symbol === "gHiddenPowerOrbSpriteTemplate");
  const scatter = rows[118]!.sprites.filter((sprite: Row) => sprite.template?.symbol === "gHiddenPowerOrbScatterSpriteTemplate");
  if (orbit.length !== 6 || scatter.length !== 8) throw new Error(`${orientation}: incomplete allocator facts`);
  const allocationSlots = [...orbit, ...scatter].map((sprite: Row) => sprite.slot);
  const spriteOrderSeed = rows[63]!.spriteOrder.filter((slot: number) => allocationSlots.includes(slot));
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  const center = { x: orbit[0]!.x, y: orbit[0]!.y };
  return {
    move: "HIDDEN_POWER",
    attacker: battler("UNOWN", playerAttacker ? "player" : "opponent", attackerSprite, center),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", targetSprite, { x: targetSprite.x, y: targetSprite.y }),
    fieldProfile: {
      playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender),
      playerStatus: player.status.kind, opponentStatus: opponent.status.kind,
    },
    animationProfile: {
      attackerSubpriority: attackerSprite.subpriority,
      targetSubpriority: targetSprite.subpriority,
      allocationSlots, spriteOrderSeed,
      orbitMatrixNums: orbit.map((sprite: Row) => sprite.matrixNum),
      scatterMatrixNums: scatter.map((sprite: Row) => sprite.matrixNum),
      uninitializedScatterY: scatter[7]!.y,
      animationRngSeed: first.animationRng,
    },
  };
}

export function hiddenPowerLiveSlotsAt(row: Row): readonly number[] {
  return row.sprites.filter((sprite: Row) => [
    "gHiddenPowerOrbSpriteTemplate", "gHiddenPowerOrbScatterSpriteTemplate",
  ].includes(sprite.template?.symbol)).map((sprite: Row) => sprite.slot);
}
