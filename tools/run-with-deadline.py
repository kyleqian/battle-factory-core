#!/usr/bin/env python3
"""Run an interactive command in the foreground with a hard deadline."""

from __future__ import annotations

import os
import subprocess
import sys
import termios


def main() -> int:
    if len(sys.argv) < 5 or sys.argv[3] != "--":
        print(
            "usage: run-with-deadline.py SECONDS TIMEOUT_MESSAGE -- COMMAND [ARG ...]",
            file=sys.stderr,
        )
        return 2

    try:
        timeout = float(sys.argv[1])
    except ValueError:
        print(f"run-with-deadline: invalid timeout {sys.argv[1]!r}", file=sys.stderr)
        return 2
    if timeout < 0:
        print("run-with-deadline: timeout must be non-negative", file=sys.stderr)
        return 2

    timeout_message = sys.argv[2]
    command = sys.argv[4:]

    terminal_fd: int | None = None
    terminal_state: list[object] | None = None
    try:
        candidate_fd = sys.stdin.fileno()
        if os.isatty(candidate_fd):
            terminal_fd = candidate_fd
            terminal_state = termios.tcgetattr(candidate_fd)
    except (OSError, termios.error):
        pass

    # Do not create a new session or process group. The child must remain in
    # the terminal's foreground process group so full-screen TUIs can install
    # their event reader and restore terminal state normally.
    try:
        child = subprocess.Popen(command)
        try:
            return child.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            print(timeout_message, file=sys.stderr, flush=True)
            child.terminate()
            try:
                child.wait(timeout=15)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
            return 124
        except KeyboardInterrupt:
            # The terminal sends SIGINT to both foreground processes. Give the
            # TUI a moment to restore terminal state, then ensure it is gone.
            try:
                return child.wait(timeout=2)
            except subprocess.TimeoutExpired:
                child.terminate()
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()
                return 130
    finally:
        if terminal_fd is not None and terminal_state is not None:
            try:
                # A TUI can have terminal-query replies queued as input when a
                # watchdog stops it. If they reach the shell they appear as
                # garbage keystrokes, so discard them before and after putting
                # the terminal back into the state in which we found it.
                termios.tcflush(terminal_fd, termios.TCIFLUSH)
                termios.tcsetattr(terminal_fd, termios.TCSANOW, terminal_state)
                termios.tcflush(terminal_fd, termios.TCIFLUSH)
            except (OSError, termios.error):
                pass


if __name__ == "__main__":
    raise SystemExit(main())
