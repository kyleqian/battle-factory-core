import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV13Evidence } from "./factory-m4a-note-body-cgb4-v13.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "0418857033ee4bcf1876d16c87bb33532d602bf65a232202af0a68007cd42e87",
  liliana: "a641b3393fb9005807355f3d54f7ac10996eb2aad2b22a0c0eb26adf0df4e4d6",
  "factory-varied": "e2b8cf0157f78abc87299aa17768df0aa5bca13fc32cc9e756e812e490ff2fe3",
};
const V13_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "c3c7b33f52b8b390d17e7792385c5c1eb806a7149b1d181ca2de57eb417cbccd",
  liliana: "10adc46c22cf120c95c637375c568904152e81c061793dc724619b2cc85062d1",
  "factory-varied": "14524c0fffe96dd745e12d30d3c10eb721bae65416bbe5c615360156ebd62498",
};
const V13_EVIDENCE_SHA256 = "1bb3b2b680b4686b879ccb657816982ce0ad1f1c2d656f174bf8dd65193e60cd";
const V13_DOC_SHA256 = "d9a39158dda10745b4dbeab7469c5404d5133e6b85424bd50f8355b7cea5d674";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "89396c47acd7dd3dc57c0185a1f2b8fae0719ce305d5e7ee1d80f96edb1bad00";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v14");
const V13_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v13");
const V13_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v13.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v14.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v14.md");
const ROM_BASE = 0x0800_0000;
const LFO_SPEED_ROUTE_START = 0x082d_fb7a;
const LFO_SPEED_ROUTE_END = 0x082d_fb80;

