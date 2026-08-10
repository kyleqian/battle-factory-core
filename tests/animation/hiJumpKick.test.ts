import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HI_JUMP_KICK_ALPHA_FIRST_AGE,
  HI_JUMP_KICK_ATTACKER_RETURN_AGE,
  HI_JUMP_KICK_ATTACKER_SLIDE_AGE,
  HI_JUMP_KICK_CLEAR_AGE,
  HI_JUMP_KICK_CONTACT_AGE,
  HI_JUMP_KICK_FOOT_FIRST_AGE,
  HI_JUMP_KICK_FRAME_COUNT,
  HI_JUMP_KICK_IMPACT_LOAD_AGE,
  HI_JUMP_KICK_MONBG_FIRST_AGE,
  HI_JUMP_KICK_SHAKE_FIRST_AGE,
  HI_JUMP_KICK_TARGET_RETURN_AGE,
  hiJumpKickAtAge,
} from "../../src/animation/hiJumpKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHiJumpKickView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_TARGET = { x: 176, y: 42 };
const OPPONENT_TARGET = { x: 72, y: 88 };

describe("MOVE_HI_JUMP_KICK source-relative reducer", () => {
  it("pins the pointer-relative resource, monbg, alpha, and cleanup edges", () => {
    expect(HI_JUMP_KICK_FRAME_COUNT).toBe(91);
    expect(hiJumpKickAtAge(0, "player", "opponent", PLAYER_TARGET)).toMatchObject({
      active: true,
      handsAndFeetLoaded: true,
      impactLoaded: false,
      targetOnMonBg: false,
      alpha: null,
      attackerOffset: { x2: 0, y2: 0 },
    });
    expect(hiJumpKickAtAge(HI_JUMP_KICK_IMPACT_LOAD_AGE, "player", "opponent", PLAYER_TARGET).impactLoaded).toBe(true);
    expect(hiJumpKickAtAge(HI_JUMP_KICK_MONBG_FIRST_AGE, "player", "opponent", PLAYER_TARGET).targetOnMonBg).toBe(true);
    expect(hiJumpKickAtAge(HI_JUMP_KICK_ALPHA_FIRST_AGE, "player", "opponent", PLAYER_TARGET).alpha).toEqual({ eva: 12, evb: 8 });
    expect(hiJumpKickAtAge(HI_JUMP_KICK_CLEAR_AGE - 1, "player", "opponent", PLAYER_TARGET).targetOnMonBg).toBe(true);
    expect(hiJumpKickAtAge(HI_JUMP_KICK_CLEAR_AGE, "player", "opponent", PLAYER_TARGET)).toMatchObject({
      targetOnMonBg: false,
      alpha: null,
    });
    expect(hiJumpKickAtAge(89, "player", "opponent", PLAYER_TARGET).active).toBe(true);
    expect(hiJumpKickAtAge(90, "player", "opponent", PLAYER_TARGET).active).toBe(false);
  });

  it("uses source-identical slide and travel reducers in both orientations", () => {
    const player = (age: number) => hiJumpKickAtAge(age, "player", "opponent", PLAYER_TARGET);
    const opponent = (age: number) => hiJumpKickAtAge(age, "opponent", "player", OPPONENT_TARGET);
    expect(player(HI_JUMP_KICK_ATTACKER_SLIDE_AGE).attackerOffset.x2).toBe(-3);
    expect(player(16).attackerOffset.x2).toBe(-24);
    expect(player(HI_JUMP_KICK_ATTACKER_RETURN_AGE).attackerOffset.x2).toBe(-16);
    expect(player(33).attackerOffset.x2).toBe(0);
    expect(opponent(16).attackerOffset.x2).toBe(24);
    expect(opponent(HI_JUMP_KICK_ATTACKER_RETURN_AGE).attackerOffset.x2).toBe(16);
    expect(player(HI_JUMP_KICK_FOOT_FIRST_AGE).foot).toMatchObject({
      x: 144, y: 58, x2: 3, y2: -1, variant: 1,
    });
    expect(player(44).foot).toMatchObject({ x2: 31, y2: -15 });
    expect(opponent(HI_JUMP_KICK_FOOT_FIRST_AGE).foot).toMatchObject({
      x: 104, y: 72, x2: -3, y2: 1, variant: 1,
    });
    expect(opponent(44).foot).toMatchObject({ x2: -31, y2: 15 });
    expect(player(45).foot).not.toBeNull();
    expect(player(46).foot).toBeNull();
  });

  it("measures HJK's own ShakeMonInPlace cadence and target return", () => {
    const player = (age: number) => hiJumpKickAtAge(age, "player", "opponent", PLAYER_TARGET);
    const opponent = (age: number) => hiJumpKickAtAge(age, "opponent", "player", OPPONENT_TARGET);
    expect(player(HI_JUMP_KICK_CONTACT_AGE).targetX2).toBe(9);
    expect(player(49).targetX2).toBe(27);
    expect(player(HI_JUMP_KICK_SHAKE_FIRST_AGE - 1).targetX2).toBe(27);
    expect(player(HI_JUMP_KICK_SHAKE_FIRST_AGE).targetX2).toBe(24);
    expect(player(HI_JUMP_KICK_SHAKE_FIRST_AGE + 1).targetX2).toBe(30);
    expect(player(70).targetX2).toBe(30);
    expect(player(71).targetX2).toBe(27);
    expect(opponent(HI_JUMP_KICK_SHAKE_FIRST_AGE).targetX2).toBe(-31);
    expect(opponent(HI_JUMP_KICK_SHAKE_FIRST_AGE + 1).targetX2).toBe(-25);
    expect(opponent(HI_JUMP_KICK_TARGET_RETURN_AGE).targetX2).toBe(-24);
    expect(opponent(84).targetX2).toBe(-1);
    expect(opponent(HI_JUMP_KICK_CLEAR_AGE).targetX2).toBe(0);
    expect(player(HI_JUMP_KICK_CONTACT_AGE).hitsplat).toEqual({
      x: 176, y: 42, animation: 1,
    });
    expect(player(56).hitsplat).not.toBeNull();
    expect(player(57).hitsplat).toBeNull();
    expect(player(HI_JUMP_KICK_SHAKE_FIRST_AGE).shakeTaskActive).toBe(true);
    expect(player(70).shakeTaskActive).toBe(true);
    expect(player(71).shakeTaskActive).toBe(false);
  });

  it("reports the two source-owned target-pan cues", () => {
    expect(hiJumpKickAtAge(HI_JUMP_KICK_FOOT_FIRST_AGE, "player", "opponent", PLAYER_TARGET).soundEvents).toEqual([
      { age: 35, song: "SE_M_JUMP_KICK", panSide: "opponent" },
    ]);
    expect(hiJumpKickAtAge(HI_JUMP_KICK_CONTACT_AGE, "opponent", "player", OPPONENT_TARGET).soundEvents).toEqual([
      { age: 47, song: "SE_M_VITAL_THROW2", panSide: "player" },
    ]);
  });

  it("exposes the complete body through a typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "HI_JUMP_KICK",
      attacker: {
        species: "MEDICHAM",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 52 },
          animationCenter: { x: 72, y: 84 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: PLAYER_TARGET,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 135, playerMaxHp: 135,
        opponentHp: 110, opponentMaxHp: 110,
      },
    });
    expect(sceneOnHiJumpKickView({ ...stage, age: 47 })).toMatchObject({
      age: 47,
      attacker: { species: "MEDICHAM" },
      target: { species: "ONIX" },
      hitsplat: { x: 176, y: 42, animation: 1 },
      soundEvents: [{ song: "SE_M_VITAL_THROW2", panSide: "opponent" }],
    });
  });

  it("keeps source identity, carrier/index, and complete-party staging pinned", () => {
    expect(execFileSync("npx", ["tsx", "tools/compare/hiJumpKickSourceAudit.ts"], {
      encoding: "utf8",
    })).toContain("set 373/FRONTIER_MON_MEDICHAM_1 is a source-proven legal");
    for (const path of [
      "tools/battle-lab/mechanic-hi-jump-kick-player-medicham-opponent-onix.json",
      "tools/battle-lab/mechanic-hi-jump-kick-opponent-medicham-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        mode: string;
        profile: string;
        playerSetIds: number[];
        opponentSetIds: number[];
        overrides: { parties: { player: readonly { species: number; moves: number[] }[]; opponent: readonly { species: number; moves: number[] }[] } };
      };
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(373);
      expect([...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .filter((mon) => mon.species === 308 && mon.moves.includes(136))).toHaveLength(1);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
    }
  });
});
