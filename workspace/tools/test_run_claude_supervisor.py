#!/usr/bin/env python3
"""Exercise real controller processes without provider access."""

import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest


CONTROLLER = Path(__file__).resolve().with_name("run-claude-supervisor.py")
FAKE = r'''
import json, os
from pathlib import Path
import subprocess, sys
root = Path(os.environ["FIXTURE_ROOT"])
calls = root / "calls.jsonl"
with calls.open("a") as f:
    f.write(json.dumps(sys.argv[1:]) + "\n")
turn = len(calls.read_text().splitlines())
case = os.environ["FIXTURE_CASE"]
stop = Path(os.environ["POKEBENCH_SUPERVISOR_STOP_FILE"])
def finish():
    stop.write_text(json.dumps({"session_id": os.environ["POKEBENCH_SUPERVISOR_SESSION_ID"],
        "status": "complete", "reason": "All simulated work collected."}))
if case == "exit":
    sys.exit(17)
if case in ("provider_error", "usage"):
    print(json.dumps({"type": "result", "subtype": "error_during_execution", "is_error": True,
        "result": "You've hit your limit" if case == "usage" else "API error: unavailable"}))
    sys.exit(0)
if case in ("worker", "cap", "signal") and turn == 1:
    worker = r"""
import os, signal, sys, time
from pathlib import Path
root = Path(sys.argv[1])
def stop(signum, frame):
    (root / 'terminated').write_text('yes')
    raise SystemExit(0)
signal.signal(signal.SIGTERM, stop)
(root / 'worker-ready').touch()
time.sleep(float(sys.argv[2]))
(root / 'worker-done').touch()
(root / 'lanes/integration.pid').unlink(missing_ok=True)
"""
    child = subprocess.Popen([sys.executable, "-c", worker, str(root),
        "0.8" if case == "worker" else "30"], start_new_session=True,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    (root / "lanes/integration.pid").write_text(f"{child.pid} {child.pid}\n")
    finish()  # A premature stop must not abandon this active worker.
elif case == "worker":
    assert (root / "worker-done").exists(), "resumed before worker completion"
    finish()
elif case == "dirty":
    if turn == 1:
        (root / "tracked.dat").write_text("unfinished change")
        subprocess.run(["git", "add", "-f", "tracked.dat"], check=True)
    else:
        subprocess.run(["git", "rm", "--cached", "-q", "tracked.dat"], check=True)
    finish()
elif case == "wind_down":
    finish()
    if turn == 1:
        request = json.loads(stop.read_text())
        request["status"] = "wind_down"
        stop.write_text(json.dumps(request))
elif case == "stale":
    finish()
    if turn == 1:
        request = json.loads(stop.read_text())
        request["session_id"] = "previous-campaign"
        stop.write_text(json.dumps(request))
elif case == "complete" or (case == "early" and turn == 2):
    finish()
print(json.dumps({"type": "result", "subtype": "success", "is_error": False,
    "result": "Waiting for a notification" if turn == 1 else "Collected results."}))
'''


class ClaudeSupervisorTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "bin").mkdir()
        (self.root / "lanes").mkdir()
        (self.root / ".gitignore").write_text("*\n")
        subprocess.run(["git", "init", "--quiet", str(self.root)], check=True)
        fake = self.root / "bin/claude"
        fake.write_text(f"#!{sys.executable}\n" + textwrap.dedent(FAKE))
        fake.chmod(0o755)

    def command(self, seconds=5):
        return [sys.executable, str(CONTROLLER), "--deadline", str(time.time() + seconds),
                "--model", "claude-opus-5-5", "--log", str(self.root / "events.jsonl"),
                "--lane-dir", str(self.root / "lanes"), "--poll-seconds", "0.05",
                "--term-grace-seconds", "0.2", "--prompt", "Run the simulated campaign."]

    def environment(self, case):
        return dict(os.environ, PATH=str(self.root / "bin") + os.pathsep + os.environ["PATH"],
                    FIXTURE_ROOT=str(self.root), FIXTURE_CASE=case)

    def run_case(self, case, seconds=5):
        return subprocess.run(self.command(seconds), cwd=self.root, env=self.environment(case),
                              capture_output=True, text=True, timeout=10)

    def calls(self):
        return [json.loads(line) for line in (self.root / "calls.jsonl").read_text().splitlines()]

    def test_waits_for_worker_then_resumes_same_conversation(self):
        result = self.run_case("worker")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertEqual(len(calls), 2)
        session = calls[0][calls[0].index("--session-id") + 1]
        self.assertEqual(calls[1][calls[1].index("--resume") + 1], session)
        self.assertIn("Monitor,ScheduleWakeup", calls[0])
        self.assertTrue((self.root / "worker-done").exists())
        state = json.loads((self.root / "events.jsonl.controller.json").read_text())
        self.assertEqual(state["status"], "finished")

    def test_accidental_early_final_without_workers_still_continues(self):
        result = self.run_case("early")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 2)

    def test_explicit_clean_completion_ends_campaign(self):
        result = self.run_case("complete")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 1)

    def test_provider_error_with_zero_cli_exit_is_not_retried(self):
        result = self.run_case("provider_error")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(len(self.calls()), 1)

    def test_account_limit_is_not_retried(self):
        result = self.run_case("usage")
        self.assertEqual(result.returncode, 42, result.stderr)
        self.assertEqual(len(self.calls()), 1)

    def test_nonzero_cli_exit_is_not_retried(self):
        result = self.run_case("exit")
        self.assertEqual(result.returncode, 17, result.stderr)
        self.assertEqual(len(self.calls()), 1)

    def test_completion_cannot_abandon_a_dirty_checkout(self):
        result = self.run_case("dirty")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 2)

    def test_wind_down_is_rejected_before_last_twenty_minutes(self):
        result = self.run_case("wind_down", seconds=1300)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 2)

    def test_previous_campaign_stop_file_cannot_end_new_run(self):
        result = self.run_case("stale")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 2)

    def test_deadline_stops_waiting_and_cancels_background_worker(self):
        result = self.run_case("cap", seconds=1)
        self.assertEqual(result.returncode, 124, result.stderr)
        self.assertTrue((self.root / "terminated").exists())
        self.assertFalse((self.root / "worker-done").exists())

    def test_signal_cancels_worker_without_resuming(self):
        process = subprocess.Popen(self.command(), cwd=self.root, env=self.environment("signal"),
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: process.poll() is None and process.kill())
        until = time.monotonic() + 3
        state_file = self.root / "events.jsonl.controller.json"
        while time.monotonic() < until:
            if (self.root / "worker-ready").exists() and state_file.exists():
                state = json.loads(state_file.read_text())
                if state["status"] == "waiting_for_workers":
                    break
            time.sleep(0.02)
        else:
            self.fail("controller did not reach the worker wait")
        process.send_signal(signal.SIGTERM)
        _, stderr = process.communicate(timeout=3)
        self.assertEqual(process.returncode, 143, stderr)
        self.assertTrue((self.root / "terminated").exists())
        self.assertEqual(len(self.calls()), 1)


if __name__ == "__main__":
    unittest.main()
