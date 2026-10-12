import { describe, expect, it } from "vitest";
import monPicCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import {
  battleCommandFieldSpriteOrigin,
  createBattleCommandFieldArtView,
} from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { calculateHpStat } from "../../src/engine/stats.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import dodrioScenario from "../../tools/battle-lab/mechanic-drill-peck-player-dodrio-opponent-onix.json" with { type: "json" };
import { iu120Ages } from "../helpers/iu120Rows.ts";

function field(attacker: "FEAROW" | "DODRIO", maxHP: number): BattleResolutionDisplayedField {
  return {
    player: {
      species: attacker === "FEAROW" ? 22 : 85,
      speciesSymbol: attacker,
      name: attacker,
      level: 50,
      hp: maxHP,
      maxHP,
      gender: "male",
      status: "none",
    },
    opponent: {
      species: 95,
      speciesSymbol: "ONIX",
      name: "ONIX",
      level: 50,
      hp: 110,
      maxHP: 110,
      gender: "male",
      status: "none",
    },
  } as unknown as BattleResolutionDisplayedField;
}

const request: BattleMoveAnimationRequest = {
  moveId: 65,
  attacker: 0,
  target: 1,
  turn: 0,
  power: 80,
  damage: 1,
  friendship: 70,
  multihit: 0,
};

function rulesWithoutSceneMarker(
  value: ReturnType<typeof generatedCommandAnimationReplay>["boundaries"][number],
) {
  const rulesContext = value.rules.rulesContext;
  return {
    ...value.rules,
    rulesContext: { ...rulesContext, hitMarker: rulesContext.hitMarker & ~0x80 },
  };
}

describe("live Drill Peck adapter", () => {
  it("selects the affine battler OBJ center independently of picture Y offset", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(65);
    expect(liveMoveAnimationDuration(request)).toBe(91);

    for (const [species, maxHP, yOffset] of [
      ["FEAROW", 140, 5],
      ["DODRIO", 135, 1],
    ] as const) {
      const currentField = field(species, maxHP);
      const art = createBattleCommandFieldArtView(currentField);
      const origin = battleCommandFieldSpriteOrigin(art.player, "player");
      const config = liveMoveAnimationPresentation(request, currentField, 0)?.config;
      expect(config).toMatchObject({
        move: "DRILL_PECK",
        attacker: {
          species,
          geometry: { animationCenter: { x: origin.x + 32, y: origin.y + 32 } },
        },
        target: { species: "ONIX" },
        fieldProfile: { playerHp: maxHP, playerMaxHp: maxHP, opponentMaxHp: 110 },
      });
      expect(monPicCoords.back[species].yOffset).toBe(yOffset);
      expect(config!.attacker.geometry.animationCenter.y).not.toBe(
        Math.min(104, origin.y + 40),
      );
    }
  });

  it("audits complete-party HP maxima from source stat inputs", () => {
    const rows = new Map(speciesStats.species.map(row => [row.id, row]));
    expect(calculateHpStat(rows.get(22)!.baseHp, 31, 0, 50)).toBe(140);
    expect(calculateHpStat(rows.get(85)!.baseHp, 31, 0, 50)).toBe(135);
    expect(calculateHpStat(rows.get(95)!.baseHp, 31, 0, 50)).toBe(110);

    for (const party of Object.values(dodrioScenario.overrides.parties)) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(mon).toMatchObject({
          level: 50,
          ivs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number),
            speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) },
          evs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number),
            speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) },
          moves: expect.any(Array),
          ppUps: expect.any(Array),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        });
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
    }
  });

  it("repeats complete bodies after ordinary switching and preserves ON/OFF state and RNG", () => {
    const commands = [{ switch: 2 }, 0, 0] as const;
    const on = generatedCommandAnimationReplay(20, "on", commands, 21);
    const off = generatedCommandAnimationReplay(20, "off", commands, 21);
    const bodies = on.animations.filter(animation => animation.moveId === 65 && animation.attacker === 0);

    expect(bodies).toHaveLength(2);
    expect(bodies.map(body => [body.player, body.opponent])).toEqual([
      ["FEAROW", "SLAKING"],
      ["FEAROW", "SLAKING"],
    ]);
    for (const body of bodies) {
      expect(body.ages).toEqual(iu120Ages(65, 91));
    }
    expect(on.requests.filter(moveRequest => moveRequest.moveId === 65)).toHaveLength(2);
    expect(on.boundaries).toHaveLength(4);
    expect(off.boundaries).toHaveLength(4);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!))
        .toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 60_000);
});
