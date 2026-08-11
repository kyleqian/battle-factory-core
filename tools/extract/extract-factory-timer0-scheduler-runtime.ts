// Hermetic validator/canonicalizer for the fresh mGBA Timer 0 runtime receipt.
// The emulator-backed producer remains tools/probe/trace-factory-construction-rng.py;
// this script lets Tier 1 validate and regenerate the committed derived JSON.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a path`);
  return value;
}

type Dma = { channel: number; nextCount: number; when: number; deadlineDelta: number };
type Window = {
  kind: string;
  timer0CurrentEvent: { name: string; priority: number; scheduledWhen: number; cyclesLate: number; schedulerCurrentTime: number };
  timer0Entry: { scheduler: { currentTime: number }; dma: Dma[] };
  timer0Exit: { dma: Dma[] };
  requestOrder: Array<{ fifo: string; dmaChannel: number }>;
  completionOrder: number[];
  afterCompletion: { scheduler: { currentTime: number }; dma: Dma[] };
};
type Receipt = { schema: string; oracleProfile: string; windows: Window[] };

const input = resolve(argument("--input"));
const output = resolve(argument("--out"));
const receipt = JSON.parse(readFileSync(input, "utf8")) as Receipt;

if (receipt.schema !== "factory-timer0-scheduler-runtime/v1") throw new Error(`unexpected schema ${receipt.schema}`);
if (receipt.oracleProfile !== "battle-scene-off") throw new Error(`unexpected profile ${receipt.oracleProfile}`);
if (receipt.windows.map((window) => window.kind).join(",") !== "isolated-dual-refill,video-co-due-dual-refill") {
  throw new Error("receipt must contain the canonical isolated and Video-co-due windows");
}
for (const window of receipt.windows) {
  const event = window.timer0CurrentEvent;
  if (event.name !== "GBA Timer 0" || event.priority !== 32) throw new Error(`${window.kind}: wrong Timer 0 event`);
  if (event.schedulerCurrentTime - event.scheduledWhen !== event.cyclesLate) {
    throw new Error(`${window.kind}: cyclesLate does not match the absolute scheduler boundary`);
  }
  if (window.timer0Entry.dma.map((dma) => dma.channel).join(",") !== "0,1,2,3") {
    throw new Error(`${window.kind}: incomplete DMA0-3 state`);
  }
  if (window.requestOrder.map((request) => request.dmaChannel).join(",") !== "1,2") {
    throw new Error(`${window.kind}: wrong request order`);
  }
  if (window.completionOrder.join(",") !== "1,2") throw new Error(`${window.kind}: wrong completion order`);
  if (window.timer0Exit.dma[1].when !== event.scheduledWhen || window.timer0Exit.dma[2].when !== event.scheduledWhen) {
    throw new Error(`${window.kind}: FIFO DMA deadlines do not equal Timer 0's corrected deadline`);
  }
  if (window.afterCompletion.scheduler.currentTime - window.timer0Entry.scheduler.currentTime !== 18) {
    throw new Error(`${window.kind}: live DMA graph no longer completes after 18 master cycles`);
  }
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`validated and wrote ${output}`);
