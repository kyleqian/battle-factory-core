// CLI for postKoTrackerRoutes.ts.
//   find:    npx vite-node tools/integration/postKoTrackerRoutesRun.ts -- find [seeds=40]
//   record:  npx vite-node tools/integration/postKoTrackerRoutesRun.ts -- record <out.json> <seed:slot,slot,...> ...
//   compare: npx vite-node tools/integration/postKoTrackerRoutesRun.ts -- compare <before.json> <after.json>
import { readFileSync, writeFileSync } from "node:fs";
import { postKoRoute } from "./postKoTrackerRoutes.ts";

type Slot = 0 | 1 | 2 | 3;
function parse(arg: string): [number, Slot[]] {
  const [seed, slots] = arg.split(":");
  return [Number(seed), (slots ? slots.split(",").map(Number) : []) as Slot[]];
}

{
  const [mode, ...rest] = process.argv.slice(2).filter(arg => arg !== "--");
  if (mode === "find") {
    for (let seed = 0; seed < Number(rest[0] ?? 40); seed += 1) {
      for (const slot of [0, 1, 2, 3] as const) {
        let route;
        try { route = postKoRoute(seed, Array(8).fill(slot)); } catch { continue; }
        const later = route.bodies.filter(body => body.afterSendOut);
        if (later.length === 0) continue;
        console.log(JSON.stringify({ seed, slot, sendOuts: route.sendOuts.length, playerFaints: route.playerFaints.length, later: later.length,
          laterTrackerKnown: later.filter(body => body.pureTrackerKnown).length, laterLent: later.filter(body => body.lent).length,
          parity: route.parity, hostVsPure: { ...route.hostVsPure, mismatches: route.hostVsPure.mismatches.length } }));
        break;
      }
    }
  } else if (mode === "record") {
    const [out, ...routes] = rest;
    writeFileSync(out!, `${JSON.stringify(routes.map(arg => postKoRoute(...parse(arg))), null, 1)}\n`);
  } else if (mode === "compare") {
    const [a, b] = rest.map(path => JSON.parse(readFileSync(path!, "utf8")) as ReturnType<typeof postKoRoute>[]);
    for (let index = 0; index < a!.length; index += 1) {
      const x = a![index]!, y = b![index]!;
      console.log(JSON.stringify({ seed: x.seed, slots: x.slots, decisionsIdentical: JSON.stringify(x.decisions) === JSON.stringify(y.decisions),
        parityBefore: x.parity, parityAfter: y.parity, hostVsPureBefore: x.hostVsPure, hostVsPureAfter: y.hostVsPure,
        laterBodies: y.bodies.filter(body => body.afterSendOut).length,
        laterTrackerKnown: y.bodies.filter(body => body.afterSendOut && body.pureTrackerKnown).length }));
    }
  }
}
