#!/usr/bin/env python3
"""Regression tests for the premise-throw census tool."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "tools" / "probe" / "premise-census.py"

FIXTURE = """\
export function topLevelHelper(x: number) {
  if (x < 0) {
    throw new Error("simple single-line message");
  }
  return x;
}

export const arrowHelper = (y: number) => {
  if (y === 0) {
    throw new Error(
      `arrow message must never see ${y} as zero`
    );
  }
  return y;
};

class Widget {
  method(z: number) {
    if (z > 100) {
      throw new Error(
        "concatenated message part one " + z +
        " part two must not exceed bound"
      );
    }
    return z;
  }
}

export function callbackHost(items: number[]) {
  return items.map(function (item) {
    if (item < 0) {
      throw new RangeError("anonymous callback message: unexpected negative item");
    }
    return item;
  });
}
"""


class PremiseCensusTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.src_dir = Path(self._tmp.name) / "src" / "engine"
        self.src_dir.mkdir(parents=True)
        (self.src_dir / "sample.ts").write_text(FIXTURE, encoding="utf-8")

    def run_census(self, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--root",
                str(Path(self._tmp.name) / "src"),
                *extra,
            ],
            capture_output=True,
            check=False,
            text=True,
            timeout=10,
        )

    def parse_rows(self, stdout: str) -> list[tuple[str, str, str]]:
        rows = []
        for line in stdout.splitlines():
            file_line, func, message = line.split("\t", 2)
            rows.append((file_line, func, message))
        return rows

    def test_reassembles_all_four_throw_shapes(self) -> None:
        result = self.run_census()
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.parse_rows(result.stdout)
        self.assertEqual(len(rows), 4)

        by_file_line = {r[0]: (r[1], r[2]) for r in rows}

        func, message = by_file_line[
            f"{self.src_dir.as_posix()}/sample.ts:3"
        ]
        self.assertEqual(func, "topLevelHelper")
        self.assertEqual(message, "simple single-line message")

        func, message = by_file_line[
            f"{self.src_dir.as_posix()}/sample.ts:10"
        ]
        self.assertEqual(func, "arrowHelper")
        self.assertEqual(message, "arrow message must never see ${y} as zero")

        func, message = by_file_line[
            f"{self.src_dir.as_posix()}/sample.ts:20"
        ]
        self.assertEqual(func, "method")
        self.assertEqual(
            message,
            "concatenated message part one ${z} part two must not exceed bound",
        )

        func, message = by_file_line[
            f"{self.src_dir.as_posix()}/sample.ts:32"
        ]
        self.assertEqual(func, "<anonymous>")
        self.assertEqual(
            message, "anonymous callback message: unexpected negative item"
        )

    def test_premise_filter_keeps_only_premise_worded_rows(self) -> None:
        result = self.run_census("--premise")
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.parse_rows(result.stdout)
        messages = {r[2] for r in rows}

        self.assertEqual(len(rows), 3)
        self.assertNotIn("simple single-line message", messages)
        self.assertTrue(any("must never see" in m for m in messages))
        self.assertTrue(any("must not exceed bound" in m for m in messages))
        self.assertTrue(any("unexpected negative item" in m for m in messages))

    def test_only_filters_by_path_prefix(self) -> None:
        other_dir = Path(self._tmp.name) / "src" / "other"
        other_dir.mkdir(parents=True)
        (other_dir / "elsewhere.ts").write_text(
            'export function f() {\n  throw new Error("elsewhere");\n}\n',
            encoding="utf-8",
        )

        result = self.run_census("--only", str(self.src_dir.as_posix()))
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.parse_rows(result.stdout)
        self.assertEqual(len(rows), 4)
        self.assertTrue(all("src/engine/sample.ts" in r[0] for r in rows))

    def test_summary_prints_per_file_and_grand_totals(self) -> None:
        result = self.run_census("--summary")
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = result.stdout.splitlines()
        self.assertEqual(lines[0], "file\ttotal\tpremise")
        self.assertEqual(lines[-1], "TOTAL\t4\t3")

    def test_exclude_unsupported_branch_drops_flagged_context_and_reports_it(
        self,
    ) -> None:
        flagged = Path(self._tmp.name) / "src" / "flagged.ts"
        flagged.write_text(
            "export function g() {\n"
            "  // unsupported-branch case\n"
            '  throw new Error("should be dropped");\n'
            "}\n",
            encoding="utf-8",
        )

        result = self.run_census("--exclude-unsupported-branch")
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.parse_rows(result.stdout)
        self.assertEqual(len(rows), 4)
        self.assertNotIn("should be dropped", {r[2] for r in rows})
        self.assertIn("dropped 1 row", result.stderr)


if __name__ == "__main__":
    unittest.main()
