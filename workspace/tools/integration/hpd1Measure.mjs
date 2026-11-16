// hpd1: measure the post-hit hold of a hpd1 window (docs/hpd1-hp-hold.md). usage: node hpd1Measure.mjs <rom-dir> [<app-dir>]
// (rom-dir holds oracle-NNNNN.png, app-dir app-NNNNN.png; app-dir defaults to rom-dir, e.g. a full `npm run compare` output)
// Events per stream (oracle = ROM, app): bar = frames the foe's HP bar pixels (x 40..104, y 33..35) change; menu = first frame
// after the last bar change whose bottom box (y 113..158) equals the final frame's (the next action menu).
import {PNG} from 'pngjs'; import fs from 'fs';
const romDir = process.argv[2], appDir = process.argv[3] ?? romDir;
const count = (dir, pre) => fs.readdirSync(dir).filter((f) => f.startsWith(pre + '-')).length;
const n = Math.min(count(appDir, 'app'), count(romDir, 'oracle'));
const rd = (pre, i) => PNG.sync.read(fs.readFileSync(`${pre === 'oracle' ? romDir : appDir}/${pre}-${String(i).padStart(5, '0')}.png`)).data;
const diffCount = (a, b) => { let c = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) c++; return c; };
const reg = (d, x0, y0, x1, y1) => { const o = []; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * 240 + x) * 4; o.push(d[k], d[k + 1], d[k + 2]); } return Buffer.from(o).toString('base64'); };
function measure(pre) {
  const bar = [], box = [], hb = [];
  for (let i = 0; i < n; i++) { const d = rd(pre, i); bar.push(reg(d, 40, 33, 104, 36)); box.push(reg(d, 0, 113, 240, 158)); hb.push(reg(d, 13, 15, 113, 45)); }
  // drain steps: small (<= 8 px) changes of the bar rows; blink: the last healthbox flash (>= 500 px) before the first drain step
  const changed = []; for (let i = 1; i < n; i++) if (bar[i] !== bar[i - 1] && diffCount(Buffer.from(bar[i], 'base64'), Buffer.from(bar[i - 1], 'base64')) <= 24) changed.push(i);
  const barStart = changed[0], barEnd = changed[changed.length - 1];
  let blink = null; for (let i = barStart - 1; i > 0; i--) if (diffCount(Buffer.from(hb[i], 'base64'), Buffer.from(hb[i - 1], 'base64')) >= 1200) { blink = i; } else if (blink !== null && barStart - i > 60) break;
  const final = box[n - 1];
  let menu = null; for (let i = barEnd; i < n; i++) if (box[i] === final) { menu = i; break; }
  // text clear: first frame after barEnd where the box differs from its frame at barEnd (the next print/clear)
  let boxChange = null; for (let i = barEnd + 1; i < n; i++) if (box[i] !== box[barEnd]) { boxChange = i; break; }
  return { blink, barStart, barEnd, barFrames: barEnd - barStart + 1, changes: changed.length, boxChange, menu };
}
const rom = measure('oracle'), app = measure('app');
const row = (k, a, b) => `${k}: rom ${a} app ${b} rom-app ${a - b}`;
const res = { rom, app, deltas: {
  blinkToBarStart: (rom.barStart - rom.blink) - (app.barStart - app.blink),
  blinkToMenu: (rom.menu - rom.blink) - (app.menu - app.blink),
  barStartToBoxChange: (rom.boxChange - rom.barStart) - (app.boxChange - app.barStart),
  barEndToBoxChange: (rom.boxChange - rom.barEnd) - (app.boxChange - app.barEnd),
  barStartToMenu: (rom.menu - rom.barStart) - (app.menu - app.barStart),
  barEndToMenu: (rom.menu - rom.barEnd) - (app.menu - app.barEnd),
  barFrames: rom.barFrames - app.barFrames } };
console.log(JSON.stringify(res));
