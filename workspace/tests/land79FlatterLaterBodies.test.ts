// land79: Flatter 260 live at LATER bodies with a known allocator history (flat77 landing; docs/land79-flatter-later-bodies.md).
// Vectors: flat77's committed qa-* windows (Quick Attack, HIT, Flatter; both sides) fed through the production hosts as the orchestrator
// feeds them (flat77Check.ts lendOf), and their first-body (entry) variants.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { liveMoveAnimationPresentation, liveMoveGeometrySpriteOrderPlanText, liveMoveHiddenSides } from "../src/engine/liveMoveAnimation.ts";
import { activateLiveMovePresentationRng, liveMovePresentationRngBodyKey, liveMoveRandom2Plan } from "../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS, LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS, prepareLiveMoveSpriteAllocator,
} from "../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder,
} from "../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngHostAt } from "../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

type Json = Record<string, any>;
const DIR = "tools/integration/fixtures/flat77/fixtures";
const SPECIES: Record<string, number> = Object.fromEntries(speciesStats.species.map((s) => [s.name.replace(/^SPECIES_/, ""), s.id]));
const load = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}-c0.json`, "utf8")) as Fixture & Json;

/** flat77Check.ts lendOf, reduced to MOVE_ANIMATION / HIT history: the lend and allocator input the orchestrator feeds the consumer. */
function chain(f: Fixture & Json, turns: Json[]) {
  const field = (liveView(f, 0) as Json).field;
  const side = f.attacker.geometry.side as "player" | "opponent";
  const species = { player: SPECIES[side === "player" ? f.attacker.species : f.target.species]!,
    opponent: SPECIES[side === "opponent" ? f.attacker.species : f.target.species]! };
  const planAt = (_s: number, _q: number, moveId: number, attackerSide: "player" | "opponent", lentFree?: readonly number[]) =>
    liveMoveGeometrySpriteOrderPlanText(moveId, attackerSide, { playerSpecies: species.player, opponentSpecies: species.opponent }, field,
      lentFree) ?? undefined;
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let allocator = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove;
  let sequence = 0;
  let lend: Json = {};
  let key = "";
  const bodies: unknown[] = [];
  turns.forEach((turn, t) => {
    const events = (turn.events as Json[]).map((payload) => Object.freeze({ sequence: sequence++, payload, provenance: undefined }) as unknown as BattleKernelSemanticEvent);
    const resolution = { resolutionId: { requestId: t + 1 }, segmentIndex: 0, segments: [{ events }] };
    host = beginLiveSpriteOrderTurn(host, t + 1, true);
    events.forEach((event, i) => {
      const p = event.payload as unknown as Json;
      const last = t === turns.length - 1 && i === events.length - 1;
      const req = p.animationId === "MOVE_ANIMATION" ? battleMoveAnimationRequest(p.battler, p.target, p.arguments) : null;
      if (last) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        lend = { spriteOrderInput: lendLiveSpriteOrder(host, req!.moveId), spriteAllocatorInput: prepareLiveMoveSpriteAllocator(allocator, req!).input };
        key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: t + 1 }, segmentIndex: 0, commandIndex: i });
        if (liveMoveRandom2Plan(req!) !== null) {
          bodies.push(...activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(f.presentationRngActivation.value, "pinned")), req!, key).bodies);
        }
        return;
      }
      if (req) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        allocator = prepareLiveMoveSpriteAllocator(allocator, req).next;
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, false, planAt);
    });
  });
  const base = createPresentationRngHostAt(createPresentationRngState(0, "pinned"));
  return { lend, allocatorKnown: allocator.historyKnown === true,
    presentationRng: { host: Object.freeze({ ...base, bodies: Object.freeze(bodies) }), key } };
}

function windowAt(name: string, variant: "chain" | "entry") {
  const f = load(name);
  const fx = variant === "chain" ? f : { ...f, precedingTurns: [{ events: [f.precedingTurns!.at(-1)!.events.at(-1)!] }], pinnedRng2: [], promptShown: [true] } as Fixture & Json;
  const c = chain(fx, fx.precedingTurns as Json[]);
  const view = (age: number) => {
    const v = liveView(fx, age) as Json;
    return { ...v, effect: { ...v.effect, ...c.lend, presentationRng: c.presentationRng } };
  };
  const presentation = (age: number, lend: Json = c.lend) => {
    const v = view(age), e = v.effect as Json;
    return liveMoveAnimationPresentation(e.request, v.field, age, e.paletteInput, lend.spriteAllocatorInput, lend.spriteOrderInput,
      e.presentationRng, e.battlerX2Input, liveMoveHiddenSides(v.visibility, e.request)) as Json | null;
  };
  return { f, c, view, presentation };
}

const LATER = ["qa-nidorina-golem-opp", "qa-nidorina-golem-ply", "qa-nidorino-snorlax-opp", "qa-nidorino-snorlax-ply"];

describe("land79 Flatter 260 later bodies (flat77 landing)", () => {
  it("claims the history only for Flatter, and only from a known host", () => {
    expect([...LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS]).toEqual([260]);
    const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove;
    const request = (moveId: number) => ({ moveId, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as const;
    expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).toContain(260);
    const known = prepareLiveMoveSpriteAllocator(provider, request(260));
    expect(known.input).toEqual({ historyKnown: true, wall: -1, sparkles: [] });
    expect(known.next).toBe(provider);
    expect(prepareLiveMoveSpriteAllocator(invalidateLiveSpriteAllocatorHost(provider), request(260)).input).toBeUndefined();
  });

  for (const name of LATER) {
    it(`${name}: later body goes live only with the allocator history; row 0 is S0 with WIN0 0 / 0`, () => {
      const w = windowAt(name, "chain");
      expect(w.c.allocatorKnown).toBe(true);
      expect((w.c.lend.spriteOrderInput as Json).known).toBe(true);
      expect((w.c.lend.spriteOrderInput as Json).firstBody === true).toBe(false);
      expect(w.c.lend.spriteAllocatorInput).toEqual({ historyKnown: true, wall: -1, sparkles: [] });
      expect(w.presentation(0)).not.toBeNull();
      expect(w.presentation(0, { spriteOrderInput: w.c.lend.spriteOrderInput })).toBeNull();
      for (const age of [0, 1, 100, 218]) {
        const reg = (w.presentation(age)!.config.animationInputs as Json).registers as Json;
        expect(reg.win0h, `age ${age}`).toBe(0);
        expect(reg.win0v, `age ${age}`).toBe(0);
      }
      const entry = windowAt(name, "entry");
      expect((entry.c.lend.spriteOrderInput as Json).firstBody).toBe(true);
      const r0 = (entry.presentation(0)!.config.animationInputs as Json).registers as Json;
      expect([r0.win0h, r0.win0v]).toEqual([240, 161]);
      expect(((entry.presentation(1)!.config.animationInputs as Json).registers as Json).win0h).toBe(0);
    });

    it(`${name}: the production renderer pixels are pinned (ROM-exact, 0 px in the flat77 probes)`, () => {
      const w = windowAt(name, "chain");
      const h = createHash("sha256");
      for (const age of [0, 3, 49, 60, 120, 180, 218]) {
        const rgba = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(rgba, w.view(age) as never);
        h.update(rgba);
      }
      expect(h.digest("hex")).toBe(PIXELS[name]);
    });
  }
});

const PIXELS: Record<string, string> = {
  "qa-nidorina-golem-opp": "de20ca2d4971ed0f37501e125073c120959e3ce747e2d0f2d08e6cb7d59bc8b1",
  "qa-nidorina-golem-ply": "3dd184b7860545e1d381903542a170c895f760e87876c9f08fbbb7ccf86e8eea",
  "qa-nidorino-snorlax-opp": "7841786fcbc017871357b83dae09f365f8b4dc164f355601ff46d81b8a2c24a9",
  "qa-nidorino-snorlax-ply": "edc11d25e6ac6aed30cf1a163df5f06bc0a992d637de104c7f182e629c429f2e",
};
