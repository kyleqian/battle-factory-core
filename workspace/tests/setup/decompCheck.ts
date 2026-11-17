// Says up front why a fresh clone fails so many tests. About 500 test files compare the engine with the
// pret/pokeemerald decompilation, read from `reference/pokeemerald` (ignored by git; on the Mac and the box it is a
// symlink into ../vendor). About 190 of them also need it built (pokeemerald.elf / .gba / .map and the converted
// pictures and sounds). Without it those files fail with "no such file" errors. This check only prints; it never
// fails or skips anything, so runs that have the built decompilation are unchanged.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DECOMP = fileURLToPath(new URL("../../reference/pokeemerald/", import.meta.url));

function notice(lines: string[]): void {
  process.stderr.write(["", ...lines.map((line) => `  ${line}`), "", ""].join("\n"));
}

export function setup(): void {
  if (!existsSync(`${DECOMP}src/battle_main.c`)) {
    notice([
      "reference/pokeemerald is missing.",
      "About 500 test files compare the engine with the pret/pokeemerald decompilation, built into a ROM,",
      'and will fail with "no such file" errors. To set it up, see oracle/SETUP.md at the repo root.',
    ]);
  } else if (!existsSync(`${DECOMP}pokeemerald.elf`)) {
    notice([
      "reference/pokeemerald is not built (no pokeemerald.elf).",
      "About 190 test files read the built ROM and will fail. To build it, see oracle/SETUP.md at the repo root.",
    ]);
  }
}
