import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import {
  applyLiveSemiInvulnerableCommand, LIVE_SEMI_INVULNERABLE_NONE, type LiveSemiInvulnerableHidden,
} from "../src/engine/battleResolutionPresentationRender.ts";
import type { BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import {
  liveDiveSetupSplashBirth, liveDiveWordsPlanText, liveDiveWordsPostFree, liveMoveHiddenSides, LIVE_WORDS_ORDER_DEFERRED_REPLAY,
  liveWordsOrderDeferredCarry,
} from "../src/engine/liveMoveAnimation.ts";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords } from "../src/engine/liveMovePresentationRng.ts";
import {
  advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, markLiveSpriteOrderDeferredBody, type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngState } from "../src/engine/presentationRng.ts";
import { createPresentationRngHostAt, type PresentationRngWords } from "../src/engine/presentationRngHost.ts";
import {
  decodeSpriteOrderPlan, resolveSpriteOrderDeferredLend, type SpriteOrderDeferredLend, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../src/engine/spriteOrderProductionPlans.ts";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import { WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits.ts";

// S10A land68 (docs/land68-dive-substitute-fade.md; evidence docs/next-adapters-prep65.md): Dive 291 is a Random2-words order unit, setup
// (291) and unleash (choosetwoturnanim, 10291). Its post-body free order follows its own droplet / bubble words, so it has no plan row;
// liveDiveWordsPlanText rebuilds each body's whole plan from the words the presentation host recorded. Vectors:
// tools/integration/fixtures/land68/dive-vectors.json (tools/integration/land68DiveVectors.ts over prep61Probe.py --only DIVE,HIDDENHIT,
// two fresh direct-mGBA runs per job, A == B; units.json sha256 == fixtures/prep65/units.sha256). Receipts: fixtures/prep65/.
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
type Side = "player" | "opponent";
interface Body {
  job: string; key: string; label: string; frame: number; turn: 0 | 1; side: Side; species: { player: number; opponent: number }; ramAt: number;
  words: { words: number[]; draws: number[][] }; F0: number[]; plan: string; strayFChanges: number; windows: { C: number[]; D: number[]; F: number[] }[];
}
interface Route {
  job: string; side: Side; species: { player: number; opponent: number }; setupKey: string; unleashKey: string; setupF0: number[];
  units: SpriteOrderPresentationEvent[]; unleashF0: number[]; next: { label: string; frame: number; F0: number[] } | null;
}
const vectors = fixture("land68/dive-vectors.json") as { bodies: Body[]; routes: Route[] };
const hostWords = fixture("prep65/host-words.json") as { exact: number; total: number; results: { label: string; verdict: string }[] };
const check = fixture("prep65/check.json") as { summary: Record<string, number> };
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const wordsOf = (body: Body) => body.words as unknown as PresentationRngWords;

/** prep61Check's checkUnit: the production cursor through every allocation window; created / destroyed / F equal the ROM; no survivors. */
function perFrameExact(body: Body, text: string): boolean {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: body.F0, pendingDestroyed: [] });
  if (body.windows.length !== plan.length || body.strayFChanges !== 0) return false;
  let cursor = start;
  for (let k = 0; k < plan.length; k += 1) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = body.windows[k]!;
    if (!cursor.order.known) return false;
    const created = cursor.occupied.filter((slot) => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter((slot) => !cursor.occupied.includes(slot));
    if (!same(created, [...rom.C].sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r)) || !same(cursor.order.free, rom.F)) {
      return false;
    }
  }
  return cursor.occupied.filter((slot) => !start.occupied.includes(slot)).length === 0;
}

