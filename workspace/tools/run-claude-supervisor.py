#!/usr/bin/env python3
"""Keep a headless Claude campaign alive across worker-wait turn endings."""

from __future__ import annotations

import argparse
import datetime
import json
import os
from pathlib import Path
import re
import selectors
import signal
import subprocess
import sys
import time
import uuid


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deadline", type=float, required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--log", type=Path, required=True)
    parser.add_argument("--lane-dir", type=Path, required=True)
    parser.add_argument("--poll-seconds", type=float, default=5)
    parser.add_argument("--term-grace-seconds", type=float, default=15)
    parser.add_argument("--prompt", required=True)
    args = parser.parse_args()
    if args.poll_seconds <= 0 or args.term_grace_seconds < 0:
        parser.error("poll interval must be positive and termination grace non-negative")

    started = time.time()
    # A monotonic deadline prevents wall-clock corrections from extending the cap.
    deadline = time.monotonic() + max(0, args.deadline - started)
    session_id = str(uuid.uuid4())
    log = args.log.resolve()
    log.parent.mkdir(parents=True, exist_ok=True)
    state_file = Path(str(log) + ".controller.json")
    stop_file = Path(str(log) + ".stop.json")
    groups: set[int] = set()
    children: list[subprocess.Popen] = []
    received_signal = 0
    turn = 0

    def remember_signal(signum: int, _frame: object) -> None:
        nonlocal received_signal
        received_signal = signum

    for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(signum, remember_signal)

    def state(status: str, **extra: object) -> None:
        payload = dict(status=status, session_id=session_id, turn=turn,
                       deadline_epoch=args.deadline, controller_pid=os.getpid(), **extra)
        temporary = Path(str(state_file) + ".tmp")
        temporary.write_text(json.dumps(payload, indent=2) + "\n")
        temporary.replace(state_file)

    def active_workers() -> dict[str, list[int]]:
        # Retire empty groups promptly rather than retaining their numeric IDs
        # for hours, when the OS could reuse them for unrelated processes.
        for group in list(groups):
            try:
                os.killpg(group, 0)
            except (ProcessLookupError, PermissionError):
                groups.remove(group)
        workers = {}
        for path in args.lane_dir.glob("*.pid"):
            try:
                if path.stat().st_mtime < started - 1:
                    continue  # Never adopt old locks or unrelated recycled PIDs.
                pids = [int(value) for value in path.read_text().split()]
            except (OSError, ValueError):
                continue
            live = []
            for pid in pids:
                if pid <= 1:
                    continue
                result = subprocess.run(["ps", "-p", str(pid), "-o", "stat="],
                                        capture_output=True, text=True)
                if result.returncode or not result.stdout.strip() or result.stdout.lstrip().startswith("Z"):
                    continue
                live.append(pid)
                try:
                    group = os.getpgid(pid)
                    if group != os.getpgrp():
                        groups.add(group)
                except (ProcessLookupError, PermissionError):
                    pass
            if live:
                workers[path.stem] = live
        return workers

    def interrupted() -> int:
        if received_signal:
            return 128 + received_signal
        if time.monotonic() >= deadline:
            return 124
        marker = args.lane_dir / "usage-limit-stop"
        try:
            if marker.stat().st_mtime >= started:
                return 42
        except FileNotFoundError:
            pass
        return 0

    deadline_text = datetime.datetime.fromtimestamp(
        args.deadline, datetime.timezone.utc).isoformat()
    discipline = (
        f" Headless campaign controller is active until {deadline_text}. "
        "Never use Monitor, ScheduleWakeup, or notification-based waiting. "
        "Retain worker PIDs/logs and poll in bounded foreground Bash calls; do not end "
        "your turn awaiting a notification. A turn ending is not campaign completion. "
        "The controller waits for a worker to finish and resumes this SAME conversation. "
        "Verify/fold finished workers and continue ready in-scope work. Before a genuine "
        "final exit, commit a clean handoff and write the JSON stop file "
        f"{stop_file} with session_id={session_id}, status=complete|blocked|wind_down, "
        "and a nonempty reason. 'complete' means no ready in-scope work remains; "
        "'blocked' means every remaining safe step is blocked with evidence in the ledger; "
        "'wind_down' is valid only within 20 minutes of the hard deadline. "
        "Stop requests cannot abandon active workers or a dirty checkout. "
        "Do not write a stop request merely to wait for workers."
    )
    env = dict(os.environ, POKEBENCH_SUPERVISOR_STOP_FILE=str(stop_file),
               POKEBENCH_SUPERVISOR_SESSION_ID=session_id)

    def run_turn(prompt: str) -> tuple[int, dict]:
        identity = ["--session-id", session_id] if turn == 1 else ["--resume", session_id]
        command = ["claude", "-p", "--verbose", "--output-format", "stream-json",
                   "--disallowedTools", "Monitor,ScheduleWakeup", "--model", args.model,
                   "--dangerously-skip-permissions", *identity, prompt + discipline]
        child = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                 start_new_session=True, env=env)
        children.append(child)
        groups.add(child.pid)
        state("running", claude_pid=child.pid)
        assert child.stdout is not None
        os.set_blocking(child.stdout.fileno(), False)
        selector = selectors.DefaultSelector()
        selector.register(child.stdout, selectors.EVENT_READ)
        pending = b""
        result = {}
        next_scan = 0.0
        try:
            with log.open("ab") as raw:
                while True:
                    if time.monotonic() >= next_scan:
                        active_workers()
                        next_scan = time.monotonic() + 1
                    stopped = interrupted()
                    if stopped:
                        return stopped, result
                    events = selector.select(timeout=0.1)
                    for key, _ in events:
                        chunk = os.read(key.fd, 65536)
                        if not chunk:
                            selector.unregister(key.fileobj)
                            continue
                        raw.write(chunk)
                        raw.flush()
                        sys.stdout.buffer.write(chunk)
                        sys.stdout.buffer.flush()
                        pending += chunk
                        while b"\n" in pending:
                            line, pending = pending.split(b"\n", 1)
                            try:
                                item = json.loads(line)
                            except (ValueError, UnicodeDecodeError):
                                continue
                            if item.get("type") == "result":
                                result = item
                    # A tool descendant can retain stdout after Claude exits. Drain
                    # available bytes, but do not confuse an inherited pipe with a
                    # live model process or wait forever for that descendant's EOF.
                    if child.poll() is not None and not events:
                        break
                    if not selector.get_map():
                        if child.poll() is not None:
                            break
                        time.sleep(0.05)
            return child.wait(), result
        finally:
            selector.close()
            child.stdout.close()

    def stop_request() -> dict:
        try:
            request = json.loads(stop_file.read_text())
        except (OSError, ValueError):
            return {}
        if not isinstance(request, dict) or request.get("session_id") != session_id:
            return {}
        if (request.get("status") not in {"complete", "blocked", "wind_down"}
                or not isinstance(request.get("reason"), str) or not request["reason"].strip()):
            return {}
        if request["status"] == "wind_down" and deadline - time.monotonic() > 1200:
            return {}
        checkout = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        return request if checkout.returncode == 0 and not checkout.stdout.strip() else {}

    def campaign() -> int:
        nonlocal turn
        prompt = args.prompt
        quiet_turns = 0
        while not interrupted():
            turn += 1
            code, result = run_turn(prompt)
            if code:
                state("stopped", exit_code=code)
                return code
            if result.get("is_error") or result.get("subtype") != "success":
                detail = str(result.get("result", "")) + str(result.get("errors", ""))
                code = 42 if re.search(r"usage limit|rate.?limit|quota exceeded|hit your limit", detail, re.I) else 1
                state("provider_error", exit_code=code, result=result)
                return code  # Never relaunch a failed/limited provider request.
            workers = active_workers()
            if workers:
                # A stop file written while workers are active cannot later become
                # valid without a supervisor turn that collects their results.
                if stop_file.exists():
                    stop_file.unlink()
                state("waiting_for_workers", workers=workers)
                print(f"claude-supervisor: turn ended; waiting for workers {list(workers)}", file=sys.stderr, flush=True)
                while not interrupted() and active_workers() == workers:
                    time.sleep(min(args.poll_seconds, max(0, deadline - time.monotonic())))
                quiet_turns = 0
            else:
                request = stop_request()
                if request:
                    state("finished", stop_request=request, exit_code=0)
                    return 0
                # Keep accidental early returns alive without burning a model
                # request every polling tick when no worker has changed state.
                quiet_turns += 1
                pause = min(args.poll_seconds * 2 ** min(quiet_turns - 1, 4), 60)
                state("continuing", delay_seconds=pause)
                until = min(time.monotonic() + pause, deadline)
                while not interrupted() and time.monotonic() < until:
                    time.sleep(min(0.1, max(0, until - time.monotonic())))
            prompt = (
                "The previous turn ended, but this campaign is still active. "
                "Inspect the worker launcher logs and retained branches now; independently "
                "verify/fold completed work, then continue your original assignment within its scope. "
                f"Currently active worker lanes: {active_workers()}. "
                "Do not repeat dispatches into occupied lanes or rely on notifications. "
                "If no work remains, follow the explicit clean stop-file protocol."
            )
        code = interrupted()
        state("stopped", exit_code=code)
        return code

    try:
        return campaign()
    finally:
        # The cap belongs to the entire campaign, including workers left behind
        # by a prior turn; resuming does not reset it or orphan those processes.
        for group in groups:
            try:
                os.killpg(group, signal.SIGTERM)
            except (ProcessLookupError, PermissionError):
                pass
        until = time.monotonic() + args.term_grace_seconds
        while groups and time.monotonic() < until:
            for child in children:
                child.poll()  # Reap model parents before checking their groups.
            for group in list(groups):
                try:
                    os.killpg(group, 0)
                except (ProcessLookupError, PermissionError):
                    groups.remove(group)
            if groups:
                time.sleep(0.05)
        for group in groups:
            try:
                os.killpg(group, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
        for child in children:
            child.wait(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
