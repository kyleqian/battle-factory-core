#!/usr/bin/env python3
"""Regression test for lifecycle-independent oracle startup."""

from __future__ import annotations

import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parent.parent
STARTER = ROOT / "tools" / "start-oracle-service.py"


class StartOracleServiceTests(unittest.TestCase):
    def test_service_survives_starter_exit_in_its_own_process_group(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            harness = temp / "harness"
            harness.mkdir()
            marker = temp / "pid"
            log = temp / "oracle.log"
            launcher = harness / "run-oracle.sh"
            launcher.write_text(
                "#!/bin/sh\n"
                'echo "$$" > "$ORACLE_TEST_MARKER"\n'
                "exec sleep 30\n"
            )
            launcher.chmod(0o755)

            result = subprocess.run(
                [
                    sys.executable,
                    str(STARTER),
                    str(harness),
                    "battle-scene-off",
                    "8123",
                    str(log),
                ],
                capture_output=True,
                check=False,
                env={**os.environ, "ORACLE_TEST_MARKER": str(marker)},
                text=True,
                timeout=5,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            pid = int(result.stdout.strip())

            deadline = time.monotonic() + 2
            while not marker.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(marker.exists())
            self.assertEqual(int(marker.read_text()), pid)
            os.kill(pid, 0)

            os.killpg(pid, signal.SIGTERM)
            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.01)
            else:
                self.fail("detached test service did not terminate")

    def test_missing_harness_launcher_fails_cleanly(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            result = subprocess.run(
                [
                    sys.executable,
                    str(STARTER),
                    temp_dir,
                    "battle-scene-on",
                    "8012",
                    str(Path(temp_dir) / "oracle.log"),
                ],
                capture_output=True,
                check=False,
                text=True,
                timeout=5,
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("oracle launcher not found", result.stderr)


if __name__ == "__main__":
    unittest.main()
