import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV14Evidence } from "./factory-m4a-note-body-cgb4-v14.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "0700a3f31e7415f672144c00f9f1d25382d9f392bbf498084e59aaa8e5a7c9b6",
  liliana: "4375e86db707db06650c008d995c5bb08927c4dbb281cb42bb9318bf56761d16",
  "factory-varied": "6c903177581e7ab06b9778db1580606c7d9ee96f0e398c177a94534f8e0ab0af",
};
const V14_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "0418857033ee4bcf1876d16c87bb33532d602bf65a232202af0a68007cd42e87",
  liliana: "a641b3393fb9005807355f3d54f7ac10996eb2aad2b22a0c0eb26adf0df4e4d6",
  "factory-varied": "e2b8cf0157f78abc87299aa17768df0aa5bca13fc32cc9e756e812e490ff2fe3",
};
const V14_EVIDENCE_SHA256 = "821386171e3caf4fadc916d18e88a9dda962768e39caa6144532cafa40be265a";
const V14_DOC_SHA256 = "189c21ac2f7a677389e5277c53b8ee112847d63394a944596538e087f04add7d";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "05ff4416ac8f401040106651d29bbed68c28b5c5b188390b7017ef7620673121";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v15");
const V14_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v14");
const V14_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v14.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v15.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v15.md");
const ROM_BASE = 0x0800_0000;
const MOD_ROUTE_START = 0x082d_fb80;
const MOD_ROUTE_END = 0x082d_fb86;

