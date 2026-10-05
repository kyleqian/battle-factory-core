// prep9: production reducer BG-blend schedules (bgPaletteBlendY / Sunny Day palette.coefficient) per source age, for prep9PaletteBlendCheck.py.
//   node --experimental-strip-types tools/integration/prep9BlendSchedule.ts > tools/integration/fixtures/prep9-blend-schedule.json
import { absorbAtAge } from "../../src/animation/absorb.ts";
import { megaDrainAtAge } from "../../src/animation/megaDrain.ts";
import { gigaDrainAtAge } from "../../src/animation/gigaDrain.ts";
import { sunnyDayAtAge } from "../../src/animation/sunnyDay.ts";
const c = { x: 72, y: 96 }, t = { x: 176, y: 42 };
const out: Record<string, any> = {};
out["71"] = Array.from({ length: 210 }, (_, a) => absorbAtAge(a, t, c, "player", c).bgPaletteBlendY);
out["72"] = Array.from({ length: 220 }, (_, a) => megaDrainAtAge(a, t, c, "player", c).bgPaletteBlendY);
out["202"] = Array.from({ length: 232 }, (_, a) => gigaDrainAtAge(a, t, c, "player", c).bgPaletteBlendY);
const g = { centerX: 72, centerY: 96, cornerX: 40, cornerY: 56 };
out["241"] = Array.from({ length: 160 }, (_, a) => sunnyDayAtAge(a, { attackerSide: "player", targetSide: "opponent", attackerSpecies: "A", targetSpecies: "B", attackerGeometry: g, targetGeometry: g, raySlots: [3, 4, 5, 7], spriteOrder: Array.from({ length: 64 }, (_, i) => i), paletteBanks: { background: [1, 2, 3], attackerPartner: 17 } }).palette.coefficient);
console.log(JSON.stringify(out));
