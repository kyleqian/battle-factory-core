#!/usr/bin/env python3
"""Run an mGBA-backed probe without mistaking teardown crashes for bad data.

The libmgba Python bindings sometimes segfault during interpreter teardown
after a probe has fully written its JSON result. This wrapper accepts that
specific exit only when the requested output did not exist before launch and
the newly written file parses as JSON. Process output goes to a bounded tail
log by default so emulator debug spew cannot create multi-megabyte artifacts.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import signal
import subprocess
import sys

DEFAULT_MAX_LOG_BYTES = 2 * 1024 * 1024


def parses_as_json(path: Path) -> bool:
    try:
        with path.open("r", encoding="utf-8") as handle:
            json.load(handle)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return False
    return True


def normalized_status(returncode: int) -> int:
    return 128 - returncode if returncode < 0 else returncode


def run_with_bounded_log(command: list[str], log_path: Path, max_bytes: int) -> int:
    process = subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    assert process.stdout is not None
    tail = bytearray()
    total = 0
    with log_path.open("wb") as log:
        while chunk := process.stdout.read(64 * 1024):
            total += len(chunk)
            if max_bytes == 0:
                log.write(chunk)
                continue
            tail.extend(chunk)
            if len(tail) > max_bytes:
                del tail[: len(tail) - max_bytes]
        if max_bytes > 0:
            omitted = total - len(tail)
            if omitted:
                log.write(
                    f"[run-mgba-probe: omitted {omitted} earlier log bytes; "
                    f"retaining final {len(tail)} bytes]\n".encode()
                )
            log.write(tail)
    return process.wait()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="run a probe, capture its log, and validate fresh JSON output"
    )
    parser.add_argument("--log", type=Path, help="log path (default: OUTPUT.log)")
    parser.add_argument(
        "--max-log-bytes",
        type=int,
        default=DEFAULT_MAX_LOG_BYTES,
        help=(
            f"retain only this many trailing log bytes "
            f"(default: {DEFAULT_MAX_LOG_BYTES}; 0 keeps all)"
        ),
    )
    parser.add_argument("output", type=Path, help="JSON file the probe will write")
    parser.add_argument(
        "command",
        nargs=argparse.REMAINDER,
        help="probe command, conventionally following --",
    )
    args = parser.parse_args()

    command = args.command
    if command[:1] == ["--"]:
        command = command[1:]
    if not command:
        parser.error("a probe command is required after OUTPUT and --")
    if args.max_log_bytes < 0:
        parser.error("--max-log-bytes must be >= 0")

    output: Path = args.output
    if output.exists():
        print(
            f"run-mgba-probe: refusing stale output path: {output}",
            file=sys.stderr,
        )
        return 2
    output.parent.mkdir(parents=True, exist_ok=True)

    log_path: Path = args.log or output.with_name(f"{output.name}.log")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    returncode = run_with_bounded_log(command, log_path, args.max_log_bytes)

    valid_output = parses_as_json(output)
    status = normalized_status(returncode)
    segfaulted = returncode == -signal.SIGSEGV or status == 128 + signal.SIGSEGV

    if returncode == 0 and valid_output:
        print(f"mGBA probe wrote valid JSON: {output} (log: {log_path})")
        return 0
    if segfaulted and valid_output:
        print(
            f"mGBA probe wrote valid JSON before known teardown SIGSEGV: "
            f"{output} (log: {log_path})"
        )
        return 0

    reason = "output is missing or invalid JSON" if not valid_output else "probe failed"
    print(
        f"run-mgba-probe: {reason}; exit {status}; log: {log_path}",
        file=sys.stderr,
    )
    return status or 1


if __name__ == "__main__":
    raise SystemExit(main())
