#!/usr/bin/env python3
"""Regression tests for the guarded mGBA probe runner."""

from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import importlib.util


ROOT = Path(__file__).resolve().parent.parent
WRAPPER = ROOT / "tools" / "run-mgba-probe.py"


def load_wrapper_module() -> object:
    spec = importlib.util.spec_from_file_location("run_mgba_probe", WRAPPER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class RunMgbaProbeTests(unittest.TestCase):
    def make_mgba_environment(self, temp_dir: str) -> tuple[Path, Path]:
        vendor = Path(temp_dir) / "vendor"
        interpreter = vendor / "mgba-venv" / "bin" / "python"
        interpreter.parent.mkdir(parents=True)
        interpreter.symlink_to(sys.executable)
        binding = vendor / "libmgba-py"
        (binding / "mgba").mkdir(parents=True)
        (binding / "mgba" / "_pylib.abi3.so").touch()
        (binding / "probe_binding.py").write_text("VALUE = 'paired-binding'\n")
        return interpreter, binding

    def run_wrapper(
        self, output: Path, code: str, *extra: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(WRAPPER),
                str(output),
                "--",
                sys.executable,
                "-c",
                code,
                str(output),
                *extra,
            ],
            capture_output=True,
            check=False,
            text=True,
            timeout=5,
        )

    def test_accepts_normal_exit_with_fresh_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import json, pathlib, sys; "
                "pathlib.Path(sys.argv[1]).write_text(json.dumps({'ok': True}))",
            )

            self.assertEqual(result.returncode, 0)
            self.assertEqual(json.loads(output.read_text()), {"ok": True})
            self.assertTrue(Path(f"{output}.log").exists())

    def test_accepts_sigsegv_only_after_fresh_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import json, os, pathlib, signal, sys; "
                "pathlib.Path(sys.argv[1]).write_text(json.dumps({'flushed': True})); "
                "os.kill(os.getpid(), signal.SIGSEGV)",
            )

            self.assertEqual(result.returncode, 0)
            self.assertIn("known teardown SIGSEGV", result.stdout)
            self.assertEqual(json.loads(output.read_text()), {"flushed": True})

    def test_rejects_sigsegv_without_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = self.run_wrapper(
                output,
                "import os, signal; os.kill(os.getpid(), signal.SIGSEGV)",
            )

            self.assertEqual(result.returncode, 128 + signal.SIGSEGV)
            self.assertFalse(output.exists())

    def test_rm_log_on_success_removes_log_only_when_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            write = (
                "import json, pathlib, sys; "
                "pathlib.Path(sys.argv[1]).write_text(json.dumps({'ok': True}))"
            )
            ok = subprocess.run(
                [sys.executable, str(WRAPPER), "--rm-log-on-success", str(output),
                 "--", sys.executable, "-c", write, str(output)],
                capture_output=True, check=False, text=True, timeout=5,
            )
            self.assertEqual(ok.returncode, 0)
            self.assertTrue(output.exists())
            self.assertFalse(Path(f"{output}.log").exists())

            failed = Path(temp_dir) / "failed.json"
            bad = subprocess.run(
                [sys.executable, str(WRAPPER), "--rm-log-on-success", str(failed),
                 "--", sys.executable, "-c", "print('boom'); raise SystemExit(3)"],
                capture_output=True, check=False, text=True, timeout=5,
            )
            self.assertEqual(bad.returncode, 3)
            self.assertTrue(Path(f"{failed}.log").exists())

    def test_refuses_stale_output_without_running_command(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            marker = Path(temp_dir) / "ran"
            output.write_text('{"stale":true}')
            result = self.run_wrapper(
                output,
                "import pathlib, sys; pathlib.Path(sys.argv[2]).write_text('ran')",
                str(marker),
            )

            self.assertEqual(result.returncode, 2)
            self.assertFalse(marker.exists())

    def test_bounds_debug_log_and_retains_its_tail(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "result.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(WRAPPER),
                    "--max-log-bytes",
                    "128",
                    str(output),
                    "--",
                    sys.executable,
                    "-c",
                    "import json, pathlib, sys; "
                    "print('x' * 1000); print('USEFUL-TAIL'); "
                    "pathlib.Path(sys.argv[1]).write_text(json.dumps({'ok': True}))",
                    str(output),
                ],
                capture_output=True,
                check=False,
                text=True,
                timeout=5,
            )

            log = Path(f"{output}.log").read_text()
            self.assertEqual(result.returncode, 0)
            self.assertIn("omitted", log)
            self.assertIn("USEFUL-TAIL", log)
            self.assertLess(len(log), 256)

    def test_explicit_mgba_python_exposes_paired_binding_and_keeps_pythonpath(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            interpreter, binding = self.make_mgba_environment(temp_dir)
            inherited = Path(temp_dir) / "inherited"
            inherited.mkdir()
            (inherited / "probe_inherited.py").write_text("VALUE = 'inherited'\n")
            output = Path(temp_dir) / "result.json"
            environment = os.environ.copy()
            environment["PYTHONPATH"] = str(inherited)

            result = subprocess.run(
                [
                    sys.executable,
                    str(WRAPPER),
                    str(output),
                    "--",
                    str(interpreter),
                    "-c",
                    "import json, os, pathlib, probe_binding, probe_inherited, sys; "
                    "pathlib.Path(sys.argv[1]).write_text(json.dumps({"
                    "'binding': probe_binding.VALUE, "
                    "'inherited': probe_inherited.VALUE, "
                    "'pythonpath': os.environ['PYTHONPATH'].split(os.pathsep)}))",
                    str(output),
                ],
                capture_output=True,
                check=False,
                env=environment,
                text=True,
                timeout=5,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(output.read_text())
            self.assertEqual(payload["binding"], "paired-binding")
            self.assertEqual(payload["inherited"], "inherited")
            self.assertEqual(payload["pythonpath"], [str(binding), str(inherited)])

    def test_auto_routed_python_exposes_binding_for_selected_interpreter(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            interpreter, _ = self.make_mgba_environment(temp_dir)
            output = Path(temp_dir) / "result.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(WRAPPER),
                    "--mgba-python",
                    str(interpreter),
                    str(output),
                    "--",
                    "python3",
                    "-c",
                    "import json, pathlib, probe_binding, sys; "
                    "pathlib.Path(sys.argv[1]).write_text(json.dumps({"
                    "'binding': probe_binding.VALUE}))",
                    str(output),
                ],
                capture_output=True,
                check=False,
                text=True,
                timeout=5,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                json.loads(output.read_text()),
                {"binding": "paired-binding"},
            )

    def test_auto_discovery_skips_nearer_venv_without_usable_binding(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            complete_interpreter, _ = self.make_mgba_environment(temp_dir)
            nested = Path(temp_dir) / "nested" / "workspace"
            incomplete = nested / "vendor" / "mgba-venv" / "bin" / "python3"
            incomplete.parent.mkdir(parents=True)
            incomplete.symlink_to(sys.executable)
            origin = nested / "tools" / "run-mgba-probe.py"
            wrapper = load_wrapper_module()

            with patch.dict(os.environ, {"POKEBENCH_MGBA_PYTHON": ""}):
                selected = wrapper.find_mgba_python(origin)

            self.assertEqual(selected.resolve(), complete_interpreter.resolve())


if __name__ == "__main__":
    unittest.main()
