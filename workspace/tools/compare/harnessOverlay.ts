// Planning helpers for `compare:differential --harness-from-head`: which of
// this tree's tools/ files must be copied into the base checkout so the base
// ENGINE (src/) renders a trace with the HEAD harness. Paths are
// workspace-relative with forward slashes (e.g. "tools/compare/appTrace.ts").
// Nothing here ever selects a file under src/.

import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

export type ImportGraph = ReadonlyMap<string, readonly string[]>;

export interface HarnessOverlayPlan {
  /** tools/ files to copy into the base tree, sorted. Never contains src/. */
  readonly files: readonly string[];
  /** src/ modules the overlaid files import; the base supplies these. */
  readonly engineImports: readonly string[];
}

/** Relative module specifiers imported by a TypeScript source (comments ignored). */
export function scanRelativeImports(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const specifiers = new Set<string>();
  const patterns = [
    /\b(?:import|export)\b[^'";]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[1]!;
      if (specifier.startsWith(".")) specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

/** Resolve a relative specifier against the importing file; throws if it leaves the workspace. */
export function resolveWorkspaceImport(fromFile: string, specifier: string): string {
  const resolved = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  if (resolved === ".." || resolved.startsWith("../") || posix.isAbsolute(resolved)) {
    throw new Error(`${fromFile} imports ${specifier}, which leaves the workspace`);
  }
  return resolved;
}

function isSrcPath(path: string): boolean {
  return path === "src" || path.startsWith("src/");
}

function isToolsPath(path: string): boolean {
  return path.startsWith("tools/");
}

/**
 * Walk the import graph from `entry`, collecting the tools/ closure. src/
 * imports end the walk (the base provides them) and are reported separately.
 * An entry under src/, or an import that is neither tools/ nor src/ (tests/,
 * package.json, ...), is rejected rather than silently copied or dropped.
 */
export function planHarnessOverlay(entry: string, graph: ImportGraph): HarnessOverlayPlan {
  if (isSrcPath(entry)) throw new Error(`refusing to overlay engine file ${entry}: src/ is never copied`);
  if (!isToolsPath(entry)) throw new Error(`harness entry ${entry} is not under tools/`);

  const files = new Set<string>();
  const engineImports = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (files.has(file)) continue;
    const imports = graph.get(file);
    if (!imports) throw new Error(`import graph has no entry for ${file}`);
    files.add(file);
    for (const imported of imports) {
      if (isSrcPath(imported)) {
        engineImports.add(imported);
      } else if (isToolsPath(imported)) {
        queue.push(imported);
      } else {
        throw new Error(
          `${file} imports ${imported}, which is neither tools/ nor src/; ` +
          "the harness overlay cannot place it",
        );
      }
    }
  }
  return { files: [...files].sort(), engineImports: [...engineImports].sort() };
}

/** Read the tools/ import graph reachable from `entry` out of `root` (src/ files are not read). */
export function loadToolsImportGraph(entry: string, root: string): ImportGraph {
  const graph = new Map<string, readonly string[]>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (graph.has(file) || !isToolsPath(file)) continue;
    const absolute = join(root, file);
    if (!existsSync(absolute)) throw new Error(`harness file ${file} does not exist in ${root}`);
    const imports = /\.(?:ts|mts|tsx)$/.test(file)
      ? scanRelativeImports(readFileSync(absolute, "utf8")).map((specifier) =>
          resolveWorkspaceImport(file, specifier))
      : [];
    graph.set(file, imports);
    queue.push(...imports);
  }
  return graph;
}

export interface HarnessImportFailure {
  readonly kind: "missing-export" | "missing-module";
  readonly detail: string;
}

/** Recognise a Node ESM link failure in stderr so the caller can name the missing piece. */
export function parseHarnessImportFailure(stderr: string): HarnessImportFailure | undefined {
  const missingExport =
    /The requested module '([^']+)' does not provide an export named '([^']+)'/.exec(stderr);
  if (missingExport) {
    return {
      kind: "missing-export",
      detail: `module ${missingExport[1]} has no export '${missingExport[2]}'`,
    };
  }
  const missingModule = /Cannot find module '([^']+)' imported from (\S+)/.exec(stderr);
  if (missingModule) {
    return {
      kind: "missing-module",
      detail: `module ${missingModule[1]} (imported from ${missingModule[2]}) does not exist`,
    };
  }
  return undefined;
}
