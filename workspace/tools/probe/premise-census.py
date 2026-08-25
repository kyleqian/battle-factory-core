#!/usr/bin/env python3
"""Reproducible census of `throw new <X>Error(...)` sites under src/**/*.ts.

Reassembles the throw's message argument across wrapped lines (balanced
parens, template literals, and `+` string concatenation), attributes the
enclosing function/method, and emits a sorted TSV to stdout:

    file:line<TAB>function<TAB>message

See docs/premise-throw-audit-2026-08-25.md for the audit this reproduces.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

THROW_RE = re.compile(r"throw\s+new\s+(\w*Error)\s*\(")

PREMISE_KEYWORDS = (
    "must",
    "expected",
    "unexpected",
    "impossible",
    "cannot",
    "should never",
    "invariant",
    "unreachable",
    "not reachable",
)

KEYWORDS = {
    "if", "for", "while", "switch", "catch", "function", "return", "throw",
    "new", "typeof", "in", "of", "do", "else", "try", "class", "interface",
    "extends", "implements", "super", "this", "yield", "await", "async",
    "export", "import", "default", "case", "void", "delete", "instanceof",
    "const", "let", "var", "finally", "with", "break", "continue", "static",
    "public", "private", "protected", "readonly", "abstract", "override",
    "get", "set", "declare", "namespace", "module", "enum", "type", "as",
    "from", "satisfies",
}

FUNC_DECL_RE = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+(\w+)\s*\("
)
ARROW_CONST_RE = re.compile(
    r"^(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::[^=]*)?=\s*(?:async\s*)?\("
)
MODIFIER_RE = re.compile(
    r"^(?:(?:public|private|protected|static|async|override|abstract|readonly|get|set)\s+)+"
)
METHOD_RE = re.compile(r"^(\w+)\s*\(")
ANON_FUNC_RE = re.compile(r"\bfunction\s*\(")
ANON_ARROW_RE = re.compile(r"=>\s*\{?\s*$")


def skip_string(text: str, i: int) -> int:
    quote = text[i]
    n = len(text)
    j = i + 1
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == quote:
            return j + 1
        j += 1
    return n


def skip_line_comment(text: str, i: int) -> int:
    j = text.find("\n", i)
    return j if j != -1 else len(text)


def skip_block_comment(text: str, i: int) -> int:
    j = text.find("*/", i + 2)
    return j + 2 if j != -1 else len(text)


def skip_braces(text: str, i: int) -> int:
    """i points just past a '${'; returns index just past the matching '}'."""
    n = len(text)
    depth = 1
    j = i
    while j < n and depth > 0:
        c = text[j]
        if c in "'\"":
            j = skip_string(text, j)
            continue
        if c == "`":
            j = skip_template(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "/":
            j = skip_line_comment(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "*":
            j = skip_block_comment(text, j)
            continue
        if c == "{":
            depth += 1
            j += 1
            continue
        if c == "}":
            depth -= 1
            j += 1
            continue
        j += 1
    return j


def skip_template(text: str, i: int) -> int:
    """i points at the opening backtick; returns index just past the closing one."""
    n = len(text)
    j = i + 1
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == "`":
            return j + 1
        if c == "$" and j + 1 < n and text[j + 1] == "{":
            j = skip_braces(text, j + 2)
            continue
        j += 1
    return n


def scan_call_args(text: str, i: int) -> tuple[int, list[str]]:
    """i points just past the call's opening '('; returns (end_index, args)."""
    n = len(text)
    depth = 1
    arg_start = i
    args: list[str] = []
    j = i
    while j < n:
        c = text[j]
        if c in "'\"":
            j = skip_string(text, j)
            continue
        if c == "`":
            j = skip_template(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "/":
            j = skip_line_comment(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "*":
            j = skip_block_comment(text, j)
            continue
        if c in "([{":
            depth += 1
            j += 1
            continue
        if c in ")]}":
            depth -= 1
            if depth == 0:
                args.append(text[arg_start:j])
                return j + 1, args
            j += 1
            continue
        if c == "," and depth == 1:
            args.append(text[arg_start:j])
            arg_start = j + 1
            j += 1
            continue
        j += 1
    args.append(text[arg_start:j])
    return j, args


def split_top_level_plus(text: str) -> list[str]:
    n = len(text)
    parts: list[str] = []
    start = 0
    depth = 0
    j = 0
    while j < n:
        c = text[j]
        if c in "'\"":
            j = skip_string(text, j)
            continue
        if c == "`":
            j = skip_template(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "/":
            j = skip_line_comment(text, j)
            continue
        if c == "/" and j + 1 < n and text[j + 1] == "*":
            j = skip_block_comment(text, j)
            continue
        if c in "([{":
            depth += 1
            j += 1
            continue
        if c in ")]}":
            depth -= 1
            j += 1
            continue
        if c == "+" and depth == 0:
            parts.append(text[start:j])
            start = j + 1
            j += 1
            continue
        j += 1
    parts.append(text[start:j])
    return parts


def normalize_ws(s: str) -> str:
    return re.sub(r"\s*\n\s*", " ", s)


def literalize(token: str) -> str:
    t = token.strip()
    if not t:
        return ""
    if len(t) >= 2 and t[0] == "`" and t[-1] == "`":
        return normalize_ws(t[1:-1])
    if len(t) >= 2 and t[0] in "'\"" and t[-1] == t[0]:
        inner = re.sub(r"\\(.)", r"\1", t[1:-1])
        return normalize_ws(inner)
    return "${" + normalize_ws(t) + "}"


def build_message(first_arg: str) -> str:
    parts = split_top_level_plus(first_arg)
    return "".join(literalize(p) for p in parts).strip()


def indent_of(line: str) -> int:
    return len(line) - len(line.lstrip(" \t"))


def attribute_function(lines: list[str], throw_line_idx: int) -> str:
    current_indent = indent_of(lines[throw_line_idx])
    i = throw_line_idx - 1
    while i >= 0:
        raw = lines[i]
        stripped = raw.strip()
        if not stripped:
            i -= 1
            continue
        ind = indent_of(raw)
        if ind < current_indent:
            m = FUNC_DECL_RE.match(stripped)
            if m:
                return m.group(1)
            m = ARROW_CONST_RE.match(stripped)
            if m:
                return m.group(1)
            demod = MODIFIER_RE.sub("", stripped)
            m = METHOD_RE.match(demod)
            if m and m.group(1) not in KEYWORDS:
                return m.group(1)
            if ANON_FUNC_RE.search(stripped) or ANON_ARROW_RE.search(stripped):
                return "<anonymous>"
            current_indent = ind
        i -= 1
    return "<anonymous>"


def has_unsupported_branch_context(lines: list[str], throw_line_idx: int) -> bool:
    lo = max(0, throw_line_idx - 2)
    hi = min(len(lines), throw_line_idx + 3)
    window = "\n".join(lines[lo:hi])
    return "unsupported-branch" in window


def is_premise(message: str) -> bool:
    lower = message.lower()
    return any(keyword in lower for keyword in PREMISE_KEYWORDS)


def scan_file(path: Path, exclude_unsupported_branch: bool) -> tuple[list[tuple[str, int, str, str]], int]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    display = path.as_posix()
    rows: list[tuple[str, int, str, str]] = []
    dropped = 0
    for m in THROW_RE.finditer(text):
        line_no = text.count("\n", 0, m.start()) + 1
        if exclude_unsupported_branch and has_unsupported_branch_context(lines, line_no - 1):
            dropped += 1
            continue
        _, call_args = scan_call_args(text, m.end())
        first_arg = call_args[0] if call_args else ""
        message = build_message(first_arg)
        func = attribute_function(lines, line_no - 1)
        rows.append((display, line_no, func, message))
    return rows, dropped


def collect(root: Path, only: str | None, exclude_unsupported_branch: bool) -> tuple[list[tuple[str, int, str, str]], int]:
    all_rows: list[tuple[str, int, str, str]] = []
    total_dropped = 0
    for path in sorted(root.rglob("*.ts")):
        if only and not path.as_posix().startswith(only):
            continue
        rows, dropped = scan_file(path, exclude_unsupported_branch)
        all_rows.extend(rows)
        total_dropped += dropped
    all_rows.sort(key=lambda r: (r[0], r[1]))
    return all_rows, total_dropped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default="src", help="directory to walk for *.ts files (default: src)")
    parser.add_argument("--only", default=None, help="keep only files whose path starts with this prefix, e.g. src/engine")
    parser.add_argument("--premise", action="store_true", help="keep only premise-worded rows")
    parser.add_argument("--summary", action="store_true", help="print per-file totals instead of raw rows")
    parser.add_argument(
        "--exclude-unsupported-branch",
        action="store_true",
        help="drop rows whose enclosing 5 lines mention unsupported-branch",
    )
    args = parser.parse_args()

    rows, dropped = collect(Path(args.root), args.only, args.exclude_unsupported_branch)

    if args.exclude_unsupported_branch:
        print(f"# --exclude-unsupported-branch dropped {dropped} row(s)", file=sys.stderr)

    if args.summary:
        per_file: dict[str, list[int]] = {}
        for file_, _line, _func, message in rows:
            counts = per_file.setdefault(file_, [0, 0])
            counts[0] += 1
            if is_premise(message):
                counts[1] += 1
        grand_total = 0
        grand_premise = 0
        print("file\ttotal\tpremise")
        for file_ in sorted(per_file):
            total, premise = per_file[file_]
            grand_total += total
            grand_premise += premise
            print(f"{file_}\t{total}\t{premise}")
        print(f"TOTAL\t{grand_total}\t{grand_premise}")
        return 0

    for file_, line, func, message in rows:
        if args.premise and not is_premise(message):
            continue
        print(f"{file_}:{line}\t{func}\t{message}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
