// Reclaim leaked scratch directories from $TMPDIR.
//
// The suite and the comparators allocate scratch space with
// `mkdtempSync(join(tmpdir(), "<prefix>-"))`. Historically almost none of them
// removed it again, and macOS only sweeps $TMPDIR on reboot — by 2026-08-01
// this box had accumulated ~97k directories / 262 GB. `tests/setup/` now
// sandboxes the suite's allocations, but that only stops new debris; this
// sweeper collects what is already there, plus anything a killed process
// leaves behind.
//
//   node --experimental-strip-types tools/sweep-scratch-dirs.ts            # dry run
//   node --experimental-strip-types tools/sweep-scratch-dirs.ts --apply
//   ... --min-age-hours 6 --size
//
// Safety: a directory is only ever a candidate when its name is exactly one of
// this repo's own mkdtemp prefixes plus mkdtemp's six random characters, and
// when it has not been modified for --min-age-hours (default 24). Unrelated
// tenants of $TMPDIR — Chrome, Codex, the OS — can never match.
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const MKDTEMP_SUFFIX_LENGTH = 6;
const SOURCE_DIRECTORIES = ["tools", "tests", "src", "bin"];
// Both spellings must be recognised, or the sweeper silently stops matching
// whole families of debris:
//   - the raw allocation, single-line and wrapped, as the suites still write it;
//   - `createScratchDir("prefix-")`, which is how tools/ spells it since the
//     helper landed — directories created before that still litter $TMPDIR.
const PREFIX_PATTERNS = [
  /mkdtempSync\(\s*join\(\s*tmpdir\(\)\s*,\s*[`"']([^`"']+)[`"']/g,
  /createScratchDir\(\s*[`"']([^`"']+)[`"']/g,
];

interface Options {
  apply: boolean;
  minAgeHours: number;
  withSize: boolean;
  target: string;
}

function parseArguments(argv: string[]): Options {
  const options: Options = {
    apply: false,
    minAgeHours: 24,
    withSize: false,
    target: tmpdir(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--size") options.withSize = true;
    else if (argument === "--min-age-hours") {
      const value = Number(argv[(index += 1)]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("--min-age-hours needs a non-negative number");
      }
      options.minAgeHours = value;
    } else if (argument === "--tmpdir") {
      options.target = argv[(index += 1)] ?? options.target;
    } else {
      throw new Error(`unknown option '${argument}'`);
    }
  }
  return options;
}

function collectSourceFiles(directory: string, found: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(path, found);
    else if (entry.name.endsWith(".ts")) found.push(path);
  }
  return found;
}

// Derived from the source rather than hardcoded, so a new tool or suite is
// swept without anyone remembering to update a list here.
function discoverPrefixes(): Set<string> {
  const prefixes = new Set<string>();
  for (const directory of SOURCE_DIRECTORIES) {
    for (const file of collectSourceFiles(join(repoRoot, directory))) {
      const source = readFileSync(file, "utf8");
      for (const pattern of PREFIX_PATTERNS) {
        for (const match of source.matchAll(pattern)) prefixes.add(match[1]);
      }
    }
  }
  return prefixes;
}

function directorySizeBytes(path: string): number {
  let total = 0;
  const stack = [path];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile()) {
        try {
          total += statSync(child).size;
        } catch {
          // Raced with another sweeper or the owning process; skip it.
        }
      }
    }
  }
  return total;
}

function formatGigabytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function main(): void {
  const options = parseArguments(process.argv.slice(2));
  const prefixes = discoverPrefixes();
  const cutoff = Date.now() - options.minAgeHours * 3_600_000;

  const candidates: string[] = [];
  let tooRecent = 0;

  for (const name of readdirSync(options.target)) {
    const stem = name.slice(0, -MKDTEMP_SUFFIX_LENGTH);
    // `pokebench-vitest-<pid>` is the sandbox root a killed run can strand; it
    // has no mkdtemp suffix, so it is matched on its own.
    const isSandboxRoot = /^pokebench-vitest-\d+$/.test(name);
    if (!isSandboxRoot && !prefixes.has(stem)) continue;

    const path = join(options.target, name);
    let stats;
    try {
      stats = statSync(path);
    } catch {
      continue;
    }
    if (!stats.isDirectory()) continue;
    if (stats.mtimeMs > cutoff) {
      tooRecent += 1;
      continue;
    }
    candidates.push(path);
  }

  console.log(`scratch prefixes known to this repo: ${prefixes.size}`);
  console.log(`scanning: ${options.target}`);
  console.log(
    `matched: ${candidates.length} directories older than ${options.minAgeHours}h` +
      (tooRecent > 0 ? ` (${tooRecent} skipped as too recent)` : ""),
  );

  if (options.withSize) {
    let bytes = 0;
    for (const path of candidates) bytes += directorySizeBytes(path);
    console.log(`reclaimable: ${formatGigabytes(bytes)}`);
  }

  if (!options.apply) {
    console.log("dry run — pass --apply to remove them");
    return;
  }

  let removed = 0;
  let failed = 0;
  for (const path of candidates) {
    try {
      rmSync(path, { recursive: true, force: true });
      removed += 1;
    } catch {
      failed += 1;
    }
  }
  console.log(`removed ${removed} directories${failed > 0 ? `, ${failed} failed` : ""}`);
}

main();
