#!/usr/bin/env python3
"""bso226: bso226Run.ts --dump PNGs (ours | ROM, 480x160) -> one PNG strip, battle field only (y < 112), one ours|ROM pair per frame.
usage: bso226Strip.py <out.png> <dump-f1.png> [<dump-f2.png> ...]"""
import sys, zlib, struct
H = 112
def read(path):
    d = open(path, "rb").read(); pos = 8; idat = b""
    while pos < len(d):
        n, = struct.unpack(">I", d[pos:pos + 4]); t = d[pos + 4:pos + 8]; c = d[pos + 8:pos + 8 + n]; pos += 12 + n
        if t == b"IHDR": w, h, _, ct = struct.unpack(">IIBB", c[:10])
        if t == b"IDAT": idat += c
    bpp = 4 if ct == 6 else 3; st = w * bpp; raw = zlib.decompress(idat); prev = bytearray(st); rows = []; i = 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + st]); i += 1 + st
        for x in range(st):
            a = line[x - bpp] if x >= bpp else 0; b = prev[x]; c2 = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c2; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c2)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c2)) & 255
        rows.append(bytes(line)); prev = line
    return w, bpp, rows
out = [bytearray() for _ in range(H)]
for path in sys.argv[2:]:
    w, bpp, rows = read(path)
    for y in range(H):
        for x in range(w):
            out[y] += rows[y][x * bpp:x * bpp + 3]
        out[y] += b"\xff\x00\xff\xff\x00\xff"
W = (480 + 2) * (len(sys.argv) - 2)
def ch(t, d): c = struct.pack(">I", len(d)) + t + d; return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
raw = b"".join(b"\0" + bytes(r) for r in out)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b""))
