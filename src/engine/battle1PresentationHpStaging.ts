/**
 * Canonical Battle 1 healthbox values, re-derived from the existing staged
 * kernel hit chains. Presentation consumes this compact aggregate instead of
 * importing RAM recordings; Tier-1 tests retain those recordings solely as
 * ground-truth assertions.
 */
import {
  resolveTurn1RockSlideHpEndpoints,
  stageTurn1RockSlideHitChain,
} from "./turn1RockSlidePresentationStaging.ts";
import {
  resolveTurn2EndeavorHpEndpoints,
  stageTurn2EndeavorHitChain,
} from "./turn2EndeavorPresentationStaging.ts";
import { resolveTurn3RockSlideHpEndpoints } from "./turn3RockSlidePresentationStaging.ts";
import { resolveTurn5EndeavorHpEndpoints } from "./turn5EndeavorPresentationStaging.ts";

export type Battle1PresentationHpValues = Readonly<{
  opponent: Readonly<{ species: number; level: number; hp: number; maxHP: number }>;
  opponentAfterTurn1Hp: number;
  player: Readonly<{ hp: number; maxHP: number }>;
  playerAfterTurn2Hp: number;
  opponentAfterTurn2Hp: number;
  playerAfterTurn3Hp: number;
  opponentAfterTurn3Hp: number;
}>;

export function resolveBattle1PresentationHpValues(): Battle1PresentationHpValues {
  const turn1Stage = stageTurn1RockSlideHitChain();
  const turn1 = resolveTurn1RockSlideHpEndpoints();
  const turn2Stage = stageTurn2EndeavorHitChain();
  const turn2 = resolveTurn2EndeavorHpEndpoints();
  const turn3 = resolveTurn3RockSlideHpEndpoints();
  const turn5Endeavor = resolveTurn5EndeavorHpEndpoints();

  return Object.freeze({
    opponent: Object.freeze({
      species: turn1Stage.opponent.species,
      level: turn1Stage.opponent.level,
      hp: turn1.from,
      maxHP: turn1Stage.opponent.maxHP,
    }),
    opponentAfterTurn1Hp: turn1.to,
    player: Object.freeze({ hp: turn2.from, maxHP: turn2Stage.player.maxHP }),
    playerAfterTurn2Hp: turn2.to,
    opponentAfterTurn2Hp: turn3.from,
    playerAfterTurn3Hp: turn5Endeavor.from,
    opponentAfterTurn3Hp: turn3.to,
  });
}
