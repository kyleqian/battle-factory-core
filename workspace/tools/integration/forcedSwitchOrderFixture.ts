// forced-switch: compact hermetic fixture for tests/forcedSwitchContinuation.test.ts from the prep11Probe PREP11_ALWAYS=1 raw output
// (ROM sSpriteOrder-derived free orders at E+3 / after each unit).  node --experimental-strip-types tools/integration/forcedSwitchOrderFixture.ts <rawDir> > tools/integration/fixtures/forced-switch/order-check.json
import { readFileSync, readdirSync } from "node:fs";
const dir = process.argv[2]; const out: any = {};
for (const name of readdirSync(dir).filter(n => n.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${dir}/${name}`, "utf8"));
  const E = d.bodies.find((b: any) => b.move === 46 || b.move === 18).end;
  const occAt = (f: number) => { const s = new Set<number>(); for (const e of d.spawns) if (e.f <= f) { if (e.ev === "+") s.add(e.slot); else s.delete(e.slot); } return s; };
  const orderAt = (f: number): number[] => { let o: number[] = d.orderSeries[0][1]; for (const [g, od] of d.orderSeries) if (g <= f) o = od; return o; };
  const freeAt = (f: number) => { const occ = occAt(f); return orderAt(f).filter((s: number) => !occ.has(s)); };
  const freed = d.spawns.find((e: any) => e.ev === "-" && e.f >= E + 3 && e.f <= E + 6);
  const ball = d.spawns.find((e: any) => e.ev === "+" && e.f >= E + 9 && e.f <= E + 13).f;
  const lastFree = Math.max(...d.spawns.filter((e: any) => e.ev === "-" && e.f > ball).map((e: any) => e.f));
  out[name.replace(/\.json$/, "")] = { E, battlerSlot: freed.slot, freedAt: freed.f - E, ballAt: ball - E, lastFreeAt: lastFree - E,
    pre: { free: freeAt(E + 3), occupied: [...occAt(E + 3)].sort((a, b) => a - b) },
    afterFree: freeAt(freed.f + 1), afterStart: freeAt(ball + 2), afterParticles: freeAt(lastFree + 1) };
}
console.log(JSON.stringify(out));
