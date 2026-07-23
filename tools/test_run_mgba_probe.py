#!/usr/bin/env python3
"""Regression tests for the guarded mGBA probe runner."""

from __future__ import annotations

import json
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
WRAPPER = ROOT / "tools" / "run-mgba-probe.py"


class RunMgbaProbeTests(unittest.TestCase):
    def run_wrapper(
        self, output: Path, code: str, *extra: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(WRAPPER),
                str(output),
                "--",
                sys.executable,
                "-c",
                code,
                str(output),
                *extra,
            ],
            capture_output=True,
            check=False,
            text=True,
            timeout=5,
        )

    def test_accepts_normal_exit_with_fresh_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import json, pathlib, sys; "
                "pathlib.Path(sys.argv[1]).write_text(json.dumps({'ok': True}))",
            )

            self.assertEqual(result.returncode, 0)
            self.assertEqual(json.loads(output.read_text()), {"ok": True})
            self.assertTrue(Path(f"{output}.log").exists())

    def test_accepts_sigsegv_only_after_fresh_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import json, os, pathlib, signal, sys; "
                "pathlib.Path(sys.argv[1]).write_text(json.dumps({'flushed': True})); "
                "os.kill(os.getpid(), signal.SIGSEGV)",
            )

            self.assertEqual(result.returncode, 0)
            self.assertIn("known teardown SIGSEGV", result.stdout)
            self.assertEqual(json.loads(output.read_text()), {"flushed": True})

    def test_rejects_sigsegv_without_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import os, signal; os.kill(os.getpid(), signal.SIGSEGV)",
            )

            self.assertEqual(result.returncode, 128 + signal.SIGSEGV)
            self.assertFalse(output.exists())

    def test_refuses_stale_output_without_running_command(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            marker = Path(temp_dir) / "ran"
            output.write_text('{"stale":true}')
            result = self.run_wrapper(
                output,
                "import pathlib, sys; pathlib.Path(sys.argv[2]).write_text('ran')",
                str(marker),
            )

            self.assertEqual(result.returncode, 2)
            self.assertFalse(marker.exists())


if __name__ == "__main__":
    unittest.main()
