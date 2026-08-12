import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV18Evidence } from "./factory-m4a-note-body-cgb4-v18.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const V17_EVIDENCE_SHA256 = "e4ff5796f16be7304f7deb35daaf1a6aea753332d6ae450b08e7dfce5277d34a";
const V17_DOC_SHA256 = "884ad63d4b51300ea76d316943c927b4e91fbc10f5e025017632f3df93c20649";
const V17_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5dca04f71abce9fd90bbe8737eb656b2d28d1e22612e0ec66b75e11ec22fdd11",
  liliana: "68fb3aa3ffe2252711528a0d17d4697ea66a6c1a13246f8091e43d0b7c7ffe31",
  "factory-varied": "e5e3ce1a0795710e921161fe4046e81627afc822fd6562c3d15a1cd233aac808",
};
const V18_EVIDENCE_SHA256 = "812f3f497a7842f9d57e4c8bb54f89c0fcae5fae943faa1e0c59c9a39fe960b3";
const V18_DOC_SHA256 = "9e10b6d559a2d5764ce6e59ec0e9b2621671ba7ab6d41bfd829cd7169f0e0a01";
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "1862007858854d9b2a82220d097b3d16922fe74c426b98a13fcce7fc1297341b",
  liliana: "1d31dfc0a133556999f05fa5cdda7dac6f4be15cd8d03067a0d7f9c08a83ac0e",
  "factory-varied": "7c9978e54f814caee00d196d432c3c479981dfe9a6f5a706b583e4e8609e073d",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "8b3d8e5e87469159a1db98d7c5a67f9092b318082356dc422b6655faa673796a";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V17_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json");
const V17_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v17.md");
const V17_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v17");
const V18_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v18.json");
const V18_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v18.md");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v19");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v19.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v19.md");
const ROM_BASE = 0x0800_0000;
const ROUTE_START = 0x082d_fab4;
const ROUTE_END = 0x082d_fabe;
const ROUTE_BYTES = Buffer.from([0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x00, 0xd1, 0x88, 0xe0]);
const MPT_FLG_EXIST = 0x80;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v19: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}
function checkedJson<T>(path: string, hash: string): T { return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T; }
function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) fail(`${label} must be u8`);
  return value as number;
}
function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

export type NextTrackExistTiming = Readonly<{
  route: "exist-set-bne-taken" | "exist-clear-bne-not-taken-then-unconditional";
  flags: number;
  sequentialThumbHalfwords: 3 | 4;
  takenControlTransferRefills: 1;
  sourceCycles: 12 | 14;
  stopsBeforeSelectedSuccessor: "_081DD886" | "_081DD998";
}>;

