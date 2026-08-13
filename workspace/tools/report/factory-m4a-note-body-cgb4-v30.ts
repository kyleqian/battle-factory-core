import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V29_EVIDENCE_SHA256 = "c932813860e8d9dade9d7dd66891971a942c694b48ea75b255f6719eca20c91d";
const V29_DOC_SHA256 = "0bf37691f80c93c8c808e431750e97e2f13393f8a42cc1f805896a340c657d82";
const V29_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "59c2daf500f773368db0d6fd8756220b0154a4938fe23c7617c758a9982b88cb",
  liliana: "db2a26b30ec3a02b7420e05650025f0f28d0c11e1b6b453b22d368f6695d4f1e",
  "factory-varied": "8190a650678950fab698f06c07c0327df76d108ad2778f08661eddd5b42e8444",
};
const V30_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "77ce80af100e6fd8d46fcf8e6359019f65ec03935f4702cf956a02c76a3910a2",
  liliana: "b6c53e5fc7385036ebf4b9a9985ddb49c83c77856bcfdc1e2c0f54df0bd1e8fa",
  "factory-varied": "53fabb3e0cf7663015c25c8d67dad04c2c1685756aef1b682df8707579076485",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V29_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v29.json");
const V29_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v29.md");
const V29_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v29");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v30");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v30.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v30.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc08;
const BODY_END = 0x082d_fc0e;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v30: ${message}`); }
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
function u8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xff) fail(`${label} is not a u8`);
  return value;
}

export type Cgb4SecondTrackVolPitchTiming = Readonly<{
  route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" | "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken";
  secondTrackFlags: number;
  volPitchMask: 0x0f;
  sequentialThumbHalfwords: 3;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 6 | 12;
  stopsBeforeInstruction: "_081DDA62: first instruction" | "mov r9, r2";
}>;

/** Price only the second-loop `_081DD9D0` volume/pitch-mask decision. */
export function reduceCgb4SecondTrackVolPitchTiming(state: unknown): Cgb4SecondTrackVolPitchTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["secondTrackFlags"])) return null;
  let secondTrackFlags: number;
  try { secondTrackFlags = u8(state.secondTrackFlags, "secondTrackFlags"); } catch { return null; }
  const volPitchMask = 0x0f as const;
  const maskNonzero = (secondTrackFlags & volPitchMask) !== 0;
  return Object.freeze(maskNonzero ? {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    secondTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 6,
    stopsBeforeInstruction: "mov r9, r2",
  } : {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
    secondTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DDA62: first instruction",
  } as Cgb4SecondTrackVolPitchTiming);
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) {
    fail("source, ELF, or ROM changed");
  }
  const boundedRoute = [
    "\tmovs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
    "\tmov r9, r2",
  ].join("\n");
  if (!assembly.includes(boundedRoute) || !internal.includes("#define MPT_FLG_VOLCHG 0x03") || !internal.includes("#define MPT_FLG_PITCHG 0x0C")) {
    fail("bounded second-track volume/pitch route or source mask changed");
  }
  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled second-track volume/pitch decision changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }
  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1371", sha256: sha256(assembly) },
      musicPlayerTrack: {
        volumePitchMask: {
          path: "reference/pokeemerald/include/gba/m4a_internal.h",
          lines: "265-270",
          volumeChange: { name: "MPT_FLG_VOLCHG", value: "0x03" },
          pitchChange: { name: "MPT_FLG_PITCHG", value: "0x0c" },
          orMask: "0x0f",
          runtimeValue: null,
          sha256: sha256(internal),
        },
      },
    },
    elf: {
      containingEntry: "0x082dfc00",
      instructionStart: "0x082dfc08",
      endExclusive: "0x082dfc0e",
      takenSuccessor: "0x082dfc9a",
      nextSequentialInstruction: "0x082dfc0e",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
      start: "0x082dfc08",
      endExclusive: "0x082dfc0e",
      bytes: body.length,
      bytesHex: "0f 21 01 42 45 d0",
      sha256: BODY_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      volPitchMaskClearModel: "movs; tst; taken beq = 3 halfwords * 2 + one 6-cycle refill = 12",
      volPitchMaskNonzeroModel: "movs; tst; non-taken beq = 3 halfwords * 2 + zero refill = 6",
    },
  };
}

function frozenRows(): Array<{ sourceStateDigest: string; contiguous: number }> {
  const evidence = checkedJson(V29_EVIDENCE, V29_EVIDENCE_SHA256);
  if (!isRecord(evidence) || evidence.schema !== "factory-m4a-note-body-cgb4-evidence/v29" || evidence.oracleProfile !== "battle-scene-off" || evidence.addressFree !== true || !Array.isArray(evidence.rows)) fail("frozen v29 identity changed");
  const rows = evidence.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "secondTrackFlags", "secondTrackExistDecision", "postV28SecondTrackExistDecisionSourceCycles", "contiguousPrefixThroughSecondTrackExistDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV29Instruction"])) fail(`frozen v29 row ${index} widened`);
    if (u8(row.secondTrackFlags, `v29 row ${index} flags`) !== 0x80 || row.secondTrackExistDecision !== "MPT_FLG_EXIST-set-beq-not-taken" || row.postV28SecondTrackExistDecisionSourceCycles !== 8 || row.contiguousPrefixThroughSecondTrackExistDecisionSourceCycles !== 852 || row.beqTakenControlTransferRefills !== 0 || row.stopsBeforeV29Instruction !== "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG") fail(`frozen v29 row ${index} boundary changed`);
    return { sourceStateDigest: digest(row.sourceStateDigest, `v29 row ${index}`), contiguous: 852 };
  });
  if (rows.length !== 3 || new Set(rows.map((row) => row.sourceStateDigest)).size !== 3) fail("frozen v29 census changed");
  return rows;
}

function assertV29Frozen(): void {
  checkedBytes(V29_DOC, V29_DOC_SHA256);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v30-v29-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v29.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v29.json")).equals(checkedBytes(V29_EVIDENCE, V29_EVIDENCE_SHA256)) || !readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v29.md")).equals(checkedBytes(V29_DOC, V29_DOC_SHA256))) fail("v29 does not regenerate byte-for-byte");
  for (const name of CASES) checkedBytes(join(V29_PACKETS, `${name}.json`), V29_PACKET_HASHES[name]);
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson(join(PACKETS, `${name}.json`), V30_PACKET_HASHES[name]);
    if (!isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) || packet.schema !== "factory-m4a-note-body-cgb4-probe/v30" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "second-track-loop-post-_081DD9C8-ldrb-r0-before-_081DD9D0-volume-pitch-mask-decision" || packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "secondTrackFlags"])) fail(`${name} packet row ${index} widened`);
      const key = digest(row.sourceStateDigest, `${name} row ${index}`);
      const flags = u8(row.secondTrackFlags, `${name} row ${index} flags`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, flags);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v29 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = ["factory-m4a-note-body-cgb4-evidence-v29", "issue55-m4a-note-body-cgb4-v29", "factory-m4a-note-body-cgb4-v29", "factory-m4a-note-body-cgb4-evidence-v30", "issue55-m4a-note-body-cgb4-v30", "factory-m4a-note-body-cgb4-v30"];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  if (visit(join(ROOT, "src")).some((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)))) fail("production imports v29 or v30 evidence");
  return true;
}

export function makeEvidence(): Record<string, any> {
  assertV29Frozen();
  const prior = frozenRows();
  const packetValues = loadPackets(new Set(prior.map((row) => row.sourceStateDigest)));
  const rows = prior.map((row) => {
    const timing = reduceCgb4SecondTrackVolPitchTiming({ secondTrackFlags: packetValues.get(row.sourceStateDigest) });
    if (!timing || timing.secondTrackFlags !== 0x80 || timing.route !== "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" || timing.sourceCycles !== 12) fail("observed route changed");
    return {
      sourceStateDigest: row.sourceStateDigest,
      secondTrackFlags: timing.secondTrackFlags,
      secondTrackVolPitchMaskDecision: timing.route,
      postV29SecondTrackVolPitchDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: row.contiguous + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV30Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV29SecondTrackVolPitchDecisionSourceCycles, 0);
  if (added !== 36 || !rows.every((row) => row.contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles === 864)) fail("v30 pricing changed");
  const noImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v30",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV29EvidenceSha256: V29_EVIDENCE_SHA256,
      acceptedV29DocSha256: V29_DOC_SHA256,
      acceptedV29PacketSha256: V29_PACKET_HASHES,
      v29RegeneratesByteForByte: true,
      v29EvidenceReportAndPacketsRetainedByteForByte: true,
      v30PacketSha256: V30_PACKET_HASHES,
      v30PacketRepeatSha256: V30_PACKET_HASHES,
      v30PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "second track-loop iteration post-_081DD9C8 ldrb r0 flags, before _081DD9D0 volume/pitch-mask decision",
      scalars: ["secondTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "secondTrackFlags"],
      excluded: ["pointer", "runtime address", "track count", "track index", "track identity", "iteration count", "channel", "frame", "duration", "condition flags", "wider state", "selected branch body", "sequential successor body", "any next instruction beyond the decision", "other 75 callbacks"],
    },
    join: {
      key: "sourceStateDigest",
      frozenV29SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v29-selected-row", "packet-key-mismatch", "unsupported-packet-field", "out-of-range-scalar", "unexpected-observed-route"],
    },
    coverage: {
      frozenV29SelectedRows: 3,
      packetRowsByCase: COUNTS,
      secondTrackFlagsRows: 3,
      secondTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 3,
      volPitchMaskNonzeroRows: 0,
      postV29SecondTrackVolPitchDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughSecondTrackExistDecisionSourceCycles: 5872,
      contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: 5872 + added,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV29ArtifactsReadOnly: true,
      v29PacketStripBackPreserved: true,
      v29AndV30ArtifactsAreNotProductionImports: noImports,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      iterationCount: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      selectedBranchBody: null,
      sequentialSuccessorBody: null,
      nextInstructionBeyondDecision: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Two fresh byte-identical OFF packet sets retain only sourceStateDigest and secondTrackFlags. All three flags are 0x80, so the 0x0f volume/pitch mask is clear and beq _081DDA62 is taken at 12 cycles per row / 36 aggregate. The prefix advances 5872 to 5908 cycles and stops before either successor instruction.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  return [
    "# Issue #55 — CGB4 second-track volume/pitch-mask decision v30", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v30.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence. v30 freezes v29 evidence, report, and all three packets byte-for-byte. Two fresh serial packet sets are byte-identical: anchor `77ce80af…`, LILIANA `b6c53e5f…`, and legal-varied `53fabb3e…`. Every observation contains exactly `sourceStateDigest` plus the address-free `secondTrackFlags` scalar.", "",
    "All three observed flags bytes are **0x80**. Source defines `MPT_FLG_VOLCHG = 0x03` and `MPT_FLG_PITCHG = 0x0c`, so their exact `0x0f` mask is clear. Source/ELF/exact-ROM close only `_081DD9D0.._081DD9D6`: `movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62`, bytes `0f 21 01 42 45 d0`.", "",
    "The clear-mask `beq` is taken: three Thumb halfwords cost **6 cycles** plus one **6-cycle** control-transfer refill, **12 cycles per row / 36 aggregate**. The fail-closed nonzero route costs **6 cycles** and is not claimed observed.", "",
    "| selected rows | flags | mask | branch route | cycles/row | aggregate |", "| ---: | ---: | ---: | --- | ---: | ---: |", "| 3 | 0x80 | 0x0f clear | `beq _081DDA62` taken | 12 | 36 |", "",
    "The aggregate prefix advances from **5,872** to **" + evidence.coverage.contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles + " cycles**. It stops before the selected `_081DDA62: subs r2, 0x1` body and before the non-selected `mov r9, r2` body; pointer/address/count/index/identity/iteration/channel/frame/duration/wider state, complete MPlay, service/arbitration, and construction-clock wiring remain null.", "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v30.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v30.md") };
  fail("usage: factory-m4a-note-body-cgb4-v30.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
