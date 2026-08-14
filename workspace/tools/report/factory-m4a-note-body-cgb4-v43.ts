import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CLEAR_ROUTE = "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" as const;
const NONZERO_ROUTE = "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken" as const;
const V37_EVIDENCE_SHA256 = "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c";
const V37_DOC_SHA256 = "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601";
const V38_EVIDENCE_SHA256 = "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce";
const V38_DOC_SHA256 = "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090";
const V39_EVIDENCE_SHA256 = "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626";
const V39_DOC_SHA256 = "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1";
const V40_EVIDENCE_SHA256 = "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a";
const V40_DOC_SHA256 = "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3";
const V41_EVIDENCE_SHA256 = "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963";
const V41_DOC_SHA256 = "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e";
const V42_EVIDENCE_SHA256 = "b18d54cc288cb3f99df8de3f059ce499ac7254e2758f7770cf4a43deef6873c6";
const V42_DOC_SHA256 = "07e866c8fd5d98e5ddb277e9a7fd0dbef9dda24f06c910e62b90c6f9a0c194d4";
const V37_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
};
const V39_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
};
const V41_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
};
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;
const CLEAR_DIGESTS = new Set<string>(SELECTED_DIGESTS.slice(1));
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const FOURTH_DECREMENT_SHA256 = "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a";
const FOURTH_CONTINUATION_SHA256 = "05a30c0a17fafc028ce3218c1ad9921ce4ffd3efc591503956f4793a4c43b993";
const FIFTH_EXIST_SHA256 = "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66";
const FIFTH_VOL_PITCH_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V37_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json");
const V37_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v37.md");
const V38_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json");
const V38_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v38.md");
const V39_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json");
const V39_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v39.md");
const V40_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json");
const V40_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v40.md");
const V41_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json");
const V41_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v41.md");
const V42_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v42.json");
const V42_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v42.md");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const V39_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v39");
const V41_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v41");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v43.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v43.md");
const ROM_BASE = 0x0800_0000;
const FOURTH_DECREMENT_START = 0x082d_fc9a;
const FOURTH_DECREMENT_END = 0x082d_fc9e;
const FOURTH_CONTINUATION_START = 0x082d_fc9e;
const FOURTH_CONTINUATION_END = 0x082d_fca4;
const FIFTH_EXIST_START = 0x082d_fc00;
const FIFTH_EXIST_END = 0x082d_fc08;
const FIFTH_VOL_PITCH_START = 0x082d_fc08;
const FIFTH_VOL_PITCH_END = 0x082d_fc0e;

function fail(message: string): never {
  throw new Error("factory-m4a-note-body-cgb4-v43: " + message);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(path + " changed");
  return bytes;
}

function checkedJson(path: string, hash: string): unknown {
  return JSON.parse(checkedBytes(path, hash).toString("utf8"));
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(label + " must be a SHA-256 digest");
  return value;
}

function requireU32(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff) fail(label + " must be a u32");
  return value;
}

export type Cgb4FifthTrackClearDecrementTiming = Readonly<{
  route: "subs-r2-1; ble-not-taken";
  r2BeforeFifthTrackClearDecrement: 6;
  r2AfterFifthTrackClearDecrement: 5;
  sequentialThumbHalfwords: 2;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  bleTakenControlTransferRefills: 0;
  takenControlTransferRefills: 0;
  sourceCycles: 4;
  stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size";
}>;

/** Price only the source-derived clear-route fifth-track decrement/exit decision. */
export function reduceCgb4FifthTrackClearDecrementTiming(state: unknown): Cgb4FifthTrackClearDecrementTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["r2BeforeFifthTrackClearDecrement"])) return null;
  let r2BeforeFifthTrackClearDecrement: number;
  try {
    r2BeforeFifthTrackClearDecrement = requireU32(state.r2BeforeFifthTrackClearDecrement, "r2BeforeFifthTrackClearDecrement");
  } catch {
    return null;
  }
  if (r2BeforeFifthTrackClearDecrement !== 6) return null;
  return Object.freeze({
    route: "subs-r2-1; ble-not-taken",
    r2BeforeFifthTrackClearDecrement: 6,
    r2AfterFifthTrackClearDecrement: 5,
    sequentialThumbHalfwords: 2,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    bleTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 4,
    stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
  });
}