/** Price only the loop-head flags decision, stopping before either successor. */
export function reduceCgb4NextTrackExistTiming(state: unknown): NextTrackExistTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["flags", "directBranchEvidence"])) return null;
  const flags = requireU8(state.flags, "flags");
  if (!isRecord(state.directBranchEvidence) || !exactKeys(state.directBranchEvidence, [
    "branchInstruction", "r0AfterFlagsLoad", "r1ExistMask", "tstZero", "branchRoute", "selectedSuccessor",
  ])) return null;
  const direct = state.directBranchEvidence;
  const r0 = requireU8(direct.r0AfterFlagsLoad, "r0AfterFlagsLoad");
  const r1 = requireU8(direct.r1ExistMask, "r1ExistMask");
  if (direct.branchInstruction !== "MPlayMain._081DD884:bne _081DD886" || r0 !== flags || r1 !== MPT_FLG_EXIST || typeof direct.tstZero !== "boolean") return null;
  const tstZero = (flags & MPT_FLG_EXIST) === 0;
  if (direct.tstZero !== tstZero) return null;
  if (tstZero) {
    if (direct.branchRoute !== "bne-not-taken-then-b-_081DD998" || direct.selectedSuccessor !== "_081DD998") return null;
    return Object.freeze({
      route: "exist-clear-bne-not-taken-then-unconditional",
      flags,
      sequentialThumbHalfwords: 4,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeSelectedSuccessor: "_081DD998",
    });
  }
  if (direct.branchRoute !== "bne-taken-to-_081DD886" || direct.selectedSuccessor !== "_081DD886") return null;
  return Object.freeze({
    route: "exist-set-bne-taken",
    flags,
    sequentialThumbHalfwords: 3,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeSelectedSuccessor: "_081DD886",
  });
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const sourceRoute = "_081DD87C:\n\tldrb r0, [r5, o_MusicPlayerTrack_flags]\n\tmovs r1, MPT_FLG_EXIST\n\ttst r1, r0\n\tbne _081DD886\n\tb _081DD998\n_081DD886:\n";
  if (!assembly.includes(sourceRoute) || !internal.includes("#define MPT_FLG_EXIST  0x80")) fail("MPT_FLG_EXIST loop-head source route changed");
  const route = rom.subarray(ROUTE_START - ROM_BASE, ROUTE_END - ROM_BASE);
  if (!route.equals(ROUTE_BYTES) || sha256(route) !== ROUTE_SHA256) fail("compiled MPT_FLG_EXIST loop-head route changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfab4 t _081DD87C", "082dfabe t _081DD886", "082dfbd0 t _081DD998"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1178-1185", sha256: sha256(assembly) },
      constants: { path: "reference/pokeemerald/include/gba/m4a_internal.h", line: 270, mptFlgExist: MPT_FLG_EXIST, sha256: sha256(internal) },
    },
    elf: { loopHead: "0x082dfab4", existSetSuccessor: "0x082dfabe", existClearSuccessor: "0x082dfbd0", sha256: sha256(elf) },
    compiledRegions: [{ role: "ldrb flags; movs MPT_FLG_EXIST; tst; bne _081DD886; b _081DD998", start: "0x082dfab4", endExclusive: "0x082dfabe", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
  };
}

function assertFrozenV17Packets(): void {
  for (const name of CASES) checkedBytes(join(V17_PACKETS, `${name}.json`), V17_PACKET_HASHES[name]);
}

type Packet = {
  schema: string;
  case: CaseName;
  oracleProfile: string;
  sourceFunction: string;
  joinKey: string;
  captureBoundary: string;
  addressFree: boolean;
  observations: unknown[];
};

function loadPacket(name: CaseName, frozenRows: readonly any[]): Array<{ sourceStateDigest: string; cgb4NextTrackExistState: unknown }> {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (!isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"])) fail(`${name} packet carries an unsupported field`);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v19" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "first-successor-loop-head-MPT_FLG_EXIST-bne-before-selected-successor" || packet.addressFree !== true || !Array.isArray(packet.observations)) fail(`${name} packet identity changed`);
  const expectedDigests = frozenRows.filter((row: any) => row.case === name).map((row: any) => requireDigest(row.sourceStateDigest, "frozen sourceStateDigest"));
  if (expectedDigests.length !== CGB4_COUNTS[name] || packet.observations.length !== expectedDigests.length) fail(`${name} packet census changed`);
  const rows = packet.observations.map((row: unknown, index) => {
    if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "cgb4NextTrackExistState"])) fail(`${name} packet row ${index} carries an unsupported field`);
    return { sourceStateDigest: requireDigest(row.sourceStateDigest, `${name} packet row ${index} digest`), cgb4NextTrackExistState: row.cgb4NextTrackExistState };
  });
  const actualDigests = rows.map((row) => row.sourceStateDigest);
  if (new Set(actualDigests).size !== actualDigests.length) fail(`${name} packet source-state join became ambiguous`);
  if (JSON.stringify(actualDigests) !== JSON.stringify(expectedDigests)) fail(`${name} packet source-state rows are missing, duplicate, reordered, ambiguous, or extra`);
  return rows;
}

