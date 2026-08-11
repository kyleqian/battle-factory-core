#!/usr/bin/env python3
"""Regression tests for RAM-probe address paths and bitfield extraction."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest


PROBE_DIR = Path(__file__).resolve().parent / "probe"
sys.path.insert(0, str(PROBE_DIR))

from ram_probe_path import read_path_value  # noqa: E402


class FakeOracle:
    def __init__(self) -> None:
        self.u8 = {203: 2}
        self.u32 = {100: 200}

    def read_u8(self, address: int) -> int:
        return self.u8[address]

    def read_u32(self, address: int) -> int:
        return self.u32[address]


SYMBOLS = {"root": 100, "gSprites": 1000, "oam": 500}
VALUES = {(1182, 2): 0x1234, (502, 2): 0xB123}


def resolve_base(_oracle: FakeOracle, label: str) -> int:
    return SYMBOLS[label]


def read_sized(_oracle: FakeOracle, address: int, size: int) -> int:
    return VALUES[(address, size)]


class RamProbePathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.oracle = FakeOracle()

    def test_preserves_existing_multi_hop_address_reads(self) -> None:
        value = read_path_value(
            self.oracle,
            [
                {"symbol": "root"},
                {"derefU32": True},
                {"add": 3},
                {"derefU8Scaled": 68},
                {"addSymbol": "gSprites"},
                {"add": 46},
            ],
            2,
            resolve_base,
            read_sized,
        )

        self.assertEqual(value, 0x1234)

    def test_extracts_a_terminal_sub_byte_bitfield(self) -> None:
        value = read_path_value(
            self.oracle,
            [
                {"symbol": "oam"},
                {"add": 2},
                {"op": "mask", "shift": 12, "mask": "0xf"},
            ],
            2,
            resolve_base,
            read_sized,
        )

        self.assertEqual(value, 0xB)

    def test_rejects_a_nonterminal_mask(self) -> None:
        with self.assertRaisesRegex(ValueError, "mask must be the final path hop"):
            read_path_value(
                self.oracle,
                [
                    {"symbol": "oam"},
                    {"op": "mask", "shift": 12, "mask": 0xF},
                    {"add": 2},
                ],
                2,
                resolve_base,
                read_sized,
            )


if __name__ == "__main__":
    unittest.main()
