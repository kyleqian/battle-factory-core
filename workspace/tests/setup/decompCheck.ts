// Says up front why a fresh clone fails so many tests. About 500 test files compare the engine with the
// pret/pokeemerald decompilation's own source, read from `reference/pokeemerald` (ignored by git; on the Mac and
// the box it is a symlink into ../vendor). Without it those files fail with "no such file" errors. This check only
// prints; it never fails or skips anything, so runs that have the decompilation are unchanged.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DECOMP = fileURLToPath(new URL("../../reference/pokeemerald/", import.meta.url));
const PINNED = "83df84e40623b79281f2397faa611cbf044170bd";

export function setup(): void {
  if (existsSync(`${DECOMP}src/battle_main.c`)) return;
  process.stderr.write(
    [
      "",
      "  reference/pokeemerald is missing.",
      "  About 500 test files compare the engine with the pret/pokeemerald decompilation and will fail",
      '  with "no such file" errors. To fix, run in workspace/:',
      "",
      "    git clone https://github.com/pret/pokeemerald reference/pokeemerald",
      `    git -C reference/pokeemerald checkout ${PINNED.slice(0, 9)}`,
      "",
      "",
    ].join("\n"),
  );
}
