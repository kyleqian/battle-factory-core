import { readFileSync } from "node:fs";

type Orientation = "player-back" | "opponent-front";

const corsola = Object.freeze({
  species: 222,
  level: 50,
  nature: 8,
  ivs: { hp: 3, attack: 3, defense: 3, speed: 3, spAttack: 3, spDefense: 3 },
  evs: {
    hp: 170, attack: 0, defense: 170,
    speed: 0, spAttack: 0, spDefense: 170,
  },
  moves: [243, 243, 243, 243],
  ppUps: [0, 0, 0, 0],
  item: 142,
  abilitySlot: 0,
  friendship: 0,
  gender: "female",
  shiny: false,
});

/**
 * Builds complete legal three-mon parties by reusing the established
 * Light-Screen mechanicLab party topology, then replacing only the active
 * source sets. The opponent is constrained to real Confusion and Corsola to
 * real Mirror Coat; Mirror Coat's -5 priority makes the special hit populate
 * gProtectStructs before the counter calculator runs.
 */
export function mirrorCoatScenario(orientation: Orientation): unknown {
  const playerBack = orientation === "player-back";
  const base = JSON.parse(readFileSync(
    playerBack
      ? "tools/battle-lab/mechanic-light-screen-player-exeggcute-opponent-onix.json"
      : "tools/battle-lab/mechanic-light-screen-opponent-exeggcute-player-onix.json",
    "utf8",
  ));
  const exeggcute = {
    ...(playerBack
      ? base.overrides.parties.player[0]
      : base.overrides.parties.opponent[0]),
    moves: [93, 93, 93, 93],
  };
  if (playerBack) {
    base.playerSetIds[0] = 151;
    base.opponentSetIds[0] = 112;
    base.overrides.parties.player[0] = corsola;
    base.overrides.parties.opponent[0] = exeggcute;
  } else {
    base.playerSetIds[0] = 112;
    base.opponentSetIds[0] = 151;
    base.overrides.parties.player[0] = exeggcute;
    base.overrides.parties.opponent[0] = corsola;
  }
  return base;
}
