import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  STRUGGLE_BLEND, STRUGGLE_CLEAR_MONBG, STRUGGLE_FIRST_INACTIVE, STRUGGLE_MONBG, STRUGGLE_ROWS, STRUGGLE_SPLAT, STRUGGLE_SPLAT_LIFE,
  STRUGGLE_WAVES, STRUGGLE_WAVES_DESTROYED, STRUGGLE_WAVE_ANIMS, struggleAttackerOamX2, struggleAttackerX2, struggleTargetX2, struggleWaveFrame,
} from "../src/animation/struggle.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveSubstituteDollDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

// stl109 (docs/stl109-struggle-live.md): MOVE_STRUGGLE (165) pinned against the stg107 ROM windows
// (tools/integration/fixtures/stg107/struggle-windows-on.jsonl, kind "struggle": 19 windows, 11 routes, both orientations).
type Row = {
  scenario: string; side: "player" | "opponent"; length: number;
  attacker: [number, number[]][]; target: [number, number[]][];
  regs: [number, number[]][]; tasks: [number, string[]][];
  sprites: { anim: [number, [number, number]][]; created: number; last: number; slot: number; tileTag: number; subpriority: number; orderPos: number }[];
};
const rows = readFileSync("tools/integration/fixtures/stg107/struggle-windows-on.jsonl", "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((r) => r.kind === "struggle") as Row[];
/** Forward-fill a [age, value] change list to one value per age. */
const series = <T,>(changes: [number, T][], n: number): T[] => {
  const out: T[] = []; let cur = changes[0]![1];
  for (let a = 0; a < n; a += 1) { for (const [age, v] of changes) if (age === a) cur = v; out.push(cur); }
  return out;
};
const request = (attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId: 165, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 50, damage: 20, friendship: 0, multihit: 0 });
function displayed(player: string, opponent: string, extra: { personality?: number; playerDoll?: boolean; opponentDoll?: boolean } = {}): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
    ...(extra.personality !== undefined && side === "player" ? { personality: extra.personality } : {}),
    ...((side === "player" ? extra.playerDoll : extra.opponentDoll) ? { substituteDoll: true } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const firstBodyOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!, firstBody: true });
const laterBodyOrder = (): LiveMoveSpriteOrderInput => prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!;
const present = (req: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField, order?: LiveMoveSpriteOrderInput) =>
  liveMoveAnimationPresentation(req, field, 50, undefined, undefined, order);

