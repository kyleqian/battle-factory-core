// words57: the deferred replay runs in ENTRY labels (the marker's activation is the lend, rho of spriteOrderEntryLabelRelabel); battle units
// (faint / summary / send-out, Roar / Whirlwind, the AI recall) replayed from the lend must lend what the real-slot host lends. Every
// pre-history (none, an opponent KO, Roar either side, the AI recall, a player faint + forced party menu, a voluntary switch, a cancelled
// menu, combinations) x every continuation: prints SAME / DIFF per pair and a total.
// usage: node --experimental-strip-types --no-warnings tools/integration/words57RhoCheck.ts
import { applySpriteOrderPresentationEvent as ap, createSpriteOrderTracker, spriteOrderTrackerLend, type SpriteOrderPresentationEvent as E } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
const run = (t: any, evs: E[]) => evs.reduce((x, e) => ap(x, e), t);
const cyc: E[] = [{ kind: "action-prompt" }, { kind: "actions-committed" }];
const ko: E[] = [{ kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" }, { kind: "next-mon-send-out" }];
const fsw = (side: "player"|"opponent"): E[] => [{ kind: "forced-switch-out", side }, { kind: "switch-in-start", side }, { kind: "switch-in-finish", side }];
const ais: E[] = [{ kind: "switch-out", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" }, { kind: "next-mon-send-out" }];
const pre: E[][] = [[], [...cyc, { kind: "move-animation", moveId: 33, attackerSide: "player" }, { kind: "hit-animation", targetVisible: true }, ...ko],
  [...cyc, { kind: "move-animation", moveId: 46, attackerSide: "player" }, ...fsw("opponent")],
  [...cyc, { kind: "move-animation", moveId: 46, attackerSide: "opponent" }, ...fsw("player")],
  [...cyc, ...ais],
  [...cyc, { kind: "move-animation", moveId: 33, attackerSide: "player" }, { kind: "hit-animation", targetVisible: true }, ...ko, ...cyc, ...ais]];
const post: E[][] = [[...cyc, { kind: "move-animation", moveId: 33, attackerSide: "player" }, { kind: "hit-animation", targetVisible: true }, ...ko, ...cyc],
  [...cyc, { kind: "move-animation", moveId: 46, attackerSide: "player" }, ...fsw("opponent"), ...cyc],
  [...cyc, { kind: "move-animation", moveId: 18, attackerSide: "opponent" }, ...fsw("player"), ...cyc],
  [...cyc, ...ais, ...cyc]];
for (const [i, p] of pre.entries()) for (const [j, q] of post.entries()) {
  const real = run(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")), [...p, ...cyc]);
  const L = spriteOrderTrackerLend(real);
  if (!L) { console.log(i, j, "pre lend null", real.invalidReason); continue; }
  const a = spriteOrderTrackerLend(run(real, q));
  const b = spriteOrderTrackerLend(run(createSpriteOrderTracker({ known: true, free: L, pendingDestroyed: [] }), q));
  console.log(i, j, "battlers", JSON.stringify(real.battlerSlots), JSON.stringify(real.occupantRoles), a && b ? (JSON.stringify(a) === JSON.stringify(b) ? "SAME" : "DIFF") : `null a=${!!a} b=${!!b}`);
}
// party-menu shapes before the words activation (player faint forced menu; voluntary switch; cancelled menu)
const pf: E[] = [...cyc, { kind: "move-animation", moveId: 33, attackerSide: "opponent" }, { kind: "hit-animation", targetVisible: true }, { kind: "faint", side: "player" },
  { kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: false }, { kind: "switch-in-start" }, { kind: "switch-in-finish" }];
const vs: E[] = [{ kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: true }, { kind: "switch-out" }, { kind: "switch-in-start" }, { kind: "switch-in-finish" }];
const cm: E[] = [{ kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: true }];
let n = 0, same = 0;
for (const p of [pf, vs, [...cm, ...cyc], [...pf, ...post[0]!], [...vs, ...cyc, ...ais], [...cyc, ...fsw("opponent"), ...cyc, ...ko]]) for (const q of [...post, [...post[0]!, ...post[3]!], [...post[1]!, ...post[0]!], [...post[2]!, ...post[1]!, ...post[0]!]]) {
  const real = run(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")), [...p, ...cyc]);
  const L = spriteOrderTrackerLend(real);
  if (!L) { console.log("pre lend null", real.invalidReason); continue; }
  const a = spriteOrderTrackerLend(run(real, q));
  const b = spriteOrderTrackerLend(run(createSpriteOrderTracker({ known: true, free: L, pendingDestroyed: [] }), q));
  n++; if (a && b && JSON.stringify(a) === JSON.stringify(b)) same++; else console.log("DIFF/null", JSON.stringify(real.battlerSlots), JSON.stringify(real.occupantRoles), !!a, !!b);
}
console.log("party-menu pre:", same, "/", n, "SAME");
