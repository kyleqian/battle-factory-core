import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { POINTER_PRODUCERS, SAMPLE_READ_RULES } from "./factory-m4a-soundmainram-target-audit-v1.ts";

type Stage = { kind: string; cyclesSinceM4aEntry: number };
type V3 = {
  schema: string;
  case: string;
  oracleProfile: string;
  interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string } }; stages: Stage[] } }>;
};
type Region = { requestedBytes: number | null; capturedBytes: number; complete: boolean; sha256: string | null };
type Target = {
  channelIndex: number;
  statusFlags: number;
  type: number;
  count: number;
  fw: number;
  frequency: number;
  targetProducingRoute: string;
  preMplayCurrentRelation: string;
  currentRelation: { route: string; inWaveData: boolean; offset: number | null; regionComplete: boolean };
  wave: null | {
    type: number;
    status: number;
    frequency: number;
    loopStart: number;
    size: number;
    sampleRegion: Region;
    physicalSampleRegion: Region;
    storedCurrentOffset: number | null;
    directWaveTargetDescriptor: {
      storageRole: string;
      waveSymbol: string;
      waveAlignmentMod4: number;
      physicalPayloadBytes: number | null;
      requiredGuardBytes: number;
      availableGuardBytes: number | null;
    };
  };
};
type EntryReceipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  captureBoundary: string;
  addressFree: boolean;
  durationReducer: boolean;
  observations: Array<{
    sourceStateDigest: string;
    m4aSoundMainCycles: number;
    soundMainRamEntryTargets: Target[];
    entryTargetStateDigest: string;
  }>;
};
type Repro = {
  schema: string;
  oracleProfile: string;
  freshRunsPerCase: number;
  cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED_COUNTS = { anchor: 52, liliana: 31, "factory-varied": 30 } as const;
const ENTRY_HASHES = {
  anchor: "6b29d708051e0d4422d8f6527e7bd61ffb6bfa408957c017b89b7f2a3c409e1f",
  liliana: "780e332632da2fd024c032a831710c1b8b609d627132836612958546d87fdcf1",
  "factory-varied": "202f18b6d1877ecac55685e51e4f62ec650e2091cb26912ba362efff2c658ad9",
} as const;
const V3_HASHES = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
} as const;
const V1_AUDIT_HASH = "3817b1ab6c0e3e488619e3827cfede5d5a3fa82e038dd551e173c6af0effa04e";
const ENTRY_ROOT = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-targets-v1");
const V3_ROOT = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const REPRO_PATH = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-targets-repro-v1.json");
const V1_AUDIT_PATH = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-target-audit-v1.json");
const DEFAULT_EVIDENCE_PATH = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-target-evidence-v1.json");
const DEFAULT_DOC_PATH = join(ROOT, "docs/issue55-m4a-soundmainram-entry-targets-v1.md");
const ACTIVE = 0xc7;
const START = 0x80;
const FIX = 0x08;
const REV = 0x10;
const CMP = 0x20;
const LOOP = 0xc0;

