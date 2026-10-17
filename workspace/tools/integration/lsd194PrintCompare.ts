// lsd194 (docs/lsd194-print-floor-and-drain.md): the ROM's waitmessage-LONG print runs (lsd194PrintRuns.py receipt) vs production's message commands, per short-print class,
// both scenes. ROM: first glyph -> next instruction = `toNext` rows, final glyph row = `last`. Production: the message command's duration (battleResolutionCommandDuration)
// and its printable length. A class matches when production's sequence of hold-64 messages has the ROM's final-glyph rows (a kernel seed is searched for it).
//   python3 tools/integration/lsd194PrintRuns.py <rom r1 json...> > runs.json; node --experimental-strip-types --no-warnings tools/integration/lsd194PrintCompare.ts runs.json out.json
import { readFileSync, writeFileSync } from "node:fs";
import { CLASSES, lsd194Production } from "./lsd194Production.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";

const runs = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Record<string, { label: string; len: number; first: number; last: number; hold: number; toNext: number }[]>;
const FILES: Record<string, string> = {
  "super-effective": "scratch-message-hold-dense-probe.json", crit: "mechanic-hit-chain-crit-off.json", failed: "off108-snore-ply-primeape-snorlax.json",
  ohko: "gate6-ohko-hit-off.json", "stat-up": "off108-bulk-up-ply-primeape-onix.json",
};
const out: any[] = [];
let mismatches = 0;
for (const [cls, file] of Object.entries(FILES)) for (const scene of ["off", "on"] as const) {
  const rom = runs[`${file}-${scene}-r1.json`]!.filter((r) => r.hold === 64);
  let hit: { seed: number; msgs: any[] } | null = null;
  for (let seed = 1; seed <= 400 && !hit; seed += 1) {
    let rows;
    try { rows = lsd194Production({ scene, seed, ...CLASSES[cls as keyof typeof CLASSES] }).rows; } catch { continue; }
    const msgs = rows.filter((r) => r.type === "message" && (r.timing as any)?.holdFrames === 64).map((r) => ({ lines: r.lines, L: battleStringPrintableLength(r.lines as string[]), dur: r.dur, timing: r.timing }));
    if (msgs.length >= rom.length && rom.every((r, i) => msgs[i]!.L === r.last)) hit = { seed, msgs };
  }
  for (const [i, r] of rom.entries()) {
    const m = hit?.msgs[i];
    const row = { class: cls, scene, label: r.label, rom: { last: r.last, hold: r.hold, toNext: r.toNext }, seed: hit?.seed ?? null, production: m ? { lines: m.lines, L: m.L, dur: m.dur, timing: m.timing } : null, residual: m ? m.dur - r.toNext : null };
    if (row.residual !== 0) mismatches += 1;
    out.push(row);
    console.log(cls, scene, JSON.stringify(m?.lines), "L", m?.L, "ROM last", r.last, "ROM toNext", r.toNext, "production dur", m?.dur, "residual", row.residual);
  }
}
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
console.log("rows", out.length, "nonzero residuals", mismatches);