describe("land68 (prep65): Dive 291 receipts and plan vectors", () => {
  it("the committed receipts: recorded words == RAM 15 / 15; the patch check 15 / 15 bodies, 215 windows, 7 + 7 lends", () => {
    expect([hostWords.exact, hostWords.total]).toEqual([15, 15]);
    expect(hostWords.results.every((r) => r.verdict === "RECORDED == RAM")).toBe(true);
    expect(check.summary).toEqual({ bodies: 15, planEqualsRom: 15, perFrameExact: 15, allocationFrames: 215, controlOtherWordsEqual: 0, vectors: 7,
      unleashLendExact: 7, postUnleash: 7, postUnleashExact: 7, speciesFreeDeclines: 7 });
    expect(vectors.bodies.map((b) => b.label).sort()).toEqual(hostWords.results.map((r) => r.label).sort());
    expect(vectors.bodies.filter((b) => b.turn === 0).length).toBe(8);
    expect(vectors.routes.length).toBe(7);
  });

  it("Dive is a words unit with no plan row; the setup / unleash words are what the production tick seam records", () => {
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toContain(291);
    for (const key of ["291:player", "291:opponent", "10291:player", "10291:opponent"]) expect(SPRITE_ORDER_PRODUCTION_BODIES[key], key).toBeUndefined();
    for (const body of vectors.bodies) {
      const request = { moveId: 291, turn: body.turn, attacker: (body.side === "player" ? 0 : 1) as 0 | 1 };
      const field = { player: { species: body.species.player }, opponent: { species: body.species.opponent } } as never;
      const context = body.turn === 0 ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field, body.side) } : undefined;
      const words = liveMovePresentationRngWords({ key: body.key,
        host: activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(body.ramAt, "pinned")), request, body.key, context) });
      expect({ words: words?.words, draws: words?.draws }, body.key).toEqual(body.words);
      // setup: 20 droplet words; unleash: 20 droplet words, then 9 impact steps of 4 bubble words
      expect(body.words.draws.map((g) => g.length), body.key).toEqual(body.turn === 0 ? [20] : [20, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    }
  });

  it("every body's plan text == the ROM plan and is per-frame exact; another body's words never give it", () => {
    let windows = 0;
    for (const [k, body] of vectors.bodies.entries()) {
      const text = liveDiveWordsPlanText(body.turn, body.side, body.F0, wordsOf(body), body.species);
      expect(text, body.key).toBe(body.plan);
      expect(perFrameExact(body, text!), body.key).toBe(true);
      windows += body.windows.length;
      const post = liveDiveWordsPostFree({ attackerSide: body.side, turn: body.turn }, body.F0, wordsOf(body), body.species);
      expect(post, body.key).toEqual(body.windows.at(-1)!.F);
      const other = vectors.bodies.slice(k + 1).concat(vectors.bodies.slice(0, k)).find((o) => o.turn === body.turn && o.side === body.side)!;
      expect(liveDiveWordsPlanText(body.turn, body.side, body.F0, wordsOf(other), body.species), `${body.key} with ${other.key}'s words`).not.toBe(body.plan);
    }
    expect(windows).toBe(215);
    // without words / with the wrong word count the plan is unknown
    const setup = vectors.bodies.find((b) => b.turn === 0)!;
    expect(liveDiveWordsPlanText(0, setup.side, setup.F0, null, setup.species)).toBeNull();
    expect(liveDiveWordsPlanText(1, setup.side, setup.F0, wordsOf(setup), setup.species)).toBeNull();
  });

  it("lend vectors: the setup marker lends the ROM unleash lend; the nested unleash marker the ROM order after it; species-free declines", () => {
    const byKey = new Map(vectors.bodies.map((b) => [b.key, wordsOf(b)]));
    const carry = liveWordsOrderDeferredCarry((key) => byKey.get(key) ?? null, { player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } });
    let post = 0;
    for (const route of vectors.routes) {
      const setupMarker: SpriteOrderDeferredLend = { key: route.setupKey, moveId: 291, attackerSide: route.side, turn: 0, bodySpecies: route.species,
        activation: { free: route.setupF0 }, units: route.units };
      const unleashMarker: SpriteOrderDeferredLend = { key: route.unleashKey, moveId: 291, attackerSide: route.side, turn: 1, bodySpecies: route.species,
        activation: { deferred: setupMarker }, units: [] };
      expect(resolveSpriteOrderDeferredLend(setupMarker, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY), route.job).toEqual(route.unleashF0);
      if (route.next !== null) {
        expect(resolveSpriteOrderDeferredLend(unleashMarker, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY), route.job).toEqual(route.next.F0);
        post += 1;
      }
      const { bodySpecies: _s, ...speciesFree } = setupMarker;
      expect(resolveSpriteOrderDeferredLend(speciesFree, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY), route.job).toBeNull();
    }
    expect(post).toBe(7);
  });
});

