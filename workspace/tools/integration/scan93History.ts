// scan93: a presentation-only scanline-buffer history (docs/next-adapters-scan93.md). The value the ROM's gScanlineEffect +
// gScanlineEffectRegBuffers[2][320] hold at an animation body's activation, folded over the battle's earlier animation bodies:
//   - the battle starts at S0 (the battle intro's residue: bank 0 = 80 x +2, 80 x -2, zeros; bank 1 zeros; srcBuffer 1, state 0, BG3HOFS);
//   - a body whose script never touches the scanline effect leaves it unchanged (identity);
//   - Move_EXTRASENSORY (AnimTask_ExtrasensoryDistortion x3, battle_anim_psychic.c:954) is MODELLED: each stage rewrites lines
//     lo..lo+64 (init) and lo..hi (24 steps) of BOTH banks; the last write is stage 2 step 23; 3 x 24 active VBlanks flip srcBuffer an even
//     number of times; state ends 0 (state 3 -> 0 in a VBlank); dmaDest = BG1HOFS (target BG rank 1 = opponent target) / BG2HOFS;
//   - every other scanline writer (source table: Memento, Dragon Dance, Rapid Spin, Acid Armor, Dig, Surf / Muddy Water, Spite, Sketch)
//     INVALIDATES the history (null): unmodelled, consumers decline.
// Inputs are presentation-only (labels, sides, species elevation, the target's x + x2); it never touches gameplay.
//   node --experimental-strip-types --no-warnings tools/integration/scan93History.ts predict <scenario-dir> <out.json>
//   node --experimental-strip-types --no-warnings tools/integration/scan93History.ts compare <probe-dir-r1> <probe-dir-r2> <out.json>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import enemyElevations from "../../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
import speciesNames from "../../src/data/gen/species-names.json" with { type: "json" };

export type Scan93Side = "player" | "opponent";
export type Scan93Scanline = Readonly<{ state: number; srcBuffer: number; dmaDest: number; dmaControl: number; banks: readonly [readonly number[], readonly number[]] }>;
export type Scan93Body = Readonly<{ label: string; attackerSide: Scan93Side; targetSpecies: string; targetX2?: number }>;

export const SCAN93_S0: Scan93Scanline = Object.freeze({ state: 0, srcBuffer: 1, dmaDest: 0x400001c, dmaControl: 0xa2600001,
  banks: Object.freeze([Object.freeze([...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)]), Object.freeze(Array(320).fill(0))]) as never });
/** Scripts that write the scanline effect (pret source; docs/next-adapters-scan93.md source table) but are not modelled: invalidate. */
export const SCAN93_UNMODELLED_WRITERS: ReadonlySet<string> = new Set(["Move_MEMENTO", "Move_DRAGON_DANCE", "Move_RAPID_SPIN", "Move_ACID_ARMOR",
  "Move_DIG", "Move_SURF", "Move_MUDDY_WATER", "Move_SPITE", "Move_SKETCH"]);
/** Battler sprite x (sBattlerCoords, singles). */
const SPRITE_X: Record<Scan93Side, number> = { player: 72, opponent: 176 };
const sine = (i: number) => (i < 320 ? GBA_SINE_TABLE_256[i & 0xff]! : 0);

/** GetBattlerYCoordWithElevation(target): opponent 40 - elevation, player 80. */
export function scan93TargetYElevation(targetSide: Scan93Side, targetSpecies: string): number {
  return targetSide === "opponent" ? 40 - ((enemyElevations as Record<string, number>)[targetSpecies] ?? 0) : 80;
}

