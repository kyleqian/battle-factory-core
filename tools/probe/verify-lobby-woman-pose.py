#!/usr/bin/env python3
"""Wandering-woman pose audit, fast path: for each oracle tick, render the
byte-exact field (no woman), diff against the oracle to get the woman's own
pixel mask, then match each source sheet frame (and h-flip) aligned to the
mask's bounding box.

Run: python3 tools/probe/verify-lobby-woman-pose.py <probe-out.json> <pngDir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

PROBE_OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/woman-pose-out.json")
PNG_DIR = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/woman-pose-png")

LAYOUT_PATH = WORKTREE_ROOT / "src" / "data" / "gen" / "factory-lobby-terminal-layout.json"
TILESET_PATH = WORKTREE_ROOT / "src" / "assets" / "gen" / "factory-lobby-terminal-tileset.json"
NPCS_PATH = WORKTREE_ROOT / "src" / "assets" / "gen" / "factory-lobby-terminal-npcs.json"

LAYOUT = json.loads(LAYOUT_PATH.read_text())
TILESET = json.loads(TILESET_PATH.read_text())
NPCS = json.loads(NPCS_PATH.read_text())

WOMAN_SHEET = NPCS["woman"]["frames"]
WOMAN_PALETTE = NPCS["woman"]["palette"]


def positive_mod(value: int, modulus: int) -> int:
    return ((value % modulus) + modulus) % modulus


def render_field(camera_origin: tuple[int, int]) -> np.ndarray:
    layout = LAYOUT
    tileset = TILESET
    fb = np.zeros((160, 240, 3), dtype=np.int16)

    def block_at(bx: int, by: int) -> dict:
        if 0 <= bx < layout["width"] and 0 <= by < layout["height"]:
            return layout["blocks"][by * layout["width"] + bx]
        x = positive_mod(bx, layout["border"]["width"])
        y = positive_mod(by, layout["border"]["height"])
        return layout["border"]["blocks"][y * layout["border"]["width"] + x]

    def draw_entry(entry, x, y):
        tile = tileset["tiles"][str(entry["tile"])]
        palette = tileset["palettes"][str(entry["pal"])]
        for py in range(8):
            for px in range(8):
                sx = 7 - px if entry["hFlip"] else px
                sy = 7 - py if entry["vFlip"] else py
                idx = tile[sy * 8 + sx]
                if idx == 0:
                    continue
                col = palette[idx]
                sx2 = x + px
                sy2 = y + py
                if 0 <= sx2 < 240 and 0 <= sy2 < 160:
                    fb[sy2, sx2] = (col["r"], col["g"], col["b"])

    bg_origin = camera_origin
    min_bx = int(np.floor(bg_origin[0] / 16))
    min_by = int(np.floor(bg_origin[1] / 16))
    for by in range(min_by, min_by + 11):
        for bx in range(min_bx, min_bx + 16):
            screen_x = bx * 16 - bg_origin[0]
            screen_y = by * 16 - bg_origin[1]
            metatile = tileset["metatiles"].get(str(block_at(bx, by)["metatileId"]))
            if not metatile:
                continue
            entries = metatile["entries"]
            for i, entry in enumerate(entries[:4]):
                draw_entry(entry, screen_x + (i % 2) * 8, screen_y + (i // 2) * 8)
            if metatile["layerType"] == 1:
                for i, entry in enumerate(entries[4:8]):
                    draw_entry(entry, screen_x + (i % 2) * 8, screen_y + (i // 2) * 8)

    def draw_npc(npc, pos, frame_index=0, hflip=False):
        frame = npc["frames"][frame_index]
        palette = npc["palette"]
        for idx, tile in enumerate(frame["tiles"]):
            col_i = idx % frame["columns"]
            row_i = idx // frame["columns"]
            for py in range(8):
                for px in range(8):
                    sx = 7 - px if hflip else px
                    ci = tile[py * 8 + sx]
                    if ci == 0:
                        continue
                    col = palette[ci]
                    x2 = pos[0] + col_i * 8 + px
                    y2 = pos[1] + row_i * 8 + py
                    if 0 <= x2 < 240 and 0 <= y2 < 160:
                        fb[y2, x2] = (col["r"], col["g"], col["b"])

    objects = sorted(
        layout["visibleObjects"],
        key=lambda o: (o["tile"]["y"], o["tile"]["x"]),
    )
    for obj in objects:
        if obj["asset"] in ("woman", "player"):
            continue
        draw_npc(
            NPCS[obj["asset"]],
            [obj["tile"]["x"] * 16 - camera_origin[0],
             obj["tile"]["y"] * 16 - camera_origin[1] - 16],
        )

    for by in range(min_by, min_by + 11):
        for bx in range(min_bx, min_bx + 16):
            screen_x = bx * 16 - bg_origin[0]
            screen_y = by * 16 - bg_origin[1]
            metatile = tileset["metatiles"].get(str(block_at(bx, by)["metatileId"]))
            if not metatile or metatile["layerType"] == 1:
                continue
            for i, entry in enumerate(metatile["entries"][4:8]):
                draw_entry(entry, screen_x + (i % 2) * 8, screen_y + (i // 2) * 8)
    return fb


def render_woman(frame_index: int, hflip: bool) -> np.ndarray:
    frame = WOMAN_SHEET[frame_index]
    out = np.zeros((32, 16, 3), dtype=np.int16)
    for idx, tile in enumerate(frame["tiles"]):
        col_i = idx % frame["columns"]
        row_i = idx // frame["columns"]
        for py in range(8):
            for px in range(8):
                sx = 7 - px if hflip else px
                ci = tile[py * 8 + sx]
                if ci == 0:
                    continue
                col = WOMAN_PALETTE[ci]
                out[row_i * 8 + py, col_i * 8 + px] = (col["r"], col["g"], col["b"])
    return out


def load_oracle(png_dir: Path) -> dict[int, np.ndarray]:
    frames = {}
    for p in sorted(png_dir.glob("*.png")):
        frames[int(p.stem[1:])] = np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
    return frames


def main() -> int:
    data = json.loads(PROBE_OUT.read_text())
    oracle = load_oracle(PNG_DIR)

    for rec in data["ticks"]:
        tick = rec["tick"]
        if tick not in oracle:
            continue
        w = rec["woman"]
        ws = rec["womanSprites"]
        ps = rec["playerSprite"]
        if not w or not ws:
            continue
        oy, ox = ws[0]["oamY"], ws[0]["oamX"]
        base_cam = (ps["x"] - 168, ps["y"] - 56)
        best_cam = base_cam
        best_outside = None
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                cam = (base_cam[0] + dx, base_cam[1] + dy)
                field = render_field(cam)
                diff = np.abs(field - oracle[tick]).sum(axis=2) > 0
                outside = int(diff.sum())
                if best_outside is None or outside < best_outside:
                    best_outside = outside
                    best_cam = cam
        cam = best_cam
        field = render_field(cam)
        diff = np.abs(field - oracle[tick]).sum(axis=2) > 0
        # woman mask = diff pixels in a region around the OAM box
        y0, y1 = max(0, oy - 16), min(160, oy + 48)
        x0, x1 = max(0, ox - 16), min(240, ox + 32)
        mask = diff[y0:y1, x0:x1]
        if not mask.any():
            print(f"tick {tick}: no diff around woman box")
            continue
        my, mx = np.nonzero(mask)
        my = my.astype(int) + y0
        mx = mx.astype(int) + x0
        mbb = (int(mx.min()), int(mx.max()), int(my.min()), int(my.max()))
        # Align each candidate to the mask bbox (candidate top-left placed so
        # its own silhouette bbox matches the mask bbox). Instead of full
        # compositing, count mask-shape overlap + color match at alignment.
        results = []
        for frame_idx in range(9):
            for hflip in (False, True):
                cand = render_woman(frame_idx, hflip)
                cmask = (cand.sum(axis=2) > 0)
                cys, cxs = np.nonzero(cmask)
                cys = cys.astype(int); cxs = cxs.astype(int)
                # Try aligning candidate bbox to mask bbox (dx,dy) and also
                # sub-offsets so the feet line up.
                for dy in range(-4, 5):
                    for dx in range(-4, 5):
                        top = mbb[2] - cys.min() + dy
                        left = mbb[0] - cxs.min() + dx
                        if top < 0 or left < 0 or top + 32 > 160 or left + 16 > 240:
                            continue
                        box = (slice(top, top + 32), slice(left, left + 16))
                        comp = field[box].copy()
                        comp[mask2 := cmask] = cand[cmask]
                        mismatch = int((comp != oracle[tick][box]).sum())
                        results.append((mismatch, frame_idx, hflip, left - ox, top - oy))
        results.sort()
        best = results[0]
        print(
            f"tick {tick}: oam {ox},{oy} mbb {mbb} "
            f"anim {ws[0]['animNum']}/{ws[0]['animCmdIndex']} hflip {ws[0]['hFlip']} "
            f"facing {w[0]['facing']} act {w[0]['movementActionId']} cam {cam} "
            f"-> best {best[1]}{'h' if best[2] else ''} "
            f"@(dx {best[3]}, dy {best[4]}) mismatch {best[0]}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
