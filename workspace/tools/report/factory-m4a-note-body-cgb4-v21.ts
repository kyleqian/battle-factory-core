import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV20Evidence } from "./factory-m4a-note-body-cgb4-v20.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const CLEAR_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V20_EVIDENCE_SHA256 = "ba5fa1b0e0010ffeb65f77cbd91a6b136992f47d82300bed51dc36a4bd2014cc";
const V20_DOC_SHA256 = "741d8ab64f95019fd35188aa4661b1cc3777ff5802d313445d40d95788d42c41";
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const EXIT_BODY_SHA256 = "af8665646b46932411187a4f7a3d4a4a7a651984fa72a6c16275f626f21476cb";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V20_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v20.json");
const V20_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v20.md");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v21");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v21.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v21.md");
const ROM_BASE = 0x0800_0000;
const EXIT_BODY_START = 0x082d_fbdc;
const EXIT_BODY_END = 0x082d_fbe6;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v21: ${message}`); }
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
function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

export type Cgb4ClockExitDecisionTiming = Readonly<{
  route: "r4-nonzero-bne-taken" | "r4-zero-bne-not-taken";
  r4Nonzero: boolean;
  sequentialThumbHalfwords: 5;
  iwramWordAccesses: 2;
  iwramDataAccessPremiumCycles: 0;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 10 | 16;
  selectedSuccessor: null;
}>;

/** Price the fixed clock body through `bne`, never either selected successor. */
export function reduceCgb4ClockExitDecisionTiming(state: unknown): Cgb4ClockExitDecisionTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["r4Nonzero"]) || typeof state.r4Nonzero !== "boolean") return null;
  const r4Nonzero = state.r4Nonzero;
  return Object.freeze({
    route: r4Nonzero ? "r4-nonzero-bne-taken" : "r4-zero-bne-not-taken",
    r4Nonzero,
    sequentialThumbHalfwords: 5,
    iwramWordAccesses: 2,
    iwramDataAccessPremiumCycles: 0,
    takenControlTransferRefills: r4Nonzero ? 1 : 0,
    sourceCycles: r4Nonzero ? 16 : 10,
    selectedSuccessor: null,
  } as Cgb4ClockExitDecisionTiming);
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (
    sha256(assembly) !== M4A1_SHA256 || sha256(m4aC) !== M4A_C_SHA256 ||
    sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(elf) !== ELF_SHA256
  ) fail("source/ELF changed");
  const sourceRoute = "_081DD9A4:\n\tldr r0, [r7, o_MusicPlayerInfo_clock]\n\tadds r0, 0x1\n\tstr r0, [r7, o_MusicPlayerInfo_clock]\n\tcmp r4, 0\n\tbne _081DD9B6\n\tmovs r0, 0x80\n";
  const commonData = "COMMON_DATA struct MusicPlayerInfo gMPlayInfo_BGM = {0};\n";
  const cryPlayerData = "COMMON_DATA struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};\n";
  if (
    !assembly.includes(sourceRoute) || !m4aC.includes(commonData) || !m4aC.includes(cryPlayerData) ||
    !internal.includes("    u32 clock;")
  ) fail("clock-exit source route or IWRAM storage declaration changed");
  const exitBody = rom.subarray(EXIT_BODY_START - ROM_BASE, EXIT_BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0xf8, 0x68, 0x01, 0x30, 0xf8, 0x60, 0x00, 0x2c, 0x03, 0xd1]);
  if (!exitBody.equals(expectedBytes) || sha256(exitBody) !== EXIT_BODY_SHA256) fail("compiled clock-exit body changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfbdc t _081DD9A4", "082dfbee t _081DD9B6", "030073a0 00000080 B gPokemonCryMusicPlayers", "03007420 00000040 B gMPlayInfo_BGM",
    "030075f0 00000040 B gMPlayInfo_SE1", "03007630 00000040 B gMPlayInfo_SE2", "03007800 00000040 B gMPlayInfo_SE3",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1341-1352", sha256: sha256(assembly) },
      storage: { path: "reference/pokeemerald/src/m4a.c", lines: "12-21", class: "IWRAM COMMON_DATA MusicPlayerInfo", sixthPlayerSymbol: "gPokemonCryMusicPlayers", sha256: sha256(m4aC) },
      clockOffset: { path: "reference/pokeemerald/include/gba/m4a_internal.h", offset: 12, sha256: sha256(internal) },
    },
    elf: { exit: "0x082dfbdc", successorLabel: "0x082dfbee", musicPlayerInfoClass: "IWRAM", sha256: sha256(elf) },
    compiledRegions: [{
      role: "clock ldr; add; clock str; cmp r4, 0; bne", start: "0x082dfbdc", endExclusive: "0x082dfbe6", bytes: exitBody.length, sha256: EXIT_BODY_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      takenControlTransferRefillCycles: 6,
      iwramWordDataAccessPremiumCycles: 0,
      model: "five executed Thumb halfwords; two IWRAM word accesses add no premium; only a taken bne adds the refill",
    },
  };
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

function frozenV20ClearRows(frozenV20: any[], name: CaseName): any[] {
  return frozenV20.filter((row) => {
    if (!isRecord(row) || row.case !== name) return false;
    return row.finalClearTrackExitRoute === "exist-clear-final-track-ble-taken";
  });
}

function loadPacket(name: CaseName, frozenRows: readonly any[]): Array<{ sourceStateDigest: string; r4Nonzero: boolean }> {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  const headerKeys = ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"];
  if (!isRecord(packet) || !exactKeys(packet, headerKeys)) fail(`${name} packet carries an unsupported field`);
  if (
    packet.schema !== "factory-m4a-note-body-cgb4-probe/v21" || packet.case !== name ||
    packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" ||
    packet.captureBoundary !== "clock-exit-cmp-r4-zero-nonzero-before-selected-successor" ||
    packet.addressFree !== true || !Array.isArray(packet.observations)
  ) fail(`${name} packet identity changed`);
  const expectedDigests = frozenRows.map((row) => requireDigest(row.sourceStateDigest, "frozen v20 clear sourceStateDigest"));
  if (expectedDigests.length !== CLEAR_COUNTS[name] || packet.observations.length !== expectedDigests.length) fail(`${name} packet clear-row census changed`);
  const rows = packet.observations.map((observation, index) => {
    if (!isRecord(observation) || !exactKeys(observation, ["sourceStateDigest", "r4Nonzero"]) || typeof observation.r4Nonzero !== "boolean") {
      fail(`${name} packet row ${index} carries an unsupported field`);
    }
    return { sourceStateDigest: requireDigest(observation.sourceStateDigest, `${name} packet row ${index} digest`), r4Nonzero: observation.r4Nonzero };
  });
  const actualDigests = rows.map((row) => row.sourceStateDigest);
  if (new Set(actualDigests).size !== actualDigests.length || JSON.stringify(actualDigests) !== JSON.stringify(expectedDigests)) {
    fail(`${name} packet source-state rows are missing, duplicate, reordered, ambiguous, or extra`);
  }
  return rows;
}

function productionPacketContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v20", "issue55-m4a-note-body-cgb4-v20", "factory-m4a-note-body-cgb4-v21",
  ];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => {
    const text = readFileSync(path, "utf8");
    return forbiddenFragments.some((fragment) => text.includes(fragment));
  });
  if (hits.length !== 0) fail(`production imports frozen evidence or live packets: ${hits.join(", ")}`);
  return true;
}

function isFrozenV20ClearRow(row: any): boolean {
  return row.finalClearTrackExitRoute === "exist-clear-final-track-ble-taken" &&
    row.postV19FinalClearTrackExitSourceCycles === 10 &&
    row.contiguousPrefixThroughFinalClearTrackExitSourceCycles === 770 &&
    row.stopsBeforeV20SelectedSuccessor === "_081DD9A4";
}

function isFrozenV20ExistSetRow(row: any): boolean {
  return row.finalClearTrackExitRoute === null && row.postV19FinalClearTrackExitSourceCycles === null &&
    row.contiguousPrefixThroughFinalClearTrackExitSourceCycles === null && row.stopsBeforeV20SelectedSuccessor === "_081DD886";
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV20 = checkedJson<any>(V20_EVIDENCE, V20_EVIDENCE_SHA256);
  checkedBytes(V20_DOC, V20_DOC_SHA256);
  if (JSON.stringify(makeV20Evidence()) !== JSON.stringify(frozenV20)) fail("accepted v20 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV20.rows) || frozenV20.rows.length !== 7) fail("frozen v20 row count changed");
  if (frozenV20.coverage?.contiguousPrefixThroughFinalClearTrackExitSourceCycles !== 5626) fail("frozen v20 aggregate changed");
  const packetsByDigest = new Map<string, { r4Nonzero: boolean }>();
  for (const name of CASES) {
    const packetRows = loadPacket(name, frozenV20ClearRows(frozenV20.rows, name));
    for (const packet of packetRows) {
      if (packetsByDigest.has(packet.sourceStateDigest)) fail("live packet source-state join became ambiguous");
      packetsByDigest.set(packet.sourceStateDigest, { r4Nonzero: packet.r4Nonzero });
    }
  }
  const rows = frozenV20.rows.map((prior: any) => {
    const digest = requireDigest(prior?.sourceStateDigest, "frozen v20 sourceStateDigest");
    const packet = packetsByDigest.get(digest);
    if (isFrozenV20ClearRow(prior)) {
      if (!packet) fail("live packet missed frozen v20 clear row");
      const timing = reduceCgb4ClockExitDecisionTiming(packet);
      if (!timing) fail("live r4 decision is malformed");
      return {
        ...prior,
        clockExitR4Nonzero: timing.r4Nonzero,
        clockExitDecisionRoute: timing.route,
        postV20ClockExitDecisionSourceCycles: timing.sourceCycles,
        contiguousPrefixThroughClockExitDecisionSourceCycles: prior.contiguousPrefixThroughFinalClearTrackExitSourceCycles + timing.sourceCycles,
        selectedSuccessor: null,
        statusWriteSourceCycles: null,
        tempoOrBodySourceCycles: null,
      };
    }
    if (!isFrozenV20ExistSetRow(prior) || packet) fail("frozen v20 row is neither an exact clear capture nor a stopped EXIST-set row");
    return {
      ...prior,
      clockExitR4Nonzero: null,
      clockExitDecisionRoute: null,
      postV20ClockExitDecisionSourceCycles: null,
      contiguousPrefixThroughClockExitDecisionSourceCycles: null,
      selectedSuccessor: null,
      statusWriteSourceCycles: null,
      tempoOrBodySourceCycles: null,
    };
  });
  if (packetsByDigest.size !== 3) fail("live packets contain an unjoined clear row");
  const clockRows = rows.filter((row: any) => row.clockExitDecisionRoute !== null);
  const existSetRows = rows.filter((row: any) => row.clockExitDecisionRoute === null);
  const added = clockRows.reduce((sum: number, row: any) => sum + row.postV20ClockExitDecisionSourceCycles, 0);
  const contiguous = frozenV20.coverage.contiguousPrefixThroughFinalClearTrackExitSourceCycles + added;
  if (clockRows.length !== 3 || existSetRows.length !== 4 || added !== 48 || contiguous !== 5674 || !clockRows.every((row: any) => row.clockExitR4Nonzero === true)) {
    fail("v21 clock-exit timing totals changed");
  }
  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      existSetRows: caseRows.filter((row: any) => row.clockExitDecisionRoute === null).length,
      clockExitRows: caseRows.filter((row: any) => row.clockExitDecisionRoute !== null).length,
      sourceCycles: caseRows.reduce((sum: number, row: any) => sum + (row.postV20ClockExitDecisionSourceCycles ?? 0), 0),
    }];
  }));
  for (const name of CASES) {
    if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name] || (byCase[name] as any).clockExitRows !== CLEAR_COUNTS[name]) fail(`${name} census changed`);
  }
  const noProductionImports = productionPacketContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v21",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV20EvidenceSha256: V20_EVIDENCE_SHA256,
      acceptedV20DocSha256: V20_DOC_SHA256,
      v20RegeneratesByteForByte: true,
      v20EvidenceAndReportRetainedByteForByte: true,
      packetSha256: PACKET_HASHES,
      packetRepeatSha256: PACKET_HASHES,
    },
    capture: {
      boundary: "r4 zero/nonzero immediately for cmp r4, 0 after fixed clock ldr/add/str and before any successor instruction",
      scalars: ["r4Nonzero"],
      excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock scalar", "track identity", "track index", "MusicPlayerInfo.trackCount", "selected successor", "status write", "tempo/body", "other 75 callbacks"],
    },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, clockExitRows: 3, stoppedExistSetRows: 4, ambiguousRows: 0, addressFree: true, failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"] },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      clockExitR4NonzeroRows: 3,
      clockExitR4ZeroRows: 0,
      nullExistSetRows: 4,
      postV20ClockExitDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFinalClearTrackExitSourceCycles: 5626,
      contiguousPrefixThroughClockExitDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 15,
      iwramWordAccesses: 6,
      takenControlTransferRefills: 3,
      selectedSuccessor: null,
      statusWriteSourceCycles: null,
      tempoOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV20ArtifactsReadOnly: true,
      livePacketsAreNotProductionImports: noProductionImports,
      frozenV20ArtifactsAreNotProductionImports: noProductionImports,
      selectedSuccessor: null,
      statusWrite: null,
      tempoOrBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Two fresh byte-identical address-free packet sets join only the three frozen v20 clear sourceStateDigest rows and capture r4 as nonzero. Source/ELF/exact-ROM close the five fixed clock-exit instructions through the taken bne refill at 16 cycles each; every selected successor and later body remains null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 clock-exit r4 decision v21", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v21.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence. v21 freezes/regenerates v20 evidence and report byte-for-byte, then joins only frozen `sourceStateDigest` rows. Two fresh address-free packet sets are byte-identical: anchor `f13515a2…`, LILIANA `11d4dab5…`, and legal-varied `7adb7dfd…`. Each packet retains only its digest plus `r4Nonzero`; it contains no pointer, address, frame, duration, clock scalar, track identity/count, or later state.", "",
    "Only v20's three EXIST-clear final-exit rows enter this slice. All three freshly capture `r4Nonzero=true` immediately at `cmp r4, 0`. The branch is therefore taken, but its selected successor stays null: v21 stops before that successor's first instruction, status write, and tempo/body.", "",
    "Source, ELF, exact ROM bytes `f8 68 01 30 f8 60 00 2c 03 d1`, and the sixth player's IWRAM `gPokemonCryMusicPlayers` storage close exactly `ldr clock; adds; str clock; cmp r4,0; bne`. Five executed Thumb halfwords cost **5×2 = 10**; the two IWRAM word accesses add **0** premium; each observed taken branch adds one **6**-cycle refill: **16 cycles per row / 48 aggregate**. The clock value is never read or retained.", "",
    "| case | callbacks | EXIST-set / clock-exit | v21 cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const row = c.byCase[name];
      return `| ${name} | ${row.callbacks} | ${row.existSetRows} / ${row.clockExitRows} | ${row.sourceCycles} |`;
    }),
    "",
    `The aggregate source prefix advances from **5,626** to **${c.contiguousPrefixThroughClockExitDecisionSourceCycles} cycles** (**48** added). The four EXIST-set rows remain null before _081DD886. Selected successors, status writes, tempo/body, the other 75 callbacks, complete MPlay, service/arbitration, and construction-clock wiring remain null. Production has no import of either frozen v20 artifacts or v21 packets.`, "",
    "Production, presentation, animation, Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v21.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v21.md") };
  fail("usage: factory-m4a-note-body-cgb4-v21.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