/** The scanline effect after one Move_EXTRASENSORY body on `entry`. */
export function scan93AfterExtrasensory(entry: Scan93Scanline, attackerSide: Scan93Side, targetSpecies: string, targetX2 = 0): Scan93Scanline {
  const targetSide: Scan93Side = attackerSide === "player" ? "opponent" : "player";
  const y = scan93TargetYElevation(targetSide, targetSpecies), lo = Math.max(0, y - 32), hi = y + 32;
  const bgX0 = 32 - (SPRITE_X[targetSide] + targetX2);
  const banks = [[...entry.banks[0]], [...entry.banks[1]]];
  const stages: readonly (readonly [number, number, number])[] = [[2, 5, 64], [2, 5, 192], [4, 4, 0]];
  for (const [step, shift, phase] of stages) {
    for (let i = lo; i <= lo + 64; i += 1) { banks[0]![i] = bgX0; banks[1]![i] = bgX0; }
    for (let j = 0; j <= 23; j += 1) {
      let s = phase;
      for (let i = lo; i <= hi; i += 1) {
        let v = sine(s) >> shift;
        if (v > 0) v += j & 3; else if (v < 0) v -= j & 3;
        banks[0]![i] = bgX0 + v; banks[1]![i] = bgX0 + v; s += step;
      }
    }
  }
  return Object.freeze({ state: 0, srcBuffer: entry.srcBuffer, dmaDest: targetSide === "opponent" ? 0x4000014 : 0x4000018, dmaControl: 0xa2600001,
    banks: [banks[0]!, banks[1]!] as const });
}

/** Fold: the scanline effect at the activation of the body after `bodies` (null = invalidated by an unmodelled writer). */
export function scan93Fold(bodies: readonly Scan93Body[], entry: Scan93Scanline | null = SCAN93_S0): Scan93Scanline | null {
  let h = entry;
  for (const b of bodies) {
    if (h === null) return null;
    if (b.label === "Move_EXTRASENSORY") h = scan93AfterExtrasensory(h, b.attackerSide, b.targetSpecies, b.targetX2 ?? 0);
    else if (SCAN93_UNMODELLED_WRITERS.has(b.label)) h = null;
  }
  return h;
}

type Json = Record<string, any>;
const symbolOf = (internal: number) => ((speciesNames as Json).species[internal]?.species as string).replace(/^SPECIES_/, "");
const probeBodies = (probe: Json): Scan93Body[] => (probe.bodies as Json[]).map((b) => {
  const attackerSide: Scan93Side = b.attacker === 0 ? "player" : "opponent", t = b.attacker === 0 ? 1 : 0;
  return { label: b.label as string, attackerSide, targetSpecies: symbolOf(b.at.battlers[t].species), targetX2: b.at.battlerSprites[t].x2 };
});
const diffLines = (a: readonly number[], b: readonly number[]) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);

