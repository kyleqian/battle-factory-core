#!/usr/bin/env python3
"""Run one headless Codex worker in a killable process group.

Unlike the interactive supervisor deadline wrapper, a worker has no terminal
state to preserve. Starting its command in a fresh session lets timeout and
cancellation signals terminate Codex plus every tool subprocess it spawned.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time


POLL_SECONDS = 0.05
TERM_GRACE_SECONDS = float(
    os.environ.get("CODEX_WORKER_TERM_GRACE_SECONDS", "15")
)


def process_group_exists(process_group: int) -> bool:
    try:
        os.killpg(process_group, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def stop_process_group(child: subprocess.Popen[bytes]) -> None:
    process_group = child.pid
    try:
        os.killpg(process_group, signal.SIGTERM)
    except ProcessLookupError:
        return

    deadline = time.monotonic() + TERM_GRACE_SECONDS
    while process_group_exists(process_group) and time.monotonic() < deadline:
        time.sleep(POLL_SECONDS)

    if process_group_exists(process_group):
        try:
            os.killpg(process_group, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass

    try:
        child.wait(timeout=1)
    except subprocess.TimeoutExpired:
        pass


def main() -> int:
    if len(sys.argv) < 5 or sys.argv[3] != "--":
        print(
            "usage: run-codex-worker-with-deadline.py "
            "SECONDS TIMEOUT_MESSAGE -- COMMAND [ARG ...]",
            file=sys.stderr,
        )
        return 2

    try:
        timeout = float(sys.argv[1])
    except ValueError:
        print(
            f"run-codex-worker-with-deadline: invalid timeout {sys.argv[1]!r}",
            file=sys.stderr,
        )
        return 2
    if timeout < 0:
        print(
            "run-codex-worker-with-deadline: timeout must be non-negative",
            file=sys.stderr,
        )
        return 2

    timeout_message = sys.argv[2]
    command = sys.argv[4:]
    received_signal: int | None = None

    def remember_signal(signum: int, _frame: object) -> None:
        nonlocal received_signal
        received_signal = signum

    handled_signals = (signal.SIGTERM, signal.SIGINT, signal.SIGHUP)
    previous_handlers = {
        signum: signal.signal(signum, remember_signal)
        for signum in handled_signals
    }

    try:
        try:
            child = subprocess.Popen(command, start_new_session=True)
        except FileNotFoundError:
            print(
                f"run-codex-worker-with-deadline: command not found: {command[0]}",
                file=sys.stderr,
            )
            return 127

        deadline = time.monotonic() + timeout
        while True:
            status = child.poll()
            if status is not None:
                return status
            if received_signal is not None:
                stop_process_group(child)
                return 128 + received_signal
            if time.monotonic() >= deadline:
                print(timeout_message, file=sys.stderr, flush=True)
                stop_process_group(child)
                return 124
            time.sleep(POLL_SECONDS)
    finally:
        for signum, previous in previous_handlers.items():
            signal.signal(signum, previous)


if __name__ == "__main__":
    raise SystemExit(main())
