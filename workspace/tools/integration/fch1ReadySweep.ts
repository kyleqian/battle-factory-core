// fch1: the engine's first accepted faint-dismiss A on an fsc2m lab: sweep the single A of the faint print and report the earliest frame whose SE 114 appears.
//   node --experimental-strip-types --no-warnings tools/integration/fch1ReadySweep.ts <lab-name> <from> <to>
import "../../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";

const [name, from, to] = [process.argv[2]!, Number(process.argv[3]), Number(process.argv[4])];
const { applyTraceStage } = (await import("../compare/appTrace.ts")) as any;
const base: any = applyTraceStage({ appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: `${name}.json` } }, createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" }));
for (let f = from; f <= to; f += 1) {
  const presses = new Set([1, 2, 21, 22, f]);
  let state: any = base;
  let se16 = -1;
  let se114 = -1;
  for (let frame = 1; frame <= f + 60 && se114 < 0; frame += 1) {
    const result = collectSoundTick(state.frame + 1, () => tick(state, new Set(presses.has(frame) ? ["A" as const] : [])));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === 16 && se16 < 0 && frame > 100) se16 = e.frame;
    for (const e of result.events) if (e.kind === "se" && e.id === 114) se114 = e.frame;
  }
  if (se114 >= 0) { console.log(`${name}: SE16 ${se16}, first accepted A ${f}, SE114 ${se114} (A+${se114 - f})`); break; }
}
