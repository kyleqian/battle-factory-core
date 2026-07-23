#!/usr/bin/env python3
"""Start one shared oracle outside the launching worker's process group."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


PROFILES = ("battle-scene-off", "battle-scene-on")


def start_oracle_service(
    harness_root: Path,
    profile: str,
    port: str,
    log_path: Path,
) -> int:
    launcher = harness_root / "run-oracle.sh"
    if not launcher.is_file():
        raise FileNotFoundError(f"oracle launcher not found: {launcher}")

    log_path.parent.mkdir(parents=True, exist_ok=True)
    environment = {**os.environ, "PORT": port}
    with log_path.open("ab", buffering=0) as log:
        process = subprocess.Popen(
            [str(launcher), "--profile", profile],
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            close_fds=True,
        )
    return process.pid


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("harness_root", type=Path)
    parser.add_argument("profile", choices=PROFILES)
    parser.add_argument("port")
    parser.add_argument("log_path", type=Path)
    args = parser.parse_args()

    try:
        pid = start_oracle_service(
            args.harness_root.resolve(),
            args.profile,
            args.port,
            args.log_path,
        )
    except (OSError, ValueError) as error:
        print(f"start-oracle-service: {error}", file=sys.stderr)
        return 1
    print(pid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
