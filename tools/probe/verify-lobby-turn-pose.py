#!/usr/bin/env python3
"""BLOCKER 2 analysis: identify the oracle's in-place turn pose A (ticks
5174-5177) by bg-subtracting the rendered Lobby field from oracle frames and
byte-comparing the isolated player sprite against every sheet candidate.

Field background is reproduced with the app's own render model
(renderFactoryTerminalField, factoryTerminalRender.ts): tile-aligned BG
layers at cameraOriginPx plus non-player NPCs. The player sprite box is the
OAM (112,56)-(128,88) (16x32). For each oracle turn frame and each candidate
(frame index 0..8, hFlip off/on) we draw the candidate over the field at the
player box and count exact-matching vs differing pixels. A 0px difference =
identification.

Inputs: the PNG directory written by dump-lobby-turn-pose.py (or
dump-lobby-walk-subtile.py for the walk fixture), the walk fixture JSON (for
tick windows), and the app assets.

Run: python3 tools/probe/verify-lobby-turn-pose.py <pngDir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

PNG_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/subtile-south-png")

LAYOUT_PATH = WORKTREE_ROOT / "src" / "data" / "gen" / "factory-lobby-terminal-layout.json"
TILESET_PATH = WORKTREE_ROOT / "src" / "assets" / "gen" / "factory-lobby-terminal-tileset.json"
NPCS_PATH = WORKTREE_ROOT / "src" / "assets" / "gen" / "factory-lobby-terminal-npcs.json"

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402


def positive_mod(value: int, modulus: int) -> int:
    return ((value % modulus) + modulus) % modulus


def render_field(player_frame: int | None = None, player_hflip: bool = False) -> np.ndarray:
    layout = json.loads(LAYOUT_PATH.read_text())
    tileset = json.loads(TILESET_PATH.read_text())
    npcs = json.loads(NPCS_PATH.read_text())
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

    bg_origin = {"x": layout["cameraOriginPx"]["x"], "y": layout["cameraOriginPx"]["y"]}
    min_bx = int(np.floor(bg_origin["x"] / 16))
    min_by = int(np.floor(bg_origin["y"] / 16))
    for by in range(min_by, min_by + 11):
        for bx in range(min_bx, min_bx + 16):
            screen_x = bx * 16 - bg_origin["x"]
            screen_y = by * 16 - bg_origin["y"]
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
                    x2 = pos["x"] + col_i * 8 + px
                    y2 = pos["y"] + row_i * 8 + py
                    if 0 <= x2 < 240 and 0 <= y2 < 160:
                        fb[y2, x2] = (col["r"], col["g"], col["b"])

    objects = sorted(
        layout["visibleObjects"],
        key=lambda o: (o["tile"]["y"], o["tile"]["x"]),
    )
    for obj in objects:
        if obj["asset"] == "player":
            if player_frame is not None:
                draw_npc(
                    npcs["player"],
                    {"x": 112, "y": 56},
                    player_frame,
                    player_hflip,
                )
            continue
        draw_npc(
            npcs[obj["asset"]],
            {"x": obj["tile"]["x"] * 16 - layout["cameraOriginPx"]["x"],
             "y": obj["tile"]["y"] * 16 - layout["cameraOriginPx"]["y"] - 16},
        )

    # top layers (NORMAL / SPLIT covered above; non-1 layerType get entries 4..8)
    for by in range(min_by, min_by + 11):
        for bx in range(min_bx, min_bx + 16):
            screen_x = bx * 16 - bg_origin["x"]
            screen_y = by * 16 - bg_origin["y"]
            metatile = tileset["metatiles"].get(str(block_at(bx, by)["metatileId"]))
            if not metatile or metatile["layerType"] == 1:
                continue
            for i, entry in enumerate(metatile["entries"][4:8]):
                draw_entry(entry, screen_x + (i % 2) * 8, screen_y + (i // 2) * 8)
    return fb


def load_oracle(png_dir: Path) -> dict[int, np.ndarray]:
    frames = {}
    for p in sorted(png_dir.glob("*.png")):
        frames[int(p.stem[1:])] = np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
    return frames


def main() -> int:
    oracle = load_oracle(PNG_DIR)
    field = render_field()  # no player
    # Candidate sheet: render each frame + h-flip over the field at player box.
    npcs = json.loads(NPCS_PATH.read_text())
    player_sheet = npcs["player"]
    player_box = (slice(56, 88), slice(112, 128))

    print(f"oracle frames: {sorted(oracle)}")
    print("field-only mean abs diff vs frame 5172 (should be small outside player):",
          round(float(np.abs(field - oracle[5172]).mean()), 3))

    turn_ticks = [5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181]
    for tick in turn_ticks:
        if tick not in oracle:
            continue
        actual = oracle[tick][player_box]
        # bg-subtract: player pixels are where field and oracle differ
        diff = np.abs(field[player_box] - actual).sum(axis=2) > 0
        results = []
        for frame_idx in range(9):
            for hflip in (False, True):
                cand_field = render_field(frame_idx, hflip)
                cand = cand_field[player_box]
                mismatch = (cand != actual).sum()
                results.append((int(mismatch), frame_idx, hflip))
        results.sort()
        print(f"tick {tick}: best candidates (mismatch_px, frame, hflip): {results[:4]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
