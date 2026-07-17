// The engine core renders into a plain 240x160 RGBA buffer - no canvas, no
// DOM. Browser shell and tools/compare/appTrace.ts both consume this.

export const SCREEN_WIDTH = 240;
export const SCREEN_HEIGHT = 160;

export function createFramebuffer(): Uint8Array {
  return new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT * 4);
}

export function setPixel(fb: Uint8Array, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  if (x < 0 || y < 0 || x >= SCREEN_WIDTH || y >= SCREEN_HEIGHT) return;
  const offset = (y * SCREEN_WIDTH + x) * 4;
  fb[offset] = r;
  fb[offset + 1] = g;
  fb[offset + 2] = b;
  fb[offset + 3] = a;
}

export function fillFramebuffer(fb: Uint8Array, r: number, g: number, b: number, a = 255): void {
  for (let i = 0; i < fb.length; i += 4) {
    fb[i] = r;
    fb[i + 1] = g;
    fb[i + 2] = b;
    fb[i + 3] = a;
  }
}
