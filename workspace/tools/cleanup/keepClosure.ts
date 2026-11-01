// Keep-closure for the cln237 cleanup: decides which files under tools/integration and
// tools/compare (the "candidates") are still referenced and must stay. Everything else
// tracked in the repo (src, tests, other tools, launchers, package.json, ...; but NOT docs
// or any *.md) is a reference root and is never deleted. A candidate is kept if a seed names
// it or any kept file references it by repo-relative path (suffix match), by bare basename,
// by a directory prefix (keeps the whole directory), or by a python import. Iterates to a
// fixed point. Docs/ledger mentions deliberately do not keep anything.
//
//   node --experimental-strip-types tools/cleanup/keepClosure.ts [--delete-list FILE]
//        [--kept-list FILE] [--explain PATH_SUBSTRING] [--counts]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CANDIDATE_DIRS = ['workspace/tools/integration/', 'workspace/tools/compare/'];

// Seeds inside the candidate dirs (workspace-relative; a trailing "/" keeps the whole tree).
const SEEDS = [
  'tools/compare/run.ts',
  'tools/compare/batch.ts',
  'tools/compare/app-differential.ts',
  'tools/compare/inspect-frame.ts',
  'tools/compare/appTrace.ts',
  'tools/compare/traces/',
  'tools/compare/traces-groundtruth/',
  'tools/integration/lsd194Census.sh',
  'tools/integration/rst197CensusDelta.py',
  'tools/integration/start-local-preview.sh',
];

const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|py|sh|json|jsonl|c|h|txt|html|css|yml|yaml|toml|rs|cfg|ini|s|tsv|csv)$/i;
const MAX_SCAN_BYTES = 40 * 1024 * 1024;
const EXT_GUESS = ['.ts', '.mjs', '.js', '.cjs', '.py', '.sh', '.json'];

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\0')
  .filter(Boolean);

const isCandidate = (p: string): boolean => CANDIDATE_DIRS.some((d) => p.startsWith(d));
const candidates = tracked.filter(isCandidate);
const candidateSet = new Set(candidates);
const roots = tracked.filter(
  (p) => !isCandidate(p) && !/\.md$/i.test(p) && !p.startsWith('workspace/docs/') && !p.endsWith('package-lock.json') && p !== 'workspace/ANIMATION_COVERAGE.json',
);

const ws = (p: string): string => (p.startsWith('workspace/') ? p.slice('workspace/'.length) : p);
const base = (p: string): string => p.slice(p.lastIndexOf('/') + 1);

// path-suffix index: basename -> candidates
const byBase = new Map<string, string[]>();
for (const c of candidates) {
  const b = base(c);
  (byBase.get(b) ?? byBase.set(b, []).get(b)!).push(c);
}
// directory index: every candidate directory (>= 3 segments under workspace/, i.e. below tools/<x>/)
const dirFiles = new Map<string, string[]>();
for (const c of candidates) {
  const parts = ws(c).split('/');
  for (let n = 3; n < parts.length; n++) {
    const d = parts.slice(0, n).join('/');
    (dirFiles.get(d) ?? dirFiles.set(d, []).get(d)!).push(c);
  }
}
const dirsBySuffix = new Map<string, string[]>(); // "compare/fixtures" -> ["tools/compare/fixtures"]
for (const d of dirFiles.keys()) {
  const parts = d.split('/');
  for (let i = 0; i <= parts.length - 2; i++) {
    const s = parts.slice(i).join('/');
    (dirsBySuffix.get(s) ?? dirsBySuffix.set(s, []).get(s)!).push(d);
  }
}
const dirsByName = new Map<string, string[]>();
for (const d of dirFiles.keys()) {
  const parts = d.split('/');
  if (parts.length >= 4) (dirsByName.get(parts[parts.length - 1]) ?? dirsByName.set(parts[parts.length - 1], []).get(parts[parts.length - 1])!).push(d);
}

