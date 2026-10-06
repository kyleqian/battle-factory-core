#!/usr/bin/env bash
# Build and serve this checkout with a verifiable revision manifest.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
npm run build
node --input-type=module <<'JS'
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const inventory = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const dirty = git("status", "--porcelain") ? "+dirty" : "";
writeFileSync("dist/build.json", JSON.stringify({
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  commit: git("rev-parse", "HEAD"),
  build: `${git("rev-parse", "--short", "HEAD")}${dirty} ${git("show", "-s", "--format=%cs", "HEAD")}`,
  adapters: inventory.implementedCount,
  // Separate D3 bucket (docs/presentation-rng.md): never added to the scoped-exact `adapters`.
  faithfulRandomAdapters: inventory.faithfulRandomCount ?? 0,
  factoryAccepted: inventory.currentAcceptedFactoryMoves,
}, null, 2) + "\n");
JS
exec npm run preview -- --host 127.0.0.1 --port "${PORT:-5191}" --strictPort