function checkedRegion(rom: Buffer, start: number, end: number, bytes: readonly number[], hash: string, label: string): Buffer {
  const region = rom.subarray(start - ROM_BASE, end - ROM_BASE);
  const expected = Buffer.from(bytes);
  if (!region.equals(expected) || sha256(region) !== hash) fail("compiled " + label + " changed");
  return region;
}

function decodeConditionalBranch(start: number, instruction: number, opcode: number, target: number, label: string): void {
  const signedImm8 = (instruction & 0x80) === 0 ? instruction & 0xff : (instruction & 0xff) - 0x100;
  const decodedTarget = start + 4 + signedImm8 * 2;
  if ((instruction & 0xff00) !== opcode || decodedTarget !== target) fail("compiled " + label + " branch changed");
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) {
    fail("source, ELF, or ROM changed");
  }
  const fourthDecrement = ["_081DDA62:", "\tsubs r2, 0x1", "\tble _081DDA6C"].join("\n");
  const fourthContinuation = ["\tmovs r0, MusicPlayerTrack_size", "\tadds r5, r0", "\tbgt _081DD9C8"].join("\n");
  const fifthExist = [
    "_081DD9C8:", "\tldrb r0, [r5, o_MusicPlayerTrack_flags]", "\tmovs r1, 0x80", "\ttst r1, r0", "\tbeq _081DDA62",
  ].join("\n");
  const fifthVolPitch = ["\tmovs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG", "\ttst r1, r0", "\tbeq _081DDA62"].join("\n");
  const successors = ["\tmovs r0, MusicPlayerTrack_size", "\tadds r5, r0", "\tbgt _081DD9C8", "_081DDA6C:", "\tldr r0, lt2_ID_NUMBER"].join("\n");
  if (!assembly.includes(fourthDecrement) || !assembly.includes(fourthContinuation) || !assembly.includes(fifthExist) || !assembly.includes(fifthVolPitch) || !assembly.includes(successors)) {
    fail("fifth clear-route predecessor, decrement, or body boundary changed");
  }
  const fourthDecrementBytes = checkedRegion(rom, FOURTH_DECREMENT_START, FOURTH_DECREMENT_END, [0x01, 0x3a, 0x02, 0xdd], FOURTH_DECREMENT_SHA256, "fourth-track decrement/branch");
  const fourthContinuationBytes = checkedRegion(rom, FOURTH_CONTINUATION_START, FOURTH_CONTINUATION_END, [0x50, 0x20, 0x2d, 0x18, 0xad, 0xdc], FOURTH_CONTINUATION_SHA256, "fourth-track continuation");
  const fifthExistBytes = checkedRegion(rom, FIFTH_EXIST_START, FIFTH_EXIST_END, [0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x48, 0xd0], FIFTH_EXIST_SHA256, "fifth-track EXIST decision");
  const fifthVolPitchBytes = checkedRegion(rom, FIFTH_VOL_PITCH_START, FIFTH_VOL_PITCH_END, [0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0], FIFTH_VOL_PITCH_SHA256, "fifth-track volume/pitch decision");
  decodeConditionalBranch(FOURTH_DECREMENT_START + 2, fourthDecrementBytes.readUInt16LE(2), 0xdd00, 0x082d_fca4, "fifth clear-route ble");
  decodeConditionalBranch(FOURTH_CONTINUATION_START + 4, fourthContinuationBytes.readUInt16LE(4), 0xdc00, 0x082d_fc00, "fourth-track continuation bgt");
  decodeConditionalBranch(FIFTH_EXIST_START + 6, fifthExistBytes.readUInt16LE(6), 0xd000, 0x082d_fc9a, "fifth-track EXIST beq");
  decodeConditionalBranch(FIFTH_VOL_PITCH_START + 4, fifthVolPitchBytes.readUInt16LE(4), 0xd000, 0x082d_fc9a, "fifth-track volume/pitch beq");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail("ELF symbol " + symbol + " changed");
  }
  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1363-1372, 1443-1450", sha256: sha256(assembly) },
      r2PreservationPath: [
        "frozen v39 fourth-track subs r2, 0x1 leaves 6 and ble is not taken",
        "v40 movs/adds/bgt continuation writes r0/r5 and branches, not r2",
        "v41 fifth-track EXIST load/test/beq writes r0/r1 and flags, not r2",
        "v42 clear volume/pitch movs/test/taken beq writes r0/r1 and flags, not r2",
      ],
    },
    elf: {
      containingEntry: "0x082dfc00",
      instructionStart: "0x082dfc9a",
      endExclusive: "0x082dfc9e",
      clearMaskTakenSuccessor: "0x082dfc9a",
      takenSuccessor: "0x082dfca4",
      nonTakenSuccessorFirstInstruction: "movs r0, MusicPlayerTrack_size",
      takenSuccessorFirstInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "subs r2, 0x1; ble _081DDA6C",
      start: "0x082dfc9a",
      endExclusive: "0x082dfc9e",
      bytes: fourthDecrementBytes.length,
      bytesHex: "01 3a 02 dd",
      sha256: FOURTH_DECREMENT_SHA256,
      decodedBle: { condition: "LE", target: "_081DDA6C", targetAddress: "0x082dfca4" },
    }],
    predecessorR2PreservationRegions: [
      { role: "fourth-track positive continuation", start: "0x082dfc9e", endExclusive: "0x082dfca4", bytesHex: "50 20 2d 18 ad dc", sha256: FOURTH_CONTINUATION_SHA256, writesR2: false },
      { role: "fifth-track EXIST decision", start: "0x082dfc00", endExclusive: "0x082dfc08", bytesHex: "28 78 80 21 01 42 48 d0", sha256: FIFTH_EXIST_SHA256, writesR2: false },
      { role: "fifth-track volume/pitch decision", start: "0x082dfc08", endExclusive: "0x082dfc0e", bytesHex: "0f 21 01 42 45 d0", sha256: FIFTH_VOL_PITCH_SHA256, writesR2: false },
    ],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      bleNotTakenModel: "subs; non-taken ble = 2 halfwords * 2 + zero refill = 4",
      bleTakenModel: "subs; taken ble = 2 halfwords * 2 + one 6-cycle refill = 10",
    },
  };
}

