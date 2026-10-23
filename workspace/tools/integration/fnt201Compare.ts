// fnt201 (docs/fnt201-faint-timing.md): the ROM's faint-script anchors (fixtures/fnt201/rom-rows.json, fnt201RomRows.py) vs production's command timeline.
//   anchor = the end of the HP drain (ROM execIdle) when the command before the faint is an `hp` command, else the first glyph of the preceding print (ROM prevGlyph);
//   sink   = production faint start + timing.leadFrames (ROM `anim`, dofaintanimation's controller busy); glyph = the next message's first glyph (ROM `glyph`).
//   node --experimental-strip-types --no-warnings tools/integration/fnt201Compare.ts [case...]
import { readFileSync } from "node:fs";
import { production } from "./fnt201Production.ts";
import { productionFor } from "./sst200Compare.ts";

type Rom = { prevGlyph: number | null; execIdle: number; cry: number; anim: number; animRows: number; glyph: number; script: string };
export const ROM_ROWS = JSON.parse(readFileSync(new URL("./fixtures/fnt201/rom-rows.json", import.meta.url), "utf8")) as Record<string, Rom[]>;
export const CASES = ["ko-foe", "ko-player", "selfdestruct-both", "selfdestruct-onix", "selfdestruct-survivor", "memento", "sandstorm-shedinja", "toxic-shedinja"] as const;

export function romFor(name: string, scene: "on" | "off"): Rom {
  const key = name === "memento" ? `sst200-memento-s11.json-${scene}-r1.json` : `fnt201-${name}-s11.json-${scene}-r1.json`;
  return ROM_ROWS[key]![0]!;
}

export function productionRows(name: string, scene: "on" | "off") {
  if (name === "memento") return productionFor("memento", scene, 2).rows;
  return production(name, scene, 1).rows;
}

export function compare(name: string, scene: "on" | "off") {
  const rom = romFor(name, scene);
  const rows = productionRows(name, scene);
  const fi = rows.findIndex((r: any) => r.type === "faint");
  const faint = rows[fi] as any;
  let pi = fi - 1;
  while (rows[pi]!.type === "sprite-visibility" || rows[pi]!.type === "status") pi -= 1;
  const prev = rows[pi]!;
  const isHp = prev.type === "hp";
  const anchor = isHp ? prev.start + prev.dur : prev.start;
  const romAnchor = isHp ? rom.execIdle : rom.prevGlyph!;
  const sink = faint.start + (faint.timing.leadFrames ?? 0);
  const glyph = rows.slice(fi + 1).find((r: any) => r.type === "message")!.start;
  return {
    name, scene, anchorKind: isHp ? "hp-end/idle" : "print-glyph", sinkBlock: faint.timing.sink,
    toSink: { rom: rom.anim - romAnchor, production: sink - anchor },
    toGlyph: { rom: rom.glyph - rom.anim, production: glyph - sink },
    total: { rom: rom.glyph - romAnchor, production: glyph - anchor },
  };
}

if (process.argv[1]?.endsWith("fnt201Compare.ts")) {
  for (const name of process.argv.length > 2 ? process.argv.slice(2) : CASES) for (const scene of ["off", "on"] as const) {
    try {
      const c = compare(name, scene);
      const f = (x: { rom: number; production: number }) => `${x.rom}/${x.production}/${x.production - x.rom}`;
      console.log(name.padEnd(22), scene.padEnd(4), c.anchorKind.padEnd(12), "toSink", f(c.toSink).padEnd(10), "toGlyph", f(c.toGlyph).padEnd(10), "total", f(c.total));
    } catch (e) { console.log(name.padEnd(22), scene.padEnd(4), "production not stageable:", (e as Error).message.split("\n")[0]); }
  }
}
