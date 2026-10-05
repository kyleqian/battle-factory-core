// Recall group-order discrimination (docs/voluntary-switch-lend-audit.md s2.3): replays each voluntary scenario's semantic steps through the
// production tracker, but applies the switch-out recall with one of several candidate plans, and compares {F, occupancy} at the first
// activation edge after the switch-in (and every later known edge) with the ROM. The production plan (spriteOrderRecallPlanText:
// `D2,o<battler>` = particle n2 then the battler in one destroy window) is proven only if it matches and the alternatives do not.
//   npx vite-node tools/integration/voluntaryRecallOrder.ts [--write]
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderRecallPlanText, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { SCENARIOS } from "./voluntaryModelCheck.ts";

const tail = Array.from({ length: 13 }, (_, i) => `D${i + 3}`).join(";");
const head = `${"Cf;".repeat(16)}D0;D1;`;
const VARIANTS: Record<string, (slot: number) => string> = {
  production: spriteOrderRecallPlanText,
  swapped: slot => `${head}Do${slot},2;${tail}`,
  "battler-window-first": slot => `${head}Do${slot};D2;${tail}`,
  "battler-window-last": slot => `${head}D2;${tail};Do${slot}`,
};
const maskSlots = (mask: string) => { const b = BigInt(`0x${mask}`); return Array.from({ length: 64 }, (_, s) => s).filter(s => (b >> BigInt(s)) & 1n); };

const rows = [];
for (const key of Object.keys(SCENARIOS).filter(k => !k.includes("faint-ko"))) {
  const probe = JSON.parse(readFileSync(`tools/integration/fixtures/voluntary/state-${key}.json`, "utf8")) as {
    activations: { riseFrame: number; before: { order: string; mask: string } }[] };
  for (const [variant, text] of Object.entries(VARIANTS)) {
    let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    let a = 0, recalled = false, afterRecallFree: readonly number[] = [], afterSwitchInFree: readonly number[] = [];
    const edges = [];
    for (const step of SCENARIOS[key]!) {
      if (step.kind === "edge") {
        const rom = probe.activations[a++]!;
        const occupied = maskSlots(rom.before.mask);
        const romF = [...Buffer.from(rom.before.order, "hex")].filter(s => !occupied.includes(s));
        if (recalled && tracker.cursor.order.known) {
          edges.push({ riseFrame: rom.riseFrame, freeExact: JSON.stringify(tracker.cursor.order.free) === JSON.stringify(romF),
            occupiedExact: JSON.stringify(tracker.cursor.occupied) === JSON.stringify(occupied) });
        }
        continue;
      }
      if (step.kind === "switch-out") {
        const slot = tracker.battlerSlots.player!;
        const cursor = applySpriteOrderUnitPlan(tracker.cursor, decodeSpriteOrderPlan(text(slot)));
        tracker = Object.freeze({ ...tracker, cursor, lastUnit: "recall" as const, battlerSlots: { ...tracker.battlerSlots, player: null }, occupantRoles: null });
        recalled = true;
        afterRecallFree = cursor.order.free;
        continue;
      }
      tracker = applySpriteOrderPresentationEvent(tracker, step);
      if (step.kind === "switch-in-finish") afterSwitchInFree = tracker.cursor.order.free;
    }
    rows.push({ scenario: key, variant, postRecallEdges: edges.length, exactEdges: edges.filter(e => e.freeExact && e.occupiedExact).length,
      firstPostRecallEdge: edges[0] ?? null, afterRecallFreeHead: afterRecallFree.slice(0, 8).join(","),
      afterSwitchInFreeHead: afterSwitchInFree.slice(0, 8).join(",") });
  }
}
for (const r of rows) console.log(JSON.stringify(r));
if (process.argv.includes("--write")) writeFileSync("tools/integration/fixtures/voluntary/recall-order-receipt.json", JSON.stringify(rows, null, 1) + "\n");