function assertReportRegenerates(script: string, evidenceName: string, docName: string, expectedEvidence: Buffer, expectedDoc: Buffer, label: string): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v43-" + label + "-"));
  execFileSync(process.execPath, ["--experimental-strip-types", script, "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, evidenceName)).equals(expectedEvidence)) fail(label + " evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, docName)).equals(expectedDoc)) fail(label + " report does not regenerate byte-for-byte");
}

function assertFrozenArtifactsAndReportsRegenerate(): void {
  checkedBytes(V37_EVIDENCE, V37_EVIDENCE_SHA256);
  checkedBytes(V37_DOC, V37_DOC_SHA256);
  checkedBytes(V38_EVIDENCE, V38_EVIDENCE_SHA256);
  checkedBytes(V38_DOC, V38_DOC_SHA256);
  checkedBytes(V39_EVIDENCE, V39_EVIDENCE_SHA256);
  checkedBytes(V39_DOC, V39_DOC_SHA256);
  checkedBytes(V40_EVIDENCE, V40_EVIDENCE_SHA256);
  checkedBytes(V40_DOC, V40_DOC_SHA256);
  checkedBytes(V41_EVIDENCE, V41_EVIDENCE_SHA256);
  checkedBytes(V41_DOC, V41_DOC_SHA256);
  const v42Evidence = checkedBytes(V42_EVIDENCE, V42_EVIDENCE_SHA256);
  const v42Doc = checkedBytes(V42_DOC, V42_DOC_SHA256);
  for (const name of CASES) {
    checkedBytes(join(V37_PACKETS, name + ".json"), V37_PACKET_HASHES[name]);
    checkedBytes(join(V39_PACKETS, name + ".json"), V39_PACKET_HASHES[name]);
    checkedBytes(join(V41_PACKETS, name + ".json"), V41_PACKET_HASHES[name]);
  }
  // v42's own generator recursively regenerates v41, v40, v39, and their
  // predecessors. Running this one immediate predecessor is intentionally the
  // only regeneration here: it proves the whole retained ancestry without
  // duplicating that recursive work or weakening any byte pin above.
  assertReportRegenerates("tools/report/factory-m4a-note-body-cgb4-v42.ts", "factory-m4a-note-body-cgb4-evidence-v42.json", "issue55-m4a-note-body-cgb4-v42.md", v42Evidence, v42Doc, "v42");
}

