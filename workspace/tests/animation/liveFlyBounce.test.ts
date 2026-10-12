import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "../../src/engine/battleResolutionPresentation.ts";
import {
  applyLiveSemiInvulnerableCommand, createBattleResolutionPresentationRenderView, LIVE_SEMI_INVULNERABLE_NONE,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
  liveSemiInvulnerableHideBattler,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Extra } from "../helpers/iu120Rows.ts";
const lastIndex = <T>(items: readonly T[], predicate: (item: T) => boolean): number => {
  for (let i = items.length - 1; i >= 0; i -= 1) if (predicate(items[i]!)) return i;
  return -1;
};

// docs/next-adapters-prep11.md s0.2 / s2.3: Fly (19) / Bounce (340) charge + strike bodies by request.turn, and the
// presentation-only semi-invulnerable hide across the turn gap. Dense framebuffer proofs:
// tools/integration/fixtures/flybounce-live/*.json; turn-gap pixel proof tools/integration/flyBounceTurnGap.ts
// (receipt tools/integration/fixtures/flybounce-live-receipt.json).
const request = (moveId: number, attacker: 0 | 1, turn: number): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const moveAnimation = (battler: 0 | 1, animation?: BattleMoveAnimationRequest) => ({
  type: "move-animation", eventSequence: 1, battler, ...(animation ? { animation } : {}), timing: { minimumFrames: 1 },
}) as unknown as BattleResolutionPresentationCommand;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live Fly / Bounce adapters", () => {
  it("registers both moves with per-turn durations and row-0 shadow rows", () => {
    for (const id of [19, 340]) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(19, attacker, 0))).toBe(43);
      expect(liveMoveAnimationDuration(request(19, attacker, 1))).toBe(68);
      expect(liveMoveAnimationDuration(request(340, attacker, 0))).toBe(64);
      expect(liveMoveAnimationDuration(request(340, attacker, 1))).toBe(55);
    }
  });

  it("builds body-only configs from request.turn without an order lend", () => {
    const field = displayed("SWELLOW", "ONIX");
    const fly = (turn: number) => liveMoveAnimationPresentation(request(19, 0, turn), field, 0)!.config as any;
    expect(fly(0)).toMatchObject({ move: "FLY", turn: "charge", animationAgeOffset: -8 });
    expect(fly(1)).toMatchObject({ move: "FLY", turn: "strike", animationAgeOffset: -11 });
    expect(fly(0).controllerProfile.hitReactionFirstAge).toBe(Number.POSITIVE_INFINITY);
    const bounce = (attacker: 0 | 1, turn: number) =>
      liveMoveAnimationPresentation(request(340, attacker, turn), displayed("PONYTA", "SPOINK"), 0)!.config as any;
    expect(bounce(0, 0)).toMatchObject({ move: "BOUNCE", turn: "charge", animationAgeOffset: -8 });
    expect(bounce(0, 1)).toMatchObject({ turn: "strike", animationAgeOffset: -7, strikeEffectDelay: 4, strikeAttackerRestoreAge: 20 });
    expect(bounce(1, 1)).toMatchObject({ turn: "strike", animationAgeOffset: -7, strikeEffectDelay: 0 });
    expect(bounce(1, 1).strikeAttackerRestoreAge).toBeUndefined();
  });

  it("hides only after a live charge body; the strike, receipts, faints and switches restore it", () => {
    expect(liveSemiInvulnerableHideBattler(request(19, 0, 0))).toBe(0);
    expect(liveSemiInvulnerableHideBattler(request(340, 1, 0))).toBe(1);
    expect(liveSemiInvulnerableHideBattler(request(19, 0, 1))).toBeNull();
    // Dig (prep18): the setup body hides its attacker like a Fly/Bounce charge; the unleash restores it.
    expect(liveSemiInvulnerableHideBattler(request(91, 0, 0))).toBe(0);
    expect(liveSemiInvulnerableHideBattler(request(91, 1, 0))).toBe(1);
    expect(liveSemiInvulnerableHideBattler(request(91, 0, 1))).toBeNull();
    const charged = applyLiveSemiInvulnerableCommand(LIVE_SEMI_INVULNERABLE_NONE, moveAnimation(0, request(19, 0, 0)));
    expect(charged).toEqual([true, false]);
    // The other battler's body (live or the Scene OFF pause) leaves the hidden sprite hidden.
    expect(applyLiveSemiInvulnerableCommand(charged, moveAnimation(1, request(33, 1, 0)))).toBe(charged);
    expect(applyLiveSemiInvulnerableCommand(charged, moveAnimation(1))).toBe(charged);
    expect(applyLiveSemiInvulnerableCommand(charged, { type: "turn-end" } as never)).toBe(charged);
    // The battler's own next body (the strike, or any other / non-live body) restores it.
    expect(applyLiveSemiInvulnerableCommand(charged, moveAnimation(0, request(19, 0, 1)))).toEqual([false, false]);
    expect(applyLiveSemiInvulnerableCommand(charged, moveAnimation(0))).toEqual([false, false]);
    for (const type of ["sprite-visibility", "faint", "switch-in", "switch-out"]) {
      expect(applyLiveSemiInvulnerableCommand(charged, { type, battler: 0 } as never)).toEqual([false, false]);
      expect(applyLiveSemiInvulnerableCommand(charged, { type, battler: 1 } as never)).toEqual([true, false]);
    }
    // Scene OFF carries no MOVE_ANIMATION request: the pause never hides.
    expect(applyLiveSemiInvulnerableCommand(LIVE_SEMI_INVULNERABLE_NONE, moveAnimation(0))).toBe(LIVE_SEMI_INVULNERABLE_NONE);
  });

  // Generated-rental routes (prep11 s4): one input; the locked strike turn runs without an action prompt.
  const routes = [
    { move: "FLY 38/7 SWELLOW", id: 19, seed: 38, slot: 0 as const, streak: 7, rows: [43, 68] },
    { move: "BOUNCE 65/7 PONYTA", id: 340, seed: 65, slot: 1 as const, streak: 7, rows: [64, 55] },
  ];
  it.each(routes)("completes ordinary $move: both bodies live, attacker hidden across the gap, ON/OFF rules and RNG", r => {
    const frames: { kind: string; playerHidden: boolean | null }[] = [];
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak, false, false, state => {
      const res = state.battleResolutionPresentation;
      if (res) {
        const view = createBattleResolutionPresentationRenderView(res);
        frames.push({
          kind: view.effect?.type === "move" ? `move:${view.effect.request.moveId}:t${view.effect.request.turn}`
            : view.effect?.type === "hit" ? "hit" : "resolution",
          playerHidden: !view.visibility.player.sprite,
        });
      } else if (state.battleCommandPresentation) {
        frames.push({ kind: `command:${state.battleCommandPresentation.lifecycle.phase}`,
          playerHidden: !state.battleCommandPresentation.spriteVisibility.player });
      } else frames.push({ kind: "other", playerHidden: null });
    });
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual(r.rows.map(n => n + iu120Extra(r.id)));
    for (const body of bodies) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    const chargeLast = lastIndex(frames, f => f.kind === `move:${r.id}:t0`);
    const strikeFirst = frames.findIndex(f => f.kind === `move:${r.id}:t1`);
    expect(strikeFirst - chargeLast - 1).toBeGreaterThan(200);
    expect(frames.slice(chargeLast + 1, strikeFirst).every(f => f.playerHidden === true)).toBe(true);
    // Before the charge and after the strike the attacker is drawn (only the opponent's hit-reaction blink hides it).
    expect(frames.slice(0, frames.findIndex(f => f.kind === `move:${r.id}:t0`)).some(f => f.playerHidden === true)).toBe(false);
    expect(frames.slice(lastIndex(frames, f => f.kind === `move:${r.id}:t1`) + 1)
      .every(f => f.playerHidden !== true || f.kind === "hit")).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.state.battleCommandPresentation?.spriteVisibility.player).toBe(true);
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 240000);
});
