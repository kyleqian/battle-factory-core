// Minimal indexed (palette / colorType 3) PNG decoder that preserves the raw
// per-pixel palette index (pngjs always expands indexed PNGs to RGBA, which
// loses that index when the palette has duplicate colors - several of the
// reference/pokeemerald art files do, e.g. multiple black entries). We only
// need to handle what reference/pokeemerald's exporter actually produces:
// non-interlaced, colorType 3, bit depth 4 or 8, no filtering surprises.

import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { gbaRoundTrip } from "./gbaColor.ts";

export interface IndexedImage {
  width: number;
  height: number;
  bitDepth: number;
  /** Palette entries as oracle-matching RGB (already round-tripped through the 5-bit GBA color). */
  palette: Array<{ r: number; g: number; b: number }>;
  /** Row-major palette index per pixel, one byte per pixel regardless of source bit depth. */
  indices: Uint8Array;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buf: Buffer): Map<string, Buffer[]> {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG file");
  const chunks = new Map<string, Buffer[]>();
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (!chunks.has(type)) chunks.set(type, []);
    chunks.get(type)!.push(data);
    offset += 12 + length;
  }
  return chunks;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw: Buffer, width: number, height: number, bitDepth: number): Uint8Array {
  const bpp = 1; // colorType 3 is always 1 sample/pixel, sub-byte depths pack multiple pixels per sample byte
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  const out = new Uint8Array(rowBytes * height);
  let srcOffset = 0;
  let prevRow = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[srcOffset];
    srcOffset += 1;
    const row = new Uint8Array(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const rawByte = raw[srcOffset + x]!;
      const a = x >= bpp ? row[x - bpp]! : 0;
      const b = prevRow[x]!;
      const c = x >= bpp ? prevRow[x - bpp]! : 0;
      let value: number;
      switch (filterType) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + a;
          break;
        case 2:
          value = rawByte + b;
          break;
        case 3:
          value = rawByte + Math.floor((a + b) / 2);
          break;
        case 4:
          value = rawByte + paeth(a, b, c);
          break;
        default:
          throw new Error(`unsupported PNG filter type ${filterType}`);
      }
      row[x] = value & 0xff;
    }
    out.set(row, y * rowBytes);
    srcOffset += rowBytes;
    prevRow = row;
  }
  return out;
}

function unpackIndices(unfiltered: Uint8Array, width: number, height: number, bitDepth: number): Uint8Array {
  const indices = new Uint8Array(width * height);
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value: number;
      if (bitDepth === 8) {
        value = unfiltered[y * rowBytes + x]!;
      } else if (bitDepth === 4) {
        const byte = unfiltered[y * rowBytes + (x >> 1)]!;
        value = x % 2 === 0 ? byte >> 4 : byte & 0xf;
      } else if (bitDepth === 1 || bitDepth === 2) {
        const perByte = 8 / bitDepth;
        const byte = unfiltered[y * rowBytes + Math.floor(x / perByte)]!;
        const shift = 8 - bitDepth * ((x % perByte) + 1);
        value = (byte >> shift) & ((1 << bitDepth) - 1);
      } else {
        throw new Error(`unsupported indexed PNG bit depth ${bitDepth}`);
      }
      indices[y * width + x] = value;
    }
  }
  return indices;
}

export function decodeIndexedPng(path: string): IndexedImage {
  const buf = readFileSync(path);
  const chunks = readChunks(buf);
  const ihdr = chunks.get("IHDR")?.[0];
  if (!ihdr) throw new Error(`${path}: missing IHDR`);
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);
  const interlace = ihdr.readUInt8(12);
  if (colorType !== 3) throw new Error(`${path}: expected indexed (colorType 3), got ${colorType}`);
  if (interlace !== 0) throw new Error(`${path}: interlaced PNGs unsupported`);

  const plte = chunks.get("PLTE")?.[0];
  if (!plte) throw new Error(`${path}: missing PLTE`);
  const trns = chunks.get("tRNS")?.[0];
  const palette: Array<{ r: number; g: number; b: number }> = [];
  for (let i = 0; i < plte.length / 3; i += 1) {
    const r = plte[i * 3]!;
    const g = plte[i * 3 + 1]!;
    const b = plte[i * 3 + 2]!;
    const alpha = trns && i < trns.length ? trns[i]! : 255;
    palette.push({ r: alpha === 0 ? 0 : gbaRoundTrip(r), g: alpha === 0 ? 0 : gbaRoundTrip(g), b: alpha === 0 ? 0 : gbaRoundTrip(b) });
  }

  const idatChunks = chunks.get("IDAT") ?? [];
  const compressed = Buffer.concat(idatChunks);
  const raw = inflateSync(compressed);
  const unfiltered = unfilter(raw, width, height, bitDepth);
  const indices = unpackIndices(unfiltered, width, height, bitDepth);

  return { width, height, bitDepth, palette, indices };
}