function fail(message: string): never {
  throw new Error(`factory-m4a-soundmainram-entry-targets-v1: ${message}`);
}
function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function onlyStage(stages: Stage[], kind: string): number {
  const values = stages.filter((stage) => stage.kind === kind);
  if (values.length !== 1) fail(`${kind} expected once, got ${values.length}`);
  return values[0]!.cyclesSinceM4aEntry;
}
function m4aCost(stages: Stage[]): number {
  return onlyStage(stages, "m4a-sound-main-return") - onlyStage(stages, "m4a-sound-main-call");
}
function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function buildEvidence(): Record<string, unknown> {
  if (sha256(readFileSync(V1_AUDIT_PATH)) !== V1_AUDIT_HASH) fail("frozen v1 target audit changed");
  const v1Audit = readJson<{ pointerProducers: unknown[]; sampleReadRules: unknown[]; observedCoverage: Record<string, unknown> }>(V1_AUDIT_PATH);
  if (v1Audit.pointerProducers.length !== POINTER_PRODUCERS.length || v1Audit.sampleReadRules.length !== SAMPLE_READ_RULES.length) {
    fail("13-branch / 4-rule source inventory changed");
  }
  const repro = readJson<Repro>(REPRO_PATH);
  if (repro.schema !== "factory-m4a-soundmainram-entry-targets-repro/v1" || repro.oracleProfile !== "battle-scene-off" || repro.freshRunsPerCase !== 2) {
    fail("fresh-run contract changed");
  }

  const totals = {
    observations: 0,
    selectedChannels: 0,
    active: 0,
    inactive: 0,
    start: 0,
    persistedCurrent: 0,
    fixed: 0,
    linear: 0,
    looping: 0,
    completeLogicalRegions: 0,
    completePhysicalRegions: 0,
    aligned: 0,
    completeActiveCurrentRelations: 0,
    completeRequiredGuards: 0,
    exactV3DigestCostJoins: 0,
    unequalV3Costs: 0,
  };
  const routes: Record<string, number> = {};
  const roles: Record<string, number> = {};
  const waves: Record<string, number> = {};
  const cases: Array<Record<string, unknown>> = [];
  const entryHashes: Record<string, string> = {};
  const v3Hashes: Record<string, string> = {};

  for (const name of CASES) {
    const entryBytes = readFileSync(join(ENTRY_ROOT, `${name}.json`));
    const v3Bytes = readFileSync(join(V3_ROOT, `${name}.json`));
    const entryHash = sha256(entryBytes);
    const v3Hash = sha256(v3Bytes);
    if (entryHash !== ENTRY_HASHES[name] || v3Hash !== V3_HASHES[name]) fail(`${name} frozen receipt hash changed`);
    entryHashes[name] = entryHash;
    v3Hashes[name] = v3Hash;
    const proof = repro.cases.find((row) => row.case === name);
    if (!proof?.byteIdentical || proof.firstFreshSha256 !== entryHash || proof.secondFreshSha256 !== entryHash) fail(`${name} is not twice-fresh byte-identical`);
    const entry = JSON.parse(entryBytes.toString("utf8")) as EntryReceipt;
    const v3 = JSON.parse(v3Bytes.toString("utf8")) as V3;
    if (entry.schema !== "factory-m4a-soundmainram-entry-targets/v1" || entry.case !== name || entry.oracleProfile !== "battle-scene-off" || entry.captureBoundary !== "sound-main-ram-entry" || !entry.addressFree || entry.durationReducer) fail(`${name} entry packet contract changed`);
    if (v3.schema !== "factory-m4a-source-state-probe/v3" || v3.case !== name || v3.oracleProfile !== "battle-scene-off") fail(`${name} v3 packet contract changed`);
    if (entry.observations.length !== EXPECTED_COUNTS[name] || v3.interrupts.length !== entry.observations.length) fail(`${name} observation count changed`);

    let replaced = 0;
    for (const [index, observation] of entry.observations.entries()) {
      const v3Observation = v3.interrupts[index]!;
      if (observation.sourceStateDigest !== v3Observation.m4a.state.sourceSemanticState.stateDigest) fail(`${name}[${index}] v3 digest join failed`);
      const expectedCost = m4aCost(v3Observation.m4a.stages);
      totals.exactV3DigestCostJoins += 1;
      if (observation.m4aSoundMainCycles !== expectedCost) totals.unequalV3Costs += 1;
      if (observation.soundMainRamEntryTargets.length !== 5) fail(`${name}[${index}] did not select five channels`);
      if (!/^[0-9a-f]{64}$/.test(observation.entryTargetStateDigest)) fail(`${name}[${index}] has invalid target digest`);

      for (const target of observation.soundMainRamEntryTargets) {
        const wave = target.wave;
        if (!wave) fail(`${name}[${index}] channel ${target.channelIndex} has no readable WaveData header`);
        if (target.channelIndex < 0 || target.channelIndex > 4) fail(`${name}[${index}] selected channel index escaped maxChans`);
        if (wave.type !== 0 || (target.type & (CMP | REV)) !== 0 || (target.type & ~FIX) !== 0) fail(`${name}[${index}] entered an unproved mixer rule`);
        const descriptor = wave.directWaveTargetDescriptor;
        if (descriptor.storageRole === "other-or-unreadable" || descriptor.waveAlignmentMod4 !== 0 || descriptor.physicalPayloadBytes === null) fail(`${name}[${index}] lacks an aligned readable storage descriptor`);
        if (!wave.sampleRegion.complete || wave.sampleRegion.requestedBytes !== wave.size || wave.sampleRegion.capturedBytes !== wave.size || wave.sampleRegion.sha256 === null) fail(`${name}[${index}] logical sample region is incomplete`);
        if (!wave.physicalSampleRegion.complete || wave.physicalSampleRegion.requestedBytes !== descriptor.physicalPayloadBytes || wave.physicalSampleRegion.capturedBytes !== descriptor.physicalPayloadBytes || wave.physicalSampleRegion.sha256 === null) fail(`${name}[${index}] physical sample region is incomplete`);
        if (descriptor.availableGuardBytes === null || descriptor.availableGuardBytes < descriptor.requiredGuardBytes || descriptor.physicalPayloadBytes < wave.size + descriptor.requiredGuardBytes) fail(`${name}[${index}] read-rule guard is incomplete`);
        const active = (target.statusFlags & ACTIVE) !== 0;
        const starts = active && (target.statusFlags & START) !== 0;
        const looping = ((wave.status >>> 8) & LOOP) !== 0;
        if (looping && (wave.loopStart < 0 || wave.loopStart >= wave.size)) fail(`${name}[${index}] loop range is invalid`);
        if (active && (!target.currentRelation.inWaveData || !target.currentRelation.regionComplete || target.currentRelation.offset === null)) fail(`${name}[${index}] active current relation is incomplete`);
        if (active && !starts && target.count !== wave.size - target.currentRelation.offset!) fail(`${name}[${index}] persisted count/current relation changed`);
        if (starts && target.currentRelation.offset !== target.count) fail(`${name}[${index}] START relation did not use count`);
        if (target.preMplayCurrentRelation !== "same-stored-current") fail(`${name}[${index}] observed an unclassified stored-current mutation`);

        totals.selectedChannels += 1;
        totals.completeLogicalRegions += 1;
        totals.completePhysicalRegions += 1;
        totals.aligned += 1;
        totals.completeRequiredGuards += 1;
        if (active) {
          totals.active += 1;
          totals.completeActiveCurrentRelations += 1;
        } else totals.inactive += 1;
        if (starts) totals.start += 1;
        if (target.currentRelation.route === "soundmainram.persisted-current") totals.persistedCurrent += 1;
        if (target.type & FIX) totals.fixed += 1;
        else totals.linear += 1;
        if (looping) totals.looping += 1;
        if (target.targetProducingRoute !== "pre-mplay-persisted") replaced += 1;
        increment(routes, target.targetProducingRoute);
        increment(roles, descriptor.storageRole);
        increment(waves, descriptor.waveSymbol);
      }
    }
    totals.observations += entry.observations.length;
    cases.push({ case: name, observations: entry.observations.length, selectedChannels: entry.observations.length * 5, mplayReplacedTargets: replaced, entryReceiptSha256: entryHash, v3ReceiptSha256: v3Hash });
  }

  if (totals.observations !== 113 || totals.selectedChannels !== 565 || totals.exactV3DigestCostJoins !== 113 || totals.unequalV3Costs !== 0) fail("global join cardinality changed");
  const unclassifiedReplacements = routes["mplay-replaced-before-entry-unclassified-tone-route"] ?? 0;
  if (unclassifiedReplacements !== 13 || (routes["pre-mplay-persisted"] ?? 0) !== 552) fail("target route census changed");

  return {
    schema: "factory-m4a-soundmainram-entry-target-evidence/v1",
    oracleProfile: "battle-scene-off",
    captureBoundary: "sound-main-ram-entry after six MPlayMain calls and CgbSound, before channel 0",
    reproducibility: { freshRunsPerCase: 2, entryReceiptSha256: entryHashes, byteIdenticalCases: 3 },
    frozenInputs: { sourceStateV3ReceiptSha256: v3Hashes, soundMainRamTargetAuditV1Sha256: V1_AUDIT_HASH },
    mechanicalJoin: { key: "sourceStateDigest", costField: "m4aSoundMainCycles", exactDigestCostJoins: totals.exactV3DigestCostJoins, unequalCosts: totals.unequalV3Costs, pointerProducingBranches: POINTER_PRODUCERS.length, sampleReadRules: SAMPLE_READ_RULES.length },
    cases,
    coverage: {
      ...totals,
      storageRoles: Object.fromEntries(Object.entries(roles).sort()),
      targetProducingRoutes: Object.fromEntries(Object.entries(routes).sort()),
      waveSymbols: Object.fromEntries(Object.entries(waves).sort()),
      actualSoundMainRamEntryTargetCoverage: true,
      runtimeTargetSafetyComplete: true,
      runtimeTargetProvenanceComplete: false,
    },
    closure: {
      closed: "All 565 selected mixer-entry slots have address-free, complete logical and physical sample regions, aligned readable storage roles, exact effective current routes, bounded loop/current relations, and sufficient fixed/linear guard bytes. The actual SoundMainRAM entry target-safety class is closed for all 113 observed OFF construction VBlanks.",
      narrowed: "552/565 targets preserve the pre-MPlay WaveData target. The other 13 are proven MPlay replacements with complete safe entry descriptors, but the compact hook does not distinguish which ply_note tone-selection sub-route produced them.",
      exactMissingMutableRouteField: "For the 13 targetProducingRoute='mplay-replaced-before-entry-unclassified-tone-route' rows, capture mplayReplacementRoute at the ply_note SoundChannel.wav write as one of mplay.ply-note.inline-tone-wave, mplay.ply-note.keysplit-tone-wave, or mplay.ply-note.rhythm-tone-wave; for inline, additionally identify whether ply_xwave.command-u32 replaced MusicPlayerTrack.ToneData.wav earlier in the same MPlayMain pass.",
      durationLicensed: false,
      constructionClockLicensed: false,
    },
  };
}