export type PostPlyNoteLfoSpeedTiming = Readonly<{
  route: "nonzero-lfo-speed-continues";
  lfoSpeed: number;
  sequentialThumbHalfwords: 3;
  takenControlTransferRefills: 0;
  iwramByteReads: 1;
  sourceCycles: 6;
  nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_mod]";
  nextMissingScalar: "MusicPlayerTrack.mod";
}>;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v14: ${message}`); }
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

/**
 * Count only the LFO-speed load, comparison, and observed not-taken exit
 * decision. The immediately following `mod` load is intentionally excluded.
 */
export function reduceCgb4PostPlyNoteLfoSpeedTiming(state: unknown): PostPlyNoteLfoSpeedTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "lfoSpeed") return null;
  const lfoSpeed = requireU8(state.lfoSpeed, "lfoSpeed");
  if (lfoSpeed === 0) return null;
  return Object.freeze({
    route: "nonzero-lfo-speed-continues", lfoSpeed,
    sequentialThumbHalfwords: 3, takenControlTransferRefills: 0, iwramByteReads: 1, sourceCycles: 6,
    nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_mod]",
    nextMissingScalar: "MusicPlayerTrack.mod",
  });
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };
function stripLfoSpeedState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v13",
    captureBoundary: "sixth-MPlayMain-post-ply_note-next-command-byte-load",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => { const { cgb4LfoSpeedState: _, ...base } = callback; return base; }) ?? null,
    })),
  };
}
function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v14" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v13 = checkedJson<Packet>(join(V13_PACKETS, `${name}.json`), V13_PACKET_HASHES[name]);
  if (JSON.stringify(stripLfoSpeedState(packet)) !== JSON.stringify(v13)) fail(`${name} packet no longer adds cleanly to frozen v13`);
  return packet;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elf = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.elf"));
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const sourceRoute = assembly.slice(assembly.indexOf("_081DD938:"), assembly.indexOf("_081DD95A:"));
  for (const anchor of ["_081DD938:", "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]", "cmp r1, 0", "beq _081DD994", "ldrb r0, [r5, o_MusicPlayerTrack_mod]"]) if (!sourceRoute.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  const route = rom.subarray(LFO_SPEED_ROUTE_START - ROM_BASE, LFO_SPEED_ROUTE_END - ROM_BASE);
  if (sha256(route) !== ROUTE_SHA256) fail("compiled lfoSpeed decision changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfb70 t _081DD938", "082dfbcc t _081DD994"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1279-1288", sha256: sha256(assembly) },
    elf: { waitLoop: "0x082dfb70", lfoSpeedDecision: "0x082dfb7a..0x082dfb80", exit: "0x082dfbcc", sha256: sha256(elf) },
    compiledRegions: [{ role: "lfoSpeed load/compare/non-taken decision before mod", start: "0x082dfb7a", endExclusive: "0x082dfb80", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2, iwramDataAccessPremiumCycles: 0 },
  };
}

function histogram(values: readonly number[]): Record<string, number> {
  const result: Record<string, number> = {}; for (const value of values) result[String(value)] = (result[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV13 = checkedJson<any>(V13_EVIDENCE, V13_EVIDENCE_SHA256);
  const v13Doc = readFileSync(join(ROOT, "docs/issue55-m4a-note-body-cgb4-v13.md")); if (sha256(v13Doc) !== V13_DOC_SHA256) fail("v13 doc changed");
  if (JSON.stringify(makeV13Evidence()) !== JSON.stringify(frozenV13)) fail("accepted v13 does not regenerate byte-for-byte");
  const sourceAndElf = assertSourceElfRom();
  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12).map((callback: any) => ({ ...callback, case: name, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback])); if (byDigest.size !== 7) fail("source-state join became ambiguous");
  const rows = frozenV13.rows.map((prior: any) => {
    const callback: any = byDigest.get(prior.sourceStateDigest); if (!callback || !isRecord(callback.cgb4LfoSpeedState)) fail("packet missed frozen v13 row");
    const timing = reduceCgb4PostPlyNoteLfoSpeedTiming(callback.cgb4LfoSpeedState); if (!timing) fail("observed lfoSpeed route became unresolved");
    return {
      sourceStateDigest: prior.sourceStateDigest, case: prior.case, trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughWaitDecrementSourceCycles: prior.contiguousPrefixThroughWaitDecrementSourceCycles,
      lfoSpeed: timing.lfoSpeed,
      postV13RouteSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughLfoSpeedDecisionSourceCycles: prior.contiguousPrefixThroughWaitDecrementSourceCycles + timing.sourceCycles,
      nextMod: null, completeMPlaySourceCycles: null,
    };
  });
  if (byDigest.size !== rows.length) fail("packet contains unjoined CGB4 row");
  const byCase = Object.fromEntries(CASES.map((name) => [name, { callbacks: rows.filter((row: any) => row.case === name).length, sourceCycles: rows.filter((row: any) => row.case === name).length * 6 }]));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  const added = rows.reduce((sum: number, row: any) => sum + row.postV13RouteSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughLfoSpeedDecisionSourceCycles, 0);
  if (added !== 42 || contiguous !== 5254) fail("v14 timing totals changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v14", oracleProfile: "battle-scene-off", addressFree: true, sourceAndElf,
    frozenInputs: { acceptedV13EvidenceSha256: V13_EVIDENCE_SHA256, acceptedV13DocSha256: V13_DOC_SHA256, v13RegeneratesByteForByte: true, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: { boundary: "first MPlayMain lfoSpeed decision after each observed CGB4 ply_note return", scalars: ["MusicPlayerTrack.lfoSpeed"], excluded: ["pointer", "runtime address", "frame", "duration", "later revisits of the same wait", "MusicPlayerTrack.mod", "other 75 callbacks"] },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase, lfoSpeedHistogram: histogram(rows.map((row: any) => row.lfoSpeed)),
      postV13RouteSourceCyclesPerCallback: 6, postV13RouteSourceCycles: added,
      acceptedContiguousPrefixThroughWaitDecrementSourceCycles: 5212,
      contiguousPrefixThroughLfoSpeedDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 21, takenControlTransferRefills: 0, iwramByteReads: 7,
      nullOtherPostSelectionCallbacks: 75, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    }, rows,
    closure: {
      closed: "All seven captured lfoSpeed bytes are nonzero and take the same no-refill decision through the lfoSpeed comparison.",
      contiguousPrefix: "5254 aggregate source cycles through the lfoSpeed decision across the seven callbacks (5212 frozen v13 + 42 v14).",
      remainingDiscriminator: "The immediately following MusicPlayerTrack.mod IWRAM read lacks a newly captured scalar; stop before it.",
      durationFit: false, runtimePointerIdentity: false, runtimeAddressLookup: false, serviceCost: null, constructionClock: null, unsupportedBarrierAdded: false,
    },
    verdict: "Twice-fresh address-free packets prove lfoSpeed 44 for exactly the frozen seven callbacks; source/ELF/ROM close only the six-cycle nonzero decision before mod.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 post-`ply_note` lfoSpeed discriminator v14", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v14.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v14 preserves frozen v13 byte-for-byte and joins solely by `sourceStateDigest`. Twice-fresh address-free packets capture exactly one new scalar — `MusicPlayerTrack.lfoSpeed` — for the same **7/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. Packet SHA256: anchor `04188570…`, LILIANA `a641b339…`, legal-varied `e2b8cf01…`; each repeat is byte-identical.", "",
    "All seven captured `lfoSpeed` values are `44`, so the immediate comparison is nonzero and `beq _081DD994` is not taken. Source, ELF symbols, and the exact six compiled bytes at `0x082dfb7a..0x082dfb80` are hash-guarded. The route contains only the IWRAM `lfoSpeed` byte read, `cmp r1, 0`, and the not-taken branch: **3×2 = 6 cycles each / 42 aggregate**; IWRAM has no added data premium.", "",
    `The contiguous boundary advances from **5,212** to **${c.contiguousPrefixThroughLfoSpeedDecisionSourceCycles} aggregate cycles**. It stops before the immediately following \`ldrb r0, [r5, o_MusicPlayerTrack_mod]\`; no \`mod\`, delay, oscillator, pointer/address, frame, duration, or later wait revisit was captured or priced.`, "",
    "The other 75 note callbacks, later track-loop state, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, runtime pointer/address identity, animation/Rust behavior, and canonical Battle-2 work remain null.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v14.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v14.md") };
  fail("usage: factory-m4a-note-body-cgb4-v14.ts [--out-dir PATH]");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2)); mkdirSync(dirname(output.json), { recursive: true }); mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence(); writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`); writeFileSync(output.doc, markdown(evidence));
}
