#!/usr/bin/env python3
"""ppm pairs from bso225Compare.ts --dump -> one PNG strip (ours | ROM per frame, mon region only).
usage: bso225Strip.py <out.png> <dump.t121.ppm> [<dump.t141.ppm> ...]"""
import sys, zlib, struct
X0, Y0, X1, Y1 = 0, 50, 125, 150
def half(px, W, off):
    return [bytes(px[((y * W) + off + x) * 3:((y * W) + off + x) * 3 + 3]) for y in range(Y0, Y1) for x in range(X0, X1)]
rows = [bytearray() for _ in range(Y1 - Y0)]
for path in sys.argv[2:]:
    b = open(path, "rb").read(); px = b[b.index(b"255\n") + 4:]
    for off in (0, 240):
        for y in range(Y1 - Y0):
            for x in range(X1 - X0):
                i = ((Y0 + y) * 480 + off + X0 + x) * 3
                rows[y] += px[i:i + 3]
            rows[y] += b"\x00\x00\x00\x00\x00\x00" if off == 240 else b"\xff\x00\xff\xff\x00\xff"
w = (X1 - X0 + 2) * 2 * (len(sys.argv) - 2)
def ch(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
raw = b"".join(b"\0" + bytes(r) for r in rows)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, Y1 - Y0, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b""))
