#!/usr/bin/env python3
"""prep37: write PNGs (scratch only) for selected frames of a prep37Probe rgb dir. usage: prep37Png.py <rgb-dir> <out-dir> <frame>..."""
import sys, zlib, struct
from pathlib import Path
src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
def png(rgb: bytes, w=240, h=160) -> bytes:
    raw = b"".join(b"\x00" + rgb[y * w * 3:(y + 1) * w * 3] for y in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)  # noqa: E731
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
for f in sys.argv[3:]:
    (out / f"{int(f):05d}.png").write_bytes(png(zlib.decompress((src / f"{int(f):05d}.rgb.z").read_bytes())))
