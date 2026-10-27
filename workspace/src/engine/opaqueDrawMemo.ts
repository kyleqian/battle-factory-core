// perf211: memoize a framebuffer paint that is a pure function of a key.
//
// Contract for `paint`: it only writes 240x160 RGBA pixels with alpha 255 (setPixel-style, clipped to the screen),
// never reads the framebuffer, and its writes depend on nothing but `key`. Then its effect on any framebuffer is
// "copy these opaque pixels", which is recorded once by painting into a zeroed scratch buffer (written pixels are
// exactly those whose alpha became 255) and replayed as row runs. Keys drawn once are painted directly.

type Recorded = { rgba: Uint8Array; runs: Int32Array };

export class OpaqueDrawMemo {
  private readonly entries = new Map<string, Recorded | null>();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  draw(fb: Uint8Array, key: string, paint: (target: Uint8Array) => void): void {
    if (fb.length !== 240 * 160 * 4) {
      paint(fb);
      return;
    }
    const cached = this.entries.get(key);
    if (cached === undefined) {
      this.remember(key, null);
      paint(fb);
      return;
    }
    const recorded = cached ?? record(paint);
    this.remember(key, recorded);
    const { rgba, runs } = recorded;
    for (let index = 0; index < runs.length; index += 2) {
      const start = runs[index]!;
      const end = runs[index + 1]!;
      if (end - start >= 64) {
        fb.set(rgba.subarray(start, end), start);
      } else {
        for (let o = start; o < end; o += 1) fb[o] = rgba[o]!;
      }
    }
  }

  private remember(key: string, value: Recorded | null): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
  }
}

function record(paint: (target: Uint8Array) => void): Recorded {
  const rgba = new Uint8Array(240 * 160 * 4);
  paint(rgba);
  const runs: number[] = [];
  let start = -1;
  for (let p = 0; p <= 240 * 160; p += 1) {
    // Runs may cross row ends: the buffer is contiguous, so a copy across rows is the same bytes.
    if (p < 240 * 160 && rgba[p * 4 + 3] === 255) {
      if (start < 0) start = p;
    } else if (start >= 0) {
      runs.push(start * 4, p * 4);
      start = -1;
    }
  }
  return { rgba, runs: Int32Array.from(runs) };
}
