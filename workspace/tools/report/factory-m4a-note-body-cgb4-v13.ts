import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV12Evidence } from "./factory-m4a-note-body-cgb4-v12.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "c3c7b33f52b8b390d17e7792385c5c1eb806a7149b1d181ca2de57eb417cbccd",
  liliana: "10adc46c22cf120c95c637375c568904152e81c061793dc724619b2cc85062d1",
  "factory-varied": "14524c0fffe96dd745e12d30d3c10eb721bae65416bbe5c615360156ebd62498",
};
const V9_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "13d6526138359b145d707c0fdf55d074527e93e5e6d6b37d52bdd61c8414bedd",
  liliana: "86d4d2c5dfc6d63a74d5708fb50b8eb84d02b3218bedde9b066f30c278ce934e",
  "factory-varied": "87a32977d6d69546e4720f2715ccf1315efebbee5d4826783cc35cbeca161fb2",
};
const V12_EVIDENCE_SHA256 = "d8e94417b46caa520e42803343a9f24c4b71cfaeceb12df1959c18889587a766";
const V12_DOC_SHA256 = "821b488fb07cdee6c726e6e176451d81a3147cc0b5863e9f26a099d864def94d";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "4c2d087fa73fb1c0a80fa207cb25bfeb8a73f6d5e55fc669f1455f8cc9601fc1";
const CLOCK_TABLE_SHA256 = "952d81c712713fc630d9d622d5f79eec8189f2a4cf05a78442857b635f0d23f8";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v13");
const V9_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v9");
const V12_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v12.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v13.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v13.md");
const ROM_BASE = 0x0800_0000;
const SONG_STARTS = [0x0895_8848, 0x0895_8984, 0x0895_8d12, 0x0895_90b7, 0x0895_912c, 0x0895_9754, 0x0895_9db6, 0x0895_a2e6, 0x0895_a56d, 0x0895_a6c8] as const;
const CLOCK_TABLE_START = 0x0867_5c64;

export type PostPlyNoteWaitTiming = Readonly<{
  route: "encoded-wait-through-decrement"; commandByte: number; storageClass: "gamepak-ws0";
  waitValueBeforeDecrement: number; waitValueAfterDecrement: number;
  sequentialThumbHalfwords: 21; takenControlTransferRefills: 4;
  gamePakByteReads: 2; gamePakLiteralWordReads: 1;
  iwramWordStores: 1; iwramByteReads: 1; iwramByteStores: 2;
  sourceCycles: 89;
  nextUnresolvedInstruction: "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]";
}>;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v13: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function checkedJson<T>(path: string, hash: string): T {
  const bytes = readFileSync(path); if (sha256(bytes) !== hash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}
function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) fail(`${label} must be u8`);
  return value as number;
}

