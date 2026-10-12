import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  renderBattleResolutionLiveView,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS,
  liveMoveAnimationDuration,
  liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

const field = {
  player: {
    species: 93, speciesSymbol: "HAUNTER", name: "HAUNTER", level: 50,
    hp: 117, maxHP: 117, gender: "male", status: "none",
    spriteCorner: { x: 40, y: 56 },
  },
  opponent: {
    species: 278, speciesSymbol: "GROVYLE", name: "GROVYLE", level: 50,
    hp: 106, maxHP: 106, gender: "male", status: "none",
    spriteCorner: { x: 144, y: 16 },
  },
} as unknown as BattleResolutionDisplayedField;

const alternateField = {
  player: {
    species: 25, speciesSymbol: "PIKACHU", name: "PIKACHU", level: 50,
    hp: 124, maxHP: 124, gender: "female", status: "paralysis",
    spriteCorner: { x: 40, y: 56 },
  },
  opponent: {
    species: 287, speciesSymbol: "MIGHTYENA", name: "MIGHTYENA", level: 50,
    hp: 139, maxHP: 139, gender: "female", status: "none",
    spriteCorner: { x: 144, y: 16 },
  },
} as unknown as BattleResolutionDisplayedField;

const cases = [
  { id: 47, move: "SING", playerDuration: 245, opponentDuration: 248, age: 72 },
  { id: 48, move: "SUPERSONIC", playerDuration: 51, opponentDuration: 51, age: 24 },
  { id: 78, move: "STUN_SPORE", playerDuration: 194, opponentDuration: 194, age: 80 },
  { id: 79, move: "SLEEP_POWDER", playerDuration: 194, opponentDuration: 194, age: 80 },
  { id: 92, move: "TOXIC", playerDuration: 219, opponentDuration: 219, age: 170 },
  { id: 93, move: "CONFUSION", playerDuration: 140, opponentDuration: 140, age: 70 },
  { id: 94, move: "PSYCHIC", playerDuration: 140, opponentDuration: 140, age: 70 },
  { id: 95, move: "HYPNOSIS", playerDuration: 169, opponentDuration: 168, age: 72 },
  { id: 101, move: "NIGHT_SHADE", playerDuration: 228, opponentDuration: 228, age: 132 },
  { id: 147, move: "SPORE", playerDuration: 207, opponentDuration: 207, age: 80 },
  { id: 247, move: "SHADOW_BALL", playerDuration: 148, opponentDuration: 148, age: 100 },
  { id: 320, move: "GRASS_WHISTLE", playerDuration: 225, opponentDuration: 225, age: 80 },
] as const;

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return {
    moveId, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
  };
}