const kept = new Map<string, string>(); // candidate -> reason
const queue: string[] = [];
const keep = (c: string, reason: string): void => {
  if (kept.has(c)) return;
  kept.set(c, reason);
  queue.push(c);
};
const keepDir = (d: string, reason: string): void => {
  for (const c of dirFiles.get(d) ?? []) keep(c, `${reason} [dir ${d}]`);
};

for (const s of SEEDS) {
  if (s.endsWith('/')) keepDir(s.slice(0, -1), 'seed');
  else if (candidateSet.has(`workspace/${s}`)) keep(`workspace/${s}`, 'seed');
  else console.error(`seed missing: ${s}`);
}

const dirOnlyMentions: string[] = [];
const broadDirMentions: string[] = []; // tools/<x>/<sub> cited as a path prefix: logged for review, not kept whole

const CODE_EXT = /\.(ts|tsx|js|mjs|cjs|py|sh)$/i;

// Comments never read a file at runtime, so they do not keep anything (src/ comments cite whole fixture dirs).
function stripComments(file: string, text: string): string {
  if (/\.(ts|tsx|js|mjs|cjs)$/i.test(file)) return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/.*$/gm, '$1');
  if (/\.(py|sh)$/i.test(file)) return text.replace(/^\s*#.*$/gm, '').replace(/\s#\s.*$/gm, '');
  return text;
}

