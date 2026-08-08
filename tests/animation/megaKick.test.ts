import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MEGA_KICK_FRAME_COUNT,
  megaKickAtAge,
} from "../../src/animation/megaKick.ts";
import { megaPunchAtAge } from "../../src/animation/megaPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMegaKickView,
} from "../../src/animation/sceneOnPresentation.ts";

const opponent = { x: 176, y: 42 };

describe("MOVE_MEGA_KICK source-relative reducer", () => {
  it("pins the measured foot variant, alpha edge, and independent second cue", () => {
    expect(MEGA_KICK_FRAME_COUNT).toBe(160);
    expect(megaKickAtAge(13, "opponent", opponent).alpha).toBeNull();
    expect(megaKickAtAge(14, "opponent", opponent)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      fist: { variant: 1 },
      sound: "SE_M_MEGA_KICK",
      soundPanSide: "opponent",
    });
    expect(megaKickAtAge(66, "opponent", opponent).sound).toBe("SE_M_MEGA_KICK2");
    expect(megaKickAtAge(71, "opponent", opponent).sound).toBeNull();
    expect(megaKickAtAge(71, "opponent", opponent)).toMatchObject({
      hitsplatVisible: true,
      targetOffset: { x2: -4, y2: 0 },
      background: { variant: "opponent", impact: true },
    });
    expect(megaKickAtAge(158, "opponent", opponent).active).toBe(true);
    expect(megaKickAtAge(159, "opponent", opponent).active).toBe(false);
  });

  it("reuses the shared punch/kick body while keeping every Kick-specific field explicit", () => {
    for (const age of [0, 14, 19, 65, 66, 71, 72, 87, 113, 114, 137, 158]) {
      const punch = megaPunchAtAge(age, "opponent", opponent);
      const kick = megaKickAtAge(age, "opponent", opponent);
      expect({
        ...kick,
        alpha: age === 14 ? punch.alpha : kick.alpha,
        fist: kick.fist && { ...kick.fist, variant: 0 },
        sound: age === 66 || age === 71 ? punch.sound : kick.sound,
        soundPanSide: age === 66 || age === 71
          ? punch.soundPanSide
          : kick.soundPanSide,
      }).toEqual(punch);
    }
  });

  it("exposes Mega Kick through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "MEGA_KICK",
      attacker: {
        species: "SUDOWOODO",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: opponent,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 177, playerMaxHp: 177,
        opponentHp: 142, opponentMaxHp: 142,
      },
    });
    expect(sceneOnMegaKickView({ ...stage, age: 66 })).toMatchObject({
      age: 66,
      attacker: { species: "SUDOWOODO" },
      target: { species: "ONIX" },
      fist: { variant: 1 },
      sound: "SE_M_MEGA_KICK2",
    });
  });

  it("keeps the source-proven set-298 carrier and complete-party staging legal", () => {
    expect(execFileSync("npx", ["tsx", "tools/compare/megaPunchSourceAudit.ts"], {
      encoding: "utf8",
    })).toContain("set 298/FRONTIER_MON_SUDOWOODO_2 is a source-proven legal");
    for (const path of [
      "tools/battle-lab/mechanic-mega-kick-player-sudowoodo-opponent-onix.json",
      "tools/battle-lab/mechanic-mega-kick-opponent-sudowoodo-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        mode: string;
        profile: string;
        overrides: { parties: { player: readonly { species: number; moves: number[] }[]; opponent: readonly { species: number; moves: number[] }[] } };
      };
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const sudowoodo = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon) => mon.species === 185);
      expect(sudowoodo?.moves).toEqual([25, 25, 25, 25]);
    }
  });
});
