/**
 * prep46 s2: can General_Rain (RAIN_CONTINUES) get presentation words WITHOUT moving any existing word? Checked with the production host
 * functions (src/engine/presentationRngHost.ts) over every census-like schedule below: a battle stream with faithful-random move bodies
 * (their production plans, liveMovePresentationRng.ts) activated at given frames, and General_Rain events between them.
 * - "consuming": General_Rain activated like a body (activatePresentationRngBody: its 80 draws are scheduled into the shared stream).
 * - "sub-stream": General_Rain's words = presentationRngPlanWords(host.state at its activation frame, GENERAL_RAIN_RANDOM2_PLAN), recorded under
 *   its own key, nothing scheduled (host.state / pendingDraws untouched).
 * Reported: for each schedule, whether every move body's words are byte-identical to the no-General_Rain baseline.
 * usage: node --experimental-strip-types tools/integration/prep46SubStream.ts <out.json>
 */
import { writeFileSync } from "node:fs";
import { activatePresentationRngBody, advancePresentationRngHost, createPresentationRngHost, presentationRngPlanWords, type PresentationRngHost } from "../../src/engine/presentationRngHost.ts";
import { LIVE_MOVE_RANDOM2_PLANS } from "../../src/engine/liveMovePresentationRng.ts";
import { GENERAL_RAIN_RANDOM2_PLAN } from "./prep46GeneralRain.ts";

type Ev = { frame: number; kind: "body"; moveId: number } | { frame: number; kind: "rain" };
function run(schedule: readonly Ev[], mode: "none" | "consuming" | "substream", seed: number) {
  let host: PresentationRngHost = createPresentationRngHost(seed, 0);
  const words: Record<string, readonly number[]> = {};
  const last = Math.max(...schedule.map((e) => e.frame)) + 400;
  for (let frame = 1; frame <= last; frame += 1) {
    host = advancePresentationRngHost(host);
    schedule.forEach((e, i) => {
      if (e.frame !== frame) return;
      if (e.kind === "body") {
        const r = activatePresentationRngBody(host, `move:${i}`, LIVE_MOVE_RANDOM2_PLANS[e.moveId]!);
        host = r.host; words[`move:${i}`] = r.record.words.words;
      } else if (mode === "consuming") {
        const r = activatePresentationRngBody(host, `general:${i}`, GENERAL_RAIN_RANDOM2_PLAN);
        host = r.host; words[`general:${i}`] = r.record.words.words;
      } else if (mode === "substream") {
        words[`general:${i}`] = presentationRngPlanWords(host.state, GENERAL_RAIN_RANDOM2_PLAN).words;
      }
    });
  }
  return words;
}
const moves = Object.keys(LIVE_MOVE_RANDOM2_PLANS).map(Number);
const schedules: Ev[][] = [];
for (let s = 0; s < 40; s += 1) {
  // a body every ~250-400 frames, a General_Rain end turn after every second body (deterministic per s)
  const ev: Ev[] = [];
  let frame = 30 + s;
  for (let k = 0; k < 8; k += 1) {
    ev.push({ frame, kind: "body", moveId: moves[(s * 7 + k * 3) % moves.length]! });
    frame += 250 + ((s * 13 + k * 29) % 150);
    if (k % 2 === 1) { ev.push({ frame, kind: "rain" }); frame += 130; }
  }
  schedules.push(ev);
}
let substreamIdentical = 0, consumingIdentical = 0, bodies = 0, consumingMoved = 0;
for (const [i, ev] of schedules.entries()) {
  const base = run(ev, "none", 0x1234 + i), sub = run(ev, "substream", 0x1234 + i), con = run(ev, "consuming", 0x1234 + i);
  const moveKeys = Object.keys(base);
  bodies += moveKeys.length;
  const eq = (a: Record<string, readonly number[]>) => moveKeys.every((k) => JSON.stringify(a[k]) === JSON.stringify(base[k]));
  if (eq(sub)) substreamIdentical += 1;
  if (eq(con)) consumingIdentical += 1;
  consumingMoved += moveKeys.filter((k) => JSON.stringify(con[k]) !== JSON.stringify(base[k])).length;
}
const out = { schema: "prep46-substream/v1", schedules: schedules.length, moveBodies: bodies, substreamAllMoveWordsIdentical: substreamIdentical,
  consumingAllMoveWordsIdentical: consumingIdentical, consumingMovedBodies: consumingMoved };
writeFileSync(process.argv[2]!, `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify(out));