describe("land68 (prep65): the order host marks, keys and hides the diver", () => {
  const ev = (sequence: number, kind: string, extra: object = {}) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const start = (): LiveSpriteOrderHost =>
    Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
  const advance = (host: LiveSpriteOrderHost, events: readonly BattleKernelSemanticEvent[]) =>
    advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY);
  const args = (move: number, turn: number) => [String(move), String(turn), "90", turn === 1 ? "30" : "0", "70", "0"];
  const body = (sequence: number, move: number, battler: 0 | 1, turn: 0 | 1) =>
    ev(sequence, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: args(move, turn) });
  const species = { player: 170, opponent: 95 };
  const lend = { known: true as const, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER };

  it("a marked setup (turn 0) arms on its 291 event and a marked unleash (turn 1) on its 10291 event; a turn-less marker never arms on 10291", () => {
    for (const battler of [0, 1] as const) {
      for (const turn of [0, 1] as const) {
        const marked = markLiveSpriteOrderDeferredBody(start(), lend, { moveId: 291, attacker: battler, turn }, `dive-${turn}`, species);
        expect(marked.deferredBody?.bodySpecies, `${battler}/${turn}`).toEqual(species);
        const after = advance(marked, [body(10, 291, battler, turn)]);
        expect(after.deferred, `${battler}/${turn}`).toMatchObject({ key: `dive-${turn}`, moveId: 291, turn, bodySpecies: species, units: [] });
        expect(after.deferredBody).toBeUndefined();
        expect(after.hidden[battler]).toBe(turn === 0);
      }
      // the old comparison (marker moveId 291 vs the event's order key 10291): a marker without the turn keys 291 and stays unarmed
      const turnless = markLiveSpriteOrderDeferredBody(start(), lend, { moveId: 291, attacker: battler }, "dive", species);
      const unarmed = advance(turnless, [body(10, 291, battler, 1)]);
      expect(unarmed.deferred).toBeUndefined();
      expect(unarmed.deferredBody).toBeDefined();
    }
  });

  it("the order host's hidden diver == the render's hide (applyLiveSemiInvulnerableCommand) through setup -> other body -> hit -> unleash", () => {
    const commandOf = (event: BattleKernelSemanticEvent): BattleResolutionPresentationCommand | null => {
      const p = event.payload as unknown as { kind: string; animationId?: string; battler: 0 | 1; target?: number; arguments?: string[]; invisible?: boolean };
      if (p.kind === "set-battler-sprite-visibility") {
        return { type: "sprite-visibility", eventSequence: event.sequence, battler: p.battler, visible: !p.invisible } as never;
      }
      if (p.animationId === "MOVE_ANIMATION") {
        return { type: "move-animation", eventSequence: event.sequence, battler: p.battler,
          animation: battleMoveAnimationRequest(p.battler, p.target ?? 1 - p.battler, p.arguments!) } as never;
      }
      return p.animationId === "HIT_ANIMATION" ? { type: "hit-animation", eventSequence: event.sequence, battler: p.battler } as never : null;
    };
    for (const battler of [0, 1] as const) {
      const foe = (1 - battler) as 0 | 1;
      const routes: BattleKernelSemanticEvent[][] = [
        // Surf from the other battler hits the diver (Dive's hidden-hit route), then the unleash
        [body(10, 291, battler, 0), body(20, 57, foe, 0), ev(21, "animation", { animationId: "HIT_ANIMATION", battler, arguments: [] }), body(30, 291, battler, 1)],
        // a status body of the other battler in the hidden window, then the unleash
        [body(10, 291, battler, 0), body(20, 104, foe, 0), body(30, 291, battler, 1)],
        // the unleash fails: the controller's show toggle (MOVEEND_ATTACKER_VISIBLE) reveals the diver
        [body(10, 291, battler, 0), ev(20, "set-battler-sprite-visibility", { battler, invisible: false })],
      ];
      for (const [r, events] of routes.entries()) {
        let visual: LiveSemiInvulnerableHidden = LIVE_SEMI_INVULNERABLE_NONE;
        for (let k = 1; k <= events.length; k += 1) {
          const command = commandOf(events[k - 1]!);
          if (command !== null) visual = applyLiveSemiInvulnerableCommand(visual, command);
          const order = advance(start(), events.slice(0, k));
          const label = `${battler} route ${r} step ${k}`;
          expect(order.hidden, label).toEqual([visual[0], visual[1]]);
          expect(order.hidden[battler], label).toBe(k < events.length);
          // a live body of the other battler inside the span is drawn without the diver (hide66's view hide)
          const request = command?.type === "move-animation" ? command.animation : undefined;
          if (request !== undefined && request.attacker === foe) {
            const view = { player: { sprite: !visual[0] }, opponent: { sprite: !visual[1] } };
            expect(liveMoveHiddenSides(view, request)[battler === 0 ? "player" : "opponent"], label).toBe(true);
          }
        }
      }
    }
  });
});
