// forced-switch: the semantic-event sequence the engine emits after the Roar / Whirlwind MOVE_ANIMATION (what the presentation + sprite-order host consume).  node --experimental-strip-types tools/integration/forcedSwitchSemanticEvents.ts
import { readFileSync } from "node:fs";
import { prep7Replay } from "./prep7Replay.ts";
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes;
for (const [m, id] of [["ROAR", 46], ["WHIRLWIND", 18]] as const) { const r = routes[m][0];
  const rep: any = prep7Replay(r.seed, "on", [r.moves.indexOf(id)], r.streak, true);
  const evs = rep.semanticEvents.map((e: any) => e.event);
  const k = evs.findIndex((e: any) => e.payload?.animationId === "MOVE_ANIMATION" && e.payload.arguments?.length !== undefined && true);
  const i0 = evs.findIndex((e: any) => e.payload?.kind === "animation" && e.payload.animationId === "MOVE_ANIMATION" && (e.payload.arguments?.[0] === id || JSON.stringify(e.payload).includes(String(id))));
  console.log(m, "from", i0);
  for (const e of evs.slice(Math.max(0, i0), i0 + 14)) console.log("  ", e.payload.kind, e.provenance?.opcodeName ?? "", JSON.stringify(e.payload).slice(0, 170));
}