describe("stl109: Struggle program against the stg107 ROM rows", () => {
  it("has the 19 ROM windows, every one 111 frames from the activation (112 production rows)", () => {
    expect(rows).toHaveLength(19);
    expect(new Set(rows.map((r) => r.side))).toEqual(new Set(["player", "opponent"]));
    for (const r of rows) expect(r.length).toBe(STRUGGLE_FIRST_INACTIVE);
    expect(STRUGGLE_ROWS).toBe(112);
    expect(liveMoveAnimationDuration(request(0))).toBe(112);
    expect(liveMoveAnimationDuration(request(1))).toBe(112);
  });

  it("event ages: monbg 7, blend / waves 10, waves destroyed 75, splat 76..85, clearmonbg 87", () => {
    expect([STRUGGLE_MONBG, STRUGGLE_BLEND, STRUGGLE_WAVES, STRUGGLE_WAVES_DESTROYED, STRUGGLE_SPLAT, STRUGGLE_SPLAT_LIFE, STRUGGLE_CLEAR_MONBG])
      .toEqual([7, 10, 10, 75, 76, 10, 87]);
    for (const r of rows) {
      // setalpha at 10, blend off at 87 (clearmonbg + blendoff): the register change rows from 9 on; the monbg BG cnt write (7 or 8,
      // absent when the value is unchanged) is the only earlier change.
      expect(r.regs.map(([age]) => age).filter((age) => age > STRUGGLE_MONBG + 1)).toEqual([STRUGGLE_BLEND, STRUGGLE_CLEAR_MONBG]);
      expect(r.regs.map(([age]) => age).filter((age) => age > 0 && age <= STRUGGLE_MONBG + 1).every((age) => age === STRUGGLE_MONBG || age === STRUGGLE_MONBG + 1)).toBe(true);
      expect(r.regs.map(([age]) => age).filter((age) => age > 0 && age <= STRUGGLE_MONBG + 1).length).toBeLessThanOrEqual(1);
      expect(r.regs.at(-2)![1].slice(0, 2)).toEqual([16192, 2060]); // BLDCNT 0x3f40, BLDALPHA 0x080c
      expect(r.regs.at(-1)![1].slice(0, 2)).toEqual([0, 0]);
      expect(r.sprites).toHaveLength(3);
      const [w0, w1, splat] = r.sprites as [Row["sprites"][number], Row["sprites"][number], Row["sprites"][number]];
      expect([w0.created, w0.last, w1.created, w1.last]).toEqual([STRUGGLE_WAVES, STRUGGLE_WAVES_DESTROYED - 1, STRUGGLE_WAVES, STRUGGLE_WAVES_DESTROYED - 1]);
      expect([splat.created, splat.last]).toEqual([STRUGGLE_SPLAT, STRUGGLE_SPLAT + STRUGGLE_SPLAT_LIFE - 1]);
      expect([w0.slot, w1.slot, splat.slot]).toEqual([3, 4, 3]);
    }
  });

  it("attacker x2 change rows (RAM) equal the ROM rows for all 19 windows: frameDelay 4 shake from 10 to 64", () => {
    for (const r of rows) {
      const fromProgram: [number, number][] = [];
      for (let a = 0; a < STRUGGLE_FIRST_INACTIVE; a += 1) if (a === 0 || struggleAttackerX2(a) !== struggleAttackerX2(a - 1)) fromProgram.push([a, struggleAttackerX2(a)]);
      const base = r.attacker[0]![1][0]!; // the species' own x2 residue (idle rest); the shake is relative to it
      expect(fromProgram).toEqual(r.attacker.map(([a, v]) => [a, v[0]! - base]));
    }
  });

  it("the OAM-before-RunTasks one-row rule: the OAM carries the previous row's x2 (only the creating row's synchronous first step is early)", () => {
    expect(struggleAttackerOamX2(STRUGGLE_WAVES - 1)).toBe(0);
    expect(struggleAttackerOamX2(STRUGGLE_WAVES)).toBe(-3); // sequence[0]: the creating row's synchronous first step
    expect(struggleAttackerX2(STRUGGLE_WAVES)).toBe(-3);
    for (let a = STRUGGLE_WAVES + 1; a < STRUGGLE_ROWS; a += 1) expect(struggleAttackerOamX2(a)).toBe(struggleAttackerX2(a - 1));
    // The ROM rows: the OAM x2 change rows are the RAM rows + 1 (15, 20, ..., 65 were the 1,238..1,663 px rows before the rule).
    const oamChanges: number[] = [];
    for (let a = 1; a < STRUGGLE_ROWS; a += 1) if (struggleAttackerOamX2(a) !== struggleAttackerOamX2(a - 1)) oamChanges.push(a);
    expect(oamChanges).toEqual([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    for (const r of rows) expect(r.attacker.slice(2).map(([a]) => a + 1)).toEqual(oamChanges.slice(1));
  });

  it("target x2 change rows equal the ROM rows for all 19 windows: -3 at 76, +3 at 77, then every 2 rows, 0 at 85", () => {
    for (const r of rows) {
      const base = r.target[0]![1][0]!;
      const rom = series(r.target.map(([a, v]) => [a, v[0]! - base] as [number, number]), STRUGGLE_FIRST_INACTIVE);
      expect(Array.from({ length: STRUGGLE_FIRST_INACTIVE }, (_, a) => struggleTargetX2(a))).toEqual(rom);
    }
    expect([76, 77, 78, 79, 81, 83, 84, 85].map(struggleTargetX2)).toEqual([-3, 3, 3, -3, 3, -3, -3, 0]);
  });

  it("wave frame rows: command index 0..3 at 10 / 17 / 25 / 33, restart 42 / 50 / 58 / 66, destroyed at 75", () => {
    const change: [number, number | null][] = [];
    for (let a = 0; a < STRUGGLE_ROWS; a += 1) if (a === 0 || struggleWaveFrame(a) !== struggleWaveFrame(a - 1)) change.push([a, struggleWaveFrame(a)]);
    expect(change).toEqual([[0, null], [10, 0], [17, 1], [25, 2], [33, 3], [42, 0], [50, 1], [58, 2], [66, 3], [75, null]]);
    for (const r of rows) {
      for (const sprite of r.sprites.slice(0, 2)) {
        expect(sprite.anim.map(([a, [, cmd]]) => [a, cmd])).toEqual(change.filter(([, f]) => f !== null).slice(0, 8).map(([a, f]) => [a, f]));
      }
    }
    expect(STRUGGLE_WAVE_ANIMS[0]!.map((f) => f.tileOffset)).toEqual([0, 16, 32, 16]);
    expect(STRUGGLE_WAVE_ANIMS[1]!.map((f) => [f.tileOffset, f.hFlip])).toEqual([[16, true], [32, true], [16, true], [0, true]]);
  });

  it("registers Struggle: shadow row 0, a member of LIVE_MOVE_ANIMATION_IDS", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(165);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[165]).toBe(0);
  });
});

