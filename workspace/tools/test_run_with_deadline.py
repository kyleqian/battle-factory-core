#!/usr/bin/env python3
"""Regression tests for the interactive deadline wrapper."""

from __future__ import annotations

import errno
import os
from pathlib import Path
import pty
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parent.parent
WRAPPER = ROOT / "tools" / "run-with-deadline.py"
TERMINAL_MODE_RESET = (
    b"\x1b[?1006l"
    b"\x1b[?1015l"
    b"\x1b[?1003l"
    b"\x1b[?1002l"
    b"\x1b[?1000l"
    b"\x1b[?1004l"
    b"\x1b[?2004l"
    b"\x1b[<1u"
    b"\x1b[?2026l"
    b"\x1b[?1049l"
    b"\x1b[?25h"
    b"\x1b[0 q"
    b"\x1b[0m"
)


def run_in_pty(timeout: str, child_code: str) -> tuple[int, bytes]:
    master_fd, slave_fd = pty.openpty()
    process = subprocess.Popen(
        [
            sys.executable,
            str(WRAPPER),
            timeout,
            "deadline reached",
            "--",
            sys.executable,
            "-c",
            child_code,
        ],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        close_fds=True,
    )
    os.close(slave_fd)
    chunks: list[bytes] = []
    while True:
        try:
            chunk = os.read(master_fd, 4096)
        except OSError as error:
            if error.errno == errno.EIO:
                break
            raise
        if not chunk:
            break
        chunks.append(chunk)
    os.close(master_fd)
    return process.wait(timeout=5), b"".join(chunks)


class RunWithDeadlineTests(unittest.TestCase):
    def test_resets_terminal_emulator_modes_after_clean_exit(self) -> None:
        status, output = run_in_pty(
            "1",
            "import os; os.write(1, b'child done')",
        )

        self.assertEqual(status, 0)
        self.assertIn(b"child done", output)
        self.assertTrue(output.endswith(TERMINAL_MODE_RESET), repr(output))

    def test_resets_terminal_emulator_modes_after_timeout(self) -> None:
        status, output = run_in_pty(
            "0.05",
            "import os, time; os.write(1, b'child started'); time.sleep(30)",
        )

        self.assertEqual(status, 124)
        self.assertIn(b"deadline reached", output)
        self.assertTrue(output.endswith(TERMINAL_MODE_RESET), repr(output))


if __name__ == "__main__":
    unittest.main()
