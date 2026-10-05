// Semantic event history of the post-KO BattleLab scenarios (tools/integration/postkoModelCheck.ts SCENARIOS, written from each
// scenario's battle script, never from masks) in the two production input forms:
//   * presentation events for the pure tracker (spriteOrderEventTransform.ts): faint / party-summary-next + -hide / next-mon-send-out;
//   * BattleKernelSemanticEvent payload turns for the live host replay (postkoHostReplay.ts), recorded into the post-KO dense fixtures
//     as `precedingTurns` (the harness replays them through the production host; docs/postko-consumer-audit.md §4).
//   npx vite-node tools/integration/postkoLendHistory.ts -- --write    (re)records `precedingTurns` into the 13 post-KO fixtures
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
import { SCENARIOS } from "./postkoModelCheck.ts";
import type { PostKoSemanticPayload, PostKoTurn } from "./postkoHostReplay.ts";

type Step = (typeof SCENARIOS)[string][number];
export type PostKoTrackerStep = SpriteOrderPresentationEvent | { kind: "edge"; label: string; index: number };

/** Production tracker events of `key`, with one `edge` marker (model-check edge index) before each activation. */
export function postkoTrackerSteps(key: string): PostKoTrackerStep[] {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  let edge = 0;
  return steps.flatMap((step: Step): PostKoTrackerStep[] => {
    if (step.kind === "edge") return [{ kind: "edge", label: step.label, index: edge++ }];
    if (step.kind === "summary") return [{ kind: "party-summary-next" }, { kind: "party-summary-hide" }];
    if (step.kind === "send-out") return [{ kind: "next-mon-send-out" }];
    return [step as SpriteOrderPresentationEvent];
  });
}

const STATUS_BITS: Record<string, number> = { PRZ: 0x40, PSN: 0x8, SLP: 0x1 };

/** Semantic payload turns of `key` up to and including the body after model-check edge `edgeIndex` (one turn per prompt). */
export function postkoTurnsToEdge(key: string, edgeIndex: number): PostKoTurn[] {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  const turns: PostKoSemanticPayload[][] = [];
  let edge = -1, sideOfEdge: 0 | 1 = 0, lastAttacker: 0 | 1 = 0, done = false;
  const push = (payload: PostKoSemanticPayload) => turns[turns.length - 1]!.push(Object.freeze(payload));
  for (const step of steps) {
    if (done) break;
    switch (step.kind) {
      case "action-prompt": turns.push([]); break;
      case "actions-committed": break;
      case "edge": edge += 1; sideOfEdge = step.label.endsWith(":opponent") ? 1 : 0; break;
      case "move-animation": {
        const battler = step.attackerSide === "player" ? 0 : 1;
        lastAttacker = battler;
        push({ kind: "animation", animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(step.moveId), "0", "0", "0", "0", "0"] });
        if (edge === edgeIndex) done = true;
        break;
      }
      case "hit-animation": push({ kind: "animation", animationId: "HIT_ANIMATION", battler: 1 - lastAttacker, target: 1 - lastAttacker, arguments: [] }); break;
      case "stat-animation": push({ kind: "animation", animationId: "STATS_CHANGE", battler: sideOfEdge, target: sideOfEdge, arguments: [String(step.argument)] }); break;
      case "status-animation": push({ kind: "status-animation", battler: sideOfEdge, isStatus2: 0, status: STATUS_BITS[step.status]! }); break;
      case "general-animation": push({ kind: "animation", animationId: step.animation, battler: 0, target: 0, arguments: [] }); break;
      case "faint": push({ kind: "faint-animation", battler: step.side === "player" ? 0 : 1 }); break;
      case "summary": push({ kind: "draw-party-status-summary", battler: 1 }); push({ kind: "hide-party-status-summary", battler: 1 }); break;
      case "send-out": push({ kind: "switch-in-animation", battler: 1, partyIndex: 1 }); break;
      default: throw new Error(`unmapped step ${step.kind}`);
    }
  }
  if (!done) throw new Error(`edge ${edgeIndex} of ${key} has no body`);
  return turns.map(events => Object.freeze({ events: Object.freeze(events) }));
}

export const POSTKO_DENSE_FIXTURES = ["flamethrower-player", "rock-tomb-player", "thunderbolt-opponent", "giga-drain-opponent",
  "double-team-player", "swift-player", "swift-opponent", "light-screen-player", "protect-player", "rock-slide-opponent",
  "sunny-day-player", "dragon-dance-player", "fire-blast-player"].map(name => `tools/integration/fixtures/postko-${name}.json`);

/** Scenario key + model-check edge index of a post-KO dense fixture. */
export function postkoFixtureEdge(fixture: { modelCheck: string; edgeRiseFrame: number }, root = ".") {
  const check = JSON.parse(readFileSync(resolve(root, fixture.modelCheck), "utf8")) as { scenario: string; edges: { riseFrame?: number }[] };
  const index = check.edges.findIndex(edge => edge.riseFrame === fixture.edgeRiseFrame);
  if (index < 0) throw new Error(`edge ${fixture.edgeRiseFrame} not in ${fixture.modelCheck}`);
  return { key: check.scenario, index };
}

if (process.argv.includes("--write")) {
  for (const path of POSTKO_DENSE_FIXTURES) {
    const fixture = JSON.parse(readFileSync(path, "utf8")) as { modelCheck: string; edgeRiseFrame: number; precedingTurns?: PostKoTurn[] };
    const { key, index } = postkoFixtureEdge(fixture);
    fixture.precedingTurns = postkoTurnsToEdge(key, index);
    writeFileSync(path, JSON.stringify(fixture, null, 1) + "\n");
    console.log(path, key, index, fixture.precedingTurns.length);
  }
}
