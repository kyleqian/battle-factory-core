import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib";
import { baseConfig, paths } from "./_sw.ts";
for (const o of ["player-back", "opponent-front"] as const) {
  const rows = (JSON.parse(gunzipSync(readFileSync((paths as any)[o].dense)).toString("utf8")) as any).frames;
  const c: any = baseConfig(o, rows, rows[0].spriteOrder);
  const ai = { ...c.animationInputs, spriteOrder: "[..]" };
  console.log(JSON.stringify({ o, attacker: c.attacker.geometry, target: c.target.geometry, ai }));
}