describe("stl109: Struggle gates", () => {
  it("is live for a known lend, both orientations, any non-shiny pair; no lend declines", () => {
    expect(present(request(0), displayed("SNORLAX", "PIDGEOT"), firstBodyOrder())?.config.move).toBe("STRUGGLE");
    expect(present(request(1), displayed("SCYTHER", "GOLBAT"), firstBodyOrder())?.config.move).toBe("STRUGGLE");
    expect(present(request(0), displayed("SNORLAX", "PIDGEOT"))).toBeNull();
  });

  it("a later body only with rest-free battlers (Return's rule): an opponent ONIX after other bodies declines; the first body is live", () => {
    expect(present(request(0), displayed("SNORLAX", "PIDGEOT"), laterBodyOrder())?.config.move).toBe("STRUGGLE");
    expect(present(request(0), displayed("DRAGONAIR", "ONIX"), laterBodyOrder())).toBeNull();
    expect(present(request(0), displayed("DRAGONAIR", "ONIX"), firstBodyOrder())?.config.move).toBe("STRUGGLE");
  });

  it("shiny battlers decline", () => {
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16 >>> 0;
    expect(present(request(0), displayed("SNORLAX", "PIDGEOT", { personality: shiny }), firstBodyOrder())).toBeNull();
  });

  it("a Substitute doll declines on either side: the defender doll (cell unproven) and the attacker doll (swap body cell unproven)", () => {
    for (const attacker of [0, 1] as const) {
      const defenderDoll = displayed("SNORLAX", "GOLBAT", attacker === 0 ? { opponentDoll: true } : { playerDoll: true });
      const attackerDoll = displayed("SNORLAX", "GOLBAT", attacker === 0 ? { playerDoll: true } : { opponentDoll: true });
      for (const field of [defenderDoll, attackerDoll]) {
        expect(liveMoveSubstituteDollDeclines(request(attacker), field)).toBe(true);
        expect(liveMoveAnimationDuration(request(attacker), field)).toBeNull();
        expect(present(request(attacker), field, firstBodyOrder())).toBeNull();
      }
    }
  });
});