type FrozenV39Row = {
  sourceStateDigest: string;
  r2BeforeFourthTrackDecrement: 7;
};

type FrozenV42Row = {
  sourceStateDigest: string;
  route: typeof CLEAR_ROUTE | typeof NONZERO_ROUTE;
  contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: 966 | 972;
  stopsBeforeV42Instruction: "mov r9, r2" | "_081DDA62: subs r2, 0x1";
};

function frozenV39Rows(frozenV39: unknown): Map<string, FrozenV39Row> {
  if (!isRecord(frozenV39) || frozenV39.schema !== "factory-m4a-note-body-cgb4-evidence/v39" || frozenV39.oracleProfile !== "battle-scene-off" || frozenV39.addressFree !== true || !Array.isArray(frozenV39.rows)) {
    fail("frozen v39 evidence identity changed");
  }
  const result = new Map<string, FrozenV39Row>();
  for (const [index, row] of frozenV39.rows.entries()) {
    const expected = [
      "sourceStateDigest", "r2BeforeDecrement", "fourthTrackDecrementDecision",
      "postV38FourthTrackDecrementDecisionSourceCycles", "contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles",
      "bleTakenControlTransferRefills", "stopsBeforeV39Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail("frozen v39 row " + index + " carries an unsupported field");
    const sourceStateDigest = requireDigest(row.sourceStateDigest, "frozen v39 row " + index + " digest");
    if (
      !SELECTED_DIGESTS.includes(sourceStateDigest as typeof SELECTED_DIGESTS[number]) || result.has(sourceStateDigest) ||
      requireU32(row.r2BeforeDecrement, "frozen v39 row " + index + " r2") !== 7 ||
      row.fourthTrackDecrementDecision !== "subs-r2-1; ble-not-taken" ||
      row.postV38FourthTrackDecrementDecisionSourceCycles !== 4 ||
      row.contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles !== 940 ||
      row.bleTakenControlTransferRefills !== 0 || row.stopsBeforeV39Instruction !== "movs r0, MusicPlayerTrack_size"
    ) fail("frozen v39 row " + index + " no longer proves r2=7 through the positive fourth-track continuation");
    result.set(sourceStateDigest, { sourceStateDigest, r2BeforeFourthTrackDecrement: 7 });
  }
  if (result.size !== SELECTED_DIGESTS.length || !SELECTED_DIGESTS.every((digest) => result.has(digest))) {
    fail("frozen v39 sourceStateDigest join is missing, duplicate, ambiguous, or extra");
  }
  return result;
}

function frozenV42Rows(frozenV42: unknown): FrozenV42Row[] {
  if (!isRecord(frozenV42) || frozenV42.schema !== "factory-m4a-note-body-cgb4-evidence/v42" || frozenV42.oracleProfile !== "battle-scene-off" || frozenV42.addressFree !== true || !Array.isArray(frozenV42.rows)) {
    fail("frozen v42 evidence identity changed");
  }
  const result: FrozenV42Row[] = [];
  const seen = new Set<string>();
  for (const [index, row] of frozenV42.rows.entries()) {
    const expected = [
      "sourceStateDigest", "fifthTrackVolPitchMaskDecision", "postV41FifthTrackVolPitchDecisionSourceCycles",
      "contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV42Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail("frozen v42 row " + index + " carries an unsupported field");
    const sourceStateDigest = requireDigest(row.sourceStateDigest, "frozen v42 row " + index + " digest");
    if (!SELECTED_DIGESTS.includes(sourceStateDigest as typeof SELECTED_DIGESTS[number]) || seen.has(sourceStateDigest)) {
      fail("frozen v42 sourceStateDigest join is missing, duplicate, ambiguous, or extra");
    }
    const clear = CLEAR_DIGESTS.has(sourceStateDigest);
    const expectedRoute = clear ? CLEAR_ROUTE : NONZERO_ROUTE;
    const expectedCycles = clear ? 12 : 6;
    const expectedPrefix = clear ? 972 : 966;
    const expectedRefills = clear ? 1 : 0;
    const expectedStop = clear ? "_081DDA62: subs r2, 0x1" : "mov r9, r2";
    if (
      row.fifthTrackVolPitchMaskDecision !== expectedRoute ||
      row.postV41FifthTrackVolPitchDecisionSourceCycles !== expectedCycles ||
      row.contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles !== expectedPrefix ||
      row.beqTakenControlTransferRefills !== expectedRefills || row.stopsBeforeV42Instruction !== expectedStop
    ) fail("frozen v42 row " + index + " no longer selects its frozen volume/pitch boundary");
    seen.add(sourceStateDigest);
    result.push({
      sourceStateDigest,
      route: expectedRoute,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: expectedPrefix as 966 | 972,
      stopsBeforeV42Instruction: expectedStop as "mov r9, r2" | "_081DDA62: subs r2, 0x1",
    });
  }
  if (result.length !== SELECTED_DIGESTS.length || seen.size !== SELECTED_DIGESTS.length || !SELECTED_DIGESTS.every((digest) => seen.has(digest))) {
    fail("frozen v42 rows are incomplete or reordered outside the accepted source-state set");
  }
  return result;
}

function productionReceiptContainment(): boolean {
  const fragments = Array.from({ length: 7 }, (_, index) => 37 + index).flatMap((version) => [
    "factory-m4a-note-body-cgb4-evidence-v" + version,
    "issue55-m4a-note-body-cgb4-v" + version,
    "factory-m4a-note-body-cgb4-v" + version,
  ]);
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)));
  if (hits.length !== 0) fail("production imports frozen evidence or packets: " + hits.join(", "));
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV39 = checkedJson(V39_EVIDENCE, V39_EVIDENCE_SHA256);
  const frozenV42 = checkedJson(V42_EVIDENCE, V42_EVIDENCE_SHA256);
  assertFrozenArtifactsAndReportsRegenerate();
  const sourceAndElf = assertSourceElfRom();
  const v39BySourceStateDigest = frozenV39Rows(frozenV39);
  const v42Rows = frozenV42Rows(frozenV42);
  const clearV42Rows = v42Rows.filter((row) => row.route === CLEAR_ROUTE);
  const nonzeroV42Rows = v42Rows.filter((row) => row.route === NONZERO_ROUTE);
  const rows = clearV42Rows.map((prior) => {
    const predecessor = v39BySourceStateDigest.get(prior.sourceStateDigest);
    if (!predecessor || predecessor.r2BeforeFourthTrackDecrement !== 7) fail("clear v42 row lost its retained v39 r2 predecessor");
    const timing = reduceCgb4FifthTrackClearDecrementTiming({ r2BeforeFifthTrackClearDecrement: predecessor.r2BeforeFourthTrackDecrement - 1 });
    if (!timing) fail("frozen fourth-track r2 no longer reaches the fifth clear-route decrement as 6");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      r2BeforeFifthTrackClearDecrement: timing.r2BeforeFifthTrackClearDecrement,
      r2AfterFifthTrackClearDecrement: timing.r2AfterFifthTrackClearDecrement,
      fifthTrackClearDecrementDecision: timing.route,
      postV42FifthTrackClearDecrementDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles:
        prior.contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles + timing.sourceCycles,
      bleTakenControlTransferRefills: timing.bleTakenControlTransferRefills,
      stopsBeforeV43Instruction: timing.stopsBeforeInstruction,
    };
  });
  const rowsBySourceStateDigest = new Map(rows.map((row) => [row.sourceStateDigest, row]));
  const added = rows.reduce((sum, row) => sum + row.postV42FifthTrackClearDecrementDecisionSourceCycles, 0);
  const contiguous = 6226 + added;
  if (
    v42Rows.length !== 3 || clearV42Rows.length !== 2 || nonzeroV42Rows.length !== 1 ||
    nonzeroV42Rows[0]!.sourceStateDigest !== SELECTED_DIGESTS[0] || nonzeroV42Rows[0]!.stopsBeforeV42Instruction !== "mov r9, r2" ||
    rows.length !== 2 || rowsBySourceStateDigest.size !== CLEAR_DIGESTS.size ||
    ![...CLEAR_DIGESTS].every((digest) => {
      const row = rowsBySourceStateDigest.get(digest);
      return row?.r2BeforeFifthTrackClearDecrement === 6 && row.r2AfterFifthTrackClearDecrement === 5 &&
        row.fifthTrackClearDecrementDecision === "subs-r2-1; ble-not-taken" &&
        row.postV42FifthTrackClearDecrementDecisionSourceCycles === 4 &&
        row.contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles === 976 &&
        row.bleTakenControlTransferRefills === 0 && row.stopsBeforeV43Instruction === "movs r0, MusicPlayerTrack_size";
    }) ||
    added !== 8 || contiguous !== 6234
  ) fail("frozen source-state predecessor or fifth clear-route decrement pricing changed; refuse to enter either successor body");
  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v43",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: {
      acceptedV42EvidenceSha256: V42_EVIDENCE_SHA256,
      acceptedV42DocSha256: V42_DOC_SHA256,
      acceptedV41EvidenceSha256: V41_EVIDENCE_SHA256,
      acceptedV41DocSha256: V41_DOC_SHA256,
      acceptedV41PacketSha256: V41_PACKET_HASHES,
      acceptedInheritedV40EvidenceSha256: V40_EVIDENCE_SHA256,
      acceptedInheritedV40DocSha256: V40_DOC_SHA256,
      acceptedInheritedV39EvidenceSha256: V39_EVIDENCE_SHA256,
      acceptedInheritedV39DocSha256: V39_DOC_SHA256,
      acceptedInheritedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV38EvidenceSha256: V38_EVIDENCE_SHA256,
      acceptedInheritedV38DocSha256: V38_DOC_SHA256,
      acceptedInheritedV37EvidenceSha256: V37_EVIDENCE_SHA256,
      acceptedInheritedV37DocSha256: V37_DOC_SHA256,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v42HasNoPacket: true,
      v42RegenerationTransitivelyVerifiesV41AndInheritedEvidenceReportsByteForByte: true,
      v42V41PacketsAndInheritedEvidenceRetainedByteForByte: true,
      v43RuntimeCaptureCount: 0,
    },
    capture: {
      boundary: "source-only fifth-track clear-route _081DDA62 decrement/exit decision through ble; no new runtime capture",
      scalars: [],
      derivedFromFrozenPredecessorOnly: ["sourceStateDigest", "frozen v39 r2BeforeDecrement=7", "source-proven fourth decrement and r2-preserving v40/v41/v42 path"],
      excluded: [
        "new runtime or oracle fields", "new r2 capture", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "fifthTrackFlags serialization", "v42 nonzero-mask mov r9, r2 body",
        "positive continuation body at movs r0, MusicPlayerTrack_size", "exit body at _081DDA6C: ldr r0, lt2_ID_NUMBER", "later loop work", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV42Rows: 3,
      selectedClearV42Rows: clearV42Rows.length,
      frozenNonzeroMaskV42Rows: nonzeroV42Rows.length,
      retainedV39Rows: v39BySourceStateDigest.size,
      joinedRows: rows.length,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "ambiguous", "extra", "non-v42-clear-row", "non-v39-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v42-route", "unexpected-frozen-v39-r2-or-route", "unexpected-r2-preservation-path",
      ],
    },
    predecessorRegisterProof: {
      key: "sourceStateDigest",
      frozenV39R2BeforeFourthTrackDecrement: 7,
      fourthTrackPostDecrementR2: 6,
      v40V41V42R2Writes: false,
      r2BeforeFifthTrackClearDecrement: 6,
      r2AfterFifthTrackClearDecrement: 5,
      noNewRuntimeScalar: true,
    },
    coverage: {
      frozenV42Rows: 3,
      frozenV42ClearMaskRows: clearV42Rows.length,
      frozenV42NonzeroMaskRows: nonzeroV42Rows.length,
      sourceOnlyClearDecrementRows: rows.length,
      postV42FifthTrackClearDecrementDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: 6226,
      contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      frozenNonzeroMaskRowRemainsAtV42Stop: true,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV42ArtifactsReadOnly: true,
      frozenV41ArtifactsAndPacketsReadOnly: true,
      inheritedV40ArtifactsReadOnly: true,
      inheritedV39ArtifactsAndPacketsReadOnly: true,
      inheritedV38ArtifactsReadOnly: true,
      inheritedV37ArtifactsAndPacketsReadOnly: true,
      frozenArtifactsAreNotProductionImports: noProductionImports,
      v43RuntimeCaptureCount: 0,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      fifthTrackFlags: null,
      newRuntimeR2Scalar: null,
      v42NonzeroMaskBody: null,
      positiveContinuationBody: null,
      exitBody: null,
      laterLoop: null,
      otherPostSelectionCallbacks: null,
      completeMPlay: null,
      serviceCost: null,
      arbitration: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Source-only v43 freezes v42 and v41 evidence/reports/packets plus inherited v37-v40 evidence byte-for-byte, regenerates v39/v41/v42, and joins only the two frozen v42 clear-mask rows by sourceStateDigest. Frozen v39 proves r2=7 before the positive fourth-track decrement; source/ELF/ROM prove that decrement leaves 6 and v40/v41/v42 reach _081DDA62 without an r2 write. Thus each fifth clear-route decrement receives r2=6, leaves 5, and takes no ble refill: subs r2, 0x1; ble costs 4 cycles per row, 8 aggregate, advancing the mixed v42 prefix from 6226 to 6234. The 0x83 nonzero-mask row remains frozen at v42 before mov r9, r2; v43 enters neither the positive continuation nor exit body.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  const rows = evidence.rows as Array<Record<string, unknown>>;
  return [
    "# Issue #55 — CGB4 fifth-track clear-route decrement/exit decision v43",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v43.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, address-free, and source-only. v43 freezes v42 and v41 evidence/reports/packets plus inherited v37-v40 evidence byte-for-byte, regenerates the v39/v41/v42 predecessors byte-for-byte, and joins only the two frozen clear-mask v42 rows by `sourceStateDigest`. It performs no oracle capture and accepts no new runtime scalar.",
    "",
    "The retained v39 row for each selected digest proves `r2BeforeDecrement = 7` on the fourth-track `subs r2, 0x1; ble` and its not-taken route leaves `r2 = 6`. Exact source/ELF/ROM prove the v40 `movs/adds/bgt` continuation, v41 fifth-track EXIST decision, and v42 clear volume/pitch decision write no `r2`; the v42 `beq` lands directly at `_081DDA62`. Therefore the exact `r2` reaching each selected fifth clear-route decrement is **6**, derived solely by the retained `sourceStateDigest` join rather than a new capture or count/index inference.",
    "",
    "Source/ELF/exact-ROM close only `_081DDA62..0x082dfc9e`: `subs r2, 0x1; ble _081DDA6C`, exact bytes `01 3a 02 dd`. The decoded `LE` target is `_081DDA6C` at `0x082dfca4`. Each selected decrement yields positive **5**, so `ble` is not taken: two sequential Thumb halfwords at 2 cycles each, no control-transfer refill, **4 cycles per row**. The source-priced but unobserved taken route would be 10 cycles including its one 6-cycle refill; it is not entered or claimed.",
    "",
    "| selected sourceStateDigest | r2 at fifth decrement | r2 after `subs` | accepted route | cycles/row | stop boundary |",
    "| --- | ---: | ---: | --- | ---: | --- |",
    ...rows.map((row) => "| `" + String(row.sourceStateDigest).slice(0, 12) + "…` | " + String(row.r2BeforeFifthTrackClearDecrement) + " | " + String(row.r2AfterFifthTrackClearDecrement) + " | `" + String(row.fifthTrackClearDecrementDecision) + "` | " + String(row.postV42FifthTrackClearDecrementDecisionSourceCycles) + " | `" + String(row.stopsBeforeV43Instruction) + "` |"),
    "",
    "The two selected rows add " + String(coverage.postV42FifthTrackClearDecrementDecisionSourceCycles) + " cycles, advancing the mixed selected-row source prefix from **6,226** to **" + String(coverage.contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles) + " cycles**. The frozen `0x83` nonzero-mask row remains at v42's stop before `mov r9, r2`. v43 stops before both possible successors: the positive continuation at `movs r0, MusicPlayerTrack_size` and the exit body at `_081DDA6C: ldr r0, lt2_ID_NUMBER`. Track pointer/address/count/index/identity/channel/frame/duration/condition flags, wider state, later loop work, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, ROADMAP/DEFERRED, and canonical Battle-2 work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v43.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v43.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v43.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
