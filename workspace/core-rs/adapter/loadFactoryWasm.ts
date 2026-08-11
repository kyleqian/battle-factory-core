// Hand-written Node ESM loader for the factory-wasm ABI v1 boundary
// (see ../README.md "Boundary (ABI v1)" and ../RUST_PROGRESS.md R2).
// No dependencies. Node-only for now (fs.readFileSync + WebAssembly.instantiate);
// the browser/Vite path will be added at the seam later without changing
// this module's exported API (loadFactoryWasm / assertAbiVersion stay the
// same shape, only the byte-loading step differs).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The fw_ ABI v1 export surface, plus the instance's linear memory. */
export interface FactoryWasmExports {
  fw_abi_version(): number;
  fw_rng_advance(rng_value: number): number;
  fw_rng_output(rng_value: number): number;
  fw_alloc(len: number): number;
  fw_free(ptr: number, len: number): void;
  /**
   * Runs the initial-rental generator and returns an `fw_alloc`'d buffer
   * pointer; see the doc comment over the Rust export
   * (`crates/factory-wasm/src/lib.rs`) for the exact layout, and
   * `adapter/factoryEngine.ts` for the decoder. `has_construction_rng` is a
   * 0/1 flag gating `construction_rng_value` (no native `Option` on the
   * WASM ABI).
   */
  fw_generate_initial_rentals(
    rng_value: number,
    factory_win_streak: number,
    rents_count: number,
    player_trainer_id: number,
    has_construction_rng: number,
    construction_rng_value: number,
  ): number;
  memory: WebAssembly.Memory;
}

function defaultArtifactPath(): string {
  // adapter/loadFactoryWasm.ts -> core-rs/ -> <workspace-root>/artifacts/wasm/...
  return fileURLToPath(new URL('../../artifacts/wasm/factory_wasm.wasm', import.meta.url));
}

/**
 * Loads the factory-wasm artifact and returns its typed export surface.
 *
 * Path resolution, highest precedence first: the `artifactPath` argument,
 * then the `POKEBENCH_WASM_ARTIFACT` env var, then the default path
 * (`<workspace-root>/artifacts/wasm/factory_wasm.wasm`, resolved relative
 * to this module).
 */
export async function loadFactoryWasm(artifactPath?: string): Promise<FactoryWasmExports> {
  const path = artifactPath ?? process.env.POKEBENCH_WASM_ARTIFACT ?? defaultArtifactPath();

  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (err) {
    throw new Error(
      `factory-wasm artifact not found at ${path}. Build it with: core-rs/build-wasm.sh`,
      { cause: err },
    );
  }

  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports as unknown as FactoryWasmExports;
}

/** Throws if `exports.fw_abi_version()` does not equal `expected` (default 1). */
export function assertAbiVersion(exports: FactoryWasmExports, expected = 1): void {
  const actual = exports.fw_abi_version();
  if (actual !== expected) {
    throw new Error(`factory-wasm ABI version mismatch: expected ${expected}, got ${actual}`);
  }
}
