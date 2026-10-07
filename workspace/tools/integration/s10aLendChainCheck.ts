/**
 * S10A design check for the seam-resolved deferred lend (docs/s10a-random2-order-lend-blocker.md design 1): carry Ice Ball body k's TRUE
 * activation order through the body (carryLiveSpriteOrder + the corpus SortSprites keys), take its free order, apply the PRODUCTION tracker's
 * plans for the units that follow (variants below), and compare spriteOrderTrackerLend with body k+1's ROM activation free order. Transitions
 * after a KO (occupancy change, or a replacement battler slot whose lend is relabelled to entry labels) are reported, not compared. "hit" alone is the control (the foe's body matters).
 * usage: npx vite-node tools/integration/s10aLendChainCheck.ts OUT.json [altIceBall.json:player|opponent ...]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import { carryLiveSpriteOrder } from "../../src/engine/liveMoveOamAssembler.ts";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend, type SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
process.env.PREP26_LIB = "1";
const { loadBodies } = await import("./prep26IceBallCheck.ts");
type Json = Record<string, any>;
const keysOf = (row: Json) => row.sprites.map((sp: Json) => ({ slot: sp.slot, attr: sp.attr, subpriority: sp.subpriority, visible: true, oamY: sp.attr[0] & 0xff }));
const variants: Record<string, (s: "player" | "opponent") => SpriteOrderPresentationEvent[]> = {
  "hit,foe-body,hit": (s) => [{ kind: "hit-animation", targetVisible: true }, { kind: "move-animation", moveId: 33, attackerSide: s === "player" ? "opponent" : "player" }, { kind: "hit-animation", targetVisible: true }],
  "hit,prompt,foe-body,hit": (s) => [{ kind: "hit-animation", targetVisible: true }, { kind: "action-prompt" }, { kind: "actions-committed" }, { kind: "move-animation", moveId: 33, attackerSide: s === "player" ? "opponent" : "player" }, { kind: "hit-animation", targetVisible: true }],
  "hit,foe-body,hit,prompt": (s) => [{ kind: "hit-animation", targetVisible: true }, { kind: "move-animation", moveId: 33, attackerSide: s === "player" ? "opponent" : "player" }, { kind: "hit-animation", targetVisible: true }, { kind: "action-prompt" }, { kind: "actions-committed" }],
  "hit": () => [{ kind: "hit-animation", targetVisible: true }],
};
const files: [string, "player" | "opponent"][] = [[resolve("tools/compare/fixtures/ice-ball/player-dense.json.gz"), "player"], [resolve("tools/compare/fixtures/ice-ball/opponent-dense.json.gz"), "opponent"],
  ...process.argv.slice(3).map((s) => s.split(":") as [string, "player" | "opponent"])];
const out: Json[] = [];
for (const [file, side] of files) {
  const bodies: Json[][] = loadBodies(file);
  for (let k = 0; k + 1 < bodies.length; k += 1) {
    const rows = bodies[k]!, occupied = new Set(rows[0]!.sprites.map((s: Json) => s.slot));
    let order: readonly number[] = rows[0]!.spriteOrder;
    for (const row of rows) order = carryLiveSpriteOrder(order, keysOf(row), sortGbaSpriteOrder);
    const post = order.filter((s) => !occupied.has(s));
    const next = bodies[k + 1]![0]!.spriteOrder as number[], nextOcc = new Set(bodies[k + 1]![0]!.sprites.map((s: Json) => s.slot));
    const want = next.filter((s) => !nextOcc.has(s));
    const results: Record<string, string> = {};
    const res = Object.entries(variants).map(([name, ev]) => {
      // Battler sprite slots from the body's own animationBattlers (a replacement after a KO sits in another slot, e.g. 5).
      const ids = rows[0]!.animationBattlers.spriteIds as number[];
      let t = createSpriteOrderTracker({ known: true, free: post, pendingDestroyed: [] }, { player: ids[0]!, opponent: ids[1]! });
      for (const e of ev(side)) t = applySpriteOrderPresentationEvent(t, e);
      const lend = spriteOrderTrackerLend(t);
      results[name] = lend === null ? `null:${t.invalidReason}` : JSON.stringify(lend) === JSON.stringify(want) ? "EXACT" : "diff";
      return `${name}=${results[name]}`;
    });
    // Compared only at the entry occupancy: after a KO the production lend is relabelled to entry labels (spriteOrderTrackerLend rho), so a raw
    // ROM comparison does not apply (and a KO + send-in between the bodies is not modelled here).
    const ids = rows[0]!.animationBattlers.spriteIds as number[];
    const compared = [...nextOcc].every((s) => occupied.has(s)) && nextOcc.size === occupied.size && ids[0] === 6 && ids[1] === 8;
    out.push({ scenario: file.split("/").pop(), transition: `b${k + 1}->b${k + 2}`, compared, results });
    console.log(file.split("/").pop(), `b${k + 1}->b${k + 2}`, JSON.stringify([...nextOcc].sort((a, b) => a - b)), res.join(" "));
  }
}
writeFileSync(process.argv[2]!, `${JSON.stringify({ schema: "s10a-lend-chain-check/v1", transitions: out }, null, 1)}\n`);
