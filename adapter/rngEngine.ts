// The engine adapter: a uniform interface over the TS spec engine
// (src/engine/rng.ts + src/engine/opponentGen.ts) and the factory-wasm
// boundary (./loadFactoryWasm.ts), so callers — starting with
// tests/rngEngineParity.test.ts — can run identical logic against either
// without knowing which one they're holding.
//
// Engine selection is opt-in via the POKEBENCH_ENGINE env var (see
// defaultEngineId below): unset/"ts" keeps the TS engine as the default so
// nothing downstream changes behavior until a caller explicitly asks for
// "wasm". This is the M2 opt-in flag required by RUST_SUPERVISOR.md.
//
// Design note: this interface is deliberately scoped to the RNG surface
// only. Factory generation (the M3 milestone) will grow its own methods on
// RngEngine (or a sibling interface) once factory-core has that logic
// ported — kept separable so the RNG contract here doesn't have to change
// shape to accommodate it.

import { fileURLToPath } from "node:url";
import { advanceRngValue as tsAdvanceRngValue } from "../../src/engine/rng.ts";
import { randomU16 as tsRandomU16 } from "../../src/engine/opponentGen.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

export type RngEngineId = "ts" | "wasm";

/**
 * The numeric contract shared by src/engine/rng.ts's advanceRngValue and
 * src/engine/opponentGen.ts's randomU16: u32 values in and out, expressed
 * as JS numbers (0..0xffffffff), normalized with `>>> 0` at both boundaries
 * of an implementation.
 */
export interface RngEngine {
  readonly id: RngEngineId;
  /** One Gen-3 LCG step: next raw gRngValue. */
  advanceRngValue(v: number): number;
  /** One Random() call: advances gRngValue, returns it plus its upper 16 bits. */
  randomU16(v: number): { rngValue: number; value: number };
}

/** Thin wrapper over the TS spec engine — the default, always-available engine. */
export function tsRngEngine(): RngEngine {
  return {
    id: "ts",
    advanceRngValue(v: number): number {
      return tsAdvanceRngValue(v >>> 0) >>> 0;
    },
    randomU16(v: number): { rngValue: number; value: number } {
      const result = tsRandomU16(v >>> 0);
      return { rngValue: result.rngValue >>> 0, value: result.value >>> 0 };
    },
  };
}

/**
 * Wraps the factory-wasm boundary (fw_rng_advance/fw_rng_output) as an
 * RngEngine. Every value crossing the boundary is masked with `>>> 0` on
 * both the way in (JS number -> wasm u32 param) and the way out (wasm i32
 * return -> unsigned JS number), since WASM's numeric ABI has no unsigned
 * integer type and the raw i32 return can read as negative in JS.
 */
export async function wasmRngEngine(): Promise<RngEngine> {
  const exports = await loadFactoryWasm();
  return {
    id: "wasm",
    advanceRngValue(v: number): number {
      return exports.fw_rng_advance(v >>> 0) >>> 0;
    },
    randomU16(v: number): { rngValue: number; value: number } {
      const rngValue = exports.fw_rng_advance(v >>> 0) >>> 0;
      const value = exports.fw_rng_output(rngValue) >>> 0;
      return { rngValue, value };
    },
  };
}

/**
 * Resolves the factory-wasm artifact path with the same precedence
 * loadFactoryWasm.ts uses when called with no explicit argument: the
 * POKEBENCH_WASM_ARTIFACT env var, else the default path resolved relative
 * to this adapter directory (<workspace-root>/artifacts/wasm/factory_wasm.wasm).
 * Exposed so callers (the parity spec's availability probe) can check for
 * the artifact without duplicating loadFactoryWasm.ts's resolution logic.
 */
export function resolveWasmArtifactPath(): string {
  return process.env.POKEBENCH_WASM_ARTIFACT ?? defaultWasmArtifactPath();
}

function defaultWasmArtifactPath(): string {
  return fileURLToPath(new URL("../../artifacts/wasm/factory_wasm.wasm", import.meta.url));
}

/**
 * Reads the POKEBENCH_ENGINE env var to pick the default engine: unset or
 * "ts" selects the TS spec engine (no behavior change for existing
 * callers); "wasm" opts into the factory-wasm engine. Any other value is a
 * misconfiguration and throws rather than silently falling back.
 */
export function defaultEngineId(): RngEngineId {
  const raw = process.env.POKEBENCH_ENGINE;
  if (raw === undefined || raw === "ts") return "ts";
  if (raw === "wasm") return "wasm";
  throw new Error(`unknown POKEBENCH_ENGINE value: ${JSON.stringify(raw)} (expected "ts" or "wasm")`);
}
