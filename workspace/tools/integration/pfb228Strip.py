#!/usr/bin/env python3
"""pfb228: ppm dumps (ours | ROM, 480x160, from bso225Dense.ts --dump) -> one PNG, per frame three panels: ours | ROM | diff (red = differs), 2x zoom of the player half.
usage: pfb228Strip.py <out.png> <dump.eNNN.ppm> [...]   (region x 0..119, y 48..111; magenta separator between frames)"""
import sys, zlib, struct
X0, Y0, X1, Y1, Z = 0, 48, 120, 112, 2
H = (Y1 - Y0) * Z
rows = [bytearray() for _ in range(H)]
for path in sys.argv[2:]:
    b = open(path, "rb").read(); px = b[b.index(b"255\n") + 4:]
    def at(off, x, y):
        i = (y * 480 + off + x) * 3
        return px[i:i + 3]
    for panel in range(3):
        for y in range(Y0, Y1):
            line = bytearray()
            for x in range(X0, X1):
                o, r = at(0, x, y), at(240, x, y)
                c = o if panel == 0 else r if panel == 1 else (b"\xff\x00\x00" if o != r else b"\x20\x20\x20")
                line += bytes(c) * Z
            for z in range(Z):
                rows[(y - Y0) * Z + z] += line
        for z in range(H):
            rows[z] += b"\xff\x00\xff" * 2 if panel < 2 else b"\xff\xff\x00" * 4
w = (X1 - X0) * Z * 3 * len(sys.argv[2:]) + 2 * 2 * len(sys.argv[2:]) * 2 + 4 * len(sys.argv[2:])
w = len(rows[0]) // 3
def ch(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
raw = b"".join(b"\0" + bytes(r) for r in rows)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, H, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b""))
