// GBA color pipeline shared by every extractor.
//
// Reference art (.pal files, PNG PLTE chunks) stores colors as 8-bit RGB
// approximations of the real 5-bit-per-channel GBA color (produced by the
// build tools' `floor(c5 * 255 / 31)` conversion). The oracle's screenshots
// come from mGBA's actual 15-bit->24-bit expansion, `(c5<<3)|(c5>>2)` per
// channel (verified against all 22 colors of the anchor frame - see
// ROADMAP.md Domain notes). To match the oracle exactly we must round-trip
// every reference color through the true 5-bit value rather than using the
// 8-bit approximation directly.

/** Recover the 5-bit GBA channel value from an 8-bit reference-art value. */
export function to5Bit(v8: number): number {
  return Math.round((v8 * 31) / 255);
}

/** Expand a 5-bit GBA channel value to 8-bit the way mGBA's framebuffer does. */
export function expand5to8(c5: number): number {
  return (c5 << 3) | (c5 >> 2);
}

/** Round-trip an 8-bit reference-art channel value to the oracle-matching 8-bit value. */
export function gbaRoundTrip(v8: number): number {
  return expand5to8(to5Bit(v8));
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function gbaRoundTripColor([r, g, b, a]: readonly [number, number, number, number]): Rgba {
  // Palette index 0 of every GBA palette is transparent regardless of its
  // stored RGB value; callers that care use a=0 to signal that.
  return { r: gbaRoundTrip(r), g: gbaRoundTrip(g), b: gbaRoundTrip(b), a };
}
