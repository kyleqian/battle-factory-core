import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SourcePosition = { role: string; offset: number };
export type SourceRegion = { role: string; symbol: string; bytes: Uint8Array };
export type TrackReadState = {
  flags: number;
  wait: number;
  patternLevel: number;
  repeatCount: number;
  runningStatus: number;
  command: SourcePosition;
  patternStack: Array<SourcePosition | null>;
};
export type TrackReadResult = {
  outcome: "wait" | "fine";
  reads: SourcePosition[];
  commands: string[];
  dispatches: CommandDispatch[];
};
export type CommandDispatch = {
  source: SourcePosition;
  encoded: number;
  command: number;
  runningStatusBefore: number;
  decode: "running-status" | "encoded";
  route: "note" | "wait" | "jump-table";
  jumpTableIndex: number | null;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const V3_DIR = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-command-read-contract-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-command-read-contract-v1.md");
const CASES = ["anchor", "liliana", "factory-varied"] as const;

function fail(message: string): never { throw new Error(`factory-m4a-command-read-contract-v1: ${message}`); }
function sha256(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function add(position: SourcePosition, amount: number, regions: readonly SourceRegion[]): SourcePosition {
  const region = regions.find((candidate) => candidate.role === position.role);
  if (!region || !Number.isInteger(position.offset) || position.offset < 0 || position.offset + amount > region.bytes.length) fail(`read escapes ${position.role}+${position.offset}`);
  return { role: position.role, offset: position.offset + amount };
}

function byte(position: SourcePosition, regions: readonly SourceRegion[], reads: SourcePosition[]): number {
  const region = regions.find((candidate) => candidate.role === position.role);
  if (!region || position.offset < 0 || position.offset >= region.bytes.length) fail(`unavailable byte ${position.role}+${position.offset}`);
  reads.push({ ...position });
  return region.bytes[position.offset]!;
}

function pointer(position: SourcePosition, regions: readonly SourceRegion[], reads: SourcePosition[], resolvePointer: (encoded: number) => SourcePosition | null): SourcePosition {
  let encoded = 0;
  for (let index = 0; index < 4; index += 1) encoded = (encoded | (byte(add(position, index, regions), regions, reads) << (index * 8))) >>> 0;
  const target = resolvePointer(encoded);
  if (!target) fail(`control target has no bounded source role`);
  return target;
}

/**
 * Replays only MPlayMain's command/pattern reads for one tempo pass.  The
 * caller supplies address-free positions and a compiled-pointer normalizer;
 * all returned positions are role+bounded-offset descriptors.
 */
export function traceMPlayTrackReads(
  input: TrackReadState,
  regions: readonly SourceRegion[],
  resolvePointer: (encoded: number) => SourcePosition | null,
): TrackReadResult {
  if ((input.flags & 0x80) === 0) return { outcome: "fine", reads: [], commands: [], dispatches: [] };
  if (input.wait > 0) return { outcome: "wait", reads: [], commands: [], dispatches: [] };
  if (!Number.isInteger(input.patternLevel) || input.patternLevel < 0 || input.patternLevel > 3) fail("invalid pattern level");
  if (input.patternStack.length !== 3) fail("pattern stack must have three slots");
  for (let index = 0; index < input.patternLevel; index += 1) if (!input.patternStack[index]) fail(`active pattern stack slot ${index} is unavailable`);

  let current = { ...input.command };
  let running = input.runningStatus;
  let patternLevel = input.patternLevel;
  let repeatCount = input.repeatCount;
  const stack = input.patternStack.map((entry) => entry && ({ ...entry }));
  const reads: SourcePosition[] = [];
  const commands: string[] = [];
  const dispatches: CommandDispatch[] = [];
  const seen = new Set<string>();

  for (let step = 0; step < 1024; step += 1) {
    const signature = canonical({ current, running, patternLevel, repeatCount, stack });
    if (seen.has(signature)) fail("recursive command/control flow");
    seen.add(signature);
    const source = { ...current };
    const encoded = byte(current, regions, reads);
    const runningStatusBefore = running;
    let command = encoded;
    if (encoded < 0x80) {
      command = running;
      if (command < 0xbd) fail("data byte has no valid running status");
    } else {
      current = add(current, 1, regions);
      if (encoded >= 0xbd) running = encoded;
    }

    if (command >= 0xcf) {
      commands.push("note");
      dispatches.push({ source, encoded, command, runningStatusBefore, decode: encoded < 0x80 ? "running-status" : "encoded", route: "note", jumpTableIndex: null });
      const key = byte(current, regions, reads);
      if (key < 0x80) {
        current = add(current, 1, regions);
        const velocity = byte(current, regions, reads);
        if (velocity < 0x80) {
          current = add(current, 1, regions);
          if (byte(current, regions, reads) < 0x80) current = add(current, 1, regions);
        }
      }
      continue;
    }
    if (command >= 0x80 && command <= 0xb0) {
      commands.push("wait");
      dispatches.push({ source, encoded, command, runningStatusBefore, decode: "encoded", route: "wait", jumpTableIndex: null });
      return { outcome: "wait", reads, commands, dispatches };
    }
    commands.push(`0x${command.toString(16)}`);
    dispatches.push({ source, encoded, command, runningStatusBefore, decode: encoded < 0x80 ? "running-status" : "encoded", route: "jump-table", jumpTableIndex: command - 0xb1 });
    if (command === 0xb1 || (command >= 0xb6 && command <= 0xb8) || (command >= 0xc6 && command <= 0xc7) || (command >= 0xc9 && command <= 0xcb)) return { outcome: "fine", reads, commands, dispatches };
    if (command === 0xb2) { current = pointer(current, regions, reads, resolvePointer); continue; }
    if (command === 0xb3) {
      if (patternLevel >= 3) return { outcome: "fine", reads, commands, dispatches };
      stack[patternLevel] = add(current, 4, regions);
      patternLevel += 1;
      current = pointer(current, regions, reads, resolvePointer);
      continue;
    }
    if (command === 0xb4) {
      if (patternLevel > 0) {
        patternLevel -= 1;
        const target = stack[patternLevel];
        if (!target) fail("pattern return target unavailable");
        current = { ...target };
      }
      continue;
    }
    if (command === 0xb5) {
      const countPosition = current;
      const count = byte(countPosition, regions, reads);
      if (count === 0) { current = pointer(add(countPosition, 1, regions), regions, reads, resolvePointer); continue; }
      repeatCount = (repeatCount + 1) & 0xff;
      if (repeatCount < count) current = pointer(add(countPosition, 1, regions), regions, reads, resolvePointer);
      else { repeatCount = 0; current = add(countPosition, 5, regions); }
      continue;
    }
    if (command === 0xb9) fail("MEMACC requires unavailable bounded memAccArea state");
    if ((command >= 0xba && command <= 0xc5) || command === 0xc8) {
      byte(current, regions, reads);
      current = add(current, 1, regions);
      continue;
    }
    if (command === 0xcc) {
      byte(current, regions, reads);
      byte(add(current, 1, regions), regions, reads);
      current = add(current, 2, regions);
      continue;
    }
    if (command === 0xcd) {
      const selector = byte(current, regions, reads);
      current = add(current, 1, regions);
      if (selector === 0 || selector === 3) return { outcome: "fine", reads, commands, dispatches };
      const length = selector === 1 || selector === 13 ? 4 : selector === 12 ? 2 : selector >= 2 && selector <= 11 ? 1 : -1;
      if (length < 0) fail(`unknown XCMD selector ${selector}`);
      for (let index = 0; index < length; index += 1) byte(add(current, index, regions), regions, reads);
      if (selector === 12) return { outcome: "wait", reads, commands, dispatches };
      current = add(current, length, regions);
      continue;
    }
    if (command === 0xce) {
      if (byte(current, regions, reads) < 0x80) current = add(current, 1, regions);
      continue;
    }
    fail(`unknown command 0x${command.toString(16)}`);
  }
  fail("command step bound exceeded");
}

export type RegionDigest = { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
type Track = { scalarBytes: number[]; commandRegion: RegionDigest; patternRegions: RegionDigest[] };
type V3 = { schema: string; case: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ scalarBytes: number[]; tracks: Track[] }> } } } }> };