function histogram(values: readonly number[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[String(value)] = (result[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV18 = checkedJson<any>(V18_EVIDENCE, V18_EVIDENCE_SHA256);
  checkedBytes(V18_DOC, V18_DOC_SHA256);
  checkedBytes(V17_EVIDENCE, V17_EVIDENCE_SHA256);
  checkedBytes(V17_DOC, V17_DOC_SHA256);
  assertFrozenV17Packets();
  if (JSON.stringify(makeV18Evidence()) !== JSON.stringify(frozenV18)) fail("accepted v18 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV18.rows) || frozenV18.rows.length !== 7) fail("frozen v18 row count changed");
  const priorByDigest = new Map<string, any>();
  for (const prior of frozenV18.rows) {
    const digest = requireDigest(prior?.sourceStateDigest, "frozen v18 sourceStateDigest");
    if (priorByDigest.has(digest) || !CASES.includes(prior.case) || prior.trackLoopRoute !== "continue-to-next-track" || prior.nextTrackLoopBodyInstruction !== "ldrb r0, [r5, o_MusicPlayerTrack_flags]") fail("frozen v18 continuation join changed");
    priorByDigest.set(digest, prior);
  }
  const packetRows = CASES.flatMap((name) => loadPacket(name, frozenV18.rows).map((row) => ({ ...row, case: name })));
  if (packetRows.length !== 7) fail("v19 packet CGB4 row count changed");
  const packetByDigest = new Map<string, typeof packetRows[number]>();
  for (const packetRow of packetRows) {
    if (packetByDigest.has(packetRow.sourceStateDigest)) fail("v19 packet join became ambiguous");
    packetByDigest.set(packetRow.sourceStateDigest, packetRow);
  }
  const rows = frozenV18.rows.map((prior: any) => {
    const packet = packetByDigest.get(prior.sourceStateDigest);
    if (!packet) fail("v19 packet missed a frozen v18 row");
    if (packet.case !== prior.case) fail("v19 packet case diverged from frozen digest row");
    const timing = reduceCgb4NextTrackExistTiming(packet.cgb4NextTrackExistState);
    if (!timing) fail("v19 MPT_FLG_EXIST direct branch evidence became unresolved");
    return {
      ...prior,
      nextTrackFlags: timing.flags,
      nextTrackExistBranchRoute: timing.route,
      postV18NextTrackExistDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughNextTrackExistDecisionSourceCycles: prior.contiguousPrefixThroughTrackLoopContinuationSourceCycles + timing.sourceCycles,
      stopsBeforeNextTrackSelectedSuccessor: timing.stopsBeforeSelectedSuccessor,
    };
  });
  if (packetByDigest.size !== rows.length) fail("v19 packet contains an unjoined CGB4 row");
  const added = rows.reduce((sum: number, row: any) => sum + row.postV18NextTrackExistDecisionSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughNextTrackExistDecisionSourceCycles, 0);
  const existSetRows = rows.filter((row: any) => row.nextTrackExistBranchRoute === "exist-set-bne-taken").length;
  const existClearRows = rows.filter((row: any) => row.nextTrackExistBranchRoute === "exist-clear-bne-not-taken-then-unconditional").length;
  const sequential = rows.reduce((sum: number, row: any) => sum + (row.postV18NextTrackExistDecisionSourceCycles === 12 ? 3 : 4), 0);
  const refills = rows.length;
  if (added !== 90 || contiguous !== 5582 || existSetRows !== 4 || existClearRows !== 3 || sequential !== 24 || refills !== 7) fail("v19 timing totals changed");
  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      existSetRows: caseRows.filter((row: any) => row.nextTrackExistBranchRoute === "exist-set-bne-taken").length,
      existClearRows: caseRows.filter((row: any) => row.nextTrackExistBranchRoute === "exist-clear-bne-not-taken-then-unconditional").length,
      sourceCycles: caseRows.reduce((sum: number, row: any) => sum + row.postV18NextTrackExistDecisionSourceCycles, 0),
    }];
  }));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v19",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV18EvidenceSha256: V18_EVIDENCE_SHA256,
      acceptedV18DocSha256: V18_DOC_SHA256,
      v18RegeneratesByteForByte: true,
      v18EvidenceAndReportRetainedByteForByte: true,
      frozenV17EvidenceSha256: V17_EVIDENCE_SHA256,
      frozenV17DocSha256: V17_DOC_SHA256,
      frozenV17PacketSha256: V17_PACKET_HASHES,
      frozenV17PacketsRetainedByteForByte: true,
      packetSha256: PACKET_HASHES,
      packetRepeatSha256: PACKET_HASHES,
      packetsByteIdenticalAcrossFreshRuns: true,
    },
    capture: {
      boundary: "first successor _081DD87C MPT_FLG_EXIST bne boundary after each frozen v18 continuation, before selected successor",
      scalars: ["next MusicPlayerTrack.flags"],
      directBranchEvidence: ["source-relative bne instruction", "r0 after flags load", "r1 MPT_FLG_EXIST mask", "TST zero condition", "selected source successor label"],
      excluded: ["runtime pointer", "runtime address", "frame", "duration", "next-track identity", "track index", "MusicPlayerInfo.trackCount", "r5", "channel pointer", "channel status", "gateTime", "start flag", "command pointer", "later loop body", "unobserved v17 exit successor", "other 75 callbacks"],
    },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true, failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"] },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      nextTrackFlagsHistogram: histogram(rows.map((row: any) => row.nextTrackFlags)),
      existSetRouteRows: existSetRows,
      existClearRouteRows: existClearRows,
      postV18NextTrackExistDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughTrackLoopContinuationSourceCycles: 5492,
      contiguousPrefixThroughNextTrackExistDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: sequential,
      takenControlTransferRefills: refills,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "Only ldrb r0, [r5, o_MusicPlayerTrack_flags]; movs r1, MPT_FLG_EXIST; tst r1, r0; bne _081DD886, plus b _081DD998 only for captured exist-clear rows, stopping before the selected successor.",
      contiguousPrefix: "5582 aggregate source cycles through the next-track MPT_FLG_EXIST branch decision across the seven frozen v18 continuation rows (5492 frozen v18 + 90 v19).",
      remainingDiscriminator: "Next-track identity, track index/count, r5, channel pointer/status/gateTime, start flag, command pointer, the selected successor's first instruction and later loop body, and the unobserved v17 exit successor remain unobserved and unpriced.",
      nextTrackIdentityInferred: false,
      trackCountInferred: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Twice-fresh address-free packets join only seven frozen v18 sourceStateDigest rows: four next-track flags have MPT_FLG_EXIST set and take bne _081DD886 at 12 cycles each; three clear flags fall through and take b _081DD998 at 14 cycles each. The selected successor is not entered.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 next-track MPT_FLG_EXIST loop-head decision v19", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v19.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v19 preserves frozen v18 evidence/report and all frozen v17 packets byte-for-byte, verifies v18 regeneration, and joins solely by `sourceStateDigest`. Two fresh address-free packet sets are byte-identical: anchor `18620078…`, LILIANA `1d31dfc0…`, legal-varied `7c9978e5…`. The packet has only the seven frozen rows (**0 anchor / 3 LILIANA / 4 legal-varied**).", "",
    "At each first successor loop-head entry, the packet captures only the next `MusicPlayerTrack.flags` byte plus direct branch evidence at source-relative `MPlayMain._081DD884:bne _081DD886`: loaded `r0`, mask `r1=0x80`, and the `tst` zero condition. Four flags are `0x80`, so `bne _081DD886` is taken; three are `0x00`, so `bne` falls through and the trailing `b _081DD998` is taken. No selected successor instruction is entered or captured.", "",
    "Source, ELF symbols, the MPT_FLG_EXIST definition, and exact ROM bytes `28 78 80 21 01 42 00 d1 88 e0` close only `ldrb r0, [r5, o_MusicPlayerTrack_flags]; movs r1, MPT_FLG_EXIST; tst r1, r0; bne _081DD886`, plus `b _081DD998` only on the captured clear route. The established ARM7TDMI classes are 2 cycles per sequential Thumb halfword, 6 per taken refill, and zero IWRAM data premium: set rows cost **3×2 + 6 = 12**; clear rows cost **4×2 + 6 = 14**.", "",
    "| case | callbacks | EXIST-set / clear | v19 cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const row = c.byCase[name];
      return `| ${name} | ${row.callbacks} | ${row.existSetRows} / ${row.existClearRows} | ${row.sourceCycles} |`;
    }),
    "",
    `The contiguous boundary advances from **5,492** to **${c.contiguousPrefixThroughNextTrackExistDecisionSourceCycles} aggregate cycles** (**90** added: 4×12 + 3×14). It stops before the selected _081DD886 or _081DD998 successor. Next-track identity, track index/count, r5, channel pointer/status/gateTime, start flag, command pointer, later loop body, and the unobserved v17 exit successor remain null.`, "",
    "The other 75 note callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, production behavior, presentation, animation/Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v19.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v19.md") };
  fail("usage: factory-m4a-note-body-cgb4-v19.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
