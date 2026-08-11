#!/usr/bin/env python3
"""Regression tests for the headless Codex worker deadline wrapper."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest


ROOT = Path(__file__).resolve().parent.parent
WRAPPER = ROOT / "tools" / "run-codex-worker-with-deadline.py"
FAST_GRACE_ENV = {
    **os.environ,
    "CODEX_WORKER_TERM_GRACE_SECONDS": "0.2",
}


class RunCodexWorkerWithDeadlineTests(unittest.TestCase):
    def test_preserves_stdout_stderr_and_child_status(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(WRAPPER),
                "2",
                "deadline reached",
                "--",
                sys.executable,
                "-c",
                (
                    "import os; "
                    "os.write(1, b'{\"type\":\"turn.completed\"}\\n'); "
                    "os.write(2, b'codex diagnostic\\n'); "
                    "raise SystemExit(7)"
                ),
            ],
            capture_output=True,
            check=False,
            env=FAST_GRACE_ENV,
            timeout=5,
        )

        self.assertEqual(result.returncode, 7)
        self.assertEqual(result.stdout, b'{"type":"turn.completed"}\n')
        self.assertEqual(result.stderr, b"codex diagnostic\n")

    def test_timeout_terminates_the_entire_child_process_group(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            ready = Path(temp_dir) / "ready"
            terminated = Path(temp_dir) / "terminated"
            child_code = textwrap.dedent(
                f"""
                import pathlib
                import subprocess
                import sys
                import time

                grandchild = '''
                import pathlib
                import signal
                import time

                ready = pathlib.Path({str(ready)!r})
                terminated = pathlib.Path({str(terminated)!r})
                def stop(_signum, _frame):
                    terminated.write_text("terminated")
                    raise SystemExit(0)
                signal.signal(signal.SIGTERM, stop)
                ready.write_text("ready")
                while True:
                    time.sleep(1)
                '''
                subprocess.Popen([sys.executable, "-c", grandchild])
                while not pathlib.Path({str(ready)!r}).exists():
                    time.sleep(0.01)
                time.sleep(30)
                """
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(WRAPPER),
                    "0.5",
                    "deadline reached",
                    "--",
                    sys.executable,
                    "-c",
                    child_code,
                ],
                capture_output=True,
                check=False,
                env=FAST_GRACE_ENV,
                timeout=5,
            )

            self.assertEqual(result.returncode, 124)
            self.assertIn(b"deadline reached", result.stderr)
            self.assertTrue(terminated.exists())

    def test_external_term_is_forwarded_to_the_child_process_group(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            ready = Path(temp_dir) / "ready"
            terminated = Path(temp_dir) / "terminated"
            child_code = textwrap.dedent(
                f"""
                import pathlib
                import signal
                import time

                ready = pathlib.Path({str(ready)!r})
                terminated = pathlib.Path({str(terminated)!r})
                def stop(_signum, _frame):
                    terminated.write_text("terminated")
                    raise SystemExit(0)
                signal.signal(signal.SIGTERM, stop)
                ready.write_text("ready")
                while True:
                    time.sleep(1)
                """
            )
            process = subprocess.Popen(
                [
                    sys.executable,
                    str(WRAPPER),
                    "30",
                    "deadline reached",
                    "--",
                    sys.executable,
                    "-c",
                    child_code,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=FAST_GRACE_ENV,
            )
            deadline = time.monotonic() + 2
            while not ready.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(ready.exists())

            process.terminate()
            stdout, stderr = process.communicate(timeout=5)

            self.assertEqual(process.returncode, 128 + 15)
            self.assertEqual(stdout, b"")
            self.assertEqual(stderr, b"")
            self.assertTrue(terminated.exists())


if __name__ == "__main__":
    unittest.main()
