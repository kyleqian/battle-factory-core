#!/usr/bin/env python3
"""Argument-parsing tests for tools/audio/soundEventProbe.py (run: python3 -m unittest tools.test_sound_event_probe_args)."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

PROBE = Path(__file__).resolve().parent / "audio" / "soundEventProbe.py"


def load_probe():
    spec = importlib.util.spec_from_file_location("sound_event_probe", PROBE)
    module = importlib.util.module_from_spec(spec)
    # The probe imports the mgba-backed oracle at module load; the arg helpers need none of it.
    with patch.dict(sys.modules, {"mgba": MagicMock(), "emerald_core": MagicMock(), "battle_lab": MagicMock()}):
        spec.loader.exec_module(module)
    return module


class ExtraHooksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.probe = load_probe()

    def test_flag_and_env_alone(self):
        f = self.probe.extra_hook_names
        self.assertEqual(f([], {}), [])
        self.assertEqual(f(["--extra-hooks", "BlendPalette"], {}), ["BlendPalette"])
        self.assertEqual(f(["--extra-hooks=A,B"], {}), ["A", "B"])
        self.assertEqual(f([], {"AUDIO_PROBE_EXTRA_HOOKS": "BlendPalette"}), ["BlendPalette"])

    def test_flag_and_env_merge_without_duplicates(self):
        f = self.probe.extra_hook_names
        self.assertEqual(
            f(["req.json", "--frames", "9", "--extra-hooks", "B,C"], {"AUDIO_PROBE_EXTRA_HOOKS": "A,B"}),
            ["A", "B", "C"],
        )

    def test_flag_needs_a_value(self):
        with self.assertRaises(SystemExit):
            self.probe.extra_hook_names(["--extra-hooks"], {})


if __name__ == "__main__":
    unittest.main()
