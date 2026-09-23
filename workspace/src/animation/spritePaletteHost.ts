/**
 * Presentation-owned palette memory, ported from sprite.c and palette.c.
 * Allocating/freeing a tag never clears color RAM. Keep this state across
 * animation bodies: callers supply source-derived startup/resource loads.
 */
export const SPRITE_PALETTE_TAG_NONE = 0xffff;
export const SPRITE_PALETTE_NOT_FOUND = 0xff;
export const OBJ_PALETTE_OFFSET = 256;
export const COLORS_PER_SPRITE_PALETTE = 16;

export interface SpritePaletteHost {
  readonly reservedCount: number;
  readonly tags: readonly number[];
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
}

function integerIn(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer in ${minimum}..${maximum}`);
  }
}

function retain(
  reservedCount: number, tags: readonly number[],
  unfaded: readonly number[], faded: readonly number[],
): SpritePaletteHost {
  return Object.freeze({
    reservedCount, tags: Object.freeze([...tags]),
    unfaded: Object.freeze([...unfaded]), faded: Object.freeze([...faded]),
  });
}

/** Initial memory belongs to the battle graphics host, never to an oracle row. */
export function createSpritePaletteHost(
  reservedCount: number,
  tags: readonly number[] = Array(16).fill(SPRITE_PALETTE_TAG_NONE),
  unfaded: readonly number[] = Array(512).fill(0),
  faded: readonly number[] = unfaded,
): SpritePaletteHost {
  integerIn(reservedCount, 0, 16, "reservedCount");
  if (tags.length !== 16 || unfaded.length !== 512 || faded.length !== 512) {
    throw new Error("palette host requires 16 tags and two 512-color buffers");
  }
  for (const word of [...tags, ...unfaded, ...faded]) integerIn(word, 0, 0xffff, "palette word");
  return retain(reservedCount, tags, unfaded, faded);
}

/** IndexOfSpritePaletteTag searches only unreserved slots, even for TAG_NONE. */
export function indexOfSpritePaletteTag(host: SpritePaletteHost, tag: number): number {
  integerIn(tag, 0, 0xffff, "tag");
  for (let i = host.reservedCount; i < 16; i++) if (host.tags[i] === tag) return i;
  return SPRITE_PALETTE_NOT_FOUND;
}

/** AllocSpritePalette intentionally does not reuse an already allocated tag. */
export function allocSpritePalette(
  host: SpritePaletteHost, tag: number,
): Readonly<{ host: SpritePaletteHost; index: number }> {
  integerIn(tag, 0, 0xfffe, "allocated tag");
  const index = indexOfSpritePaletteTag(host, SPRITE_PALETTE_TAG_NONE);
  if (index === SPRITE_PALETTE_NOT_FOUND) return Object.freeze({ host, index });
  const tags = [...host.tags];
  tags[index] = tag;
  return Object.freeze({ host: retain(host.reservedCount, tags, host.unfaded, host.faded), index });
}

/** LoadPalette writes both logical buffers; hardware scanout is a separate latch. */
export function loadPalette(
  host: SpritePaletteHost, offset: number, colors: readonly number[],
): SpritePaletteHost {
  integerIn(offset, 0, 512, "offset");
  if (offset + colors.length > 512) throw new Error("palette load exceeds color RAM");
  for (const color of colors) integerIn(color, 0, 0xffff, "color");
  const unfaded = [...host.unfaded], faded = [...host.faded];
  for (let i = 0; i < colors.length; i++) unfaded[offset + i] = faded[offset + i] = colors[i]!;
  return retain(host.reservedCount, host.tags, unfaded, faded);
}

/** Direct gPlttBufferFaded writes retain the original unfaded source colors. */
export function writeFadedPalette(
  host: SpritePaletteHost, offset: number, colors: readonly number[],
): SpritePaletteHost {
  integerIn(offset, 0, 512, "offset");
  if (offset + colors.length > 512) throw new Error("palette write exceeds color RAM");
  for (const color of colors) integerIn(color, 0, 0xffff, "color");
  const faded = [...host.faded];
  for (let i = 0; i < colors.length; i++) faded[offset + i] = colors[i]!;
  return retain(host.reservedCount, host.tags, host.unfaded, faded);
}

/** LoadSpritePalette reuses a live tag without loading its payload a second time. */
export function loadSpritePalette(
  host: SpritePaletteHost, tag: number, colors: readonly number[],
): Readonly<{ host: SpritePaletteHost; index: number }> {
  if (colors.length !== COLORS_PER_SPRITE_PALETTE) throw new Error("sprite palettes contain 16 colors");
  const existing = indexOfSpritePaletteTag(host, tag);
  if (existing !== SPRITE_PALETTE_NOT_FOUND) return Object.freeze({ host, index: existing });
  const allocated = allocSpritePalette(host, tag);
  if (allocated.index === SPRITE_PALETTE_NOT_FOUND) return allocated;
  return Object.freeze({
    index: allocated.index,
    host: loadPalette(allocated.host, OBJ_PALETTE_OFFSET + allocated.index * 16, colors),
  });
}

/** FreeSpritePaletteByTag clears the first matching tag and retains both buffers. */
export function freeSpritePaletteByTag(host: SpritePaletteHost, tag: number): SpritePaletteHost {
  const index = indexOfSpritePaletteTag(host, tag);
  if (index === SPRITE_PALETTE_NOT_FOUND) return host;
  const tags = [...host.tags];
  tags[index] = SPRITE_PALETTE_TAG_NONE;
  return retain(host.reservedCount, tags, host.unfaded, host.faded);
}

/** FreeAllSpritePalettes resets tag ownership/reservation, not stale palette RAM. */
export function freeAllSpritePalettes(host: SpritePaletteHost): SpritePaletteHost {
  return retain(0, Array(16).fill(SPRITE_PALETTE_TAG_NONE), host.unfaded, host.faded);
}

/** CpuCopy32 used by Shadow Punch copies unfaded colors into only the faded row. */
export function copyUnfadedToFaded(
  host: SpritePaletteHost, source: number, destination: number, count: number,
): SpritePaletteHost {
  integerIn(source, 0, 512, "source");
  integerIn(destination, 0, 512, "destination");
  integerIn(count, 0, 512, "count");
  if (source + count > 512 || destination + count > 512) throw new Error("palette copy exceeds color RAM");
  const faded = [...host.faded];
  for (let i = 0; i < count; i++) faded[destination + i] = host.unfaded[source + i]!;
  return retain(host.reservedCount, host.tags, host.unfaded, faded);
}

/** BlendPalette reads destination unfaded RAM, regardless of a preceding faded copy. */
export function blendPalette(
  host: SpritePaletteHost, offset: number, count: number, coefficient: number, target: number,
): SpritePaletteHost {
  integerIn(offset, 0, 512, "offset");
  integerIn(count, 0, 512, "count");
  integerIn(coefficient, 0, 16, "coefficient");
  integerIn(target, 0, 0xffff, "target");
  if (offset + count > 512) throw new Error("palette blend exceeds color RAM");
  const faded = [...host.faded];
  for (let i = offset; i < offset + count; i++) {
    const color = host.unfaded[i]!;
    let blended = 0;
    for (const shift of [0, 5, 10]) {
      const from = (color >> shift) & 31, to = (target >> shift) & 31;
      blended |= (from + (((to - from) * coefficient) >> 4)) << shift;
    }
    faded[i] = blended;
  }
  return retain(host.reservedCount, host.tags, host.unfaded, faded);
}
