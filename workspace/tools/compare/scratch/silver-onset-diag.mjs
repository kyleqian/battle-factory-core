import { createInitialState, tick, render } from "../../../src/engine/core.ts";
import { traceAdvances } from "../traceReplay.ts";
import traceJson from "../traces/factory-brain-silver-walkup-speech-flicker-off.json" with { type: "json" };
import { APP_STAGES } from "../appTrace.ts";

const trace = traceJson;
let state = createInitialState({ appRoute: trace.appRoute });
let frame = 0;
const applyStage = () => {
  if (!trace.appStage || trace.appStage.frame !== frame) return;
  const stage = APP_STAGES[trace.appStage.id];
  state = stage(state);
};
applyStage();
const frames = new Map();
const capture = () => {
  frames.set(frame, render(state));
};
capture();
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  applyStage();
  capture();
}
const f78 = frames.get(78);
const f79 = frames.get(79);
let diffCount = 0;
let minY = 999, maxY = -1, minX=999,maxX=-1;
for (let y=0;y<160;y++){
  for (let x=0;x<240;x++){
    const off=(y*240+x)*4;
    if (f78[off]!==f79[off]||f78[off+1]!==f79[off+1]||f78[off+2]!==f79[off+2]){
      diffCount++;
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    }
  }
}
console.log("app frame78->79 diff pixels:", diffCount, "bbox", minX,minY,maxX,maxY);
// sample some diff pixel colors
for (const [x,y] of [[0,159],[0,27],[120,0],[0,100]]) {
  const off=(y*240+x)*4;
  console.log(`(${x},${y}) f78=`, f78[off],f78[off+1],f78[off+2], " f79=", f79[off],f79[off+1],f79[off+2]);
}