export function compiledSong(): { regions: SourceRegion[]; bases: Map<string, number>; songDigest: string; scanBase: number; scanBytes: Uint8Array; controlFlow: Array<{ symbol: string; bytes: number; sha256: string }> } {
  const nm = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const wanted = new Set([...Array.from({ length: 9 }, (_, index) => `mus_b_factory_${index + 1}`), "mus_b_factory"]);
  const symbols = nm.split("\n").map((line) => line.trim().split(/\s+/)).filter((parts) => parts.length >= 3 && wanted.has(parts.at(-1)!)).map((parts) => ({ name: parts.at(-1)!, value: Number.parseInt(parts[0]!, 16) })).sort((a, b) => a.value - b.value);
  if (symbols.length !== 10 || symbols.at(-1)!.name !== "mus_b_factory") fail("compiled mus_b_factory track symbols changed");
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  const regions: SourceRegion[] = [];
  const bases = new Map<string, number>();
  for (let index = 0; index < 9; index += 1) {
    const start = symbols[index]!;
    const end = symbols[index + 1]!;
    const role = `battle-factory-bgm-track-${index + 1}`;
    bases.set(role, start.value);
    regions.push({ role, symbol: start.name, bytes: rom.subarray(start.value - 0x08000000, end.value - 0x08000000) });
  }
  const scanBase = symbols[0]!.value;
  const controlNames = new Set(["MPlayMain", "ply_goto", "ply_patt", "ply_pend", "ply_rept", "ply_note", "ply_endtie", "ply_memacc", "ply_xcmd", "ply_xwait"]);
  const controlFlow = nm.split("\n").map((line) => line.trim().split(/\s+/)).filter((parts) => parts.length >= 4 && controlNames.has(parts.at(-1)!)).map((parts) => {
    const symbol = parts.at(-1)!;
    const address = Number.parseInt(parts[0]!, 16);
    const bytes = Number.parseInt(parts[1]!, 16);
    if (address < 0x08000000 || address + bytes > 0x0a000000 || bytes <= 0) fail(`invalid compiled control-flow symbol ${symbol}`);
    return { symbol, bytes, sha256: sha256(rom.subarray(address - 0x08000000, address - 0x08000000 + bytes)) };
  }).sort((left, right) => left.symbol.localeCompare(right.symbol));
  if (controlFlow.length !== controlNames.size) fail("compiled MPlayMain control-flow symbol set changed");
  return {
    regions,
    bases,
    songDigest: sha256(rom.subarray(scanBase - 0x08000000, symbols.at(-1)!.value - 0x08000000)),
    scanBase,
    scanBytes: rom.subarray(scanBase - 0x08000000, symbols.at(-1)!.value - 0x08000000 + 256),
    controlFlow,
  };
}

