#!/usr/bin/env python3
"""Build the (move, orientation, variant) -> scenario manifest for the allocator net-zero audit."""
import glob, json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IDS = [int(x) for x in re.findall(r"\d+", re.search(
    r"LIVE_MOVE_ANIMATION_IDS = Object\.freeze\(\[(.*?)\]", (ROOT / "src/engine/liveMoveAnimation.ts").read_text(), re.S).group(1))]
NAMES = {}
for line in (ROOT / "reference/pokeemerald/include/constants/moves.h").read_text().splitlines():
    m = re.match(r"#define MOVE_(\w+)\s+(\d+)", line)
    if m:
        NAMES[int(m.group(2))] = m.group(1)
norm = lambda s: re.sub(r"[^A-Z0-9]", "", str(s).upper())
N2ID = {norm(v): k for k, v in NAMES.items()}


def resolve(path: str):
    cf, sc = None, None
    d = json.loads(Path(ROOT / path).read_text())
    if "sourceFixture" in d:
        cf = d["sourceFixture"]
        sc = json.loads((ROOT / cf).read_text()).get("scenario")
    elif "scenario" in d:
        sc = d["scenario"]
    return d, cf, sc


def main():
    rows = {}
    for f in sorted(glob.glob(str(ROOT / "tools/integration/fixtures/*.json"))):
        b = os.path.basename(f)
        if "receipt" in b or "scenario" in b or "allocator" in b:
            continue
        m = re.search(r"-(player|opponent)(\b|-|\.)", b)
        if not m:
            continue
        try:
            d, cf, sc = resolve(os.path.relpath(f, ROOT))
        except Exception:
            continue
        if not isinstance(d, dict) or not sc or not (ROOT / sc).is_file():
            continue
        mv = d.get("move")
        mid = None
        if isinstance(mv, int):
            mid = mv
        elif mv:
            mid = N2ID.get(norm(mv))
        if mid is None and cf:
            slug = re.split(r"-(?:player|opponent)-", os.path.basename(cf))[0]
            mid = N2ID.get(norm(slug))
        if mid is None or mid not in IDS:
            continue
        side = m.group(1)
        rows.setdefault(mid, []).append({"orientation": side, "integrationFixture": os.path.relpath(f, ROOT),
                                         "sourceFixture": cf, "scenario": sc})
    # Moves with no tools/integration fixture: accepted mechanic scenarios by slug.
    extra = {112: "barrier", 115: "reflect", 182: "protect", 243: "mirror-coat", 277: "magic-coat"}
    wall = {}
    for i in list(IDS) + list(extra):
        if i in rows and i in IDS:
            continue
        slug = extra.get(i) or NAMES[i].lower().replace("_", "-")
        if i in extra:
            cands = sorted(glob.glob(str(ROOT / f"tools/integration/fixtures/wall-family-scenarios/wall-family-{slug}-*.json")))
        else:
            cands = []
        cands += sorted(glob.glob(str(ROOT / f"tools/battle-lab/mechanic-{slug}-*.json")))
        if not cands:
            for c in sorted(glob.glob(str(ROOT / f"tools/compare/fixtures/{slug}-*.json"))):
                sc = json.loads(Path(c).read_text()).get("scenario") if c.endswith(".json") else None
                if sc and (ROOT / sc).is_file() and re.search(r"-(player|opponent)-", os.path.basename(c)):
                    cands.append(str(ROOT / sc))
        for c in cands:
            b = os.path.basename(c)
            m = re.search(r"-(player|opponent)\b", b)
            if not m or "factory-ai" in b or "control" in b or "cap-" in b:
                continue
            (wall if i in extra else rows).setdefault(i, []).append({
                "orientation": m.group(1), "integrationFixture": None, "sourceFixture": None,
                "scenario": os.path.relpath(c, ROOT), "fallback": "battle-lab slug match (no tools/integration fixture)"})
    for i, v in wall.items():
        rows.setdefault(i, []).extend(v)
    NAMES_ALL = NAMES
    out = {str(i): {"name": NAMES[i], "fixtures": rows.get(i, [])} for i in list(IDS) + list(extra)}
    json.dump(out, sys.stdout, indent=1)


if __name__ == "__main__":
    main()
