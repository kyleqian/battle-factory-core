// rol1 (docs/rol1-rollout-chain.md): the five-turn Rollout ROM window (aud242o fixture, Scene ON). The ROM's turn period is constant
// while the Rollout body shrinks by counter; the model shrinks the same way, so the per-turn drift growth is the post-hit hold: the ROM's
// wait after the hit grows with the HP drain, the model's `hp` command is flat (max(28, bar + 1)) for the small damages of counters 1..4.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import {
  BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES, BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES, battleResolutionCommandDuration,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { battleHealthBarAnimationFrames } from "../src/engine/healthboxAssembly.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

type Ev = { frame: number; name: string };
const events = (JSON.parse(readFileSync("tools/audio/fixtures/aud242o-rollout5-player.json", "utf8")) as { events: Ev[] }).events;
const first = (name: string, from = 0) => events.find((e) => e.name === name && e.frame > from)!.frame;
const all = (name: string) => events.filter((e) => e.name === name).map((e) => e.frame);

const mon = (battler: 0 | 1, maxHP: number) => ({
  species: speciesStats.species.find((s) => s.name === "SPECIES_RATTATA")!.id, speciesSymbol: "RATTATA", name: "RATTATA", level: 100,
  hp: maxHP, maxHP, gender: "male", status: "none", side: battler === 0 ? "player" : "trainer", battler, personality: 0, otId: 0,
  partyIndex: 0, moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0,
});
const field = ((maxHP: number) => ({ player: mon(0, 105), opponent: mon(1, maxHP) }) as unknown as BattleResolutionDisplayedField);
const hpCommand = (from: number, to: number) => Object.freeze({
  type: "hp", eventSequence: 1, battler: 1, from, to, healthValue: from - to, timing: Object.freeze({ minimumFrames: 28 }),
}) as unknown as BattleResolutionPresentationCommand;

describe("rol1: the five-turn Rollout window (ROM, Scene ON)", () => {
  const mk2 = all("SE_M_MEGA_KICK2");
  const stat = all("SE_M_STAT_INCREASE");
  const headbutt = events.filter((e) => e.name === "SE_M_HEADBUTT").map((e) => e.frame).filter((f, i, a) => i === 0 || f - a[i - 1] > 1);

  it("the ROM's Rollout bodies shrink exactly like the model's (HEADBUTT -> MEGA_KICK2 spacing equals the body-length deltas)", () => {
    const rom = mk2.map((f, i) => f - headbutt[i]!);
    expect(rom).toEqual([89, 89, 83, 75, 67]);
    const bodies = [1, 2, 3, 4, 5].map((c) => liveMoveAnimationDuration(
      { moveId: 205, attacker: 0, target: 1, turn: 0, power: 30, damage: 8, friendship: 0, multihit: 0, rolloutCounter: c } as BattleMoveAnimationRequest, field(201)));
    expect(bodies).toEqual([167, 167, 161, 153, 145]);
    expect(bodies.map((b) => b! - bodies[0]!)).toEqual(rom.map((r) => r - rom[0]!));
  });

  it("ROM turn period is constant (597 / 598) although the body shrinks: the post-MEGA_KICK2 span grows by 0 / 2 / 7 / 16", () => {
    const period = [0, 1, 2, 3].map((i) => stat[i + 1]! - stat[i]!);
    expect(period).toEqual([597, 598, 597, 598]);
    const postHit = [0, 1, 2, 3].map((i) => stat[i + 1]! - mk2[i]!);
    expect(postHit).toEqual([287, 289, 294, 303]);
    expect(postHit.map((p) => p - postHit[0]!)).toEqual([0, 2, 7, 16]);
    // Everything up to and including the hit sound is fixed: stat SE -> HEADBUTT 220/221, MEGA_KICK2 -> SE_EFFECTIVE 67.
    expect(mk2.map((f) => first("SE_EFFECTIVE", f - 1) - f)).toEqual([67, 67, 67, 67, 67]);
    expect(stat.map((f) => first("SE_M_HEADBUTT", f) - f)).toEqual([221, 220, 220, 220, 220]);
  });

  it("the model's hp command is flat for the small damages (floor 28) and only grows once the bar frames exceed it", () => {
    // Lv100 Rattata (max HP 201): ROM drain starts +104 after the hit sound and clears at drain + bar + ~15 (measured per counter: 23 / 24 / 30 / 37).
    const maxHp = 201;
    const duration = (damage: number) => battleResolutionCommandDuration(hpCommand(maxHp, maxHp - damage), field(maxHp));
    for (const damage of [8, 9, 14, 21]) {
      expect(battleHealthBarAnimationFrames({ maxHp, from: maxHp, to: maxHp - damage }) + 1).toBeLessThan(28);
      expect(duration(damage)).toBe(28);
    }
    const big = 38;
    expect(duration(big)).toBe(battleHealthBarAnimationFrames({ maxHp, from: maxHp, to: maxHp - big }) + 1);
    expect(duration(big)).toBeGreaterThan(28);
  });

  it("hpd2: a locked player's chained turn waits 8 frames longer than the menu handoff (ROM: BattleTurnPassed -> script start 13 / 13 / 13 / 12, box blank 15 vs 7)", () => {
    // tools/integration/hpd2Probe.py (per-frame gBattleMainFunc / gBattlescriptCurrInstr, Scene ON and OFF): the player is auto-confirmed, so the foe's
    // selection (HandleTurnActionSelectionState, 9 frames) and SetActionsAndBattlersTurnOrder / RunTurnActionsFunctions (3) sit between the turn end and the next print.
    expect(BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES - BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES).toBe(8);
    expect(BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES).toBe(14);
  });
});