export type PostPlyNoteModTiming = Readonly<{
  route: "zero-mod-exits";
  mod: 0;
  sequentialThumbHalfwords: 3;
  takenControlTransferRefills: 1;
  iwramByteReads: 1;
  sourceCycles: 12;
  nextUnresolvedInstruction: "mov r3, sl";
  nextMissingScalar: null;
}>;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v15: ${message}`); }
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

/** Count only the immediate mod load, compare, and observed taken exit. */
export function reduceCgb4PostPlyNoteModTiming(state: unknown): PostPlyNoteModTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "mod") return null;
  const mod = requireU8(state.mod, "mod");
  if (mod !== 0) return null;
  return Object.freeze({
    route: "zero-mod-exits", mod: 0,
    sequentialThumbHalfwords: 3, takenControlTransferRefills: 1, iwramByteReads: 1, sourceCycles: 12,
    nextUnresolvedInstruction: "mov r3, sl",
    nextMissingScalar: null,
  });
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };
function stripModState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v14",
    captureBoundary: "sixth-MPlayMain-post-ply_note-lfoSpeed-decision",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => { const { cgb4ModState: _, ...base } = callback; return base; }) ?? null,
    })),
  };
}
function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v15" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v14 = checkedJson<Packet>(join(V14_PACKETS, `${name}.json`), V14_PACKET_HASHES[name]);
  if (JSON.stringify(stripModState(packet)) !== JSON.stringify(v14)) fail(`${name} packet no longer adds cleanly to frozen v14`);
  return packet;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elf = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.elf"));
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const modStart = assembly.indexOf("ldrb r0, [r5, o_MusicPlayerTrack_mod]");
  const delayStart = assembly.indexOf("ldrb r0, [r5, o_MusicPlayerTrack_lfoDelayC]");
  const sourceRoute = assembly.slice(modStart, delayStart);
  for (const anchor of ["ldrb r0, [r5, o_MusicPlayerTrack_mod]", "cmp r0, 0", "beq _081DD994"]) if (!sourceRoute.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  const route = rom.subarray(MOD_ROUTE_START - ROM_BASE, MOD_ROUTE_END - ROM_BASE);
  if (sha256(route) !== ROUTE_SHA256) fail("compiled mod decision changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfb70 t _081DD938", "082dfbcc t _081DD994"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1279-1290", sha256: sha256(assembly) },
    elf: { waitLoop: "0x082dfb70", modDecision: "0x082dfb80..0x082dfb86", exit: "0x082dfbcc", sha256: sha256(elf) },
    compiledRegions: [{ role: "mod load/compare/taken decision before lfoDelayC", start: "0x082dfb80", endExclusive: "0x082dfb86", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
  };
}

function histogram(values: readonly number[]): Record<string, number> {
  const result: Record<string, number> = {}; for (const value of values) result[String(value)] = (result[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV14 = checkedJson<any>(V14_EVIDENCE, V14_EVIDENCE_SHA256);
  const v14Doc = readFileSync(join(ROOT, "docs/issue55-m4a-note-body-cgb4-v14.md")); if (sha256(v14Doc) !== V14_DOC_SHA256) fail("v14 doc changed");
  if (JSON.stringify(makeV14Evidence()) !== JSON.stringify(frozenV14)) fail("accepted v14 does not regenerate byte-for-byte");
  const sourceAndElf = assertSourceElfRom();
  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12).map((callback: any) => ({ ...callback, case: name, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback])); if (byDigest.size !== 7) fail("source-state join became ambiguous");
  const rows = frozenV14.rows.map((prior: any) => {
    const callback: any = byDigest.get(prior.sourceStateDigest); if (!callback || !isRecord(callback.cgb4ModState)) fail("packet missed frozen v14 row");
    const timing = reduceCgb4PostPlyNoteModTiming(callback.cgb4ModState); if (!timing) fail("observed mod route became unresolved");
    return {
      sourceStateDigest: prior.sourceStateDigest, case: prior.case, trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughWaitDecrementSourceCycles: prior.acceptedContiguousPrefixThroughWaitDecrementSourceCycles,
      lfoSpeed: prior.lfoSpeed, postV13RouteSourceCycles: prior.postV13RouteSourceCycles,
      contiguousPrefixThroughLfoSpeedDecisionSourceCycles: prior.contiguousPrefixThroughLfoSpeedDecisionSourceCycles,
      mod: timing.mod, postV14RouteSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughModDecisionSourceCycles: prior.contiguousPrefixThroughLfoSpeedDecisionSourceCycles + timing.sourceCycles,
      nextLfoDelayC: null, completeMPlaySourceCycles: null,
    };
  });
  if (byDigest.size !== rows.length) fail("packet contains unjoined CGB4 row");
  const byCase = Object.fromEntries(CASES.map((name) => [name, { callbacks: rows.filter((row: any) => row.case === name).length, sourceCycles: rows.filter((row: any) => row.case === name).length * 12 }]));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  const added = rows.reduce((sum: number, row: any) => sum + row.postV14RouteSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughModDecisionSourceCycles, 0);
  if (added !== 84 || contiguous !== 5338) fail("v15 timing totals changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v15", oracleProfile: "battle-scene-off", addressFree: true, sourceAndElf,
    frozenInputs: { acceptedV14EvidenceSha256: V14_EVIDENCE_SHA256, acceptedV14DocSha256: V14_DOC_SHA256, v14RegeneratesByteForByte: true, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: { boundary: "first MPlayMain mod decision after each observed CGB4 ply_note return", scalars: ["MusicPlayerTrack.mod"], excluded: ["pointer", "runtime address", "frame", "duration", "later revisits of the same wait", "MusicPlayerTrack.lfoDelayC", "other 75 callbacks"] },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase, modHistogram: histogram(rows.map((row: any) => row.mod)),
      postV14RouteSourceCyclesPerCallback: 12, postV14RouteSourceCycles: added,
      acceptedContiguousPrefixThroughWaitDecrementSourceCycles: 5212, acceptedContiguousPrefixThroughLfoSpeedDecisionSourceCycles: 5254,
      contiguousPrefixThroughModDecisionSourceCycles: contiguous, sequentialThumbHalfwords: 42, takenControlTransferRefills: 7, iwramByteReads: 14,
      nullOtherPostSelectionCallbacks: 75, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    }, rows,
    closure: {
      closed: "All seven captured mod bytes are zero and take the same taken decision to _081DD994.",
      contiguousPrefix: "5338 aggregate source cycles through the mod decision across the seven callbacks (5254 frozen v14 + 84 v15).",
      remainingDiscriminator: "The taken branch skips MusicPlayerTrack.lfoDelayC and lands at _081DD994; stop before its first track-loop-exit instruction, mov r3, sl.",
      durationFit: false, runtimePointerIdentity: false, runtimeAddressLookup: false, serviceCost: null, constructionClock: null, unsupportedBarrierAdded: false,
    },
    verdict: "Twice-fresh address-free packets prove mod 0 for exactly the frozen seven callbacks; source/ELF/ROM close only the twelve-cycle taken mod decision before lfoDelayC.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 post-`ply_note` mod discriminator v15", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v15.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v15 preserves frozen v14 byte-for-byte and joins solely by `sourceStateDigest`. Two fresh address-free packets capture exactly one new scalar — `MusicPlayerTrack.mod` — for the same **7/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. Packet SHA256: anchor `0700a3f3…`, LILIANA `4375e86d…`, legal-varied `6c903177…`; each independent repeat is byte-identical.", "",
    "All seven captured `mod` values are `0`, so the immediate comparison takes `beq _081DD994`. Source, ELF symbols, and the exact six compiled bytes at `0x082dfb80..0x082dfb86` are hash-guarded. The route contains only the IWRAM `mod` byte read, `cmp r0, 0`, and the taken branch: **3×2 + 6 = 12 cycles each / 84 aggregate**; IWRAM has no added data premium.", "",
    `The contiguous boundary advances from **5,254** to **${c.contiguousPrefixThroughModDecisionSourceCycles} aggregate cycles**. The taken branch skips \`lfoDelayC\` and lands at \`_081DD994\`; the boundary stops before its first track-loop-exit instruction, \`mov r3, sl\`. No oscillator state, pointer/address, frame, duration, or later wait revisit was captured or priced.`, "",
    "The other 75 note callbacks, later track-loop state, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, runtime pointer/address identity, animation/Rust behavior, and canonical Battle-2 work remain null.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v15.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v15.md") };
  fail("usage: factory-m4a-note-body-cgb4-v15.ts [--out-dir PATH]");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2)); mkdirSync(dirname(output.json), { recursive: true }); mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence(); writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`); writeFileSync(output.doc, markdown(evidence));
}