function markdown(evidence: Record<string, unknown>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  const join = evidence.mechanicalJoin as Record<string, unknown>;
  const closure = evidence.closure as Record<string, unknown>;
  const cases = evidence.cases as Array<Record<string, unknown>>;
  const repro = evidence.reproducibility as Record<string, unknown>;
  return [
    "# Issue #55 — SoundMainRAM mixer-entry targets v1",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-soundmainram-entry-targets-v1.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF evidence only. This additive packet leaves every prior m4a v1-v3 receipt and the target-audit v1 fixture byte-for-byte frozen.",
    "",
    "## Fresh capture and mechanical join",
    "",
    `Two fresh serial wrapper-mediated runs per case are byte-identical (${repro.byteIdenticalCases}/3 cases). The compact rows join the committed v3 state key and m4a call cost at **${join.exactDigestCostJoins}/${join.exactDigestCostJoins}** observations with **${join.unequalCosts}** unequal costs. They are also mechanically checked against the existing **${join.pointerProducingBranches}** pointer-producing branches and **${join.sampleReadRules}** read/range rules.`,
    "",
    "| case | observations | selected channels | MPlay-replaced targets | receipt SHA-256 |",
    "| --- | ---: | ---: | ---: | --- |",
    ...cases.map((row) => `| ${row.case} | ${row.observations} | ${row.selectedChannels} | ${row.mplayReplacedTargets} | ${row.entryReceiptSha256} |`),
    "",
    "## Mixer-entry target safety",
    "",
    `All **${coverage.selectedChannels}** selected slots at the actual post-six-MPlayMain sound-main-ram-entry hook have complete WaveData payloads and complete physical allocations, aligned readable Game Pak storage, exact effective current routes, and sufficient guard bytes for their selected read rule. Active/inactive = **${coverage.active}/${coverage.inactive}**; START/persisted-current = **${coverage.start}/${coverage.persistedCurrent}**; fixed/linear = **${coverage.fixed}/${coverage.linear}**. No CMP, REV, compressed, unreadable, unaligned, incomplete-current, incomplete-region, or insufficient-guard row occurs.`,
    "",
    `The five normalized WaveData assets are ${JSON.stringify(coverage.waveSymbols)}. Storage roles are ${JSON.stringify(coverage.storageRoles)}.`,
    "",
    "The descriptor retains status/type/count/fw/frequency, the effective START-or-persisted current offset, complete declared and physical sample-region digests, storage role, symbol, alignment, physical payload length, and required/available guard bytes. Raw address or pointer identity is absent from the accepted compact key.",
    "",
    "## Closure boundary",
    "",
    String(closure.closed),
    "",
    String(closure.narrowed),
    "",
    `**Exact remaining mutable-route field:** ${closure.exactMissingMutableRouteField}`,
    "",
    "This packet licenses no duration reducer, state-duration table, service cost, operation clock, or construction-clock wiring.",
    "",
  ].join("\n");
}

function paths(): { evidence: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { evidence: DEFAULT_EVIDENCE_PATH, doc: DEFAULT_DOC_PATH };
  if (args.length === 2 && args[0] === "--out-dir") {
    const root = resolve(args[1]!);
    return { evidence: join(root, "factory-m4a-soundmainram-entry-target-evidence-v1.json"), doc: join(root, "issue55-m4a-soundmainram-entry-targets-v1.md") };
  }
  fail("usage: factory-m4a-soundmainram-entry-targets-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = buildEvidence();
  const output = paths();
  mkdirSync(dirname(output.evidence), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
  process.stdout.write(`wrote ${output.evidence}\nwrote ${output.doc}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
