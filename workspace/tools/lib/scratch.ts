// Scratch directories for one-shot dev tools.
//
// The comparators and extractors allocate scratch space with
// `mkdtempSync(join(tmpdir(), "<prefix>-"))` and historically never removed it.
// macOS only sweeps $TMPDIR on reboot, so the debris accumulated indefinitely
// (~97k directories / 262 GB by 2026-08-01). The suite is sandboxed separately
// in `tests/setup/`; this is the equivalent for tools run as their own process.
//
// Cleanup is gated on a successful exit, which is what preserves the existing
// debugging workflow: a comparator that finds a mismatch writes diagnostic PNGs
// and raw framebuffers into its scratch directory, prints the path, and exits
// nonzero — so a failing run keeps everything, and only a clean run (which
// prints no path and leaves nothing anyone reads) is reclaimed.
//
// Call `keepScratchDir(dir)` to opt a directory out unconditionally.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const managed = new Set<string>();
const kept = new Set<string>();
let hookInstalled = false;

function installHook(): void {
  if (hookInstalled) return;
  hookInstalled = true;
  process.on("exit", (code) => {
    if (code !== 0) return;
    for (const directory of managed) {
      if (kept.has(directory)) continue;
      try {
        rmSync(directory, { recursive: true, force: true });
      } catch {
        // Never turn a successful run into a failure over cleanup.
      }
    }
  });
}

/**
 * Create a scratch directory that is removed when this process exits cleanly.
 * Drop-in replacement for `mkdtempSync(join(tmpdir(), prefix))`.
 */
export function createScratchDir(prefix: string): string {
  installHook();
  const directory = mkdtempSync(join(tmpdir(), prefix));
  managed.add(directory);
  return directory;
}

/** Retain a scratch directory past exit — for artifacts a human will open. */
export function keepScratchDir(directory: string): string {
  kept.add(directory);
  return directory;
}