export function digestPosition(region: RegionDigest, window: number, regions: readonly SourceRegion[], bases: ReadonlyMap<string, number>, scanBase: number, scanBytes: Uint8Array): SourcePosition | null {
  if (!region.complete || region.capturedBytes !== window || !region.sha256) return null;
  const matches: SourcePosition[] = [];
  for (let scanOffset = 0; scanOffset + window <= scanBytes.length; scanOffset += 1) {
    if (sha256(scanBytes.subarray(scanOffset, scanOffset + window)) !== region.sha256) continue;
    const encoded = scanBase + scanOffset;
    for (const source of regions) {
      const base = bases.get(source.role)!;
      if (encoded >= base && encoded < base + source.bytes.length) matches.push({ role: source.role, offset: encoded - base });
    }
  }
  if (matches.length > 1) fail(`digest ${region.sha256} is ambiguous`);
  return matches[0] ?? null;
}

export function makeEvidence(): Record<string, unknown> {
  const { regions, bases, songDigest, scanBase, scanBytes, controlFlow } = compiledSong();
  const resolvePointer = (encoded: number): SourcePosition | null => {
    for (const region of regions) {
      const base = bases.get(region.role)!;
      if (encoded >= base && encoded < base + region.bytes.length) return { role: region.role, offset: encoded - base };
    }
    return null;
  };
  const rows: Array<Record<string, unknown>> = [];
  let observations = 0, activeTracks = 0, waitingTracks = 0, candidateTracks = 0;
  const caseCounts: Record<string, number> = {};
  for (const caseName of CASES) {
    const packet = JSON.parse(readFileSync(join(V3_DIR, `${caseName}.json`), "utf8")) as V3;
    if (packet.schema !== "factory-m4a-source-state-probe/v3" || packet.case !== caseName) fail(`${caseName} v3 identity changed`);
    caseCounts[caseName] = packet.interrupts.length;
    observations += packet.interrupts.length;
    for (const observation of packet.interrupts) {
      const player = observation.m4a.state.sourceSemanticState.musicPlayers.at(-1);
      if (!player || player.tracks.length !== 10) fail("sixth MPlay player shape changed");
      for (let trackIndex = 0; trackIndex < player.tracks.length; trackIndex += 1) {
        const track = player.tracks[trackIndex]!;
        const flags = track.scalarBytes[0]!;
        if ((flags & 0x80) === 0) continue;
        activeTracks += 1;
        if (track.scalarBytes[1]! > 0) { waitingTracks += 1; continue; }
        candidateTracks += 1;
        const command = digestPosition(track.commandRegion, 256, regions, bases, scanBase, scanBytes);
        if (!command) fail(`active command window does not resolve for track ${trackIndex}`);
        const patternStack = track.patternRegions.map((entry) => digestPosition(entry, 128, regions, bases, scanBase, scanBytes));
        const result = traceMPlayTrackReads({ flags, wait: 0, patternLevel: track.scalarBytes[2]!, repeatCount: track.scalarBytes[3]!, runningStatus: track.scalarBytes[7]!, command, patternStack }, regions, resolvePointer);
        const uniqueReads = [...new Map(result.reads.map((entry) => [`${entry.role}:${entry.offset}`, entry])).values()];
        rows.push({ sourceStateDigest: observation.m4a.state.sourceSemanticState.stateDigest, trackIndex, command, outcome: result.outcome, commandCount: result.commands.length, readCount: result.reads.length, uniqueReadCount: uniqueReads.length, readSetDigest: sha256(canonical(uniqueReads)) });
      }
    }
  }
  const sourceRegions = regions.map((region) => ({ role: region.role, symbol: region.symbol, offsetBounds: { min: 0, maxExclusive: region.bytes.length }, length: region.bytes.length, sha256: sha256(region.bytes) }));
  return {
    schema: "factory-m4a-command-read-contract-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceStateReference: { packetSchema: "factory-m4a-source-state-probe/v3", fileSha256: Object.fromEntries(CASES.map((name) => [name, sha256(readFileSync(join(V3_DIR, `${name}.json`)))])) },
    compiledSource: {
      song: "mus_b_factory",
      songDigest,
      sourceRegions,
      controlFlow,
      sourceDigests: {
        "reference/pokeemerald/src/m4a_1.s": sha256(readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"))),
        "reference/pokeemerald/src/m4a.c": sha256(readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"))),
      },
    },
    contract: { revision: "mplay-command-read/v1", conservativeTempoPasses: 1, failClosed: ["malformed pattern state", "recursive control", "unknown command or XCMD selector", "MEMACC without bounded memAccArea", "unavailable command/pattern/source bounds"] },
    coverage: { observations, caseCounts, trackSnapshots: observations * 10, activeTracks, waitingTracks, candidateTracks, tracedCandidates: rows.length, incompleteCandidates: candidateTracks - rows.length, distinctReadSets: new Set(rows.map((row) => row.readSetDigest)).size, maxCommandCount: Math.max(...rows.map((row) => row.commandCount as number)), maxReadCount: Math.max(...rows.map((row) => row.readCount as number)) },
    selectorBoundary: { complete: false, reason: "v3 PLAYER_POINTER_FIELDS incorrectly zeroes MusicPlayerInfo bytes 0x20..0x23 (tempoI and tempoC), while failing to normalize memAccArea at 0x18..0x1b; the exact zero-pass/one-pass selector cannot be reconstructed from v3", safeSuperset: "valid live tempo state and tempoD=144/tempoU=256 imply at most one pass; replaying all wait==0 tracks as one pass covers every possible command/pattern dereference" },
    candidateReads: rows,
    verdict: "The observed sixth-MPlayMain command/pattern dereference class is bounded address-free for every v3 state. Exact per-call pass selection remains unavailable because v3 erased tempoI/tempoC; no duration or clock reducer is licensed.",
  };
}

function markdown(evidence: Record<string, unknown>): string {
  const coverage = evidence.coverage as Record<string, number>;
  const compiled = evidence.compiledSource as { songDigest: string; sourceRegions: Array<{ role: string; symbol: string; length: number; sha256: string }> };
  return [
    "# Issue #55 - MPlayMain command/pattern read contract v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-command-read-contract-v1.ts`; do not hand-edit.", "",
    "This hermetic Battle Scene OFF checkpoint reuses the committed v3 fixtures and the pinned ROM/ELF. It records no runtime address, frame, tick, case-duration, or timing lookup.", "",
    `Across ${coverage.observations} observations, ${coverage.activeTracks}/${coverage.trackSnapshots} track snapshots are active. ${coverage.waitingTracks} have wait>0 and cannot read command bytes in the single possible tempo pass; all ${coverage.candidateTracks} wait==0 candidates replay successfully, with 0 incomplete candidates, ${coverage.distinctReadSets} distinct read sets, at most ${coverage.maxCommandCount} commands and ${coverage.maxReadCount} byte reads.`, "",
    `Compiled song digest: ${compiled.songDigest}.`, "", "| role | ELF symbol | bytes | SHA-256 |", "| --- | --- | ---: | --- |", ...compiled.sourceRegions.map((row) => `| ${row.role} | ${row.symbol} | ${row.length} | ${row.sha256} |`), "",
    "The pure contract normalizes every current command, active pattern return, and encoded GOTO/PATT/REPT destination to a role plus checked offset. It fails closed on malformed stacks, recursive control, unknown commands/selectors, MEMACC without bounded memory, and unavailable source bounds.", "",
    "## Exact remaining selector", "",
    "The v3 probe's `PLAYER_POINTER_FIELDS` tuple incorrectly zeroed bytes 0x20-0x23, which are `tempoI` and `tempoC`, while leaving the actual `memAccArea` pointer at 0x18-0x1b in `scalarBytes`. Therefore v3 cannot say whether a particular call executes zero or one tempo pass. The compiled initialization relation (`tempoI = tempoD * tempoU >> 8 = 144`) and MPlayMain's maintained `tempoC < 150` invariant prove that no call can execute more than one pass; treating every wait==0 track as one-pass is a complete dereference superset, but not an exact execution selector.", "",
    "This closes the observed unbounded-read class as a safety/bounds contract. It does not produce a duration, select a per-call path, or wire the construction clock.", "",
  ].join("\n");
}

export function main(): void {
  const evidence = makeEvidence();
  writeFileSync(OUTPUT, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(DOC, markdown(evidence));
  process.stdout.write(`wrote ${OUTPUT}\nwrote ${DOC}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