// Real routes: the ordinary rental battle census.ts plays (seed 60, streak 23: the move slots rotate 0..3 least-used first, so every
// 4-PP move runs dry and the AI / the player is forced into Struggle through the kernel's CheckMoveLimitations -> BattleScript_NoMovesLeft
// path; the explicit slot lists are the least-used policy's own picks up to the Struggle turn).
const ROUTES = [
  { name: "opponent (VENUSAUR, turn 45)", seed: 60, streak: 23, slots: [...Array.from({ length: 44 }, (_, i) => i % 4), 0], attackers: [1] },
  { name: "opponent first, then the player (turn 58)", seed: 60, streak: 23,
    slots: [...Array.from({ length: 48 }, (_, i) => i % 4), 1, 2, 1, 2, 1, 2, 1, 2, 1, 1], attackers: [1, 1, 0] },
] as const;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("stl109: forced Struggle through the kernel (generated rental routes)", () => {
  for (const route of ROUTES) {
    it(`${route.name}: every Struggle body is live for all 112 rows, the turn reaches the next prompt, Scene ON / OFF logic, damage and RNG are identical`, async () => {
      const { generatedCommandAnimationReplay } = await import("../tools/integration/generatedCommandAnimationReplay.ts");
      const on = generatedCommandAnimationReplay(route.seed, "on", route.slots as never, route.streak, true, true);
      const off = generatedCommandAnimationReplay(route.seed, "off", route.slots as never, route.streak, true, true);
      expect(on.stalled).toBe(false);
      expect(off.stalled).toBe(false);
      const bodies = on.animations.filter((a) => a.moveId === 165);
      expect(bodies.map((b) => [b.attacker, b.ages.length])).toEqual(route.attackers.map((a) => [a, 112]));
      for (const body of bodies) {
        expect(body.ages).toEqual(Array.from({ length: 112 }, (_, age) => age));
        expect(body.adapterActive.every(Boolean)).toBe(true);
      }
      expect(on.requests.filter((r) => r.moveId === 165).map((r) => r.attacker)).toEqual([...route.attackers]);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(off.animations.filter((a) => a.moveId === 165)).toEqual([]); // Scene OFF presents no body (the kernel owns the rules)
      expect(off.requests.filter((r) => r.moveId === 165)).toEqual([]);
      // HP: the target's damage and the attacker's recoil events follow the MOVE_ANIMATION event, both with a real HP drop.
      const events = on.semanticEvents.map((e) => e.event as any);
      for (const requestId of new Set(on.semanticEvents.map((e) => e.requestId))) {
        const mine = on.semanticEvents.filter((e) => e.requestId === requestId).map((e) => e.event as any);
        const at = mine.findIndex((e) => e.payload?.kind === "animation" && e.payload.animationId === "MOVE_ANIMATION" && e.payload.arguments?.[0] === "165");
        if (at < 0) continue;
        const hp = mine.slice(at, at + 8).filter((e) => e.payload?.kind === "hp-change");
        expect(new Set(hp.map((e) => e.payload.battler))).toEqual(new Set([0, 1]));
        for (const e of hp) expect(e.payload.to).toBeLessThan(e.payload.from);
      }
      expect(events.length).toBeGreaterThan(0);
      // Scene ON vs OFF: the same logical events (damage, recoil, HP bar values, PP), boundaries (rules, RNG) and the same final state.
      // Sequence numbers and provenance count the presentation-only events Scene OFF drops, so compare payloads.
      const strip = (e: any) => JSON.stringify(e.event.payload);
      const ignorable = (e: any) => ["animation", "play-se", "status-animation", "set-battler-sprite-visibility"].includes(e.event.payload?.kind);
      const logical = (r: typeof on) => r.semanticEvents.filter((e) => !ignorable(e)).map(strip);
      expect(logical(on)).toEqual(logical(off));
      expect(off.boundaries).toHaveLength(on.boundaries.length);
      for (let i = 0; i < on.boundaries.length; i += 1) {
        expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
        expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
        expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
      }
    }, 240000);
  }
});