function main(): void {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "predict") {
    // Per scenario: the fold's class at each body of the EXPECTED sequence is not known before the ROM runs (speed / KO); the committed
    // prediction is the fold itself plus, per predecessor class, the predicted entry digest for the scenario's target geometry.
    const [dir, out] = args;
    const rows: Json[] = [];
    for (const name of readdirSync(dir!).filter((n) => n.endsWith(".json")).sort()) {
      const s = JSON.parse(readFileSync(join(dir!, name), "utf8"));
      const p = s.overrides.parties;
      const pl = symbolOf(p.player[0].species), op = symbolOf(p.opponent[0].species);
      const xsP = scan93AfterExtrasensory(SCAN93_S0, "player", op), xsO = scan93AfterExtrasensory(SCAN93_S0, "opponent", pl);
      rows.push({ scenario: name, player: pl, opponent: op,
        classes: {
          "intro / non-scanline": summary(SCAN93_S0),
          "after player Extrasensory": summary(xsP),
          "after opponent Extrasensory": summary(xsO),
          "after both (player then opponent)": summary(scan93AfterExtrasensory(xsP, "opponent", pl)),
          "after Memento / Dragon Dance / other writer": null,
        } });
    }
    writeFileSync(out!, JSON.stringify({ schema: "scan93-predictions/v1", rows }, null, 1) + "\n");
    console.log(`${rows.length} scenarios`);
    return;
  }
  if (mode === "compare") {
    const [r1, r2, out] = args;
    const rows: Json[] = [];
    for (const name of readdirSync(r1!).filter((n) => n.endsWith(".json")).sort()) {
      const a = readFileSync(join(r1!, name), "utf8"), b = (() => { try { return readFileSync(join(r2!, name), "utf8"); } catch { return null; } })();
      const probe = JSON.parse(a) as Json, bodies = probeBodies(probe);
      // r1 == r2 on everything except the scenario-independent wall-clock-free fields (the probe has none): whole-file equality.
      const same = b !== null && a === b;
      bodies.forEach((body, k) => {
        const at = (probe.bodies as Json[])[k]!.at.scanline as Json;
        const ram: Scan93Scanline = { state: at.state, srcBuffer: at.srcBuffer, dmaDest: at.dmaDest, dmaControl: at.dmaControl, banks: at.banks };
        const pred = scan93Fold(bodies.slice(0, k));
        const vsS0 = { bank0: diffLines(ram.banks[0], SCAN93_S0.banks[0]), bank1: diffLines(ram.banks[1], SCAN93_S0.banks[1]) };
        rows.push({ scenario: name, body: k, frame: (probe.bodies as Json[])[k]!.startFrame, label: body.label, side: body.attackerSide,
          preceding: bodies.slice(0, k).map((x) => `${x.label.replace(/^(Move|General|Status|Special)_/, "")}:${x.attackerSide[0]}`).join(" "),
          r1EqualsR2: same, predicted: pred === null ? "invalidated" : "known",
          equal: pred === null ? null : JSON.stringify([pred.state, pred.srcBuffer, pred.dmaDest, pred.dmaControl, pred.banks])
            === JSON.stringify([ram.state, ram.srcBuffer, ram.dmaDest, ram.dmaControl, ram.banks]),
          ramLinesNotS0: vsS0, ram: summary(ram),
          ...(pred === null ? {} : { predictedSummary: summary(pred), mismatchLines: { bank0: diffLines(ram.banks[0], pred.banks[0]), bank1: diffLines(ram.banks[1], pred.banks[1]) } }) });
      });
    }
    const known = rows.filter((r) => r.predicted === "known");
    const result = { schema: "scan93-compare/v1", bodies: rows.length, scenarios: new Set(rows.map((r) => r.scenario)).size,
      r1EqualsR2: rows.every((r) => r.r1EqualsR2), knownBodies: known.length, knownEqual: known.filter((r) => r.equal).length,
      invalidatedBodies: rows.length - known.length, rows };
    writeFileSync(out!, JSON.stringify(result, null, 1) + "\n");
    console.log(`${result.scenarios} scenarios, ${result.bodies} bodies, r1==r2 ${result.r1EqualsR2}, known ${result.knownEqual}/${result.knownBodies} equal, invalidated ${result.invalidatedBodies}`);
    if (!result.r1EqualsR2 || result.knownEqual !== result.knownBodies) process.exitCode = 1;
    return;
  }
  throw new Error("usage: scan93History.ts predict <scenario-dir> <out.json> | compare <r1> <r2> <out.json>");
}

function summary(s: Scan93Scanline): Json {
  const runs = (bank: readonly number[]) => {
    const out: string[] = []; let i = 0;
    while (i < 320) { let j = i; while (j + 1 < 320 && bank[j + 1] === bank[i]) j += 1; out.push(i === j ? `${i}:${bank[i]}` : `${i}..${j}:${bank[i]}`); i = j + 1; }
    return out.length > 12 ? `${out.length} runs; lines differing from S0: ${bank.filter((v, k) => v !== (bank === s.banks[0] ? SCAN93_S0.banks[0][k] : SCAN93_S0.banks[1][k])).length}` : out.join(" ");
  };
  return { state: s.state, srcBuffer: s.srcBuffer, dmaDest: `0x${s.dmaDest.toString(16)}`, dmaControl: `0x${(s.dmaControl >>> 0).toString(16)}`,
    bank0: runs(s.banks[0]), bank1: runs(s.banks[1]), banksEqualOn0to159: s.banks[0].slice(0, 160).every((v, i) => v === s.banks[1][i]),
    digest: hash(JSON.stringify(s.banks)) };
}
function hash(s: string): string { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); }

if (process.argv[1]?.endsWith("scan93History.ts")) main();
