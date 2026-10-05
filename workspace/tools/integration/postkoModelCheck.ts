// Post-KO model check (docs/postko-consumer-audit.md s2): replays the production sprite-order tracker
// (src/engine/spriteOrderEventTransform.ts) + the proposed uncovered-unit plans (tools/integration/spriteOrderUncoveredReplay.ts UNIT_PLANS:
// faint D o<battler>, summary, nextSendOut) over the SEMANTIC event list of each postko BattleLab scenario (written from the scenario's
// battle script: who moves, hit, faint, send-out; never from observed masks), and compares at every move/anim activation edge the
// predicted {free order F, occupied set, battler slots} and the s1.3 post-send-out constants {matrix bitmap 0x3, battler matrices
// player 1 / opponent 0, empty task table} with the ROM state on the frame before the rise (tools/integration/postkoStateProbe.py).
//   CLI: npx vite-node tools/integration/postkoModelCheckRun.ts -- <scenario-key> <probe.json> [--write]
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, knownEntrySpriteOrderState, type SpriteOrderPlan } from "../../src/engine/spriteOrderProvider.ts";
import { UNIT_PLANS } from "./spriteOrderUncoveredReplay.ts";

type Side = "player" | "opponent";
type Step = SpriteOrderPresentationEvent | { kind: "faint"; side: Side } | { kind: "summary" } | { kind: "send-out" }
  | { kind: "edge"; label: string; postKo: boolean };
const P: Step = { kind: "action-prompt" }, C: Step = { kind: "actions-committed" }, HIT: Step = { kind: "hit-animation", targetVisible: true };
const body = (moveId: number, attackerSide: Side): Step => ({ kind: "move-animation", moveId, attackerSide });
const edge = (label: string, postKo = true): Step => ({ kind: "edge", label, postKo });
/** Turn 1 of both scenarios: player NINETALES Flamethrower KOs the SHEDINJA lead (slower, never moves); the AI sends out the next mon. */
const TURN1: Step[] = [P, C, edge("53:player", false), body(53, "player"), HIT, { kind: "faint", side: "opponent" }, { kind: "summary" }, { kind: "send-out" }];
export const SCENARIOS: Record<string, Step[]> = {
  // turn 2: player Flamethrower (faster) -> new SLOWBRO; SLOWBRO Double Team (+1 evasion stat animation).
  "postko-flamethrower-doubleteam": [...TURN1, P, C, edge("53:player"), body(53, "player"), HIT, edge("104:opponent"), body(104, "opponent"),
    edge("stat:opponent"), { kind: "stat-animation", argument: 21 }],
  // turn 2: JOLTEON Thunderbolt (faster) -> player; player's Rock Tomb misses (no animation). turn 3: Thunderbolt, PRZ status animation on
  // the player, player Rock Tomb -> JOLTEON, -1 speed stat animation.
  "postko-rocktomb-thunderbolt": [...TURN1, P, C, edge("85:opponent"), body(85, "opponent"), HIT, P, C, edge("85:opponent"), body(85, "opponent"), HIT,
    edge("status:PRZ:player"), { kind: "status-animation", status: "PRZ" }, edge("317:player"), body(317, "player"), HIT, edge("stat:opponent"),
    { kind: "stat-animation", argument: 17 }],
  // turn 2: JUMPLUFF (faster) Giga Drain -> player, player Double Team (+1 evasion stat animation); turn 3: Giga Drain, player Swift.
  "postko-doubleteam-swift-gigadrain": [...TURN1, P, C, edge("202:opponent"), body(202, "opponent"), HIT, edge("104:player"), body(104, "player"),
    edge("stat:player"), { kind: "stat-animation", argument: 21 }, P, C, edge("202:opponent"), body(202, "opponent"), HIT, edge("129:player"),
    body(129, "player"), HIT],
  // turn 2: player Double Team (faster; first body after the send-out), +1 evasion stat animation, SLOWBRO Swift -> player;
  // turn 3: player Swift -> SLOWBRO, SLOWBRO Swift.
  "postko-doubleteam-swift": [...TURN1, P, C, edge("104:player"), body(104, "player"), edge("stat:player"), { kind: "stat-animation", argument: 21 },
    edge("129:opponent"), body(129, "opponent"), HIT, P, C, edge("129:player"), body(129, "player"), HIT, edge("129:opponent"), body(129, "opponent"), HIT],
  // turn 2: player Light Screen (faster), GOLEM Rock Slide misses (no animation); turn 3: player Protect (+4 priority), Rock Slide blocked (no animation).
  "postko-lightscreen-protect-rockslide": [...TURN1, P, C, edge("113:player"), body(113, "player"), P, C, edge("182:player"), body(182, "player")],
};

