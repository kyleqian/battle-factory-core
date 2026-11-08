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
import os
from pathlib import Path
import signal
import subprocess
import sys

DEFAULT_MAX_LOG_BYTES = 2 * 1024 * 1024
BARE_PYTHON_COMMANDS = frozenset(("python", "python3"))
MGBA_BINDING_EXTENSION = Path("mgba") / "_pylib.abi3.so"


def parses_as_json(path: Path) -> bool:
    try:
        with path.open("r", encoding="utf-8") as handle:
            json.load(handle)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return False
    return True


def normalized_status(returncode: int) -> int:
    return 128 - returncode if returncode < 0 else returncode


def find_paired_mgba_binding_for_interpreter(interpreter: Path) -> Path | None:
    """Return an interpreter's usable sibling libmgba-py checkout, if any."""
    executable = interpreter.expanduser()
    if not executable.is_absolute():
        executable = Path.cwd() / executable
    for parent in executable.parents:
        if parent.name != "mgba-venv":
            continue
        binding = parent.parent / "libmgba-py"
        if (binding / MGBA_BINDING_EXTENSION).is_file():
            return binding
        return None
    return None


def find_mgba_python(start: Path | None = None) -> Path:
    """Find the harness-managed interpreter used by libmgba-py probes."""
    override = os.environ.get("POKEBENCH_MGBA_PYTHON")
    if override:
        candidate = Path(override).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate
        raise FileNotFoundError(
            f"POKEBENCH_MGBA_PYTHON is not an executable file: {candidate}"
        )

    origin = (start or Path(__file__).resolve()).resolve()
    for parent in (origin, *origin.parents):
        for executable in ("python3", "python"):
            candidate = parent / "vendor" / "mgba-venv" / "bin" / executable
            if (
                candidate.is_file()
                and os.access(candidate, os.X_OK)
                and find_paired_mgba_binding_for_interpreter(candidate) is not None
            ):
                return candidate
    raise FileNotFoundError(
        "could not find a usable vendor/mgba-venv/bin/python3 paired with "
        "vendor/libmgba-py/mgba/_pylib.abi3.so above "
        f"{origin}; restore the harness vendor environment or set "
        "POKEBENCH_MGBA_PYTHON"
    )


def resolve_probe_command(
    command: list[str],
    mgba_python: Path | None = None,
) -> list[str]:
    """Route an implicit Python probe through the mGBA virtualenv."""
    if not command:
        return command
    first = command[0]
    implicit_python = first in BARE_PYTHON_COMMANDS
    direct_script = first.endswith(".py") and not Path(first).is_absolute()
    if not implicit_python and not direct_script:
        return command

    interpreter = mgba_python or find_mgba_python()
    if implicit_python:
        return [str(interpreter), *command[1:]]
    return [str(interpreter), *command]


def find_paired_mgba_binding(command: list[str]) -> Path | None:
    """Find libmgba-py paired with an explicit mgba-venv interpreter."""
    if not command:
        return None
    return find_paired_mgba_binding_for_interpreter(Path(command[0]))


def probe_environment(command: list[str]) -> dict[str, str] | None:
    """Expose a harness-managed interpreter's sibling libmgba-py checkout."""
    binding = find_paired_mgba_binding(command)
    if binding is None:
        return None

    environment = os.environ.copy()
    existing = environment.get("PYTHONPATH")
    entries = existing.split(os.pathsep) if existing else []
    binding_text = str(binding)
    if binding_text not in entries:
        environment["PYTHONPATH"] = os.pathsep.join((binding_text, *entries))
    return environment


def run_with_bounded_log(
    command: list[str],
    log_path: Path,
    max_bytes: int,
    environment: dict[str, str] | None = None,
) -> int:
    process = subprocess.Popen(
        command,
        env=environment,
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
    parser.add_argument(
        "--rm-log-on-success",
        action="store_true",
        help="delete the log once the output is accepted (a failed run keeps it)",
    )
    parser.add_argument(
        "--mgba-python",
        type=Path,
        help=(
            "interpreter for a bare python/python3 or relative .py probe "
            "(default: auto-detect vendor/mgba-venv)"
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
    if args.mgba_python is not None:
        if not args.mgba_python.is_file() or not os.access(args.mgba_python, os.X_OK):
            parser.error(f"--mgba-python is not an executable file: {args.mgba_python}")
    try:
        command = resolve_probe_command(command, args.mgba_python)
    except FileNotFoundError as error:
        print(f"run-mgba-probe: {error}", file=sys.stderr)
        return 2

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
    returncode = run_with_bounded_log(
        command,
        log_path,
        args.max_log_bytes,
        probe_environment(command),
    )

    valid_output = parses_as_json(output)
    status = normalized_status(returncode)
    segfaulted = returncode == -signal.SIGSEGV or status == 128 + signal.SIGSEGV

    if (returncode == 0 or segfaulted) and valid_output:
        if returncode == 0:
            note = "mGBA probe wrote valid JSON"
        else:
            note = "mGBA probe wrote valid JSON before known teardown SIGSEGV"
        if args.rm_log_on_success:
            log_path.unlink(missing_ok=True)
            print(f"{note}: {output}")
        else:
            print(f"{note}: {output} (log: {log_path})")
        return 0

    reason = "output is missing or invalid JSON" if not valid_output else "probe failed"
    print(
        f"run-mgba-probe: {reason}; exit {status}; log: {log_path}",
        file=sys.stderr,
    )
    return status or 1


if __name__ == "__main__":
    raise SystemExit(main())
