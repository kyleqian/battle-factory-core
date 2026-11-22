"""Deterministic Pokémon Emerald oracle core over mGBA (libmgba-py).

Wraps a single headless mGBA core: boots the reference ROM, replays the
canonical bootstrap (scripted inputs + optional symbol pokes), snapshots that
state, and then serves trace runs that always start from the identical
snapshot. Determinism notes:
  - RTC is switched to mGBA's simulated time source (advances with emulated
    cycles, not the host clock) before reset, so no wall-clock leaks in.
  - No GBA BIOS file is used; mGBA's HLE BIOS is deterministic.
  - `sha256` values are over the raw RGB888 framebuffer (240*160*3 bytes),
    NOT the encoded PNG, so hashes are stable across PNG encoder versions.
"""

from __future__ import annotations

import datetime
import hashlib
import io
import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_VENDOR = _HERE.parents[1] / "vendor"
if str(_VENDOR / "libmgba-py") not in sys.path:
    sys.path.insert(0, str(_VENDOR / "libmgba-py"))

import mgba.core  # noqa: E402
import mgba.image  # noqa: E402
import mgba.vfs  # noqa: E402
from mgba import ffi  # noqa: E402
from PIL import Image as PILImage  # noqa: E402

from symbols import load_symbols  # noqa: E402

GBA_BUTTONS = ("A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L")

# rtc1 (workspace/docs/rtc1-oracle-clock.md): the emulated real-time clock's start, the same for every process and host. Before rtc1 the
# clock started at libmgba-py's default, `datetime.datetime.now()` evaluated once when `mgba.core` was imported (the process start), and
# libmgba turns the clock into the game's time of day with the host's `localtime`. Once a day, a process started in a window of about 30
# seconds (11:39:55..11:40:20 local on the Mac) got a ROM whose once-a-day update fell inside the run and drew other Random() values (the
# replay's "re-drive once" flake: workspace/docs/opl3-open-level-rom-replay.md). A naive (local) wall time gives the game the same clock on
# every host, whatever its time zone; 12:00:00 is outside the window, on the path every run outside it took, with the next day's
# rollover 23 h 40 min of emulated time later, longer than any tool run.
RTC_START = datetime.datetime(2026, 11, 22, 12, 0, 0)


def load_bootstrap_spec(path: Path, seen: set[Path] | None = None) -> dict:
    """Load a bootstrap, optionally inheriting a shared input timeline.

    Profile bootstraps use ``extends`` to avoid copying the canonical 6970-frame
    route. Child keys replace base keys; this is deliberately a shallow merge
    because profile differences are complete fields such as ``pokes`` and
    ``description``.
    """
    resolved = path.resolve()
    chain = set() if seen is None else set(seen)
    if resolved in chain:
        raise ValueError(f"bootstrap extends cycle at {resolved}")
    chain.add(resolved)
    value = json.loads(resolved.read_text())
    parent = value.pop("extends", None)
    if parent is None:
        return value
    base = load_bootstrap_spec((resolved.parent / parent).resolve(), chain)
    return base | value


