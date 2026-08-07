import { minimizeAtAge, minimizeScaleAtAge, minimizeClonesAtAge, minimizeY2FromScale } from "../../src/animation/minimize.ts";

const frames = 210;
const expected: Record<number, number> = {
  211: 296, 214: 416, 217: 536, 226: 896, 233: 1176, 242: 1536,
  243: 256, 244: 256, 245: 296, 276: 1536, 277: 256, 279: 296,
  310: 1536, 311: 1536, 343: 1536, 344: 1536, 345: 1456, 359: 336,
  360: 256, 361: 256,
};
let fail = 0;
for (const [f, scale] of Object.entries(expected)) {
  const age = Number(f) - frames;
  const got = minimizeScaleAtAge(age);
  if (got !== scale) { console.log(`scale mismatch frame ${f} age ${age}: got ${got} want ${scale}`); fail++; }
}
// Clone slots at spawn+0..2: all prior clones still alive. At frame 211 age1: [0].
// At frame 214 age4: clone0 (lifetime13) + clone1(16) = indices [0,1].
const spawnChecks: Record<number, number[]> = {
  211: [0], 212: [0], 214: [0,1], 217: [0,1,2], 245: [0], 248: [0,1], 251: [0,1,2], 279: [0], 282: [0,1], 285: [0,1,2],
};
for (const [f, indices] of Object.entries(spawnChecks)) {
  const age = Number(f) - frames;
  const clones = minimizeClonesAtAge(age);
  const got = clones.map(c => c.index);
  if (JSON.stringify(got) !== JSON.stringify(indices)) {
    console.log(`clone mismatch frame ${f} age ${age}: got ${got} want ${indices}`);
    fail++;
  }
}
// live-count schedule: data[6] 1,2,3 then 2 at +16, 1 at +19, 0 at +22 (cycle1)
const countChecks: Record<number, number> = { 211:1, 214:2, 217:3, 226:3, 227:2, 230:1, 233:0 };
for (const [f, count] of Object.entries(countChecks)) {
  const age = Number(f) - frames;
  const clones = minimizeClonesAtAge(age);
  if (clones.length !== count) { console.log(`count mismatch frame ${f}: got ${clones.length} want ${count}`); fail++; }
}
const y2checks: Record<number, number> = { 256: 0, 296: 3, 336: 5, 376: 6, 416: 8, 456: 9, 496: 10, 536: 10, 576: 11, 816: 14, 1496: 17, 1536: 17, 1456: 16 };
for (const [scale, y2] of Object.entries(y2checks)) {
  const got = minimizeY2FromScale(Number(scale));
  if (got !== y2) { console.log(`y2 mismatch scale ${scale}: got ${got} want ${y2}`); fail++; }
}
const blendOn = minimizeAtAge(151).blendActive;
const blendOff = minimizeAtAge(152).blendActive;
if (!blendOn || blendOff) { console.log(`blend wrong at 151=${blendOn} 152=${blendOff}`); fail++; }
const taskAt150 = minimizeAtAge(150).visualTaskCount;
const taskAt151 = minimizeAtAge(151).visualTaskCount;
if (taskAt150 !== 1 || taskAt151 !== 0) { console.log(`task count wrong at 150=${taskAt150} 151=${taskAt151}`); fail++; }
// matrix frozen at spawn: clone at age 1 matrix 256, age 4 matrix 376, age 7 matrix 496
const matrixChecks: Record<number, number[]> = { 1: [256], 4: [256, 376], 7: [256, 376, 496] };
for (const [age, mats] of Object.entries(matrixChecks)) {
  const clones = minimizeClonesAtAge(Number(age));
  const got = clones.map(c => c.matrix);
  if (JSON.stringify(got) !== JSON.stringify(mats)) { console.log(`matrix mismatch age ${age}: got ${got} want ${mats}`); fail++; }
}
console.log(fail === 0 ? "ALL CHECKS PASS" : `${fail} FAILURES`);