function routeHash(
  moveId: number, attacker: 0 | 1, age: number,
  currentField: BattleResolutionDisplayedField = field,
): string {
  const framebuffer = new Uint8Array(240 * 160 * 4);
  const player = currentField.player;
  const opponent = currentField.opponent;
  const view = {
    field: currentField,
    fieldArt: createBattleCommandFieldArtView(currentField),
    healthboxes: {
      player: {
        name: player.name, level: player.level, gender: player.gender,
        hpFraction: player.hp / player.maxHP, status: player.status,
        currentHp: player.hp, maxHp: player.maxHP,
      },
      opponent: {
        name: opponent.name, level: opponent.level, gender: opponent.gender,
        hpFraction: opponent.hp / opponent.maxHP, status: opponent.status,
      },
    },
    message: {
      lines: [attacker === 0 ? `${player.name} used` : `Foe ${opponent.name} used`, "A MOVE!"],
      visibleCharacters: 99,
    },
    effect: { type: "move", request: request(moveId, attacker), age },
    bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  renderBattleResolutionLiveView(framebuffer, view);
  return createHash("sha256").update(framebuffer).digest("hex");
}

describe("live status, psychic, and ghost move adapters", () => {
  it("registers each complete source-owned body with its bilateral cleanup length", () => {
    // Psychic (94) / Crunch (242): faithful timing since a13fix (liveMoveTimingPolicy.ts), the same live bodies.
    expect(LIVE_MOVE_ANIMATION_IDS).toEqual(expect.arrayContaining(cases.map(row => row.id).filter(id => !LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS.includes(id))));
    expect(cases.map(row => row.id).filter(id => !(LIVE_MOVE_ANIMATION_IDS as readonly number[]).includes(id))
      .every(id => LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS.includes(id))).toBe(true);
    for (const row of cases) {
      expect(liveMoveAnimationDuration(request(row.id, 0)), row.move)
        .toBe(row.playerDuration);
      expect(liveMoveAnimationDuration(request(row.id, 1)), row.move)
        .toBe(row.opponentDuration);
      for (const attacker of [0, 1] as const) {
        expect(liveMoveAnimationPresentation(request(row.id, attacker), field, 0)?.config)
          .toMatchObject({
            move: row.move,
            attacker: { species: attacker === 0 ? "HAUNTER" : "GROVYLE" },
            target: { species: attacker === 0 ? "GROVYLE" : "HAUNTER" },
          });
      }
    }
  });

  it.each(cases)("renders $move from current live front/back art in both orientations", (row) => {
    for (const attacker of [0, 1] as const) {
      const duration = liveMoveAnimationDuration(request(row.id, attacker))!;
      const stage = liveMoveAnimationPresentation(request(row.id, attacker), field, row.age)!;
      const stageFramebuffer = new Uint8Array(240 * 160 * 4);
      expect(() => renderSceneOnMovePresentation(stageFramebuffer, stage, true)).not.toThrow();
      const frames = [
        routeHash(row.id, attacker, 0),
        routeHash(row.id, attacker, Math.min(row.age, duration - 1)),
        routeHash(row.id, attacker, duration - 1),
      ];
      expect(new Set(frames).size, `${row.move} attacker ${attacker}`).toBeGreaterThan(1);
      expect(routeHash(row.id, attacker, Math.min(row.age, duration - 1)))
        .toBe(routeHash(row.id, attacker, Math.min(row.age, duration - 1)));
    }
  });

  it("derives effect and affine centers from the current displayed field", () => {
    const art = createBattleCommandFieldArtView(alternateField);
    const playerConfig = liveMoveAnimationPresentation(request(247, 0), alternateField, 80)!;
    const opponentConfig = liveMoveAnimationPresentation(request(47, 1), alternateField, 80)!;
    expect(playerConfig.config.attacker.geometry).toMatchObject({
      side: "player",
      spriteCorner: { x: art.player.origin.x, y: art.player.origin.y },
      animationCenter: {
        x: art.player.origin.x + 32,
        y: Math.min(104, art.player.origin.y + 40),
      },
    });
    expect(opponentConfig.config.attacker.geometry).toMatchObject({
      side: "opponent",
      spriteCorner: { x: art.opponent.origin.x, y: art.opponent.origin.y },
      animationCenter: {
        x: art.opponent.origin.x + 32,
        y: art.opponent.origin.y + 32,
      },
    });
    expect(routeHash(247, 0, 100, alternateField))
      .toBe(routeHash(247, 0, 100, alternateField));
  });

  it("keeps the bilateral complete-window receipt source-driven", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/integration/fixtures/status-batch-live-framebuffer-receipt.json", "utf8",
    )) as {
      freshRunsPerOrientation: number;
      results: Array<{
        move: string;
        player: { fixture: string; frames: number; digest: string };
        opponent: { fixture: string; frames: number; digest: string };
      }>;
    };
    expect(receipt.freshRunsPerOrientation).toBe(2);
    expect(receipt.results.map(row => row.move).sort())
      .toEqual(cases.map(row => row.move).sort());
    expect(receipt.results.reduce(
      (total, row) => total + row.player.frames + row.opponent.frames, 0,
    )).toBe(4322);
    for (const row of receipt.results) {
      for (const side of [row.player, row.opponent]) {
        const wrapper = JSON.parse(readFileSync(
          `tools/integration/fixtures/${side.fixture}`, "utf8",
        )) as Record<string, unknown>;
        expect(Object.hasOwn(wrapper, "frames")).toBe(false);
        expect(Object.hasOwn(wrapper, "captureRows")).toBe(false);
        expect(side.digest).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  it("restarts a legal generated Confusion command with the current displayed field", () => {
    const replay = generatedCommandAnimationReplay(19, "on", [0, 0]);
    const effects = replay.animations.filter(effect => effect.moveId === 93 && effect.attacker === 0);
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect).toMatchObject({ player: "DROWZEE", opponent: "LUVDISC" });
      expect(effect.ages).toEqual(iu120Ages(93, 140));
    }
    expect(replay.requests.filter(request => request.moveId === 93 && request.attacker === 0)
      .map(request => [request.turn, request.damage]))
      .toEqual([[0, 31], [0, 31]]);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);
});
