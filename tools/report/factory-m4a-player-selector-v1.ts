import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const V3_HASHES = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
} as const;
const SELECTOR_HASHES = {
  anchor: "35fe3e32eb893ef7601cc74a15b1f7b5cdf74675f4c5e9397d71acc60343649d",
  liliana: "4dbb8aba89d6621513deddb94d7b627e19f4a20578090d8ac22a894a0827ef4c",
  "factory-varied": "1e77d4654401096f62f51d4fbe7fdd1e5760491b3cdbf09e252866c1de05cde7",
} as const;

type Stage = { kind: string; cyclesSinceM4aEntry: number };
type V3 = { schema: string; case: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ scalarBytes: number[] }> } }; stages: Stage[] } }> };
type Scalar = { revision: string; playerRole: string; scalarRange: string; scalarBytes: number[]; normalizedFields: string[] };
type Selector = { schema: string; case: string; joinKey: string; captureBoundary: string; observations: Array<{ sourceStateDigest: string; playerScalar: Scalar }> };

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const u16 = (bytes: number[], offset: number) => bytes[offset]! | bytes[offset + 1]! << 8;
function fail(message: string): never { throw new Error(`factory-m4a-player-selector-v1: ${message}`); }

function sixthCost(stages: Stage[]): number {
  const entries = stages.filter(({ kind }) => kind === "mplay-main-entry");
  const after = stages.find(({ kind }) => kind === "sound-main-after-mplay");
  if (entries.length !== 6 || !after) fail("v3 stage shape changed");
  return after.cyclesSinceM4aEntry - entries[5]!.cyclesSinceM4aEntry;
}

export function makeEvidence(): Record<string, unknown> {
  const rows: Array<Record<string, unknown>> = [];
  const caseCounts: Record<string, { observations: number; zeroPass: number; onePass: number }> = {};
  for (const name of CASES) {
    const v3Path = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3", `${name}.json`);
    const selectorPath = join(ROOT, "tests/fixtures/factory-m4a-player-selector-v1", `${name}.json`);
    if (sha256(readFileSync(v3Path)) !== V3_HASHES[name]) fail(`${name} frozen v3 hash changed`);
    if (sha256(readFileSync(selectorPath)) !== SELECTOR_HASHES[name]) fail(`${name} selector hash changed`);
    const v3 = read<V3>(v3Path);
    const selector = read<Selector>(selectorPath);
    if (v3.schema !== "factory-m4a-source-state-probe/v3" || selector.schema !== "factory-m4a-player-selector-probe/v1") fail(`${name} schema mismatch`);
    if (v3.case !== name || selector.case !== name || selector.joinKey !== "sourceStateDigest" || selector.captureBoundary !== "sixth-MPlayMain-entry") fail(`${name} identity mismatch`);
    if (v3.interrupts.length !== selector.observations.length) fail(`${name} observation count mismatch`);
    let zeroPass = 0;
    let onePass = 0;
    v3.interrupts.forEach((observation, index) => {
      const semantic = observation.m4a.state.sourceSemanticState;
      const selected = selector.observations[index]!;
      const scalar = selected.playerScalar;
      if (semantic.stateDigest !== selected.sourceStateDigest) fail(`${name} row ${index} digest join failed`);
      if (scalar.revision !== "factory-m4a-player-selector/v1" || scalar.playerRole !== "music-player-5" || scalar.scalarRange !== "MusicPlayerInfo+0x18..0x23") fail(`${name} row ${index} scalar identity mismatch`);
      if (scalar.scalarBytes.length !== 12 || scalar.scalarBytes.slice(0, 4).some(Boolean) || scalar.normalizedFields.join() !== "memAccArea") fail(`${name} row ${index} memAccArea was not normalized`);
      const frozen = semantic.musicPlayers[5]!.scalarBytes;
      if (u16(scalar.scalarBytes, 4) !== u16(frozen, 0x1c) || u16(scalar.scalarBytes, 6) !== u16(frozen, 0x1e)) fail(`${name} row ${index} tempoD/U join mismatch`);
      const tempoI = u16(scalar.scalarBytes, 8);
      const tempoC = u16(scalar.scalarBytes, 10);
      const passes = tempoC + tempoI >= 150 ? 1 : 0;
      passes ? onePass += 1 : zeroPass += 1;
      rows.push({ sourceStateDigest: semantic.stateDigest, tempoI, tempoC, passes, mplaySixthCycles: sixthCost(observation.m4a.stages) });
    });
    caseCounts[name] = { observations: v3.interrupts.length, zeroPass, onePass };
  }
  const zeroPass = rows.filter((row) => row.passes === 0).length;
  const onePass = rows.filter((row) => row.passes === 1).length;
  return {
    schema: "factory-m4a-player-selector-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceReference: "reference/pokeemerald/src/m4a_1.s:1169-1174,1342-1357",
    capture: { boundary: "sixth-MPlayMain-entry", normalizedRange: "MusicPlayerInfo+0x18..0x23", normalizedPointerField: "memAccArea", selector: "tempoC + tempoI >= 150" },
    frozenV3FileSha256: V3_HASHES,
    selectorFileSha256: SELECTOR_HASHES,
    coverage: { observations: rows.length, joinedRows: rows.length, zeroPass, onePass, caseCounts },
    rows,
    verdict: "All frozen v3 state-digest/sixth-cost rows have an exact zero/one-pass selector. This is evidence only; no duration reducer, service cost, or construction clock is produced.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as { observations: number; joinedRows: number; zeroPass: number; onePass: number; caseCounts: Record<string, { observations: number; zeroPass: number; onePass: number }> };
  return [
    "# Issue #55 — sixth-MPlayMain player selector v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-player-selector-v1.ts`; do not hand-edit.", "",
    "This additive Battle Scene OFF receipt preserves all frozen v3 bytes and hashes. At the sixth compiled `MPlayMain` entry it captures only `MusicPlayerInfo+0x18..0x23`: `memAccArea` is zero-normalized, while real `tempoD`, `tempoU`, `tempoI`, and `tempoC` bytes remain.", "",
    `The digest join is complete for **${coverage.joinedRows}/${coverage.observations}** frozen v3 state/cost rows. Source rule \`tempoC + tempoI >= 150\` selects **${coverage.onePass} one-pass / ${coverage.zeroPass} zero-pass** calls.`, "",
    "| case | rows | one pass | zero pass |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.caseCounts[name]!; return `| ${name} | ${row.observations} | ${row.onePass} | ${row.zeroPass} |`; }), "",
    "The packet contains no raw pointer, address, frame, tick, case duration, or timing lookup. It repairs only the v3 selector omission; it does not rewrite v3, reduce a duration, assign service cost, or wire the construction clock.", "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.indexOf("--out-dir");
  const out = arg >= 0 ? resolve(process.argv[arg + 1]!) : ROOT;
  mkdirSync(join(out, "tests/fixtures"), { recursive: true });
  mkdirSync(join(out, "docs"), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(join(out, "tests/fixtures/factory-m4a-player-selector-evidence-v1.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(join(out, "docs/issue55-m4a-player-selector-v1.md"), markdown(evidence));
}
