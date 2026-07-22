#!/usr/bin/env python3
"""Copy Codex rollout files for one launch into the run's durable log folder."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path


def session_metadata(path: Path) -> tuple[Path | None, str | None]:
    try:
        with path.open(encoding="utf-8") as stream:
            for line in stream:
                event = json.loads(line)
                if event.get("type") != "session_meta":
                    continue
                payload = event.get("payload", {})
                cwd = payload.get("cwd")
                originator = payload.get("originator")
                return (
                    Path(cwd).resolve() if isinstance(cwd, str) else None,
                    originator if isinstance(originator, str) else None,
                )
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None, None
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", type=float, required=True)
    parser.add_argument("--cwd", type=Path, required=True)
    parser.add_argument("--dest", type=Path, required=True)
    parser.add_argument("--originator")
    args = parser.parse_args()

    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    sessions = codex_home / "sessions"
    if not sessions.is_dir():
        return 0

    launch_cwd = args.cwd.resolve()
    matches: list[Path] = []
    for source in sessions.rglob("*.jsonl"):
        try:
            # Leave a small allowance for filesystem timestamp granularity.
            if source.stat().st_mtime < args.since - 2:
                continue
        except OSError:
            continue
        cwd, originator = session_metadata(source)
        if cwd == launch_cwd and (
            args.originator is None or originator == args.originator
        ):
            matches.append(source)

    if not matches:
        print("Codex session history remains under ~/.codex/sessions (no new rollout file matched this launch).")
        return 0

    args.dest.mkdir(parents=True, exist_ok=True)
    for source in sorted(matches):
        destination = args.dest / source.name
        shutil.copy2(source, destination)
        print(f"Codex session archived: {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