// Name fragments quoted in kept code ("horizontal-shake-slow" in `${stem}-run-a.json`, "gust-%s-%s"):
// a kept data file whose basename starts with one (at a -_. boundary) is kept, since the full name is built at runtime.
const fragments = new Set<string>();
const DATA_EXT = /\.(json|txt|gz|png|tar|jsonl|tsv|csv)$/i;
function collectFragments(text: string): void {
  for (const m of text.matchAll(/(["'])((?:\\.|(?!\1)[^\n])*)\1|`([^`]*)`/g)) {
    for (const tok of (m[2] ?? m[3] ?? '').match(/[A-Za-z0-9_@.\-/~%$]+/g) ?? []) {
      for (const piece of tok.split(/\/|%s|\$/)) {
        const f = piece.replace(/^[-_.]+|[-_.]+$/g, '');
        if (f.length >= 5) fragments.add(f);
      }
    }
  }
}
function keepByFragment(): boolean {
  let any = false;
  for (const c of candidates) {
    if (kept.has(c) || !DATA_EXT.test(c)) continue;
    const b = base(c);
    for (let i = 5; i <= b.length; i++) {
      if (i < b.length && !'-_.'.includes(b[i])) continue;
      if (fragments.has(b.slice(0, i))) {
        keep(c, `name fragment "${b.slice(0, i)}"`);
        any = true;
        break;
      }
    }
  }
  return any;
}

function scan(file: string, rawText: string): void {
  const text = stripComments(file, rawText);
  if (CODE_EXT.test(file)) collectFragments(text);
  const self = isCandidate(file) ? ws(file) : null;
  const reason = `referenced by ${file}`;
  // 'tools', 'compare', 'x'  ->  'tools/compare/x'
  const flat = text.replace(/(['"`])\s*,\s*\1/g, '/').replace(/(['"`])\s*,\s*(['"`])/g, '/');
  const toks = new Set(flat.match(/[A-Za-z0-9_@.\-/~]+/g) ?? []);
  for (const raw of toks) {
    const hadSlash = raw.includes('/');
    let t = raw;
    while (t.startsWith('./') || t.startsWith('../') || t.startsWith('/')) t = t.replace(/^\.{0,2}\//, '');
    t = t.replace(/\/+$/, '');
    if (!t || t === '.' || t === '..') continue;
    const segs = t.split('/');
    // 1) file match
    const b = segs[segs.length - 1];
    let hits = byBase.get(b);
    if (!hits && hadSlash && !b.includes('.')) {
      for (const e of EXT_GUESS) if ((hits = byBase.get(b + e))) break;
    }
    if (hits) {
      for (const c of hits) {
        if (segs.length === 1 || ws(c) === t || ws(c).endsWith(`/${t}`) || ws(c).startsWith(`${t}.`) || ws(c).includes(`/${t}.`)) keep(c, reason);
      }
    }
    // 2) directory match (>= 2 trailing segments)
    if (segs.length >= 2) {
      const ds = dirsBySuffix.get(t);
      if (ds) {
        for (const d of ds) {
          if (d.split('/').length >= 4) keepDir(d, reason);
          else broadDirMentions.push(`${file}\t${d}`);
        }
      }
      if (t === 'tools/compare' || t === 'tools/integration' || t === 'compare' || t === 'integration') {
        if (!self) dirOnlyMentions.push(`${file}: ${raw}`);
      }
    }
    // 3) bare token equal to a depth-4 candidate directory name ("prep17-live"): kept whole (dynamic fixtures/${dir}/... reads)
    if (segs.length === 1 && CODE_EXT.test(file)) for (const d of dirsByName.get(t) ?? []) keepDir(d, reason);
  }
  if (/\.py$/.test(file)) {
    for (const m of text.matchAll(/^\s*(?:from|import)\s+([\w.]+)/gm)) {
      for (const part of m[1].split('.')) for (const c of byBase.get(`${part}.py`) ?? []) keep(c, `${reason} (python import)`);
    }
  }
}

const readText = (p: string): string | null => {
  if (!TEXT_EXT.test(p)) return null;
  try {
    const buf = readFileSync(join(root, p));
    return buf.length > MAX_SCAN_BYTES ? null : buf.toString('utf8');
  } catch {
    return null;
  }
};

for (const r of roots) {
  const text = readText(r);
  if (text !== null) scan(r, text);
}
do {
  while (queue.length) {
    const c = queue.shift()!;
    const text = readText(c);
    if (text !== null) scan(c, text);
  }
} while (keepByFragment());

const deleted = candidates.filter((c) => !kept.has(c));
const bucket = (p: string): string => {
  const parts = ws(p).split('/');
  return parts.length > 3 ? parts.slice(0, 3).join('/') : `${parts.slice(0, 2).join('/')} (top-level)`;
};
const tally = (list: string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const p of list) m.set(bucket(p), (m.get(bucket(p)) ?? 0) + 1);
  return m;
};

const bm = opt('--broad-mentions');
if (bm) writeFileSync(bm, `${[...new Set(broadDirMentions)].sort().join('\n')}\n`);
const dl = opt('--delete-list');
if (dl) writeFileSync(dl, `${deleted.map(ws).sort().join('\n')}\n`);
const kl = opt('--kept-list');
if (kl) writeFileSync(kl, `${[...kept].map(([c, r]) => `${ws(c)}\t${r}`).sort().join('\n')}\n`);
const ex = opt('--explain');
if (ex) for (const [c, r] of kept) if (c.includes(ex)) console.log(`${ws(c)}\t${r}`);

const total = tally(candidates);
const keptT = tally([...kept.keys()]);
const delT = tally(deleted);
console.log(`candidates ${candidates.length}, kept ${kept.size}, deleted ${deleted.length}`);
if (args.includes('--counts') || !ex) {
  for (const k of [...total.keys()].sort()) console.log(`${k.padEnd(48)} total ${String(total.get(k)).padStart(6)}  kept ${String(keptT.get(k) ?? 0).padStart(6)}  deleted ${String(delT.get(k) ?? 0).padStart(6)}`);
  if (dirOnlyMentions.length) {
    console.log(`\nwhole-dir mentions outside candidates (review): ${dirOnlyMentions.length}`);
    for (const d of dirOnlyMentions.slice(0, 40)) console.log(`  ${d}`);
  }
}