class EmeraldOracle:
    def __init__(self, rom_path: str | Path, map_path: str | Path, bootstrap_path: str | Path):
        self.rom_path = Path(rom_path)
        self.map_path = Path(map_path)
        self.bootstrap_path = Path(bootstrap_path)

        self.core = mgba.core.load_path(str(self.rom_path))
        if self.core is None:
            raise RuntimeError(f"mGBA could not load ROM at {self.rom_path}")
        self._key_ids = {name: getattr(self.core, f"KEY_{name}") for name in GBA_BUTTONS}
        self.width, self.height = self.core.desired_video_dimensions()
        self.screen = mgba.image.Image(self.width, self.height)
        self.core.set_video_buffer(self.screen)
        if self.core.rtc is not None:
            self.core.rtc.use_simulated_time(RTC_START)

        self.symbols = load_symbols(self.map_path, cache_path=_HERE / ".symbols-cache.json")
        self.bootstrap = load_bootstrap_spec(self.bootstrap_path)
        # Optional battery save (path relative to the bootstrap json). Loaded
        # as a TEMPORARY save: the emulator works on an in-memory copy and
        # never writes back, so the vendored .sav stays pristine.
        self.save_path = None
        if self.bootstrap.get("save"):
            self.save_path = (self.bootstrap_path.parent / self.bootstrap["save"]).resolve()
            vfile = mgba.vfs.open_path(str(self.save_path), "r")
            if vfile is None or not self.core.load_temporary_save(vfile):
                raise RuntimeError(f"could not load save file {self.save_path}")
        self.core.reset()
        self._bootstrap_frames = self._run_bootstrap(self.bootstrap)
        self._canonical_state = bytes(ffi.buffer(self.core.save_raw_state()))
        # load_raw_state restores emulation state but NOT the video buffer —
        # without this cache, a frame-0 capture would show the previous run's
        # final frame. screen_rgb() serves the cache until the first advance().
        self._canonical_rgb = self._render_rgb()
        self._screen_stale = False
        self.canonical_screen_sha256 = hashlib.sha256(self._canonical_rgb).hexdigest()
        self.frame = 0

    # -- memory helpers -----------------------------------------------------

    def read_u8(self, addr: int) -> int:
        return self.core.memory.u8[addr]

    def read_u16(self, addr: int) -> int:
        return self.read_u8(addr) | (self.read_u8(addr + 1) << 8)

    def read_u32(self, addr: int) -> int:
        return self.core.memory.u32[addr]

    def write_u8(self, addr: int, value: int) -> None:
        # libmgba-py's u8.__setitem__ sugar is broken (passes 3 args to the
        # 4-arg raw writer, missing the segment); raw_write is the working API.
        self.core.memory.u8.raw_write(addr, value & 0xFF)

    def write_u16(self, addr: int, value: int) -> None:
        self.write_u8(addr, value)
        self.write_u8(addr + 1, value >> 8)

    def write_u32(self, addr: int, value: int) -> None:
        for offset in range(4):
            self.write_u8(addr + offset, value >> (offset * 8))

    def resolve_poke_addr(self, poke: dict) -> int:
        if "symbol" in poke:
            base = self.symbols.get(poke["symbol"])
            if base is None:
                raise KeyError(f"unknown symbol {poke['symbol']!r}")
        else:
            base = int(poke["addr"], 16) if isinstance(poke["addr"], str) else int(poke["addr"])
        if poke.get("deref"):
            base = self.read_u32(base)
        return base + int(poke.get("offset", 0))

    # -- bootstrap / sessions ----------------------------------------------

    def _run_bootstrap(self, spec: dict) -> int:
        frames = 0
        for segment in spec.get("segments", []):
            self._set_buttons(segment.get("buttons", []))
            for _ in range(int(segment["frames"])):
                self.core.run_frame()
                frames += 1
        for poke in spec.get("pokes", []):
            addr = self.resolve_poke_addr(poke)
            for index, value in enumerate(poke["bytes"]):
                self.write_u8(addr + index, value)
        self._set_buttons([])
        for _ in range(int(spec.get("settleFrames", 0))):
            self.core.run_frame()
            frames += 1
        return frames

    def new_session(self) -> None:
        """Reset to the canonical snapshot; every trace run starts here."""
        self.core.load_raw_state(self._canonical_state)
        self._set_buttons([])
        self._screen_stale = True
        self.frame = 0

    def advance(self, buttons: list[str]) -> None:
        self._set_buttons(buttons)
        self.core.run_frame()
        self._screen_stale = False
        self.frame += 1

    def _set_buttons(self, buttons: list[str]) -> None:
        self.core.clear_keys(*self._key_ids.values())
        if buttons:
            self.core.set_keys(*[self._key_ids[b] for b in buttons])

    # -- output --------------------------------------------------------------

    def _render_rgb(self) -> bytes:
        raw = ffi.buffer(self.screen.buffer, self.screen.stride * self.height * 4)[:]
        img = PILImage.frombytes(
            "RGB", (self.width, self.height), raw, "raw", "RGBX", self.screen.stride * 4
        )
        return img.tobytes()

    def screen_rgb(self) -> bytes:
        if self._screen_stale:
            return self._canonical_rgb
        return self._render_rgb()

    def screen_png(self) -> bytes:
        img = PILImage.frombytes("RGB", (self.width, self.height), self.screen_rgb())
        out = io.BytesIO()
        img.save(out, format="PNG", optimize=False)
        return out.getvalue()

    # -- contract -------------------------------------------------------------

    def info(self, extra: dict | None = None) -> dict:
        value = {
            "game": self.core.game_title,
            "gameCode": self.core.game_code,
            "screen": {"width": self.width, "height": self.height},
            "buttons": list(GBA_BUTTONS),
            "frameModel": "one trace frame == one emulated video frame (~59.7275 Hz)",
            "sha256": "hex digest of the raw RGB888 framebuffer (width*height*3 bytes), not the PNG",
            "emulator": "mGBA 0.10.x via libmgba-py, headless; HLE BIOS; RTC pinned to simulated time",
            "bootstrap": {
                "version": self.bootstrap.get("version"),
                "profile": self.bootstrap.get("profile", "battle-scene-on"),
                "description": self.bootstrap.get("description"),
                "frames": self._bootstrap_frames,
                "saveFile": self.save_path.name if self.save_path else None,
                "canonicalScreenSha256": self.canonical_screen_sha256,
            },
        }
        if extra:
            value.update(extra)
        return value
