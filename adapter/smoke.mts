#!/usr/bin/env -S node --experimental-strip-types
// Smoke test for the factory-wasm ABI v1 boundary. Run with:
//   node --experimental-strip-types core-rs/adapter/smoke.mts
// (from the workspace root, or `cd core-rs/adapter` and drop the prefix —
// path resolution in loadFactoryWasm.ts doesn't depend on cwd).

import { loadFactoryWasm, assertAbiVersion } from './loadFactoryWasm.ts';

function u32(n: number): number {
  return n >>> 0;
}

function toHex(n: number): string {
  return `0x${u32(n).toString(16).padStart(8, '0')}`;
}

// Expected RNG values below are TS-generated (node --experimental-strip-types
// over src/engine/rng.ts, 2026-08-11), never hand-computed — the same pinned
// constants asserted by core-rs/crates/factory-core/src/rng.rs's tests.
const RNG_CASES = [
  {
    label: 'zero seed',
    seed: 0x00000000,
    expectedOutputs: [0x0000, 0xe97e, 0x5271, 0x31b0, 0x8e42, 0xe2cc, 0xafc5, 0x67db],
    expectedFinal: 0x67dbb608,
  },
  {
    label: 'anchor seed (ANCHOR_RNG_VALUE)',
    seed: 0xd2ddeec8,
    expectedOutputs: [0xddef, 0x92b9, 0xfc5d, 0xd492, 0xfc14, 0x74af, 0x49ee, 0xc41f],
    expectedFinal: 0xc41fb5d0,
  },
];

async function main(): Promise<void> {
  const exports = await loadFactoryWasm();

  assertAbiVersion(exports);
  console.log('OK fw_abi_version === 1');

  for (const { label, seed, expectedOutputs, expectedFinal } of RNG_CASES) {
    let value = u32(seed);
    const outputs: number[] = [];
    for (let i = 0; i < 8; i++) {
      value = u32(exports.fw_rng_advance(value));
      outputs.push(u32(exports.fw_rng_output(value)));
    }
    for (let i = 0; i < 8; i++) {
      if (outputs[i] !== expectedOutputs[i]) {
        throw new Error(
          `${label}: output[${i}] = ${toHex(outputs[i])}, expected ${toHex(expectedOutputs[i])}`,
        );
      }
    }
    if (value !== u32(expectedFinal)) {
      throw new Error(`${label}: final rng_value = ${toHex(value)}, expected ${toHex(expectedFinal)}`);
    }
    console.log(`OK fw_rng_advance/fw_rng_output stream matches TS pin (${label})`);
  }

  const len = 16;
  const ptr = exports.fw_alloc(len);
  if (ptr === 0) {
    throw new Error('fw_alloc(16) returned a null pointer');
  }
  const pattern = Uint8Array.from({ length: len }, (_, i) => (i * 7 + 1) & 0xff);
  new Uint8Array(exports.memory.buffer, ptr, len).set(pattern);
  const readBack = new Uint8Array(exports.memory.buffer, ptr, len);
  for (let i = 0; i < len; i++) {
    if (readBack[i] !== pattern[i]) {
      throw new Error(`alloc/free roundtrip: byte ${i} = ${readBack[i]}, expected ${pattern[i]}`);
    }
  }
  exports.fw_free(ptr, len);
  console.log('OK fw_alloc/write/read/fw_free roundtrip');

  console.log('ALL SMOKE CHECKS PASSED');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