export function reduceCgb4PostPlyNoteWaitTiming(state: unknown): PostPlyNoteWaitTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "commandByte,storageClass") return null;
  const commandByte = requireU8(state.commandByte, "commandByte");
  if (state.storageClass !== "gamepak-ws0" || commandByte < 0x80 || commandByte > 0xb0) return null;
  const table = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba")).subarray(CLOCK_TABLE_START - ROM_BASE, CLOCK_TABLE_START - ROM_BASE + 0x31);
  const waitValueBeforeDecrement = table[commandByte - 0x80]!;
  if (waitValueBeforeDecrement === 0) return null;
  return Object.freeze({
    route: "encoded-wait-through-decrement", commandByte, storageClass: "gamepak-ws0",
    waitValueBeforeDecrement, waitValueAfterDecrement: waitValueBeforeDecrement - 1,
    sequentialThumbHalfwords: 21, takenControlTransferRefills: 4,
    gamePakByteReads: 2, gamePakLiteralWordReads: 1,
    iwramWordStores: 1, iwramByteReads: 1, iwramByteStores: 2,
    sourceCycles: 89,
    nextUnresolvedInstruction: "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]",
  });
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };
function stripNextState(packet: Packet): Packet {
  return { ...packet, schema: "factory-m4a-note-body-cgb4-probe/v9", captureBoundary: "sixth-MPlayMain-ply_note-CGB4-pan-sweep-at-bne",
    observations: packet.observations.map((observation) => ({ ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => { const { cgb4NextCommandState: _, ...base } = callback; return base; }) ?? null,
    })) };
}
function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v13" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v9 = checkedJson<Packet>(join(V9_PACKETS, `${name}.json`), V9_PACKET_HASHES[name]);
  if (JSON.stringify(stripNextState(packet)) !== JSON.stringify(v9)) fail(`${name} packet no longer adds cleanly to frozen v9`);
  return packet;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elf = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.elf"));
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  for (const anchor of ["ldrb r1, [r2]", "cmp r1, 0x80", "cmp r1, 0xBD", "cmp r1, 0xCF", "cmp r1, 0xB0", "ldr r0, lt_gClockTable", "strb r0, [r5, o_MusicPlayerTrack_wait]", "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]"]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  const route = rom.subarray(0x082d_fb1a - ROM_BASE, 0x082d_fb7a - ROM_BASE);
  const clock = rom.subarray(CLOCK_TABLE_START - ROM_BASE, CLOCK_TABLE_START - ROM_BASE + 0x31);
  if (sha256(route) !== ROUTE_SHA256 || sha256(clock) !== CLOCK_TABLE_SHA256) fail("compiled route/table changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfb18 t _081DD8E0", "082dfb66 t _081DD92E", "082dfb70 t _081DD938", "08675c64 00000031 R gClockTable"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1233-1290", sha256: sha256(assembly) },
    elf: { commandLoop: "0x082dfb18", waitRoute: "0x082dfb66", waitLoop: "0x082dfb70", gClockTable: "0x08675c64+0x31", sha256: sha256(elf) },
    compiledRegions: [
      { role: "command byte through boundary before lfoSpeed", start: "0x082dfb1a", endExclusive: "0x082dfb7a", bytes: route.length, sha256: ROUTE_SHA256 },
      { role: "gClockTable", start: "0x08675c64", endExclusive: "0x08675c95", bytes: clock.length, sha256: CLOCK_TABLE_SHA256 },
    ],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillPremiumCycles: 6, gamePakByteReadPremiumCycles: 7, gamePakLiteralWordReadPremiumCycles: 9, iwramDataAccessPremiumCycles: 0 },
  };
}

