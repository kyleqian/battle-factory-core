// ISSUES #148: replay ordinary generated-rental routes through the PRODUCTION orchestrator (Scene ON) and record the battler
// x2 history input (liveBattlerX2History.ts) the presentation hands every presented move body at its activation edge.
// A body's input CHANGES vs the pre-#148 species rest when the tracker zeroes a side whose species rest is non-zero
// (opponent ONIX / RATTATA). Parity: the same route with Scene OFF has equal rules (except the scene bit), RNG, boundaries.
// usage: node --experimental-strip-types --no-warnings tools/integration/x2TrackerRouteReplay.ts <out.json> <seed>...
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { fileURLToPath } from "node:url";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { LiveBattlerX2History, LiveBattlerX2Side } from "../../src/engine/liveBattlerX2History.ts";

export interface X2TrackerRouteBody {
  key: string; moveId: number; attacker: LiveBattlerX2Side; opponent: string; opponentRestX2: number; live: boolean;
  zeroed: readonly LiveBattlerX2Side[]; historyAfterBody: LiveBattlerX2History | undefined; inputChanged: boolean;
}

const PATTERNS: (0 | 1 | 2 | 3)[][] = [[0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [1, 2, 3, 0, 1, 2, 3, 0, 1, 2]];

export function x2TrackerRouteReplay(seed: number) {
  const slots = PATTERNS[seed % 2]!;
  const bodies: X2TrackerRouteBody[] = [];
  const seen = new Set<string>();
  const on = generatedCommandAnimationReplay(seed, "on", slots, 0, true, true, (state) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (command?.type !== "move-animation" || !command.animation) return;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (seen.has(key)) return;
    seen.add(key);
    const view = createBattleResolutionPresentationRenderView(r, undefined as never);
    const opponent = view.field.opponent.name;
    const rest = speciesFrontIdleRestOffsetOrZero(opponent);
    const zeroed = r.liveMoveBattlerX2Input?.zeroed ?? [];
    bodies.push({
      key, moveId: command.animation.moveId, attacker: command.animation.attacker === 0 ? "player" : "opponent",
      opponent, opponentRestX2: rest.x2, live: liveMoveAnimationDuration(command.animation, view.field) !== null,
      zeroed, historyAfterBody: state.liveBattlerX2Host?.host.history,
      inputChanged: zeroed.includes("opponent") && (rest.x2 !== 0 || rest.y2 !== 0),
    });
  });
  const off = generatedCommandAnimationReplay(seed, "off", slots, 0, true, true);
  // Gameplay parity as tests/animation/liveRandom2R1MoveAdapters.test.ts: rules except the scene bit (hitMarker 0x80), RNG, boundary.
  type Boundary = (typeof on.boundaries)[number];
  const logic = (b: Boundary) => JSON.stringify({
    rules: { ...b.rules, rulesContext: { ...b.rules.rulesContext, hitMarker: b.rules.rulesContext.hitMarker & ~0x80 } },
    rng: b.rng, boundary: b.boundary,
  });
  const restBodies = bodies.filter((body) => body.opponentRestX2 !== 0);
  return {
    seed, slots, frames: on.frame, stalled: on.stalled, bodies: bodies.length,
    bodiesWithRestSpeciesOpponent: restBodies.length,
    inputChanged: bodies.filter((body) => body.inputChanged).length,
    inputChangedLive: bodies.filter((body) => body.inputChanged && body.live).length,
    restBodiesUnknownOpponentAfter: restBodies.filter((body) => body.historyAfterBody?.opponent === "unknown").length,
    parity: {
      boundaries: on.boundaries.length,
      onOffLogicRngBoundaryEqual: on.boundaries.length === off.boundaries.length
        && on.boundaries.every((b, i) => logic(b) === logic(off.boundaries[i]!)),
    },
    restSpeciesBodies: restBodies,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [outPath, ...seedArgs] = process.argv.slice(2);
  const routes = seedArgs.map(Number).map((seed) => {
    const route = x2TrackerRouteReplay(seed);
    console.log(seed, JSON.stringify({ ...route, restSpeciesBodies: undefined }));
    return route;
  });
  writeFileSync(outPath!, JSON.stringify({ schema: "x2-tracker-route-replay/v1", routes }, null, 1) + "\n");
}
