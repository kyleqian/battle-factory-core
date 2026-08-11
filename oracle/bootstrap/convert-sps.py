#!/usr/bin/env python3
"""Convert a SharkPortSave (.sps) export into a raw GBA battery save (.sav).

This is how bootstrap/factory.sav was produced (2026-07-16) from
'pokemon-ruby-sapphire-emerald-version.34461.sps' (GameFAQs save id 34461).
Format: 'SharkPortSave' magic, platform u32, three length-prefixed strings
(title, date, notes), u32 payload length, payload = 0x1C-byte internal
ROM name + raw save data, trailing u32 CRC.

Usage: python3 convert-sps.py input.sps output.sav
"""

from __future__ import annotations

import struct
import sys


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    data = open(sys.argv[1], "rb").read()
    offset = 0

    def u32() -> int:
        nonlocal offset
        value = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        return value

    def lstring() -> str:
        nonlocal offset
        length = u32()
        value = data[offset:offset + length].decode(errors="replace")
        offset += length
        return value

    magic = lstring()
    if magic != "SharkPortSave":
        raise SystemExit(f"not a SharkPortSave file (magic={magic!r})")
    u32()  # platform
    title, date, notes = lstring(), lstring(), lstring()
    payload_length = u32()
    payload = data[offset:offset + payload_length]
    internal, save = payload[:0x1C], payload[0x1C:]
    print(f"title={title!r} date={date!r} notes={notes!r}")
    print(f"internal={internal.rstrip(b'\\x00')!r} save_bytes={len(save):#x}")
    if len(save) not in (0x8000, 0x10000, 0x20000):
        raise SystemExit(f"unexpected save size {len(save):#x}")
    open(sys.argv[2], "wb").write(save)
    print(f"wrote {sys.argv[2]}")


if __name__ == "__main__":
    main()