function histogram(values: readonly (string | number)[]): Record<string, number> {
  const result: Record<string, number> = {}; for (const value of values) result[String(value)] = (result[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV12 = checkedJson<any>(V12_EVIDENCE, V12_EVIDENCE_SHA256);
  const v12Doc = readFileSync(join(ROOT, "docs/issue55-m4a-note-body-cgb4-v12.md")); if (sha256(v12Doc) !== V12_DOC_SHA256) fail("v12 doc changed");
  if (JSON.stringify(makeV12Evidence()) !== JSON.stringify(frozenV12)) fail("accepted v12 does not regenerate byte-for-byte");
  const sourceAndElf = assertSourceElfRom();
  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12).map((callback: any) => ({ ...callback, case: name, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback])); if (byDigest.size !== 7) fail("source-state join became ambiguous");
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  const rows = frozenV12.rows.map((prior: any) => {
    const callback: any = byDigest.get(prior.sourceStateDigest); if (!callback || !isRecord(callback.cgb4NextCommandState)) fail("packet missed frozen v12 row");
    const state = callback.cgb4NextCommandState; const timing = reduceCgb4PostPlyNoteWaitTiming(state); if (!timing) fail("observed command route became unresolved");
    const role = callback.commandPointer.role as string; const match = /^battle-factory-bgm-track-([1-9])$/.exec(role); if (!match) fail("command source role changed");
    const sourceIndex = Number(match[1]) - 1; const nextOffset = callback.commandPointer.offset + callback.acceptedParameters;
    const sourceByte = rom[SONG_STARTS[sourceIndex]! - ROM_BASE + nextOffset];
    if (sourceByte !== state.commandByte || callback.commandBytes[callback.acceptedParameters] !== state.commandByte) fail("captured command byte disagrees with pinned song ROM");
    return {
      sourceStateDigest: prior.sourceStateDigest, case: prior.case, trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughNextCommandPointerLoadSourceCycles: prior.contiguousPrefixThroughNextCommandPointerLoadSourceCycles,
      nextCommandByte: timing.commandByte, nextCommandByteStorage: timing.storageClass,
      waitValueBeforeDecrement: timing.waitValueBeforeDecrement, waitValueAfterDecrement: timing.waitValueAfterDecrement,
      postV12RouteSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughWaitDecrementSourceCycles: prior.contiguousPrefixThroughNextCommandPointerLoadSourceCycles + timing.sourceCycles,
      nextLfoSpeed: null, completeMPlaySourceCycles: null,
    };
  });
  if (byDigest.size !== rows.length) fail("packet contains unjoined CGB4 row");
  const byCase = Object.fromEntries(CASES.map((name) => [name, { callbacks: rows.filter((row: any) => row.case === name).length, sourceCycles: rows.filter((row: any) => row.case === name).length * 89 }]));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  const added = rows.reduce((sum: number, row: any) => sum + row.postV12RouteSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughWaitDecrementSourceCycles, 0);
  if (added !== 623 || contiguous !== 5212) fail("v13 timing totals changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v13", oracleProfile: "battle-scene-off", addressFree: true, sourceAndElf,
    frozenInputs: { acceptedV12EvidenceSha256: V12_EVIDENCE_SHA256, acceptedV12DocSha256: V12_DOC_SHA256, v12RegeneratesByteForByte: true, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: { boundary: "first MPlayMain command-byte load after each observed CGB4 ply_note return", scalars: ["current command byte", "cmdPtr target storage class"], excluded: ["pointer", "runtime address", "frame", "duration", "other 75 callbacks", "later lfoSpeed"] },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase,
      commandByteHistogram: histogram(rows.map((row: any) => row.nextCommandByte)), storageClassHistogram: histogram(rows.map((row: any) => row.nextCommandByteStorage)),
      postV12RouteSourceCyclesPerCallback: 89, postV12RouteSourceCycles: added,
      acceptedContiguousPrefixThroughNextCommandPointerLoadSourceCycles: 4589,
      contiguousPrefixThroughWaitDecrementSourceCycles: contiguous,
      sequentialThumbHalfwords: 147, takenControlTransferRefills: 28, gamePakByteReads: 14, gamePakLiteralWordReads: 7,
      nullOtherPostSelectionCallbacks: 75, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    }, rows,
    closure: {
      closed: "All seven next commands are encoded waits in GamePak WS0 and follow the same route through gClockTable wait assignment and the first wait decrement.",
      contiguousPrefix: "5212 aggregate source cycles through wait decrement across the seven callbacks (4589 frozen v12 + 623 v13).",
      remainingDiscriminator: "The next lfoSpeed IWRAM read lacks a newly captured scalar; stop before it.",
      durationFit: false, runtimePointerIdentity: false, runtimeAddressLookup: false, serviceCost: null, constructionClock: null, unsupportedBarrierAdded: false,
    },
    verdict: "Twice-fresh address-free packets prove command bytes 0x86/0x8c/0x92 in GamePak WS0 for exactly the frozen seven callbacks; source/ELF/ROM close the 89-cycle encoded-wait route only through wait decrement.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 post-`ply_note` command discriminator v13", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v13.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v13 preserves frozen v12 byte-for-byte and joins solely by `sourceStateDigest`. Twice-fresh address-free packets capture only the current command byte and the storage class targeted by `MusicPlayerTrack.cmdPtr` for exactly the same **7/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. Packet SHA256: anchor `c3c7b33f…`, LILIANA `10adc46c…`, legal-varied `14524c0f…`; each repeat is byte-identical.", "",
    "The observed bytes are `0x86` (2), `0x8c` (3), and `0x92` (2), all in `gamepak-ws0`. Each selects the encoded-wait route. The packet's inherited normalized song position plus accepted parameter count is checked against the exact ROM byte; source, ELF symbols, the compiled `0x082dfb1a..0x082dfb7a` region, and the complete 49-byte `gClockTable` are hash-guarded.", "",
    "Beginning at frozen v12's `ldrb r1, [r2]`, the common route executes **21** sequential Thumb halfwords, **4** taken refills, two GamePak byte reads (command + clock table), one GamePak literal-word read, and IWRAM pointer/wait accesses. Cost is **21×2 + 4×6 + 2×7 + 9 = 89 cycles each / 623 aggregate**. The waits are assigned `6/12/18` and decremented once to `5/11/17`.", "",
    `The contiguous boundary advances from **4,589** to **${c.contiguousPrefixThroughWaitDecrementSourceCycles} aggregate cycles**. It stops before the next \`ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]\`: the storage class is known IWRAM, but the scalar is not present in the new packet.`, "",
    "The other 75 note callbacks, later track-loop state, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, runtime pointer/address identity, animation/Rust behavior, and canonical Battle-2 work remain null.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v13.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v13.md") };
  fail("usage: factory-m4a-note-body-cgb4-v13.ts [--out-dir PATH]");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2)); mkdirSync(dirname(output.json), { recursive: true }); mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence(); writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`); writeFileSync(output.doc, markdown(evidence));
}