const SUMMARY = decodeSpriteOrderPlan(UNIT_PLANS.summary), SENDOUT = decodeSpriteOrderPlan(UNIT_PLANS.nextSendOut);
const maskSlots = (mask: string) => { const b = BigInt(`0x${mask}`); return Array.from({ length: 64 }, (_, s) => s).filter(s => (b >> BigInt(s)) & 1n); };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function modelCheck(key: string, probe: { activations: { riseFrame: number; before: Record<string, unknown> }[] }) {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const battler: Record<Side, number | null> = { player: 6, opponent: 8 };
  let last = "entry";
  const plan = (p: SpriteOrderPlan) => {
    const cursor = applySpriteOrderUnitPlan(tracker.cursor, p);
    tracker = { ...tracker, cursor, promptPair: null };
  };
  const edges: Record<string, unknown>[] = [];
  let a = 0;
  for (const step of steps) {
    if (step.kind === "edge") {
      const rom = probe.activations[a++];
      if (!rom) { edges.push({ label: step.label, missingInRom: true }); continue; }
      const b = rom.before as { order: string; mask: string; battlerSprites: number[]; battlerMatrix: (number | null)[]; bitmap: string; tasks: string[] };
      const occupied = maskSlots(b.mask);
      const order = [...Buffer.from(b.order, "hex")];
      const romF = order.filter(s => !occupied.includes(s));
      const known = tracker.cursor.order.known;
      const predicted = { free: known ? [...tracker.cursor.order.free] : null, occupied: known ? [...tracker.cursor.occupied] : null,
        battlerSlots: [battler.player, battler.opponent] };
      const constants = step.postKo ? { bitmap: "3", battlerMatrix: [1, 0], tasks: [] } : { bitmap: "6", battlerMatrix: [1, 2], tasks: [] };
      const checks = {
        free: known && same(predicted.free, romF), occupied: known && same(predicted.occupied, occupied),
        battlerSlots: same(predicted.battlerSlots, b.battlerSprites), bitmap: b.bitmap === constants.bitmap, tasks: same(b.tasks, constants.tasks),
        // battler matrices are only readable while the battler sprite is affine (attr0 bit 8); null = not affine at that frame
        battlerMatrix: b.battlerMatrix.every((m, i) => m === null || m === constants.battlerMatrix[i]),
      };
      edges.push({ label: step.label, riseFrame: rom.riseFrame, known, promptPair: tracker.promptPair, checks,
        mismatches: Object.values(checks).filter(v => !v).length, predicted, rom: { free: romF, occupied, battlerSlots: b.battlerSprites,
          battlerMatrix: b.battlerMatrix, bitmap: b.bitmap, tasks: b.tasks }, constants,
        // what a rung-2 lend would hand the consumer at this edge (tracker known, no prompt pair): the tracker's own F + occupancy view
        rung2Lend: known && tracker.promptPair === null ? { free: predicted.free, occupied: predicted.occupied, battlerSlots: predicted.battlerSlots,
          matrixBitmap: constants.bitmap, battlerMatrices: constants.battlerMatrix } : null });
    } else if (step.kind === "faint") {
      const slot = battler[step.side]!;
      plan([{ D: [["o", slot]] }]); battler[step.side] = null; last = "faint";
    } else if (step.kind === "summary") {
      plan(SUMMARY); last = "summary";
    } else if (step.kind === "send-out") {
      if (last !== "summary") throw new Error("send-out without summary");
      plan(SENDOUT);
      const survivors = tracker.cursor.survivors[tracker.cursor.units - 1] ?? [];
      if (survivors.length !== 1) throw new Error(`send-out survivors ${survivors.length}`);
      battler.opponent = survivors[0]!; last = "send-out";
    } else {
      tracker = applySpriteOrderPresentationEvent(tracker, step);
    }
  }
  return { scenario: key, edges, edgeCount: edges.length, mismatchedEdges: edges.filter(e => (e.mismatches as number) > 0 || e.missingInRom).length,
    romActivations: probe.activations.length, invalidReason: tracker.invalidReason };
}
