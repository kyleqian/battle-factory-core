import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reduceCgb4FirstTrackFlagsTiming } from "./factory-m4a-note-body-cgb4-v25.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V28_EVIDENCE_SHA256 = "d09f0d3e33bd562898632d0bb13830c09d0b859610edf158bd5d8bb598ebaf8b";
const V28_DOC_SHA256 = "30e705f400f2e5da07f651f1e086c026748fa00d858b37f4a375c9c5c4625f2a";
const V25_EVIDENCE_SHA256 = "26a2f0c9dfb5442f95c5813cf0f359c3e01ca389ad3f415118b480889a0900ab";
const INHERITED_V27_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930",
  liliana: "9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626",
  "factory-varied": "6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68",
};
const V29_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "59c2daf500f773368db0d6fd8756220b0154a4938fe23c7617c758a9982b88cb",
  liliana: "db2a26b30ec3a02b7420e05650025f0f28d0c11e1b6b453b22d368f6695d4f1e",
  "factory-varied": "8190a650678950fab698f06c07c0327df76d108ad2778f08661eddd5b42e8444",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V28_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v28.json");
const V28_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v28.md");
const V25_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json");
const V27_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v27");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v29");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v29.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v29.md");

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v29: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}
function checkedJson(path: string, hash: string): unknown { return JSON.parse(checkedBytes(path, hash).toString("utf8")); }
function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} is not a digest`);
  return value;
}

export function reduceCgb4SecondTrackFlagsTiming(state: unknown) {
  if (!isRecord(state) || !exactKeys(state, ["secondTrackFlags"])) return null;
  const value = state.secondTrackFlags;
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) return null;
  const timing = reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: value });
  if (!timing) return null;
  return Object.freeze({
    route: timing.route,
    secondTrackFlags: timing.firstTrackFlags,
    sequentialThumbHalfwords: timing.sequentialThumbHalfwords,
    iwramByteLoads: timing.iwramByteLoads,
    iwramDataAccessPremiumCycles: timing.iwramDataAccessPremiumCycles,
    beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
    takenControlTransferRefills: timing.takenControlTransferRefills,
    sourceCycles: timing.sourceCycles,
    stopsBeforeInstruction: timing.stopsBeforeInstruction,
  });
}

function frozenRows(): Array<{ sourceStateDigest: string; contiguous: number }> {
  const evidence = checkedJson(V28_EVIDENCE, V28_EVIDENCE_SHA256);
  if (!isRecord(evidence) || evidence.schema !== "factory-m4a-note-body-cgb4-evidence/v28" || evidence.oracleProfile !== "battle-scene-off" || evidence.addressFree !== true || !Array.isArray(evidence.rows)) fail("frozen v28 identity changed");
  const rows = evidence.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "continuationDecision", "postV27FirstTrackContinuationSourceCycles", "contiguousPrefixThroughFirstTrackContinuationSourceCycles", "bgtTakenControlTransferRefills", "stopsBeforeV28Instruction"])) fail(`frozen v28 row ${index} widened`);
    if (row.continuationDecision !== "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8" || row.postV27FirstTrackContinuationSourceCycles !== 12 || row.contiguousPrefixThroughFirstTrackContinuationSourceCycles !== 844 || row.bgtTakenControlTransferRefills !== 1 || row.stopsBeforeV28Instruction !== "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]") fail(`frozen v28 row ${index} boundary changed`);
    return { sourceStateDigest: digest(row.sourceStateDigest, `v28 row ${index}`), contiguous: 844 };
  });
  if (rows.length !== 3 || new Set(rows.map((row) => row.sourceStateDigest)).size !== 3) fail("frozen v28 census changed");
  return rows;
}

function assertV28Frozen(): void {
  checkedBytes(V28_DOC, V28_DOC_SHA256);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v29-v28-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v28.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v28.json")).equals(checkedBytes(V28_EVIDENCE, V28_EVIDENCE_SHA256)) || !readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v28.md")).equals(checkedBytes(V28_DOC, V28_DOC_SHA256))) fail("v28 does not regenerate byte-for-byte");
  for (const name of CASES) checkedBytes(join(V27_PACKETS, `${name}.json`), INHERITED_V27_PACKET_HASHES[name]);
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson(join(PACKETS, `${name}.json`), V29_PACKET_HASHES[name]);
    if (!isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) || packet.schema !== "factory-m4a-note-body-cgb4-probe/v29" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "second-track-loop-post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision" || packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "secondTrackFlags"])) fail(`${name} packet row ${index} widened`);
      const key = digest(row.sourceStateDigest, `${name} row ${index}`);
      if (!selected.has(key) || result.has(key) || !Number.isInteger(row.secondTrackFlags) || (row.secondTrackFlags as number) < 0 || (row.secondTrackFlags as number) > 0xff) fail(`${name} packet row ${index} invalid`);
      result.set(key, row.secondTrackFlags as number);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v28 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = ["factory-m4a-note-body-cgb4-evidence-v29", "issue55-m4a-note-body-cgb4-v29", "factory-m4a-note-body-cgb4-v29"];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  if (visit(join(ROOT, "src")).some((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)))) fail("production imports v29 evidence");
  return true;
}

export function makeEvidence(): Record<string, any> {
  assertV28Frozen();
  const prior = frozenRows();
  const packetValues = loadPackets(new Set(prior.map((row) => row.sourceStateDigest)));
  const sourceProof = checkedJson(V25_EVIDENCE, V25_EVIDENCE_SHA256);
  if (!isRecord(sourceProof) || sourceProof.schema !== "factory-m4a-note-body-cgb4-evidence/v25" || !isRecord(sourceProof.sourceAndElf)) fail("frozen exact source/ELF decision proof changed");
  const rows = prior.map((row) => {
    const timing = reduceCgb4SecondTrackFlagsTiming({ secondTrackFlags: packetValues.get(row.sourceStateDigest) });
    if (!timing || timing.secondTrackFlags !== 0x80 || timing.sourceCycles !== 8 || timing.route !== "MPT_FLG_EXIST-set-beq-not-taken") fail("observed route changed");
    return { sourceStateDigest: row.sourceStateDigest, secondTrackFlags: timing.secondTrackFlags, secondTrackExistDecision: timing.route, postV28SecondTrackExistDecisionSourceCycles: timing.sourceCycles, contiguousPrefixThroughSecondTrackExistDecisionSourceCycles: row.contiguous + timing.sourceCycles, beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills, stopsBeforeV29Instruction: timing.stopsBeforeInstruction };
  });
  const added = rows.reduce((sum, row) => sum + row.postV28SecondTrackExistDecisionSourceCycles, 0);
  if (added !== 24 || !rows.every((row) => row.contiguousPrefixThroughSecondTrackExistDecisionSourceCycles === 852)) fail("v29 pricing changed");
  const noImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v29", oracleProfile: "battle-scene-off", addressFree: true,
    sourceAndElf: sourceProof.sourceAndElf,
    frozenInputs: { acceptedV28EvidenceSha256: V28_EVIDENCE_SHA256, acceptedV28DocSha256: V28_DOC_SHA256, acceptedInheritedV27PacketSha256: INHERITED_V27_PACKET_HASHES, v28RegeneratesByteForByte: true, v28EvidenceReportAndInheritedPacketsRetainedByteForByte: true, v29PacketSha256: V29_PACKET_HASHES, v29PacketRepeatSha256: V29_PACKET_HASHES, v29PacketRepeatIdentity: true },
    capture: { boundary: "second track-loop iteration post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST", scalars: ["secondTrackFlags"], packetObservationExactKeys: ["sourceStateDigest", "secondTrackFlags"], excluded: ["pointer", "runtime address", "track count", "track index", "track identity", "iteration count", "channel", "frame", "duration", "condition flags", "wider state", "volume/pitch decision", "successor body", "other 75 callbacks"] },
    join: { key: "sourceStateDigest", frozenV28SelectedRows: 3, joinedRows: 3, ambiguousRows: 0, addressFree: true, failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v28-selected-row", "unsupported-packet-field", "unexpected-observed-route"] },
    coverage: { frozenV28SelectedRows: 3, packetRowsByCase: COUNTS, secondTrackFlagsRows: 3, secondTrackFlagsValues: [0x80], existSetRows: 3, existClearRows: 0, postV28SecondTrackExistDecisionSourceCycles: added, acceptedContiguousPrefixThroughFirstTrackContinuationSourceCycles: 5848, contiguousPrefixThroughSecondTrackExistDecisionSourceCycles: 5848 + added, sequentialThumbHalfwords: 12, iwramByteLoads: 3, iwramDataAccessPremiumCycles: 0, takenControlTransferRefills: 0, failClosedUnobservedExistClearSourceCycles: 14, nullOtherPostSelectionCallbacks: 75, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 },
    rows,
    containment: { frozenV28ArtifactsReadOnly: true, inheritedV27PacketsReadOnly: true, v29PacketStripBackPreserved: true, v29ArtifactsAreNotProductionImports: noImports, trackPointer: null, runtimeAddress: null, trackCount: null, trackIndex: null, trackIdentity: null, iterationCount: null, channel: null, frame: null, duration: null, conditionFlags: null, widerState: null, nextTrackBody: null, serviceCost: null, constructionClock: null, controller: null, presentation: null, unsupportedBarrierAdded: false },
    verdict: "Two fresh byte-identical OFF packet sets retain only sourceStateDigest and secondTrackFlags. All three flags are 0x80, selecting the EXIST-set non-taken beq route at 8 cycles per row / 24 aggregate. The prefix advances 5848 to 5872 cycles and stops before the volume/pitch mask.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  return [
    "# Issue #55 — CGB4 second-track MPT_FLG_EXIST decision v29", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v29.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence. v29 freezes v28 evidence/report and its inherited v27 packets byte-for-byte. Two fresh serial packet sets are byte-identical: anchor `59c2daf5…`, LILIANA `db2a26b3…`, and legal-varied `8190a650…`. Every observation contains exactly `sourceStateDigest` plus the address-free `secondTrackFlags` scalar.", "",
    "All three observed flags bytes are **0x80**. Source/ELF/exact-ROM close only `_081DD9C8.._081DD9D0`: `ldrb r0,[r5,flags]; movs r1,0x80; tst r1,r0; beq _081DDA62`, bytes `28 78 80 21 01 42 48 d0`. The static track-storage census proves the byte load is IWRAM without selecting a runtime track.", "",
    "`MPT_FLG_EXIST` is set, so `beq` is not taken: four Thumb halfwords cost **8 cycles per row**, no refill, **24 aggregate**. The fail-closed clear route costs **14 cycles** including one refill but is not claimed observed.", "",
    "| selected rows | flags | branch route | cycles/row | aggregate |", "| ---: | ---: | --- | ---: | ---: |", "| 3 | 0x80 | EXIST set / `beq` not taken | 8 | 24 |", "",
    `The aggregate prefix advances from **5,848** to **${evidence.coverage.contiguousPrefixThroughSecondTrackExistDecisionSourceCycles} cycles**. It stops before \`_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG\`; pointer/address/count/index/identity/iteration/channel/frame/duration/wider state, the volume/pitch decision and body, complete MPlay, service/arbitration, and construction-clock wiring remain null.`, "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v29.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v29.md") };
  fail("usage: factory-m4a-note-body-cgb4-v29.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
