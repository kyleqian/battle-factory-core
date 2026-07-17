// Gen-3 LCG, matching reference/pokeemerald/src/random.c exactly:
//   gRngValue = ISO_RANDOMIZE1(gRngValue) = 1103515245 * gRngValue + 24691 (mod 2^32)
//   Random() returns the upper 16 bits of the new gRngValue.
// Per main.c:366, Random() advances once per VBlank EXCEPT during frontier/
// link/recorded battles, which consume RNG only on demand (see ROADMAP.md
// Domain notes). The draft screen (in scope here) always advances once/frame.

const MULTIPLIER = 1103515245n;
const INCREMENT = 24691n;
const MASK32 = 0xffffffffn;

/** One step of the LCG: returns the next raw 32-bit gRngValue. */
export function advanceRngValue(rngValue: number): number {
  // 32x32 -> 32 multiply overflows float64's 53-bit exact-integer range, so
  // do the modular arithmetic in BigInt and convert back at the end.
  const next = (MULTIPLIER * BigInt(rngValue >>> 0) + INCREMENT) & MASK32;
  return Number(next);
}

/** The gen-3 RNG stream: wraps a mutable gRngValue and yields Random()'s u16 outputs. */
export class GbaRng {
  private value: number;

  constructor(seed: number) {
    this.value = seed >>> 0;
  }

  /** Current raw gRngValue (what the RAM-inspection recipe reads as `gRngValue`). */
  get rngValue(): number {
    return this.value;
  }

  set rngValue(v: number) {
    this.value = v >>> 0;
  }

  /** Advances the LCG once and returns the new value's upper 16 bits, like Random(). */
  next(): number {
    this.value = advanceRngValue(this.value);
    return (this.value >>> 16) & 0xffff;
  }
}

export const RNG_MULTIPLIER = Number(MULTIPLIER);
export const RNG_INCREMENT = Number(INCREMENT);
export const RNG_MASK32 = Number(MASK32);

/** RAM-verified gRngValue at the anchor draft screen's frame 0 (ROADMAP.md Domain notes). */
export const ANCHOR_RNG_VALUE = 0xd2ddeec8;
